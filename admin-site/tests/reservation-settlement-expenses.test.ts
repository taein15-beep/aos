import assert from "node:assert/strict";
import test from "node:test";
import { buildSettlementDocumentDraftView } from "../lib/admin/reservation-settlement-draft.ts";
import {
  buildInitialSettlementExpenses,
  buildSettlementExpenseView,
  createExpenseId,
  filterSettlementExpenses,
  loadExpectedExpenseSeeds,
  parseExpenseAmountInput,
  patchExpenseActualAmount,
  patchExpenseConfirmed,
  removeSettlementExpense,
  resolveProvisionalAmount,
  summarizeSettlementExpenses,
  upsertSettlementExpense,
  type SettlementExpenseLine,
} from "../lib/admin/reservation-settlement-expenses.ts";
import { buildSettlementRosterFromTargets } from "../lib/admin/reservation-settlement-roster.ts";
import { buildSettlementSalesFinanceFromTargets } from "../lib/admin/reservation-settlement-sales.ts";
import { getReservationViewer } from "../lib/admin/reservation-permission.ts";

function line(partial: Partial<SettlementExpenseLine> & Pick<SettlementExpenseLine, "id">): SettlementExpenseLine {
  return {
    category: "차량비",
    name: "테스트비용",
    vendorName: null,
    vendorId: null,
    scope: "reservation",
    reservationCode: "R1",
    eventKey: null,
    expectedAmount: 100000,
    actualAmount: 100000,
    confirmed: false,
    voucherNumber: null,
    note: "",
    sourceType: "manual",
    removable: true,
    ...partial,
  };
}

test("기존 STEP2 대상 조회 유지", () => {
  const draft = buildSettlementDocumentDraftView({
    method: "bundled",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("integrated"),
  });
  assert.ok(draft);
  assert.equal(draft!.targets.length >= 1, true);
});

test("원가 데이터가 없는 경우 — 시드 없음", () => {
  const seeds = loadExpectedExpenseSeeds({
    method: "individual",
    sourceReservationCode: "R1",
    eventKey: "P_2026-01-01",
    targetCodes: ["R1"],
  });
  assert.deepEqual(seeds, []);
  const summary = summarizeSettlementExpenses([]);
  assert.equal(summary.expectedSeedMissing, true);
  assert.equal(summary.expectedTotalLabel, "등록된 예상원가 없음");
});

test("개별정산 비용 구분 — 다른 예약·공통비용 제외", () => {
  const lines = [
    line({ id: "a", reservationCode: "R1", scope: "reservation" }),
    line({ id: "b", reservationCode: "R2", scope: "reservation", name: "다른예약" }),
    line({
      id: "c",
      scope: "event_common",
      reservationCode: null,
      eventKey: "P_2026-01-01",
      name: "공통",
    }),
  ];
  const filtered = filterSettlementExpenses(lines, {
    method: "individual",
    sourceReservationCode: "R1",
    targetCodes: ["R1"],
    eventKey: "P_2026-01-01",
  });
  assert.deepEqual(
    filtered.map((item) => item.id),
    ["a"],
  );
});

test("통합정산 비용 중복 방지 — 공통비용 ID 1회", () => {
  const common = line({
    id: "common-bus",
    scope: "event_common",
    reservationCode: null,
    eventKey: "HT-DMZ01_2026-09-26",
    name: "차량비",
    expectedAmount: 1000000,
    actualAmount: 1000000,
  });
  const lines = [
    common,
    { ...common },
    line({ id: "r1", reservationCode: "AOS-RSV-260005", name: "식사" }),
    line({ id: "r2", reservationCode: "AOS-RSV-260006", name: "가이드" }),
  ];
  const filtered = filterSettlementExpenses(lines, {
    method: "bundled",
    sourceReservationCode: "AOS-RSV-260005",
    targetCodes: ["AOS-RSV-260005", "AOS-RSV-260006"],
    eventKey: "HT-DMZ01_2026-09-26",
  });
  assert.equal(filtered.filter((item) => item.id === "common-bus").length, 1);
  assert.equal(filtered.length, 3);
  const summary = summarizeSettlementExpenses(filtered);
  assert.equal(summary.provisionalActualTotal, 1000000 + 100000 + 100000);
});

test("예상원가 자동 표시(임시)", () => {
  const item = line({ id: "e1", actualAmount: null, expectedAmount: 250000, confirmed: false });
  assert.equal(resolveProvisionalAmount(item), 250000);
});

test("비용 수동 추가", () => {
  const next = upsertSettlementExpense(
    [],
    {
      category: "식사비",
      name: "중식",
      vendorName: "식당A",
      scope: "reservation",
      expectedAmount: null,
      actualAmount: 45000,
      confirmed: false,
      note: "",
    },
    { sourceReservationCode: "R1", eventKey: "E1" },
  );
  assert.equal(next.length, 1);
  assert.equal(next[0].removable, true);
  assert.equal(next[0].sourceType, "manual");
  assert.equal(next[0].voucherNumber, null);
});

test("비용 수정 및 금액 변경 시 미확인 전환", () => {
  const base = [
    line({ id: "edit-1", actualAmount: 100000, confirmed: true }),
  ];
  const patched = patchExpenseActualAmount(base, "edit-1", 120000);
  assert.equal(patched[0].actualAmount, 120000);
  assert.equal(patched[0].confirmed, false);
});

test("수동 추가 비용 삭제", () => {
  const base = [line({ id: "del-1", removable: true }), line({ id: "keep", removable: false, sourceType: "expected_seed" })];
  const next = removeSettlementExpense(base, "del-1");
  assert.equal(next.length, 1);
  assert.equal(next[0].id, "keep");
  assert.deepEqual(removeSettlementExpense(base, "keep"), base);
});

test("실제비용 0원 확인", () => {
  const base = [line({ id: "zero", actualAmount: 0, confirmed: false })];
  const confirmed = patchExpenseConfirmed(base, "zero", true);
  assert.equal(confirmed[0].confirmed, true);
  assert.equal(confirmed[0].actualAmount, 0);
  const summary = summarizeSettlementExpenses(confirmed);
  assert.equal(summary.confirmedTotal, 0);
  assert.equal(summary.confirmedCount, 1);
});

test("예상원가 임시표시 확인 시 실제원가로 반영", () => {
  const base = [line({ id: "tmp", actualAmount: null, expectedAmount: 250000, confirmed: false })];
  const confirmed = patchExpenseConfirmed(base, "tmp", true);
  assert.equal(confirmed[0].actualAmount, 250000);
  assert.equal(confirmed[0].confirmed, true);
});

test("확인완료 비용 합산", () => {
  const summary = summarizeSettlementExpenses([
    line({ id: "1", actualAmount: 100, confirmed: true }),
    line({ id: "2", actualAmount: 200, confirmed: true }),
    line({ id: "3", actualAmount: 50, confirmed: false }),
  ]);
  assert.equal(summary.confirmedTotal, 300);
  assert.equal(summary.confirmedCount, 2);
  assert.equal(summary.unconfirmedCount, 1);
});

test("전표번호 미생성 라인은 null 유지", () => {
  const id = createExpenseId();
  assert.match(id, /^exp-/);
  const view = buildSettlementExpenseView({
    method: "individual",
    sourceReservationCode: "R1",
    targetCodes: ["R1"],
    eventKey: "E1",
    lines: [line({ id: "x1", voucherNumber: null })],
  });
  assert.equal(view.lines[0].voucherNumber, null);
});

test("금액 파싱", () => {
  assert.equal(parseExpenseAmountInput(""), null);
  assert.equal(parseExpenseAmountInput("1,200원"), 1200);
  assert.equal(parseExpenseAmountInput("0"), 0);
});

test("초기 시드 및 STEP3·4 유지", () => {
  const draft = buildSettlementDocumentDraftView({
    method: "individual",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("integrated"),
  });
  assert.ok(draft);
  assert.deepEqual(buildInitialSettlementExpenses(draft!), []);
  const sales = buildSettlementSalesFinanceFromTargets(draft!.targets);
  const roster = buildSettlementRosterFromTargets(draft!.targets);
  assert.equal(sales.totalSales.kind, "amount");
  assert.ok(roster.listedPeopleCount >= 0);
});
