import { SAMPLE_IMAGE_PRESETS } from "../../../../packages/home-design-contract/src/sample-presets.ts";
import { emptyCard, emptyMainPage, emptySection, SAMPLE_ACTOR, SAMPLE_UPDATED_AT } from "./defaults.ts";
import { addSectionCard, createEditorSection } from "./editor-ops.ts";
import type { HomePage, HomeSection, HomeSectionType, HomeSite } from "./types.ts";
import { HOME_SECTION_TYPE_LABEL } from "./types.ts";

export { SAMPLE_IMAGE_PRESETS, getSampleImagePreset } from "../../../../packages/home-design-contract/src/sample-presets.ts";

function sampleMedia(siteCode: string): HomeSite["media"] {
  return SAMPLE_IMAGE_PRESETS.map((preset) => ({
    id: preset.id,
    site_code: siteCode,
    legacyUid: null,
    fileName: preset.id,
    fileExt: "webp",
    folder: "sample",
    urlPc: "",
    urlMob: "",
    urlThumb: "",
    samplePresetId: preset.id,
  }));
}

function createAvianextSample(): HomeSite {
  const site_code = "OY01470";
  const main = emptyMainPage(site_code, { id: "page-OY01470-main" });
  const about: HomePage = {
    id: "page-OY01470-about",
    site_code,
    pageKey: "company",
    name: "회사소개",
    kind: "sub",
    sortOrder: 1,
    legacyMinorNum: 1,
    legacyUid: 1100,
    sections: [],
    updatedAt: SAMPLE_UPDATED_AT,
    updatedBy: SAMPLE_ACTOR,
  };

  main.sections = [
    emptySection(main, "banner", 1, {
      id: "sample-section-1001",
      name: "메인 비주얼",
      legacyUid: 1001,
      props: { titles: "메인 비주얼", titlesUsage: false, heightPc: 460, heightMob: 320, align: "left", skinCode: "04" },
      cards: [
        emptyCard(1, {
          id: "sample-card-1001-1",
          mediaIdPc: "hero-ocean",
          mediaIdMob: "hero-ocean",
          text1: "2026 해외여행",
          text2: "지금 떠나기 좋은 대표 일정",
          text3: "다낭 · 오사카 · 제주를 한 화면에서",
          textPosition: "left",
          textBgcolor: "#0f172a",
        }),
      ],
    }),
    emptySection(main, "imagecard", 2, {
      id: "sample-section-1002",
      name: "추천 상품",
      legacyUid: 1002,
      props: { titles: "이번 달 추천 상품", titlesDesc: "샘플 데이터입니다. 운영 DB와 연결되어 있지 않습니다.", heightPc: 360 },
      cards: [
        emptyCard(1, { id: "sample-card-1002-1", mediaIdPc: "card-danang", text1: "다낭·호이안 5일", text2: "1,089,000원~", text3: "항공+호텔", text1Color: "#0f172a", text2Color: "#1d4ed8", text3Color: "#64748b" }),
        emptyCard(2, { id: "sample-card-1002-2", mediaIdPc: "card-osaka", text1: "오사카·교토 4일", text2: "799,000원~", text3: "핵심 일정", text1Color: "#0f172a", text2Color: "#1d4ed8", text3Color: "#64748b" }),
        emptyCard(3, { id: "sample-card-1002-3", mediaIdPc: "card-jeju", text1: "제주 3일", text2: "389,000원~", text3: "당일 출발 가능", text1Color: "#0f172a", text2Color: "#1d4ed8", text3Color: "#64748b" }),
      ],
    }),
    emptySection(main, "category", 3, {
      id: "sample-section-1003",
      name: "테마 카테고리",
      legacyUid: 1003,
      props: { titles: "테마별로 보기", productExpose: "A", productExposeCate: "패키지" },
      cards: [
        emptyCard(1, { id: "sample-card-1003-1", text1: "패키지", text1Color: "#1e3a5f" }),
        emptyCard(2, { id: "sample-card-1003-2", text1: "골프", text1Color: "#1e3a5f" }),
        emptyCard(3, { id: "sample-card-1003-3", text1: "크루즈", text1Color: "#1e3a5f" }),
      ],
    }),
    emptySection(main, "html", 4, {
      id: "sample-section-1004",
      name: "안내 문구",
      legacyUid: 1004,
      props: {
        titles: "이용 안내",
        titlesUsage: true,
        heightPc: 180,
        html: "<p>이 화면은 <strong>샘플 모드</strong>입니다. 저장과 라이브 적용은 비활성입니다.</p><p>속성 변경은 미리보기에만 반영됩니다.</p>",
      },
      cards: [emptyCard(1, { id: "sample-card-1004-1", textData1: "<p>이 화면은 <strong>샘플 모드</strong>입니다.</p>" })],
    }),
    emptySection(main, "board", 5, {
      id: "sample-section-1005",
      name: "공지사항",
      legacyUid: 1005,
      props: { titles: "공지사항", heightPc: 220, boardName: "공지사항" },
      cards: [emptyCard(1, { id: "sample-card-1005-1", text1: "샘플 공지 1", text2: "샘플 공지 2", text3: "샘플 공지 3" })],
    }),
    emptySection(main, "video", 6, {
      id: "sample-section-1006",
      name: "홍보 영상",
      legacyUid: 1006,
      enabled: false,
      props: { titles: "홍보 영상", heightPc: 280, videoUrl: "https://example.invalid/sample-video" },
      cards: [emptyCard(1, { id: "sample-card-1006-1", text1: "샘플 영상 (재생하지 않음)" })],
    }),
  ];

  about.sections = [
    emptySection(about, "html", 1, {
      id: "sample-section-1101",
      name: "소개글",
      legacyUid: 1101,
      props: { titles: "회사 소개", heightPc: 220, html: "<p>AOS 샘플 여행사 소개 페이지입니다. 실홈 발행과 연결되어 있지 않습니다.</p>" },
      cards: [emptyCard(1, { id: "sample-card-1101-1" })],
    }),
    emptySection(about, "map", 2, {
      id: "sample-section-1102",
      name: "오시는 길",
      legacyUid: 1102,
      props: { titles: "오시는 길", heightPc: 240, address: "서울특별시 강남구 샘플로 12" },
      cards: [emptyCard(1, { id: "sample-card-1102-1", text1: "본사 (샘플)" })],
    }),
  ];

  return {
    site_code,
    siteName: "애비아넥스트 샘플",
    tempCode: "AOS02",
    domains: ["avianext.localhost"],
    status: "active",
    pages: [main, about],
    media: sampleMedia(site_code),
    updatedAt: SAMPLE_UPDATED_AT,
    updatedBy: SAMPLE_ACTOR,
  };
}

function createHappySample(): HomeSite {
  const site_code = "AOS01005";
  const main = emptyMainPage(site_code, { id: "page-AOS01005-main" });
  main.sections = [
    emptySection(main, "banner", 1, {
      id: "sample-section-2001",
      name: "히어로",
      legacyUid: 2001,
      props: { titlesUsage: false, heightPc: 400, align: "center", skinCode: "04" },
      cards: [
        emptyCard(1, {
          id: "sample-card-2001-1",
          mediaIdPc: "hero-mountain",
          mediaIdMob: "hero-mountain",
          text1: "해피투어 샘플 홈",
          text2: "로컬 미리보기 전용",
          text3: "운영 데이터와 분리되어 있습니다",
        }),
      ],
    }),
    emptySection(main, "calendar", 2, {
      id: "sample-section-2002",
      name: "출발 달력",
      legacyUid: 2002,
      props: { titles: "이달의 출발", heightPc: 260 },
      cards: [emptyCard(1, { id: "sample-card-2002-1", text1: "2026년 11월 샘플" })],
    }),
    emptySection(main, "multicategory", 3, {
      id: "sample-section-2003",
      name: "상품 묶음",
      legacyUid: 2003,
      props: {
        titles: "추천 묶음",
        productExpose: "M",
        tabs: [
          { sortOrder: 1, name: "추천", desc: "", subExpose: "M" },
          { sortOrder: 2, name: "특가", desc: "", subExpose: "M" },
        ],
      },
      cards: [
        emptyCard(1, { id: "sample-card-2003-1", mediaIdPc: "card-mongolia", text1: "몽골 대초원", text2: "5일" }),
        emptyCard(2, { id: "sample-card-2003-2", mediaIdPc: "card-danang", text1: "베트남 휴양", text2: "4일" }),
      ],
    }),
  ];
  return {
    site_code,
    siteName: "해피투어 샘플",
    tempCode: "AOS02",
    domains: ["happy.localhost"],
    status: "active",
    pages: [main],
    media: sampleMedia(site_code),
    updatedAt: SAMPLE_UPDATED_AT,
    updatedBy: SAMPLE_ACTOR,
  };
}

export function createSampleSites(): HomeSite[] {
  return [createAvianextSample(), createHappySample()];
}

let nextUid = 9000;

export function nextSectionUid() {
  nextUid += 1;
  return nextUid;
}

export function createEmptySection(site: HomeSite, page: HomePage, gubun: HomeSectionType, sorting: number): HomeSection {
  const created = createEditorSection(site, page, gubun, nextSectionUid());
  return { ...created, sortOrder: sorting, name: HOME_SECTION_TYPE_LABEL[gubun] };
}

export { addSectionCard };

export function createEmptyCard(section: HomeSection) {
  return addSectionCard(section);
}
