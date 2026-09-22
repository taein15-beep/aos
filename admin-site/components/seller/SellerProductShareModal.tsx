"use client";

import { Copy, ExternalLink, Link2, MessageCircle, QrCode, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import {
  buildSellerProductShareUrl,
  type SellerProductShareAttribution,
} from "@/lib/seller/seller-product-share";

type SellerProductShareModalProps = {
  open: boolean;
  attribution: SellerProductShareAttribution | null;
  onClose: () => void;
  onCopied: () => void;
};

export function SellerProductShareModal({
  open,
  attribution,
  onClose,
  onCopied,
}: SellerProductShareModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !attribution) return null;

  const shareUrl = buildSellerProductShareUrl(attribution.sellerCode, attribution.productId);
  // 예약 연결: toSellerAttributedReservationDraft(attribution)
  // → productId / supplierTravelAgencyId / sellerId 포함

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      onCopied();
    } catch {
      window.prompt("아래 링크를 복사해 주세요.", shareUrl);
      onCopied();
    }
  };

  const openInNewTab = () => {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="modal-backdrop seller-share-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal seller-share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="seller-share-modal-icon" aria-hidden="true">
              <Link2 size={16} />
            </span>
            <h3 id={titleId}>상품 링크 공유</h3>
          </div>
          <button type="button" ref={closeRef} onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="seller-share-body">
          <div className="seller-share-product">
            <span>상품명</span>
            <strong>{attribution.productName}</strong>
            <small>{attribution.productCode}</small>
          </div>

          <label className="seller-share-url-field">
            <span>공유 URL</span>
            <input type="text" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
          </label>

          <dl className="seller-share-track" aria-label="추적 정보">
            <div>
              <dt>product_id</dt>
              <dd>{attribution.productId}</dd>
            </div>
            <div>
              <dt>supplier_travel_agency_id</dt>
              <dd>{attribution.supplierTravelAgencyId}</dd>
            </div>
            <div>
              <dt>seller_id</dt>
              <dd>{attribution.sellerId}</dd>
            </div>
          </dl>

          <div className="seller-share-actions">
            <button type="button" className="primary" onClick={copyLink}>
              <Copy size={14} aria-hidden="true" />
              링크복사
            </button>
            <button type="button" className="secondary" onClick={openInNewTab}>
              <ExternalLink size={14} aria-hidden="true" />
              새창에서 상품보기
            </button>
          </div>

          <div className="seller-share-extensions" aria-label="추가 공유 채널 (준비중)">
            <p>추가 공유 (추후 연동)</p>
            <div className="seller-share-extension-buttons">
              <button type="button" className="secondary" disabled title="카카오톡 API 연동 예정">
                <MessageCircle size={14} aria-hidden="true" />
                카카오톡 공유
              </button>
              <button type="button" className="secondary" disabled title="문자 공유 연동 예정">
                <MessageCircle size={14} aria-hidden="true" />
                문자 공유
              </button>
              <button type="button" className="secondary" disabled title="QR코드 생성 예정">
                <QrCode size={14} aria-hidden="true" />
                QR코드
              </button>
            </div>
          </div>

          {/* 예약 연결용 Draft는 toSellerAttributedReservationDraft(attribution)로 생성 */}
        </div>
      </div>
    </div>
  );
}
