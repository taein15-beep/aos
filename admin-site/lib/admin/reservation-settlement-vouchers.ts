/**
 * 정산서 STEP 6 — 지출전표 상세 (조회 전용 / 저장·지급·발급 없음)
 *
 * live 참고:
 * - orderSheet_outsite.ticket_num → money_act (gubun_code=2 지출)
 * - money_act_minor: 전표 세부 항목
 * - void_code / finish_date / treatment: 취소·완료 상태
 * admin-site에는 실전표 원장이 없으므로 catalog는 비어 있고, 테스트 fixture만 별도 사용한다.
 */

import { formatKrw } from "@/lib/admin/reservations-data";
import type { SettlementMethod } from "@/lib/admin/reservation-settlement-draft";
import type { SettlementExpenseLine, SettlementExpenseScope } from "@/lib/admin/reservation-settlement-expenses";

export type SettlementVoucherPaymentStatus = "unpaid" | "partial" | "paid" | "unknown";

export type SettlementVoucherPaymentEntry = {
  id: string;
  date: string;
  method: string;
  amount: number;
  status: string;
  payeeName?: string | null;
  transactionRef?: string | null;
};

export type SettlementVoucher = {
  id: string;
  voucherNumber: string;
  expenseId: string;
  reservationCodes: string[];
  eventKey: string | null;
  scope: SettlementExpenseScope;
  expenseCategory: string;
  expenseName: string;
  vendorId: string | null;
  vendorName: string | null;
  expenseDate: string | null;
  description: string | null;
  /** 확정 지출금액. null = 미확정/미연결 */
  confirmedExpenseAmount: number | null;
  expenseConfirmed: boolean;
  /**
   * 지급내역을 신뢰할 수 있는지.
   * false면 지급금액·미지급·상태를 `확인 불가`로 표시한다 (0원 단정 금지).
   */
  paymentsKnown: boolean;
  paidAmount: number | null;
  unpaidAmount: number | null;
  paymentStatus: SettlementVoucherPaymentStatus;
  paymentEntries: SettlementVoucherPaymentEntry[];
  payeeName: string | null;
  paymentMethodSummary: string | null;
  paymentDateSummary: string | null;
  transactionRef: string | null;
  memo: string | null;
  productName: string | null;
  departureAt: string | null;
};

export type SettlementVoucherPaymentSummary = {
  paymentStatus: SettlementVoucherPaymentStatus;
  paymentStatusLabel: string;
  paidAmount: number | null;
  unpaidAmount: number | null;
  paidAmountLabel: string;
  unpaidAmountLabel: string;
};

export type SettlementVoucherDetailKind = "number_without_detail" | "detail";

export type SettlementVoucherDetailView = {
  kind: SettlementVoucherDetailKind;
  voucherNumber: string;
  expense: SettlementExpenseLine;
  voucher: SettlementVoucher | null;
  productName: string;
  departureAt: string;
  payment: SettlementVoucherPaymentSummary;
  connectionNote: string;
};

function isFiniteAmount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatVoucherNumberDisplay(voucherNumber: string | null | undefined): string {
  const value = voucherNumber?.trim();
  return value ? value : "미발급";
}

export function hasVoucherNumber(voucherNumber: string | null | undefined): boolean {
  return Boolean(voucherNumber?.trim());
}

/** 화면 임시 전표번호. EXP-YYYYMMDD-NNN */
export function createExpenseVoucherNumber(
  existing: Array<{ voucherNumber?: string | null }> = [],
  date = new Date(),
): string {
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const prefix = `EXP-${ymd}-`;
  let max = 0;
  for (const item of existing) {
    const value = item.voucherNumber?.trim() || "";
    if (!value.startsWith(prefix)) continue;
    const seq = Number(value.slice(prefix.length));
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function paymentStatusLabel(status: SettlementVoucherPaymentStatus): string {
  switch (status) {
    case "unpaid":
      return "미지급";
    case "partial":
      return "부분지급";
    case "paid":
      return "지급완료";
    default:
      return "확인 불가";
  }
}

export function scopeLabel(scope: SettlementExpenseScope): string {
  return scope === "event_common" ? "행사 공통" : "예약별";
}

/** 확정 비용 + 신뢰 가능한 지급내역이 있을 때만 미지급·상태 계산 */
export function computeVoucherPaymentSummary(input: {
  confirmedExpenseAmount: number | null;
  paymentsKnown: boolean;
  paidAmount: number | null;
  paymentEntries: SettlementVoucherPaymentEntry[];
}): SettlementVoucherPaymentSummary {
  if (!input.paymentsKnown) {
    return {
      paymentStatus: "unknown",
      paymentStatusLabel: paymentStatusLabel("unknown"),
      paidAmount: null,
      unpaidAmount: null,
      paidAmountLabel: "확인 불가",
      unpaidAmountLabel: "확인 불가",
    };
  }

  const paidFromEntries = input.paymentEntries.reduce((sum, entry) => sum + (Number.isFinite(entry.amount) ? entry.amount : 0), 0);
  const paidAmount = isFiniteAmount(input.paidAmount) ? input.paidAmount : paidFromEntries;

  if (!isFiniteAmount(input.confirmedExpenseAmount)) {
    return {
      paymentStatus: paidAmount > 0 ? "unknown" : "unpaid",
      paymentStatusLabel: paymentStatusLabel(paidAmount > 0 ? "unknown" : "unpaid"),
      paidAmount,
      unpaidAmount: null,
      paidAmountLabel: formatKrw(paidAmount),
      unpaidAmountLabel: "확인 불가",
    };
  }

  const unpaidAmount = Math.max(0, input.confirmedExpenseAmount - paidAmount);
  let paymentStatus: SettlementVoucherPaymentStatus = "unpaid";
  if (paidAmount <= 0) paymentStatus = "unpaid";
  else if (paidAmount >= input.confirmedExpenseAmount) paymentStatus = "paid";
  else paymentStatus = "partial";

  return {
    paymentStatus,
    paymentStatusLabel: paymentStatusLabel(paymentStatus),
    paidAmount,
    unpaidAmount,
    paidAmountLabel: formatKrw(paidAmount),
    unpaidAmountLabel: formatKrw(unpaidAmount),
  };
}

export function normalizeSettlementVoucher(voucher: SettlementVoucher): SettlementVoucher {
  const payment = computeVoucherPaymentSummary({
    confirmedExpenseAmount: voucher.confirmedExpenseAmount,
    paymentsKnown: voucher.paymentsKnown,
    paidAmount: voucher.paidAmount,
    paymentEntries: voucher.paymentEntries,
  });
  return {
    ...voucher,
    paymentStatus: payment.paymentStatus,
    paidAmount: payment.paidAmount,
    unpaidAmount: payment.unpaidAmount,
  };
}

/** expenseId 우선, 없으면 voucherNumber로 조회. 없으면 null (가짜 전표 생성 금지) */
export function findSettlementVoucher(input: {
  expenseId: string;
  voucherNumber: string | null | undefined;
  catalog: SettlementVoucher[];
}): SettlementVoucher | null {
  const byExpense = input.catalog.find((item) => item.expenseId === input.expenseId);
  if (byExpense) return normalizeSettlementVoucher(byExpense);

  const number = input.voucherNumber?.trim();
  if (!number) return null;
  const byNumber = input.catalog.find((item) => item.voucherNumber === number);
  return byNumber ? normalizeSettlementVoucher(byNumber) : null;
}

/** 개별: 선택 예약 직접비용 전표만. 통합: targets 직접 + 행사 공통, expenseId 1회 */
export function filterVouchersForSettlement(input: {
  method: SettlementMethod;
  sourceReservationCode: string;
  targetCodes: string[];
  eventKey: string;
  catalog: SettlementVoucher[];
}): SettlementVoucher[] {
  const targetSet = new Set(input.targetCodes);
  const seenExpense = new Set<string>();
  const result: SettlementVoucher[] = [];

  for (const raw of input.catalog) {
    const voucher = normalizeSettlementVoucher(raw);
    if (seenExpense.has(voucher.expenseId)) continue;

    if (input.method === "individual") {
      if (voucher.scope !== "reservation") continue;
      if (!voucher.reservationCodes.includes(input.sourceReservationCode)) continue;
      seenExpense.add(voucher.expenseId);
      result.push(voucher);
      continue;
    }

    if (voucher.scope === "event_common") {
      if (voucher.eventKey && voucher.eventKey !== input.eventKey) continue;
      seenExpense.add(voucher.expenseId);
      result.push(voucher);
      continue;
    }

    if (voucher.reservationCodes.some((code) => targetSet.has(code))) {
      seenExpense.add(voucher.expenseId);
      result.push(voucher);
    }
  }

  return result;
}

export function buildSettlementVoucherDetailView(input: {
  expense: SettlementExpenseLine;
  catalog: SettlementVoucher[];
  productName: string;
  departureAt: string;
}): SettlementVoucherDetailView | null {
  const voucherNumber = input.expense.voucherNumber?.trim();
  if (!voucherNumber) return null;

  const voucher = findSettlementVoucher({
    expenseId: input.expense.id,
    voucherNumber,
    catalog: input.catalog,
  });

  if (!voucher) {
    const confirmed =
      input.expense.confirmed && isFiniteAmount(input.expense.actualAmount) ? input.expense.actualAmount : null;
    return {
      kind: "number_without_detail",
      voucherNumber,
      expense: input.expense,
      voucher: null,
      productName: input.productName,
      departureAt: input.departureAt,
      payment: computeVoucherPaymentSummary({
        confirmedExpenseAmount: confirmed,
        paymentsKnown: false,
        paidAmount: null,
        paymentEntries: [],
      }),
      connectionNote: "전표 상세정보가 연결되지 않았습니다.",
    };
  }

  return {
    kind: "detail",
    voucherNumber: voucher.voucherNumber,
    expense: input.expense,
    voucher,
    productName: voucher.productName || input.productName,
    departureAt: voucher.departureAt || input.departureAt,
    payment: computeVoucherPaymentSummary({
      confirmedExpenseAmount: voucher.confirmedExpenseAmount,
      paymentsKnown: voucher.paymentsKnown,
      paidAmount: voucher.paidAmount,
      paymentEntries: voucher.paymentEntries,
    }),
    connectionNote: "비용 ID 기준으로 전표를 연결했습니다. 조회 전용입니다.",
  };
}

export function formatConfirmedExpenseAmount(amount: number | null): string {
  if (!isFiniteAmount(amount)) return "미확정";
  return formatKrw(amount);
}
