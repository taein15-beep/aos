"use client";

import { useEffect, useMemo, useState } from "react";
import { QrCode, RotateCcw, Search } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  EMPTY_SELLER_LIST_FILTERS,
  SELLER_APPROVAL_STATUS_FILTER_OPTIONS,
  SELLER_LIST_PAGE_SIZE,
  SELLER_SALES_STATUS_FILTER_OPTIONS,
  SELLER_TYPE_BADGE_LABELS,
  SELLER_TYPE_FILTER_OPTIONS,
  SELLER_TYPE_LABELS,
  filterSellerApplications,
  formatSellerAppliedDate,
  formatSellerCommissionText,
  formatSellerListDisplayName,
  formatSellerListNameSubtext,
  formatSellerMobilePhone,
  formatSellerPersonName,
  formatSellerProductCount,
  getSellerListTotals,
  loadPrototypeSellerApplications,
  paginateSellerApplications,
  resetPrototypeSellerApplications,
  sellerApplicationStatusBadgeClass,
  sellerCommissionBadgeClass,
  sellerProductCountBadgeClass,
  resolveSellerSalesStatus,
  sellerSalesStatusBadgeClass,
  sellerTypeBadgeClass,
  type SellerApplication,
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
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const reloadRows = () => {
    setRowsAll(loadPrototypeSellerApplications());
  };

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

  const confirmResetSample = () => {
    resetPrototypeSellerApplications();
    reloadRows();
    setDraft(EMPTY_SELLER_LIST_FILTERS);
    setApplied(EMPTY_SELLER_LIST_FILTERS);
    setDateError("");
    setPage(1);
    setSelectedIds([]);
    setResetOpen(false);
    act("판매점 샘플 데이터를 초기화했습니다.");
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
                전체 <b>{ready ? totals.total : "—"}</b>건 · 승인대기 <b>{ready ? totals.pending : "—"}</b>
                건 · 승인완료 <b>{ready ? totals.approved : "—"}</b>건 · 승인거절{" "}
                <b>{ready ? totals.rejected : "—"}</b>건
              </p>
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
                      {option}
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
                      {option}
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
                          "판매상품",
                          "수수료",
                          "승인상태",
                          "판매상태",
                          "가입일",
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
                          const nameSubtext = formatSellerListNameSubtext(row);
                          const personName = formatSellerPersonName(row);
                          const productLabel = formatSellerProductCount(row.productCount);
                          const productBadgeClass = sellerProductCountBadgeClass(row.productCount);
                          const commissionLabel = formatSellerCommissionText(row.commissionText);
                          const commissionBadgeClass = sellerCommissionBadgeClass(row.commissionText);
                          const salesStatus = resolveSellerSalesStatus(row);
                          const canConfigureSales = row.applicationStatus === "승인완료";
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
                                <b title={displayName}>{displayName}</b>
                                {nameSubtext ? <small>{nameSubtext}</small> : null}
                              </td>
                              <td className="member-seller-status-cell">
                                <span
                                  className={`badge ${sellerTypeBadgeClass(row.sellerType)}`}
                                  title={SELLER_TYPE_LABELS[row.sellerType]}
                                >
                                  {SELLER_TYPE_BADGE_LABELS[row.sellerType]}
                                </span>
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
                              <td className="member-seller-status-cell member-seller-products">
                                <span
                                  className={`badge ${productBadgeClass}`}
                                  title={
                                    row.productCount === null || row.productCount === undefined
                                      ? "판매 허용 상품이 설정되지 않았습니다."
                                      : row.productCount === 0
                                        ? "판매 허용 상품이 0개입니다."
                                        : `판매 허용 상품 ${productLabel}`
                                  }
                                >
                                  {productLabel}
                                </span>
                              </td>
                              <td className="member-seller-status-cell member-seller-commission">
                                <span
                                  className={`badge ${commissionBadgeClass}`}
                                  title={
                                    commissionLabel === "미설정"
                                      ? "기본 판매수수료가 설정되지 않았습니다."
                                      : commissionLabel === "개별설정"
                                        ? "상품별 수수료가 서로 다릅니다."
                                        : `기본 판매수수료 ${commissionLabel}`
                                  }
                                >
                                  {commissionLabel}
                                </span>
                              </td>
                              <td className="member-seller-status-cell">
                                <span
                                  className={`badge ${sellerApplicationStatusBadgeClass(row.applicationStatus)}`}
                                  title={`승인상태: ${row.applicationStatus}`}
                                >
                                  {row.applicationStatus}
                                </span>
                              </td>
                              <td className="member-seller-status-cell member-seller-sales-status">
                                {salesStatus ? (
                                  <span
                                    className={`badge ${sellerSalesStatusBadgeClass(salesStatus)}`}
                                    title={
                                      salesStatus === "판매가능"
                                        ? "현재 실제 판매가 가능한 상태입니다."
                                        : "관리자가 판매를 중지한 상태입니다."
                                    }
                                  >
                                    {salesStatus}
                                  </span>
                                ) : (
                                  <span
                                    className="badge gray"
                                    title="승인대기·승인거절에서는 판매상태를 적용하지 않습니다."
                                  >
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="date-cell" title="가입 신청일">
                                {formatSellerAppliedDate(row.appliedAt)}
                              </td>
                              <td className="member-seller-manage">
                                <div className="member-seller-action-group">
                                  <button
                                    type="button"
                                    className="member-detail-button"
                                    onClick={() =>
                                      act("판매점 상세 화면은 아직 연결되지 않았습니다.")
                                    }
                                    aria-label={`${displayName} 상세보기`}
                                  >
                                    상세보기
                                  </button>
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
                                      act("판매설정 화면은 아직 연결되지 않았습니다.")
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
                                  <strong>등록된 판매점 가입신청이 없습니다.</strong>
                                  <p>샘플 초기화로 기본 데이터를 다시 불러올 수 있습니다.</p>
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

      {resetOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setResetOpen(false)}>
          <div
            className="modal member-affiliate-reset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-reset-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="seller-reset-title">샘플 데이터 초기화</h3>
              <button type="button" onClick={() => setResetOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <p>
              판매점 프로토타입 저장 데이터만 초기화합니다. 삭제·필터 상태를 시드 상태로 되돌리며,
              홈페이지·제휴여행사·상품공유 storage는 변경하지 않습니다.
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
