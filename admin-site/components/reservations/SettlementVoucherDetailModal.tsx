"use client";

import { useEffect, useId, useRef } from "react";
import { FileText, X } from "lucide-react";
import { formatKrw } from "@/lib/admin/reservations-data";
import {
  formatConfirmedExpenseAmount,
  scopeLabel,
  type SettlementVoucherDetailView,
} from "@/lib/admin/reservation-settlement-vouchers";

type Props = {
  view: SettlementVoucherDetailView;
  onClose: () => void;
};

export function SettlementVoucherDetailModal({ view, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const voucher = view.voucher;
  const expense = view.expense;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const reservationCodes =
    voucher?.reservationCodes?.length
      ? voucher.reservationCodes.join(", ")
      : expense.reservationCode || "-";

  const paymentEntries = voucher?.paymentEntries ?? [];

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal product-share-confirm-modal settlement-voucher-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="info">
              <FileText size={17} />
            </span>
            <div>
              <h3 id={titleId}>지출전표 상세</h3>
              <small>{view.voucherNumber}</small>
            </div>
          </div>
          <button type="button" ref={closeRef} aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="settlement-voucher-body">
          <div className="settlement-voucher-status-row">
            <span className="settlement-voucher-chip">{view.payment.paymentStatusLabel}</span>
            <span className="settlement-voucher-chip is-muted">
              {expense.confirmed ? "비용 확인완료" : "비용 미확인"}
            </span>
          </div>

          <p className="settlement-sales-data-note">{view.connectionNote}</p>
          {view.kind === "number_without_detail" ? (
            <p className="settlement-voucher-missing">전표 상세정보가 연결되지 않았습니다.</p>
          ) : null}

          <dl className="settlement-voucher-meta">
            <div>
              <dt>상품명</dt>
              <dd>{view.productName || "-"}</dd>
            </div>
            <div>
              <dt>출발일</dt>
              <dd>{view.departureAt || "-"}</dd>
            </div>
            <div>
              <dt>연결 예약번호</dt>
              <dd>{reservationCodes}</dd>
            </div>
            <div>
              <dt>비용 적용범위</dt>
              <dd>{scopeLabel(voucher?.scope ?? expense.scope)}</dd>
            </div>
          </dl>

          <div className="settlement-voucher-split">
            <section>
              <h4>지출정보</h4>
              <dl className="settlement-voucher-fields">
                <div>
                  <dt>전표번호</dt>
                  <dd>{view.voucherNumber}</dd>
                </div>
                <div>
                  <dt>비용구분</dt>
                  <dd>{voucher?.expenseCategory || expense.category}</dd>
                </div>
                <div>
                  <dt>비용명</dt>
                  <dd>{voucher?.expenseName || expense.name}</dd>
                </div>
                <div>
                  <dt>거래처</dt>
                  <dd>{voucher?.vendorName || expense.vendorName || "-"}</dd>
                </div>
                <div>
                  <dt>지출일</dt>
                  <dd>{voucher?.expenseDate || "-"}</dd>
                </div>
                <div>
                  <dt>확정 지출금액</dt>
                  <dd>
                    {formatConfirmedExpenseAmount(
                      voucher?.confirmedExpenseAmount ??
                        (expense.confirmed ? expense.actualAmount : null),
                    )}
                  </dd>
                </div>
                <div>
                  <dt>비용 확인상태</dt>
                  <dd>{expense.confirmed || voucher?.expenseConfirmed ? "확인완료" : "미확인"}</dd>
                </div>
                <div>
                  <dt>메모</dt>
                  <dd>{voucher?.memo || expense.note || "-"}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h4>지급정보</h4>
              <dl className="settlement-voucher-fields">
                <div>
                  <dt>지급상태</dt>
                  <dd>{view.payment.paymentStatusLabel}</dd>
                </div>
                <div>
                  <dt>지급완료금액</dt>
                  <dd>{view.payment.paidAmountLabel}</dd>
                </div>
                <div>
                  <dt>미지급금액</dt>
                  <dd>{view.payment.unpaidAmountLabel}</dd>
                </div>
                <div>
                  <dt>지급일</dt>
                  <dd>{voucher?.paymentDateSummary || "-"}</dd>
                </div>
                <div>
                  <dt>지급방법</dt>
                  <dd>{voucher?.paymentMethodSummary || "-"}</dd>
                </div>
                <div>
                  <dt>지급처</dt>
                  <dd>{voucher?.payeeName || voucher?.vendorName || "-"}</dd>
                </div>
                <div>
                  <dt>지급 거래번호</dt>
                  <dd>{voucher?.transactionRef || "-"}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="settlement-voucher-payments">
            <h4>지급 처리 이력</h4>
            {view.kind === "number_without_detail" || !voucher?.paymentsKnown ? (
              <p className="settlement-voucher-empty">지급내역을 확인할 수 없습니다. 임의 이력을 생성하지 않습니다.</p>
            ) : paymentEntries.length === 0 ? (
              <p className="settlement-voucher-empty">등록된 지급 이력이 없습니다.</p>
            ) : (
              <div className="member-web-table-wrap settlement-voucher-payment-scroll">
                <table className="member-web-table settlement-doc-draft-table">
                  <thead>
                    <tr>
                      <th>일자</th>
                      <th>방법</th>
                      <th>금액</th>
                      <th>상태</th>
                      <th>지급처</th>
                      <th>거래번호</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.date || "-"}</td>
                        <td>{entry.method || "-"}</td>
                        <td className="amount-cell">{formatKrw(entry.amount)}</td>
                        <td>{entry.status || "-"}</td>
                        <td>{entry.payeeName || "-"}</td>
                        <td>{entry.transactionRef || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="settlement-voucher-memo">
            <h4>증빙 및 비고</h4>
            <p>{voucher?.description || voucher?.memo || expense.note || "등록된 증빙·비고가 없습니다."}</p>
          </section>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
