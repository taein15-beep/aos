"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Circle, FileText, Info, Lock, Printer, XCircle } from "lucide-react";
import { MessageList, ModalFrame, SettlementCheckList } from "@/components/settlements/SettlementAdjustmentParts";
import {
  SETTLEMENT_DISPUTE_REASONS,
  SETTLEMENT_DOCUMENT_TYPE_LABELS,
  formatDocumentVersion,
  getCurrentDocumentVersion,
  getOpenDispute,
  getReceiverVisibleVersions,
  isSettlementDocumentOutdated,
  settlementDocumentStatusBadgeClass,
  validateDocumentForm,
  validateSettlementDispute,
  type SettlementDisputeInput,
  type SettlementDisputeReason,
  type SettlementDocument,
  type SettlementDocumentActionKey,
  type SettlementDocumentActionState,
  type SettlementDocumentForm,
  type SettlementDocumentIssueStatus,
  type SettlementDocumentParty,
  type SettlementDocumentSnapshot,
  type SettlementDocumentStatus,
  type SettlementDocumentType,
  type SettlementDocumentVersion,
} from "@/lib/admin/settlement-document-data";
import {
  adjustmentDirectionBadgeClass,
  adjustmentStatusBadgeClass,
  formatSignedWon,
  formatWon,
  type SettlementCloseCheckStatus,
  type SettlementPayment,
  type SettlementRecord,
} from "@/lib/admin/settlement-data";

export function SettlementDocumentStatusBadge({ status }: { status: SettlementDocumentStatus }) {
  return <span className={`badge ${settlementDocumentStatusBadgeClass(status)}`}>{status === "미발행" ? "정산서 미발행" : status}</span>;
}

/** ---------- 업무 흐름 ---------- */

type FlowState = "done" | "current" | "pending" | "issue" | "skipped";
const FLOW_STATE_TEXT: Record<FlowState, string> = { done: "완료", current: "진행 필요", pending: "대기", issue: "이의제기", skipped: "생략" };

/** 정산확정 → 정산마감 → 정산서 발행 → 상대방 확인 → 지급대기 → 지급완료 */
export function SettlementDocumentFlow({ record, document }: { record: SettlementRecord; document?: SettlementDocument }) {
  const status = record.status;
  const docStatus = document?.status;
  const paid = status === "지급완료";
  const paymentPending = status === "지급대기" || paid;
  const issued = docStatus === "발행완료" || docStatus === "확인대기" || docStatus === "확인완료" || docStatus === "이의제기";
  const raw: { label: string; done: boolean; issue?: boolean }[] = [
    { label: "정산확정", done: status === "정산확정" || paymentPending || Boolean(record.settlement.closing) },
    { label: "정산마감", done: Boolean(record.settlement.closing) },
    { label: "정산서 발행", done: issued },
    { label: "상대방 확인", done: docStatus === "확인완료", issue: docStatus === "이의제기" },
    { label: "지급대기", done: paymentPending },
    { label: "지급완료", done: paid },
  ];
  const lastDone = raw.reduce((index, step, current) => (step.done ? current : index), -1);
  const firstOpen = raw.findIndex((step) => !step.done);
  const steps = raw.map((step, index): { label: string; state: FlowState } => {
    if (step.done) return { label: step.label, state: "done" };
    if (step.issue) return { label: step.label, state: "issue" };
    if (index < lastDone) return { label: step.label, state: "skipped" };
    return { label: step.label, state: index === firstOpen && status !== "정산취소" && status !== "정산보류" ? "current" : "pending" };
  });
  return (
    <ol className="settlement-document-flow" aria-label="정산 업무 흐름">
      {steps.map((step) => (
        <li key={step.label} className={`is-${step.state}`}>
          {step.state === "done" ? <CheckCircle2 size={14} /> : step.state === "issue" ? <AlertTriangle size={14} /> : <Circle size={14} />}
          <span>
            <b>{step.label}</b>
            <small>{FLOW_STATE_TEXT[step.state]}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** ---------- 정산마감 체크리스트 ---------- */

export function SettlementCloseCard({ record, closeStatus }: { record: SettlementRecord; closeStatus: SettlementCloseCheckStatus }) {
  const closing = record.settlement.closing;
  const changedAfterClose = closing && closing.finalSupplierAmount !== record.amounts.finalSupplierAmount;
  return (
    <section className="panel member-web-detail-card">
      <div className="member-web-detail-card-head">
        <strong>정산마감</strong>
        {closing ? (
          <span className="settlement-card-head-actions">
            <span className="badge success">
              <Lock size={10} /> 정산마감 완료
            </span>
          </span>
        ) : (
          <span className={`badge ${closeStatus.canClose ? (closeStatus.warnings.length ? "warn" : "success") : "danger"}`}>
            {closeStatus.canClose ? (closeStatus.warnings.length ? "마감 가능 · 확인 필요" : "마감 가능") : "마감 불가"}
          </span>
        )}
      </div>
      {closing && (
        <div className="member-web-detail-info-grid">
          <div className="member-web-detail-field">
            <span>마감일시</span>
            <strong>{closing.closedAt}</strong>
          </div>
          <div className="member-web-detail-field">
            <span>처리자</span>
            <strong>
              {closing.closedBy.name} ({closing.closedBy.agency})
            </strong>
          </div>
          <div className="member-web-detail-field">
            <span>마감 기준 최종 정산액</span>
            <strong>{formatWon(closing.finalSupplierAmount)}</strong>
          </div>
          <div className="member-web-detail-field">
            <span>마감 이후 조정</span>
            <strong>{changedAfterClose ? formatSignedWon(record.amounts.finalSupplierAmount - closing.finalSupplierAmount) : "없음"}</strong>
          </div>
        </div>
      )}
      {!closing && <SettlementCheckList checks={closeStatus.checks} blockerText="마감 불가" />}
      <p className="product-share-setting-help settlement-card-note">
        <Info size={12} />
        {closing
          ? "정산마감 이후 기본 정산금액은 직접 수정할 수 없으며, 변경사항은 정산조정 내역으로 관리됩니다."
          : "정산확정 · 운영인계 · 취소/환불 · 수수료 · 조정내역이 확인되어야 마감할 수 있습니다. (Mock 상태 기반 체크)"}
      </p>
    </section>
  );
}

/** ---------- 정산서 생성 / 재발행 Modal ---------- */

export function SettlementDocumentFormModal({
  mode,
  record,
  initial,
  issueStatus,
  onClose,
  onSaveDraft,
  onSubmit,
}: {
  mode: "create" | "reissue";
  record: SettlementRecord;
  initial: SettlementDocumentForm;
  issueStatus: SettlementDocumentIssueStatus;
  onClose: () => void;
  onSaveDraft?: (form: SettlementDocumentForm) => void;
  onSubmit: (form: SettlementDocumentForm, reason: string) => string[];
}) {
  const [form, setForm] = useState<SettlementDocumentForm>(initial);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const errors = [
    ...validateDocumentForm(form),
    ...issueStatus.blockers,
    ...(mode === "reissue" && !reason.trim() ? ["재발행 사유를 입력해주세요."] : []),
  ];
  const update = <K extends keyof SettlementDocumentForm>(key: K, value: SettlementDocumentForm[K]) => {
    setTouched(true);
    setServerErrors([]);
    setForm((current) => ({ ...current, [key]: value }));
  };
  const submit = () => {
    setTouched(true);
    if (errors.length) return;
    setServerErrors(onSubmit(form, reason));
  };
  const title = mode === "create" ? "정산서 생성" : "정산서 재발행";

  return (
    <ModalFrame
      id="settlement-document-form-title"
      title={title}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          {mode === "create" && onSaveDraft && (
            <button type="button" className="secondary" onClick={() => onSaveDraft(form)}>
              임시저장
            </button>
          )}
          <button type="button" className="primary" disabled={touched && errors.length > 0} onClick={submit}>
            {title}
          </button>
        </>
      }
    >
      <dl className="product-share-confirm-details">
        <div>
          <dt>정산번호</dt>
          <dd>
            {record.settlementCode} · {record.status} · {record.closeStatus}
          </dd>
        </div>
        <div>
          <dt>공급여행사</dt>
          <dd>{record.supplierAgencyName}</dd>
        </div>
        <div>
          <dt>판매여행사</dt>
          <dd>
            {record.sellingAgencyName}
            {record.sellerName ? ` · 판매점 ${record.sellerName}` : ""}
          </dd>
        </div>
        <div>
          <dt>출발상품</dt>
          <dd>
            {record.productName} ({record.productCode}) · {record.departureAt}
          </dd>
        </div>
        <div>
          <dt>최종 정산액</dt>
          <dd>{formatWon(record.amounts.finalSupplierAmount)}</dd>
        </div>
      </dl>
      <fieldset className="shared-product-reject-reasons settlement-apply-field">
        <legend>문서 종류</legend>
        {(Object.keys(SETTLEMENT_DOCUMENT_TYPE_LABELS) as SettlementDocumentType[]).map((type) => (
          <label key={type}>
            <input type="radio" name="settlement-document-type" checked={form.documentType === type} onChange={() => update("documentType", type)} />
            {SETTLEMENT_DOCUMENT_TYPE_LABELS[type]}
            {type === "invoice" && <small>(Header만 영문 표기 · 동일 정산 데이터)</small>}
          </label>
        ))}
      </fieldset>
      <div className="settlement-modal-form">
        <label>
          <span>발행일</span>
          <input type="date" aria-label="발행일" value={form.issueDate} onChange={(event) => update("issueDate", event.target.value)} />
        </label>
        <label>
          <span>정산기간 시작</span>
          <input type="date" aria-label="정산기간 시작" value={form.periodFrom} onChange={(event) => update("periodFrom", event.target.value)} />
        </label>
        <label>
          <span>정산기간 종료</span>
          <input type="date" aria-label="정산기간 종료" value={form.periodTo} onChange={(event) => update("periodTo", event.target.value)} />
        </label>
        <label>
          <span>담당자</span>
          <input aria-label="담당자" maxLength={30} value={form.manager} onChange={(event) => update("manager", event.target.value)} />
        </label>
        {mode === "reissue" && (
          <label className="settlement-modal-form-span2">
            <span>재발행 사유 (필수)</span>
            <input
              aria-label="재발행 사유"
              maxLength={80}
              value={reason}
              onChange={(event) => {
                setTouched(true);
                setReason(event.target.value);
              }}
            />
          </label>
        )}
        <label className="is-wide">
          <span>비고</span>
          <textarea rows={3} maxLength={300} aria-label="비고" value={form.note} onChange={(event) => update("note", event.target.value)} />
        </label>
      </div>
      <SettlementCheckList checks={issueStatus.checks} blockerText="발행 불가" />
      <MessageList errors={touched ? Array.from(new Set([...errors, ...serverErrors])) : []} warnings={issueStatus.warnings} />
      <p className="product-share-setting-help">
        {mode === "create"
          ? "발행 시 현재 정산 데이터가 문서 snapshot(v1)으로 저장되며, 이후 정산금액이 바뀌어도 발행된 문서는 변경되지 않습니다."
          : "기존 버전은 삭제되지 않고 현재 정산 데이터로 새 버전이 추가됩니다. 재발행 후 다시 확인 요청이 필요합니다."}{" "}
        실제 PDF · 이메일 발송은 하지 않습니다. (SAMPLE)
      </p>
    </ModalFrame>
  );
}

/** ---------- 이의제기 Modal ---------- */

export function SettlementDisputeModal({
  record,
  document,
  onClose,
  onSubmit,
}: {
  record: SettlementRecord;
  document: SettlementDocument;
  onClose: () => void;
  onSubmit: (input: SettlementDisputeInput) => string[];
}) {
  const [input, setInput] = useState<SettlementDisputeInput>({ reason: "", reasonEtc: "", detail: "" });
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const errors = validateSettlementDispute(input);
  const current = getCurrentDocumentVersion(document);
  const update = (patch: Partial<SettlementDisputeInput>) => {
    setTouched(true);
    setServerErrors([]);
    setInput((value) => ({ ...value, ...patch }));
  };
  return (
    <ModalFrame
      id="settlement-dispute-title"
      title="정산내역 이의제기"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            disabled={touched && errors.length > 0}
            onClick={() => {
              setTouched(true);
              if (!errors.length) setServerErrors(onSubmit(input));
            }}
          >
            이의제기 등록
          </button>
        </>
      }
    >
      <dl className="product-share-confirm-details">
        <div>
          <dt>문서번호</dt>
          <dd>
            {document.documentNo} {current ? formatDocumentVersion(current.version) : ""}
          </dd>
        </div>
        <div>
          <dt>발행 여행사</dt>
          <dd>{record.supplierAgencyName}</dd>
        </div>
        <div>
          <dt>최종 정산액</dt>
          <dd>{formatWon(current?.snapshot.totals.finalSettlementAmount ?? 0)}</dd>
        </div>
      </dl>
      <fieldset className="shared-product-reject-reasons">
        <legend>이의제기 사유</legend>
        {SETTLEMENT_DISPUTE_REASONS.map((reason) => (
          <label key={reason}>
            <input type="radio" name="settlement-dispute-reason" checked={input.reason === reason} onChange={() => update({ reason: reason as SettlementDisputeReason })} />
            {reason}
          </label>
        ))}
      </fieldset>
      {input.reason === "기타" && (
        <textarea
          className="product-share-agency-memo"
          aria-label="기타 사유"
          rows={2}
          maxLength={100}
          placeholder="기타 사유를 입력해주세요."
          value={input.reasonEtc}
          onChange={(event) => update({ reasonEtc: event.target.value })}
        />
      )}
      <textarea
        className="product-share-agency-memo"
        aria-label="상세 내용"
        rows={3}
        maxLength={300}
        placeholder="상세 내용을 입력해주세요. (예: 판매금액 ₩207,000 기준으로 확인 필요)"
        value={input.detail}
        onChange={(event) => update({ detail: event.target.value })}
      />
      <MessageList errors={touched ? [...errors, ...serverErrors] : []} warnings={[]} />
      <p className="product-share-setting-help">이의제기 시 정산상태는 지급대기로 넘어가지 않으며, 공급여행사의 조정 · 재발행을 기다립니다.</p>
    </ModalFrame>
  );
}

/** ---------- 정산서 미리보기 (문서형 Card) ---------- */

const DOCUMENT_LABELS = {
  settlement_statement: {
    title: "AOS 정산서",
    no: "문서번호",
    issueDate: "발행일",
    supplier: "공급여행사",
    buyer: "판매여행사",
    seller: "판매점",
    description: "정산 대상",
    amount: "고객 결제금액",
    commission: "판매수수료",
    settlement: "최종 공급사 정산액",
  },
  invoice: {
    title: "INVOICE",
    no: "Invoice No.",
    issueDate: "Issue Date",
    supplier: "Supplier",
    buyer: "Buyer",
    seller: "Seller (판매점)",
    description: "Description",
    amount: "Amount (고객 결제금액)",
    commission: "Commission (판매여행사)",
    settlement: "Settlement Amount",
  },
} as const;

function PartyCard({ title, party }: { title: string; party?: SettlementDocumentParty }) {
  if (!party) return null;
  return (
    <div className="settlement-document-party">
      <strong>{title}</strong>
      <dl>
        <div>
          <dt>회사명</dt>
          <dd>{party.companyName}</dd>
        </div>
        {party.role !== "판매점" && (
          <div>
            <dt>사업자번호</dt>
            <dd className="is-muted">{party.businessNo ?? "미등록 (거래처 연동 전)"}</dd>
          </div>
        )}
        <div>
          <dt>담당자</dt>
          <dd>{party.manager ?? "-"}</dd>
        </div>
        {party.role !== "판매점" && (
          <div>
            <dt>연락처</dt>
            <dd className="is-muted">{party.contact ?? "미등록 (거래처 연동 전)"}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

type AmountRow = { item: string; base?: string; rate?: string; value: string; tone?: "minus" | "plus" | "subtotal" };

function buildAmountRows(snapshot: SettlementDocumentSnapshot): AmountRow[] {
  const t = snapshot.totals;
  const labels = DOCUMENT_LABELS[snapshot.documentType];
  const hasCancellation = t.refundAmount > 0 || t.cancellationFee > 0;
  const nonSupplierFee = t.cancellationFee - t.cancellationFeeSupplierShare;
  const rateText = (rate: number | null) => (rate === null ? "예약별 상이" : `${rate}%`);
  const rows: AmountRow[] = [{ item: labels.amount, value: formatWon(t.paidAmount) }];
  if (hasCancellation) {
    rows.push({ item: "환불금액", value: `- ${formatWon(t.refundAmount)}`, tone: "minus" });
    rows.push({
      item: "정산대상금액",
      value: formatWon(t.settlementBaseAmount),
      base: t.cancellationFee > 0 ? `취소수수료 ${formatWon(t.cancellationFee)} 포함` : undefined,
      tone: "subtotal",
    });
  }
  rows.push({
    item: labels.commission,
    base: formatWon(t.commissionBaseAmount),
    rate: rateText(t.affiliateCommissionRate),
    value: `- ${formatWon(t.affiliateCommission)}`,
    tone: "minus",
  });
  if (snapshot.seller) {
    rows.push({
      item: "판매점 수수료",
      base: formatWon(t.commissionBaseAmount),
      rate: rateText(t.sellerCommissionRate),
      value: `- ${formatWon(t.sellerCommission)}`,
      tone: "minus",
    });
  }
  if (nonSupplierFee > 0) {
    rows.push({ item: "취소수수료 (판매측 귀속)", base: formatWon(t.cancellationFee), value: `- ${formatWon(nonSupplierFee)}`, tone: "minus" });
  }
  rows.push({ item: "기본 공급사 정산액", value: formatWon(t.baseSupplierAmount), tone: "subtotal" });
  if (t.cancellationAdjustment !== 0) {
    rows.push({ item: "취소/환불 조정", value: formatSignedWon(t.cancellationAdjustment), tone: t.cancellationAdjustment < 0 ? "minus" : "plus" });
  }
  if (t.manualAdjustment !== 0) {
    rows.push({ item: "수동조정", value: formatSignedWon(t.manualAdjustment), tone: t.manualAdjustment < 0 ? "minus" : "plus" });
  }
  if (t.carriedAdjustment !== 0) {
    rows.push({ item: "이전 정산 조정", value: formatSignedWon(t.carriedAdjustment), tone: t.carriedAdjustment < 0 ? "minus" : "plus" });
  }
  return rows;
}

export function SettlementDocumentPreview({
  snapshot,
  documentNo,
  version,
  status,
  issuedAt,
  payment,
  previewLabel,
}: {
  snapshot: SettlementDocumentSnapshot;
  documentNo?: string;
  version?: SettlementDocumentVersion;
  status: SettlementDocumentStatus;
  issuedAt?: string;
  payment?: SettlementPayment;
  /** 미발행 미리보기 안내 */
  previewLabel?: string;
}) {
  const labels = DOCUMENT_LABELS[snapshot.documentType];
  const t = snapshot.totals;
  const rows = buildAmountRows(snapshot);
  const showLines = snapshot.scope === "departure" || snapshot.lines.length > 1;
  return (
    <article className={`settlement-document is-${snapshot.documentType}`} aria-label={`${labels.title} 미리보기`}>
      <header className="settlement-document-head">
        <div>
          <small>{snapshot.scope === "departure" ? "출발상품 단위" : "예약 단위"} · {SETTLEMENT_DOCUMENT_TYPE_LABELS[snapshot.documentType]}</small>
          <h2>{labels.title}</h2>
          {previewLabel && <p className="settlement-document-preview-label">{previewLabel}</p>}
        </div>
        <dl>
          <div>
            <dt>{labels.no}</dt>
            <dd>
              {documentNo ?? "발행 시 부여"}
              {version && <em>{formatDocumentVersion(version.version)}</em>}
            </dd>
          </div>
          <div>
            <dt>{labels.issueDate}</dt>
            <dd>{snapshot.issueDate}</dd>
          </div>
          <div>
            <dt>문서상태</dt>
            <dd>
              <SettlementDocumentStatusBadge status={status} />
            </dd>
          </div>
          {issuedAt && (
            <div>
              <dt>발행일시</dt>
              <dd>{issuedAt}</dd>
            </div>
          )}
        </dl>
      </header>

      {payment && (
        <div className="settlement-document-payment" role="status">
          <span className="badge success">지급완료</span>
          <span>
            지급일 <b>{payment.paidAt}</b>
          </span>
          <span>
            지급금액 <b>{formatWon(payment.amount)}</b>
          </span>
          <span>
            지급방법 <b>{payment.method}</b>
          </span>
          <small>지급정보는 현재 정산 기준이며 정산서 발행정보는 변경되지 않습니다.</small>
        </div>
      )}

      <section className="settlement-document-parties">
        <PartyCard title={labels.supplier} party={snapshot.supplierAgency} />
        <PartyCard title={labels.buyer} party={snapshot.sellingAgency} />
        <PartyCard title={labels.seller} party={snapshot.seller} />
      </section>

      <section className="settlement-document-section">
        <h3>{labels.description}</h3>
        <dl className="settlement-document-target">
          {[
            ["상품명", snapshot.product.name],
            ["상품코드", snapshot.product.code],
            ["출발일", snapshot.departureDate],
            ["예약건수", `${snapshot.reservationCount}건`],
            ["총 인원", `${snapshot.peopleCount}명`],
            ["정산기간", `${snapshot.periodFrom} ~ ${snapshot.periodTo}`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="settlement-document-section">
        <h3>정산금액 내역</h3>
        <div className="member-web-detail-table-wrap">
          <table className="member-web-detail-table settlement-document-amount-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>기준금액</th>
                <th>비율</th>
                <th>금액</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.item} className={row.tone ? `is-${row.tone}` : ""}>
                  <td className="text-left">{row.item}</td>
                  <td className="amount-cell">{row.base ?? "-"}</td>
                  <td>{row.rate ?? "-"}</td>
                  <td className="amount-cell">{row.value}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3} className="text-left">
                  {labels.settlement}
                </th>
                <td className="amount-cell">{formatWon(t.finalSettlementAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {(snapshot.adjustments.length > 0 || snapshot.nextAdjustments.length > 0) && (
        <section className="settlement-document-section">
          <h3>조정내역</h3>
          <div className="member-web-detail-table-wrap">
            <table className="member-web-detail-table settlement-document-adjustment-table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>조정유형</th>
                  <th>사유</th>
                  <th>상태</th>
                  <th>금액</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.adjustments.map((adjustment) => (
                  <tr key={adjustment.id}>
                    <td>
                      <span className={`badge ${adjustmentDirectionBadgeClass(adjustment.direction)}`}>{adjustment.direction}</span>
                    </td>
                    <td>{adjustment.carriedFrom ? `이전 정산 조정 (${adjustment.carriedFrom})` : adjustment.cause}</td>
                    <td className="text-left">{adjustment.reason}</td>
                    <td>
                      <span className={`badge ${adjustmentStatusBadgeClass(adjustment.status)}`}>{adjustment.status}</span>
                    </td>
                    <td className="amount-cell">{formatSignedWon(adjustment.amount)}</td>
                  </tr>
                ))}
                {snapshot.nextAdjustments.map((adjustment) => (
                  <tr key={adjustment.id} className="is-excluded">
                    <td>
                      <span className="badge warn">차기 정산 반영 예정</span>
                    </td>
                    <td>{adjustment.cause}</td>
                    <td className="text-left">
                      {adjustment.reason}
                      {adjustment.targetSettlementCode ? ` · 대상 ${adjustment.targetSettlementCode}` : ""}
                    </td>
                    <td>
                      <span className={`badge ${adjustmentStatusBadgeClass(adjustment.status)}`}>{adjustment.status}</span>
                    </td>
                    <td className="amount-cell">{formatSignedWon(adjustment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {snapshot.nextAdjustments.length > 0 && (
            <p className="product-share-setting-help">차기 정산 반영 예정 항목은 이 문서의 최종 정산액에 포함되지 않습니다.</p>
          )}
        </section>
      )}

      {showLines && (
        <section className="settlement-document-section">
          <h3>예약별 상세내역</h3>
          <div className="member-web-detail-table-wrap">
            <table className="member-web-detail-table settlement-document-line-table">
              <thead>
                <tr>
                  {["예약번호", "예약자", "판매여행사", "판매점", "인원", "결제금액", "수수료", "조정금액", "최종 정산액"].map((title) => (
                    <th key={title}>{title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot.lines.map((line) => (
                  <tr key={line.settlementCode}>
                    <td className="member-number">{line.reservationCode}</td>
                    <td>{line.bookerName}</td>
                    <td>{line.sellingAgencyName}</td>
                    <td>{line.sellerName ?? "-"}</td>
                    <td>{line.peopleCount}명</td>
                    <td className="amount-cell">{formatWon(line.paidAmount)}</td>
                    <td className="amount-cell">{formatWon(line.affiliateCommission + line.sellerCommission)}</td>
                    <td className="amount-cell">{formatSignedWon(line.adjustmentAmount)}</td>
                    <td className="amount-cell">{formatWon(line.finalSupplierAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={4} className="text-left">
                    합계
                  </th>
                  <td>{snapshot.peopleCount}명</td>
                  <td className="amount-cell">{formatWon(t.paidAmount)}</td>
                  <td className="amount-cell">{formatWon(t.totalCommission)}</td>
                  <td className="amount-cell">{formatSignedWon(t.adjustmentAmount)}</td>
                  <td className="amount-cell">{formatWon(t.finalSettlementAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <section className="settlement-document-section">
        <h3>비고</h3>
        <p className="settlement-document-note">{snapshot.note.trim() || "-"}</p>
      </section>

      <footer className="settlement-document-foot">
        <span>
          발행 {snapshot.issuer.name} ({snapshot.issuer.agency}) · 담당 {snapshot.manager}
        </span>
        <span>수신 {snapshot.receiver}</span>
        <small>SAMPLE 문서 · 법적 효력 없음 · PDF/이메일 미발송</small>
      </footer>
    </article>
  );
}

/** ---------- 정산서 Section (Tab) ---------- */

type DocumentHandlers = {
  onCreate: () => void;
  onReissue: () => void;
  onRequest: () => void;
  onCancel: () => void;
  onAcknowledge: () => void;
  onConfirm: () => void;
  onDispute: () => void;
};

function ActionButton({
  state,
  primary,
  onClick,
  children,
}: {
  state: SettlementDocumentActionState;
  primary?: boolean;
  onClick: () => void;
  children: string;
}) {
  if (!state.visible) return null;
  return (
    <button
      type="button"
      className={`${primary ? "primary" : "secondary"} settlement-inline-button`}
      disabled={!state.allowed}
      title={state.reason}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function SettlementDocumentSection({
  record,
  documents,
  active,
  receiverView,
  canManage,
  actions,
  paymentPending,
  handlers,
  outputHref,
}: {
  record: SettlementRecord;
  documents: SettlementDocument[];
  active?: SettlementDocument;
  receiverView: boolean;
  canManage: boolean;
  actions: Record<SettlementDocumentActionKey, SettlementDocumentActionState>;
  paymentPending: { allowed: boolean; reason?: string };
  handlers: DocumentHandlers;
  /** 출력 화면 경로 (문서번호 지정 시 발행취소 문서 포함) */
  outputHref?: (version: number, documentNo?: string) => string;
}) {
  const visibleVersions = active ? (receiverView ? getReceiverVisibleVersions(active) : active.versions) : [];
  const latest = visibleVersions[visibleVersions.length - 1];
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const selected = visibleVersions.find((version) => version.version === selectedVersion) ?? latest;
  const outdated = isSettlementDocumentOutdated(record, active);
  const dispute = getOpenDispute(active);
  const currentVersion = getCurrentDocumentVersion(active);
  const cancelledDocuments = documents.filter((document) => document.status === "발행취소");
  const status: SettlementDocumentStatus = active?.status ?? "미발행";
  const displayStatus = status;
  const receiverAwaitingNewVersion = receiverView && Boolean(latest && currentVersion && latest.version < currentVersion.version);

  return (
    <div className="member-web-detail-stack">
      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>{receiverView ? "받은 정산서" : "정산서 / 인보이스"}</strong>
          <span className="settlement-card-head-actions">
            <SettlementDocumentStatusBadge status={receiverView && !latest ? "미발행" : displayStatus} />
            {active?.documentNo && (
              <span className="badge gray">
                <FileText size={10} /> {active.documentNo}
                {currentVersion && !receiverView ? ` · ${formatDocumentVersion(currentVersion.version)}` : ""}
              </span>
            )}
          </span>
        </div>
        <SettlementDocumentFlow record={record} document={active} />
        <div className="settlement-document-actions">
          <ActionButton state={actions.create} primary onClick={handlers.onCreate}>
            {active?.status === "작성중" ? "작성중 정산서 이어서 작성" : "정산서 생성"}
          </ActionButton>
          <ActionButton state={actions.request} primary onClick={handlers.onRequest}>
            확인 요청
          </ActionButton>
          <ActionButton state={actions.acknowledge} primary onClick={handlers.onAcknowledge}>
            이의내용 확인
          </ActionButton>
          <ActionButton state={actions.reissue} onClick={handlers.onReissue}>
            정산서 재발행
          </ActionButton>
          <ActionButton state={actions.cancel} onClick={handlers.onCancel}>
            발행 취소
          </ActionButton>
          <ActionButton state={actions.confirm} primary onClick={handlers.onConfirm}>
            확인
          </ActionButton>
          <ActionButton state={actions.dispute} onClick={handlers.onDispute}>
            이의제기
          </ActionButton>
        </div>
        {!receiverView && record.status === "정산확정" && (
          <p className={`product-share-setting-alert settlement-card-note ${paymentPending.allowed ? "is-info" : ""}`} role="status">
            {paymentPending.allowed ? <CheckCircle2 size={13} /> : <Info size={13} />}
            {paymentPending.allowed ? "정산서 확인이 완료되어 지급대기 처리를 진행할 수 있습니다." : paymentPending.reason}
          </p>
        )}
        {!receiverView && outdated && active && active.status !== "작성중" && (
          <p className="product-share-setting-alert settlement-card-note" role="alert">
            <AlertTriangle size={13} />
            정산서 발행 후 정산금액이 변경되었습니다. (발행 {formatWon(currentVersion?.snapshot.totals.finalSettlementAmount ?? 0)} → 현재{" "}
            {formatWon(record.amounts.finalSupplierAmount)}) 재발행이 필요합니다.
          </p>
        )}
        {receiverAwaitingNewVersion && (
          <p className="product-share-setting-alert settlement-card-note is-info" role="status">
            <Info size={13} />
            공급여행사에서 정산서를 재발행했습니다. 확인 요청을 받으면 새 버전을 확인할 수 있습니다.
          </p>
        )}
        {receiverView && active?.status === "확인완료" && active.confirmedAt && (
          <p className="product-share-setting-alert settlement-card-note is-info" role="status">
            <CheckCircle2 size={13} />
            {active.confirmedAt} · {active.confirmedBy?.name} ({active.confirmedBy?.agency}) 확인완료 · 공급여행사에서 지급 절차를 진행합니다.
          </p>
        )}
        {!receiverView && !canManage && (
          <p className="product-share-setting-help settlement-card-note">현재 관점에서는 정산서를 조회만 할 수 있습니다. (SAMPLE 권한)</p>
        )}
      </section>

      {dispute && (
        <section className="panel member-web-detail-card settlement-dispute-card">
          <div className="member-web-detail-card-head">
            <strong>이의제기 내용</strong>
            <span className={`badge ${dispute.acknowledgedAt ? "warn" : "danger"}`}>{dispute.acknowledgedAt ? "이의내용 확인 · 재발행 대기" : "미확인"}</span>
          </div>
          <div className="member-web-detail-info-grid">
            {[
              ["이의제기 일시", dispute.at],
              ["여행사", `${dispute.by.agency} · ${dispute.by.name}`],
              ["대상 버전", formatDocumentVersion(dispute.version)],
              ["사유", `${dispute.reason}${dispute.reasonEtc ? ` (${dispute.reasonEtc})` : ""}`],
              ["상세내용", dispute.detail],
              ...(dispute.acknowledgedAt ? [["확인", `${dispute.acknowledgedAt} · ${dispute.acknowledgedBy?.name} (${dispute.acknowledgedBy?.agency})`]] : []),
            ].map(([label, value]) => (
              <div key={label} className="member-web-detail-field">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          {!receiverView && (
            <p className="product-share-setting-help settlement-card-note">
              정산조정은 [정산정보] 탭의 정산조정(수동조정 · 차액조정)으로 처리한 뒤 정산서를 재발행합니다.
            </p>
          )}
        </section>
      )}

      {selected && active ? (
        <>
          {outputHref && (
            <div className="settlement-document-output-bar">
              <span>
                <Printer size={13} />
                {formatDocumentVersion(selected.version)} 출력 · A4 인쇄 / PDF 저장 / Excel(CSV) 내보내기는 출력 화면에서 진행합니다.
              </span>
              <Link href={outputHref(selected.version)} className="member-detail-button">
                출력 화면
              </Link>
            </div>
          )}
          <SettlementDocumentPreview
            snapshot={selected.snapshot}
            documentNo={active.documentNo}
            version={selected}
            status={selected === latest ? displayStatus : "발행완료"}
            issuedAt={selected.issuedAt}
            payment={selected === latest ? record.settlement.payment : undefined}
            previewLabel={selected !== latest ? `과거 버전 ${formatDocumentVersion(selected.version)} · 읽기 전용` : undefined}
          />
          <section className="panel member-web-detail-card">
            <div className="member-web-detail-card-head">
              <strong>문서 이력</strong>
              <span className="member-web-status-history-count">{visibleVersions.length}개 버전</span>
            </div>
            <div className="member-web-detail-table-wrap">
              <table className="member-web-detail-table settlement-document-version-table">
                <thead>
                  <tr>
                    <th>버전</th>
                    <th>발행일시</th>
                    <th>구분</th>
                    <th>처리자</th>
                    <th>내용</th>
                    <th>최종 정산액</th>
                    <th>보기</th>
                  </tr>
                </thead>
                <tbody>
                  {[...visibleVersions].reverse().map((version) => (
                    <tr key={version.version} className={version === selected ? "is-selected" : ""}>
                      <td>
                        <b>{formatDocumentVersion(version.version)}</b>
                      </td>
                      <td className="date-cell">{version.issuedAt}</td>
                      <td>
                        <span className={`badge ${version.action === "발행" ? "info" : "warn"}`}>{version.action}</span>
                      </td>
                      <td>
                        {version.issuedBy.name} ({version.issuedBy.agency})
                      </td>
                      <td className="text-left">
                        <span className="settlement-adjustment-reason">
                          <b>{version.summary}</b>
                          {version.reason && <small>사유: {version.reason}</small>}
                        </span>
                      </td>
                      <td className="amount-cell">{formatWon(version.snapshot.totals.finalSettlementAmount)}</td>
                      <td>
                        {version === selected ? (
                          <span className="badge gray">보는 중</span>
                        ) : (
                          <button type="button" className="secondary settlement-inline-button" onClick={() => setSelectedVersion(version.version)}>
                            {formatDocumentVersion(version.version)} 보기
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="panel member-web-detail-card">
          <div className="member-web-empty">
            <strong>
              {receiverView
                ? "공급여행사에서 아직 정산서 확인을 요청하지 않았습니다."
                : active?.status === "작성중"
                  ? "작성중인 정산서가 있습니다. 발행 전에는 문서번호가 부여되지 않습니다."
                  : record.settlement.closing
                    ? "발행된 정산서가 없습니다. [정산서 생성]으로 발행해주세요."
                    : "정산마감 후 정산서를 생성할 수 있습니다."}
            </strong>
            <p>실제 PDF 생성 · 이메일 발송 없이 화면 미리보기로만 제공됩니다. (SAMPLE)</p>
          </div>
        </section>
      )}

      {!receiverView && cancelledDocuments.length > 0 && (
        <section className="panel member-web-detail-card">
          <div className="member-web-detail-card-head">
            <strong>발행취소 문서</strong>
            <span className="member-web-status-history-count">{cancelledDocuments.length}건</span>
          </div>
          <ul className="settlement-document-cancelled">
            {cancelledDocuments.map((document) => (
              <li key={document.id}>
                <XCircle size={13} />
                <b>{document.documentNo}</b>
                <span>
                  {document.versions.length}개 버전 · {document.cancelledAt} · {document.cancelledBy?.name} ({document.cancelledBy?.agency}) 발행 취소
                </span>
                <span className="badge gray">발행취소</span>
                {outputHref && document.versions.length > 0 && (
                  <Link href={outputHref(document.versions[document.versions.length - 1].version, document.documentNo)} className="member-detail-button">
                    보기
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
