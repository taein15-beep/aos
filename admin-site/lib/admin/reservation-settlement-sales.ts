/**
 * 정산서 STEP 3 — 매출·입금 집계 (읽기 전용 / Mock 재사용)
 * - 고객 판매금액·수납·환불을 기준으로 하며, 제휴/판매점 귀속손익은 포함하지 않습니다.
 * - SAMPLE Mock 기준이며 실은행 입금·운영 결제와 동일하지 않습니다.
 */

import {
  formatKrw,
  getReservationDetail,
  getReservationPayments,
  getReservationRefunds,
  parseKrw,
  type ReservationDetail,
  type ReservationPayment,
  type ReservationRefund,
} from "@/lib/admin/reservations-data";
import type { SettlementTargetReservation } from "@/lib/admin/reservation-settlement-draft";

export type MoneyDisplay =
  | { kind: "amount"; value: number; label: string }
  | { kind: "needs_review"; label: "확인 필요" };

export type SettlementDepositRow = {
  /** 거래 고유 ID (결제 id / 환불 id) — 중복 집계 방지 키 */
  id: string;
  reservationCode: string;
  paidAt: string;
  method: string;
  payer: string;
  amount: number;
  amountLabel: string;
  status: string;
  kind: "payment" | "refund";
};

export type SettlementDepositEmptyReason = "no_transactions" | "unavailable";

export type SettlementSalesFinanceView = {
  totalSales: MoneyDisplay;
  netReceived: MoneyDisplay;
  unpaid: MoneyDisplay;
  overpaid: MoneyDisplay;
  deposits: SettlementDepositRow[];
  depositEmptyReason: SettlementDepositEmptyReason | null;
  /** UI 안내 — Mock 데이터임을 명시 */
  dataNote: string;
};

/** 테스트·계산용 입력. confirmedSaleAmount 가 null 이면 결제의무액 확인 필요. */
export type SettlementSaleReservationInput = {
  code: string;
  confirmedSaleAmount: number | null;
  payments: ReservationPayment[];
  refunds: ReservationRefund[];
};

function amountDisplay(value: number): MoneyDisplay {
  return { kind: "amount", value, label: formatKrw(value) };
}

function needsReview(): MoneyDisplay {
  return { kind: "needs_review", label: "확인 필요" };
}

/** 확정 고객 결제의무액(판매금액). 판별 불가 시 null. */
export function resolveConfirmedSaleAmount(
  reservation: Pick<ReservationDetail, "productAmount" | "optionAmount" | "discountAmount" | "bookingTerms" | "totalAmount">,
): number | null {
  const termsAmount = reservation.bookingTerms?.amount;
  if (typeof termsAmount === "number" && Number.isFinite(termsAmount) && termsAmount >= 0) {
    return Math.round(termsAmount);
  }

  const product = reservation.productAmount;
  const option = reservation.optionAmount;
  const discount = reservation.discountAmount;
  if (
    typeof product === "number" &&
    Number.isFinite(product) &&
    typeof option === "number" &&
    Number.isFinite(option) &&
    typeof discount === "number" &&
    Number.isFinite(discount)
  ) {
    return Math.round(Math.max(0, product + option - discount));
  }

  const fromLabel = parseKrw(reservation.totalAmount ?? "");
  if (reservation.totalAmount && fromLabel > 0) return fromLabel;
  // totalAmount 가 "0원"이고 구성 금액이 없으면 확인 필요로 본다 (임의 0 대체 금지 취지).
  return null;
}

export function isConfirmedReceiptPayment(payment: ReservationPayment) {
  return payment.status === "결제완료" || payment.status === "부분취소";
}

export function isCompletedRefund(refund: ReservationRefund) {
  return refund.status === "환불완료";
}

/** 확인된 고객 수납액 — 카드 승인 Mock 1건만 존재하므로 PG 중복 수납은 발생하지 않음. */
export function sumConfirmedReceipts(payments: ReservationPayment[]) {
  const seen = new Set<string>();
  let total = 0;
  for (const payment of payments) {
    if (!isConfirmedReceiptPayment(payment)) continue;
    if (seen.has(payment.id)) continue;
    seen.add(payment.id);
    total += payment.amount;
  }
  return total;
}

export function sumCompletedRefunds(refunds: ReservationRefund[]) {
  const seen = new Set<string>();
  let total = 0;
  for (const refund of refunds) {
    if (!isCompletedRefund(refund)) continue;
    if (seen.has(refund.id)) continue;
    seen.add(refund.id);
    total += refund.amount;
  }
  return total;
}

export function calculateNetReceived(payments: ReservationPayment[], refunds: ReservationRefund[]) {
  return Math.max(0, sumConfirmedReceipts(payments) - sumCompletedRefunds(refunds));
}

export function calculateUnpaid(obligation: number, netReceived: number) {
  return Math.max(0, obligation - netReceived);
}

export function calculateOverpaid(obligation: number, netReceived: number) {
  return Math.max(0, netReceived - obligation);
}

export function buildDepositRowsForReservation(input: SettlementSaleReservationInput): SettlementDepositRow[] {
  const rows: SettlementDepositRow[] = [];
  const seen = new Set<string>();

  for (const payment of input.payments) {
    if (seen.has(payment.id)) continue;
    seen.add(payment.id);
    rows.push({
      id: payment.id,
      reservationCode: input.code,
      paidAt: payment.paidAt,
      method: payment.method,
      payer: payment.processedBy || "-",
      amount: payment.amount,
      amountLabel: formatKrw(payment.amount),
      status: payment.status,
      kind: "payment",
    });
  }

  for (const refund of input.refunds) {
    if (seen.has(refund.id)) continue;
    seen.add(refund.id);
    rows.push({
      id: refund.id,
      reservationCode: input.code,
      paidAt: refund.refundedAt,
      method: refund.method,
      payer: refund.processedBy || "-",
      amount: refund.amount,
      amountLabel: formatKrw(refund.amount),
      status: refund.status,
      kind: "refund",
    });
  }

  return rows;
}

function sortDepositRows(rows: SettlementDepositRow[]) {
  return [...rows].sort((a, b) => {
    if (a.paidAt !== b.paidAt) return a.paidAt < b.paidAt ? 1 : -1;
    return a.id.localeCompare(b.id);
  });
}

/**
 * 예약 입력 목록으로 매출·입금 요약/내역을 만든다.
 * 동일 예약 code 는 한 번만 집계한다.
 */
export function buildSettlementSalesFinance(inputs: SettlementSaleReservationInput[]): SettlementSalesFinanceView {
  const byCode = new Map<string, SettlementSaleReservationInput>();
  for (const item of inputs) {
    if (!byCode.has(item.code)) byCode.set(item.code, item);
  }
  const unique = Array.from(byCode.values());

  let saleKnown = true;
  let totalSales = 0;
  let totalNet = 0;
  const depositMap = new Map<string, SettlementDepositRow>();

  for (const item of unique) {
    if (item.confirmedSaleAmount === null || !Number.isFinite(item.confirmedSaleAmount)) {
      saleKnown = false;
    } else {
      totalSales += item.confirmedSaleAmount;
    }
    totalNet += calculateNetReceived(item.payments, item.refunds);
    for (const row of buildDepositRowsForReservation(item)) {
      if (!depositMap.has(row.id)) depositMap.set(row.id, row);
    }
  }

  const deposits = sortDepositRows(Array.from(depositMap.values()));
  const netReceived = amountDisplay(totalNet);

  if (!saleKnown) {
    return {
      totalSales: needsReview(),
      netReceived,
      unpaid: needsReview(),
      overpaid: needsReview(),
      deposits,
      depositEmptyReason: deposits.length ? null : "no_transactions",
      dataNote: "SAMPLE Mock 결제·환불 데이터 기준 (실은행 입금·운영 결제 아님)",
    };
  }

  return {
    totalSales: amountDisplay(totalSales),
    netReceived,
    unpaid: amountDisplay(calculateUnpaid(totalSales, totalNet)),
    overpaid: amountDisplay(calculateOverpaid(totalSales, totalNet)),
    deposits,
    depositEmptyReason: deposits.length ? null : "no_transactions",
    dataNote: "SAMPLE Mock 결제·환불 데이터 기준 (실은행 입금·운영 결제 아님)",
  };
}

export function reservationToSaleInput(reservation: ReservationDetail): SettlementSaleReservationInput {
  return {
    code: reservation.code,
    confirmedSaleAmount: resolveConfirmedSaleAmount(reservation),
    payments: getReservationPayments(reservation.code),
    refunds: getReservationRefunds(reservation.code),
  };
}

/**
 * STEP 2 대상 예약 목록을 재사용해 매출·입금을 구성한다.
 * 별도 통합 조회 로직을 두지 않는다.
 */
export function buildSettlementSalesFinanceFromTargets(
  targets: SettlementTargetReservation[],
): SettlementSalesFinanceView {
  const inputs: SettlementSaleReservationInput[] = [];
  const seen = new Set<string>();

  for (const target of targets) {
    if (seen.has(target.code)) continue;
    seen.add(target.code);
    const detail = getReservationDetail(target.code);
    if (!detail) continue;
    inputs.push(reservationToSaleInput(detail));
  }

  if (!inputs.length) {
    return {
      totalSales: needsReview(),
      netReceived: amountDisplay(0),
      unpaid: needsReview(),
      overpaid: needsReview(),
      deposits: [],
      depositEmptyReason: "unavailable",
      dataNote: "SAMPLE Mock 결제·환불 데이터 기준 (실은행 입금·운영 결제 아님)",
    };
  }

  return buildSettlementSalesFinance(inputs);
}
