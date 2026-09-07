"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QrCode, RotateCcw, Search } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  AFFILIATE_APPLICATION_STATUS_OPTIONS,
  AFFILIATE_LIST_PAGE_SIZE,
  AFFILIATE_PARTNERSHIP_STATUS_OPTIONS,
  EMPTY_AFFILIATE_LIST_FILTERS,
  affiliateApplicationStatusBadgeClass,
  affiliatePartnershipStatusBadgeClass,
  filterAffiliateApplications,
  formatAffiliateAppliedDate,
  formatAffiliateShareGroupsLabel,
  getAffiliateListTotals,
  loadPrototypeAffiliateApplications,
  maskAffiliateBusinessNumber,
  maskAffiliateMobilePhone,
  paginateAffiliateApplications,
  resetPrototypeAffiliateApplications,
  type AffiliateApplication,
  type AffiliateListFilters,
} from "@/lib/admin/members-affiliate-data";

function isMembersChildCurrent(child: string) {
  return child === "제휴여행사";
}

export function AffiliateMemberList() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const [rowsAll, setRowsAll] = useState<AffiliateApplication[]>([]);
  const [draft, setDraft] = useState<AffiliateListFilters>(EMPTY_AFFILIATE_LIST_FILTERS);
  const [applied, setApplied] = useState<AffiliateListFilters>(EMPTY_AFFILIATE_LIST_FILTERS);
  const [dateError, setDateError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const reloadRows = () => {
    setRowsAll(loadPrototypeAffiliateApplications());
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setRowsAll(loadPrototypeAffiliateApplications());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => getAffiliateListTotals(rowsAll), [rowsAll]);

  const filterResult = useMemo(
    () => filterAffiliateApplications(rowsAll, applied),
    [rowsAll, applied],
  );

  const filteredRows = useMemo(
    () => (filterResult.ok ? filterResult.rows : []),
    [filterResult],
  );
  const pagination = useMemo(
    () => paginateAffiliateApplications(filteredRows, page, AFFILIATE_LIST_PAGE_SIZE),
    [filteredRows, page],
  );

  if (page !== pagination.page) {
    setPage(pagination.page);
  }

  const search = () => {
    const from = draft.appliedFrom.trim();
    const to = draft.appliedTo.trim();
    if (from && to && from > to) {
      setDateError("신청 시작일이 종료일보다 늦을 수 없습니다.");
      return;
    }
    setDateError("");
    setApplied({ ...draft });
    setPage(1);
    act("검색 조건을 적용했습니다.");
  };

  const resetFilters = () => {
    setDraft(EMPTY_AFFILIATE_LIST_FILTERS);
    setApplied(EMPTY_AFFILIATE_LIST_FILTERS);
    setDateError("");
    setPage(1);
    act("검색 조건을 초기화했습니다.");
  };

  const confirmResetSample = () => {
    resetPrototypeAffiliateApplications();
    reloadRows();
    setDraft(EMPTY_AFFILIATE_LIST_FILTERS);
    setApplied(EMPTY_AFFILIATE_LIST_FILTERS);
    setDateError("");
    setPage(1);
    setResetOpen(false);
    act("제휴여행사 샘플 데이터를 초기화했습니다.");
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
                      className={isMembersChildCurrent(child) ? "current" : ""}
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
            <strong>제휴여행사</strong>
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
                      제휴여행사 가입신청 샘플을 확인해 주세요.
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

        <main className="content member-affiliate-content">
          <section className="page-head member-affiliate-page-head">
            <div>
              <p className="member-affiliate-breadcrumb">회원관리 &gt; 제휴여행사</p>
              <h1>제휴여행사 관리</h1>
              <p>제휴여행사 가입신청을 검토하고 승인된 여행사의 제휴관계와 상품공유그룹 소속을 확인합니다.</p>
              <p className="member-affiliate-totals" aria-live="polite">
                전체 <b>{ready ? totals.total : "—"}</b>건 · 승인대기 <b>{ready ? totals.pending : "—"}</b>
                건 · 보완요청 <b>{ready ? totals.supplement : "—"}</b>건
              </p>
            </div>
          </section>

          <p className="member-affiliate-proto-note" role="note">
            현재 화면은 샘플 데이터로 동작하며 홈페이지 가입신청, 이메일 및 실제 회원 데이터와 연결되지 않습니다.
          </p>

          <section className="panel member-affiliate-filter" aria-label="제휴여행사 검색">
            <div className="member-affiliate-filter-grid">
              <label className="member-affiliate-keyword" htmlFor="affiliate-keyword">
                <span>통합검색</span>
                <div>
                  <Search size={15} aria-hidden="true" />
                  <input
                    id="affiliate-keyword"
                    value={draft.keyword}
                    onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))}
                    onKeyDown={(event) => event.key === "Enter" && search()}
                    placeholder="여행사명, 접수번호, 제휴코드, 사업자번호, 담당자명"
                  />
                </div>
              </label>

              <label htmlFor="affiliate-app-status">
                <span>가입신청 상태</span>
                <select
                  id="affiliate-app-status"
                  value={draft.applicationStatus}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      applicationStatus: event.target.value as AffiliateListFilters["applicationStatus"],
                    }))
                  }
                >
                  {AFFILIATE_APPLICATION_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor="affiliate-partnership-status">
                <span>제휴관계 상태</span>
                <select
                  id="affiliate-partnership-status"
                  value={draft.partnershipStatus}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      partnershipStatus: event.target.value as AffiliateListFilters["partnershipStatus"],
                    }))
                  }
                >
                  {AFFILIATE_PARTNERSHIP_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="member-affiliate-period" htmlFor="affiliate-from">
                <span>신청기간</span>
                <div>
                  <input
                    id="affiliate-from"
                    type="date"
                    value={draft.appliedFrom}
                    aria-invalid={Boolean(dateError)}
                    aria-describedby={dateError ? "affiliate-date-error" : undefined}
                    onChange={(event) => {
                      setDateError("");
                      setDraft((current) => ({ ...current, appliedFrom: event.target.value }));
                    }}
                  />
                  <em>~</em>
                  <input
                    id="affiliate-to"
                    type="date"
                    value={draft.appliedTo}
                    aria-invalid={Boolean(dateError)}
                    aria-describedby={dateError ? "affiliate-date-error" : undefined}
                    onChange={(event) => {
                      setDateError("");
                      setDraft((current) => ({ ...current, appliedTo: event.target.value }));
                    }}
                  />
                </div>
              </label>
            </div>
            <div className="member-affiliate-filter-actions">
              <button type="button" className="secondary" onClick={resetFilters}>
                <RotateCcw size={14} />
                초기화
              </button>
              <button type="button" className="primary" onClick={search}>
                <Search size={15} />
                검색
              </button>
            </div>
            {dateError ? (
              <p className="member-affiliate-date-error" id="affiliate-date-error" role="alert">
                {dateError}
              </p>
            ) : null}
          </section>

          <section className="panel member-affiliate-list-panel">
            <div className="member-affiliate-list-head">
              <div>
                <strong>
                  검색결과 <b aria-live="polite">{ready ? filteredRows.length : "—"}</b>건
                </strong>
                <span>샘플 데이터 기준</span>
              </div>
              <button type="button" className="member-affiliate-reset-sample" onClick={() => setResetOpen(true)}>
                샘플 초기화
              </button>
            </div>

            {!ready ? (
              <div className="member-affiliate-empty" role="status">
                <strong>제휴여행사 목록을 불러오는 중…</strong>
              </div>
            ) : (
              <>
                <div className="member-affiliate-table-wrap">
                  <table className="member-affiliate-table">
                    <thead>
                      <tr>
                        {[
                          "접수번호 / 제휴코드",
                          "여행사명",
                          "사업자등록번호",
                          "담당자",
                          "가입신청 상태",
                          "제휴관계 상태",
                          "상품공유그룹",
                          "신청일",
                          "관리",
                        ].map((title) => (
                          <th key={title}>{title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.rows.length > 0 ? (
                        pagination.rows.map((row) => {
                          const approved = Boolean(row.affiliateAgencyId);
                          return (
                            <tr key={row.applicationId}>
                              <td className="member-affiliate-id-cell">
                                {approved ? (
                                  <>
                                    <strong>{row.affiliateAgencyId}</strong>
                                    <small>{row.applicationNumber}</small>
                                  </>
                                ) : (
                                  <strong>{row.applicationNumber}</strong>
                                )}
                              </td>
                              <td className="member-affiliate-name">
                                <Link
                                  href={`/members/affiliates/${row.applicationId}`}
                                  title={row.agencyName}
                                  aria-label={`${row.agencyName} 상세보기`}
                                >
                                  <b>{row.agencyName}</b>
                                </Link>
                              </td>
                              <td className="member-affiliate-biz">
                                {maskAffiliateBusinessNumber(row.businessNumber)}
                              </td>
                              <td className="member-affiliate-contact">
                                <strong>{row.contactName}</strong>
                                <small>{maskAffiliateMobilePhone(row.contactPhone)}</small>
                              </td>
                              <td>
                                <span
                                  className={`badge ${affiliateApplicationStatusBadgeClass(row.applicationStatus)}`}
                                >
                                  {row.applicationStatus}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`badge ${affiliatePartnershipStatusBadgeClass(row.partnershipStatus)}`}
                                >
                                  {row.partnershipStatus}
                                </span>
                              </td>
                              <td className="member-affiliate-groups" title={row.shareGroups.join(", ") || "미지정"}>
                                {formatAffiliateShareGroupsLabel(row.shareGroups)}
                              </td>
                              <td className="date-cell">{formatAffiliateAppliedDate(row.appliedAt)}</td>
                              <td>
                                <Link
                                  href={`/members/affiliates/${row.applicationId}`}
                                  className="member-detail-button"
                                  aria-label={`${row.agencyName} 상세보기`}
                                >
                                  상세보기
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9}>
                            <div className="member-affiliate-empty">
                              {rowsAll.length === 0 ? (
                                <>
                                  <strong>등록된 제휴여행사 가입신청이 없습니다.</strong>
                                  <p>샘플 초기화로 기본 데이터를 다시 불러올 수 있습니다.</p>
                                </>
                              ) : (
                                <>
                                  <strong>검색조건에 맞는 제휴여행사가 없습니다.</strong>
                                  <p>검색어 또는 필터 조건을 변경해 주세요.</p>
                                  <button type="button" className="secondary" onClick={resetFilters}>
                                    <RotateCcw size={13} />
                                    검색조건 초기화
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredRows.length > 0 ? (
                  <div className="member-affiliate-footer">
                    <span>
                      총 {filteredRows.length}건 중 {pagination.rows.length}건 표시
                    </span>
                    <div className="pagination" aria-label="페이지네이션">
                      <button
                        type="button"
                        disabled={pagination.page === 1}
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                        aria-label="이전 페이지"
                      >
                        ‹
                      </button>
                      {Array.from({ length: pagination.totalPages }, (_, index) => (
                        <button
                          type="button"
                          key={index + 1}
                          className={pagination.page === index + 1 ? "active" : ""}
                          aria-current={pagination.page === index + 1 ? "page" : undefined}
                          onClick={() => setPage(index + 1)}
                        >
                          {index + 1}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={pagination.page === pagination.totalPages}
                        onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))}
                        aria-label="다음 페이지"
                      >
                        ›
                      </button>
                    </div>
                    <div />
                  </div>
                ) : null}
              </>
            )}
          </section>

          <footer>© 2026 AOS Travel ERP · AviaNext</footer>
        </main>
      </div>

      {resetOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setResetOpen(false)}>
          <div
            className="modal member-affiliate-reset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="affiliate-reset-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="affiliate-reset-title">샘플 데이터 초기화</h3>
              <button type="button" onClick={() => setResetOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <p>
              제휴여행사 프로토타입 저장 데이터만 초기화합니다. 승인·보완요청·거절·처리 이력·신규 AFF
              코드를 시드 상태로 되돌리며, 홈페이지·상품공유 storage는 변경하지 않습니다.
            </p>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setResetOpen(false)}>
                취소
              </button>
              <button type="button" className="primary" onClick={confirmResetSample}>
                샘플 초기화
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
