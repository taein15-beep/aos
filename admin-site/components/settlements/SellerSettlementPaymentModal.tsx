"use client";

import { useEffect, useState } from "react";
import { Info, Lock, X } from "lucide-react";
import {
  SELLER_SETTLEMENT_PAYMENT_MEMO_MAX,
  SELLER_SETTLEMENT_PAYMENT_METHODS,
  SELLER_SETTLEMENT_PAYMENT_REFERENCE_MAX,
  formatSellerSettlementAmount as won,
  sellerSettlementPaymentDefaultDate,
  validateSellerSettlementPaymentInput,
  type SellerSettlement,
  type SellerSettlementPaymentCheck,
  type SellerSettlementPaymentInput,
  type SellerSettlementPaymentMethod,
} from "@/lib/admin/seller-channel-settlements";

function dotted(value: string) {
  return value.replace(/-/g, ".");
}

/** 정산 지급처리 Modal — 지급금액은 최종 정산금액(현재 유효 정산서)으로 고정 · 실제 이체 없음 */
export function SellerSettlementPaymentModal({
  settlement,
  check,
  suspended = false,
  onClose,
  onSubmit,
}: {
  settlement: SellerSettlement;
  check: SellerSettlementPaymentCheck;
  /** Confirm Dialog가 위에 열려 있으면 Esc 무시 */
  suspended?: boolean;
  onClose: () => void;
  onSubmit: (input: SellerSettlementPaymentInput) => void;
}) {
  const [paymentDate, setPaymentDate] = useState(sellerSettlementPaymentDefaultDate());
  const [method, setMethod] = useState<SellerSettlementPaymentMethod>("계좌이체");
  const [reference, setReference] = useState("");
  const [memo, setMemo] = useState("");
  const input: SellerSettlementPaymentInput = { paymentDate, method, reference, memo };
  const validation = validateSellerSettlementPaymentInput(settlement, input);

  useEffect(() => {
    if (suspended) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [suspended, onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !suspended && onClose()}>
      <div
        className="modal settlement-modal seller-pay-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-pay-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="seller-pay-title">정산 지급처리</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="product-share-agency-body">
          <dl className="product-share-confirm-details seller-pay-details">
            <div>
              <dt>정산번호</dt>
              <dd>{settlement.code}</dd>
            </div>
            <div>
              <dt>판매점</dt>
              <dd>
                {settlement.sellerName} <small>{settlement.sellerId}</small>
              </dd>
            </div>
            <div>
              <dt>정산기간</dt>
              <dd>
                {dotted(settlement.periodFrom)} ~ {dotted(settlement.periodTo)}
              </dd>
            </div>
            <div className="is-total">
              <dt>최종 정산금액</dt>
              <dd>
                <b>{won(check.amount)}</b>
                <small>
                  <Lock size={11} aria-hidden="true" />
                  지급금액 · 수정 불가 (지급기준 정산서 v{check.version} 현재 유효)
                </small>
              </dd>
            </div>
            <div>
              <dt>지급계좌</dt>
              <dd>
                {check.account ? (
                  <>
                    {check.account.bank} {check.account.maskedNumber} <small>예금주 {check.account.holder}</small>
                  </>
                ) : (
                  "등록정보 없음"
                )}
              </dd>
            </div>
          </dl>
          <div className="settlement-modal-form seller-pay-form">
            <label>
              <span>
                지급일 <b className="seller-pay-required">*</b>
              </span>
              <input
                type="date"
                value={paymentDate}
                min={validation.minDate || undefined}
                aria-invalid={Boolean(validation.errors.paymentDate)}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
              {validation.errors.paymentDate ? <small className="seller-pay-error">{validation.errors.paymentDate}</small> : null}
            </label>
            <label>
              <span>지급방법</span>
              <select value={method} onChange={(event) => setMethod(event.target.value as SellerSettlementPaymentMethod)}>
                {SELLER_SETTLEMENT_PAYMENT_METHODS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              <span>지급참조번호 (선택)</span>
              <input
                type="text"
                value={reference}
                maxLength={SELLER_SETTLEMENT_PAYMENT_REFERENCE_MAX}
                placeholder="예: PAY-20261020-001"
                onChange={(event) => setReference(event.target.value)}
              />
            </label>
            <label className="is-wide">
              <span>
                지급메모 (선택) <small>{memo.length}/{SELLER_SETTLEMENT_PAYMENT_MEMO_MAX}</small>
              </span>
              <textarea
                rows={3}
                value={memo}
                maxLength={SELLER_SETTLEMENT_PAYMENT_MEMO_MAX}
                placeholder="예: 2026년 10월 1차 정산 지급"
                onChange={(event) => setMemo(event.target.value)}
              />
            </label>
          </div>
          <div className="product-share-setting-alert reservation-permission-alert is-info seller-pay-info" role="note">
            <Info size={14} aria-hidden="true" />
            <div>
              <strong>지급처리 완료 후 이 정산건의 금액은 수정할 수 없습니다.</strong>
              <p>이후 발생하는 취소조정은 차기정산에 반영됩니다.</p>
            </div>
          </div>
          <p className="product-share-setting-help">Prototype 화면으로 실제 계좌이체는 실행되지 않습니다. 지급참조번호는 Mock Reference입니다.</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" disabled={!validation.valid || !check.canPay} onClick={() => onSubmit(input)}>
            지급처리
          </button>
        </div>
      </div>
    </div>
  );
}
