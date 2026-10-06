"use client";

import { useState } from "react";
import { Check, Info, Lock, X } from "lucide-react";
import {
  INVENTORY_MODE_OPTIONS,
  SALES_CHANNEL_OPTIONS,
  type ShareConditionForm,
} from "@/lib/admin/product-affiliate-data";
import {
  SHARE_EDITABLE_ITEMS,
  SHARE_LOCKED_ITEMS,
  SHARE_REQUEST_MODE_LABELS,
  formatFormSharePeriod,
  formatSalesPeriod,
} from "@/lib/admin/product-share-setting-data";

export type SharePreviewOption = {
  value: string;
  label: string;
  form: ShareConditionForm;
  isCustom: boolean;
};

export type SharePreviewProduct = {
  name: string;
  code: string;
  category: string;
  supplierName: string;
  price: string;
  salesPeriod: [string, string] | null;
  salesStatusLabel: string;
  salesStatusBadge: string;
};

/** 제휴여행사 관리자 기준 상품공유 미리보기. 화면 확인용이며 설정값을 변경하지 않습니다. */
export function SharePreviewModal({
  product,
  options,
  onClose,
}: {
  product: SharePreviewProduct;
  options: SharePreviewOption[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(options[0]?.value ?? "");
  const current = options.find((option) => option.value === selected) ?? options[0];
  if (!current) return null;
  const { form } = current;
  const channels = SALES_CHANNEL_OPTIONS.filter((option) => form.salesChannels[option.key]).map((option) => option.label);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal product-share-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="share-preview-title">상품공유 미리보기</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="product-share-agency-body">
          <p className="product-share-setting-help">제휴여행사 관리자에서 확인하게 될 상품 및 공유조건을 미리 확인합니다.</p>

          <div className="product-share-preview-toolbar">
            <label>
              <span>미리보기 기준</span>
              <select
                className="product-share-setting-select"
                value={current.value}
                onChange={(event) => setSelected(event.target.value)}
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <span className={`badge ${current.isCustom ? "info" : "gray"}`}>
              {current.isCustom ? "별도조건 적용" : "기본조건 적용"}
            </span>
            {current.isCustom && <small>상품 기본조건과 다른 조건이 적용되어 있습니다.</small>}
          </div>

          <section className="product-share-preview-section" aria-label="상품정보">
            <h4>상품정보</h4>
            <dl className="product-share-detail-list">
              <div className="is-wide">
                <dt>상품명</dt>
                <dd>
                  <strong>{product.name}</strong>
                </dd>
              </div>
              <div>
                <dt>상품코드</dt>
                <dd>{product.code}</dd>
              </div>
              <div>
                <dt>공급여행사</dt>
                <dd>{product.supplierName}</dd>
              </div>
              <div>
                <dt>카테고리</dt>
                <dd>{product.category}</dd>
              </div>
              <div>
                <dt>판매기간</dt>
                <dd>{formatSalesPeriod(product.salesPeriod)}</dd>
              </div>
              <div>
                <dt>판매가격</dt>
                <dd>{product.price}원</dd>
              </div>
              <div>
                <dt>판매상태</dt>
                <dd>
                  <span className={`badge ${product.salesStatusBadge}`}>{product.salesStatusLabel}</span>
                </dd>
              </div>
            </dl>
            <p className="product-share-setting-help">
              대표 이미지·출발지역·여행기간·출발상태는 상품 데이터가 연결되면 표시됩니다.
            </p>
          </section>

          <section className="product-share-preview-section" aria-label="공유조건">
            <h4>공유조건</h4>
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
            </dl>
          </section>

          <section className="product-share-setting-perm product-share-preview-perm" aria-label="수정 권한">
            <div className="product-share-setting-perm-group">
              <h4>
                제휴여행사 수정 가능 <span className="badge info">판매정보</span>
              </h4>
              <ul className="product-share-preview-perm-list">
                {SHARE_EDITABLE_ITEMS.map((item) => {
                  const allowed = item.permissionKey ? form.editPermissions[item.permissionKey] : false;
                  return (
                    <li key={item.key} className={allowed ? undefined : "is-off"}>
                      {allowed ? <Check size={12} /> : <X size={12} />}
                      {item.label}
                      <span className={`badge ${allowed ? "success" : "gray"}`}>{allowed ? "허용" : "미허용"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="product-share-setting-perm-group is-locked">
              <h4>
                수정 불가 <span className="badge gray">원본 상품정보</span>
              </h4>
              <ul className="product-share-preview-perm-list is-locked">
                {SHARE_LOCKED_ITEMS.map((item) => (
                  <li key={item.key}>
                    <Lock size={12} />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <p className="product-share-setting-alert" role="note">
            <Info size={13} />
            미리보기는 저장 전 화면 기준입니다. 저장하지 않은 변경사항도 반영되어 표시됩니다.
          </p>
        </div>

        <div className="modal-actions product-share-picker-actions">
          <button type="button" className="primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
