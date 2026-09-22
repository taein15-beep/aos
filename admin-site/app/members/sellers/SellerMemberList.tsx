"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, QrCode, RotateCcw, Search } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  EMPTY_SELLER_LIST_FILTERS,
  SELLER_APPROVAL_STATUS_FILTER_OPTIONS,
  SELLER_APPROVAL_STATUS_LABELS,
  SELLER_LIST_PAGE_SIZE,
  SELLER_SALES_STATUS_FILTER_OPTIONS,
  SELLER_SALES_STATUS_LABELS,
  SELLER_TYPE_BADGE_LABELS,
  SELLER_TYPE_FILTER_OPTIONS,
  SELLER_TYPE_LABELS,
  filterSellerApplications,
  formatSellerAppliedDate,
  formatSellerListDisplayName,
  formatSellerListTypeSubtext,
  formatSellerMobilePhone,
  formatSellerPersonName,
  getSellerListTotals,
  loadPrototypeSellerApplications,
  paginateSellerApplications,
  sellerApplicationSourceShortLabel,
  sellerApplicationStatusBadgeClass,
  sellerApprovalStatusLabel,
  sellerSalesSetupStatusBadgeClass,
  sellerSalesSetupStatusLabel,
  resolveSellerSalesStatus,
  sellerSalesStatusBadgeClass,
  sellerSalesStatusLabel,
  sellerTypeBadgeClass,
  type SellerApplication,
  type SellerApprovalStatusCode,
  type SellerListFilters,
} from "@/lib/admin/members-seller-data";

function isMembersChildCurrent(child: string) {
  return child === "판매점관리";
}

export function SellerMemberList() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const [rowsAll, setRowsAll] = useState<SellerApplication[]>([]);
  const [draft, setDraft] = useState<SellerListFilters>(EMPTY_SELLER_LIST_FILTERS);
  const [applied, setApplied] = useState<SellerListFilters>(EMPTY_SELLER_LIST_FILTERS);
  const [dateError, setDateError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setRowsAll(loadPrototypeSellerApplications());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => getSellerListTotals(rowsAll), [rowsAll]);

  const filterResult = useMemo(() => filterSellerApplications(rowsAll, applied), [rowsAll, applied]);

  const filteredRows = useMemo(() => (filterResult.ok ? filterResult.rows : []), [filterResult]);
  const pagination = useMemo(
    () => paginateSellerApplications(filteredRows, page, SELLER_LIST_PAGE_SIZE),
    [filteredRows, page],
  );

  if (page !== pagination.page) {
    setPage(pagination.page);
  }

  const search = () => {
    const from = draft.appliedFrom.trim();
    const to = draft.appliedTo.trim();
    if (from && to && from > to) {
      setDateError("가입 시작일이 종료일보다 늦을 수 없습니다.");
      return;
    }
    setDateError("");
    setApplied({ ...draft });
    setPage(1);
    setSelectedIds([]);
    act("검색 조건을 적용했습니다.");
  };

  const resetFilters = () => {
    setDraft(EMPTY_SELLER_LIST_FILTERS);
    setApplied(EMPTY_SELLER_LIST_FILTERS);
    setDateError("");
    setPage(1);
    setSelectedIds([]);
    act("검색 조건을 초기화했습니다.");
  };

  const applyApprovalQuickFilter = (approvalStatus: SellerListFilters["approvalStatus"]) => {
    const next: SellerListFilters = { ...draft, approvalStatus };
    setDraft(next);
    setApplied(next);
    setDateError("");
    setPage(1);
    setSelectedIds([]);
    act(
      approvalStatus === "전체"
        ? "전체 판매점을 표시합니다."
        : `${SELLER_APPROVAL_STATUS_LABELS[approvalStatus]} 신청만 표시합니다.`,
    );
  };

  const applySellerTypeQuickFilter = (sellerType: SellerListFilters["sellerType"]) => {
    const next: SellerListFilters = { ...draft, sellerType };
    setDraft(next);
    setApplied(next);
    setDateError("");
    setPage(1);
    setSelectedIds([]);
    act(
      sellerType === "전체"
        ? "전체 유형 판매점을 표시합니다."
        : sellerType === "individual"
          ? "개인 판매점만 표시합니다."
          : "법인(사업자) 판매점만 표시합니다.",
    );
  };

  const pageIds = pagination.rows.map((row) => row.applicationId);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const togglePageSelected = (checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) return [...new Set([...current, ...pageIds])];
      return current.filter((id) => !pageIds.includes(id));
    });
  };

  const toggleRowSelected = (applicationId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, applicationId])] : current.filter((id) => id !== applicationId),
    );
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
            <strong>판매점관리</strong>
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
                      판매점 가입신청 샘플을 확인해 주세요.
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
              <p className="member-affiliate-breadcrumb">회원관리 &gt; 판매점관리</p>
              <h1>판매점관리</h1>
              <p>가입된 판매점과 가입 신청 현황을 관리하고 판매 권한 및 수수료 설정 상태를 확인합니다.</p>
              <p className="member-affiliate-totals" aria-live="polite">
                전체 판매점 <b>{ready ? totals.total : "—"}</b>건 · 승인대기{" "}
                <b>{ready ? totals.pending : "—"}</b>건 · 검토중 <b>{ready ? totals.reviewing : "—"}</b>건 ·
                보완요청 <b>{ready ? totals.supplement : "—"}</b>건 · 승인완료{" "}
                <b>{ready ? totals.approved : "—"}</b>건
              </p>
              <div className="member-seller-quick-filters" role="group" aria-label="승인상태 빠른 필터">
                {(
                  [
                    { value: "전체" as const, label: "전체", count: totals.total },
                    { value: "pending" as const, label: "승인대기", count: totals.pending },
                    { value: "reviewing" as const, label: "검토중", count: totals.reviewing },
                    { value: "supplement_requested" as const, label: "보완요청", count: totals.supplement },
                    { value: "approved" as const, label: "승인완료", count: totals.approved },
                    { value: "rejected" as const, label: "승인거절", count: totals.rejected },
                  ] satisfies {
                    value: "전체" | SellerApprovalStatusCode;
                    label: string;
                    count: number;
                  }[]
                ).map((item) => {
                  const active = applied.approvalStatus === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={`member-seller-quick-filter${active ? " is-active" : ""}`}
                      aria-pressed={active}
                      onClick={() => applyApprovalQuickFilter(item.value)}
                    >
                      {item.label}
                      <em>{ready ? item.count : "—"}</em>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <p className="member-affiliate-proto-note" role="note">
            현재 화면은 샘플 데이터로 동작하며 홈페이지 판매점 가입신청, 이메일 및 실제 회원 데이터와 연결되지
            않습니다.
          </p>

          <section className="panel member-affiliate-filter" aria-label="판매점 검색">
            <div className="member-affiliate-filter-grid member-seller-filter-grid">
              <label className="member-affiliate-keyword" htmlFor="seller-keyword">
                <span>통합검색</span>
                <div>
                  <Search size={15} aria-hidden="true" />
                  <input
                    id="seller-keyword"
                    value={draft.keyword}
                    onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))}
                    onKeyDown={(event) => event.key === "Enter" && search()}
                    placeholder="판매점명, 대표자명, 신청자명, 연락처, 이메일 검색"
                  />
                </div>
              </label>

              <label htmlFor="seller-type">
                <span>판매점 유형</span>
                <select
                  id="seller-type"
                  value={draft.sellerType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      sellerType: event.target.value as SellerListFilters["sellerType"],
                    }))
                  }
                >
                  {SELLER_TYPE_FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "전체"
                        ? "전체"
                        : option === "business"
                          ? "사업자 판매점"
                          : "개인 판매점"}
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor="seller-approval-status">
                <span>승인상태</span>
                <select
                  id="seller-approval-status"
                  value={draft.approvalStatus}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      approvalStatus: event.target.value as SellerListFilters["approvalStatus"],
                    }))
                  }
                >
                  {SELLER_APPROVAL_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "전체" ? "전체" : SELLER_APPROVAL_STATUS_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor="seller-sales-status">
                <span>판매상태</span>
                <select
                  id="seller-sales-status"
                  value={draft.salesStatus}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      salesStatus: event.target.value as SellerListFilters["salesStatus"],
                    }))
                  }
                >
                  {SELLER_SALES_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "전체" ? "전체" : SELLER_SALES_STATUS_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="member-affiliate-period" htmlFor="seller-from">
                <span>가입일</span>
                <div>
                  <input
                    id="seller-from"
                    type="date"
                    value={draft.appliedFrom}
                    aria-label="가입 시작일"
                    aria-invalid={Boolean(dateError)}
                    aria-describedby={dateError ? "seller-date-error" : undefined}
                    onChange={(event) => {
                      setDateError("");
                      setDraft((current) => ({ ...current, appliedFrom: event.target.value }));
                    }}
                  />
                  <em>~</em>
                  <input
                    id="seller-to"
                    type="date"
                    value={draft.appliedTo}
                    aria-label="가입 종료일"
                    aria-invalid={Boolean(dateError)}
                    aria-describedby={dateError ? "seller-date-error" : undefined}
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
                조건 초기화
              </button>
              <button type="button" className="primary" onClick={search}>
                <Search size={15} />
                검색
              </button>
            </div>
            {dateError ? (
              <p className="member-affiliate-date-error" id="seller-date-error" role="alert">
                {dateError}
              </p>
            ) : null}
          </section>

          <section className="panel member-affiliate-list-panel">
            <div className="member-affiliate-list-head">
              <div className="member-seller-list-head-left">
                <strong>
                  검색결과 <b aria-live="polite">{ready ? filteredRows.length : "—"}</b>건
                </strong>
                <div className="member-seller-type-quick" role="group" aria-label="판매점 유형 빠른 필터">
                  {(
                    [
                      { value: "전체" as const, label: "전체" },
                      { value: "individual" as const, label: "개인" },
                      { value: "business" as const, label: "법인" },
                    ] as const
                  ).map((item) => {
                    const active = applied.sellerType === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        className={`member-seller-type-quick-btn${active ? " is-active" : ""}`}
                        aria-pressed={active}
                        onClick={() => applySellerTypeQuickFilter(item.value)}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                <span>샘플 데이터 기준</span>
              </div>
              <Link href="/members/sellers/new" className="primary member-seller-register-btn">
                <Plus size={14} aria-hidden="true" />
                판매점등록
              </Link>
            </div>

            {!ready ? (
              <div className="member-affiliate-empty" role="status">
                <strong>판매점 목록을 불러오는 중…</strong>
              </div>
            ) : (
              <>
                <div className="member-affiliate-table-wrap">
                  <table className="member-affiliate-table member-seller-table">
                    <thead>
                      <tr>
                        <th className="member-seller-check">
                          <input
                            type="checkbox"
                            aria-label="현재 페이지 전체 선택"
                            checked={allPageSelected}
                            disabled={pageIds.length === 0}
                            onChange={(event) => togglePageSelected(event.target.checked)}
                          />
                        </th>
                        {[
                          "판매점명",
                          "유형",
                          "대표자 / 신청자",
                          "연락처",
                          "신청경로",
                          "신청일",
                          "승인상태",
                          "판매설정",
                          "판매상태",
                          "관리",
                        ].map((title) => (
                          <th key={title}>{title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.rows.length > 0 ? (
                        pagination.rows.map((row) => {
                          const displayName = formatSellerListDisplayName(row);
                          const typeSubtext = formatSellerListTypeSubtext(row);
                          const personName = formatSellerPersonName(row);
                          const salesStatus = resolveSellerSalesStatus(row);
                          const canConfigureSales = row.applicationStatus === "approved";
                          return (
                            <tr key={row.applicationId}>
                              <td className="member-seller-check">
                                <input
                                  type="checkbox"
                                  aria-label={`${displayName} 선택`}
                                  checked={selectedIds.includes(row.applicationId)}
                                  onChange={(event) =>
                                    toggleRowSelected(row.applicationId, event.target.checked)
                                  }
                                />
                              </td>
                              <td className="member-affiliate-name">
                                <Link
                                  href={`/members/sellers/${row.applicationId}`}
                                  title={displayName}
                                  aria-label={`${displayName} 상세보기`}
                                >
                                  <b>{displayName}</b>
                                </Link>
                              </td>
                              <td className="member-seller-status-cell member-seller-type-cell">
                                <div className="member-seller-type-stack">
                                  <span
                                    className={`badge ${sellerTypeBadgeClass(row.sellerType)}`}
                                    title={SELLER_TYPE_LABELS[row.sellerType]}
                                  >
                                    {SELLER_TYPE_BADGE_LABELS[row.sellerType]}
                                  </span>
                                  {typeSubtext ? (
                                    <small className="member-seller-type-bizno" title={typeSubtext}>
                                      {typeSubtext}
                                    </small>
                                  ) : null}
                                </div>
                              </td>
                              <td className="member-seller-person">{personName}</td>
                              <td className="member-affiliate-contact member-seller-contact">
                                <strong>{formatSellerMobilePhone(row.contactPhone)}</strong>
                                {row.contactEmail.trim() ? (
                                  <small className="member-seller-email" title={row.contactEmail}>
                                    {row.contactEmail}
                                  </small>
                                ) : null}
                              </td>
                              <td className="member-seller-status-cell member-seller-source">
                                <span
                                  className={`badge ${row.applicationSource === "homepage" ? "info" : "gray"}`}
                                  title={sellerApplicationSourceShortLabel(row.applicationSource)}
                                >
                                  {sellerApplicationSourceShortLabel(row.applicationSource)}
                                </span>
                              </td>
                              <td className="date-cell" title="가입 신청일">
                                {formatSellerAppliedDate(row.appliedAt)}
                              </td>
                              <td className="member-seller-status-cell">
                                <span
                                  className={`badge ${sellerApplicationStatusBadgeClass(row.applicationStatus)}`}
                                  title={`승인상태: ${sellerApprovalStatusLabel(row.applicationStatus)}`}
                                >
                                  {sellerApprovalStatusLabel(row.applicationStatus)}
                                </span>
                              </td>
                              <td className="member-seller-status-cell">
                                <span
                                  className={`badge ${sellerSalesSetupStatusBadgeClass(row.salesSetupStatus)}`}
                                  title={`판매설정: ${sellerSalesSetupStatusLabel(row.salesSetupStatus)}`}
                                >
                                  {sellerSalesSetupStatusLabel(row.salesSetupStatus)}
                                </span>
                              </td>
                              <td className="member-seller-status-cell member-seller-sales-status">
                                <span
                                  className={`badge ${sellerSalesStatusBadgeClass(salesStatus)}`}
                                  title={
                                    salesStatus === "active"
                                      ? "현재 실제 판매가 가능한 상태입니다."
                                      : salesStatus === "suspended"
                                        ? "관리자가 판매를 중지한 상태입니다."
                                        : "판매상품·수수료 설정 전 또는 판매 개시 전 상태입니다."
                                  }
                                >
                                  {sellerSalesStatusLabel(salesStatus)}
                                </span>
                              </td>
                              <td className="member-seller-manage">
                                <div className="member-seller-action-group">
                                  <button
                                    type="button"
                                    className="member-detail-button member-seller-setting-btn"
                                    disabled={!canConfigureSales}
                                    title={
                                      canConfigureSales
                                        ? "판매상품·수수료 등 판매설정"
                                        : "승인완료 후 판매설정이 가능합니다."
                                    }
                                    onClick={() =>
                                      window.location.assign(
                                        `/members/sellers/${row.applicationId}?tab=products`,
                                      )
                                    }
                                    aria-label={`${displayName} 판매설정`}
                                  >
                                    판매설정
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={11}>
                            <div className="member-affiliate-empty">
                              {rowsAll.length === 0 ? (
                                <>
                                  <strong>등록된 판매점이 없습니다.</strong>
                                  <p>판매점등록 버튼으로 관리자가 직접 등록할 수 있습니다.</p>
                                  <Link href="/members/sellers/new" className="primary member-seller-register-btn">
                                    <Plus size={14} aria-hidden="true" />
                                    판매점등록
                                  </Link>
                                </>
                              ) : (
                                <>
                                  <strong>검색조건에 맞는 판매점이 없습니다.</strong>
                                  <p>검색어 또는 필터 조건을 변경해 주세요.</p>
                                  <button type="button" className="secondary" onClick={resetFilters}>
                                    <RotateCcw size={13} />
                                    조건 초기화
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

      {toast ? (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
