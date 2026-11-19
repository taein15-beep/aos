"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { SettlementMethod } from "@/lib/admin/reservation-settlement-draft";
import {
  buildSettlementExpenseView,
  formatExpenseAmount,
  getExpenseLineTotal,
  getExpenseQuantity,
  getExpenseUnitPrice,
  parseExpenseAmountInput,
  removeSettlementExpense,
  upsertSettlementExpense,
  type SettlementExpenseDraftInput,
  type SettlementExpenseLine,
} from "@/lib/admin/reservation-settlement-expenses";
import {
  buildSettlementVoucherDetailView,
  createExpenseVoucherNumber,
  formatVoucherNumberDisplay,
  hasVoucherNumber,
  type SettlementVoucher,
  type SettlementVoucherDetailView,
} from "@/lib/admin/reservation-settlement-vouchers";
import { SettlementVoucherDetailModal } from "@/components/reservations/SettlementVoucherDetailModal";

type Props = {
  method: SettlementMethod;
  sourceReservationCode: string;
  targetCodes: string[];
  eventKey: string;
  productName?: string;
  departureAt?: string;
  expenses: SettlementExpenseLine[];
  onChange: (next: SettlementExpenseLine[]) => void;
  voucherCatalog?: SettlementVoucher[];
};

type InlineDraft = {
  name: string;
  quantity: string;
  unitPrice: string;
  approvalNumber: string;
  expenseDate: string;
  note: string;
  vendorName: string;
};

const EMPTY_INLINE: InlineDraft = {
  name: "",
  quantity: "1",
  unitPrice: "",
  approvalNumber: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  note: "",
  vendorName: "",
};

const TABLE_COLUMNS = ["No", "항목 및 규격", "수량", "단가", "합계", "승인번호", "일자", "비고", "거래처", "지출전표", "관리"] as const;

function toInlineDraft(line: SettlementExpenseLine): InlineDraft {
  const unit = getExpenseUnitPrice(line);
  return {
    name: line.name,
    quantity: String(getExpenseQuantity(line)),
    unitPrice: unit === null ? "" : String(unit),
    approvalNumber: line.approvalNumber ?? "",
    expenseDate: line.expenseDate ?? "",
    note: line.note ?? "",
    vendorName: line.vendorName ?? "",
  };
}

function DraftCells({
  draft,
  setDraft,
  draftTotal,
  onApply,
  onCancel,
  autoFocus,
}: {
  draft: InlineDraft;
  setDraft: Dispatch<SetStateAction<InlineDraft>>;
  draftTotal: number | null;
  onApply: () => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  return (
    <>
      <td>
        <input
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          placeholder="항목 및 규격"
          autoFocus={autoFocus}
        />
      </td>
      <td>
        <input
          className="center"
          inputMode="numeric"
          value={draft.quantity}
          onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))}
        />
      </td>
      <td>
        <input
          inputMode="numeric"
          value={draft.unitPrice}
          onChange={(event) => setDraft((current) => ({ ...current, unitPrice: event.target.value }))}
          placeholder="0"
        />
      </td>
      <td className="amount-cell">{formatExpenseAmount(draftTotal)}</td>
      <td>
        <input
          value={draft.approvalNumber}
          onChange={(event) => setDraft((current) => ({ ...current, approvalNumber: event.target.value }))}
          placeholder="-"
        />
      </td>
      <td>
        <input
          type="date"
          value={draft.expenseDate}
          onChange={(event) => setDraft((current) => ({ ...current, expenseDate: event.target.value }))}
        />
      </td>
      <td>
        <input
          value={draft.note}
          onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          placeholder="비고"
        />
      </td>
      <td>
        <input
          value={draft.vendorName}
          onChange={(event) => setDraft((current) => ({ ...current, vendorName: event.target.value }))}
          placeholder="거래처"
        />
      </td>
      <td className="center">
        <span className="settlement-voucher-missing-label">미발급</span>
      </td>
      <td>
        <div className="settlement-expense-inline-actions">
          <button type="button" className="primary" onClick={onApply}>
            저장
          </button>
          <button type="button" className="secondary" onClick={onCancel} aria-label="취소">
            <X size={13} />
          </button>
        </div>
      </td>
    </>
  );
}

export function SettlementExpensePanel({
  method,
  sourceReservationCode,
  targetCodes,
  eventKey,
  productName = "",
  departureAt = "",
  expenses,
  onChange,
  voucherCatalog = [],
}: Props) {
  const [drafting, setDrafting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<InlineDraft>(EMPTY_INLINE);
  const [voucherDetail, setVoucherDetail] = useState<SettlementVoucherDetailView | null>(null);

  const view = useMemo(
    () =>
      buildSettlementExpenseView({
        method,
        sourceReservationCode,
        targetCodes,
        eventKey,
        lines: expenses,
      }),
    [method, sourceReservationCode, targetCodes, eventKey, expenses],
  );

  const draftQuantity = Math.max(1, Number(draft.quantity.replace(/[^\d]/g, "")) || 1);
  const draftUnit = parseExpenseAmountInput(draft.unitPrice);
  const draftTotal = draftUnit === null ? null : draftUnit * draftQuantity;

  const tableTotal = useMemo(() => {
    let sum = 0;
    let hasAmount = false;
    for (const line of view.lines) {
      if (drafting && editingId === line.id) {
        if (draftTotal !== null) {
          sum += draftTotal;
          hasAmount = true;
        }
        continue;
      }
      const total = getExpenseLineTotal(line);
      if (total !== null) {
        sum += total;
        hasAmount = true;
      }
    }
    if (drafting && !editingId && draftTotal !== null) {
      sum += draftTotal;
      hasAmount = true;
    }
    return hasAmount ? sum : null;
  }, [view.lines, drafting, editingId, draftTotal]);

  const openVoucherDetail = (line: SettlementExpenseLine) => {
    if (!hasVoucherNumber(line.voucherNumber)) return;
    const detail = buildSettlementVoucherDetailView({
      expense: line,
      catalog: voucherCatalog,
      productName,
      departureAt,
    });
    if (detail) setVoucherDetail(detail);
  };

  const issueVoucher = (line: SettlementExpenseLine) => {
    if (hasVoucherNumber(line.voucherNumber)) return;
    const voucherNumber = createExpenseVoucherNumber(expenses);
    onChange(
      expenses.map((item) => (item.id === line.id ? { ...item, voucherNumber } : item)),
    );
  };

  const startCreate = () => {
    setEditingId(null);
    setDraft({
      ...EMPTY_INLINE,
      expenseDate: new Date().toISOString().slice(0, 10),
    });
    setDrafting(true);
  };

  const startEdit = (line: SettlementExpenseLine) => {
    if (hasVoucherNumber(line.voucherNumber)) return;
    setEditingId(line.id);
    setDraft(toInlineDraft(line));
    setDrafting(true);
  };

  const cancelDraft = () => {
    setDrafting(false);
    setEditingId(null);
    setDraft(EMPTY_INLINE);
  };

  const applyDraft = () => {
    const quantity = Math.max(1, Number(draft.quantity.replace(/[^\d]/g, "")) || 1);
    const unitPrice = parseExpenseAmountInput(draft.unitPrice);
    const total = unitPrice === null ? null : unitPrice * quantity;
    const existing = editingId ? expenses.find((item) => item.id === editingId) : null;
    if (existing && hasVoucherNumber(existing.voucherNumber)) {
      cancelDraft();
      return;
    }

    const payload: SettlementExpenseDraftInput = {
      category: "기타비용",
      name: draft.name.trim() || "비용 항목",
      vendorName: draft.vendorName,
      scope: method === "bundled" ? "event_common" : "reservation",
      expectedAmount: null,
      actualAmount: total,
      confirmed: total !== null,
      note: draft.note,
      quantity,
      unitPrice,
      approvalNumber: draft.approvalNumber,
      expenseDate: draft.expenseDate,
      voucherNumber: existing?.voucherNumber ?? null,
    };

    onChange(
      upsertSettlementExpense(expenses, payload, {
        editingId,
        sourceReservationCode,
        eventKey,
      }),
    );
    cancelDraft();
  };

  const deleteLine = (line: SettlementExpenseLine) => {
    if (!line.removable || hasVoucherNumber(line.voucherNumber)) return;
    onChange(removeSettlementExpense(expenses, line.id));
    if (editingId === line.id) cancelDraft();
  };

  const showTable = view.lines.length > 0 || drafting;
  const creating = drafting && !editingId;

  return (
    <section className="panel member-web-detail-card">
      <div className="member-web-detail-card-head">
        <strong>통합출금관리</strong>
        <span className="badge gray">{view.lines.length}건</span>
        <button type="button" className="secondary settlement-expense-add-btn" onClick={startCreate} disabled={creating}>
          <Plus size={14} />
          비용 추가
        </button>
      </div>

      {showTable ? (
        <div className="member-web-table-wrap">
          <table className="member-web-table settlement-doc-draft-table settlement-expense-table">
            <thead>
              <tr>
                {TABLE_COLUMNS.map((title) => (
                  <th key={title}>{title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.lines.map((line, index) => {
                if (drafting && editingId === line.id) {
                  return (
                    <tr key={line.id} className="settlement-expense-draft-row">
                      <td className="center">{index + 1}</td>
                      <DraftCells
                        draft={draft}
                        setDraft={setDraft}
                        draftTotal={draftTotal}
                        onApply={applyDraft}
                        onCancel={cancelDraft}
                        autoFocus
                      />
                    </tr>
                  );
                }

                const quantity = getExpenseQuantity(line);
                const unitPrice = getExpenseUnitPrice(line);
                const total = getExpenseLineTotal(line);
                const voucherIssued = hasVoucherNumber(line.voucherNumber);
                const managementLocked = voucherIssued || drafting;

                return (
                  <tr key={line.id}>
                    <td className="center">{index + 1}</td>
                    <td className="text-left">
                      <b>{line.name}</b>
                    </td>
                    <td className="center">{quantity}</td>
                    <td className="amount-cell">{formatExpenseAmount(unitPrice)}</td>
                    <td className="amount-cell">{formatExpenseAmount(total)}</td>
                    <td className="member-number">{line.approvalNumber?.trim() || "-"}</td>
                    <td className="date-cell">{line.expenseDate?.trim() || "-"}</td>
                    <td className="text-left">{line.note?.trim() || "-"}</td>
                    <td className="text-left">{line.vendorName || "-"}</td>
                    <td>
                      {voucherIssued ? (
                        <button
                          type="button"
                          className="settlement-expense-voucher-badge"
                          onClick={() => openVoucherDetail(line)}
                        >
                          {formatVoucherNumberDisplay(line.voucherNumber)}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="primary settlement-expense-voucher-create"
                          onClick={() => issueVoucher(line)}
                          disabled={drafting}
                        >
                          전표작성
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="settlement-expense-inline-actions">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => startEdit(line)}
                          disabled={managementLocked}
                        >
                          수정
                        </button>
                        {line.removable ? (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => deleteLine(line)}
                            disabled={managementLocked}
                            aria-label="삭제"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {creating ? (
                <tr className="settlement-expense-draft-row">
                  <td className="center">{view.lines.length + 1}</td>
                  <DraftCells
                    draft={draft}
                    setDraft={setDraft}
                    draftTotal={draftTotal}
                    onApply={applyDraft}
                    onCancel={cancelDraft}
                    autoFocus
                  />
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="settlement-expense-total-row">
                <td colSpan={4} className="text-left">
                  <strong>합계</strong>
                </td>
                <td className="amount-cell">
                  <strong>{formatExpenseAmount(tableTotal)}</strong>
                </td>
                <td colSpan={6} />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="member-web-detail-empty">등록된 비용이 없습니다. 비용 추가로 입력할 수 있습니다.</div>
      )}

      {voucherDetail ? <SettlementVoucherDetailModal view={voucherDetail} onClose={() => setVoucherDetail(null)} /> : null}
    </section>
  );
}
