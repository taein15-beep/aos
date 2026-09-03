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

export const AFFILIATE_PARTNERSHIP_STATUS_OPTIONS = ["전체", "정상", "승인대기", "거래중지", "탈퇴"] as const;
export const AFFILIATE_SHARE_GROUP_OPTIONS = ["전체", "동북아 상품공유", "국내 기차 제휴", "수도권 판매 제휴"] as const;
export const AFFILIATE_REGION_OPTIONS = ["전체", "서울", "경기", "부산", "대구", "제주"] as const;
export const AFFILIATE_SHARE_FILTER_OPTIONS = ["전체", "공유함", "미공유"] as const;
export const AFFILIATE_ACCEPTANCE_FILTER_OPTIONS = ["전체", "수락대기", "수락완료", "거절"] as const;
export const SHARE_CONDITION_AGENCY_PREVIEW_LIMIT = 5;

export const SHARE_REQUEST_MODE_OPTIONS = [
  { value: "accept", label: "상대 여행사 수락 후 공유 시작" },
  { value: "immediate", label: "수락 없이 즉시 공유 시작" },
] as const;

export const PRICE_APPLY_MODE_OPTIONS = [
  { value: "supply", label: "공급가 기준" },
  { value: "commission", label: "판매수수료율 기준" },
  { value: "margin", label: "고정 판매마진 기준" },
] as const;

export const SELLING_PRICE_PERMISSION_OPTIONS = [
  { value: "keep", label: "공급여행사 판매가 그대로 사용" },
  { value: "min", label: "최저판매가 이상에서 변경 가능" },
  { value: "free", label: "제휴여행사가 자유롭게 변경 가능" },
] as const;

export const INVENTORY_MODE_OPTIONS = [
  {
    value: "shared",
    label: "원본상품 공동재고 사용",
    description: "출발일별 잔여좌석을 모든 판매채널이 함께 사용합니다.",
  },
  {
    value: "allocated",
    label: "여행사별 좌석 할당",
    description: "제휴여행사마다 판매 가능한 좌석 수량을 나눠 배정합니다. 할당 수량은 다음 단계에서 지정합니다.",
  },
  {
    value: "confirm",
    label: "예약 요청 후 공급여행사 확정",
    description: "제휴여행사 예약은 요청으로 접수되며, 공급여행사가 확정해야 좌석이 확정됩니다.",
  },
] as const;

export const SHARED_INVENTORY_NOTICE =
  "모든 판매채널이 동일한 출발일별 잔여좌석을 사용하며 예약 시 원본상품 재고에서 차감됩니다.";

export const EDIT_PERMISSION_OPTIONS = [
  { key: "ownCategory", label: "자사 카테고리 지정", defaultAllowed: true, auto: false },
  { key: "homepageVisible", label: "홈페이지 노출 여부 설정", defaultAllowed: true, auto: false },
  { key: "displayOrder", label: "노출 순서 설정", defaultAllowed: true, auto: false },
  { key: "ownManager", label: "자사 담당자 지정", defaultAllowed: true, auto: false },
  { key: "searchTags", label: "검색 태그 추가", defaultAllowed: true, auto: false },
  { key: "displayName", label: "노출용 상품명 변경", defaultAllowed: false, auto: false },
  { key: "mainImage", label: "대표 이미지 변경", defaultAllowed: false, auto: false },
  { key: "promoText", label: "홍보문구 추가", defaultAllowed: false, auto: false },
  { key: "sellingPrice", label: "허용범위 내 판매가 변경", defaultAllowed: false, auto: true },
] as const;

export const EDIT_LOCKED_NOTICE =
  "원본 일정, 포함·불포함 사항, 취소규정, 출발일, 전체 좌석, 공급조건, 랜드사·공급사 정보는 제휴여행사가 수정할 수 없습니다.";

export const SALES_CHANNEL_OPTIONS = [
  { key: "homepage", label: "자사 홈페이지 판매" },
  { key: "adminDirect", label: "자사 관리자 직접예약" },
  { key: "staff", label: "자사 직원 판매" },
  { key: "sellers", label: "자사 판매점 판매" },
  { key: "externalLink", label: "외부 링크·QR 판매" },
] as const;

export const SELLER_CHANNEL_NOTICE =
  "자사 판매점 판매를 허용하면 제휴여행사가 자신의 판매점에 해당 상품을 판매 허용할 수 있습니다.";

export const RESHARE_LOCKED_NOTICE =
  "다른 제휴여행사로 재공유: 허용 안 함. 다른 독립 여행사에 재공유하는 기능은 제공하지 않습니다.";

export const SETTLEMENT_SOURCE_OPTIONS = [
  { value: "group", label: "그룹 기본 거래조건 사용" },
  { value: "custom", label: "이 상품에 별도 조건 적용" },
] as const;

export const SETTLEMENT_METHOD_OPTIONS = [
  { value: "supply", label: "공급가 정산" },
  { value: "commission", label: "판매수수료 정산" },
  { value: "margin", label: "고정마진 정산" },
] as const;

export const SETTLEMENT_CYCLE_OPTIONS = [
  { value: "monthly", label: "월 1회" },
  { value: "twiceMonthly", label: "월 2회" },
  { value: "departure", label: "출발일 기준" },
] as const;

export const PAYMENT_PARTY_OPTIONS = [
  { value: "sellerPg", label: "판매여행사 PG" },
  { value: "supplierPg", label: "공급여행사 PG" },
] as const;

export const CANCEL_FEE_RULE_OPTIONS = [
  { value: "original", label: "원본상품 취소규정 적용" },
  { value: "affiliate", label: "제휴 별도 취소규정 적용" },
] as const;

export const VAT_INCLUDED_OPTIONS = [
  { value: "included", label: "부가세 포함" },
  { value: "excluded", label: "부가세 별도" },
] as const;

export type ProductShareStatus = (typeof PRODUCT_SHARE_STATUS_OPTIONS)[number];
export type AffiliatePartnershipStatus = Exclude<(typeof AFFILIATE_PARTNERSHIP_STATUS_OPTIONS)[number], "전체">;
export type AffiliateShareGroupFilter = (typeof AFFILIATE_SHARE_GROUP_OPTIONS)[number];
export type AffiliateRegionFilter = (typeof AFFILIATE_REGION_OPTIONS)[number];
export type AffiliateShareFilter = (typeof AFFILIATE_SHARE_FILTER_OPTIONS)[number];
export type AffiliateAcceptanceFilter = (typeof AFFILIATE_ACCEPTANCE_FILTER_OPTIONS)[number];
export type ShareRequestMode = (typeof SHARE_REQUEST_MODE_OPTIONS)[number]["value"];
export type PriceApplyMode = (typeof PRICE_APPLY_MODE_OPTIONS)[number]["value"];
export type SellingPricePermission = (typeof SELLING_PRICE_PERMISSION_OPTIONS)[number]["value"];
export type InventoryMode = (typeof INVENTORY_MODE_OPTIONS)[number]["value"];
export type EditPermissionKey = (typeof EDIT_PERMISSION_OPTIONS)[number]["key"];
export type SalesChannelKey = (typeof SALES_CHANNEL_OPTIONS)[number]["key"];
export type SettlementSource = (typeof SETTLEMENT_SOURCE_OPTIONS)[number]["value"];
export type SettlementMethod = (typeof SETTLEMENT_METHOD_OPTIONS)[number]["value"];
export type SettlementCycle = (typeof SETTLEMENT_CYCLE_OPTIONS)[number]["value"];
export type PaymentParty = (typeof PAYMENT_PARTY_OPTIONS)[number]["value"];
export type CancelFeeRule = (typeof CANCEL_FEE_RULE_OPTIONS)[number]["value"];
export type VatIncluded = (typeof VAT_INCLUDED_OPTIONS)[number]["value"];

export type ShareConditionForm = {
  requestMode: ShareRequestMode;
  startDate: string;
  endDate: string;
  noEndDate: boolean;
  priceApplyMode: PriceApplyMode;
  customerListPrice: number;
  affiliateSupplyPrice: number | null;
  recommendedPrice: number | null;
  minSellingPrice: number | null;
  sellingPricePermission: SellingPricePermission;
  inventoryMode: InventoryMode;
  editPermissions: Record<EditPermissionKey, boolean>;
  salesChannels: Record<SalesChannelKey, boolean>;
  settlementSource: SettlementSource;
  settlementMethod: SettlementMethod;
  settlementCycle: SettlementCycle;
  paymentParty: PaymentParty;
  cancelFeeRule: CancelFeeRule;
  vatIncluded: VatIncluded;
  affiliateNotice: string;
  supplierMemo: string;
};

export type ShareConditionFieldErrors = {
  startDate?: string;
  endDate?: string;
  affiliateSupplyPrice?: string;
  recommendedPrice?: string;
  minSellingPrice?: string;
};

export type StoredShareCondition = Omit<ShareConditionForm, "customerListPrice">;

export type AffiliateAgencyRow = {
  id: string;
  name: string;
  groups: string[];
  region: string;
  partnershipStatus: AffiliatePartnershipStatus;
  shareStatus: ProductShareStatus;
  shareStartDate: string | null;
  shareEndDate: string | null;
  shareCondition: StoredShareCondition | null;
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

type AffiliateAgencyProfile = Omit<
  AffiliateAgencyRow,
  "shareStatus" | "shareStartDate" | "shareEndDate" | "shareCondition"
>;
type AffiliateShareFields = Pick<AffiliateAgencyRow, "shareStatus" | "shareStartDate" | "shareEndDate">;

const UNSHARED: AffiliateShareFields = {
  shareStatus: "미공유",
  shareStartDate: null,
  shareEndDate: null,
};

const AFFILIATE_AGENCY_PROFILES: Record<string, AffiliateAgencyProfile> = {
  "AFF-001": { id: "AFF-001", name: "행복투어", groups: ["동북아 상품공유", "수도권 판매 제휴"], region: "경기", partnershipStatus: "정상" },
  "AFF-002": { id: "AFF-002", name: "고양여행클럽", groups: ["수도권 판매 제휴"], region: "경기", partnershipStatus: "정상" },
  "AFF-003": { id: "AFF-003", name: "투어파트너", groups: ["동북아 상품공유"], region: "서울", partnershipStatus: "정상" },
  "AFF-004": { id: "AFF-004", name: "하나로여행", groups: ["동북아 상품공유"], region: "서울", partnershipStatus: "정상" },
  "AFF-005": { id: "AFF-005", name: "좋은여행사", groups: ["국내 기차 제휴", "동북아 상품공유"], region: "부산", partnershipStatus: "정상" },
  "AFF-006": { id: "AFF-006", name: "오션브릿지투어", groups: ["동북아 상품공유"], region: "제주", partnershipStatus: "승인대기" },
  "AFF-007": { id: "AFF-007", name: "대구여행센터", groups: ["국내 기차 제휴"], region: "대구", partnershipStatus: "정상" },
  "AFF-008": { id: "AFF-008", name: "옛날여행사", groups: ["수도권 판매 제휴"], region: "서울", partnershipStatus: "거래중지" },
  "AFF-009": { id: "AFF-009", name: "스카이로드투어", groups: ["동북아 상품공유"], region: "서울", partnershipStatus: "정상" },
  "AFF-010": { id: "AFF-010", name: "블루오션여행", groups: ["국내 기차 제휴"], region: "부산", partnershipStatus: "정상" },
  "AFF-011": { id: "AFF-011", name: "기차여행플러스", groups: ["국내 기차 제휴"], region: "서울", partnershipStatus: "정상" },
  "AFF-012": { id: "AFF-012", name: "충청관광사", groups: ["국내 기차 제휴", "수도권 판매 제휴"], region: "경기", partnershipStatus: "정상" },
  "AFF-013": { id: "AFF-013", name: "당진여행사", groups: ["수도권 판매 제휴"], region: "경기", partnershipStatus: "정상" },
  "AFF-014": { id: "AFF-014", name: "레일투어코리아", groups: ["국내 기차 제휴"], region: "서울", partnershipStatus: "정상" },
  "AFF-015": { id: "AFF-015", name: "제주월드투어", groups: ["동북아 상품공유"], region: "제주", partnershipStatus: "정상" },
  "AFF-016": { id: "AFF-016", name: "그린트리여행", groups: ["수도권 판매 제휴"], region: "서울", partnershipStatus: "탈퇴" },
};

function agencyShare(id: string, share: AffiliateShareFields): AffiliateAgencyRow {
  const profile = AFFILIATE_AGENCY_PROFILES[id];
  if (!profile) {
    return { id, name: id, groups: [], region: "-", partnershipStatus: "정상", shareCondition: null, ...share };
  }
  return { ...profile, groups: [...profile.groups], shareCondition: null, ...share };
}

const SAMPLE_AGENCIES_BY_PRODUCT: Record<string, AffiliateAgencyRow[]> = {
  HP0001: [
    agencyShare("AFF-001", { shareStatus: "공유 중", shareStartDate: "2026-04-01", shareEndDate: "2026-12-31" }),
    agencyShare("AFF-002", { shareStatus: "공유 중", shareStartDate: "2026-04-15", shareEndDate: "2026-11-30" }),
    agencyShare("AFF-003", { shareStatus: "공유 중", shareStartDate: "2026-05-01", shareEndDate: "2026-10-31" }),
    agencyShare("AFF-004", { shareStatus: "수락대기", shareStartDate: "2026-06-01", shareEndDate: "2026-12-31" }),
    agencyShare("AFF-005", { shareStatus: "수락대기", shareStartDate: "2026-06-10", shareEndDate: "2026-09-30" }),
    agencyShare("AFF-006", UNSHARED),
    agencyShare("AFF-007", UNSHARED),
    agencyShare("AFF-008", { shareStatus: "공유 종료", shareStartDate: "2025-01-01", shareEndDate: "2025-12-31" }),
    agencyShare("AFF-009", { shareStatus: "공유 거절", shareStartDate: "2026-03-01", shareEndDate: "2026-08-31" }),
    agencyShare("AFF-010", { shareStatus: "공유 중지", shareStartDate: "2026-02-01", shareEndDate: "2026-12-31" }),
    agencyShare("AFF-016", UNSHARED),
  ],
  "paldo-111": [
    agencyShare("AFF-011", { shareStatus: "공유 중", shareStartDate: "2026-05-01", shareEndDate: "2026-12-31" }),
    agencyShare("AFF-012", { shareStatus: "공유 중", shareStartDate: "2026-05-01", shareEndDate: "2026-11-30" }),
    agencyShare("AFF-014", { shareStatus: "공유 중", shareStartDate: "2026-05-10", shareEndDate: "2026-10-31" }),
  ],
  boram01: [agencyShare("AFF-013", UNSHARED)],
  HP0001C: [
    agencyShare("AFF-015", UNSHARED),
    agencyShare("AFF-001", { shareStatus: "공유 중", shareStartDate: "2026-04-01", shareEndDate: "2026-12-31" }),
    agencyShare("AFF-002", { shareStatus: "수락대기", shareStartDate: "2026-06-01", shareEndDate: "2026-12-31" }),
    agencyShare("AFF-005", UNSHARED),
    agencyShare("AFF-007", UNSHARED),
    agencyShare("AFF-003", { shareStatus: "공유 중지", shareStartDate: "2026-02-01", shareEndDate: "2026-12-31" }),
    agencyShare("AFF-006", UNSHARED),
    agencyShare("AFF-008", { shareStatus: "공유 종료", shareStartDate: "2025-01-01", shareEndDate: "2025-12-31" }),
    agencyShare("AFF-009", { shareStatus: "공유 거절", shareStartDate: "2026-03-01", shareEndDate: "2026-08-31" }),
    agencyShare("AFF-016", UNSHARED),
  ],
};

export function getProductAffiliateSummary(productCode: string) {
  return SAMPLE_SUMMARIES[productCode] ?? null;
}

export function getSampleAffiliateAgencies(productCode: string) {
  const rows = SAMPLE_AGENCIES_BY_PRODUCT[productCode];
  if (!rows) return null;
  return rows.map((row) => ({
    ...row,
    groups: [...row.groups],
    shareCondition: cloneShareCondition(row.shareCondition) ?? defaultStoredCondition(row),
  }));
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

export function cloneShareCondition(condition: StoredShareCondition | null | undefined) {
  if (!condition) return null;
  return {
    ...condition,
    editPermissions: { ...condition.editPermissions },
    salesChannels: { ...condition.salesChannels },
  };
}

export function cloneAffiliateRows(rows: AffiliateAgencyRow[]) {
  return rows.map((row) => ({
    ...row,
    groups: [...row.groups],
    shareCondition: cloneShareCondition(row.shareCondition),
  }));
}

export function uniqueAgenciesByName(rows: AffiliateAgencyRow[]) {
  const merged = new Map<string, AffiliateAgencyRow>();
  for (const row of rows) {
    const current = merged.get(row.name);
    if (!current) {
      merged.set(row.name, {
        ...row,
        groups: [...row.groups],
        shareCondition: cloneShareCondition(row.shareCondition),
      });
      continue;
    }
    current.groups = [...new Set([...current.groups, ...row.groups])];
  }
  return [...merged.values()];
}

export function isPartnershipShareable(status: AffiliatePartnershipStatus) {
  return status === "정상";
}

export function partnershipShareBlockReason(status: AffiliatePartnershipStatus) {
  if (status === "정상") return null;
  if (status === "승인대기") return "승인대기 상태의 여행사에는 상품을 공유할 수 없습니다.";
  if (status === "거래중지") return "거래중지 상태의 여행사에는 상품을 공유할 수 없습니다.";
  if (status === "탈퇴") return "탈퇴한 여행사에는 상품을 공유할 수 없습니다.";
  return "제휴 상태가 정상이 아니므로 상품을 공유할 수 없습니다.";
}

export function partnershipStatusBadgeClass(status: AffiliatePartnershipStatus) {
  if (status === "정상") return "success";
  if (status === "승인대기") return "warn";
  if (status === "탈퇴") return "danger";
  return "gray";
}

export function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shareStatusForRequestMode(mode: ShareRequestMode): ProductShareStatus {
  return mode === "immediate" ? "공유 중" : "수락대기";
}

export function parsePriceInput(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

export function formatPriceDisplay(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toLocaleString("ko-KR");
}

export function isPriceChangeAllowed(permission: SellingPricePermission) {
  return permission !== "keep";
}

export function defaultEditPermissions(permission: SellingPricePermission): Record<EditPermissionKey, boolean> {
  return {
    ownCategory: true,
    homepageVisible: true,
    displayOrder: true,
    ownManager: true,
    searchTags: true,
    displayName: false,
    mainImage: false,
    promoText: false,
    sellingPrice: isPriceChangeAllowed(permission),
  };
}

export function defaultSalesChannels(): Record<SalesChannelKey, boolean> {
  return {
    homepage: true,
    adminDirect: true,
    staff: true,
    sellers: true,
    externalLink: true,
  };
}

export const GROUP_SETTLEMENT_DEFAULTS = {
  settlementMethod: "supply",
  settlementCycle: "monthly",
  paymentParty: "sellerPg",
  cancelFeeRule: "original",
  vatIncluded: "included",
} as const satisfies Pick<
  ShareConditionForm,
  "settlementMethod" | "settlementCycle" | "paymentParty" | "cancelFeeRule" | "vatIncluded"
>;

export function createShareConditionForm(customerListPrice: number): ShareConditionForm {
  const sellingPricePermission: SellingPricePermission = "keep";
  return {
    requestMode: "accept",
    startDate: todayIsoDate(),
    endDate: "",
    noEndDate: true,
    priceApplyMode: "supply",
    customerListPrice,
    affiliateSupplyPrice: null,
    recommendedPrice: customerListPrice,
    minSellingPrice: null,
    sellingPricePermission,
    inventoryMode: "shared",
    editPermissions: defaultEditPermissions(sellingPricePermission),
    salesChannels: defaultSalesChannels(),
    settlementSource: "group",
    ...GROUP_SETTLEMENT_DEFAULTS,
    affiliateNotice: "",
    supplierMemo: "",
  };
}

export function storedConditionFromForm(form: ShareConditionForm): StoredShareCondition {
  return {
    requestMode: form.requestMode,
    startDate: form.startDate,
    endDate: form.endDate,
    noEndDate: form.noEndDate,
    priceApplyMode: form.priceApplyMode,
    affiliateSupplyPrice: form.affiliateSupplyPrice,
    recommendedPrice: form.recommendedPrice,
    minSellingPrice: form.minSellingPrice,
    sellingPricePermission: form.sellingPricePermission,
    inventoryMode: form.inventoryMode,
    editPermissions: { ...form.editPermissions },
    salesChannels: { ...form.salesChannels },
    settlementSource: form.settlementSource,
    settlementMethod: form.settlementMethod,
    settlementCycle: form.settlementCycle,
    paymentParty: form.paymentParty,
    cancelFeeRule: form.cancelFeeRule,
    vatIncluded: form.vatIncluded,
    affiliateNotice: form.affiliateNotice,
    supplierMemo: form.supplierMemo,
  };
}

export function defaultStoredCondition(row: Pick<AffiliateAgencyRow, "shareStatus" | "shareStartDate" | "shareEndDate">) {
  if (row.shareStatus === "미공유") return null;
  const form = createShareConditionForm(0);
  return storedConditionFromForm({
    ...form,
    startDate: row.shareStartDate ?? form.startDate,
    endDate: row.shareEndDate ?? "",
    noEndDate: !row.shareEndDate,
    affiliateSupplyPrice: 0,
  });
}

export function formFromStoredRow(row: AffiliateAgencyRow, customerListPrice: number): ShareConditionForm {
  const base = createShareConditionForm(customerListPrice);
  const stored = cloneShareCondition(row.shareCondition);
  if (!stored) {
    return {
      ...base,
      startDate: row.shareStartDate ?? base.startDate,
      endDate: row.shareEndDate ?? "",
      noEndDate: !row.shareEndDate,
    };
  }
  return {
    ...base,
    ...stored,
    customerListPrice,
    startDate: row.shareStartDate ?? stored.startDate,
    endDate: row.shareEndDate ?? stored.endDate,
    noEndDate: row.shareEndDate == null ? stored.noEndDate : false,
  };
}

export const SHARE_ACTION_POLICY = {
  cancelRequest: {
    title: "공유 요청 취소",
    message:
      "아직 수락하지 않은 요청만 취소할 수 있습니다. 이 제휴여행사에 보낸 상품공유 요청을 취소할까요?",
    confirmLabel: "요청 취소",
  },
  pause: {
    title: "공유 중지",
    message: "공유 중지는 신규예약만 차단합니다. 기존 예약과 정산 관계는 유지됩니다. 이 상품공유를 중지할까요?",
    confirmLabel: "공유 중지",
  },
  resume: {
    title: "공유 재개",
    message: "공유를 재개하면 제휴여행사가 다시 신규예약을 접수할 수 있습니다. 상품공유를 재개할까요?",
    confirmLabel: "공유 재개",
  },
  release: {
    title: "공유 해제",
    message: "공유 해제 이후에도 기존 예약과 정산 관계는 유지됩니다. 이 제휴여행사와의 상품공유를 해제할까요?",
    confirmLabel: "공유 해제",
  },
} as const;

export function getSharePeriodMessages(
  startDate: string,
  endDate: string,
  noEndDate: boolean,
  salesPeriod: [string, string] | null,
) {
  const warnings: string[] = [];
  let error: string | null = null;
  let startWarning: string | null = null;
  let endWarning: string | null = null;

  if (!noEndDate && endDate && startDate && endDate < startDate) {
    error = "종료일은 시작일보다 빠를 수 없습니다.";
  }

  if (salesPeriod) {
    const [saleStart, saleEnd] = salesPeriod;
    if (startDate && (startDate < saleStart || startDate > saleEnd)) {
      startWarning = `공유 시작일이 상품 판매기간(${saleStart} ~ ${saleEnd})을 벗어납니다.`;
      warnings.push(startWarning);
    }
    if (!noEndDate && endDate && (endDate < saleStart || endDate > saleEnd)) {
      endWarning = `공유 종료일이 상품 판매기간(${saleStart} ~ ${saleEnd})을 벗어납니다.`;
      warnings.push(endWarning);
    }
  }

  return { error, warnings, startWarning, endWarning };
}

export function getShareConditionFieldErrors(form: ShareConditionForm): ShareConditionFieldErrors {
  const errors: ShareConditionFieldErrors = {};
  if (!form.startDate) errors.startDate = "공유 시작일을 선택해 주세요.";
  if (!form.noEndDate) {
    if (!form.endDate) errors.endDate = "공유 종료일을 선택해 주세요.";
    else if (form.startDate && form.endDate < form.startDate) {
      errors.endDate = "종료일은 시작일보다 빠를 수 없습니다.";
    }
  }
  if (form.priceApplyMode === "supply") {
    if (form.affiliateSupplyPrice == null) errors.affiliateSupplyPrice = "제휴여행사 공급가를 입력해 주세요.";
    if (form.recommendedPrice == null) errors.recommendedPrice = "권장판매가를 입력해 주세요.";
    if (form.sellingPricePermission === "min" && form.minSellingPrice == null) {
      errors.minSellingPrice = "최저판매가 이상 변경을 허용하려면 최저판매가를 입력해 주세요.";
    } else if (
      form.minSellingPrice != null &&
      form.recommendedPrice != null &&
      form.minSellingPrice > form.recommendedPrice
    ) {
      errors.minSellingPrice = "최저판매가는 권장판매가 이하여야 합니다.";
    }
  }
  return errors;
}

export function isDuplicateShareTarget(status: ProductShareStatus) {
  return status === "공유 중" || status === "수락대기";
}

export function classifyShareApplyTargets(
  selected: AffiliateAgencyRow[],
  currentRows: AffiliateAgencyRow[],
) {
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  const applicable = selected.filter((row) => isPartnershipShareable(row.partnershipStatus));
  const processable: AffiliateAgencyRow[] = [];
  const skippedActive: AffiliateAgencyRow[] = [];
  const skippedPending: AffiliateAgencyRow[] = [];

  for (const agency of applicable) {
    const current = currentById.get(agency.id) ?? agency;
    if (isDuplicateShareTarget(current.shareStatus)) {
      if (current.shareStatus === "공유 중") skippedActive.push(current);
      else skippedPending.push(current);
      continue;
    }
    processable.push(current);
  }

  return { applicable, processable, skippedActive, skippedPending };
}

export function inventorySummaryLabel(mode: InventoryMode) {
  if (mode === "shared") return "원본상품 공동재고";
  return INVENTORY_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode;
}

export function pricePolicyLabel(condition: StoredShareCondition | null) {
  if (!condition) return "-";
  return PRICE_APPLY_MODE_OPTIONS.find((option) => option.value === condition.priceApplyMode)?.label ?? "-";
}

export function inventoryPolicyLabel(condition: StoredShareCondition | null) {
  if (!condition) return "-";
  return inventorySummaryLabel(condition.inventoryMode);
}

export function toUnsharedRow(row: AffiliateAgencyRow): AffiliateAgencyRow {
  return {
    ...row,
    shareStatus: "미공유",
    shareStartDate: null,
    shareEndDate: null,
    shareCondition: null,
  };
}

export function requestModeSummaryLabel(mode: ShareRequestMode) {
  return mode === "immediate" ? "수락 없이 즉시 공유" : "상대 여행사 수락 필요";
}

export function sharePeriodSummaryLabel(form: ShareConditionForm) {
  if (form.noEndDate) return "공유 종료일 없음";
  if (form.endDate) return `공유 ${form.startDate} ~ ${form.endDate}`;
  return "공유 종료일 없음";
}

/** 공유조건 임시저장은 화면 메모리에만 둡니다. 새로고침·페이지 이동 시 사라집니다. */
export const SHARE_CONDITION_DRAFT_HINT =
  "임시저장되었습니다. 이 화면을 유지하는 동안만 보관되며 새로고침하면 사라집니다.";

export function formatShareApplyMessage(params: {
  mode: ShareRequestMode;
  applicableCount: number;
  appliedCount: number;
  skippedActiveCount: number;
  skippedPendingCount: number;
}) {
  const skippedCount = params.skippedActiveCount + params.skippedPendingCount;
  const immediate = params.mode === "immediate";

  if (params.appliedCount === 0) {
    if (params.skippedActiveCount > 0 && params.skippedPendingCount === 0) {
      return `이미 공유 중인 ${params.skippedActiveCount}개 여행사는 제외되어 처리할 대상이 없습니다.`;
    }
    if (params.skippedPendingCount > 0 && params.skippedActiveCount === 0) {
      return `이미 수락대기인 ${params.skippedPendingCount}개 여행사는 제외되어 처리할 대상이 없습니다.`;
    }
    if (skippedCount > 0) {
      return `이미 공유 중이거나 수락대기인 ${skippedCount}개 여행사는 제외되어 처리할 대상이 없습니다.`;
    }
    return "요청할 수 있는 제휴여행사가 없습니다.";
  }

  const appliedPhrase = immediate ? "상품 공유를 시작했습니다" : "상품공유를 요청했습니다";

  if (skippedCount === 0) {
    return `${params.appliedCount}개 여행사에 ${appliedPhrase}.`;
  }

  let skippedPhrase = `이미 공유 중이거나 수락대기인 ${skippedCount}개 여행사는 제외되었습니다.`;
  if (params.skippedPendingCount === 0) {
    skippedPhrase = `이미 공유 중인 ${params.skippedActiveCount}개 여행사는 제외되었습니다.`;
  } else if (params.skippedActiveCount === 0) {
    skippedPhrase = `이미 수락대기인 ${params.skippedPendingCount}개 여행사는 제외되었습니다.`;
  }

  return `${params.applicableCount}개 여행사 중 ${params.appliedCount}개에 ${appliedPhrase}. ${skippedPhrase}`;
}
