import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDraftStore, DraftStoreError } from "../lib/admin/home-design/draft-store.ts";
import { createPublishStore } from "../lib/admin/home-design/publish-store.ts";
import { createSampleSites } from "../lib/admin/home-design/sample-data.ts";
import { HOME_PUBLISHED_SCHEMA } from "../lib/admin/home-design/types.ts";
import type { HomePage } from "../lib/admin/home-design/types.ts";

async function makeStores(env = "development") {
  const draftRoot = await mkdtemp(path.join(os.tmpdir(), "aos-home-draft-"));
  const publishRoot = await mkdtemp(path.join(os.tmpdir(), "aos-home-pub-"));
  const draftStore = createDraftStore({ rootDir: draftRoot, env });
  const publishStore = createPublishStore({ rootDir: publishRoot, draftStore, env });
  return { draftStore, publishStore, draftRoot, publishRoot };
}

function samplePage(siteIndex = 0, pageIndex = 0): {
  page: HomePage;
  siteName: string;
  domains: string[];
  tempCode: string;
  media: ReturnType<typeof createSampleSites>[0]["media"];
  site_code: string;
} {
  const site = structuredClone(createSampleSites()[siteIndex]);
  const page = site.pages[pageIndex];
  return {
    site_code: site.site_code,
    siteName: site.siteName,
    domains: site.domains,
    tempCode: site.tempCode,
    media: site.media,
    page,
  };
}

async function saveSample(draftStore: ReturnType<typeof createDraftStore>, sample = samplePage(), expectedRevision = 0) {
  return draftStore.saveDraft({
    ...sample,
    pageKey: sample.page.pageKey,
    expectedRevision,
  });
}

test("1. 정상 발행", async () => {
  const { draftStore, publishStore, draftRoot, publishRoot } = await makeStores();
  const sample = samplePage();
  sample.page.name = "발행할 메인";
  const saved = await saveSample(draftStore, sample);
  const published = await publishStore.publishFromDraft({
    site_code: sample.site_code,
    pageKey: "main",
    expectedDraftRevision: saved.document.draft.revision,
    note: "첫 모의 발행",
  });
  assert.equal(published.document.schema, HOME_PUBLISHED_SCHEMA);
  assert.equal(published.document.published.version, 1);
  assert.equal(published.document.published.status, "active");
  assert.equal(published.document.published.sourceDraftRevision, 1);
  assert.equal(published.document.published.payload.pages[0].name, "발행할 메인");
  assert.equal(published.previousVersion, null);
  assert.notEqual(draftRoot, publishRoot);
  const activeFile = await readFile(path.join(publishRoot, sample.site_code, "main", "active.json"), "utf8");
  assert.match(activeFile, /aos-home-published-v1/);
});

test("2. 발행본 조회", async () => {
  const { draftStore, publishStore } = await makeStores();
  const sample = samplePage();
  await saveSample(draftStore, sample);
  await publishStore.publishFromDraft({
    site_code: sample.site_code,
    pageKey: "main",
    expectedDraftRevision: 1,
  });
  const active = await publishStore.readActive(sample.site_code, "main");
  assert.ok(active);
  assert.equal(active.published.version, 1);
  assert.equal(active.pageKey, "main");
  assert.equal(active.published.renderer, "website-json");
  const history = await publishStore.listHistory(sample.site_code, "main");
  assert.equal(history.length, 1);
  assert.equal(history[0].result, "ok");
});

test("3. 사이트별 격리", async () => {
  const { draftStore, publishStore } = await makeStores();
  const first = samplePage(0, 0);
  const second = samplePage(1, 0);
  first.page.name = "사이트A 발행";
  second.page.name = "사이트B 발행";
  await saveSample(draftStore, first);
  await saveSample(draftStore, second);
  await publishStore.publishFromDraft({ site_code: first.site_code, pageKey: "main", expectedDraftRevision: 1 });
  await publishStore.publishFromDraft({ site_code: second.site_code, pageKey: "main", expectedDraftRevision: 1 });
  const a = await publishStore.readActive(first.site_code, "main");
  const b = await publishStore.readActive(second.site_code, "main");
  assert.equal(a?.published.payload.pages[0].name, "사이트A 발행");
  assert.equal(b?.published.payload.pages[0].name, "사이트B 발행");
  assert.notEqual(a?.published.id, b?.published.id);
});

test("4. 페이지별 격리", async () => {
  const { draftStore, publishStore } = await makeStores();
  const main = samplePage(0, 0);
  const company = samplePage(0, 1);
  main.page.name = "메인발행";
  company.page.name = "회사발행";
  await saveSample(draftStore, main);
  await saveSample(draftStore, company);
  await publishStore.publishFromDraft({ site_code: main.site_code, pageKey: "main", expectedDraftRevision: 1 });
  await publishStore.publishFromDraft({ site_code: company.site_code, pageKey: company.page.pageKey, expectedDraftRevision: 1 });
  const loadedMain = await publishStore.readActive(main.site_code, "main");
  const loadedCompany = await publishStore.readActive(company.site_code, company.page.pageKey);
  assert.equal(loadedMain?.published.payload.pages[0].name, "메인발행");
  assert.equal(loadedCompany?.published.payload.pages[0].name, "회사발행");
  assert.equal(loadedMain?.pageKey, "main");
  assert.equal(loadedCompany?.pageKey, company.page.pageKey);
});

test("5. 초안 revision 충돌", async () => {
  const { draftStore, publishStore } = await makeStores();
  const sample = samplePage();
  await saveSample(draftStore, sample);
  await assert.rejects(
    () => publishStore.publishFromDraft({ site_code: sample.site_code, pageKey: "main", expectedDraftRevision: 99 }),
    (error: unknown) => error instanceof DraftStoreError && error.code === "STALE_DRAFT" && error.status === 409,
  );
  const active = await publishStore.readActive(sample.site_code, "main");
  assert.equal(active, null);
});

test("6. 발행 버전 충돌", async () => {
  const draftRoot = await mkdtemp(path.join(os.tmpdir(), "aos-home-draft-"));
  const publishRoot = await mkdtemp(path.join(os.tmpdir(), "aos-home-pub-"));
  const draftStore = createDraftStore({ rootDir: draftRoot, env: "development" });
  let release: (() => void) | undefined;
  let entered = false;
  const publishStore = createPublishStore({
    rootDir: publishRoot,
    draftStore,
    env: "development",
    beforeCommit: () => {
      entered = true;
      return new Promise<void>((resolve) => {
        release = resolve;
      });
    },
  });
  const sample = samplePage();
  await saveSample(draftStore, sample);
  const first = publishStore.publishFromDraft({ site_code: sample.site_code, pageKey: "main", expectedDraftRevision: 1 });
  while (!entered) await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(
    () => publishStore.publishFromDraft({ site_code: sample.site_code, pageKey: "main", expectedDraftRevision: 1 }),
    (error: unknown) => error instanceof DraftStoreError && error.code === "PUBLISH_IN_PROGRESS" && error.status === 409,
  );
  release?.();
  const published = await first;
  assert.equal(published.document.published.version, 1);
});

test("7. 잘못된 데이터 거부", async () => {
  const { draftStore, publishStore } = await makeStores();
  const sample = samplePage();
  sample.page.sections[1] = { ...sample.page.sections[1], id: sample.page.sections[0].id };
  await assert.rejects(
    () => saveSample(draftStore, sample),
    (error: unknown) => error instanceof DraftStoreError && error.code === "DUPLICATE_SECTION_ID",
  );
  const valid = samplePage();
  await saveSample(draftStore, valid);
  await assert.rejects(
    () => publishStore.publishFromDraft({ site_code: valid.site_code, pageKey: "main", expectedDraftRevision: 0 }),
    (error: unknown) => error instanceof DraftStoreError && error.code === "VALIDATION",
  );
  await assert.rejects(
    () => publishStore.readVersion(valid.site_code, "main", 0),
    (error: unknown) => error instanceof DraftStoreError && error.code === "VALIDATION",
  );
});

test("8. 발행 실패 시 기존 버전 보존", async () => {
  const draftRoot = await mkdtemp(path.join(os.tmpdir(), "aos-home-draft-"));
  const publishRoot = await mkdtemp(path.join(os.tmpdir(), "aos-home-pub-"));
  const draftStore = createDraftStore({ rootDir: draftRoot, env: "development" });
  let failNext = false;
  const publishStore = createPublishStore({
    rootDir: publishRoot,
    draftStore,
    env: "development",
    beforeCommit: () => {
      if (failNext) throw new Error("forced publish failure");
    },
  });
  const sample = samplePage();
  sample.page.name = "유지될 발행본";
  await saveSample(draftStore, sample);
  await publishStore.publishFromDraft({ site_code: sample.site_code, pageKey: "main", expectedDraftRevision: 1 });
  sample.page.name = "실패할 발행본";
  await saveSample(draftStore, sample, 1);
  failNext = true;
  await assert.rejects(
    () => publishStore.publishFromDraft({ site_code: sample.site_code, pageKey: "main", expectedDraftRevision: 2 }),
    (error: unknown) => error instanceof Error && error.message === "forced publish failure",
  );
  const active = await publishStore.readActive(sample.site_code, "main");
  assert.equal(active?.published.version, 1);
  assert.equal(active?.published.payload.pages[0].name, "유지될 발행본");
  const history = await publishStore.listHistory(sample.site_code, "main");
  assert.equal(history[0].result, "error");
});

test("9. 이전 발행본 조회", async () => {
  const { draftStore, publishStore } = await makeStores();
  const sample = samplePage();
  sample.page.name = "v1 내용";
  await saveSample(draftStore, sample);
  await publishStore.publishFromDraft({ site_code: sample.site_code, pageKey: "main", expectedDraftRevision: 1 });
  sample.page.name = "v2 내용";
  await saveSample(draftStore, sample, 1);
  await publishStore.publishFromDraft({ site_code: sample.site_code, pageKey: "main", expectedDraftRevision: 2 });
  const versions = await publishStore.listVersions(sample.site_code, "main");
  assert.equal(versions.length, 2);
  assert.equal(versions[0].version, 2);
  assert.equal(versions[0].status, "active");
  assert.equal(versions[1].version, 1);
  assert.equal(versions[1].status, "superseded");
  const previous = await publishStore.readVersion(sample.site_code, "main", 1);
  assert.equal(previous.published.payload.pages[0].name, "v1 내용");
  const active = await publishStore.readActive(sample.site_code, "main");
  assert.equal(active?.published.payload.pages[0].name, "v2 내용");
});

test("10. 이전 발행본 복구", async () => {
  const { draftStore, publishStore } = await makeStores();
  const sample = samplePage();
  sample.page.name = "복구대상";
  await saveSample(draftStore, sample);
  await publishStore.publishFromDraft({ site_code: sample.site_code, pageKey: "main", expectedDraftRevision: 1 });
  sample.page.name = "이후초안";
  await saveSample(draftStore, sample, 1);
  await publishStore.publishFromDraft({ site_code: sample.site_code, pageKey: "main", expectedDraftRevision: 2 });
  const restored = await publishStore.restorePublishedToDraft(sample.site_code, "main", 1, 2);
  assert.equal(restored.document.draft.revision, 3);
  assert.equal(restored.document.draft.payload.pages[0].name, "복구대상");
  const active = await publishStore.readActive(sample.site_code, "main");
  assert.equal(active?.published.version, 2);
  assert.equal(active?.published.payload.pages[0].name, "이후초안");
});

test("11. 개발 환경 외 API 차단", async () => {
  const { publishStore } = await makeStores("production");
  await assert.rejects(
    () => publishStore.publishFromDraft({ site_code: "OY01470", pageKey: "main", expectedDraftRevision: 1 }),
    (error: unknown) => error instanceof DraftStoreError && error.code === "PRODUCTION_FORBIDDEN" && error.status === 403,
  );
  await assert.rejects(
    () => publishStore.readActive("OY01470", "main"),
    (error: unknown) => error instanceof DraftStoreError && error.code === "PRODUCTION_FORBIDDEN",
  );
  await assert.rejects(
    () => publishStore.listHistory("OY01470", "main"),
    (error: unknown) => error instanceof DraftStoreError && error.code === "PRODUCTION_FORBIDDEN",
  );
});

test("12. 기존 초안 저장·복원 동작 유지", async () => {
  const { draftStore, publishStore } = await makeStores();
  const sample = samplePage();
  sample.page.name = "초안1";
  await saveSample(draftStore, sample);
  sample.page.name = "초안2";
  await saveSample(draftStore, sample, 1);
  await publishStore.publishFromDraft({ site_code: sample.site_code, pageKey: "main", expectedDraftRevision: 2 });
  const restored = await draftStore.restoreVersion(sample.site_code, "main", 1, 2);
  assert.equal(restored.document.draft.revision, 3);
  assert.equal(restored.document.draft.payload.pages[0].name, "초안1");
  const current = await draftStore.readCurrent(sample.site_code, "main");
  assert.equal(current?.draft.payload.pages[0].name, "초안1");
  const active = await publishStore.readActive(sample.site_code, "main");
  assert.equal(active?.published.version, 1);
  assert.equal(active?.published.payload.pages[0].name, "초안2");
});
