"use client";

import { Eye, Info as InfoIcon, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SellerProductsMockControls } from "@/components/seller/SellerProductsMockControls";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import {
  SELLER_INVOICE_PERIODS,
  SELLER_INVOICE_STATUSES,
  defaultSellerInvoiceFilters,
  filterSellerInvoices,
  hasSellerInvoiceConditionFilter,
  sellerInvoiceDetailPath,
  sellerInvoiceStatusBadgeClass,
  summarizeSellerInvoices,
  type SellerInvoiceFilters,
} from "@/lib/seller/seller-invoices-data";
import type { SupplierTradeStatus } from "@/lib/seller/seller-login-mock";
import {
  SELLER_RESERVATION_BASE_DATE,
  SELLER_RESERVATION_PAYMENT_STATUSES,
  formatSellerReservationAmount,
  formatSellerReservationDate,
  sellerReservationDetailPath,
  sellerReservationPaymentBadgeClass,
} from "@/lib/seller/seller-reservations-data";
import { getSellerSupplierRelations, isJoinedOrApplied } from "@/lib/seller/seller-suppliers-data";
import { useSellerInvoices } from "@/lib/seller/use-seller-invoices-state";
import { useSellerProductsState } from "@/lib/seller/use-seller-products-state";
import { useSellerSession } from "@/lib/seller/use-seller-session";

const PAGE_SIZE = 10;
const MOCK_KEYS = ["hyundamSuspended"] as const;
const DEFAULT_FILTERS = defaultSellerInvoiceFilters(SELLER_RESERVATION_BASE_DATE);

type SupplierOption = {
  supplierId: string;
  supplierName: string;
  status: SupplierTradeStatus;
  invoiceCount: number;
};

export default function SellerInvoicesPage() {
  const session = useSellerSession();
  const sellerId = session?.sellerId ?? SELLER_ADMIN_DEMO_PROFILE.sellerId;

  const { mock, supplierStatuses } = useSellerProductsState(sellerId);
  const [filters, setFilters] = useState<SellerInvoiceFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const invoices = useSellerInvoices(sellerId);
  const monthInvoices = useMemo(() => filterSellerInvoices(invoices, DEFAULT_FILTERS, SELLER_RESERVATION_BASE_DATE), [invoices]);
  const summary = summarizeSellerInvoices(monthInvoices);
  const paymentCounts = SELLER_RESERVATION_PAYMENT_STATUSES.map((status) => ({
    status,
    count: monthInvoices.filter((invoice) => invoice.paymentStatus === status).length,
  }));

  const supplierOptions = useMemo<SupplierOption[]>(
    () =>
      getSellerSupplierRelations(sellerId, "normal")
        .filter(isJoinedOrApplied)
        .map((relation) => ({
          supplierId: relation.supplierId,
          supplierName: relation.supplierName,
          status: supplierStatuses[relation.supplierId] ?? (relation.status as SupplierTradeStatus),
          invoiceCount: monthInvoices.filter((invoice) => invoice.supplierTravelAgencyId === relation.supplierId).length,
        })),
    [sellerId, supplierStatuses, monthInvoices],
  );
  const suspendedSuppliers = supplierOptions.filter((option) => option.status === "이용중지" && option.invoiceCount > 0);

  const filtered = useMemo(() => filterSellerInvoices(invoices, filters, SELLER_RESERVATION_BASE_DATE), [invoices, filters]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedSupplier = supplierOptions.find((option) => option.supplierId === filters.supplierId) ?? null;
  const filterActive = filters.period !== DEFAULT_FILTERS.period || hasSellerInvoiceConditionFilter(filters);

  const updateFilter = <K extends keyof SellerInvoiceFilters>(key: K, value: SellerInvoiceFilters[K]) => {
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
          <h3>인보이스가 없습니다.</h3>
          <p>{selectedSupplier.supplierName}는 현재 가입 승인대기 상태입니다.</p>
        </>
      );
    }
    return (
      <>
        <h3>조건에 맞는 인보이스가 없습니다.</h3>
        <p>검색어 또는 필터 조건을 변경해주세요.</p>
        <button type="button" className="secondary" onClick={resetFilters}>
          조건 초기화
        </button>
      </>
    );
  };

  return (
    <div className="seller-invoices-page">
      <section className="page-head seller-sup-head">
        <div>
          <h1>인보이스</h1>
          <p>예약 및 결제정보를 기준으로 발행된 인보이스를 확인합니다.</p>
        </div>
      </section>

      {suspendedSuppliers.length > 0 ? (
        <p className="seller-prod-notice seller-rsv-notice is-danger" role="note">
          <InfoIcon size={14} aria-hidden="true" />
          <span>
            {suspendedSuppliers.map((option) => option.supplierName).join(", ")}와의 거래가 이용중지되었습니다. 기존 인보이스는 계속
            조회할 수 있습니다.
          </span>
        </p>
      ) : null}

      <section className="panel seller-sup-summary" aria-label="이번 달 인보이스 현황 요약">
        <dl className="seller-dash-stats">
          <div>
            <dt>전체 인보이스</dt>
            <dd>{summary.total}건</dd>
          </div>
          <div className="is-success">
            <dt>정상</dt>
            <dd>{summary.normal}건</dd>
          </div>
          <div className={summary.reissue > 0 ? "is-warn" : undefined}>
            <dt>재발행 필요</dt>
            <dd>{summary.reissue}건</dd>
          </div>
          <div className={summary.cancelled + summary.voided > 0 ? "is-danger" : undefined}>
            <dt>취소/무효</dt>
            <dd>{summary.cancelled + summary.voided}건</dd>
            <small className="seller-rsv-stat-sub">
              취소 {summary.cancelled} · 무효 {summary.voided}
            </small>
          </div>
        </dl>
        <p className="seller-sup-policy seller-prod-supplier-counts">
          {supplierOptions.map((option) => (
            <span key={option.supplierId}>
              {option.supplierName} <b>{option.status === "승인대기" ? "-" : `${option.invoiceCount}건`}</b>
              {option.status !== "정상" ? <em className={option.status === "이용중지" ? "is-danger" : undefined}>{option.status}</em> : null}
            </span>
          ))}
        </p>
        <p className="seller-sup-policy seller-prod-supplier-counts seller-inv-payment-counts">
          {paymentCounts.map((item) => (
            <span key={item.status}>
              {item.status} <b>{item.count}건</b>
            </span>
          ))}
        </p>
      </section>

      <section className="panel seller-sup-list" aria-labelledby="seller-inv-list-title">
        <div className="panel-head">
          <div>
            <h2 id="seller-inv-list-title">
              인보이스 목록 <span className="count">{filtered.length}</span>
            </h2>
            <p>최신 발행일순으로 표시합니다.</p>
          </div>
        </div>

        <div className="seller-sup-toolbar seller-prod-toolbar seller-rsv-toolbar" role="search">
          <select
            className="seller-prod-select seller-rsv-period"
            aria-label="기간"
            value={filters.period}
            onChange={(event) => updateFilter("period", event.target.value as SellerInvoiceFilters["period"])}
          >
            {SELLER_INVOICE_PERIODS.map((period) => (
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
          <label className="seller-sup-search" htmlFor="seller-inv-keyword">
            <Search size={15} aria-hidden="true" />
            <input
              id="seller-inv-keyword"
              type="search"
              value={filters.keyword}
              onChange={(event) => updateFilter("keyword", event.target.value)}
              placeholder="인보이스번호, 예약번호, 예약자명, 상품명 검색"
              aria-label="인보이스번호, 예약번호, 예약자명, 상품명 검색"
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
            aria-label="인보이스 상태"
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value as SellerInvoiceFilters["status"])}
          >
            <option value="전체">전체 상태</option>
            {SELLER_INVOICE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="seller-prod-select"
            aria-label="결제상태"
            value={filters.paymentStatus}
            onChange={(event) => updateFilter("paymentStatus", event.target.value as SellerInvoiceFilters["paymentStatus"])}
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
          <span>인보이스 금액은 발행 시점의 예약 당시 금액 기준입니다. 고객용 영수증 · 세금계산서가 아닙니다.</span>
        </p>

        {pageRows.length === 0 ? (
          <div className="seller-sup-empty">{renderEmpty()}</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="seller-dash-table seller-rsv-table seller-inv-table">
                <thead>
                  <tr>
                    <th>인보이스번호</th>
                    <th>발행일</th>
                    <th>예약번호</th>
                    <th>공급여행사</th>
                    <th>상품</th>
                    <th>예약자</th>
                    <th className="money">인보이스 금액</th>
                    <th>결제상태</th>
                    <th>인보이스 상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const { date, time } = formatSellerReservationDate(row.issuedAt);
                    const amountMismatch = !row.cancelSettlement && row.amount !== row.reservationAmount;
                    const pendingCancelFee = row.status === "재발행 필요" && row.cancelSettlement ? row.cancelSettlement.cancelFee : null;
                    const isClosed = row.status === "취소" || row.status === "무효";
                    return (
                      <tr key={row.invoiceCode} className={isClosed ? "is-cancelled" : undefined}>
                        <td data-label="인보이스번호">
                          <Link href={sellerInvoiceDetailPath(row.invoiceCode)} className="seller-rsv-code">
                            {row.invoiceCode}
                          </Link>
                        </td>
                        <td data-label="발행일">
                          <span className="seller-rsv-date">
                            <b>{date}</b>
                            <small>{time}</small>
                          </span>
                        </td>
                        <td data-label="예약번호">
                          <Link href={sellerReservationDetailPath(row.reservationCode)} className="seller-rsv-code">
                            {row.reservationCode}
                          </Link>
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
                        <td data-label="상품">
                          <span className="seller-rsv-product">
                            <b>{row.productName}</b>
                            <small>{row.productCode}</small>
                          </span>
                        </td>
                        <td data-label="예약자">
                          <span className="seller-rsv-customer">
                            <b>{row.customerName}</b>
                            <small>{row.customerPhoneMasked}</small>
                          </span>
                        </td>
                        <td data-label="인보이스 금액" className="money">
                          <span className={`seller-prod-money${isClosed ? " is-excluded" : ""}`}>
                            <b>{formatSellerReservationAmount(row.amount)}</b>
                            {amountMismatch ? (
                              <small className="is-review">예약금액 {formatSellerReservationAmount(row.reservationAmount)}</small>
                            ) : null}
                            {pendingCancelFee !== null ? (
                              <small className="is-review">취소수수료 {formatSellerReservationAmount(pendingCancelFee)}</small>
                            ) : null}
                            {row.currentVersion > 1 ? <small>v{row.currentVersion} 재발행 금액</small> : null}
                          </span>
                        </td>
                        <td data-label="결제상태">
                          <span className={`badge ${sellerReservationPaymentBadgeClass(row.paymentStatus)}`}>{row.paymentStatus}</span>
                        </td>
                        <td data-label="인보이스 상태">
                          <span className="seller-inv-status">
                            <span className="seller-inv-status-badges">
                              <span className={`badge ${sellerInvoiceStatusBadgeClass(row.status)}`}>{row.status}</span>
                              {row.currentVersion > 1 ? <span className="badge gray seller-inv-version">v{row.currentVersion}</span> : null}
                            </span>
                            {row.statusNote ? (
                              <small className={row.status === "정상" || row.status === "재발행 필요" ? "is-review" : undefined}>
                                {row.statusNote}
                              </small>
                            ) : null}
                          </span>
                        </td>
                        <td data-label="관리">
                          <Link
                            href={sellerInvoiceDetailPath(row.invoiceCode)}
                            className="secondary seller-prod-view-link"
                            aria-label={`${row.invoiceCode} 보기`}
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
