"use client";

import { useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";
import type { SellerType } from "@/lib/admin/members-seller-data";
import {
  EMPTY_SELLER_SETTLEMENT_FILTERS,
  SELLER_SETTLEMENT_STATUS_OPTIONS,
  formatSellerMoney,
  formatSellerPaidDate,
  formatSellerSettlementPeriod,
  getSellerSettlementAccount,
  getSellerSettlementById,
  getSellerSettlementSummary,
  listSellerSettlements,
  sellerSettlementStatusBadgeClass,
  type SellerSettlementFilters,
  type SellerSettlementRow,
} from "@/lib/admin/members-seller-settlements-data";

type Props = {
  sellerId: string;
  sellerName: string;
  sellerType: SellerType;
  onNotify: (message: string) => void;
};

export function SellerSettlementsPanel({ sellerId, sellerName, sellerType, onNotify }: Props) {
  const [draft, setDraft] = useState<SellerSettlementFilters>(EMPTY_SELLER_SETTLEMENT_FILTERS);
  const [applied, setApplied] = useState<SellerSettlementFilters>(EMPTY_SELLER_SETTLEMENT_FILTERS);
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => listSellerSettlements(sellerId, applied), [sellerId, applied]);
  const summary = useMemo(() => getSellerSettlementSummary(sellerId), [sellerId]);
  const account = useMemo(() => getSellerSettlementAccount(sellerId, sellerType), [sellerId, sellerType]);
  const detail: SellerSettlementRow | null = detailId
    ? getSellerSettlementById(sellerId, detailId)
    : null;

  return (
    <div className="member-affiliate-detail-stack member-seller-ops">
      <section className="member-web-detail-summary" aria-label="정산현황 요약">
        <article className="member-web-detail-kpi">
          <span>
            <small>정산예정</small>
            <strong>{formatSellerMoney(summary.scheduledAmount)}</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>정산완료</small>
            <strong>{formatSellerMoney(summary.completedAmount)}</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>미정산</small>
            <strong>{formatSellerMoney(summary.unpaidAmount)}</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>이번달 판매금액</small>
            <strong>{formatSellerMoney(summary.monthSalesAmount)}</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>이번달 수수료</small>
            <strong>{formatSellerMoney(summary.monthCommissionAmount)}</strong>
          </span>
        </article>
      </section>

      <section className="panel member-affiliate-detail-card" aria-labelledby="seller-settle-account-title">
        <div className="member-affiliate-detail-card-head">
          <strong id="seller-settle-account-title">정산계좌</strong>
          <span className={`badge ${sellerType === "business" ? "info" : "gray"}`}>
            {sellerType === "business" ? "사업자" : "개인"}
          </span>
          <button
            type="button"
            className="secondary"
            onClick={() => onNotify("정산계좌 수정은 다음 단계에서 제공합니다.")}
          >
            <Pencil size={14} aria-hidden="true" />
            정산계좌 수정
          </button>
        </div>
        <div className="member-affiliate-detail-info-grid">
          <div className="member-affiliate-detail-field">
            <span>은행</span>
            <strong>{account.bankName}</strong>
          </div>
          <div className="member-affiliate-detail-field">
            <span>계좌번호</span>
            <strong>{account.accountNumber}</strong>
          </div>
          <div className="member-affiliate-detail-field">
            <span>예금주</span>
            <strong>{account.accountHolder}</strong>
          </div>
          {account.sellerType === "business" ? (
            <div className="member-affiliate-detail-field">
              <span>사업자명</span>
              <strong>{account.businessName}</strong>
            </div>
          ) : (
            <div className="member-affiliate-detail-field">
              <span>판매점</span>
              <strong>{sellerName}</strong>
            </div>
          )}
        </div>
        <p className="member-affiliate-detail-hint member-affiliate-detail-hint--pad">
          {account.sellerType === "business"
            ? "사업자 판매점 정산계좌입니다. 세금계산서·부가세 정책은 추후 반영 예정입니다."
            : "개인 판매점 정산계좌입니다. 원천징수 등 세금 정책은 추후 반영 예정입니다."}
        </p>
      </section>

      <section className="panel member-affiliate-filter member-seller-ops-filter">
        <div className="member-affiliate-filter-grid member-seller-settle-filter-grid">
          <label>
            <span>정산번호 검색</span>
            <input
              value={draft.keyword}
              onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))}
              placeholder="정산번호"
              onKeyDown={(event) => {
                if (event.key === "Enter") setApplied({ ...draft });
              }}
            />
          </label>
          <label>
            <span>정산상태</span>
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as SellerSettlementFilters["status"],
                }))
              }
            >
              {SELLER_SETTLEMENT_STATUS_OPTIONS.map((option) => (
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
              setDraft(EMPTY_SELLER_SETTLEMENT_FILTERS);
              setApplied(EMPTY_SELLER_SETTLEMENT_FILTERS);
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
          <strong>정산 목록</strong>
          <span className="member-affiliate-detail-count">{rows.length}건</span>
        </div>
        {rows.length === 0 ? (
          <div className="member-affiliate-detail-empty">조건에 맞는 정산 내역이 없습니다.</div>
        ) : (
          <div className="member-affiliate-detail-table-wrap">
            <table className="member-affiliate-detail-table member-seller-settle-table">
              <thead>
                <tr>
                  <th>정산번호</th>
                  <th>정산기간</th>
                  <th>예약건수</th>
                  <th>판매금액</th>
                  <th>취소금액</th>
                  <th>정산대상금액</th>
                  <th>판매수수료</th>
                  <th>조정금액</th>
                  <th>최종정산금액</th>
                  <th>정산상태</th>
                  <th>지급일</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.settlementId}>
                    <td className="member-number">
                      <button
                        type="button"
                        className="reservation-code-link member-seller-settle-id-btn"
                        onClick={() => setDetailId(row.settlementId)}
                      >
                        {row.settlementId}
                      </button>
                    </td>
                    <td className="date-cell">{formatSellerSettlementPeriod(row.periodFrom, row.periodTo)}</td>
                    <td>{row.reservationCount}건</td>
                    <td className="amount-cell">{formatSellerMoney(row.salesAmount)}</td>
                    <td className="amount-cell">{formatSellerMoney(row.cancelAmount)}</td>
                    <td className="amount-cell">{formatSellerMoney(row.settleTargetAmount)}</td>
                    <td className="amount-cell">{formatSellerMoney(row.commissionAmount)}</td>
                    <td className="amount-cell">{formatSellerMoney(row.adjustmentAmount)}</td>
                    <td className="amount-cell">
                      <strong>{formatSellerMoney(row.finalAmount)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${sellerSettlementStatusBadgeClass(row.status)}`}>{row.status}</span>
                    </td>
                    <td className="date-cell">{formatSellerPaidDate(row.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setDetailId(null)}>
          <div
            className="modal member-affiliate-review-modal member-affiliate-review-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-settle-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="seller-settle-detail-title">정산 상세</h3>
              <button type="button" onClick={() => setDetailId(null)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <div className="member-affiliate-review-modal-summary">
                <div>
                  <span>정산번호</span>
                  <b>{detail.settlementId}</b>
                </div>
                <div>
                  <span>정산기간</span>
                  <b>{formatSellerSettlementPeriod(detail.periodFrom, detail.periodTo)}</b>
                </div>
                <div>
                  <span>정산상태</span>
                  <b>
                    <span className={`badge ${sellerSettlementStatusBadgeClass(detail.status)}`}>{detail.status}</span>
                  </b>
                </div>
                <div>
                  <span>최종 지급금액</span>
                  <b>{formatSellerMoney(detail.finalAmount)}</b>
                </div>
                <div>
                  <span>판매금액</span>
                  <b>{formatSellerMoney(detail.salesAmount)}</b>
                </div>
                <div>
                  <span>취소금액</span>
                  <b>{formatSellerMoney(detail.cancelAmount)}</b>
                </div>
                <div>
                  <span>판매수수료</span>
                  <b>{formatSellerMoney(detail.commissionAmount)}</b>
                </div>
                <div>
                  <span>조정금액</span>
                  <b>{formatSellerMoney(detail.adjustmentAmount)}</b>
                </div>
              </div>

              <strong className="member-seller-settle-detail-subtitle">대상 예약</strong>
              <div className="member-affiliate-detail-table-wrap">
                <table className="member-affiliate-detail-table member-seller-settle-detail-table">
                  <thead>
                    <tr>
                      <th>예약번호</th>
                      <th>상품</th>
                      <th>판매금액</th>
                      <th>취소금액</th>
                      <th>수수료율</th>
                      <th>수수료</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lineItems.map((item) => (
                      <tr key={`${detail.settlementId}-${item.reservationCode}`}>
                        <td className="member-number">{item.reservationCode}</td>
                        <td className="text-left">{item.productName}</td>
                        <td className="amount-cell">{formatSellerMoney(item.salesAmount)}</td>
                        <td className="amount-cell">{formatSellerMoney(item.cancelAmount)}</td>
                        <td>{item.commissionRate}%</td>
                        <td className="amount-cell">{formatSellerMoney(item.commissionAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detail.taxPolicyPlaceholder ? (
                <p className="member-affiliate-detail-hint">{detail.taxPolicyPlaceholder.note}</p>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setDetailId(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
