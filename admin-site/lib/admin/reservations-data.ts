import type { ReservationSettlement } from "@/lib/admin/settlement-data";
import { getGuideTourReservationSeeds } from "@/lib/admin/guide-operation-data";
import { findSellerChannelRecord, listSellerChannelRecords } from "@/lib/admin/seller-channel-reservations";
import type { SellerCancelPolicyRule } from "@/lib/seller/seller-product-detail-data";

export type ReservationDetail = {
  code: string;
  reservedAt: string;
  bookerName: string;
  phone: string;
  email: string;
  productName: string;
  departureAt: string;
  reserveStatus: string;
  reserveStatusClass: "success" | "warn" | "danger" | "gray" | "info";
  paymentStatus: string;
  paymentStatusClass: "success" | "warn" | "danger" | "gray" | "info";
  counts: {
    adult: number;
    child: number;
    infant: number;
  };
  productAmount: number;
  optionAmount: number;
  discountAmount: number;
  totalAmount: string;
  paidAmount: string;
  unpaidAmount: string;
  requestNote: string;
  adminMemo: string;
  internalNote: string;
  agency: string;
  /** 탑승지 (탑승지가 있는 상품만) */
  boardingPoint?: string;
  /** 판매 출처. 없으면 자사 직접예약으로 봅니다. */
  source?: ReservationSource;
  /** 상품공유 예약 정산 정보 (SAMPLE) */
  settlement?: ReservationSettlement;
  /** 취소/환불 Mock 입력값. 예약상태와 별도로 부분취소/전체취소를 기록합니다. */
  cancellation?: ReservationCancellation;
  /** 결제수단 / 최초 결제일시 (판매점 예약 연동) */
  paymentMethod?: string;
  paidAt?: string;
  /** 예약 당시 판매조건 Snapshot (판매점 예약) — 현재 상품 판매가 변경은 반영하지 않습니다. */
  bookingTerms?: ReservationBookingTerms;
  /** 판매점 취소요청 · 공급여행사 처리결과 */
  sellerCancelRequest?: ReservationSellerCancelRequest;
  /** 처리자를 포함한 예약상태 Timeline (판매점 예약) */
  statusTimeline?: ReservationStatusTimelineEntry[];
};

export type ReservationBookingTerms = {
  productCode: string;
  saleMode: "입금가형" | "수수료형";
  /** 판매점 판매가 (1인) */
  unitPrice: number;
  /** 입금가 (1인, 입금가형) */
  depositPrice: number | null;
  /** 수수료율 % (수수료형) */
  commissionRate: number | null;
  pax: number;
  amount: number;
  /** 판매점 예상수익 (예약 당시 조건 기준) */
  sellerProfit: number;
  /** 공급여행사 원본 취소정책 구간 */
  cancelPolicy: SellerCancelPolicyRule[];
};

export type ReservationSellerCancelStatus = "검토대기" | "취소승인" | "취소거절" | "취소완료";

export const SELLER_REFUND_METHODS = ["원결제수단 환불", "계좌환불"] as const;
export type ReservationSellerRefundMethod = (typeof SELLER_REFUND_METHODS)[number];

/** 환불 처리 시도 이력 (Mock) */
export type ReservationSellerRefundAttempt = {
  at: string;
  result: "실패" | "완료";
  method: ReservationSellerRefundMethod;
  amount: number;
  processedBy: ReservationActor;
};

/**
 * 취소승인 이후 환불 · 취소완료 처리 결과 (SAMPLE · 실제 PG 환불 없음)
 * - 환불실패: 예약상태 취소승인 · 결제상태 유지
 * - 환불완료: 결제상태 환불완료 → 예약상태 취소완료
 * - 환불없음: 결제금액 0원 또는 환불예정금액 0원 → 환불 없이 취소완료
 */
export type ReservationSellerRefund = {
  status: "환불실패" | "환불완료" | "환불없음";
  method: ReservationSellerRefundMethod | null;
  amount: number;
  refundedAt: string | null;
  processedBy: ReservationActor;
  memo: string;
  /** 계좌환불 Mock 입력 — 계좌번호는 마스킹 값만 보관 */
  bankAccount: { holder: string; bank: string; accountMasked: string } | null;
  attempts: ReservationSellerRefundAttempt[];
  /** 예약 취소완료 일시 */
  completedAt: string | null;
};

export type ReservationSellerCancelDecision = {
  processedAt: string;
  processedBy: ReservationActor;
};

export type ReservationSellerCancelRequest = {
  sellerName: string;
  sellerCode: string;
  /** YYYY-MM-DD HH:mm */
  requestedAt: string;
  registeredBy: string;
  customerName: string;
  reason: string;
  customerNote: string | null;
  /** 취소요청 전 예약상태 — 거절 시 이 상태로 복원 */
  previousReservationStatus: string;
  status: ReservationSellerCancelStatus;
  approval?: ReservationSellerCancelDecision & {
    recommendedFee: number;
    cancellationFee: number;
    refundAmount: number;
    memo: string;
  };
  rejection?: ReservationSellerCancelDecision & { reason: string; reasonDetail: string | null };
  refund?: ReservationSellerRefund;
};

export type ReservationStatusTimelineEntry = {
  /** YYYY-MM-DD HH:mm */
  at: string;
  label: string;
  actor: string;
  tone: ReservationDetail["reserveStatusClass"];
  note?: string;
};

export type ReservationCancellationType = "partial" | "full";
export type ReservationCancellationStatus = "none" | ReservationCancellationType;

export const RESERVATION_CANCELLATION_LABELS: Record<ReservationCancellationStatus, string> = {
  none: "정상",
  partial: "부분취소",
  full: "전체취소",
};

/** 취소/환불 처리값 (SAMPLE · 취소규정 자동계산 없음, 누적 금액 기준) */
export type ReservationCancellation = {
  type: ReservationCancellationType;
  refundAmount: number;
  cancellationFee: number;
  reason: string;
  memo: string;
  processedAt: string;
  processedBy: ReservationActor;
};

export type ReservationSourceType = "direct" | "affiliate" | "seller";

/**
 * 예약 판매 출처 (SAMPLE).
 * 공급여행사 → 판매여행사(제휴여행사) → 판매점 → 고객 구조를 표현합니다.
 * 예약마감(closed*)과 운영인계(handover*)는 예약상태와 별도로 기록합니다.
 */
export type ReservationSource = {
  type: ReservationSourceType;
  supplierAgencyName?: string;
  sellingAgencyName?: string;
  sellerName?: string;
  /** 판매점 관리자에서 직접 접수된 예약의 판매점코드 */
  sellerCode?: string;
  /** 판매여행사에서 사용하는 판매 상품코드 */
  sharedProductCode?: string;
  /** 공급여행사 원본 상품코드 */
  originalProductCode?: string;
  originalProductName?: string;
  salesProductName?: string;
  createdBy?: string;
  lastModifiedBy?: string;
  /** 예약마감 처리 일시 / 처리자 */
  closedAt?: string;
  closedBy?: ReservationActor;
  /** 운영관리 권한이 공급여행사로 인계된 일시 / 처리자 */
  handoverAt?: string;
  handoverBy?: ReservationActor;
};

/** 작업자와 소속 */
export type ReservationActor = {
  name: string;
  agency: string;
};

export type ReservationHistoryType =
  | "reservation_create"
  | "info_update"
  | "people_change"
  | "boarding_change"
  | "payment_status_change"
  | "reservation_status_change"
  | "reservation_close"
  | "operation_handover"
  | "reservation_cancel";

export type ReservationHistoryCategory = "info" | "status" | "payment" | "handover";

export type ReservationHistoryChange = {
  label: string;
  before: string;
  after: string;
};

/** 예약 변경이력 (SAMPLE · 서버 저장 전) */
export type ReservationHistoryEntry = {
  id: string;
  at: string;
  actor: ReservationActor;
  type: ReservationHistoryType;
  summary?: string;
  changes?: ReservationHistoryChange[];
};

export const RESERVATION_HISTORY_TYPE_LABELS: Record<ReservationHistoryType, string> = {
  reservation_create: "예약생성",
  info_update: "예약정보 수정",
  people_change: "인원 변경",
  boarding_change: "탑승지 변경",
  payment_status_change: "결제상태 변경",
  reservation_status_change: "예약상태 변경",
  reservation_close: "예약마감",
  operation_handover: "운영인계",
  reservation_cancel: "취소/환불",
};

export const RESERVATION_HISTORY_TYPE_CATEGORY: Record<ReservationHistoryType, ReservationHistoryCategory> = {
  reservation_create: "info",
  info_update: "info",
  people_change: "info",
  boarding_change: "info",
  payment_status_change: "payment",
  reservation_status_change: "status",
  reservation_close: "status",
  operation_handover: "handover",
  reservation_cancel: "payment",
};

export const RESERVATION_HISTORY_FILTER_OPTIONS: { value: "all" | ReservationHistoryCategory; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "info", label: "예약정보" },
  { value: "status", label: "상태" },
  { value: "payment", label: "결제" },
  { value: "handover", label: "운영인계" },
];

export function reservationHistoryBadgeClass(type: ReservationHistoryType) {
  const category = RESERVATION_HISTORY_TYPE_CATEGORY[type];
  if (type === "reservation_create") return "success";
  if (category === "handover") return "info";
  if (category === "status") return "warn";
  return "gray";
}

export type ReservationListItem = ReservationDetail & {
  memberId?: string;
};

export type ReservationPayment = {
  id: string;
  paidAt: string;
  paymentNumber: string;
  method: "신용카드" | "계좌이체" | "무통장입금" | "현금" | "기타";
  amount: number;
  status: "결제완료" | "결제대기" | "결제취소" | "부분취소";
  approvalNumber: string;
  processedBy: string;
};

export type ReservationRefund = {
  id: string;
  refundedAt: string;
  refundNumber: string;
  paymentNumber: string;
  method: "원결제 취소" | "계좌환불" | "수기환불";
  amount: number;
  status: "환불대기" | "환불완료" | "환불실패";
  reason: string;
  processedBy: string;
};

export const RESERVE_STATUS_FILTER_OPTIONS = [
  "전체",
  "예약접수",
  "예약확정",
  "대기",
  "예약마감",
  "운영인계",
  "행사완료",
  "취소요청",
  "취소승인",
  "취소완료",
] as const;

export const PAYMENT_STATUS_FILTER_OPTIONS = [
  "전체",
  "미결제",
  "결제대기",
  "부분결제",
  "결제완료",
  "환불완료",
] as const;

export const RESERVE_EDIT_STATUS_OPTIONS = [
  "예약접수",
  "예약확정",
  "대기",
  "예약마감",
  "운영인계",
  "행사완료",
  "취소요청",
  "취소완료",
] as const;

export const PAYMENT_EDIT_STATUS_OPTIONS = [
  "미결제",
  "결제대기",
  "부분결제",
  "결제완료",
  "환불완료",
] as const;

export function parseKrw(value: string | number) {
  if (typeof value === "number") return value;
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

export function formatKrw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function calculateReservationAmounts(productAmount: number, optionAmount: number, discountAmount: number, paidAmount: number) {
  const total = Math.max(0, productAmount + optionAmount - discountAmount);
  const unpaid = Math.max(0, total - paidAmount);
  return {
    totalAmount: formatKrw(total),
    unpaidAmount: formatKrw(unpaid),
    paidAmount: formatKrw(paidAmount),
  };
}

export function reserveStatusBadgeClass(status: string): ReservationDetail["reserveStatusClass"] {
  if (status === "예약확정") return "success";
  if (status === "대기" || status === "부분결제" || status === "예약마감" || status === "취소승인") return "warn";
  if (status === "취소요청") return "danger";
  if (status === "취소완료" || status === "환불완료" || status === "행사완료") return "gray";
  if (status === "예약접수") return "info";
  return "info";
}

export function paymentStatusBadgeClass(status: string): ReservationDetail["paymentStatusClass"] {
  if (status === "결제완료") return "success";
  if (status === "미결제" || status === "결제대기" || status === "부분결제") return "warn";
  if (status === "환불완료") return "gray";
  return "info";
}

export function paymentRecordBadgeClass(status: ReservationPayment["status"]) {
  if (status === "결제완료") return "success";
  if (status === "결제대기" || status === "부분취소") return "warn";
  if (status === "결제취소") return "danger";
  return "gray";
}

export function refundRecordBadgeClass(status: ReservationRefund["status"]) {
  if (status === "환불완료") return "success";
  if (status === "환불대기") return "warn";
  if (status === "환불실패") return "danger";
  return "gray";
}

export function calculatePaymentSummary(
  totalReservationAmount: number,
  payments: ReservationPayment[],
  refunds: ReservationRefund[],
) {
  const totalPaid = payments
    .filter((item) => item.status === "결제완료" || item.status === "부분취소")
    .reduce((sum, item) => sum + item.amount, 0);
  const totalRefund = refunds
    .filter((item) => item.status === "환불완료" || item.status === "환불대기")
    .reduce((sum, item) => sum + item.amount, 0);
  const netPaid = Math.max(0, totalPaid - totalRefund);
  const unpaid = Math.max(0, totalReservationAmount - netPaid);

  return {
    totalReservationAmount,
    totalPaid,
    totalRefund,
    netPaid,
    unpaid,
    totalReservationLabel: formatKrw(totalReservationAmount),
    totalPaidLabel: formatKrw(totalPaid),
    totalRefundLabel: formatKrw(totalRefund),
    netPaidLabel: formatKrw(netPaid),
    unpaidLabel: formatKrw(unpaid),
  };
}

const RESERVATION_DETAILS: ReservationListItem[] = [
  {
    code: "R20260620001",
    reservedAt: "2026-06-20",
    bookerName: "홍길동",
    phone: "010-1234-5678",
    email: "hong@example.com",
    productName: "제주도 3박4일 힐링 패키지",
    departureAt: "2026-07-10",
    reserveStatus: "예약확정",
    reserveStatusClass: "success",
    paymentStatus: "결제완료",
    paymentStatusClass: "success",
    counts: { adult: 2, child: 0, infant: 0 },
    productAmount: 1800000,
    optionAmount: 180000,
    discountAmount: 0,
    totalAmount: "1,980,000원",
    paidAmount: "1,980,000원",
    unpaidAmount: "0원",
    requestNote: "창가 좌석 및 금연 객실 요청",
    adminMemo: "판매점 추천 예약. 담당자 확인 완료.",
    internalNote: "VIP 고객 예약",
    agency: "행복투어",
    memberId: "M000001",
  },
  {
    code: "R20260615002",
    reservedAt: "2026-06-15",
    bookerName: "홍길동",
    phone: "010-1234-5678",
    email: "hong@example.com",
    productName: "부산 해운대 2박3일",
    departureAt: "2026-08-05",
    reserveStatus: "예약확정",
    reserveStatusClass: "success",
    paymentStatus: "부분결제",
    paymentStatusClass: "warn",
    counts: { adult: 2, child: 1, infant: 0 },
    productAmount: 1300000,
    optionAmount: 150000,
    discountAmount: 0,
    totalAmount: "1,450,000원",
    paidAmount: "800,000원",
    unpaidAmount: "650,000원",
    requestNote: "아동 식사 옵션 확인 요청",
    adminMemo: "잔금 결제 안내 문자 발송 예정",
    internalNote: "잔금 결제 독촉 예정",
    agency: "행복투어",
    memberId: "M000001",
  },
  {
    code: "R20260528003",
    reservedAt: "2026-05-28",
    bookerName: "홍길동",
    phone: "010-1234-5678",
    email: "hong@example.com",
    productName: "경주 역사문화 1박2일",
    departureAt: "2026-06-10",
    reserveStatus: "취소완료",
    reserveStatusClass: "gray",
    paymentStatus: "환불완료",
    paymentStatusClass: "gray",
    counts: { adult: 2, child: 0, infant: 0 },
    productAmount: 1350000,
    optionAmount: 70000,
    discountAmount: 0,
    totalAmount: "1,420,000원",
    paidAmount: "0원",
    unpaidAmount: "0원",
    requestNote: "출발 3일 전 취소 요청",
    adminMemo: "환불 처리 완료. 취소 수수료 공제 후 환불",
    internalNote: "취소 수수료 10% 공제",
    agency: "행복투어",
    memberId: "M000001",
  },
  {
    code: "R20260701004",
    reservedAt: "2026-07-01",
    bookerName: "김민지",
    phone: "010-2222-3333",
    email: "minji@example.com",
    productName: "속초 해변 2박3일",
    departureAt: "2026-07-22",
    reserveStatus: "예약접수",
    reserveStatusClass: "info",
    paymentStatus: "미결제",
    paymentStatusClass: "warn",
    counts: { adult: 2, child: 0, infant: 0 },
    productAmount: 820000,
    optionAmount: 70000,
    discountAmount: 0,
    totalAmount: "890,000원",
    paidAmount: "0원",
    unpaidAmount: "890,000원",
    requestNote: "오션뷰 객실 요청",
    adminMemo: "결제 안내 문자 발송 예정",
    internalNote: "",
    agency: "직접가입",
    memberId: "M000002",
  },
  {
    code: "R20260712005",
    reservedAt: "2026-07-12",
    bookerName: "이성호",
    phone: "010-3333-4444",
    email: "sungho@example.com",
    productName: "강릉 바다여행 1박2일",
    departureAt: "2026-08-18",
    reserveStatus: "예약확정",
    reserveStatusClass: "success",
    paymentStatus: "결제대기",
    paymentStatusClass: "warn",
    counts: { adult: 1, child: 0, infant: 0 },
    productAmount: 580000,
    optionAmount: 40000,
    discountAmount: 0,
    totalAmount: "620,000원",
    paidAmount: "0원",
    unpaidAmount: "620,000원",
    requestNote: "-",
    adminMemo: "휴면 회원 복귀 후 결제 예정",
    internalNote: "휴면 회원 복귀 확인",
    agency: "우리여행사",
    memberId: "M000003",
  },
  {
    code: "R20260901006",
    reservedAt: "2026-08-20",
    bookerName: "박준영",
    phone: "010-4444-5555",
    email: "jun@example.com",
    productName: "여수 밤바다 2박3일",
    departureAt: "2026-09-01",
    reserveStatus: "예약확정",
    reserveStatusClass: "success",
    paymentStatus: "결제완료",
    paymentStatusClass: "success",
    counts: { adult: 2, child: 1, infant: 0 },
    productAmount: 1020000,
    optionAmount: 100000,
    discountAmount: 0,
    totalAmount: "1,120,000원",
    paidAmount: "1,120,000원",
    unpaidAmount: "0원",
    requestNote: "유아용 침대 요청",
    adminMemo: "오늘 출발 예약. 체크인 안내 완료",
    internalNote: "출발 당일 체크인 확인",
    agency: "행복투어",
    memberId: "M000004",
  },
  {
    code: "R20260815007",
    reservedAt: "2026-08-15",
    bookerName: "최유나",
    phone: "010-5555-6666",
    email: "yuna@example.com",
    productName: "전주 한옥마을 1박2일",
    departureAt: "2026-09-12",
    reserveStatus: "대기",
    reserveStatusClass: "warn",
    paymentStatus: "미결제",
    paymentStatusClass: "warn",
    counts: { adult: 3, child: 0, infant: 0 },
    productAmount: 720000,
    optionAmount: 60000,
    discountAmount: 0,
    totalAmount: "780,000원",
    paidAmount: "0원",
    unpaidAmount: "780,000원",
    requestNote: "한옥 체험 프로그램 포함 요청",
    adminMemo: "좌석 대기 중",
    internalNote: "",
    agency: "관리자 등록",
    memberId: "M000005",
  },
  {
    code: "R20260822008",
    reservedAt: "2026-08-22",
    bookerName: "한지우",
    phone: "010-8888-9999",
    email: "hanjiwoo@example.com",
    productName: "통영 케이블카 패키지",
    departureAt: "2026-09-20",
    reserveStatus: "취소요청",
    reserveStatusClass: "danger",
    paymentStatus: "부분결제",
    paymentStatusClass: "warn",
    counts: { adult: 2, child: 0, infant: 0 },
    productAmount: 500000,
    optionAmount: 40000,
    discountAmount: 0,
    totalAmount: "540,000원",
    paidAmount: "200,000원",
    unpaidAmount: "340,000원",
    requestNote: "일정 변경으로 취소 요청",
    adminMemo: "취소 수수료 안내 후 처리 예정",
    internalNote: "취소 요청 접수",
    agency: "행복투어",
  },
  // 공유상품 예약 SAMPLE: 공급여행사 행복투어 → 판매여행사(제휴여행사) → (판매점)
  {
    code: "AOS-RSV-260001",
    reservedAt: "2026-10-01",
    bookerName: "김민수",
    phone: "010-1111-2026",
    email: "minsu.test@example.com",
    productName: "[서울출발] 철원 DMZ 평화관광",
    departureAt: "2026-10-24",
    reserveStatus: "예약확정",
    reserveStatusClass: "success",
    paymentStatus: "미결제",
    paymentStatusClass: "warn",
    counts: { adult: 2, child: 0, infant: 0 },
    productAmount: 138000,
    optionAmount: 0,
    discountAmount: 0,
    totalAmount: "138,000원",
    paidAmount: "0원",
    unpaidAmount: "138,000원",
    requestNote: "",
    adminMemo: "",
    internalNote: "",
    agency: "현담여행사",
    boardingPoint: "서울역",
    source: {
      type: "affiliate",
      supplierAgencyName: "행복투어",
      sellingAgencyName: "현담여행사",
      sharedProductCode: "HD-DMZ01",
      originalProductCode: "HT-DMZ01",
      originalProductName: "철원 DMZ · 소이산 모노레일 당일",
      salesProductName: "[서울출발] 철원 DMZ 평화관광",
      createdBy: "현담여행사",
    },
    settlement: {
      settlementCode: "STL-260001",
      status: "정산대기",
      affiliateCommissionRate: 10,
      method: "예약건별",
      cycle: "출발 후 3영업일",
      payer: "판매여행사",
      dueDate: "2026-10-29",
      createdAt: "2026-10-01 11:30",
    },
  },
  {
    code: "AOS-RSV-260002",
    reservedAt: "2026-09-27",
    bookerName: "이서연",
    phone: "010-2222-2026",
    email: "seoyeon.test@example.com",
    productName: "철원 DMZ · 소이산 모노레일 당일",
    departureAt: "2026-10-17",
    reserveStatus: "예약마감",
    reserveStatusClass: "warn",
    paymentStatus: "결제완료",
    paymentStatusClass: "success",
    counts: { adult: 2, child: 1, infant: 0 },
    productAmount: 207000,
    optionAmount: 0,
    discountAmount: 0,
    totalAmount: "207,000원",
    paidAmount: "207,000원",
    unpaidAmount: "0원",
    requestNote: "",
    adminMemo: "",
    internalNote: "",
    agency: "그래가자",
    boardingPoint: "합정역",
    source: {
      type: "affiliate",
      supplierAgencyName: "행복투어",
      sellingAgencyName: "그래가자",
      sharedProductCode: "GG-DMZ01",
      originalProductCode: "HT-DMZ01",
      originalProductName: "철원 DMZ · 소이산 모노레일 당일",
      salesProductName: "철원 DMZ · 소이산 모노레일 당일",
      createdBy: "그래가자",
      closedAt: "2026-10-01 16:00",
      closedBy: { name: "한지민", agency: "그래가자" },
      handoverAt: "2026-10-01 16:20",
      handoverBy: { name: "한지민", agency: "그래가자" },
    },
    settlement: {
      settlementCode: "STL-260002",
      status: "정산확정",
      affiliateCommissionRate: 10,
      method: "예약건별",
      cycle: "출발 후 3영업일",
      payer: "판매여행사",
      dueDate: "2026-10-22",
      createdAt: "2026-09-28 10:05",
      confirmedAmounts: { grossAmount: 207000, discountAmount: 0 },
    },
  },
  {
    code: "AOS-RSV-260003",
    reservedAt: "2026-09-18",
    bookerName: "박지훈",
    phone: "010-3333-2026",
    email: "jihoon.test@example.com",
    productName: "[서울출발] 철원 DMZ 평화관광",
    departureAt: "2026-10-21",
    reserveStatus: "예약마감",
    reserveStatusClass: "warn",
    paymentStatus: "결제완료",
    paymentStatusClass: "success",
    counts: { adult: 4, child: 0, infant: 0 },
    productAmount: 276000,
    optionAmount: 0,
    discountAmount: 0,
    totalAmount: "276,000원",
    paidAmount: "276,000원",
    unpaidAmount: "0원",
    requestNote: "",
    adminMemo: "",
    internalNote: "",
    agency: "스마트투어 판매점",
    boardingPoint: "사당역",
    source: {
      type: "seller",
      supplierAgencyName: "행복투어",
      sellingAgencyName: "현담여행사",
      sellerName: "스마트투어 판매점",
      sharedProductCode: "HD-DMZ01",
      originalProductCode: "HT-DMZ01",
      originalProductName: "철원 DMZ · 소이산 모노레일 당일",
      salesProductName: "[서울출발] 철원 DMZ 평화관광",
      createdBy: "스마트투어 판매점",
      closedAt: "2026-10-01 17:30",
      closedBy: { name: "오세린", agency: "스마트투어 판매점" },
      handoverAt: "2026-10-01 18:00",
      handoverBy: { name: "오세린", agency: "스마트투어 판매점" },
    },
    settlement: {
      settlementCode: "STL-260003",
      status: "지급대기",
      affiliateCommissionRate: 10,
      sellerCommissionRate: 5,
      method: "예약건별",
      cycle: "출발 후 3영업일",
      payer: "판매점",
      dueDate: "2026-10-26",
      createdAt: "2026-09-18 11:00",
      // 확정 이후 예약금액이 296,000원 → 276,000원으로 변경된 SAMPLE
      confirmedAmounts: { grossAmount: 296000, discountAmount: 0 },
    },
  },
  {
    code: "AOS-RSV-260004",
    reservedAt: "2026-09-30",
    bookerName: "최하은",
    phone: "010-4444-2026",
    email: "haeun.test@example.com",
    productName: "[서울출발] 철원 DMZ 평화관광",
    departureAt: "2026-10-31",
    reserveStatus: "예약확정",
    reserveStatusClass: "success",
    paymentStatus: "부분결제",
    paymentStatusClass: "warn",
    counts: { adult: 1, child: 1, infant: 0 },
    productAmount: 120000,
    optionAmount: 0,
    discountAmount: 0,
    totalAmount: "120,000원",
    paidAmount: "60,000원",
    unpaidAmount: "60,000원",
    requestNote: "",
    adminMemo: "",
    internalNote: "",
    agency: "스마트투어 판매점",
    boardingPoint: "종합운동장역",
    source: {
      type: "seller",
      supplierAgencyName: "행복투어",
      sellingAgencyName: "현담여행사",
      sellerName: "스마트투어 판매점",
      sharedProductCode: "HD-DMZ01",
      originalProductCode: "HT-DMZ01",
      originalProductName: "철원 DMZ · 소이산 모노레일 당일",
      salesProductName: "[서울출발] 철원 DMZ 평화관광",
      createdBy: "스마트투어 판매점",
    },
    settlement: {
      settlementCode: "STL-260004",
      status: "정산대기",
      affiliateCommissionRate: 10,
      sellerCommissionRate: 5,
      method: "예약건별",
      cycle: "출발 후 3영업일",
      payer: "판매점",
      dueDate: "2026-11-05",
      createdAt: "2026-09-30 15:20",
    },
  },
  // 정산 SAMPLE: 같은 상품 · 같은 출발일(2026-09-26) 집계용
  {
    code: "AOS-RSV-260005",
    reservedAt: "2026-09-20",
    bookerName: "정우성",
    phone: "010-5555-2026",
    email: "woosung.test@example.com",
    productName: "[서울출발] 철원 DMZ 평화관광",
    departureAt: "2026-09-26",
    reserveStatus: "행사완료",
    reserveStatusClass: "gray",
    paymentStatus: "결제완료",
    paymentStatusClass: "success",
    counts: { adult: 3, child: 0, infant: 0 },
    productAmount: 220000,
    optionAmount: 0,
    discountAmount: 20000,
    totalAmount: "200,000원",
    paidAmount: "200,000원",
    unpaidAmount: "0원",
    requestNote: "",
    adminMemo: "",
    internalNote: "",
    agency: "현담여행사",
    boardingPoint: "서울역",
    source: {
      type: "affiliate",
      supplierAgencyName: "행복투어",
      sellingAgencyName: "현담여행사",
      sharedProductCode: "HD-DMZ01",
      originalProductCode: "HT-DMZ01",
      originalProductName: "철원 DMZ · 소이산 모노레일 당일",
      salesProductName: "[서울출발] 철원 DMZ 평화관광",
      createdBy: "현담여행사",
      closedAt: "2026-09-24 18:00",
      closedBy: { name: "이도현", agency: "현담여행사" },
      handoverAt: "2026-09-24 18:10",
      handoverBy: { name: "이도현", agency: "현담여행사" },
    },
    settlement: {
      settlementCode: "STL-260005",
      status: "지급완료",
      affiliateCommissionRate: 10,
      method: "예약건별",
      cycle: "출발 후 3영업일",
      payer: "판매여행사",
      dueDate: "2026-10-01",
      createdAt: "2026-09-20 10:20",
      confirmedAmounts: { grossAmount: 220000, discountAmount: 20000 },
      closing: {
        closedAt: "2026-09-29 13:30",
        closedBy: { name: "장윤호", agency: "애비아넥스트" },
        finalSupplierAmount: 180000,
      },
      payment: {
        paidAt: "2026-10-01",
        amount: 180000,
        method: "계좌이체",
        memo: "",
        processedBy: { name: "장윤호", agency: "애비아넥스트" },
      },
    },
  },
  {
    code: "AOS-RSV-260006",
    reservedAt: "2026-09-21",
    bookerName: "한소희",
    phone: "010-6666-2026",
    email: "sohee.test@example.com",
    productName: "[서울출발] 철원 DMZ 평화관광",
    departureAt: "2026-09-26",
    reserveStatus: "행사완료",
    reserveStatusClass: "gray",
    paymentStatus: "결제완료",
    paymentStatusClass: "success",
    counts: { adult: 2, child: 1, infant: 0 },
    productAmount: 200000,
    optionAmount: 0,
    discountAmount: 0,
    totalAmount: "200,000원",
    paidAmount: "200,000원",
    unpaidAmount: "0원",
    requestNote: "",
    adminMemo: "",
    internalNote: "",
    agency: "스마트투어 판매점",
    boardingPoint: "사당역",
    source: {
      type: "seller",
      supplierAgencyName: "행복투어",
      sellingAgencyName: "현담여행사",
      sellerName: "스마트투어 판매점",
      sharedProductCode: "HD-DMZ01",
      originalProductCode: "HT-DMZ01",
      originalProductName: "철원 DMZ · 소이산 모노레일 당일",
      salesProductName: "[서울출발] 철원 DMZ 평화관광",
      createdBy: "스마트투어 판매점",
      closedAt: "2026-09-24 17:30",
      closedBy: { name: "오세린", agency: "스마트투어 판매점" },
      handoverAt: "2026-09-24 17:40",
      handoverBy: { name: "오세린", agency: "스마트투어 판매점" },
    },
    settlement: {
      settlementCode: "STL-260006",
      status: "정산대기",
      affiliateCommissionRate: 10,
      sellerCommissionRate: 5,
      method: "예약건별",
      cycle: "출발 후 3영업일",
      payer: "판매점",
      dueDate: "2026-10-01",
      createdAt: "2026-09-21 09:00",
    },
  },
  {
    code: "AOS-RSV-260007",
    reservedAt: "2026-09-15",
    bookerName: "윤지수",
    phone: "010-7777-2026",
    email: "jisu.test@example.com",
    productName: "철원 DMZ · 소이산 모노레일 당일",
    departureAt: "2026-09-26",
    reserveStatus: "취소완료",
    reserveStatusClass: "gray",
    paymentStatus: "환불완료",
    paymentStatusClass: "gray",
    counts: { adult: 2, child: 0, infant: 0 },
    productAmount: 138000,
    optionAmount: 0,
    discountAmount: 0,
    totalAmount: "138,000원",
    paidAmount: "138,000원",
    unpaidAmount: "0원",
    requestNote: "",
    adminMemo: "",
    internalNote: "",
    agency: "그래가자",
    boardingPoint: "합정역",
    source: {
      type: "affiliate",
      supplierAgencyName: "행복투어",
      sellingAgencyName: "그래가자",
      sharedProductCode: "GG-DMZ01",
      originalProductCode: "HT-DMZ01",
      originalProductName: "철원 DMZ · 소이산 모노레일 당일",
      salesProductName: "철원 DMZ · 소이산 모노레일 당일",
      createdBy: "그래가자",
    },
    cancellation: {
      type: "full",
      refundAmount: 118000,
      cancellationFee: 20000,
      reason: "고객 요청",
      memo: "출발 2일 전 취소 (Mock 취소수수료)",
      processedAt: "2026-09-24 11:00",
      processedBy: { name: "한지민", agency: "그래가자" },
    },
    settlement: {
      settlementCode: "STL-260007",
      status: "정산보류",
      affiliateCommissionRate: 10,
      method: "예약건별",
      cycle: "출발 후 3영업일",
      payer: "판매여행사",
      dueDate: "2026-10-01",
      createdAt: "2026-09-15 14:00",
      hold: {
        reason: "취소/환불 확인",
        detail: "고객 취소에 따른 환불금액 확인 필요",
        heldAt: "2026-09-24 11:20",
        heldBy: { name: "김민재", agency: "행복투어" },
      },
    },
  },
  ...buildGuideTourReservations(),
];

/** 운영배정 대상 출발상품(가이드 운영 SAMPLE)의 자사 예약. 운영배정 정보는 예약과 별도로 관리합니다. */
function buildGuideTourReservations(): ReservationListItem[] {
  const unitPrice = 89000;
  return getGuideTourReservationSeeds().map((seed) => {
    const total = formatKrw(seed.people * unitPrice);
    return {
      code: seed.code,
      reservedAt: seed.reservedAt,
      bookerName: seed.bookerName,
      phone: seed.phone,
      email: "",
      productName: seed.productName,
      departureAt: seed.departureDate,
      reserveStatus: "예약확정",
      reserveStatusClass: "success",
      paymentStatus: "결제완료",
      paymentStatusClass: "success",
      counts: { adult: seed.people, child: 0, infant: 0 },
      productAmount: seed.people * unitPrice,
      optionAmount: 0,
      discountAmount: 0,
      totalAmount: total,
      paidAmount: total,
      unpaidAmount: "0원",
      requestNote: seed.notes.join(" / "),
      adminMemo: "",
      internalNote: seed.code.startsWith("QA-") ? "운영현황 통합관리 QA SAMPLE 예약 (실제 예약 아님)" : "",
      agency: "자사",
      boardingPoint: seed.boardingPoint,
    };
  });
}

/** 세션 내 예약 수정 내용 (SAMPLE · 새로고침 시 초기화) */
const sessionReservationEdits: Record<string, Partial<ReservationDetail>> = {};

function withSessionEdits<T extends ReservationDetail>(reservation: T): T {
  const edits = sessionReservationEdits[reservation.code];
  if (!edits) return { ...reservation };
  return {
    ...reservation,
    ...edits,
    counts: { ...(edits.counts ?? reservation.counts) },
    source: edits.source ?? reservation.source,
  };
}

export function saveReservationEdits(code: string, patch: Partial<ReservationDetail>) {
  sessionReservationEdits[code] = { ...sessionReservationEdits[code], ...patch };
}

export function formatReservationTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatPeopleLabel(counts: ReservationDetail["counts"]) {
  const parts = [
    counts.adult ? `성인 ${counts.adult}명` : "",
    counts.child ? `소아 ${counts.child}명` : "",
    counts.infant ? `유아 ${counts.infant}명` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "0명";
}

const RESERVATION_HISTORY: Record<string, ReservationHistoryEntry[]> = {
  "AOS-RSV-260001": [
    {
      id: "h-260001-1",
      at: "2026-10-01 09:10",
      actor: { name: "김민수", agency: "현담여행사" },
      type: "reservation_create",
      summary: "현담여행사를 통해 예약이 생성되었습니다.",
    },
    {
      id: "h-260001-2",
      at: "2026-10-01 10:20",
      actor: { name: "이도현", agency: "현담여행사" },
      type: "people_change",
      changes: [{ label: "예약인원", before: "성인 1명", after: "성인 2명" }],
    },
    {
      id: "h-260001-3",
      at: "2026-10-01 11:30",
      actor: { name: "이도현", agency: "현담여행사" },
      type: "reservation_status_change",
      changes: [{ label: "예약상태", before: "예약접수", after: "예약확정" }],
    },
  ],
  "AOS-RSV-260002": [
    {
      id: "h-260002-1",
      at: "2026-09-27 14:00",
      actor: { name: "이서연", agency: "그래가자" },
      type: "reservation_create",
      summary: "그래가자를 통해 예약이 생성되었습니다.",
    },
    {
      id: "h-260002-2",
      at: "2026-09-28 10:00",
      actor: { name: "한지민", agency: "그래가자" },
      type: "payment_status_change",
      changes: [{ label: "결제상태", before: "미결제", after: "결제완료" }],
    },
    {
      id: "h-260002-3",
      at: "2026-09-28 10:05",
      actor: { name: "한지민", agency: "그래가자" },
      type: "reservation_status_change",
      changes: [{ label: "예약상태", before: "예약접수", after: "예약확정" }],
    },
    {
      id: "h-260002-4",
      at: "2026-10-01 16:00",
      actor: { name: "한지민", agency: "그래가자" },
      type: "reservation_close",
      summary: "예약마감 처리",
      changes: [{ label: "예약상태", before: "예약확정", after: "예약마감" }],
    },
    {
      id: "h-260002-5",
      at: "2026-10-01 16:20",
      actor: { name: "한지민", agency: "그래가자" },
      type: "operation_handover",
      summary: "행복투어로 운영관리 권한 인계",
    },
  ],
  "AOS-RSV-260003": [
    {
      id: "h-260003-1",
      at: "2026-09-18 11:00",
      actor: { name: "박지훈", agency: "스마트투어 판매점" },
      type: "reservation_create",
      summary: "스마트투어 판매점을 통해 예약이 생성되었습니다.",
    },
    {
      id: "h-260003-2",
      at: "2026-09-20 09:40",
      actor: { name: "오세린", agency: "스마트투어 판매점" },
      type: "boarding_change",
      changes: [{ label: "탑승지", before: "잠실역", after: "사당역" }],
    },
    {
      id: "h-260003-3",
      at: "2026-10-01 17:30",
      actor: { name: "오세린", agency: "스마트투어 판매점" },
      type: "reservation_close",
      summary: "예약마감 처리",
      changes: [{ label: "예약상태", before: "예약확정", after: "예약마감" }],
    },
    {
      id: "h-260003-4",
      at: "2026-10-01 18:00",
      actor: { name: "오세린", agency: "스마트투어 판매점" },
      type: "operation_handover",
      summary: "행복투어로 운영관리 권한 인계",
    },
  ],
  "AOS-RSV-260004": [
    {
      id: "h-260004-1",
      at: "2026-09-30 15:20",
      actor: { name: "최하은", agency: "스마트투어 판매점" },
      type: "reservation_create",
      summary: "스마트투어 판매점을 통해 예약이 생성되었습니다.",
    },
    {
      id: "h-260004-2",
      at: "2026-09-30 16:00",
      actor: { name: "오세린", agency: "스마트투어 판매점" },
      type: "payment_status_change",
      changes: [{ label: "결제상태", before: "미결제", after: "부분결제" }],
    },
  ],
};

/** 세션 내 추가된 변경이력 (SAMPLE · 새로고침 시 초기화) */
const sessionReservationHistory: Record<string, ReservationHistoryEntry[]> = {};

export function addReservationHistory(code: string, entries: Omit<ReservationHistoryEntry, "id">[]) {
  const list = sessionReservationHistory[code] ?? [];
  entries.forEach((entry, index) => {
    list.push({ ...entry, id: `h-${code}-s${list.length + 1}-${index}` });
  });
  sessionReservationHistory[code] = list;
}

/** 최신순 변경이력 */
export function getReservationHistory(code: string): ReservationHistoryEntry[] {
  const sellerChannel = findSellerChannelRecord(code);
  const reservation = sellerChannel?.reservation ?? RESERVATION_DETAILS.find((item) => item.code === code);
  if (!reservation) return [];
  const base = sellerChannel?.history ?? RESERVATION_HISTORY[code] ?? [
    {
      id: `h-${code}-0`,
      at: reservation.reservedAt,
      actor: { name: "시스템", agency: "애비아넥스트" },
      type: "reservation_create" as const,
      summary: "예약이 등록되었습니다.",
    },
  ];
  const all = [...base, ...(sessionReservationHistory[code] ?? [])];
  return all
    .map((entry, order) => ({ entry, order }))
    .sort((a, b) => (a.entry.at === b.entry.at ? b.order - a.order : a.entry.at < b.entry.at ? 1 : -1))
    .map(({ entry }) => ({ ...entry, changes: entry.changes?.map((change) => ({ ...change })) }));
}

type ReservationEditableValues = Pick<
  ReservationDetail,
  | "bookerName"
  | "phone"
  | "email"
  | "productName"
  | "departureAt"
  | "reserveStatus"
  | "paymentStatus"
  | "counts"
  | "productAmount"
  | "optionAmount"
  | "discountAmount"
  | "paidAmount"
  | "requestNote"
  | "adminMemo"
  | "internalNote"
  | "boardingPoint"
>;

/** 저장 전/후 값을 비교해 사용자가 읽을 수 있는 변경이력을 만듭니다. */
export function buildReservationEditHistory(
  before: ReservationEditableValues,
  after: ReservationEditableValues,
  actor: ReservationActor,
  at: string,
): Omit<ReservationHistoryEntry, "id">[] {
  const text = (value: string | undefined) => (value && value.trim() ? value.trim() : "없음");
  const entries: Omit<ReservationHistoryEntry, "id">[] = [];
  const push = (type: ReservationHistoryType, changes: ReservationHistoryChange[]) => {
    if (changes.length) entries.push({ at, actor, type, changes });
  };

  const peopleBefore = formatPeopleLabel(before.counts);
  const peopleAfter = formatPeopleLabel(after.counts);
  push("people_change", peopleBefore !== peopleAfter ? [{ label: "예약인원", before: peopleBefore, after: peopleAfter }] : []);

  push(
    "boarding_change",
    text(before.boardingPoint) !== text(after.boardingPoint)
      ? [{ label: "탑승지", before: text(before.boardingPoint), after: text(after.boardingPoint) }]
      : [],
  );

  const infoFields: [string, string, string][] = [
    ["예약자명", before.bookerName, after.bookerName],
    ["연락처", before.phone, after.phone],
    ["이메일", before.email, after.email],
    ["상품명", before.productName, after.productName],
    ["출발일", before.departureAt, after.departureAt],
    ["요청사항", before.requestNote, after.requestNote],
    ["상품금액", formatKrw(before.productAmount), formatKrw(after.productAmount)],
    ["옵션금액", formatKrw(before.optionAmount), formatKrw(after.optionAmount)],
    ["할인금액", formatKrw(before.discountAmount), formatKrw(after.discountAmount)],
    ["결제금액", before.paidAmount, after.paidAmount],
    ["관리자 메모", before.adminMemo, after.adminMemo],
    ["내부관리용 비고", before.internalNote, after.internalNote],
  ];
  push(
    "info_update",
    infoFields
      .filter(([, prev, next]) => text(prev) !== text(next))
      .map(([label, prev, next]) => ({ label, before: text(prev), after: text(next) })),
  );

  push(
    "payment_status_change",
    before.paymentStatus !== after.paymentStatus
      ? [{ label: "결제상태", before: before.paymentStatus, after: after.paymentStatus }]
      : [],
  );
  push(
    "reservation_status_change",
    before.reserveStatus !== after.reserveStatus
      ? [{ label: "예약상태", before: before.reserveStatus, after: after.reserveStatus }]
      : [],
  );
  return entries;
}

/** 예약마감 업무 Action: 즉시 반영 + 변경이력 기록 */
export function closeReservation(code: string, actor: ReservationActor, at: string) {
  const reservation = getReservationDetail(code);
  if (!reservation) return;
  saveReservationEdits(code, {
    reserveStatus: "예약마감",
    reserveStatusClass: reserveStatusBadgeClass("예약마감"),
    source: {
      ...(reservation.source ?? { type: "direct" }),
      closedAt: at,
      closedBy: actor,
      lastModifiedBy: actor.agency,
    },
  });
  addReservationHistory(code, [
    {
      at,
      actor,
      type: "reservation_close",
      summary: "예약마감 처리",
      changes: [{ label: "예약상태", before: reservation.reserveStatus, after: "예약마감" }],
    },
  ]);
}

export function getReservationCancellationStatus(reservation: Pick<ReservationDetail, "cancellation">): ReservationCancellationStatus {
  return reservation.cancellation?.type ?? "none";
}

/** 취소/환불 Mock 처리: 누적 환불금액·취소수수료를 기록하고, 전체취소면 예약상태를 취소완료로 변경합니다. */
export function applyReservationCancellation(code: string, cancellation: ReservationCancellation) {
  const reservation = getReservationDetail(code);
  if (!reservation) return;
  const isFull = cancellation.type === "full";
  const nextReserveStatus = isFull ? "취소완료" : reservation.reserveStatus;
  const nextPaymentStatus = isFull && cancellation.refundAmount > 0 ? "환불완료" : reservation.paymentStatus;
  saveReservationEdits(code, {
    cancellation,
    reserveStatus: nextReserveStatus,
    reserveStatusClass: reserveStatusBadgeClass(nextReserveStatus),
    paymentStatus: nextPaymentStatus,
    paymentStatusClass: paymentStatusBadgeClass(nextPaymentStatus),
  });
  const changes: ReservationHistoryChange[] = [
    { label: "취소상태", before: RESERVATION_CANCELLATION_LABELS[getReservationCancellationStatus(reservation)], after: RESERVATION_CANCELLATION_LABELS[cancellation.type] },
    { label: "환불금액", before: formatKrw(reservation.cancellation?.refundAmount ?? 0), after: formatKrw(cancellation.refundAmount) },
    { label: "취소수수료", before: formatKrw(reservation.cancellation?.cancellationFee ?? 0), after: formatKrw(cancellation.cancellationFee) },
  ];
  if (nextReserveStatus !== reservation.reserveStatus) {
    changes.push({ label: "예약상태", before: reservation.reserveStatus, after: nextReserveStatus });
  }
  if (nextPaymentStatus !== reservation.paymentStatus) {
    changes.push({ label: "결제상태", before: reservation.paymentStatus, after: nextPaymentStatus });
  }
  addReservationHistory(code, [
    {
      at: cancellation.processedAt,
      actor: cancellation.processedBy,
      type: "reservation_cancel",
      summary: `${RESERVATION_CANCELLATION_LABELS[cancellation.type]} · 사유: ${cancellation.reason}`,
      changes: changes.filter((change) => change.before !== change.after),
    },
  ]);
}

/** 운영인계 업무 Action: 예약상태는 유지하고 운영관리 권한만 공급여행사로 넘깁니다. */
export function handoverReservation(code: string, actor: ReservationActor, at: string) {
  const reservation = getReservationDetail(code);
  if (!reservation?.source) return;
  saveReservationEdits(code, {
    source: { ...reservation.source, handoverAt: at, handoverBy: actor, lastModifiedBy: actor.agency },
  });
  addReservationHistory(code, [
    {
      at,
      actor,
      type: "operation_handover",
      summary: `${reservation.source.supplierAgencyName ?? "공급여행사"}로 운영관리 권한 인계`,
    },
  ]);
}

const RESERVATION_PAYMENTS: Record<string, ReservationPayment[]> = {
  R20260620001: [
    {
      id: "pay-001",
      paidAt: "2026.06.20 10:18",
      paymentNumber: "PAY-20260620-001",
      method: "신용카드",
      amount: 900000,
      status: "결제완료",
      approvalNumber: "12345678",
      processedBy: "시스템",
    },
    {
      id: "pay-002",
      paidAt: "2026.06.20 10:25",
      paymentNumber: "PAY-20260620-002",
      method: "신용카드",
      amount: 600000,
      status: "결제완료",
      approvalNumber: "12345679",
      processedBy: "시스템",
    },
  ],
  R20260615002: [
    {
      id: "pay-003",
      paidAt: "2026.06.15 14:42",
      paymentNumber: "PAY-20260615-001",
      method: "계좌이체",
      amount: 800000,
      status: "결제완료",
      approvalNumber: "99887766",
      processedBy: "시스템",
    },
  ],
  R20260528003: [
    {
      id: "pay-004",
      paidAt: "2026.05.28 11:05",
      paymentNumber: "PAY-20260528-001",
      method: "신용카드",
      amount: 1420000,
      status: "결제완료",
      approvalNumber: "55667788",
      processedBy: "시스템",
    },
  ],
};

const RESERVATION_REFUNDS: Record<string, ReservationRefund[]> = {
  R20260528003: [
    {
      id: "ref-001",
      refundedAt: "2026.06.08 16:20",
      refundNumber: "REF-20260608-001",
      paymentNumber: "PAY-20260528-001",
      method: "원결제 취소",
      amount: 1278000,
      status: "환불완료",
      reason: "출발 3일 전 취소 요청",
      processedBy: "장윤호",
    },
  ],
};

function withStatusClasses(
  item: Omit<ReservationListItem, "reserveStatusClass" | "paymentStatusClass">,
): ReservationListItem {
  return {
    ...item,
    reserveStatusClass: reserveStatusBadgeClass(item.reserveStatus),
    paymentStatusClass: paymentStatusBadgeClass(item.paymentStatus),
  };
}

/**
 * 예약목록.
 * includeSellerChannel: 판매점 관리자에서 접수된 공급여행사 상품 예약(판매점 예약 Mock 연동) 포함 여부.
 * 운영배정 · 정산 · 탑승지 데이터는 기존 예약 기준을 유지하기 위해 기본값은 제외합니다.
 */
export function getReservationList({ includeSellerChannel = false }: { includeSellerChannel?: boolean } = {}): ReservationListItem[] {
  const sellerChannel = includeSellerChannel
    ? listSellerChannelRecords().map((record) => withSessionEdits(withStatusClasses(record.reservation)))
    : [];
  return [...sellerChannel, ...RESERVATION_DETAILS.map((item) => withSessionEdits(item))];
}

export function getReservationDetail(id: string): ReservationDetail | undefined {
  const sellerChannel = findSellerChannelRecord(id);
  if (sellerChannel) return withSessionEdits(withStatusClasses(sellerChannel.reservation));
  const reservation = RESERVATION_DETAILS.find((item) => item.code === id);
  return reservation ? withSessionEdits(reservation) : undefined;
}

export function getReservationPayments(code: string): ReservationPayment[] {
  const list = findSellerChannelRecord(code)?.payments ?? RESERVATION_PAYMENTS[code] ?? [];
  return list.map((item) => ({ ...item }));
}

/** 세션 내 추가된 환불내역 (SAMPLE · 새로고침 시 초기화) */
const sessionReservationRefunds: Record<string, ReservationRefund[]> = {};

export function getReservationRefunds(code: string): ReservationRefund[] {
  const list = findSellerChannelRecord(code)?.refunds ?? RESERVATION_REFUNDS[code] ?? [];
  return [...(sessionReservationRefunds[code] ?? []), ...list].map((item) => ({ ...item }));
}

/** 판매점 예약 환불단계: 취소승인 후 환불대기 → (환불실패) → 환불완료 / 환불없음 */
export type SellerRefundStage = "환불대기" | "환불실패" | "환불완료" | "환불없음";

export function getSellerRefundStage(request: ReservationSellerCancelRequest | undefined): SellerRefundStage | null {
  if (!request || !request.approval) return null;
  if (request.refund) return request.refund.status;
  return request.status === "취소승인" ? "환불대기" : null;
}

/** 취소승인 예약의 다음 처리: 환불처리 · 환불 재시도 · 환불 없이 취소완료 (결제 0원 / 환불예정 0원) */
export type SellerRefundMode = "refund" | "retry" | "completeUnpaid" | "completeNoRefund";

export function getSellerRefundMode(reservation: Pick<ReservationDetail, "paidAmount" | "sellerCancelRequest">): SellerRefundMode | null {
  const request = reservation.sellerCancelRequest;
  if (!request?.approval || request.status !== "취소승인") return null;
  if (parseKrw(reservation.paidAmount) === 0) return "completeUnpaid";
  if (request.approval.refundAmount === 0) return "completeNoRefund";
  return request.refund?.status === "환불실패" ? "retry" : "refund";
}

function addMinutesToTimestamp(value: string, minutes: number) {
  const [date, time = "00:00"] = value.split(" ");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute + minutes)).toISOString().slice(0, 16).replace("T", " ");
}

/**
 * 환불처리 Mock — 확정된 환불예정금액 전체를 한 번에 처리합니다. (부분환불 없음)
 * 성공: 결제상태 환불완료 → 예약상태 취소완료 / 실패: 예약상태 취소승인 · 결제상태 유지
 */
export function processSellerRefund(
  code: string,
  input: {
    method: ReservationSellerRefundMethod;
    memo: string;
    bankAccount: ReservationSellerRefund["bankAccount"];
    fail: boolean;
  },
  actor: ReservationActor,
  attemptAt: string,
): "완료" | "실패" | null {
  const reservation = getReservationDetail(code);
  const request = reservation?.sellerCancelRequest;
  if (!reservation || !request?.approval) return null;
  const mode = getSellerRefundMode(reservation);
  if (mode !== "refund" && mode !== "retry") return null;

  const amount = request.approval.refundAmount;
  const previousAttempts = request.refund?.attempts ?? [];
  const timeline = reservation.statusTimeline ?? [];
  const attemptEntry: ReservationStatusTimelineEntry = {
    at: attemptAt,
    label: mode === "retry" ? "환불 재시도" : "환불처리 시도",
    actor: actor.name,
    tone: "info",
    note: `${input.method} · ${formatKrw(amount)}`,
  };

  if (input.fail) {
    saveReservationEdits(code, {
      sellerCancelRequest: {
        ...request,
        refund: {
          status: "환불실패",
          method: input.method,
          amount,
          refundedAt: null,
          processedBy: actor,
          memo: input.memo,
          bankAccount: input.bankAccount,
          attempts: [...previousAttempts, { at: attemptAt, result: "실패", method: input.method, amount, processedBy: actor }],
          completedAt: null,
        },
      },
      statusTimeline: [
        ...timeline,
        attemptEntry,
        { at: attemptAt, label: "환불실패", actor: actor.name, tone: "danger", note: "환불정보 확인 후 재처리 필요" },
      ],
    });
    addReservationHistory(code, [
      { at: attemptAt, actor, type: "reservation_cancel", summary: `환불처리 실패 · ${input.method} · ${formatKrw(amount)}` },
    ]);
    return "실패";
  }

  const refundedAt = addMinutesToTimestamp(attemptAt, 1);
  saveReservationEdits(code, {
    reserveStatus: "취소완료",
    reserveStatusClass: reserveStatusBadgeClass("취소완료"),
    paymentStatus: "환불완료",
    paymentStatusClass: paymentStatusBadgeClass("환불완료"),
    unpaidAmount: formatKrw(0),
    sellerCancelRequest: {
      ...request,
      status: "취소완료",
      refund: {
        status: "환불완료",
        method: input.method,
        amount,
        refundedAt,
        processedBy: actor,
        memo: input.memo,
        bankAccount: input.bankAccount,
        attempts: [...previousAttempts, { at: refundedAt, result: "완료", method: input.method, amount, processedBy: actor }],
        completedAt: refundedAt,
      },
    },
    statusTimeline: [
      ...timeline,
      attemptEntry,
      { at: refundedAt, label: `${actor.agency} 환불완료`, actor: actor.name, tone: "gray", note: `${input.method} · ${formatKrw(amount)}` },
      { at: refundedAt, label: "예약 취소완료", actor: actor.name, tone: "gray" },
    ],
  });
  const payments = getReservationPayments(code);
  sessionReservationRefunds[code] = [
    {
      id: `ref-${code}-s${(sessionReservationRefunds[code]?.length ?? 0) + 1}`,
      refundedAt: refundedAt.replace(/-/g, "."),
      refundNumber: `REF-${code.replace(/^RSV-/, "")}-S1`,
      paymentNumber: payments[0]?.paymentNumber ?? "-",
      method: input.method === "계좌환불" ? "계좌환불" : "원결제 취소",
      amount,
      status: "환불완료",
      reason: `예약 취소승인 · ${request.reason}`,
      processedBy: actor.name,
    },
    ...(sessionReservationRefunds[code] ?? []),
  ];
  addReservationHistory(code, [
    {
      at: refundedAt,
      actor,
      type: "payment_status_change",
      summary: `환불완료 · ${input.method} · ${formatKrw(amount)}${input.memo ? ` · ${input.memo}` : ""}`,
      changes: [{ label: "결제상태", before: reservation.paymentStatus, after: "환불완료" }],
    },
    {
      at: refundedAt,
      actor,
      type: "reservation_status_change",
      summary: "환불완료에 따라 예약 취소완료",
      changes: [{ label: "예약상태", before: reservation.reserveStatus, after: "취소완료" }],
    },
  ]);
  return "완료";
}

/** 결제금액 0원 또는 환불예정금액 0원 — 환불 없이 취소완료 (결제상태는 유지) */
export function completeSellerCancelWithoutRefund(code: string, actor: ReservationActor, completedAt: string) {
  const reservation = getReservationDetail(code);
  const request = reservation?.sellerCancelRequest;
  if (!reservation || !request?.approval) return false;
  const mode = getSellerRefundMode(reservation);
  if (mode !== "completeUnpaid" && mode !== "completeNoRefund") return false;
  const note = mode === "completeUnpaid" ? "결제금액 없음 · 환불 없이 취소완료" : "환불예정금액 0원 · 별도 환불 없음";
  saveReservationEdits(code, {
    reserveStatus: "취소완료",
    reserveStatusClass: reserveStatusBadgeClass("취소완료"),
    unpaidAmount: formatKrw(0),
    sellerCancelRequest: {
      ...request,
      status: "취소완료",
      refund: {
        status: "환불없음",
        method: null,
        amount: 0,
        refundedAt: null,
        processedBy: actor,
        memo: "",
        bankAccount: null,
        attempts: request.refund?.attempts ?? [],
        completedAt,
      },
    },
    statusTimeline: [
      ...(reservation.statusTimeline ?? []),
      { at: completedAt, label: "예약 취소완료", actor: actor.name, tone: "gray", note },
    ],
  });
  addReservationHistory(code, [
    {
      at: completedAt,
      actor,
      type: "reservation_status_change",
      summary: note,
      changes: [{ label: "예약상태", before: reservation.reserveStatus, after: "취소완료" }],
    },
  ]);
  return true;
}

/**
 * 판매점 취소요청 승인 (SAMPLE).
 * 예약상태만 취소승인으로 변경 — 결제상태 · 결제금액은 유지하고 환불 · 정산 반영은 다음 단계에서 처리합니다.
 */
export function approveSellerCancelRequest(
  code: string,
  input: { recommendedFee: number; cancellationFee: number; refundAmount: number; memo: string },
  actor: ReservationActor,
  processedAt: string,
) {
  const reservation = getReservationDetail(code);
  const request = reservation?.sellerCancelRequest;
  if (!reservation || !request || request.status !== "검토대기") return false;
  const actorLabel = actor.name;
  saveReservationEdits(code, {
    reserveStatus: "취소승인",
    reserveStatusClass: reserveStatusBadgeClass("취소승인"),
    sellerCancelRequest: { ...request, status: "취소승인", approval: { ...input, processedAt, processedBy: actor } },
    statusTimeline: [
      ...(reservation.statusTimeline ?? []),
      {
        at: processedAt,
        label: `${actor.agency} 취소승인`,
        actor: actorLabel,
        tone: "warn",
        note: `취소수수료 ${formatKrw(input.cancellationFee)} · 환불예정 ${formatKrw(input.refundAmount)}`,
      },
    ],
  });
  addReservationHistory(code, [
    {
      at: processedAt,
      actor,
      type: "reservation_status_change",
      summary: `${request.sellerName} 취소요청 승인 · 취소수수료 ${formatKrw(input.cancellationFee)} · 환불예정 ${formatKrw(input.refundAmount)}${input.memo ? ` · ${input.memo}` : ""}`,
      changes: [{ label: "예약상태", before: reservation.reserveStatus, after: "취소승인" }],
    },
  ]);
  return true;
}

/** 판매점 취소요청 거절 (SAMPLE) — 취소요청 전 예약상태로 복원하고 처리이력은 유지합니다. */
export function rejectSellerCancelRequest(
  code: string,
  input: { reason: string; reasonDetail: string | null },
  actor: ReservationActor,
  processedAt: string,
) {
  const reservation = getReservationDetail(code);
  const request = reservation?.sellerCancelRequest;
  if (!reservation || !request || request.status !== "검토대기") return false;
  const restored = request.previousReservationStatus;
  const reasonText = input.reasonDetail ? `${input.reason} · ${input.reasonDetail}` : input.reason;
  saveReservationEdits(code, {
    reserveStatus: restored,
    reserveStatusClass: reserveStatusBadgeClass(restored),
    sellerCancelRequest: { ...request, status: "취소거절", rejection: { ...input, processedAt, processedBy: actor } },
    statusTimeline: [
      ...(reservation.statusTimeline ?? []),
      { at: processedAt, label: `${actor.agency} 취소거절`, actor: actor.name, tone: "danger", note: reasonText },
      { at: processedAt, label: `${restored} 유지`, actor: actor.name, tone: reserveStatusBadgeClass(restored) },
    ],
  });
  addReservationHistory(code, [
    {
      at: processedAt,
      actor,
      type: "reservation_status_change",
      summary: `${request.sellerName} 취소요청 거절 · ${reasonText}`,
      changes: [{ label: "예약상태", before: reservation.reserveStatus, after: restored }],
    },
  ]);
  return true;
}

export function formatReservationPeople(reservation: ReservationDetail) {
  const total = reservation.counts.adult + reservation.counts.child + reservation.counts.infant;
  return `${total}명`;
}

export function getReservationKpis(items: ReservationListItem[], today = new Date().toISOString().slice(0, 10)) {
  return {
    total: items.length,
    confirmed: items.filter((item) => item.reserveStatus === "예약확정").length,
    paymentPending: items.filter((item) => ["미결제", "결제대기", "부분결제"].includes(item.paymentStatus)).length,
    cancelled: items.filter((item) => item.reserveStatus.includes("취소")).length,
    departingToday: items.filter((item) => item.departureAt === today).length,
  };
}
