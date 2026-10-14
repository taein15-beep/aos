/**
 * 판매점 관리자 · 예약관리 목록 Mock (SAMPLE / 테스트 데이터)
 * - 판매점(sellerId)을 통해 접수된 예약만 포함 — 다른 판매점 예약은 조회 대상 아님
 * - 판매점 → 공급여행사 → 판매상품 → 예약 구조 · 모든 예약은 공급여행사를 가짐
 * - 예약 당시 판매조건(판매가 · 입금가 · 수수료율)을 예약에 스냅샷으로 보존
 *   → 이후 판매가 · 공급조건이 바뀌어도 기존 예약금액 · 예상수익은 변하지 않음
 * - 월 합계는 Dashboard(seller-dashboard-data.ts) 이번 달 실적과 일치
 *   (판매금액 · 예상수익은 취소완료 예약 제외)
 * - 목록은 마스킹 연락처만 사용 · 예약 상세는 같은 예약 객체에 상세 필드를 확장 (주민등록번호 등 고위험 정보 미보관)
 */

import { listSellerAdminProducts, type SellerProductSaleMode } from "@/lib/seller/seller-admin-products-data";
import { getSellerProductDetail } from "@/lib/seller/seller-product-detail-data";

export type SellerReservationStatus = "예약접수" | "예약확정" | "취소요청" | "취소승인" | "취소완료";
export type SellerReservationPaymentStatus = "결제완료" | "일부결제" | "미결제" | "환불완료";

export const SELLER_RESERVATION_STATUSES: SellerReservationStatus[] = ["예약접수", "예약확정", "취소요청", "취소승인", "취소완료"];
export const SELLER_RESERVATION_PAYMENT_STATUSES: SellerReservationPaymentStatus[] = ["결제완료", "일부결제", "미결제", "환불완료"];

export type SellerReservation = {
  reservationCode: string;
  /** YYYY-MM-DD HH:mm */
  reservedAt: string;
  sellerId: string;
  supplierTravelAgencyId: string;
  supplierName: string;
  supplierCode: string;
  productCode: string;
  productName: string;
  /** 예약 당시 판매방식 */
  saleMode: SellerProductSaleMode;
  /** 예약 당시 1인 판매가 (고객 결제 기준) */
  unitPrice: number;
  /** 예약 당시 1인 입금가 (입금가형) */
  bookedDepositPrice: number | null;
  /** 예약 당시 수수료율 % (수수료형) */
  bookedCommissionRate: number | null;
  pax: number;
  customerName: string;
  customerPhoneMasked: string;
  status: SellerReservationStatus;
  paymentStatus: SellerReservationPaymentStatus;
};

/** Mock 기준일 — 기간 Filter(오늘 · 최근 7일 · 이번 달) 계산 기준 */
export const SELLER_RESERVATION_BASE_DATE = "2026-10-12";
const BASE_MONTH = SELLER_RESERVATION_BASE_DATE.slice(0, 7);

const MOCK_SELLER_ID = "SEL00032";

/** 예약 생성 시점의 판매조건 — 판매상품 원본 Mock 기준 (판매점 Client State 변경분은 반영하지 않음) */
const BOOKING_TERMS = new Map(listSellerAdminProducts(MOCK_SELLER_ID).map((product) => [product.productCode, product]));

type Row = [
  code: string,
  reservedAt: string,
  productCode: string,
  pax: number,
  customerName: string,
  phoneLast4: string,
  status: SellerReservationStatus,
  paymentStatus: SellerReservationPaymentStatus,
  bookedUnitPrice?: number,
];

/** SEL00032(그래가자) 이번 달 예약 38건 — 행복투어 21 · 현담여행사 17 */
const ROWS: Row[] = [
  ["RSV-20261012-001", "2026-10-12 14:32", "HT-WINE01", 2, "김민수", "5678", "예약확정", "결제완료"],
  ["RSV-20261012-002", "2026-10-12 11:48", "HD-TY01", 2, "윤서아", "2231", "예약접수", "미결제"],
  ["RSV-20261012-003", "2026-10-12 10:15", "HT-DY01", 1, "강도윤", "9012", "예약접수", "미결제"],
  ["RSV-20261011-004", "2026-10-11 16:20", "HT-DMZ01", 3, "이영희", "3344", "예약확정", "일부결제"],
  ["RSV-20261010-006", "2026-10-10 11:05", "HT-GP01", 1, "한지우", "7781", "예약접수", "결제완료"],
  ["RSV-20261010-009", "2026-10-10 13:12", "HD-BS02", 2, "박지현", "4410", "예약접수", "미결제"],
  ["RSV-20261009-005", "2026-10-09 10:30", "HD-SC01", 2, "오하린", "6620", "예약확정", "결제완료"],
  ["RSV-20261008-010", "2026-10-08 15:40", "HT-YS01", 1, "서준혁", "1098", "취소요청", "결제완료"],
  ["RSV-20261008-012", "2026-10-08 14:05", "HD-JS01", 1, "최준호", "8826", "취소요청", "결제완료"],
  ["RSV-20261007-008", "2026-10-07 09:50", "HT-WINE01", 3, "임채원", "5502", "예약확정", "결제완료"],
  ["RSV-20261005-015", "2026-10-05 17:10", "HT-GJ01", 4, "송민재", "3017", "예약확정", "결제완료"],
  ["RSV-20261005-013", "2026-10-05 16:00", "HD-TY01", 4, "배수빈", "7243", "예약확정", "결제완료"],
  ["RSV-20261005-018", "2026-10-05 13:25", "HT-WINE01", 2, "정수진", "6105", "취소완료", "환불완료"],
  ["RSV-20261005-007", "2026-10-05 10:40", "HD-NH01", 2, "조은별", "2958", "취소완료", "환불완료"],
  ["RSV-20261005-011", "2026-10-05 09:40", "HT-JJ01", 1, "황예준", "4471", "예약접수", "미결제"],
  ["RSV-20261004-016", "2026-10-04 18:05", "HT-NAMI01", 4, "문가을", "8390", "예약확정", "결제완료"],
  ["RSV-20261004-012", "2026-10-04 15:20", "HD-TY01", 3, "신태오", "1576", "예약확정", "일부결제"],
  ["RSV-20261004-009", "2026-10-04 11:30", "HT-GP01", 4, "권나연", "6634", "예약확정", "일부결제"],
  ["RSV-20261004-005", "2026-10-04 10:10", "HT-SR01", 2, "안시우", "2087", "취소완료", "환불완료"],
  ["RSV-20261004-003", "2026-10-04 09:15", "HD-GJ01", 1, "유하준", "9145", "예약확정", "결제완료"],
  ["RSV-20261003-014", "2026-10-03 16:45", "HT-GJ01", 3, "노지안", "3768", "예약확정", "결제완료"],
  ["RSV-20261003-010", "2026-10-03 14:30", "HD-TY01", 3, "전소율", "5219", "예약확정", "결제완료"],
  ["RSV-20261003-004", "2026-10-03 10:50", "HD-JS01", 1, "남도현", "0482", "취소요청", "결제완료"],
  ["RSV-20261003-007", "2026-10-03 10:20", "HT-DMZ01", 4, "홍유나", "7350", "예약확정", "결제완료"],
  ["RSV-20261003-002", "2026-10-03 09:05", "HT-WINE01", 4, "고은우", "1823", "예약확정", "결제완료"],
  ["RSV-20261002-011", "2026-10-02 16:35", "HD-BS02", 1, "장서진", "6047", "예약확정", "결제완료", 208000],
  ["RSV-20261002-013", "2026-10-02 15:15", "HT-GJ01", 3, "이도하", "8512", "예약확정", "결제완료"],
  ["RSV-20261002-006", "2026-10-02 11:00", "HT-DMZ01", 2, "김하율", "2694", "예약확정", "미결제"],
  ["RSV-20261002-005", "2026-10-02 10:05", "HD-NH01", 1, "박시온", "4836", "예약접수", "결제완료"],
  ["RSV-20261002-003", "2026-10-02 09:30", "HT-GJ01", 1, "최아인", "5961", "예약접수", "일부결제"],
  ["RSV-20261002-001", "2026-10-02 09:00", "HD-DY01", 3, "정이준", "3105", "취소완료", "환불완료"],
  ["RSV-20261001-012", "2026-10-01 17:20", "HT-YS01", 2, "강서윤", "7428", "예약확정", "결제완료"],
  ["RSV-20261001-010", "2026-10-01 15:45", "HD-TY01", 2, "윤지호", "1360", "예약확정", "일부결제"],
  ["RSV-20261001-008", "2026-10-01 13:40", "HT-DY01", 2, "임하은", "6271", "예약확정", "결제완료"],
  ["RSV-20261001-007", "2026-10-01 13:10", "HD-SC01", 3, "한유진", "8903", "예약확정", "결제완료"],
  ["RSV-20261001-005", "2026-10-01 11:20", "HD-DY01", 2, "오세아", "2519", "예약확정", "결제완료"],
  ["RSV-20261001-004", "2026-10-01 10:00", "HT-WINE01", 1, "서다온", "9734", "예약확정", "결제완료"],
  ["RSV-20261001-002", "2026-10-01 09:35", "HD-JS01", 1, "송라온", "4087", "예약확정", "결제완료"],
];

function buildReservation(row: Row): SellerReservation {
  const [reservationCode, reservedAt, productCode, pax, customerName, phoneLast4, status, paymentStatus, bookedUnitPrice] = row;
  const terms = BOOKING_TERMS.get(productCode);
  if (!terms) throw new Error(`Unknown mock product: ${productCode}`);
  const isCommission = terms.saleMode === "수수료형";
  const currentPrice = (isCommission ? terms.supplyPrice : terms.sellerPrice) ?? 0;
  return {
    reservationCode,
    reservedAt,
    sellerId: MOCK_SELLER_ID,
    supplierTravelAgencyId: terms.supplierTravelAgencyId,
    supplierName: terms.supplyAgencyName,
    supplierCode: terms.supplierCode,
    productCode,
    productName: terms.productName,
    saleMode: terms.saleMode,
    unitPrice: bookedUnitPrice ?? currentPrice,
    bookedDepositPrice: isCommission ? null : terms.depositPrice,
    bookedCommissionRate: isCommission ? terms.commissionRate : null,
    pax,
    customerName,
    customerPhoneMasked: `010-****-${phoneLast4}`,
    status,
    paymentStatus,
  };
}

const RESERVATIONS_BY_SELLER: Record<string, SellerReservation[]> = {
  [MOCK_SELLER_ID]: ROWS.map(buildReservation),
};

/** 판매점 스코프 예약 목록 — 최신 예약순 (API 교체 시 이 함수만 교체) */
export function listSellerReservations(sellerId: string): SellerReservation[] {
  return [...(RESERVATIONS_BY_SELLER[sellerId.trim()] ?? [])].sort((a, b) => b.reservedAt.localeCompare(a.reservedAt));
}

/** 예약금액 = 예약 당시 1인 판매가 × 인원 */
export function sellerReservationAmount(reservation: SellerReservation) {
  return reservation.unitPrice * reservation.pax;
}

/** 예약 당시 조건 기준 예상수익 — 수수료형: 예약금액 × 수수료율 / 입금가형: (판매가 - 입금가) × 인원 */
export function sellerReservationBookedProfit(reservation: SellerReservation) {
  if (reservation.saleMode === "수수료형") {
    return Math.round((sellerReservationAmount(reservation) * (reservation.bookedCommissionRate ?? 0)) / 100);
  }
  return (reservation.unitPrice - (reservation.bookedDepositPrice ?? reservation.unitPrice)) * reservation.pax;
}

/** 목록 표시용 예상수익 — 취소완료는 정산 대상 제외(0원) */
export function sellerReservationExpectedProfit(reservation: SellerReservation) {
  return reservation.status === "취소완료" ? 0 : sellerReservationBookedProfit(reservation);
}

export type SellerReservationSummary = {
  total: number;
  confirmed: number;
  received: number;
  cancelRequested: number;
  cancelled: number;
  salesAmount: number;
  expectedProfit: number;
};

/** 월 Summary — 판매금액 · 예상수익은 취소완료 제외 */
export function summarizeSellerReservations(reservations: readonly SellerReservation[]): SellerReservationSummary {
  return reservations.reduce<SellerReservationSummary>(
    (acc, row) => {
      const active = row.status !== "취소완료";
      return {
        total: acc.total + 1,
        confirmed: acc.confirmed + (row.status === "예약확정" ? 1 : 0),
        received: acc.received + (row.status === "예약접수" ? 1 : 0),
        cancelRequested: acc.cancelRequested + (row.status === "취소요청" || row.status === "취소승인" ? 1 : 0),
        cancelled: acc.cancelled + (row.status === "취소완료" ? 1 : 0),
        salesAmount: acc.salesAmount + (active ? sellerReservationAmount(row) : 0),
        expectedProfit: acc.expectedProfit + sellerReservationExpectedProfit(row),
      };
    },
    { total: 0, confirmed: 0, received: 0, cancelRequested: 0, cancelled: 0, salesAmount: 0, expectedProfit: 0 },
  );
}

export function isSellerReservationInBaseMonth(reservation: SellerReservation) {
  return reservation.reservedAt.startsWith(BASE_MONTH);
}

export type SellerReservationPeriod = "today" | "week" | "month" | "custom";

export const SELLER_RESERVATION_PERIODS: { key: SellerReservationPeriod; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "week", label: "최근 7일" },
  { key: "month", label: "이번 달" },
  { key: "custom", label: "기간선택" },
];

export type SellerReservationFilters = {
  period: SellerReservationPeriod;
  from: string;
  to: string;
  keyword: string;
  supplierId: string;
  status: SellerReservationStatus | "전체";
  paymentStatus: SellerReservationPaymentStatus | "전체";
};

export const DEFAULT_SELLER_RESERVATION_FILTERS: SellerReservationFilters = {
  period: "month",
  from: `${BASE_MONTH}-01`,
  to: SELLER_RESERVATION_BASE_DATE,
  keyword: "",
  supplierId: "전체",
  status: "전체",
  paymentStatus: "전체",
};

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

function periodRange(filters: SellerReservationFilters): [string, string] {
  switch (filters.period) {
    case "today":
      return [SELLER_RESERVATION_BASE_DATE, SELLER_RESERVATION_BASE_DATE];
    case "week":
      return [shiftDate(SELLER_RESERVATION_BASE_DATE, -6), SELLER_RESERVATION_BASE_DATE];
    case "custom":
      return filters.from <= filters.to ? [filters.from, filters.to] : [filters.to, filters.from];
    default:
      return [`${BASE_MONTH}-01`, SELLER_RESERVATION_BASE_DATE];
  }
}

export function filterSellerReservations(
  reservations: readonly SellerReservation[],
  filters: SellerReservationFilters,
): SellerReservation[] {
  const [from, to] = periodRange(filters);
  const keyword = filters.keyword.trim().toLowerCase();
  return reservations.filter((row) => {
    const date = row.reservedAt.slice(0, 10);
    if ((from && date < from) || (to && date > to)) return false;
    if (filters.supplierId !== "전체" && row.supplierTravelAgencyId !== filters.supplierId) return false;
    if (filters.status !== "전체" && row.status !== filters.status) return false;
    if (filters.paymentStatus !== "전체" && row.paymentStatus !== filters.paymentStatus) return false;
    if (!keyword) return true;
    return [row.reservationCode, row.customerName, row.productName, row.productCode].some((value) =>
      value.toLowerCase().includes(keyword),
    );
  });
}

/** 기간 외 조건(검색 · 공급여행사 · 상태 · 결제상태)이 기본값과 다른지 */
export function hasSellerReservationConditionFilter(filters: SellerReservationFilters) {
  return (
    filters.keyword.trim() !== "" ||
    filters.supplierId !== "전체" ||
    filters.status !== "전체" ||
    filters.paymentStatus !== "전체"
  );
}

export function isSellerReservationFilterActive(filters: SellerReservationFilters) {
  return hasSellerReservationConditionFilter(filters) || filters.period !== DEFAULT_SELLER_RESERVATION_FILTERS.period;
}

export function sellerReservationStatusBadgeClass(status: SellerReservationStatus) {
  if (status === "예약확정") return "success";
  if (status === "예약접수") return "info";
  if (status === "취소요청" || status === "취소승인") return "warn";
  return "danger";
}

export function sellerReservationPaymentBadgeClass(status: SellerReservationPaymentStatus) {
  if (status === "결제완료") return "success";
  if (status === "일부결제") return "warn";
  if (status === "환불완료") return "info";
  return "gray";
}

export function formatSellerReservationAmount(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function formatSellerReservationDate(reservedAt: string) {
  const [date, time = ""] = reservedAt.split(" ");
  return { date: date.replaceAll("-", "."), time };
}

/** 예약 상세 Route — /seller/reservations/{예약번호} */
export function sellerReservationDetailPath(reservationCode: string) {
  return `/seller/reservations/${encodeURIComponent(reservationCode)}`;
}

/* ───────────── 예약 상세 (STEP 7-2) — 목록과 동일한 예약 객체에 상세 필드 확장 ───────────── */

export type SellerReservationTravelerType = "성인" | "소아" | "유아";

export type SellerReservationCompanion = {
  name: string;
  type: SellerReservationTravelerType;
  phoneMasked: string | null;
  birthDate: string;
  note: string | null;
};

export type SellerReservationPaymentRecord = {
  at: string;
  type: "카드결제" | "계좌이체" | "환불";
  amount: number;
  result: "완료";
};

export type SellerReservationStatusRecord = { at: string; status: SellerReservationStatus; note?: string };

export type SellerReservationCancelRequest = {
  requestedAt: string;
  /** 취소를 요청한 고객 (예약자) */
  requester: string;
  reason: string;
  /** 취소사유 `기타` 직접입력 내용 */
  reasonDetail: string | null;
  customerNote: string | null;
  /** 시스템 등록 주체 (판매점명) — 기존 Mock은 null */
  registeredBy: string | null;
  processStatus: "공급여행사 확인중" | "취소승인" | "취소거절" | "취소완료";
  completedAt: string | null;
  refundAmount: number | null;
  /** 공급여행사 확정 취소수수료 (취소승인 이후) */
  cancelFee?: number | null;
  /** 공급여행사 환불처리 실패 — 재처리 대기 */
  refundFailed?: boolean;
  /** 공급여행사 취소거절 사유 */
  rejectReason?: string;
};

export type SellerReservationDetail = SellerReservation & {
  customerPhone: string;
  customerEmail: string;
  customerBirthDate: string;
  customerGender: "남" | "여";
  paxBreakdown: Record<SellerReservationTravelerType, number>;
  /** 예약자 제외 동행자 */
  companions: SellerReservationCompanion[];
  travelDate: string;
  travelEndDate: string | null;
  /** 탑승 · 집결 시간 */
  meetingTime: string;
  boardingPlace: string;
  paymentMethod: "카드" | "계좌이체" | null;
  paidAmount: number;
  refundAmount: number;
  payments: SellerReservationPaymentRecord[];
  statusHistory: SellerReservationStatusRecord[];
  cancelRequest: SellerReservationCancelRequest | null;
  memo: string | null;
  supplierMemo: string | null;
};

type DetailOverride = Partial<
  Pick<
    SellerReservationDetail,
    "customerPhone" | "customerEmail" | "customerBirthDate" | "customerGender" | "companions" | "memo" | "supplierMemo" | "boardingPlace"
  >
> & { partialPaidAmount?: number; cancelReason?: string; travelDate?: string };

const DETAIL_OVERRIDES: Record<string, DetailOverride> = {
  "RSV-20261012-001": {
    customerPhone: "010-1234-5678",
    customerEmail: "minsu.kim@example.com",
    customerBirthDate: "1980-05-12",
    customerGender: "남",
    companions: [{ name: "김영희", type: "성인", phoneMasked: "010-****-1234", birthDate: "1982-07-11", note: "채식" }],
    memo: "창가 좌석 요청",
    supplierMemo: "동행자 1명 채식 요청",
    boardingPlace: "서울역",
  },
  "RSV-20261011-004": { partialPaidAmount: 100000, travelDate: "2026-10-16" },
  "RSV-20261008-012": { cancelReason: "개인사정" },
  "RSV-20261005-018": { cancelReason: "개인 일정 변경" },
};

const COMPANION_NAMES = ["이수아", "박건우", "최민서", "정예린", "한도경", "오지민", "윤채은", "장현우"];
const CANCEL_REASONS = ["개인 일정 변경", "건강상 사유", "여행 일정 변경"];
const MEMO_POOL = ["출발 전날 안내 연락 요청", "단체 사진 촬영 희망", null, null];

function addMinutes(dateTime: string, minutes: number) {
  const [date, time = "00:00"] = dateTime.split(" ");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, hour, minute + minutes));
  return value.toISOString().slice(0, 16).replace("T", " ");
}

function subtractTime(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute - minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function mockBirthDate(index: number, adult: boolean) {
  const year = adult ? 1965 + ((index * 7) % 30) : 2015 + (index % 4);
  return `${year}-${String(1 + ((index * 5) % 12)).padStart(2, "0")}-${String(1 + ((index * 11) % 28)).padStart(2, "0")}`;
}

function buildDetail(reservation: SellerReservation, index: number): SellerReservationDetail {
  const override = DETAIL_OVERRIDES[reservation.reservationCode] ?? {};
  const terms = BOOKING_TERMS.get(reservation.productCode);
  const overnight = terms?.category === "숙박여행";
  const firstSchedule = terms ? (getSellerProductDetail(terms).schedule[0]?.time ?? "08:00") : "08:00";
  const departure = terms ? getSellerProductDetail(terms).departure : "서울";
  const amount = sellerReservationAmount(reservation);

  const childCount = reservation.pax >= 3 && index % 3 === 0 ? 1 : 0;
  const companions =
    override.companions ??
    Array.from({ length: reservation.pax - 1 }, (_, offset) => {
      const isChild = childCount > 0 && offset === reservation.pax - 2;
      return {
        name: COMPANION_NAMES[(index + offset) % COMPANION_NAMES.length],
        type: isChild ? "소아" : "성인",
        phoneMasked: isChild ? null : `010-****-${String(1000 + ((index * 37 + offset * 113) % 9000))}`,
        birthDate: mockBirthDate(index + offset + 1, !isChild),
        note: null,
      } satisfies SellerReservationCompanion;
    });

  const travelDate = override.travelDate ?? shiftDate(reservation.reservedAt.slice(0, 10), 5 + (index % 9));
  const paymentMethod = index % 3 === 2 ? "계좌이체" : "카드";
  const paidAt = addMinutes(reservation.reservedAt, 3);
  const confirmedAt = addMinutes(reservation.reservedAt, 38);
  const isCancelFlow = reservation.status === "취소요청" || reservation.status === "취소완료";
  const cancelRequestedAt = addMinutes(reservation.reservedAt, 24 * 60 + 135);
  const cancelCompletedAt = addMinutes(cancelRequestedAt, 40);

  let paidAmount = 0;
  if (reservation.paymentStatus === "결제완료" || reservation.paymentStatus === "환불완료") paidAmount = amount;
  if (reservation.paymentStatus === "일부결제") {
    paidAmount = override.partialPaidAmount ?? Math.round(amount / 2 / 10000) * 10000;
  }
  const refundAmount = reservation.paymentStatus === "환불완료" ? paidAmount : 0;

  const payments: SellerReservationPaymentRecord[] = [];
  if (paidAmount > 0) {
    payments.push({ at: paidAt, type: paymentMethod === "카드" ? "카드결제" : "계좌이체", amount: paidAmount, result: "완료" });
  }
  if (refundAmount > 0) payments.push({ at: cancelCompletedAt, type: "환불", amount: refundAmount, result: "완료" });

  const statusHistory: SellerReservationStatusRecord[] = [{ at: reservation.reservedAt, status: "예약접수" }];
  if (reservation.status !== "예약접수") statusHistory.push({ at: confirmedAt, status: "예약확정", note: `${reservation.supplierName} 확정` });
  if (isCancelFlow) statusHistory.push({ at: cancelRequestedAt, status: "취소요청", note: "고객 요청" });
  if (reservation.status === "취소완료") statusHistory.push({ at: cancelCompletedAt, status: "취소완료", note: "환불 완료" });

  const phoneMid = String(2000 + ((index * 731) % 7000));
  return {
    ...reservation,
    customerPhone: override.customerPhone ?? `010-${phoneMid}-${reservation.customerPhoneMasked.slice(-4)}`,
    customerEmail: override.customerEmail ?? `customer${String(index + 1).padStart(2, "0")}@example.com`,
    customerBirthDate: override.customerBirthDate ?? mockBirthDate(index, true),
    customerGender: override.customerGender ?? (index % 2 === 0 ? "남" : "여"),
    paxBreakdown: { 성인: reservation.pax - childCount, 소아: childCount, 유아: 0 },
    companions,
    travelDate,
    travelEndDate: overnight ? shiftDate(travelDate, 1) : null,
    meetingTime: subtractTime(firstSchedule, 30),
    boardingPlace: override.boardingPlace ?? `${departure} 집결지 (출발 전 안내)`,
    paymentMethod: paidAmount > 0 ? paymentMethod : null,
    paidAmount,
    refundAmount,
    payments,
    statusHistory,
    cancelRequest: isCancelFlow
      ? {
          requestedAt: cancelRequestedAt,
          requester: reservation.customerName,
          reason: override.cancelReason ?? CANCEL_REASONS[index % CANCEL_REASONS.length],
          reasonDetail: null,
          customerNote: null,
          registeredBy: null,
          processStatus: reservation.status === "취소완료" ? "취소완료" : "공급여행사 확인중",
          completedAt: reservation.status === "취소완료" ? cancelCompletedAt : null,
          refundAmount: reservation.status === "취소완료" ? refundAmount : null,
        }
      : null,
    memo: override.memo !== undefined ? override.memo : MEMO_POOL[index % MEMO_POOL.length],
    supplierMemo: override.supplierMemo ?? null,
  };
}

/* ───────────── 판매점 취소요청 (STEP 7-3) — 예약 원본 Mock 위에 Client State로 덮어씀 ───────────── */

export const SELLER_CANCEL_REASONS = ["고객 개인사정", "일정 변경", "건강상의 사유", "중복예약", "상품 변경", "기타"] as const;
export type SellerCancelReason = (typeof SELLER_CANCEL_REASONS)[number];
export const SELLER_CANCEL_TEXT_MAX = 500;

/** 판매점이 등록한 취소요청 — 예약 단위(전체 인원) 요청만 지원 */
export type SellerReservationCancelRequestEntry = {
  requestedAt: string;
  registeredBy: string;
  reason: SellerCancelReason;
  reasonDetail: string | null;
  customerNote: string | null;
};

/** 예약번호 → 취소요청 */
export type SellerReservationCancelRequestMap = Readonly<Record<string, SellerReservationCancelRequestEntry>>;

/** 판매점 취소요청 가능 예약상태 — 결제상태(미결제 · 일부결제 · 결제완료)와 무관 */
export function isSellerReservationCancellable(status: SellerReservationStatus) {
  return status === "예약접수" || status === "예약확정";
}

function pendingCancelEntry(reservation: SellerReservation, requests: SellerReservationCancelRequestMap) {
  const entry = requests[reservation.reservationCode];
  return entry && isSellerReservationCancellable(reservation.status) ? entry : null;
}

/** 취소요청 반영 — 예약상태만 취소요청으로 변경 (결제상태 · 금액 · 예약 당시 조건은 유지) */
export function applySellerReservationCancelRequests(
  rows: SellerReservation[],
  requests: SellerReservationCancelRequestMap,
): SellerReservation[] {
  return rows.map((row) => (pendingCancelEntry(row, requests) ? { ...row, status: "취소요청" } : row));
}

/** 판매점 스코프 예약 상세 — 다른 판매점 예약 · 존재하지 않는 예약번호는 null */
export function getSellerReservationDetail(
  sellerId: string,
  reservationCode: string,
  requests: SellerReservationCancelRequestMap = {},
): SellerReservationDetail | null {
  const key = sellerId.trim();
  const rows = RESERVATIONS_BY_SELLER[key] ?? [];
  const index = rows.findIndex((row) => row.reservationCode === reservationCode.trim());
  if (index < 0) return null;
  const detail = buildDetail(rows[index], index);
  const entry = pendingCancelEntry(rows[index], requests);
  if (!entry) return detail;
  return {
    ...detail,
    status: "취소요청",
    statusHistory: [...detail.statusHistory, { at: entry.requestedAt, status: "취소요청", note: `${entry.registeredBy} · 취소요청` }],
    cancelRequest: {
      requestedAt: entry.requestedAt,
      requester: detail.customerName,
      reason: entry.reason,
      reasonDetail: entry.reasonDetail,
      customerNote: entry.customerNote,
      registeredBy: entry.registeredBy,
      processStatus: "공급여행사 확인중",
      completedAt: null,
      refundAmount: null,
    },
  };
}

export type SellerReservationTravelTiming = "past" | "today" | "upcoming";

/** Mock 기준일 대비 출발일 — 출발일이 지난 예약은 일반 취소요청 불가 */
export function sellerReservationTravelTiming(detail: SellerReservationDetail): SellerReservationTravelTiming {
  if (detail.travelDate < SELLER_RESERVATION_BASE_DATE) return "past";
  return detail.travelDate === SELLER_RESERVATION_BASE_DATE ? "today" : "upcoming";
}

/** 취소요청 등록시각 — Mock 기준일 + 현재 시각, 마지막 상태이력보다 앞서지 않음 */
export function sellerReservationCancelRequestedAt(lastHistoryAt: string, now = new Date()) {
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const candidate = `${SELLER_RESERVATION_BASE_DATE} ${time}`;
  return candidate > lastHistoryAt ? candidate : addMinutes(lastHistoryAt, 1);
}

export function formatSellerCancelReason(request: Pick<SellerReservationCancelRequest, "reason" | "reasonDetail">) {
  return request.reasonDetail ? `${request.reason} · ${request.reasonDetail}` : request.reason;
}

/** 미결제금액 = 총 예약금액 - 결제금액 (환불완료는 0) */
export function sellerReservationUnpaidAmount(detail: SellerReservationDetail) {
  if (detail.paymentStatus === "환불완료") return 0;
  return Math.max(0, sellerReservationAmount(detail) - detail.paidAmount);
}

export const SELLER_RESERVATION_STATUS_DESCRIPTIONS: Record<SellerReservationStatus, string> = {
  예약접수: "예약이 접수되어 공급여행사의 예약확정을 기다리는 상태입니다.",
  예약확정: "공급여행사에서 예약이 확정된 상태입니다.",
  취소요청: "취소요청이 등록되어 공급여행사의 취소처리를 기다리는 상태입니다.",
  취소승인: "공급여행사가 취소를 승인했습니다. 환불처리 후 취소완료됩니다.",
  취소완료: "예약 취소와 환불이 완료된 상태입니다. 정산 대상에서 제외됩니다.",
};

export function formatSellerReservationDateTime(value: string) {
  const { date, time } = formatSellerReservationDate(value);
  return time ? `${date} ${time}` : date;
}
