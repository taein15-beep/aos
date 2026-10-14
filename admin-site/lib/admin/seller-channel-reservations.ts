/**
 * 공급여행사 관리자 · 판매점 채널 예약 (SAMPLE / 테스트 데이터)
 * - 판매점 관리자 예약 Mock(seller-reservations-data)의 같은 예약 객체를 공급여행사 예약 Schema로 변환
 * - 공급여행사(행복투어) 상품 예약만 포함 · 금액 · 결제 · 상태이력은 판매점 화면과 같은 값을 사용
 * - 취소요청은 판매점 취소요청 Store(seller-cancel-request-store)와 같은 Source를 사용
 */

import type {
  ReservationBookingTerms,
  ReservationHistoryEntry,
  ReservationListItem,
  ReservationPayment,
  ReservationRefund,
  ReservationStatusTimelineEntry,
} from "@/lib/admin/reservations-data";
import { listSellerAdminProducts } from "@/lib/seller/seller-admin-products-data";
import {
  findSellerCancelPolicyRule,
  sellerCancelPolicyRules,
  type SellerCancelPolicyRule,
} from "@/lib/seller/seller-product-detail-data";
import { getSellerCancelRequestVersion, getSellerCancelRequests } from "@/lib/seller/seller-cancel-request-store";
import {
  SELLER_RESERVATION_BASE_DATE,
  formatSellerCancelReason,
  getSellerReservationDetail,
  listSellerReservations,
  sellerReservationAmount,
  sellerReservationBookedProfit,
  sellerReservationUnpaidAmount,
  type SellerReservationDetail,
  type SellerReservationStatus,
  type SellerReservationStatusRecord,
} from "@/lib/seller/seller-reservations-data";

export const SELLER_CHANNEL_SELLER_ID = "SEL00032";
export const SELLER_CHANNEL_SELLER_NAME = "그래가자";
const SUPPLIER_TRAVEL_AGENCY_ID = "AGENCY-HAPPY";

type SellerChannelReservation = Omit<ReservationListItem, "reserveStatusClass" | "paymentStatusClass">;

export type SellerChannelRecord = {
  reservation: SellerChannelReservation;
  payments: ReservationPayment[];
  refunds: ReservationRefund[];
  history: ReservationHistoryEntry[];
};

const PRODUCT_CATEGORY = new Map(
  listSellerAdminProducts(SELLER_CHANNEL_SELLER_ID).map((product) => [product.productCode, product.category]),
);

function krw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function dotted(dateTime: string) {
  return dateTime.replace(/-/g, ".");
}

function supplierAdmin(supplierName: string) {
  return `${supplierName} 관리자`;
}

function previousStatusOf(baseStatus: SellerReservationStatus, history: SellerReservationStatusRecord[]) {
  if (baseStatus === "예약접수" || baseStatus === "예약확정") return baseStatus;
  return history.some((record) => record.status === "예약확정") ? "예약확정" : "예약접수";
}

function toTimeline(detail: SellerReservationDetail, record: SellerReservationStatusRecord): ReservationStatusTimelineEntry {
  if (record.status === "예약접수") return { at: record.at, label: "예약접수", actor: SELLER_CHANNEL_SELLER_NAME, tone: "info" };
  if (record.status === "예약확정") {
    return { at: record.at, label: "예약확정", actor: supplierAdmin(detail.supplierName), tone: "success" };
  }
  if (record.status === "취소요청") {
    const requester = detail.cancelRequest?.registeredBy ?? SELLER_CHANNEL_SELLER_NAME;
    return {
      at: record.at,
      label: `${requester} 취소요청`,
      actor: requester,
      tone: "danger",
      note: detail.cancelRequest ? formatSellerCancelReason(detail.cancelRequest) : undefined,
    };
  }
  return { at: record.at, label: "취소완료", actor: supplierAdmin(detail.supplierName), tone: "gray", note: record.note };
}

function toHistory(code: string, timeline: ReservationStatusTimelineEntry[], supplierName: string): ReservationHistoryEntry[] {
  return timeline.map((entry, index) => {
    const bySeller = entry.actor === SELLER_CHANNEL_SELLER_NAME;
    const actor = bySeller
      ? { name: "판매점 관리자", agency: SELLER_CHANNEL_SELLER_NAME }
      : { name: supplierAdmin(supplierName), agency: supplierName };
    if (index === 0) {
      return { id: `h-${code}-0`, at: entry.at, actor, type: "reservation_create", summary: "판매점 관리자에서 예약이 접수되었습니다." };
    }
    const statusOf = (label: string) => (label.endsWith("취소요청") ? "취소요청" : label);
    const before = statusOf(timeline[index - 1].label);
    const after = statusOf(entry.label);
    return {
      id: `h-${code}-${index}`,
      at: entry.at,
      actor,
      type: "reservation_status_change",
      summary: entry.note ? `${entry.label} · ${entry.note}` : entry.label,
      changes: [{ label: "예약상태", before, after }],
    };
  });
}

function buildRecord(code: string, baseStatus: SellerReservationStatus): SellerChannelRecord | null {
  const detail = getSellerReservationDetail(SELLER_CHANNEL_SELLER_ID, code, getSellerCancelRequests(SELLER_CHANNEL_SELLER_ID));
  if (!detail) return null;
  const amount = sellerReservationAmount(detail);
  const timeline = detail.statusHistory.map((record) => toTimeline(detail, record));
  const suffix = code.replace(/^RSV-/, "");

  const payments: ReservationPayment[] = detail.payments
    .filter((payment) => payment.type !== "환불")
    .map((payment, index) => ({
      id: `pay-${code}-${index + 1}`,
      paidAt: dotted(payment.at),
      paymentNumber: `PAY-${suffix}-${index + 1}`,
      method: payment.type === "카드결제" ? "신용카드" : "계좌이체",
      amount: payment.amount,
      status: "결제완료",
      approvalNumber: `${payment.type === "카드결제" ? "CARD" : "BANK"}-${suffix.replace(/\D/g, "").slice(-6)}`,
      processedBy: "시스템",
    }));
  const refunds: ReservationRefund[] = detail.payments
    .filter((payment) => payment.type === "환불")
    .map((payment, index) => ({
      id: `ref-${code}-${index + 1}`,
      refundedAt: dotted(payment.at),
      refundNumber: `REF-${suffix}-${index + 1}`,
      paymentNumber: payments[0]?.paymentNumber ?? "-",
      method: "원결제 취소",
      amount: payment.amount,
      status: "환불완료",
      reason: detail.cancelRequest ? formatSellerCancelReason(detail.cancelRequest) : "고객 요청",
      processedBy: supplierAdmin(detail.supplierName),
    }));

  const bookingTerms: ReservationBookingTerms = {
    productCode: detail.productCode,
    saleMode: detail.saleMode,
    unitPrice: detail.unitPrice,
    depositPrice: detail.bookedDepositPrice,
    commissionRate: detail.bookedCommissionRate,
    pax: detail.pax,
    amount,
    sellerProfit: sellerReservationBookedProfit(detail),
    cancelPolicy: sellerCancelPolicyRules(PRODUCT_CATEGORY.get(detail.productCode) ?? "당일여행"),
  };

  const request = detail.status === "취소요청" ? detail.cancelRequest : null;
  const reservation: SellerChannelReservation = {
    code,
    reservedAt: detail.reservedAt.slice(0, 10),
    bookerName: detail.customerName,
    phone: detail.customerPhone,
    email: detail.customerEmail,
    productName: detail.productName,
    departureAt: detail.travelDate,
    reserveStatus: detail.status,
    paymentStatus: detail.paymentStatus === "일부결제" ? "부분결제" : detail.paymentStatus,
    counts: { adult: detail.paxBreakdown.성인, child: detail.paxBreakdown.소아, infant: detail.paxBreakdown.유아 },
    productAmount: amount,
    optionAmount: 0,
    discountAmount: 0,
    totalAmount: krw(amount),
    paidAmount: krw(detail.paidAmount),
    unpaidAmount: krw(sellerReservationUnpaidAmount(detail)),
    requestNote: detail.memo ?? "",
    adminMemo: detail.supplierMemo ?? "",
    internalNote: "판매점 예약 연동 SAMPLE (실제 예약 아님)",
    agency: SELLER_CHANNEL_SELLER_NAME,
    boardingPoint: detail.boardingPlace,
    source: {
      type: "seller",
      supplierAgencyName: detail.supplierName,
      sellerName: SELLER_CHANNEL_SELLER_NAME,
      sellerCode: SELLER_CHANNEL_SELLER_ID,
      originalProductCode: detail.productCode,
      originalProductName: detail.productName,
      salesProductName: detail.productName,
      createdBy: SELLER_CHANNEL_SELLER_NAME,
    },
    paymentMethod: detail.paymentMethod ?? undefined,
    paidAt: payments[0]?.paidAt,
    bookingTerms,
    statusTimeline: timeline,
    sellerCancelRequest: request
      ? {
          sellerName: SELLER_CHANNEL_SELLER_NAME,
          sellerCode: SELLER_CHANNEL_SELLER_ID,
          requestedAt: request.requestedAt,
          registeredBy: request.registeredBy ?? SELLER_CHANNEL_SELLER_NAME,
          customerName: request.requester,
          reason: formatSellerCancelReason(request),
          customerNote: request.customerNote,
          previousReservationStatus: previousStatusOf(baseStatus, detail.statusHistory),
          status: "검토대기",
        }
      : undefined,
  };

  return { reservation, payments, refunds, history: toHistory(code, timeline, detail.supplierName) };
}

let records: Map<string, SellerChannelRecord> | null = null;
let recordsVersion = -1;

function recordMap() {
  if (!records || recordsVersion !== getSellerCancelRequestVersion()) {
    recordsVersion = getSellerCancelRequestVersion();
    records = new Map();
    listSellerReservations(SELLER_CHANNEL_SELLER_ID)
      .filter((row) => row.supplierTravelAgencyId === SUPPLIER_TRAVEL_AGENCY_ID)
      .forEach((row) => {
        const record = buildRecord(row.reservationCode, row.status);
        if (record) records?.set(row.reservationCode, record);
      });
  }
  return records;
}

/** 공급여행사(행복투어) 상품의 판매점 예약 — 최신 예약순 */
export function listSellerChannelRecords(): SellerChannelRecord[] {
  return Array.from(recordMap().values());
}

export function findSellerChannelRecord(code: string): SellerChannelRecord | undefined {
  return recordMap().get(code.trim());
}

/* ───────────── 취소요청 검토 — 취소정책 · 취소수수료 · 환불예정금액 계산 ───────────── */

export const SELLER_CANCEL_REJECT_REASONS = [
  "취소 가능기간 경과",
  "상품정책상 취소불가",
  "출발완료",
  "고객 요청 철회 확인",
  "기타",
] as const;
export type SellerCancelRejectReason = (typeof SELLER_CANCEL_REJECT_REASONS)[number];
export const SELLER_CANCEL_MEMO_MAX = 500;

function dayNumber(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

export type SellerCancelPolicyResult = {
  /** 여행일까지 남은 일수 (요청일 기준) */
  daysBefore: number;
  rule: SellerCancelPolicyRule | null;
  /** 정책 기준 취소수수료율 % */
  rate: number;
  label: string;
};

/** 취소요청일 기준 적용 취소정책 — 여행일 이후 요청은 환불불가(100%) */
export function resolveSellerCancelPolicy(
  rules: readonly SellerCancelPolicyRule[],
  travelDate: string,
  requestedAt: string,
): SellerCancelPolicyResult {
  const daysBefore = dayNumber(travelDate) - dayNumber(requestedAt);
  const rule = findSellerCancelPolicyRule(rules, daysBefore);
  const rate = rule ? rule.rate : 100;
  const label = !rule
    ? "여행일 이후 요청 · 환불불가"
    : rate === 0
      ? "취소수수료 없음"
      : rate >= 100
        ? "환불불가 (예약금액의 100%)"
        : `예약금액의 ${rate}%`;
  return { daysBefore, rule, rate, label };
}

export function formatSellerCancelDaysBefore(daysBefore: number) {
  if (daysBefore < 0) return `여행일 ${Math.abs(daysBefore)}일 경과`;
  return daysBefore === 0 ? "여행 당일" : `${daysBefore}일 전`;
}

/** 추천 취소수수료 = 총 예약금액 × 정책 수수료율 */
export function sellerCancelRecommendedFee(amount: number, rate: number) {
  return Math.round((amount * rate) / 100);
}

/** 환불예정금액 = 결제금액 - 적용 취소수수료 (0원 미만 불가) */
export function sellerCancelRefundAmount(paidAmount: number, fee: number) {
  return Math.max(0, paidAmount - fee);
}

/** 적용 취소수수료 입력값 검증 — 오류 Message 또는 금액 */
export function parseSellerCancelFee(raw: string, paidAmount: number): { value: number | null; error: string | null } {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return { value: null, error: "취소수수료를 입력해주세요." };
  if (cleaned.startsWith("-")) return { value: null, error: "취소수수료는 0원 이상이어야 합니다." };
  if (!/^\d+$/.test(cleaned)) return { value: null, error: "숫자만 입력할 수 있습니다." };
  const value = Number(cleaned);
  if (value > paidAmount) return { value, error: "취소수수료는 결제금액을 초과할 수 없습니다." };
  return { value, error: null };
}

/**
 * 환불실패 테스트 예약 (QA SAMPLE) — 첫 환불처리는 실패, 재시도는 성공합니다.
 * 실제 PG 응답이 아닌 고정 Mock Scenario입니다.
 */
const SELLER_REFUND_FAILURE_SCENARIO = new Set(["RSV-20261008-010"]);

export function isSellerRefundFailureScenario(code: string) {
  return SELLER_REFUND_FAILURE_SCENARIO.has(code);
}

/** 이번 환불처리 시도가 실패해야 하는지 (실패 Scenario 예약의 첫 시도만 실패) */
export function shouldSellerRefundFail(code: string, previousAttempts: number) {
  return SELLER_REFUND_FAILURE_SCENARIO.has(code) && previousAttempts === 0;
}

export const SELLER_REFUND_MEMO_MAX = 500;

/** 처리일시 — Mock 기준일 + 현재 시각, 직전 처리일시보다 앞서지 않음 */
export function sellerCancelProcessedAt(after: string, now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const candidate = `${SELLER_RESERVATION_BASE_DATE} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (candidate > after) return candidate;
  const [date, time] = after.split(" ");
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + 1;
  return total >= 24 * 60 ? `${date} 23:59` : `${date} ${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
