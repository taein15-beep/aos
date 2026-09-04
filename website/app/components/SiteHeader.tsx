"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

const PARTNERSHIP_LINKS = [
  { href: "/partnership", label: "제휴여행사 안내", match: (path: string) => path === "/partnership" },
  {
    href: "/partnership/apply",
    label: "제휴여행사 가입신청",
    match: (path: string) => path.startsWith("/partnership/apply"),
  },
  {
    href: "/partnership/application-status",
    label: "신청상태 확인",
    match: (path: string) => path.startsWith("/partnership/application-status"),
  },
] as const;

type SiteHeaderProps = {
  variant: "home" | "partnership";
};

export function SiteHeader({ variant }: SiteHeaderProps) {
  const pathname = usePathname() || "/";
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const partnerWrapRef = useRef<HTMLDivElement | null>(null);
  const partnerButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();
  const mobileId = useId();

  const partnershipActive = pathname.startsWith("/partnership");

  useEffect(() => {
    setPartnerOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!partnerOpen && !mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPartnerOpen(false);
        setMobileOpen(false);
        partnerButtonRef.current?.focus();
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if (!partnerWrapRef.current?.contains(event.target as Node)) {
        setPartnerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [partnerOpen, mobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const brandHref = variant === "home" ? "#home" : "/";
  const cta =
    variant === "home" ? (
      <a className="nav-cta" href="#contact">
        도입 문의 <span>↗</span>
      </a>
    ) : (
      <Link className="nav-cta" href="/partnership/apply">
        가입신청 <span>↗</span>
      </Link>
    );

  const partnershipMenu = (
    <div className={`nav-dropdown ${partnerOpen ? "is-open" : ""}`} ref={partnerWrapRef}>
      <button
        ref={partnerButtonRef}
        type="button"
        className={`nav-dropdown-trigger ${partnershipActive ? "is-active" : ""}`}
        aria-expanded={partnerOpen}
        aria-controls={menuId}
        aria-haspopup="true"
        onClick={() => setPartnerOpen((value) => !value)}
      >
        제휴안내
        <span aria-hidden="true">{partnerOpen ? "▴" : "▾"}</span>
      </button>
      <ul id={menuId} className="nav-submenu" hidden={!partnerOpen} role="menu" aria-label="제휴안내">
        {PARTNERSHIP_LINKS.map((item) => {
          const current = item.match(pathname);
          return (
            <li key={item.href} role="none">
              <Link
                role="menuitem"
                href={item.href}
                aria-current={current ? "page" : undefined}
                onClick={() => setPartnerOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const desktopLinks =
    variant === "home" ? (
      <>
        <a href="#platform">플랫폼</a>
        <a href="#air">항공 예약</a>
        <a href="#technology">기술</a>
        {partnershipMenu}
        <a href="#contact">문의</a>
      </>
    ) : (
      <>
        <Link href="/">홈</Link>
        <Link href="/#platform">플랫폼</Link>
        {partnershipMenu}
        <Link href="/#contact">문의</Link>
      </>
    );

  const mobileLinks =
    variant === "home" ? (
      <>
        <a href="#platform" onClick={() => setMobileOpen(false)}>
          플랫폼
        </a>
        <a href="#air" onClick={() => setMobileOpen(false)}>
          항공 예약
        </a>
        <a href="#technology" onClick={() => setMobileOpen(false)}>
          기술
        </a>
        <p className="nav-mobile-group-label">제휴안내</p>
        {PARTNERSHIP_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.match(pathname) ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <a href="#contact" onClick={() => setMobileOpen(false)}>
          문의
        </a>
      </>
    ) : (
      <>
        <Link href="/" onClick={() => setMobileOpen(false)}>
          홈
        </Link>
        <Link href="/#platform" onClick={() => setMobileOpen(false)}>
          플랫폼
        </Link>
        <p className="nav-mobile-group-label">제휴안내</p>
        {PARTNERSHIP_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.match(pathname) ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <Link href="/#contact" onClick={() => setMobileOpen(false)}>
          문의
        </Link>
      </>
    );

  const inner = (
    <>
      <a className="brand" href={brandHref} aria-label="AOS 홈">
        <span className="brand-mark">aos</span>
        <span className="brand-caption">All-in-One Travel System</span>
      </a>

      <div className="nav-links">{desktopLinks}</div>

      <div className="nav-trailing">
        {cta}
        <button
          type="button"
          className="nav-mobile-toggle"
          aria-expanded={mobileOpen}
          aria-controls={mobileId}
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setMobileOpen((value) => !value)}
        >
          <span aria-hidden="true">{mobileOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      <div id={mobileId} className={`nav-mobile-panel ${mobileOpen ? "is-open" : ""}`} hidden={!mobileOpen}>
        <nav className="nav-mobile-links" aria-label="모바일 메뉴">
          {mobileLinks}
          {variant === "home" ? (
            <a className="button primary" href="#contact" onClick={() => setMobileOpen(false)}>
              도입 문의
            </a>
          ) : (
            <Link className="button primary" href="/partnership/apply" onClick={() => setMobileOpen(false)}>
              가입신청
            </Link>
          )}
        </nav>
      </div>
    </>
  );

  if (variant === "home") {
    return (
      <nav className="nav shell site-nav" aria-label="주요 메뉴">
        {inner}
      </nav>
    );
  }

  return (
    <header className="partnership-header site-nav">
      <div className="shell partnership-header-inner" role="navigation" aria-label="주요 메뉴">
        {inner}
      </div>
    </header>
  );
}

export function SiteFooter({ variant }: { variant: "home" | "partnership" }) {
  const topHref = variant === "home" ? "#home" : "/";

  return (
    <footer>
      <div className="shell footer-main">
        <div className="brand footer-brand">
          <span className="brand-mark">aos</span>
          <span className="brand-caption">All-in-One Travel System</span>
        </div>
        <p>여행의 모든 흐름을 하나로 연결하는 통합여행플랫폼</p>
        <div className="footer-links">
          <Link href="/partnership">제휴여행사 안내</Link>
          <Link href="/partnership/apply">가입신청</Link>
          <Link href="/partnership/application-status">신청상태 확인</Link>
          <a href={topHref}>
            맨 위로 <span>↑</span>
          </a>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 AOS. All rights reserved.</span>
        <span>TAEINWIZ · AVIANEXT</span>
      </div>
    </footer>
  );
}
