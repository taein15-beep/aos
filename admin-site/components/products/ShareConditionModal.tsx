"use client";

import { useMemo, useState } from "react";
import { Lock, RotateCcw, X } from "lucide-react";
import {
  INVENTORY_MODE_OPTIONS,
  SALES_CHANNEL_OPTIONS,
  SHARE_REQUEST_MODE_OPTIONS,
  formatAffiliateGroups,
  partnershipStatusBadgeClass,
  shareStatusBadgeClass,
  type AffiliateAgencyRow,
  type ShareConditionForm,
} from "@/lib/admin/product-affiliate-data";
import {
  SHARE_EDITABLE_ITEMS,
  SHARE_LOCKED_ITEMS,
  SHARE_MEMO_NOTICE,
  SHARE_REQUEST_MODE_DESCRIPTIONS,
  SHARE_REQUEST_MODE_LABELS,
  commissionRateError,
  formatSalesPeriod,
  normalizeCommissionInput,
  validateSharePeriod,
} from "@/lib/admin/product-share-setting-data";

export type ShareConditionModalProps = {
  row: AffiliateAgencyRow;
  isCustom: boolean;
  initialForm: ShareConditionForm;
  defaultForm: ShareConditionForm;
  salesPeriod: [string, string] | null;
  onClose: () => void;
  onApply: (form: ShareConditionForm) => void;
};

/** 제휴여행사별 공유조건 설정. 저장 시 상품 기본 공유조건보다 우선하는 별도조건이 됩니다. */
export function ShareConditionModal({
  row,
  isCustom,
  initialForm,
  defaultForm,
  salesPeriod,
  onClose,
  onApply,
}: ShareConditionModalProps) {
  const [form, setForm] = useState<ShareConditionForm>(initialForm);

  const isClosed = row.shareStatus === "공유 종료" || row.shareStatus === "공유 거절";
  const differsFromDefault = useMemo(() => JSON.stringify(form) !== JSON.stringify(defaultForm), [form, defaultForm]);

  const period = useMemo(
    () =>
      validateSharePeriod({
        hasEndDate: !form.noEndDate,
        startDate: form.startDate,
        endDate: form.endDate,
        salesPeriod,
      }),
    [form.noEndDate, form.startDate, form.endDate, salesPeriod],
  );
  const commissionError = commissionRateError(form.commissionRate);
  const hasErrors = period.hasError || Boolean(commissionError);

  const update = <K extends keyof ShareConditionForm>(key: K, value: ShareConditionForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const changeCommission = (raw: string) => {
    const next = normalizeCommissionInput(raw);
    if (next && Number(next) > 100) return;
    update("commissionRate", next);
  };

  const apply = () => {
    if (hasErrors) return;
    onApply(form);
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal product-share-agency-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-condition-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="share-condition-title">제휴여행사 공유조건 설정</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="product-share-agency-body">
          <dl className="product-share-agency-target">
            <div>
              <dt>여행사명</dt>
              <dd>
                <strong>{row.name}</strong>
              </dd>
            </div>
            <div>
              <dt>공유상태</dt>
              <dd>
                <span className={`badge ${shareStatusBadgeClass(row.shareStatus)}`}>{row.shareStatus}</span>
              </dd>
            </div>
            <div>
              <dt>제휴상태</dt>
              <dd>
                <span className={`badge ${partnershipStatusBadgeClass(row.partnershipStatus)}`}>{row.partnershipStatus}</span>
              </dd>
            </div>
            <div>
              <dt>공유그룹</dt>
              <dd>{formatAffiliateGroups(row.groups) || "-"}</dd>
            </div>
            <div>
              <dt>현재 적용</dt>
              <dd>
                <span className={`badge ${isCustom ? "info" : "gray"}`}>{isCustom ? "별도조건" : "기본조건"}</span>
              </dd>
            </div>
          </dl>

          <div className="product-share-agency-loader">
            <button type="button" className="secondary" onClick={() => setForm(defaultForm)}>
              <RotateCcw size={13} />
              기본조건 불러오기
            </button>
            {differsFromDefault ? (
              <span className="is-warn">현재 입력한 값을 상품 기본 공유조건으로 덮어씁니다.</span>
            ) : (
              <span>현재 값이 상품 기본 공유조건과 같습니다.</span>
            )}
          </div>

          {isClosed && (
            <p className="product-share-setting-alert" role="note">
              {row.shareStatus} 상태에서는 조건만 변경되며 공유상태는 바뀌지 않습니다. 다시 공유할 때 변경된 조건이 적용됩니다.
            </p>
          )}

          <div className="product-share-setting-row">
            <span className="product-share-setting-label">공유 요청 방식</span>
            <div className="product-share-setting-row-body">
              <div className="product-share-setting-option-list" role="radiogroup" aria-label="공유 요청 방식">
                {SHARE_REQUEST_MODE_OPTIONS.map((option) => (
                  <label key={option.value} className={form.requestMode === option.value ? "is-selected" : undefined}>
                    <input
                      type="radio"
                      name="condition-request-mode"
                      checked={form.requestMode === option.value}
                      onChange={() => update("requestMode", option.value)}
                    />
                    <span>
                      <strong>{SHARE_REQUEST_MODE_LABELS[option.value]}</strong>
                      <small>{SHARE_REQUEST_MODE_DESCRIPTIONS[option.value]}</small>
                    </span>
                  </label>
                ))}
              </div>
              {!isClosed && row.shareStatus !== "수락대기" && (
                <p className="product-share-setting-help">이미 공유가 시작된 여행사는 다시 공유할 때 요청 방식이 적용됩니다.</p>
              )}
            </div>
          </div>

          <div className="product-share-setting-row">
            <span className="product-share-setting-label">공유기간</span>
            <div className="product-share-setting-row-body">
              <div className="product-share-setting-radios" role="radiogroup" aria-label="공유기간">
                <label>
                  <input
                    type="radio"
                    name="condition-period"
                    checked={form.noEndDate}
                    onChange={() => update("noEndDate", true)}
                  />
                  상시 공유
                </label>
                <label>
                  <input
                    type="radio"
                    name="condition-period"
                    checked={!form.noEndDate}
                    onChange={() => update("noEndDate", false)}
                  />
                  기간 지정
                </label>
              </div>
              {!form.noEndDate && (
                <div className="product-share-setting-date-range">
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => update("startDate", event.target.value)}
                    aria-label="공유 시작일"
                    aria-invalid={Boolean(period.errors.startDate)}
                  />
                  <em>~</em>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate || undefined}
                    onChange={(event) => update("endDate", event.target.value)}
                    aria-label="공유 종료일"
                    aria-invalid={Boolean(period.errors.endDate)}
                  />
                </div>
              )}
              {(period.errors.startDate || period.errors.endDate) && (
                <p className="product-share-agency-error" role="alert">
                  {period.errors.startDate ?? period.errors.endDate}
                </p>
              )}
              {period.warnings.length > 0 && (
                <div className="product-share-setting-alert product-share-period-warning" role="note">
                  <span>상품 판매기간 {formatSalesPeriod(salesPeriod)}</span>
                  {period.warnings.map((warning) => (
                    <span key={warning}>{warning}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="product-share-setting-row">
            <span className="product-share-setting-label">판매수수료</span>
            <div className="product-share-setting-row-body">
              <div className="product-share-setting-commission">
                <span>판매금액 기준</span>
                <div className="product-share-setting-unit-input">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.commissionRate}
                    onChange={(event) => changeCommission(event.target.value)}
                    placeholder="0"
                    aria-label="판매수수료율"
                    aria-invalid={Boolean(commissionError)}
                  />
                  <b>%</b>
                </div>
                <small className="product-share-setting-help">0~100% 범위로 입력합니다.</small>
              </div>
              {commissionError && (
                <p className="product-share-agency-error" role="alert">
                  {commissionError}
                </p>
              )}
            </div>
          </div>

          <div className="product-share-setting-row">
            <span className="product-share-setting-label">재고 운영방식</span>
            <div className="product-share-setting-row-body">
              <div className="product-share-setting-radios" role="radiogroup" aria-label="재고 운영방식">
                {INVENTORY_MODE_OPTIONS.map((option) => (
                  <label key={option.value} title={option.description}>
                    <input
                      type="radio"
                      name="condition-inventory-mode"
                      checked={form.inventoryMode === option.value}
                      onChange={() => update("inventoryMode", option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              <p className="product-share-setting-help">
                {INVENTORY_MODE_OPTIONS.find((option) => option.value === form.inventoryMode)?.description}
              </p>
            </div>
          </div>

          <div className="product-share-setting-row">
            <span className="product-share-setting-label">판매채널 허용</span>
            <div className="product-share-setting-row-body">
              <div className="product-share-setting-checks product-share-agency-channels">
                {SALES_CHANNEL_OPTIONS.map((option) => (
                  <label key={option.key}>
                    <input
                      type="checkbox"
                      checked={form.salesChannels[option.key]}
                      onChange={(event) =>
                        update("salesChannels", { ...form.salesChannels, [option.key]: event.target.checked })
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="product-share-setting-row">
            <span className="product-share-setting-label">수정 가능 항목</span>
            <div className="product-share-setting-row-body">
              <div className="product-share-setting-checks">
                {SHARE_EDITABLE_ITEMS.map((item) =>
                  item.permissionKey ? (
                    <label key={item.key}>
                      <input
                        type="checkbox"
                        checked={form.editPermissions[item.permissionKey]}
                        onChange={(event) =>
                          update("editPermissions", {
                            ...form.editPermissions,
                            [item.permissionKey as string]: event.target.checked,
                          })
                        }
                      />
                      {item.label}
                    </label>
                  ) : null,
                )}
              </div>
              <div className="product-share-agency-locked">
                <span className="badge gray">수정 불가</span>
                {SHARE_LOCKED_ITEMS.map((item) => (
                  <span key={item.key}>
                    <Lock size={10} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="product-share-setting-row">
            <span className="product-share-setting-label">내부 메모</span>
            <div className="product-share-setting-row-body">
              <textarea
                className="product-share-agency-memo"
                value={form.supplierMemo}
                onChange={(event) => update("supplierMemo", event.target.value)}
                placeholder="해당 제휴여행사에만 적용되는 운영 메모를 입력하세요."
                rows={3}
                maxLength={500}
                aria-label="내부 메모"
              />
              <p className="product-share-setting-help">{SHARE_MEMO_NOTICE}</p>
            </div>
          </div>
        </div>

        <div className="modal-actions product-share-picker-actions">
          <span>조건 적용 후 하단 변경내용 저장을 눌러야 저장됩니다.</span>
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" onClick={apply} disabled={hasErrors}>
            조건 적용
          </button>
        </div>
      </div>
    </div>
  );
}
