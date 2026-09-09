/**
 * 회원관리 · 판매점 가입신청 샘플 데이터 및 프로토타입 로직 (SAMPLE)
 * - 홈페이지 seller apply / 상품 판매점설정(product-seller-data)과 분리
 * - API·DB·실이메일 없음
 */

export type SellerApplicationStatus = "승인대기" | "승인완료" | "승인거절";
export type SellerType = "business" | "individual";
export type SellerSalesStatus = "판매가능" | "판매중지";

export type SellerApplication = {
  applicationId: string;
  applicationNumber: string;
  sellerType: SellerType;
  sellerName: string;
  businessNumber: string | null;
  representativeName: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  applicationStatus: SellerApplicationStatus;
  salesStatus: SellerSalesStatus | null;
  /** 판매 가능 상품 수. 미설정·미승인 시 null */
  productCount: number | null;
  /**
   * 기본 판매수수료 Mock 표시값
   * - "5%" | "8%" 등 단일 기본율
   * - "개별설정": 상품별 수수료가 서로 다름
   * - "미설정" | null: 아직 미설정
   */
  commissionText: string | null;
  appliedAt: string;
};

export type SellerListFilters = {
  keyword: string;
  sellerType: SellerType | "전체";
  approvalStatus: "전체" | "승인대기" | "승인완료" | "승인거절";
  salesStatus: SellerSalesStatus | "전체";
  appliedFrom: string;
  appliedTo: string;
};

export type SellerListTotals = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export const SELLER_LIST_PAGE_SIZE = 20;

/** 승인상태 필터 · 목록 Badge 공통 */
export const SELLER_APPROVAL_STATUS_FILTER_OPTIONS = [
  "전체",
  "승인대기",
  "승인완료",
  "승인거절",
] as const;

export const SELLER_TYPE_FILTER_OPTIONS = ["전체", "business", "individual"] as const;

export const SELLER_SALES_STATUS_FILTER_OPTIONS = ["전체", "판매가능", "판매중지"] as const;

export const SELLER_TYPE_LABELS: Record<SellerType, string> = {
  business: "사업자 판매점",
  individual: "개인판매자",
};

/** 목록 유형 Badge 짧은 표시값 */
export const SELLER_TYPE_BADGE_LABELS: Record<SellerType, string> = {
  business: "사업자",
  individual: "개인",
};

export function sellerTypeBadgeClass(sellerType: SellerType) {
  return sellerType === "business" ? "info" : "gray";
}

export const EMPTY_SELLER_LIST_FILTERS: SellerListFilters = {
  keyword: "",
  sellerType: "전체",
  approvalStatus: "전체",
  salesStatus: "전체",
  appliedFrom: "",
  appliedTo: "",
};

export const SELLER_PROTOTYPE_STORAGE_KEY = "aos.admin.members.sellers.prototype.v1";

const STORAGE_SCHEMA_VERSION = 6 as const;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function cloneApplication(row: SellerApplication): SellerApplication {
  return { ...row };
}

function cloneSeedList(rows: readonly SellerApplication[]) {
  return rows.map(cloneApplication);
}

export function formatSellerPartnerCode(applicationId: string) {
  const match = /^SEL-(\d+)$/i.exec(applicationId.trim());
  if (!match?.[1]) return "—";
  return `AOS${match[1].padStart(5, "0")}`;
}

export function formatSellerBusinessNumber(value: string | null | undefined) {
  if (!value || !String(value).trim()) return "-";
  const digits = digitsOnly(value);
  if (digits.length !== 10) return value.trim();
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function formatSellerMobilePhone(value: string) {
  const digits = digitsOnly(value);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value.trim() || "—";
}

/** 목록용 가입일(가입 신청일) — affiliates 목록과 동일하게 YYYY-MM-DD */
export function formatSellerAppliedDate(value: string) {
  const key = appliedDateKey(value);
  return key || "—";
}

export function formatSellerProductCount(count: number | null | undefined) {
  if (count === null || count === undefined) return "미설정";
  return `${count}개`;
}

/** 판매상품 표시용 Badge 클래스 */
export function sellerProductCountBadgeClass(count: number | null | undefined) {
  if (count === null || count === undefined) return "gray";
  if (count === 0) return "warn";
  return "info";
}

export function formatSellerCommissionText(value: string | null | undefined) {
  if (!value || !String(value).trim()) return "미설정";
  return value.trim();
}

/** 수수료 표시용 Badge 클래스 */
export function sellerCommissionBadgeClass(value: string | null | undefined) {
  const label = formatSellerCommissionText(value);
  if (label === "미설정") return "gray";
  if (label === "개별설정") return "info";
  return "success";
}

/** 목록 판매점명: 사업자=상호명, 개인=신청자 이름 */
export function formatSellerListDisplayName(row: SellerApplication) {
  if (row.sellerType === "individual") {
    return row.contactName.trim() || "—";
  }
  return row.sellerName.trim() || "—";
}

/** 판매점명 Sub Text: 사업자=사업자등록번호, 개인="개인 판매점" */
export function formatSellerListNameSubtext(row: SellerApplication): string | null {
  if (row.sellerType === "individual") {
    return "개인 판매점";
  }
  const businessNumber = formatSellerBusinessNumber(row.businessNumber);
  return businessNumber === "-" ? null : businessNumber;
}

/** 목록 「대표자 / 신청자」: 사업자=대표자명, 개인=신청자명 */
export function formatSellerPersonName(row: SellerApplication) {
  if (row.sellerType === "individual") {
    return row.contactName.trim() || "—";
  }
  return row.representativeName?.trim() || "—";
}

export function sellerApplicationStatusBadgeClass(status: SellerApplicationStatus) {
  if (status === "승인대기") return "warn";
  if (status === "승인완료") return "success";
  return "danger";
}

export function sellerSalesStatusBadgeClass(status: SellerSalesStatus) {
  return status === "판매가능" ? "success" : "warn";
}

/**
 * 판매상태는 승인상태와 별도.
 * 승인완료에서만 판매가능/판매중지 표시, 그 외(승인대기·승인거절)는 null → "-" 비활성 표현.
 */
export function resolveSellerSalesStatus(row: SellerApplication): SellerSalesStatus | null {
  if (row.applicationStatus !== "승인완료") return null;
  return row.salesStatus;
}

function appliedDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function filterSellerApplications(
  applications: readonly SellerApplication[],
  filters: SellerListFilters,
): { ok: true; rows: SellerApplication[] } | { ok: false; message: string } {
  const from = filters.appliedFrom.trim();
  const to = filters.appliedTo.trim();
  if (from && to && from > to) {
    return { ok: false, message: "가입 시작일이 종료일보다 늦을 수 없습니다." };
  }

  const keyword = filters.keyword.trim();
  const keywordLower = keyword.toLowerCase();
  const keywordDigits = digitsOnly(keyword);

  const rows = applications
    .filter((row) => {
      if (filters.sellerType !== "전체" && row.sellerType !== filters.sellerType) {
        return false;
      }
      if (filters.approvalStatus !== "전체" && row.applicationStatus !== filters.approvalStatus) {
        return false;
      }
      if (filters.salesStatus !== "전체") {
        const resolvedSales = resolveSellerSalesStatus(row);
        if (resolvedSales !== filters.salesStatus) {
          return false;
        }
      }

      const day = appliedDateKey(row.appliedAt);
      if (from && day && day < from) return false;
      if (to && day && day > to) return false;

      if (!keyword) return true;

      const haystack = [
        row.sellerName,
        row.representativeName ?? "",
        row.contactName,
        row.contactPhone,
        row.contactEmail,
        row.applicationNumber,
        formatSellerPartnerCode(row.applicationId),
        row.businessNumber ?? "",
        SELLER_TYPE_LABELS[row.sellerType],
      ]
        .join(" ")
        .toLowerCase();

      if (haystack.includes(keywordLower)) return true;
      const keywordIsContactLike = Boolean(keywordDigits) && !/[a-zA-Z가-힣]/.test(keyword);
      if (keywordIsContactLike && digitsOnly(row.contactPhone).includes(keywordDigits)) return true;
      if (keywordIsContactLike && digitsOnly(row.businessNumber ?? "").includes(keywordDigits)) return true;
      return false;
    })
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.appliedAt).getTime();
      const bTime = new Date(b.appliedAt).getTime();
      const aSafe = Number.isNaN(aTime) ? 0 : aTime;
      const bSafe = Number.isNaN(bTime) ? 0 : bTime;
      if (bSafe !== aSafe) return bSafe - aSafe;
      return b.applicationId.localeCompare(a.applicationId);
    });

  return { ok: true, rows };
}

export function getSellerListTotals(applications: readonly SellerApplication[]): SellerListTotals {
  return {
    total: applications.length,
    pending: applications.filter((row) => row.applicationStatus === "승인대기").length,
    approved: applications.filter((row) => row.applicationStatus === "승인완료").length,
    rejected: applications.filter((row) => row.applicationStatus === "승인거절").length,
  };
}

export function paginateSellerApplications(
  rows: readonly SellerApplication[],
  page: number,
  pageSize = SELLER_LIST_PAGE_SIZE,
) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    rows: rows.slice(start, start + pageSize),
  };
}

const SEED_APPLICATIONS: SellerApplication[] = [
  {
    applicationId: "SEL-001",
    applicationNumber: "AOS-S-20260909-2001",
    sellerType: "business",
    sellerName: "우리여행",
    businessNumber: "123-45-67890",
    representativeName: "김민수",
    contactName: "김민수",
    contactPhone: "010-1234-5678",
    contactEmail: "woori@example.com",
    applicationStatus: "승인완료",
    salesStatus: "판매가능",
    productCount: 12,
    commissionText: "5%",
    appliedAt: "2026-09-09T02:10:00.000Z",
  },
  {
    applicationId: "SEL-002",
    applicationNumber: "AOS-S-20260908-2002",
    sellerType: "business",
    sellerName: "서울투어파트너",
    businessNumber: "234-56-78901",
    representativeName: "박성진",
    contactName: "박성진",
    contactPhone: "010-3456-7890",
    contactEmail: "seoulpartner@example.com",
    applicationStatus: "승인완료",
    salesStatus: "판매중지",
    productCount: 8,
    commissionText: "개별설정",
    appliedAt: "2026-09-08T04:30:00.000Z",
  },
  {
    applicationId: "SEL-003",
    applicationNumber: "AOS-S-20260907-2003",
    sellerType: "individual",
    sellerName: "이수진",
    businessNumber: null,
    representativeName: null,
    contactName: "이수진",
    contactPhone: "010-9876-5432",
    contactEmail: "leesujin@example.com",
    applicationStatus: "승인완료",
    salesStatus: "판매가능",
    productCount: 3,
    commissionText: "5%",
    appliedAt: "2026-09-07T06:15:00.000Z",
  },
  {
    applicationId: "SEL-004",
    applicationNumber: "AOS-S-20260906-2004",
    sellerType: "individual",
    sellerName: "정현우",
    businessNumber: null,
    representativeName: null,
    contactName: "정현우",
    contactPhone: "010-2468-1357",
    contactEmail: "junghw@example.com",
    applicationStatus: "승인대기",
    salesStatus: null,
    productCount: 0,
    commissionText: "미설정",
    appliedAt: "2026-09-06T08:40:00.000Z",
  },
  {
    applicationId: "SEL-005",
    applicationNumber: "AOS-S-20260905-2005",
    sellerType: "business",
    sellerName: "한빛여행사",
    businessNumber: "345-67-89012",
    representativeName: "최유진",
    contactName: "한담당",
    contactPhone: "010-5555-1212",
    contactEmail: "hanbit@example.com",
    applicationStatus: "승인대기",
    salesStatus: null,
    productCount: null,
    commissionText: null,
    appliedAt: "2026-09-05T01:20:00.000Z",
  },
  {
    applicationId: "SEL-006",
    applicationNumber: "AOS-S-20260903-2006",
    sellerType: "individual",
    sellerName: "오세린",
    businessNumber: null,
    representativeName: null,
    contactName: "오세린",
    contactPhone: "010-7788-9900",
    contactEmail: "ohserin@example.com",
    applicationStatus: "승인거절",
    salesStatus: null,
    productCount: null,
    commissionText: null,
    appliedAt: "2026-09-03T09:05:00.000Z",
  },
  {
    applicationId: "SEL-007",
    applicationNumber: "AOS-S-20260828-2007",
    sellerType: "business",
    sellerName: "제주올레투어",
    businessNumber: "456-78-90123",
    representativeName: "강동현",
    contactName: "제담당",
    contactPhone: "010-2222-3344",
    contactEmail: "jejuolle@example.com",
    applicationStatus: "승인거절",
    salesStatus: null,
    productCount: null,
    commissionText: null,
    appliedAt: "2026-08-28T05:45:00.000Z",
  },
  {
    applicationId: "SEL-008",
    applicationNumber: "AOS-S-20260820-2008",
    sellerType: "business",
    sellerName: "부산해운대여행",
    businessNumber: "567-89-01234",
    representativeName: "윤서아",
    contactName: "부담당",
    contactPhone: "010-6666-7788",
    contactEmail: "haeundae@example.com",
    applicationStatus: "승인완료",
    salesStatus: "판매가능",
    productCount: 6,
    commissionText: "8%",
    appliedAt: "2026-08-20T03:00:00.000Z",
  },
  {
    applicationId: "SEL-009",
    applicationNumber: "AOS-S-20260812-2009",
    sellerType: "individual",
    sellerName: "김나영",
    businessNumber: null,
    representativeName: null,
    contactName: "김나영",
    contactPhone: "010-1357-2468",
    contactEmail: "kimnayoung@example.com",
    applicationStatus: "승인완료",
    salesStatus: "판매중지",
    productCount: 2,
    commissionText: "개별설정",
    appliedAt: "2026-08-12T07:25:00.000Z",
  },
  {
    applicationId: "SEL-010",
    applicationNumber: "AOS-S-20260805-2010",
    sellerType: "business",
    sellerName: "행복파트너투어",
    businessNumber: "678-90-12345",
    representativeName: "송지훈",
    contactName: "행담당",
    contactPhone: "010-9999-0001",
    contactEmail: "happypartner@example.com",
    applicationStatus: "승인대기",
    salesStatus: null,
    productCount: null,
    commissionText: null,
    appliedAt: "2026-08-05T11:10:00.000Z",
  },
];

export const SELLER_APPLICATION_SEED = cloneSeedList(SEED_APPLICATIONS);

type SellerPrototypeStoragePayload = {
  version: typeof STORAGE_SCHEMA_VERSION;
  overrides: Record<string, SellerApplication>;
  deletedIds: string[];
};

function isBrowserStorageAvailable() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isApplicationStatus(value: unknown): value is SellerApplicationStatus {
  return value === "승인대기" || value === "승인완료" || value === "승인거절";
}

function isSellerType(value: unknown): value is SellerType {
  return value === "business" || value === "individual";
}

function isSalesStatus(value: unknown): value is SellerSalesStatus | null {
  return value === null || value === "판매가능" || value === "판매중지";
}

function isValidStoredApplication(value: unknown): value is SellerApplication {
  if (!value || typeof value !== "object") return false;
  const row = value as SellerApplication;
  if (typeof row.applicationId !== "string" || !/^SEL-\d+$/.test(row.applicationId)) return false;
  if (typeof row.applicationNumber !== "string") return false;
  if (!isSellerType(row.sellerType)) return false;
  if (typeof row.sellerName !== "string" || typeof row.contactName !== "string") return false;
  if (!(row.businessNumber === null || typeof row.businessNumber === "string")) return false;
  if (!(row.representativeName === null || typeof row.representativeName === "string")) return false;
  if (typeof row.contactPhone !== "string" || typeof row.contactEmail !== "string") return false;
  if (!isApplicationStatus(row.applicationStatus)) return false;
  if (!isSalesStatus(row.salesStatus)) return false;
  if (!(row.productCount === null || typeof row.productCount === "number")) return false;
  if (!(row.commissionText === null || typeof row.commissionText === "string")) return false;
  return true;
}

function readPrototypePayload(): SellerPrototypeStoragePayload {
  if (!isBrowserStorageAvailable()) {
    return { version: STORAGE_SCHEMA_VERSION, overrides: {}, deletedIds: [] };
  }
  try {
    const raw = window.sessionStorage.getItem(SELLER_PROTOTYPE_STORAGE_KEY);
    if (!raw) return { version: STORAGE_SCHEMA_VERSION, overrides: {}, deletedIds: [] };
    const parsed = JSON.parse(raw) as Partial<SellerPrototypeStoragePayload>;
    if (parsed.version !== STORAGE_SCHEMA_VERSION || !parsed.overrides || typeof parsed.overrides !== "object") {
      return { version: STORAGE_SCHEMA_VERSION, overrides: {}, deletedIds: [] };
    }
    const overrides: Record<string, SellerApplication> = {};
    for (const [key, value] of Object.entries(parsed.overrides)) {
      if (!isValidStoredApplication(value)) continue;
      if (value.applicationId !== key) continue;
      overrides[key] = cloneApplication(value);
    }
    const deletedIds = Array.isArray(parsed.deletedIds)
      ? parsed.deletedIds.filter((id): id is string => typeof id === "string" && /^SEL-\d+$/.test(id))
      : [];
    return { version: STORAGE_SCHEMA_VERSION, overrides, deletedIds };
  } catch {
    return { version: STORAGE_SCHEMA_VERSION, overrides: {}, deletedIds: [] };
  }
}

function writePrototypePayload(payload: SellerPrototypeStoragePayload) {
  if (!isBrowserStorageAvailable()) return false;
  try {
    window.sessionStorage.setItem(SELLER_PROTOTYPE_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadPrototypeSellerApplications(): SellerApplication[] {
  const { overrides, deletedIds } = readPrototypePayload();
  const deleted = new Set(deletedIds);
  return SEED_APPLICATIONS.filter((seed) => !deleted.has(seed.applicationId)).map((seed) => {
    const override = overrides[seed.applicationId];
    return override ? cloneApplication(override) : cloneApplication(seed);
  });
}

export function deletePrototypeSellerApplication(applicationId: string): boolean {
  if (!/^SEL-\d+$/.test(applicationId)) return false;
  if (!SEED_APPLICATIONS.some((seed) => seed.applicationId === applicationId)) return false;
  const payload = readPrototypePayload();
  if (!payload.deletedIds.includes(applicationId)) {
    payload.deletedIds = [...payload.deletedIds, applicationId];
  }
  delete payload.overrides[applicationId];
  return writePrototypePayload(payload);
}

export function resetPrototypeSellerApplications(): boolean {
  if (!isBrowserStorageAvailable()) return true;
  try {
    window.sessionStorage.removeItem(SELLER_PROTOTYPE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
