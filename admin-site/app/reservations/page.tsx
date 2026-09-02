"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QrCode, RotateCcw, Search } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  PAYMENT_STATUS_FILTER_OPTIONS,
  RESERVE_STATUS_FILTER_OPTIONS,
  formatReservationPeople,
  getReservationKpis,
  getReservationList,
  type ReservationListItem,
} from "@/lib/admin/reservations-data";

type SearchFilters = {
  keyword: string;
  code: string;
  bookerName: string;
  productName: string;
  reserveStatus: (typeof RESERVE_STATUS_FILTER_OPTIONS)[number];
  paymentStatus: (typeof PAYMENT_STATUS_FILTER_OPTIONS)[number];
  reservedFrom: string;
  reservedTo: string;
  departureFrom: string;
  departureTo: string;
};

const EMPTY_FILTERS: SearchFilters = {
  keyword: "",
  code: "",
  bookerName: "",
  productName: "",
  reserveStatus: "전체",
  paymentStatus: "전체",
  reservedFrom: "",
  reservedTo: "",
  departureFrom: "",
  departureTo: "",
};

function matchesKeyword(reservation: ReservationListItem, keyword: string) {
  if (!keyword) return true;
  const value = keyword.toLowerCase();
  return [reservation.code, reservation.bookerName, reservation.productName, reservation.phone]
    .join(" ")
    .toLowerCase()
    .includes(value);
}

function matchesDateRange(date: string, from: string, to: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export default function ReservationsPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["예약관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [draft, setDraft] = useState<SearchFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<SearchFilters>(EMPTY_FILTERS);

  const pageSize = 8;
  const allReservations = useMemo(() => getReservationList(), []);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const filtered = useMemo(() => {
    return allReservations.filter((reservation) => {
      if (!matchesKeyword(reservation, applied.keyword)) return false;
      if (applied.code && !reservation.code.toLowerCase().includes(applied.code.toLowerCase())) return false;
      if (applied.bookerName && !reservation.bookerName.includes(applied.bookerName)) return false;
      if (applied.productName && !reservation.productName.includes(applied.productName)) return false;
      if (applied.reserveStatus !== "전체" && reservation.reserveStatus !== applied.reserveStatus) return false;
      if (applied.paymentStatus !== "전체" && reservation.paymentStatus !== applied.paymentStatus) return false;
      if (!matchesDateRange(reservation.reservedAt, applied.reservedFrom, applied.reservedTo)) return false;
      if (!matchesDateRange(reservation.departureAt, applied.departureFrom, applied.departureTo)) return false;
      return true;
    });
  }, [allReservations, applied]);

  const kpis = useMemo(() => getReservationKpis(allReservations), [allReservations]);
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
                className={`nav-item ${item.label === "예약관리" ? "active" : ""}`}
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
                      className={child === "예약접수현황" ? "current" : ""}
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
            <span>예약관리</span>
            <b>/</b>
            <strong>예약목록</strong>
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
                  <button>예약 확정 요청 2건</button>
                  <button>결제 대기 1건</button>
                </div>
              )}
            </div>
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

        <main className="content member-web-content reservation-list-content">
          <section className="page-head member-web-page-head">
            <div>
              <p className="member-web-breadcrumb">예약관리 &gt; 예약목록</p>
              <h1>예약목록</h1>
              <p>전체 예약 현황을 조회하고 예약 상세로 이동할 수 있습니다.</p>
            </div>
          </section>

          <section className="reservation-kpi-grid">
            {[
              ["전체 예약", kpis.total, "total"],
              ["예약확정", kpis.confirmed, "confirmed"],
              ["결제대기", kpis.paymentPending, "payment"],
              ["취소", kpis.cancelled, "cancelled"],
              ["오늘 출발", kpis.departingToday, "today"],
            ].map(([label, value, tone]) => (
              <article key={label as string} className={`member-web-detail-kpi reservation-kpi reservation-kpi--${tone}`}>
                <span>
                  <small>{label as string}</small>
                  <strong>{value as number}건</strong>
                </span>
              </article>
            ))}
          </section>

          <section className="panel member-web-filter reservation-filter">
            <div className="reservation-filter-grid">
              <label className="member-web-keyword">
                <span>통합검색</span>
                <div>
                  <Search size={15} />
                  <input
                    value={draft.keyword}
                    onChange={(event) => setDraft((value) => ({ ...value, keyword: event.target.value }))}
                    onKeyDown={(event) => event.key === "Enter" && search()}
                    placeholder="예약번호, 예약자명, 상품명 검색"
                  />
                </div>
              </label>
              <label>
                <span>예약번호</span>
                <input
                  value={draft.code}
                  onChange={(event) => setDraft((value) => ({ ...value, code: event.target.value }))}
                  onKeyDown={(event) => event.key === "Enter" && search()}
                  placeholder="예약번호 입력"
                />
              </label>
              <label>
                <span>예약자명</span>
                <input
                  value={draft.bookerName}
                  onChange={(event) => setDraft((value) => ({ ...value, bookerName: event.target.value }))}
                  onKeyDown={(event) => event.key === "Enter" && search()}
                  placeholder="예약자명 입력"
                />
              </label>
              <label>
                <span>상품명</span>
                <input
                  value={draft.productName}
                  onChange={(event) => setDraft((value) => ({ ...value, productName: event.target.value }))}
                  onKeyDown={(event) => event.key === "Enter" && search()}
                  placeholder="상품명 입력"
                />
              </label>
              <label>
                <span>예약상태</span>
                <select
                  value={draft.reserveStatus}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      reserveStatus: event.target.value as SearchFilters["reserveStatus"],
                    }))
                  }
                >
                  {RESERVE_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>결제상태</span>
                <select
                  value={draft.paymentStatus}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      paymentStatus: event.target.value as SearchFilters["paymentStatus"],
                    }))
                  }
                >
                  {PAYMENT_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="member-web-period">
                <span>예약일</span>
                <div>
                  <input
                    type="date"
                    value={draft.reservedFrom}
                    onChange={(event) => setDraft((value) => ({ ...value, reservedFrom: event.target.value }))}
                  />
                  <em>~</em>
                  <input
                    type="date"
                    value={draft.reservedTo}
                    onChange={(event) => setDraft((value) => ({ ...value, reservedTo: event.target.value }))}
                  />
                </div>
              </label>
              <label className="member-web-period">
                <span>출발일</span>
                <div>
                  <input
                    type="date"
                    value={draft.departureFrom}
                    onChange={(event) => setDraft((value) => ({ ...value, departureFrom: event.target.value }))}
                  />
                  <em>~</em>
                  <input
                    type="date"
                    value={draft.departureTo}
                    onChange={(event) => setDraft((value) => ({ ...value, departureTo: event.target.value }))}
                  />
                </div>
              </label>
            </div>
            <div className="member-web-filter-actions">
              <button type="button" className="secondary" onClick={reset}>
                <RotateCcw size={14} />
                초기화
              </button>
              <button type="button" className="primary" onClick={search}>
                <Search size={15} />
                검색
              </button>
            </div>
          </section>

          <section className="panel member-web-list-panel">
            <div className="member-web-list-head">
              <div>
                <strong>
                  예약목록 <b>{filtered.length}</b>건
                </strong>
                <span>샘플 데이터 기준</span>
              </div>
            </div>
            <div className="member-web-table-wrap">
              <table className="member-web-table reservation-list-table">
                <thead>
                  <tr>
                    {[
                      "예약번호",
                      "예약일",
                      "예약자",
                      "상품명",
                      "출발일",
                      "인원",
                      "예약금액",
                      "결제상태",
                      "예약상태",
                      "관리",
                    ].map((title) => (
                      <th key={title}>{title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((reservation) => (
                      <tr key={reservation.code}>
                        <td className="member-number">
                          <Link href={`/reservations/${reservation.code}`} className="reservation-code-link">
                            {reservation.code}
                          </Link>
                        </td>
                        <td className="date-cell">{reservation.reservedAt}</td>
                        <td className="member-name">
                          {reservation.memberId ? (
                            <Link href={`/members/web/${reservation.memberId}`}>
                              <b>{reservation.bookerName}</b>
                            </Link>
                          ) : (
                            <b>{reservation.bookerName}</b>
                          )}
                        </td>
                        <td className="text-left">{reservation.productName}</td>
                        <td className="date-cell">{reservation.departureAt}</td>
                        <td>{formatReservationPeople(reservation)}</td>
                        <td className="amount-cell">{reservation.totalAmount}</td>
                        <td>
                          <span className={`badge ${reservation.paymentStatusClass}`}>{reservation.paymentStatus}</span>
                        </td>
                        <td>
                          <span className={`badge ${reservation.reserveStatusClass}`}>{reservation.reserveStatus}</span>
                        </td>
                        <td>
                          <Link href={`/reservations/${reservation.code}`} className="member-detail-button">
                            상세보기
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10}>
                        <div className="member-web-empty">
                          <strong>검색 조건에 맞는 예약이 없습니다.</strong>
                          <p>조건을 변경하거나 초기화한 뒤 다시 검색해 주세요.</p>
                          <button type="button" className="secondary" onClick={reset}>
                            <RotateCcw size={13} />
                            초기화
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
                총 {filtered.length}건 중 {rows.length}건 표시
              </span>
              <div className="pagination">
                <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index + 1}
                    type="button"
                    className={page === index + 1 ? "active" : ""}
                    onClick={() => setPage(index + 1)}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                >
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
