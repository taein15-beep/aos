"use client";

import { Check, Info, Lock, X } from "lucide-react";
import { INVENTORY_MODE_OPTIONS, SALES_CHANNEL_OPTIONS, shareStatusBadgeClass } from "@/lib/admin/product-affiliate-data";
import {
  SHARE_REQUEST_MODE_LABELS,
  formatFormSharePeriod,
  shareEditableItemLabels,
} from "@/lib/admin/product-share-setting-data";
import {
  SHARE_REQUEST_ACCEPT_NOTICES,
  canRespondToShareRequest,
  hasCustomSharedCondition,
  sharedConditionForm,
  type SharedProduct,
} from "@/lib/admin/product-shared-data";

export function SharedProductRequestModal({
  product,
  onClose,
  onAccept,
  onReject,
}: {
  product: SharedProduct;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const form = sharedConditionForm(product);
  const isCustom = hasCustomSharedCondition(product);
  const editableLabels = shareEditableItemLabels(form.editPermissions);
  const inventoryLabel =
    INVENTORY_MODE_OPTIONS.find((option) => option.value === form.inventoryMode)?.label ?? form.inventoryMode;
  const canRespond = canRespondToShareRequest(product);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal shared-product-request-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-request-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="shared-request-title">상품공유 요청</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="product-share-agency-body">
          <dl className="product-share-detail-list">
            <div>
              <dt>공급여행사</dt>
              <dd>
                <strong>{product.supplierName}</strong>
              </dd>
            </div>
            <div>
              <dt>공유상태</dt>
              <dd>
                <span className={`badge ${shareStatusBadgeClass(product.shareStatus)}`}>{product.shareStatus}</span>
              </dd>
            </div>
            <div className="is-wide">
              <dt>상품명</dt>
              <dd>{product.name}</dd>
            </div>
            <div>
              <dt>상품코드</dt>
              <dd>{product.code}</dd>
            </div>
            <div>
              <dt>요청일</dt>
              <dd>{product.requestedAt}</dd>
            </div>
          </dl>

          <section className="product-share-preview-section" aria-label="공유 요청 조건">
            <h4 className="shared-product-request-heading">
              공유 요청 조건
              <span className={`badge ${isCustom ? "info" : "gray"}`}>{isCustom ? "별도조건 적용" : "기본조건 적용"}</span>
            </h4>
            <dl className="product-share-detail-list">
              <div>
                <dt>공유 요청 방식</dt>
                <dd>{SHARE_REQUEST_MODE_LABELS[form.requestMode]}</dd>
              </div>
              <div>
                <dt>공유기간</dt>
                <dd>{formatFormSharePeriod(form)}</dd>
              </div>
              <div>
                <dt>판매수수료</dt>
                <dd>{form.commissionRate ? `${form.commissionRate}%` : "미지정"}</dd>
              </div>
              <div>
                <dt>재고 운영방식</dt>
                <dd>{inventoryLabel}</dd>
              </div>
              <div className="is-wide">
                <dt>판매채널 허용</dt>
                <dd>
                  <ul className="shared-product-request-channels">
                    {SALES_CHANNEL_OPTIONS.map((option) => {
                      const on = form.salesChannels[option.key];
                      return (
                        <li key={option.key} className={on ? "" : "is-off"}>
                          {on ? <Check size={11} /> : <Lock size={11} />}
                          {option.label}
                        </li>
                      );
                    })}
                  </ul>
                </dd>
              </div>
              <div className="is-wide">
                <dt>수정 가능 항목</dt>
                <dd>{editableLabels.length ? editableLabels.join(", ") : "수정 가능한 항목 없음"}</dd>
              </div>
            </dl>
          </section>

          <div className="shared-product-request-notice" role="note">
            <strong>
              <Info size={13} />
              수락 전 확인사항
            </strong>
            <ul>
              {SHARE_REQUEST_ACCEPT_NOTICES.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="modal-actions shared-product-request-actions">
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
          {canRespond && (
            <>
              <button type="button" className="secondary shared-product-reject-btn" onClick={onReject}>
                거절
              </button>
              <button type="button" className="primary" onClick={onAccept}>
                수락
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
