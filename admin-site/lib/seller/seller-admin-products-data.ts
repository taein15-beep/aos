/**
 * 판매점 관리자 · 판매상품 목록 Mock (SAMPLE)
 * - 공급여행사가 판매 허용한 상품만 포함 (공급여행사 가입 ≠ 전체 상품 자동 노출)
 * - 상품 원본(상품명·코드·일정·요금 등)은 공급여행사 소유 — 판매점은 등록/수정 불가
 * - 판매방식: 수수료형(공급 판매가 고정 + 수수료) / 입금가형(공급 입금가 + 판매점 판매가)
 * - 판매상태는 저장값이 아니라 계산값: 공급여행사 거래상태 > 공급여행사 상품상태(운영종료 포함) > 판매점 자체상태 > 입금가형 판매가
 * - 이 목록이 Dashboard · 공급여행사 화면의 공급여행사별 상품 수 기준 (SEL00032)
 * - 공유 URL은 판매점 식별 가능해야 함 (원본 상품 URL 사용 금지)
 */

import {
  buildSellerProductSharePath,
  buildSellerProductShareUrl,
  type SellerProductShareAttribution,
} from "@/lib/seller/seller-product-share";
import type { SupplierTradeStatus } from "@/lib/seller/seller-login-mock";

export type SellerProductSaleMode = "수수료형" | "입금가형";
export type SellerAdminProductSalesStatus = "판매중" | "설정대기" | "판매중지";
export type SellerProductCategory = "당일여행" | "숙박여행" | "테마여행" | "체험여행";

/** 공급여행사가 판매 허용한 상품 원본 + 판매점 설정값 */
type SellerProductSource = {
  productId: string;
  productCode: string;
  productName: string;
  category: SellerProductCategory;
  imageUrl: string | null;
  supplierTravelAgencyId: string;
  supplyAgencyName: string;
  supplierCode: string;
  saleMode: SellerProductSaleMode;
  /** 수수료형: 공급여행사가 정한 판매가 */
  supplyPrice: number | null;
  /** 수수료형: 수수료율 % */
  commissionRate: number | null;
  /** 입금가형: 공급여행사가 판매점별로 정한 입금가 */
  depositPrice: number | null;
  /** 입금가형: 판매점이 설정한 최종 판매가 (미설정 null) */
  sellerPrice: number | null;
  /** 공급여행사 측 상품 판매중지 사유 (판매 중이면 null) */
  supplierStopReason: string | null;
  /** 판매 허용일 — 기본 정렬 기준 */
  allowedAt: string;
};

export type SellerAdminProduct = SellerProductSource & {
  salesStatus: SellerAdminProductSalesStatus;
  /** 판매중지 원인 (판매중지가 아니면 null) */
  stopCause: SellerProductStopCause | null;
  /** 목록 · 상세 보조 문구 */
  stopReason: string | null;
  /** 상품 운영종료 사유 (Mock) */
  operationEndReason: string | null;
  /** 판매점과 공급여행사의 거래상태 (Mock 관계상태) */
  supplierTradeStatus: SupplierTradeStatus;
  sellerId: string;
  sellerCode: string;
};

export { buildSellerProductSharePath, buildSellerProductShareUrl };

const IMAGE_POOL = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&h=120&fit=crop",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=160&h=120&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=160&h=120&fit=crop",
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=160&h=120&fit=crop",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=160&h=120&fit=crop",
];

const HAPPY = { supplierTravelAgencyId: "AGENCY-HAPPY", supplyAgencyName: "행복투어", supplierCode: "SUP00001" };
const HYUNDAM = { supplierTravelAgencyId: "AGENCY-HYUNDAM", supplyAgencyName: "현담여행사", supplierCode: "SUP00002" };

function commission(price: number, rate: number) {
  return { saleMode: "수수료형" as const, supplyPrice: price, commissionRate: rate, depositPrice: null, sellerPrice: null };
}

function deposit(depositPrice: number, sellerPrice: number | null) {
  return { saleMode: "입금가형" as const, supplyPrice: null, commissionRate: null, depositPrice, sellerPrice };
}

/** SEL00032(그래가자) 판매 허용 상품 — 최근 판매허용 순 (행복투어 12 · 현담여행사 8) */
const PRODUCTS_BY_SELLER: Record<string, SellerProductSource[]> = {
  SEL00032: [
    { productId: "HT-DMZ01", productCode: "HT-DMZ01", productName: "철원 DMZ 평화관광", category: "당일여행", imageUrl: IMAGE_POOL[0], ...HAPPY, ...commission(69000, 10), supplierStopReason: null, allowedAt: "2026-10-10" },
    { productId: "HD-JS01", productCode: "HD-JS01", productName: "강원도 정선 당일여행", category: "당일여행", imageUrl: IMAGE_POOL[1], ...HYUNDAM, ...commission(79000, 8), supplierStopReason: null, allowedAt: "2026-10-09" },
    { productId: "HT-WINE01", productCode: "HT-WINE01", productName: "국악와인열차", category: "테마여행", imageUrl: IMAGE_POOL[2], ...HAPPY, ...deposit(55000, 65000), supplierStopReason: null, allowedAt: "2026-10-08" },
    { productId: "HD-BS02", productCode: "HD-BS02", productName: "부산 1박2일", category: "숙박여행", imageUrl: IMAGE_POOL[3], ...HYUNDAM, ...deposit(180000, 219000), supplierStopReason: null, allowedAt: "2026-10-07" },
    { productId: "HT-GC01", productCode: "HT-GC01", productName: "고창 선운사 당일여행", category: "당일여행", imageUrl: null, ...HAPPY, ...deposit(52000, null), supplierStopReason: null, allowedAt: "2026-10-06" },
    { productId: "HD-JC01", productCode: "HD-JC01", productName: "제천 청풍호 당일여행", category: "당일여행", imageUrl: null, ...HYUNDAM, ...deposit(58000, null), supplierStopReason: null, allowedAt: "2026-10-05" },
    { productId: "HT-NAMI01", productCode: "HT-NAMI01", productName: "남이섬 가을여행", category: "당일여행", imageUrl: IMAGE_POOL[4], ...HAPPY, ...commission(75000, 10), supplierStopReason: "공급여행사 판매중지", allowedAt: "2026-10-04" },
    { productId: "HT-DY01", productCode: "HT-DY01", productName: "단양 패러글라이딩 체험", category: "체험여행", imageUrl: IMAGE_POOL[1], ...HAPPY, ...commission(99000, 10), supplierStopReason: null, allowedAt: "2026-10-02" },
    { productId: "HD-NH01", productCode: "HD-NH01", productName: "남해 독일마을 당일투어", category: "당일여행", imageUrl: IMAGE_POOL[0], ...HYUNDAM, ...commission(79000, 8), supplierStopReason: null, allowedAt: "2026-09-30" },
    { productId: "HT-GP01", productCode: "HT-GP01", productName: "가평 와인 클래스", category: "체험여행", imageUrl: null, ...HAPPY, ...deposit(68000, 79000), supplierStopReason: null, allowedAt: "2026-09-28" },
    { productId: "HD-TY01", productCode: "HD-TY01", productName: "통영 케이블카·동피랑 1박 2일", category: "숙박여행", imageUrl: IMAGE_POOL[2], ...HYUNDAM, ...deposit(128000, 149000), supplierStopReason: null, allowedAt: "2026-09-26" },
    { productId: "HT-SR01", productCode: "HT-SR01", productName: "설악산 단풍 당일여행", category: "당일여행", imageUrl: IMAGE_POOL[3], ...HAPPY, ...commission(72000, 10), supplierStopReason: null, allowedAt: "2026-09-24" },
    { productId: "HT-GJ01", productCode: "HT-GJ01", productName: "경주 야경 1박 2일", category: "숙박여행", imageUrl: IMAGE_POOL[4], ...HAPPY, ...deposit(149000, 175000), supplierStopReason: null, allowedAt: "2026-09-22" },
    { productId: "HD-GJ01", productCode: "HD-GJ01", productName: "거제 외도 보타니아", category: "당일여행", imageUrl: null, ...HYUNDAM, ...commission(89000, 8), supplierStopReason: null, allowedAt: "2026-09-20" },
    { productId: "HT-JJ01", productCode: "HT-JJ01", productName: "전주 한옥마을 당일여행", category: "당일여행", imageUrl: IMAGE_POOL[0], ...HAPPY, ...commission(65000, 8), supplierStopReason: null, allowedAt: "2026-09-18" },
    { productId: "HT-YS01", productCode: "HT-YS01", productName: "여수 밤바다 1박 2일", category: "숙박여행", imageUrl: IMAGE_POOL[1], ...HAPPY, ...deposit(165000, 189000), supplierStopReason: null, allowedAt: "2026-09-15" },
    { productId: "HD-SC01", productCode: "HD-SC01", productName: "순천만 국가정원 당일여행", category: "당일여행", imageUrl: IMAGE_POOL[2], ...HYUNDAM, ...commission(69000, 8), supplierStopReason: null, allowedAt: "2026-09-12" },
    { productId: "HT-AD01", productCode: "HT-AD01", productName: "안동 하회마을 당일여행", category: "당일여행", imageUrl: null, ...HAPPY, ...commission(69000, 10), supplierStopReason: null, allowedAt: "2026-09-10" },
    { productId: "HD-DY01", productCode: "HD-DY01", productName: "담양 죽녹원 당일여행", category: "당일여행", imageUrl: IMAGE_POOL[3], ...HYUNDAM, ...deposit(49000, 59000), supplierStopReason: null, allowedAt: "2026-09-08" },
    { productId: "HT-TA01", productCode: "HT-TA01", productName: "태안 꽃지해변 당일여행", category: "당일여행", imageUrl: IMAGE_POOL[4], ...HAPPY, ...commission(62000, 9), supplierStopReason: null, allowedAt: "2026-09-05" },
  ],
};

/** 공급여행사ID → 판매점과의 거래상태 (없으면 정상으로 간주) */
export type SellerProductSupplierStatusMap = Partial<Record<string, SupplierTradeStatus>>;

/** 상품ID → 해당 판매점이 설정한 입금가형 판매가 (Client State, 해당 판매점 목록에만 적용) */
export type SellerProductPriceOverrideMap = Partial<Record<string, number>>;

/** 상품ID → 사유 문자열 (공급여행사 상품중지 · 운영종료 · 재개확인 Mock 용) */
export type SellerProductStopOverrideMap = Partial<Record<string, string>>;

/** 상품ID → true (판매점 자체중지 Flag) */
export type SellerProductFlagMap = Partial<Record<string, true>>;

/**
 * 판매중지 원인 — 우선순위: 거래 이용중지 > 공급여행사 상품중지 > 상품 운영종료 > 판매점 자체중지 > 재개확인 필요
 * 상위 원인이 해소되어도 하위 원인(자체중지 · 재개확인 필요)은 자동 해제되지 않음
 */
export type SellerProductStopCause =
  | "공급여행사 거래 이용중지"
  | "공급여행사 판매중지"
  | "상품 운영종료"
  | "판매점 자체중지"
  | "재개확인 필요";

/** 공급여행사 · 상품 운영 등 판매점이 해제할 수 없는 상위 원인 */
export const UPSTREAM_STOP_CAUSES: readonly SellerProductStopCause[] = [
  "공급여행사 거래 이용중지",
  "공급여행사 판매중지",
  "상품 운영종료",
];

export type SellerProductListOptions = {
  supplierStatuses?: SellerProductSupplierStatusMap;
  priceOverrides?: SellerProductPriceOverrideMap;
  /** 공급여행사 상품 판매중지 사유 */
  supplierStopOverrides?: SellerProductStopOverrideMap;
  /** 상품 운영종료 사유 (시즌 종료 · 판매기간 종료 등) */
  operationEndOverrides?: SellerProductStopOverrideMap;
  /** 판매점 자체중지 */
  sellerStops?: SellerProductFlagMap;
  /** 상위 원인 해소 후 판매재개 확인이 필요한 상품 → 보조 문구 */
  resumeRequired?: SellerProductStopOverrideMap;
};

type SellerFlags = { operationEndReason: string | null; sellerStopped: boolean; resumeRequiredLabel: string | null };

/**
 * 판매상태 계산 — 1.공급여행사 거래상태 > 2.공급여행사 상품상태(운영종료 포함) > 3.판매점 자체상태 > 4.입금가형 판매가
 * 상위 상태가 판매불가이면 하위 상태가 정상이어도 판매중지
 */
function resolveSalesStatus(
  product: SellerProductSource,
  supplierStatus: SupplierTradeStatus,
  flags: SellerFlags,
): { salesStatus: SellerAdminProductSalesStatus; stopCause: SellerProductStopCause | null; stopReason: string | null } {
  const stopped = (stopCause: SellerProductStopCause, stopReason: string) =>
    ({ salesStatus: "판매중지", stopCause, stopReason }) as const;
  if (supplierStatus === "이용중지") return stopped("공급여행사 거래 이용중지", "공급여행사 거래 이용중지");
  if (product.supplierStopReason) return stopped("공급여행사 판매중지", product.supplierStopReason);
  if (flags.operationEndReason) return stopped("상품 운영종료", "상품 운영종료");
  if (flags.sellerStopped) return stopped("판매점 자체중지", "판매점 자체중지");
  if (flags.resumeRequiredLabel) return stopped("재개확인 필요", flags.resumeRequiredLabel);
  if (product.saleMode === "입금가형") {
    if (product.sellerPrice === null || product.depositPrice === null || product.sellerPrice < product.depositPrice) {
      return { salesStatus: "설정대기", stopCause: null, stopReason: null };
    }
  }
  return { salesStatus: "판매중", stopCause: null, stopReason: null };
}

export function listSellerAdminProducts(sellerId: string, options: SellerProductListOptions = {}): SellerAdminProduct[] {
  const {
    supplierStatuses = {},
    priceOverrides = {},
    supplierStopOverrides = {},
    operationEndOverrides = {},
    sellerStops = {},
    resumeRequired = {},
  } = options;
  const key = sellerId.trim();
  return (PRODUCTS_BY_SELLER[key] ?? [])
    .filter((product) => supplierStatuses[product.supplierTravelAgencyId] !== "승인대기")
    .map((source) => {
      const overridePrice = priceOverrides[source.productId];
      const product: SellerProductSource = {
        ...source,
        sellerPrice: source.saleMode === "입금가형" && overridePrice !== undefined ? overridePrice : source.sellerPrice,
        supplierStopReason: supplierStopOverrides[source.productId] ?? source.supplierStopReason,
      };
      const supplierTradeStatus = supplierStatuses[product.supplierTravelAgencyId] ?? "정상";
      const operationEndReason = operationEndOverrides[source.productId] ?? null;
      return {
        ...product,
        ...resolveSalesStatus(product, supplierTradeStatus, {
          operationEndReason,
          sellerStopped: Boolean(sellerStops[source.productId]),
          resumeRequiredLabel: resumeRequired[source.productId] ?? null,
        }),
        operationEndReason,
        supplierTradeStatus,
        sellerId: key,
        sellerCode: key,
      };
    })
    .sort((a, b) => b.allowedAt.localeCompare(a.allowedAt));
}

/** 판매상품 상세 Route — /seller/products/{상품코드} */
export function sellerProductDetailPath(productCode: string) {
  return `/seller/products/${encodeURIComponent(productCode)}`;
}

export function getSellerAdminProduct(sellerId: string, productId: string): SellerAdminProduct | null {
  return listSellerAdminProducts(sellerId).find((row) => row.productId === productId.trim()) ?? null;
}

export type SellerProductStatusCount = { onSale: number; setupPending: number; stopped: number };

export function countSellerProductStatus(products: readonly SellerAdminProduct[]): SellerProductStatusCount {
  return products.reduce(
    (acc, product) => ({
      onSale: acc.onSale + (product.salesStatus === "판매중" ? 1 : 0),
      setupPending: acc.setupPending + (product.salesStatus === "설정대기" ? 1 : 0),
      stopped: acc.stopped + (product.salesStatus === "판매중지" ? 1 : 0),
    }),
    { onSale: 0, setupPending: 0, stopped: 0 },
  );
}

/** 공급여행사별 판매상품 상태 수 (거래상태 미반영 원본 기준) */
export function countSellerProductsBySupplier(sellerId: string, supplierId: string): SellerProductStatusCount {
  return countSellerProductStatus(
    listSellerAdminProducts(sellerId).filter((product) => product.supplierTravelAgencyId === supplierId),
  );
}

/* ── 금액 계산 ── */

/** 고객 판매가: 수수료형=공급 판매가 / 입금가형=판매점 판매가(미설정 null) */
export function sellerProductSalePrice(product: SellerProductSource): number | null {
  return product.saleMode === "수수료형" ? product.supplyPrice : product.sellerPrice;
}

/** 예상수익: 수수료형=판매가×수수료율 / 입금가형=판매점 판매가-입금가 */
export function sellerProductExpectedProfit(product: SellerProductSource): number | null {
  if (product.saleMode === "수수료형") {
    if (product.supplyPrice === null || product.commissionRate === null) return null;
    return Math.round((product.supplyPrice * product.commissionRate) / 100);
  }
  if (product.sellerPrice === null || product.depositPrice === null) return null;
  return product.sellerPrice - product.depositPrice;
}

/* ── 입금가형 판매점 판매가 설정 ── */

export type SellerProductPriceEditability =
  | { kind: "none" }
  | { kind: "editable"; mode: "set" | "change" }
  | { kind: "locked"; mode: "set" | "change"; reason: string };

/**
 * 판매가 설정/변경 가능 여부 — 판매점은 입금가형 상품의 최종 판매가만 설정 가능
 * 수수료형은 기능 없음, 판매중 · 설정대기 상태에서만 설정/변경 가능
 */
export function getSellerProductPriceEditability(product: SellerAdminProduct): SellerProductPriceEditability {
  if (product.saleMode !== "입금가형" || product.depositPrice === null) return { kind: "none" };
  const mode = product.sellerPrice === null ? "set" : "change";
  if (product.stopCause === "상품 운영종료") {
    return { kind: "locked", mode, reason: "상품 운영이 종료되어 판매가를 변경할 수 없습니다." };
  }
  if (product.stopCause && UPSTREAM_STOP_CAUSES.includes(product.stopCause)) {
    return { kind: "locked", mode, reason: "공급여행사 상태가 정상화된 후 변경할 수 있습니다." };
  }
  if (product.stopCause) {
    return { kind: "locked", mode, reason: "판매중지 상태에서는 판매가를 변경할 수 없습니다. 판매재개 후 변경해주세요." };
  }
  if (product.supplierTradeStatus !== "정상") return { kind: "none" };
  return { kind: "editable", mode };
}

/* ── 판매점 자체 판매중지 / 판매재개 ── */

export type SellerProductSaleControl = { kind: "none" } | { kind: "stop" } | { kind: "resume" };

/**
 * 판매중 → 판매중지 가능, 판매점 자체중지 · 재개확인 필요 → 판매재개 가능
 * 판매재개 조건: 거래 정상 · 공급 상품 정상 · 운영중 · (입금가형) 판매가 설정 완료
 * 공급여행사 원인 · 운영종료 · 설정대기 상품은 판매재개 불가
 */
export function getSellerProductSaleControl(product: SellerAdminProduct): SellerProductSaleControl {
  if (product.salesStatus === "판매중") return { kind: "stop" };
  if (product.stopCause !== "판매점 자체중지" && product.stopCause !== "재개확인 필요") return { kind: "none" };
  if (product.supplierTradeStatus !== "정상" || product.supplierStopReason || product.operationEndReason) return { kind: "none" };
  if (product.saleMode === "입금가형") {
    if (product.sellerPrice === null || product.depositPrice === null || product.sellerPrice < product.depositPrice) {
      return { kind: "none" };
    }
  }
  return { kind: "resume" };
}

/** 판매중지 조작 주체 표시 */
export function sellerProductStopActor(product: SellerAdminProduct, sellerName: string) {
  switch (product.stopCause) {
    case "판매점 자체중지":
      return `${sellerName}에서 판매중지`;
    case "공급여행사 판매중지":
      return `${product.supplyAgencyName}에서 판매중지`;
    case "공급여행사 거래 이용중지":
      return "공급여행사 거래 이용중지";
    case "상품 운영종료":
      return `${product.supplyAgencyName} 상품 운영종료`;
    default:
      return null;
  }
}

export type SellerPriceInputCheck = {
  price: number | null;
  error: string | null;
  warning: string | null;
};

/** 판매가 입력값 검증 — 빈 값/0원/음수/숫자 아님/입금가 미만 저장 불가, 입금가 동일은 경고만 */
export function checkSellerPriceInput(raw: string, depositPrice: number): SellerPriceInputCheck {
  const value = raw.trim();
  if (value === "") return { price: null, error: null, warning: null };
  if (value.startsWith("-")) return { price: null, error: "0원보다 큰 금액을 입력해주세요.", warning: null };
  const digits = value.replace(/,/g, "");
  if (!/^\d+$/.test(digits)) return { price: null, error: "숫자만 입력해주세요.", warning: null };
  const price = Number(digits);
  if (price <= 0) return { price: null, error: "0원보다 큰 금액을 입력해주세요.", warning: null };
  if (price < depositPrice) {
    return {
      price: null,
      error: `판매가는 공급 입금가 ${formatSellerAdminProductPrice(depositPrice)} 이상으로 설정해주세요.`,
      warning: null,
    };
  }
  if (price === depositPrice) {
    return { price, error: null, warning: "판매마진이 0원입니다. 판매점 수익 없이 판매됩니다." };
  }
  return { price, error: null, warning: null };
}

/** 입력 중 표시값 — 숫자만 입력된 경우 천 단위 쉼표 */
export function formatSellerPriceInput(raw: string) {
  const digits = raw.replace(/,/g, "");
  if (!/^\d+$/.test(digits)) return raw;
  return Number(digits).toLocaleString("ko-KR");
}

/** 판매마진율(%) = 판매마진 ÷ 판매점 판매가 × 100, 소수점 첫째 자리 */
export function formatSellerMarginRate(margin: number, salePrice: number) {
  if (salePrice <= 0) return "-";
  return `${(Math.round((margin / salePrice) * 1000) / 10).toFixed(1)}%`;
}

/* ── 검색 / Filter ── */

export type SellerProductFilters = {
  keyword: string;
  supplierId: string;
  saleMode: SellerProductSaleMode | "전체";
  status: SellerAdminProductSalesStatus | "전체";
};

export const EMPTY_SELLER_PRODUCT_FILTERS: SellerProductFilters = {
  keyword: "",
  supplierId: "전체",
  saleMode: "전체",
  status: "전체",
};

export const SELLER_PRODUCT_SALE_MODES: SellerProductSaleMode[] = ["수수료형", "입금가형"];
export const SELLER_PRODUCT_STATUSES: SellerAdminProductSalesStatus[] = ["판매중", "설정대기", "판매중지"];

export function filterSellerAdminProducts(products: readonly SellerAdminProduct[], filters: SellerProductFilters) {
  const keyword = filters.keyword.trim().toLowerCase();
  return products.filter((row) => {
    if (keyword && !`${row.productName} ${row.productCode}`.toLowerCase().includes(keyword)) return false;
    if (filters.supplierId !== "전체" && row.supplierTravelAgencyId !== filters.supplierId) return false;
    if (filters.saleMode !== "전체" && row.saleMode !== filters.saleMode) return false;
    if (filters.status !== "전체" && row.salesStatus !== filters.status) return false;
    return true;
  });
}

export function isSellerProductFilterActive(filters: SellerProductFilters) {
  return (
    filters.keyword.trim() !== "" ||
    filters.supplierId !== "전체" ||
    filters.saleMode !== "전체" ||
    filters.status !== "전체"
  );
}

/* ── 표시 ── */

export function formatSellerAdminProductPrice(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function sellerAdminProductStatusBadgeClass(status: SellerAdminProductSalesStatus) {
  if (status === "판매중") return "success";
  if (status === "설정대기") return "warn";
  return "danger";
}

export function sellerProductModeBadgeClass(mode: SellerProductSaleMode) {
  return mode === "수수료형" ? "info" : "warn";
}

/* ── 링크공유 (판매점 식별 URL) ── */

/** 공유 URL 접속 시 복원할 추적 정보 */
export function toSellerProductShareAttribution(product: SellerAdminProduct): SellerProductShareAttribution {
  return {
    productId: product.productId,
    productCode: product.productCode,
    productName: product.productName,
    supplierTravelAgencyId: product.supplierTravelAgencyId,
    supplierTravelAgencyName: product.supplyAgencyName,
    sellerId: product.sellerId,
    sellerCode: product.sellerCode,
  };
}

/**
 * 공개 페이지에서 /s/{sellerCode}/product/{productId} 해석용
 * (website 연동 시 동일 시그니처로 API 교체)
 */
export function resolveSellerProductShareAttribution(
  sellerCode: string,
  productId: string,
): SellerProductShareAttribution | null {
  const code = sellerCode.trim();
  const id = productId.trim();
  for (const sellerId of Object.keys(PRODUCTS_BY_SELLER)) {
    if (sellerId !== code) continue;
    const found = listSellerAdminProducts(sellerId).find((row) => row.productId === id);
    if (found) return toSellerProductShareAttribution(found);
  }
  return null;
}
