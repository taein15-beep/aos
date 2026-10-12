/**
 * 판매점 관리자(Seller Admin) 전용 네비게이션
 * - 여행사 ERP `lib/admin/navigation.ts`와 분리
 * - href가 있는 항목만 라우트 연결, 나머지는 후속 STEP에서 구현
 */

export type SellerMenuItem = {
  label: string;
  icon: string;
  href?: string;
  /** 후속 단계에서 구현 예정 */
  planned?: boolean;
  /** href 없는 예정 메뉴 클릭 시 안내 문구 */
  plannedMessage?: string;
};

/** 판매점 관리자 URL prefix */
export const SELLER_ADMIN_BASE_PATH = "/seller";

export const SELLER_MENU: SellerMenuItem[] = [
  { label: "대시보드", icon: "⌂", href: `${SELLER_ADMIN_BASE_PATH}/dashboard` },
  { label: "공급여행사", icon: "◎", href: `${SELLER_ADMIN_BASE_PATH}/suppliers` },
  { label: "판매상품", icon: "▦", href: `${SELLER_ADMIN_BASE_PATH}/products` },
  { label: "예약관리", icon: "▤", href: `${SELLER_ADMIN_BASE_PATH}/reservations` },
  { label: "인보이스", icon: "₩", href: `${SELLER_ADMIN_BASE_PATH}/invoices` },
  { label: "정산관리", icon: "⇄", href: `${SELLER_ADMIN_BASE_PATH}/settlements` },
];

/** 메뉴 하위 화면 — Breadcrumb `상위 메뉴 / 하위 화면` 표시용 */
export const SELLER_SUB_PAGES: { href: string; label: string }[] = [
  { href: `${SELLER_ADMIN_BASE_PATH}/suppliers/add`, label: "공급여행사 추가" },
];

/** 향후 로그인 라우트 (STEP 2+에서 구현) */
export const SELLER_LOGIN_PATH = `${SELLER_ADMIN_BASE_PATH}/login`;

/** 판매점 가입 진입 화면 (website 앱 `/seller/apply`) */
export const SELLER_JOIN_URL = `${(process.env.NEXT_PUBLIC_WEBSITE_URL ?? "http://localhost:3001").replace(/\/$/, "")}/seller/apply`;

export function isSellerAdminPath(pathname: string): boolean {
  return pathname === SELLER_ADMIN_BASE_PATH || pathname.startsWith(`${SELLER_ADMIN_BASE_PATH}/`);
}

export function sellerMenuIsActive(pathname: string, href: string): boolean {
  if (href === `${SELLER_ADMIN_BASE_PATH}/dashboard`) {
    return pathname === href || pathname === SELLER_ADMIN_BASE_PATH;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
