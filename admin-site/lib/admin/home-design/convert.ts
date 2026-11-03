import { emptyCard, emptyMainPage, emptyProps, MIGRATION_ACTOR, toIsoDate } from "./defaults.ts";
import {
  HOME_LAYOUT_SECTION_TYPES,
  MAIN_PAGE_KEY,
  isHomeSectionType,
  isSupportedTempCode,
  type HomeAlign,
  type HomeMedia,
  type HomeMultiTab,
  type HomePage,
  type HomeProductExpose,
  type HomeQuickMenu,
  type HomeSection,
  type HomeSectionCard,
  type HomeSectionType,
  type HomeSite,
} from "./types.ts";
import { validateHomeSite, validateSiteCode, type ValidationIssue } from "./validate.ts";

export type ConvertIssue = ValidationIssue & {
  level: "error" | "warning";
  legacyUid?: number;
};

export type ConvertResult = {
  ok: boolean;
  site: HomeSite | null;
  issues: ConvertIssue[];
};

export type LegacyHomeDatasRow = {
  uid?: unknown;
  site_code?: unknown;
  tempCode?: unknown;
  section?: unknown;
  gubun?: unknown;
  gName?: unknown;
  gAdd?: unknown;
  usage?: unknown;
  sorting?: unknown;
  minor_num?: unknown;
  minor_num2?: unknown;
  up_date?: unknown;
};

export type LegacySetRow = {
  uid_minor?: unknown;
  titles_usage?: unknown;
  titles?: unknown;
  titles_desc?: unknown;
  left_margin?: unknown;
  right_margin?: unknown;
  top_margin?: unknown;
  bottom_margin?: unknown;
  section_height_pc?: unknown;
  section_height_mob?: unknown;
  slide_time?: unknown;
  slide_loop?: unknown;
  slide_usage?: unknown;
  productExpose?: unknown;
  productExposeCate?: unknown;
  section_num?: unknown;
  align?: unknown;
};

export type LegacyMinorRow = {
  uid_minor?: unknown;
  sub_minor?: unknown;
  minor_num?: unknown;
  image_pc?: unknown;
  image_mob?: unknown;
  text1?: unknown;
  text2?: unknown;
  text3?: unknown;
  text1_color?: unknown;
  text2_color?: unknown;
  text3_color?: unknown;
  text1_usage?: unknown;
  text2_usage?: unknown;
  text3_usage?: unknown;
  text_bgcolor?: unknown;
  text_position?: unknown;
  card_link?: unknown;
  usage?: unknown;
  text_data1?: unknown;
  video_url?: unknown;
  map_address?: unknown;
  board_name?: unknown;
  minor_subject?: unknown;
};

export type LegacyMultiRow = {
  uid_minor?: unknown;
  minor_num?: unknown;
  multi_name?: unknown;
  multi_desc?: unknown;
  subExpose?: unknown;
};

export type LegacySubRow = {
  uid_minor?: unknown;
  minor_num?: unknown;
  emoji?: unknown;
  menus?: unknown;
  links?: unknown;
  imgUid?: unknown;
};

export type LegacyImageRow = {
  uid?: unknown;
  siteCode?: unknown;
  file_name?: unknown;
  file_ext?: unknown;
  file_folder?: unknown;
};

export type LegacyHomeDump = {
  site_code?: unknown;
  siteName?: unknown;
  tempCode?: unknown;
  domain?: unknown;
  homeDatas?: LegacyHomeDatasRow[];
  sets?: LegacySetRow[];
  minors?: LegacyMinorRow[];
  multis?: LegacyMultiRow[];
  subs?: LegacySubRow[];
  images?: LegacyImageRow[];
};

function convertIssue(
  level: ConvertIssue["level"],
  code: string,
  message: string,
  path: string,
  legacyUid?: number,
): ConvertIssue {
  return { level, code, message, path, legacyUid };
}

function asText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function asInt(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const num = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(num) ? Math.trunc(num) : fallback;
}

function asUsage(value: unknown): boolean {
  return asText(value).toUpperCase() === "Y";
}

function asAlign(value: unknown, fallback: HomeAlign = "center"): HomeAlign {
  const text = asText(value).toLowerCase();
  if (text === "left" || text === "center" || text === "right") return text;
  return fallback;
}

function asProductExpose(value: unknown): HomeProductExpose {
  const text = asText(value).toUpperCase();
  if (text === "A" || text === "M") return text;
  return "";
}

function mediaIdFromLegacy(uid: number): string {
  return `legacy-media-${uid}`;
}

function sectionIdFromLegacy(uid: number): string {
  return `legacy-section-${uid}`;
}

function pageIdFromLegacy(siteCode: string, pageKey: string, uid?: number): string {
  if (pageKey === MAIN_PAGE_KEY) return `page-${siteCode}-main`;
  return uid ? `legacy-page-${uid}` : `page-${siteCode}-${pageKey}`;
}

function cardIdFromLegacy(sectionUid: number, minorNum: number): string {
  return `legacy-card-${sectionUid}-${minorNum}`;
}

function isBlankGubun(value: unknown): boolean {
  return asText(value) === "";
}

function isLayoutType(value: string): boolean {
  return (HOME_LAYOUT_SECTION_TYPES as readonly string[]).includes(value);
}

function groupByUidMinor<T extends { uid_minor?: unknown }>(rows: T[] | undefined): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows ?? []) {
    const uid = asInt(row.uid_minor, NaN);
    if (!Number.isFinite(uid)) continue;
    const list = map.get(uid) ?? [];
    list.push(row);
    map.set(uid, list);
  }
  return map;
}

function convertImage(row: LegacyImageRow, siteCode: string, issues: ConvertIssue[]): HomeMedia | null {
  const uid = asInt(row.uid, NaN);
  if (!Number.isFinite(uid) || uid <= 0) {
    issues.push(convertIssue("warning", "IMAGE_UID_MISSING", "이미지 uid가 없어 건너뜁니다.", "images"));
    return null;
  }
  const imageSite = asText(row.siteCode);
  if (imageSite && imageSite !== siteCode) {
    issues.push(convertIssue("warning", "IMAGE_SITE_SKIPPED", `다른 사이트 이미지는 제외합니다: ${imageSite}`, "images", uid));
    return null;
  }
  const fileName = asText(row.file_name);
  const fileExt = asText(row.file_ext, "jpg");
  const folder = asText(row.file_folder);
  const base = folder && fileName ? `${folder}/${fileName}` : "";
  return {
    id: mediaIdFromLegacy(uid),
    site_code: siteCode,
    legacyUid: uid,
    fileName,
    fileExt,
    folder,
    urlPc: base ? `${base}_B.${fileExt}` : "",
    urlMob: base ? `${base}_M.${fileExt}` : "",
    urlThumb: base ? `${base}_S.${fileExt}` : "",
    samplePresetId: null,
  };
}

function convertCard(
  row: LegacyMinorRow,
  sectionUid: number,
  mediaIds: Set<string>,
  issues: ConvertIssue[],
): HomeSectionCard {
  const minorNum = asInt(row.minor_num, 1);
  const imagePc = asInt(row.image_pc, 0);
  const imageMob = asInt(row.image_mob, 0);
  let mediaIdPc: string | null = imagePc > 0 ? mediaIdFromLegacy(imagePc) : null;
  let mediaIdMob: string | null = imageMob > 0 ? mediaIdFromLegacy(imageMob) : null;
  if (mediaIdPc && !mediaIds.has(mediaIdPc)) {
    issues.push(
      convertIssue("warning", "IMAGE_UID_UNRESOLVED", `image_pc uid ${imagePc} 를 미디어 목록에서 찾지 못했습니다.`, `HomeDatas_minor.${sectionUid}.${minorNum}`, sectionUid),
    );
  }
  if (mediaIdMob && !mediaIds.has(mediaIdMob)) {
    issues.push(
      convertIssue("warning", "IMAGE_UID_UNRESOLVED", `image_mob uid ${imageMob} 를 미디어 목록에서 찾지 못했습니다.`, `HomeDatas_minor.${sectionUid}.${minorNum}`, sectionUid),
    );
  }
  return emptyCard(minorNum, {
    id: cardIdFromLegacy(sectionUid, minorNum),
    sortOrder: minorNum,
    enabled: row.usage === undefined || row.usage === null ? true : asUsage(row.usage),
    legacyMinorNum: minorNum,
    mediaIdPc,
    mediaIdMob,
    text1: asText(row.text1),
    text2: asText(row.text2),
    text3: asText(row.text3),
    text1Color: asText(row.text1_color, "#ffffff"),
    text2Color: asText(row.text2_color, "#ffffff"),
    text3Color: asText(row.text3_color, "#e2e8f0"),
    text1Usage: row.text1_usage === undefined ? true : asUsage(row.text1_usage),
    text2Usage: row.text2_usage === undefined ? true : asUsage(row.text2_usage),
    text3Usage: row.text3_usage === undefined ? true : asUsage(row.text3_usage),
    textBgcolor: asText(row.text_bgcolor, "#0f172a"),
    textPosition: asAlign(row.text_position),
    cardLink: asText(row.card_link),
    textData1: asText(row.text_data1),
  });
}

function convertTabs(rows: LegacyMultiRow[] | undefined): HomeMultiTab[] {
  return [...(rows ?? [])]
    .sort((a, b) => asInt(a.minor_num) - asInt(b.minor_num))
    .map((row) => ({
      sortOrder: asInt(row.minor_num, 1),
      name: asText(row.multi_name, "이름변경"),
      desc: asText(row.multi_desc),
      subExpose: asProductExpose(row.subExpose),
    }));
}

function convertQuickMenus(rows: LegacySubRow[] | undefined, mediaIds: Set<string>, issues: ConvertIssue[], sectionUid: number): HomeQuickMenu[] {
  return [...(rows ?? [])]
    .sort((a, b) => asInt(a.minor_num) - asInt(b.minor_num))
    .map((row) => {
      const imgUid = asInt(row.imgUid, 0);
      let mediaId: string | null = imgUid > 0 ? mediaIdFromLegacy(imgUid) : null;
      if (mediaId && !mediaIds.has(mediaId)) {
        issues.push(convertIssue("warning", "IMAGE_UID_UNRESOLVED", `퀵메뉴 imgUid ${imgUid} 를 찾지 못했습니다.`, `HomeDatas_sub.${sectionUid}`, sectionUid));
      }
      return {
        sortOrder: asInt(row.minor_num, 1),
        emoji: asText(row.emoji),
        menus: asText(row.menus),
        links: asText(row.links),
        mediaId,
      };
    });
}

function applyTypeHeuristics(type: HomeSectionType, props: HomeSection["props"], cards: HomeSectionCard[], minor?: LegacyMinorRow) {
  const first = cards[0];
  if (type === "html") {
    props.html = first?.textData1 || asText(minor?.text_data1);
  }
  if (type === "video") {
    props.videoUrl = asText(minor?.video_url) || first?.cardLink || first?.text1 || "";
  }
  if (type === "map") {
    props.address = asText(minor?.map_address) || first?.text1 || "";
  }
  if (type === "board") {
    props.boardName = asText(minor?.board_name) || asText(minor?.minor_subject) || first?.text1 || "";
  }
}

function convertSection(
  row: LegacyHomeDatasRow,
  page: HomePage,
  setMap: Map<number, LegacySetRow[]>,
  minorMap: Map<number, LegacyMinorRow[]>,
  multiMap: Map<number, LegacyMultiRow[]>,
  subMap: Map<number, LegacySubRow[]>,
  mediaIds: Set<string>,
  issues: ConvertIssue[],
): HomeSection | null {
  const uid = asInt(row.uid, NaN);
  if (!Number.isFinite(uid) || uid <= 0) {
    issues.push(convertIssue("error", "SECTION_UID_MISSING", "HomeDatas.uid 가 없어 섹션을 변환하지 못했습니다.", "homeDatas"));
    return null;
  }
  const gubun = asText(row.gubun).toLowerCase();
  if (isLayoutType(gubun)) {
    issues.push(convertIssue("warning", "LAYOUT_SECTION_SKIPPED", `GNB/GFB 섹션은 1차 변환에서 건너뜁니다: ${gubun}`, `homeDatas.${uid}`, uid));
    return null;
  }
  if (!isHomeSectionType(gubun)) {
    issues.push(convertIssue("error", "SECTION_TYPE_INVALID", `지원하지 않는 섹션 유형입니다: ${gubun || "(빈 값)"}`, `homeDatas.${uid}`, uid));
    return null;
  }

  const setRow = (setMap.get(uid) ?? [])[0];
  if (!setRow) {
    issues.push(convertIssue("warning", "SET_ROW_MISSING", "HomeDatas_set 행이 없어 기본 속성을 넣습니다.", `homeDatas.${uid}`, uid));
  }
  const minorRows = [...(minorMap.get(uid) ?? [])].sort((a, b) => asInt(a.minor_num) - asInt(b.minor_num));
  const cards = minorRows.length
    ? minorRows.map((item) => convertCard(item, uid, mediaIds, issues))
    : [emptyCard(1, { id: cardIdFromLegacy(uid, 1) })];
  if (!minorRows.length) {
    issues.push(convertIssue("warning", "MINOR_ROW_MISSING", "HomeDatas_minor 행이 없어 빈 카드를 넣습니다.", `homeDatas.${uid}`, uid));
  }

  const props = emptyProps({
    titlesUsage: setRow ? asUsage(setRow.titles_usage) : true,
    titles: asText(setRow?.titles, asText(row.gName)),
    titlesDesc: asText(setRow?.titles_desc),
    marginLeft: asInt(setRow?.left_margin),
    marginRight: asInt(setRow?.right_margin),
    marginTop: asInt(setRow?.top_margin),
    marginBottom: asInt(setRow?.bottom_margin),
    heightPc: asInt(setRow?.section_height_pc, 420),
    heightMob: asInt(setRow?.section_height_mob, 280),
    slideTime: asInt(setRow?.slide_time, 4),
    slideLoop: setRow ? asUsage(setRow.slide_loop) : true,
    slideUsage: setRow ? asUsage(setRow.slide_usage) : true,
    productExpose: asProductExpose(setRow?.productExpose),
    productExposeCate: asText(setRow?.productExposeCate),
    align: asAlign(setRow?.align),
    skinCode: asText(setRow?.section_num, gubun === "banner" ? "04" : "01").padStart(2, "0"),
    tabs: convertTabs(multiMap.get(uid)),
    quickMenus: convertQuickMenus(subMap.get(uid), mediaIds, issues, uid),
  });
  applyTypeHeuristics(gubun, props, cards, minorRows[0]);

  return {
    id: sectionIdFromLegacy(uid),
    pageId: page.id,
    type: gubun,
    name: asText(row.gName, gubun),
    enabled: asUsage(row.usage),
    sortOrder: asInt(row.sorting, asInt(row.minor_num2, 1)),
    legacyUid: uid,
    props,
    cards,
  };
}

function sortSections(sections: HomeSection[]): HomeSection[] {
  return [...sections]
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.legacyUid ?? 0) - (b.legacyUid ?? 0))
    .map((section, index) => ({ ...section, sortOrder: index + 1 }));
}

export function convertLegacyDump(dump: LegacyHomeDump): ConvertResult {
  const issues: ConvertIssue[] = [];
  const siteCodeIssues = validateSiteCode(dump.site_code);
  if (siteCodeIssues.length) {
    issues.push(...siteCodeIssues.map((item) => ({ ...item, level: "error" as const })));
    return { ok: false, site: null, issues };
  }
  const siteCode = asText(dump.site_code);
  const tempCode = asText(dump.tempCode);
  if (!tempCode) {
    issues.push(convertIssue("error", "TEMP_CODE_REQUIRED", "템플릿 코드는 필수입니다. 기본값을 넣지 않습니다.", "tempCode"));
    return { ok: false, site: null, issues };
  }
  if (!isSupportedTempCode(tempCode)) {
    issues.push(convertIssue("error", "TEMP_CODE_UNSUPPORTED", `지원하지 않는 템플릿 코드입니다: ${tempCode}`, "tempCode"));
    return { ok: false, site: null, issues };
  }

  const media: HomeMedia[] = [];
  for (const row of dump.images ?? []) {
    const item = convertImage(row, siteCode, issues);
    if (item) media.push(item);
  }
  const mediaIds = new Set(media.map((item) => item.id));

  const rows = dump.homeDatas ?? [];
  const ownRows: LegacyHomeDatasRow[] = [];
  for (const row of rows) {
    const rowSite = asText(row.site_code);
    if (!rowSite) {
      issues.push(convertIssue("error", "SITE_CODE_REQUIRED", "HomeDatas.site_code 가 비어 있어 해당 행을 건너뜁니다.", "homeDatas", asInt(row.uid, 0) || undefined));
      continue;
    }
    if (rowSite !== siteCode) {
      issues.push(convertIssue("warning", "SITE_ROW_SKIPPED", `다른 사이트 행은 제외합니다: ${rowSite}`, "homeDatas", asInt(row.uid, 0) || undefined));
      continue;
    }
    ownRows.push(row);
  }

  const seenUid = new Set<number>();
  const uniqueRows: LegacyHomeDatasRow[] = [];
  for (const row of ownRows) {
    const uid = asInt(row.uid, NaN);
    if (!Number.isFinite(uid)) {
      issues.push(convertIssue("error", "SECTION_UID_MISSING", "HomeDatas.uid 가 없습니다.", "homeDatas"));
      continue;
    }
    if (seenUid.has(uid)) {
      issues.push(convertIssue("error", "DUPLICATE_SECTION_ID", `HomeDatas.uid 가 중복됩니다: ${uid}`, "homeDatas", uid));
      continue;
    }
    seenUid.add(uid);
    uniqueRows.push(row);
  }

  const setMap = groupByUidMinor(dump.sets);
  const minorMap = groupByUidMinor(dump.minors);
  const multiMap = groupByUidMinor(dump.multis);
  const subMap = groupByUidMinor(dump.subs);

  const pages: HomePage[] = [
    emptyMainPage(siteCode, {
      updatedAt: toIsoDate(uniqueRows.find((row) => asText(row.section).toLowerCase() === "main")?.up_date),
      updatedBy: MIGRATION_ACTOR,
    }),
  ];

  const pageHeaders = uniqueRows
    .filter((row) => asText(row.section).toLowerCase() === "page" && isBlankGubun(row.gubun))
    .sort((a, b) => asInt(a.sorting) - asInt(b.sorting) || asInt(a.minor_num) - asInt(b.minor_num));

  for (const header of pageHeaders) {
    const uid = asInt(header.uid);
    const pageKey = asText(header.gAdd) || `page-${asInt(header.minor_num, uid)}`;
    pages.push({
      id: pageIdFromLegacy(siteCode, pageKey, uid),
      site_code: siteCode,
      pageKey,
      name: asText(header.gName, pageKey),
      kind: "sub",
      sortOrder: asInt(header.sorting, asInt(header.minor_num, 1)),
      legacyMinorNum: asInt(header.minor_num),
      legacyUid: uid,
      sections: [],
      updatedAt: toIsoDate(header.up_date),
      updatedBy: MIGRATION_ACTOR,
    });
  }

  const pageByMinor = new Map<number, HomePage>();
  for (const page of pages) {
    if (page.kind === "sub") pageByMinor.set(page.legacyMinorNum, page);
  }
  const mainPage = pages[0];

  for (const row of uniqueRows) {
    const sectionKind = asText(row.section).toLowerCase();
    if (sectionKind === "page" && isBlankGubun(row.gubun)) continue;
    const page =
      sectionKind === "main"
        ? mainPage
        : sectionKind === "page"
          ? pageByMinor.get(asInt(row.minor_num))
          : null;
    if (!page) {
      if (isLayoutType(asText(row.gubun).toLowerCase()) || asText(row.section).toLowerCase() === "gnb" || asText(row.section).toLowerCase() === "gfb") {
        issues.push(convertIssue("warning", "LAYOUT_SECTION_SKIPPED", "레이아웃 섹션은 건너뜁니다.", "homeDatas", asInt(row.uid, 0) || undefined));
        continue;
      }
      issues.push(convertIssue("error", "PAGE_NOT_FOUND", "섹션이 속한 페이지를 찾지 못했습니다.", "homeDatas", asInt(row.uid, 0) || undefined));
      continue;
    }
    const converted = convertSection(row, page, setMap, minorMap, multiMap, subMap, mediaIds, issues);
    if (converted) page.sections.push(converted);
  }

  for (const page of pages) {
    page.sections = sortSections(page.sections);
  }

  const site: HomeSite = {
    site_code: siteCode,
    siteName: asText(dump.siteName, siteCode),
    tempCode,
    domains: asText(dump.domain) ? [asText(dump.domain)] : [],
    status: "active",
    pages,
    media,
    updatedAt: toIsoDate(uniqueRows[0]?.up_date),
    updatedBy: MIGRATION_ACTOR,
  };

  const validated = validateHomeSite(site);
  for (const item of validated.issues) {
    issues.push({ ...item, level: "error" });
  }

  const hasError = issues.some((item) => item.level === "error");
  return { ok: !hasError, site, issues };
}

export function createDraftFromSite(site: HomeSite, pageId: string | null = null, revision = 1) {
  return {
    id: `draft-${site.site_code}-${revision}`,
    site_code: site.site_code,
    pageId,
    payload: {
      tempCode: site.tempCode,
      pages: site.pages,
      media: site.media,
    },
    revision,
    status: "saved" as const,
    updatedAt: site.updatedAt,
    updatedBy: site.updatedBy,
  };
}
