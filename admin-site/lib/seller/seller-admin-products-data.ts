/**
 * 판매점 관리자 · 판매상품 목록 Mock
 * - 공급여행사가 판매 허용한 상품만 포함
 * - 판매점은 등록/수정 불가 (조회·공유만)
 * - 공유 URL은 판매점 식별 가능해야 함 (원본 상품 URL 사용 금지)
 */

import {
  buildSellerProductSharePath,
  buildSellerProductShareUrl,
  type SellerProductShareAttribution,
} from "@/lib/seller/seller-product-share";

export type SellerAdminProductSalesStatus = "판매중" | "판매대기" | "판매종료";

export type SellerAdminProduct = {
  /** 상품 식별자 (공유 URL path용) */
  productId: string;
  productCode: string;
  productName: string;
  imageUrl: string | null;
  supplyAgencyName: string;
  /** 공급여행사 ID — 공유 추적 / 예약 연결용 */
  supplierTravelAgencyId: string;
  /** 단일 출발일 또는 기간 표시 텍스트 */
  departureLabel: string;
  salesPrice: number;
  /** 판매수수료 % */
  commissionRate: number;
  salesStatus: SellerAdminProductSalesStatus;
  sellerId: string;
  sellerCode: string;
};

export type SellerAdminProductFilters = {
  productName: string;
  supplyAgency: string;
  salesStatus: SellerAdminProductSalesStatus | "전체";
};

export const EMPTY_SELLER_ADMIN_PRODUCT_FILTERS: SellerAdminProductFilters = {
  productName: "",
  supplyAgency: "",
  salesStatus: "전체",
};

export const SELLER_ADMIN_PRODUCT_STATUS_OPTIONS = [
  "전체",
  "판매중",
  "판매대기",
  "판매종료",
] as const;

export {
  buildSellerProductSharePath,
  buildSellerProductShareUrl,
};

const IMAGE_POOL = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&h=120&fit=crop",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=160&h=120&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=160&h=120&fit=crop",
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=160&h=120&fit=crop",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=160&h=120&fit=crop",
];

const PRODUCTS_BY_SELLER: Record<string, SellerAdminProduct[]> = {
  SEL00032: [
    {
      productId: "123",
      productCode: "AOS-P-101",
      productName: "철원 DMZ 평화관광",
      imageUrl: IMAGE_POOL[0],
      supplyAgencyName: "애비아넥스트",
      supplierTravelAgencyId: "AGY-AVIANEXT",
      departureLabel: "2026.10.05",
      salesPrice: 89000,
      commissionRate: 7,
      salesStatus: "판매중",
      sellerId: "SEL00032",
      sellerCode: "SEL00032",
    },
    {
      productId: "124",
      productCode: "AOS-P-102",
      productName: "강릉·속초 2박 3일",
      imageUrl: IMAGE_POOL[1],
      supplyAgencyName: "애비아넥스트",
      supplierTravelAgencyId: "AGY-AVIANEXT",
      departureLabel: "2026.10.12 ~ 2026.10.14",
      salesPrice: 268000,
      commissionRate: 6.5,
      salesStatus: "판매중",
      sellerId: "SEL00032",
      sellerCode: "SEL00032",
    },
    {
      productId: "125",
      productCode: "AOS-P-103",
      productName: "부산 해운대·감천 당일",
      imageUrl: IMAGE_POOL[2],
      supplyAgencyName: "부산투어본사",
      supplierTravelAgencyId: "AGY-BUSAN",
      departureLabel: "2026.09.28",
      salesPrice: 89000,
      commissionRate: 5,
      salesStatus: "판매중",
      sellerId: "SEL00032",
      sellerCode: "SEL00032",
    },
    {
      productId: "126",
      productCode: "AOS-P-104",
      productName: "경주 역사문화 1박 2일",
      imageUrl: IMAGE_POOL[3],
      supplyAgencyName: "애비아넥스트",
      supplierTravelAgencyId: "AGY-AVIANEXT",
      departureLabel: "2026.10.01 ~ 2026.10.02",
      salesPrice: 178000,
      commissionRate: 6,
      salesStatus: "판매대기",
      sellerId: "SEL00032",
      sellerCode: "SEL00032",
    },
    {
      productId: "127",
      productCode: "AOS-P-105",
      productName: "여수 밤바다 당일",
      imageUrl: IMAGE_POOL[4],
      supplyAgencyName: "남도여행사",
      supplierTravelAgencyId: "AGY-NAMDO",
      departureLabel: "2026.09.22",
      salesPrice: 78000,
      commissionRate: 5,
      salesStatus: "판매대기",
      sellerId: "SEL00032",
      sellerCode: "SEL00032",
    },
    {
      productId: "128",
      productCode: "AOS-P-106",
      productName: "전주 한옥마을 당일",
      imageUrl: null,
      supplyAgencyName: "남도여행사",
      supplierTravelAgencyId: "AGY-NAMDO",
      departureLabel: "2026.08.30",
      salesPrice: 69000,
      commissionRate: 4.5,
      salesStatus: "판매종료",
      sellerId: "SEL00032",
      sellerCode: "SEL00032",
    },
    {
      productId: "129",
      productCode: "AOS-P-107",
      productName: "설악산·속초 당일",
      imageUrl: IMAGE_POOL[1],
      supplyAgencyName: "애비아넥스트",
      supplierTravelAgencyId: "AGY-AVIANEXT",
      departureLabel: "2026.08.15",
      salesPrice: 92000,
      commissionRate: 5,
      salesStatus: "판매종료",
      sellerId: "SEL00032",
      sellerCode: "SEL00032",
    },
    {
      productId: "130",
      productCode: "AOS-P-108",
      productName: "울릉도·독도 3박 4일",
      imageUrl: IMAGE_POOL[0],
      supplyAgencyName: "동해투어",
      supplierTravelAgencyId: "AGY-DONGHAE",
      departureLabel: "2026.11.03 ~ 2026.11.06",
      salesPrice: 890000,
      commissionRate: 8,
      salesStatus: "판매중",
      sellerId: "SEL00032",
      sellerCode: "SEL00032",
    },
  ],
};

export function listSellerAdminProducts(sellerId: string): SellerAdminProduct[] {
  return [...(PRODUCTS_BY_SELLER[sellerId.trim()] ?? [])];
}

export function getSellerAdminProduct(
  sellerId: string,
  productId: string,
): SellerAdminProduct | null {
  return (
    listSellerAdminProducts(sellerId).find((row) => row.productId === productId.trim()) ?? null
  );
}

/** 공유 URL 접속 시 복원할 추적 정보 */
export function toSellerProductShareAttribution(
  product: SellerAdminProduct,
): SellerProductShareAttribution {
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
  for (const products of Object.values(PRODUCTS_BY_SELLER)) {
    const found = products.find(
      (row) => row.sellerCode === code && row.productId === id,
    );
    if (found) return toSellerProductShareAttribution(found);
  }
  return null;
}

export function filterSellerAdminProducts(
  products: readonly SellerAdminProduct[],
  filters: SellerAdminProductFilters,
) {
  const nameKeyword = filters.productName.trim().toLowerCase();
  const agencyKeyword = filters.supplyAgency.trim().toLowerCase();

  return products.filter((row) => {
    if (nameKeyword) {
      const haystack = `${row.productName} ${row.productCode}`.toLowerCase();
      if (!haystack.includes(nameKeyword)) return false;
    }
    if (agencyKeyword && !row.supplyAgencyName.toLowerCase().includes(agencyKeyword)) {
      return false;
    }
    if (filters.salesStatus !== "전체" && row.salesStatus !== filters.salesStatus) {
      return false;
    }
    return true;
  });
}

export function formatSellerAdminProductPrice(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function formatSellerAdminCommission(rate: number) {
  const text = Number.isInteger(rate) ? String(rate) : String(rate);
  return `${text}%`;
}

export function sellerAdminProductStatusBadgeClass(status: SellerAdminProductSalesStatus) {
  if (status === "판매중") return "success";
  if (status === "판매대기") return "warn";
  return "gray";
}
