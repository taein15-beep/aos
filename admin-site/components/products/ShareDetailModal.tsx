"use client";

import { X } from "lucide-react";
import {
  INVENTORY_MODE_OPTIONS,
  SALES_CHANNEL_OPTIONS,
  formatAffiliateGroups,
  partnershipStatusBadgeClass,
  shareStatusBadgeClass,
  type AffiliateAgencyRow,
  type ShareConditionForm,
} from "@/lib/admin/product-affiliate-data";
import {
  SHARE_MEMO_NOTICE,
  SHARE_REQUEST_MODE_LABELS,
  formatFormSharePeriod,
  shareEditableItemLabels,
} from "@/lib/admin/product-share-setting-data";

export type ShareDetailModalProps = {
  row: AffiliateAgencyRow;
  /** 현재 적용 중인 조건 (별도조건 또는 기본조건) */
  form: ShareConditionForm;
  isCustom: boolean;
  onClose: () => void;
  onEdit: () => void;
};

/** 제휴여행사 공유조건 읽기 전용 상세 */
export function ShareDetailModal({ row, form, isCustom, onClose, onEdit }: ShareDetailModalProps) {
  const channels = SALES_CHANNEL_OPTIONS.filter((option) => form.salesChannels[option.key]).map((option) => option.label);
  const editable = shareEditableItemLabels(form.editPermissions);
  const period = formatFormSharePeriod(form);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal product-share-agency-modal product-share-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="share-detail-title">제휴여행사 공유 상세</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="product-share-agency-body">
          <dl className="product-share-detail-list">
            <div>
              <dt>여행사명</dt>
              <dd>
                <strong>{row.name}</strong>
                <small>{formatAffiliateGroups(row.groups) || "-"}</small>
              </dd>
            </div>
            <div>
              <dt>제휴상태</dt>
              <dd>
                <span className={`badge ${partnershipStatusBadgeClass(row.partnershipStatus)}`}>{row.partnershipStatus}</span>
              </dd>
            </div>
            <div>
              <dt>공유상태</dt>
              <dd>
                <span className={`badge ${shareStatusBadgeClass(row.shareStatus)}`}>{row.shareStatus}</span>
              </dd>
            </div>
            <div>
              <dt>적용 조건</dt>
              <dd>
                <span className={`badge ${isCustom ? "info" : "gray"}`}>{isCustom ? "별도조건" : "기본조건"}</span>
              </dd>
            </div>
            <div>
              <dt>공유 요청 방식</dt>
              <dd>{SHARE_REQUEST_MODE_LABELS[form.requestMode]}</dd>
            </div>
            <div>
              <dt>공유기간</dt>
              <dd>{period}</dd>
            </div>
            <div>
              <dt>판매수수료</dt>
              <dd>{form.commissionRate ? `판매금액 기준 ${form.commissionRate}%` : "미지정"}</dd>
            </div>
            <div>
              <dt>재고 운영방식</dt>
              <dd>{INVENTORY_MODE_OPTIONS.find((option) => option.value === form.inventoryMode)?.label ?? "-"}</dd>
            </div>
            <div className="is-wide">
              <dt>판매채널 허용</dt>
              <dd>{channels.length > 0 ? channels.join(", ") : "허용 채널 없음"}</dd>
            </div>
            <div className="is-wide">
              <dt>수정 가능 항목</dt>
              <dd>{editable.length > 0 ? editable.join(", ") : "수정 가능 항목 없음"}</dd>
            </div>
            <div className="is-wide">
              <dt>내부 메모</dt>
              <dd>
                <p className="product-share-detail-memo">{form.supplierMemo.trim() || "등록된 메모가 없습니다."}</p>
                <small>{SHARE_MEMO_NOTICE}</small>
              </dd>
            </div>
          </dl>
        </div>

        <div className="modal-actions product-share-picker-actions">
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="primary" onClick={onEdit}>
            조건설정
          </button>
        </div>
      </div>
    </div>
  );
}
