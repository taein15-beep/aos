"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  EMPTY_SELLER_RESERVATION_FILTERS,
  SELLER_RESERVATION_DATE_BASIS_OPTIONS,
  SELLER_RESERVATION_STATUS_OPTIONS,
  formatSellerMoney,
  formatSellerResvDate,
  getSellerReservationDetailPath,
  getSellerReservationSummary,
  listSellerReservations,
  sellerReservationSettleBadgeClass,
  sellerReservationStatusBadgeClass,
  type SellerReservationFilters,
} from "@/lib/admin/members-seller-reservations-data";

type Props = {
  sellerId: string;
  sellerName: string;
};

export function SellerReservationsPanel({ sellerId, sellerName }: Props) {
  const [draft, setDraft] = useState<SellerReservationFilters>(EMPTY_SELLER_RESERVATION_FILTERS);
  const [applied, setApplied] = useState<SellerReservationFilters>(EMPTY_SELLER_RESERVATION_FILTERS);

  const rows = useMemo(() => listSellerReservations(sellerId, applied), [sellerId, applied]);
  const summary = useMemo(() => getSellerReservationSummary(sellerId, rows), [sellerId, rows]);

  return (
    <div className="member-affiliate-detail-stack member-seller-ops">
      <p className="member-affiliate-detail-hint" role="note">
        표시 중인 예약은 <strong>{sellerName}</strong> 판매점에서 발생한 Mock 예약입니다. 향후 예약관리 시스템과
        `sellerId` 기준으로 연결됩니다.
      </p>

      <section className="member-web-detail-summary" aria-label="예약현황 요약">
        <article className="member-web-detail-kpi">
          <span>
            <small>전체 예약</small>
            <strong>{summary.totalCount}건</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>확정 예약</small>
            <strong>{summary.confirmedCount}건</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>취소 예약</small>
            <strong>{summary.cancelledCount}건</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>총 판매금액</small>
            <strong>{formatSellerMoney(summary.salesTotal)}</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>예상 판매수수료</small>
            <strong>{formatSellerMoney(summary.commissionTotal)}</strong>
          </span>
        </article>
      </section>

      <section className="panel member-affiliate-filter member-seller-ops-filter">
        <div className="member-affiliate-filter-grid member-seller-resv-filter-grid">
          <label>
            <span>기간 기준</span>
            <select
              value={draft.dateBasis}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  dateBasis: event.target.value as SellerReservationFilters["dateBasis"],
                }))
              }
            >
              {SELLER_RESERVATION_DATE_BASIS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>시작일</span>
            <input
              type="date"
              value={draft.dateFrom}
              onChange={(event) => setDraft((current) => ({ ...current, dateFrom: event.target.value }))}
            />
          </label>
          <label>
            <span>종료일</span>
            <input
              type="date"
              value={draft.dateTo}
              onChange={(event) => setDraft((current) => ({ ...current, dateTo: event.target.value }))}
            />
          </label>
          <label>
            <span>통합검색</span>
            <input
              value={draft.keyword}
              onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))}
              placeholder="예약번호, 예약자명, 상품명"
              onKeyDown={(event) => {
                if (event.key === "Enter") setApplied({ ...draft });
              }}
            />
          </label>
          <label>
            <span>예약상태</span>
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as SellerReservationFilters["status"],
                }))
              }
            >
              {SELLER_RESERVATION_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="member-affiliate-filter-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setDraft(EMPTY_SELLER_RESERVATION_FILTERS);
              setApplied(EMPTY_SELLER_RESERVATION_FILTERS);
            }}
          >
            조건 초기화
          </button>
          <button type="button" className="primary" onClick={() => setApplied({ ...draft })}>
            <Search size={14} aria-hidden="true" />
            검색
          </button>
        </div>
      </section>

      <section className="panel member-affiliate-detail-card">
        <div className="member-affiliate-detail-card-head">
          <strong>예약 목록</strong>
          <span className="member-affiliate-detail-count">{rows.length}건</span>
        </div>
        {rows.length === 0 ? (
          <div className="member-affiliate-detail-empty">조건에 맞는 예약이 없습니다.</div>
        ) : (
          <div className="member-affiliate-detail-table-wrap">
            <table className="member-affiliate-detail-table member-seller-resv-table">
              <thead>
                <tr>
                  <th>예약번호</th>
                  <th>예약일</th>
                  <th>상품명</th>
                  <th>출발일</th>
                  <th>예약자</th>
                  <th>인원</th>
                  <th>판매금액</th>
                  <th>수수료</th>
                  <th>예약상태</th>
                  <th>정산상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.reservationCode}>
                    <td className="member-number">
                      <Link href={getSellerReservationDetailPath(row.reservationCode)} className="reservation-code-link">
                        {row.reservationCode}
                      </Link>
                    </td>
                    <td className="date-cell">{formatSellerResvDate(row.reservedAt)}</td>
                    <td className="text-left">{row.productName}</td>
                    <td className="date-cell">{formatSellerResvDate(row.departureAt)}</td>
                    <td>{row.customerName}</td>
                    <td>{row.pax}명</td>
                    <td className="amount-cell">{formatSellerMoney(row.salesAmount)}</td>
                    <td className="amount-cell">
                      <div className="member-seller-ops-commission">
                        <b>{formatSellerMoney(row.commissionAmount)}</b>
                        <small>{row.commissionRate}%</small>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${sellerReservationStatusBadgeClass(row.reservationStatus)}`}>
                        {row.reservationStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${sellerReservationSettleBadgeClass(row.settleStatus)}`}>
                        {row.settleStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
