/**
 * 판매점 상세 · 예약현황 Mock (SAMPLE)
 * - 해당 판매점에서 발생한 예약 조회용
 * - 향후 예약관리 연동을 위한 sellerId 스코프 구조
 * - API·DB 없음
 */

export type SellerReservationStatus = "예약접수" | "예약확정" | "취소";
export type SellerReservationSettleStatus = "미정산" | "정산대기" | "정산예정" | "정산완료" | "보류";
export type SellerReservationDateBasis = "예약일" | "출발일";

export type SellerReservationRow = {
  /** 예약관리 상세 경로용 코드 */
  reservationCode: string;
  sellerId: string;
  reservedAt: string;
  departureAt: string;
  productName: string;
  productCode: string;
  customerName: string;
  pax: number;
  salesAmount: number;
  commissionAmount: number;
  commissionRate: number;
  reservationStatus: SellerReservationStatus;
  settleStatus: SellerReservationSettleStatus;
};

export type SellerReservationFilters = {
  dateBasis: SellerReservationDateBasis;
  dateFrom: string;
  dateTo: string;
  keyword: string;
  status: SellerReservationStatus | "전체";
};

export const EMPTY_SELLER_RESERVATION_FILTERS: SellerReservationFilters = {
  dateBasis: "예약일",
  dateFrom: "",
  dateTo: "",
  keyword: "",
  status: "전체",
};

export const SELLER_RESERVATION_STATUS_OPTIONS = ["전체", "예약접수", "예약확정", "취소"] as const;
export const SELLER_RESERVATION_DATE_BASIS_OPTIONS = ["예약일", "출발일"] as const;

const SEED: SellerReservationRow[] = [
  {
    reservationCode: "R20260901001",
    sellerId: "SELLER-001",
    reservedAt: "2026-09-01T02:10:00.000Z",
    departureAt: "2026-10-12T00:00:00.000Z",
    productName: "중국여행 샘플상품 001",
    productCode: "AOS-P-001",
    customerName: "홍길동",
    pax: 2,
    salesAmount: 302000,
    commissionAmount: 15100,
    commissionRate: 5,
    reservationStatus: "예약확정",
    settleStatus: "정산예정",
  },
  {
    reservationCode: "R20260902014",
    sellerId: "SELLER-001",
    reservedAt: "2026-09-02T05:20:00.000Z",
    departureAt: "2026-10-18T00:00:00.000Z",
    productName: "일본여행 샘플상품 002",
    productCode: "AOS-P-002",
    customerName: "김서연",
    pax: 3,
    salesAmount: 363000,
    commissionAmount: 25410,
    commissionRate: 7,
    reservationStatus: "예약확정",
    settleStatus: "정산대기",
  },
  {
    reservationCode: "R20260903008",
    sellerId: "SELLER-001",
    reservedAt: "2026-09-03T01:40:00.000Z",
    departureAt: "2026-09-28T00:00:00.000Z",
    productName: "제주도 샘플상품 003",
    productCode: "AOS-P-003",
    customerName: "이준호",
    pax: 1,
    salesAmount: 153000,
    commissionAmount: 7650,
    commissionRate: 5,
    reservationStatus: "취소",
    settleStatus: "미정산",
  },
  {
    reservationCode: "R20260905021",
    sellerId: "SELLER-001",
    reservedAt: "2026-09-05T08:15:00.000Z",
    departureAt: "2026-11-02T00:00:00.000Z",
    productName: "특별열차 샘플상품 004",
    productCode: "AOS-P-004",
    customerName: "박민지",
    pax: 4,
    salesAmount: 808000,
    commissionAmount: 60600,
    commissionRate: 7.5,
    reservationStatus: "예약확정",
    settleStatus: "정산완료",
  },
  {
    reservationCode: "R20260907003",
    sellerId: "SELLER-001",
    reservedAt: "2026-09-07T03:55:00.000Z",
    departureAt: "2026-10-05T00:00:00.000Z",
    productName: "당일여행 샘플상품 005",
    productCode: "AOS-P-005",
    customerName: "최유진",
    pax: 2,
    salesAmount: 254000,
    commissionAmount: 12700,
    commissionRate: 5,
    reservationStatus: "예약접수",
    settleStatus: "미정산",
  },
  {
    reservationCode: "R20260908019",
    sellerId: "SELLER-001",
    reservedAt: "2026-09-08T06:30:00.000Z",
    departureAt: "2026-10-22T00:00:00.000Z",
    productName: "온천/휴양 샘플상품 006",
    productCode: "AOS-P-006",
    customerName: "정하늘",
    pax: 2,
    salesAmount: 326000,
    commissionAmount: 26080,
    commissionRate: 8,
    reservationStatus: "예약확정",
    settleStatus: "보류",
  },
  {
    reservationCode: "R20260909011",
    sellerId: "SELLER-001",
    reservedAt: "2026-09-09T09:05:00.000Z",
    departureAt: "2026-11-15T00:00:00.000Z",
    productName: "중국여행 샘플상품 007",
    productCode: "AOS-P-007",
    customerName: "오세린",
    pax: 5,
    salesAmount: 955000,
    commissionAmount: 47750,
    commissionRate: 5,
    reservationStatus: "예약확정",
    settleStatus: "정산예정",
  },
  {
    reservationCode: "R20260828007",
    sellerId: "SELLER-001",
    reservedAt: "2026-08-28T04:10:00.000Z",
    departureAt: "2026-09-20T00:00:00.000Z",
    productName: "일본여행 샘플상품 008",
    productCode: "AOS-P-008",
    customerName: "윤서아",
    pax: 2,
    salesAmount: 328000,
    commissionAmount: 16400,
    commissionRate: 5,
    reservationStatus: "취소",
    settleStatus: "미정산",
  },
  {
    reservationCode: "R20260830016",
    sellerId: "SELLER-001",
    reservedAt: "2026-08-30T07:45:00.000Z",
    departureAt: "2026-10-01T00:00:00.000Z",
    productName: "제주도 샘플상품 009",
    productCode: "AOS-P-009",
    customerName: "강동현",
    pax: 3,
    salesAmount: 477000,
    commissionAmount: 23850,
    commissionRate: 5,
    reservationStatus: "예약확정",
    settleStatus: "정산완료",
  },
  {
    reservationCode: "R20260904004",
    sellerId: "SELLER-001",
    reservedAt: "2026-09-04T11:20:00.000Z",
    departureAt: "2026-10-30T00:00:00.000Z",
    productName: "특별열차 샘플상품 010",
    productCode: "AOS-P-010",
    customerName: "송지훈",
    pax: 1,
    salesAmount: 209000,
    commissionAmount: 10450,
    commissionRate: 5,
    reservationStatus: "예약접수",
    settleStatus: "미정산",
  },
  {
    reservationCode: "R20260906022",
    sellerId: "SELLER-001",
    reservedAt: "2026-09-06T02:00:00.000Z",
    departureAt: "2026-11-08T00:00:00.000Z",
    productName: "당일여행 샘플상품 011",
    productCode: "AOS-P-011",
    customerName: "한유진",
    pax: 2,
    salesAmount: 262000,
    commissionAmount: 13100,
    commissionRate: 5,
    reservationStatus: "예약확정",
    settleStatus: "정산대기",
  },
  {
    reservationCode: "R20260908030",
    sellerId: "SELLER-001",
    reservedAt: "2026-09-08T12:40:00.000Z",
    departureAt: "2026-12-01T00:00:00.000Z",
    productName: "온천/휴양 샘플상품 012",
    productCode: "AOS-P-012",
    customerName: "배수아",
    pax: 2,
    salesAmount: 332000,
    commissionAmount: 16600,
    commissionRate: 5,
    reservationStatus: "취소",
    settleStatus: "미정산",
  },
  {
    reservationCode: "R20260901055",
    sellerId: "SELLER-002",
    reservedAt: "2026-09-01T03:00:00.000Z",
    departureAt: "2026-10-10T00:00:00.000Z",
    productName: "샘플 개인판매 예약",
    productCode: "AOS-P-020",
    customerName: "테스트",
    pax: 1,
    salesAmount: 100000,
    commissionAmount: 5000,
    commissionRate: 5,
    reservationStatus: "예약접수",
    settleStatus: "미정산",
  },
];

function dateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatSellerMoney(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function formatSellerResvDate(value: string) {
  const key = dateKey(value);
  return key ? key.replace(/-/g, ".") : "-";
}

export function sellerReservationStatusBadgeClass(status: SellerReservationStatus) {
  if (status === "예약확정") return "success";
  if (status === "예약접수") return "warn";
  return "danger";
}

export function sellerReservationSettleBadgeClass(status: SellerReservationSettleStatus) {
  if (status === "정산완료") return "success";
  if (status === "정산예정") return "info";
  if (status === "정산대기") return "warn";
  if (status === "보류") return "danger";
  return "gray";
}

export function getSellerReservationDetailPath(reservationCode: string) {
  return `/reservations/${encodeURIComponent(reservationCode)}`;
}

export function listSellerReservations(sellerId: string, filters: SellerReservationFilters = EMPTY_SELLER_RESERVATION_FILTERS) {
  const keyword = filters.keyword.trim().toLowerCase();
  return SEED.filter((row) => row.sellerId === sellerId)
    .filter((row) => {
      if (filters.status !== "전체" && row.reservationStatus !== filters.status) return false;
      if (keyword) {
        const hit =
          row.reservationCode.toLowerCase().includes(keyword) ||
          row.customerName.toLowerCase().includes(keyword) ||
          row.productName.toLowerCase().includes(keyword);
        if (!hit) return false;
      }
      const basisValue = filters.dateBasis === "출발일" ? row.departureAt : row.reservedAt;
      const key = dateKey(basisValue);
      if (filters.dateFrom && key < filters.dateFrom) return false;
      if (filters.dateTo && key > filters.dateTo) return false;
      return true;
    })
    .sort((a, b) => b.reservedAt.localeCompare(a.reservedAt));
}

export function getSellerReservationSummary(sellerId: string, rows?: SellerReservationRow[]) {
  const list = rows ?? SEED.filter((row) => row.sellerId === sellerId);
  const confirmed = list.filter((row) => row.reservationStatus === "예약확정");
  const cancelled = list.filter((row) => row.reservationStatus === "취소");
  const salesTotal = list
    .filter((row) => row.reservationStatus !== "취소")
    .reduce((sum, row) => sum + row.salesAmount, 0);
  const commissionTotal = list
    .filter((row) => row.reservationStatus !== "취소")
    .reduce((sum, row) => sum + row.commissionAmount, 0);
  return {
    totalCount: list.length,
    confirmedCount: confirmed.length,
    cancelledCount: cancelled.length,
    salesTotal,
    commissionTotal,
  };
}
