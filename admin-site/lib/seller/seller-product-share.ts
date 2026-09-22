/**
 * 판매점 상품 공유 추적 / 예약 연결 구조
 * - 공유 URL path로 seller·product 식별
 * - 서버 lookup으로 supplier_travel_agency_id 복원
 * - 예약 생성 시 seller_id 연결용 Draft 타입 준비
 */

export type SellerProductShareAttribution = {
  productId: string;
  productCode: string;
  productName: string;
  /** 공급여행사 ID */
  supplierTravelAgencyId: string;
  supplierTravelAgencyName: string;
  /** 판매점 ID */
  sellerId: string;
  sellerCode: string;
};

/** 예약 생성 시 판매점 연결을 위한 Draft (API 연동 전) */
export type SellerAttributedReservationDraft = {
  productId: string;
  supplierTravelAgencyId: string;
  sellerId: string;
  sellerCode: string;
  sourceSharePath: string;
};

export const SELLER_SHARE_PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_SELLER_SHARE_ORIGIN ?? "https://www.aos-travel.example";

export function buildSellerProductSharePath(sellerCode: string, productId: string) {
  return `/s/${encodeURIComponent(sellerCode.trim())}/product/${encodeURIComponent(productId.trim())}`;
}

export function buildSellerProductShareUrl(
  sellerCode: string,
  productId: string,
  origin: string = SELLER_SHARE_PUBLIC_ORIGIN,
) {
  return `${origin.replace(/\/$/, "")}${buildSellerProductSharePath(sellerCode, productId)}`;
}

export function parseSellerProductSharePath(pathname: string): {
  sellerCode: string;
  productId: string;
} | null {
  const match = /^\/s\/([^/]+)\/product\/([^/]+)\/?$/.exec(pathname.trim());
  if (!match?.[1] || !match?.[2]) return null;
  try {
    return {
      sellerCode: decodeURIComponent(match[1]),
      productId: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

export function toSellerAttributedReservationDraft(
  attribution: SellerProductShareAttribution,
): SellerAttributedReservationDraft {
  return {
    productId: attribution.productId,
    supplierTravelAgencyId: attribution.supplierTravelAgencyId,
    sellerId: attribution.sellerId,
    sellerCode: attribution.sellerCode,
    sourceSharePath: buildSellerProductSharePath(attribution.sellerCode, attribution.productId),
  };
}
