"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SellerLogo } from "@/components/seller/SellerLogo";
import {
  clearSellerSessionCookieValue,
  isSellerLoginPath,
  readSellerSessionFromDocument,
  type SellerSession,
} from "@/lib/seller/auth";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import { SELLER_LOGIN_PATH, SELLER_MENU, sellerMenuIsActive } from "@/lib/seller/navigation";

type SellerAdminShellProps = {
  children: ReactNode;
};

const DEFAULT_SESSION: SellerSession = {
  sellerId: SELLER_ADMIN_DEMO_PROFILE.sellerId,
  sellerCode: SELLER_ADMIN_DEMO_PROFILE.sellerCode,
  sellerName: SELLER_ADMIN_DEMO_PROFILE.sellerName,
  sellerTypeLabel: SELLER_ADMIN_DEMO_PROFILE.sellerTypeLabel,
  contactName: SELLER_ADMIN_DEMO_PROFILE.contactName,
  loginId: SELLER_ADMIN_DEMO_PROFILE.loginId,
  logoUrl: SELLER_ADMIN_DEMO_PROFILE.logoUrl,
};

export function SellerAdminShell({ children }: SellerAdminShellProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState("");
  const [session, setSession] = useState<SellerSession>(DEFAULT_SESSION);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const activeMenu = SELLER_MENU.find(
    (item) => item.href && sellerMenuIsActive(pathname, item.href),
  );
  const pageTitle = activeMenu?.label ?? "판매점 관리";

  useEffect(() => {
    const current = readSellerSessionFromDocument();
    if (current) setSession(current);
  }, [pathname]);

  const logout = () => {
    document.cookie = clearSellerSessionCookieValue();
    router.replace(SELLER_LOGIN_PATH);
    router.refresh();
  };

  if (isSellerLoginPath(pathname)) {
    return <div className="seller-auth-shell">{children}</div>;
  }

  return (
    <div className={`app-shell seller-admin-shell ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="sidebar seller-sidebar" aria-label="판매점 관리자 메뉴">
        <div className="seller-sidebar-brand">
          <SellerLogo sellerName={session.sellerName} logoUrl={session.logoUrl} size="sidebar" />
          {!collapsed ? (
            <div className="seller-sidebar-brand-copy">
              <strong>{session.sellerName}</strong>
              <span>판매점 관리자</span>
            </div>
          ) : null}
          <button
            type="button"
            className="collapse"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="사이드바 접기"
          >
            ‹
          </button>
        </div>

        <nav aria-label="판매점 관리자 메뉴">
          {SELLER_MENU.map((item) => {
            const active = item.href ? sellerMenuIsActive(pathname, item.href) : false;
            if (!item.href) return null;

            return (
              <div className="nav-group" key={item.label}>
                <Link
                  href={item.href}
                  className={`nav-item ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar seller-topbar">
          <div className="breadcrumb">
            <span>판매점</span>
            <b>/</b>
            <strong>{pageTitle}</strong>
          </div>

          <div className="top-actions seller-top-actions">
            <span className="seller-top-contact">
              <small>담당자</small>
              <strong>{session.contactName}</strong>
            </span>
            <div className="divider" />
            <button type="button" className="secondary seller-top-btn" onClick={() => act("내 정보는 다음 단계에서 제공됩니다.")}>
              내 정보
            </button>
            <button type="button" className="secondary seller-top-btn seller-top-btn--logout" onClick={logout}>
              로그아웃
            </button>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>

      {toast ? (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
