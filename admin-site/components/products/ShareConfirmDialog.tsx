"use client";

import { X } from "lucide-react";

export type ShareConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** 확인 전 함께 보여줄 요약 항목 (선택) */
  details?: { label: string; value: string }[];
  /** 위험 동작(판매중지 등) 확인 버튼 강조 */
  confirmTone?: "danger";
};

export function ShareConfirmDialog({
  dialog,
  onClose,
}: {
  dialog: ShareConfirmDialogState | null;
  onClose: () => void;
}) {
  if (!dialog) return null;
  return (
    <div className="modal-backdrop product-share-confirm-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal product-share-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="share-confirm-title">{dialog.title}</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {dialog.details && dialog.details.length > 0 && (
          <dl className="product-share-confirm-details">
            {dialog.details.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <p>{dialog.message}</p>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={dialog.confirmTone === "danger" ? "primary is-danger" : "primary"}
            onClick={dialog.onConfirm}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
