/**
 * 홈페이지 디자인 데이터 계약
 *
 * 관리자(admin-site)와 홈페이지(website)가 같은 타입을 사용한다.
 * Node 파일시스템·운영 DB 코드는 포함하지 않는다.
 */

export const HOME_SECTION_TYPES = [
  "banner",
  "imagecard",
  "category",
  "multicategory",
  "html",
  "board",
  "video",
  "map",
  "calendar",
] as const;

export type HomeSectionType = (typeof HOME_SECTION_TYPES)[number];

export const HOME_LAYOUT_SECTION_TYPES = ["gnb", "gfb"] as const;
export type HomeLayoutSectionType = (typeof HOME_LAYOUT_SECTION_TYPES)[number];

export const HOME_SECTION_TYPE_LABEL: Record<HomeSectionType, string> = {
  banner: "배너",
  imagecard: "이미지카드",
  category: "카테고리",
  multicategory: "멀티카테고리",
  html: "HTML",
  board: "게시판",
  video: "동영상",
  map: "지도",
  calendar: "달력",
};

export const SUPPORTED_TEMP_CODES = ["AOS01", "AOS02", "AOS03", "AOS04"] as const;
export type SupportedTempCode = (typeof SUPPORTED_TEMP_CODES)[number];

export const MAIN_PAGE_KEY = "main";

export type HomeAlign = "left" | "center" | "right";
export type HomeProductExpose = "A" | "M" | "";
export type HomeSiteStatus = "active" | "paused";
export type HomePageKind = "main" | "sub";
export type HomeDraftStatus = "editing" | "saved";
export type HomePublishedStatus = "active" | "superseded" | "failed";
export type HomePublishRenderer = "website-json" | "frontpage-html";
export type HomePublishResult = "ok" | "error";
export type HomeDesignViewport = "pc" | "mobile";

/** 샘플 미리보기용 색상 프리셋. live img_manager.uid 가 아님 */
export type SampleImagePreset = {
  id: string;
  label: string;
  tone: string;
  accent: string;
};

export type HomeQuickMenu = {
  sortOrder: number;
  emoji: string;
  menus: string;
  links: string;
  mediaId: string | null;
};

export type HomeMultiTab = {
  sortOrder: number;
  name: string;
  desc: string;
  subExpose: HomeProductExpose;
};

export type HomeSectionProperties = {
  titlesUsage: boolean;
  titles: string;
  titlesDesc: string;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  heightPc: number;
  heightMob: number;
  slideTime: number;
  slideLoop: boolean;
  slideUsage: boolean;
  productExpose: HomeProductExpose;
  productExposeCate: string;
  align: HomeAlign;
  skinCode: string;
  html: string;
  videoUrl: string;
  address: string;
  boardName: string;
  tabs: HomeMultiTab[];
  quickMenus: HomeQuickMenu[];
};

export type HomeSectionCard = {
  id: string;
  sortOrder: number;
  enabled: boolean;
  legacyMinorNum: number;
  mediaIdPc: string | null;
  mediaIdMob: string | null;
  text1: string;
  text2: string;
  text3: string;
  text1Color: string;
  text2Color: string;
  text3Color: string;
  text1Usage: boolean;
  text2Usage: boolean;
  text3Usage: boolean;
  textBgcolor: string;
  textPosition: HomeAlign;
  cardLink: string;
  textData1: string;
};

export type HomeSection = {
  id: string;
  pageId: string;
  type: HomeSectionType;
  name: string;
  enabled: boolean;
  sortOrder: number;
  legacyUid: number | null;
  props: HomeSectionProperties;
  cards: HomeSectionCard[];
};

export type HomePage = {
  id: string;
  site_code: string;
  pageKey: string;
  name: string;
  kind: HomePageKind;
  sortOrder: number;
  legacyMinorNum: number;
  legacyUid: number | null;
  sections: HomeSection[];
  updatedAt: string;
  updatedBy: string;
};

export type HomeMedia = {
  id: string;
  site_code: string;
  legacyUid: number | null;
  fileName: string;
  fileExt: string;
  folder: string;
  urlPc: string;
  urlMob: string;
  urlThumb: string;
  samplePresetId: string | null;
};

export type HomeSite = {
  site_code: string;
  siteName: string;
  tempCode: string;
  domains: string[];
  status: HomeSiteStatus;
  pages: HomePage[];
  media: HomeMedia[];
  updatedAt: string;
  updatedBy: string;
};

export type HomeDraftPayload = {
  tempCode: string;
  pages: HomePage[];
  media: HomeMedia[];
};

export type HomeDraft = {
  id: string;
  site_code: string;
  pageId: string | null;
  payload: HomeDraftPayload;
  revision: number;
  status: HomeDraftStatus;
  updatedAt: string;
  updatedBy: string;
};

export type HomePublishedVersion = {
  id: string;
  site_code: string;
  pageKey: string;
  version: number;
  payload: HomeDraftPayload;
  renderer: HomePublishRenderer;
  status: HomePublishedStatus;
  sourceDraftRevision: number;
  publishedAt: string;
  publishedBy: string;
  note: string;
};

export type HomePublishHistory = {
  id: string;
  site_code: string;
  pageKey: string;
  versionId: string;
  actor: string;
  startedAt: string;
  finishedAt: string;
  result: HomePublishResult;
  targets: string[];
  errorMessage: string;
};

export type HomeDesignDraftDocument = {
  schema: string;
  pageKey: string;
  siteName: string;
  domains: string[];
  siteStatus: HomeSiteStatus;
  draft: HomeDraft;
};

export type HomeDesignPublishedDocument = {
  schema: string;
  pageKey: string;
  siteName: string;
  domains: string[];
  siteStatus: HomeSiteStatus;
  published: HomePublishedVersion;
};

export function isHomeSectionType(value: string): value is HomeSectionType {
  return (HOME_SECTION_TYPES as readonly string[]).includes(value);
}

export function isSupportedTempCode(value: string): value is SupportedTempCode {
  return (SUPPORTED_TEMP_CODES as readonly string[]).includes(value);
}

export function primaryDomain(site: Pick<HomeSite, "domains">): string {
  return site.domains[0] ?? "";
}
