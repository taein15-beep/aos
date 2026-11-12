import assert from "node:assert/strict";
import test from "node:test";
import { buildSettlementDocumentDraftView } from "../lib/admin/reservation-settlement-draft.ts";
import type { SettlementExpenseLine } from "../lib/admin/reservation-settlement-expenses.ts";
import {
  buildSettlementProfitView,
  buildSettlementProfitViewFromInputs,
  classifySettlementCosts,
  formatProfitMargin,
  resolveRevenueAttribution,
  type SettlementProfitReservationInput,
} from "../lib/admin/reservation-settlement-profit.ts";
import { buildSettlementSalesFinance } from "../lib/admin/reservation-settlement-sales.ts";
import { getReservationViewer } from "../lib/admin/reservation-permission.ts";

function expense(partial: Partial<SettlementExpenseLine> & Pick<SettlementExpenseLine, "id" | "name">): SettlementExpenseLine {
  return {
    category: "차량비",
    vendorName: null,
    vendorId: null,
    scope: "reservation",
    reservationCode: "R-DIRECT",
    eventKey: null,
    expectedAmount: null,
    actualAmount: null,
    confirmed: false,
    voucherNumber: null,
    note: "",
    sourceType: "manual",
    removable: true,
    ...partial,
  };
}

function directReservation(overrides: Partial<SettlementProfitReservationInput> = {}): SettlementProfitReservationInput {
  return {
    code: "R-DIRECT",
    sourceType: "direct",
    confirmedSaleAmount: 1000000,
    affiliateClosingSupplierAmount: null,
    bookingTerms: null,
    ...overrides,
  };
}

test("개별정산 직접판매 손익 — 확인완료 비용", () => {
  const view = buildSettlementProfitViewFromInputs({
    method: "individual",
    sourceReservationCode: "R-DIRECT",
    targetCodes: ["R-DIRECT"],
    eventKey: "P_2026-01-01",
    reservations: [directReservation()],
    expenses: [
      expense({
        id: "c1",
        name: "버스",
        actualAmount: 300000,
        confirmed: true,
        expectedAmount: 320000,
      }),
    ],
  });
  assert.equal(view.status, "cost_confirmed");
  assert.equal(view.attributableRevenue.kind, "amount");
  assert.equal(view.attributableRevenue.kind === "amount" && view.attributableRevenue.value, 1000000);
  assert.equal(view.profit.kind, "amount");
  assert.equal(view.profit.kind === "amount" && view.profit.value, 700000);
  assert.equal(view.marginLabel, "70%");
});

test("통합정산 직접판매 손익 — 공통비용 1회", () => {
  const view = buildSettlementProfitViewFromInputs({
    method: "bundled",
    sourceReservationCode: "R1",
    targetCodes: ["R1", "R2"],
    eventKey: "P_2026-01-01",
    reservations: [
      directReservation({ code: "R1", confirmedSaleAmount: 500000 }),
      directReservation({ code: "R2", confirmedSaleAmount: 500000 }),
    ],
    expenses: [
      expense({ id: "d1", name: "식사", reservationCode: "R1", actualAmount: 100000, confirmed: true }),
      expense({ id: "d2", name: "가이드", reservationCode: "R2", actualAmount: 100000, confirmed: true }),
      expense({
        id: "common-bus",
        name: "버스",
        scope: "event_common",
        reservationCode: null,
        eventKey: "P_2026-01-01",
        actualAmount: 400000,
        confirmed: true,
      }),
      expense({
        id: "common-bus",
        name: "버스중복",
        scope: "event_common",
        reservationCode: null,
        eventKey: "P_2026-01-01",
        actualAmount: 400000,
        confirmed: true,
      }),
    ],
  });
  assert.equal(view.status, "cost_confirmed");
  assert.equal(view.totalCost.kind === "amount" && view.totalCost.value, 600000);
  assert.equal(view.profit.kind === "amount" && view.profit.value, 400000);
});

test("매출과 수납금액 구분 — 부분입금이어도 매출 유지", () => {
  const sales = buildSettlementSalesFinance([
    {
      code: "R-DIRECT",
      confirmedSaleAmount: 1000000,
      payments: [
        {
          id: "p1",
          paidAt: "2026-01-01",
          paymentNumber: "PAY-1",
          method: "신용카드",
          amount: 400000,
          status: "결제완료",
          approvalNumber: "APPR-1",
          processedBy: "테스터",
        },
      ],
      refunds: [],
    },
  ]);
  assert.equal(sales.totalSales.kind, "amount");
  assert.equal(sales.totalSales.kind === "amount" && sales.totalSales.value, 1000000);
  assert.equal(sales.netReceived.kind === "amount" && sales.netReceived.value, 400000);

  const view = buildSettlementProfitViewFromInputs({
    method: "individual",
    sourceReservationCode: "R-DIRECT",
    targetCodes: ["R-DIRECT"],
    eventKey: "E1",
    reservations: [directReservation()],
    expenses: [expense({ id: "c1", name: "비용", actualAmount: 200000, confirmed: true })],
    sales,
  });
  assert.equal(view.attributableRevenue.kind === "amount" && view.attributableRevenue.value, 1000000);
  assert.equal(view.netReceived.kind === "amount" && view.netReceived.value, 400000);
  assert.equal(view.profit.kind === "amount" && view.profit.value, 800000);
});

test("예상원가 기준 손익", () => {
  const view = buildSettlementProfitViewFromInputs({
    method: "individual",
    sourceReservationCode: "R-DIRECT",
    targetCodes: ["R-DIRECT"],
    eventKey: "E1",
    reservations: [directReservation({ confirmedSaleAmount: 800000 })],
    expenses: [expense({ id: "e1", name: "예상", expectedAmount: 300000, actualAmount: null, confirmed: false })],
  });
  assert.equal(view.status, "expected");
  assert.equal(view.totalCost.kind === "amount" && view.totalCost.value, 300000);
  assert.equal(view.profit.kind === "amount" && view.profit.value, 500000);
});

test("미확인 실제원가 기준 잠정 손익", () => {
  const view = buildSettlementProfitViewFromInputs({
    method: "individual",
    sourceReservationCode: "R-DIRECT",
    targetCodes: ["R-DIRECT"],
    eventKey: "E1",
    reservations: [directReservation()],
    expenses: [expense({ id: "e1", name: "잠정", expectedAmount: 200000, actualAmount: 180000, confirmed: false })],
  });
  assert.equal(view.status, "provisional");
  assert.equal(view.totalCost.kind === "amount" && view.totalCost.value, 180000);
});

test("실제원가 0원 처리", () => {
  const view = buildSettlementProfitViewFromInputs({
    method: "individual",
    sourceReservationCode: "R-DIRECT",
    targetCodes: ["R-DIRECT"],
    eventKey: "E1",
    reservations: [directReservation({ confirmedSaleAmount: 100000 })],
    expenses: [expense({ id: "zero", name: "무상", actualAmount: 0, confirmed: true })],
  });
  assert.equal(view.status, "cost_confirmed");
  assert.equal(view.totalCost.kind === "amount" && view.totalCost.value, 0);
  assert.equal(view.profit.kind === "amount" && view.profit.value, 100000);
});

test("비용 미등록 시 계산 보류", () => {
  const view = buildSettlementProfitViewFromInputs({
    method: "individual",
    sourceReservationCode: "R-DIRECT",
    targetCodes: ["R-DIRECT"],
    eventKey: "E1",
    reservations: [directReservation()],
    expenses: [],
  });
  assert.equal(view.status, "held");
  assert.ok(view.holdReasons.some((item) => item.includes("비용 미등록")));
  assert.equal(view.profit.kind, "unavailable");
});

test("마이너스 손익 및 이익률", () => {
  const view = buildSettlementProfitViewFromInputs({
    method: "individual",
    sourceReservationCode: "R-DIRECT",
    targetCodes: ["R-DIRECT"],
    eventKey: "E1",
    reservations: [directReservation({ confirmedSaleAmount: 100000 })],
    expenses: [expense({ id: "c1", name: "고비용", actualAmount: 250000, confirmed: true })],
  });
  assert.equal(view.profit.kind === "amount" && view.profit.value, -150000);
  assert.equal(view.marginLabel, "-150%");
});

test("매출 0원 시 이익률 계산 불가", () => {
  assert.equal(formatProfitMargin(0, 0), "계산 불가");
  const view = buildSettlementProfitViewFromInputs({
    method: "individual",
    sourceReservationCode: "R-DIRECT",
    targetCodes: ["R-DIRECT"],
    eventKey: "E1",
    reservations: [directReservation({ confirmedSaleAmount: 0 })],
    expenses: [expense({ id: "c1", name: "비용", actualAmount: 0, confirmed: true })],
  });
  assert.equal(view.marginLabel, "계산 불가");
});

test("제휴여행사 귀속 불명확 시 계산 보류", () => {
  const attribution = resolveRevenueAttribution({
    code: "A1",
    sourceType: "affiliate",
    confirmedSaleAmount: 500000,
    affiliateClosingSupplierAmount: null,
    bookingTerms: null,
  });
  assert.equal(attribution.status, "needs_review");

  const view = buildSettlementProfitViewFromInputs({
    method: "individual",
    sourceReservationCode: "A1",
    targetCodes: ["A1"],
    eventKey: "E1",
    reservations: [
      {
        code: "A1",
        sourceType: "affiliate",
        confirmedSaleAmount: 500000,
        affiliateClosingSupplierAmount: null,
        bookingTerms: null,
      },
    ],
    expenses: [expense({ id: "c1", name: "비용", reservationCode: "A1", actualAmount: 100000, confirmed: true })],
  });
  assert.equal(view.status, "held");
  assert.equal(view.attributableRevenue.kind, "unavailable");
});

test("판매점 수수료형·입금가형 계약조건 누락", () => {
  const commissionMissing = resolveRevenueAttribution({
    code: "S1",
    sourceType: "seller",
    confirmedSaleAmount: 500000,
    affiliateClosingSupplierAmount: null,
    bookingTerms: { saleMode: "수수료형", commissionRate: null, depositPrice: null, pax: 2, sellerProfit: null },
  });
  assert.equal(commissionMissing.status, "needs_review");
  assert.ok(commissionMissing.status === "needs_review" && commissionMissing.reasons.some((r) => r.includes("수수료형")));

  const depositMissing = resolveRevenueAttribution({
    code: "S2",
    sourceType: "seller",
    confirmedSaleAmount: 500000,
    affiliateClosingSupplierAmount: null,
    bookingTerms: { saleMode: "입금가형", commissionRate: null, depositPrice: null, pax: 2, sellerProfit: null },
  });
  assert.equal(depositMissing.status, "needs_review");
  assert.ok(depositMissing.status === "needs_review" && depositMissing.reasons.some((r) => r.includes("입금가형")));
});

test("비용 수정 시 손익 즉시 변경(재계산)", () => {
  const base = {
    method: "individual" as const,
    sourceReservationCode: "R-DIRECT",
    targetCodes: ["R-DIRECT"],
    eventKey: "E1",
    reservations: [directReservation()],
  };
  const first = buildSettlementProfitViewFromInputs({
    ...base,
    expenses: [expense({ id: "c1", name: "비용", actualAmount: 100000, confirmed: true })],
  });
  const second = buildSettlementProfitViewFromInputs({
    ...base,
    expenses: [expense({ id: "c1", name: "비용", actualAmount: 400000, confirmed: true })],
  });
  assert.equal(first.profit.kind === "amount" && first.profit.value, 900000);
  assert.equal(second.profit.kind === "amount" && second.profit.value, 600000);
});

test("행사 공통비용 분류 및 개별정산 제외", () => {
  const lines = [
    expense({ id: "d1", name: "직접", reservationCode: "R1", actualAmount: 100000, confirmed: true }),
    expense({
      id: "c1",
      name: "공통",
      scope: "event_common",
      reservationCode: null,
      eventKey: "E1",
      actualAmount: 500000,
      confirmed: true,
    }),
  ];
  const individual = classifySettlementCosts({
    method: "individual",
    sourceReservationCode: "R1",
    targetCodes: ["R1"],
    eventKey: "E1",
    lines,
    mode: "confirmed",
  });
  assert.equal(individual.commonCost, null);
  assert.equal(individual.totalCost, 100000);

  const bundled = classifySettlementCosts({
    method: "bundled",
    sourceReservationCode: "R1",
    targetCodes: ["R1"],
    eventKey: "E1",
    lines,
    mode: "confirmed",
  });
  assert.equal(bundled.commonCost, 500000);
  assert.equal(bundled.totalCost, 600000);
});

test("실예약 AOS-RSV-260005 — 마감액 귀속 + 비용 없으면 보류", () => {
  const draft = buildSettlementDocumentDraftView({
    method: "individual",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("integrated"),
  });
  assert.ok(draft);
  const held = buildSettlementProfitView({ draft: draft!, expenses: [] });
  assert.equal(held.status, "held");
  assert.equal(held.attributableRevenue.kind, "amount");
  assert.equal(held.attributableRevenue.kind === "amount" && held.attributableRevenue.value, 180000);

  const ready = buildSettlementProfitView({
    draft: draft!,
    expenses: [
      expense({
        id: "meal",
        name: "중식",
        reservationCode: "AOS-RSV-260005",
        actualAmount: 50000,
        confirmed: true,
      }),
    ],
  });
  assert.equal(ready.status, "cost_confirmed");
  assert.equal(ready.profit.kind === "amount" && ready.profit.value, 130000);
});

test("기존 STEP2 draft 조회 유지", () => {
  const draft = buildSettlementDocumentDraftView({
    method: "bundled",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("integrated"),
  });
  assert.ok(draft);
  assert.ok(draft!.targets.length >= 1);
});
