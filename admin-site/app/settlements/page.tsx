"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, Search, X } from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import {
  ReservationSourceBadge,
  ReservationViewerSwitch,
  useReservationViewer,
} from "@/components/reservations/ReservationSource";
import {
  SettlementCommissionCell,
  SettlementStatusBadge,
  useQueryParam,
} from "@/components/settlements/SettlementParts";
import { RESERVATION_SOURCE_LABELS, isReservationVisibleTo, withReservationViewer } from "@/lib/admin/reservation-permission";
import { SettlementAdjustmentStateBadge } from "@/components/settlements/SettlementAdjustmentParts";
import { SettlementDocumentStatusBadge } from "@/components/settlements/SettlementDocumentParts";
import { SettlementDashboard } from "@/components/settlements/SettlementDashboard";
import { SettlementDocumentList } from "@/components/settlements/SettlementDocumentList";
import { SellerChannelSettlementPanel } from "@/components/settlements/SellerChannelSettlementPanel";
import { SELLER_SETTLEMENT_SUPPLIER_NAME, isSellerSettlementSupplier } from "@/lib/admin/seller-channel-settlements";
import { formatReservationTimestamp } from "@/lib/admin/reservations-data";
import {
  SETTLEMENT_DOCUMENT_FILTER_STATUSES,
  getSettlementDocumentStatus,
  type SettlementDocumentStatus,
} from "@/lib/admin/settlement-document-data";
import {
  SETTLEMENT_DASHBOARD_MODE_LABELS,
  matchesSettlementDashboardDrill,
  type SettlementDashboardDrill,
} from "@/lib/admin/settlement-dashboard-data";
import {
  SETTLEMENT_ADJUSTMENT_STATE_LABELS,
  SETTLEMENT_STATUSES,
  formatSignedWon,
  formatWon,
  getSettlementDepartureGroups,
  getSettlementKpis,
  getSettlementRecords,
  type SettlementAdjustmentState,
  type SettlementRecord,
  type SettlementStatus,
} from "@/lib/admin/settlement-data";

type SettlementFilters = {
  keyword: string;
  dueFrom: string;
  dueTo: string;
  departureFrom: string;
  departureTo: string;
  supplier: string;
  sellingAgency: string;
  seller: string;
  source: "전체" | "affiliate" | "seller";
  status: "전체" | SettlementStatus;
  adjustment: "전체" | SettlementAdjustmentState;
  document: "전체" | SettlementDocumentStatus;
};

const EMPTY_FILTERS: SettlementFilters = {
  keyword: "",
  dueFrom: "",
  dueTo: "",
  departureFrom: "",
  departureTo: "",
  supplier: "전체",
  sellingAgency: "전체",
  seller: "전체",
  source: "전체",
  status: "전체",
  adjustment: "전체",
  document: "전체",
};

function inRange(value: string, from: string, to: string) {
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

function matchesFilters(record: SettlementRecord, filters: SettlementFilters) {
  const keyword = filters.keyword.trim().toLowerCase();
  if (
    keyword &&
    ![
      record.settlementCode,
      record.reservation.code,
      record.productName,
      record.reservation.productName,
      record.sellingAgencyName,
      record.sellerName ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword)
  ) {
    return false;
  }
  if (!inRange(record.settlement.dueDate, filters.dueFrom, filters.dueTo)) return false;
  if (!inRange(record.departureAt, filters.departureFrom, filters.departureTo)) return false;
  if (filters.supplier !== "전체" && record.supplierAgencyName !== filters.supplier) return false;
  if (filters.sellingAgency !== "전체" && record.sellingAgencyName !== filters.sellingAgency) return false;
  if (filters.seller !== "전체" && (record.sellerName ?? "") !== filters.seller) return false;
  if (filters.source !== "전체" && record.sourceType !== filters.source) return false;
  if (filters.status !== "전체" && record.status !== filters.status) return false;
  if (filters.adjustment !== "전체" && record.adjustmentState !== filters.adjustment) return false;
  if (filters.document !== "전체" && getSettlementDocumentStatus(record.settlementCode) !== filters.document) return false;
  return true;
}

function uniqueValues(values: (string | undefined)[]) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export default function SettlementsPage() {
  const router = useRouter();
  const [viewer, changeViewer] = useReservationViewer();
  const [tab, setTab] = useQueryParam("tab", "reservation");
  const [draft, setDraft] = useState<SettlementFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<SettlementFilters>(EMPTY_FILTERS);
  const [drill, setDrill] = useState<SettlementDashboardDrill | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [toast, setToast] = useState("");
  const today = useMemo(() => formatReservationTimestamp(new Date()).slice(0, 10), []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allRecords = useMemo(() => getSettlementRecords(), [dataVersion]);
  const visibleRecords = useMemo(
    () => allRecords.filter((record) => isReservationVisibleTo(record.reservation, viewer)),
    [allRecords, viewer],
  );
  const filtered = useMemo(
    () => visibleRecords.filter((record) => matchesFilters(record, applied) && (!drill || matchesSettlementDashboardDrill(record, drill))),
    [visibleRecords, applied, drill],
  );
  const isSellerView = viewer.type === "seller";
  const documentTabLabel = viewer.type === "sellingAgency" ? "받은 정산서" : "정산서";
  const canViewSellerChannel =
    viewer.type === "integrated" || (viewer.type === "supplierAgency" && isSellerSettlementSupplier(viewer.agencyName));
  const activeTab = (tab === "document" && isSellerView) || (tab === "seller" && !canViewSellerChannel) ? "reservation" : tab;
  const kpis = useMemo(() => getSettlementKpis(visibleRecords), [visibleRecords]);
  const groups = useMemo(() => getSettlementDepartureGroups(filtered), [filtered]);

  const options = useMemo(
    () => ({
      supplier: uniqueValues(visibleRecords.map((record) => record.supplierAgencyName)),
      sellingAgency: uniqueValues(visibleRecords.map((record) => record.sellingAgencyName)),
      seller: uniqueValues(visibleRecords.map((record) => record.sellerName)),
    }),
    [visibleRecords],
  );

  const selectViewer = (key: string) => {
    changeViewer(key);
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setDrill(null);
  };

  const search = () => {
    setApplied({ ...draft });
    notify("검색 조건을 적용했습니다.");
  };

  const reset = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setDrill(null);
    notify("검색 조건을 초기화했습니다.");
  };

  /** 대시보드 KPI · 상태 클릭: 같은 판정 함수로 정산목록을 필터링합니다. */
  const applyDrill = (next: SettlementDashboardDrill) => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setDrill(next);
    if (activeTab !== "reservation") setTab("reservation");
    notify(`${next.label} 조건으로 정산목록을 필터링했습니다.`);
    window.setTimeout(() => document.getElementById("settlement-list")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const refreshData = (message: string) => {
    setDataVersion((value) => value + 1);
    notify(message);
  };

  const detailPath = (record: SettlementRecord) => withReservationViewer(`/settlements/${record.settlementCode}`, viewer);
  const detailHref = (settlementCode: string, detailTab?: string) =>
    withReservationViewer(`/settlements/${settlementCode}${detailTab ? `?tab=${detailTab}` : ""}`, viewer);
  const departurePath = (key: string) =>
    withReservationViewer(`/settlements/departures/${encodeURIComponent(key)}`, viewer);

  const selectFilter = (key: keyof SettlementFilters, label: string, values: string[]) => (
    <label>
      <span>{label}</span>
      <select
        aria-label={label}
        value={draft[key]}
        onChange={(event) => setDraft((value) => ({ ...value, [key]: event.target.value }))}
      >
        <option value="전체">전체</option>
        {values.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <ProductAdminShell
      activeMenu="정산관리"
      currentChild="정산현황"
      breadcrumb={
        <>
          <span>정산관리</span>
          <b>/</b>
          <strong>정산현황</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
    >
      <main className="content member-web-content settlement-content">
        <section className="page-head member-web-page-head">
          <div>
            <p className="member-web-breadcrumb">정산관리 &gt; 정산현황</p>
            <h1>정산관리</h1>
            <p>상품 판매 및 예약에 따른 여행사·판매점 정산내역을 관리합니다.</p>
          </div>
          <ReservationViewerSwitch viewer={viewer} onChange={selectViewer} />
        </section>

        {!isSellerView && (
          <SettlementDashboard
            key={viewer.key}
            records={visibleRecords}
            viewer={viewer}
            today={today}
            activeDrillKey={drill?.key}
            onDrill={applyDrill}
            detailHref={detailHref}
          />
        )}

        {isSellerView && (
          <section className="reservation-kpi-grid settlement-kpi-grid">
            {kpis.map((kpi) => (
              <button
                key={kpi.status}
                type="button"
                className={`member-web-detail-kpi reservation-kpi settlement-kpi settlement-kpi--${kpi.status} ${applied.status === kpi.status ? "is-active" : ""}`}
                onClick={() => {
                  const next = { ...EMPTY_FILTERS, status: kpi.status };
                  setDraft(next);
                  setApplied(next);
                }}
              >
                <span>
                  <small>{kpi.status}</small>
                  <strong>{kpi.count}건</strong>
                  <em>{formatWon(kpi.amount)}</em>
                </span>
              </button>
            ))}
          </section>
        )}

        <div className="member-web-detail-tabs" role="tablist" aria-label="정산 보기" id="settlement-list">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "reservation"}
            className={activeTab === "reservation" ? "active" : ""}
            onClick={() => setTab("reservation")}
          >
            예약별 정산
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "departure"}
            className={activeTab === "departure" ? "active" : ""}
            onClick={() => setTab("departure")}
          >
            출발상품별 정산
          </button>
          {!isSellerView && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "document"}
              className={activeTab === "document" ? "active" : ""}
              onClick={() => setTab("document")}
            >
              {documentTabLabel}
            </button>
          )}
          {canViewSellerChannel && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "seller"}
              className={activeTab === "seller" ? "active" : ""}
              onClick={() => setTab("seller")}
            >
              판매점 수익 정산
            </button>
          )}
        </div>

        {drill && activeTab !== "document" && activeTab !== "seller" && (
          <div className="settlement-drill-chip" role="status">
            <span>
              대시보드 조건 <b>{drill.label}</b> · {SETTLEMENT_DASHBOARD_MODE_LABELS[drill.mode]} 관점 · {drill.key === "paid" || drill.key === "status:지급완료" ? "지급일" : "정산예정일"}{" "}
              {drill.range.from} ~ {drill.range.to}
              {Object.entries(drill.filters)
                .filter(([, value]) => value !== "전체")
                .map(([, value]) => ` · ${value}`)
                .join("")}
            </span>
            <button type="button" className="secondary settlement-inline-button" onClick={() => setDrill(null)}>
              <X size={12} />
              조건 해제
            </button>
          </div>
        )}

        {activeTab === "seller" ? (
          <SellerChannelSettlementPanel
            key={`seller-channel-${viewer.key}`}
            audience="supplier"
            supplierName={viewer.type === "supplierAgency" ? viewer.agencyName : SELLER_SETTLEMENT_SUPPLIER_NAME}
            canManage={viewer.type === "supplierAgency" && isSellerSettlementSupplier(viewer.agencyName)}
            reservationHref={(code) => withReservationViewer(`/reservations/${encodeURIComponent(code)}`, viewer)}
            onNotify={notify}
          />
        ) : activeTab === "document" ? (
          <SettlementDocumentList
            records={visibleRecords}
            viewer={viewer}
            received={viewer.type === "sellingAgency"}
            dataVersion={dataVersion}
            detailHref={detailHref}
            outputHref={({ record, document, version }, print) =>
              withReservationViewer(
                `/settlements/${record.settlementCode}/document/${version}?doc=${encodeURIComponent(document.documentNo ?? "")}${print ? "&print=1" : ""}`,
                viewer,
              )
            }
            onChanged={refreshData}
            onNotify={notify}
          />
        ) : (
          <>
            <section className="panel member-web-filter reservation-filter">
              <div className="reservation-filter-grid settlement-filter-grid">
                <label className="member-web-keyword">
                  <span>통합검색</span>
                  <div>
                    <Search size={15} />
                    <input
                      value={draft.keyword}
                      onChange={(event) => setDraft((value) => ({ ...value, keyword: event.target.value }))}
                      onKeyDown={(event) => event.key === "Enter" && search()}
                      placeholder="예약번호 / 상품명 / 판매여행사 / 판매점 검색"
                    />
                  </div>
                </label>
                <label className="member-web-period">
                  <span>정산기간</span>
                  <div>
                    <input
                      type="date"
                      aria-label="정산기간 시작"
                      value={draft.dueFrom}
                      onChange={(event) => setDraft((value) => ({ ...value, dueFrom: event.target.value }))}
                    />
                    <em>~</em>
                    <input
                      type="date"
                      aria-label="정산기간 종료"
                      value={draft.dueTo}
                      onChange={(event) => setDraft((value) => ({ ...value, dueTo: event.target.value }))}
                    />
                  </div>
                </label>
                <label className="member-web-period">
                  <span>출발일</span>
                  <div>
                    <input
                      type="date"
                      aria-label="출발일 시작"
                      value={draft.departureFrom}
                      onChange={(event) => setDraft((value) => ({ ...value, departureFrom: event.target.value }))}
                    />
                    <em>~</em>
                    <input
                      type="date"
                      aria-label="출발일 종료"
                      value={draft.departureTo}
                      onChange={(event) => setDraft((value) => ({ ...value, departureTo: event.target.value }))}
                    />
                  </div>
                </label>
                {selectFilter("supplier", "공급여행사", options.supplier)}
                {selectFilter("sellingAgency", "판매여행사", options.sellingAgency)}
                {selectFilter("seller", "판매점", options.seller)}
                <label>
                  <span>예약출처</span>
                  <select
                    aria-label="예약출처"
                    value={draft.source}
                    onChange={(event) =>
                      setDraft((value) => ({ ...value, source: event.target.value as SettlementFilters["source"] }))
                    }
                  >
                    <option value="전체">전체</option>
                    <option value="affiliate">{RESERVATION_SOURCE_LABELS.affiliate}</option>
                    <option value="seller">{RESERVATION_SOURCE_LABELS.seller}</option>
                  </select>
                </label>
                <label>
                  <span>정산상태</span>
                  <select
                    aria-label="정산상태"
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((value) => ({ ...value, status: event.target.value as SettlementFilters["status"] }))
                    }
                  >
                    <option value="전체">전체</option>
                    {SETTLEMENT_STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>조정상태</span>
                  <select
                    aria-label="조정상태"
                    value={draft.adjustment}
                    onChange={(event) =>
                      setDraft((value) => ({ ...value, adjustment: event.target.value as SettlementFilters["adjustment"] }))
                    }
                  >
                    <option value="전체">전체</option>
                    {(Object.keys(SETTLEMENT_ADJUSTMENT_STATE_LABELS) as SettlementAdjustmentState[]).map((state) => (
                      <option key={state} value={state}>
                        {SETTLEMENT_ADJUSTMENT_STATE_LABELS[state]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>정산서 상태</span>
                  <select
                    aria-label="정산서 상태"
                    value={draft.document}
                    onChange={(event) =>
                      setDraft((value) => ({ ...value, document: event.target.value as SettlementFilters["document"] }))
                    }
                  >
                    <option value="전체">전체</option>
                    {SETTLEMENT_DOCUMENT_FILTER_STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
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

            {activeTab === "reservation" ? (
              <section className="panel member-web-list-panel">
                <div className="member-web-list-head">
                  <div>
                    <strong>
                      예약별 정산 <b>{filtered.length}</b>건
                    </strong>
                    <span>샘플 데이터 기준 · 금액은 원 단위</span>
                  </div>
                </div>
                <div className="member-web-table-wrap">
                  <table className="member-web-table settlement-list-table">
                    <thead>
                      <tr>
                        {[
                          "정산번호",
                          "예약번호",
                          "출발일",
                          "상품명",
                          "공급여행사",
                          "판매여행사",
                          "판매점",
                          "고객 결제금액",
                          "수수료",
                          "공급사 정산액 (최종)",
                          "정산상태",
                          "관리",
                        ].map((title) => (
                          <th key={title}>{title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length ? (
                        filtered.map((record) => (
                          <tr key={record.settlementCode}>
                            <td className="member-number">
                              <Link href={detailPath(record)} className="reservation-code-link">
                                {record.settlementCode}
                              </Link>
                            </td>
                            <td className="member-number">{record.reservation.code}</td>
                            <td className="date-cell">{record.departureAt}</td>
                            <td className="text-left">
                              <span className="settlement-product-cell">
                                <b>{record.productName}</b>
                                <ReservationSourceBadge reservation={record.reservation} />
                              </span>
                            </td>
                            <td>{record.supplierAgencyName}</td>
                            <td>{record.sellingAgencyName}</td>
                            <td>{record.sellerName ?? "-"}</td>
                            <td className="amount-cell">{formatWon(record.breakdown.paidAmount)}</td>
                            <td>
                              <SettlementCommissionCell record={record} />
                            </td>
                            <td className="amount-cell">
                              <span className="settlement-final-cell">
                                <b>{formatWon(record.amounts.finalSupplierAmount)}</b>
                                {record.amounts.finalSupplierAmount !== record.breakdown.supplierAmount && (
                                  <small>조정 {formatSignedWon(record.amounts.finalSupplierAmount - record.breakdown.supplierAmount)}</small>
                                )}
                                {record.amounts.nextAdjustment !== 0 && <small>차기 {formatSignedWon(record.amounts.nextAdjustment)}</small>}
                              </span>
                            </td>
                            <td>
                              <span className="reservation-status-stack">
                                <SettlementStatusBadge status={record.status} />
                                {record.settlement.closing && <span className="badge success">정산마감</span>}
                                {(record.settlement.closing || record.status === "정산확정" || getSettlementDocumentStatus(record.settlementCode) !== "미발행") && (
                                  <SettlementDocumentStatusBadge status={getSettlementDocumentStatus(record.settlementCode)} />
                                )}
                                <SettlementAdjustmentStateBadge state={record.adjustmentState} />
                                {record.cancellationStatus !== "none" && (
                                  <span className="badge gray">{record.cancellationStatus === "full" ? "전체취소" : "부분취소"}</span>
                                )}
                              </span>
                            </td>
                            <td>
                              <Link href={detailPath(record)} className="member-detail-button">
                                상세보기
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={12}>
                            <div className="member-web-empty">
                              <strong>검색 조건에 맞는 정산내역이 없습니다.</strong>
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
                  <span>총 {filtered.length}건</span>
                  <div />
                  <div />
                </div>
              </section>
            ) : (
              <section className="panel member-web-list-panel">
                <div className="member-web-list-head">
                  <div>
                    <strong>
                      출발상품별 정산 <b>{groups.length}</b>건
                    </strong>
                    <span>같은 원본 상품 · 출발일 기준 집계 · 정산취소 건은 금액 합계에서 제외 · 최종 정산액은 조정금액 반영</span>
                  </div>
                </div>
                <div className="member-web-table-wrap">
                  <table className="member-web-table settlement-departure-table">
                    <thead>
                      <tr>
                        {[
                          "출발일",
                          "상품명",
                          "공급여행사",
                          "예약건수",
                          "총 인원",
                          "총 판매금액",
                          "판매수수료",
                          "판매점 수수료",
                          "조정금액",
                          "최종 정산액",
                          "정산상태",
                          "관리",
                        ].map((title) => (
                          <th key={title}>{title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groups.length ? (
                        groups.map((group) => (
                          <tr
                            key={group.key}
                            className="settlement-departure-row"
                            onClick={() => router.push(departurePath(group.key))}
                          >
                            <td className="date-cell">{group.departureAt}</td>
                            <td className="text-left">
                              <b>{group.productName}</b>
                            </td>
                            <td>{group.supplierAgencyName}</td>
                            <td>{group.reservationCount}건</td>
                            <td>{group.peopleCount}명</td>
                            <td className="amount-cell">{formatWon(group.paidAmount)}</td>
                            <td className="amount-cell">{formatWon(group.affiliateCommission)}</td>
                            <td className="amount-cell">{formatWon(group.sellerCommission)}</td>
                            <td className="amount-cell">{formatSignedWon(group.adjustmentAmount)}</td>
                            <td className="amount-cell">{formatWon(group.supplierAmount)}</td>
                            <td>
                              <span className="settlement-status-counts">
                                {group.statusCounts.map((item) => (
                                  <span key={item.status} className="settlement-status-count">
                                    <SettlementStatusBadge status={item.status} />
                                    {group.statusCounts.length > 1 && <small>{item.count}</small>}
                                  </span>
                                ))}
                              </span>
                            </td>
                            <td>
                              <Link
                                href={departurePath(group.key)}
                                className="member-detail-button"
                                onClick={(event) => event.stopPropagation()}
                              >
                                상세보기
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={12}>
                            <div className="member-web-empty">
                              <strong>검색 조건에 맞는 출발상품이 없습니다.</strong>
                              <p>조건을 변경하거나 초기화한 뒤 다시 검색해 주세요.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        <footer>© 2026 AOS Travel ERP · AviaNext</footer>
      </main>
    </ProductAdminShell>
  );
}
