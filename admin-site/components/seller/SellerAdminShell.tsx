"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SellerLogo } from "@/components/seller/SellerLogo";
import { clearSellerSessionCookieValue, isSellerLoginPath, type SellerSession } from "@/lib/seller/auth";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import { SELLER_LOGIN_PATH, SELLER_MENU, SELLER_SUB_PAGES, sellerMenuIsActive } from "@/lib/seller/navigation";
import { useSellerSession } from "@/lib/seller/use-seller-session";

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
  const session = useSellerSession() ?? DEFAULT_SESSION;
  const [profileOpenPath, setProfileOpenPath] = useState<string | null>(null);
  const profileOpen = profileOpenPath === pathname;
  const setProfileOpen = (open: boolean) => setProfileOpenPath(open ? pathname : null);
  const profileRef = useRef<HTMLDivElement>(null);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const activeMenu = SELLER_MENU.find(
    (item) => item.href && sellerMenuIsActive(pathname, item.href),
  );
  const pageTitle = activeMenu?.label ?? "판매점 관리";
  const subPage = SELLER_SUB_PAGES.find((item) => item.href === pathname);

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpenPath(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpenPath(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

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
        <div className="brand seller-brand">
          <div className="brand-mark" aria-hidden="true">A</div>
          <div className="brand-copy">
            <strong>AOS</strong>
            <span className="seller-brand-tag">판매점 관리자</span>
          </div>
          <button
            type="button"
            className="collapse"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
            aria-expanded={!collapsed}
          >
            ‹
          </button>
        </div>

        <div className="seller-sidebar-brand" title={`${session.sellerName} · ${session.sellerCode}`}>
          <SellerLogo sellerName={session.sellerName} logoUrl={session.logoUrl} size="sidebar" />
          {!collapsed ? (
            <div className="seller-sidebar-brand-copy">
              <small>로그인 판매점</small>
              <strong>{session.sellerName}</strong>
              <span>{session.sellerCode}</span>
            </div>
          ) : null}
        </div>

        <nav aria-label="판매점 관리자 메뉴">
          {SELLER_MENU.map((item) => {
            const active = item.href ? sellerMenuIsActive(pathname, item.href) : false;

            return (
              <div className="nav-group" key={item.label}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`nav-item ${active ? "active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="nav-item"
                    aria-label={item.label}
                    title={item.label}
                    onClick={() => act(item.plannedMessage ?? `${item.label} 메뉴는 다음 단계에서 제공됩니다.`)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar seller-topbar">
          <div className="breadcrumb">
            <span>판매점 관리자</span>
            <b>/</b>
            {subPage && activeMenu?.href ? (
              <>
                <span>
                  <Link href={activeMenu.href} className="seller-breadcrumb-link">
                    {pageTitle}
                  </Link>
                </span>
                <b>/</b>
                <strong>{subPage.label}</strong>
              </>
            ) : (
              <strong>{pageTitle}</strong>
            )}
          </div>

          <div className="top-actions seller-top-actions">
            <button
              type="button"
              className="icon-btn notice"
              aria-label="알림"
              onClick={() => act("알림 기능은 다음 단계에서 제공됩니다.")}
            >
              ♢
            </button>
            <div className="divider" />
            <div className="dropdown-wrap" ref={profileRef}>
              <button
                type="button"
                className="profile seller-profile"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <SellerLogo sellerName={session.sellerName} logoUrl={session.logoUrl} size="header" />
                <span>
                  <b>{session.sellerCode}</b>
                  <small>{session.sellerName}</small>
                </span>
                <em aria-hidden="true">⌄</em>
              </button>
              {profileOpen ? (
                <div className="dropdown profile-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      act("판매점 정보는 다음 단계에서 제공됩니다.");
                    }}
                  >
                    판매점 정보
                  </button>
                  <hr />
                  <button type="button" role="menuitem" className="logout" onClick={logout}>
                    로그아웃
                  </button>
                </div>
              ) : null}
            </div>
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
