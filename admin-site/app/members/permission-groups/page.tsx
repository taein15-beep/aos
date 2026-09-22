"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import { PERMISSION_GROUP_MOCK_ROWS } from "@/lib/admin/members-permission-groups-data";

/**
 * 회원관리 > 권한그룹 설정
 * STEP: Route + 목록 UI (권한설정/수정 동작은 후속)
 */
export default function PermissionGroupsPage() {
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
                      className={child === "권한그룹 설정" ? "current" : ""}
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
            <strong>권한그룹 설정</strong>
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
                      권한그룹 설정 알림이 있습니다.
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

        <main className="content member-staff-content member-perm-group-content">
          <section className="page-head member-staff-page-head">
            <div>
              <h1>권한그룹 설정</h1>
            </div>
          </section>

          <section className="member-staff-toolbar member-perm-group-toolbar" aria-label="권한그룹 등록">
            <button
              type="button"
              className="primary member-staff-register"
              onClick={() => window.location.assign("/members/permission-groups/new")}
            >
              + 그룹등록
            </button>
          </section>

          <section className="member-staff-list-panel" aria-label="권한그룹 목록">
            <div className="member-staff-table-wrap">
              <table className="member-staff-table member-perm-group-table">
                <thead>
                  <tr>
                    <th>그룹명</th>
                    <th>설명</th>
                    <th>소속인원</th>
                    <th>권한수</th>
                    <th>사용여부</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_GROUP_MOCK_ROWS.map((row) => (
                    <tr key={row.id}>
                      <td>{row.groupName}</td>
                      <td className="member-perm-group-desc">{row.description}</td>
                      <td>{row.memberCount}</td>
                      <td>{row.permissionCount}</td>
                      <td>{row.useStatus}</td>
                      <td>
                        <div className="member-perm-group-actions">
                          <button
                            type="button"
                            className="member-staff-permission-btn"
                            onClick={() =>
                              window.location.assign(`/members/permission-groups/${encodeURIComponent(row.id)}/permissions`)
                            }
                          >
                            권한설정
                          </button>
                          <button type="button" className="member-staff-permission-btn">
                            수정
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="member-staff-footer" aria-label="목록 하단">
            <div className="member-staff-pagination" role="navigation" aria-label="페이지">
              <button type="button" className="is-active" aria-current="page">
                1
              </button>
            </div>
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
