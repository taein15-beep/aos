/**
 * 상품별 제휴여행사 공유설정 샘플 데이터 (SAMPLE)
 * API·DB 연동 전 UI 검증용입니다.
 */

export const PRODUCT_SHARE_STATUS_OPTIONS = [
  "미공유",
  "수락대기",
  "공유 중",
  "공유 중지",
  "공유 종료",
  "공유 거절",
] as const;

export const AFFILIATE_PARTNERSHIP_STATUS_OPTIONS = ["전체", "정상", "협의중", "중단"] as const;
export const AFFILIATE_SHARE_GROUP_OPTIONS = ["전체", "동북아 상품공유", "국내 기차 제휴", "수도권 판매 제휴"] as const;
export const AFFILIATE_REGION_OPTIONS = ["전체", "서울", "경기", "부산", "대구", "제주"] as const;
export const AFFILIATE_SHARE_FILTER_OPTIONS = ["전체", "공유함", "미공유"] as const;
export const AFFILIATE_ACCEPTANCE_FILTER_OPTIONS = ["전체", "수락대기", "수락완료", "거절"] as const;

export type ProductShareStatus = (typeof PRODUCT_SHARE_STATUS_OPTIONS)[number];
export type AffiliatePartnershipStatus = "정상" | "협의중" | "중단";
export type AffiliateShareGroupFilter = (typeof AFFILIATE_SHARE_GROUP_OPTIONS)[number];
export type AffiliateRegionFilter = (typeof AFFILIATE_REGION_OPTIONS)[number];
export type AffiliateShareFilter = (typeof AFFILIATE_SHARE_FILTER_OPTIONS)[number];
export type AffiliateAcceptanceFilter = (typeof AFFILIATE_ACCEPTANCE_FILTER_OPTIONS)[number];

export type AffiliateAgencyRow = {
  id: string;
  name: string;
  groups: string[];
  region: string;
  partnershipStatus: AffiliatePartnershipStatus;
  shareStatus: ProductShareStatus;
  shareStartDate: string | null;
  shareEndDate: string | null;
};

export type ProductAffiliateSummary = {
  productCode: string;
  productName: string;
  supplierName: string;
  salesStatus: string;
  lastModifiedAt: string;
};

const SAMPLE_SUMMARIES: Record<string, ProductAffiliateSummary> = {
  HP0001: {
    productCode: "HP0001",
    productName: "청도 바캉스~ 온천♨+워터파크 & 관광 &미식투어맥주박물관 5박6일",
    supplierName: "애비아넥스트",
    salesStatus: "판매중",
    lastModifiedAt: "2026-05-28 14:32",
  },
  HP0001C: {
    productCode: "HP0001C",
    productName: "[복사] 청도 바캉스~ 온천♨+워터파크 & 관광 &미식투어맥주박물관 5박6일",
    supplierName: "애비아넥스트",
    salesStatus: "판매중",
    lastModifiedAt: "2026-05-28 14:32",
  },
  "paldo-111": {
    productCode: "paldo-111",
    productName: "[팔도장터열차] 6월 27일(토) 공주 유구 색동수국정원 / 계룡산 동학사",
    supplierName: "애비아넥스트",
    salesStatus: "비노출",
    lastModifiedAt: "2026-05-20 09:15",
  },
  boram01: {
    productCode: "boram01",
    productName: "비아젬 견학투어 / 당진 장고항 실치축제 / 삼선산 수목원 / 한진포구 해상둘레길 (당일)",
    supplierName: "애비아넥스트",
    salesStatus: "판매중",
    lastModifiedAt: "2026-05-18 16:40",
  },
};

const SAMPLE_AGENCIES_BY_PRODUCT: Record<string, AffiliateAgencyRow[]> = {
  HP0001: [
    {
      id: "AFF-001",
      name: "행복투어",
      groups: ["동북아 상품공유", "수도권 판매 제휴"],
      region: "경기",
      partnershipStatus: "정상",
      shareStatus: "공유 중",
      shareStartDate: "2026-04-01",
      shareEndDate: "2026-12-31",
    },
    {
      id: "AFF-002",
      name: "고양여행클럽",
      groups: ["수도권 판매 제휴"],
      region: "경기",
      partnershipStatus: "정상",
      shareStatus: "공유 중",
      shareStartDate: "2026-04-15",
      shareEndDate: "2026-11-30",
    },
    {
      id: "AFF-003",
      name: "투어파트너",
      groups: ["동북아 상품공유"],
      region: "서울",
      partnershipStatus: "정상",
      shareStatus: "공유 중",
      shareStartDate: "2026-05-01",
      shareEndDate: "2026-10-31",
    },
    {
      id: "AFF-004",
      name: "하나로여행",
      groups: ["동북아 상품공유"],
      region: "서울",
      partnershipStatus: "정상",
      shareStatus: "수락대기",
      shareStartDate: "2026-06-01",
      shareEndDate: "2026-12-31",
    },
    {
      id: "AFF-005",
      name: "좋은여행사",
      groups: ["국내 기차 제휴", "동북아 상품공유"],
      region: "부산",
      partnershipStatus: "정상",
      shareStatus: "수락대기",
      shareStartDate: "2026-06-10",
      shareEndDate: "2026-09-30",
    },
    {
      id: "AFF-006",
      name: "제주월드투어",
      groups: ["동북아 상품공유"],
      region: "제주",
      partnershipStatus: "협의중",
      shareStatus: "미공유",
      shareStartDate: null,
      shareEndDate: null,
    },
    {
      id: "AFF-007",
      name: "대구여행센터",
      groups: ["국내 기차 제휴"],
      region: "대구",
      partnershipStatus: "정상",
      shareStatus: "미공유",
      shareStartDate: null,
      shareEndDate: null,
    },
    {
      id: "AFF-008",
      name: "옛날여행사",
      groups: ["수도권 판매 제휴"],
      region: "서울",
      partnershipStatus: "중단",
      shareStatus: "공유 종료",
      shareStartDate: "2025-01-01",
      shareEndDate: "2025-12-31",
    },
    {
      id: "AFF-009",
      name: "스카이로드투어",
      groups: ["동북아 상품공유"],
      region: "서울",
      partnershipStatus: "정상",
      shareStatus: "공유 거절",
      shareStartDate: "2026-03-01",
      shareEndDate: "2026-08-31",
    },
    {
      id: "AFF-010",
      name: "블루오션여행",
      groups: ["국내 기차 제휴"],
      region: "부산",
      partnershipStatus: "정상",
      shareStatus: "공유 중지",
      shareStartDate: "2026-02-01",
      shareEndDate: "2026-12-31",
    },
  ],
  "paldo-111": [
    {
      id: "AFF-011",
      name: "기차여행플러스",
      groups: ["국내 기차 제휴"],
      region: "서울",
      partnershipStatus: "정상",
      shareStatus: "공유 중",
      shareStartDate: "2026-05-01",
      shareEndDate: "2026-12-31",
    },
    {
      id: "AFF-012",
      name: "충청관광사",
      groups: ["국내 기차 제휴", "수도권 판매 제휴"],
      region: "경기",
      partnershipStatus: "정상",
      shareStatus: "공유 중",
      shareStartDate: "2026-05-01",
      shareEndDate: "2026-11-30",
    },
    {
      id: "AFF-014",
      name: "레일투어코리아",
      groups: ["국내 기차 제휴"],
      region: "서울",
      partnershipStatus: "정상",
      shareStatus: "공유 중",
      shareStartDate: "2026-05-10",
      shareEndDate: "2026-10-31",
    },
  ],
  boram01: [
    {
      id: "AFF-013",
      name: "당진여행사",
      groups: ["수도권 판매 제휴"],
      region: "경기",
      partnershipStatus: "정상",
      shareStatus: "미공유",
      shareStartDate: null,
      shareEndDate: null,
    },
  ],
  HP0001C: [
    {
      id: "AFF-015",
      name: "제주월드투어",
      groups: ["동북아 상품공유"],
      region: "제주",
      partnershipStatus: "정상",
      shareStatus: "미공유",
      shareStartDate: null,
      shareEndDate: null,
    },
  ],
};

export function getProductAffiliateSummary(productCode: string) {
  return SAMPLE_SUMMARIES[productCode] ?? null;
}

export function getSampleAffiliateAgencies(productCode: string) {
  const rows = SAMPLE_AGENCIES_BY_PRODUCT[productCode];
  if (!rows) return null;
  return rows.map((row) => ({ ...row, groups: [...row.groups] }));
}

export function countAffiliateShareStatuses(rows: AffiliateAgencyRow[]) {
  return rows.reduce(
    (counts, row) => {
      if (row.shareStatus === "공유 중") counts.active += 1;
      if (row.shareStatus === "수락대기") counts.pending += 1;
      return counts;
    },
    { active: 0, pending: 0 },
  );
}

/** 상품목록·설정 화면 공유 수 동기화용 (SAMPLE) */
export function getAffiliateCountsForProduct(productCode: string) {
  const rows = getSampleAffiliateAgencies(productCode);
  if (!rows) return { active: 0, pending: 0 };
  return countAffiliateShareStatuses(rows);
}

export function isSharedStatus(status: ProductShareStatus) {
  return status !== "미공유";
}

export function shareStatusBadgeClass(status: ProductShareStatus) {
  if (status === "공유 중") return "success";
  if (status === "수락대기") return "warn";
  if (status === "공유 중지") return "info";
  if (status === "공유 종료") return "gray";
  if (status === "공유 거절") return "danger";
  return "gray";
}

export function acceptanceLabel(status: ProductShareStatus) {
  if (status === "수락대기") return "수락대기";
  if (status === "공유 거절") return "거절";
  if (status === "미공유") return "-";
  return "수락완료";
}

export function formatAffiliateGroups(groups: string[]) {
  return groups.join(" · ");
}

export function cloneAffiliateRows(rows: AffiliateAgencyRow[]) {
  return rows.map((row) => ({ ...row, groups: [...row.groups] }));
}
