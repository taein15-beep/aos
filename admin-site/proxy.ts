import { NextRequest, NextResponse } from "next/server";

const STAMP_TOUR_API_ORIGIN =
  "https://aos-travel-erp-dashboard.taein16.chatgpt.site";

export function proxy(request: NextRequest) {
  if (!process.env.VERCEL) return NextResponse.next();

  const target = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    STAMP_TOUR_API_ORIGIN,
  );
  return NextResponse.rewrite(target);
}

export const config = {
  matcher: ["/api/tour/:path*"],
};
