import { NextRequest, NextResponse } from "next/server";
import { SELLER_ADMIN_BASE_PATH, SELLER_LOGIN_PATH } from "@/lib/seller/navigation";

const STAMP_TOUR_API_ORIGIN =
  "https://aos-travel-erp-dashboard.taein16.chatgpt.site";
const SELLER_SESSION_COOKIE = "aos_seller_admin_session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === SELLER_ADMIN_BASE_PATH || pathname.startsWith(`${SELLER_ADMIN_BASE_PATH}/`)) {
    const hasSellerSession = Boolean(request.cookies.get(SELLER_SESSION_COOKIE)?.value);
    const isLoginPage = pathname === SELLER_LOGIN_PATH;

    if (hasSellerSession && isLoginPage) {
      return NextResponse.redirect(new URL(`${SELLER_ADMIN_BASE_PATH}/dashboard`, request.url));
    }

    if (!hasSellerSession && !isLoginPage) {
      const loginUrl = new URL(SELLER_LOGIN_PATH, request.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (!process.env.VERCEL) return NextResponse.next();

  const target = new URL(
    `${pathname}${search}`,
    STAMP_TOUR_API_ORIGIN,
  );
  return NextResponse.rewrite(target);
}

export const config = {
  matcher: ["/api/tour/:path*", "/seller/:path*", "/seller"],
};
