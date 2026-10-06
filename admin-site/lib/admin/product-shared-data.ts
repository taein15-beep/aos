import { getSampleProducts } from "@/lib/admin/products-data";
import {
  PRODUCT_SHARE_STATUS_OPTIONS,
  parsePriceInput,
  shareStatusForRequestMode,
  storedConditionFromForm,
  type EditPermissionKey,
  type ProductShareStatus,
  type SalesChannelKey,
  type ShareConditionForm,
  type ShareRequestMode,
  type StoredShareCondition,
} from "@/lib/admin/product-affiliate-data";
import {
  SHARE_EDITABLE_ITEMS,
  createDefaultShareSettings,
  shareConditionFormFromDefaults,
} from "@/lib/admin/product-share-setting-data";

/**
 * 공유받는 제휴여행사 관리자 화면용 SAMPLE 데이터.
 * 원본 상품정보는 공급여행사 소유이며, 자사 판매설정만 이 화면에서 관리합니다.
 */

export const SHARED_SALES_STATUS_OPTIONS = ["판매대기", "판매중", "판매중지"] as const;
export type SharedSalesStatus = (typeof SHARED_SALES_STATUS_OPTIONS)[number];

/** 공유받은 상품에는 미공유 상태가 없습니다. 상태 타입은 공급여행사 화면과 동일한 ProductShareStatus를 사용합니다. */
export type SharedShareStatus = Exclude<ProductShareStatus, "미공유">;

export const SHARED_SHARE_STATUS_OPTIONS = PRODUCT_SHARE_STATUS_OPTIONS.filter(
  (status): status is SharedShareStatus => status !== "미공유",
);

/** 공급여행사의 공유 요청 방식에 따른 최초 공유상태 (즉시 공유 → 공유 중, 수락 후 공유 → 수락대기) */
function requestedShareStatus(mode: ShareRequestMode): SharedShareStatus {
  return shareStatusForRequestMode(mode) as SharedShareStatus;
}

export const SHARE_REJECT_REASON_OPTIONS = [
  "판매조건이 맞지 않음",
  "상품 운영조건이 맞지 않음",
  "판매 예정 없음",
  "일정/판매기간 문제",
  "기타",
] as const;
export type ShareRejectReason = (typeof SHARE_REJECT_REASON_OPTIONS)[number];

export type SharedRejection = {
  reason: ShareRejectReason;
  /** 기타 선택 시 입력한 사유 */
  detail: string;
  rejectedAt: string;
};

export const SHARE_REQUEST_ACCEPT_NOTICES = [
  "상품공유를 수락하면 해당 상품을 자사 판매상품으로 설정할 수 있습니다.",
  "공급여행사가 허용한 범위 내에서 상품명, 카테고리, 홈페이지 노출 등의 판매설정을 변경할 수 있습니다.",
  "원본 일정, 요금, 출발일, 좌석 등 공급상품의 핵심 정보는 수정할 수 없습니다.",
] as const;

/** 자사 카테고리 (SAMPLE · 카테고리 DB 연동 전) */
export const SHARED_OWN_CATEGORIES: Record<string, string[]> = {
  국내여행: ["강원도", "경기도", "충청도", "전라도", "경상도", "제주도"],
  해외여행: ["일본", "중국", "동남아"],
  기차여행: ["관광열차", "특별열차"],
  버스여행: ["당일여행", "1박2일"],
};
export const SHARED_OWN_CATEGORY_MAINS = Object.keys(SHARED_OWN_CATEGORIES);

export const SHARED_LOCKED_EDIT_MESSAGE = "공급여행사에서 수정이 허용되지 않은 항목입니다.";
export const SHARED_SALES_BLOCKED_MESSAGE = "현재 공유상태에서는 상품을 판매할 수 없습니다.";
export const SHARED_ORIGINAL_LOCKED_NOTICE =
  "원본 상품정보는 공급여행사에서 관리하며 제휴여행사에서는 수정할 수 없습니다.";
export const SHARED_ORIGINAL_SYNC_NOTICE = "공급여행사가 원본 상품정보를 변경하면 자사 판매화면에도 반영됩니다.";
export const SHARED_DATA_PENDING = "상품 데이터 연결 후 표시";

export const SHARED_STATUS_NOTICES: Partial<Record<ProductShareStatus, string>> = {
  수락대기: "공급여행사의 공유 요청을 수락해야 판매설정을 진행할 수 있습니다.",
  "공유 중지":
    "공급여행사에서 상품공유를 중지했습니다. 신규 판매만 중지되며, 기존 예약은 계속 조회·운영·정산할 수 있습니다.",
  "공유 종료":
    "상품공유가 종료되었습니다. 신규 판매는 불가하며, 기존 예약은 계속 조회·운영·정산할 수 있습니다.",
  "공유 거절": "거절한 상품공유 요청입니다.",
};

export const SHARE_REQUEST_PENDING_TITLE = "공급여행사에서 상품공유를 요청했습니다.";

export type SharedSalesSettings = {
  categoryMain: string;
  categorySub: string;
  homepageVisible: boolean;
  salesName: string;
  salesIntro: string;
  salesStatus: SharedSalesStatus;
};

export type SharedSalesField = "category" | "visible" | "salesName" | "salesIntro";

export type SharedProduct = {
  code: string;
  supplierName: string;
  name: string;
  /** 공급여행사 원본 카테고리 */
  category: string;
  price: string;
  salesPeriod: [string, string] | null;
  /** 공급여행사 원본 상품상태 */
  productStatus: string;
  shareStatus: SharedShareStatus;
  /** 공급여행사가 공유를 요청(또는 즉시 공유)한 일시 */
  requestedAt: string;
  shareStartDate: string;
  shareEndDate: string | null;
  /** 별도조건이 있으면 저장, null이면 공급여행사 기본 공유조건 적용 */
  customCondition: StoredShareCondition | null;
  sales: SharedSalesSettings;
  rejection: SharedRejection | null;
};

type CustomConditionOverrides = Partial<
  Pick<ShareConditionForm, "requestMode" | "commissionRate" | "inventoryMode">
> & {
  editPermissions?: Partial<Record<EditPermissionKey, boolean>>;
  salesChannels?: Partial<Record<SalesChannelKey, boolean>>;
};

function defaultConditionForm(price: string, start: string, end: string | null) {
  return shareConditionFormFromDefaults(createDefaultShareSettings(), parsePriceInput(price) ?? 0, { start, end });
}

function buildCustomCondition(
  price: string,
  start: string,
  end: string | null,
  overrides: CustomConditionOverrides,
): StoredShareCondition {
  const base = defaultConditionForm(price, start, end);
  return storedConditionFromForm({
    ...base,
    ...overrides,
    editPermissions: { ...base.editPermissions, ...overrides.editPermissions },
    salesChannels: { ...base.salesChannels, ...overrides.salesChannels },
  });
}

const jejuProduct = getSampleProducts().find((product) => product.code === "share-jeju");

const SAMPLE_SHARED_PRODUCTS: SharedProduct[] = [
  {
    code: "HT-DMZ01",
    supplierName: "행복투어",
    name: "철원 DMZ · 소이산 모노레일 당일",
    category: "국내여행 > 강원도",
    price: "69,000",
    salesPeriod: ["2026-09-01", "2026-12-20"],
    productStatus: "판매중",
    shareStatus: "공유 중",
    requestedAt: "2026-08-25 10:12",
    shareStartDate: "2026-09-01",
    shareEndDate: null,
    customCondition: null,
    sales: {
      categoryMain: "국내여행",
      categorySub: "강원도",
      homepageVisible: true,
      salesName: "[서울출발] 철원 DMZ 평화관광",
      salesIntro: "DMZ와 소이산 모노레일을 하루에 즐기는 철원 대표 당일여행입니다.",
      salesStatus: "판매중",
    },
    rejection: null,
  },
  ...(jejuProduct
    ? [
        {
          code: jejuProduct.code,
          supplierName: jejuProduct.supplierName ?? "행복투어",
          name: jejuProduct.name,
          category: jejuProduct.category,
          price: jejuProduct.price,
          salesPeriod: jejuProduct.period,
          productStatus: jejuProduct.visible ? "판매중" : "비노출",
          shareStatus: requestedShareStatus("immediate"),
          requestedAt: "2026-05-28 09:40",
          shareStartDate: "2026-06-01",
          shareEndDate: "2026-09-30",
          customCondition: buildCustomCondition(jejuProduct.price, "2026-06-01", "2026-09-30", {
            requestMode: "immediate",
            commissionRate: "12",
            inventoryMode: "allocated",
          }),
          rejection: null,
          sales: {
            categoryMain: "국내여행",
            categorySub: "제주도",
            homepageVisible: true,
            salesName: "제주도 3박4일 힐링 패키지",
            salesIntro: "",
            salesStatus: "판매중" as const,
          },
        },
      ]
    : []),
  {
    code: "TP-OSK04",
    supplierName: "투어파트너",
    name: "오사카 · 교토 4일 자유여행",
    category: "해외여행 > 일본 > 오사카",
    price: "689,000",
    salesPeriod: ["2026-10-01", "2027-02-28"],
    productStatus: "판매중",
    shareStatus: "공유 중",
    requestedAt: "2026-09-20 16:05",
    shareStartDate: "2026-10-01",
    shareEndDate: "2027-02-28",
    rejection: null,
    customCondition: buildCustomCondition("689,000", "2026-10-01", "2027-02-28", {
      commissionRate: "15",
      inventoryMode: "confirm",
      editPermissions: { displayName: false, promoText: false },
      salesChannels: { sellers: false, externalLink: false },
    }),
    sales: {
      categoryMain: "",
      categorySub: "",
      homepageVisible: false,
      salesName: "오사카 · 교토 4일 자유여행",
      salesIntro: "",
      salesStatus: "판매대기",
    },
  },
  {
    code: "GY-RAIL02",
    supplierName: "고양여행클럽",
    name: "정선 아리랑열차 · 레일바이크 당일",
    category: "기차여행 > 관광열차",
    price: "98,000",
    salesPeriod: ["2026-10-10", "2026-11-30"],
    productStatus: "판매중",
    shareStatus: requestedShareStatus("accept"),
    requestedAt: "2026-09-28 14:20",
    shareStartDate: "2026-10-10",
    shareEndDate: "2026-11-30",
    customCondition: null,
    sales: {
      categoryMain: "",
      categorySub: "",
      homepageVisible: false,
      salesName: "정선 아리랑열차 · 레일바이크 당일",
      salesIntro: "",
      salesStatus: "판매대기",
    },
    rejection: null,
  },
  {
    code: "TP-FUK03",
    supplierName: "투어파트너",
    name: "후쿠오카 · 유후인 3일 온천여행",
    category: "해외여행 > 일본 > 규슈",
    price: "549,000",
    salesPeriod: ["2026-11-01", "2027-03-31"],
    productStatus: "판매중",
    shareStatus: requestedShareStatus("accept"),
    requestedAt: "2026-09-30 11:02",
    shareStartDate: "2026-11-01",
    shareEndDate: "2027-03-31",
    customCondition: buildCustomCondition("549,000", "2026-11-01", "2027-03-31", {
      requestMode: "accept",
      commissionRate: "13",
      inventoryMode: "allocated",
      editPermissions: { promoText: false },
    }),
    sales: {
      categoryMain: "",
      categorySub: "",
      homepageVisible: false,
      salesName: "후쿠오카 · 유후인 3일 온천여행",
      salesIntro: "",
      salesStatus: "판매대기",
    },
    rejection: null,
  },
  {
    code: "BO-BUS03",
    supplierName: "블루오션여행",
    name: "통영 · 거제 1박2일",
    category: "국내여행 > 경상도",
    price: "219,000",
    salesPeriod: ["2026-08-01", "2026-12-31"],
    productStatus: "판매중",
    shareStatus: "공유 중지",
    requestedAt: "2026-07-22 13:30",
    rejection: null,
    shareStartDate: "2026-08-01",
    shareEndDate: null,
    customCondition: null,
    sales: {
      categoryMain: "국내여행",
      categorySub: "경상도",
      homepageVisible: true,
      salesName: "[특가] 통영 · 거제 1박2일",
      salesIntro: "케이블카와 외도 보타니아를 함께 둘러보는 남해안 여행입니다.",
      salesStatus: "판매중",
    },
  },
  {
    code: "DG-GJ01",
    supplierName: "대구여행센터",
    name: "경주 역사탐방 당일",
    category: "국내여행 > 경상도",
    price: "59,000",
    salesPeriod: ["2026-03-01", "2026-08-31"],
    productStatus: "판매종료",
    shareStatus: "공유 종료",
    requestedAt: "2026-02-18 10:00",
    rejection: null,
    shareStartDate: "2026-03-01",
    shareEndDate: "2026-08-31",
    customCondition: buildCustomCondition("59,000", "2026-03-01", "2026-08-31", { commissionRate: "8" }),
    sales: {
      categoryMain: "국내여행",
      categorySub: "경상도",
      homepageVisible: false,
      salesName: "경주 역사탐방 당일",
      salesIntro: "",
      salesStatus: "판매중지",
    },
  },
  {
    code: "HN-JJ05",
    supplierName: "하나로여행",
    name: "제주 올레 트레킹 2박3일",
    category: "국내여행 > 제주도",
    price: "389,000",
    salesPeriod: ["2026-10-01", "2026-12-31"],
    productStatus: "판매중",
    shareStatus: "공유 거절",
    requestedAt: "2026-09-15 09:25",
    shareStartDate: "2026-10-01",
    shareEndDate: "2026-12-31",
    customCondition: null,
    sales: {
      categoryMain: "",
      categorySub: "",
      homepageVisible: false,
      salesName: "제주 올레 트레킹 2박3일",
      salesIntro: "",
      salesStatus: "판매중지",
    },
    rejection: { reason: "판매 예정 없음", detail: "", rejectedAt: "2026-09-16 15:10" },
  },
];

/** 세션 내 변경 상태 (SAMPLE · 새로고침 시 초기화) */
type SharedSessionState = {
  shareStatus?: SharedShareStatus;
  sales?: SharedSalesSettings;
  rejection?: SharedRejection | null;
};
const sessionStateByCode: Record<string, SharedSessionState> = {};

export function cloneSharedSales(sales: SharedSalesSettings): SharedSalesSettings {
  return { ...sales };
}

function withSessionState(product: SharedProduct): SharedProduct {
  const session = sessionStateByCode[product.code] ?? {};
  const rejection = session.rejection !== undefined ? session.rejection : product.rejection;
  return {
    ...product,
    shareStatus: session.shareStatus ?? product.shareStatus,
    sales: cloneSharedSales(session.sales ?? product.sales),
    rejection: rejection ? { ...rejection } : null,
  };
}

export function getSharedProducts(): SharedProduct[] {
  return SAMPLE_SHARED_PRODUCTS.map(withSessionState);
}

export function getSharedProductByCode(code: string): SharedProduct | null {
  const decoded = decodeURIComponent(code);
  const product = SAMPLE_SHARED_PRODUCTS.find((item) => item.code === decoded);
  return product ? withSessionState(product) : null;
}

export function saveSharedProductSales(code: string, sales: SharedSalesSettings) {
  sessionStateByCode[code] = { ...sessionStateByCode[code], sales: cloneSharedSales(sales) };
}

/** 수락/거절은 수락 후 공유 방식으로 요청된 수락대기 상품에서만 가능합니다. */
export function canRespondToShareRequest(product: SharedProduct) {
  return product.shareStatus === "수락대기" && sharedConditionForm(product).requestMode === "accept";
}

function nowLabel() {
  return new Date().toLocaleString("sv-SE", { hour12: false }).slice(0, 16);
}

/** 수락대기 → 공유 중. 수락만으로 판매가 시작되지 않도록 자사 판매상태는 판매대기로 둡니다. */
export function acceptSharedProductRequest(code: string): SharedProduct | null {
  const product = getSharedProductByCode(code);
  if (!product || !canRespondToShareRequest(product)) return null;
  sessionStateByCode[product.code] = {
    ...sessionStateByCode[product.code],
    shareStatus: "공유 중",
    sales: { ...product.sales, salesStatus: "판매대기" },
    rejection: null,
  };
  return getSharedProductByCode(product.code);
}

/** 수락대기 → 공유 거절. 거절 사유는 세션 state에만 보관합니다. */
export function rejectSharedProductRequest(
  code: string,
  reason: ShareRejectReason,
  detail: string,
): SharedProduct | null {
  const product = getSharedProductByCode(code);
  if (!product || !canRespondToShareRequest(product)) return null;
  sessionStateByCode[product.code] = {
    ...sessionStateByCode[product.code],
    shareStatus: "공유 거절",
    sales: { ...product.sales, salesStatus: "판매중지" },
    rejection: { reason, detail: reason === "기타" ? detail.trim() : "", rejectedAt: nowLabel() },
  };
  return getSharedProductByCode(product.code);
}

export function getSharedProductPath(code: string) {
  return `/products/shared/${encodeURIComponent(code)}`;
}

export function getSharedProductSalesPath(code: string) {
  return `${getSharedProductPath(code)}?section=sales`;
}

export function getSharedProductSalesLink(code: string) {
  return `https://example.com/domestic/products/${encodeURIComponent(code)}`;
}

export function hasCustomSharedCondition(product: SharedProduct) {
  return product.customCondition !== null;
}

/** 공급여행사가 이 제휴여행사에 적용한 최종 공유조건 (별도조건 우선) */
export function sharedConditionForm(product: SharedProduct): ShareConditionForm {
  const base = defaultConditionForm(product.price, product.shareStartDate, product.shareEndDate);
  if (!product.customCondition) return base;
  return {
    ...base,
    ...product.customCondition,
    editPermissions: { ...product.customCondition.editPermissions },
    salesChannels: { ...product.customCondition.salesChannels },
  };
}

export function isSharedSalesEditable(product: Pick<SharedProduct, "shareStatus">) {
  return product.shareStatus === "공유 중";
}

export function isSharedFieldAllowed(form: ShareConditionForm, field: SharedSalesField) {
  const permissionKey = SHARE_EDITABLE_ITEMS.find((item) => item.key === field)?.permissionKey;
  return permissionKey ? form.editPermissions[permissionKey] : false;
}

/** 공유상태를 반영한 실제 판매상태. 공유 중이 아니면 판매중이 될 수 없습니다. */
export function effectiveSalesStatus(product: Pick<SharedProduct, "shareStatus" | "sales">): SharedSalesStatus {
  if (product.shareStatus === "공유 중") return product.sales.salesStatus;
  if (product.shareStatus === "수락대기") return product.sales.salesStatus === "판매중" ? "판매대기" : product.sales.salesStatus;
  return "판매중지";
}

/** 목록·KPI용 판매상태. 수락 전 상품은 자사 판매상태가 없는 것으로 봅니다. */
export function listSalesStatus(product: Pick<SharedProduct, "shareStatus" | "sales">): SharedSalesStatus | null {
  return product.shareStatus === "수락대기" ? null : effectiveSalesStatus(product);
}

export function salesStatusBadgeClass(status: SharedSalesStatus) {
  if (status === "판매중") return "success";
  if (status === "판매대기") return "warn";
  return "danger";
}

export function formatOwnCategory(sales: Pick<SharedSalesSettings, "categoryMain" | "categorySub">) {
  if (!sales.categoryMain) return "";
  return sales.categorySub ? `${sales.categoryMain} > ${sales.categorySub}` : sales.categoryMain;
}

/** 공유 중인데 자사 카테고리가 지정되지 않은 상품은 판매 전 설정이 필요합니다. */
export function needsSharedSalesSetup(product: SharedProduct) {
  return product.shareStatus === "공유 중" && !product.sales.categoryMain;
}

export function isSharedSalesDirty(a: SharedSalesSettings, b: SharedSalesSettings) {
  return JSON.stringify(a) !== JSON.stringify(b);
}
