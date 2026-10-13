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
import { getSellerPayoutAccount, type SellerPayoutAccount } from "@/lib/seller/seller-admin-profile";
import { SELLER_RESERVATION_BASE_DATE, listSellerReservations } from "@/lib/seller/seller-reservations-data";

export const SELLER_SETTLEMENT_SUPPLIER_NAME = "행복투어";
const SUPPLIER_ADMIN = `${SELLER_SETTLEMENT_SUPPLIER_NAME} 관리자`;
const SYSTEM_ACTOR = "시스템 Mock";

/** 정산 공급여행사 — 정산번호 STL-YYYYMM-{key}-NNN · 공급여행사 관리자 화면은 행복투어(HT)만 조회 */
const SETTLEMENT_SUPPLIERS = {
  HT: { name: SELLER_SETTLEMENT_SUPPLIER_NAME, code: "SUP00001", agencyId: "AGENCY-HAPPY" },
  HD: { name: "현담여행사", code: "SUP00002", agencyId: "AGENCY-HYUNDAM" },
} as const;
type SettlementSupplierKey = keyof typeof SETTLEMENT_SUPPLIERS;

export type SellerSettlementBaseStatus = "정산대기" | "정산확정" | "지급완료";
export type SellerSettlementStatus = SellerSettlementBaseStatus | "수정필요" | "재확인대기";
export type SellerSettlementPaymentStatus = "지급대기" | "지급완료";

export const SELLER_SETTLEMENT_STATUSES: SellerSettlementStatus[] = ["정산대기", "정산확정", "수정필요", "재확인대기", "지급완료"];

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
  travelDate: string;
  customerName: string;
  pax: number;
  /** 예약 당시 판매조건 Snapshot — 예약금액 · 1인 판매가 · 입금가(입금가형) · 수수료율(수수료형) */
  reservationAmount: number;
  unitPrice: number;
  depositPrice: number | null;
  commissionRate: number | null;
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

/** 정산서 Version 조정 Snapshot */
export type SellerSettlementDocumentAdjustment = { reservationCode: string; productName: string; originalProfit: number; amount: number };

/** 정산서 Version — 발행 시점 금액 Snapshot (재발행 후에도 이전 Version 보존) */
export type SellerSettlementDocument = {
  version: number;
  issuedAt: string;
  amount: number;
  issuedBy: string;
  current: boolean;
  principal: number;
  reservationCount: number;
  adjustments: SellerSettlementDocumentAdjustment[];
  note: string;
};

export type SellerSettlementEvent = { at: string; label: string; actor: string; note?: string; tone: "info" | "success" | "warn" | "gray" };

export type SellerSettlementCheck = { canConfirm: boolean; blockers: string[]; warnings: string[] };

export const SELLER_SETTLEMENT_PAYMENT_METHODS = ["계좌이체", "기타"] as const;
export type SellerSettlementPaymentMethod = (typeof SELLER_SETTLEMENT_PAYMENT_METHODS)[number];

/** 지급정보 — 지급 시점 고정 (이후 취소는 차기정산 조정 · 지급금액 · 지급기준 정산서 변경 없음) */
export type SellerSettlementPayment = {
  /** 지급일 (YYYY-MM-DD) */
  paymentDate: string;
  amount: number;
  method: SellerSettlementPaymentMethod;
  /** Mock 참조번호 (실제 은행 거래번호 아님) */
  reference: string | null;
  memo: string | null;
  paidBy: string;
  processedAt: string;
  /** 지급기준 정산서 Version */
  statementVersion: number;
};

export type SellerSettlement = {
  code: string;
  label: string;
  periodFrom: string;
  periodTo: string;
  dueDate: string;
  supplierName: string;
  supplierCode: string;
  supplierTravelAgencyId: string;
  sellerId: string;
  sellerName: string;
  baseStatus: SellerSettlementBaseStatus;
  status: SellerSettlementStatus;
  /** 정산기간 시작 전 (정산생성 예정) */
  scheduled: boolean;
  /** 정상 정산대상 예약건수 (취소조정 반영 예약 제외) */
  reservationCount: number;
  /** 이 정산에 반영된 취소 · 차기정산 조정 건수 */
  adjustmentCount: number;
  paymentStatus: SellerSettlementPaymentStatus;
  /** 상세 Mock 외 정상 예약 집계 (SAMPLE) */
  otherReservations: { count: number; profit: number };
  lines: SellerSettlementLine[];
  /** SAMPLE Seed 취소조정 예약 (조회 전용 · 공급여행사 정산 Action 대상 아님) */
  sampleLines: SellerSettlementLine[];
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
  payment: SellerSettlementPayment | null;
  /** 이 정산 이후 차기정산으로 넘긴 조정 */
  outgoingAdjustments: SellerNextAdjustment[];
  /** 이 정산에 반영예정인 이전 정산 조정 */
  incomingAdjustments: SellerNextAdjustment[];
  documents: SellerSettlementDocument[];
  sellerConfirmed: boolean;
  handoverCompletedAt: string | null;
  events: SellerSettlementEvent[];
};

/** SAMPLE 취소 예약 (실제 예약 데이터 없음 · 예약 상세 링크 없음) */
type SeedAdjustment = {
  reservationCode: string;
  productName: string;
  productCode: string;
  saleMode: "입금가형" | "수수료형";
  travelDate: string;
  pax: number;
  unitPrice: number;
  depositPrice: number | null;
  commissionRate: number | null;
  amount: number;
  cancelledAt: string;
  appliedAt: string;
  reissuedAt?: string;
};

type PeriodSeed = {
  code: string;
  label: string;
  periodFrom: string;
  periodTo: string;
  dueDate: string;
  supplier: SettlementSupplierKey;
  otherCount: number;
  otherProfit: number | "derived";
  status: SellerSettlementStatus | "scenario";
  /** 운영인계 · 정산확정 · 지급 일시 (정산대기 외 Seed) */
  handoverAt?: string;
  confirmedAt?: string;
  paidAt?: string;
  /** 정산확정 후 취소완료 → 반영된 취소조정 (수정필요 · 재확인대기 Seed) */
  adjustment?: SeedAdjustment;
  /** 지급완료 후 취소완료 → 차기정산 조정 (지급금액 변경 없음) */
  outgoing?: { reservationCode: string; productName: string; amount: number; occurredAt: string; targetCode: string };
};

const CURRENT_CODE = "STL-202610-HT-001";
const NEXT_CODE = "STL-202610-HT-002";
const CURRENT_OTHER_COUNT = 36;
/** 10월 1차 정산의 취소 발생 전 정산예정금액 (SAMPLE 기준값) */
const CURRENT_BASE_AMOUNT = 3_850_000;

/** 최신 정산기간순 · 행복투어 10월 1차만 예약 상태에서 파생 · 나머지는 SAMPLE Seed */
const PERIODS: PeriodSeed[] = [
  {
    code: NEXT_CODE,
    label: "2026년 10월 2차",
    periodFrom: "2026-10-16",
    periodTo: "2026-10-31",
    dueDate: "2026-11-05",
    supplier: "HT",
    otherCount: 33,
    otherProfit: 2_500_000,
    status: "정산대기",
  },
  {
    code: "STL-202610-HD-002",
    label: "2026년 10월 2차",
    periodFrom: "2026-10-16",
    periodTo: "2026-10-31",
    dueDate: "2026-11-05",
    supplier: "HD",
    otherCount: 12,
    otherProfit: 1_640_000,
    status: "정산대기",
  },
  {
    code: CURRENT_CODE,
    label: "2026년 10월 1차",
    periodFrom: "2026-10-01",
    periodTo: "2026-10-15",
    dueDate: "2026-10-20",
    supplier: "HT",
    otherCount: CURRENT_OTHER_COUNT,
    otherProfit: "derived",
    status: "scenario",
  },
  {
    code: "STL-202610-HD-001",
    label: "2026년 10월 1차",
    periodFrom: "2026-10-01",
    periodTo: "2026-10-15",
    dueDate: "2026-10-20",
    supplier: "HD",
    otherCount: 14,
    otherProfit: 3_130_000,
    status: "정산확정",
    handoverAt: "2026-10-12 11:00",
    confirmedAt: "2026-10-12 14:00",
  },
  {
    code: "STL-202609-HT-002",
    label: "2026년 9월 2차",
    periodFrom: "2026-09-16",
    periodTo: "2026-09-30",
    dueDate: "2026-10-05",
    supplier: "HT",
    otherCount: 16,
    otherProfit: 2_140_000,
    status: "지급완료",
    handoverAt: "2026-10-01 18:00",
    confirmedAt: "2026-10-02 11:00",
    paidAt: "2026-10-05 10:00",
    outgoing: {
      reservationCode: "RSV-20260924-007",
      productName: "[SAMPLE] 제주 2박3일 자유여행",
      amount: -20_000,
      occurredAt: "2026-10-08 14:20",
      targetCode: NEXT_CODE,
    },
  },
  {
    code: "STL-202609-HD-002",
    label: "2026년 9월 2차",
    periodFrom: "2026-09-16",
    periodTo: "2026-09-30",
    dueDate: "2026-10-05",
    supplier: "HD",
    otherCount: 11,
    otherProfit: 1_850_000,
    status: "재확인대기",
    handoverAt: "2026-10-01 17:00",
    confirmedAt: "2026-10-02 10:00",
    adjustment: {
      reservationCode: "RSV-20260921-003",
      productName: "[SAMPLE] 순천만 국가정원 당일여행",
      productCode: "HD-SAMPLE02",
      saleMode: "입금가형",
      travelDate: "2026-10-10",
      pax: 2,
      unitPrice: 59_000,
      depositPrice: 50_000,
      commissionRate: null,
      amount: -18_000,
      cancelledAt: "2026-10-04 16:10",
      appliedAt: "2026-10-06 10:30",
      reissuedAt: "2026-10-08 11:00",
    },
  },
  {
    code: "STL-202609-HT-001",
    label: "2026년 9월 1차",
    periodFrom: "2026-09-01",
    periodTo: "2026-09-15",
    dueDate: "2026-09-20",
    supplier: "HT",
    otherCount: 15,
    otherProfit: 2_200_000,
    status: "수정필요",
    handoverAt: "2026-09-16 18:00",
    confirmedAt: "2026-09-17 11:00",
    adjustment: {
      reservationCode: "RSV-20260908-002",
      productName: "[SAMPLE] 남이섬 · 쁘띠프랑스 당일투어",
      productCode: "HT-SAMPLE01",
      saleMode: "수수료형",
      travelDate: "2026-09-20",
      pax: 5,
      unitPrice: 70_000,
      depositPrice: null,
      commissionRate: 10,
      amount: -35_000,
      cancelledAt: "2026-09-19 15:40",
      appliedAt: "2026-09-21 10:00",
    },
  },
  {
    code: "STL-202609-HD-001",
    label: "2026년 9월 1차",
    periodFrom: "2026-09-01",
    periodTo: "2026-09-15",
    dueDate: "2026-09-20",
    supplier: "HD",
    otherCount: 10,
    otherProfit: 1_760_000,
    status: "지급완료",
    handoverAt: "2026-09-16 17:00",
    confirmedAt: "2026-09-17 10:00",
    paidAt: "2026-09-20 10:00",
  },
  {
    code: "STL-202608-HT-002",
    label: "2026년 8월 2차",
    periodFrom: "2026-08-16",
    periodTo: "2026-08-31",
    dueDate: "2026-09-05",
    supplier: "HT",
    otherCount: 21,
    otherProfit: 2_860_000,
    status: "지급완료",
    handoverAt: "2026-09-01 18:00",
    confirmedAt: "2026-09-02 11:00",
    paidAt: "2026-09-05 10:00",
  },
  {
    code: "STL-202608-HD-002",
    label: "2026년 8월 2차",
    periodFrom: "2026-08-16",
    periodTo: "2026-08-31",
    dueDate: "2026-09-05",
    supplier: "HD",
    otherCount: 12,
    otherProfit: 1_940_000,
    status: "지급완료",
    handoverAt: "2026-09-01 17:00",
    confirmedAt: "2026-09-02 10:00",
    paidAt: "2026-09-05 10:00",
  },
  {
    code: "STL-202608-HT-001",
    label: "2026년 8월 1차",
    periodFrom: "2026-08-01",
    periodTo: "2026-08-15",
    dueDate: "2026-08-20",
    supplier: "HT",
    otherCount: 18,
    otherProfit: 2_430_000,
    status: "지급완료",
    handoverAt: "2026-08-16 18:00",
    confirmedAt: "2026-08-17 11:00",
    paidAt: "2026-08-20 10:00",
  },
  {
    code: "STL-202608-HD-001",
    label: "2026년 8월 1차",
    periodFrom: "2026-08-01",
    periodTo: "2026-08-15",
    dueDate: "2026-08-20",
    supplier: "HD",
    otherCount: 9,
    otherProfit: 1_620_000,
    status: "지급완료",
    handoverAt: "2026-08-16 17:00",
    confirmedAt: "2026-08-17 10:00",
    paidAt: "2026-08-20 10:00",
  },
  {
    code: "STL-202607-HT-002",
    label: "2026년 7월 2차",
    periodFrom: "2026-07-16",
    periodTo: "2026-07-31",
    dueDate: "2026-08-05",
    supplier: "HT",
    otherCount: 14,
    otherProfit: 2_050_000,
    status: "지급완료",
    handoverAt: "2026-08-01 18:00",
    confirmedAt: "2026-08-02 11:00",
    paidAt: "2026-08-05 10:00",
  },
  {
    code: "STL-202607-HD-002",
    label: "2026년 7월 2차",
    periodFrom: "2026-07-16",
    periodTo: "2026-07-31",
    dueDate: "2026-08-05",
    supplier: "HD",
    otherCount: 8,
    otherProfit: 1_480_000,
    status: "지급완료",
    handoverAt: "2026-08-01 17:00",
    confirmedAt: "2026-08-02 10:00",
    paidAt: "2026-08-05 10:00",
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
/** SAMPLE Seed 재확인대기 정산의 판매점 확인 일시 (정산번호 → 확인일시) */
let staticSellerConfirms: Readonly<Record<string, string>> = {};
/** 공급여행사 지급처리 (정산번호 → 지급정보) · 10월 1차는 지급 시점에 반영된 취소 예약 고정 */
type StoredPayment = SellerSettlementPayment & { reflectedCodes: string[] };
let payments: Readonly<Record<string, StoredPayment>> = {};
/** QA — 판매점 지급계좌 미등록 Mock */
let payoutAccountUnregistered = false;
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
  const rest = { ...payments };
  delete rest[CURRENT_CODE];
  payments = rest;
  emit();
}

export function isSellerPayoutAccountUnregisteredMock() {
  return payoutAccountUnregistered;
}

export function setSellerPayoutAccountUnregisteredMock(next: boolean) {
  if (next === payoutAccountUnregistered) return;
  payoutAccountUnregistered = next;
  emit();
}

/** 판매점 지급계좌 — QA 미등록 Mock 시 null */
export function getSellerSettlementPayoutAccount(sellerId: string): SellerPayoutAccount | null {
  return payoutAccountUnregistered ? null : getSellerPayoutAccount(sellerId);
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
  const payment = payments[CURRENT_CODE];
  if (payment) {
    const paidReflected = new Set(payment.reflectedCodes);
    return { raw, otherProfit, baseline, reflected: paidReflected, pending: [], carriedOut: fresh.filter((line) => !paidReflected.has(line.code)) };
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
  const terms = line.reservation.bookingTerms;
  return {
    reservationCode: line.code,
    reservedAt: line.reservation.reservedAt,
    productCode: terms?.productCode ?? "-",
    productName: line.reservation.productName,
    saleMode: terms?.saleMode ?? "입금가형",
    reserveStatus: line.reservation.reserveStatus,
    paymentStatus: line.reservation.paymentStatus,
    travelDate: line.reservation.departureAt.slice(0, 10),
    customerName: line.reservation.bookerName,
    pax: terms?.pax ?? 0,
    reservationAmount: terms?.amount ?? 0,
    unitPrice: terms?.unitPrice ?? 0,
    depositPrice: terms?.depositPrice ?? null,
    commissionRate: terms?.commissionRate ?? null,
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
function currentDocuments(state: CurrentState): SellerSettlementDocument[] {
  if (scenario === "정산대기") return [];
  const principal = state.otherProfit + sum(state.raw.map((line) => line.profit));
  const adjustmentsOf = (codes: string[]): SellerSettlementDocumentAdjustment[] =>
    state.raw
      .filter((line) => codes.includes(line.code))
      .map((line) => ({ reservationCode: line.code, productName: line.reservation.productName, originalProfit: line.profit, amount: -line.profit }));
  const count = (adjustments: SellerSettlementDocumentAdjustment[]) => CURRENT_OTHER_COUNT + state.raw.length - adjustments.length;
  const baseline = adjustmentsOf([...state.baseline]);
  return [
    {
      version: 1,
      issuedAt: "2026-10-12 16:05",
      amount: CURRENT_BASE_AMOUNT,
      issuedBy: SUPPLIER_ADMIN,
      current: workflow.reissues.length === 0,
      principal,
      reservationCount: count(baseline),
      adjustments: baseline,
      note: "최초 확정",
    },
    ...workflow.reissues.map((item, index) => {
      const adjustments = adjustmentsOf([...state.baseline, ...item.codes]);
      return {
        version: item.version,
        issuedAt: item.issuedAt,
        amount: item.amount,
        issuedBy: SUPPLIER_ADMIN,
        current: index === workflow.reissues.length - 1,
        principal,
        reservationCount: count(adjustments),
        adjustments,
        note: "취소조정 반영",
      };
    }),
  ];
}

function currentStatus(state: CurrentState): SellerSettlementStatus {
  if (scenario !== "정산확정") return scenario;
  if (payments[CURRENT_CODE]) return "지급완료";
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
  const paidAt = payments[CURRENT_CODE]?.processedAt ?? seedLast;
  const cancelled = state.raw
    .filter((line) => line.cancelled && (scenario === "정산대기" || !state.baseline.has(line.code)))
    .sort((a, b) => (a.cancelledAt ?? "").localeCompare(b.cancelledAt ?? ""));
  cancelled.forEach((line) => {
    const pending = state.pending.some((item) => item.code === line.code);
    const carried = state.carriedOut.some((item) => item.code === line.code);
    const events = pending || carried ? after : before;
    const at = maxAt(line.cancelledAt ?? seedLast, pending ? workflowLast : carried ? paidAt : seedLast);
    const amount = formatSellerSettlementSigned(-line.profit);
    events.push({ at, label: "예약 취소완료 발생", actor: SYSTEM_ACTOR, tone: "gray", note: `${line.code} · 판매점 수익 ${krw(line.profit)}` });
    if (scenario === "정산대기") {
      events.push({ at, label: "취소조정 반영", actor: SYSTEM_ACTOR, tone: "warn", note: `${amount} · 정산대기 직접차감` });
    } else if (scenario === "정산확정" && !carried) {
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

function toPayment(stored: StoredPayment): SellerSettlementPayment {
  const { reflectedCodes, ...payment } = stored;
  void reflectedCodes;
  return payment;
}

/** SAMPLE Seed 지급완료 정산의 지급정보 (공급여행사 지급처리 Mock 이전 데이터) */
function seedPayment(paidAt: string, amount: number, paidBy: string, statementVersion: number): SellerSettlementPayment {
  return { paymentDate: paidAt.slice(0, 10), amount, method: "계좌이체", reference: null, memo: null, paidBy, processedAt: paidAt, statementVersion };
}

function paymentEvents(payment: SellerSettlementPayment): SellerSettlementEvent[] {
  return [
    {
      at: payment.processedAt,
      label: "지급처리",
      actor: payment.paidBy,
      tone: "info",
      note: `${payment.method} · ${krw(payment.amount)} · 지급일 ${payment.paymentDate.replace(/-/g, ".")}${payment.reference ? ` · ${payment.reference}` : ""}`,
    },
    { at: payment.processedAt, label: "지급완료", actor: SYSTEM_ACTOR, tone: "success", note: `지급기준 정산서 v${payment.statementVersion} · Mock 지급 · 실제 이체 없음` },
  ];
}

function buildCurrent(state: CurrentState): SellerSettlement {
  const seed = PERIODS.find((period) => period.code === CURRENT_CODE)!;
  const stored = scenario === "정산확정" ? (payments[CURRENT_CODE] ?? null) : null;
  const documents = currentDocuments(state);
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
  const supplier = SETTLEMENT_SUPPLIERS[seed.supplier];
  const countedLines = lines.filter((line) => line.reflection !== "반영완료" && line.reflection !== "반영대기");
  return {
    code: CURRENT_CODE,
    label: seed.label,
    periodFrom: seed.periodFrom,
    periodTo: seed.periodTo,
    dueDate: seed.dueDate,
    supplierName: supplier.name,
    supplierCode: supplier.code,
    supplierTravelAgencyId: supplier.agencyId,
    sellerId: SELLER_CHANNEL_SELLER_ID,
    sellerName: SELLER_CHANNEL_SELLER_NAME,
    baseStatus: stored ? "지급완료" : scenario,
    status,
    scheduled: false,
    reservationCount: seed.otherCount + countedLines.length,
    adjustmentCount: lines.filter((line) => line.adjustment !== 0).length,
    paymentStatus: scenario === "지급완료" || stored ? "지급완료" : "지급대기",
    otherReservations: { count: seed.otherCount, profit: state.otherProfit },
    lines,
    sampleLines: [],
    principal,
    currentAdjustment,
    carriedAdjustment: 0,
    pendingAdjustment,
    finalAmount,
    paidAmount: stored ? stored.amount : scenario === "지급완료" ? CURRENT_BASE_AMOUNT : null,
    paidAt: stored ? stored.paymentDate : scenario === "지급완료" ? "2026-10-12 16:25" : null,
    payment: stored ? toPayment(stored) : scenario === "지급완료" ? seedPayment("2026-10-12 16:25", CURRENT_BASE_AMOUNT, SUPPLIER_ADMIN, 1) : null,
    outgoingAdjustments: nextAdjustments(state, stored?.processedAt ?? seedLast),
    incomingAdjustments: [],
    documents,
    sellerConfirmed: scenario !== "정산대기" && (workflow.reissues.length === 0 || workflow.sellerConfirmedVersion === latestVersion),
    handoverCompletedAt: scenario === "정산대기" ? null : "2026-10-12 15:30",
    events: sortEvents([
      ...seedEvents,
      ...cancelEvents.before,
      ...workflow.events,
      ...(stored ? paymentEvents(stored) : []),
      ...cancelEvents.after,
    ]),
  };
}

function seedAdjustmentLine(adj: SeedAdjustment): SellerSettlementLine {
  const profit = -adj.amount;
  return {
    reservationCode: adj.reservationCode,
    reservedAt: `${adj.travelDate} 00:00`,
    productCode: adj.productCode,
    productName: adj.productName,
    saleMode: adj.saleMode,
    reserveStatus: "취소완료",
    paymentStatus: "환불완료",
    travelDate: adj.travelDate,
    customerName: "SAMPLE 고객",
    pax: adj.pax,
    reservationAmount: adj.unitPrice * adj.pax,
    unitPrice: adj.unitPrice,
    depositPrice: adj.depositPrice,
    commissionRate: adj.commissionRate,
    originalProfit: profit,
    adjustment: adj.amount,
    pendingAdjustment: 0,
    finalProfit: 0,
    reflection: "반영완료",
    cancelledAt: adj.cancelledAt,
    refundAmount: null,
    refundNote: null,
  };
}

function seedOutgoing(seed: PeriodSeed): SellerNextAdjustment[] {
  if (!seed.outgoing) return [];
  const item = seed.outgoing;
  return [
    {
      id: `next-${item.reservationCode}`,
      reservationCode: item.reservationCode,
      productName: item.productName,
      type: "취소완료",
      amount: item.amount,
      occurredAt: item.occurredAt,
      sourceSettlementCode: seed.code,
      targetSettlementCode: item.targetCode,
      status: "차기정산 대기",
      reason: `${item.reservationCode} 예약 취소 (지급완료 후)`,
    },
  ];
}

function buildStatic(seed: PeriodSeed, incoming: SellerNextAdjustment[]): SellerSettlement {
  const supplier = SETTLEMENT_SUPPLIERS[seed.supplier];
  const admin = `${supplier.name} 관리자`;
  const profit = typeof seed.otherProfit === "number" ? seed.otherProfit : 0;
  const sellerConfirmedAt = seed.status === "재확인대기" ? (staticSellerConfirms[seed.code] ?? null) : null;
  const seedStatus: SellerSettlementStatus = seed.status === "scenario" ? scenario : seed.status;
  const stored = payments[seed.code] ?? null;
  const status: SellerSettlementStatus = stored ? "지급완료" : sellerConfirmedAt ? "정산확정" : seedStatus;
  const baseStatus: SellerSettlementBaseStatus = status === "수정필요" || status === "재확인대기" ? "정산확정" : status;
  const carriedAdjustment = sum(incoming.map((item) => item.amount));
  const currentAdjustment = seed.adjustment?.amount ?? 0;
  const finalAmount = Math.max(0, profit + currentAdjustment + carriedAdjustment);
  const paid = status === "지급완료";
  const scheduled = seed.periodFrom > SELLER_RESERVATION_BASE_DATE;
  const outgoing = seedOutgoing(seed);
  const reissued = Boolean(seed.adjustment?.reissuedAt);

  const events: SellerSettlementEvent[] = [
    {
      at: `${seed.periodFrom} 00:10`,
      label: scheduled ? "정산생성 예정" : "정산생성",
      actor: SYSTEM_ACTOR,
      tone: "gray",
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
  if (baseStatus !== "정산대기" && seed.handoverAt && seed.confirmedAt) {
    events.push(
      { at: seed.handoverAt, label: "운영인계 완료", actor: admin, tone: "info" },
      { at: seed.confirmedAt, label: "정산확정", actor: admin, tone: "success", note: "정산서 v1 기준" },
      { at: seed.confirmedAt, label: "정산서 v1 발행", actor: admin, tone: "info", note: "Mock 발행 · 실제 파일 없음" },
    );
  }
  if (seed.adjustment) {
    const adj = seed.adjustment;
    const amount = formatSellerSettlementSigned(adj.amount);
    events.push(
      { at: adj.cancelledAt, label: "예약 취소완료 발생", actor: SYSTEM_ACTOR, tone: "gray", note: `${adj.reservationCode} · 판매점 수익 ${krw(-adj.amount)}` },
      { at: adj.cancelledAt, label: "정산 수정필요", actor: SYSTEM_ACTOR, tone: "warn", note: `${adj.reservationCode} 취소조정 ${amount} 반영 필요` },
      { at: adj.appliedAt, label: "취소조정 반영", actor: admin, tone: "warn", note: `${amount} · ${krw(profit)} → ${krw(finalAmount)}` },
    );
    if (adj.reissuedAt) {
      events.push(
        { at: adj.reissuedAt, label: "정산서 v2 재발행", actor: admin, tone: "info", note: `${krw(finalAmount)} · Mock 발행 · 실제 파일 없음` },
        { at: adj.reissuedAt, label: "판매점 재확인대기", actor: SYSTEM_ACTOR, tone: "warn", note: `${SELLER_CHANNEL_SELLER_NAME} 확인 요청 (실제 발송 없음)` },
      );
    }
  }
  if (paid && !stored && seed.paidAt) {
    events.push({ at: seed.paidAt, label: "지급완료", actor: admin, tone: "success", note: "Mock 지급 · 실제 이체 없음" });
  }
  outgoing.forEach((item) => {
    events.push(
      { at: item.occurredAt, label: "예약 취소완료 발생", actor: SYSTEM_ACTOR, tone: "gray", note: `${item.reservationCode} · 판매점 수익 ${krw(-item.amount)}` },
      { at: item.occurredAt, label: "차기정산 조정등록", actor: SYSTEM_ACTOR, tone: "warn", note: `${formatSellerSettlementSigned(item.amount)} · ${item.targetSettlementCode}` },
    );
  });

  if (sellerConfirmedAt) {
    events.push(
      { at: sellerConfirmedAt, label: `${SELLER_CHANNEL_SELLER_NAME} 정산확인`, actor: SELLER_CHANNEL_SELLER_NAME, tone: "success", note: "정산서 v2 확인" },
      { at: sellerConfirmedAt, label: "정산확정", actor: SYSTEM_ACTOR, tone: "success", note: `정산서 v2 · ${krw(finalAmount)} · 지급대기` },
    );
  }

  const sampleLine = seed.adjustment ? seedAdjustmentLine(seed.adjustment) : null;
  const sampleAdjustments: SellerSettlementDocumentAdjustment[] = sampleLine
    ? [{ reservationCode: sampleLine.reservationCode, productName: sampleLine.productName, originalProfit: sampleLine.originalProfit, amount: sampleLine.adjustment }]
    : [];
  if (stored) events.push(...paymentEvents(stored));
  const documents: SellerSettlementDocument[] =
    baseStatus === "정산대기" || !seed.confirmedAt
      ? []
      : [
          {
            version: 1,
            issuedAt: seed.confirmedAt,
            amount: profit,
            issuedBy: admin,
            current: !reissued,
            principal: profit,
            reservationCount: seed.otherCount + (sampleLine ? 1 : 0),
            adjustments: [],
            note: "최초 확정",
          },
          ...(reissued
            ? [
                {
                  version: 2,
                  issuedAt: seed.adjustment!.reissuedAt!,
                  amount: finalAmount,
                  issuedBy: admin,
                  current: true,
                  principal: profit,
                  reservationCount: seed.otherCount,
                  adjustments: sampleAdjustments,
                  note: "취소조정 반영",
                },
              ]
            : []),
        ];

  return {
    code: seed.code,
    label: seed.label,
    periodFrom: seed.periodFrom,
    periodTo: seed.periodTo,
    dueDate: seed.dueDate,
    supplierName: supplier.name,
    supplierCode: supplier.code,
    supplierTravelAgencyId: supplier.agencyId,
    sellerId: SELLER_CHANNEL_SELLER_ID,
    sellerName: SELLER_CHANNEL_SELLER_NAME,
    baseStatus,
    status,
    scheduled,
    reservationCount: seed.otherCount,
    adjustmentCount: (seed.adjustment ? 1 : 0) + incoming.length,
    paymentStatus: paid ? "지급완료" : "지급대기",
    otherReservations: { count: seed.otherCount, profit: profit - (sampleLine?.originalProfit ?? 0) },
    lines: [],
    sampleLines: sampleLine ? [sampleLine] : [],
    principal: profit,
    currentAdjustment,
    carriedAdjustment,
    pendingAdjustment: 0,
    finalAmount,
    paidAmount: stored ? stored.amount : paid ? finalAmount : null,
    paidAt: stored ? stored.paymentDate : paid ? (seed.paidAt ?? null) : null,
    payment: stored
      ? toPayment(stored)
      : paid && seed.paidAt
        ? seedPayment(seed.paidAt, finalAmount, admin, documents.find((doc) => doc.current)?.version ?? 1)
        : null,
    outgoingAdjustments: outgoing,
    incomingAdjustments: incoming,
    documents,
    sellerConfirmed: status === "정산확정" || paid || Boolean(sellerConfirmedAt),
    handoverCompletedAt: baseStatus === "정산대기" ? null : (seed.handoverAt ?? null),
    events: sortEvents(events),
  };
}

function buildAllSettlements(): SellerSettlement[] {
  const current = buildCurrent(currentState());
  const staticOutgoing = PERIODS.flatMap(seedOutgoing);
  return PERIODS.map((seed) => {
    if (seed.code === CURRENT_CODE) return current;
    const incoming = [...(seed.code === NEXT_CODE ? current.outgoingAdjustments : []), ...staticOutgoing.filter((item) => item.targetSettlementCode === seed.code)];
    return buildStatic(seed, incoming);
  });
}

/** 공급여행사(행복투어) 관리자 · 예약 상세용 판매점 수익 정산 목록 (최신 정산기간순) — 그래가자 외 판매점은 빈 목록 */
export function listSellerSettlements(sellerId: string = SELLER_CHANNEL_SELLER_ID): SellerSettlement[] {
  if (sellerId.trim() !== SELLER_CHANNEL_SELLER_ID) return [];
  return buildAllSettlements().filter((item) => item.supplierName === SELLER_SETTLEMENT_SUPPLIER_NAME);
}

/** 판매점 수익 정산을 관리하는 공급여행사 여부 (공급여행사 관리자 정산관리 탭 노출 기준) */
export function isSellerSettlementSupplier(agencyName: string) {
  return Object.values(SETTLEMENT_SUPPLIERS).some((supplier) => supplier.name === agencyName);
}

/** 공급여행사 관리자 정산관리 — 해당 공급여행사 정산만 (최신 정산기간순) */
export function listSellerSettlementsBySupplier(supplierName: string, sellerId: string = SELLER_CHANNEL_SELLER_ID): SellerSettlement[] {
  if (sellerId.trim() !== SELLER_CHANNEL_SELLER_ID) return [];
  return buildAllSettlements().filter((item) => item.supplierName === supplierName);
}

/** 판매점 관리자 정산관리 — 공급여행사 전체 정산 목록 (최신 정산기간순) */
export function listSellerSettlementsAllSuppliers(sellerId: string = SELLER_CHANNEL_SELLER_ID): SellerSettlement[] {
  if (sellerId.trim() !== SELLER_CHANNEL_SELLER_ID) return [];
  return buildAllSettlements().sort((a, b) => b.periodFrom.localeCompare(a.periodFrom) || a.supplierCode.localeCompare(b.supplierCode));
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

/* ───────────── 판매점 관리자 정산관리 목록 (STEP 9-1) ───────────── */

/** 최종 정산금액 — 지급완료는 지급 당시 금액 고정 (이후 취소는 차기정산 조정) */
export function getSettlementFinalAmount(settlement: SellerSettlement) {
  return settlement.paidAmount ?? settlement.finalAmount;
}

/** 표시 정산상태 — 정산확정 후 취소완료 시 수정필요 · 재발행 후 재확인대기 (예약 상태에서 파생) */
export function getSettlementEffectiveStatus(settlement: SellerSettlement): SellerSettlementStatus {
  return settlement.status;
}

/** 이 정산의 조정금액 = 반영된 취소조정 + 이전 정산에서 넘어온 차기정산 조정 */
export function getSettlementAdjustmentAmount(settlement: SellerSettlement) {
  return settlement.currentAdjustment + settlement.carriedAdjustment;
}

/** 지급완료 후 차기정산으로 넘긴 조정 합계 (지급금액 불변) */
export function getSettlementNextAdjustmentAmount(settlement: SellerSettlement) {
  return sum(settlement.outgoingAdjustments.map((item) => item.amount));
}

export function sellerSettlementPaymentBadgeClass(status: SellerSettlementPaymentStatus) {
  return status === "지급완료" ? "success" : "gray";
}

/**
 * 판매점 정산관리 Summary — 목록 데이터에서 파생
 * - 정산예정: 정산대기 · 수정필요 · 재확인대기 최종금액 (정산기간 시작 전 생성예정 정산 제외)
 * - 정산확정: 정산확정 · 지급대기 · 지급완료: 기준월 지급분 · 차기정산 조정: 지급완료 후 취소조정 합계
 */
export function summarizeSellerSettlementList(settlements: SellerSettlement[], baseDate: string = SELLER_RESERVATION_BASE_DATE) {
  const month = baseDate.slice(0, 7);
  const scheduled = settlements.filter(
    (item) => !item.scheduled && (item.status === "정산대기" || item.status === "수정필요" || item.status === "재확인대기"),
  );
  const confirmed = settlements.filter((item) => item.status === "정산확정");
  const paid = settlements.filter((item) => item.status === "지급완료" && (item.paidAt ?? "").startsWith(month));
  const next = settlements.filter((item) => item.outgoingAdjustments.length > 0);
  return {
    scheduledAmount: sum(scheduled.map(getSettlementFinalAmount)),
    scheduledCount: scheduled.length,
    confirmedAmount: sum(confirmed.map(getSettlementFinalAmount)),
    confirmedCount: confirmed.length,
    paidAmount: sum(paid.map(getSettlementFinalAmount)),
    paidCount: paid.length,
    nextAdjustment: sum(next.map(getSettlementNextAdjustmentAmount)),
    nextCount: next.flatMap((item) => item.outgoingAdjustments).length,
    statusCounts: SELLER_SETTLEMENT_STATUSES.map((status) => ({ status, count: settlements.filter((item) => item.status === status).length })),
  };
}

export type SellerSettlementPeriodKey = "thisMonth" | "lastMonth" | "last3Months" | "custom";

export const SELLER_SETTLEMENT_PERIODS: { key: SellerSettlementPeriodKey; label: string }[] = [
  { key: "thisMonth", label: "이번 달" },
  { key: "lastMonth", label: "지난 달" },
  { key: "last3Months", label: "최근 3개월" },
  { key: "custom", label: "기간선택" },
];

export type SellerSettlementListFilters = {
  period: SellerSettlementPeriodKey;
  from: string;
  to: string;
  supplierId: string;
  status: SellerSettlementStatus | "전체";
  keyword: string;
};

function monthStart(baseDate: string, offset: number) {
  const [year, month] = baseDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return date.toISOString().slice(0, 10);
}

function monthEnd(baseDate: string, offset: number) {
  const [year, month] = baseDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month + offset, 0));
  return date.toISOString().slice(0, 10);
}

export function sellerSettlementPeriodRange(filters: Pick<SellerSettlementListFilters, "period" | "from" | "to">, baseDate: string) {
  if (filters.period === "lastMonth") return { from: monthStart(baseDate, -1), to: monthEnd(baseDate, -1) };
  if (filters.period === "last3Months") return { from: monthStart(baseDate, -2), to: monthEnd(baseDate, 0) };
  if (filters.period === "custom") return { from: filters.from, to: filters.to };
  return { from: monthStart(baseDate, 0), to: monthEnd(baseDate, 0) };
}

export function defaultSellerSettlementListFilters(baseDate: string = SELLER_RESERVATION_BASE_DATE): SellerSettlementListFilters {
  const range = sellerSettlementPeriodRange({ period: "thisMonth", from: "", to: "" }, baseDate);
  return { period: "thisMonth", from: range.from, to: range.to, supplierId: "전체", status: "전체", keyword: "" };
}

/** 기간 = 정산기간이 조회기간과 겹치는 정산 · 검색 = 정산번호 · 공급여행사 · 정산기간 */
export function filterSellerSettlementList(
  settlements: SellerSettlement[],
  filters: SellerSettlementListFilters,
  baseDate: string = SELLER_RESERVATION_BASE_DATE,
) {
  const range = sellerSettlementPeriodRange(filters, baseDate);
  const keyword = filters.keyword.trim().toLowerCase().replace(/\s+/g, "");
  return settlements.filter((item) => {
    if (range.from && item.periodTo < range.from) return false;
    if (range.to && item.periodFrom > range.to) return false;
    if (filters.supplierId !== "전체" && item.supplierTravelAgencyId !== filters.supplierId) return false;
    if (filters.status !== "전체" && item.status !== filters.status) return false;
    if (!keyword) return true;
    const haystack = [
      item.code,
      item.supplierName,
      item.supplierCode,
      item.label,
      `${item.periodFrom}~${item.periodTo}`,
      `${item.periodFrom.replace(/-/g, ".")}~${item.periodTo.replace(/-/g, ".")}`,
    ]
      .join("|")
      .toLowerCase()
      .replace(/\s+/g, "");
    return haystack.includes(keyword);
  });
}

/* ───────────── 판매점 관리자 정산 상세 · 정산서 확인 (STEP 9-2) ───────────── */

export function sellerSettlementDetailPath(code: string) {
  return `/seller/settlements/${encodeURIComponent(code)}`;
}

export function getSellerSettlementForSeller(code: string, sellerId: string = SELLER_CHANNEL_SELLER_ID) {
  return listSellerSettlementsAllSuppliers(sellerId).find((item) => item.code === code.trim()) ?? null;
}

/** 현재 유효 정산서 (정산확정 전 미발행이면 null) */
export function getSettlementCurrentVersion(settlement: SellerSettlement) {
  return settlement.documents.find((doc) => doc.current) ?? null;
}

/** 이 정산 최종금액에 반영된 조정 합계 (반영대기 · 차기정산 조정 제외) */
export function getSettlementAdjustmentTotal(settlement: SellerSettlement) {
  return getSettlementAdjustmentAmount(settlement);
}

export function sellerSettlementLineStatusLabel(line: SellerSettlementLine) {
  if (line.reflection === "반영완료") return "취소조정";
  if (line.reflection === "반영대기") return "취소조정 반영대기";
  if (line.reflection === "차기정산 반영예정") return "차기정산 반영예정";
  if (line.reflection === "취소처리중") return "취소처리중 · 미반영";
  return "정상";
}

export type SellerSettlementDetailRow =
  | { key: string; kind: "reservation" | "sample"; line: SellerSettlementLine; profit: number; adjustment: number; finalAmount: number; statusLabel: string }
  | { key: string; kind: "aggregate"; count: number; profit: number; adjustment: number; finalAmount: number; statusLabel: string };

/** 정산 대상 예약 — 예약별 최종 정산금액 합계 + 이전 정산 조정 = 최종 정산금액 (반영대기 · 차기정산 조정은 금액 미반영) */
export function getSellerSettlementDetailRows(settlement: SellerSettlement) {
  const toRow = (kind: "reservation" | "sample") => (line: SellerSettlementLine): SellerSettlementDetailRow => ({
    key: line.reservationCode,
    kind,
    line,
    profit: line.originalProfit,
    adjustment: line.adjustment,
    finalAmount: line.finalProfit,
    statusLabel: sellerSettlementLineStatusLabel(line),
  });
  const rows: SellerSettlementDetailRow[] = [...settlement.lines.map(toRow("reservation")), ...settlement.sampleLines.map(toRow("sample"))];
  if (settlement.otherReservations.count > 0) {
    rows.push({
      key: "aggregate",
      kind: "aggregate",
      count: settlement.otherReservations.count,
      profit: settlement.otherReservations.profit,
      adjustment: 0,
      finalAmount: settlement.otherReservations.profit,
      statusLabel: "정상",
    });
  }
  const rowTotal = sum(rows.map((row) => row.finalAmount));
  return { rows, rowTotal, carriedAdjustment: settlement.carriedAdjustment, total: rowTotal + settlement.carriedAdjustment };
}

export type SellerSettlementAdjustmentRow = {
  key: string;
  occurredAt: string;
  reservationCode: string;
  type: "예약 취소완료";
  originalAmount: number;
  adjustment: number;
  finalAmount: number;
  status: "반영완료" | "반영대기" | "이전 정산 조정 반영";
  sourceCode: string | null;
  /** 실제 예약 데이터 존재 (예약 상세 링크 가능) */
  linkable: boolean;
};

/** 정산 조정내역 — 반영완료 합계 = 상세 조정금액 (반영대기는 정산서 수정 전이라 금액 미반영) */
export function getSellerSettlementAdjustmentRows(settlement: SellerSettlement): SellerSettlementAdjustmentRow[] {
  const fromLine = (linkable: boolean) => (line: SellerSettlementLine): SellerSettlementAdjustmentRow => ({
    key: line.reservationCode,
    occurredAt: line.cancelledAt ?? line.reservedAt,
    reservationCode: line.reservationCode,
    type: "예약 취소완료",
    originalAmount: line.originalProfit,
    adjustment: -line.originalProfit,
    finalAmount: 0,
    status: line.reflection === "반영대기" ? "반영대기" : "반영완료",
    sourceCode: null,
    linkable,
  });
  const lines = settlement.lines.filter((line) => line.reflection === "반영완료" || line.reflection === "반영대기").map(fromLine(true));
  const samples = settlement.sampleLines.map(fromLine(false));
  const incoming = settlement.incomingAdjustments.map<SellerSettlementAdjustmentRow>((item) => ({
    key: item.id,
    occurredAt: item.occurredAt,
    reservationCode: item.reservationCode,
    type: "예약 취소완료",
    originalAmount: -item.amount,
    adjustment: item.amount,
    finalAmount: 0,
    status: "이전 정산 조정 반영",
    sourceCode: item.sourceSettlementCode,
    linkable: listSellerChannelRecords().some((record) => record.reservation.code === item.reservationCode),
  }));
  return [...lines, ...samples, ...incoming].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export type SellerSettlementSellerConfirmState = { canConfirm: true; version: number } | { canConfirm: false; message: string };

/** 판매점 정산 확인 — 재확인대기 · 운영인계 완료 · 재발행 정산서(v2~)가 현재 유효할 때만 가능 */
export function getSellerSettlementSellerConfirmState(settlement: SellerSettlement): SellerSettlementSellerConfirmState {
  const current = getSettlementCurrentVersion(settlement);
  if (settlement.status === "지급완료") return { canConfirm: false, message: "지급완료된 정산입니다." };
  if (settlement.status === "정산확정") return { canConfirm: false, message: "정산 확인이 완료된 정산입니다." };
  if (settlement.status === "정산대기") return { canConfirm: false, message: "공급여행사 정산확정 전입니다. 정산서 발행 후 확인할 수 있습니다." };
  if (settlement.status === "수정필요") return { canConfirm: false, message: "취소조정 반영을 위해 정산서를 수정하고 있습니다." };
  if (!settlement.handoverCompletedAt) return { canConfirm: false, message: "운영인계 완료 전에는 정산확정할 수 없습니다." };
  if (!current || current.version < 2) return { canConfirm: false, message: "재발행된 정산서가 없습니다." };
  if (settlement.sellerConfirmed) return { canConfirm: false, message: "판매점 확인이 완료되었습니다. 공급여행사 정산확정을 기다립니다." };
  return { canConfirm: true, version: current.version };
}

/** 판매점 정산 확인 (Mock) — 재확인대기 → 정산확정 · 지급상태는 지급대기 유지 */
export function confirmSellerSettlementAsSeller(code: string, sellerId: string = SELLER_CHANNEL_SELLER_ID, now = new Date()) {
  const settlement = getSellerSettlementForSeller(code, sellerId);
  if (!settlement) return false;
  const check = getSellerSettlementSellerConfirmState(settlement);
  if (!check.canConfirm) return false;
  const at = sellerCancelProcessedAt(lastEventAt(settlement), now);
  if (settlement.code === CURRENT_CODE) {
    const latest = workflow.reissues.at(-1);
    if (!latest || latest.version !== check.version) return false;
    workflow = { ...workflow, sellerConfirmedVersion: latest.version, reconfirmedVersion: latest.version };
    pushEvent({ at, label: `${SELLER_CHANNEL_SELLER_NAME} 정산확인`, actor: SELLER_CHANNEL_SELLER_NAME, tone: "success", note: `정산서 v${latest.version} 확인` });
    pushEvent({ at, label: "정산확정", actor: SYSTEM_ACTOR, tone: "success", note: `정산서 v${latest.version} · ${krw(settlement.finalAmount)} · 지급대기` });
  } else {
    staticSellerConfirms = { ...staticSellerConfirms, [settlement.code]: at };
  }
  emit();
  return true;
}

/* ───────────── 공급여행사 지급처리 · 판매점 지급완료 확인 (STEP 9-3) ───────────── */

export const SELLER_SETTLEMENT_PAYMENT_REFERENCE_MAX = 40;
export const SELLER_SETTLEMENT_PAYMENT_MEMO_MAX = 500;

/** 지급완료 후 금액 · 조정 · 정산서 Version 변경 불가 (이후 취소는 차기정산 조정) */
export function isSettlementLockedAfterPayment(settlement: SellerSettlement) {
  return settlement.paymentStatus === "지급완료";
}

export type SellerSettlementPaymentCheck = {
  canPay: boolean;
  blockers: string[];
  /** 지급금액 = 최종 정산금액 (Read Only) */
  amount: number;
  version: number | null;
  account: SellerPayoutAccount | null;
};

/**
 * 지급처리 가능 여부 — 정산확정 · 지급대기 · 운영인계 완료 · 현재 유효(최신) 정산서 판매점 확인 완료
 * · 정산서 금액 = 최종 정산금액 · 판매점 지급계좌 등록
 */
export function getSellerSettlementPaymentCheck(settlement: SellerSettlement): SellerSettlementPaymentCheck {
  const blockers: string[] = [];
  const current = getSettlementCurrentVersion(settlement);
  const latestVersion = Math.max(0, ...settlement.documents.map((doc) => doc.version));
  const account = getSellerSettlementPayoutAccount(settlement.sellerId);
  if (isSettlementLockedAfterPayment(settlement) || settlement.status === "지급완료") blockers.push("이미 지급완료된 정산입니다.");
  else if (settlement.status === "정산대기") blockers.push("정산확정 전에는 지급처리할 수 없습니다.");
  else if (settlement.status === "수정필요") blockers.push("취소조정 반영 · 정산서 재발행 후 지급할 수 있습니다.");
  else if (settlement.status === "재확인대기") blockers.push("판매점 정산서 재확인 · 정산확정 후 지급할 수 있습니다.");
  else {
    if (!settlement.handoverCompletedAt) blockers.push("운영인계 완료 전에는 지급처리할 수 없습니다.");
    if (!current) blockers.push("현재 유효 정산서가 없습니다.");
    else if (current.version !== latestVersion) blockers.push("최신 정산서 Version 기준으로만 지급할 수 있습니다.");
    else if (current.amount !== settlement.finalAmount) blockers.push("현재 유효 정산서와 지급금액이 일치하지 않습니다.");
    if (!settlement.sellerConfirmed) blockers.push("판매점의 현재 정산서 확인이 완료되지 않았습니다.");
    if (!account) blockers.push("판매점 지급계좌가 등록되어 있지 않습니다.");
  }
  return { canPay: blockers.length === 0, blockers, amount: settlement.finalAmount, version: current?.version ?? null, account };
}

/** 지급일 기본값 — 오늘 Mock Date */
export function sellerSettlementPaymentDefaultDate() {
  return SELLER_RESERVATION_BASE_DATE;
}

export type SellerSettlementPaymentInput = {
  paymentDate: string;
  method: SellerSettlementPaymentMethod;
  reference: string;
  memo: string;
};

/** 지급일 검증 — 운영인계(정산확정) 이전 날짜 불가 */
export function validateSellerSettlementPaymentInput(settlement: SellerSettlement, input: SellerSettlementPaymentInput) {
  const errors: Partial<Record<keyof SellerSettlementPaymentInput, string>> = {};
  const minDate = settlement.handoverCompletedAt?.slice(0, 10) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate)) errors.paymentDate = "지급일을 선택해주세요.";
  else if (minDate && input.paymentDate < minDate) errors.paymentDate = `지급일은 운영인계일(${minDate.replace(/-/g, ".")}) 이후여야 합니다.`;
  if (!SELLER_SETTLEMENT_PAYMENT_METHODS.includes(input.method)) errors.method = "지급방법을 선택해주세요.";
  if (input.reference.trim().length > SELLER_SETTLEMENT_PAYMENT_REFERENCE_MAX) errors.reference = `지급참조번호는 ${SELLER_SETTLEMENT_PAYMENT_REFERENCE_MAX}자 이내로 입력해주세요.`;
  if (input.memo.length > SELLER_SETTLEMENT_PAYMENT_MEMO_MAX) errors.memo = `지급메모는 ${SELLER_SETTLEMENT_PAYMENT_MEMO_MAX}자 이내로 입력해주세요.`;
  return { valid: Object.keys(errors).length === 0, errors, minDate };
}

/**
 * 공급여행사 지급처리 (Mock · 실제 이체 없음) — 정산확정 · 지급대기 → 지급완료
 * 지급금액은 입력받지 않고 현재 유효 정산서 = 최종 정산금액으로 고정합니다.
 */
export function paySellerSettlement(code: string, supplierName: string, input: SellerSettlementPaymentInput, now = new Date()) {
  const settlement = listSellerSettlementsBySupplier(supplierName).find((item) => item.code === code);
  if (!settlement) return null;
  const check = getSellerSettlementPaymentCheck(settlement);
  if (!check.canPay || check.version === null) return null;
  if (!validateSellerSettlementPaymentInput(settlement, input).valid) return null;
  const record: StoredPayment = {
    paymentDate: input.paymentDate,
    amount: check.amount,
    method: input.method,
    reference: input.reference.trim() || null,
    memo: input.memo.trim() || null,
    paidBy: `${settlement.supplierName} 관리자`,
    processedAt: sellerCancelProcessedAt(lastEventAt(settlement), now),
    statementVersion: check.version,
    reflectedCodes: settlement.lines.filter((line) => line.reflection === "반영완료").map((line) => line.reservationCode),
  };
  payments = { ...payments, [code]: record };
  emit();
  return toPayment(record);
}
