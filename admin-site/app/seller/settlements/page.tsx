"use client";

import { Eye, Info as InfoIcon, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SellerProductsMockControls } from "@/components/seller/SellerProductsMockControls";
import {
  SELLER_SETTLEMENT_PERIODS,
  SELLER_SETTLEMENT_STATUSES,
  defaultSellerSettlementListFilters,
  filterSellerSettlementList,
  formatSellerSettlementAmount as won,
  formatSellerSettlementSigned as signed,
  getSettlementAdjustmentAmount,
  getSettlementEffectiveStatus,
  getSettlementFinalAmount,
  getSettlementNextAdjustmentAmount,
  listSellerSettlementsAllSuppliers,
  sellerSettlementDetailPath,
  sellerSettlementPaymentBadgeClass,
  sellerSettlementStatusBadgeClass,
  summarizeSellerSettlementList,
  useSellerSettlementStoreVersion,
  type SellerSettlement,
  type SellerSettlementListFilters,
} from "@/lib/admin/seller-channel-settlements";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import type { SupplierTradeStatus } from "@/lib/seller/seller-login-mock";
import { SELLER_RESERVATION_BASE_DATE } from "@/lib/seller/seller-reservations-data";
import { getSellerSupplierRelations, isJoinedOrApplied } from "@/lib/seller/seller-suppliers-data";
import { useSellerProductsState } from "@/lib/seller/use-seller-products-state";
import { useSellerSession } from "@/lib/seller/use-seller-session";

const PAGE_SIZE = 10;
const MOCK_KEYS = ["hyundamSuspended"] as const;
const DEFAULT_FILTERS = defaultSellerSettlementListFilters(SELLER_RESERVATION_BASE_DATE);

type SupplierOption = {
  supplierId: string;
  supplierName: string;
  status: SupplierTradeStatus;
  settlementCount: number;
};

function dotted(value: string) {
  return value.replace(/-/g, ".");
}

function periodText(settlement: SellerSettlement) {
  return `${dotted(settlement.periodFrom)} ~ ${dotted(settlement.periodTo).slice(5)}`;
}

function statusNote(settlement: SellerSettlement) {
  if (settlement.scheduled) return "정산생성 예정";
  if (settlement.status === "수정필요") return settlement.pendingAdjustment !== 0 ? "취소조정 반영 필요" : "정산서 재발행 필요";
  if (settlement.status === "재확인대기") return settlement.sellerConfirmed ? "재확정 대기" : "판매점 재확인 필요";
  return null;
}

export default function SellerSettlementsPage() {
  const session = useSellerSession();
  const sellerId = session?.sellerId ?? SELLER_ADMIN_DEMO_PROFILE.sellerId;

  const { mock, supplierStatuses } = useSellerProductsState(sellerId);
  const storeVersion = useSellerSettlementStoreVersion();
  const [filters, setFilters] = useState<SellerSettlementListFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const settlements = useMemo(() => listSellerSettlementsAllSuppliers(sellerId), [sellerId, storeVersion]);
  const summary = summarizeSellerSettlementList(settlements, SELLER_RESERVATION_BASE_DATE);

  const supplierOptions = useMemo<SupplierOption[]>(
    () =>
      getSellerSupplierRelations(sellerId, "normal")
        .filter(isJoinedOrApplied)
        .map((relation) => ({
          supplierId: relation.supplierId,
          supplierName: relation.supplierName,
          status: supplierStatuses[relation.supplierId] ?? (relation.status as SupplierTradeStatus),
          settlementCount: settlements.filter((item) => item.supplierTravelAgencyId === relation.supplierId).length,
        })),
    [sellerId, supplierStatuses, settlements],
  );
  const suspendedSuppliers = supplierOptions.filter((option) => option.status === "이용중지" && option.settlementCount > 0);

  const filtered = useMemo(() => filterSellerSettlementList(settlements, filters, SELLER_RESERVATION_BASE_DATE), [settlements, filters]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedSupplier = supplierOptions.find((option) => option.supplierId === filters.supplierId) ?? null;
  const filterActive =
    filters.period !== DEFAULT_FILTERS.period || filters.supplierId !== "전체" || filters.status !== "전체" || filters.keyword.trim() !== "";

  const updateFilter = <K extends keyof SellerSettlementListFilters>(key: K, value: SellerSettlementListFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const supplierLabel = (option: SupplierOption) =>
    option.status === "승인대기" ? `${option.supplierName} (승인대기)` : option.supplierName;

  const renderEmpty = () => {
    if (selectedSupplier && selectedSupplier.status === "승인대기") {
      return (
        <>
          <h3>정산내역이 없습니다.</h3>
          <p>{selectedSupplier.supplierName}는 현재 가입 승인대기 상태입니다.</p>
        </>
      );
    }
    return (
      <>
        <h3>정산내역이 없습니다.</h3>
        <p>선택한 조건에 해당하는 정산내역이 없습니다.</p>
        <button type="button" className="secondary" onClick={resetFilters}>
          조건 초기화
        </button>
      </>
    );
  };

  return (
    <div className="seller-settlements-page">
      <section className="page-head seller-sup-head">
        <div>
          <h1>정산관리</h1>
          <p>공급여행사별 정산내역과 지급현황을 확인합니다.</p>
        </div>
      </section>

      {suspendedSuppliers.length > 0 ? (
        <p className="seller-prod-notice seller-rsv-notice is-danger" role="note">
          <InfoIcon size={14} aria-hidden="true" />
          <span>
            {suspendedSuppliers.map((option) => option.supplierName).join(", ")}와의 거래가 이용중지되었습니다. 기존 정산내역은 계속
            조회할 수 있습니다.
          </span>
        </p>
      ) : null}

      <section className="panel seller-sup-summary" aria-label="정산 현황 요약">
        <dl className="seller-dash-stats">
          <div className={summary.scheduledCount > 0 ? "is-warn" : undefined}>
            <dt>정산예정</dt>
            <dd>{won(summary.scheduledAmount)}</dd>
            <small className="seller-rsv-stat-sub">정산대기 · 수정필요 · 재확인대기 {summary.scheduledCount}건</small>
          </div>
          <div>
            <dt>정산확정</dt>
            <dd>{won(summary.confirmedAmount)}</dd>
            <small className="seller-rsv-stat-sub">지급대기 {summary.confirmedCount}건</small>
          </div>
          <div className="is-success">
            <dt>지급완료</dt>
            <dd>{won(summary.paidAmount)}</dd>
            <small className="seller-rsv-stat-sub">이번 달 지급 {summary.paidCount}건</small>
          </div>
          <div className={summary.nextAdjustment !== 0 ? "is-danger" : undefined}>
            <dt>차기정산 조정</dt>
            <dd className={summary.nextAdjustment < 0 ? "seller-settle-minus" : undefined}>{signed(summary.nextAdjustment)}</dd>
            <small className="seller-rsv-stat-sub">지급완료 후 취소 {summary.nextCount}건</small>
          </div>
        </dl>
        <p className="seller-sup-policy seller-prod-supplier-counts">
          {supplierOptions.map((option) => (
            <span key={option.supplierId}>
              {option.supplierName} <b>{option.status === "승인대기" ? "-" : `${option.settlementCount}건`}</b>
              {option.status !== "정상" ? <em className={option.status === "이용중지" ? "is-danger" : undefined}>{option.status}</em> : null}
            </span>
          ))}
        </p>
        <p className="seller-sup-policy seller-prod-supplier-counts seller-inv-payment-counts">
          {summary.statusCounts.map((item) => (
            <span key={item.status}>
              {item.status} <b>{item.count}건</b>
            </span>
          ))}
        </p>
      </section>

      <section className="panel seller-sup-list" aria-labelledby="seller-stl-list-title">
        <div className="panel-head">
          <div>
            <h2 id="seller-stl-list-title">
              정산 목록 <span className="count">{filtered.length}</span>
            </h2>
            <p>최신 정산기간순으로 표시합니다.</p>
          </div>
        </div>

        <div className="seller-sup-toolbar seller-prod-toolbar seller-rsv-toolbar" role="search">
          <select
            className="seller-prod-select seller-rsv-period"
            aria-label="기간"
            value={filters.period}
            onChange={(event) => updateFilter("period", event.target.value as SellerSettlementListFilters["period"])}
          >
            {SELLER_SETTLEMENT_PERIODS.map((period) => (
              <option key={period.key} value={period.key}>
                {period.label}
              </option>
            ))}
          </select>
          {filters.period === "custom" ? (
            <span className="seller-rsv-range">
              <input type="date" aria-label="시작일" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} />
              <span aria-hidden="true">~</span>
              <input type="date" aria-label="종료일" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} />
            </span>
          ) : null}
          <label className="seller-sup-search" htmlFor="seller-stl-keyword">
            <Search size={15} aria-hidden="true" />
            <input
              id="seller-stl-keyword"
              type="search"
              value={filters.keyword}
              onChange={(event) => updateFilter("keyword", event.target.value)}
              placeholder="정산번호 또는 공급여행사 검색"
              aria-label="정산번호 또는 공급여행사 검색"
            />
          </label>
          <select
            className="seller-prod-select"
            aria-label="공급여행사"
            value={filters.supplierId}
            onChange={(event) => updateFilter("supplierId", event.target.value)}
          >
            <option value="전체">전체 공급여행사</option>
            {supplierOptions.map((option) => (
              <option key={option.supplierId} value={option.supplierId}>
                {supplierLabel(option)}
              </option>
            ))}
          </select>
          <select
            className="seller-prod-select"
            aria-label="정산상태"
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value as SellerSettlementListFilters["status"])}
          >
            <option value="전체">전체 상태</option>
            {SELLER_SETTLEMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="button" className="secondary seller-prod-reset" onClick={resetFilters} disabled={!filterActive}>
            <RotateCcw size={14} aria-hidden="true" />
            초기화
          </button>
        </div>
        <p className="seller-rsv-result" aria-live="polite">
          검색결과 <b>{filtered.length}건</b>
          <span>정산금액은 예약 당시 판매점 수익(Snapshot) 기준입니다. 고객 환불금액 · 취소수수료와 별개입니다.</span>
        </p>

        {pageRows.length === 0 ? (
          <div className="seller-sup-empty">{renderEmpty()}</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="seller-dash-table seller-rsv-table seller-stl-table">
                <thead>
                  <tr>
                    <th>정산번호</th>
                    <th>정산기간</th>
                    <th>공급여행사</th>
                    <th className="money seller-stl-sub-col">예약건수</th>
                    <th className="money seller-stl-sub-col">정산 원금</th>
                    <th className="money">조정금액</th>
                    <th className="money">최종 정산금액</th>
                    <th>정산상태</th>
                    <th>지급상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const status = getSettlementEffectiveStatus(row);
                    const adjustment = getSettlementAdjustmentAmount(row);
                    const nextAdjustment = getSettlementNextAdjustmentAmount(row);
                    const incomingCount = row.incomingAdjustments.length;
                    const cancelCount = row.adjustmentCount - incomingCount;
                    const note = statusNote(row);
                    return (
                      <tr key={row.code}>
                        <td data-label="정산번호">
                          <Link href={sellerSettlementDetailPath(row.code)} className="seller-stl-code">
                            {row.code}
                          </Link>
                        </td>
                        <td data-label="정산기간">
                          <span className="seller-rsv-date">
                            <b>{periodText(row)}</b>
                            <small>{row.label}</small>
                          </span>
                        </td>
                        <td data-label="공급여행사">
                          <span className="seller-prod-supplier">
                            <b>{row.supplierName}</b>
                            <small>{row.supplierCode}</small>
                            {supplierStatuses[row.supplierTravelAgencyId] === "이용중지" ? (
                              <em className="seller-rsv-flag">공급여행사 거래중지</em>
                            ) : null}
                          </span>
                        </td>
                        <td data-label="예약건수" className="money seller-stl-sub-col">
                          {row.reservationCount}건
                        </td>
                        <td data-label="정산 원금" className="money seller-stl-sub-col">
                          <span className="seller-prod-money">
                            <b>{won(row.principal)}</b>
                          </span>
                        </td>
                        <td data-label="조정금액" className="money">
                          <span className="seller-prod-money">
                            <b className={adjustment < 0 ? "seller-settle-minus" : undefined}>{signed(adjustment)}</b>
                            {cancelCount > 0 ? <small>취소조정 {cancelCount}건</small> : null}
                            {incomingCount > 0 ? <small>이전 정산 조정 {incomingCount}건</small> : null}
                            {row.pendingAdjustment !== 0 ? <small className="is-review">반영대기 {signed(row.pendingAdjustment)}</small> : null}
                          </span>
                        </td>
                        <td data-label="최종 정산금액" className="money">
                          <span className="seller-prod-money">
                            <b>{won(getSettlementFinalAmount(row))}</b>
                          </span>
                        </td>
                        <td data-label="정산상태">
                          <span className="seller-inv-status">
                            <span className="seller-inv-status-badges">
                              <span className={`badge ${sellerSettlementStatusBadgeClass(status)}`}>{status}</span>
                              {nextAdjustment !== 0 ? <span className="badge warn">차기정산 조정 {signed(nextAdjustment)}</span> : null}
                            </span>
                            {note ? <small className={row.scheduled ? undefined : "is-review"}>{note}</small> : null}
                          </span>
                        </td>
                        <td data-label="지급상태">
                          <span className="seller-inv-status">
                            <span className={`badge ${sellerSettlementPaymentBadgeClass(row.paymentStatus)}`}>{row.paymentStatus}</span>
                            <small>{row.paidAt ? `${dotted(row.paidAt.slice(0, 10))} 지급` : `${dotted(row.dueDate)} 예정`}</small>
                          </span>
                        </td>
                        <td data-label="관리">
                          <Link
                            href={sellerSettlementDetailPath(row.code)}
                            className="secondary seller-prod-view-link"
                            aria-label={`${row.code} 보기`}
                          >
                            <Eye size={14} aria-hidden="true" />
                            보기
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>
                총 {filtered.length}건 중 {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)}건 표시
              </span>
              <div className="pagination" aria-label="페이지네이션">
                <button type="button" aria-label="이전 페이지" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                  ‹
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={item === currentPage ? "active" : undefined}
                    aria-current={item === currentPage ? "page" : undefined}
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </button>
                ))}
                <button type="button" aria-label="다음 페이지" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <SellerProductsMockControls sellerId={sellerId} mock={mock} keys={MOCK_KEYS} />
    </div>
  );
}
