"use client";

import { use, useState } from "react";
import { QrCode } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";

/**
 * 회원관리 > 관리자/직원관리 > 상세
 * STEP: Route + 목록 복귀만 (상세 UI는 후속 단계)
 */
export default function StaffMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const adminCode = decodeURIComponent(id);

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

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
                className={`nav-item ${item.label === "회원관리" ? "active" : ""}`}
                onClick={() =>
                  item.label === "대시보드"
                    ? window.location.assign("/")
                    : item.children
                      ? toggleMenu(item.label)
                      : act(`${item.label} 화면으로 이동합니다.`)
                }
              >
                <span className="nav-icon">
                  {item.icon === "qr" ? <QrCode size={16} strokeWidth={1.8} /> : item.icon}
                </span>
                <span className="nav-label">{item.label}</span>
                {item.children ? (
                  <span className={`chevron ${expanded.includes(item.label) ? "open" : ""}`}>⌄</span>
                ) : null}
              </button>
              {item.children && expanded.includes(item.label) && !collapsed ? (
                <div className="subnav">
                  {item.children.map((child) => (
                    <button
                      key={child}
                      type="button"
                      className={child === "관리자/직원" ? "current" : ""}
                      onClick={() => navigateAdminChild(child, act)}
                    >
                      {child}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
        <div className="sidebar-help">
          <span className="nav-icon">?</span>
          <div>
            <strong>업무지원센터</strong>
            <p>평일 09:00–18:00</p>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>회원관리</span>
            <b>/</b>
            <strong>관리자/직원관리</strong>
            <b>/</b>
            <strong>상세</strong>
          </div>
          <div className="top-actions">
            <label className="search">
              <span>⌕</span>
              <input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-btn" title="업무지원" onClick={() => act("업무지원센터를 엽니다.")}>
              ?
            </button>
            <div className="dropdown-wrap">
              <button
                type="button"
                className="icon-btn notice"
                aria-label="알림"
                onClick={() => {
                  setNoticeOpen(!noticeOpen);
                  setProfileOpen(false);
                }}
              >
                ♢<i>5</i>
              </button>
              {noticeOpen ? (
                <div className="dropdown notice-menu">
                  <div className="drop-head">
                    <strong>알림</strong>
                    <button type="button" onClick={() => setNoticeOpen(false)}>
                      모두 읽음
                    </button>
                  </div>
                  <button type="button">
                    <span className="alert-dot info" />
                    <span>
                      관리자/직원 계정 알림이 있습니다.
                      <small>방금 전</small>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
            <div className="divider" />
            <div className="dropdown-wrap">
              <button
                type="button"
                className="profile"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNoticeOpen(false);
                }}
              >
                <span className="avatar">장</span>
                <span>
                  <b>애비아넥스트</b>
                  <small>관리자 장윤호</small>
                </span>
                <em>⌄</em>
              </button>
              {profileOpen ? (
                <div className="dropdown profile-menu">
                  <button type="button">내 정보</button>
                  <button type="button">환경설정</button>
                  <hr />
                  <button type="button" className="logout">
                    로그아웃
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="content member-staff-content">
          <section className="page-head member-staff-page-head">
            <div>
              <h1>관리자/직원 상세</h1>
              <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>ID: {adminCode}</p>
            </div>
            <button type="button" className="secondary" onClick={() => window.location.assign("/members/staff")}>
              목록
            </button>
          </section>
        </main>
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
