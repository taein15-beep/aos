/**
 * 판매점 수익 정산 (SAMPLE / 테스트 데이터) — 공급여행사(행복투어) → 판매점(그래가자)
 * - 정산금액 = 판매점에게 지급할 예약 당시 판매점 수익(Snapshot) 합계 · 예약금액 · 환불금액 · 취소수수료와 무관
 * - 취소조정은 예약 상태(취소완료)에서 파생 → 같은 예약은 한 정산에만 한 번 반영 (저장 목록 없음)
 * - 정산상태별 처리: 정산대기 직접차감 / 정산확정 수정필요 → 정산서 재발행 → 재확인 / 지급완료 차기정산 차감
 * - 실제 지급 · 정산서 PDF · 회계처리 없음 · 메모리 Module State (새로고침 시 초기화)
 */

import { useSyncExternalStore } from "react";
import { getReservationDetail, getReservationRefunds, type ReservationDetail } from "@/lib/admin/reservations-data";
import {
  SELLER_CHANNEL_SELLER_ID,
  SELLER_CHANNEL_SELLER_NAME,
  listSellerChannelRecords,
  sellerCancelProcessedAt,
} from "@/lib/admin/seller-channel-reservations";
import { SELLER_RESERVATION_BASE_DATE, listSellerReservations } from "@/lib/seller/seller-reservations-data";

export const SELLER_SETTLEMENT_SUPPLIER_NAME = "행복투어";
const SUPPLIER_ADMIN = `${SELLER_SETTLEMENT_SUPPLIER_NAME} 관리자`;
const SYSTEM_ACTOR = "시스템 Mock";

export type SellerSettlementBaseStatus = "정산대기" | "정산확정" | "지급완료";
export type SellerSettlementStatus = SellerSettlementBaseStatus | "수정필요" | "재확인대기";

/** QA 시나리오 — 10월 1차 정산의 취소 발생 전 상태 */
export const SELLER_SETTLEMENT_SCENARIOS: { key: SellerSettlementBaseStatus; label: string }[] = [
  { key: "정산대기", label: "정산확정 전 (정산대기)" },
  { key: "정산확정", label: "정산확정 후 · 지급 전" },
  { key: "지급완료", label: "지급완료 후" },
];

/** 정산 대상 예약의 정산 반영상태 */
export type SellerSettlementReflection = "정상" | "반영완료" | "반영대기" | "차기정산 반영예정" | "취소처리중";

export type SellerSettlementLine = {
  reservationCode: string;
  reservedAt: string;
  productCode: string;
  productName: string;
  saleMode: "입금가형" | "수수료형";
  reserveStatus: string;
  paymentStatus: string;
  /** 예약 당시 판매점 수익 (Snapshot) */
  originalProfit: number;
  /** 이 정산에 반영된 조정금액 (0 또는 음수) */
  adjustment: number;
  /** 반영 대기 중인 조정금액 (정산확정 후 수정필요) */
  pendingAdjustment: number;
  finalProfit: number;
  reflection: SellerSettlementReflection;
  /** 취소완료 일시 */
  cancelledAt: string | null;
  /** 고객 환불금액 (판매점 정산차감액과 다른 금액) */
  refundAmount: number | null;
  refundNote: string | null;
};

export type SellerNextAdjustment = {
  id: string;
  reservationCode: string;
  productName: string;
  type: "취소완료";
  amount: number;
  occurredAt: string;
  sourceSettlementCode: string;
  targetSettlementCode: string;
  status: "차기정산 대기";
  reason: string;
};

export type SellerSettlementDocument = { version: number; issuedAt: string; amount: number; issuedBy: string; current: boolean };

export type SellerSettlementEvent = { at: string; label: string; actor: string; note?: string; tone: "info" | "success" | "warn" | "gray" };

export type SellerSettlementCheck = { canConfirm: boolean; blockers: string[]; warnings: string[] };

export type SellerSettlement = {
  code: string;
  label: string;
  periodFrom: string;
  periodTo: string;
  dueDate: string;
  supplierName: string;
  sellerId: string;
  sellerName: string;
  baseStatus: SellerSettlementBaseStatus;
  status: SellerSettlementStatus;
  /** 상세 Mock 외 정상 예약 집계 (SAMPLE) */
  otherReservations: { count: number; profit: number };
  lines: SellerSettlementLine[];
  /** 정산 원금 = 예약 당시 판매점 수익 합계 */
  principal: number;
  /** 이 정산에 반영된 취소조정 합계 (음수) */
  currentAdjustment: number;
  /** 이전 정산에서 넘어온 차기정산 조정 합계 (음수) */
  carriedAdjustment: number;
  /** 수정필요 상태에서 아직 반영하지 않은 취소조정 합계 (음수) */
  pendingAdjustment: number;
  finalAmount: number;
  /** 지급완료 금액 (지급 후 변경 없음) */
  paidAmount: number | null;
  paidAt: string | null;
  /** 이 정산 이후 차기정산으로 넘긴 조정 */
  outgoingAdjustments: SellerNextAdjustment[];
  /** 이 정산에 반영예정인 이전 정산 조정 */
  incomingAdjustments: SellerNextAdjustment[];
  documents: SellerSettlementDocument[];
  sellerConfirmed: boolean;
  handoverCompletedAt: string | null;
  events: SellerSettlementEvent[];
};

type PeriodSeed = {
  code: string;
  label: string;
  periodFrom: string;
  periodTo: string;
  dueDate: string;
  otherCount: number;
  otherProfit: number | "derived";
  status: SellerSettlementBaseStatus | "scenario";
};

const CURRENT_CODE = "STL-SEL032-202610-1";
const NEXT_CODE = "STL-SEL032-202610-2";
/** 10월 1차 정산의 취소 발생 전 정산예정금액 (SAMPLE 기준값) */
const CURRENT_BASE_AMOUNT = 3_850_000;

const PERIODS: PeriodSeed[] = [
  {
    code: NEXT_CODE,
    label: "2026년 10월 2차",
    periodFrom: "2026-10-16",
    periodTo: "2026-10-31",
    dueDate: "2026-11-05",
    otherCount: 33,
    otherProfit: 2_500_000,
    status: "정산대기",
  },
  {
    code: CURRENT_CODE,
    label: "2026년 10월 1차",
    periodFrom: "2026-10-01",
    periodTo: "2026-10-15",
    dueDate: "2026-10-20",
    otherCount: 36,
    otherProfit: "derived",
    status: "scenario",
  },
  {
    code: "STL-SEL032-202609-2",
    label: "2026년 9월 2차",
    periodFrom: "2026-09-16",
    periodTo: "2026-09-30",
    dueDate: "2026-10-05",
    otherCount: 41,
    otherProfit: 3_120_000,
    status: "지급완료",
  },
];

/** 시나리오별 기본 이력 (취소 발생 전) */
const SEED_EVENTS: Record<SellerSettlementBaseStatus, SellerSettlementEvent[]> = {
  정산대기: [{ at: "2026-10-01 00:10", label: "정산생성", actor: SYSTEM_ACTOR, tone: "gray" }],
  정산확정: [
    { at: "2026-10-01 00:10", label: "정산생성", actor: SYSTEM_ACTOR, tone: "gray" },
    { at: "2026-10-12 15:30", label: "운영인계 완료", actor: SUPPLIER_ADMIN, tone: "info" },
    { at: "2026-10-12 16:00", label: "정산확정", actor: SUPPLIER_ADMIN, tone: "success", note: "정산서 v1 기준" },
    { at: "2026-10-12 16:05", label: "정산서 v1 발행", actor: SUPPLIER_ADMIN, tone: "info", note: "Mock 발행 · 실제 파일 없음" },
    { at: "2026-10-12 16:20", label: "판매점 확인", actor: SELLER_CHANNEL_SELLER_NAME, tone: "success", note: "정산서 v1" },
  ],
  지급완료: [
    { at: "2026-10-01 00:10", label: "정산생성", actor: SYSTEM_ACTOR, tone: "gray" },
    { at: "2026-10-12 15:30", label: "운영인계 완료", actor: SUPPLIER_ADMIN, tone: "info" },
    { at: "2026-10-12 16:00", label: "정산확정", actor: SUPPLIER_ADMIN, tone: "success", note: "정산서 v1 기준" },
    { at: "2026-10-12 16:05", label: "정산서 v1 발행", actor: SUPPLIER_ADMIN, tone: "info", note: "Mock 발행 · 실제 파일 없음" },
    { at: "2026-10-12 16:20", label: "판매점 확인", actor: SELLER_CHANNEL_SELLER_NAME, tone: "success", note: "정산서 v1" },
    { at: "2026-10-12 16:25", label: "지급완료", actor: SUPPLIER_ADMIN, tone: "success", note: "Mock 지급 · 실제 이체 없음" },
  ],
};

const PAID_PERIOD_EVENTS: SellerSettlementEvent[] = [
  { at: "2026-09-16 00:10", label: "정산생성", actor: SYSTEM_ACTOR, tone: "gray" },
  { at: "2026-10-01 18:00", label: "운영인계 완료", actor: SUPPLIER_ADMIN, tone: "info" },
  { at: "2026-10-02 11:00", label: "정산확정", actor: SUPPLIER_ADMIN, tone: "success", note: "정산서 v1 기준" },
  { at: "2026-10-02 11:05", label: "정산서 v1 발행", actor: SUPPLIER_ADMIN, tone: "info", note: "Mock 발행 · 실제 파일 없음" },
  { at: "2026-10-05 10:00", label: "지급완료", actor: SUPPLIER_ADMIN, tone: "success", note: "Mock 지급 · 실제 이체 없음" },
];

/* ───────────── Client State (QA 시나리오 · 정산 수정 Workflow) ───────────── */

type Workflow = {
  /** 정산확정 후 취소조정을 반영한 예약 */
  applied: { code: string; at: string }[];
  /** 재발행 정산서 (v2~) — 반영 예약 목록 포함 */
  reissues: { version: number; issuedAt: string; amount: number; codes: string[] }[];
  /** 판매점 확인(Mock)한 정산서 버전 */
  sellerConfirmedVersion: number | null;
  /** 재확인 후 다시 정산확정한 정산서 버전 */
  reconfirmedVersion: number | null;
  events: SellerSettlementEvent[];
};

const EMPTY_WORKFLOW: Workflow = { applied: [], reissues: [], sellerConfirmedVersion: null, reconfirmedVersion: null, events: [] };

let scenario: SellerSettlementBaseStatus = "정산대기";
let workflow: Workflow = EMPTY_WORKFLOW;
let storeVersion = 0;
const listeners = new Set<() => void>();

function emit() {
  storeVersion += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 정산 Store 변경 감지 (예약 상태 변경은 각 화면의 재조회로 반영) */
export function useSellerSettlementStoreVersion() {
  return useSyncExternalStore(
    subscribe,
    () => storeVersion,
    () => 0,
  );
}

export function getSellerSettlementScenario() {
  return scenario;
}

/** QA 시나리오 변경 — 10월 1차 정산의 수정 Workflow를 초기화합니다. (예약 상태는 유지) */
export function setSellerSettlementScenario(next: SellerSettlementBaseStatus) {
  if (next === scenario) return;
  scenario = next;
  workflow = EMPTY_WORKFLOW;
  emit();
}

/* ───────────── 정산 대상 예약 ───────────── */

/** 정산 생성 시점에 이미 취소완료였던 예약 (기본 Mock) — 모든 정산서 v1에 반영된 상태 */
const BASE_CANCELLED = new Set(
  listSellerReservations(SELLER_CHANNEL_SELLER_ID)
    .filter((row) => row.status === "취소완료")
    .map((row) => row.reservationCode),
);

function cancelledAtOf(reservation: ReservationDetail) {
  const request = reservation.sellerCancelRequest;
  if (request?.refund?.completedAt) return request.refund.completedAt;
  const entry = [...(reservation.statusTimeline ?? [])].reverse().find((item) => item.label.endsWith("취소완료"));
  return entry?.at ?? null;
}

function refundOf(reservation: ReservationDetail): { amount: number | null; note: string | null } {
  const refund = reservation.sellerCancelRequest?.refund;
  if (refund?.status === "환불완료") return { amount: refund.amount, note: `환불완료 ${krw(refund.amount)}` };
  if (refund?.status === "환불없음") {
    return { amount: 0, note: reservation.paymentStatus === "미결제" ? "미결제 · 환불 없음" : "환불예정금액 0원 · 환불 없음" };
  }
  const base = getReservationRefunds(reservation.code).find((item) => item.status === "환불완료");
  return base ? { amount: base.amount, note: `환불완료 ${krw(base.amount)}` } : { amount: null, note: null };
}

function cancellingNote(reservation: ReservationDetail) {
  if (reservation.reserveStatus === "취소요청") return "취소검토 대기";
  return reservation.sellerCancelRequest?.refund?.status === "환불실패" ? "환불실패 · 재시도 필요" : "환불대기";
}

type RawLine = {
  code: string;
  reservation: ReservationDetail;
  profit: number;
  cancelled: boolean;
  cancelling: boolean;
  cancelledAt: string | null;
};

function rawLines(periodFrom: string, periodTo: string): RawLine[] {
  return listSellerChannelRecords()
    .filter((record) => {
      const date = record.reservation.reservedAt.slice(0, 10);
      return date >= periodFrom && date <= periodTo;
    })
    .map((record) => {
      const reservation = getReservationDetail(record.reservation.code) ?? (record.reservation as ReservationDetail);
      const status = reservation.reserveStatus;
      return {
        code: reservation.code,
        reservation,
        profit: Math.max(0, reservation.bookingTerms?.sellerProfit ?? 0),
        cancelled: status === "취소완료",
        cancelling: status === "취소요청" || status === "취소승인",
        cancelledAt: status === "취소완료" ? cancelledAtOf(reservation) : null,
      };
    })
    .sort((a, b) => b.reservation.reservedAt.localeCompare(a.reservation.reservedAt) || b.code.localeCompare(a.code));
}

function krw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function formatSellerSettlementAmount(value: number) {
  return krw(value);
}

/** 조정금액 — 부호를 항상 표시 (-20,000원) */
export function formatSellerSettlementSigned(value: number) {
  if (value < 0) return `-${krw(Math.abs(value))}`;
  if (value > 0) return `+${krw(value)}`;
  return "0원";
}

function maxAt(a: string, b: string) {
  return a > b ? a : b;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/* ───────────── 정산 계산 ───────────── */

type CurrentState = {
  raw: RawLine[];
  otherProfit: number;
  /** 지급완료 · 정산확정 v1에 이미 반영된 취소 (정산 생성 전 취소) */
  baseline: Set<string>;
  /** 이 정산에 반영된 취소 */
  reflected: Set<string>;
  /** 반영 대기 (정산확정 후 수정필요) */
  pending: RawLine[];
  /** 지급완료 후 발생 → 차기정산 */
  carriedOut: RawLine[];
};

function currentState(): CurrentState {
  const raw = rawLines("2026-10-01", "2026-10-15");
  const baseline = new Set(raw.filter((line) => BASE_CANCELLED.has(line.code)).map((line) => line.code));
  const baselineProfit = sum(raw.filter((line) => baseline.has(line.code)).map((line) => line.profit));
  const otherProfit = CURRENT_BASE_AMOUNT - (sum(raw.map((line) => line.profit)) - baselineProfit);
  const cancelled = raw.filter((line) => line.cancelled);
  const fresh = cancelled.filter((line) => !baseline.has(line.code));
  if (scenario === "정산대기") {
    return { raw, otherProfit, baseline, reflected: new Set(cancelled.map((line) => line.code)), pending: [], carriedOut: [] };
  }
  if (scenario === "지급완료") {
    return { raw, otherProfit, baseline, reflected: baseline, pending: [], carriedOut: fresh };
  }
  const applied = new Set(workflow.applied.map((item) => item.code));
  const reflected = new Set([...baseline, ...fresh.filter((line) => applied.has(line.code)).map((line) => line.code)]);
  return { raw, otherProfit, baseline, reflected, pending: fresh.filter((line) => !applied.has(line.code)), carriedOut: [] };
}

function toLine(line: RawLine, state: CurrentState): SellerSettlementLine {
  const reflected = state.reflected.has(line.code);
  const pending = state.pending.some((item) => item.code === line.code);
  const carried = state.carriedOut.some((item) => item.code === line.code);
  const adjustment = reflected ? -line.profit : 0;
  const refund = line.cancelled ? refundOf(line.reservation) : { amount: null, note: line.cancelling ? cancellingNote(line.reservation) : null };
  const reflection: SellerSettlementReflection = reflected
    ? "반영완료"
    : pending
      ? "반영대기"
      : carried
        ? "차기정산 반영예정"
        : line.cancelling
          ? "취소처리중"
          : "정상";
  return {
    reservationCode: line.code,
    reservedAt: line.reservation.reservedAt,
    productCode: line.reservation.bookingTerms?.productCode ?? "-",
    productName: line.reservation.productName,
    saleMode: line.reservation.bookingTerms?.saleMode ?? "입금가형",
    reserveStatus: line.reservation.reserveStatus,
    paymentStatus: line.reservation.paymentStatus,
    originalProfit: line.profit,
    adjustment,
    pendingAdjustment: pending ? -line.profit : 0,
    finalProfit: carried ? line.profit : line.profit + adjustment,
    reflection,
    cancelledAt: line.cancelledAt,
    refundAmount: refund.amount,
    refundNote: refund.note,
  };
}

function nextAdjustments(state: CurrentState, after: string): SellerNextAdjustment[] {
  return state.carriedOut.map((line) => ({
    id: `next-${line.code}`,
    reservationCode: line.code,
    productName: line.reservation.productName,
    type: "취소완료",
    amount: -line.profit,
    occurredAt: maxAt(line.cancelledAt ?? after, after),
    sourceSettlementCode: CURRENT_CODE,
    targetSettlementCode: NEXT_CODE,
    status: "차기정산 대기",
    reason: `${line.code} 예약 취소`,
  }));
}

/** 정산서 버전 — v1은 삭제하지 않고 재발행 버전을 이어서 보관 */
function currentDocuments(): SellerSettlementDocument[] {
  if (scenario === "정산대기") return [];
  return [
    { version: 1, issuedAt: "2026-10-12 16:05", amount: CURRENT_BASE_AMOUNT, issuedBy: SUPPLIER_ADMIN, current: workflow.reissues.length === 0 },
    ...workflow.reissues.map((item, index) => ({
      version: item.version,
      issuedAt: item.issuedAt,
      amount: item.amount,
      issuedBy: SUPPLIER_ADMIN,
      current: index === workflow.reissues.length - 1,
    })),
  ];
}

function currentStatus(state: CurrentState): SellerSettlementStatus {
  if (scenario !== "정산확정") return scenario;
  const latest = workflow.reissues.at(-1);
  const reflectedFresh = [...state.reflected].filter((code) => !state.baseline.has(code));
  if (state.pending.length > 0) return "수정필요";
  if (reflectedFresh.some((code) => !latest?.codes.includes(code))) return "수정필요";
  if (latest && workflow.reconfirmedVersion !== latest.version) return "재확인대기";
  return "정산확정";
}

/** 취소 발생 이력 — 아직 반영하지 않은 취소(수정필요)는 마지막 처리이력 뒤에 표시 */
function derivedEvents(state: CurrentState, seedLast: string): { before: SellerSettlementEvent[]; after: SellerSettlementEvent[] } {
  const before: SellerSettlementEvent[] = [];
  const after: SellerSettlementEvent[] = [];
  const workflowLast = workflow.events.at(-1)?.at ?? seedLast;
  const cancelled = state.raw
    .filter((line) => line.cancelled && (scenario === "정산대기" || !state.baseline.has(line.code)))
    .sort((a, b) => (a.cancelledAt ?? "").localeCompare(b.cancelledAt ?? ""));
  cancelled.forEach((line) => {
    const pending = state.pending.some((item) => item.code === line.code);
    const events = pending ? after : before;
    const at = maxAt(line.cancelledAt ?? seedLast, pending ? workflowLast : seedLast);
    const amount = formatSellerSettlementSigned(-line.profit);
    events.push({ at, label: "예약 취소완료 발생", actor: SYSTEM_ACTOR, tone: "gray", note: `${line.code} · 판매점 수익 ${krw(line.profit)}` });
    if (scenario === "정산대기") {
      events.push({ at, label: "취소조정 반영", actor: SYSTEM_ACTOR, tone: "warn", note: `${amount} · 정산대기 직접차감` });
    } else if (scenario === "정산확정") {
      events.push({ at, label: "정산 수정필요", actor: SYSTEM_ACTOR, tone: "warn", note: `${line.code} 취소조정 ${amount} 반영 필요` });
    } else {
      events.push({ at, label: "차기정산 조정등록", actor: SYSTEM_ACTOR, tone: "warn", note: `${amount} · ${NEXT_CODE}` });
      events.push({ at, label: "차기정산 반영대기", actor: SYSTEM_ACTOR, tone: "gray", note: "기존 지급내역 변경 없음" });
    }
  });
  return { before, after };
}

function sortEvents(events: SellerSettlementEvent[]) {
  return events
    .map((event, order) => ({ event, order }))
    .sort((a, b) => (a.event.at === b.event.at ? a.order - b.order : a.event.at.localeCompare(b.event.at)))
    .map(({ event }) => event);
}

function buildCurrent(state: CurrentState): SellerSettlement {
  const seed = PERIODS.find((period) => period.code === CURRENT_CODE)!;
  const lines = state.raw.map((line) => toLine(line, state));
  const principal = state.otherProfit + sum(lines.map((line) => line.originalProfit));
  const currentAdjustment = sum(lines.map((line) => line.adjustment));
  const pendingAdjustment = sum(lines.map((line) => line.pendingAdjustment));
  const finalAmount = principal + currentAdjustment;
  const seedEvents = SEED_EVENTS[scenario];
  const seedLast = seedEvents.at(-1)!.at;
  const status = currentStatus(state);
  const cancelEvents = derivedEvents(state, seedLast);
  const latestVersion = workflow.reissues.at(-1)?.version ?? 1;
  return {
    code: CURRENT_CODE,
    label: seed.label,
    periodFrom: seed.periodFrom,
    periodTo: seed.periodTo,
    dueDate: seed.dueDate,
    supplierName: SELLER_SETTLEMENT_SUPPLIER_NAME,
    sellerId: SELLER_CHANNEL_SELLER_ID,
    sellerName: SELLER_CHANNEL_SELLER_NAME,
    baseStatus: scenario,
    status,
    otherReservations: { count: seed.otherCount, profit: state.otherProfit },
    lines,
    principal,
    currentAdjustment,
    carriedAdjustment: 0,
    pendingAdjustment,
    finalAmount,
    paidAmount: scenario === "지급완료" ? CURRENT_BASE_AMOUNT : null,
    paidAt: scenario === "지급완료" ? "2026-10-12 16:25" : null,
    outgoingAdjustments: nextAdjustments(state, seedLast),
    incomingAdjustments: [],
    documents: currentDocuments(),
    sellerConfirmed: scenario !== "정산대기" && (workflow.reissues.length === 0 || workflow.sellerConfirmedVersion === latestVersion),
    handoverCompletedAt: scenario === "정산대기" ? null : "2026-10-12 15:30",
    events: sortEvents([...seedEvents, ...cancelEvents.before, ...workflow.events, ...cancelEvents.after]),
  };
}

function buildStatic(seed: PeriodSeed, incoming: SellerNextAdjustment[]): SellerSettlement {
  const profit = typeof seed.otherProfit === "number" ? seed.otherProfit : 0;
  const status = seed.status === "scenario" ? scenario : seed.status;
  const carriedAdjustment = sum(incoming.map((item) => item.amount));
  const paid = status === "지급완료";
  const events = paid
    ? PAID_PERIOD_EVENTS
    : [
        {
          at: `${seed.periodFrom} 00:10`,
          label: seed.periodFrom > SELLER_RESERVATION_BASE_DATE ? "정산생성 예정" : "정산생성",
          actor: SYSTEM_ACTOR,
          tone: "gray" as const,
          note: incoming.length ? "생성 시 이전 정산 조정 차감" : undefined,
        },
        ...incoming.map((item) => ({
          at: item.occurredAt,
          label: "차기정산 조정 반영예정",
          actor: SYSTEM_ACTOR,
          tone: "warn" as const,
          note: `${item.reservationCode} ${formatSellerSettlementSigned(item.amount)} · ${item.sourceSettlementCode}`,
        })),
      ];
  return {
    code: seed.code,
    label: seed.label,
    periodFrom: seed.periodFrom,
    periodTo: seed.periodTo,
    dueDate: seed.dueDate,
    supplierName: SELLER_SETTLEMENT_SUPPLIER_NAME,
    sellerId: SELLER_CHANNEL_SELLER_ID,
    sellerName: SELLER_CHANNEL_SELLER_NAME,
    baseStatus: status,
    status,
    otherReservations: { count: seed.otherCount, profit },
    lines: [],
    principal: profit,
    currentAdjustment: 0,
    carriedAdjustment,
    pendingAdjustment: 0,
    finalAmount: profit + carriedAdjustment,
    paidAmount: paid ? profit : null,
    paidAt: paid ? "2026-10-05 10:00" : null,
    outgoingAdjustments: [],
    incomingAdjustments: incoming,
    documents: paid ? [{ version: 1, issuedAt: "2026-10-02 11:05", amount: profit, issuedBy: SUPPLIER_ADMIN, current: true }] : [],
    sellerConfirmed: paid,
    handoverCompletedAt: paid ? "2026-10-01 18:00" : null,
    events: sortEvents(events),
  };
}

/** 판매점 수익 정산 목록 (최신 정산기간순) — 그래가자 외 판매점은 빈 목록 */
export function listSellerSettlements(sellerId: string = SELLER_CHANNEL_SELLER_ID): SellerSettlement[] {
  if (sellerId.trim() !== SELLER_CHANNEL_SELLER_ID) return [];
  const current = buildCurrent(currentState());
  return PERIODS.map((seed) => {
    if (seed.code === CURRENT_CODE) return current;
    return buildStatic(seed, seed.code === NEXT_CODE ? current.outgoingAdjustments : []);
  });
}

export function getSellerSettlement(code: string, sellerId?: string) {
  return listSellerSettlements(sellerId).find((item) => item.code === code) ?? null;
}

export type SellerSettlementReservationInfo = { settlement: SellerSettlement; line: SellerSettlementLine; nextAdjustment: SellerNextAdjustment | null };

/** 예약 상세 · 정산반영 Compact 정보 */
export function getSellerSettlementByReservation(reservationCode: string): SellerSettlementReservationInfo | null {
  for (const settlement of listSellerSettlements()) {
    const line = settlement.lines.find((item) => item.reservationCode === reservationCode);
    if (line) {
      const nextAdjustment = settlement.outgoingAdjustments.find((item) => item.reservationCode === reservationCode) ?? null;
      return { settlement, line, nextAdjustment };
    }
  }
  return null;
}

/** 정산 반영상태 표시 문구 */
export function sellerSettlementReflectionLabel(info: SellerSettlementReservationInfo) {
  const { line, settlement } = info;
  if (line.reflection === "반영완료") return "정산 반영완료";
  if (line.reflection === "반영대기") return "정산 수정필요 · 반영대기";
  if (line.reflection === "차기정산 반영예정") return "차기정산 반영예정";
  if (line.reflection === "취소처리중") return "취소처리중 · 정산 미반영";
  return settlement.status === "지급완료" ? "지급완료" : "정상 정산대상";
}

export function sellerSettlementStatusBadgeClass(status: SellerSettlementStatus) {
  if (status === "정산확정") return "info";
  if (status === "지급완료") return "success";
  if (status === "수정필요" || status === "재확인대기") return "warn";
  return "gray";
}

export function sellerSettlementReflectionBadgeClass(reflection: SellerSettlementReflection) {
  if (reflection === "반영완료") return "info";
  if (reflection === "정상") return "gray";
  return "warn";
}

/* ───────────── 정산 Action (공급여행사 관리자 · Mock) ───────────── */

/** 정산확정 가능 여부 — 운영인계 전 확정 불가 · 정산서 재확인 전 확정 불가 */
export function getSellerSettlementConfirmCheck(settlement: SellerSettlement): SellerSettlementCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (settlement.status === "지급완료") return { canConfirm: false, blockers: ["지급완료된 정산입니다."], warnings };
  if (settlement.status === "정산확정") return { canConfirm: false, blockers: ["이미 정산확정된 정산입니다."], warnings };
  if (!settlement.handoverCompletedAt) blockers.push("운영인계 완료 전에는 정산확정할 수 없습니다.");
  if (settlement.status === "수정필요") {
    blockers.push(
      settlement.pendingAdjustment !== 0 ? "취소조정을 먼저 반영해주세요." : "취소조정 반영 후 정산서를 재발행해주세요.",
    );
  }
  if (settlement.status === "재확인대기" && !settlement.sellerConfirmed) blockers.push("판매점 정산서 재확인 후 정산확정할 수 있습니다.");
  const cancelling = settlement.lines.filter((line) => line.reflection === "취소처리중").length;
  if (cancelling) warnings.push(`취소처리 중인 예약 ${cancelling}건은 취소완료 후 정산에 반영됩니다.`);
  return { canConfirm: blockers.length === 0, blockers, warnings };
}

function lastEventAt(settlement: SellerSettlement) {
  return settlement.events.at(-1)?.at ?? "2026-10-12 00:00";
}

function pushEvent(event: SellerSettlementEvent) {
  workflow = { ...workflow, events: [...workflow.events, event] };
}

/** 정산확정 후 취소완료 → 취소조정 반영 (금액 재계산 · 상태는 수정필요 유지) */
export function applySellerSettlementCancelAdjustments(code: string, now = new Date()) {
  const settlement = getSellerSettlement(code);
  if (!settlement || settlement.code !== CURRENT_CODE || settlement.status !== "수정필요" || settlement.pendingAdjustment === 0) return false;
  const at = sellerCancelProcessedAt(lastEventAt(settlement), now);
  const targets = settlement.lines.filter((line) => line.reflection === "반영대기");
  const before = settlement.finalAmount;
  const after = before + settlement.pendingAdjustment;
  workflow = { ...workflow, applied: [...workflow.applied, ...targets.map((line) => ({ code: line.reservationCode, at }))] };
  pushEvent({
    at,
    label: "취소조정 반영",
    actor: SUPPLIER_ADMIN,
    tone: "warn",
    note: `${targets.map((line) => line.reservationCode).join(", ")} ${formatSellerSettlementSigned(settlement.pendingAdjustment)} · ${krw(before)} → ${krw(after)}`,
  });
  emit();
  return true;
}

/** 정산서 재발행 (Mock) — 기존 버전은 보존하고 새 버전 생성 → 재확인대기 */
export function reissueSellerSettlementDocument(code: string, now = new Date()) {
  const settlement = getSellerSettlement(code);
  if (!settlement || settlement.code !== CURRENT_CODE || settlement.status !== "수정필요" || settlement.pendingAdjustment !== 0) return null;
  const at = sellerCancelProcessedAt(lastEventAt(settlement), now);
  const version = (workflow.reissues.at(-1)?.version ?? 1) + 1;
  const codes = workflow.applied.map((item) => item.code);
  workflow = { ...workflow, reissues: [...workflow.reissues, { version, issuedAt: at, amount: settlement.finalAmount, codes }] };
  pushEvent({ at, label: `정산서 v${version} 재발행`, actor: SUPPLIER_ADMIN, tone: "info", note: `${krw(settlement.finalAmount)} · Mock 발행 · 실제 파일 없음` });
  pushEvent({ at, label: "판매점 재확인대기", actor: SYSTEM_ACTOR, tone: "warn", note: `${SELLER_CHANNEL_SELLER_NAME} 확인 요청 (실제 발송 없음)` });
  emit();
  return version;
}

/** 판매점 정산 확인 (Mock) — 판매점이 재발행 정산서를 확인했다고 가정 */
export function confirmSellerSettlementBySeller(code: string, now = new Date()) {
  const settlement = getSellerSettlement(code);
  const latest = workflow.reissues.at(-1);
  if (!settlement || settlement.status !== "재확인대기" || !latest || workflow.sellerConfirmedVersion === latest.version) return false;
  const at = sellerCancelProcessedAt(lastEventAt(settlement), now);
  workflow = { ...workflow, sellerConfirmedVersion: latest.version };
  pushEvent({ at, label: "판매점 재확인", actor: SELLER_CHANNEL_SELLER_NAME, tone: "success", note: `정산서 v${latest.version} 확인 (Mock)` });
  emit();
  return true;
}

/** 재확인 후 정산확정 — 운영인계 · 재확인 조건을 같은 기준으로 다시 검사합니다. */
export function reconfirmSellerSettlement(code: string, now = new Date()) {
  const settlement = getSellerSettlement(code);
  const latest = workflow.reissues.at(-1);
  if (!settlement || !latest || !getSellerSettlementConfirmCheck(settlement).canConfirm) return false;
  const at = sellerCancelProcessedAt(lastEventAt(settlement), now);
  workflow = { ...workflow, reconfirmedVersion: latest.version };
  pushEvent({ at, label: "정산확정", actor: SUPPLIER_ADMIN, tone: "success", note: `정산서 v${latest.version} · ${krw(settlement.finalAmount)} · 지급대기` });
  emit();
  return true;
}

/** 판매점 정산 Summary (그래가자 정산관리) */
export function summarizeSellerSettlements(settlements: SellerSettlement[]) {
  const open = settlements.filter((item) => item.status !== "지급완료");
  return {
    scheduledAmount: sum(open.map((item) => item.finalAmount)),
    nextAdjustment: sum(settlements.flatMap((item) => item.outgoingAdjustments).map((item) => item.amount)),
    paidAmount: sum(settlements.map((item) => item.paidAmount ?? 0)),
    adjustmentCount: settlements.flatMap((item) => item.lines).filter((line) => line.adjustment !== 0 || line.pendingAdjustment !== 0).length,
  };
}
