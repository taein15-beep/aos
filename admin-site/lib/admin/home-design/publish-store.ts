import { mkdir, readdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { HOME_PUBLISHED_SCHEMA } from "../../../../packages/home-design-contract/src/version.ts";
import { validateHomeDraftSlice } from "./validate.ts";
import { DraftStoreError, assertSafeStorageKey, type HomeDraftStore } from "./draft-store.ts";
import type { HomeDesignPublishedDocument, HomePublishHistory } from "./types.ts";

export const PUBLISHED_SCHEMA = HOME_PUBLISHED_SCHEMA;
export const DEFAULT_PUBLISH_ROOT = path.join(process.cwd(), ".data", "home-design-published");
export const DEV_PUBLISH_MODE = "dev-publish";

export type StoredPublished = HomeDesignPublishedDocument & { schema: typeof PUBLISHED_SCHEMA };

export type PublishVersionSummary = {
  version: number;
  publishedAt: string;
  publishedBy: string;
  status: StoredPublished["published"]["status"];
  sourceDraftRevision: number;
  note: string;
};

export type PublishStoreOptions = {
  rootDir: string;
  draftStore: HomeDraftStore;
  env?: string;
  beforeCommit?: () => Promise<void> | void;
};

export function isPublishApiAllowed(env: string | undefined = process.env.NODE_ENV): boolean {
  return env !== "production";
}

export function assertPublishApiAllowed(env: string | undefined = process.env.NODE_ENV): void {
  if (!isPublishApiAllowed(env)) {
    throw new DraftStoreError(403, "PRODUCTION_FORBIDDEN", "개발 전용 발행 API는 운영 환경에서 사용할 수 없습니다.");
  }
}

function assertInsideRoot(rootDir: string, target: string): string {
  const root = path.resolve(rootDir);
  const resolved = path.resolve(target);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new DraftStoreError(400, "PATH_FORBIDDEN", "저장소 밖의 경로에는 접근할 수 없습니다.");
  }
  return resolved;
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(tmpPath, filePath);
  } catch (error) {
    await unlink(tmpPath).catch(() => undefined);
    throw error;
  }
}

function parsePublished(raw: string, filePath: string): StoredPublished {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DraftStoreError(400, "INVALID_JSON", `발행본 JSON을 읽을 수 없습니다: ${filePath}`);
  }
  if (!parsed || typeof parsed !== "object" || (parsed as StoredPublished).schema !== PUBLISHED_SCHEMA) {
    throw new DraftStoreError(400, "INVALID_JSON", "발행본 스키마가 올바르지 않습니다.");
  }
  return parsed as StoredPublished;
}

export function createPublishStore(options: PublishStoreOptions) {
  const rootDir = path.resolve(options.rootDir);
  const env = options.env ?? process.env.NODE_ENV;
  const draftStore = options.draftStore;
  const publishLocks = new Set<string>();

  function pageDir(siteCode: string, pageKey: string): string {
    const site = assertSafeStorageKey(siteCode, "site_code");
    const page = assertSafeStorageKey(pageKey, "pageKey");
    return assertInsideRoot(rootDir, path.join(rootDir, site, page));
  }

  function activePath(siteCode: string, pageKey: string): string {
    return path.join(pageDir(siteCode, pageKey), "active.json");
  }

  function versionPath(siteCode: string, pageKey: string, version: number): string {
    return path.join(pageDir(siteCode, pageKey), "versions", `${version}.json`);
  }

  function historyPath(siteCode: string, pageKey: string): string {
    return path.join(pageDir(siteCode, pageKey), "history.json");
  }

  async function readActive(siteCode: string, pageKey: string): Promise<StoredPublished | null> {
    assertPublishApiAllowed(env);
    try {
      const raw = await readFile(activePath(siteCode, pageKey), "utf8");
      return parsePublished(raw, activePath(siteCode, pageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      if (error instanceof DraftStoreError) throw error;
      throw new DraftStoreError(500, "PUBLISH_STORE_UNAVAILABLE", "발행본 저장소를 읽지 못했습니다.");
    }
  }

  async function readVersion(siteCode: string, pageKey: string, version: number): Promise<StoredPublished> {
    assertPublishApiAllowed(env);
    if (!Number.isInteger(version) || version < 1) {
      throw new DraftStoreError(400, "VALIDATION", "발행 버전 번호가 올바르지 않습니다.");
    }
    try {
      const raw = await readFile(versionPath(siteCode, pageKey, version), "utf8");
      return parsePublished(raw, versionPath(siteCode, pageKey, version));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new DraftStoreError(404, "NOT_FOUND", "해당 발행 버전이 없습니다.");
      }
      if (error instanceof DraftStoreError) throw error;
      throw new DraftStoreError(500, "PUBLISH_STORE_UNAVAILABLE", "발행 버전을 읽지 못했습니다.");
    }
  }

  async function listVersions(siteCode: string, pageKey: string): Promise<PublishVersionSummary[]> {
    assertPublishApiAllowed(env);
    const dir = path.join(pageDir(siteCode, pageKey), "versions");
    let files: string[] = [];
    try {
      files = await readdir(dir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new DraftStoreError(500, "PUBLISH_STORE_UNAVAILABLE", "발행 버전 목록을 읽지 못했습니다.");
    }
    const versions: PublishVersionSummary[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const stored = parsePublished(await readFile(path.join(dir, file), "utf8"), file);
        versions.push({
          version: stored.published.version,
          publishedAt: stored.published.publishedAt,
          publishedBy: stored.published.publishedBy,
          status: stored.published.status,
          sourceDraftRevision: stored.published.sourceDraftRevision,
          note: stored.published.note,
        });
      } catch {
        continue;
      }
    }
    return versions.sort((a, b) => b.version - a.version);
  }

  async function listHistory(siteCode: string, pageKey: string): Promise<HomePublishHistory[]> {
    assertPublishApiAllowed(env);
    try {
      const raw = await readFile(historyPath(siteCode, pageKey), "utf8");
      const parsed = JSON.parse(raw) as HomePublishHistory[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new DraftStoreError(500, "PUBLISH_STORE_UNAVAILABLE", "발행 이력을 읽지 못했습니다.");
    }
  }

  async function appendHistory(entry: HomePublishHistory): Promise<void> {
    const current = await listHistory(entry.site_code, entry.pageKey);
    current.unshift(entry);
    await writeJsonAtomic(historyPath(entry.site_code, entry.pageKey), current);
  }

  async function publishFromDraft(input: {
    site_code: string;
    pageKey: string;
    expectedDraftRevision: number;
    publishedBy?: string;
    note?: string;
  }): Promise<{ document: StoredPublished; previousVersion: number | null }> {
    assertPublishApiAllowed(env);
    if (!Number.isInteger(input.expectedDraftRevision) || input.expectedDraftRevision < 1) {
      throw new DraftStoreError(400, "VALIDATION", "발행할 초안 revision 값이 올바르지 않습니다.");
    }
    const lockKey = `${input.site_code}:${input.pageKey}`;
    if (publishLocks.has(lockKey)) {
      throw new DraftStoreError(409, "PUBLISH_IN_PROGRESS", "같은 사이트·페이지를 이미 발행 중입니다.");
    }
    publishLocks.add(lockKey);
    const startedAt = new Date().toISOString();
    try {
      const draft = await draftStore.readCurrent(input.site_code, input.pageKey);
      if (!draft) {
        throw new DraftStoreError(404, "NOT_FOUND", "발행할 초안이 없습니다. 먼저 초안을 저장하세요.");
      }
      if (draft.draft.revision !== input.expectedDraftRevision) {
        throw new DraftStoreError(409, "STALE_DRAFT", `초안이 변경되었습니다. 현재 revision은 ${draft.draft.revision} 입니다.`);
      }
      const page = draft.draft.payload.pages[0];
      if (!page) {
        throw new DraftStoreError(400, "INVALID_JSON", "초안에 페이지가 없습니다.");
      }
      const validated = validateHomeDraftSlice({
        site_code: input.site_code,
        pageKey: input.pageKey,
        tempCode: draft.draft.payload.tempCode,
        page,
        media: draft.draft.payload.media,
      });
      if (!validated.ok) {
        throw new DraftStoreError(400, validated.issues[0]?.code ?? "VALIDATION", validated.issues[0]?.message ?? "발행 데이터가 올바르지 않습니다.");
      }

      const existing = await readActive(input.site_code, input.pageKey);
      const nextVersion = (existing?.published.version ?? 0) + 1;
      const now = new Date().toISOString();
      const publishedBy = input.publishedBy?.trim() || "dev-local";
      const document: StoredPublished = {
        schema: PUBLISHED_SCHEMA,
        pageKey: input.pageKey,
        siteName: draft.siteName,
        domains: draft.domains,
        siteStatus: draft.siteStatus,
        published: {
          id: `pub-${input.site_code}-${input.pageKey}-${nextVersion}`,
          site_code: input.site_code,
          pageKey: input.pageKey,
          version: nextVersion,
          payload: structuredClone(draft.draft.payload),
          renderer: "website-json",
          status: "active",
          sourceDraftRevision: draft.draft.revision,
          publishedAt: now,
          publishedBy,
          note: input.note?.trim() || "개발 전용 모의 발행",
        },
      };

      await writeJsonAtomic(versionPath(input.site_code, input.pageKey, nextVersion), document);
      if (options.beforeCommit) await options.beforeCommit();
      await writeJsonAtomic(activePath(input.site_code, input.pageKey), document);
      if (existing) {
        const superseded: StoredPublished = {
          ...existing,
          published: { ...existing.published, status: "superseded" },
        };
        await writeJsonAtomic(versionPath(input.site_code, input.pageKey, existing.published.version), superseded);
      }
      await appendHistory({
        id: `hist-${input.site_code}-${input.pageKey}-${nextVersion}`,
        site_code: input.site_code,
        pageKey: input.pageKey,
        versionId: document.published.id,
        actor: publishedBy,
        startedAt,
        finishedAt: now,
        result: "ok",
        targets: ["website-dev-preview"],
        errorMessage: "",
      });
      return { document, previousVersion: existing?.published.version ?? null };
    } catch (error) {
      if (!(error instanceof DraftStoreError) || error.code !== "PRODUCTION_FORBIDDEN") {
        try {
          await appendHistory({
            id: `hist-${input.site_code}-${input.pageKey}-fail-${Date.now()}`,
            site_code: input.site_code,
            pageKey: input.pageKey,
            versionId: "",
            actor: input.publishedBy?.trim() || "dev-local",
            startedAt,
            finishedAt: new Date().toISOString(),
            result: "error",
            targets: ["website-dev-preview"],
            errorMessage: error instanceof Error ? error.message : "발행 실패",
          }).catch(() => undefined);
        } catch {
          // 이력 기록 실패는 기존 활성 발행본을 바꾸지 않는다.
        }
      }
      throw error;
    } finally {
      publishLocks.delete(lockKey);
    }
  }

  async function restorePublishedToDraft(siteCode: string, pageKey: string, version: number, expectedDraftRevision: number, actor = "dev-local-publish-restore") {
    const stored = await readVersion(siteCode, pageKey, version);
    const page = stored.published.payload.pages[0];
    if (!page) {
      throw new DraftStoreError(400, "INVALID_JSON", "복원할 페이지가 없습니다.");
    }
    return draftStore.saveDraft({
      site_code: siteCode,
      pageKey,
      expectedRevision: expectedDraftRevision,
      updatedBy: actor,
      siteName: stored.siteName,
      domains: stored.domains,
      siteStatus: stored.siteStatus,
      tempCode: stored.published.payload.tempCode,
      page,
      media: stored.published.payload.media,
    });
  }

  async function resetForTests(): Promise<void> {
    assertPublishApiAllowed(env);
    await rm(rootDir, { recursive: true, force: true });
  }

  return {
    rootDir,
    readActive,
    readVersion,
    listVersions,
    listHistory,
    publishFromDraft,
    restorePublishedToDraft,
    resetForTests,
  };
}

export type HomePublishStore = ReturnType<typeof createPublishStore>;

let defaultStore: HomePublishStore | null = null;

export function getDefaultPublishStore(draftStore: HomeDraftStore): HomePublishStore {
  if (!defaultStore) {
    defaultStore = createPublishStore({ rootDir: DEFAULT_PUBLISH_ROOT, draftStore });
  }
  return defaultStore;
}

/** 테스트에서만 기본 스토어를 교체한다. null이면 다음 호출 시 기본 경로로 재생성. */
export function setDefaultPublishStoreForTests(store: HomePublishStore | null): void {
  defaultStore = store;
}
