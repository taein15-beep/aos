"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import {
  SHARE_REJECT_REASON_OPTIONS,
  type ShareRejectReason,
  type SharedProduct,
} from "@/lib/admin/product-shared-data";

export function SharedProductRejectModal({
  product,
  onClose,
  onConfirm,
}: {
  product: SharedProduct;
  onClose: () => void;
  onConfirm: (reason: ShareRejectReason, detail: string) => void;
}) {
  const [reason, setReason] = useState<ShareRejectReason | "">("");
  const [detail, setDetail] = useState("");
  const needsDetail = reason === "기타";
  const canConfirm = reason !== "" && (!needsDetail || detail.trim().length > 0);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal shared-product-reject-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-reject-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="shared-reject-title">상품공유 요청을 거절하시겠습니까?</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="product-share-agency-body">
          <dl className="product-share-confirm-details shared-product-reject-target">
            <div>
              <dt>상품명</dt>
              <dd>{product.name}</dd>
            </div>
            <div>
              <dt>공급여행사</dt>
              <dd>{product.supplierName}</dd>
            </div>
          </dl>

          <p className="product-share-setting-alert" role="note">
            <AlertTriangle size={13} />
            거절하면 해당 상품은 판매할 수 없습니다.
          </p>

          <fieldset className="shared-product-reject-reasons">
            <legend>거절 사유</legend>
            {SHARE_REJECT_REASON_OPTIONS.map((option) => (
              <label key={option}>
                <input
                  type="radio"
                  name="shared-reject-reason"
                  checked={reason === option}
                  onChange={() => setReason(option)}
                />
                {option}
              </label>
            ))}
          </fieldset>

          {needsDetail && (
            <textarea
              className="product-share-agency-memo"
              aria-label="기타 거절 사유"
              rows={3}
              maxLength={200}
              placeholder="거절 사유를 입력해주세요."
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
            />
          )}
          <p className="product-share-setting-help">
            거절 사유는 현재 화면 상태에만 보관됩니다. (SAMPLE · 서버 저장 및 공급여행사 알림 없음)
          </p>
        </div>

        <div className="modal-actions shared-product-request-actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary shared-product-reject-confirm"
            disabled={!canConfirm}
            onClick={() => reason && onConfirm(reason, detail)}
          >
            공유 거절
          </button>
        </div>
      </div>
    </div>
  );
}
