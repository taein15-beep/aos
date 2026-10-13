/**
 * 판매점 관리자 · 인보이스 Mock (SAMPLE / 테스트 데이터)
 * - 판매점 → 공급여행사 → 예약 → 결제/금액 Snapshot → 인보이스 구조
 * - 예약 1건당 인보이스 1건 (인보이스번호 고정) · 재발행은 같은 번호의 Version 증가 (v1 → v2)
 * - 인보이스 금액은 발행 시점의 예약 Snapshot — 현재 상품 판매가 · 공급조건은 소급하지 않음
 * - 취소 재발행 금액 = 취소 후 고객 최종 부담금(취소수수료) — 환불금액과 구분
 * - Version은 삭제하지 않고 누적 · 목록은 currentVersion 1건만 표시
 * - 고객용 영수증 · 세금계산서가 아닌 판매점 관리자용 예약/결제 기반 거래문서
 */

import {
  SELLER_RESERVATION_BASE_DATE,
  getSellerReservationDetail,
  sellerReservationAmount,
  type SellerReservation,
  type SellerReservationPaymentStatus,
  type SellerReservationStatus,
} from "@/lib/seller/seller-reservations-data";
import type { SellerProductSaleMode } from "@/lib/seller/seller-admin-products-data";

export type SellerInvoiceStatus = "정상" | "재발행 필요" | "취소" | "무효";

export const SELLER_INVOICE_STATUSES: SellerInvoiceStatus[] = ["정상", "재발행 필요", "취소", "무효"];

/** 인보이스 기준 예약상태 — 공급여행사 취소승인(환불 전)을 포함 */
export type SellerInvoiceReservationStatus = SellerReservationStatus | "취소승인";

export const SELLER_INVOICE_REISSUE_REASONS = ["예약 취소", "환불 반영", "금액 변경", "예약정보 변경", "기타"] as const;
export type SellerInvoiceReissueReason = (typeof SELLER_INVOICE_REISSUE_REASONS)[number];
export const SELLER_INVOICE_REASON_TEXT_MAX = 200;

/** 발행 시점 예약/결제 Snapshot — 발행 후 변경되지 않음 */
export type SellerInvoiceSnapshot = {
  reservationStatus: SellerInvoiceReservationStatus;
  paymentStatus: SellerReservationPaymentStatus;
  paymentMethod: "카드" | "계좌이체" | null;
  saleMode: SellerProductSaleMode;
  unitPrice: number;
  pax: number;
  /** 상품금액 = 1인 판매가 × 인원 */
  productAmount: number;
  extraAmount: number;
  discountAmount: number;
  paidAmount: number;
  refundAmount: number;
  /** 취소수수료 (취소 반영 Version만) */
  cancelFee: number | null;
  /** 인보이스 금액 — 일반: 총 청구금액 · 취소: 취소 후 고객 최종 부담금 */
  amount: number;
};

export type SellerInvoiceVersion = {
  version: number;
  /** YYYY-MM-DD HH:mm */
  issuedAt: string;
  amount: number;
  /** 과거 Version은 항상 무효 · 현재 Version은 인보이스 현재상태 */
  status: SellerInvoiceStatus;
  reason: string;
  snapshot: SellerInvoiceSnapshot;
};

export type SellerInvoiceHistoryEntry = {
  /** YYYY-MM-DD HH:mm */
  at: string;
  status: SellerInvoiceStatus;
  note: string;
};

/** 공급여행사 취소처리 결과 (프로토타입 Mock · 인보이스 Client State 전용) */
export type SellerInvoiceCancelOutcome = {
  stage: "취소승인" | "취소완료";
  /** 취소수수료율 % */
  feeRate: number;
  approvedAt: string;
  completedAt: string | null;
};

export type SellerInvoiceReissueRecord = {
  issuedAt: string;
  reason: SellerInvoiceReissueReason;
  reasonDetail: string | null;
  snapshot: SellerInvoiceSnapshot;
};

export type SellerInvoiceReissueState =
  | { kind: "available"; defaultReason: SellerInvoiceReissueReason; target: SellerInvoiceSnapshot }
  | { kind: "blocked"; message: string }
  | { kind: "none"; message: string };

/** 취소 정산 결과 — 결제금액 · 환불금액 · 취소수수료(고객 최종 부담금) */
export type SellerInvoiceCancelSettlement = {
  stage: "취소승인" | "취소완료";
  paidAmount: number;
  refundAmount: number;
  cancelFee: number;
  feeRate: number;
  simulated: boolean;
};

export type SellerInvoice = {
  invoiceCode: string;
  reservationCode: string;
  sellerId: string;
  supplierTravelAgencyId: string;
  supplierName: string;
  supplierCode: string;
  productCode: string;
  productName: string;
  customerName: string;
  customerPhoneMasked: string;
  /** 최초 발행일시 (v1) — 목록 기간 Filter · 정렬 기준 */
  issuedAt: string;
  currentVersion: number;
  /** v1부터 오름차순 · 삭제하지 않음 */
  versions: SellerInvoiceVersion[];
  /** 현재 유효 Version 금액 */
  amount: number;
  /** 현재 예약 기준 금액 (예약 당시 판매조건) */
  reservationAmount: number;
  paymentStatus: SellerReservationPaymentStatus;
  reservationStatus: SellerInvoiceReservationStatus;
  status: SellerInvoiceStatus;
  statusNote: string | null;
  history: SellerInvoiceHistoryEntry[];
  cancelSettlement: SellerInvoiceCancelSettlement | null;
  reissue: SellerInvoiceReissueState;
  /** 발송이력 (오래된 순) — 과거 Version 발송기록 포함 */
  sends: SellerInvoiceSendRecord[];
};

export type SellerInvoiceClientState = {
  outcomes: Readonly<Record<string, SellerInvoiceCancelOutcome>>;
  reissues: Readonly<Record<string, readonly SellerInvoiceReissueRecord[]>>;
  sends: Readonly<Record<string, readonly SellerInvoiceSendRecord[]>>;
};

export const EMPTY_SELLER_INVOICE_CLIENT_STATE: SellerInvoiceClientState = { outcomes: {}, reissues: {}, sends: {} };

/* ───────── 문서 발송 (Mock · 실제 이메일/문자/알림톡 발송 없음) ───────── */

export const SELLER_INVOICE_SEND_CHANNELS = ["이메일", "문자", "알림톡"] as const;
export type SellerInvoiceSendChannel = (typeof SELLER_INVOICE_SEND_CHANNELS)[number];

/** 발송이력 — Version 필수 · 재발행 후에도 삭제하지 않음 */
export type SellerInvoiceSendRecord = {
  /** YYYY-MM-DD HH:mm */
  sentAt: string;
  channel: SellerInvoiceSendChannel;
  /** 이메일 주소 또는 마스킹된 휴대폰번호 */
  recipient: string;
  version: number;
  status: "발송완료";
};

/** 발송 수신 기본값 (SAMPLE — 실제 연락처 아님) */
export const SELLER_INVOICE_SEND_DEFAULT_EMAIL = "seller@example.com";
export const SELLER_INVOICE_SEND_DEFAULT_PHONE = "010-****-1234";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^01[016789]-?(\d{3,4}|\*{3,4})-?\d{4}$/;

export function isValidSellerInvoiceEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

/** 휴대폰번호 — 숫자 또는 등록번호 마스킹(010-****-1234) 형식 */
export function isValidSellerInvoicePhone(value: string) {
  return PHONE_PATTERN.test(value.trim());
}

/** 발송이력 표시용 휴대폰번호 마스킹 — 010-1234-5678 → 010-****-5678 */
export function maskSellerInvoicePhone(value: string) {
  const digits = value.trim();
  const match = digits.match(/^(01[016789])-?(\d{3,4}|\*{3,4})-?(\d{4})$/);
  return match ? `${match[1]}-****-${match[3]}` : digits;
}

export type SellerInvoiceSendState = { kind: "available" } | { kind: "blocked"; message: string };

export const SELLER_INVOICE_SEND_PAST_MESSAGE = "무효 처리된 과거 Version은 발송할 수 없습니다.";
export const SELLER_INVOICE_SEND_REISSUE_MESSAGE = "재발행 후 최신 인보이스를 발송해주세요.";

/** 발송 가능 조건 — 현재 Version · 정상(또는 현재 유효 취소문서) · 무효/재발행 필요 아님 */
export function getSellerInvoiceSendState(invoice: SellerInvoice, version: number): SellerInvoiceSendState {
  if (version !== invoice.currentVersion) return { kind: "blocked", message: SELLER_INVOICE_SEND_PAST_MESSAGE };
  if (invoice.status === "재발행 필요") return { kind: "blocked", message: SELLER_INVOICE_SEND_REISSUE_MESSAGE };
  if (invoice.status === "무효") return { kind: "blocked", message: "무효 처리된 인보이스는 발송할 수 없습니다." };
  return { kind: "available" };
}

/** 인보이스 자체 이력 (SAMPLE) — 발행 후 금액 정정 · 오발행 무효 */
type InvoiceEvent =
  | { type: "amountChanged"; at: string; issuedPax?: number; issuedUnitPrice?: number; reason: string; reissueReason: SellerInvoiceReissueReason }
  | { type: "voided"; at: string; reason: string };

const INVOICE_EVENTS: Record<string, InvoiceEvent> = {
  "RSV-20261002-011": { type: "amountChanged", at: "2026-10-02 18:10", issuedUnitPrice: 219000, reason: "예약금액 정정", reissueReason: "금액 변경" },
  "RSV-20261004-012": { type: "amountChanged", at: "2026-10-05 10:20", issuedPax: 4, reason: "인원 변경 (4명 → 3명)", reissueReason: "예약정보 변경" },
  "RSV-20261003-014": { type: "amountChanged", at: "2026-10-04 09:40", issuedPax: 2, reason: "인원 변경 (2명 → 3명)", reissueReason: "예약정보 변경" },
  "RSV-20261001-012": { type: "amountChanged", at: "2026-10-02 11:15", issuedPax: 1, reason: "인원 변경 (1명 → 2명)", reissueReason: "예약정보 변경" },
  "RSV-20261001-002": { type: "voided", at: "2026-10-01 15:30", reason: "예약자 정보 오기로 무효 처리 · 대체 인보이스 발행 대기" },
  "RSV-20261005-007": { type: "voided", at: "2026-10-05 15:10", reason: "발행정보 오류로 무효 처리 후 예약 취소완료" },
};

/** 인보이스 발행주체(공급여행사) 사업자 정보 (SAMPLE — 실제 사업자와 무관) */
const SUPPLIER_BUSINESS_INFO: Record<string, { businessName: string; representative: string; businessNumber: string; phone: string; address: string }> = {
  SUP00001: { businessName: "(주)행복투어", representative: "김행복", businessNumber: "101-81-00001", phone: "02-1234-5678", address: "서울특별시 중구 세종대로 110 (SAMPLE)" },
  SUP00002: { businessName: "현담여행사(주)", representative: "박현담", businessNumber: "202-81-00002", phone: "02-555-0100", address: "부산광역시 해운대구 센텀중앙로 55 (SAMPLE)" },
};

export function getSellerInvoiceSupplierInfo(supplierCode: string) {
  return SUPPLIER_BUSINESS_INFO[supplierCode] ?? null;
}

function addMinutes(dateTime: string, minutes: number) {
  const [date, time = "00:00"] = dateTime.split(" ");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute + minutes)).toISOString().slice(0, 16).replace("T", " ");
}

/** Client State 이벤트 시각 — Mock 기준일 + 현재 시각, 직전 이력보다 앞서지 않음 */
export function sellerInvoiceEventAt(lastAt: string, now = new Date()) {
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const candidate = `${SELLER_RESERVATION_BASE_DATE} ${time}`;
  return candidate > lastAt ? candidate : addMinutes(lastAt, 1);
}

/** 예약번호 RSV-YYYYMMDD-NNN → 인보이스번호 INV-YYYYMMDD-NNN (예약 1건당 1건, Version과 무관하게 고정) */
export function sellerInvoiceCodeOf(reservationCode: string) {
  return reservationCode.replace(/^RSV-/, "INV-");
}

/** 인보이스 상세 Route — /seller/invoices/{인보이스번호} */
export function sellerInvoiceDetailPath(invoiceCode: string) {
  return `/seller/invoices/${encodeURIComponent(invoiceCode)}`;
}

function isCancelledSnapshot(snapshot: SellerInvoiceSnapshot) {
  return snapshot.reservationStatus === "취소완료";
}

function buildInvoice(
  sellerId: string,
  reservation: SellerReservation,
  outcome: SellerInvoiceCancelOutcome | undefined,
  reissues: readonly SellerInvoiceReissueRecord[],
  sentRecords: readonly SellerInvoiceSendRecord[],
): SellerInvoice {
  const event = INVOICE_EVENTS[reservation.reservationCode];
  const detail = getSellerReservationDetail(sellerId, reservation.reservationCode);
  const reservationAmount = sellerReservationAmount(reservation);
  const issuedAt = addMinutes(reservation.reservedAt, 8);
  const basePaid = detail?.paidAmount ?? 0;
  const paymentMethod = detail?.paymentMethod ?? null;

  /* 현재 예약/결제 상태 (공급여행사 취소처리 Mock 반영) */
  const activeOutcome = outcome && reservation.status === "취소요청" ? outcome : undefined;
  let reservationStatus: SellerInvoiceReservationStatus = reservation.status;
  let paymentStatus = reservation.paymentStatus;
  let cancelSettlement: SellerInvoiceCancelSettlement | null = null;
  let cancelCompletedAt: string | null = null;
  if (activeOutcome) {
    const cancelFee = Math.min(Math.round((reservationAmount * activeOutcome.feeRate) / 100), basePaid);
    const refundAmount = basePaid - cancelFee;
    reservationStatus = activeOutcome.stage;
    cancelSettlement = { stage: activeOutcome.stage, paidAmount: basePaid, refundAmount, cancelFee, feeRate: activeOutcome.feeRate, simulated: true };
    if (activeOutcome.stage === "취소완료") {
      cancelCompletedAt = activeOutcome.completedAt;
      if (refundAmount > 0) paymentStatus = "환불완료";
    }
  } else if (reservation.status === "취소완료") {
    const refundAmount = detail?.refundAmount ?? 0;
    const cancelFee = Math.max(0, basePaid - refundAmount);
    cancelSettlement = {
      stage: "취소완료",
      paidAmount: basePaid,
      refundAmount,
      cancelFee,
      feeRate: reservationAmount > 0 ? Math.round((cancelFee / reservationAmount) * 100) : 0,
      simulated: false,
    };
    cancelCompletedAt = detail?.cancelRequest?.completedAt ?? issuedAt;
  }

  const baseSnapshot = {
    paymentMethod,
    saleMode: reservation.saleMode,
    extraAmount: 0,
    discountAmount: 0,
  };

  /* v1 — 예약 당시 발행 Snapshot */
  const issuedPax = event?.type === "amountChanged" ? (event.issuedPax ?? reservation.pax) : reservation.pax;
  const issuedUnitPrice = event?.type === "amountChanged" ? (event.issuedUnitPrice ?? reservation.unitPrice) : reservation.unitPrice;
  const v1Amount = issuedUnitPrice * issuedPax;
  const v1Refunded = reservation.paymentStatus === "환불완료";
  const v1Snapshot: SellerInvoiceSnapshot = {
    ...baseSnapshot,
    reservationStatus: reservation.status === "예약접수" ? "예약접수" : "예약확정",
    paymentStatus: v1Refunded ? "결제완료" : reservation.paymentStatus,
    unitPrice: issuedUnitPrice,
    pax: issuedPax,
    productAmount: v1Amount,
    paidAmount: basePaid,
    refundAmount: 0,
    cancelFee: null,
    amount: v1Amount,
  };

  /* 현재 예약/결제 기준 목표 Snapshot — 재발행 시 새 Version 내용 */
  const isCancelFinal = reservationStatus === "취소완료" || reservationStatus === "취소승인";
  const target: SellerInvoiceSnapshot = {
    ...baseSnapshot,
    reservationStatus,
    paymentStatus,
    unitPrice: reservation.unitPrice,
    pax: reservation.pax,
    productAmount: reservationAmount,
    paidAmount: cancelSettlement?.paidAmount ?? basePaid,
    refundAmount: cancelSettlement?.refundAmount ?? 0,
    cancelFee: isCancelFinal ? (cancelSettlement?.cancelFee ?? 0) : null,
    amount: isCancelFinal ? (cancelSettlement?.cancelFee ?? 0) : reservationAmount,
  };

  const versions: SellerInvoiceVersion[] = [
    { version: 1, issuedAt, amount: v1Amount, status: "정상", reason: "최초 발행", snapshot: v1Snapshot },
    ...reissues.map((record, index) => ({
      version: index + 2,
      issuedAt: record.issuedAt,
      amount: record.snapshot.amount,
      status: "정상" as SellerInvoiceStatus,
      reason: record.reasonDetail ? `${record.reason} · ${record.reasonDetail}` : record.reason,
      snapshot: record.snapshot,
    })),
  ];
  const current = versions[versions.length - 1];
  const reissued = versions.length > 1;

  const history: SellerInvoiceHistoryEntry[] = [{ at: issuedAt, status: "정상", note: "인보이스 발행 (v1)" }];
  if (event) history.push({ at: event.at, status: event.type === "voided" ? "무효" : "재발행 필요", note: event.reason });
  if (activeOutcome) history.push({ at: activeOutcome.approvedAt, status: "재발행 필요", note: "공급여행사 취소승인 · 환불금액 확정" });
  if (cancelCompletedAt && !event) history.push({ at: cancelCompletedAt, status: "재발행 필요", note: "예약 취소완료 · 환불 반영 필요" });
  versions.slice(1).forEach((version) => {
    const alreadyVoided = version.version === 2 && event?.type === "voided";
    if (!alreadyVoided) history.push({ at: version.issuedAt, status: "무효", note: `v${version.version - 1} 무효 처리 (재발행으로 대체)` });
    history.push({ at: version.issuedAt, status: "정상", note: `v${version.version} 재발행 · ${version.reason}` });
  });
  history.sort((a, b) => a.at.localeCompare(b.at));

  let status: SellerInvoiceStatus;
  let statusNote: string | null = null;
  let reissue: SellerInvoiceReissueState;
  const cancelPendingMessage = "취소 처리가 완료된 후 재발행할 수 있습니다.";

  if (event?.type === "voided" && !reissued) {
    status = "무효";
    statusNote = event.reason;
    if (reservationStatus === "취소요청" || reservationStatus === "취소승인") {
      reissue = { kind: "blocked", message: cancelPendingMessage };
    } else if (reservationStatus === "취소완료" && target.amount === 0) {
      reissue = { kind: "none", message: "무효 처리 후 예약이 취소되어 재발행할 청구금액이 없습니다." };
    } else {
      reissue = { kind: "available", defaultReason: reservationStatus === "취소완료" ? "예약 취소" : "예약정보 변경", target };
    }
  } else if (reservationStatus === "취소승인") {
    status = "재발행 필요";
    statusNote = "취소승인 · 환불완료 후 재발행";
    reissue = { kind: "blocked", message: "환불완료 후 재발행할 수 있습니다. 취소승인 단계에서는 재발행 필요 상태만 표시합니다." };
  } else {
    const changed = current.snapshot.amount !== target.amount || isCancelledSnapshot(current.snapshot) !== isCancelledSnapshot(target);
    if (!changed) {
      status = "정상";
      if (reservationStatus === "취소요청") {
        statusNote = "취소 검토중";
        reissue = { kind: "blocked", message: cancelPendingMessage };
      } else {
        if (reissued) statusNote = `v${current.version} 재발행 완료`;
        reissue = { kind: "none", message: "재발행할 변경사항이 없습니다." };
      }
    } else {
      status = "재발행 필요";
      if (reservationStatus === "취소요청") {
        statusNote = "취소 검토중 · 취소 처리 후 재발행";
        reissue = { kind: "blocked", message: cancelPendingMessage };
      } else if (reservationStatus === "취소완료") {
        statusNote = paymentStatus === "환불완료" ? "예약 취소완료 · 환불완료" : "예약 취소완료";
        reissue = { kind: "available", defaultReason: "예약 취소", target };
      } else {
        statusNote = `${event?.type === "amountChanged" ? event.reason : "예약금액 변경"} · 인보이스 금액 불일치`;
        reissue = { kind: "available", defaultReason: event?.type === "amountChanged" ? event.reissueReason : "금액 변경", target };
      }
    }
  }

  return {
    invoiceCode: sellerInvoiceCodeOf(reservation.reservationCode),
    reservationCode: reservation.reservationCode,
    sellerId,
    supplierTravelAgencyId: reservation.supplierTravelAgencyId,
    supplierName: reservation.supplierName,
    supplierCode: reservation.supplierCode,
    productCode: reservation.productCode,
    productName: reservation.productName,
    customerName: reservation.customerName,
    customerPhoneMasked: reservation.customerPhoneMasked,
    issuedAt,
    currentVersion: current.version,
    versions: versions.map((version) => ({ ...version, status: version === current ? status : "무효" })),
    amount: current.amount,
    reservationAmount,
    paymentStatus,
    reservationStatus,
    status,
    statusNote,
    history,
    cancelSettlement,
    reissue,
    sends: [...sampleSends(reservation, issuedAt, event), ...sentRecords],
  };
}

/** SAMPLE 발송이력 — 변경/취소 전 v1을 판매점 이메일로 발송한 기록 */
function sampleSends(reservation: SellerReservation, issuedAt: string, event: InvoiceEvent | undefined): SellerInvoiceSendRecord[] {
  if (event?.type !== "amountChanged" && reservation.status !== "취소완료") return [];
  const sentAt = addMinutes(issuedAt, 10);
  if (event && sentAt >= event.at) return [];
  return [{ sentAt, channel: "이메일", recipient: SELLER_INVOICE_SEND_DEFAULT_EMAIL, version: 1, status: "발송완료" }];
}

/** 판매점 스코프 인보이스 — 예약 목록(취소요청 Client State 반영) + 인보이스 Client State, 최초 발행일 최신순 */
export function buildSellerInvoices(
  sellerId: string,
  reservations: readonly SellerReservation[],
  clientState: SellerInvoiceClientState = EMPTY_SELLER_INVOICE_CLIENT_STATE,
): SellerInvoice[] {
  return reservations
    .filter((reservation) => reservation.sellerId === sellerId)
    .map((reservation) =>
      buildInvoice(
        sellerId,
        reservation,
        clientState.outcomes[reservation.reservationCode],
        clientState.reissues[sellerInvoiceCodeOf(reservation.reservationCode)] ?? [],
        clientState.sends[sellerInvoiceCodeOf(reservation.reservationCode)] ?? [],
      ),
    )
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

/** 인보이스 현재상태 — currentVersion 기준 */
export function getEffectiveInvoiceStatus(invoice: Pick<SellerInvoice, "status">) {
  return invoice.status;
}

export function getSellerInvoiceVersion(invoice: SellerInvoice, version: number) {
  return invoice.versions.find((item) => item.version === version) ?? null;
}

export type SellerInvoiceSummary = {
  total: number;
  normal: number;
  reissue: number;
  cancelled: number;
  voided: number;
};

export function summarizeSellerInvoices(invoices: readonly SellerInvoice[]): SellerInvoiceSummary {
  return invoices.reduce<SellerInvoiceSummary>(
    (acc, invoice) => ({
      total: acc.total + 1,
      normal: acc.normal + (invoice.status === "정상" ? 1 : 0),
      reissue: acc.reissue + (invoice.status === "재발행 필요" ? 1 : 0),
      cancelled: acc.cancelled + (invoice.status === "취소" ? 1 : 0),
      voided: acc.voided + (invoice.status === "무효" ? 1 : 0),
    }),
    { total: 0, normal: 0, reissue: 0, cancelled: 0, voided: 0 },
  );
}

export type SellerInvoicePeriod = "today" | "week" | "month" | "custom";

export const SELLER_INVOICE_PERIODS: { key: SellerInvoicePeriod; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "week", label: "최근 7일" },
  { key: "month", label: "이번 달" },
  { key: "custom", label: "기간선택" },
];

export type SellerInvoiceFilters = {
  period: SellerInvoicePeriod;
  from: string;
  to: string;
  keyword: string;
  supplierId: string;
  status: SellerInvoiceStatus | "전체";
  paymentStatus: SellerReservationPaymentStatus | "전체";
};

export function defaultSellerInvoiceFilters(baseDate: string): SellerInvoiceFilters {
  return {
    period: "month",
    from: `${baseDate.slice(0, 7)}-01`,
    to: baseDate,
    keyword: "",
    supplierId: "전체",
    status: "전체",
    paymentStatus: "전체",
  };
}

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function periodRange(filters: SellerInvoiceFilters, baseDate: string): [string, string] {
  switch (filters.period) {
    case "today":
      return [baseDate, baseDate];
    case "week":
      return [shiftDate(baseDate, -6), baseDate];
    case "custom":
      return filters.from <= filters.to ? [filters.from, filters.to] : [filters.to, filters.from];
    default:
      return [`${baseDate.slice(0, 7)}-01`, baseDate];
  }
}

/** 기간(최초 발행일) · 검색 · 공급여행사 · 인보이스 상태 · 결제상태 복합 Filter */
export function filterSellerInvoices(
  invoices: readonly SellerInvoice[],
  filters: SellerInvoiceFilters,
  baseDate: string,
): SellerInvoice[] {
  const [from, to] = periodRange(filters, baseDate);
  const keyword = filters.keyword.trim().toLowerCase();
  return invoices.filter((invoice) => {
    const date = invoice.issuedAt.slice(0, 10);
    if ((from && date < from) || (to && date > to)) return false;
    if (filters.supplierId !== "전체" && invoice.supplierTravelAgencyId !== filters.supplierId) return false;
    if (filters.status !== "전체" && invoice.status !== filters.status) return false;
    if (filters.paymentStatus !== "전체" && invoice.paymentStatus !== filters.paymentStatus) return false;
    if (!keyword) return true;
    return [invoice.invoiceCode, invoice.reservationCode, invoice.customerName, invoice.productName, invoice.productCode].some(
      (value) => value.toLowerCase().includes(keyword),
    );
  });
}

export function hasSellerInvoiceConditionFilter(filters: SellerInvoiceFilters) {
  return (
    filters.keyword.trim() !== "" ||
    filters.supplierId !== "전체" ||
    filters.status !== "전체" ||
    filters.paymentStatus !== "전체"
  );
}

export function sellerInvoiceStatusBadgeClass(status: SellerInvoiceStatus) {
  if (status === "정상") return "success";
  if (status === "재발행 필요") return "warn";
  if (status === "취소") return "danger";
  return "gray";
}

export function sellerInvoiceReservationStatusBadgeClass(status: SellerInvoiceReservationStatus) {
  if (status === "예약확정") return "success";
  if (status === "예약접수") return "info";
  if (status === "취소완료") return "danger";
  return "warn";
}

/** 변경금액 표기 — +13,000원 / -117,000원 / 0원 */
export function formatSellerInvoiceDelta(value: number) {
  if (value === 0) return "0원";
  return `${value > 0 ? "+" : "-"}${Math.abs(value).toLocaleString("ko-KR")}원`;
}
