"use client";

import { useState } from "react";
import { Info, Lock, X } from "lucide-react";
import { commissionRateError, normalizeCommissionInput } from "@/lib/admin/product-share-setting-data";
import { formatPriceDisplay, parsePriceInput } from "@/lib/admin/product-affiliate-data";
import {
  SELLER_COMMISSION_NOTICE,
  SELLER_DEPOSIT_NOTICE,
  SELLER_DEPOSIT_PRICE_HELP,
  SELLER_SALES_MODE_DESCRIPTIONS,
  SELLER_SALES_MODE_FLOW,
  SELLER_SALES_MODE_LABELS,
  calcSellerSalesFigures,
  formatWon,
  sellerSalesModeBadgeClass,
  sellerSalesModeLabel,
  sellerSalesStatusBadgeClass,
  type SellerSalesMode,
  type SellerSalesRow,
} from "@/lib/admin/product-seller-sales-data";

type SellerSalesSettingStatus = "판매중" | "판매중지";

export type SellerSalesSettingValue = Pick<SellerSalesRow, "commissionRate" | "depositPrice"> & {
  status: SellerSalesSettingStatus;
  mode: SellerSalesMode;
};

export type SellerSalesSettingModalProps = {
  row: SellerSalesRow;
  supplyPrice: number;
  /** 판매점 거래상태가 이용중지이면 판매중으로 변경할 수 없습니다. */
  salesLocked?: boolean;
  onClose: () => void;
  onApply: (value: SellerSalesSettingValue) => void;
};

const MODES: SellerSalesMode[] = ["commission", "deposit"];
const STATUSES: SellerSalesSettingStatus[] = ["판매중", "판매중지"];

/** 공급여행사가 판매점별 판매상태·판매방식을 지정합니다. 판매점 판매가는 조회만 합니다. */
export function SellerSalesSettingModal({
  row,
  supplyPrice,
  salesLocked = false,
  onClose,
  onApply,
}: SellerSalesSettingModalProps) {
  const [status, setStatus] = useState<SellerSalesSettingStatus>(
    salesLocked || row.status === "판매중지" ? "판매중지" : "판매중",
  );
  const [mode, setMode] = useState<SellerSalesMode | null>(row.mode);
  const [commissionRate, setCommissionRate] = useState(row.mode === "commission" ? String(row.commissionRate) : "");
  const [depositPrice, setDepositPrice] = useState(formatPriceDisplay(row.depositPrice));
  const [depositTouched, setDepositTouched] = useState(false);
  const [commissionTouched, setCommissionTouched] = useState(false);

  const depositValue = parsePriceInput(depositPrice);
  const commissionError = mode === "commission" ? commissionRateError(commissionRate) : null;
  const depositError = mode === "deposit" && !depositValue ? "판매점 입금가를 입력해 주세요." : null;
  const hasErrors = !mode || Boolean(commissionError || depositError);

  const figures = calcSellerSalesFigures(
    {
      mode,
      commissionRate: Number(commissionRate) || 0,
      depositPrice: depositValue,
      sellerPrice: row.sellerPrice,
    },
    supplyPrice,
  );
  const marginWarning =
    mode === "deposit" && figures.expectedProfit != null && figures.expectedProfit <= 0
      ? "현재 판매점 판매가보다 입금가가 같거나 높아 판매점 예상마진이 없습니다."
      : null;

  const changeCommission = (raw: string) => {
    const next = normalizeCommissionInput(raw);
    if (next && Number(next) > 100) return;
    setCommissionTouched(true);
    setCommissionRate(next);
  };

  const changeDeposit = (raw: string) => {
    setDepositTouched(true);
    setDepositPrice(formatPriceDisplay(parsePriceInput(raw)));
  };

  const apply = () => {
    if (hasErrors || !mode) return;
    onApply({
      status,
      mode,
      commissionRate: mode === "commission" ? Number(commissionRate) : row.commissionRate,
      depositPrice: mode === "deposit" ? depositValue : row.depositPrice,
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal product-share-agency-modal seller-sales-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-sales-setting-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="seller-sales-setting-title">판매점 판매설정</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="product-share-agency-body">
          <dl className="product-share-agency-target seller-sales-modal-target">
            <div>
              <dt>판매점명</dt>
              <dd>
                <strong>{row.sellerName}</strong>
              </dd>
            </div>
            <div>
              <dt>판매점코드</dt>
              <dd>{row.sellerCode}</dd>
            </div>
            <div>
              <dt>현재 판매상태</dt>
              <dd>
                <span className={`badge ${sellerSalesStatusBadgeClass(row.status)}`}>{row.status}</span>
              </dd>
            </div>
            <div>
              <dt>현재 판매방식</dt>
              <dd>
                <span className={`badge ${sellerSalesModeBadgeClass(row.mode)}`}>{sellerSalesModeLabel(row.mode)}</span>
              </dd>
            </div>
          </dl>

          <div className="product-share-setting-row">
            <span className="product-share-setting-label">판매상태</span>
            <div className="product-share-setting-row-body">
              <div className="product-share-setting-radios" role="radiogroup" aria-label="판매상태">
                {STATUSES.map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="seller-sales-status"
                      checked={status === value}
                      disabled={salesLocked && value === "판매중"}
                      onChange={() => setStatus(value)}
                    />
                    {value === "판매중" ? "판매" : "판매중지"}
                  </label>
                ))}
              </div>
              {salesLocked ? (
                <p className="product-share-setting-help">
                  이용중지된 판매점입니다. 판매점관리에서 이용을 재개한 후 판매로 변경할 수 있습니다.
                </p>
              ) : status === "판매중지" && (
                <p className="product-share-setting-help">판매중지 시 판매점에서 이 상품의 신규 판매가 중단됩니다.</p>
              )}
            </div>
          </div>

          <div className="product-share-setting-row">
            <span className="product-share-setting-label">판매방식</span>
            <div className="product-share-setting-row-body">
              <div className="product-share-setting-option-list" role="radiogroup" aria-label="판매방식">
                {MODES.map((value) => (
                  <label
                    key={value}
                    className={`seller-sales-mode-option is-${value}${mode === value ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="seller-sales-mode"
                      checked={mode === value}
                      onChange={() => setMode(value)}
                    />
                    <span>
                      <strong>{SELLER_SALES_MODE_LABELS[value]}</strong>
                      <small>{SELLER_SALES_MODE_DESCRIPTIONS[value]}</small>
                      <em>{SELLER_SALES_MODE_FLOW[value]}</em>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {mode === "commission" ? (
            <>
              <div className="product-share-setting-row">
                <span className="product-share-setting-label">상품 판매가</span>
                <div className="product-share-setting-row-body">
                  <div className="seller-sales-readonly">
                    <strong>{formatWon(supplyPrice)}</strong>
                    <span className="badge gray">
                      <Lock size={10} />
                      판매점 수정 불가
                    </span>
                  </div>
                  <p className="product-share-setting-help">공급여행사가 설정한 상품 판매가이며 판매점에서도 동일하게 판매됩니다.</p>
                </div>
              </div>
              <div className="product-share-setting-row">
                <span className="product-share-setting-label">판매수수료</span>
                <div className="product-share-setting-row-body">
                  <div className="product-share-setting-commission">
                    <span>판매가 기준</span>
                    <div className="product-share-setting-unit-input">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={commissionRate}
                        onChange={(event) => changeCommission(event.target.value)}
                        placeholder="0"
                        aria-label="판매수수료율"
                        aria-invalid={commissionTouched && Boolean(commissionError)}
                      />
                      <b>%</b>
                    </div>
                    <small className="product-share-setting-help">0~100% 범위로 입력합니다.</small>
                  </div>
                  {commissionTouched && commissionError && (
                    <p className="product-share-agency-error" role="alert">
                      {commissionError}
                    </p>
                  )}
                </div>
              </div>
              <p className="product-share-setting-alert seller-sales-notice" role="note">
                <Info size={13} />
                {SELLER_COMMISSION_NOTICE}
              </p>
            </>
          ) : mode === "deposit" ? (
            <>
              <div className="product-share-setting-row">
                <span className="product-share-setting-label">판매점 입금가</span>
                <div className="product-share-setting-row-body">
                  <div className="product-share-setting-commission">
                    <div className="product-share-setting-unit-input seller-sales-price-input">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={depositPrice}
                        onChange={(event) => changeDeposit(event.target.value)}
                        placeholder="0"
                        aria-label="판매점 입금가"
                        aria-invalid={depositTouched && Boolean(depositError)}
                      />
                      <b>원</b>
                    </div>
                  </div>
                  <p className="product-share-setting-help">{SELLER_DEPOSIT_PRICE_HELP}</p>
                  {depositTouched && depositError && (
                    <p className="product-share-agency-error" role="alert">
                      {depositError}
                    </p>
                  )}
                </div>
              </div>
              <div className="product-share-setting-row">
                <span className="product-share-setting-label">판매점 판매가</span>
                <div className="product-share-setting-row-body">
                  <div className="seller-sales-readonly">
                    {row.sellerPrice != null ? (
                      <strong>{formatWon(row.sellerPrice)}</strong>
                    ) : (
                      <span className="badge gray">미설정</span>
                    )}
                    <span className="badge info">조회용</span>
                    {row.sellerPriceUpdatedAt && <small>판매점 설정일 {row.sellerPriceUpdatedAt}</small>}
                  </div>
                  <p className="product-share-setting-help">
                    판매점이 직접 설정한 판매가입니다. 공급여행사는 입금가만 설정하며 판매가는 수정할 수 없습니다.
                  </p>
                </div>
              </div>
              <p className="product-share-setting-alert seller-sales-notice" role="note">
                <Info size={13} />
                {SELLER_DEPOSIT_NOTICE}
              </p>
            </>
          ) : (
            <p className="product-share-setting-alert" role="note">
              <Info size={13} />
              판매방식을 선택하면 판매조건을 입력할 수 있습니다. 판매조건을 설정해야 판매가 시작됩니다.
            </p>
          )}

          {mode && (
            <section className={`seller-sales-summary is-${mode}`} aria-label="판매조건 요약">
              <header>
                <strong>판매조건 요약</strong>
                <span className={`badge ${sellerSalesModeBadgeClass(mode)}`}>{SELLER_SALES_MODE_LABELS[mode]}</span>
                <span className={`badge ${sellerSalesStatusBadgeClass(status)}`}>{status}</span>
              </header>
              <ol className="seller-sales-flow">
                {mode === "commission" ? (
                  <>
                    <li>
                      <small>공급 판매가</small>
                      <strong>{formatWon(supplyPrice)}</strong>
                    </li>
                    <li>
                      <small>판매점 판매가 (동일)</small>
                      <strong>{formatWon(figures.sellerPrice)}</strong>
                    </li>
                    <li className="is-result">
                      <small>판매점 예상수익 (수수료 {commissionRate || 0}%)</small>
                      <strong>{formatWon(figures.expectedProfit)}</strong>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <small>입금가</small>
                      <strong>{formatWon(depositValue)}</strong>
                    </li>
                    <li>
                      <small>판매점 판매가</small>
                      <strong>{row.sellerPrice != null ? formatWon(row.sellerPrice) : "미설정"}</strong>
                    </li>
                    <li className="is-result">
                      <small>판매점 예상마진</small>
                      <strong>
                        {figures.expectedProfit != null ? formatWon(figures.expectedProfit) : "판매가 설정 후 계산"}
                      </strong>
                    </li>
                  </>
                )}
              </ol>
              {marginWarning && (
                <p className="product-share-agency-error" role="alert">
                  {marginWarning}
                </p>
              )}
            </section>
          )}
        </div>

        <div className="modal-actions product-share-picker-actions">
          <span>화면 확인용 Mock 설정입니다. 실제 저장되지 않습니다.</span>
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" onClick={apply} disabled={hasErrors}>
            설정 적용
          </button>
        </div>
      </div>
    </div>
  );
}
