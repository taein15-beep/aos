import { mkdir, readdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { HOME_DRAFT_SCHEMA } from "../../../../packages/home-design-contract/src/version.ts";
import { validateHomeDraftSlice, validatePageKey, validateSiteCode } from "./validate.ts";
import type { HomeDraft, HomeMedia, HomePage, HomeSiteStatus } from "./types.ts";

export const DRAFT_SCHEMA = HOME_DRAFT_SCHEMA;
export const DEFAULT_DRAFT_ROOT = path.join(process.cwd(), ".data", "home-design-drafts");
export const DEV_DRAFT_MODE = "dev-draft";

export class DraftStoreError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "DraftStoreError";
    this.status = status;
    this.code = code;
  }
}

export type StoredHomeDraft = {
  schema: typeof DRAFT_SCHEMA;
  pageKey: string;
  siteName: string;
  domains: string[];
  siteStatus: HomeSiteStatus;
  draft: HomeDraft;
};

export type DraftSummary = {
  site_code: string;
  pageKey: string;
  revision: number;
  updatedAt: string;
  updatedBy: string;
  status: HomeDraft["status"];
};

export type DraftVersionSummary = {
  revision: number;
  updatedAt: string;
  updatedBy: string;
};

export type SaveDraftInput = {
  site_code: string;
  pageKey: string;
  expectedRevision: number;
  updatedBy?: string;
  siteName: string;
  domains: string[];
  siteStatus?: HomeSiteStatus;
  tempCode: string;
  page: HomePage;
  media: HomeMedia[];
};

export type DraftStoreOptions = {
  rootDir: string;
  env?: string;
};

export function isDraftApiAllowed(env: string | undefined = process.env.NODE_ENV): boolean {
  return env !== "production";
}

export function assertDraftApiAllowed(env: string | undefined = process.env.NODE_ENV): void {
  if (!isDraftApiAllowed(env)) {
    throw new DraftStoreError(403, "PRODUCTION_FORBIDDEN", "개발 전용 초안 API는 운영 환경에서 사용할 수 없습니다.");
  }
}

export function assertSafeStorageKey(value: string, kind: "site_code" | "pageKey"): string {
  const issues = kind === "site_code" ? validateSiteCode(value, kind) : validatePageKey(value, kind);
  if (issues.length) {
    throw new DraftStoreError(400, issues[0].code, issues[0].message);
  }
  if (value.includes("..") || value.includes("/") || value.includes("\\") || value.includes("\0")) {
    throw new DraftStoreError(400, "PATH_FORBIDDEN", "저장 경로에 사용할 수 없는 문자가 있습니다.");
  }
  return value;
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

function parseStored(raw: string, filePath: string): StoredHomeDraft {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DraftStoreError(400, "INVALID_JSON", `초안 JSON을 읽을 수 없습니다: ${filePath}`);
  }
  if (!parsed || typeof parsed !== "object" || (parsed as StoredHomeDraft).schema !== DRAFT_SCHEMA) {
    throw new DraftStoreError(400, "INVALID_JSON", "초안 스키마가 올바르지 않습니다.");
  }
  return parsed as StoredHomeDraft;
}

export function createDraftStore(options: DraftStoreOptions) {
  const rootDir = path.resolve(options.rootDir);
  const env = options.env ?? process.env.NODE_ENV;

  function pageDir(siteCode: string, pageKey: string): string {
    const site = assertSafeStorageKey(siteCode, "site_code");
    const page = assertSafeStorageKey(pageKey, "pageKey");
    return assertInsideRoot(rootDir, path.join(rootDir, site, page));
  }

  function currentPath(siteCode: string, pageKey: string): string {
    return path.join(pageDir(siteCode, pageKey), "current.json");
  }

  function versionPath(siteCode: string, pageKey: string, revision: number): string {
    return path.join(pageDir(siteCode, pageKey), "versions", `${revision}.json`);
  }

  async function readCurrent(siteCode: string, pageKey: string): Promise<StoredHomeDraft | null> {
    assertDraftApiAllowed(env);
    try {
      const raw = await readFile(currentPath(siteCode, pageKey), "utf8");
      return parseStored(raw, currentPath(siteCode, pageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      if (error instanceof DraftStoreError) throw error;
      throw new DraftStoreError(500, "DRAFT_STORE_UNAVAILABLE", "초안 저장소를 읽지 못했습니다.");
    }
  }

  async function listDrafts(): Promise<DraftSummary[]> {
    assertDraftApiAllowed(env);
    const summaries: DraftSummary[] = [];
    let sites: string[] = [];
    try {
      sites = await readdir(rootDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new DraftStoreError(500, "DRAFT_STORE_UNAVAILABLE", "초안 저장소를 읽지 못했습니다.");
    }
    for (const siteCode of sites) {
      const sitePath = path.join(rootDir, siteCode);
      let pages: string[] = [];
      try {
        pages = await readdir(sitePath);
      } catch {
        continue;
      }
      for (const pageKey of pages) {
        try {
          const current = await readCurrent(siteCode, pageKey);
          if (!current) continue;
          summaries.push({
            site_code: current.draft.site_code,
            pageKey: current.pageKey,
            revision: current.draft.revision,
            updatedAt: current.draft.updatedAt,
            updatedBy: current.draft.updatedBy,
            status: current.draft.status,
          });
        } catch {
          continue;
        }
      }
    }
    return summaries.sort((a, b) => a.site_code.localeCompare(b.site_code) || a.pageKey.localeCompare(b.pageKey));
  }

  async function listVersions(siteCode: string, pageKey: string): Promise<DraftVersionSummary[]> {
    assertDraftApiAllowed(env);
    const dir = path.join(pageDir(siteCode, pageKey), "versions");
    let files: string[] = [];
    try {
      files = await readdir(dir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new DraftStoreError(500, "DRAFT_STORE_UNAVAILABLE", "버전 목록을 읽지 못했습니다.");
    }
    const versions: DraftVersionSummary[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const stored = parseStored(await readFile(path.join(dir, file), "utf8"), file);
        versions.push({
          revision: stored.draft.revision,
          updatedAt: stored.draft.updatedAt,
          updatedBy: stored.draft.updatedBy,
        });
      } catch {
        continue;
      }
    }
    return versions.sort((a, b) => b.revision - a.revision);
  }

  async function readVersion(siteCode: string, pageKey: string, revision: number): Promise<StoredHomeDraft> {
    assertDraftApiAllowed(env);
    if (!Number.isInteger(revision) || revision < 1) {
      throw new DraftStoreError(400, "VALIDATION", "버전 번호가 올바르지 않습니다.");
    }
    try {
      const raw = await readFile(versionPath(siteCode, pageKey, revision), "utf8");
      return parseStored(raw, versionPath(siteCode, pageKey, revision));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new DraftStoreError(404, "NOT_FOUND", "해당 초안 버전이 없습니다.");
      }
      if (error instanceof DraftStoreError) throw error;
      throw new DraftStoreError(500, "DRAFT_STORE_UNAVAILABLE", "초안 버전을 읽지 못했습니다.");
    }
  }

  async function saveDraft(input: SaveDraftInput): Promise<{ document: StoredHomeDraft; backupRevision: number | null }> {
    assertDraftApiAllowed(env);
    if (input.site_code !== input.page.site_code) {
      throw new DraftStoreError(400, "SITE_CODE_MISMATCH", "요청한 사이트코드와 저장 데이터의 사이트코드가 다릅니다.");
    }
    if (input.pageKey !== input.page.pageKey) {
      throw new DraftStoreError(400, "PAGE_KEY_MISMATCH", "요청한 페이지코드와 저장 데이터의 페이지코드가 다릅니다.");
    }
    let validated;
    try {
      validated = validateHomeDraftSlice({
        site_code: input.site_code,
        pageKey: input.pageKey,
        tempCode: input.tempCode,
        page: input.page,
        media: input.media ?? [],
      });
    } catch {
      throw new DraftStoreError(400, "INVALID_JSON", "초안 데이터 형식이 올바르지 않습니다.");
    }
    if (!validated.ok) {
      throw new DraftStoreError(400, validated.issues[0]?.code ?? "VALIDATION", validated.issues[0]?.message ?? "초안 데이터가 올바르지 않습니다.");
    }
    if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) {
      throw new DraftStoreError(400, "VALIDATION", "revision 값이 올바르지 않습니다.");
    }

    const existing = await readCurrent(input.site_code, input.pageKey);
    const currentRevision = existing?.draft.revision ?? 0;
    if (currentRevision !== input.expectedRevision) {
      throw new DraftStoreError(409, "STALE_DRAFT", `다른 저장본이 있습니다. 현재 revision은 ${currentRevision} 입니다.`);
    }

    const nextRevision = currentRevision + 1;
    const now = new Date().toISOString();
    const updatedBy = input.updatedBy?.trim() || "dev-local";
    const page: HomePage = { ...input.page, updatedAt: now, updatedBy };
    const document: StoredHomeDraft = {
      schema: DRAFT_SCHEMA,
      pageKey: input.pageKey,
      siteName: input.siteName,
      domains: input.domains,
      siteStatus: input.siteStatus ?? "active",
      draft: {
        id: `draft-${input.site_code}-${input.pageKey}`,
        site_code: input.site_code,
        pageId: page.id,
        payload: {
          tempCode: input.tempCode,
          pages: [page],
          media: input.media,
        },
        revision: nextRevision,
        status: "saved",
        updatedAt: now,
        updatedBy,
      },
    };

    try {
      if (existing) {
        await writeJsonAtomic(versionPath(input.site_code, input.pageKey, existing.draft.revision), existing);
      }
      await writeJsonAtomic(currentPath(input.site_code, input.pageKey), document);
    } catch (error) {
      if (error instanceof DraftStoreError) throw error;
      throw new DraftStoreError(500, "DRAFT_STORE_UNAVAILABLE", `초안 파일을 쓰지 못했습니다: ${error instanceof Error ? error.message : "unknown"}`);
    }
    return { document, backupRevision: existing?.draft.revision ?? null };
  }

  async function restoreVersion(siteCode: string, pageKey: string, revision: number, expectedRevision: number, actor = "dev-local-restore"): Promise<{ document: StoredHomeDraft; backupRevision: number | null }> {
    const version = await readVersion(siteCode, pageKey, revision);
    const page = version.draft.payload.pages[0];
    if (!page) {
      throw new DraftStoreError(400, "INVALID_JSON", "복원할 페이지가 없습니다.");
    }
    return saveDraft({
      site_code: siteCode,
      pageKey,
      expectedRevision,
      updatedBy: actor,
      siteName: version.siteName,
      domains: version.domains,
      siteStatus: version.siteStatus,
      tempCode: version.draft.payload.tempCode,
      page,
      media: version.draft.payload.media,
    });
  }

  async function resetForTests(): Promise<void> {
    assertDraftApiAllowed(env);
    await rm(rootDir, { recursive: true, force: true });
  }

  return {
    rootDir,
    listDrafts,
    readCurrent,
    listVersions,
    readVersion,
    saveDraft,
    restoreVersion,
    resetForTests,
  };
}

export type HomeDraftStore = ReturnType<typeof createDraftStore>;

let defaultStore: HomeDraftStore | null = null;

export function getDefaultDraftStore(): HomeDraftStore {
  if (!defaultStore) {
    defaultStore = createDraftStore({ rootDir: DEFAULT_DRAFT_ROOT });
  }
  return defaultStore;
}

/** 테스트에서만 기본 스토어를 교체한다. null이면 다음 호출 시 기본 경로로 재생성. */
export function setDefaultDraftStoreForTests(store: HomeDraftStore | null): void {
  defaultStore = store;
}
