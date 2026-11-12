"use client";

import { FileSpreadsheet, X } from "lucide-react";
import { formatPeopleLabel, type ReservationDetail } from "@/lib/admin/reservations-data";
import {
  resolveReservationProductCode,
  type SettlementMethod,
} from "@/lib/admin/reservation-settlement-draft";

export type { SettlementMethod };

export type SettlementMethodSelectResult = {
  method: SettlementMethod;
  reservationCode: string;
  productCode: string;
  departureAt: string;
};

export { resolveReservationProductCode };

type SettlementMethodSelectModalProps = {
  reservation: ReservationDetail;
  method: SettlementMethod;
  onMethodChange: (method: SettlementMethod) => void;
  onClose: () => void;
  onNext: (result: SettlementMethodSelectResult) => void;
};

export function SettlementMethodSelectModal({
  reservation,
  method,
  onMethodChange,
  onClose,
  onNext,
}: SettlementMethodSelectModalProps) {
  const productCode = resolveReservationProductCode(reservation);
  const peopleLabel = formatPeopleLabel(reservation.counts);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal product-share-confirm-modal reservation-settlement-method-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-settlement-method-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="info">
              <FileSpreadsheet size={17} />
            </span>
            <h3 id="reservation-settlement-method-title">정산서 작성</h3>
          </div>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <dl className="product-share-confirm-details">
          <div>
            <dt>상품명</dt>
            <dd>{reservation.productName || "-"}</dd>
          </div>
          <div>
            <dt>상품코드</dt>
            <dd>{productCode || "-"}</dd>
          </div>
          <div>
            <dt>출발일</dt>
            <dd>{reservation.departureAt || "-"}</dd>
          </div>
          <div>
            <dt>예약번호</dt>
            <dd>{reservation.code}</dd>
          </div>
          <div>
            <dt>예약자명</dt>
            <dd>{reservation.bookerName || "-"}</dd>
          </div>
          <div>
            <dt>예약인원</dt>
            <dd>{peopleLabel}</dd>
          </div>
        </dl>

        <div className="reservation-settlement-method-body" role="radiogroup" aria-label="정산방식">
          <p className="reservation-settlement-method-lead">정산방식을 선택하세요.</p>

          <label className={`reservation-settlement-method-card${method === "individual" ? " is-selected" : ""}`}>
            <input
              type="radio"
              name="settlement-method"
              value="individual"
              checked={method === "individual"}
              onChange={() => onMethodChange("individual")}
            />
            <span className="reservation-settlement-method-radio" aria-hidden="true" />
            <span>
              <strong>개별정산</strong>
              <em>선택한 예약 1건에 대해서만 정산서를 작성합니다.</em>
            </span>
          </label>

          <label className={`reservation-settlement-method-card${method === "bundled" ? " is-selected" : ""}`}>
            <input
              type="radio"
              name="settlement-method"
              value="bundled"
              checked={method === "bundled"}
              onChange={() => onMethodChange("bundled")}
            />
            <span className="reservation-settlement-method-radio" aria-hidden="true" />
            <span>
              <strong>통합정산</strong>
              <em>같은 상품·출발일의 예약을 묶어서 정산서를 작성합니다.</em>
            </span>
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            onClick={() =>
              onNext({
                method,
                reservationCode: reservation.code,
                productCode,
                departureAt: reservation.departureAt,
              })
            }
          >
            다음 단계
          </button>
        </div>
      </div>
    </div>
  );
}
