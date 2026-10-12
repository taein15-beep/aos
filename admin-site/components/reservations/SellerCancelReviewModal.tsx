"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Info, Receipt } from "lucide-react";
import {
  formatKrw,
  formatPeopleLabel,
  parseKrw,
  paymentStatusBadgeClass,
  reserveStatusBadgeClass,
  type ReservationBookingTerms,
  type ReservationDetail,
  type ReservationSellerCancelRequest,
} from "@/lib/admin/reservations-data";
import {
  SELLER_CANCEL_MEMO_MAX,
  SELLER_CANCEL_REJECT_REASONS,
  formatSellerCancelDaysBefore,
  parseSellerCancelFee,
  resolveSellerCancelPolicy,
  sellerCancelRecommendedFee,
  sellerCancelRefundAmount,
  type SellerCancelRejectReason,
} from "@/lib/admin/seller-channel-reservations";
import { formatSellerCancelPolicyRule } from "@/lib/seller/seller-product-detail-data";

export type SellerCancelApproveInput = {
  recommendedFee: number;
  cancellationFee: number;
  refundAmount: number;
  memo: string;
};

export type SellerCancelRejectInput = { reason: SellerCancelRejectReason; reasonDetail: string | null };

type Decision = "approve" | "reject";

function dotted(value: string) {
  return value.replace(/-/g, ".");
}

function ReviewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function SellerCancelReviewModal({
  reservation,
  terms,
  request,
  suspended,
  onClose,
  onApprove,
  onReject,
}: {
  reservation: ReservationDetail;
  terms: ReservationBookingTerms;
  request: ReservationSellerCancelRequest;
  /** 확인 Dialog가 열려 있으면 ESC 닫기를 막습니다. */
  suspended: boolean;
  onClose: () => void;
  onApprove: (input: SellerCancelApproveInput) => void;
  onReject: (input: SellerCancelRejectInput) => void;
}) {
  const paidAmount = parseKrw(reservation.paidAmount);
  const unpaidAmount = parseKrw(reservation.unpaidAmount);
  const policy = useMemo(
    () => resolveSellerCancelPolicy(terms.cancelPolicy, reservation.departureAt, request.requestedAt),
    [terms.cancelPolicy, reservation.departureAt, request.requestedAt],
  );
  const recommendedFee = sellerCancelRecommendedFee(terms.amount, policy.rate);
  const defaultFee = Math.min(recommendedFee, paidAmount);
  const cappedByPaid = recommendedFee > paidAmount;

  const [feeInput, setFeeInput] = useState(() => defaultFee.toLocaleString("ko-KR"));
  const [decision, setDecision] = useState<Decision | null>(null);
  const [memo, setMemo] = useState("");
  const [rejectReason, setRejectReason] = useState<SellerCancelRejectReason | "">("");
  const [rejectDetail, setRejectDetail] = useState("");

  const fee = parseSellerCancelFee(feeInput, paidAmount);
  const appliedFee = fee.value ?? 0;
  const refundAmount = sellerCancelRefundAmount(paidAmount, fee.error ? 0 : appliedFee);
  const differsFromPolicy = !fee.error && appliedFee !== recommendedFee && !(cappedByPaid && appliedFee === defaultFee);
  const exempt = !fee.error && appliedFee === 0 && paidAmount > 0;

  const rejectValid = rejectReason !== "" && (rejectReason !== "기타" || rejectDetail.trim().length > 0);
  const canSubmit = decision === "approve" ? !fee.error : decision === "reject" ? rejectValid : false;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !suspended) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, suspended]);

  const changeFee = (raw: string) => {
    const cleaned = raw.replace(/,/g, "").trim();
    setFeeInput(/^\d+$/.test(cleaned) ? Number(cleaned).toLocaleString("ko-KR") : raw);
  };

  const submit = () => {
    if (!canSubmit) return;
    if (decision === "approve") {
      onApprove({ recommendedFee, cancellationFee: appliedFee, refundAmount, memo: memo.trim() });
      return;
    }
    if (rejectReason) onReject({ reason: rejectReason, reasonDetail: rejectReason === "기타" ? rejectDetail.trim() : null });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="member-web-suspend-modal seller-cancel-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-cancel-review-title"
      >
        <div className="modal-head">
          <div>
            <span className="danger">
              <Receipt size={17} />
            </span>
            <div className="seller-cancel-review-title">
              <h3 id="seller-cancel-review-title">취소요청 검토</h3>
              <small>{reservation.code}</small>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="member-web-suspend-body seller-cancel-review-body">
          <div className="seller-cancel-review-grid">
            <div className="seller-cancel-review-col">
              <section className="seller-cancel-review-section">
                <h4>예약정보</h4>
                <dl className="seller-cancel-review-dl">
                  <ReviewRow label="예약번호">{reservation.code}</ReviewRow>
                  <ReviewRow label="여행일">{dotted(reservation.departureAt)}</ReviewRow>
                  <ReviewRow label="상품명">{reservation.productName}</ReviewRow>
                  <ReviewRow label="고객명">{reservation.bookerName}</ReviewRow>
                  <ReviewRow label="인원">{formatPeopleLabel(reservation.counts)}</ReviewRow>
                  <ReviewRow label="상태">
                    <span className={`badge ${reserveStatusBadgeClass(reservation.reserveStatus)}`}>{reservation.reserveStatus}</span>
                    <span className={`badge ${paymentStatusBadgeClass(reservation.paymentStatus)}`}>{reservation.paymentStatus}</span>
                  </ReviewRow>
                </dl>
              </section>

              <section className="seller-cancel-review-section">
                <h4>판매점 취소요청</h4>
                <dl className="seller-cancel-review-dl">
                  <ReviewRow label="요청 판매점">
                    {request.sellerName} <small>{request.sellerCode}</small>
                  </ReviewRow>
                  <ReviewRow label="요청일시">{dotted(request.requestedAt)}</ReviewRow>
                  <ReviewRow label="취소사유">{request.reason}</ReviewRow>
                  <ReviewRow label="고객 요청내용">{request.customerNote || "-"}</ReviewRow>
                </dl>
              </section>

              <section className="seller-cancel-review-section">
                <h4>결제정보</h4>
                <dl className="seller-cancel-review-dl">
                  <ReviewRow label="총 예약금액">{reservation.totalAmount}</ReviewRow>
                  <ReviewRow label="결제금액">{reservation.paidAmount}</ReviewRow>
                  <ReviewRow label="미결제금액">{formatKrw(unpaidAmount)}</ReviewRow>
                  <ReviewRow label="결제수단">{reservation.paymentMethod ?? "-"}</ReviewRow>
                  <ReviewRow label="결제일시">{reservation.paidAt ?? "-"}</ReviewRow>
                </dl>
              </section>

              <section className="seller-cancel-review-section">
                <h4>
                  취소정책 <span className="badge gray">읽기 전용</span>
                </h4>
                <dl className="seller-cancel-review-dl">
                  <ReviewRow label="여행일">{dotted(reservation.departureAt)}</ReviewRow>
                  <ReviewRow label="취소요청일">{dotted(request.requestedAt.slice(0, 10))}</ReviewRow>
                  <ReviewRow label="취소 기준">{formatSellerCancelDaysBefore(policy.daysBefore)}</ReviewRow>
                  <ReviewRow label="적용 취소정책">
                    <b className="seller-cancel-review-policy-label">{policy.label}</b>
                  </ReviewRow>
                </dl>
                <ul className="seller-cancel-review-policy" aria-label="공급여행사 취소정책">
                  {terms.cancelPolicy.map((rule) => {
                    const active = policy.rule === rule;
                    return (
                      <li key={`${rule.minDays}-${rule.maxDays}`} className={active ? "is-active" : ""}>
                        <span>{formatSellerCancelPolicyRule(rule)}</span>
                        {active && <span className="badge info">적용</span>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>

            <div className="seller-cancel-review-col">
              <section className="seller-cancel-review-section">
                <h4>취소수수료</h4>
                <dl className="seller-cancel-review-dl seller-cancel-review-dl--single">
                  <ReviewRow label="정책 기준 수수료">
                    {formatKrw(recommendedFee)}
                    <small>
                      {formatKrw(terms.amount)} × {policy.rate}%
                    </small>
                  </ReviewRow>
                </dl>
                <label className={fee.error ? "invalid" : ""}>
                  <span>
                    적용 취소수수료 <b>*</b>
                  </span>
                  <div className="seller-cancel-review-fee">
                    <input
                      id="seller-cancel-review-fee"
                      inputMode="numeric"
                      value={feeInput}
                      onChange={(event) => changeFee(event.target.value)}
                      aria-invalid={Boolean(fee.error)}
                      aria-describedby="seller-cancel-review-fee-help"
                    />
                    <em>원</em>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setFeeInput(defaultFee.toLocaleString("ko-KR"))}
                      disabled={!fee.error && appliedFee === defaultFee}
                    >
                      정책 기준 적용
                    </button>
                  </div>
                  <small id="seller-cancel-review-fee-help" className={fee.error ? "error" : ""}>
                    {fee.error ?? `결제금액 ${reservation.paidAmount} 이내에서 조정할 수 있습니다.`}
                  </small>
                </label>
                {paidAmount === 0 && (
                  <p className="seller-cancel-review-note">
                    <Info size={13} />
                    미결제 예약으로 환불할 결제금액이 없습니다. 취소수수료와 환불예정금액은 0원으로 처리됩니다.
                  </p>
                )}
                {cappedByPaid && paidAmount > 0 && (
                  <p className="seller-cancel-review-note">
                    <Info size={13} />
                    정책 기준 수수료가 결제금액을 초과하여 결제금액 한도({reservation.paidAmount})로 적용합니다.
                  </p>
                )}
                {differsFromPolicy && (
                  <p className="seller-cancel-review-note is-warn" role="status">
                    <AlertTriangle size={13} />
                    기본 취소정책과 다른 금액이 적용됩니다.
                  </p>
                )}
                {exempt && (
                  <p className="seller-cancel-review-note is-warn">
                    <AlertTriangle size={13} />
                    취소수수료 면제
                  </p>
                )}
                <dl className="seller-cancel-review-compare">
                  <div>
                    <dt>정책 기준</dt>
                    <dd>{formatKrw(recommendedFee)}</dd>
                  </div>
                  <div>
                    <dt>적용 수수료</dt>
                    <dd>{fee.error ? "-" : formatKrw(appliedFee)}</dd>
                  </div>
                </dl>
              </section>

              <section className="seller-cancel-review-section">
                <h4>환불예정금액</h4>
                <dl className="seller-cancel-review-formula">
                  <div>
                    <dt>결제금액</dt>
                    <dd>{reservation.paidAmount}</dd>
                  </div>
                  <div>
                    <dt>적용 취소수수료</dt>
                    <dd>- {fee.error ? "-" : formatKrw(appliedFee)}</dd>
                  </div>
                  <div className="is-total">
                    <dt>환불예정금액</dt>
                    <dd>{fee.error ? "-" : formatKrw(refundAmount)}</dd>
                  </div>
                </dl>
                <p className="seller-cancel-review-hint">실제 환불은 승인 후 취소처리 단계에서 진행합니다.</p>
              </section>

              <section className="seller-cancel-review-section">
                <h4>판매점 예상수익</h4>
                <dl className="seller-cancel-review-formula">
                  <div>
                    <dt>예약 당시 조건 기준</dt>
                    <dd>{formatKrw(terms.sellerProfit)}</dd>
                  </div>
                  <div className="is-total">
                    <dt>취소승인 후</dt>
                    <dd>0원</dd>
                  </div>
                </dl>
                <p className="seller-cancel-review-hint">실제 정산 반영은 다음 단계에서 진행됩니다.</p>
              </section>

              <section className="seller-cancel-review-section">
                <h4>
                  처리결정 <b className="seller-cancel-review-required">*</b>
                </h4>
                <div className="member-web-suspend-period-options seller-cancel-review-decision" role="radiogroup" aria-label="처리결정">
                  <label>
                    <input
                      type="radio"
                      name="seller-cancel-decision"
                      checked={decision === "approve"}
                      onChange={() => setDecision("approve")}
                    />
                    취소 승인
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="seller-cancel-decision"
                      checked={decision === "reject"}
                      onChange={() => setDecision("reject")}
                    />
                    취소 거절
                  </label>
                </div>
                {decision === "approve" && (
                  <label>
                    <span>처리메모 (선택)</span>
                    <textarea
                      id="seller-cancel-review-memo"
                      rows={3}
                      maxLength={SELLER_CANCEL_MEMO_MAX}
                      value={memo}
                      onChange={(event) => setMemo(event.target.value)}
                      placeholder="공급여행사 내부 처리메모를 입력하세요."
                    />
                    <small>
                      {memo.length} / {SELLER_CANCEL_MEMO_MAX}
                    </small>
                  </label>
                )}
                {decision === "reject" && (
                  <>
                    <label>
                      <span>
                        거절사유 <b>*</b>
                      </span>
                      <select
                        id="seller-cancel-review-reject-reason"
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value as SellerCancelRejectReason | "")}
                      >
                        <option value="">거절사유 선택</option>
                        {SELLER_CANCEL_REJECT_REASONS.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </label>
                    {rejectReason === "기타" && (
                      <label className={rejectDetail.trim() ? "" : "invalid"}>
                        <span>
                          거절사유 상세 <b>*</b>
                        </span>
                        <textarea
                          id="seller-cancel-review-reject-detail"
                          rows={3}
                          maxLength={SELLER_CANCEL_MEMO_MAX}
                          value={rejectDetail}
                          onChange={(event) => setRejectDetail(event.target.value)}
                          placeholder="거절사유를 입력하세요."
                        />
                        <small>
                          {rejectDetail.length} / {SELLER_CANCEL_MEMO_MAX}
                        </small>
                      </label>
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
          <button
            type="button"
            className={decision === "reject" ? "danger-button seller-cancel-review-submit" : "primary seller-cancel-review-submit"}
            onClick={submit}
            disabled={!canSubmit}
          >
            {decision === "reject" ? "취소 거절" : decision === "approve" ? "취소 승인" : "처리결정 선택"}
          </button>
        </div>
      </div>
    </div>
  );
}
