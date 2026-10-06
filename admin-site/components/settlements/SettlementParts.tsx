"use client";

import { useState, useSyncExternalStore } from "react";
import { AlertTriangle, X } from "lucide-react";
import {
  SETTLEMENT_HOLD_REASONS,
  SETTLEMENT_PAYMENT_METHODS,
  formatSignedWon,
  formatWon,
  settlementStatusBadgeClass,
  type SettlementHoldReason,
  type SettlementPerspective,
  type SettlementRecord,
  type SettlementStatus,
} from "@/lib/admin/settlement-data";

const queryListeners = new Set<() => void>();

function subscribeQuery(listener: () => void) {
  queryListeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    queryListeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

/** URL query 값을 화면 state로 사용합니다. (?tab= 등, 새로고침/뒤로가기 유지) */
export function useQueryParam(name: string, fallback: string) {
  const value = useSyncExternalStore(
    subscribeQuery,
    () => new URLSearchParams(window.location.search).get(name) ?? fallback,
    () => fallback,
  );
  const setValue = (next: string) => {
    const url = new URL(window.location.href);
    if (next === fallback) url.searchParams.delete(name);
    else url.searchParams.set(name, next);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
    queryListeners.forEach((listener) => listener());
  };
  return [value, setValue] as const;
}

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  return <span className={`badge ${settlementStatusBadgeClass(status)}`}>{status}</span>;
}

/** 목록용 수수료 셀: 판매수수료 / 판매점 수수료율과 합계 */
export function SettlementCommissionCell({ record }: { record: SettlementRecord }) {
  const b = record.breakdown;
  const title = [
    `판매수수료 ${b.affiliateCommissionRate}% ${formatWon(b.affiliateCommission)}`,
    record.sellerName ? `판매점 수수료 ${b.sellerCommissionRate}% ${formatWon(b.sellerCommission)}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
  return (
    <span className="settlement-commission-cell" title={title}>
      <small>
        판매 {b.affiliateCommissionRate}%{record.sellerName ? ` · 판매점 ${b.sellerCommissionRate}%` : ""}
      </small>
      <b>{formatWon(b.totalCommission)}</b>
    </span>
  );
}

export type SettlementCalcRow = {
  label: string;
  value: number;
  /** "-" 차감 / "+" 가산 / "=" 합계 / "±" 부호 포함 조정금액 */
  sign?: "-" | "+" | "=" | "±";
  hint?: string;
};

function calcRowClass(row: SettlementCalcRow) {
  if (row.sign === "=") return "is-total";
  if (row.sign === "-" || (row.sign === "±" && row.value < 0)) return "is-minus";
  if (row.sign === "+" || (row.sign === "±" && row.value > 0)) return "is-plus";
  return "";
}

/** 세로 계산식 (판매금액 / 정산 배분 / 최종 정산액) */
export function SettlementCalc({ rows }: { rows: SettlementCalcRow[] }) {
  return (
    <dl className="settlement-calc">
      {rows.map((row) => (
        <div key={row.label} className={calcRowClass(row)}>
          <dt>
            {row.label}
            {row.hint && <small>{row.hint}</small>}
          </dt>
          <dd>
            {row.sign === "±" || row.value < 0 ? (
              formatSignedWon(row.value)
            ) : (
              <>
                {row.sign && <em>{row.sign}</em>}
                {formatWon(row.value)}
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SettlementPerspectiveCard({ perspective }: { perspective: SettlementPerspective }) {
  return (
    <section className="panel member-web-detail-card settlement-perspective-card">
      <div className="member-web-detail-card-head">
        <strong>{perspective.title}</strong>
        <span className="badge info">{perspective.description}</span>
      </div>
      <div className="settlement-perspective-grid">
        {perspective.items.map((item) => (
          <div key={item.label} className={item.emphasis ? "is-emphasis" : ""}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SettlementPaymentModal({
  record,
  defaultDate,
  onClose,
  onConfirm,
}: {
  record: SettlementRecord;
  defaultDate: string;
  onClose: () => void;
  onConfirm: (payment: { paidAt: string; amount: number; method: string; memo: string }) => void;
}) {
  const confirmedAmount = record.breakdown.supplierAmount;
  const expected = record.amounts.finalSupplierAmount;
  const hasAdjustment = expected !== confirmedAmount;
  const [paidAt, setPaidAt] = useState(defaultDate);
  const [amount, setAmount] = useState(expected);
  const [method, setMethod] = useState<string>(SETTLEMENT_PAYMENT_METHODS[0]);
  const [memo, setMemo] = useState("");
  const invalid = !paidAt || !Number.isFinite(amount) || amount <= 0;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal settlement-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settlement-payment-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="settlement-payment-title">지급완료 처리하시겠습니까?</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="product-share-agency-body">
          <dl className="product-share-confirm-details">
            <div>
              <dt>정산번호</dt>
              <dd>{record.settlementCode}</dd>
            </div>
            <div>
              <dt>공급여행사</dt>
              <dd>{record.supplierAgencyName}</dd>
            </div>
            <div>
              <dt>확정 정산액</dt>
              <dd>{formatWon(confirmedAmount)}</dd>
            </div>
            {hasAdjustment && (
              <>
                <div>
                  <dt>정산 조정</dt>
                  <dd>{formatSignedWon(expected - confirmedAmount)}</dd>
                </div>
                <div>
                  <dt>최종 정산액</dt>
                  <dd>{formatWon(expected)}</dd>
                </div>
              </>
            )}
          </dl>
          <div className="settlement-modal-form">
            <label>
              <span>지급일</span>
              <input type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
            </label>
            <label>
              <span>지급금액</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={amount}
                onChange={(event) => setAmount(Math.max(0, Number(event.target.value) || 0))}
              />
            </label>
            <label>
              <span>지급방법</span>
              <select value={method} onChange={(event) => setMethod(event.target.value)}>
                {SETTLEMENT_PAYMENT_METHODS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="is-wide">
              <span>메모</span>
              <textarea rows={2} value={memo} maxLength={200} onChange={(event) => setMemo(event.target.value)} />
            </label>
          </div>
          {hasAdjustment && (
            <div className="settlement-amount-presets">
              <span>빠른 입력</span>
              <button type="button" className="secondary" onClick={() => setAmount(expected)}>
                최종 정산액 {formatWon(expected)}
              </button>
              <button type="button" className="secondary" onClick={() => setAmount(confirmedAmount)}>
                확정 정산액 {formatWon(confirmedAmount)}
              </button>
            </div>
          )}
          {amount !== expected && (
            <p className="product-share-setting-alert" role="alert">
              <AlertTriangle size={13} />
              지급금액({formatWon(amount)})이 최종 정산액({formatWon(expected)})과 다릅니다.
              {hasAdjustment && " 반영대기 조정금액은 차기 정산으로 이월됩니다."}
            </p>
          )}
          <p className="product-share-setting-help">실제 계좌이체·은행 연동 없이 화면 상태에만 기록됩니다. (SAMPLE)</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            disabled={invalid}
            onClick={() => onConfirm({ paidAt, amount, method, memo: memo.trim() })}
          >
            지급완료
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettlementHoldModal({
  record,
  onClose,
  onConfirm,
}: {
  record: SettlementRecord;
  onClose: () => void;
  onConfirm: (reason: SettlementHoldReason, detail: string) => void;
}) {
  const [reason, setReason] = useState<SettlementHoldReason | "">("");
  const [detail, setDetail] = useState("");
  const needsDetail = reason === "기타";
  const canConfirm = reason !== "" && (!needsDetail || detail.trim().length > 0);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal settlement-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settlement-hold-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="settlement-hold-title">정산을 보류하시겠습니까?</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="product-share-agency-body">
          <dl className="product-share-confirm-details">
            <div>
              <dt>정산번호</dt>
              <dd>{record.settlementCode}</dd>
            </div>
            <div>
              <dt>현재 상태</dt>
              <dd>{record.status}</dd>
            </div>
          </dl>
          <fieldset className="shared-product-reject-reasons">
            <legend>보류사유</legend>
            {SETTLEMENT_HOLD_REASONS.map((option) => (
              <label key={option}>
                <input
                  type="radio"
                  name="settlement-hold-reason"
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
              aria-label="기타 보류사유"
              rows={3}
              maxLength={200}
              placeholder="보류사유를 입력해주세요."
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
            />
          )}
          <p className="product-share-setting-help">보류 중에는 보류 해제 외 정산확정·지급 Action이 제한됩니다.</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            disabled={!canConfirm}
            onClick={() => reason && onConfirm(reason, detail)}
          >
            정산보류
          </button>
        </div>
      </div>
    </div>
  );
}
