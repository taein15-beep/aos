import {
  HOME_SECTION_TYPES,
  MAIN_PAGE_KEY,
  isHomeSectionType,
  isSupportedTempCode,
  type HomeAlign,
  type HomeMedia,
  type HomePage,
  type HomeProductExpose,
  type HomeSection,
  type HomeSectionCard,
  type HomeSite,
} from "./types.ts";

export type ValidationIssue = {
  code: string;
  message: string;
  path: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

const SITE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/;
const PAGE_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const ALIGN: HomeAlign[] = ["left", "center", "right"];
const PRODUCT_EXPOSE: HomeProductExpose[] = ["A", "M", ""];

function issue(code: string, message: string, path: string): ValidationIssue {
  return { code, message, path };
}

function isIsoDate(value: string): boolean {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function validateSiteCode(siteCode: unknown, path = "site_code"): ValidationIssue[] {
  if (typeof siteCode !== "string" || !siteCode.trim()) {
    return [issue("SITE_CODE_REQUIRED", "사이트코드는 필수입니다. 운영 기본값을 넣지 않습니다.", path)];
  }
  const trimmed = siteCode.trim();
  if (!SITE_CODE_PATTERN.test(trimmed)) {
    return [issue("SITE_CODE_INVALID", `사이트코드 형식이 올바르지 않습니다: ${trimmed}`, path)];
  }
  return [];
}

export function validatePageKey(pageKey: unknown, path = "pageKey"): ValidationIssue[] {
  if (typeof pageKey !== "string" || !pageKey.trim()) {
    return [issue("PAGE_KEY_REQUIRED", "페이지코드는 필수입니다.", path)];
  }
  const trimmed = pageKey.trim();
  if (!PAGE_KEY_PATTERN.test(trimmed)) {
    return [issue("PAGE_KEY_INVALID", `페이지코드 형식이 올바르지 않습니다: ${trimmed}`, path)];
  }
  return [];
}

function validateCard(card: HomeSectionCard, path: string, mediaIds: Set<string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!card.id) issues.push(issue("CARD_ID_REQUIRED", "카드 ID는 필수입니다.", `${path}.id`));
  if (!isPositiveInt(card.sortOrder)) {
    issues.push(issue("SORT_ORDER_INVALID", "카드 정렬순서는 1 이상의 정수여야 합니다.", `${path}.sortOrder`));
  }
  if (!ALIGN.includes(card.textPosition)) {
    issues.push(issue("ALIGN_INVALID", "텍스트 정렬 값이 올바르지 않습니다.", `${path}.textPosition`));
  }
  for (const field of ["mediaIdPc", "mediaIdMob"] as const) {
    const mediaId = card[field];
    if (mediaId && !mediaIds.has(mediaId)) {
      issues.push(issue("MEDIA_REF_INVALID", `이미지 참조를 찾을 수 없습니다: ${mediaId}`, `${path}.${field}`));
    }
  }
  return issues;
}

function validateSection(section: HomeSection, page: HomePage, mediaIds: Set<string>): ValidationIssue[] {
  const path = `pages.${page.pageKey}.sections.${section.id}`;
  const issues: ValidationIssue[] = [];
  if (!section.id) issues.push(issue("SECTION_ID_REQUIRED", "섹션 ID는 필수입니다.", `${path}.id`));
  if (section.pageId !== page.id) {
    issues.push(issue("SECTION_PAGE_MISMATCH", "섹션의 pageId가 소속 페이지와 다릅니다.", `${path}.pageId`));
  }
  if (!isHomeSectionType(section.type)) {
    issues.push(
      issue(
        "SECTION_TYPE_INVALID",
        `지원하지 않는 섹션 유형입니다: ${section.type}. 허용: ${HOME_SECTION_TYPES.join(", ")}`,
        `${path}.type`,
      ),
    );
  }
  if (typeof section.name !== "string" || !section.name.trim()) {
    issues.push(issue("SECTION_NAME_REQUIRED", "섹션 이름은 필수입니다.", `${path}.name`));
  }
  if (!isPositiveInt(section.sortOrder)) {
    issues.push(issue("SORT_ORDER_INVALID", "섹션 정렬순서는 1 이상의 정수여야 합니다.", `${path}.sortOrder`));
  }
  if (!ALIGN.includes(section.props.align)) {
    issues.push(issue("ALIGN_INVALID", "섹션 정렬 값이 올바르지 않습니다.", `${path}.props.align`));
  }
  if (!PRODUCT_EXPOSE.includes(section.props.productExpose)) {
    issues.push(issue("PRODUCT_EXPOSE_INVALID", "상품노출 값이 올바르지 않습니다.", `${path}.props.productExpose`));
  }
  if (section.props.heightPc < 0 || section.props.heightMob < 0) {
    issues.push(issue("HEIGHT_INVALID", "섹션 높이는 0 이상이어야 합니다.", `${path}.props.height`));
  }
  for (const mediaId of section.props.quickMenus.map((item) => item.mediaId)) {
    if (mediaId && !mediaIds.has(mediaId)) {
      issues.push(issue("MEDIA_REF_INVALID", `퀵메뉴 이미지 참조를 찾을 수 없습니다: ${mediaId}`, `${path}.props.quickMenus`));
    }
  }
  const cardIds = new Set<string>();
  for (const [index, card] of section.cards.entries()) {
    if (cardIds.has(card.id)) {
      issues.push(issue("DUPLICATE_CARD_ID", `카드 ID가 중복됩니다: ${card.id}`, `${path}.cards.${index}.id`));
    }
    cardIds.add(card.id);
    issues.push(...validateCard(card, `${path}.cards.${index}`, mediaIds));
  }
  return issues;
}

export function validateHomePage(page: HomePage, siteCode: string, mediaIds: Set<string>): ValidationIssue[] {
  const path = `pages.${page.pageKey || page.id}`;
  const issues: ValidationIssue[] = [];
  issues.push(...validatePageKey(page.pageKey, `${path}.pageKey`));
  if (page.site_code !== siteCode) {
    issues.push(issue("PAGE_SITE_MISMATCH", "페이지의 사이트코드가 사이트와 다릅니다.", `${path}.site_code`));
  }
  if (page.kind === "main" && page.pageKey !== MAIN_PAGE_KEY) {
    issues.push(issue("MAIN_PAGE_KEY", "메인 페이지의 pageKey는 main 이어야 합니다.", `${path}.pageKey`));
  }
  if (page.kind !== "main" && page.kind !== "sub") {
    issues.push(issue("PAGE_KIND_INVALID", "페이지 종류는 main 또는 sub 여야 합니다.", `${path}.kind`));
  }
  if (typeof page.name !== "string" || !page.name.trim()) {
    issues.push(issue("PAGE_NAME_REQUIRED", "페이지 이름은 필수입니다.", `${path}.name`));
  }
  if (!Array.isArray(page.sections)) {
    issues.push(issue("VALIDATION", "섹션 목록이 올바르지 않습니다.", `${path}.sections`));
    return issues;
  }
  if (!isNonNegativeInt(page.sortOrder)) {
    issues.push(issue("SORT_ORDER_INVALID", "페이지 정렬순서는 0 이상의 정수여야 합니다.", `${path}.sortOrder`));
  }
  if (!isIsoDate(page.updatedAt)) {
    issues.push(issue("UPDATED_AT_INVALID", "수정일시가 ISO 형식이 아닙니다.", `${path}.updatedAt`));
  }
  const sectionIds = new Set<string>();
  const sortOrders = new Set<number>();
  for (const section of page.sections) {
    if (sectionIds.has(section.id)) {
      issues.push(issue("DUPLICATE_SECTION_ID", `섹션 ID가 중복됩니다: ${section.id}`, `${path}.sections`));
    }
    sectionIds.add(section.id);
    if (sortOrders.has(section.sortOrder)) {
      issues.push(issue("DUPLICATE_SORT_ORDER", `섹션 정렬순서가 중복됩니다: ${section.sortOrder}`, `${path}.sections`));
    }
    sortOrders.add(section.sortOrder);
    issues.push(...validateSection(section, page, mediaIds));
  }
  return issues;
}

function validateMedia(media: HomeMedia, siteCode: string): ValidationIssue[] {
  const path = `media.${media.id}`;
  const issues: ValidationIssue[] = [];
  if (!media.id) issues.push(issue("MEDIA_ID_REQUIRED", "미디어 ID는 필수입니다.", `${path}.id`));
  if (media.site_code !== siteCode) {
    issues.push(issue("MEDIA_SITE_MISMATCH", "미디어의 사이트코드가 사이트와 다릅니다.", `${path}.site_code`));
  }
  return issues;
}

export function validateHomeSite(site: HomeSite): ValidationResult {
  const issues: ValidationIssue[] = [];
  issues.push(...validateSiteCode(site.site_code));
  if (!site.siteName.trim()) {
    issues.push(issue("SITE_NAME_REQUIRED", "사이트 이름은 필수입니다.", "siteName"));
  }
  if (!isSupportedTempCode(site.tempCode)) {
    issues.push(issue("TEMP_CODE_UNSUPPORTED", `지원하지 않는 템플릿 코드입니다: ${site.tempCode}`, "tempCode"));
  }
  if (!isIsoDate(site.updatedAt)) {
    issues.push(issue("UPDATED_AT_INVALID", "수정일시가 ISO 형식이 아닙니다.", "updatedAt"));
  }
  if (!site.updatedBy.trim()) {
    issues.push(issue("UPDATED_BY_REQUIRED", "수정자는 필수입니다.", "updatedBy"));
  }

  const mediaIds = new Set<string>();
  for (const item of site.media) {
    if (mediaIds.has(item.id)) {
      issues.push(issue("DUPLICATE_MEDIA_ID", `미디어 ID가 중복됩니다: ${item.id}`, "media"));
    }
    mediaIds.add(item.id);
    issues.push(...validateMedia(item, site.site_code));
  }

  const pageKeys = new Set<string>();
  const pageIds = new Set<string>();
  let mainCount = 0;
  for (const page of site.pages) {
    if (pageIds.has(page.id)) {
      issues.push(issue("DUPLICATE_PAGE_ID", `페이지 ID가 중복됩니다: ${page.id}`, "pages"));
    }
    pageIds.add(page.id);
    if (pageKeys.has(page.pageKey)) {
      issues.push(issue("DUPLICATE_PAGE_KEY", `페이지코드가 중복됩니다: ${page.pageKey}`, "pages"));
    }
    pageKeys.add(page.pageKey);
    if (page.kind === "main") mainCount += 1;
    issues.push(...validateHomePage(page, site.site_code, mediaIds));
  }
  if (mainCount !== 1) {
    issues.push(issue("MAIN_PAGE_COUNT", "사이트마다 메인 페이지가 정확히 하나여야 합니다.", "pages"));
  }

  return { ok: issues.length === 0, issues };
}

export function validateHomeDraftSlice(input: {
  site_code: string;
  pageKey: string;
  tempCode: string;
  page: HomePage;
  media: HomeMedia[];
}): ValidationResult {
  const issues: ValidationIssue[] = [];
  issues.push(...validateSiteCode(input.site_code));
  issues.push(...validatePageKey(input.pageKey));
  if (!isSupportedTempCode(input.tempCode)) {
    issues.push(issue("TEMP_CODE_UNSUPPORTED", `지원하지 않는 템플릿 코드입니다: ${input.tempCode}`, "tempCode"));
  }
  if (input.page.site_code !== input.site_code) {
    issues.push(issue("SITE_CODE_MISMATCH", "요청한 사이트코드와 초안 데이터의 사이트코드가 다릅니다.", "page.site_code"));
  }
  if (input.page.pageKey !== input.pageKey) {
    issues.push(issue("PAGE_KEY_MISMATCH", "요청한 페이지코드와 초안 데이터의 페이지코드가 다릅니다.", "page.pageKey"));
  }
  const mediaIds = new Set<string>();
  for (const item of input.media) {
    if (mediaIds.has(item.id)) {
      issues.push(issue("DUPLICATE_MEDIA_ID", `미디어 ID가 중복됩니다: ${item.id}`, "media"));
    }
    mediaIds.add(item.id);
    issues.push(...validateMedia(item, input.site_code));
  }
  issues.push(...validateHomePage(input.page, input.site_code, mediaIds));
  return { ok: issues.length === 0, issues };
}
