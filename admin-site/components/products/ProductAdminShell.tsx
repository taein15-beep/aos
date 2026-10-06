"use client";

import { useState, type ReactNode } from "react";
import { QrCode } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";

export type ProductToastAction = { label: string; onClick: () => void };

type ProductAdminShellProps = {
  /** 활성화할 상위 메뉴 (기본: 상품관리) */
  activeMenu?: string;
  currentChild: string;
  breadcrumb: ReactNode;
  toast?: string;
  toastAction?: ProductToastAction | null;
  onNotify: (message: string) => void;
  children: ReactNode;
  overlays?: ReactNode;
};

export function ProductAdminShell({
  activeMenu = "상품관리",
  currentChild,
  breadcrumb,
  toast,
  toastAction,
  onNotify,
  children,
  overlays,
}: ProductAdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([activeMenu]);

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div className="brand-copy">
            <strong>AOS</strong>
            <span>TRAVEL ERP</span>
          </div>
          <button className="collapse" onClick={() => setCollapsed(!collapsed)} aria-label="사이드바 접기">
            ‹
          </button>
        </div>
        <nav aria-label="관리자 메뉴">
          {ADMIN_MENU.map((item) => (
            <div className="nav-group" key={item.label}>
              <button
                className={`nav-item ${item.label === activeMenu ? "active" : ""}`}
                onClick={() =>
                  item.label === "대시보드"
                    ? window.location.assign("/")
                    : item.children
                      ? toggleMenu(item.label)
                      : onNotify(`${item.label} 화면으로 이동합니다.`)
                }
              >
                <span className="nav-icon">
                  {item.icon === "qr" ? <QrCode size={16} strokeWidth={1.8} /> : item.icon}
                </span>
                <span className="nav-label">{item.label}</span>
                {item.children && <span className={`chevron ${expanded.includes(item.label) ? "open" : ""}`}>⌄</span>}
              </button>
              {item.children && expanded.includes(item.label) && !collapsed && (
                <div className="subnav">
                  {item.children.map((child) => (
                    <button
                      className={child === currentChild ? "current" : ""}
                      key={child}
                      onClick={() => navigateAdminChild(child, onNotify)}
                    >
                      {child}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">{breadcrumb}</div>
        </header>
        {children}
      </div>

      {overlays}

      {toast && (
        <div className="toast product-affiliate-toast" role="status">
          <span>✓</span>
          {toast}
          {toastAction && (
            <button type="button" className="product-toast-action" onClick={toastAction.onClick}>
              {toastAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
