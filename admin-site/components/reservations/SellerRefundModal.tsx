"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Info, Wallet } from "lucide-react";
import {
  SELLER_REFUND_METHODS,
  formatKrw,
  paymentStatusBadgeClass,
  type ReservationDetail,
  type ReservationSellerCancelRequest,
  type ReservationSellerRefund,
  type ReservationSellerRefundMethod,
} from "@/lib/admin/reservations-data";
import { SELLER_REFUND_MEMO_MAX } from "@/lib/admin/seller-channel-reservations";

export type SellerRefundInput = {
  method: ReservationSellerRefundMethod;
  memo: string;
  bankAccount: ReservationSellerRefund["bankAccount"];
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function maskAccount(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length <= 4 ? "****" : `${"*".repeat(Math.min(8, digits.length - 4))}${digits.slice(-4)}`;
}

export function SellerRefundModal({
  reservation,
  request,
  approvalNumber,
  retry,
  processing,
  failureScenario,
  suspended,
  onClose,
  onSubmit,
}: {
  reservation: ReservationDetail;
  request: ReservationSellerCancelRequest & { approval: NonNullable<ReservationSellerCancelRequest["approval"]> };
  approvalNumber: string;
  retry: boolean;
  processing: boolean;
  /** 환불실패 테스트 예약 (QA SAMPLE) */
  failureScenario: boolean;
  suspended: boolean;
  onClose: () => void;
  onSubmit: (input: SellerRefundInput) => void;
}) {
  const { approval } = request;
  const [method, setMethod] = useState<ReservationSellerRefundMethod>(request.refund?.method ?? "원결제수단 환불");
  const [memo, setMemo] = useState(request.refund?.memo ?? "");
  const [holder, setHolder] = useState("");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");

  const isBank = method === "계좌환불";
  const accountValid = /^[\d-]{6,}$/.test(account.trim());
  const bankValid = !isBank || (holder.trim().length > 0 && bank.trim().length > 0 && accountValid);
  const canSubmit = bankValid && !processing;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !suspended && !processing) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, suspended, processing]);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      method,
      memo: memo.trim(),
      bankAccount: isBank ? { holder: holder.trim(), bank: bank.trim(), accountMasked: maskAccount(account) } : null,
    });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="member-web-suspend-modal seller-cancel-review-modal seller-refund-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-refund-title"
      >
        <div className="modal-head">
          <div>
            <span className="info">
              <Wallet size={17} />
            </span>
            <div className="seller-cancel-review-title">
              <h3 id="seller-refund-title">{retry ? "환불 재시도" : "환불처리"}</h3>
              <small>{reservation.code}</small>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" disabled={processing}>
            ×
          </button>
        </div>

        <div className="member-web-suspend-body seller-cancel-review-body">
          <p className="seller-cancel-review-note">
            <Info size={13} />
            Prototype 화면으로 실제 결제 취소는 실행되지 않습니다.
          </p>
          {retry && (
            <p className="seller-cancel-review-note is-warn" role="alert">
              <AlertTriangle size={13} />
              이전 환불처리에 실패했습니다. 환불정보를 확인한 후 다시 처리해주세요.
            </p>
          )}
          {failureScenario && !retry && (
            <p className="seller-cancel-review-note is-warn">
              <AlertTriangle size={13} />
              환불실패 테스트 예약입니다. 첫 환불처리는 실패로 기록되고, 재시도 시 완료됩니다.
            </p>
          )}

          <div className="seller-cancel-review-grid">
            <div className="seller-cancel-review-col">
              <section className="seller-cancel-review-section">
                <h4>환불 대상정보</h4>
                <dl className="seller-cancel-review-dl">
                  <Row label="예약번호">{reservation.code}</Row>
                  <Row label="예약자">{reservation.bookerName}</Row>
                  <Row label="판매점">
                    {request.sellerName} <small>{request.sellerCode}</small>
                  </Row>
                  <Row label="상품">{reservation.productName}</Row>
                  <Row label="환불사유">예약 취소승인</Row>
                  <Row label="취소사유">{request.reason}</Row>
                </dl>
              </section>

              <section className="seller-cancel-review-section">
                <h4>결제정보</h4>
                <dl className="seller-cancel-review-dl">
                  <Row label="결제수단">{reservation.paymentMethod ?? "-"}</Row>
                  <Row label="결제일시">{reservation.paidAt ?? "-"}</Row>
                  <Row label="승인번호">{approvalNumber}</Row>
                  <Row label="결제상태">
                    <span className={`badge ${paymentStatusBadgeClass(reservation.paymentStatus)}`}>{reservation.paymentStatus}</span>
                  </Row>
                  <Row label="총 예약금액">{reservation.totalAmount}</Row>
                  <Row label="결제금액">{reservation.paidAmount}</Row>
                </dl>
              </section>
            </div>

            <div className="seller-cancel-review-col">
              <section className="seller-cancel-review-section">
                <h4>
                  환불금액 <span className="badge gray">읽기 전용</span>
                </h4>
                <dl className="seller-cancel-review-formula">
                  <div>
                    <dt>결제금액</dt>
                    <dd>{reservation.paidAmount}</dd>
                  </div>
                  <div>
                    <dt>취소수수료</dt>
                    <dd>- {formatKrw(approval.cancellationFee)}</dd>
                  </div>
                  <div className="is-total">
                    <dt>환불금액</dt>
                    <dd>{formatKrw(approval.refundAmount)}</dd>
                  </div>
                </dl>
                <p className="seller-cancel-review-hint">환불금액 변경이 필요한 경우 취소검토 단계에서 다시 확인해주세요.</p>
              </section>

              <section className="seller-cancel-review-section">
                <h4>
                  환불방법 <b className="seller-cancel-review-required">*</b>
                </h4>
                <label>
                  <span>환불방법</span>
                  <select
                    id="seller-refund-method"
                    value={method}
                    onChange={(event) => setMethod(event.target.value as ReservationSellerRefundMethod)}
                    disabled={processing}
                  >
                    {SELLER_REFUND_METHODS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {reservation.paymentMethod === "카드" && method === "원결제수단 환불" && (
                    <small>카드결제는 원결제수단 환불을 권장합니다.</small>
                  )}
                </label>
                {isBank && (
                  <div className="seller-refund-bank-grid">
                    <label className={holder.trim() ? "" : "invalid"}>
                      <span>
                        예금주 <b>*</b>
                      </span>
                      <input id="seller-refund-holder" value={holder} onChange={(event) => setHolder(event.target.value)} />
                    </label>
                    <label className={bank.trim() ? "" : "invalid"}>
                      <span>
                        은행 <b>*</b>
                      </span>
                      <input id="seller-refund-bank" value={bank} onChange={(event) => setBank(event.target.value)} />
                    </label>
                    <label className={accountValid ? "" : "invalid"}>
                      <span>
                        계좌번호 <b>*</b>
                      </span>
                      <input
                        id="seller-refund-account"
                        inputMode="numeric"
                        value={account}
                        onChange={(event) => setAccount(event.target.value)}
                        placeholder="숫자와 - 만 입력"
                      />
                      <small>Mock 입력 · 실제 계좌검증은 하지 않습니다.</small>
                    </label>
                  </div>
                )}
              </section>

              <section className="seller-cancel-review-section">
                <h4>환불 메모</h4>
                <label>
                  <span>환불 메모 (선택)</span>
                  <textarea
                    id="seller-refund-memo"
                    rows={3}
                    maxLength={SELLER_REFUND_MEMO_MAX}
                    value={memo}
                    onChange={(event) => setMemo(event.target.value)}
                    placeholder="예: 카드 원승인 취소 처리"
                    disabled={processing}
                  />
                  <small>
                    {memo.length} / {SELLER_REFUND_MEMO_MAX}
                  </small>
                </label>
              </section>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={processing}>
            닫기
          </button>
          <button type="button" className="primary seller-cancel-review-submit" onClick={submit} disabled={!canSubmit}>
            {processing ? "환불처리중..." : retry ? "환불 재시도" : "환불처리"}
          </button>
        </div>
      </div>
    </div>
  );
}
