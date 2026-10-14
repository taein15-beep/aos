"use client";

import { Eye, Info as InfoIcon, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SellerProductsMockControls } from "@/components/seller/SellerProductsMockControls";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import type { SupplierTradeStatus } from "@/lib/seller/seller-login-mock";
import {
  DEFAULT_SELLER_RESERVATION_FILTERS,
  SELLER_RESERVATION_PAYMENT_STATUSES,
  SELLER_RESERVATION_PERIODS,
  SELLER_RESERVATION_STATUSES,
  filterSellerReservations,
  formatSellerReservationAmount,
  formatSellerReservationDate,
  hasSellerReservationConditionFilter,
  isSellerReservationFilterActive,
  isSellerReservationInBaseMonth,
  sellerReservationAmount,
  sellerReservationDetailPath,
  sellerReservationExpectedProfit,
  sellerReservationPaymentBadgeClass,
  sellerReservationStatusBadgeClass,
  summarizeSellerReservations,
  type SellerReservation,
  type SellerReservationFilters,
} from "@/lib/seller/seller-reservations-data";
import { getSellerSupplierRelations, isJoinedOrApplied } from "@/lib/seller/seller-suppliers-data";
import { useSellerProductsState } from "@/lib/seller/use-seller-products-state";
import { useSellerReservations } from "@/lib/seller/use-seller-reservations-state";
import { useSellerSession } from "@/lib/seller/use-seller-session";

const PAGE_SIZE = 10;
const MOCK_KEYS = ["hyundamSuspended"] as const;

type SupplierOption = {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  status: SupplierTradeStatus;
  reservationCount: number;
  salesAmount: number;
};

function profitNote(reservation: SellerReservation) {
  if (reservation.status === "취소완료") return "취소완료 · 정산 제외";
  if (reservation.status === "취소요청") return "취소 검토중";
  if (reservation.status === "취소승인") return "취소승인 · 환불대기";
  return "예상수익";
}

export default function SellerReservationsPage() {
  const session = useSellerSession();
  const sellerId = session?.sellerId ?? SELLER_ADMIN_DEMO_PROFILE.sellerId;
  const sellerName = session?.sellerName ?? SELLER_ADMIN_DEMO_PROFILE.sellerName;

  const { mock, supplierStatuses, products } = useSellerProductsState(sellerId);
  const [filters, setFilters] = useState<SellerReservationFilters>(DEFAULT_SELLER_RESERVATION_FILTERS);
  const [page, setPage] = useState(1);

  const reservations = useSellerReservations(sellerId);
  const monthReservations = useMemo(() => reservations.filter(isSellerReservationInBaseMonth), [reservations]);
  const summary = summarizeSellerReservations(monthReservations);

  const supplierOptions = useMemo<SupplierOption[]>(
    () =>
      getSellerSupplierRelations(sellerId, "normal")
        .filter(isJoinedOrApplied)
        .map((relation) => {
          const rows = monthReservations.filter((row) => row.supplierTravelAgencyId === relation.supplierId);
          return {
            supplierId: relation.supplierId,
            supplierName: relation.supplierName,
            supplierCode: relation.supplierCode,
            status: supplierStatuses[relation.supplierId] ?? (relation.status as SupplierTradeStatus),
            reservationCount: rows.length,
            salesAmount: summarizeSellerReservations(rows).salesAmount,
          };
        }),
    [sellerId, supplierStatuses, monthReservations],
  );

  const productStatusByCode = useMemo(() => new Map(products.map((product) => [product.productCode, product])), [products]);
  const suspendedSuppliers = supplierOptions.filter((option) => option.status === "이용중지" && option.reservationCount > 0);

  const filtered = useMemo(() => filterSellerReservations(reservations, filters), [reservations, filters]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedSupplier = supplierOptions.find((option) => option.supplierId === filters.supplierId) ?? null;
  const filterActive = isSellerReservationFilterActive(filters);

  const updateFilter = <K extends keyof SellerReservationFilters>(key: K, value: SellerReservationFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_SELLER_RESERVATION_FILTERS);
    setPage(1);
  };

  const supplierLabel = (option: SupplierOption) =>
    option.status === "승인대기" ? `${option.supplierName} (승인대기)` : `${option.supplierName} (${option.reservationCount})`;

  const renderEmpty = () => {
    if (selectedSupplier && selectedSupplier.status === "승인대기") {
      return (
        <>
          <h3>예약 내역이 없습니다.</h3>
          <p>{selectedSupplier.supplierName}는 현재 가입 승인대기 상태입니다.</p>
          <p>가입 승인 및 판매상품 허용 후 발생한 예약이 표시됩니다.</p>
        </>
      );
    }
    if (!hasSellerReservationConditionFilter({ ...filters, supplierId: "전체" })) {
      return (
        <>
          <h3>예약 내역이 없습니다.</h3>
          <p>해당 조건에서 접수된 예약이 없습니다.</p>
        </>
      );
    }
    return (
      <>
        <h3>조건에 맞는 예약이 없습니다.</h3>
        <p>검색어 또는 필터 조건을 변경해주세요.</p>
        <button type="button" className="secondary" onClick={resetFilters}>
          조건 초기화
        </button>
      </>
    );
  };

  return (
    <div className="seller-reservations-page">
      <section className="page-head seller-sup-head">
        <div>
          <h1>예약관리</h1>
          <p>{sellerName}를 통해 접수된 예약을 확인하고 관리합니다.</p>
        </div>
      </section>

      {suspendedSuppliers.length > 0 ? (
        <p className="seller-prod-notice seller-rsv-notice is-danger" role="note">
          <InfoIcon size={14} aria-hidden="true" />
          <span>
            {suspendedSuppliers.map((option) => option.supplierName).join(", ")}와의 거래가 이용중지되었습니다. 기존 예약은 계속
            조회할 수 있으며, 신규 예약은 접수되지 않습니다.
          </span>
        </p>
      ) : null}

      <section className="panel seller-sup-summary" aria-label="이번 달 예약 현황 요약">
        <dl className="seller-dash-stats">
          <div>
            <dt>전체 예약</dt>
            <dd>{summary.total}건</dd>
          </div>
          <div className="is-success">
            <dt>예약확정</dt>
            <dd>{summary.confirmed}건</dd>
          </div>
          <div className="is-info">
            <dt>예약접수</dt>
            <dd>{summary.received}건</dd>
          </div>
          <div className={summary.cancelRequested + summary.cancelled > 0 ? "is-danger" : undefined}>
            <dt>취소/취소요청</dt>
            <dd>{summary.cancelRequested + summary.cancelled}건</dd>
            <small className="seller-rsv-stat-sub">
              취소요청 {summary.cancelRequested} · 취소완료 {summary.cancelled}
            </small>
          </div>
        </dl>
        <dl className="seller-rsv-amounts">
          <div>
            <dt>월 판매금액</dt>
            <dd>{formatSellerReservationAmount(summary.salesAmount)}</dd>
          </div>
          <div>
            <dt>예상 판매수익</dt>
            <dd>{formatSellerReservationAmount(summary.expectedProfit)}</dd>
          </div>
          <p>이번 달 접수 기준 · 판매금액과 예상수익은 취소완료 예약을 제외하며, 정산 확정 전 금액입니다.</p>
        </dl>
        <p className="seller-sup-policy seller-prod-supplier-counts">
          {supplierOptions.map((option) => (
            <span key={option.supplierId}>
              {option.supplierName}{" "}
              {option.status === "승인대기" ? (
                <b>-</b>
              ) : (
                <b>
                  {option.reservationCount}건 · {formatSellerReservationAmount(option.salesAmount)}
                </b>
              )}
              {option.status !== "정상" ? <em className={option.status === "이용중지" ? "is-danger" : undefined}>{option.status}</em> : null}
            </span>
          ))}
        </p>
      </section>

      <section className="panel seller-sup-list" aria-labelledby="seller-rsv-list-title">
        <div className="panel-head">
          <div>
            <h2 id="seller-rsv-list-title">
              예약 목록 <span className="count">{filtered.length}</span>
            </h2>
            <p>최신 예약순으로 표시합니다.</p>
          </div>
        </div>

        <div className="seller-sup-toolbar seller-prod-toolbar seller-rsv-toolbar" role="search">
          <select
            className="seller-prod-select seller-rsv-period"
            aria-label="기간"
            value={filters.period}
            onChange={(event) => updateFilter("period", event.target.value as SellerReservationFilters["period"])}
          >
            {SELLER_RESERVATION_PERIODS.map((period) => (
              <option key={period.key} value={period.key}>
                {period.label}
              </option>
            ))}
          </select>
          {filters.period === "custom" ? (
            <span className="seller-rsv-range">
              <input
                type="date"
                aria-label="시작일"
                value={filters.from}
                onChange={(event) => updateFilter("from", event.target.value)}
              />
              <span aria-hidden="true">~</span>
              <input type="date" aria-label="종료일" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} />
            </span>
          ) : null}
          <label className="seller-sup-search" htmlFor="seller-rsv-keyword">
            <Search size={15} aria-hidden="true" />
            <input
              id="seller-rsv-keyword"
              type="search"
              value={filters.keyword}
              onChange={(event) => updateFilter("keyword", event.target.value)}
              placeholder="예약번호, 예약자명, 상품명 검색"
              aria-label="예약번호, 예약자명, 상품명 검색"
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
            aria-label="예약상태"
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value as SellerReservationFilters["status"])}
          >
            <option value="전체">전체 예약상태</option>
            {SELLER_RESERVATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="seller-prod-select"
            aria-label="결제상태"
            value={filters.paymentStatus}
            onChange={(event) => updateFilter("paymentStatus", event.target.value as SellerReservationFilters["paymentStatus"])}
          >
            <option value="전체">전체 결제상태</option>
            {SELLER_RESERVATION_PAYMENT_STATUSES.map((status) => (
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
          <span>예약금액 · 예상수익은 예약 당시 판매조건 기준입니다.</span>
        </p>

        {pageRows.length === 0 ? (
          <div className="seller-sup-empty">{renderEmpty()}</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="seller-dash-table seller-rsv-table">
                <thead>
                  <tr>
                    <th>예약번호</th>
                    <th>예약일</th>
                    <th>공급여행사</th>
                    <th>상품</th>
                    <th>예약자</th>
                    <th className="seller-rsv-pax">인원</th>
                    <th className="money">예약금액</th>
                    <th className="money">판매점 수익</th>
                    <th>예약상태</th>
                    <th>결제상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const { date, time } = formatSellerReservationDate(row.reservedAt);
                    const supplierStatus = supplierStatuses[row.supplierTravelAgencyId];
                    const currentProduct = productStatusByCode.get(row.productCode);
                    const productStopped =
                      currentProduct?.salesStatus === "판매중지" && currentProduct.stopCause !== "공급여행사 거래 이용중지";
                    const isCancelled = row.status === "취소완료";
                    return (
                      <tr key={row.reservationCode} className={isCancelled ? "is-cancelled" : undefined}>
                        <td data-label="예약번호">
                          <Link href={sellerReservationDetailPath(row.reservationCode)} className="seller-rsv-code">
                            {row.reservationCode}
                          </Link>
                        </td>
                        <td data-label="예약일">
                          <span className="seller-rsv-date">
                            <b>{date}</b>
                            <small>{time}</small>
                          </span>
                        </td>
                        <td data-label="공급여행사">
                          <span className="seller-prod-supplier">
                            <b>{row.supplierName}</b>
                            <small>{row.supplierCode}</small>
                            {supplierStatus === "이용중지" ? <em className="seller-rsv-flag">공급여행사 거래중지</em> : null}
                          </span>
                        </td>
                        <td data-label="상품">
                          <span className="seller-rsv-product">
                            <b>{row.productName}</b>
                            <small>
                              {row.productCode} · {row.saleMode}
                            </small>
                            {productStopped ? <em className="seller-rsv-flag">상품 판매중지</em> : null}
                          </span>
                        </td>
                        <td data-label="예약자">
                          <span className="seller-rsv-customer">
                            <b>{row.customerName}</b>
                            <small>{row.customerPhoneMasked}</small>
                          </span>
                        </td>
                        <td data-label="인원" className="seller-rsv-pax">
                          {row.pax}명
                        </td>
                        <td data-label="예약금액" className="money">
                          <span className="seller-prod-money">
                            <b>{formatSellerReservationAmount(sellerReservationAmount(row))}</b>
                            <small>
                              {formatSellerReservationAmount(row.unitPrice)} × {row.pax}
                            </small>
                          </span>
                        </td>
                        <td data-label="판매점 수익" className="money">
                          <span className={`seller-prod-money${isCancelled ? " is-excluded" : ""}`}>
                            <b>{formatSellerReservationAmount(sellerReservationExpectedProfit(row))}</b>
                            <small className={row.status === "취소요청" || row.status === "취소승인" ? "is-review" : undefined}>{profitNote(row)}</small>
                          </span>
                        </td>
                        <td data-label="예약상태">
                          <span className={`badge ${sellerReservationStatusBadgeClass(row.status)}`}>{row.status}</span>
                        </td>
                        <td data-label="결제상태">
                          <span className={`badge ${sellerReservationPaymentBadgeClass(row.paymentStatus)}`}>{row.paymentStatus}</span>
                        </td>
                        <td data-label="관리">
                          <Link
                            href={sellerReservationDetailPath(row.reservationCode)}
                            className="secondary seller-prod-view-link"
                            aria-label={`${row.reservationCode} 보기`}
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
                총 {filtered.length}건 중 {(currentPage - 1) * PAGE_SIZE + 1}-
                {Math.min(currentPage * PAGE_SIZE, filtered.length)}건 표시
              </span>
              <div className="pagination" aria-label="페이지네이션">
                <button
                  type="button"
                  aria-label="이전 페이지"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
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
                <button
                  type="button"
                  aria-label="다음 페이지"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
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
