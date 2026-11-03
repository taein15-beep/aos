import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDraftStore, DraftStoreError } from "../lib/admin/home-design/draft-store.ts";
import { createSampleSites } from "../lib/admin/home-design/sample-data.ts";
import type { HomePage } from "../lib/admin/home-design/types.ts";

async function makeStore(env = "development") {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "aos-home-draft-"));
  return createDraftStore({ rootDir, env });
}

function samplePage(siteIndex = 0, pageIndex = 0): { page: HomePage; siteName: string; domains: string[]; tempCode: string; media: ReturnType<typeof createSampleSites>[0]["media"]; site_code: string } {
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

test("1. 초안 신규 저장", async () => {
  const store = await makeStore();
  const sample = samplePage();
  const result = await store.saveDraft({ ...sample, pageKey: sample.page.pageKey, expectedRevision: 0 });
  assert.equal(result.document.draft.revision, 1);
  assert.equal(result.backupRevision, null);
  assert.equal(result.document.draft.site_code, sample.site_code);
  assert.equal(result.document.pageKey, "main");
});

test("2. 저장된 초안 불러오기", async () => {
  const store = await makeStore();
  const sample = samplePage();
  sample.page.name = "저장된 메인";
  await store.saveDraft({ ...sample, pageKey: "main", expectedRevision: 0 });
  const loaded = await store.readCurrent(sample.site_code, "main");
  assert.ok(loaded);
  assert.equal(loaded.draft.payload.pages[0].name, "저장된 메인");
  assert.equal(loaded.draft.revision, 1);
});

test("3. 기존 초안 수정", async () => {
  const store = await makeStore();
  const sample = samplePage();
  await store.saveDraft({ ...sample, pageKey: "main", expectedRevision: 0 });
  sample.page.name = "두 번째 저장";
  const second = await store.saveDraft({ ...sample, pageKey: "main", expectedRevision: 1 });
  assert.equal(second.document.draft.revision, 2);
  assert.equal(second.backupRevision, 1);
  const loaded = await store.readCurrent(sample.site_code, "main");
  assert.equal(loaded?.draft.payload.pages[0].name, "두 번째 저장");
});

test("4. 사이트별 저장 분리", async () => {
  const store = await makeStore();
  const first = samplePage(0, 0);
  const second = samplePage(1, 0);
  first.page.name = "사이트A";
  second.page.name = "사이트B";
  await store.saveDraft({ ...first, pageKey: "main", expectedRevision: 0 });
  await store.saveDraft({ ...second, pageKey: "main", expectedRevision: 0 });
  const a = await store.readCurrent(first.site_code, "main");
  const b = await store.readCurrent(second.site_code, "main");
  assert.equal(a?.draft.payload.pages[0].name, "사이트A");
  assert.equal(b?.draft.payload.pages[0].name, "사이트B");
  const listed = await store.listDrafts();
  assert.equal(listed.length, 2);
  assert.deepEqual(listed.map((item) => item.site_code).sort(), [first.site_code, second.site_code].sort());
});

test("5. 페이지별 저장 분리", async () => {
  const store = await makeStore();
  const main = samplePage(0, 0);
  const company = samplePage(0, 1);
  main.page.name = "메인초안";
  company.page.name = "회사초안";
  await store.saveDraft({ ...main, pageKey: "main", expectedRevision: 0 });
  await store.saveDraft({ ...company, pageKey: company.page.pageKey, expectedRevision: 0 });
  const loadedMain = await store.readCurrent(main.site_code, "main");
  const loadedCompany = await store.readCurrent(company.site_code, company.page.pageKey);
  assert.equal(loadedMain?.draft.payload.pages[0].name, "메인초안");
  assert.equal(loadedCompany?.draft.payload.pages[0].name, "회사초안");
});

test("6. revision 충돌 감지", async () => {
  const store = await makeStore();
  const sample = samplePage();
  await store.saveDraft({ ...sample, pageKey: "main", expectedRevision: 0 });
  sample.page.name = "충돌";
  await assert.rejects(
    () => store.saveDraft({ ...sample, pageKey: "main", expectedRevision: 0 }),
    (error: unknown) => error instanceof DraftStoreError && error.code === "STALE_DRAFT" && error.status === 409,
  );
  const loaded = await store.readCurrent(sample.site_code, "main");
  assert.equal(loaded?.draft.payload.pages[0].name, createSampleSites()[0].pages[0].name);
});

test("7. 잘못된 데이터 거부", async () => {
  const store = await makeStore();
  const sample = samplePage();
  const broken = structuredClone(sample.page);
  broken.sections[1] = { ...broken.sections[1], id: broken.sections[0].id };
  await assert.rejects(
    () => store.saveDraft({ ...sample, page: broken, pageKey: "main", expectedRevision: 0 }),
    (error: unknown) => error instanceof DraftStoreError && error.code === "DUPLICATE_SECTION_ID",
  );
  const otherSite = structuredClone(sample.page);
  otherSite.site_code = "AOS01005";
  await assert.rejects(
    () => store.saveDraft({ ...sample, page: otherSite, pageKey: "main", expectedRevision: 0 }),
    (error: unknown) => error instanceof DraftStoreError && error.code === "SITE_CODE_MISMATCH",
  );
  await assert.rejects(
    () => store.readCurrent("../etc", "passwd"),
    (error: unknown) => error instanceof DraftStoreError && (error.code === "SITE_CODE_INVALID" || error.code === "PATH_FORBIDDEN"),
  );
});

test("8. 저장 실패 시 기존 파일 보존", async () => {
  const store = await makeStore();
  const sample = samplePage();
  sample.page.name = "원본유지";
  await store.saveDraft({ ...sample, pageKey: "main", expectedRevision: 0 });
  const currentFile = path.join(store.rootDir, sample.site_code, "main", "current.json");
  const before = await readFile(currentFile, "utf8");
  const broken = structuredClone(sample.page);
  broken.sections[0].id = broken.sections[1].id;
  broken.name = "실패본";
  await assert.rejects(() => store.saveDraft({ ...sample, page: broken, pageKey: "main", expectedRevision: 1 }));
  const after = await readFile(currentFile, "utf8");
  assert.equal(after, before);
  const loaded = await store.readCurrent(sample.site_code, "main");
  assert.equal(loaded?.draft.payload.pages[0].name, "원본유지");
});

test("9. 이전 버전 조회 및 복원", async () => {
  const store = await makeStore();
  const sample = samplePage();
  sample.page.name = "버전1";
  await store.saveDraft({ ...sample, pageKey: "main", expectedRevision: 0 });
  sample.page.name = "버전2";
  await store.saveDraft({ ...sample, pageKey: "main", expectedRevision: 1 });
  const versions = await store.listVersions(sample.site_code, "main");
  assert.equal(versions[0].revision, 1);
  const restored = await store.restoreVersion(sample.site_code, "main", 1, 2);
  assert.equal(restored.document.draft.revision, 3);
  assert.equal(restored.document.draft.payload.pages[0].name, "버전1");
  const current = await store.readCurrent(sample.site_code, "main");
  assert.equal(current?.draft.payload.pages[0].name, "버전1");
});

test("10. 운영 환경 API 차단", async () => {
  const store = await makeStore("production");
  const sample = samplePage();
  await assert.rejects(
    () => store.saveDraft({ ...sample, pageKey: "main", expectedRevision: 0 }),
    (error: unknown) => error instanceof DraftStoreError && error.code === "PRODUCTION_FORBIDDEN" && error.status === 403,
  );
  await assert.rejects(
    () => store.listDrafts(),
    (error: unknown) => error instanceof DraftStoreError && error.code === "PRODUCTION_FORBIDDEN",
  );
  await assert.rejects(
    () => store.readCurrent(sample.site_code, "main"),
    (error: unknown) => error instanceof DraftStoreError && error.code === "PRODUCTION_FORBIDDEN",
  );
});

test("손상된 JSON은 거부하고 경로 밖 쓰기를 막는다", async () => {
  const store = await makeStore();
  const sample = samplePage();
  await store.saveDraft({ ...sample, pageKey: "main", expectedRevision: 0 });
  const currentFile = path.join(store.rootDir, sample.site_code, "main", "current.json");
  await writeFile(currentFile, "{not-json", "utf8");
  await assert.rejects(
    () => store.readCurrent(sample.site_code, "main"),
    (error: unknown) => error instanceof DraftStoreError && error.code === "INVALID_JSON",
  );
});
