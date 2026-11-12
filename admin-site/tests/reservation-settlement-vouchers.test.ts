import assert from "node:assert/strict";
import test from "node:test";
import {
  createSettlementExpenseLinesWithVouchers,
  createSettlementVoucherFixtures,
  SETTLEMENT_VOUCHER_FIXTURE_EVENT_KEY,
} from "../lib/admin/reservation-settlement-voucher-fixtures.ts";
import {
  buildSettlementVoucherDetailView,
  computeVoucherPaymentSummary,
  filterVouchersForSettlement,
  findSettlementVoucher,
  formatVoucherNumberDisplay,
  hasVoucherNumber,
} from "../lib/admin/reservation-settlement-vouchers.ts";
import {
  buildInitialSettlementExpenses,
  upsertSettlementExpense,
} from "../lib/admin/reservation-settlement-expenses.ts";
import { buildSettlementDocumentDraftView } from "../lib/admin/reservation-settlement-draft.ts";
import { getReservationViewer } from "../lib/admin/reservation-permission.ts";

const catalog = createSettlementVoucherFixtures();
const expenseLines = createSettlementExpenseLinesWithVouchers();

test("기존 STEP2~5 — 비용 초기 시드·수동추가 유지", () => {
  const draft = buildSettlementDocumentDraftView({
    method: "individual",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("integrated"),
  });
  assert.ok(draft);
  assert.deepEqual(buildInitialSettlementExpenses(draft!), []);
  const added = upsertSettlementExpense(
    [],
    {
      category: "식사비",
      name: "중식",
      vendorName: "",
      scope: "reservation",
      expectedAmount: null,
      actualAmount: 1000,
      confirmed: false,
      note: "",
    },
    { sourceReservationCode: "AOS-RSV-260005", eventKey: draft!.roundKeyLabel },
  );
  assert.equal(added[0].voucherNumber, null);
  assert.equal(formatVoucherNumberDisplay(added[0].voucherNumber), "미발급");
});

test("전표번호가 없는 비용 — 미발급, 모달 상세 null", () => {
  const line = expenseLines.find((item) => item.id === "exp-no-voucher")!;
  assert.equal(hasVoucherNumber(line.voucherNumber), false);
  assert.equal(formatVoucherNumberDisplay(line.voucherNumber), "미발급");
  assert.equal(
    buildSettlementVoucherDetailView({
      expense: line,
      catalog,
      productName: "테스트",
      departureAt: "2026-09-26",
    }),
    null,
  );
});

test("전표번호가 있는 비용의 모달 상세", () => {
  const line = expenseLines.find((item) => item.id === "exp-fixture-meal")!;
  const detail = buildSettlementVoucherDetailView({
    expense: line,
    catalog,
    productName: "테스트상품",
    departureAt: "2026-09-26",
  });
  assert.ok(detail);
  assert.equal(detail!.kind, "detail");
  assert.equal(detail!.voucherNumber, "EXP-20260926-001");
  assert.equal(detail!.payment.paymentStatus, "unpaid");
  assert.equal(detail!.payment.paidAmountLabel, "0원");
});

test("전표 상세 데이터가 없는 경우", () => {
  const line = expenseLines.find((item) => item.id === "exp-orphan-voucher-number")!;
  const detail = buildSettlementVoucherDetailView({
    expense: line,
    catalog,
    productName: "테스트상품",
    departureAt: "2026-09-26",
  });
  assert.ok(detail);
  assert.equal(detail!.kind, "number_without_detail");
  assert.match(detail!.connectionNote, /연결되지 않았습니다/);
  assert.equal(detail!.payment.paymentStatus, "unknown");
  assert.equal(detail!.payment.paidAmountLabel, "확인 불가");
});

test("지출금액·미지급 상태", () => {
  const unpaid = computeVoucherPaymentSummary({
    confirmedExpenseAmount: 456000,
    paymentsKnown: true,
    paidAmount: 0,
    paymentEntries: [],
  });
  assert.equal(unpaid.paymentStatus, "unpaid");
  assert.equal(unpaid.unpaidAmount, 456000);
});

test("부분지급 상태", () => {
  const partial = computeVoucherPaymentSummary({
    confirmedExpenseAmount: 250000,
    paymentsKnown: true,
    paidAmount: 100000,
    paymentEntries: [{ id: "1", date: "2026-09-20", method: "계좌이체", amount: 100000, status: "완료" }],
  });
  assert.equal(partial.paymentStatus, "partial");
  assert.equal(partial.unpaidAmount, 150000);
});

test("지급완료 상태 및 여러 지급내역", () => {
  const voucher = findSettlementVoucher({
    expenseId: "exp-fixture-insure",
    voucherNumber: "EXP-20260926-003",
    catalog,
  });
  assert.ok(voucher);
  assert.equal(voucher!.paymentStatus, "paid");
  assert.equal(voucher!.paymentEntries.length, 2);
  const summary = computeVoucherPaymentSummary(voucher!);
  assert.equal(summary.paymentStatus, "paid");
  assert.equal(summary.unpaidAmount, 0);
});

test("실제 지급정보가 없는 경우 확인 불가", () => {
  const unknown = computeVoucherPaymentSummary({
    confirmedExpenseAmount: 50000,
    paymentsKnown: false,
    paidAmount: null,
    paymentEntries: [],
  });
  assert.equal(unknown.paymentStatus, "unknown");
  assert.equal(unknown.paidAmountLabel, "확인 불가");
  assert.equal(unknown.unpaidAmountLabel, "확인 불가");
});

test("개별정산 비용 전표 연결 — 공통비용 제외", () => {
  const filtered = filterVouchersForSettlement({
    method: "individual",
    sourceReservationCode: "AOS-RSV-260005",
    targetCodes: ["AOS-RSV-260005"],
    eventKey: SETTLEMENT_VOUCHER_FIXTURE_EVENT_KEY,
    catalog,
  });
  assert.equal(filtered.some((item) => item.scope === "event_common"), false);
  assert.equal(
    filtered.every((item) => item.reservationCodes.includes("AOS-RSV-260005")),
    true,
  );
});

test("통합정산 공통비용 전표 중복 방지", () => {
  const duplicated = [...catalog, catalog.find((item) => item.expenseId === "exp-fixture-common-bus")!];
  const filtered = filterVouchersForSettlement({
    method: "bundled",
    sourceReservationCode: "AOS-RSV-260005",
    targetCodes: ["AOS-RSV-260005", "AOS-RSV-260006"],
    eventKey: SETTLEMENT_VOUCHER_FIXTURE_EVENT_KEY,
    catalog: duplicated,
  });
  assert.equal(filtered.filter((item) => item.expenseId === "exp-fixture-common-bus").length, 1);
  const common = filtered.find((item) => item.expenseId === "exp-fixture-common-bus")!;
  assert.equal(common.confirmedExpenseAmount, 1000000);
});

test("운영 catalog 비어 있으면 번호만 있는 전표는 상세 미연결", () => {
  const line = expenseLines.find((item) => item.id === "exp-fixture-meal")!;
  const detail = buildSettlementVoucherDetailView({
    expense: line,
    catalog: [],
    productName: "운영화면",
    departureAt: "2026-09-26",
  });
  assert.equal(detail?.kind, "number_without_detail");
});
