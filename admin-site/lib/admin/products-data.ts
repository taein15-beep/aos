/**
 * 상품목록 샘플 데이터 (SAMPLE)
 * 백엔드 API 연동 전까지 UI 개발·검증용입니다.
 * 실제 저장·조회는 API 도입 시 이 파일의 SAMPLE_* 상수를 대체합니다.
 */

export const AFFILIATE_FILTER_OPTIONS = ["전체", "미공유", "공유 중", "수락대기"] as const;
export const SELLER_FILTER_OPTIONS = ["전체", "판매점 있음", "판매점 없음"] as const;
export const PRODUCT_SEARCH_FIELD_OPTIONS = ["상품명", "상품코드"] as const;

export type ProductAffiliateFilter = (typeof AFFILIATE_FILTER_OPTIONS)[number];
export type ProductSellerFilter = (typeof SELLER_FILTER_OPTIONS)[number];
export type ProductSearchField = (typeof PRODUCT_SEARCH_FIELD_OPTIONS)[number];

export type ProductListItem = {
  no: string;
  code: string;
  category: string;
  name: string;
  price: string;
  period: [string, string] | null;
  reservation: string;
  views: string;
  soldout: boolean;
  visible: boolean;
  /** 공유 중인 제휴여행사 수 */
  affiliateActive: number;
  /** 수락대기 중인 제휴여행사 수 */
  affiliatePending: number;
  /** 판매 허용된 판매점 수 */
  sellerCount: number;
  /** true: 상품공급여행사(제휴 설정 가능), false: 공유받은 상품 */
  isSupplier: boolean;
  /** 공유받은 상품일 때 공급여행사명 */
  supplierName?: string;
};

/**
 * Next.js App Router 경로 (상품코드 기준)
 * - 제휴여행사 설정: /products/[code]/affiliate-setting
 * - 판매점 설정:     /products/[code]/seller-setting  (운영 product_seller_setting.html 대응)
 */
export function getProductAffiliateSettingPath(code: string) {
  return `/products/${encodeURIComponent(code)}/affiliate-setting`;
}

export function getProductSellerSettingPath(code: string) {
  return `/products/${encodeURIComponent(code)}/seller-setting`;
}

export function isProductUnshared(product: ProductListItem) {
  return product.affiliateActive === 0 && product.affiliatePending === 0;
}

export function matchesAffiliateFilter(product: ProductListItem, filter: ProductAffiliateFilter) {
  if (filter === "전체") return true;
  if (filter === "미공유") return isProductUnshared(product);
  if (filter === "공유 중") return product.affiliateActive > 0;
  if (filter === "수락대기") return product.affiliatePending > 0;
  return true;
}

export function matchesSellerFilter(product: ProductListItem, filter: ProductSellerFilter) {
  if (filter === "전체") return true;
  if (filter === "판매점 있음") return product.sellerCount > 0;
  if (filter === "판매점 없음") return product.sellerCount === 0;
  return true;
}

export function matchesProductSearch(
  product: ProductListItem,
  keyword: string,
  field: ProductSearchField,
) {
  if (!keyword.trim()) return true;
  const value = keyword.trim().toLowerCase();
  if (field === "상품코드") {
    return product.code.toLowerCase().includes(value) || product.no.includes(value);
  }
  return product.name.toLowerCase().includes(value);
}

/** @deprecated SAMPLE — API 연동 시 제거 */
/**
 * 목록의 affiliateActive/Pending/sellerCount는 표시용 초기값입니다.
 * 화면에서는 getAffiliateCountsForProduct / getSellerCountForProduct로 동기화합니다.
 *
 * 상태별 검증용 샘플:
 * - boram01: 제휴 0 · 판매점 0
 * - paldo-111: 공유 중 3 · 판매점 2
 * - HP0001: 공유 중 3 · 수락대기 2(+공유 중지 포함) · 판매점 6
 * - HP0001C: 공유 중 1 · 수락대기 1(+중지·종료·거절) · 판매점 0 (복사 상품, 별도 코드)
 * - share-jeju: 공유받은 상품 · 제휴 버튼 비활성 · 판매점 4
 */
export const SAMPLE_PRODUCTS: ProductListItem[] = [
  {
    no: "18345",
    code: "HP0001C",
    category: "해외여행 > 중국여행 > 청도",
    name: "[복사] 청도 바캉스~ 온천♨+워터파크 & 관광 &미식투어맥주박물관 5박6일",
    price: "840,000",
    period: ["2026-05-12", "2026-07-30"],
    reservation: "0/0",
    views: "0/0",
    soldout: false,
    visible: true,
    affiliateActive: 0,
    affiliatePending: 0,
    sellerCount: 0,
    isSupplier: true,
  },
  {
    no: "18343",
    code: "paldo-111",
    category: "기차여행 > 특별열차",
    name: "[팔도장터열차] 6월 27일(토) 공주 유구 색동수국정원 / 계룡산 동학사",
    price: "79,000",
    period: null,
    reservation: "0/0",
    views: "0/0",
    soldout: false,
    visible: false,
    affiliateActive: 3,
    affiliatePending: 0,
    sellerCount: 2,
    isSupplier: true,
  },
  {
    no: "18342",
    code: "HP0001",
    category: "해외여행 > 중국여행 > 청도",
    name: "청도 바캉스~ 온천♨+워터파크 & 관광 &미식투어맥주박물관 5박6일",
    price: "840,000",
    period: ["2026-05-12", "2026-07-30"],
    reservation: "0/0",
    views: "0/0",
    soldout: false,
    visible: true,
    affiliateActive: 3,
    affiliatePending: 2,
    sellerCount: 6,
    isSupplier: true,
  },
  {
    no: "18341",
    code: "boram01",
    category: "버스여행 > 당일여행",
    name: "비아젬 견학투어 / 당진 장고항 실치축제 / 삼선산 수목원 / 한진포구 해상둘레길 (당일)",
    price: "15,000",
    period: null,
    reservation: "0/0",
    views: "0/0",
    soldout: false,
    visible: true,
    affiliateActive: 0,
    affiliatePending: 0,
    sellerCount: 0,
    isSupplier: true,
  },
  {
    no: "18340",
    code: "share-jeju",
    category: "국내여행 > 제주도",
    name: "[공유] 제주도 3박4일 힐링 패키지",
    price: "450,000",
    period: ["2026-06-01", "2026-09-30"],
    reservation: "2/5",
    views: "12/3",
    soldout: false,
    visible: true,
    affiliateActive: 0,
    affiliatePending: 0,
    sellerCount: 4,
    isSupplier: false,
    supplierName: "행복투어",
  },
];

export function getSampleProducts() {
  return SAMPLE_PRODUCTS;
}

/** 동일 코드가 여러 행일 때 공급 상품(isSupplier)을 우선 반환합니다. */
export function getSupplierProductByCode(code: string) {
  const decoded = decodeURIComponent(code);
  return SAMPLE_PRODUCTS.find((product) => product.code === decoded && product.isSupplier) ?? null;
}

/** 판매점 설정 화면용 — 공급 상품 우선, 없으면 첫 매칭 상품(공유받은 상품 포함) */
export function getProductForSellerSetting(code: string) {
  const decoded = decodeURIComponent(code);
  const supplier = SAMPLE_PRODUCTS.find((product) => product.code === decoded && product.isSupplier);
  if (supplier) return supplier;
  return SAMPLE_PRODUCTS.find((product) => product.code === decoded) ?? null;
}
