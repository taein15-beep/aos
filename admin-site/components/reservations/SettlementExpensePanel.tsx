"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { SettlementMethod } from "@/lib/admin/reservation-settlement-draft";
import {
  SETTLEMENT_EXPENSE_CATEGORIES,
  buildSettlementExpenseView,
  formatExpenseAmount,
  parseExpenseAmountInput,
  patchExpenseConfirmed,
  removeSettlementExpense,
  resolveProvisionalAmount,
  upsertSettlementExpense,
  type SettlementExpenseDraftInput,
  type SettlementExpenseLine,
  type SettlementExpenseScope,
} from "@/lib/admin/reservation-settlement-expenses";
import {
  buildSettlementVoucherDetailView,
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
  /** 운영 화면 기본값은 빈 배열. 테스트/향후 API 연동용 */
  voucherCatalog?: SettlementVoucher[];
};

const EMPTY_DRAFT: SettlementExpenseDraftInput = {
  category: "기타비용",
  name: "",
  vendorName: "",
  scope: "reservation",
  expectedAmount: null,
  actualAmount: null,
  confirmed: false,
  note: "",
};

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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SettlementExpenseDraftInput>(EMPTY_DRAFT);
  const [actualInput, setActualInput] = useState("");
  const [expectedInput, setExpectedInput] = useState("");
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

  const openCreate = () => {
    setEditingId(null);
    setDraft({
      ...EMPTY_DRAFT,
      scope: method === "bundled" ? "event_common" : "reservation",
    });
    setActualInput("");
    setExpectedInput("");
    setEditorOpen(true);
  };

  const openEdit = (line: SettlementExpenseLine) => {
    const provisional = resolveProvisionalAmount(line);
    setEditingId(line.id);
    setDraft({
      category: line.category,
      name: line.name,
      vendorName: line.vendorName ?? "",
      scope: line.scope,
      expectedAmount: line.expectedAmount,
      actualAmount: line.actualAmount,
      confirmed: line.confirmed,
      note: line.note,
    });
    setExpectedInput(line.expectedAmount === null ? "" : String(line.expectedAmount));
    // 예상원가만 있으면 입력칸에 임시 표시 (아직 actualAmount로 확정하지 않음)
    setActualInput(provisional !== null ? String(provisional) : "");
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const applyDraft = () => {
    const nextExpected = parseExpenseAmountInput(expectedInput);
    let nextActual = parseExpenseAmountInput(actualInput);
    const prev = editingId ? expenses.find((item) => item.id === editingId) : null;
    const wasTemporaryOnly =
      Boolean(prev) && prev!.actualAmount === null && isFiniteNumber(prev!.expectedAmount);

    // 임시 표시값(예상원가)을 그대로 적용하고 미확인이면 actual은 비워 둠
    if (wasTemporaryOnly && !draft.confirmed && nextActual === prev!.expectedAmount) {
      nextActual = null;
    }
    if (nextActual === null && draft.confirmed && nextExpected !== null) {
      nextActual = nextExpected;
    }

    const prevProvisional = prev ? resolveProvisionalAmount(prev) : null;
    const amountChanged = prev != null && prevProvisional !== nextActual && !(wasTemporaryOnly && nextActual === null);

    const payload: SettlementExpenseDraftInput = {
      ...draft,
      expectedAmount: nextExpected,
      actualAmount: nextActual,
      confirmed: amountChanged ? false : draft.confirmed && nextActual !== null,
    };

    onChange(
      upsertSettlementExpense(expenses, payload, {
        editingId,
        sourceReservationCode,
        eventKey,
      }),
    );
    closeEditor();
  };

  const deleteEditing = () => {
    if (!editingId) return;
    onChange(removeSettlementExpense(expenses, editingId));
    closeEditor();
  };

  const toggleConfirmed = (line: SettlementExpenseLine) => {
    onChange(patchExpenseConfirmed(expenses, line.id, !line.confirmed));
  };

  function isFiniteNumber(value: number | null | undefined): value is number {
    return typeof value === "number" && Number.isFinite(value);
  }

  const editingLine = editingId ? expenses.find((item) => item.id === editingId) : null;
  const canDelete = Boolean(editingLine?.removable);

  return (
    <section className="panel member-web-detail-card">
      <div className="member-web-detail-card-head">
        <strong>지출·비용</strong>
        <span className="badge gray">{view.lines.length}건</span>
        <button type="button" className="secondary settlement-expense-add-btn" onClick={openCreate}>
          <Plus size={14} />
          비용 추가
        </button>
      </div>
      <p className="settlement-sales-data-note">{view.expectedSeedNote}</p>
      <p className="settlement-sales-data-note">{view.stateNote}</p>

      {view.lines.length ? (
        <div className="member-web-table-wrap">
          <table className="member-web-table settlement-doc-draft-table settlement-expense-table">
            <thead>
              <tr>
                <th>비용구분</th>
                <th>비용명</th>
                <th>거래처</th>
                <th>적용범위</th>
                <th>예상원가</th>
                <th>실제원가</th>
                <th>확인상태</th>
                <th>전표번호</th>
                <th>수정</th>
              </tr>
            </thead>
            <tbody>
              {view.lines.map((line) => {
                const provisional = resolveProvisionalAmount(line);
                const isTemp =
                  !line.confirmed && line.actualAmount === null && line.expectedAmount !== null;
                return (
                  <tr key={line.id}>
                    <td>{line.category}</td>
                    <td className="text-left">
                      <b>{line.name}</b>
                    </td>
                    <td>{line.vendorName || "-"}</td>
                    <td>{line.scope === "event_common" ? "행사 공통" : "예약별"}</td>
                    <td className="amount-cell">{formatExpenseAmount(line.expectedAmount)}</td>
                    <td className="amount-cell">
                      {formatExpenseAmount(provisional)}
                      {isTemp ? <small className="settlement-expense-temp">임시</small> : null}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`settlement-expense-confirm ${line.confirmed ? "is-on" : ""}`}
                        onClick={() => toggleConfirmed(line)}
                      >
                        {line.confirmed ? "확인완료" : "미확인"}
                      </button>
                    </td>
                    <td>
                      {hasVoucherNumber(line.voucherNumber) ? (
                        <button
                          type="button"
                          className="settlement-voucher-link"
                          onClick={() => openVoucherDetail(line)}
                        >
                          {formatVoucherNumberDisplay(line.voucherNumber)}
                        </button>
                      ) : (
                        <span className="settlement-voucher-missing-label">{formatVoucherNumberDisplay(null)}</span>
                      )}
                    </td>
                    <td>
                      <button type="button" className="secondary" onClick={() => openEdit(line)} aria-label="비용 수정">
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="member-web-detail-empty">등록된 비용이 없습니다. 비용 추가로 입력할 수 있습니다.</div>
      )}

      <div className="settlement-expense-summary">
        <div>
          <span>예상원가 합계</span>
          <strong>{view.summary.expectedTotalLabel}</strong>
        </div>
        <div>
          <span>잠정 실제원가</span>
          <strong>{view.summary.provisionalActualLabel}</strong>
        </div>
        <div>
          <span>확인완료 비용 합계</span>
          <strong>{view.summary.confirmedTotalLabel}</strong>
        </div>
        <div>
          <span>비용 확인</span>
          <strong>
            {view.summary.confirmedCount} / {view.summary.lineCount}건
            {view.summary.unconfirmedCount > 0 ? ` · 미확인 ${view.summary.unconfirmedCount}` : ""}
          </strong>
        </div>
      </div>

      {voucherDetail ? (
        <SettlementVoucherDetailModal view={voucherDetail} onClose={() => setVoucherDetail(null)} />
      ) : null}

      {editorOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeEditor}>
          <div
            className="modal product-share-confirm-modal settlement-expense-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settlement-expense-editor-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id="settlement-expense-editor-title">{editingId ? "비용 수정" : "비용 추가"}</h3>
              </div>
              <button type="button" aria-label="닫기" onClick={closeEditor}>
                <X size={18} />
              </button>
            </div>

            <div className="settlement-expense-form">
              <label>
                <span>비용구분</span>
                <select
                  value={draft.category}
                  onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                >
                  {SETTLEMENT_EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>비용명</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="예: 전세버스"
                />
              </label>
              <label>
                <span>거래처</span>
                <input
                  value={draft.vendorName}
                  onChange={(event) => setDraft((current) => ({ ...current, vendorName: event.target.value }))}
                  placeholder="거래처 마스터 미연동 · 직접 입력"
                />
              </label>
              <label>
                <span>비용 적용범위</span>
                <select
                  value={draft.scope}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      scope: event.target.value as SettlementExpenseScope,
                    }))
                  }
                  disabled={method === "individual"}
                >
                  <option value="reservation">예약별</option>
                  <option value="event_common">행사 공통</option>
                </select>
              </label>
              <label>
                <span>예상원가</span>
                <input
                  inputMode="numeric"
                  value={expectedInput}
                  onChange={(event) => setExpectedInput(event.target.value)}
                  placeholder="없으면 비움 (미등록)"
                />
              </label>
              <label>
                <span>실제원가</span>
                <input
                  inputMode="numeric"
                  value={actualInput}
                  onChange={(event) => {
                    setActualInput(event.target.value);
                    setDraft((current) => ({ ...current, confirmed: false }));
                  }}
                  placeholder="0원도 입력 가능"
                />
              </label>
              <label className="settlement-expense-check">
                <input
                  type="checkbox"
                  checked={draft.confirmed}
                  onChange={(event) => setDraft((current) => ({ ...current, confirmed: event.target.checked }))}
                  disabled={parseExpenseAmountInput(actualInput) === null && parseExpenseAmountInput(expectedInput) === null}
                />
                <span>확인완료 (실제원가 확정)</span>
              </label>
              <label className="full">
                <span>비고</span>
                <textarea
                  value={draft.note}
                  onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                  rows={3}
                />
              </label>
            </div>

            <div className="modal-actions settlement-expense-modal-actions">
              {canDelete ? (
                <button type="button" className="secondary danger" onClick={deleteEditing}>
                  <Trash2 size={14} />
                  삭제
                </button>
              ) : (
                <span />
              )}
              <div>
                <button type="button" className="secondary" onClick={closeEditor}>
                  취소
                </button>
                <button type="button" className="primary" onClick={applyDraft}>
                  입력값 적용
                </button>
              </div>
            </div>
            <p className="settlement-sales-data-note">입력값 적용은 화면 임시 상태만 변경합니다. 저장완료가 아닙니다.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
