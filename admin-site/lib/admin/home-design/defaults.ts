import type {
  HomeAlign,
  HomePage,
  HomeSection,
  HomeSectionCard,
  HomeSectionProperties,
  HomeSectionType,
  HomeSite,
} from "./types.ts";
import { HOME_SECTION_TYPE_LABEL, MAIN_PAGE_KEY } from "./types.ts";

export const SAMPLE_ACTOR = "sample";
export const MIGRATION_ACTOR = "migration";
export const SAMPLE_UPDATED_AT = "2026-11-02T00:00:00.000Z";

export function emptyProps(patch: Partial<HomeSectionProperties> = {}): HomeSectionProperties {
  return {
    titlesUsage: true,
    titles: "",
    titlesDesc: "",
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    heightPc: 420,
    heightMob: 280,
    slideTime: 4,
    slideLoop: true,
    slideUsage: true,
    productExpose: "",
    productExposeCate: "",
    align: "center",
    skinCode: "01",
    html: "",
    videoUrl: "",
    address: "",
    boardName: "",
    tabs: [],
    quickMenus: [],
    ...patch,
  };
}

export function emptyCard(sortOrder: number, patch: Partial<HomeSectionCard> = {}): HomeSectionCard {
  return {
    id: patch.id ?? `card-${sortOrder}`,
    sortOrder,
    enabled: true,
    legacyMinorNum: patch.legacyMinorNum ?? sortOrder,
    mediaIdPc: null,
    mediaIdMob: null,
    text1: "",
    text2: "",
    text3: "",
    text1Color: "#ffffff",
    text2Color: "#ffffff",
    text3Color: "#e2e8f0",
    text1Usage: true,
    text2Usage: true,
    text3Usage: true,
    textBgcolor: "#0f172a",
    textPosition: "center" satisfies HomeAlign,
    cardLink: "",
    textData1: "",
    ...patch,
  };
}

export function emptySection(
  page: Pick<HomePage, "id">,
  type: HomeSectionType,
  sortOrder: number,
  patch: Partial<Omit<HomeSection, "props" | "cards">> & {
    props?: Partial<HomeSectionProperties>;
    cards?: HomeSectionCard[];
  } = {},
): HomeSection {
  const { props, cards, ...rest } = patch;
  return {
    id: rest.id ?? `section-${type}-${sortOrder}`,
    pageId: page.id,
    type,
    name: rest.name ?? HOME_SECTION_TYPE_LABEL[type],
    enabled: rest.enabled ?? true,
    sortOrder,
    legacyUid: rest.legacyUid ?? null,
    props: emptyProps({ titles: HOME_SECTION_TYPE_LABEL[type], ...props }),
    cards: cards ?? [emptyCard(1)],
  };
}

export function emptyMainPage(siteCode: string, patch: Partial<HomePage> = {}): HomePage {
  const { site_code: _siteCode, pageKey: _pageKey, kind: _kind, ...rest } = patch;
  return {
    id: rest.id ?? `page-${siteCode}-main`,
    name: "메인페이지",
    sortOrder: 0,
    legacyMinorNum: 0,
    legacyUid: null,
    sections: [],
    updatedAt: SAMPLE_UPDATED_AT,
    updatedBy: SAMPLE_ACTOR,
    ...rest,
    site_code: siteCode,
    pageKey: MAIN_PAGE_KEY,
    kind: "main",
  };
}

export function emptySite(siteCode: string, patch: Partial<HomeSite> = {}): HomeSite {
  const pages = patch.pages ?? [emptyMainPage(siteCode)];
  return {
    site_code: siteCode,
    siteName: patch.siteName ?? siteCode,
    tempCode: patch.tempCode ?? "AOS02",
    domains: patch.domains ?? [],
    status: patch.status ?? "active",
    pages,
    media: patch.media ?? [],
    updatedAt: patch.updatedAt ?? SAMPLE_UPDATED_AT,
    updatedBy: patch.updatedBy ?? SAMPLE_ACTOR,
  };
}

export function toIsoDate(raw: unknown, fallback = SAMPLE_UPDATED_AT): string {
  const text = String(raw ?? "").trim();
  if (!text) return fallback;
  if (/^\d{14}$/.test(text)) {
    const iso = `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T${text.slice(8, 10)}:${text.slice(10, 12)}:${text.slice(12, 14)}.000Z`;
    return Number.isFinite(Date.parse(iso)) ? iso : fallback;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}
