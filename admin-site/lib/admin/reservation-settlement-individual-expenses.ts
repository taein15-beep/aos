/**
 * 정산서 — 예약별 지출금액 (읽기 전용)
 * - 예약상세 출금관리에 등록된 내역을 정산 포함 예약 기준으로 표시합니다.
 * - 정산서에서 추가·수정하지 않습니다.
 */

import type { SettlementTargetReservation } from "@/lib/admin/reservation-settlement-draft";
import {
  formatWithdrawalAmount,
  formatWithdrawalPaidAt,
  formatWithdrawalPaymentStatus,
  formatWithdrawalVoucher,
  listReservationWithdrawals,
  type ReservationWithdrawalLine,
} from "@/lib/admin/reservation-withdrawals-data";

export type SettlementIndividualExpenseRow = ReservationWithdrawalLine & {
  bookerName: string;
  amountLabel: string;
  voucherLabel: string;
  paidAtLabel: string;
  paymentStatusLabel: string;
};

export type SettlementIndividualExpenseView = {
  rows: SettlementIndividualExpenseRow[];
  totalAmount: number;
  totalAmountLabel: string;
  reservationCount: number;
  lineCount: number;
};

export function buildSettlementIndividualExpensesFromTargets(
  targets: SettlementTargetReservation[],
): SettlementIndividualExpenseView {
  const byCode = new Map<string, SettlementTargetReservation>();
  for (const target of targets) {
    if (!byCode.has(target.code)) byCode.set(target.code, target);
  }

  const rows: SettlementIndividualExpenseRow[] = [];
  for (const target of byCode.values()) {
    const lines = listReservationWithdrawals(target.code);
    for (const line of lines) {
      rows.push({
        ...line,
        bookerName: target.bookerName || "-",
        amountLabel: formatWithdrawalAmount(line.amount),
        voucherLabel: formatWithdrawalVoucher(line.voucherNumber),
        paidAtLabel: formatWithdrawalPaidAt(line),
        paymentStatusLabel: formatWithdrawalPaymentStatus(line.paymentStatus),
      });
    }
  }

  rows.sort((a, b) => {
    if (a.reservationCode !== b.reservationCode) return a.reservationCode.localeCompare(b.reservationCode);
    const voucherA = a.voucherNumber?.trim() || "";
    const voucherB = b.voucherNumber?.trim() || "";
    if (voucherA !== voucherB) {
      if (!voucherA) return 1;
      if (!voucherB) return -1;
      return voucherA.localeCompare(voucherB);
    }
    if (a.withdrawnAt !== b.withdrawnAt) return a.withdrawnAt < b.withdrawnAt ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
  return {
    rows,
    totalAmount,
    totalAmountLabel: formatWithdrawalAmount(totalAmount),
    reservationCount: new Set(rows.map((row) => row.reservationCode)).size,
    lineCount: rows.length,
  };
}
