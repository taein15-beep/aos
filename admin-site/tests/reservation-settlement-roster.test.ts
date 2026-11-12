import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSettlementDocumentDraftView,
  parseSettlementMethod,
} from "../lib/admin/reservation-settlement-draft.ts";
import {
  buildSettlementRoster,
  buildSettlementRosterFromTargets,
  buildRosterRowsForReservation,
  resolveTourRegion,
  summarizeRosterHeadcount,
  type SettlementRosterReservationInput,
} from "../lib/admin/reservation-settlement-roster.ts";
import { buildSettlementSalesFinanceFromTargets } from "../lib/admin/reservation-settlement-sales.ts";
import { getReservationViewer } from "../lib/admin/reservation-permission.ts";

function baseInput(
  partial: Partial<SettlementRosterReservationInput> & Pick<SettlementRosterReservationInput, "code">,
): SettlementRosterReservationInput {
  return {
    bookerName: "홍길동",
    phone: "010-1111-2222",
    boardingPoint: "서울역",
    counts: { adult: 2, child: 0, infant: 0 },
    productCode: "HT-DMZ01",
    productCategory: "국내여행 > 강원도",
    companions: [{ name: "김동행", type: "성인", birthDate: "1990-01-01", phoneMasked: "010-****-9999" }],
    ...partial,
  };
}

test("STEP2·3 정산방식 파싱 유지", () => {
  assert.equal(parseSettlementMethod("individual"), "individual");
  assert.equal(parseSettlementMethod("bundled"), "bundled");
});

test("개별정산 고객명단 표시", () => {
  const view = buildSettlementRoster([baseInput({ code: "T-1" })]);
  assert.equal(view.rows.length, 2);
  assert.equal(view.rows[0].role, "booker");
  assert.equal(view.rows[1].travelerName, "김동행");
  assert.equal(view.headcountStatus, "ok");
  assert.equal(view.showPassportColumns, false);
});

test("통합정산 여러 예약의 고객명단 표시", () => {
  const view = buildSettlementRoster([
    baseInput({ code: "T-A", companions: [{ name: "일행A", type: "성인" }] }),
    baseInput({
      code: "T-B",
      bookerName: "이서연",
      counts: { adult: 1, child: 1, infant: 0 },
      companions: [{ name: "아이", type: "소아" }],
    }),
  ]);
  assert.equal(view.reservationCount, 2);
  assert.equal(view.listedPeopleCount, 4);
  assert.equal(view.expectedPeopleCount, 4);
  assert.ok(view.rows.some((row) => row.reservationCode === "T-A"));
  assert.ok(view.rows.some((row) => row.reservationCode === "T-B"));
});

test("예약별 명단 그룹화(예약번호 정렬)", () => {
  const view = buildSettlementRoster([
    baseInput({ code: "T-B", companions: [] }),
    baseInput({ code: "T-A", companions: [{ name: "동행", type: "성인" }] }),
  ]);
  const codes = view.rows.map((row) => row.reservationCode);
  assert.deepEqual(
    codes,
    [...codes].sort((a, b) => a.localeCompare(b)),
  );
  const firstB = codes.indexOf("T-B");
  const lastA = codes.lastIndexOf("T-A");
  assert.ok(lastA < firstB);
});

test("예약 중복 집계 방지", () => {
  const dup = baseInput({ code: "T-DUP" });
  const view = buildSettlementRoster([dup, dup]);
  assert.equal(view.reservationCount, 1);
  assert.equal(view.rows.filter((row) => row.reservationCode === "T-DUP").length, 2);
});

test("동일 이름의 서로 다른 여행자 유지", () => {
  const view = buildSettlementRoster([
    baseInput({ code: "T-1", bookerName: "김민수", companions: [] }),
    baseInput({ code: "T-2", bookerName: "김민수", companions: [] }),
  ]);
  assert.equal(view.rows.filter((row) => row.travelerName === "김민수").length, 2);
  assert.notEqual(view.rows[0].id, view.rows[1].id);
});

test("예약인원과 고객명단 인원 비교", () => {
  assert.equal(summarizeRosterHeadcount(2, 2, false).status, "ok");
  assert.equal(summarizeRosterHeadcount(1, 3, false).label, "명단 확인 필요");
  const mismatch = buildSettlementRoster([
    baseInput({
      code: "T-MIS",
      counts: { adult: 3, child: 0, infant: 0 },
      companions: [{ name: "한명만", type: "성인" }],
    }),
  ]);
  assert.equal(mismatch.listedPeopleCount, 2);
  assert.equal(mismatch.expectedPeopleCount, 3);
  assert.equal(mismatch.headcountStatus, "mismatch");
});

test("고객정보 없음", () => {
  const view = buildSettlementRoster([
    baseInput({ code: "T-EMPTY", bookerName: " ", companions: [], counts: { adult: 0, child: 0, infant: 0 } }),
  ]);
  assert.equal(view.rows.length, 0);
  assert.equal(view.emptyReason, "no_roster");
});

test("고객명단 조회 실패", () => {
  const view = buildSettlementRoster([baseInput({ code: "T-FAIL", unavailable: true })]);
  assert.equal(view.headcountStatus, "unavailable");
  assert.equal(view.emptyReason, "unavailable");
  assert.equal(view.rows.length, 0);
});

test("국내상품 표시 — 여권열 숨김", () => {
  assert.equal(resolveTourRegion({ productCategory: "국내여행 > 강원도" }), "domestic");
  const view = buildSettlementRoster([baseInput({ code: "T-DOM" })]);
  assert.equal(view.showPassportColumns, false);
});

test("해외상품 여권정보 조건부 표시(미등록, 번호 미포함)", () => {
  assert.equal(resolveTourRegion({ productCategory: "해외여행 > 중국여행 > 청도" }), "overseas");
  const view = buildSettlementRoster([
    baseInput({
      code: "T-OS",
      productCode: "HP0001C",
      productCategory: "해외여행 > 중국여행 > 청도",
    }),
  ]);
  assert.equal(view.showPassportColumns, true);
  assert.ok(view.rows.every((row) => row.passportStatus === "미등록"));
  assert.ok(view.rows.every((row) => row.passportEnglishName === null));
  assert.match(view.dataNote, /여권번호/);
});

test("타 여행사 고객정보 접근 제한은 STEP2 targets를 따름", () => {
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
  const roster = buildSettlementRosterFromTargets(allowed!.targets);
  assert.ok(roster.rows.every((row) => allowed!.targets.some((item) => item.code === row.reservationCode)));
  assert.equal(
    roster.rows.some((row) => row.reservationCode === "AOS-RSV-260007"),
    false,
  );
});

test("기존 STEP2·3 정상 동작 + 명단 연동", () => {
  const draft = buildSettlementDocumentDraftView({
    method: "bundled",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("integrated"),
  });
  assert.ok(draft);
  const sales = buildSettlementSalesFinanceFromTargets(draft!.targets);
  const roster = buildSettlementRosterFromTargets(draft!.targets);
  assert.equal(sales.totalSales.kind, "amount");
  assert.ok(roster.listedPeopleCount >= 1);
  assert.ok(roster.rows.every((row) => row.id.includes(row.reservationCode)));
});

test("임의 합성 여행자 행을 만들지 않음", () => {
  const rows = buildRosterRowsForReservation(
    baseInput({
      code: "T-NOSYNTH",
      counts: { adult: 5, child: 0, infant: 0 },
      companions: [],
    }),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].role, "booker");
});
