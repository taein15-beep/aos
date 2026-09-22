/**
 * 판매점 관리자(Seller Admin) 세션용 프로필 Mock
 * - API/DB 연동 전 UI·Layout 표시 기준
 */

export type SellerAdminProfile = {
  sellerId: string;
  sellerCode: string;
  sellerName: string;
  sellerTypeLabel: string;
  contactName: string;
  loginId: string;
  logoUrl: string | null;
};

/** STEP 3 테스트용 기본 판매점 */
export const SELLER_ADMIN_DEMO_PROFILE: SellerAdminProfile = {
  sellerId: "SEL00032",
  sellerCode: "SEL00032",
  sellerName: "그래가자",
  sellerTypeLabel: "사업자판매점",
  contactName: "홍길동",
  loginId: "graegaja",
  logoUrl: null,
};

const SELLER_ADMIN_PROFILES: SellerAdminProfile[] = [
  SELLER_ADMIN_DEMO_PROFILE,
  {
    sellerId: "SELLER-001",
    sellerCode: "SEL00001",
    sellerName: "우리여행",
    sellerTypeLabel: "사업자판매점",
    contactName: "박영희",
    loginId: "seller001",
    logoUrl: null,
  },
  {
    sellerId: "SELLER-003",
    sellerCode: "SEL00003",
    sellerName: "서울투어파트너",
    sellerTypeLabel: "사업자판매점",
    contactName: "박성진",
    loginId: "seller003",
    logoUrl: null,
  },
];

export function getSellerAdminProfileByLoginId(loginId: string): SellerAdminProfile | null {
  const normalized = loginId.trim().toLowerCase();
  if (!normalized) return null;
  return SELLER_ADMIN_PROFILES.find((profile) => profile.loginId.toLowerCase() === normalized) ?? null;
}

export function getSellerAdminProfileBySellerId(sellerId: string): SellerAdminProfile | null {
  const normalized = sellerId.trim();
  if (!normalized) return null;
  return SELLER_ADMIN_PROFILES.find((profile) => profile.sellerId === normalized) ?? null;
}

export function getSellerAdminProfileFromSession(input: {
  sellerId: string;
  sellerName: string;
  loginId: string;
}): SellerAdminProfile {
  return (
    getSellerAdminProfileBySellerId(input.sellerId) ??
    getSellerAdminProfileByLoginId(input.loginId) ?? {
      sellerId: input.sellerId,
      sellerCode: input.sellerId,
      sellerName: input.sellerName,
      sellerTypeLabel: "판매점",
      contactName: input.sellerName,
      loginId: input.loginId,
      logoUrl: null,
    }
  );
}

export function sellerLogoInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "S";
  return trimmed.charAt(0);
}
