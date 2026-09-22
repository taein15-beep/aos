"use client";

import { useState } from "react";
import { FileSpreadsheet, QrCode } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import { STAFF_MEMBER_MOCK_ROWS, splitStaffEmails } from "@/lib/admin/members-staff-data";

/**
 * 회원관리 > 관리자/직원관리
 * STEP: Route + 기존 ERP Layout 뼈대만 구성 (목록 UI는 후속 단계)
 */
export default function StaffMembersPage() {
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
              <h1>관리자/직원관리</h1>
            </div>
          </section>

          <section className="member-staff-toolbar" aria-label="관리자/직원 검색">
            <button
              type="button"
              className="primary member-staff-register"
              onClick={() => window.location.assign("/members/staff/new")}
            >
              + 신규등록
            </button>
            <div className="member-staff-toolbar-filters">
              <label className="member-staff-page-size">
                <select defaultValue="15" aria-label="페이지 출력수">
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span>줄수</span>
              </label>
              <select defaultValue="한글이름" aria-label="검색조건">
                <option value="한글이름">한글이름</option>
                <option value="ID">ID</option>
                <option value="영문이름">영문이름</option>
                <option value="핸드폰">핸드폰</option>
                <option value="직통번호">직통번호</option>
                <option value="이메일">이메일</option>
                <option value="소속그룹">소속그룹</option>
              </select>
              <input
                type="text"
                className="member-staff-query"
                placeholder="검색어를 입력하세요"
                aria-label="검색어"
              />
              <button type="button" className="primary member-staff-search-btn">
                검색
              </button>
            </div>
          </section>

          <section className="member-staff-list-panel" aria-label="관리자/직원 목록">
            <div className="member-staff-table-wrap">
              <table className="member-staff-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>한글이름</th>
                    <th>직급</th>
                    <th>영문이름</th>
                    <th>핸드폰</th>
                    <th>직통번호</th>
                    <th>이메일</th>
                    <th>소속그룹</th>
                    <th>판매관리</th>
                    <th>권한관리</th>
                  </tr>
                </thead>
                <tbody>
                  {STAFF_MEMBER_MOCK_ROWS.map((row) => (
                    <tr key={row.adminCode}>
                      <td>
                        <button
                          type="button"
                          className="member-staff-code"
                          onClick={() => window.location.assign(`/members/staff/${encodeURIComponent(row.adminCode)}`)}
                        >
                          {row.adminCode}
                        </button>
                      </td>
                      <td>{row.koreanName}</td>
                      <td>{row.position}</td>
                      <td>{row.englishName}</td>
                      <td>{row.mobile}</td>
                      <td>{row.directPhone}</td>
                      <td className="member-staff-email">
                        {splitStaffEmails(row.email).map((line) => (
                          <div key={line} className="member-staff-email-line">
                            {line}
                          </div>
                        ))}
                      </td>
                      <td>{row.groupName}</td>
                      <td>{row.salesManage}</td>
                      <td>
                        <button
                          type="button"
                          className="member-staff-permission-btn"
                          onClick={() =>
                            window.location.assign(`/members/staff/${encodeURIComponent(row.adminCode)}/permissions`)
                          }
                        >
                          권한수정
                        </button>
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
            <button type="button" className="excel-button member-staff-excel">
              <FileSpreadsheet size={14} aria-hidden="true" />
              엑셀 다운로드
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
