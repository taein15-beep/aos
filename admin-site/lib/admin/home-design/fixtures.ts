import type { LegacyHomeDump } from "./convert.ts";

/** 정상 변환용. MSSQL 조회 결과를 흉내 낸 정적 fixture. 운영 DB가 아님. */
export function createValidLegacyDump(): LegacyHomeDump {
  return {
    site_code: "OY01470",
    siteName: "애비아넥스트",
    tempCode: "AOS02",
    domain: "avianext.localhost",
    homeDatas: [
      { uid: 11, site_code: "OY01470", tempCode: "AOS02", section: "main", gubun: "banner", gName: "메인 비주얼", usage: "Y", sorting: 2, minor_num: 1, up_date: "20261102120000" },
      { uid: 12, site_code: "OY01470", tempCode: "AOS02", section: "main", gubun: "imagecard", gName: "추천 상품", usage: "Y", sorting: 1, minor_num: 1, up_date: "20261102120000" },
      { uid: 13, site_code: "OY01470", tempCode: "AOS02", section: "main", gubun: "html", gName: "안내", usage: "N", sorting: 3, minor_num: 1, up_date: "20261102120000" },
      { uid: 20, site_code: "OY01470", tempCode: "AOS02", section: "page", gubun: "", gName: "회사소개", gAdd: "company", usage: "Y", sorting: 1, minor_num: 1, up_date: "20261102120000" },
      { uid: 21, site_code: "OY01470", tempCode: "AOS02", section: "page", gubun: "map", gName: "오시는 길", usage: "Y", sorting: 1, minor_num: 1, minor_num2: 1, up_date: "20261102120000" },
      { uid: 99, site_code: "AOS01005", tempCode: "AOS02", section: "main", gubun: "banner", gName: "다른 사이트", usage: "Y", sorting: 1, minor_num: 1 },
    ],
    sets: [
      { uid_minor: 11, titles: "메인", titles_usage: "", section_height_pc: 460, section_height_mob: 300, section_num: "04", slide_loop: "Y", slide_usage: "Y" },
      { uid_minor: 12, titles: "추천", titles_usage: "Y", titles_desc: "이달의 상품", section_height_pc: 360, productExpose: "A" },
      { uid_minor: 13, titles: "안내", titles_usage: "Y", section_height_pc: 180 },
      { uid_minor: 21, titles: "지도", titles_usage: "Y", section_height_pc: 240 },
    ],
    minors: [
      { uid_minor: 11, minor_num: 1, image_pc: 501, image_mob: 501, text1: "해외여행", text2: "지금 출발", text3: "샘플", usage: "Y", text_position: "left" },
      { uid_minor: 12, minor_num: 2, image_pc: 502, text1: "오사카", text2: "4일", usage: "Y" },
      { uid_minor: 12, minor_num: 1, image_pc: 502, text1: "다낭", text2: "5일", usage: "Y" },
      { uid_minor: 13, minor_num: 1, text_data1: "<p>안내 본문</p>", usage: "Y" },
      { uid_minor: 21, minor_num: 1, text1: "서울 샘플로 12", map_address: "서울특별시 강남구 샘플로 12", usage: "Y" },
    ],
    images: [
      { uid: 501, siteCode: "OY01470", file_name: "hero", file_ext: "webp", file_folder: "site/202611" },
      { uid: 502, siteCode: "OY01470", file_name: "card", file_ext: "jpg", file_folder: "site/202611" },
    ],
    multis: [],
    subs: [
      { uid_minor: 11, minor_num: 1, emoji: "✈️", menus: "항공권", links: "/air", imgUid: 501 },
    ],
  };
}

export function createMissingFieldsDump(): LegacyHomeDump {
  return {
    site_code: "AOS01005",
    siteName: "해피투어",
    tempCode: "AOS02",
    homeDatas: [
      { uid: 31, site_code: "AOS01005", tempCode: "AOS02", section: "main", gubun: "banner", gName: "배너", usage: null, sorting: null, minor_num: 1 },
    ],
    sets: [],
    minors: [],
    images: [],
  };
}

export function createMixedSiteDump(): LegacyHomeDump {
  return {
    site_code: "OY01470",
    siteName: "애비아넥스트",
    tempCode: "AOS02",
    homeDatas: [
      { uid: 1, site_code: "OY01470", tempCode: "AOS02", section: "main", gubun: "banner", gName: "A", usage: "Y", sorting: 1, minor_num: 1 },
      { uid: 2, site_code: "AOS01005", tempCode: "AOS02", section: "main", gubun: "banner", gName: "B", usage: "Y", sorting: 1, minor_num: 1 },
    ],
    sets: [{ uid_minor: 1, titles: "A" }],
    minors: [{ uid_minor: 1, minor_num: 1, text1: "A" }],
  };
}

export function createDuplicateUidDump(): LegacyHomeDump {
  return {
    site_code: "OY01470",
    siteName: "애비아넥스트",
    tempCode: "AOS02",
    homeDatas: [
      { uid: 7, site_code: "OY01470", tempCode: "AOS02", section: "main", gubun: "banner", gName: "하나", usage: "Y", sorting: 1, minor_num: 1 },
      { uid: 7, site_code: "OY01470", tempCode: "AOS02", section: "main", gubun: "html", gName: "둘", usage: "Y", sorting: 2, minor_num: 1 },
    ],
    sets: [{ uid_minor: 7, titles: "하나" }],
    minors: [{ uid_minor: 7, minor_num: 1, text1: "하나" }],
  };
}

export function createUnsupportedTemplateDump(): LegacyHomeDump {
  return {
    site_code: "OY01470",
    siteName: "애비아넥스트",
    tempCode: "AOS99",
    homeDatas: [
      { uid: 1, site_code: "OY01470", tempCode: "AOS99", section: "main", gubun: "banner", gName: "배너", usage: "Y", sorting: 1, minor_num: 1 },
    ],
  };
}

export function createNoSiteCodeDump(): LegacyHomeDump {
  return {
    tempCode: "AOS02",
    homeDatas: [{ uid: 1, section: "main", gubun: "banner", gName: "배너" }],
  };
}
