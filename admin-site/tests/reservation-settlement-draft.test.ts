import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSettlementDocumentDraftView,
  buildSettlementRoundKey,
  normalizeDepartureDate,
  parseSettlementMethod,
  settlementRoundKeyToString,
} from "../lib/admin/reservation-settlement-draft.ts";
import { getReservationViewer } from "../lib/admin/reservation-permission.ts";

test("정산방식 파싱", () => {
  assert.equal(parseSettlementMethod("individual"), "individual");
  assert.equal(parseSettlementMethod("bundled"), "bundled");
  assert.equal(parseSettlementMethod("other"), null);
});

test("출발일 정규화 및 묶음 키", () => {
  assert.equal(normalizeDepartureDate("2026-09-26 10:00"), "2026-09-26");
  const key = buildSettlementRoundKey({ productCode: "HT-DMZ01", departureAt: "2026-09-26" });
  assert.equal(settlementRoundKeyToString(key), "HT-DMZ01_2026-09-26");
});

test("개별정산은 예약 1건만", () => {
  const view = buildSettlementDocumentDraftView({
    method: "individual",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("integrated"),
  });
  assert.ok(view);
  assert.equal(view?.targets.length, 1);
  assert.equal(view?.targets[0].code, "AOS-RSV-260005");
  assert.equal(view?.methodLabel, "개별정산");
});

test("통합정산은 동일 상품·출발일만 묶고 중복 제거", () => {
  const view = buildSettlementDocumentDraftView({
    method: "bundled",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("integrated"),
  });
  assert.ok(view);
  const codes = view!.targets.map((item) => item.code);
  assert.deepEqual(codes, ["AOS-RSV-260005", "AOS-RSV-260006", "AOS-RSV-260007"]);
  assert.equal(new Set(codes).size, codes.length);
  assert.ok(view!.targets.every((item) => item.productCode === "HT-DMZ01"));
  assert.ok(view!.targets.every((item) => item.departureAt === "2026-09-26"));
});

test("다른 출발일은 통합되지 않음", () => {
  const view = buildSettlementDocumentDraftView({
    method: "bundled",
    sourceReservationCode: "AOS-RSV-260001",
    viewer: getReservationViewer("integrated"),
  });
  assert.ok(view);
  assert.equal(view?.departureAt, "2026-10-24");
  assert.ok(view!.targets.every((item) => item.departureAt === "2026-10-24"));
  assert.equal(view!.targets.some((item) => item.code === "AOS-RSV-260005"), false);
});

test("타 여행사 관점에서는 비공개 예약 제외, 원본은 포함", () => {
  const view = buildSettlementDocumentDraftView({
    method: "bundled",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("selling-hyundam"),
  });
  assert.ok(view);
  const codes = view!.targets.map((item) => item.code);
  assert.ok(codes.includes("AOS-RSV-260005"));
  assert.ok(codes.includes("AOS-RSV-260006"));
  assert.equal(codes.includes("AOS-RSV-260007"), false);
});

test("권한 없는 관점의 직접 접근은 null", () => {
  const view = buildSettlementDocumentDraftView({
    method: "individual",
    sourceReservationCode: "AOS-RSV-260005",
    viewer: getReservationViewer("selling-graegaja"),
  });
  assert.equal(view, null);
});
