"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode, RotateCcw, Search, X } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  PAYMENT_STATUS_FILTER_OPTIONS,
  RESERVE_STATUS_FILTER_OPTIONS,
  getReservationKpis,
  getReservationList,
  type ReservationDetail,
  type ReservationListItem,
} from "@/lib/admin/reservations-data";
import {
  RESERVATION_SOURCE_LABELS,
  getReservationSourceType,
  isReservationVisibleTo,
  withReservationViewer,
} from "@/lib/admin/reservation-permission";
import {
  ReservationViewerSwitch,
  useReservationViewer,
} from "@/components/reservations/ReservationSource";
import {
  SettlementMethodSelectModal,
  type SettlementMethod,
} from "@/components/reservations/SettlementMethodSelectModal";
import { resolveReservationProductCode } from "@/lib/admin/reservation-settlement-draft";
import { useQueryParam } from "@/components/settlements/SettlementParts";
import { GuideOperationPhaseBadge } from "@/components/guide/GuideOperationPhaseBadge";
import {
  GUIDE_ASSIGNMENT_STATUS_BADGE,
  formatGuideDepartureDate,
  getGuideOperationPath,
} from "@/lib/admin/guide-operation-data";
import {
  getOperationAssignmentPath,
  getOperationDepartureOverviews,
  getReservationOperationViews,
  type OperationDepartureOverview,
} from "@/lib/admin/operation-assignment-data";

const OPERATION_PANEL_LIMIT = 3;

const SOURCE_FILTER_OPTIONS = ["전체", "direct", "affiliate", "seller"] as const;
type SourceFilter = (typeof SOURCE_FILTER_OPTIONS)[number];

type SearchFilters = {
  source: SourceFilter;
  sellingAgency: string;
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
  source: "전체",
  sellingAgency: "전체",
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
  return [
    reservation.code,
    reservation.bookerName,
    reservation.productName,
    reservation.phone,
    reservation.source?.sellingAgencyName ?? "",
    reservation.source?.sellerName ?? "",
    reservation.source?.supplierAgencyName ?? "",
    reservation.source?.originalProductCode ?? "",
    reservation.source?.sharedProductCode ?? "",
    reservation.source?.salesProductName ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(value);
}

function formatPeopleStack(reservation: ReservationDetail) {
  const total = reservation.counts.adult + reservation.counts.child + reservation.counts.infant;
  const parts = [
    reservation.counts.adult ? `대인 ${reservation.counts.adult}` : "",
    reservation.counts.child ? `소인 ${reservation.counts.child}` : "",
    reservation.counts.infant ? `유아 ${reservation.counts.infant}` : "",
  ].filter(Boolean);
  return { totalLabel: `총 ${total}명`, detail: parts.join(" · ") || "-" };
}

function salesChannelLabel(reservation: ReservationDetail) {
  const source = reservation.source;
  if (!source || source.type === "direct") {
    return { channel: "자사판매", seller: reservation.agency || "-" };
  }
  if (source.type === "seller") {
    return {
      channel: "판매점",
      seller: source.sellerName || source.sellingAgencyName || "-",
    };
  }
  return {
    channel: "제휴판매",
    seller: source.sellingAgencyName || "-",
  };
}

function memoPreview(reservation: ReservationDetail) {
  return reservation.adminMemo?.trim() || reservation.requestNote?.trim() || "-";
}

function OperationSummaryPanel({
  departures,
  hiddenCount,
  onShowReservations,
}: {
  departures: OperationDepartureOverview[];
  hiddenCount: number;
  onShowReservations: (departure: OperationDepartureOverview) => void;
}) {
  if (!departures.length) return null;
  return (
    <section className="panel reservation-ops-panel" aria-label="출발회차 운영현황">
      <div className="reservation-ops-panel-head">
        <strong>다가오는 출발회차 운영현황</strong>
        <span>
          운영배정은 상품 + 출발일 단위로 처리합니다. (SAMPLE)
          {hiddenCount > 0 ? ` · 외 ${hiddenCount}개 출발회차는 예약의 운영배정 상태를 눌러 이동` : ""}
        </span>
      </div>
      {departures.map((departure) => {
        const { summary } = departure;
        return (
          <div className="reservation-ops-row" key={departure.key}>
            <div className="reservation-ops-title">
              <GuideOperationPhaseBadge departure={departure.departure} />
              {!departure.handedOver && (
                <span className={`badge ${GUIDE_ASSIGNMENT_STATUS_BADGE[summary.status]}`}>{summary.status}</span>
              )}
              <b>{departure.productName}</b>
              <small>출발 {formatGuideDepartureDate(departure.departureDate)}</small>
            </div>
            <dl className="reservation-ops-stats">
              <div>
                <dt>예약인원</dt>
                <dd>{summary.total}명</dd>
              </div>
              <div>
                <dt>배정완료</dt>
                <dd>{summary.assigned}명</dd>
              </div>
              <div className={summary.unassigned > 0 ? "is-warn" : ""}>
                <dt>미배정</dt>
                <dd>{summary.unassigned}명</dd>
              </div>
              <div>
                <dt>운영차량</dt>
                <dd>{summary.vehicleCount}대</dd>
              </div>
              <div>
                <dt>담당가이드</dt>
                <dd>{summary.guideCount}명</dd>
              </div>
            </dl>
            <div className="reservation-ops-actions">
              <button type="button" className="secondary" onClick={() => onShowReservations(departure)}>
                예약보기
              </button>
              {departure.handedOver && (
                <Link href={getGuideOperationPath(departure.key)} className="secondary">
                  가이드 운영
                </Link>
              )}
              <Link href={getOperationAssignmentPath(departure.key)} className="primary">
                운영배정
              </Link>
            </div>
          </div>
        );
      })}
    </section>
  );
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
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [settlementTarget, setSettlementTarget] = useState<ReservationListItem | null>(null);
  const [settlementMethod, setSettlementMethod] = useState<SettlementMethod>("individual");

  const pageSize = 8;
  const router = useRouter();
  const [viewer, changeViewer] = useReservationViewer();
  const [linkedKeyword, setLinkedKeyword] = useQueryParam("keyword", "");
  const [linkedDeparture, setLinkedDeparture] = useQueryParam("departure", "");
  const reservationList = useMemo(() => getReservationList({ includeSellerChannel: true }), []);
  const operationViews = useMemo(() => getReservationOperationViews(reservationList), [reservationList]);
  const upcomingDepartures = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return getOperationDepartureOverviews().filter((item) => item.departureDate >= today && item.summary.total > 0);
  }, []);
  const allReservations = useMemo(
    () => reservationList.filter((reservation) => isReservationVisibleTo(reservation, viewer)),
    [reservationList, viewer],
  );
  const sellingAgencyOptions = useMemo(
    () =>
      Array.from(
        new Set(allReservations.map((reservation) => reservation.source?.sellingAgencyName).filter(Boolean)),
      ) as string[],
    [allReservations],
  );

  const selectViewer = (key: string) => {
    changeViewer(key);
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const filtered = useMemo(() => {
    return allReservations.filter((reservation) => {
      if (applied.source !== "전체" && getReservationSourceType(reservation) !== applied.source) return false;
      if (
        viewer.type === "supplierAgency" &&
        applied.sellingAgency !== "전체" &&
        reservation.source?.sellingAgencyName !== applied.sellingAgency
      ) {
        return false;
      }
      if (!matchesKeyword(reservation, linkedKeyword)) return false;
      if (linkedDeparture && operationViews[reservation.code]?.departureKey !== linkedDeparture) return false;
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
  }, [allReservations, applied, linkedKeyword, linkedDeparture, operationViews, viewer]);

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
    setLinkedKeyword("");
    setLinkedDeparture("");
    setPage(1);
    act("검색 조건을 초기화했습니다.");
  };

  const showDepartureReservations = (departure: OperationDepartureOverview) => {
    const next: SearchFilters = {
      ...EMPTY_FILTERS,
      productName: departure.productName,
      departureFrom: departure.departureDate,
      departureTo: departure.departureDate,
    };
    setDraft(next);
    setApplied(next);
    setPage(1);
    act(`${departure.productName} 출발 예약을 조회합니다.`);
  };

  const clearLinkedKeyword = () => {
    setLinkedKeyword("");
    setPage(1);
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
                      className={child === "예약목록" ? "current" : ""}
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
            <ReservationViewerSwitch viewer={viewer} onChange={selectViewer} />
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

          {viewer.type === "integrated" && (
            <OperationSummaryPanel
              departures={upcomingDepartures.slice(0, OPERATION_PANEL_LIMIT)}
              hiddenCount={Math.max(0, upcomingDepartures.length - OPERATION_PANEL_LIMIT)}
              onShowReservations={showDepartureReservations}
            />
          )}

          <section className="panel member-web-filter reservation-filter reservation-filter--balanced">
            <div className="reservation-filter-grid reservation-filter-grid--source">
              <label className="member-web-keyword">
                <span>통합검색</span>
                <div>
                  <Search size={15} />
                  <input
                    value={draft.keyword}
                    onChange={(event) => setDraft((value) => ({ ...value, keyword: event.target.value }))}
                    onKeyDown={(event) => event.key === "Enter" && search()}
                    placeholder="예약번호, 예약자, 상품명·상품코드, 판매여행사, 판매점 검색"
                  />
                </div>
              </label>
              <label>
                <span>판매출처</span>
                <select
                  aria-label="판매출처"
                  value={draft.source}
                  onChange={(event) => setDraft((value) => ({ ...value, source: event.target.value as SourceFilter }))}
                >
                  {SOURCE_FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "전체" ? "전체" : RESERVATION_SOURCE_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>
              {viewer.type === "supplierAgency" && (
                <label>
                  <span>판매여행사</span>
                  <select
                    aria-label="판매여행사"
                    value={draft.sellingAgency}
                    onChange={(event) => setDraft((value) => ({ ...value, sellingAgency: event.target.value }))}
                  >
                    <option value="전체">전체</option>
                    {sellingAgencyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              )}
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

          {linkedKeyword && (
            <div className="settlement-drill-chip" role="status">
              <span>
                상품 연결 조회 <b>{linkedKeyword}</b> · 원본/판매 상품코드 기준으로 예약을 표시합니다.
              </span>
              <button type="button" className="secondary settlement-inline-button" onClick={clearLinkedKeyword}>
                <X size={12} />
                조건 해제
              </button>
            </div>
          )}

          {linkedDeparture && (
            <div className="settlement-drill-chip" role="status">
              <span>
                출발회차 연결 조회 <b>{linkedDeparture}</b> · 해당 출발회차(상품 + 출발일)의 예약만 표시합니다.
              </span>
              <button
                type="button"
                className="secondary settlement-inline-button"
                onClick={() => {
                  setLinkedDeparture("");
                  setPage(1);
                }}
              >
                <X size={12} />
                조건 해제
              </button>
            </div>
          )}

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
              <table className="member-web-table reservation-list-table reservation-list-table--sheet">
                <thead>
                  <tr>
                    <th className="reservation-check-col">
                      <input
                        type="checkbox"
                        aria-label="현재 페이지 전체 선택"
                        checked={rows.length > 0 && rows.every((item) => selectedCodes.includes(item.code))}
                        onChange={(event) => {
                          const pageCodes = rows.map((item) => item.code);
                          setSelectedCodes((current) =>
                            event.target.checked
                              ? Array.from(new Set([...current, ...pageCodes]))
                              : current.filter((code) => !pageCodes.includes(code)),
                          );
                        }}
                      />
                    </th>
                    <th>예약번호 / 상품명</th>
                    <th>예약일</th>
                    <th>출발일</th>
                    <th>예약자 / 연락처</th>
                    <th>인원</th>
                    <th>금액</th>
                    <th>예약상태</th>
                    <th>결제상태</th>
                    <th>판매채널 / 판매사</th>
                    <th>담당자</th>
                    <th>알림 / 메모</th>
                    <th>정산서</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((reservation) => {
                      const productCode = resolveReservationProductCode(reservation);
                      const people = formatPeopleStack(reservation);
                      const channel = salesChannelLabel(reservation);
                      const selected = selectedCodes.includes(reservation.code);
                      return (
                        <tr key={reservation.code} className={selected ? "is-selected-row" : undefined}>
                          <td className="reservation-check-col">
                            <input
                              type="checkbox"
                              aria-label={`${reservation.code} 선택`}
                              checked={selected}
                              onChange={(event) => {
                                setSelectedCodes((current) =>
                                  event.target.checked
                                    ? [...current, reservation.code]
                                    : current.filter((code) => code !== reservation.code),
                                );
                              }}
                            />
                          </td>
                          <td className="text-left reservation-product-cell">
                            <Link
                              href={withReservationViewer(`/reservations/${reservation.code}`, viewer)}
                              className="reservation-code-link"
                            >
                              [{reservation.code}]{productCode ? ` [${productCode}]` : ""}
                            </Link>
                            <span>{reservation.productName || "-"}</span>
                          </td>
                          <td className="date-cell">{reservation.reservedAt || "-"}</td>
                          <td className="date-cell">{reservation.departureAt || "-"}</td>
                          <td className="text-left reservation-booker-cell">
                            <b>{reservation.bookerName || "-"}</b>
                            <small>{reservation.phone || "-"}</small>
                          </td>
                          <td className="reservation-people-cell">
                            <b>{people.totalLabel}</b>
                            <small>{people.detail}</small>
                          </td>
                          <td className="reservation-amount-cell">
                            <div>
                              <span>총금액</span>
                              <b>{reservation.totalAmount || "-"}</b>
                            </div>
                            <div>
                              <span>결제금액</span>
                              <b className="is-paid">{reservation.paidAmount || "-"}</b>
                            </div>
                            <div>
                              <span>미수금</span>
                              <b className="is-unpaid">{reservation.unpaidAmount || "-"}</b>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${reservation.reserveStatusClass}`}>{reservation.reserveStatus}</span>
                          </td>
                          <td>
                            <span className={`badge ${reservation.paymentStatusClass}`}>{reservation.paymentStatus}</span>
                          </td>
                          <td className="text-left reservation-channel-cell">
                            <b>{channel.channel}</b>
                            <small>{channel.seller}</small>
                          </td>
                          <td className="reservation-assignee-cell">미지정</td>
                          <td className="text-left reservation-memo-cell" title={memoPreview(reservation)}>
                            {memoPreview(reservation)}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="secondary reservation-sheet-btn"
                              onClick={() => {
                                setSettlementMethod("individual");
                                setSettlementTarget(reservation);
                              }}
                            >
                              정산서
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={13}>
                        <div className="member-web-empty">
                          <strong>
                            {linkedKeyword && filtered.length === 0
                              ? "이 상품으로 접수된 예약이 없습니다."
                              : "검색 조건에 맞는 예약이 없습니다."}
                          </strong>
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

      {settlementTarget && (
        <SettlementMethodSelectModal
          reservation={settlementTarget}
          method={settlementMethod}
          onMethodChange={setSettlementMethod}
          onClose={() => setSettlementTarget(null)}
          onNext={(result) => {
            setSettlementTarget(null);
            router.push(
              withReservationViewer(
                `/reservations/${encodeURIComponent(result.reservationCode)}/settlement?method=${result.method}`,
                viewer,
              ),
            );
          }}
        />
      )}
    </div>
  );
}
