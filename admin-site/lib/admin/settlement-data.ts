import {
  applyReservationCancellation,
  getReservationCancellationStatus,
  getReservationList,
  type ReservationActor,
  type ReservationCancellation,
  type ReservationCancellationStatus,
  type ReservationCancellationType,
  type ReservationDetail,
  type ReservationSourceType,
} from "@/lib/admin/reservations-data";
import type { ReservationViewer } from "@/lib/admin/reservation-permission";

/**
 * 상품공유 예약 정산 (SAMPLE).
 * 고객 → 판매주체(판매점/판매여행사) → 판매수수료 차감 → 공급여행사 정산 구조를 프론트 state로만 표현합니다.
 * 취소/환불 · 차액조정 · 차기 정산 반영도 Mock 정책으로만 계산합니다.
 */

export const SETTLEMENT_STATUSES = ["정산대기", "정산확정", "지급대기", "지급완료", "정산보류", "정산취소"] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const SETTLEMENT_HOLD_REASONS = ["예약 변경", "취소/환불 확인", "금액 불일치", "여행사 확인 필요", "기타"] as const;
export type SettlementHoldReason = (typeof SETTLEMENT_HOLD_REASONS)[number];

export const SETTLEMENT_PAYMENT_METHODS = ["계좌이체", "가상계좌", "현금", "기타"] as const;

export const SETTLEMENT_CANCELLATION_REASONS = ["고객 요청", "일정 변경", "인원 변경", "상품 운영 사정", "기타"] as const;

/** 취소수수료 귀속 (Mock 정책값). 비율배분은 이번 단계에서 계산하지 않습니다. */
export const CANCELLATION_FEE_OWNERS = ["공급여행사", "판매여행사", "판매점", "비율배분"] as const;
export type CancellationFeeOwner = (typeof CANCELLATION_FEE_OWNERS)[number];
export const DEFAULT_CANCELLATION_FEE_OWNER: CancellationFeeOwner = "공급여행사";

export type SettlementChange = { label: string; before: string; after: string };

export type SettlementPayment = {
  paidAt: string;
  amount: number;
  method: string;
  memo: string;
  processedBy: ReservationActor;
};

export type SettlementHold = {
  reason: SettlementHoldReason;
  detail: string;
  heldAt: string;
  heldBy: ReservationActor;
};

/** 정산마감 상태 (정산상태와 별도 관리) */
export const SETTLEMENT_CLOSE_STATUSES = ["미마감", "마감완료"] as const;
export type SettlementCloseStatus = (typeof SETTLEMENT_CLOSE_STATUSES)[number];

/** 정산마감 기록. 마감 시점 최종 정산액은 정산서 발행 기준이며 이후 변경은 조정내역으로만 관리합니다. */
export type SettlementClosing = {
  closedAt: string;
  closedBy: ReservationActor;
  finalSupplierAmount: number;
};

/** 정산 대상 금액 (확정 시점 스냅샷) */
export type SettlementAmountBase = {
  grossAmount: number;
  discountAmount: number;
  refundAmount?: number;
  cancellationFee?: number;
  cancellationFeeOwner?: CancellationFeeOwner;
};

/** 예약에 붙는 정산 정보. 금액은 예약 금액에서 계산하고, 확정 이후에는 확정 시점 금액을 사용합니다. */
export type ReservationSettlement = {
  settlementCode: string;
  status: SettlementStatus;
  /** 공급여행사 → 판매여행사 판매 수수료율 (%) */
  affiliateCommissionRate: number;
  /** 판매여행사 → 판매점 수수료율 (%) */
  sellerCommissionRate?: number;
  /** 정산방식 · 정산주기 · 결제주체 (공유조건에서 넘어온 기준, SAMPLE) */
  method: string;
  cycle: string;
  payer: string;
  dueDate: string;
  createdAt: string;
  confirmedAmounts?: SettlementAmountBase;
  hold?: SettlementHold;
  payment?: SettlementPayment;
  /** 취소수수료 귀속 정책값 (기본: 공급여행사) */
  cancellationFeeOwner?: CancellationFeeOwner;
  /** 정산대기 상태에서 예약 변경이 자동 반영된 기록 */
  autoRecalculated?: { at: string; changes: SettlementChange[] };
  closing?: SettlementClosing;
};

export type SettlementBreakdown = {
  grossAmount: number;
  discountAmount: number;
  /** 고객 결제금액 */
  paidAmount: number;
  refundAmount: number;
  cancellationFee: number;
  cancellationFeeOwner: CancellationFeeOwner;
  /** 정산대상금액 = 고객 결제금액 − 환불금액 (취소수수료 포함) */
  settlementBaseAmount: number;
  /** 수수료 기준금액 = 정산대상금액 − 취소수수료 */
  commissionBaseAmount: number;
  affiliateCommissionRate: number;
  affiliateCommission: number;
  sellerCommissionRate: number;
  sellerCommission: number;
  totalCommission: number;
  /** 취소수수료 귀속 배분 */
  cancellationFeeShare: { supplier: number; sellingAgency: number; seller: number };
  /** 공급여행사 정산액 (조정 전) */
  supplierAmount: number;
  /** 판매여행사 최종 판매수익 = 판매여행사 수수료 + 귀속 취소수수료 */
  sellingAgencyRevenue: number;
  /** 판매점 최종 수익 = 판매점 수수료 + 귀속 취소수수료 */
  sellerRevenue: number;
  adjustmentAmount: number;
  /** 조정 반영 공급사 정산액 */
  finalSupplierAmount: number;
  warnings: string[];
};

export type SettlementCalculationInput = {
  grossAmount: number;
  discountAmount: number;
  /** 없으면 정상 판매금액 − 할인금액 */
  paidAmount?: number;
  refundAmount?: number;
  cancellationFee?: number;
  cancellationFeeOwner?: CancellationFeeOwner;
  affiliateCommissionRate: number;
  sellerCommissionRate?: number;
  adjustmentAmount?: number;
};

export function clampRate(rate: number) {
  if (!Number.isFinite(rate)) return 0;
  return Math.min(100, Math.max(0, rate));
}

export function isValidRate(rate: number) {
  return Number.isFinite(rate) && rate >= 0 && rate <= 100;
}

/**
 * 정산 금액 계산 공통 함수.
 * Mock 정책: 판매수수료는 (정산대상금액 − 취소수수료) 기준으로 재계산하고, 취소수수료는 귀속 대상에 전액 배분합니다.
 */
export function calculateSettlement({
  grossAmount,
  discountAmount,
  paidAmount,
  refundAmount = 0,
  cancellationFee = 0,
  cancellationFeeOwner = DEFAULT_CANCELLATION_FEE_OWNER,
  affiliateCommissionRate,
  sellerCommissionRate = 0,
  adjustmentAmount = 0,
}: SettlementCalculationInput): SettlementBreakdown {
  const warnings: string[] = [];
  const gross = Math.max(0, grossAmount);
  const discount = Math.min(Math.max(0, discountAmount), gross);
  const paid = paidAmount === undefined ? gross - discount : Math.max(0, paidAmount);
  if (Math.max(0, refundAmount) + Math.max(0, cancellationFee) > paid) {
    warnings.push("환불금액과 취소수수료 합계가 고객 결제금액을 초과합니다.");
  }
  const refund = Math.min(Math.max(0, refundAmount), paid);
  const settlementBaseAmount = paid - refund;
  const fee = Math.min(Math.max(0, cancellationFee), settlementBaseAmount);
  const commissionBaseAmount = settlementBaseAmount - fee;
  if (!isValidRate(affiliateCommissionRate) || !isValidRate(sellerCommissionRate)) {
    warnings.push("수수료율은 0~100% 범위로 계산했습니다.");
  }
  const affiliateRate = clampRate(affiliateCommissionRate);
  const sellerRate = clampRate(sellerCommissionRate);
  const affiliateCommission = Math.round((commissionBaseAmount * affiliateRate) / 100);
  const sellerCommission = Math.round((commissionBaseAmount * sellerRate) / 100);
  const totalCommission = affiliateCommission + sellerCommission;
  if (totalCommission > commissionBaseAmount) {
    warnings.push("수수료 합계가 고객 결제금액을 초과합니다. 공급사 정산액은 0원으로 표시됩니다.");
  }
  if (fee > 0 && cancellationFeeOwner === "비율배분") {
    warnings.push("비율배분은 이번 단계에서 지원하지 않아 공급여행사 귀속으로 계산했습니다.");
  }
  const cancellationFeeShare = {
    supplier: cancellationFeeOwner === "판매여행사" || cancellationFeeOwner === "판매점" ? 0 : fee,
    sellingAgency: cancellationFeeOwner === "판매여행사" ? fee : 0,
    seller: cancellationFeeOwner === "판매점" ? fee : 0,
  };
  const supplierAmount = Math.max(0, commissionBaseAmount - totalCommission) + cancellationFeeShare.supplier;
  return {
    grossAmount: gross,
    discountAmount: discount,
    paidAmount: paid,
    refundAmount: refund,
    cancellationFee: fee,
    cancellationFeeOwner,
    settlementBaseAmount,
    commissionBaseAmount,
    affiliateCommissionRate: affiliateRate,
    affiliateCommission,
    sellerCommissionRate: sellerRate,
    sellerCommission,
    totalCommission,
    cancellationFeeShare,
    supplierAmount,
    sellingAgencyRevenue: affiliateCommission + cancellationFeeShare.sellingAgency,
    sellerRevenue: sellerCommission + cancellationFeeShare.seller,
    adjustmentAmount,
    finalSupplierAmount: supplierAmount + adjustmentAmount,
    warnings,
  };
}

export function formatWon(value: number) {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

/** 조정금액 표시: 기호를 항상 함께 표시합니다. (- ₩30,000 / + ₩10,000) */
export function formatSignedWon(value: number) {
  if (value < 0) return `- ${formatWon(Math.abs(value))}`;
  if (value > 0) return `+ ${formatWon(value)}`;
  return formatWon(0);
}

export function settlementStatusBadgeClass(status: SettlementStatus) {
  if (status === "정산확정") return "info";
  if (status === "지급대기") return "warn";
  if (status === "지급완료") return "success";
  if (status === "정산보류") return "danger";
  return "gray";
}

/** 정산 금액이 확정되어 자동 재계산하지 않는 상태 */
export function isSettlementAmountLocked(settlement: Pick<ReservationSettlement, "status" | "confirmedAmounts">) {
  return Boolean(settlement.confirmedAmounts) && settlement.status !== "정산대기";
}

/** ---------- 정산 조정 ---------- */

export const SETTLEMENT_ADJUSTMENT_CAUSES = ["환불조정", "취소수수료", "예약금액 변경", "관리자 수동조정"] as const;
export type SettlementAdjustmentCause = (typeof SETTLEMENT_ADJUSTMENT_CAUSES)[number];

export const SETTLEMENT_ADJUSTMENT_STATUSES = ["반영대기", "반영완료", "취소"] as const;
export type SettlementAdjustmentStatus = (typeof SETTLEMENT_ADJUSTMENT_STATUSES)[number];

export type SettlementAdjustmentApplyTo = "current" | "next";
export const SETTLEMENT_ADJUSTMENT_APPLY_LABELS: Record<SettlementAdjustmentApplyTo, string> = {
  current: "현재 정산 반영",
  next: "차기 정산 반영",
};

export type SettlementAdjustmentDirection = "추가정산" | "차감정산";

/** 정산 조정내역. amount는 공급사 정산액 기준 증감(+ 추가 / − 차감)입니다. */
export type SettlementAdjustment = {
  id: string;
  settlementCode: string;
  reservationCode: string;
  cause: SettlementAdjustmentCause;
  amount: number;
  applyTo: SettlementAdjustmentApplyTo;
  status: SettlementAdjustmentStatus;
  reason: string;
  memo: string;
  createdAt: string;
  createdBy?: ReservationActor;
  changes?: SettlementChange[];
  /** 차기 정산 반영 완료 시 반영된 정산번호 */
  appliedSettlementCode?: string;
  appliedAt?: string;
};

export type SettlementAdjustmentView = SettlementAdjustment & {
  direction: SettlementAdjustmentDirection;
  /** 차기 정산 반영 대상 (Mock: 같은 공급·판매 관계의 다음 미지급 정산) */
  targetSettlementCode?: string;
};

export function getAdjustmentDirection(amount: number): SettlementAdjustmentDirection {
  return amount < 0 ? "차감정산" : "추가정산";
}

export function adjustmentDirectionBadgeClass(direction: SettlementAdjustmentDirection) {
  return direction === "차감정산" ? "danger" : "success";
}

export function adjustmentCauseBadgeClass(cause: SettlementAdjustmentCause) {
  if (cause === "환불조정" || cause === "취소수수료") return "warn";
  if (cause === "예약금액 변경") return "info";
  return "gray";
}

export function adjustmentStatusBadgeClass(status: SettlementAdjustmentStatus) {
  if (status === "반영대기") return "warn";
  if (status === "반영완료") return "success";
  return "gray";
}

/** 정산상태별 조정 적용방식 (지급완료는 차기 정산 반영만 가능) */
export function getAdjustmentApplyOptions(status: SettlementStatus) {
  const paid = status === "지급완료";
  return {
    defaultValue: (paid ? "next" : "current") as SettlementAdjustmentApplyTo,
    current: {
      allowed: !paid && status !== "정산취소",
      label: status === "지급대기" ? "현재 정산 조정" : SETTLEMENT_ADJUSTMENT_APPLY_LABELS.current,
      reason: paid ? "지급완료된 정산은 현재 정산에 반영할 수 없습니다." : undefined,
    },
    next: { allowed: status !== "정산취소", label: SETTLEMENT_ADJUSTMENT_APPLY_LABELS.next },
  };
}

function resolveApplyTo(status: SettlementStatus, requested?: SettlementAdjustmentApplyTo): SettlementAdjustmentApplyTo {
  if (status === "지급완료") return "next";
  return requested ?? "current";
}

/** 세션 조정내역 (SAMPLE 시드 포함 · 새로고침 시 초기화) */
const adjustmentStore: SettlementAdjustment[] = [
  {
    id: "adj-260003-1",
    settlementCode: "STL-260003",
    reservationCode: "AOS-RSV-260003",
    cause: "예약금액 변경",
    amount: -17000,
    applyTo: "current",
    status: "반영대기",
    reason: "정산확정 이후 예약금액 변경 (₩296,000 → ₩276,000)",
    memo: "",
    createdAt: "2026-10-01 18:05",
    changes: [{ label: "공급사 정산액", before: "₩251,600", after: "₩234,600" }],
  },
];

/** ---------- 세션 state (새로고침 시 초기화) ---------- */

type SettlementSessionPatch = Partial<
  Pick<
    ReservationSettlement,
    | "status"
    | "affiliateCommissionRate"
    | "sellerCommissionRate"
    | "confirmedAmounts"
    | "hold"
    | "payment"
    | "cancellationFeeOwner"
    | "autoRecalculated"
    | "closing"
  >
>;

const sessionSettlementPatches: Record<string, SettlementSessionPatch> = {};

function patchSettlement(reservationCode: string, patch: SettlementSessionPatch) {
  sessionSettlementPatches[reservationCode] = { ...sessionSettlementPatches[reservationCode], ...patch };
}

export type SettlementAdjustmentState = "none" | "required" | "next";

export const SETTLEMENT_ADJUSTMENT_STATE_LABELS: Record<SettlementAdjustmentState, string> = {
  none: "조정없음",
  required: "조정필요",
  next: "차기정산 예정",
};

export type SettlementAmounts = {
  /** 기본 정산액: 확정 이후에는 확정 정산액, 정산대기는 취소 반영 전 계산액 */
  baseSupplierAmount: number;
  /** 환불/취소 · 예약금액 변경 조정 (현재 정산 반영분) */
  cancellationAdjustment: number;
  /** 관리자 수동조정 (현재 정산 반영분) */
  manualAdjustment: number;
  /** 이전 정산에서 넘어온 차기 정산 반영분 */
  carriedAdjustment: number;
  /** 최종 정산액 */
  finalSupplierAmount: number;
  /** 차기 정산 반영 예정 (현재 정산액 미포함) */
  nextAdjustment: number;
  /** 확정 이후 아직 조정내역이 생성되지 않은 차액 */
  unresolvedDifference: number;
  /** 현재 정산에 반영 대기 중인 조정 합계 */
  pendingCurrentAdjustment: number;
};

export type SettlementRecord = {
  settlementCode: string;
  reservation: ReservationDetail;
  settlement: ReservationSettlement;
  status: SettlementStatus;
  sourceType: Exclude<ReservationSourceType, "direct">;
  supplierAgencyName: string;
  sellingAgencyName: string;
  sellerName?: string;
  productCode: string;
  productName: string;
  departureAt: string;
  peopleCount: number;
  /** 화면에 사용하는 정산 금액 (확정 이후에는 확정 금액) */
  breakdown: SettlementBreakdown;
  /** 현재 예약 금액 기준 계산 */
  liveBreakdown: SettlementBreakdown;
  /** 취소/환불 반영 전 현재 예약 금액 기준 계산 */
  preCancellationBreakdown: SettlementBreakdown;
  /** 정산확정 이후 예약금액이 바뀌었는지 */
  amountChangedAfterConfirm: boolean;
  isReservationCancelled: boolean;
  cancellation?: ReservationCancellation;
  cancellationStatus: ReservationCancellationStatus;
  closeStatus: SettlementCloseStatus;
  /** 이 정산에서 발생한 조정내역 */
  adjustments: SettlementAdjustmentView[];
  /** 다른 정산에서 넘어온 차기 정산 반영분 */
  carriedAdjustments: SettlementAdjustmentView[];
  amounts: SettlementAmounts;
  adjustmentState: SettlementAdjustmentState;
};

type SettlementRecordBase = Omit<SettlementRecord, "adjustments" | "carriedAdjustments" | "amounts" | "adjustmentState">;

function normalizeFeeOwner(owner: CancellationFeeOwner | undefined, hasSeller: boolean): CancellationFeeOwner {
  if (!owner) return DEFAULT_CANCELLATION_FEE_OWNER;
  if (owner === "판매점" && !hasSeller) return DEFAULT_CANCELLATION_FEE_OWNER;
  return owner;
}

function toSettlementRecordBase(reservation: ReservationDetail): SettlementRecordBase | null {
  const source = reservation.source;
  if (!reservation.settlement || !source || source.type === "direct") return null;
  const settlement: ReservationSettlement = {
    ...reservation.settlement,
    ...sessionSettlementPatches[reservation.code],
  };
  const hasSeller = source.type === "seller";
  const rates = {
    affiliateCommissionRate: settlement.affiliateCommissionRate,
    sellerCommissionRate: hasSeller ? (settlement.sellerCommissionRate ?? 0) : 0,
  };
  const amountBase = {
    grossAmount: reservation.productAmount + reservation.optionAmount,
    discountAmount: reservation.discountAmount,
  };
  const cancellation = reservation.cancellation;
  const feeOwner = normalizeFeeOwner(settlement.cancellationFeeOwner, hasSeller);
  const preCancellationBreakdown = calculateSettlement({ ...amountBase, ...rates });
  const liveBreakdown = calculateSettlement({
    ...amountBase,
    ...rates,
    refundAmount: cancellation?.refundAmount,
    cancellationFee: cancellation?.cancellationFee,
    cancellationFeeOwner: feeOwner,
  });
  const locked = isSettlementAmountLocked(settlement);
  const confirmed = settlement.confirmedAmounts;
  const breakdown =
    locked && confirmed
      ? calculateSettlement({
          ...rates,
          grossAmount: confirmed.grossAmount,
          discountAmount: confirmed.discountAmount,
          refundAmount: confirmed.refundAmount,
          cancellationFee: confirmed.cancellationFee,
          cancellationFeeOwner: normalizeFeeOwner(confirmed.cancellationFeeOwner, hasSeller),
        })
      : liveBreakdown;
  const cancellationStatus = getReservationCancellationStatus(reservation);
  return {
    settlementCode: settlement.settlementCode,
    reservation,
    settlement,
    status: settlement.status,
    sourceType: source.type,
    supplierAgencyName: source.supplierAgencyName ?? "-",
    sellingAgencyName: source.sellingAgencyName ?? "-",
    sellerName: source.sellerName,
    productCode: source.originalProductCode ?? reservation.productName,
    productName: source.originalProductName ?? reservation.productName,
    departureAt: reservation.departureAt,
    peopleCount: reservation.counts.adult + reservation.counts.child + reservation.counts.infant,
    breakdown,
    liveBreakdown,
    preCancellationBreakdown,
    amountChangedAfterConfirm: locked && breakdown.supplierAmount !== liveBreakdown.supplierAmount,
    isReservationCancelled:
      cancellationStatus === "full" || ["취소", "취소요청", "취소완료"].includes(reservation.reserveStatus),
    cancellation,
    cancellationStatus,
    closeStatus: settlement.closing ? "마감완료" : "미마감",
  };
}

function relationKey(record: Pick<SettlementRecordBase, "supplierAgencyName" | "sellingAgencyName" | "sellerName">) {
  return `${record.supplierAgencyName}|${record.sellingAgencyName}|${record.sellerName ?? ""}`;
}

/** 차기 정산 대상 (Mock): 같은 공급·판매 관계에서 출발일이 같거나 이후인 미지급 정산 중 가장 빠른 건 */
function resolveNextSettlementTarget(sourceCode: string, bases: SettlementRecordBase[]) {
  const source = bases.find((item) => item.settlementCode === sourceCode);
  if (!source) return undefined;
  return bases
    .filter(
      (item) =>
        item.settlementCode !== sourceCode &&
        relationKey(item) === relationKey(source) &&
        item.status !== "지급완료" &&
        item.status !== "정산취소" &&
        item.departureAt >= source.departureAt,
    )
    .sort((a, b) => (a.departureAt === b.departureAt ? a.settlementCode.localeCompare(b.settlementCode) : a.departureAt < b.departureAt ? -1 : 1))[0]
    ?.settlementCode;
}

function toAdjustmentView(adjustment: SettlementAdjustment, bases: SettlementRecordBase[]): SettlementAdjustmentView {
  let targetSettlementCode: string | undefined;
  if (adjustment.applyTo === "next") {
    targetSettlementCode =
      adjustment.appliedSettlementCode ??
      (adjustment.status === "반영대기" ? resolveNextSettlementTarget(adjustment.settlementCode, bases) : undefined);
  }
  return { ...adjustment, direction: getAdjustmentDirection(adjustment.amount), targetSettlementCode };
}

const sumAmount = (items: { amount: number }[]) => items.reduce((total, item) => total + item.amount, 0);
const isActiveAdjustment = (adjustment: SettlementAdjustment) => adjustment.status !== "취소";
const isManualAdjustment = (adjustment: SettlementAdjustment) => adjustment.cause === "관리자 수동조정";

function attachAdjustments(base: SettlementRecordBase, bases: SettlementRecordBase[]): SettlementRecord {
  const adjustments = adjustmentStore
    .filter((adjustment) => adjustment.settlementCode === base.settlementCode)
    .map((adjustment) => toAdjustmentView(adjustment, bases));
  const carriedAdjustments = adjustmentStore
    .filter((adjustment) => adjustment.applyTo === "next" && adjustment.settlementCode !== base.settlementCode && isActiveAdjustment(adjustment))
    .map((adjustment) => toAdjustmentView(adjustment, bases))
    .filter((adjustment) => adjustment.targetSettlementCode === base.settlementCode);

  const locked = isSettlementAmountLocked(base.settlement);
  const current = adjustments.filter((adjustment) => adjustment.applyTo === "current" && isActiveAdjustment(adjustment));
  const systemCurrent = current.filter((adjustment) => !isManualAdjustment(adjustment));
  const systemAll = adjustments.filter((adjustment) => !isManualAdjustment(adjustment) && isActiveAdjustment(adjustment));

  const baseSupplierAmount = locked ? base.breakdown.supplierAmount : base.preCancellationBreakdown.supplierAmount;
  const cancellationAdjustment = locked
    ? sumAmount(systemCurrent)
    : base.liveBreakdown.supplierAmount - base.preCancellationBreakdown.supplierAmount;
  const manualAdjustment = sumAmount(current.filter(isManualAdjustment));
  const carriedAdjustment = sumAmount(carriedAdjustments);
  const nextAdjustment = sumAmount(
    adjustments.filter((adjustment) => adjustment.applyTo === "next" && adjustment.status === "반영대기"),
  );
  const unresolvedDifference =
    locked && base.status !== "정산취소"
      ? base.liveBreakdown.supplierAmount - base.breakdown.supplierAmount - sumAmount(systemAll)
      : 0;
  const pendingCurrentAdjustment = sumAmount(current.filter((adjustment) => adjustment.status === "반영대기"));

  const amounts: SettlementAmounts = {
    baseSupplierAmount,
    cancellationAdjustment,
    manualAdjustment,
    carriedAdjustment,
    finalSupplierAmount: baseSupplierAmount + cancellationAdjustment + manualAdjustment + carriedAdjustment,
    nextAdjustment,
    unresolvedDifference,
    pendingCurrentAdjustment,
  };

  const needsAdjustment =
    locked &&
    (unresolvedDifference !== 0 || systemCurrent.some((adjustment) => adjustment.status === "반영대기"));
  const adjustmentState: SettlementAdjustmentState = needsAdjustment ? "required" : nextAdjustment !== 0 ? "next" : "none";

  return { ...base, adjustments, carriedAdjustments, amounts, adjustmentState };
}

export function getSettlementRecords(): SettlementRecord[] {
  const bases = getReservationList()
    .map(toSettlementRecordBase)
    .filter((record): record is SettlementRecordBase => record !== null);
  return bases
    .map((base) => attachAdjustments(base, bases))
    .sort((a, b) => (a.departureAt === b.departureAt ? a.settlementCode.localeCompare(b.settlementCode) : a.departureAt < b.departureAt ? 1 : -1));
}

export function getSettlementRecord(settlementCode: string) {
  return getSettlementRecords().find((record) => record.settlementCode === settlementCode);
}

export function getSettlementRecordByReservation(reservationCode: string) {
  return getSettlementRecords().find((record) => record.reservation.code === reservationCode);
}

/** 정산조건 미리보기: 현재 예약 금액 · 취소값에 다른 수수료율을 적용합니다. */
export function previewSettlementRates(
  record: SettlementRecord,
  rates: { affiliateCommissionRate: number; sellerCommissionRate?: number },
) {
  const live = record.liveBreakdown;
  return calculateSettlement({
    grossAmount: live.grossAmount,
    discountAmount: live.discountAmount,
    refundAmount: live.refundAmount,
    cancellationFee: live.cancellationFee,
    cancellationFeeOwner: live.cancellationFeeOwner,
    affiliateCommissionRate: rates.affiliateCommissionRate,
    sellerCommissionRate: rates.sellerCommissionRate,
  });
}

export function getSettlementKpis(records: SettlementRecord[]) {
  return (["정산대기", "정산확정", "지급대기", "지급완료", "정산보류"] as const).map((status) => {
    const matched = records.filter((record) => record.status === status);
    return {
      status,
      count: matched.length,
      amount: matched.reduce((sum, record) => sum + record.amounts.finalSupplierAmount, 0),
    };
  });
}

/** ---------- 출발상품별 집계 ---------- */

export type SettlementDepartureGroup = {
  key: string;
  productCode: string;
  productName: string;
  departureAt: string;
  supplierAgencyName: string;
  records: SettlementRecord[];
  reservationCount: number;
  peopleCount: number;
  paidAmount: number;
  affiliateCommission: number;
  sellerCommission: number;
  /** 기본 정산액 합계 (계산 정산액) */
  baseSupplierAmount: number;
  /** 조정금액 합계 (차액조정 · 수동조정 · 이전 정산 반영분) */
  adjustmentAmount: number;
  /** 최종 정산액 합계 */
  supplierAmount: number;
  statusCounts: { status: SettlementStatus; count: number }[];
};

export function getSettlementDepartureKey(record: Pick<SettlementRecord, "productCode" | "departureAt">) {
  return `${record.productCode}_${record.departureAt}`;
}

/** 같은 원본 상품 · 출발일 정산을 묶습니다. 정산취소 건은 금액 합계에서 제외합니다. */
export function getSettlementDepartureGroups(records: SettlementRecord[]): SettlementDepartureGroup[] {
  const groups = new Map<string, SettlementRecord[]>();
  records.forEach((record) => {
    const key = getSettlementDepartureKey(record);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });
  return Array.from(groups.entries())
    .map(([key, items]) => {
      const active = items.filter((record) => record.status !== "정산취소");
      const sum = (pick: (record: SettlementRecord) => number) => active.reduce((total, record) => total + pick(record), 0);
      const baseSupplierAmount = sum((record) => record.breakdown.supplierAmount);
      const supplierAmount = sum((record) => record.amounts.finalSupplierAmount);
      return {
        key,
        productCode: items[0].productCode,
        productName: items[0].productName,
        departureAt: items[0].departureAt,
        supplierAgencyName: items[0].supplierAgencyName,
        records: items,
        reservationCount: items.length,
        peopleCount: sum((record) => record.peopleCount),
        paidAmount: sum((record) => record.breakdown.paidAmount),
        affiliateCommission: sum((record) => record.breakdown.affiliateCommission),
        sellerCommission: sum((record) => record.breakdown.sellerCommission),
        baseSupplierAmount,
        adjustmentAmount: supplierAmount - baseSupplierAmount,
        supplierAmount,
        statusCounts: SETTLEMENT_STATUSES.map((status) => ({
          status,
          count: items.filter((record) => record.status === status).length,
        })).filter((item) => item.count > 0),
      };
    })
    .sort((a, b) => (a.departureAt < b.departureAt ? 1 : -1));
}

/** ---------- 정산 Action 가능 여부 ---------- */

export type SettlementActionKey = "confirm" | "paymentPending" | "paymentComplete" | "hold" | "resume" | "cancel";

/** closed: 정산마감 완료 건은 보류·정산취소를 제한합니다. (마감 해제는 이번 단계 미지원) */
export function getSettlementActionAvailability(status: SettlementStatus, closed = false): Record<SettlementActionKey, boolean> {
  return {
    confirm: status === "정산대기",
    paymentPending: status === "정산확정",
    paymentComplete: status === "지급대기",
    hold: (status === "정산대기" || status === "정산확정") && !closed,
    resume: status === "정산보류",
    cancel: status !== "지급완료" && status !== "정산취소" && !closed,
  };
}

export function isSettlementClosed(record: Pick<SettlementRecord, "settlement">) {
  return Boolean(record.settlement.closing);
}

/** 취소/환불 · 조정 입력 가능 여부 */
export function canAdjustSettlement(status: SettlementStatus) {
  return status !== "정산취소";
}

/** 정산 처리는 통합 관리자 또는 해당 공급여행사 관점에서만 (SAMPLE) */
export function canManageSettlement(record: SettlementRecord, viewer: ReservationViewer) {
  if (viewer.type === "integrated") return true;
  return viewer.type === "supplierAgency" && viewer.agencyName === record.supplierAgencyName;
}

/** ---------- 정산확정 기준 체크 ---------- */

export type SettlementCheckState = "ok" | "warning" | "blocker";

export type SettlementConfirmationCheck = {
  key: string;
  label: string;
  state: SettlementCheckState;
  detail: string;
};

export type SettlementConfirmationStatus = {
  canConfirm: boolean;
  blockers: string[];
  warnings: string[];
  checks: SettlementConfirmationCheck[];
};

/** 정산확정 가능 여부 (Mock 상태 기반). 치명적 문제는 blockers, 단순 안내는 warnings */
export function getSettlementConfirmationStatus(record: SettlementRecord): SettlementConfirmationStatus {
  const reservation = record.reservation;
  const source = reservation.source;
  const live = record.liveBreakdown;
  const checks: SettlementConfirmationCheck[] = [];

  const fullyCancelled = record.cancellationStatus === "full" || reservation.reserveStatus === "취소완료";
  const closed = Boolean(source?.closedAt) || ["예약마감", "행사완료"].includes(reservation.reserveStatus) || fullyCancelled;
  checks.push({
    key: "closed",
    label: "예약마감 완료",
    state: closed ? "ok" : "warning",
    detail: closed ? (source?.closedAt ? `${source.closedAt} 마감` : reservation.reserveStatus) : "예약마감 미완료",
  });

  const handedOver = Boolean(source?.handoverAt) || fullyCancelled || source?.type === "direct";
  checks.push({
    key: "handover",
    label: "운영인계 완료",
    state: handedOver ? "ok" : "blocker",
    detail: handedOver
      ? source?.handoverAt
        ? `${source.handoverAt} 인계`
        : fullyCancelled
          ? "취소 예약 · 인계 불필요"
          : "자사 예약 · 인계 불필요"
      : "운영인계가 완료되어야 정산을 확정할 수 있습니다.",
  });

  const paymentOk = reservation.paymentStatus === "결제완료" || reservation.paymentStatus === "환불완료";
  checks.push({
    key: "payment",
    label: "고객 결제금액 확인",
    state: paymentOk ? "ok" : "warning",
    detail: paymentOk ? `${formatWon(live.paidAmount)} · ${reservation.paymentStatus}` : `결제상태 ${reservation.paymentStatus} · 결제금액 확인 필요`,
  });

  const cancelPending = reservation.reserveStatus === "취소요청" || reservation.paymentStatus === "환불진행";
  const cancelledWithoutInput = record.isReservationCancelled && !record.cancellation;
  checks.push({
    key: "cancellation",
    label: "취소/환불 확인",
    state: cancelPending || cancelledWithoutInput ? "blocker" : "ok",
    detail: cancelPending
      ? "취소/환불 미확정"
      : cancelledWithoutInput
        ? "취소 예약의 환불금액·취소수수료 미입력"
        : record.cancellation
          ? `${record.cancellationStatus === "full" ? "전체취소" : "부분취소"} 반영 · 환불 ${formatWon(record.cancellation.refundAmount)}`
          : "취소 없음",
  });

  const amountError =
    live.totalCommission > live.commissionBaseAmount ||
    live.refundAmount + live.cancellationFee > live.paidAmount ||
    !isValidRate(record.settlement.affiliateCommissionRate) ||
    !isValidRate(record.settlement.sellerCommissionRate ?? 0);
  checks.push({
    key: "commission",
    label: "판매수수료 확인",
    state: amountError ? "blocker" : "ok",
    detail: amountError
      ? "정산금액 오류 · 수수료 또는 환불금액을 확인해주세요."
      : `수수료 ${formatWon(live.totalCommission)} · 공급사 정산액 ${formatWon(live.supplierAmount)}`,
  });

  const blockers = checks.filter((check) => check.state === "blocker").map((check) => check.detail);
  const warnings = checks.filter((check) => check.state === "warning").map((check) => check.detail);
  if (record.amounts.finalSupplierAmount < 0) {
    warnings.push(`조정 반영 후 최종 정산액이 ${formatSignedWon(record.amounts.finalSupplierAmount)}입니다. 차감 잔액 처리를 확인해주세요.`);
  }
  return { canConfirm: blockers.length === 0, blockers, warnings, checks };
}

/** ---------- 정산마감 기준 체크 ---------- */

export type SettlementCloseCheckStatus = {
  canClose: boolean;
  blockers: string[];
  warnings: string[];
  checks: SettlementConfirmationCheck[];
};

/**
 * 정산마감 가능 여부 (Mock 상태 기반).
 * 정산확정 체크(getSettlementConfirmationStatus)의 취소/환불 · 금액오류 결과를 재사용하고,
 * 마감에 필요한 정산확정 · 운영인계 · 조정내역 확인을 추가로 판단합니다.
 */
export function getSettlementCloseStatus(record: SettlementRecord): SettlementCloseCheckStatus {
  const confirmation = getSettlementConfirmationStatus(record);
  const confirmationCheck = (key: string) => confirmation.checks.find((check) => check.key === key);
  const b = record.breakdown;
  const amounts = record.amounts;
  const checks: SettlementConfirmationCheck[] = [];

  const confirmed = record.status === "정산확정" || Boolean(record.settlement.closing);
  checks.push({
    key: "confirmed",
    label: "정산확정 완료",
    state: confirmed ? "ok" : "blocker",
    detail: confirmed ? `확정 정산액 ${formatWon(b.supplierAmount)}` : `현재 ${record.status} · 정산확정 후 마감할 수 있습니다.`,
  });

  const handover = confirmationCheck("handover");
  checks.push({
    key: "handover",
    label: "운영인계 완료",
    state: handover?.state === "ok" ? "ok" : "blocker",
    detail: handover?.state === "ok" ? handover.detail : "운영인계가 완료되어야 정산을 마감할 수 있습니다.",
  });

  const payment = confirmationCheck("payment");
  if (payment) checks.push(payment);

  const cancellation = confirmationCheck("cancellation");
  if (cancellation) checks.push(cancellation);

  const commissionError = confirmationCheck("commission")?.state === "blocker";
  checks.push({
    key: "affiliateCommission",
    label: "판매수수료 확인",
    state: commissionError || !isValidRate(record.settlement.affiliateCommissionRate) ? "blocker" : "ok",
    detail: `${record.sellingAgencyName} · ${b.affiliateCommissionRate}% · ${formatWon(b.affiliateCommission)}`,
  });
  if (record.sellerName) {
    checks.push({
      key: "sellerCommission",
      label: "판매점 수수료 확인",
      state: commissionError || !isValidRate(record.settlement.sellerCommissionRate ?? 0) ? "blocker" : "ok",
      detail: `${record.sellerName} · ${b.sellerCommissionRate}% · ${formatWon(b.sellerCommission)}`,
    });
  }

  const pendingCurrent = record.adjustments.filter((adjustment) => adjustment.applyTo === "current" && adjustment.status === "반영대기");
  checks.push({
    key: "adjustment",
    label: "조정내역 확인",
    state: amounts.unresolvedDifference !== 0 ? "blocker" : "ok",
    detail:
      amounts.unresolvedDifference !== 0
        ? `조정내역이 생성되지 않은 차액 ${formatSignedWon(amounts.unresolvedDifference)} · 차액조정을 먼저 생성해주세요.`
        : pendingCurrent.length
          ? `반영대기 조정 ${pendingCurrent.length}건 포함 · 최종 정산액 ${formatWon(amounts.finalSupplierAmount)}`
          : `조정 ${record.adjustments.filter((adjustment) => adjustment.status !== "취소").length}건 · 최종 정산액 ${formatWon(amounts.finalSupplierAmount)}`,
  });

  const blockers = checks.filter((check) => check.state === "blocker").map((check) => `${check.label}: ${check.detail}`);
  const warnings = checks.filter((check) => check.state === "warning").map((check) => `${check.label}: ${check.detail}`);
  if (record.settlement.closing) blockers.unshift("이미 정산마감된 정산입니다.");
  if (amounts.finalSupplierAmount < 0) {
    warnings.push(`최종 정산액이 ${formatSignedWon(amounts.finalSupplierAmount)}입니다. 차감 잔액 처리를 확인해주세요.`);
  }
  if (amounts.nextAdjustment !== 0) {
    warnings.push(`차기 정산 반영 예정 ${formatSignedWon(amounts.nextAdjustment)}은 이번 마감 금액에 포함되지 않습니다.`);
  }
  return { canClose: blockers.length === 0, blockers, warnings, checks };
}

/** ---------- 조회 관점 ---------- */

export type SettlementPerspective = {
  title: string;
  description: string;
  items: { label: string; value: string; emphasis?: boolean }[];
};

/** 조회 관점별 정산 요약 (공급여행사 / 판매여행사 / 판매점) */
export function getSettlementPerspective(record: SettlementRecord, viewer: ReservationViewer): SettlementPerspective {
  const b = record.breakdown;
  const amounts = record.amounts;
  const hasCancellation = b.refundAmount > 0 || b.cancellationFee > 0;
  const salesLabel = hasCancellation ? "정산대상금액" : "총 판매금액";
  const adjustment = amounts.finalSupplierAmount - b.supplierAmount;
  if (viewer.type === "sellingAgency") {
    return {
      title: `판매여행사 관점 · ${record.sellingAgencyName}`,
      description: "지급할 금액 / 판매수익",
      items: [
        { label: hasCancellation ? "정산대상금액" : "고객 결제", value: formatWon(b.settlementBaseAmount) },
        { label: "공급사 지급", value: formatWon(amounts.finalSupplierAmount) },
        ...(record.sellerName ? [{ label: "판매점 지급", value: formatWon(b.sellerRevenue) }] : []),
        { label: "판매여행사 수익", value: formatWon(b.sellingAgencyRevenue), emphasis: true },
      ],
    };
  }
  if (viewer.type === "seller") {
    return {
      title: `판매점 관점 · ${record.sellerName ?? "-"}`,
      description: "받을 판매수수료",
      items: [
        { label: hasCancellation ? "정산대상금액" : "예약금액", value: formatWon(b.settlementBaseAmount) },
        { label: "수수료율", value: `${b.sellerCommissionRate}%` },
        { label: "받을 수수료", value: formatWon(b.sellerRevenue), emphasis: true },
        { label: "지급상태", value: record.status === "지급완료" ? "지급완료" : "지급 전" },
      ],
    };
  }
  return {
    title: viewer.type === "supplierAgency" ? `공급여행사 관점 · ${record.supplierAgencyName}` : "통합 관리자 · 공급여행사 기준",
    description: "받을 정산금액",
    items: [
      { label: salesLabel, value: formatWon(b.settlementBaseAmount) },
      { label: "판매수수료", value: `- ${formatWon(b.affiliateCommission)}` },
      ...(record.sellerName ? [{ label: "판매점 수수료", value: `- ${formatWon(b.sellerCommission)}` }] : []),
      ...(adjustment !== 0 ? [{ label: "정산 조정", value: formatSignedWon(adjustment) }] : []),
      { label: "받을 정산금액", value: formatWon(amounts.finalSupplierAmount), emphasis: true },
    ],
  };
}

/** 정산 조건(수수료율) Mock 수정은 정산대기에서만 */
export function canEditSettlementTerms(status: SettlementStatus) {
  return status === "정산대기";
}

/** ---------- 정산이력 ---------- */

export type SettlementHistoryType =
  | "created"
  | "confirmed"
  | "payment_pending"
  | "payment_complete"
  | "held"
  | "resumed"
  | "cancelled"
  | "terms_update"
  | "reservation_cancel"
  | "partial_cancel"
  | "refund"
  | "adjustment_deduct"
  | "adjustment_add"
  | "manual_adjustment"
  | "next_settlement"
  | "auto_recalculated"
  | "adjustment_cancelled"
  | "closed"
  | "document_draft"
  | "document_issued"
  | "document_requested"
  | "document_confirmed"
  | "document_disputed"
  | "document_dispute_acknowledged"
  | "document_reissued"
  | "document_cancelled";

export const SETTLEMENT_HISTORY_LABELS: Record<SettlementHistoryType, string> = {
  created: "정산생성",
  confirmed: "정산확정",
  payment_pending: "지급대기",
  payment_complete: "지급완료",
  held: "정산보류",
  resumed: "정산재개",
  cancelled: "정산취소",
  terms_update: "정산조건 수정",
  reservation_cancel: "예약취소",
  partial_cancel: "부분취소",
  refund: "환불",
  adjustment_deduct: "차감정산",
  adjustment_add: "추가정산",
  manual_adjustment: "수동조정",
  next_settlement: "차기정산 반영",
  auto_recalculated: "정산 재계산",
  adjustment_cancelled: "조정취소",
  closed: "정산마감",
  document_draft: "정산서 작성중",
  document_issued: "정산서 발행",
  document_requested: "정산서 확인 요청",
  document_confirmed: "정산서 확인완료",
  document_disputed: "이의제기",
  document_dispute_acknowledged: "이의내용 확인",
  document_reissued: "정산서 재발행",
  document_cancelled: "발행 취소",
};

export function settlementHistoryBadgeClass(type: SettlementHistoryType) {
  if (
    type === "confirmed" ||
    type === "manual_adjustment" ||
    type === "auto_recalculated" ||
    type === "closed" ||
    type === "document_issued" ||
    type === "document_reissued"
  ) {
    return "info";
  }
  if (
    type === "payment_pending" ||
    type === "partial_cancel" ||
    type === "refund" ||
    type === "next_settlement" ||
    type === "document_requested" ||
    type === "document_dispute_acknowledged"
  ) {
    return "warn";
  }
  if (type === "payment_complete" || type === "resumed" || type === "adjustment_add" || type === "document_confirmed") return "success";
  if (type === "held" || type === "cancelled" || type === "reservation_cancel" || type === "adjustment_deduct" || type === "document_disputed") {
    return "danger";
  }
  return "gray";
}

export type SettlementHistoryEntry = {
  id: string;
  at: string;
  type: SettlementHistoryType;
  actor?: ReservationActor;
  description: string;
  /** 변경 전/후 금액 (사용자 표시용 라벨) */
  changes?: SettlementChange[];
};

const SETTLEMENT_HISTORY: Record<string, SettlementHistoryEntry[]> = {
  "STL-260002": [
    { id: "sh-2-1", at: "2026-09-28 10:05", type: "created", description: "예약 확정에 따라 정산건이 생성되었습니다." },
    { id: "sh-2-2", at: "2026-10-01 13:00", type: "confirmed", actor: { name: "김민재", agency: "행복투어" }, description: `공급사 정산액 ${formatWon(186300)} 확정` },
  ],
  "STL-260003": [
    { id: "sh-3-1", at: "2026-09-18 11:00", type: "created", description: "예약 확정에 따라 정산건이 생성되었습니다." },
    { id: "sh-3-2", at: "2026-09-25 13:00", type: "confirmed", actor: { name: "김민재", agency: "행복투어" }, description: `공급사 정산액 ${formatWon(251600)} 확정` },
    { id: "sh-3-3", at: "2026-09-26 15:10", type: "payment_pending", actor: { name: "김민재", agency: "행복투어" }, description: "지급대기 처리" },
    {
      id: "sh-3-4",
      at: "2026-10-01 18:05",
      type: "adjustment_deduct",
      description: `예약금액 변경 · 차감정산 ${formatWon(17000)} · 현재 정산 반영`,
      changes: [
        { label: "고객 결제금액", before: formatWon(296000), after: formatWon(276000) },
        { label: "공급사 정산액", before: formatWon(251600), after: formatWon(234600) },
      ],
    },
  ],
  "STL-260005": [
    { id: "sh-5-1", at: "2026-09-20 10:20", type: "created", description: "예약 확정에 따라 정산건이 생성되었습니다." },
    { id: "sh-5-2", at: "2026-09-29 13:00", type: "confirmed", actor: { name: "장윤호", agency: "애비아넥스트" }, description: `공급사 정산액 ${formatWon(180000)} 확정` },
    { id: "sh-5-2a", at: "2026-09-29 13:30", type: "closed", actor: { name: "장윤호", agency: "애비아넥스트" }, description: `최종 정산액 ${formatWon(180000)} 기준으로 정산마감 처리` },
    { id: "sh-5-2b", at: "2026-09-29 14:00", type: "document_issued", actor: { name: "장윤호", agency: "애비아넥스트" }, description: `AOS-ST-202609-0001 · 정산서 v1 · 최종 정산액 ${formatWon(180000)}` },
    { id: "sh-5-2c", at: "2026-09-29 14:05", type: "document_requested", actor: { name: "장윤호", agency: "애비아넥스트" }, description: "현담여행사 · AOS-ST-202609-0001 v1 확인 요청 (실제 이메일/알림톡 미발송)" },
    { id: "sh-5-2d", at: "2026-09-30 10:20", type: "document_confirmed", actor: { name: "이도현", agency: "현담여행사" }, description: `AOS-ST-202609-0001 v1 정산내역 확인완료 · 최종 정산액 ${formatWon(180000)}` },
    { id: "sh-5-3", at: "2026-09-30 15:10", type: "payment_pending", actor: { name: "장윤호", agency: "애비아넥스트" }, description: "지급대기 처리" },
    { id: "sh-5-4", at: "2026-10-01 09:30", type: "payment_complete", actor: { name: "장윤호", agency: "애비아넥스트" }, description: `${formatWon(180000)} 계좌이체` },
  ],
  "STL-260007": [
    { id: "sh-7-1", at: "2026-09-15 14:00", type: "created", description: "예약 확정에 따라 정산건이 생성되었습니다." },
    {
      id: "sh-7-2",
      at: "2026-09-24 11:00",
      type: "reservation_cancel",
      actor: { name: "한지민", agency: "그래가자" },
      description: `고객 환불 ${formatWon(118000)} / 취소수수료 ${formatWon(20000)} · 사유: 고객 요청`,
      changes: [
        { label: "정산대상금액", before: formatWon(138000), after: formatWon(20000) },
        { label: "판매수수료", before: formatWon(13800), after: formatWon(0) },
        { label: "공급사 정산액", before: formatWon(124200), after: formatWon(20000) },
      ],
    },
    { id: "sh-7-3", at: "2026-09-24 11:20", type: "held", actor: { name: "김민재", agency: "행복투어" }, description: "보류사유: 취소/환불 확인 · 고객 취소에 따른 환불금액 확인 필요" },
  ],
};

const sessionSettlementHistory: Record<string, SettlementHistoryEntry[]> = {};

export function addSettlementHistory(settlementCode: string, entry: Omit<SettlementHistoryEntry, "id">) {
  const list = sessionSettlementHistory[settlementCode] ?? [];
  list.push({ ...entry, id: `sh-${settlementCode}-s${list.length + 1}` });
  sessionSettlementHistory[settlementCode] = list;
}

/** 최신순 정산이력 */
export function getSettlementHistory(record: SettlementRecord): SettlementHistoryEntry[] {
  const base = SETTLEMENT_HISTORY[record.settlementCode] ?? [
    {
      id: `sh-${record.settlementCode}-0`,
      at: record.settlement.createdAt,
      type: "created" as const,
      description: "예약 확정에 따라 정산건이 생성되었습니다.",
    },
  ];
  return [...base, ...(sessionSettlementHistory[record.settlementCode] ?? [])]
    .map((entry, order) => ({ entry, order }))
    .sort((a, b) => (a.entry.at === b.entry.at ? b.order - a.order : a.entry.at < b.entry.at ? 1 : -1))
    .map(({ entry }) => ({ ...entry, changes: entry.changes?.map((change) => ({ ...change })) }));
}

/** 정산 계산 결과 변경 전/후 (사용자 표시용) */
function breakdownChanges(before: SettlementBreakdown, after: SettlementBreakdown, hasSeller: boolean): SettlementChange[] {
  const rows: [string, number, number][] = [
    ["정산대상금액", before.settlementBaseAmount, after.settlementBaseAmount],
    ["판매수수료", before.affiliateCommission, after.affiliateCommission],
    ...(hasSeller ? ([["판매점 수수료", before.sellerCommission, after.sellerCommission]] as [string, number, number][]) : []),
    ["공급사 정산액", before.supplierAmount, after.supplierAmount],
  ];
  return rows
    .filter(([, prev, next]) => prev !== next)
    .map(([label, prev, next]) => ({ label, before: formatWon(prev), after: formatWon(next) }));
}

/** ---------- 정산 업무 Action (즉시 반영) ---------- */

export function confirmSettlement(record: SettlementRecord, actor: ReservationActor, at: string) {
  if (!getSettlementActionAvailability(record.status).confirm) return;
  if (!getSettlementConfirmationStatus(record).canConfirm) return;
  const live = record.liveBreakdown;
  patchSettlement(record.reservation.code, {
    status: "정산확정",
    autoRecalculated: undefined,
    confirmedAmounts: {
      grossAmount: live.grossAmount,
      discountAmount: live.discountAmount,
      refundAmount: live.refundAmount,
      cancellationFee: live.cancellationFee,
      cancellationFeeOwner: live.cancellationFeeOwner,
    },
  });
  const final = record.amounts.finalSupplierAmount;
  addSettlementHistory(record.settlementCode, {
    at,
    type: "confirmed",
    actor,
    description: `공급사 정산액 ${formatWon(live.supplierAmount)} 확정${final !== live.supplierAmount ? ` · 조정 반영 최종 ${formatWon(final)}` : ""}`,
  });
}

/** 정산마감: 현재 계산 결과와 조정내역 기준 최종 정산액을 마감 금액으로 기록합니다. */
export function closeSettlement(record: SettlementRecord, actor: ReservationActor, at: string) {
  if (!getSettlementCloseStatus(record).canClose) return false;
  const final = record.amounts.finalSupplierAmount;
  patchSettlement(record.reservation.code, { closing: { closedAt: at, closedBy: actor, finalSupplierAmount: final } });
  addSettlementHistory(record.settlementCode, {
    at,
    type: "closed",
    actor,
    description: `최종 정산액 ${formatWon(final)} 기준으로 정산마감 처리`,
  });
  return true;
}

/** 정산서 확인 등 추가 조건은 settlement-document-data의 getSettlementPaymentPendingStatus에서 판단합니다. */
export function markSettlementPaymentPending(record: SettlementRecord, actor: ReservationActor, at: string) {
  if (!getSettlementActionAvailability(record.status).paymentPending) return;
  patchSettlement(record.reservation.code, { status: "지급대기" });
  addSettlementHistory(record.settlementCode, { at, type: "payment_pending", actor, description: "지급대기 처리" });
}

function updateAdjustment(id: string, patch: Partial<SettlementAdjustment>) {
  const index = adjustmentStore.findIndex((adjustment) => adjustment.id === id);
  if (index >= 0) adjustmentStore[index] = { ...adjustmentStore[index], ...patch };
}

/**
 * 지급완료: 지급금액이 조정 반영 최종 정산액과 같으면 반영대기 조정을 반영완료 처리하고,
 * 다르면 현재 정산 반영대기 조정을 차기 정산으로 넘깁니다.
 */
export function completeSettlementPayment(
  record: SettlementRecord,
  payment: Omit<SettlementPayment, "processedBy">,
  actor: ReservationActor,
  at: string,
) {
  if (!getSettlementActionAvailability(record.status).paymentComplete) return;
  const final = record.amounts.finalSupplierAmount;
  const pendingCurrent = record.adjustments.filter((adjustment) => adjustment.applyTo === "current" && adjustment.status === "반영대기");
  const pendingCarried = record.carriedAdjustments.filter((adjustment) => adjustment.status === "반영대기");
  patchSettlement(record.reservation.code, { status: "지급완료", payment: { ...payment, processedBy: actor } });
  const mismatch = payment.amount !== final ? " · 최종 정산액과 다름" : "";
  addSettlementHistory(record.settlementCode, {
    at,
    type: "payment_complete",
    actor,
    description: `${formatWon(payment.amount)} ${payment.method}${mismatch}${payment.memo ? ` · ${payment.memo}` : ""}`,
  });
  if (payment.amount === final) {
    pendingCurrent.forEach((adjustment) => updateAdjustment(adjustment.id, { status: "반영완료", appliedAt: at }));
    pendingCarried.forEach((adjustment) => {
      updateAdjustment(adjustment.id, { status: "반영완료", appliedAt: at, appliedSettlementCode: record.settlementCode });
      addSettlementHistory(adjustment.settlementCode, {
        at,
        type: "next_settlement",
        actor,
        description: `${adjustment.direction} ${formatWon(Math.abs(adjustment.amount))} · ${record.settlementCode} 지급에 반영완료`,
      });
    });
    if (pendingCarried.length) {
      addSettlementHistory(record.settlementCode, {
        at,
        type: "next_settlement",
        actor,
        description: `이전 정산 조정 ${formatSignedWon(sumAmount(pendingCarried))} 반영완료 (${pendingCarried.map((item) => item.settlementCode).join(", ")})`,
      });
    }
    return;
  }
  if (pendingCurrent.length) {
    pendingCurrent.forEach((adjustment) => updateAdjustment(adjustment.id, { applyTo: "next" }));
    addSettlementHistory(record.settlementCode, {
      at,
      type: "next_settlement",
      actor,
      description: `지급금액이 조정 반영 금액과 달라 조정금액 ${formatSignedWon(sumAmount(pendingCurrent))}을 차기 정산으로 이월`,
    });
  }
}

export function holdSettlement(
  record: SettlementRecord,
  reason: SettlementHoldReason,
  detail: string,
  actor: ReservationActor,
  at: string,
) {
  if (!getSettlementActionAvailability(record.status, isSettlementClosed(record)).hold) return;
  patchSettlement(record.reservation.code, {
    status: "정산보류",
    hold: { reason, detail: detail.trim(), heldAt: at, heldBy: actor },
  });
  addSettlementHistory(record.settlementCode, {
    at,
    type: "held",
    actor,
    description: `보류사유: ${reason}${detail.trim() ? ` · ${detail.trim()}` : ""}`,
  });
}

/** 보류 해제: 정산대기로 되돌리고 현재 예약금액 기준으로 다시 계산합니다. (반영대기 차액조정은 재계산에 포함되므로 취소) */
export function resumeSettlement(record: SettlementRecord, actor: ReservationActor, at: string) {
  if (!getSettlementActionAvailability(record.status).resume) return;
  patchSettlement(record.reservation.code, { status: "정산대기", hold: undefined, confirmedAmounts: undefined });
  const superseded = record.adjustments.filter((adjustment) => !isManualAdjustment(adjustment) && adjustment.status === "반영대기");
  superseded.forEach((adjustment) => updateAdjustment(adjustment.id, { status: "취소" }));
  addSettlementHistory(record.settlementCode, {
    at,
    type: "resumed",
    actor,
    description: `보류 해제 · 정산대기로 변경${superseded.length ? ` · 차액조정 ${superseded.length}건은 재계산으로 대체되어 취소` : ""}`,
  });
}

export function cancelSettlement(record: SettlementRecord, actor: ReservationActor, at: string) {
  if (!getSettlementActionAvailability(record.status, isSettlementClosed(record)).cancel) return;
  patchSettlement(record.reservation.code, { status: "정산취소" });
  addSettlementHistory(record.settlementCode, { at, type: "cancelled", actor, description: `${record.status} → 정산취소` });
}

export function updateSettlementTerms(
  record: SettlementRecord,
  rates: { affiliateCommissionRate: number; sellerCommissionRate?: number },
  actor: ReservationActor,
  at: string,
): boolean {
  if (!canEditSettlementTerms(record.status)) return false;
  const changes: string[] = [];
  if (rates.affiliateCommissionRate !== record.settlement.affiliateCommissionRate) {
    changes.push(`판매수수료율: ${record.settlement.affiliateCommissionRate}% → ${rates.affiliateCommissionRate}%`);
  }
  if (record.sourceType === "seller" && rates.sellerCommissionRate !== record.settlement.sellerCommissionRate) {
    changes.push(`판매점 수수료율: ${record.settlement.sellerCommissionRate ?? 0}% → ${rates.sellerCommissionRate ?? 0}%`);
  }
  if (!changes.length) return false;
  patchSettlement(record.reservation.code, {
    affiliateCommissionRate: clampRate(rates.affiliateCommissionRate),
    sellerCommissionRate: record.sourceType === "seller" ? clampRate(rates.sellerCommissionRate ?? 0) : undefined,
  });
  addSettlementHistory(record.settlementCode, { at, type: "terms_update", actor, description: changes.join(" / ") });
  return true;
}

/** ---------- 예약 변경 · 취소/환불 · 조정 ---------- */

function pushAdjustment(adjustment: Omit<SettlementAdjustment, "id">) {
  const count = adjustmentStore.filter((item) => item.settlementCode === adjustment.settlementCode).length;
  const id = `adj-${adjustment.settlementCode}-s${count + 1}`;
  adjustmentStore.push({ ...adjustment, id });
  return id;
}

function addNextSettlementHistory(settlementCode: string, adjustmentId: string, actor: ReservationActor | undefined, at: string) {
  const record = getSettlementRecord(settlementCode);
  const view = record?.adjustments.find((adjustment) => adjustment.id === adjustmentId);
  if (!view) return;
  addSettlementHistory(settlementCode, {
    at,
    type: "next_settlement",
    actor,
    description: `${view.direction} ${formatWon(Math.abs(view.amount))} 차기 정산 반영 예정 · ${
      view.targetSettlementCode ? `대상 정산 ${view.targetSettlementCode}` : "다음 정산 생성 시 반영"
    }`,
  });
}

/** 확정 이후 아직 조정되지 않은 차액으로 조정내역을 생성합니다. */
export function createSettlementDifferenceAdjustment(
  record: SettlementRecord,
  actor: ReservationActor | undefined,
  at: string,
  options: { cause?: SettlementAdjustmentCause; applyTo?: SettlementAdjustmentApplyTo; reason?: string; changes?: SettlementChange[] } = {},
) {
  const difference = record.amounts.unresolvedDifference;
  if (!difference || !canAdjustSettlement(record.status)) return null;
  const cause = options.cause ?? "예약금액 변경";
  const applyTo = resolveApplyTo(record.status, options.applyTo);
  const live = record.liveBreakdown.supplierAmount;
  const changes = options.changes?.length
    ? options.changes
    : [{ label: "공급사 정산액", before: formatWon(live - difference), after: formatWon(live) }];
  const direction = getAdjustmentDirection(difference);
  const id = pushAdjustment({
    settlementCode: record.settlementCode,
    reservationCode: record.reservation.code,
    cause,
    amount: difference,
    applyTo,
    status: "반영대기",
    reason: options.reason ?? `${record.status} 이후 ${cause}`,
    memo: "",
    createdAt: at,
    createdBy: actor,
    changes,
  });
  addSettlementHistory(record.settlementCode, {
    at,
    type: difference < 0 ? "adjustment_deduct" : "adjustment_add",
    actor,
    description: `${cause} · ${direction} ${formatWon(Math.abs(difference))} · ${SETTLEMENT_ADJUSTMENT_APPLY_LABELS[applyTo]}`,
    changes,
  });
  if (applyTo === "next") addNextSettlementHistory(record.settlementCode, id, actor, at);
  return id;
}

/**
 * 예약 변경 후 정산 동기화.
 * 정산대기: 자동 재계산(조정건 미생성) / 정산확정·지급대기: 차액조정 생성 / 지급완료: 차기 정산 조정 생성
 */
export function syncSettlementAfterReservationChange(
  before: SettlementRecord,
  actor: ReservationActor,
  at: string,
  options: { cause?: SettlementAdjustmentCause; applyTo?: SettlementAdjustmentApplyTo; reason?: string } = {},
) {
  const after = getSettlementRecord(before.settlementCode);
  if (!after || after.status === "정산취소") return;
  const changes = breakdownChanges(before.liveBreakdown, after.liveBreakdown, Boolean(after.sellerName));
  if (!isSettlementAmountLocked(after.settlement)) {
    if (!changes.length) return;
    patchSettlement(after.reservation.code, { autoRecalculated: { at, changes } });
    addSettlementHistory(after.settlementCode, {
      at,
      type: "auto_recalculated",
      actor,
      description: "예약 변경사항이 정산금액에 자동 반영되었습니다. (조정건 미생성)",
      changes,
    });
    return;
  }
  createSettlementDifferenceAdjustment(after, actor, at, { ...options, changes });
}

export type SettlementCancellationInput = {
  type: ReservationCancellationType;
  refundAmount: number;
  cancellationFee: number;
  feeOwner: CancellationFeeOwner;
  reason: string;
  memo: string;
  applyTo?: SettlementAdjustmentApplyTo;
};

/** 환불금액 · 취소수수료 Validation (오류는 적용 차단, 경고는 안내) */
export function validateSettlementCancellation(
  paidAmount: number,
  input: Pick<SettlementCancellationInput, "type" | "refundAmount" | "cancellationFee" | "reason" | "feeOwner">,
) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { refundAmount, cancellationFee } = input;
  if (!Number.isFinite(refundAmount) || refundAmount < 0) errors.push("환불금액은 0원 이상이어야 합니다.");
  if (!Number.isFinite(cancellationFee) || cancellationFee < 0) errors.push("취소수수료는 0원 이상이어야 합니다.");
  if (refundAmount > paidAmount) errors.push(`환불금액은 고객 결제금액(${formatWon(paidAmount)})을 초과할 수 없습니다.`);
  if (cancellationFee > paidAmount) errors.push(`취소수수료는 고객 결제금액(${formatWon(paidAmount)})을 초과할 수 없습니다.`);
  if (refundAmount >= 0 && cancellationFee >= 0 && refundAmount + cancellationFee > paidAmount) {
    errors.push(`환불금액과 취소수수료 합계(${formatWon(refundAmount + cancellationFee)})가 고객 결제금액(${formatWon(paidAmount)})을 초과합니다.`);
  }
  if (refundAmount === 0 && cancellationFee === 0) errors.push("환불금액 또는 취소수수료를 입력해주세요.");
  if (!input.reason.trim()) errors.push("처리사유를 선택해주세요.");
  if (input.feeOwner === "비율배분") errors.push("비율배분은 이번 단계에서 지원하지 않습니다.");
  if (!errors.length && input.type === "full" && refundAmount + cancellationFee < paidAmount) {
    warnings.push(
      `전체취소이지만 환불금액과 취소수수료 합계가 결제금액보다 ${formatWon(paidAmount - refundAmount - cancellationFee)} 적습니다. 차액은 정산대상금액에 남습니다.`,
    );
  }
  if (!errors.length && input.type === "partial" && refundAmount + cancellationFee === paidAmount) {
    warnings.push("부분취소이지만 결제금액 전체가 환불/취소수수료로 처리됩니다. 전체취소 여부를 확인해주세요.");
  }
  return { errors, warnings };
}

/** 취소/환불 Mock 처리 후 정산상태에 따라 재계산 또는 조정내역을 생성합니다. 오류가 있으면 오류 목록을 반환합니다. */
export function applySettlementCancellation(
  record: SettlementRecord,
  input: SettlementCancellationInput,
  actor: ReservationActor,
  at: string,
): string[] {
  if (!canAdjustSettlement(record.status)) return ["정산취소된 정산은 취소/환불을 처리할 수 없습니다."];
  const { errors } = validateSettlementCancellation(record.liveBreakdown.paidAmount, input);
  if (errors.length) return errors;
  const previous = record.cancellation;
  const previousOwner = record.liveBreakdown.cancellationFeeOwner;
  applyReservationCancellation(record.reservation.code, {
    type: input.type,
    refundAmount: input.refundAmount,
    cancellationFee: input.cancellationFee,
    reason: input.reason,
    memo: input.memo.trim(),
    processedAt: at,
    processedBy: actor,
  });
  patchSettlement(record.reservation.code, { cancellationFeeOwner: input.feeOwner });
  const historyType: SettlementHistoryType =
    previous && previous.type === input.type ? "refund" : input.type === "full" ? "reservation_cancel" : "partial_cancel";
  const inputChanges: SettlementChange[] = [
    { label: "환불금액", before: formatWon(previous?.refundAmount ?? 0), after: formatWon(input.refundAmount) },
    { label: "취소수수료", before: formatWon(previous?.cancellationFee ?? 0), after: formatWon(input.cancellationFee) },
    { label: "취소수수료 귀속", before: previousOwner, after: input.feeOwner },
  ].filter((change) => change.before !== change.after);
  addSettlementHistory(record.settlementCode, {
    at,
    type: historyType,
    actor,
    description: `고객 환불 ${formatWon(input.refundAmount)} / 취소수수료 ${formatWon(input.cancellationFee)} · 사유: ${input.reason}${
      input.memo.trim() ? ` · ${input.memo.trim()}` : ""
    }`,
    changes: inputChanges,
  });
  const cause: SettlementAdjustmentCause =
    previous && previous.refundAmount === input.refundAmount ? "취소수수료" : "환불조정";
  syncSettlementAfterReservationChange(record, actor, at, {
    cause,
    applyTo: input.applyTo,
    reason: `${input.type === "full" ? "전체취소" : "부분취소"} · ${input.reason}`,
  });
  return [];
}

export type ManualAdjustmentInput = {
  direction: "add" | "deduct";
  amount: number;
  reason: string;
  memo: string;
  applyTo: SettlementAdjustmentApplyTo;
};

export function validateManualAdjustment(input: Pick<ManualAdjustmentInput, "amount" | "reason">, status: SettlementStatus) {
  const errors: string[] = [];
  if (!Number.isFinite(input.amount) || input.amount <= 0) errors.push("조정금액은 0원보다 커야 합니다.");
  if (!input.reason.trim()) errors.push("조정사유를 입력해주세요.");
  if (!canAdjustSettlement(status)) errors.push("정산취소된 정산은 조정할 수 없습니다.");
  return errors;
}

/** 관리자 수동조정 (프론트 state 저장). 지급완료 정산은 차기 정산 반영으로만 저장합니다. */
export function addManualSettlementAdjustment(
  record: SettlementRecord,
  input: ManualAdjustmentInput,
  actor: ReservationActor,
  at: string,
): string[] {
  const errors = validateManualAdjustment(input, record.status);
  if (errors.length) return errors;
  const applyTo = resolveApplyTo(record.status, input.applyTo);
  const amount = input.direction === "deduct" ? -Math.round(input.amount) : Math.round(input.amount);
  const final = record.amounts.finalSupplierAmount;
  const changes =
    applyTo === "current" ? [{ label: "최종 정산액", before: formatWon(final), after: formatWon(final + amount) }] : [];
  const id = pushAdjustment({
    settlementCode: record.settlementCode,
    reservationCode: record.reservation.code,
    cause: "관리자 수동조정",
    amount,
    applyTo,
    status: "반영대기",
    reason: input.reason.trim(),
    memo: input.memo.trim(),
    createdAt: at,
    createdBy: actor,
    changes,
  });
  addSettlementHistory(record.settlementCode, {
    at,
    type: "manual_adjustment",
    actor,
    description: `${getAdjustmentDirection(amount)} ${formatWon(Math.abs(amount))} · ${SETTLEMENT_ADJUSTMENT_APPLY_LABELS[applyTo]} · 사유: ${input.reason.trim()}`,
    changes,
  });
  if (applyTo === "next") addNextSettlementHistory(record.settlementCode, id, actor, at);
  return [];
}

/** 반영대기 조정 취소 */
export function cancelSettlementAdjustment(record: SettlementRecord, adjustmentId: string, actor: ReservationActor, at: string) {
  const adjustment = record.adjustments.find((item) => item.id === adjustmentId);
  if (!adjustment || adjustment.status !== "반영대기") return false;
  updateAdjustment(adjustmentId, { status: "취소" });
  addSettlementHistory(record.settlementCode, {
    at,
    type: "adjustment_cancelled",
    actor,
    description: `${adjustment.cause} · ${adjustment.direction} ${formatWon(Math.abs(adjustment.amount))} 조정 취소`,
  });
  return true;
}
