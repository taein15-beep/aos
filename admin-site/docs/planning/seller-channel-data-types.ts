/**
 * AOS 공급여행사 ↔ 판매점 채널 데이터 모델 — 목표 TypeScript 타입 · 상태 · 계산 Helper (참고용)
 *
 * - 설계 문서 `seller-channel-data-model.md`의 Entity · 상태값 · 상태전이 · 계산정책을 코드로 옮긴 참고 자료입니다.
 * - 실행 코드에서 import 하지 않으며 화면 · Mock 데이터와 연결되어 있지 않습니다.
 * - DB 테이블 · API 스펙이 아닙니다. 실제 연동 시 `lib/` 하위 Domain 모듈의 출발점으로 사용합니다.
 * - 상태값은 저장용 코드(영문 대문자)와 화면 표시용 Label을 분리합니다. 현재 Prototype은 한글 Label을 값으로 사용합니다.
 * - 금액은 원화 정수(Won), 수수료율은 백분율 숫자(10 = 10%), 일시는 ISO 8601 문자열입니다.
 */

/* ================================================================ 공통 */

/** 내부 식별자 — FK로 사용. 화면 표시 · 검색 · 외부 참조에는 Code를 사용합니다. */
type Id<Brand extends string> = string & { readonly __entity: Brand };

export type SupplierId = Id<"Supplier">;
export type SellerId = Id<"Seller">;
export type SupplierSellerRelationId = Id<"SupplierSellerRelation">;
export type ProductId = Id<"Product">;
export type SellerProductId = Id<"SellerProduct">;
export type ReservationId = Id<"Reservation">;
export type CustomerId = Id<"Customer">;
export type PaymentId = Id<"Payment">;
export type CancellationRequestId = Id<"CancellationRequest">;
export type RefundId = Id<"Refund">;
export type InvoiceId = Id<"Invoice">;
export type InvoiceVersionId = Id<"InvoiceVersion">;
export type SettlementId = Id<"Settlement">;
export type SettlementItemId = Id<"SettlementItem">;
export type SettlementAdjustmentId = Id<"SettlementAdjustment">;
export type SettlementStatementId = Id<"SettlementStatement">;
export type SettlementPaymentId = Id<"SettlementPayment">;
export type SellerPayoutAccountId = Id<"SellerPayoutAccount">;
export type UserId = Id<"User">;

/** 표시 Code — FK로 사용하지 않습니다. */
export type SupplierCode = string; // SUP00001
export type SellerCode = string; // SEL00032
export type ProductCode = string; // HT-WINE01
export type ReservationCode = string; // RSV-20261012-001
export type InvoiceCode = string; // INV-20261012-001
export type SettlementCode = string; // STL-202610-HT-001

/** ISO 8601 일시 (예: 2026-10-12T15:11:00+09:00) — 화면에서 KST로 Format */
export type IsoDateTime = string;
/** YYYY-MM-DD */
export type IsoDate = string;
/** 원화 정수 금액 — Float 금지 · 표시만 `65,000원` */
export type Won = number;
/** 백분율 숫자 (10 = 10%) — 소수 2자리까지 허용, DB는 Decimal(5,2) 권장 */
export type PercentRate = number;

export const ACTOR_TYPES = ["SELLER", "SUPPLIER", "SYSTEM", "ADMIN"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export type Actor = { type: ActorType; id: string; name: string };

/** 핵심 Entity 공통 Audit 필드 */
export type AuditFields = {
  createdAt: IsoDateTime;
  createdBy: Actor | null;
  updatedAt: IsoDateTime;
  updatedBy: Actor | null;
};

/* ================================================================ 상태값 (코드 → 화면 Label 단일 매핑) */

export const SUPPLIER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const SELLER_ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED", "WITHDRAWN"] as const;
export type SellerAccountStatus = (typeof SELLER_ACCOUNT_STATUSES)[number];

export const RELATION_STATUSES = ["PENDING", "ACTIVE", "INACTIVE", "REJECTED"] as const;
export type RelationStatus = (typeof RELATION_STATUSES)[number];

export const PRODUCT_STATUSES = ["ACTIVE", "STOPPED", "ENDED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const SALES_MODES = ["COMMISSION", "DEPOSIT"] as const;
export type SalesMode = (typeof SALES_MODES)[number];

/** 판매점 자체 판매상태 — 실제 판매가능 여부는 EffectiveSaleStatus로 계산 */
export const SELLER_SALE_STATUSES = ["ACTIVE", "STOPPED"] as const;
export type SellerSaleStatus = (typeof SELLER_SALE_STATUSES)[number];

export const EFFECTIVE_SALE_STATUSES = ["ON_SALE", "SETUP_REQUIRED", "STOPPED"] as const;
export type EffectiveSaleStatus = (typeof EFFECTIVE_SALE_STATUSES)[number];

export const SALE_STOP_REASONS = [
  "SUPPLIER_RELATION_INACTIVE",
  "PRODUCT_STOPPED",
  "PRODUCT_ENDED",
  "SELLER_STOPPED",
  "RESUME_CONFIRMATION_REQUIRED",
  "PRICE_NOT_CONFIGURED",
] as const;
export type SaleStopReason = (typeof SALE_STOP_REASONS)[number];

export const RESERVATION_STATUSES = [
  "RECEIVED",
  "CONFIRMED",
  "CANCELLATION_REQUESTED",
  "CANCELLATION_APPROVED",
  "CANCELLED",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CANCELLATION_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "COMPLETED"] as const;
export type CancellationStatus = (typeof CANCELLATION_STATUSES)[number];

export const REFUND_STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const INVOICE_STATUSES = ["NORMAL", "REISSUE_REQUIRED", "CANCELLED", "VOID"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const SETTLEMENT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "MODIFICATION_REQUIRED",
  "RECONFIRMATION_REQUIRED",
  "PAID",
] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const SETTLEMENT_PAYMENT_STATUSES = ["WAITING", "PAID"] as const;
export type SettlementPaymentStatus = (typeof SETTLEMENT_PAYMENT_STATUSES)[number];

export const SETTLEMENT_ITEM_STATUSES = ["NORMAL", "ADJUSTED", "ADJUSTMENT_PENDING", "CARRIED_OVER", "CANCELLING"] as const;
export type SettlementItemStatus = (typeof SETTLEMENT_ITEM_STATUSES)[number];

export const ADJUSTMENT_TYPES = ["CANCELLATION"] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export const ADJUSTMENT_STATUSES = ["PENDING", "SCHEDULED", "APPLIED"] as const;
export type AdjustmentStatus = (typeof ADJUSTMENT_STATUSES)[number];

export const STATEMENT_STATUSES = ["CURRENT", "VOID"] as const;
export type StatementStatus = (typeof STATEMENT_STATUSES)[number];

/** 화면 Label — 현재 Prototype 표기와 동일하게 유지 */
export const STATUS_LABELS = {
  supplier: { ACTIVE: "정상", SUSPENDED: "이용중지" },
  sellerAccount: { ACTIVE: "정상", SUSPENDED: "이용제한", WITHDRAWN: "탈퇴" },
  relation: { PENDING: "승인대기", ACTIVE: "정상", INACTIVE: "이용중지", REJECTED: "승인거절" },
  product: { ACTIVE: "판매중", STOPPED: "판매중지", ENDED: "운영종료" },
  salesMode: { COMMISSION: "수수료형", DEPOSIT: "입금가형" },
  sellerSale: { ACTIVE: "판매", STOPPED: "판매점 자체중지" },
  effectiveSale: { ON_SALE: "판매중", SETUP_REQUIRED: "설정대기", STOPPED: "판매중지" },
  saleStopReason: {
    SUPPLIER_RELATION_INACTIVE: "공급여행사 거래 이용중지",
    PRODUCT_STOPPED: "공급여행사 판매중지",
    PRODUCT_ENDED: "상품 운영종료",
    SELLER_STOPPED: "판매점 자체중지",
    RESUME_CONFIRMATION_REQUIRED: "재개확인 필요",
    PRICE_NOT_CONFIGURED: "판매가 미설정",
  },
  reservation: {
    RECEIVED: "예약접수",
    CONFIRMED: "예약확정",
    CANCELLATION_REQUESTED: "취소요청",
    CANCELLATION_APPROVED: "취소승인",
    CANCELLED: "취소완료",
  },
  payment: { UNPAID: "미결제", PARTIALLY_PAID: "일부결제", PAID: "결제완료", REFUNDED: "환불완료" },
  cancellation: { REQUESTED: "검토대기", APPROVED: "취소승인", REJECTED: "취소거절", COMPLETED: "취소완료" },
  refund: { PENDING: "환불대기", COMPLETED: "환불완료", FAILED: "환불실패" },
  invoice: { NORMAL: "정상", REISSUE_REQUIRED: "재발행 필요", CANCELLED: "취소", VOID: "무효" },
  settlement: {
    PENDING: "정산대기",
    CONFIRMED: "정산확정",
    MODIFICATION_REQUIRED: "수정필요",
    RECONFIRMATION_REQUIRED: "재확인대기",
    PAID: "지급완료",
  },
  settlementPayment: { WAITING: "지급대기", PAID: "지급완료" },
  settlementItem: {
    NORMAL: "정상",
    ADJUSTED: "반영완료",
    ADJUSTMENT_PENDING: "반영대기",
    CARRIED_OVER: "차기정산 반영예정",
    CANCELLING: "취소처리중",
  },
  adjustment: { PENDING: "반영대기", SCHEDULED: "차기정산 대기", APPLIED: "반영완료" },
} as const;

/* ================================================================ Entity */

export type Supplier = AuditFields & {
  id: SupplierId;
  supplierCode: SupplierCode;
  name: string;
  businessName: string;
  businessNumber: string;
  representativeName: string;
  phone: string;
  email: string;
  address: string;
  status: SupplierStatus;
};

/** 판매점 자체 계정/사업자 — 공급여행사 관계상태와 분리 */
export type Seller = AuditFields & {
  id: SellerId;
  sellerCode: SellerCode;
  loginId: string;
  name: string;
  businessName: string;
  businessNumber: string;
  representativeName: string;
  managerName: string;
  phone: string;
  email: string;
  address: string;
  accountStatus: SellerAccountStatus;
};

/** 판매점 정산 지급계좌 — 화면 · 응답에는 Masking 값만 노출 */
export type SellerPayoutAccount = AuditFields & {
  id: SellerPayoutAccountId;
  sellerId: SellerId;
  bankCode: string;
  bankName: string;
  /** 저장 시 암호화 대상 — UI/응답 노출 금지 */
  accountNumberEncrypted: string;
  accountNumberMasked: string;
  accountHolder: string;
  verifiedAt: IsoDateTime | null;
  status: "ACTIVE" | "INACTIVE";
};

/** 공급여행사 ↔ 판매점 N:M 관계 — 삭제하지 않고 상태로 관리 */
export type SupplierSellerRelation = AuditFields & {
  id: SupplierSellerRelationId;
  supplierId: SupplierId;
  sellerId: SellerId;
  status: RelationStatus;
  appliedAt: IsoDateTime;
  approvedAt: IsoDateTime | null;
  rejectedAt: IsoDateTime | null;
  suspendedAt: IsoDateTime | null;
  resumedAt: IsoDateTime | null;
  rejectionReason: string | null;
};

/** 공급여행사 원본상품 — 판매점은 수정 불가 */
export type Product = AuditFields & {
  id: ProductId;
  productCode: ProductCode;
  supplierId: SupplierId;
  name: string;
  status: ProductStatus;
  stopReason: string | null;
  description: string;
  itinerary: { day: number; time: string | null; title: string; description: string | null }[];
  images: { url: string; alt: string }[];
  travelPeriod: { nights: number; days: number };
  cancellationPolicy: { minDaysBefore: number; maxDaysBefore: number | null; feeRatePercent: PercentRate }[];
};

/** 공급여행사가 특정 판매점에 부여한 판매권한 + 판매점별 판매조건 */
export type SellerProduct = AuditFields & {
  id: SellerProductId;
  productId: ProductId;
  supplierId: SupplierId;
  sellerId: SellerId;
  relationId: SupplierSellerRelationId;
  salesMode: SalesMode;
  /** COMMISSION: 공급여행사 설정 판매가(1인) */
  supplierSalePrice: Won | null;
  /** COMMISSION: 공급여행사 설정 */
  commissionRate: PercentRate | null;
  /** DEPOSIT: 공급여행사 설정 입금가(1인) */
  depositPrice: Won | null;
  /** DEPOSIT: 판매점 설정 최종 판매가(1인) — 미설정 null */
  sellerSalePrice: Won | null;
  sellerSaleStatus: SellerSaleStatus;
  /** 상위 원인(관계 · 상품) 발생 시점에 판매중이던 상품 — 상위 원인 해소 후에도 판매점 재개확인 전까지 판매중지 */
  resumeConfirmationRequired: boolean;
  allowedAt: IsoDateTime;
  /** 판매허용 해제 (Hard Delete 대신) */
  revokedAt: IsoDateTime | null;
  sellerStoppedAt: IsoDateTime | null;
  sellerResumedAt: IsoDateTime | null;
};

/** 예약 생성 당시 판매조건 — 생성 후 변경 금지 */
export type ReservationPricingSnapshot = {
  salesMode: SalesMode;
  unitSalePrice: Won;
  depositPrice: Won | null;
  commissionRate: PercentRate | null;
  headCount: number;
  totalReservationAmount: Won;
  expectedSellerIncome: Won;
};

export type ReservationCustomerSnapshot = {
  customerId: CustomerId | null;
  name: string;
  phoneMasked: string;
  email: string | null;
};

export type Reservation = AuditFields & {
  id: ReservationId;
  reservationCode: ReservationCode;
  sellerId: SellerId;
  supplierId: SupplierId;
  relationId: SupplierSellerRelationId;
  sellerProductId: SellerProductId;
  productId: ProductId;
  /** 예약 당시 상품명 · 코드 (표시용 Snapshot) */
  productSnapshot: { productCode: ProductCode; name: string };
  customer: ReservationCustomerSnapshot;
  reservationStatus: ReservationStatus;
  paymentStatus: PaymentStatus;
  bookedAt: IsoDateTime;
  travelDate: IsoDate;
  pricing: ReservationPricingSnapshot;
  paidAmount: Won;
  operationsHandoverAt: IsoDateTime | null;
};

export type ReservationStatusHistory = {
  id: string;
  reservationId: ReservationId;
  fromStatus: ReservationStatus | null;
  toStatus: ReservationStatus;
  actorType: ActorType;
  actorId: string;
  reason: string | null;
  createdAt: IsoDateTime;
};

export type CancellationRequest = AuditFields & {
  id: CancellationRequestId;
  reservationId: ReservationId;
  /** 시스템 등록주체 — 고객 전화 요청도 판매점 등록이면 SELLER */
  requestedByType: ActorType;
  requestedById: string;
  requestedAt: IsoDateTime;
  reasonCode: string;
  reasonText: string | null;
  customerMessage: string | null;
  /** 거절 시 복원할 예약상태 (RECEIVED | CONFIRMED) */
  previousReservationStatus: Extract<ReservationStatus, "RECEIVED" | "CONFIRMED">;
  status: CancellationStatus;
  reviewedBy: Actor | null;
  reviewedAt: IsoDateTime | null;
  rejectionReason: string | null;
  /** 고객 부과 취소수수료 — 판매점 정산 수익과 연결하지 않음 */
  cancellationFee: Won | null;
  expectedRefundAmount: Won | null;
  reviewMemo: string | null;
  completedAt: IsoDateTime | null;
};

/** 환불 1회 시도 = 1 Row (실패 후 재시도는 새 Row) */
export type Refund = AuditFields & {
  id: RefundId;
  reservationId: ReservationId;
  paymentId: PaymentId | null;
  cancellationRequestId: CancellationRequestId;
  refundMethod: "ORIGINAL_PAYMENT" | "BANK_TRANSFER";
  refundAmount: Won;
  status: RefundStatus;
  processedAt: IsoDateTime | null;
  processedBy: Actor | null;
  reference: string | null;
  memo: string | null;
  failureReason: string | null;
};

export type InvoiceSnapshot = {
  supplier: { supplierCode: SupplierCode; name: string; businessNumber: string };
  seller: { sellerCode: SellerCode; name: string; businessNumber: string };
  reservation: { reservationCode: ReservationCode; status: ReservationStatus; productName: string; travelDate: IsoDate };
  pricing: ReservationPricingSnapshot;
  payment: { status: PaymentStatus; paidAmount: Won; refundAmount: Won; cancellationFee: Won | null };
  /** 이 Version 청구금액 — 일반: 총 예약금액 · 취소: 고객 최종 부담금 */
  amount: Won;
};

export type Invoice = AuditFields & {
  id: InvoiceId;
  invoiceCode: InvoiceCode;
  reservationId: ReservationId;
  sellerId: SellerId;
  supplierId: SupplierId;
  /** 현재 유효 Version 번호 — 한 시점에 1개 */
  currentVersion: number;
  status: Exclude<InvoiceStatus, "VOID">;
};

export type InvoiceVersion = {
  id: InvoiceVersionId;
  invoiceId: InvoiceId;
  version: number;
  /** 과거 Version은 VOID · 현재 Version은 Invoice.status와 동일 */
  status: InvoiceStatus;
  issuedAt: IsoDateTime;
  issuedBy: Actor;
  amount: Won;
  reason: string;
  snapshot: InvoiceSnapshot;
};

/** 공급여행사 × 판매점 × 기간 — 공급여행사별로 반드시 분리 */
export type Settlement = AuditFields & {
  id: SettlementId;
  settlementCode: SettlementCode;
  supplierId: SupplierId;
  sellerId: SellerId;
  relationId: SupplierSellerRelationId;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  status: SettlementStatus;
  paymentStatus: SettlementPaymentStatus;
  /** Σ SettlementItem.originalSellerIncome */
  baseAmount: Won;
  /** Σ SettlementItem.adjustmentAmount + Σ 반영된 SettlementAdjustment.amount (0 또는 음수) */
  adjustmentAmount: Won;
  /** baseAmount + adjustmentAmount — PAID 이후 불변 */
  finalAmount: Won;
  currentStatementVersion: number | null;
  operationsHandoverCompleted: boolean;
  sellerConfirmedVersion: number | null;
  paidAmount: Won | null;
};

export type SettlementItem = {
  id: SettlementItemId;
  settlementId: SettlementId;
  reservationId: ReservationId;
  salesMode: SalesMode;
  /** 예약 Snapshot의 expectedSellerIncome */
  originalSellerIncome: Won;
  /** 이 정산에 반영된 조정 (취소 시 -originalSellerIncome) */
  adjustmentAmount: Won;
  /** originalSellerIncome + adjustmentAmount */
  finalSettlementAmount: Won;
  status: SettlementItemStatus;
};

/** 지급완료 후 취소 등 정산 간 이월 조정 */
export type SettlementAdjustment = AuditFields & {
  id: SettlementAdjustmentId;
  supplierId: SupplierId;
  sellerId: SellerId;
  reservationId: ReservationId;
  sourceSettlementId: SettlementId;
  targetSettlementId: SettlementId | null;
  adjustmentType: AdjustmentType;
  /** 음수 */
  amount: Won;
  status: AdjustmentStatus;
  appliedAt: IsoDateTime | null;
};

export type SettlementStatement = {
  id: SettlementStatementId;
  settlementId: SettlementId;
  version: number;
  status: StatementStatus;
  issuedAt: IsoDateTime;
  issuedBy: Actor;
  baseAmount: Won;
  adjustmentAmount: Won;
  finalAmount: Won;
  reason: string;
  snapshot: { items: Pick<SettlementItem, "reservationId" | "originalSellerIncome" | "adjustmentAmount" | "finalSettlementAmount">[] };
};

export type SettlementPayment = {
  id: SettlementPaymentId;
  settlementId: SettlementId;
  amount: Won;
  method: "BANK_TRANSFER" | "OTHER";
  paidAt: IsoDate;
  reference: string | null;
  paidBy: Actor;
  memo: string | null;
  settlementStatementVersion: number;
  payoutAccountSnapshot: { bankName: string; accountNumberMasked: string; accountHolder: string };
  createdAt: IsoDateTime;
};

export type SettlementStatusHistory = {
  id: string;
  settlementId: SettlementId;
  fromStatus: SettlementStatus | null;
  toStatus: SettlementStatus;
  actorType: ActorType;
  actorId: string;
  reason: string | null;
  createdAt: IsoDateTime;
};

/* ================================================================ 상태전이 */

type TransitionMap<S extends string> = Readonly<Record<S, readonly S[]>>;

export const RELATION_TRANSITIONS: TransitionMap<RelationStatus> = {
  PENDING: ["ACTIVE", "REJECTED"],
  ACTIVE: ["INACTIVE"],
  INACTIVE: ["ACTIVE"],
  REJECTED: ["PENDING"],
};

export const PRODUCT_TRANSITIONS: TransitionMap<ProductStatus> = {
  ACTIVE: ["STOPPED", "ENDED"],
  STOPPED: ["ACTIVE", "ENDED"],
  ENDED: [],
};

export const SELLER_SALE_TRANSITIONS: TransitionMap<SellerSaleStatus> = {
  ACTIVE: ["STOPPED"],
  STOPPED: ["ACTIVE"],
};

/** CANCELLATION_REQUESTED → RECEIVED/CONFIRMED 는 거절 시 previousReservationStatus 복원만 허용 */
export const RESERVATION_TRANSITIONS: TransitionMap<ReservationStatus> = {
  RECEIVED: ["CONFIRMED", "CANCELLATION_REQUESTED"],
  CONFIRMED: ["CANCELLATION_REQUESTED"],
  CANCELLATION_REQUESTED: ["CANCELLATION_APPROVED", "RECEIVED", "CONFIRMED"],
  CANCELLATION_APPROVED: ["CANCELLED"],
  CANCELLED: [],
};

export const CANCELLATION_TRANSITIONS: TransitionMap<CancellationStatus> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["COMPLETED"],
  REJECTED: [],
  COMPLETED: [],
};

/** FAILED 는 종료상태 — 재시도는 새 Refund Row 생성 */
export const REFUND_TRANSITIONS: TransitionMap<RefundStatus> = {
  PENDING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

/** 현재 Version 기준 — 재발행 시 현재 Version은 VOID, 새 Version이 NORMAL/CANCELLED */
export const INVOICE_TRANSITIONS: TransitionMap<InvoiceStatus> = {
  NORMAL: ["REISSUE_REQUIRED", "VOID"],
  REISSUE_REQUIRED: ["VOID"],
  CANCELLED: ["VOID"],
  VOID: [],
};

export const SETTLEMENT_TRANSITIONS: TransitionMap<SettlementStatus> = {
  PENDING: ["CONFIRMED"],
  CONFIRMED: ["MODIFICATION_REQUIRED", "PAID"],
  MODIFICATION_REQUIRED: ["RECONFIRMATION_REQUIRED"],
  RECONFIRMATION_REQUIRED: ["CONFIRMED", "MODIFICATION_REQUIRED"],
  PAID: [],
};

export const ADJUSTMENT_TRANSITIONS: TransitionMap<AdjustmentStatus> = {
  PENDING: ["SCHEDULED", "APPLIED"],
  SCHEDULED: ["APPLIED"],
  APPLIED: [],
};

export const SETTLEMENT_PAYMENT_TRANSITIONS: TransitionMap<SettlementPaymentStatus> = {
  WAITING: ["PAID"],
  PAID: [],
};

export function canTransition<S extends string>(map: TransitionMap<S>, from: S, to: S): boolean {
  return map[from].includes(to);
}

/* ================================================================ 판매상태 계산 */

export type EffectiveSaleResult = {
  status: EffectiveSaleStatus;
  reason: SaleStopReason | null;
};

/** 판매점 상품목록 노출 대상 — 승인대기 · 승인거절 관계의 상품은 노출하지 않음 */
export function isSellerProductVisible(relationStatus: RelationStatus, sellerProduct: Pick<SellerProduct, "revokedAt">) {
  return (relationStatus === "ACTIVE" || relationStatus === "INACTIVE") && sellerProduct.revokedAt === null;
}

/**
 * 실제 판매가능 여부 — 1.관계 > 2.상품 > 3.판매점 자체상태(재개확인 포함) > 4.입금가형 판매가
 * 상위 원인이 해소되어도 하위 상태(STOPPED · 재개확인 필요)는 자동 해제하지 않음
 */
export function getSellerProductEffectiveStatus(input: {
  relationStatus: RelationStatus;
  productStatus: ProductStatus;
  sellerProduct: Pick<SellerProduct, "salesMode" | "sellerSaleStatus" | "resumeConfirmationRequired" | "depositPrice" | "sellerSalePrice">;
}): EffectiveSaleResult {
  const { relationStatus, productStatus, sellerProduct } = input;
  if (relationStatus !== "ACTIVE") return { status: "STOPPED", reason: "SUPPLIER_RELATION_INACTIVE" };
  if (productStatus === "ENDED") return { status: "STOPPED", reason: "PRODUCT_ENDED" };
  if (productStatus !== "ACTIVE") return { status: "STOPPED", reason: "PRODUCT_STOPPED" };
  if (sellerProduct.sellerSaleStatus === "STOPPED") return { status: "STOPPED", reason: "SELLER_STOPPED" };
  if (sellerProduct.resumeConfirmationRequired) return { status: "STOPPED", reason: "RESUME_CONFIRMATION_REQUIRED" };
  if (sellerProduct.salesMode === "DEPOSIT") {
    const { depositPrice, sellerSalePrice } = sellerProduct;
    if (depositPrice === null || sellerSalePrice === null || sellerSalePrice < depositPrice) {
      return { status: "SETUP_REQUIRED", reason: "PRICE_NOT_CONFIGURED" };
    }
  }
  return { status: "ON_SALE", reason: null };
}

/* ================================================================ 금액 계산 */

/** 예약 1건 Snapshot 생성 — COMMISSION: 판매가×인원×수수료율 / DEPOSIT: (판매가-입금가)×인원 */
export function buildPricingSnapshot(
  sellerProduct: Pick<SellerProduct, "salesMode" | "supplierSalePrice" | "commissionRate" | "depositPrice" | "sellerSalePrice">,
  headCount: number,
): ReservationPricingSnapshot | null {
  const isCommission = sellerProduct.salesMode === "COMMISSION";
  const unitSalePrice = isCommission ? sellerProduct.supplierSalePrice : sellerProduct.sellerSalePrice;
  if (unitSalePrice === null || headCount < 1) return null;
  const snapshot: ReservationPricingSnapshot = {
    salesMode: sellerProduct.salesMode,
    unitSalePrice,
    depositPrice: isCommission ? null : sellerProduct.depositPrice,
    commissionRate: isCommission ? sellerProduct.commissionRate : null,
    headCount,
    totalReservationAmount: unitSalePrice * headCount,
    expectedSellerIncome: 0,
  };
  return { ...snapshot, expectedSellerIncome: calculateSellerIncome(snapshot) };
}

/** 판매점 수익 — 예약 Snapshot 기준 · 원 단위 반올림 (예약 1건 단위) */
export function calculateSellerIncome(
  snapshot: Pick<ReservationPricingSnapshot, "salesMode" | "unitSalePrice" | "depositPrice" | "commissionRate" | "headCount">,
): Won {
  if (snapshot.salesMode === "COMMISSION") {
    return Math.round((snapshot.unitSalePrice * snapshot.headCount * (snapshot.commissionRate ?? 0)) / 100);
  }
  return (snapshot.unitSalePrice - (snapshot.depositPrice ?? snapshot.unitSalePrice)) * snapshot.headCount;
}

/** 취소완료 예약의 정산 대상 수익은 0원 */
export function sellerIncomeAfterStatus(snapshot: ReservationPricingSnapshot, status: ReservationStatus): Won {
  return status === "CANCELLED" ? 0 : snapshot.expectedSellerIncome;
}

/** 환불금액 = 결제금액 - 취소수수료 (취소수수료는 결제금액을 넘을 수 없음) */
export function calculateRefundAmount(paidAmount: Won, cancellationFee: Won): Won {
  return Math.max(0, paidAmount - Math.min(cancellationFee, paidAmount));
}

/** 인보이스 금액 — 정상: 총 예약금액 · 취소완료: 고객 최종 부담금(결제금액 - 환불금액) */
export function calculateInvoiceAmount(input: {
  reservationStatus: ReservationStatus;
  totalReservationAmount: Won;
  paidAmount: Won;
  refundAmount: Won;
}): Won {
  if (input.reservationStatus !== "CANCELLED") return input.totalReservationAmount;
  return Math.max(0, input.paidAmount - input.refundAmount);
}

/**
 * 정산 금액 — 한 방식으로만 계산
 * finalAmount = Σ item.finalSettlementAmount + Σ 이 정산에 APPLIED 된 SettlementAdjustment.amount
 * (item에 이미 반영된 취소조정은 settlement-level 조정에 다시 포함하지 않음)
 */
export function calculateSettlementAmount(
  items: readonly Pick<SettlementItem, "originalSellerIncome" | "adjustmentAmount">[],
  appliedAdjustments: readonly Pick<SettlementAdjustment, "amount">[],
): { baseAmount: Won; adjustmentAmount: Won; finalAmount: Won } {
  const baseAmount = items.reduce((sum, item) => sum + item.originalSellerIncome, 0);
  const itemAdjustment = items.reduce((sum, item) => sum + item.adjustmentAmount, 0);
  const carried = appliedAdjustments.reduce((sum, item) => sum + item.amount, 0);
  const adjustmentAmount = itemAdjustment + carried;
  return { baseAmount, adjustmentAmount, finalAmount: baseAmount + adjustmentAmount };
}

export type GuardResult = { ok: boolean; reasons: string[] };

/** 정산확정 가능 — PENDING 또는 RECONFIRMATION_REQUIRED(판매점 재확인 완료) · 운영인계 완료 · 유효 정산서 */
export function canConfirmSettlement(
  settlement: Pick<
    Settlement,
    "status" | "operationsHandoverCompleted" | "currentStatementVersion" | "sellerConfirmedVersion"
  >,
): GuardResult {
  const reasons: string[] = [];
  if (settlement.status === "PAID") reasons.push("지급완료된 정산입니다.");
  else if (settlement.status === "CONFIRMED") reasons.push("이미 정산확정된 정산입니다.");
  else if (settlement.status === "MODIFICATION_REQUIRED") reasons.push("취소조정 반영 · 정산서 재발행이 필요합니다.");
  else if (
    settlement.status === "RECONFIRMATION_REQUIRED" &&
    settlement.sellerConfirmedVersion !== settlement.currentStatementVersion
  ) {
    reasons.push("판매점의 현재 정산서 재확인이 필요합니다.");
  }
  if (!settlement.operationsHandoverCompleted) reasons.push("운영인계 완료 전에는 정산확정할 수 없습니다.");
  if (settlement.currentStatementVersion === null) reasons.push("현재 유효 정산서가 없습니다.");
  return { ok: reasons.length === 0, reasons };
}

/** 지급 가능 — CONFIRMED · WAITING · 운영인계 · 현재 정산서 금액 = finalAmount · 판매점 확인 · 지급계좌 */
export function canPaySettlement(input: {
  settlement: Pick<
    Settlement,
    "status" | "paymentStatus" | "operationsHandoverCompleted" | "currentStatementVersion" | "sellerConfirmedVersion" | "finalAmount"
  >;
  currentStatement: Pick<SettlementStatement, "version" | "status" | "finalAmount"> | null;
  payoutAccount: Pick<SellerPayoutAccount, "status"> | null;
}): GuardResult {
  const { settlement, currentStatement, payoutAccount } = input;
  const reasons: string[] = [];
  if (settlement.status !== "CONFIRMED") reasons.push("정산확정 상태에서만 지급할 수 있습니다.");
  if (settlement.paymentStatus !== "WAITING") reasons.push("이미 지급완료된 정산입니다.");
  if (!settlement.operationsHandoverCompleted) reasons.push("운영인계 완료 전에는 지급할 수 없습니다.");
  if (
    !currentStatement ||
    currentStatement.status !== "CURRENT" ||
    currentStatement.version !== settlement.currentStatementVersion
  ) {
    reasons.push("현재 유효 정산서가 없습니다.");
  } else if (currentStatement.finalAmount !== settlement.finalAmount) {
    reasons.push("현재 유효 정산서와 정산금액이 일치하지 않습니다.");
  }
  if (settlement.sellerConfirmedVersion !== settlement.currentStatementVersion) reasons.push("판매점의 현재 정산서 확인이 필요합니다.");
  if (!payoutAccount || payoutAccount.status !== "ACTIVE") reasons.push("판매점 지급계좌가 등록되어 있지 않습니다.");
  return { ok: reasons.length === 0, reasons };
}

/**
 * 취소완료 발생 시 정산 반영 경로
 * PENDING · MODIFICATION_REQUIRED → item 직접 조정 / CONFIRMED · RECONFIRMATION_REQUIRED → MODIFICATION_REQUIRED (조정 후 재발행)
 * PAID → 금액 불변 · SettlementAdjustment(SCHEDULED) 생성 후 차기 정산에 APPLIED
 */
export function resolveCancellationSettlementPath(
  status: SettlementStatus,
): "ADJUST_ITEM" | "REQUIRE_MODIFICATION" | "CARRY_TO_NEXT" {
  if (status === "PAID") return "CARRY_TO_NEXT";
  if (status === "CONFIRMED" || status === "RECONFIRMATION_REQUIRED") return "REQUIRE_MODIFICATION";
  return "ADJUST_ITEM";
}

/** 환불 결과에 따른 예약 취소완료 가능 여부 — 환불 0원은 Refund 없이 완료 가능 */
export function canCompleteCancellation(expectedRefundAmount: Won, latestRefund: Pick<Refund, "status"> | null): boolean {
  if (expectedRefundAmount === 0) return true;
  return latestRefund?.status === "COMPLETED";
}

/* ================================================================ 데이터 접근 Scope */

/** 모든 Query는 Scope 필수 — 공급여행사는 supplierId, 판매점은 sellerId */
export type DataScope = { kind: "SUPPLIER"; supplierId: SupplierId } | { kind: "SELLER"; sellerId: SellerId };

export function isInScope(scope: DataScope, row: { supplierId: SupplierId; sellerId: SellerId }): boolean {
  return scope.kind === "SUPPLIER" ? row.supplierId === scope.supplierId : row.sellerId === scope.sellerId;
}
