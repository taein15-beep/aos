import assert from "node:assert/strict";
import test from "node:test";
import { convertLegacyDump } from "../lib/admin/home-design/convert.ts";
import { createEditorSection, removeSection, reorderSections, toggleSectionEnabled } from "../lib/admin/home-design/editor-ops.ts";
import {
  createDuplicateUidDump,
  createMissingFieldsDump,
  createMixedSiteDump,
  createNoSiteCodeDump,
  createUnsupportedTemplateDump,
  createValidLegacyDump,
} from "../lib/admin/home-design/fixtures.ts";
import { createSampleSites } from "../lib/admin/home-design/sample-data.ts";
import { validateHomeSite } from "../lib/admin/home-design/validate.ts";
import type { HomeSection, HomeSite } from "../lib/admin/home-design/types.ts";

function codes(issues: { code: string }[]) {
  return issues.map((item) => item.code);
}

test("1. 정상 데이터 변환", () => {
  const result = convertLegacyDump(createValidLegacyDump());
  assert.equal(result.ok, true, codes(result.issues).join(", "));
  assert.ok(result.site);
  assert.equal(result.site.site_code, "OY01470");
  assert.equal(result.site.tempCode, "AOS02");
  const main = result.site.pages.find((page) => page.pageKey === "main");
  const company = result.site.pages.find((page) => page.pageKey === "company");
  assert.ok(main);
  assert.ok(company);
  assert.equal(main.sections.length, 3);
  assert.equal(company.sections.length, 1);
  assert.equal(company.name, "회사소개");
  assert.equal(company.sections[0].type, "map");
  assert.equal(company.sections[0].props.address, "서울특별시 강남구 샘플로 12");
});

test("2. 누락 필드 처리", () => {
  const result = convertLegacyDump(createMissingFieldsDump());
  assert.ok(result.site);
  const section = result.site.pages[0].sections[0];
  assert.equal(section.enabled, false);
  assert.equal(section.sortOrder, 1);
  assert.equal(section.props.titles, "배너");
  assert.equal(section.cards.length, 1);
  assert.ok(codes(result.issues).includes("SET_ROW_MISSING"));
  assert.ok(codes(result.issues).includes("MINOR_ROW_MISSING"));
});

test("3. 사이트별 데이터 분리", () => {
  const result = convertLegacyDump(createMixedSiteDump());
  assert.ok(result.site);
  assert.equal(result.site.site_code, "OY01470");
  const ids = result.site.pages.flatMap((page) => page.sections.map((section) => section.legacyUid));
  assert.deepEqual(ids, [1]);
  assert.ok(result.issues.some((item) => item.code === "SITE_ROW_SKIPPED"));
  const other = convertLegacyDump({ ...createMixedSiteDump(), site_code: "AOS01005", siteName: "해피투어" });
  assert.ok(other.site);
  assert.equal(other.site.site_code, "AOS01005");
  assert.deepEqual(
    other.site.pages.flatMap((page) => page.sections.map((section) => section.legacyUid)),
    [2],
  );
});

test("4. 중복 ID 감지", () => {
  const converted = convertLegacyDump(createDuplicateUidDump());
  assert.equal(converted.ok, false);
  assert.ok(converted.issues.some((item) => item.code === "DUPLICATE_SECTION_ID"));

  const sample = createSampleSites()[0];
  const cloned: HomeSite = structuredClone(sample);
  cloned.pages[0].sections[1] = { ...cloned.pages[0].sections[1], id: cloned.pages[0].sections[0].id };
  const validated = validateHomeSite(cloned);
  assert.equal(validated.ok, false);
  assert.ok(validated.issues.some((item) => item.code === "DUPLICATE_SECTION_ID"));
});

test("5. 섹션 순서 보존", () => {
  const result = convertLegacyDump(createValidLegacyDump());
  const names = result.site?.pages.find((page) => page.pageKey === "main")?.sections.map((section) => section.name);
  assert.deepEqual(names, ["추천 상품", "메인 비주얼", "안내"]);
  assert.deepEqual(
    result.site?.pages.find((page) => page.pageKey === "main")?.sections.map((section) => section.sortOrder),
    [1, 2, 3],
  );
});

test("6. 이미지 참조 보존", () => {
  const result = convertLegacyDump(createValidLegacyDump());
  assert.ok(result.site);
  const banner = result.site.pages[0].sections.find((section) => section.type === "banner");
  assert.equal(banner?.cards[0].mediaIdPc, "legacy-media-501");
  const media = result.site.media.find((item) => item.id === "legacy-media-501");
  assert.ok(media);
  assert.equal(media.legacyUid, 501);
  assert.equal(media.fileName, "hero");
  assert.match(media.urlPc, /_B\.webp$/);
});

test("7. 지원하지 않는 템플릿 처리", () => {
  const result = convertLegacyDump(createUnsupportedTemplateDump());
  assert.equal(result.ok, false);
  assert.equal(result.site, null);
  assert.ok(result.issues.some((item) => item.code === "TEMP_CODE_UNSUPPORTED"));
});

test("8. 잘못된 데이터 입력 거부", () => {
  const missingSite = convertLegacyDump(createNoSiteCodeDump());
  assert.equal(missingSite.ok, false);
  assert.equal(missingSite.site, null);
  assert.ok(missingSite.issues.some((item) => item.code === "SITE_CODE_REQUIRED"));
  assert.equal(
    missingSite.issues.some((item) => String(item.message).includes("OY01470") && item.code === "SITE_CODE_REQUIRED"),
    false,
  );

  const invalidType = convertLegacyDump({
    site_code: "OY01470",
    siteName: "테스트",
    tempCode: "AOS02",
    homeDatas: [{ uid: 1, site_code: "OY01470", section: "main", gubun: "unknown", gName: "X", usage: "Y", sorting: 1 }],
    sets: [{ uid_minor: 1 }],
    minors: [{ uid_minor: 1, minor_num: 1 }],
  });
  assert.equal(invalidType.ok, false);
  assert.ok(invalidType.issues.some((item) => item.code === "SECTION_TYPE_INVALID"));

  const sample = createSampleSites()[0];
  const broken: HomeSite = structuredClone(sample);
  broken.pages[0].sections[0].sortOrder = -1;
  broken.pages[0].sections[0].cards[0].mediaIdPc = "missing-image";
  const validated = validateHomeSite(broken);
  assert.equal(validated.ok, false);
  assert.ok(validated.issues.some((item) => item.code === "SORT_ORDER_INVALID"));
  assert.ok(validated.issues.some((item) => item.code === "MEDIA_REF_INVALID"));
});

test("9. 기존 편집기 동작 유지", () => {
  const sites = createSampleSites();
  for (const site of sites) {
    const checked = validateHomeSite(site);
    assert.equal(checked.ok, true, `${site.site_code}: ${codes(checked.issues).join(", ")}`);
  }
  const site = sites[0];
  const page = site.pages[0];
  assert.ok(page.sections.length >= 2);
  const firstId = page.sections[0].id;
  const secondId = page.sections[1].id;
  const reordered = reorderSections(page.sections, firstId, 1);
  assert.equal(reordered[0].id, secondId);
  assert.equal(reordered[1].id, firstId);
  assert.deepEqual(reordered.map((item) => item.sortOrder), [1, 2, 3, 4, 5, 6].slice(0, reordered.length));

  const toggled = toggleSectionEnabled(page.sections, firstId);
  assert.equal(toggled[0].enabled, !page.sections[0].enabled);

  const created = createEditorSection(site, page, "map", 9301);
  assert.equal(created.type, "map");
  assert.equal(created.props.address.length > 0, true);
  const added: HomeSection[] = [...page.sections, created];
  assert.equal(added.length, page.sections.length + 1);
  const removed = removeSection(added, created.id);
  assert.equal(removed.length, page.sections.length);
  assert.equal(removed.some((item) => item.id === created.id), false);
});
