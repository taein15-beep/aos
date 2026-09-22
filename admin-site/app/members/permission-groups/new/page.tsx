"use client";

import { useState } from "react";
import { QrCode, Save, X } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";

/**
 * 회원관리 > 권한그룹 설정 > 신규등록
 * STEP: 그룹 기본정보 UI만 (메뉴별 권한설정·DB/API는 후속)
 */
export default function PermissionGroupNewPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const [groupName, setGroupName] = useState("예약·CS담당");
  const [description, setDescription] = useState("예약관리 및 고객상담 업무 담당자");
  const [useStatus, setUseStatus] = useState("사용");

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const goList = () => window.location.assign("/members/permission-groups");

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
            <b>/</b>
            <strong>신규등록</strong>
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
                      권한그룹 등록 알림이 있습니다.
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

        <main className="content member-web-detail-content member-web-edit-content member-perm-group-form-content">
          <section className="page-head member-web-detail-page-head">
            <div>
              <p className="member-web-breadcrumb">회원관리 &gt; 권한그룹 설정 &gt; 신규등록</p>
              <div className="member-web-detail-title-row">
                <h1>권한그룹 등록</h1>
              </div>
            </div>
            <div className="member-web-detail-actions">
              <button type="button" className="secondary" onClick={goList}>
                목록
              </button>
            </div>
          </section>

          <div className="member-web-edit-stack">
            <section className="panel member-web-detail-card">
              <div className="member-web-detail-card-head">
                <strong>기본정보</strong>
              </div>
              <div className="member-web-edit-form-body">
                <div className="member-web-edit-form-grid member-web-edit-form-grid--3">
                  <label className="member-web-edit-field">
                    <span>
                      그룹명 <b className="member-seller-form-required">*</b>
                    </span>
                    <input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="그룹명"
                    />
                  </label>
                  <label className="member-web-edit-field member-web-edit-field--span-2">
                    <span>그룹설명</span>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="그룹 설명을 입력하세요"
                    />
                  </label>
                  <label className="member-web-edit-field">
                    <span>사용여부</span>
                    <select value={useStatus} onChange={(e) => setUseStatus(e.target.value)}>
                      <option value="사용">사용</option>
                      <option value="미사용">미사용</option>
                    </select>
                  </label>
                </div>
              </div>
            </section>

            <div className="member-web-edit-footer">
              <button type="button" className="secondary" onClick={goList}>
                <X size={14} />
                취소
              </button>
              <button type="button" className="primary" onClick={() => act("저장 기능은 다음 단계에서 제공됩니다.")}>
                <Save size={14} />
                저장
              </button>
            </div>
          </div>
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
