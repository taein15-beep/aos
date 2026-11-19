"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { formatKrw } from "@/lib/admin/reservations-data";
import type { SettlementDocumentDraftView, SettlementTargetReservation } from "@/lib/admin/reservation-settlement-draft";
import type { SettlementExpenseLine } from "@/lib/admin/reservation-settlement-expenses";
import {
  buildSettlementProfitView,
  type SettlementMoneyValue,
  type SettlementProfitView,
} from "@/lib/admin/reservation-settlement-profit";
import {
  buildSettlementRosterFromTargets,
  type SettlementRosterView,
  type SettlementTravelerRow,
} from "@/lib/admin/reservation-settlement-roster";
import {
  buildSettlementIndividualExpensesFromTargets,
  type SettlementIndividualExpenseView,
} from "@/lib/admin/reservation-settlement-individual-expenses";
import { X } from "lucide-react";
import {
  buildSettlementSalesFinanceFromTargets,
  sumSettlementDepositAmounts,
  type MoneyDisplay,
  type SettlementSalesFinanceView,
} from "@/lib/admin/reservation-settlement-sales";
import { SettlementExpensePanel } from "@/components/reservations/SettlementExpensePanel";

function MoneyValue({ value, tone }: { value: MoneyDisplay; tone?: "due" | "over" | "net" | "profit" | "loss" }) {
  if (value.kind === "needs_review") {
    return <strong className="settlement-sales-kpi-review">{value.label}</strong>;
  }
  return <strong className={tone ? `settlement-sales-kpi-${tone}` : undefined}>{value.label}</strong>;
}

function fromProfitMoney(value: SettlementMoneyValue): MoneyDisplay {
  if (value.kind === "unavailable") return { kind: "needs_review", label: "확인 필요" };
  return { kind: "amount", value: value.value, label: value.label };
}

function commissionDisplay(profit: SettlementProfitView): MoneyDisplay {
  const sales = profit.customerTotalSales;
  const attributable = profit.attributableRevenue;
  if (sales.kind === "amount" && attributable.kind === "amount") {
    const value = Math.max(0, sales.value - attributable.value);
    return { kind: "amount", value, label: formatKrw(value) };
  }
  return { kind: "needs_review", label: "확인 필요" };
}

function refundDisplay(sales: SettlementSalesFinanceView): MoneyDisplay {
  const value = sales.deposits.filter((row) => row.kind === "refund").reduce((sum, row) => sum + row.amount, 0);
  return { kind: "amount", value, label: formatKrw(value) };
}

export function SettlementDocumentHeader({ view }: { view: SettlementDocumentDraftView }) {
  const title = `${view.productName || "상품"} 상품정산서`;
  const summaryItems: Array<[string, string]> = [
    ["상품코드", view.productCode || "-"],
    ["출발일", view.departureAt || "-"],
    ["예약건수", `${view.reservationCount}건`],
    ["총 예약인원", `${view.totalPeopleCount}명`],
    ["정산코드", view.roundKeyLabel || "-"],
  ];

  return (
    <section className="panel member-web-detail-card settlement-doc-draft-header">
      <div className="member-web-detail-card-head">
        <span className="settlement-doc-draft-title-emoji" aria-hidden>
          📊
        </span>
        <strong>{title}</strong>
        <span className={`badge ${view.method === "individual" ? "info" : "warn"}`}>{view.methodLabel}</span>
      </div>
      <div className="settlement-doc-draft-summary" aria-label="정산서 요약">
        {summaryItems.map(([label, value]) => (
          <article key={label} className="member-web-detail-kpi">
            <span>
              <small>{label}</small>
              <strong title={value}>{value}</strong>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SettlementReservationList({
  targets,
  includedCodes,
  memos,
  onToggleInclude,
  onMemoChange,
  reservationHref,
}: {
  targets: SettlementTargetReservation[];
  includedCodes: Set<string>;
  memos: Record<string, string>;
  onToggleInclude: (code: string) => void;
  onMemoChange: (code: string, value: string) => void;
  reservationHref?: (code: string) => string;
}) {
  const includedCount = targets.filter((item) => includedCodes.has(item.code)).length;

  return (
    <section className="panel member-web-detail-card">
      <div className="member-web-detail-card-head">
        <span className="settlement-doc-draft-title-emoji" aria-hidden>
          📋
        </span>
        <strong>정산 대상 예약 목록</strong>
        <span className="badge gray">
          포함 {includedCount}건 / 전체 {targets.length}건
        </span>
      </div>
      <div className="member-web-table-wrap">
        <table className="member-web-table settlement-doc-draft-table settlement-doc-draft-roster-table">
          <thead>
            <tr>
              {["예약번호", "예약자명", "예약인원", "예약상태", "판매채널", "정산메모", "관리"].map((title) => (
                <th key={title}>{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {targets.length ? (
              targets.map((item) => {
                const included = includedCodes.has(item.code);
                return (
                  <tr
                    key={item.code}
                    className={[item.isSource ? "is-source-reservation" : "", included ? "is-included-reservation" : "is-excluded-reservation"]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <td className="member-number">
                      {reservationHref ? (
                        <Link href={reservationHref(item.code)} className="reservation-code-link">
                          {item.code}
                        </Link>
                      ) : (
                        item.code
                      )}
                      {item.isSource ? <span className="settlement-doc-draft-source-tag">선택</span> : null}
                    </td>
                    <td className="member-name">
                      <b>{item.bookerName || "-"}</b>
                    </td>
                    <td>{item.peopleLabel}</td>
                    <td>{item.reserveStatus || "-"}</td>
                    <td className="text-left">{item.salesChannel || "-"}</td>
                    <td className="settlement-doc-draft-memo-cell">
                      <input
                        type="text"
                        className="settlement-doc-draft-memo-input"
                        value={memos[item.code] ?? ""}
                        placeholder="정산 메모 입력"
                        aria-label={`${item.code} 정산메모`}
                        onChange={(event) => onMemoChange(item.code, event.target.value)}
                      />
                    </td>
                    <td>
                      {item.isSource ? null : (
                        <button
                          type="button"
                          className={included ? "secondary settlement-doc-draft-include-btn is-included" : "primary settlement-doc-draft-include-btn"}
                          onClick={() => onToggleInclude(item.code)}
                        >
                          {included ? "제외" : "포함"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className="member-web-empty">
                    <strong>표시할 정산 대상 예약이 없습니다.</strong>
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

export function SettlementSalesFinanceSection({
  sales,
  profit,
  reservationHref,
}: {
  sales: SettlementSalesFinanceView;
  profit: SettlementProfitView;
  reservationHref?: (code: string) => string;
}) {
  const commission = commissionDisplay(profit);
  const expense = fromProfitMoney(profit.totalCost);
  const refund = refundDisplay(sales);
  const netProfit = fromProfitMoney(profit.profit);
  const profitTone = netProfit.kind === "amount" && netProfit.value < 0 ? "loss" : "profit";
  const summaryItems: Array<{ label: string; value: MoneyDisplay; tone?: "due" | "over" | "net" | "profit" | "loss" }> = [
    { label: "총판매금액", value: sales.totalSales },
    { label: "순수납액", value: sales.netReceived, tone: "net" },
    { label: "미수금", value: sales.unpaid, tone: "due" },
    { label: "수수료", value: commission },
    { label: "지출금액", value: expense },
    { label: "환불금액", value: refund, tone: "due" },
    { label: "순이익", value: netProfit, tone: profitTone },
  ];

  return (
    <>
      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <span className="settlement-doc-draft-title-emoji" aria-hidden>
            💰
          </span>
          <strong>매출·입금 요약</strong>
          <span className="badge gray">고객 판매금액 기준</span>
        </div>
        <div className="settlement-sales-kpi-grid">
          {summaryItems.map((item) => (
            <article key={item.label} className="member-web-detail-kpi">
              <span>
                <small>{item.label}</small>
                <MoneyValue value={item.value} tone={item.tone} />
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <span className="settlement-doc-draft-title-emoji" aria-hidden>
            💳
          </span>
          <strong>예약별 입금내역</strong>
          <span className="badge gray">{sales.deposits.length}건</span>
        </div>
        {sales.deposits.length ? (
          <div className="member-web-table-wrap">
            <table className="member-web-table settlement-doc-draft-table settlement-sales-deposit-table">
              <thead>
                <tr>
                  {["예약번호", "예약자", "입금자/거래처", "구분", "입금일/결제일", "금액", "거래번호", "승인번호"].map((title) => (
                    <th key={title}>{title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.deposits.map((row, index) => {
                  const prev = sales.deposits[index - 1];
                  const isReservationStart = !prev || prev.reservationCode !== row.reservationCode;
                  const reservationRows = isReservationStart
                    ? sales.deposits.slice(index).filter((item) => item.reservationCode === row.reservationCode)
                    : [];
                  const reservationSpan = reservationRows.length;
                  const reservationTotal = isReservationStart ? sumSettlementDepositAmounts(reservationRows) : 0;
                  const channelBadgeClass =
                    row.channel === "card" ? "info" : row.channel === "cash" ? "success" : row.channel === "refund" ? "gray" : "warn";
                  return (
                    <tr
                      key={row.id}
                      className={[
                        row.kind === "refund" ? "is-refund-row" : "",
                        isReservationStart ? "is-reservation-group-start" : "",
                        row.channel === "cash" ? "is-cash-deposit" : "",
                        row.channel === "card" ? "is-card-payment" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {isReservationStart ? (
                        <td className="member-number settlement-deposit-reservation-cell" rowSpan={reservationSpan}>
                          <div className="settlement-deposit-reservation-meta">
                            {reservationHref ? (
                              <Link href={reservationHref(row.reservationCode)} className="reservation-code-link">
                                {row.reservationCode}
                              </Link>
                            ) : (
                              row.reservationCode
                            )}
                            <span className={`badge ${reservationTotal < 0 ? "danger" : "warn"}`}>
                              {reservationTotal < 0 ? `-${formatKrw(Math.abs(reservationTotal))}` : formatKrw(reservationTotal)}
                            </span>
                          </div>
                        </td>
                      ) : null}
                      {isReservationStart ? (
                        <td className="member-name settlement-deposit-reservation-cell" rowSpan={reservationSpan}>
                          <b>{row.bookerName || "-"}</b>
                        </td>
                      ) : null}
                      <td className="text-left settlement-deposit-counterparty">
                        <strong>{row.counterparty || "-"}</strong>
                      </td>
                      <td>
                        <span className={`badge ${channelBadgeClass}`}>{row.channelLabel}</span>
                      </td>
                      <td className="date-cell">{row.paidAt || "-"}</td>
                      <td className={`amount-cell${row.kind === "refund" ? " is-refund" : ""}`}>
                        {row.kind === "refund" ? `-${row.amountLabel}` : row.amountLabel}
                      </td>
                      <td className="member-number">{row.transactionNumber || "-"}</td>
                      <td className="member-number">{row.approvalNumber || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="settlement-deposit-total-row">
                  <td colSpan={5} className="text-left">
                    <strong>합계</strong>
                  </td>
                  <td className="amount-cell">
                    <strong>{formatKrw(sumSettlementDepositAmounts(sales.deposits))}</strong>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="member-web-detail-empty">
            {sales.depositEmptyReason === "unavailable"
              ? "입금내역을 조회할 수 없습니다."
              : "입금내역 없음"}
          </div>
        )}
      </section>
    </>
  );
}

function formatPassportExpiryWithRemaining(expiry: string | null) {
  if (!expiry?.trim()) return "미등록";
  const end = new Date(`${expiry.trim()}T00:00:00`);
  if (Number.isNaN(end.getTime())) return expiry;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  if (diffDays > 0) return `${expiry} (남은 ${diffDays}일)`;
  if (diffDays === 0) return `${expiry} (오늘 만료)`;
  return `${expiry} (${Math.abs(diffDays)}일 경과)`;
}

function SettlementRosterPassportModal({
  row,
  onClose,
}: {
  row: SettlementTravelerRow;
  onClose: () => void;
}) {
  const surname = row.passportSurname || row.passportEnglishName?.split(/\s+/)[0] || null;
  const givenName =
    row.passportGivenName ||
    (row.passportEnglishName?.includes(" ")
      ? row.passportEnglishName.split(/\s+/).slice(1).join(" ")
      : null);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal product-share-confirm-modal settlement-roster-passport-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settlement-roster-passport-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h3 id="settlement-roster-passport-title">여권정보</h3>
          </div>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="settlement-roster-passport-card" aria-label={`${row.travelerName || "여행자"} 여권정보`}>
          <div className="settlement-roster-passport-item">
            <span>여권번호</span>
            <b>:</b>
            <strong>{row.passportNumber || "미등록"}</strong>
          </div>
          <div className="settlement-roster-passport-item">
            <span>성별</span>
            <b>:</b>
            <strong>{row.gender || "미등록"}</strong>
          </div>
          <div className="settlement-roster-passport-item">
            <span>이름(성)</span>
            <b>:</b>
            <strong>{surname || "미등록"}</strong>
          </div>
          <div className="settlement-roster-passport-item">
            <span>이름(이름)</span>
            <b>:</b>
            <strong>{givenName || "미등록"}</strong>
          </div>
          <div className="settlement-roster-passport-item">
            <span>생년월일</span>
            <b>:</b>
            <strong>{row.birthDate || "미등록"}</strong>
          </div>
          <div className="settlement-roster-passport-item">
            <span>국적</span>
            <b>:</b>
            <strong>{row.nationality || "미등록"}</strong>
          </div>
          <div className="settlement-roster-passport-item is-full">
            <span>유효기간</span>
            <b>:</b>
            <strong>{formatPassportExpiryWithRemaining(row.passportExpiry)}</strong>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="primary" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettlementRosterSection({
  roster,
  reservationHref,
}: {
  roster: SettlementRosterView;
  reservationHref?: (code: string) => string;
}) {
  const [passportRow, setPassportRow] = useState<SettlementTravelerRow | null>(null);

  return (
    <section className="panel member-web-detail-card">
      <div className="member-web-detail-card-head">
        <span className="settlement-doc-draft-title-emoji" aria-hidden>
          👥
        </span>
        <strong>고객명단</strong>
        <span className="badge gray">
          예약 {roster.reservationCount}건 · 명단 {roster.listedPeopleCount}명 / 예약인원 {roster.expectedPeopleCount}명
        </span>
        {roster.headcountStatus !== "ok" ? (
          <span className={`badge ${roster.headcountStatus === "unavailable" ? "danger" : "warn"}`}>
            {roster.headcountLabel}
          </span>
        ) : (
          <span className="badge success">{roster.headcountLabel}</span>
        )}
      </div>
      {roster.dataNote ? <p className="settlement-sales-data-note">{roster.dataNote}</p> : null}

      {roster.rows.length ? (
        <div className="member-web-table-wrap">
          <table className="member-web-table settlement-doc-draft-table settlement-roster-table">
            <thead>
              <tr>
                {["예약번호", "예약자", "번호", "여행자명", "구분", "성별", "생년월일", "연락처", "탑승지", "여권정보"].map(
                  (title) => (
                    <th key={title}>{title}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {roster.rows.map((row, index) => {
                const prev = roster.rows[index - 1];
                const isReservationStart = !prev || prev.reservationCode !== row.reservationCode;
                const reservationSpan = isReservationStart
                  ? roster.rows.slice(index).filter((item) => item.reservationCode === row.reservationCode).length
                  : 0;
                const groupIndex = roster.rows
                  .slice(0, index + 1)
                  .filter((item) => item.reservationCode === row.reservationCode).length;
                return (
                  <tr
                    key={row.id}
                    className={isReservationStart ? "is-reservation-group-start" : undefined}
                  >
                    {isReservationStart ? (
                      <td className="member-number settlement-roster-reservation-cell" rowSpan={reservationSpan}>
                        {reservationHref ? (
                          <Link href={reservationHref(row.reservationCode)} className="reservation-code-link">
                            {row.reservationCode}
                          </Link>
                        ) : (
                          row.reservationCode
                        )}
                      </td>
                    ) : null}
                    {isReservationStart ? (
                      <td className="member-name settlement-roster-reservation-cell" rowSpan={reservationSpan}>
                        <b>{row.bookerName || "-"}</b>
                      </td>
                    ) : null}
                    <td className="center">{groupIndex}</td>
                    <td className="member-name">
                      <b>{row.travelerName || "-"}</b>
                      {row.role === "booker" ? <span className="settlement-doc-draft-source-tag">예약자</span> : null}
                    </td>
                    <td>{row.personType}</td>
                    <td>{row.gender || "-"}</td>
                    <td className="date-cell">{row.birthDate || "-"}</td>
                    <td>{row.phone || "-"}</td>
                    <td>{row.boardingPoint || "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="settlement-roster-passport-btn"
                        onClick={() => setPassportRow(row)}
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="member-web-detail-empty">
          {roster.emptyReason === "unavailable" ? "고객명단을 조회할 수 없습니다." : "등록된 고객명단이 없습니다."}
        </div>
      )}

      {passportRow ? <SettlementRosterPassportModal row={passportRow} onClose={() => setPassportRow(null)} /> : null}
    </section>
  );
}

export function SettlementIndividualExpenseSection({
  view,
  reservationHref,
}: {
  view: SettlementIndividualExpenseView;
  reservationHref?: (code: string) => string;
}) {
  return (
    <section className="panel member-web-detail-card">
      <div className="member-web-detail-card-head">
        <span className="settlement-doc-draft-title-emoji" aria-hidden>
          🧾
        </span>
        <strong>예약별 지출금액</strong>
        <span className="badge gray">{view.lineCount}건</span>
      </div>

      {view.rows.length ? (
        <div className="member-web-table-wrap">
          <table className="member-web-table settlement-doc-draft-table settlement-individual-expense-table">
            <thead>
              <tr>
                {["예약번호", "예약자", "품목및규격", "출금일", "금액", "거래처", "지급일", "상태", "전표번호"].map((title) => (
                  <th key={title}>{title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row, index) => {
                const prev = view.rows[index - 1];
                const isReservationStart = !prev || prev.reservationCode !== row.reservationCode;
                const reservationRows = isReservationStart
                  ? view.rows.slice(index).filter((item) => item.reservationCode === row.reservationCode)
                  : [];
                const reservationSpan = reservationRows.length;
                const reservationTotal = isReservationStart
                  ? reservationRows.reduce((sum, item) => sum + item.amount, 0)
                  : 0;
                const voucherKey = row.voucherNumber?.trim() || "";
                const prevVoucherKey = prev?.voucherNumber?.trim() || "";
                const isVoucherStart =
                  !voucherKey ||
                  !prev ||
                  prev.reservationCode !== row.reservationCode ||
                  prevVoucherKey !== voucherKey;
                const voucherSpan = !voucherKey
                  ? 1
                  : view.rows.slice(index).findIndex((item, offset) => {
                      if (offset === 0) return false;
                      return (
                        item.reservationCode !== row.reservationCode ||
                        (item.voucherNumber?.trim() || "") !== voucherKey
                      );
                    });
                const resolvedVoucherSpan =
                  !voucherKey ? 1 : voucherSpan === -1 ? view.rows.length - index : voucherSpan;
                const isPaid = row.paymentStatus === "지급";
                return (
                  <tr
                    key={row.id}
                    className={isReservationStart ? "is-reservation-group-start" : undefined}
                  >
                    {isReservationStart ? (
                      <td className="member-number settlement-individual-expense-reservation-cell" rowSpan={reservationSpan}>
                        <div className="settlement-deposit-reservation-meta">
                          {reservationHref ? (
                            <Link href={reservationHref(row.reservationCode)} className="reservation-code-link">
                              {row.reservationCode}
                            </Link>
                          ) : (
                            row.reservationCode
                          )}
                          <span className="badge warn">{formatKrw(reservationTotal)}</span>
                        </div>
                      </td>
                    ) : null}
                    {isReservationStart ? (
                      <td className="member-name settlement-individual-expense-reservation-cell" rowSpan={reservationSpan}>
                        <b>{row.bookerName || "-"}</b>
                      </td>
                    ) : null}
                    <td className="text-left">{row.itemSpec}</td>
                    <td className="date-cell">{row.withdrawnAt}</td>
                    <td className="amount-cell">{row.amountLabel}</td>
                    <td className="text-left">{row.vendorName || "-"}</td>
                    <td className="date-cell">{row.paidAtLabel}</td>
                    <td className="center">
                      <span className={`badge ${isPaid ? "success" : "warn"}`}>{row.paymentStatusLabel}</span>
                    </td>
                    {isVoucherStart ? (
                      <td
                        className="member-number settlement-individual-expense-voucher-cell"
                        rowSpan={resolvedVoucherSpan}
                      >
                        {row.voucherLabel}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="settlement-individual-expense-total-row">
                <td colSpan={4} className="text-left">
                  <strong>합계</strong>
                </td>
                <td className="amount-cell">
                  <strong>{view.totalAmountLabel}</strong>
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="member-web-detail-empty">포함된 예약의 지출금액이 없습니다.</div>
      )}
    </section>
  );
}

export function SettlementDocumentShell({
  view,
  expenses,
  onExpensesChange,
  reservationHref,
  actions,
}: {
  view: SettlementDocumentDraftView;
  expenses: SettlementExpenseLine[];
  onExpensesChange: (next: SettlementExpenseLine[]) => void;
  reservationHref?: (code: string) => string;
  actions?: ReactNode;
}) {
  const targetKey = view.targets.map((item) => item.code).join("|");

  /** 원본(선택) 예약은 기본 포함, 나머지는 포함 버튼으로 선택 */
  const [includedCodes, setIncludedCodes] = useState<Set<string>>(
    () => new Set(view.targets.filter((item) => item.isSource).map((item) => item.code)),
  );
  const [memos, setMemos] = useState<Record<string, string>>({});

  useEffect(() => {
    setIncludedCodes(new Set(view.targets.filter((item) => item.isSource).map((item) => item.code)));
    setMemos({});
  }, [targetKey, view.targets]);

  const includedTargets = useMemo(
    () => view.targets.filter((item) => includedCodes.has(item.code)),
    [view.targets, includedCodes],
  );

  const headerView = useMemo<SettlementDocumentDraftView>(
    () => ({
      ...view,
      reservationCount: includedTargets.length,
      totalPeopleCount: includedTargets.reduce((sum, item) => sum + item.peopleCount, 0),
      targets: includedTargets,
    }),
    [view, includedTargets],
  );

  const sales = useMemo(() => buildSettlementSalesFinanceFromTargets(includedTargets), [includedTargets]);
  const roster = useMemo(() => buildSettlementRosterFromTargets(includedTargets), [includedTargets]);
  const individualExpenses = useMemo(
    () => buildSettlementIndividualExpensesFromTargets(includedTargets),
    [includedTargets],
  );

  const profit = useMemo(
    () =>
      buildSettlementProfitView({
        draft: headerView,
        expenses,
        sales,
      }),
    [headerView, expenses, sales],
  );

  const toggleInclude = (code: string) => {
    if (view.targets.some((item) => item.code === code && item.isSource)) return;
    setIncludedCodes((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const changeMemo = (code: string, value: string) => {
    setMemos((current) => ({ ...current, [code]: value }));
  };

  return (
    <div className="member-web-detail-stack settlement-doc-draft-stack">
      {actions}
      <SettlementDocumentHeader view={headerView} />
      <SettlementReservationList
        targets={view.targets}
        includedCodes={includedCodes}
        memos={memos}
        onToggleInclude={toggleInclude}
        onMemoChange={changeMemo}
        reservationHref={reservationHref}
      />
      <SettlementSalesFinanceSection sales={sales} profit={profit} reservationHref={reservationHref} />
      <SettlementIndividualExpenseSection view={individualExpenses} reservationHref={reservationHref} />
      <SettlementRosterSection roster={roster} reservationHref={reservationHref} />
      <SettlementExpensePanel
        method={view.method}
        sourceReservationCode={view.sourceReservationCode}
        targetCodes={includedTargets.map((item) => item.code)}
        eventKey={view.roundKeyLabel}
        productName={view.productName}
        departureAt={view.departureAt}
        expenses={expenses}
        onChange={onExpensesChange}
      />
    </div>
  );
}
