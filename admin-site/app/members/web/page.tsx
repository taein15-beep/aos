"use client";

import { useMemo, useState } from "react";
import { QrCode, RotateCcw, Search } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  JOIN_PATH_OPTIONS,
  MEMBER_STATUS_OPTIONS,
  WEB_MEMBERS,
  memberStatusBadgeClass,
  type JoinPath,
  type MemberStatus,
} from "@/lib/admin/members-web-data";

type SearchFilters = {
  keyword: string;
  name: string;
  loginId: string;
  phone: string;
  email: string;
  status: (typeof MEMBER_STATUS_OPTIONS)[number];
  joinPath: (typeof JOIN_PATH_OPTIONS)[number];
  joinedFrom: string;
  joinedTo: string;
};

const EMPTY_FILTERS: SearchFilters = {
  keyword: "",
  name: "",
  loginId: "",
  phone: "",
  email: "",
  status: "전체",
  joinPath: "전체",
  joinedFrom: "",
  joinedTo: "",
};

function matchesKeyword(member: (typeof WEB_MEMBERS)[number], keyword: string) {
  if (!keyword) return true;
  const value = keyword.toLowerCase();
  return [member.id, member.name, member.loginId, member.phone, member.email, member.agency]
    .join(" ")
    .toLowerCase()
    .includes(value);
}

function matchesDateRange(date: string, from: string, to: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export default function WebMembersPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [draft, setDraft] = useState<SearchFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<SearchFilters>(EMPTY_FILTERS);

  const pageSize = 8;

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const filtered = useMemo(() => {
    return WEB_MEMBERS.filter((member) => {
      if (!matchesKeyword(member, applied.keyword)) return false;
      if (applied.name && !member.name.includes(applied.name)) return false;
      if (applied.loginId && !member.loginId.toLowerCase().includes(applied.loginId.toLowerCase())) return false;
      if (applied.phone && !member.phone.replaceAll("-", "").includes(applied.phone.replaceAll("-", ""))) return false;
      if (applied.email && !member.email.toLowerCase().includes(applied.email.toLowerCase())) return false;
      if (applied.status !== "전체" && member.status !== (applied.status as MemberStatus)) return false;
      if (applied.joinPath !== "전체" && member.joinPath !== (applied.joinPath as JoinPath)) return false;
      if (!matchesDateRange(member.joinedAt, applied.joinedFrom, applied.joinedTo)) return false;
      return true;
    });
  }, [applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const search = () => {
    setApplied({ ...draft });
    setPage(1);
    act("검색 조건을 적용했습니다.");
  };

  const reset = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
    act("검색 조건을 초기화했습니다.");
  };

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
                {item.children && <span className={`chevron ${expanded.includes(item.label) ? "open" : ""}`}>⌄</span>}
              </button>
              {item.children && expanded.includes(item.label) && !collapsed && (
                <div className="subnav">
                  {item.children.map((child) => (
                    <button
                      key={child}
                      className={child === "웹회원관리" ? "current" : ""}
                      data-planned-path={
                        item.label === "스탬프투어 관리"
                          ? `/stamp-tours/${({ "관광지 관리": "attractions", "참여자·진행현황": "participants", "인증 이력": "verifications", "완주·경품 관리": "rewards", 통계: "statistics" } as Record<string, string>)[child] || ""}`
                          : undefined
                      }
                      onClick={() => navigateAdminChild(child, act)}
                    >
                      {child}
                    </button>
                  ))}
                </div>
              )}
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
            <strong>웹회원관리</strong>
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
                className="icon-btn notice"
                aria-label="알림"
                onClick={() => {
                  setNoticeOpen(!noticeOpen);
                  setProfileOpen(false);
                }}
              >
                ♢<i>5</i>
              </button>
              {noticeOpen && (
                <div className="dropdown notice-menu">
                  <div className="drop-head">
                    <strong>알림</strong>
                    <button onClick={() => setNoticeOpen(false)}>모두 읽음</button>
                  </div>
                  <button>
                    <span className="alert-dot info" />
                    <span>
                      웹회원 가입 알림이 있습니다.
                      <small>방금 전</small>
                    </span>
                  </button>
                  <button className="drop-footer">알림 전체보기</button>
                </div>
              )}
            </div>
            <div className="divider" />
            <div className="dropdown-wrap">
              <button
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
              {profileOpen && (
                <div className="dropdown profile-menu">
                  <button>내 정보</button>
                  <button>환경설정</button>
                  <hr />
                  <button className="logout">로그아웃</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content member-web-content">
          <section className="page-head member-web-page-head">
            <div>
              <p className="member-web-breadcrumb">회원관리 &gt; 웹회원관리</p>
              <h1>웹회원관리</h1>
              <p>홈페이지 가입 회원, 예약 고객, 추천 판매점 연결 고객을 관리합니다.</p>
            </div>
          </section>

          <section className="panel member-web-filter" aria-label="웹회원 검색">
            <div className="member-web-filter-grid">
              <label className="member-web-keyword">
                <span>통합검색</span>
                <div>
                  <Search size={15} />
                  <input
                    value={draft.keyword}
                    onChange={(event) => setDraft((value) => ({ ...value, keyword: event.target.value }))}
                    onKeyDown={(event) => event.key === "Enter" && search()}
                    placeholder="회원번호, 이름, 아이디, 연락처 검색"
                  />
                </div>
              </label>
              <label>
                <span>이름</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))}
                  onKeyDown={(event) => event.key === "Enter" && search()}
                  placeholder="이름 입력"
                />
              </label>
              <label>
                <span>아이디</span>
                <input
                  value={draft.loginId}
                  onChange={(event) => setDraft((value) => ({ ...value, loginId: event.target.value }))}
                  onKeyDown={(event) => event.key === "Enter" && search()}
                  placeholder="아이디 입력"
                />
              </label>
              <label>
                <span>휴대전화</span>
                <input
                  value={draft.phone}
                  onChange={(event) => setDraft((value) => ({ ...value, phone: event.target.value }))}
                  onKeyDown={(event) => event.key === "Enter" && search()}
                  placeholder="숫자만 입력"
                />
              </label>
              <label>
                <span>이메일</span>
                <input
                  value={draft.email}
                  onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))}
                  onKeyDown={(event) => event.key === "Enter" && search()}
                  placeholder="이메일 입력"
                />
              </label>
              <label>
                <span>회원상태</span>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      status: event.target.value as SearchFilters["status"],
                    }))
                  }
                >
                  {MEMBER_STATUS_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>가입경로</span>
                <select
                  value={draft.joinPath}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      joinPath: event.target.value as SearchFilters["joinPath"],
                    }))
                  }
                >
                  {JOIN_PATH_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="member-web-period">
                <span>가입기간</span>
                <div>
                  <input
                    type="date"
                    value={draft.joinedFrom}
                    onChange={(event) => setDraft((value) => ({ ...value, joinedFrom: event.target.value }))}
                  />
                  <em>~</em>
                  <input
                    type="date"
                    value={draft.joinedTo}
                    onChange={(event) => setDraft((value) => ({ ...value, joinedTo: event.target.value }))}
                  />
                </div>
              </label>
            </div>
            <div className="member-web-filter-actions">
              <button className="secondary" onClick={reset}>
                <RotateCcw size={14} />
                조건초기화
              </button>
              <button className="primary" onClick={search}>
                <Search size={15} />
                검색
              </button>
            </div>
          </section>

          <section className="panel member-web-list-panel">
            <div className="member-web-list-head">
              <div>
                <strong>
                  회원목록 <b>{filtered.length}</b>명
                </strong>
                <span>샘플 데이터 기준</span>
              </div>
            </div>
            <div className="member-web-table-wrap">
              <table className="member-web-table">
                <thead>
                  <tr>
                    {[
                      "회원번호",
                      "이름",
                      "아이디",
                      "휴대전화",
                      "이메일",
                      "회원상태",
                      "가입경로",
                      "추천판매점",
                      "가입일",
                      "최근접속일",
                      "관리",
                    ].map((title) => (
                      <th key={title}>{title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((member) => (
                      <tr key={member.id}>
                        <td className="member-number">{member.id}</td>
                        <td className="member-name">
                          <b>{member.name}</b>
                        </td>
                        <td>{member.loginId}</td>
                        <td className="member-phone">{member.phone}</td>
                        <td className="member-email">{member.email}</td>
                        <td>
                          <span className={`badge ${memberStatusBadgeClass(member.status)}`}>{member.status}</span>
                        </td>
                        <td className="member-path">{member.joinPath}</td>
                        <td>{member.agency}</td>
                        <td className="date-cell">{member.joinedAt}</td>
                        <td className="date-cell">{member.lastAccessAt}</td>
                        <td>
                          <button
                            className="member-detail-button"
                            onClick={() => act(`${member.name} 회원 상세 화면은 다음 단계에서 제공될 예정입니다.`)}
                          >
                            상세보기
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11}>
                        <div className="member-web-empty">
                          <strong>검색 조건에 맞는 웹회원이 없습니다.</strong>
                          <p>조건을 변경하거나 초기화한 뒤 다시 검색해 주세요.</p>
                          <button className="secondary" onClick={reset}>
                            <RotateCcw size={13} />
                            조건초기화
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="member-web-footer">
              <span>
                총 {filtered.length}명 중 {rows.length}명 표시
              </span>
              <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index + 1}
                    className={page === index + 1 ? "active" : ""}
                    onClick={() => setPage(index + 1)}
                  >
                    {index + 1}
                  </button>
                ))}
                <button disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                  ›
                </button>
              </div>
              <div />
            </div>
          </section>

          <footer>© 2026 AOS Travel ERP · AviaNext</footer>
        </main>
      </div>

      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
