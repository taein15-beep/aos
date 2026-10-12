"use client";

import { AlertTriangle, Info as InfoIcon, Lock } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { SellerModalFrame } from "@/components/seller/SellerSupplierJoinDialogs";
import {
  SELLER_CANCEL_REASONS,
  SELLER_CANCEL_TEXT_MAX,
  formatSellerReservationAmount,
  sellerReservationAmount,
  sellerReservationPaymentBadgeClass,
  sellerReservationUnpaidAmount,
  type SellerCancelReason,
  type SellerReservationDetail,
} from "@/lib/seller/seller-reservations-data";

export type SellerReservationCancelInput = {
  reason: SellerCancelReason;
  reasonDetail: string | null;
  customerNote: string | null;
};

const PENDING_TEXT = "공급여행사 확인 후 확정";

/** 판매점 예약 취소요청 Modal — 전체 예약 단위 요청만, 취소수수료 · 환불금액은 공급여행사 확정 */
export function SellerReservationCancelModal({
  reservation,
  travelDateLabel,
  sameDay,
  supplierSuspended,
  cancelPolicy,
  suspended = false,
  onClose,
  onSubmit,
}: {
  reservation: SellerReservationDetail;
  travelDateLabel: string;
  sameDay: boolean;
  supplierSuspended: boolean;
  cancelPolicy: string[];
  /** Confirm Modal이 위에 열려 있으면 Esc/닫기 무시 */
  suspended?: boolean;
  onClose: () => void;
  onSubmit: (input: SellerReservationCancelInput) => void;
}) {
  const [reason, setReason] = useState<SellerCancelReason | "">("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  const isOther = reason === "기타";
  const canSubmit = reason !== "" && (!isOther || reasonDetail.trim().length > 0);
  const amount = sellerReservationAmount(reservation);
  const paid = reservation.paidAmount;
  const unpaid = sellerReservationUnpaidAmount(reservation);

  const guardedClose = useCallback(() => {
    if (!suspended) onClose();
  }, [suspended, onClose]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSubmit || !reason) return;
    onSubmit({
      reason,
      reasonDetail: isOther ? reasonDetail.trim() : null,
      customerNote: customerNote.trim() || null,
    });
  };

  return (
    <SellerModalFrame
      titleId="seller-rsv-cancel-title"
      title="예약 취소요청"
      className="seller-rsv-cancel-modal"
      onClose={guardedClose}
      actions={
        <>
          <button type="button" className="secondary" onClick={guardedClose}>
            닫기
          </button>
          <button type="submit" form="seller-rsv-cancel-form" className="primary seller-rsv-cancel-submit" disabled={!canSubmit}>
            취소요청
          </button>
        </>
      }
    >
      <p className="seller-sup-modal-lead">공급여행사에 예약 취소를 요청합니다.</p>

      {supplierSuspended ? (
        <p className="seller-price-warning seller-rsv-cancel-warning is-danger" role="note">
          <AlertTriangle size={13} aria-hidden="true" />
          현재 공급여행사와의 신규 거래는 중지되어 있으나 기존 예약에 대한 취소요청은 가능합니다.
        </p>
      ) : null}
      {sameDay ? (
        <p className="seller-price-warning seller-rsv-cancel-warning" role="note">
          <AlertTriangle size={13} aria-hidden="true" />
          출발 당일 취소는 취소수수료가 발생할 수 있습니다. 최종 판단은 공급여행사에서 합니다.
        </p>
      ) : null}

      <section className="seller-price-section" aria-labelledby="seller-rsv-cancel-info-title">
        <h4 id="seller-rsv-cancel-info-title">예약정보</h4>
        <dl className="seller-rsv-cancel-info">
          <div>
            <dt>예약번호</dt>
            <dd>{reservation.reservationCode}</dd>
          </div>
          <div>
            <dt>상품</dt>
            <dd>{reservation.productName}</dd>
          </div>
          <div>
            <dt>공급여행사</dt>
            <dd>{reservation.supplierName}</dd>
          </div>
          <div>
            <dt>예약자</dt>
            <dd>{reservation.customerName}</dd>
          </div>
          <div>
            <dt>여행일</dt>
            <dd>{travelDateLabel}</dd>
          </div>
          <div>
            <dt>예약금액</dt>
            <dd>{formatSellerReservationAmount(amount)}</dd>
          </div>
          <div>
            <dt>결제상태</dt>
            <dd>
              <span className={`badge ${sellerReservationPaymentBadgeClass(reservation.paymentStatus)}`}>{reservation.paymentStatus}</span>
            </dd>
          </div>
          <div>
            <dt>취소 대상</dt>
            <dd>
              취소 대상 {reservation.pax}명
              <small>{reservation.companions.length > 0 ? `예약자 + 동행자 ${reservation.companions.length}명` : "예약자 1명"}</small>
            </dd>
          </div>
        </dl>
        <p className="seller-price-help">현재는 예약 전체 취소요청만 가능합니다. (부분취소 미지원)</p>
      </section>

      <div className="seller-rsv-cancel-notice" role="note">
        <InfoIcon size={13} aria-hidden="true" />
        <span>
          취소요청 등록 후 공급여행사가 취소 가능 여부와 환불금액을 확인합니다.
          <small>취소수수료 및 최종 환불금액은 공급여행사의 취소정책에 따라 달라질 수 있습니다.</small>
        </span>
      </div>

      <form id="seller-rsv-cancel-form" className="seller-price-section seller-rsv-cancel-form" onSubmit={submit} noValidate>
        <label className="seller-price-label" htmlFor="seller-rsv-cancel-reason">
          취소사유 <em className="seller-rsv-required">필수</em>
        </label>
        <select
          id="seller-rsv-cancel-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value as SellerCancelReason | "")}
          aria-required="true"
        >
          <option value="">취소사유를 선택해주세요.</option>
          {SELLER_CANCEL_REASONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        {isOther ? (
          <>
            <textarea
              id="seller-rsv-cancel-reason-detail"
              aria-label="기타 취소사유"
              value={reasonDetail}
              maxLength={SELLER_CANCEL_TEXT_MAX}
              rows={3}
              placeholder="취소사유를 입력해주세요."
              aria-required="true"
              aria-invalid={reasonDetail.trim().length === 0}
              onChange={(event) => setReasonDetail(event.target.value)}
              autoFocus
            />
            <p className="seller-rsv-cancel-count">
              {reasonDetail.trim().length === 0 ? <span>기타 사유를 입력해야 요청할 수 있습니다.</span> : <span />}
              {reasonDetail.length}/{SELLER_CANCEL_TEXT_MAX}
            </p>
          </>
        ) : null}

        <label className="seller-price-label" htmlFor="seller-rsv-cancel-note">
          고객 요청내용 <small>선택</small>
        </label>
        <textarea
          id="seller-rsv-cancel-note"
          value={customerNote}
          maxLength={SELLER_CANCEL_TEXT_MAX}
          rows={2}
          placeholder="예: 가족 일정 변경으로 전체 예약 취소 요청"
          onChange={(event) => setCustomerNote(event.target.value)}
        />
        <p className="seller-rsv-cancel-count">
          <span />
          {customerNote.length}/{SELLER_CANCEL_TEXT_MAX}
        </p>
      </form>

      <section className="seller-price-section" aria-labelledby="seller-rsv-cancel-pay-title">
        <h4 id="seller-rsv-cancel-pay-title">결제정보</h4>
        <dl className="seller-price-readonly seller-rsv-cancel-pay">
          <div>
            <dt>총 예약금액</dt>
            <dd>{formatSellerReservationAmount(amount)}</dd>
          </div>
          <div>
            <dt>결제금액</dt>
            <dd>{formatSellerReservationAmount(paid)}</dd>
          </div>
          {reservation.paymentStatus === "일부결제" ? (
            <div>
              <dt>미결제금액</dt>
              <dd>{formatSellerReservationAmount(unpaid)}</dd>
            </div>
          ) : null}
          <div>
            <dt>환불대상 결제금액</dt>
            <dd>{formatSellerReservationAmount(paid)}</dd>
          </div>
          <div>
            <dt>취소수수료</dt>
            <dd className="is-pending">{PENDING_TEXT}</dd>
          </div>
          <div>
            <dt>예상 환불금액</dt>
            <dd className="is-pending">{paid > 0 ? `확정 전 · ${PENDING_TEXT}` : "환불 예정금액 없음"}</dd>
          </div>
        </dl>
        <p className="seller-price-help">
          {paid > 0
            ? "최종 환불금액은 공급여행사 확인 후 확정됩니다. 판매점에서 환불금액을 계산하거나 확정하지 않습니다."
            : "결제된 금액이 없어 환불 예정금액은 없습니다."}
        </p>
      </section>

      {cancelPolicy.length > 0 ? (
        <section className="seller-price-section" aria-labelledby="seller-rsv-cancel-policy-title">
          <h4 id="seller-rsv-cancel-policy-title">취소정책</h4>
          <ul className="seller-pd-list seller-rsv-cancel-policy">
            {cancelPolicy.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="seller-pd-origin-note">
            <Lock size={12} aria-hidden="true" />
            {reservation.supplierName}의 원본 취소정책입니다. 판매점에서 수정할 수 없으며 자동 계산되지 않습니다.
          </p>
        </section>
      ) : null}
    </SellerModalFrame>
  );
}
