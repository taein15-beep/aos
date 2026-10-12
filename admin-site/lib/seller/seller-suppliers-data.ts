/**
 * 판매점 관리자 > 공급여행사 관리 Mock (SAMPLE)
 * - 거래상태·실적은 seller-dashboard-data.ts(getSellerDashboardSnapshot)를 그대로 사용 → Dashboard 수치와 동일
 * - 이 파일은 공급여행사 코드·가입/신청일·담당자·판매상품 Preview 등 조회용 정보만 보강
 * - 승인거절 관계는 가입/신청 공급여행사 수에서 제외 (공급여행사 관리자 > 판매점관리와 같은 원칙)
 * - 판매방식(수수료형/입금가형)은 상품 단위 조건이며 공급여행사 관계 자체에는 두지 않음
 */

import {
  getSellerDashboardSnapshot,
  type SellerDashboardPerformance,
  type SellerDashboardProductStats,
  type SellerDashboardSettlement,
} from "@/lib/seller/seller-dashboard-data";
import { listSellerAdminProducts } from "@/lib/seller/seller-admin-products-data";
import { summarizeSupplierTrades, type SupplierTradeStatus } from "@/lib/seller/seller-login-mock";

export type SellerSupplierRelationStatus = SupplierTradeStatus | "승인거절";

export type SellerSupplierProductMode = "수수료형" | "입금가형";
export type SellerSupplierProductStatus = "판매중" | "설정대기" | "판매중지";

export type SellerSupplierProductPreview = {
  productName: string;
  mode: SellerSupplierProductMode;
  status: SellerSupplierProductStatus;
};

export type SellerSupplierContact = {
  phone: string;
  department: string;
  managerName: string;
  managerPhone: string;
  email: string;
};

export type SellerSupplierRelation = {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  status: SellerSupplierRelationStatus;
  joinedAt: string | null;
  appliedAt: string;
  processedAt: string | null;
  contact: SellerSupplierContact;
  productStats: SellerDashboardProductStats | null;
  monthPerformance: SellerDashboardPerformance | null;
  settlement: SellerDashboardSettlement | null;
  productPreview: SellerSupplierProductPreview[];
};

export type SellerSupplierProductCategory = {
  label: "국내여행" | "해외여행" | "테마여행";
  count: number;
};

/** AOS에 등록된 공급여행사 기본정보 (판매점과의 관계와 무관한 공급여행사 자체 정보) */
export type SellerSupplierDirectoryEntry = {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  summary: string;
  representative: string;
  homepage: string;
  contact: SellerSupplierContact;
  productCategories: SellerSupplierProductCategory[];
};

/** UI 테스트용 공급여행사 목록 — 실제 사업자와 무관한 SAMPLE 데이터 */
const SUPPLIER_DIRECTORY: SellerSupplierDirectoryEntry[] = [
  {
    supplierId: "AGENCY-HAPPY",
    supplierCode: "SUP00001",
    supplierName: "행복투어",
    summary: "국내 당일 · 열차 여행상품 공급",
    representative: "김행복",
    homepage: "happytour.test",
    contact: {
      phone: "02-1234-5678",
      department: "B2B영업팀",
      managerName: "이영희 과장",
      managerPhone: "010-2222-3333",
      email: "partner@happytour.test",
    },
    productCategories: [
      { label: "국내여행", count: 16 },
      { label: "해외여행", count: 0 },
      { label: "테마여행", count: 5 },
    ],
  },
  {
    supplierId: "AGENCY-HYUNDAM",
    supplierCode: "SUP00002",
    supplierName: "현담여행사",
    summary: "남해안 · 섬 여행상품 공급",
    representative: "박현담",
    homepage: "hyundam.test",
    contact: {
      phone: "02-555-0100",
      department: "제휴영업팀",
      managerName: "박준호 대리",
      managerPhone: "010-4444-5555",
      email: "b2b@hyundam.test",
    },
    productCategories: [
      { label: "국내여행", count: 9 },
      { label: "해외여행", count: 0 },
      { label: "테마여행", count: 2 },
    ],
  },
  {
    supplierId: "AGENCY-A",
    supplierCode: "SUP00003",
    supplierName: "A투어",
    summary: "수도권 근교 · 체험 여행상품 공급",
    representative: "최에이",
    homepage: "atour.test",
    contact: {
      phone: "031-777-0000",
      department: "판매제휴팀",
      managerName: "최수진 팀장",
      managerPhone: "010-6666-7777",
      email: "sales@atour.test",
    },
    productCategories: [
      { label: "국내여행", count: 7 },
      { label: "해외여행", count: 0 },
      { label: "테마여행", count: 3 },
    ],
  },
  {
    supplierId: "AGENCY-B",
    supplierCode: "SUP00004",
    supplierName: "B투어",
    summary: "부산 · 경남 여행상품 공급",
    representative: "정비",
    homepage: "btour.test",
    contact: {
      phone: "051-333-0000",
      department: "영업지원팀",
      managerName: "정민우 대리",
      managerPhone: "010-8888-9999",
      email: "contact@btour.test",
    },
    productCategories: [
      { label: "국내여행", count: 6 },
      { label: "해외여행", count: 2 },
      { label: "테마여행", count: 1 },
    ],
  },
  {
    supplierId: "AGENCY-MODU",
    supplierCode: "SUP00005",
    supplierName: "모두투어파트너",
    summary: "국내 · 해외 여행상품 공급",
    representative: "윤모두",
    homepage: "modupartner.test",
    contact: {
      phone: "02-700-1000",
      department: "판매점제휴팀",
      managerName: "강서연 과장",
      managerPhone: "010-3100-2200",
      email: "seller@modupartner.test",
    },
    productCategories: [
      { label: "국내여행", count: 18 },
      { label: "해외여행", count: 12 },
      { label: "테마여행", count: 5 },
    ],
  },
  {
    supplierId: "AGENCY-WOORI",
    supplierCode: "SUP00006",
    supplierName: "우리여행",
    summary: "국내 패키지 · 단체 여행상품 공급",
    representative: "한우리",
    homepage: "woori-travel.test",
    contact: {
      phone: "042-600-2000",
      department: "B2B사업팀",
      managerName: "오지훈 대리",
      managerPhone: "010-4100-5200",
      email: "b2b@woori-travel.test",
    },
    productCategories: [
      { label: "국내여행", count: 14 },
      { label: "해외여행", count: 0 },
      { label: "테마여행", count: 6 },
    ],
  },
  {
    supplierId: "AGENCY-JOEUN",
    supplierCode: "SUP00007",
    supplierName: "좋은투어",
    summary: "해외 자유 · 골프 여행상품 공급",
    representative: "서좋은",
    homepage: "joeuntour.test",
    contact: {
      phone: "02-330-3000",
      department: "해외영업팀",
      managerName: "임하늘 팀장",
      managerPhone: "010-5100-6200",
      email: "partner@joeuntour.test",
    },
    productCategories: [
      { label: "국내여행", count: 3 },
      { label: "해외여행", count: 15 },
      { label: "테마여행", count: 4 },
    ],
  },
  {
    supplierId: "AGENCY-HANMAUM",
    supplierCode: "SUP00008",
    supplierName: "한마음투어",
    summary: "강원 · 충청 여행상품 공급",
    representative: "문한마음",
    homepage: "hanmaumtour.test",
    contact: {
      phone: "033-250-4000",
      department: "영업관리팀",
      managerName: "신동욱 과장",
      managerPhone: "010-6100-7200",
      email: "sales@hanmaumtour.test",
    },
    productCategories: [
      { label: "국내여행", count: 10 },
      { label: "해외여행", count: 0 },
      { label: "테마여행", count: 3 },
    ],
  },
];

function getSupplierDirectoryEntry(supplierName: string) {
  return SUPPLIER_DIRECTORY.find((entry) => entry.supplierName === supplierName) ?? null;
}

/** 판매점(SEL00032)과 공급여행사 사이 관계 이력 — 관계 고유 정보만 보관 */
type SupplierRelationProfile = {
  joinedAt: string | null;
  appliedAt: string;
  processedAt: string | null;
};

const SUPPLIER_RELATION_PROFILES: Record<string, SupplierRelationProfile> = {
  행복투어: { joinedAt: "2026-08-01", appliedAt: "2026-07-29", processedAt: "2026-08-01" },
  현담여행사: { joinedAt: "2026-09-05", appliedAt: "2026-09-02", processedAt: "2026-09-05" },
  A투어: { joinedAt: null, appliedAt: "2026-10-10", processedAt: null },
};

const PRODUCT_PREVIEW_LIMIT = 3;

/** 판매상품 목록 Mock에서 공급여행사별 최근 판매허용 상품 Preview */
function buildProductPreview(sellerId: string, supplierId: string): SellerSupplierProductPreview[] {
  return listSellerAdminProducts(sellerId)
    .filter((product) => product.supplierTravelAgencyId === supplierId)
    .slice(0, PRODUCT_PREVIEW_LIMIT)
    .map((product) => ({ productName: product.productName, mode: product.saleMode, status: product.salesStatus }));
}

function buildRejectedRelation(): SellerSupplierRelation[] {
  const entry = getSupplierDirectoryEntry("B투어");
  if (!entry) return [];
  return [
    {
      supplierId: entry.supplierId,
      supplierCode: entry.supplierCode,
      supplierName: entry.supplierName,
      status: "승인거절",
      joinedAt: null,
      appliedAt: "2026-09-20",
      processedAt: "2026-09-21",
      contact: entry.contact,
      productStats: null,
      monthPerformance: null,
      settlement: null,
      productPreview: [],
    },
  ];
}

export type SellerSuppliersScenarioKey = "normal" | "supplierSuspended" | "pendingOnly" | "empty";

export const SELLER_SUPPLIERS_SCENARIOS: { key: SellerSuppliersScenarioKey; label: string }[] = [
  { key: "normal", label: "기본" },
  { key: "supplierSuspended", label: "행복투어 이용중지 Preview" },
  { key: "pendingOnly", label: "승인대기만 있음" },
  { key: "empty", label: "가입 공급여행사 없음" },
];

export type SellerSupplierFilterKey = "전체" | "정상" | "승인대기" | "이용중지" | "승인거절";

export const SELLER_SUPPLIER_FILTERS: SellerSupplierFilterKey[] = ["전체", "정상", "승인대기", "이용중지", "승인거절"];

/** 판매점 스코프 공급여행사 관계 목록 (승인거절 포함 원본) */
export function getSellerSupplierRelations(
  sellerId: string,
  scenarioKey: SellerSuppliersScenarioKey = "normal",
): SellerSupplierRelation[] {
  const { suppliers } = getSellerDashboardSnapshot(sellerId, scenarioKey);
  const relations = suppliers.flatMap<SellerSupplierRelation>((supplier) => {
    const profile = SUPPLIER_RELATION_PROFILES[supplier.supplierName];
    const entry = getSupplierDirectoryEntry(supplier.supplierName);
    if (!profile || !entry) return [];
    const suspended = supplier.status === "이용중지";
    return [
      {
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        status: supplier.status,
        supplierCode: entry.supplierCode,
        joinedAt: supplier.status === "승인대기" ? null : profile.joinedAt,
        appliedAt: profile.appliedAt,
        processedAt: profile.processedAt,
        contact: entry.contact,
        productStats: supplier.productStats,
        monthPerformance: supplier.performance?.month ?? null,
        settlement: supplier.settlement,
        productPreview: supplier.status === "승인대기"
          ? []
          : buildProductPreview(sellerId, supplier.supplierId).map((product) =>
              suspended ? { ...product, status: "판매중지" } : product,
            ),
      },
    ];
  });
  if (relations.length === 0) return [];
  return [...relations, ...buildRejectedRelation()];
}

/* ── 공급여행사 추가: 검색 · 관계확인 (STEP 5-4) ── */

export type SellerSupplierJoinStatus = "미가입" | SellerSupplierRelationStatus;

export type SellerSupplierSearchResult = SellerSupplierDirectoryEntry & {
  joinStatus: SellerSupplierJoinStatus;
};

/**
 * 관계상태 테스트 전용 — 공급여행사 검색 화면에서만 사용.
 * Dashboard / 공급여행사 목록 집계(3/2/1/0)에는 반영하지 않음.
 */
const SEARCH_ONLY_RELATIONS: Record<string, SellerSupplierRelationStatus> = {
  SUP00008: "이용중지",
};

const JOIN_STATUS_ORDER: SellerSupplierJoinStatus[] = ["미가입", "승인대기", "정상", "이용중지", "승인거절"];

/** 판매점 기준 AOS 공급여행사 + 현재 관계상태 (미가입 → 승인대기 → 정상 → 이용중지 → 승인거절 순) */
export function getSellerSupplierSearchDirectory(sellerId: string): SellerSupplierSearchResult[] {
  const relationByCode = new Map(
    getSellerSupplierRelations(sellerId, "normal").map((relation) => [relation.supplierCode, relation.status]),
  );
  return SUPPLIER_DIRECTORY.map((entry) => ({
    ...entry,
    joinStatus: relationByCode.get(entry.supplierCode) ?? SEARCH_ONLY_RELATIONS[entry.supplierCode] ?? "미가입",
  }));
}

export function searchSellerSuppliers(
  directory: SellerSupplierSearchResult[],
  keyword: string,
  statusOverrides: Record<string, SellerSupplierJoinStatus> = {},
) {
  const query = keyword.trim().toLowerCase();
  if (!query) return [];
  return directory
    .map((entry) => ({ ...entry, joinStatus: statusOverrides[entry.supplierCode] ?? entry.joinStatus }))
    .filter(
      (entry) => entry.supplierName.toLowerCase().includes(query) || entry.supplierCode.toLowerCase().includes(query),
    )
    .sort((a, b) => JOIN_STATUS_ORDER.indexOf(a.joinStatus) - JOIN_STATUS_ORDER.indexOf(b.joinStatus));
}

export function supplierJoinStatusBadgeClass(status: SellerSupplierJoinStatus) {
  return status === "미가입" ? "info" : supplierRelationStatusBadgeClass(status);
}

/** 관계상태별 가입신청 가능 여부와 안내 — 미가입만 신규 가입신청 가능 */
export function supplierJoinGuide(status: SellerSupplierJoinStatus): {
  canApply: boolean;
  actionLabel: string;
  messages: string[];
} {
  switch (status) {
    case "미가입":
      return { canApply: true, actionLabel: "가입신청", messages: [] };
    case "정상":
      return { canApply: false, actionLabel: "가입완료", messages: ["이미 거래 중인 공급여행사입니다."] };
    case "승인대기":
      return { canApply: false, actionLabel: "승인대기", messages: ["이미 가입신청이 접수되어 있습니다."] };
    case "이용중지":
      return {
        canApply: false,
        actionLabel: "가입불가",
        messages: ["현재 거래가 중지된 공급여행사입니다.", "이용 재개는 해당 공급여행사에 문의해주세요."],
      };
    default:
      return {
        canApply: false,
        actionLabel: "가입불가",
        messages: ["이전 가입신청이 승인되지 않았습니다.", "재가입이 필요한 경우 해당 공급여행사에 문의해주세요."],
      };
  }
}

export function supplierProductCategoryTotal(entry: SellerSupplierDirectoryEntry) {
  return entry.productCategories.reduce((sum, category) => sum + category.count, 0);
}

/** 가입/신청 공급여행사 = 정상 + 승인대기 + 이용중지 (승인거절 제외) */
export function isJoinedOrApplied(relation: SellerSupplierRelation) {
  return relation.status !== "승인거절";
}

export function summarizeSellerSupplierRelations(relations: SellerSupplierRelation[]) {
  const joined = relations.filter(isJoinedOrApplied).map((relation) => ({
    supplierName: relation.supplierName,
    status: relation.status as SupplierTradeStatus,
  }));
  return {
    ...summarizeSupplierTrades(joined),
    rejected: relations.length - joined.length,
  };
}

export function filterSellerSupplierRelations(
  relations: SellerSupplierRelation[],
  filter: SellerSupplierFilterKey,
  keyword: string,
) {
  const query = keyword.trim().toLowerCase();
  return relations.filter((relation) => {
    const statusMatch = filter === "전체" ? isJoinedOrApplied(relation) : relation.status === filter;
    if (!statusMatch) return false;
    if (!query) return true;
    return (
      relation.supplierName.toLowerCase().includes(query) || relation.supplierCode.toLowerCase().includes(query)
    );
  });
}

export function supplierRelationProductTotal(relation: SellerSupplierRelation) {
  const stats = relation.productStats;
  return stats ? stats.onSale + stats.setupPending + stats.stopped : null;
}

/** 실적 표시 대상: 정상 · 이용중지(과거 데이터 유지) */
export function supplierRelationHasPerformance(relation: SellerSupplierRelation) {
  return relation.status === "정상" || relation.status === "이용중지";
}

export function supplierRelationStatusBadgeClass(status: SellerSupplierRelationStatus) {
  if (status === "정상") return "success";
  if (status === "승인대기") return "warn";
  if (status === "이용중지") return "danger";
  return "gray";
}

export function supplierProductModeBadgeClass(mode: SellerSupplierProductMode) {
  return mode === "수수료형" ? "info" : "warn";
}

export function supplierProductStatusBadgeClass(status: SellerSupplierProductStatus) {
  if (status === "판매중") return "success";
  if (status === "설정대기") return "warn";
  return "danger";
}

export function supplierLogoText(name: string) {
  return name.trim().charAt(0) || "S";
}
