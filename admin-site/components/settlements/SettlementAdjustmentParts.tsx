"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, Plus, RotateCcw, X, XCircle } from "lucide-react";
import { SettlementCalc, type SettlementCalcRow } from "@/components/settlements/SettlementParts";
import { RESERVATION_CANCELLATION_LABELS, type ReservationCancellationType } from "@/lib/admin/reservations-data";
import {
  CANCELLATION_FEE_OWNERS,
  SETTLEMENT_ADJUSTMENT_APPLY_LABELS,
  SETTLEMENT_ADJUSTMENT_STATE_LABELS,
  SETTLEMENT_CANCELLATION_REASONS,
  adjustmentCauseBadgeClass,
  adjustmentDirectionBadgeClass,
  adjustmentStatusBadgeClass,
  calculateSettlement,
  formatSignedWon,
  formatWon,
  getAdjustmentApplyOptions,
  getAdjustmentDirection,
  isSettlementAmountLocked,
  validateManualAdjustment,
  validateSettlementCancellation,
  type CancellationFeeOwner,
  type ManualAdjustmentInput,
  type SettlementAdjustmentApplyTo,
  type SettlementAdjustmentState,
  type SettlementAdjustmentView,
  type SettlementChange,
  type SettlementConfirmationStatus,
  type SettlementCancellationInput,
  type SettlementRecord,
  type SettlementStatus,
} from "@/lib/admin/settlement-data";

/** 목록/상세 보조 Badge: 조정필요 · 차기정산 예정 */
export function SettlementAdjustmentStateBadge({ state }: { state: SettlementAdjustmentState }) {
  if (state === "none") return null;
  return <span className={`badge ${state === "required" ? "danger" : "warn"}`}>{SETTLEMENT_ADJUSTMENT_STATE_LABELS[state]}</span>;
}

export function SettlementAdjustmentTypeBadges({ adjustment }: { adjustment: Pick<SettlementAdjustmentView, "direction" | "cause"> }) {
  return (
    <span className="settlement-adjustment-badges">
      <span className={`badge ${adjustmentDirectionBadgeClass(adjustment.direction)}`}>{adjustment.direction}</span>
      <span className={`badge ${adjustmentCauseBadgeClass(adjustment.cause)}`}>{adjustment.cause}</span>
    </span>
  );
}

/** 변경 전/후 금액 (사용자 표시용) */
export function SettlementChangeList({ changes }: { changes?: SettlementChange[] }) {
  if (!changes?.length) return null;
  return (
    <ul className="settlement-change-list">
      {changes.map((change) => (
        <li key={change.label}>
          <span>{change.label}</span>
          <s>{change.before}</s>
          <em>→</em>
          <b>{change.after}</b>
        </li>
      ))}
    </ul>
  );
}

function ApplyToField({
  status,
  value,
  onChange,
}: {
  status: SettlementStatus;
  value: SettlementAdjustmentApplyTo;
  onChange: (value: SettlementAdjustmentApplyTo) => void;
}) {
  const options = getAdjustmentApplyOptions(status);
  return (
    <fieldset className="shared-product-reject-reasons settlement-apply-field">
      <legend>적용방식</legend>
      <label title={options.current.reason}>
        <input
          type="radio"
          name="settlement-apply-to"
          checked={value === "current"}
          disabled={!options.current.allowed}
          onChange={() => onChange("current")}
        />
        {options.current.label}
        {!options.current.allowed && <small>(지급완료 · 선택 불가)</small>}
      </label>
      <label>
        <input
          type="radio"
          name="settlement-apply-to"
          checked={value === "next"}
          disabled={!options.next.allowed}
          onChange={() => onChange("next")}
        />
        {options.next.label}
      </label>
    </fieldset>
  );
}

export function ModalFrame({
  id,
  title,
  onClose,
  children,
  actions,
}: {
  id: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal settlement-modal" role="dialog" aria-modal="true" aria-labelledby={id} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h3 id={id}>{title}</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="product-share-agency-body">{children}</div>
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  );
}

function toAmount(value: string) {
  return value.trim() === "" ? 0 : Number(value);
}

export function MessageList({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (!errors.length && !warnings.length) return null;
  return (
    <div className="settlement-modal-messages">
      {errors.map((message) => (
        <p key={message} className="product-share-setting-alert is-error" role="alert">
          <XCircle size={13} />
          {message}
        </p>
      ))}
      {warnings.map((message) => (
        <p key={message} className="product-share-setting-alert" role="status">
          <AlertTriangle size={13} />
          {message}
        </p>
      ))}
    </div>
  );
}

/** 취소/환불 처리 Modal (Mock 입력 · 취소규정 자동계산 없음) */
export function SettlementCancellationModal({
  record,
  onClose,
  onApply,
}: {
  record: SettlementRecord;
  onClose: () => void;
  onApply: (input: SettlementCancellationInput) => string[];
}) {
  const live = record.liveBreakdown;
  const paid = live.paidAmount;
  const hasSeller = Boolean(record.sellerName);
  const locked = isSettlementAmountLocked(record.settlement);
  const [type, setType] = useState<ReservationCancellationType>(record.cancellation?.type ?? "partial");
  const [refund, setRefund] = useState(record.cancellation ? String(record.cancellation.refundAmount) : "");
  const [fee, setFee] = useState(record.cancellation ? String(record.cancellation.cancellationFee) : "");
  const [feeOwner, setFeeOwner] = useState<CancellationFeeOwner>(live.cancellationFeeOwner);
  const [reason, setReason] = useState("");
  const [memo, setMemo] = useState("");
  const [applyTo, setApplyTo] = useState<SettlementAdjustmentApplyTo>(getAdjustmentApplyOptions(record.status).defaultValue);
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const refundAmount = toAmount(refund);
  const cancellationFee = toAmount(fee);
  const validation = validateSettlementCancellation(paid, { type, refundAmount, cancellationFee, reason, feeOwner });
  const preview = validation.errors.length
    ? null
    : calculateSettlement({
        grossAmount: live.grossAmount,
        discountAmount: live.discountAmount,
        refundAmount,
        cancellationFee,
        cancellationFeeOwner: feeOwner,
        affiliateCommissionRate: live.affiliateCommissionRate,
        sellerCommissionRate: live.sellerCommissionRate,
      });
  const settledBase = live.supplierAmount - record.amounts.unresolvedDifference;
  const projectedDifference = preview ? preview.supplierAmount - settledBase : 0;

  const touch = <T,>(setter: (value: T) => void) => (value: T) => {
    setTouched(true);
    setServerErrors([]);
    setter(value);
  };

  const submit = () => {
    setTouched(true);
    if (validation.errors.length) return;
    const errors = onApply({ type, refundAmount, cancellationFee, feeOwner, reason, memo, applyTo });
    setServerErrors(errors);
  };

  return (
    <ModalFrame
      id="settlement-cancellation-title"
      title="취소/환불 처리"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" disabled={touched && validation.errors.length > 0} onClick={submit}>
            적용
          </button>
        </>
      }
    >
      <dl className="product-share-confirm-details">
        <div>
          <dt>정산번호</dt>
          <dd>
            {record.settlementCode} · {record.status}
          </dd>
        </div>
        <div>
          <dt>고객 결제금액</dt>
          <dd>{formatWon(paid)}</dd>
        </div>
        <div>
          <dt>현재 취소상태</dt>
          <dd>{RESERVATION_CANCELLATION_LABELS[record.cancellationStatus]}</dd>
        </div>
      </dl>
      <fieldset className="shared-product-reject-reasons settlement-apply-field">
        <legend>취소유형</legend>
        {(["partial", "full"] as const).map((option) => (
          <label key={option}>
            <input type="radio" name="settlement-cancel-type" checked={type === option} onChange={() => touch(setType)(option)} />
            {RESERVATION_CANCELLATION_LABELS[option]}
          </label>
        ))}
      </fieldset>
      <div className="settlement-modal-form">
        <label>
          <span>환불금액 (누적)</span>
          <input type="number" min={0} step={1000} aria-label="환불금액" value={refund} onChange={(event) => touch(setRefund)(event.target.value)} />
        </label>
        <label>
          <span>취소수수료 (누적)</span>
          <input type="number" min={0} step={1000} aria-label="취소수수료" value={fee} onChange={(event) => touch(setFee)(event.target.value)} />
        </label>
        <label>
          <span>취소수수료 귀속 · 정책값</span>
          <select aria-label="취소수수료 귀속" value={feeOwner} onChange={(event) => touch(setFeeOwner)(event.target.value as CancellationFeeOwner)}>
            {CANCELLATION_FEE_OWNERS.map((owner) => (
              <option key={owner} value={owner} disabled={owner === "비율배분" || (owner === "판매점" && !hasSeller)}>
                {owner}
                {owner === "비율배분" ? " (미지원)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>처리사유</span>
          <select aria-label="처리사유" value={reason} onChange={(event) => touch(setReason)(event.target.value)}>
            <option value="">선택</option>
            {SETTLEMENT_CANCELLATION_REASONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="is-wide">
          <span>메모</span>
          <textarea rows={2} maxLength={200} aria-label="취소 메모" value={memo} onChange={(event) => touch(setMemo)(event.target.value)} />
        </label>
      </div>
      {type === "full" && (
        <button
          type="button"
          className="secondary settlement-inline-button"
          onClick={() => touch(setRefund)(String(Math.max(0, paid - cancellationFee)))}
        >
          <RotateCcw size={12} /> 결제금액 − 취소수수료 = 환불금액 입력
        </button>
      )}
      {preview && (
        <div className="settlement-modal-preview">
          <strong>적용 후 정산 미리보기</strong>
          <SettlementChangeList
            changes={[
              { label: "정산대상금액", before: formatWon(live.settlementBaseAmount), after: formatWon(preview.settlementBaseAmount) },
              { label: "판매수수료", before: formatWon(live.affiliateCommission), after: formatWon(preview.affiliateCommission) },
              ...(hasSeller
                ? [{ label: "판매점 수수료", before: formatWon(live.sellerCommission), after: formatWon(preview.sellerCommission) }]
                : []),
              { label: "공급사 정산액", before: formatWon(live.supplierAmount), after: formatWon(preview.supplierAmount) },
            ]}
          />
          {locked ? (
            <p className="product-share-setting-help">
              {record.status} 상태 · 기존 확정 정산액은 유지되고{" "}
              {projectedDifference !== 0
                ? `${getAdjustmentDirection(projectedDifference)} ${formatWon(Math.abs(projectedDifference))} 조정내역이 생성됩니다.`
                : "차액이 없어 조정내역은 생성되지 않습니다."}
            </p>
          ) : (
            <p className="product-share-setting-help">정산대기 상태 · 정산금액이 자동 재계산되며 별도 조정건은 생성되지 않습니다.</p>
          )}
        </div>
      )}
      {locked && <ApplyToField status={record.status} value={applyTo} onChange={touch(setApplyTo)} />}
      <MessageList errors={touched ? [...validation.errors, ...serverErrors] : []} warnings={validation.warnings} />
      <p className="product-share-setting-help">
        실제 PG 환불·카드 부분취소 없이 화면 상태에만 반영됩니다. 판매수수료는 (정산대상금액 − 취소수수료) 기준으로 재계산하고, 취소수수료는 귀속 대상에 배분합니다. (Mock 정책)
      </p>
    </ModalFrame>
  );
}

/** 수동조정 추가 Modal */
export function SettlementManualAdjustmentModal({
  record,
  onClose,
  onApply,
}: {
  record: SettlementRecord;
  onClose: () => void;
  onApply: (input: ManualAdjustmentInput) => string[];
}) {
  const options = getAdjustmentApplyOptions(record.status);
  const [direction, setDirection] = useState<ManualAdjustmentInput["direction"]>("add");
  const [amountText, setAmountText] = useState("");
  const [reason, setReason] = useState("");
  const [memo, setMemo] = useState("");
  const [applyTo, setApplyTo] = useState<SettlementAdjustmentApplyTo>(options.defaultValue);
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const amount = toAmount(amountText);
  const errors = validateManualAdjustment({ amount, reason }, record.status);
  const signed = direction === "deduct" ? -amount : amount;
  const final = record.amounts.finalSupplierAmount;

  const touch = <T,>(setter: (value: T) => void) => (value: T) => {
    setTouched(true);
    setServerErrors([]);
    setter(value);
  };

  const submit = () => {
    setTouched(true);
    if (errors.length) return;
    setServerErrors(onApply({ direction, amount, reason, memo, applyTo }));
  };

  return (
    <ModalFrame
      id="settlement-manual-title"
      title="수동조정 추가"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" disabled={touched && errors.length > 0} onClick={submit}>
            저장
          </button>
        </>
      }
    >
      <p className="product-share-setting-alert" role="note">
        <AlertTriangle size={13} />
        수동조정은 정산금액에 영향을 줍니다.
      </p>
      <dl className="product-share-confirm-details">
        <div>
          <dt>정산번호</dt>
          <dd>
            {record.settlementCode} · {record.status}
          </dd>
        </div>
        <div>
          <dt>현재 최종 정산액</dt>
          <dd>{formatWon(final)}</dd>
        </div>
      </dl>
      <fieldset className="shared-product-reject-reasons settlement-apply-field">
        <legend>조정유형</legend>
        <label>
          <input type="radio" name="settlement-manual-direction" checked={direction === "add"} onChange={() => touch(setDirection)("add")} />
          추가 (+)
        </label>
        <label>
          <input type="radio" name="settlement-manual-direction" checked={direction === "deduct"} onChange={() => touch(setDirection)("deduct")} />
          차감 (−)
        </label>
      </fieldset>
      <div className="settlement-modal-form">
        <label>
          <span>금액</span>
          <input type="number" min={0} step={1000} aria-label="조정금액" value={amountText} onChange={(event) => touch(setAmountText)(event.target.value)} />
        </label>
        <label className="settlement-modal-form-span2">
          <span>사유 (필수)</span>
          <input aria-label="조정사유" maxLength={60} value={reason} onChange={(event) => touch(setReason)(event.target.value)} />
        </label>
        <label className="is-wide">
          <span>메모</span>
          <textarea rows={2} maxLength={200} aria-label="조정 메모" value={memo} onChange={(event) => touch(setMemo)(event.target.value)} />
        </label>
      </div>
      <ApplyToField status={record.status} value={applyTo} onChange={touch(setApplyTo)} />
      {!errors.length && (
        <p className="product-share-setting-help">
          {applyTo === "current" && record.status !== "지급완료"
            ? `최종 정산액 ${formatWon(final)} → ${formatWon(final + signed)} (${formatSignedWon(signed)})`
            : `${formatSignedWon(signed)} 차기 정산 반영 예정 · 현재 정산액은 변경되지 않습니다.`}
        </p>
      )}
      <MessageList errors={touched ? [...errors, ...serverErrors] : []} warnings={[]} />
    </ModalFrame>
  );
}

/** 최종 정산금액 Summary */
export function SettlementFinalSummaryCard({ record }: { record: SettlementRecord }) {
  const locked = isSettlementAmountLocked(record.settlement);
  const amounts = record.amounts;
  const hasCancellation = record.liveBreakdown.refundAmount > 0 || record.liveBreakdown.cancellationFee > 0;
  const rows: SettlementCalcRow[] = [
    {
      label: locked ? "확정 정산액" : "기본 정산액",
      value: amounts.baseSupplierAmount,
      hint: locked ? "정산확정 시점 금액" : hasCancellation ? "취소/환불 반영 전 계산" : "현재 예약금액 기준",
    },
    {
      label: "환불/취소 조정",
      value: amounts.cancellationAdjustment,
      sign: "±",
      hint: locked ? "예약금액 변경 포함 · 현재 정산 반영분" : "정산대기 · 자동 재계산 반영",
    },
    { label: "수동조정", value: amounts.manualAdjustment, sign: "±", hint: "현재 정산 반영분" },
    ...(record.carriedAdjustments.length
      ? [
          {
            label: "이전 정산 조정",
            value: amounts.carriedAdjustment,
            sign: "±" as const,
            hint: record.carriedAdjustments.map((item) => item.settlementCode).join(", "),
          },
        ]
      : []),
    { label: "최종 정산액", value: amounts.finalSupplierAmount, sign: "=" },
  ];
  return (
    <section className="panel member-web-detail-card settlement-final-card">
      <div className="member-web-detail-card-head">
        <strong>최종 정산금액</strong>
        <span className="badge info">공급여행사 정산액 기준</span>
      </div>
      <SettlementCalc rows={rows} />
      {amounts.nextAdjustment !== 0 && (
        <p className="product-share-setting-help settlement-card-note">
          차기 정산 반영 예정 {formatSignedWon(amounts.nextAdjustment)} · 현재 최종 정산액에는 포함되지 않습니다.
        </p>
      )}
    </section>
  );
}

/** 취소/환불 정보 */
export function SettlementCancellationCard({
  record,
  canEdit,
  onEdit,
}: {
  record: SettlementRecord;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const cancellation = record.cancellation;
  const live = record.liveBreakdown;
  return (
    <section className="panel member-web-detail-card">
      <div className="member-web-detail-card-head">
        <strong>취소/환불 정보</strong>
        <span className="settlement-card-head-actions">
          <span className={`badge ${record.cancellationStatus === "none" ? "gray" : record.cancellationStatus === "full" ? "danger" : "warn"}`}>
            {RESERVATION_CANCELLATION_LABELS[record.cancellationStatus]}
          </span>
          <span className="badge gray">Mock 입력값 · 자동계산 아님</span>
          {canEdit && (
            <button type="button" className="secondary settlement-inline-button" onClick={onEdit}>
              취소/환불 처리
            </button>
          )}
        </span>
      </div>
      {cancellation ? (
        <div className="member-web-detail-info-grid">
          {[
            ["고객 결제금액", formatWon(live.paidAmount)],
            ["환불금액", `- ${formatWon(live.refundAmount)}`],
            ["취소수수료", formatWon(live.cancellationFee)],
            ["최종 정산대상금액", formatWon(live.settlementBaseAmount)],
            ["취소수수료 귀속", `${live.cancellationFeeOwner} (정책값)`],
            ["처리사유", cancellation.reason],
            ["처리일시", `${cancellation.processedAt} · ${cancellation.processedBy.name} (${cancellation.processedBy.agency})`],
            ...(cancellation.memo ? [["메모", cancellation.memo]] : []),
          ].map(([label, value]) => (
            <div key={label} className="member-web-detail-field">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="product-share-setting-help settlement-card-note">
          취소/환불 내역이 없습니다. 부분취소·전체취소 테스트는 [취소/환불 처리]로 Mock 값을 입력합니다.
        </p>
      )}
    </section>
  );
}

/** 정산조정 내역 */
export function SettlementAdjustmentSection({
  record,
  canManage,
  canAdjust,
  onAddManual,
  onCancelAdjustment,
  onCreateDifference,
  linkFor,
}: {
  record: SettlementRecord;
  canManage: boolean;
  canAdjust: boolean;
  onAddManual: () => void;
  onCancelAdjustment: (adjustment: SettlementAdjustmentView) => void;
  onCreateDifference: () => void;
  linkFor: (settlementCode: string) => string;
}) {
  const adjustments = [...record.adjustments].reverse();
  const unresolved = record.amounts.unresolvedDifference;
  return (
    <section className="panel member-web-detail-card" id="settlement-adjustments">
      <div className="member-web-detail-card-head">
        <strong>정산조정</strong>
        <span className="settlement-card-head-actions">
          <span className="member-web-status-history-count">{adjustments.length}건</span>
          {canManage && canAdjust && (
            <button type="button" className="secondary settlement-inline-button" onClick={onAddManual}>
              <Plus size={12} /> 수동조정 추가
            </button>
          )}
        </span>
      </div>
      {unresolved !== 0 && (
        <div className="product-share-setting-alert settlement-card-note" role="alert">
          <AlertTriangle size={13} />
          <span>
            조정내역이 생성되지 않은 차액 {formatSignedWon(unresolved)}이 있습니다.
          </span>
          {canManage && (
            <button type="button" className="secondary settlement-inline-button" onClick={onCreateDifference}>
              차액조정 생성
            </button>
          )}
        </div>
      )}
      <div className="member-web-detail-table-wrap">
        <table className="member-web-detail-table settlement-adjustment-table">
          <thead>
            <tr>
              <th>발생일시</th>
              <th>조정유형</th>
              <th>조정금액</th>
              <th>적용방식</th>
              <th>상태</th>
              <th>사유 / 변경 내용</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.length ? (
              adjustments.map((adjustment) => (
                <tr key={adjustment.id} className={adjustment.status === "취소" ? "is-excluded" : ""}>
                  <td className="date-cell">{adjustment.createdAt}</td>
                  <td>
                    <SettlementAdjustmentTypeBadges adjustment={adjustment} />
                  </td>
                  <td className="amount-cell">{formatSignedWon(adjustment.amount)}</td>
                  <td>
                    <span className="settlement-apply-cell">
                      {SETTLEMENT_ADJUSTMENT_APPLY_LABELS[adjustment.applyTo]}
                      {adjustment.applyTo === "next" && (
                        <small>
                          {adjustment.targetSettlementCode ? (
                            <Link href={linkFor(adjustment.targetSettlementCode)} className="reservation-code-link">
                              → {adjustment.targetSettlementCode}
                            </Link>
                          ) : (
                            "다음 정산 생성 시 반영"
                          )}
                        </small>
                      )}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${adjustmentStatusBadgeClass(adjustment.status)}`}>{adjustment.status}</span>
                  </td>
                  <td className="text-left">
                    <span className="settlement-adjustment-reason">
                      <b>{adjustment.reason}</b>
                      {adjustment.memo && <small>{adjustment.memo}</small>}
                      <SettlementChangeList changes={adjustment.changes} />
                    </span>
                  </td>
                  <td>
                    {canManage && adjustment.status === "반영대기" ? (
                      <button type="button" className="secondary settlement-inline-button" onClick={() => onCancelAdjustment(adjustment)}>
                        조정 취소
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className="member-web-empty">
                    <strong>조정내역이 없습니다.</strong>
                    <p>정산확정 이후 예약 변경·취소가 발생하거나 수동조정을 추가하면 표시됩니다.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** 차기 정산 반영 (이 정산에서 발생한 이월분 + 이전 정산에서 넘어온 반영분) */
export function SettlementNextAdjustmentSection({
  record,
  linkFor,
}: {
  record: SettlementRecord;
  linkFor: (settlementCode: string) => string;
}) {
  const outgoing = record.adjustments.filter((adjustment) => adjustment.applyTo === "next" && adjustment.status !== "취소");
  const incoming = record.carriedAdjustments;
  if (!outgoing.length && !incoming.length) return null;
  return (
    <section className="panel member-web-detail-card">
      <div className="member-web-detail-card-head">
        <strong>차기 정산 반영</strong>
        <span className="badge warn">Mock 연결 · 같은 공급/판매 관계의 다음 미지급 정산</span>
      </div>
      {outgoing.length > 0 && (
        <div className="settlement-next-list">
          {outgoing.map((adjustment) => (
            <div key={adjustment.id} className="member-web-detail-info-grid settlement-next-item">
              <div className="member-web-detail-field">
                <span>조정유형</span>
                <strong>
                  <SettlementAdjustmentTypeBadges adjustment={adjustment} />
                </strong>
              </div>
              <div className="member-web-detail-field">
                <span>조정금액</span>
                <strong>{formatSignedWon(adjustment.amount)}</strong>
              </div>
              <div className="member-web-detail-field">
                <span>발생예약</span>
                <strong>{adjustment.reservationCode}</strong>
              </div>
              <div className="member-web-detail-field">
                <span>발생사유</span>
                <strong>{adjustment.reason}</strong>
              </div>
              <div className="member-web-detail-field">
                <span>상태</span>
                <strong>
                  <span className={`badge ${adjustmentStatusBadgeClass(adjustment.status)}`}>{adjustment.status}</span>
                </strong>
              </div>
              <div className="member-web-detail-field">
                <span>반영 대상 정산</span>
                <strong>
                  {adjustment.targetSettlementCode ? (
                    <Link href={linkFor(adjustment.targetSettlementCode)} className="reservation-code-link">
                      {adjustment.targetSettlementCode}
                    </Link>
                  ) : (
                    "다음 정산 생성 시 반영"
                  )}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}
      {incoming.length > 0 && (
        <div className="settlement-next-incoming">
          <strong>이전 정산에서 넘어온 조정</strong>
          <SettlementCalc
            rows={[
              ...incoming.map((adjustment) => ({
                label: `이전 정산 ${adjustment.direction === "차감정산" ? "차감" : "추가"} · ${adjustment.settlementCode}`,
                value: adjustment.amount,
                sign: "±" as const,
                hint: `${adjustment.reservationCode} · ${adjustment.reason} · ${adjustment.status}`,
              })),
              {
                label: "현재 기본 정산",
                value: record.amounts.finalSupplierAmount - record.amounts.carriedAdjustment,
                hint: "이전 정산 조정 제외",
              },
              { label: "최종 지급예정", value: record.amounts.finalSupplierAmount, sign: "=" },
            ]}
          />
          <p className="product-share-setting-help">
            {incoming.map((adjustment) => (
              <Link key={adjustment.id} href={linkFor(adjustment.settlementCode)} className="reservation-code-link">
                {adjustment.settlementCode} 정산 보기
              </Link>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}

const CHECK_STATE_TEXT = { ok: "완료", warning: "확인 필요", blocker: "확정 불가" } as const;

/** 체크리스트 목록 (정산확정 · 정산마감 · 정산서 발행 기준 공통) */
export function SettlementCheckList({
  checks,
  blockerText = CHECK_STATE_TEXT.blocker,
}: {
  checks: SettlementConfirmationStatus["checks"];
  blockerText?: string;
}) {
  return (
    <ul className="settlement-check-list">
      {checks.map((check) => (
        <li key={check.key} className={`is-${check.state}`}>
          {check.state === "ok" ? <CheckCircle2 size={15} /> : check.state === "warning" ? <AlertTriangle size={15} /> : <XCircle size={15} />}
          <span>
            <b>{check.label}</b>
            <small>{check.detail}</small>
          </span>
          <em>{check.state === "blocker" ? blockerText : CHECK_STATE_TEXT[check.state]}</em>
        </li>
      ))}
    </ul>
  );
}

/** 정산 확정 기준 (Mock 상태 기반 체크) */
export function SettlementConfirmationCard({ confirmation, status }: { confirmation: SettlementConfirmationStatus; status: SettlementStatus }) {
  return (
    <section className="panel member-web-detail-card">
      <div className="member-web-detail-card-head">
        <strong>정산 확정 기준</strong>
        {status === "정산대기" ? (
          <span className={`badge ${confirmation.canConfirm ? (confirmation.warnings.length ? "warn" : "success") : "danger"}`}>
            {confirmation.canConfirm ? (confirmation.warnings.length ? "확정 가능 · 확인 필요" : "확정 가능") : "확정 불가"}
          </span>
        ) : (
          <span className="badge gray">{status} · 참고용</span>
        )}
      </div>
      <SettlementCheckList checks={confirmation.checks} />
      <p className="product-share-setting-help settlement-card-note">
        <Info size={12} /> 실제 서버 검증이 아닌 Mock 상태 기반 체크입니다. 확정 불가 항목이 있으면 정산확정 버튼이 비활성화됩니다.
      </p>
    </section>
  );
}
