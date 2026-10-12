"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QrCode, RotateCcw, Search, Store } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  CURRENT_SUPPLIER_NAME,
  SELLER_RELATION_PAGE_SIZE,
  SELLER_RELATION_STATUS_FILTERS,
  countSellerRelations,
  filterSellerRelations,
  formatSellerRelationDate,
  loadSupplierSellerRelations,
  sellerRelationLogoText,
  sellerRelationStatusBadgeClass,
  type SellerRelation,
  type SellerRelationStatus,
  type SellerRelationStatusFilter,
} from "@/lib/admin/members-seller-relation-data";
import { SellerApplicationModal, SellerRelationConfirmModal, SellerRelationDrawer } from "./SellerRelationDialogs";

function isMembersChildCurrent(child: string) {
  return child === "판매점관리";
}

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

type DrawerConfirm = "suspend" | "resume" | null;

const SUMMARY_CARDS: { filter: SellerRelationStatusFilter; label: string; tone: string }[] = [
  { filter: "가입 판매점", label: "전체 판매점", tone: "is-total" },
  { filter: "승인대기", label: "승인대기", tone: "is-pending" },
  { filter: "정상", label: "정상", tone: "is-active-status" },
  { filter: "이용중지", label: "이용중지", tone: "is-suspended" },
];

export function SellerMemberList() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [rowsAll, setRowsAll] = useState<SellerRelation[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<SellerRelationStatusFilter>("가입 판매점");
  const [page, setPage] = useState(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerConfirm, setDrawerConfirm] = useState<DrawerConfirm>(null);

  const act = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const emptySample = new URLSearchParams(window.location.search).get("mock") === "empty";
      setRowsAll(emptySample ? [] : loadSupplierSellerRelations());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => countSellerRelations(rowsAll), [rowsAll]);
  const filteredRows = useMemo(
    () => filterSellerRelations(rowsAll, keyword, statusFilter),
    [rowsAll, keyword, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / SELLER_RELATION_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * SELLER_RELATION_PAGE_SIZE,
    currentPage * SELLER_RELATION_PAGE_SIZE,
  );

  const applicationSeller = rowsAll.find((row) => row.id === applicationId) ?? null;
  const drawerSeller = rowsAll.find((row) => row.id === drawerId) ?? null;

  const changeStatusFilter = (next: SellerRelationStatusFilter) => {
    setStatusFilter(next);
    setPage(1);
  };

  const resetFilters = () => {
    setKeyword("");
    setStatusFilter("가입 판매점");
    setPage(1);
  };

  const updateStatus = (id: string, status: SellerRelationStatus, patch: Partial<SellerRelation> = {}) =>
    setRowsAll((current) => current.map((row) => (row.id === id ? { ...row, ...patch, status } : row)));

  const closeApplication = useCallback(() => {
    setApplicationId(null);
    setRejectConfirmOpen(false);
  }, []);

  const approveApplication = () => {
    if (!applicationSeller) return;
    updateStatus(applicationSeller.id, "정상", { joinedAt: todayIso() });
    closeApplication();
    act("판매점 가입이 승인되었습니다.");
  };

  const rejectApplication = () => {
    if (!applicationSeller) return;
    updateStatus(applicationSeller.id, "승인거절");
    closeApplication();
    act("판매점 가입신청이 거절되었습니다.");
  };

  const closeDrawer = useCallback(() => {
    setDrawerId(null);
    setDrawerConfirm(null);
  }, []);

  const cancelDrawerConfirm = useCallback(() => setDrawerConfirm(null), []);
  const cancelRejectConfirm = useCallback(() => setRejectConfirmOpen(false), []);

  const confirmDrawerAction = () => {
    if (!drawerSeller || !drawerConfirm) return;
    if (drawerConfirm === "suspend") {
      updateStatus(drawerSeller.id, "이용중지");
      act("판매점 이용이 중지되었습니다.");
    } else {
      updateStatus(drawerSeller.id, "정상");
      act("판매점 이용이 재개되었습니다.");
    }
    setDrawerConfirm(null);
  };

  const openRow = (row: SellerRelation) => {
    if (row.status === "승인대기" || row.status === "승인거절") setApplicationId(row.id);
    else setDrawerId(row.id);
  };

  const emptyMessage = () => {
    if (rowsAll.length === 0) {
      return {
        title: "가입된 판매점이 없습니다.",
        description: "판매점이 가입을 신청하면 이곳에서 확인하고 승인할 수 있습니다.",
        reset: false,
      };
    }
    if (keyword.trim()) {
      return {
        title: "검색조건에 맞는 판매점이 없습니다.",
        description: "검색어 또는 상태 필터를 변경해 주세요.",
        reset: true,
      };
    }
    if (statusFilter === "가입 판매점") {
      return {
        title: "가입된 판매점이 없습니다.",
        description: "판매점이 가입을 신청하면 이곳에서 확인하고 승인할 수 있습니다.",
        reset: false,
      };
    }
    if (statusFilter === "승인대기") {
      return { title: "승인 대기 중인 판매점이 없습니다.", description: "", reset: false };
    }
    return { title: `${statusFilter} 상태의 판매점이 없습니다.`, description: "", reset: true };
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
              <h1>판매점 관리</h1>
              <p>우리 여행사에 가입한 판매점과 가입 신청 현황을 관리합니다.</p>
            </div>
          </section>

          <div className="seller-relation-summary" role="group" aria-label="판매점 현황">
            {SUMMARY_CARDS.map((card) => {
              const active = statusFilter === card.filter;
              const value = card.filter === "가입 판매점" ? counts.total : counts[card.filter];
              return (
                <button
                  key={card.filter}
                  type="button"
                  className={`seller-relation-summary-card ${card.tone}${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() => changeStatusFilter(card.filter)}
                >
                  <span>{card.label}</span>
                  <strong>{ready ? value : "—"}</strong>
                </button>
              );
            })}
          </div>

          <p className="member-affiliate-proto-note" role="note">
            {CURRENT_SUPPLIER_NAME}와 판매점 사이의 가입 및 거래 관계를 관리합니다. 판매점이 다른 공급여행사에 가입한
            정보는 표시하지 않으며, 거래상태가 정상인 판매점만 상품공유의 판매점 추가 대상이 됩니다. (샘플 데이터 기준
            공급여행사)
          </p>

          <section className="panel member-affiliate-filter seller-relation-filter" aria-label="판매점 검색">
            <div className="seller-relation-filter-grid">
              <label className="member-affiliate-keyword" htmlFor="seller-relation-keyword">
                <span>검색</span>
                <div>
                  <Search size={15} aria-hidden="true" />
                  <input
                    id="seller-relation-keyword"
                    value={keyword}
                    onChange={(event) => {
                      setKeyword(event.target.value);
                      setPage(1);
                    }}
                    placeholder="판매점명, 판매점코드 또는 담당자 검색"
                  />
                </div>
              </label>
              <label htmlFor="seller-relation-status">
                <span>거래상태</span>
                <select
                  id="seller-relation-status"
                  value={statusFilter}
                  onChange={(event) => changeStatusFilter(event.target.value as SellerRelationStatusFilter)}
                >
                  {SELLER_RELATION_STATUS_FILTERS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="member-affiliate-filter-actions">
              <button type="button" className="secondary" onClick={resetFilters}>
                <RotateCcw size={14} />
                조건 초기화
              </button>
            </div>
          </section>

          <section className="panel member-affiliate-list-panel">
            <div className="member-affiliate-list-head">
              <div className="member-seller-list-head-left">
                <strong>
                  검색결과 <b aria-live="polite">{ready ? filteredRows.length : "—"}</b>건
                </strong>
                <span>
                  {statusFilter === "가입 판매점" ? "승인거절 건은 승인거절 필터에서 확인할 수 있습니다." : "샘플 데이터 기준"}
                </span>
              </div>
            </div>

            {!ready ? (
              <div className="member-affiliate-empty" role="status">
                <strong>판매점 목록을 불러오는 중…</strong>
              </div>
            ) : (
              <>
                <div className="member-affiliate-table-wrap">
                  <table className="member-affiliate-table seller-relation-table">
                    <thead>
                      <tr>
                        {["판매점", "담당자", "연락처", "가입일", "판매상품", "예약", "거래상태", "관리"].map((title) => (
                          <th key={title}>{title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.length > 0 ? (
                        pageRows.map((row) => {
                          const beforeJoin = row.status === "승인대기" || row.status === "승인거절";
                          return (
                            <tr key={row.id}>
                              <td>
                                <div className="seller-relation-name-cell">
                                  <span className="seller-relation-logo" aria-hidden="true">
                                    {sellerRelationLogoText(row.sellerName)}
                                  </span>
                                  <button
                                    type="button"
                                    className="seller-relation-name"
                                    onClick={() => openRow(row)}
                                    aria-label={`${row.sellerName} ${beforeJoin ? "가입신청 확인" : "상세보기"}`}
                                  >
                                    <b>{row.sellerName}</b>
                                    <small>{row.sellerCode}</small>
                                  </button>
                                </div>
                              </td>
                              <td>{row.managerName}</td>
                              <td className="seller-relation-num">{row.phone}</td>
                              <td className="seller-relation-num">
                                {beforeJoin ? (
                                  <span title="가입 신청일">{formatSellerRelationDate(row.appliedAt)}</span>
                                ) : (
                                  formatSellerRelationDate(row.joinedAt)
                                )}
                                {beforeJoin ? <small className="seller-relation-date-sub">신청일</small> : null}
                              </td>
                              <td className="seller-relation-count">{beforeJoin ? "-" : row.productCount}</td>
                              <td className="seller-relation-count">{beforeJoin ? "-" : row.reservationCount}</td>
                              <td>
                                <span className={`badge ${sellerRelationStatusBadgeClass(row.status)}`}>{row.status}</span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={`small-btn seller-relation-action${row.status === "승인대기" ? " is-pending" : ""}`}
                                  onClick={() => openRow(row)}
                                >
                                  {beforeJoin ? "신청확인" : "상세"}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8}>
                            {(() => {
                              const empty = emptyMessage();
                              return (
                                <div className="member-affiliate-empty seller-relation-empty">
                                  {rowsAll.length === 0 ? <Store size={28} aria-hidden="true" /> : null}
                                  <strong>{empty.title}</strong>
                                  {empty.description ? <p>{empty.description}</p> : null}
                                  {empty.reset ? (
                                    <button type="button" className="secondary" onClick={resetFilters}>
                                      <RotateCcw size={13} />
                                      조건 초기화
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredRows.length > 0 ? (
                  <div className="member-affiliate-footer">
                    <span>
                      총 {filteredRows.length}건 중 {pageRows.length}건 표시
                    </span>
                    <div className="pagination" aria-label="페이지네이션">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setPage(Math.max(1, currentPage - 1))}
                        aria-label="이전 페이지"
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, index) => (
                        <button
                          type="button"
                          key={index + 1}
                          className={currentPage === index + 1 ? "active" : ""}
                          aria-current={currentPage === index + 1 ? "page" : undefined}
                          onClick={() => setPage(index + 1)}
                        >
                          {index + 1}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
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

      {applicationSeller ? (
        <SellerApplicationModal
          seller={applicationSeller}
          blocked={rejectConfirmOpen}
          onClose={closeApplication}
          onApprove={approveApplication}
          onReject={() => setRejectConfirmOpen(true)}
        />
      ) : null}

      {applicationSeller && rejectConfirmOpen ? (
        <SellerRelationConfirmModal
          title="가입신청 거절"
          message="판매점 가입신청을 거절하시겠습니까?"
          notice={`${applicationSeller.sellerName}(${applicationSeller.sellerCode})의 거래상태가 승인거절로 변경됩니다.`}
          confirmLabel="가입거절"
          tone="danger"
          onCancel={cancelRejectConfirm}
          onConfirm={rejectApplication}
        />
      ) : null}

      {drawerSeller ? (
        <SellerRelationDrawer
          seller={drawerSeller}
          blocked={drawerConfirm !== null}
          onClose={closeDrawer}
          onSuspend={() => setDrawerConfirm("suspend")}
          onResume={() => setDrawerConfirm("resume")}
          onProductMock={(productName) => act(`${productName} 상품 화면은 샘플 상품이라 연결되지 않습니다.`)}
        />
      ) : null}

      {drawerSeller && drawerConfirm === "suspend" ? (
        <SellerRelationConfirmModal
          title="판매점 이용중지"
          message="이 판매점의 이용을 중지하시겠습니까?"
          notice="이용중지 시 이 공급여행사에서 제공하는 상품의 신규 판매가 제한됩니다."
          confirmLabel="이용중지"
          tone="danger"
          onCancel={cancelDrawerConfirm}
          onConfirm={confirmDrawerAction}
        />
      ) : null}

      {drawerSeller && drawerConfirm === "resume" ? (
        <SellerRelationConfirmModal
          title="판매점 이용 재개"
          message="이 판매점의 이용을 재개하시겠습니까?"
          notice="이용을 재개하면 거래상태가 정상으로 변경되고, 이 공급여행사 상품의 판매가 다시 가능해집니다."
          confirmLabel="이용 재개"
          tone="primary"
          onCancel={cancelDrawerConfirm}
          onConfirm={confirmDrawerAction}
        />
      ) : null}

      {toast ? (
        <div className="toast seller-relation-toast">
          <span>✓</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
