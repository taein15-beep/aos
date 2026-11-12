import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSettlementDocumentDraftView,
  parseSettlementMethod,
} from "../lib/admin/reservation-settlement-draft.ts";
import {
  buildSettlementSalesFinance,
  buildSettlementSalesFinanceFromTargets,
  calculateNetReceived,
  calculateOverpaid,
  calculateUnpaid,
  resolveConfirmedSaleAmount,
  sumConfirmedReceipts,
  type SettlementSaleReservationInput,
} from "../lib/admin/reservation-settlement-sales.ts";
import { getReservationViewer } from "../lib/admin/reservation-permission.ts";
import type { ReservationPayment, ReservationRefund } from "../lib/admin/reservations-data.ts";

function pay(
  partial: Partial<ReservationPayment> & Pick<ReservationPayment, "id" | "amount">,
): ReservationPayment {
  return {
    paidAt: "2026.10.01 10:00",
    paymentNumber: `PAY-${partial.id}`,
    method: "계좌이체",
    status: "결제완료",
    approvalNumber: "A1",
    processedBy: "시스템",
    ...partial,
  };
}

function refund(
  partial: Partial<ReservationRefund> & Pick<ReservationRefund, "id" | "amount">,
): ReservationRefund {
  return {
    refundedAt: "2026.10.05 11:00",
    refundNumber: `REF-${partial.id}`,
    paymentNumber: "PAY-1",
    method: "원결제 취소",
    status: "환불완료",
    reason: "테스트",
    processedBy: "장윤호",
    ...partial,
  };
}

test("STEP2 정산방식 파싱 유지", () => {
  assert.equal(parseSettlementMethod("individual"), "individual");
  assert.equal(parseSettlementMethod("bundled"), "bundled");
});

test("개별정산 매출 계산", () => {
  const input: SettlementSaleReservationInput = {
    code: "T-IND-1",
    confirmedSaleAmount: 100000,
    payments: [pay({ id: "p1", amount: 100000, method: "신용카드" })],
    refunds: [],
  };
  const view = buildSettlementSalesFinance([input]);
  assert.equal(view.totalSales.kind, "amount");
  assert.equal(view.totalSales.kind === "amount" && view.totalSales.value, 100000);
  assert.equal(view.netReceived.kind === "amount" && view.netReceived.value, 100000);
  assert.equal(view.unpaid.kind === "amount" && view.unpaid.value, 0);
  assert.equal(view.overpaid.kind === "amount" && view.overpaid.value, 0);
});

test("통합정산 매출 합산", () => {
  const view = buildSettlementSalesFinance([
    {
      code: "T-A",
      confirmedSaleAmount: 100000,
      payments: [pay({ id: "pa", amount: 60000 })],
      refunds: [],
    },
    {
      code: "T-B",
      confirmedSaleAmount: 50000,
      payments: [pay({ id: "pb", amount: 50000, method: "신용카드" })],
      refunds: [],
    },
  ]);
  assert.equal(view.totalSales.kind === "amount" && view.totalSales.value, 150000);
  assert.equal(view.netReceived.kind === "amount" && view.netReceived.value, 110000);
  assert.equal(view.unpaid.kind === "amount" && view.unpaid.value, 40000);
});

test("동일 예약 중복 집계 방지", () => {
  const dup: SettlementSaleReservationInput = {
    code: "T-DUP",
    confirmedSaleAmount: 100000,
    payments: [pay({ id: "pd", amount: 100000 })],
    refunds: [],
  };
  const view = buildSettlementSalesFinance([dup, { ...dup, payments: [pay({ id: "pd", amount: 100000 }), pay({ id: "pd2", amount: 1 })] }]);
  assert.equal(view.totalSales.kind === "amount" && view.totalSales.value, 100000);
  assert.equal(view.netReceived.kind === "amount" && view.netReceived.value, 100000);
  assert.equal(view.deposits.filter((row) => row.id === "pd").length, 1);
});

test("계좌입금", () => {
  const view = buildSettlementSalesFinance([
    {
      code: "T-BANK",
      confirmedSaleAmount: 80000,
      payments: [pay({ id: "bank1", amount: 80000, method: "계좌이체" })],
      refunds: [],
    },
  ]);
  assert.equal(view.deposits[0]?.method, "계좌이체");
  assert.equal(sumConfirmedReceipts([pay({ id: "bank1", amount: 80000, method: "계좌이체" })]), 80000);
});

test("카드결제", () => {
  const view = buildSettlementSalesFinance([
    {
      code: "T-CARD",
      confirmedSaleAmount: 90000,
      payments: [pay({ id: "card1", amount: 90000, method: "신용카드" })],
      refunds: [],
    },
  ]);
  assert.equal(view.deposits[0]?.method, "신용카드");
  assert.equal(view.netReceived.kind === "amount" && view.netReceived.value, 90000);
});

test("부분입금", () => {
  const view = buildSettlementSalesFinance([
    {
      code: "T-PART",
      confirmedSaleAmount: 100000,
      payments: [pay({ id: "part1", amount: 40000 })],
      refunds: [],
    },
  ]);
  assert.equal(view.netReceived.kind === "amount" && view.netReceived.value, 40000);
  assert.equal(view.unpaid.kind === "amount" && view.unpaid.value, 60000);
  assert.equal(view.overpaid.kind === "amount" && view.overpaid.value, 0);
});

test("전액입금", () => {
  assert.equal(calculateUnpaid(130000, 130000), 0);
  assert.equal(calculateOverpaid(130000, 130000), 0);
  assert.equal(calculateNetReceived([pay({ id: "f1", amount: 130000 })], []), 130000);
});

test("초과수납", () => {
  const view = buildSettlementSalesFinance([
    {
      code: "T-OVER",
      confirmedSaleAmount: 100000,
      payments: [pay({ id: "o1", amount: 120000 })],
      refunds: [],
    },
  ]);
  assert.equal(view.unpaid.kind === "amount" && view.unpaid.value, 0);
  assert.equal(view.overpaid.kind === "amount" && view.overpaid.value, 20000);
});

test("취소 및 환불", () => {
  const view = buildSettlementSalesFinance([
    {
      code: "T-REF",
      confirmedSaleAmount: 1420000,
      payments: [pay({ id: "rpay", amount: 1420000, method: "신용카드" })],
      refunds: [refund({ id: "rref", amount: 1278000 })],
    },
  ]);
  assert.equal(view.netReceived.kind === "amount" && view.netReceived.value, 142000);
  assert.equal(view.deposits.length, 2);
  assert.ok(view.deposits.some((row) => row.kind === "refund" && row.status === "환불완료"));
});

test("결제정보 없음", () => {
  const view = buildSettlementSalesFinance([
    { code: "T-EMPTY", confirmedSaleAmount: 50000, payments: [], refunds: [] },
  ]);
  assert.equal(view.deposits.length, 0);
  assert.equal(view.depositEmptyReason, "no_transactions");
  assert.equal(view.netReceived.kind === "amount" && view.netReceived.value, 0);
  assert.equal(view.unpaid.kind === "amount" && view.unpaid.value, 50000);
});

test("금액 데이터 누락 → 확인 필요", () => {
  const view = buildSettlementSalesFinance([
    { code: "T-MISS", confirmedSaleAmount: null, payments: [pay({ id: "m1", amount: 10000 })], refunds: [] },
  ]);
  assert.equal(view.totalSales.kind, "needs_review");
  assert.equal(view.unpaid.kind, "needs_review");
  assert.equal(view.overpaid.kind, "needs_review");
  assert.equal(view.netReceived.kind === "amount" && view.netReceived.value, 10000);

  assert.equal(
    resolveConfirmedSaleAmount({
      productAmount: Number.NaN,
      optionAmount: 0,
      discountAmount: 0,
      totalAmount: "",
    }),
    null,
  );
});

test("타 여행사 데이터 조회 제한은 STEP2 대상 목록을 따름", () => {
  const denied = buildSettlementDocumentDraftView({
    method: "individual",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("selling-graegaja"),
  });
  assert.equal(denied, null);

  const allowed = buildSettlementDocumentDraftView({
    method: "bundled",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("selling-hyundam"),
  });
  assert.ok(allowed);
  const sales = buildSettlementSalesFinanceFromTargets(allowed!.targets);
  assert.ok(sales.deposits.every((row) => allowed!.targets.some((t) => t.code === row.reservationCode)));
  assert.equal(
    sales.deposits.some((row) => row.reservationCode === "AOS-RSV-260007"),
    false,
  );
});

test("기존 STEP2 통합 대상 + 매출 연동 정상", () => {
  const draft = buildSettlementDocumentDraftView({
    method: "bundled",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("integrated"),
  });
  assert.ok(draft);
  assert.deepEqual(
    draft!.targets.map((item) => item.code),
    ["AOS-RSV-260005", "AOS-RSV-260006", "AOS-RSV-260007"],
  );
  const sales = buildSettlementSalesFinanceFromTargets(draft!.targets);
  assert.equal(sales.totalSales.kind, "amount");
  assert.ok(sales.totalSales.kind === "amount" && sales.totalSales.value > 0);
});

test("결제대기·결제취소는 수납액에 포함하지 않음", () => {
  const net = calculateNetReceived(
    [
      pay({ id: "ok", amount: 50000, status: "결제완료" }),
      pay({ id: "wait", amount: 30000, status: "결제대기" }),
      pay({ id: "cancel", amount: 20000, status: "결제취소" }),
    ],
    [],
  );
  assert.equal(net, 50000);
});
