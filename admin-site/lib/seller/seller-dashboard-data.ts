/**
 * 판매점 관리자 대시보드 Mock
 * - 로그인한 판매점(sellerId) 스코프 데이터만 포함
 * - 이후 API 교체 시 getSellerDashboardSnapshot(sellerId) 시그니처 유지
 */

export type SellerDashboardKpi = {
  availableProductCount: number;
  monthReservationCount: number;
  monthSalesAmount: number;
  pendingCommissionAmount: number;
};

export type SellerDashboardReservation = {
  reservationCode: string;
  productName: string;
  customerName: string;
  departureDate: string;
  pax: number;
  paymentAmount: number;
  status: "예약접수" | "예약확정" | "대기" | "취소요청" | "취소완료";
};

export type SellerDashboardTopProduct = {
  productName: string;
  reservationCount: number;
  paxCount: number;
  salesAmount: number;
};

export type SellerDashboardSnapshot = {
  sellerId: string;
  periodLabel: string;
  kpi: SellerDashboardKpi;
  recentReservations: SellerDashboardReservation[];
  topProducts: SellerDashboardTopProduct[];
};

const DASHBOARD_BY_SELLER: Record<string, SellerDashboardSnapshot> = {
  SEL00032: {
    sellerId: "SEL00032",
    periodLabel: "2026년 9월",
    kpi: {
      availableProductCount: 18,
      monthReservationCount: 32,
      monthSalesAmount: 18750000,
      pendingCommissionAmount: 1275000,
    },
    recentReservations: [
      {
        reservationCode: "R260916-032",
        productName: "제주 중문·성산 2박 3일",
        customerName: "김민지",
        departureDate: "2026-10-05",
        pax: 3,
        paymentAmount: 890000,
        status: "예약확정",
      },
      {
        reservationCode: "R260915-028",
        productName: "부산 해운대·감천 당일",
        customerName: "이영수",
        departureDate: "2026-09-28",
        pax: 2,
        paymentAmount: 168000,
        status: "예약확정",
      },
      {
        reservationCode: "R260914-021",
        productName: "강릉·속초 2박 3일",
        customerName: "박은주",
        departureDate: "2026-10-12",
        pax: 4,
        paymentAmount: 1240000,
        status: "예약접수",
      },
      {
        reservationCode: "R260913-019",
        productName: "여수 밤바다 당일",
        customerName: "최성호",
        departureDate: "2026-09-22",
        pax: 2,
        paymentAmount: 156000,
        status: "대기",
      },
      {
        reservationCode: "R260912-015",
        productName: "경주 역사문화 1박 2일",
        customerName: "윤서현",
        departureDate: "2026-10-01",
        pax: 3,
        paymentAmount: 540000,
        status: "취소요청",
      },
      {
        reservationCode: "R260911-011",
        productName: "전주 한옥마을 당일",
        customerName: "강지훈",
        departureDate: "2026-09-20",
        pax: 1,
        paymentAmount: 89000,
        status: "취소완료",
      },
    ],
    topProducts: [
      {
        productName: "제주 중문·성산 2박 3일",
        reservationCount: 9,
        paxCount: 24,
        salesAmount: 6120000,
      },
      {
        productName: "강릉·속초 2박 3일",
        reservationCount: 7,
        paxCount: 18,
        salesAmount: 4860000,
      },
      {
        productName: "부산 해운대·감천 당일",
        reservationCount: 6,
        paxCount: 14,
        salesAmount: 1176000,
      },
      {
        productName: "경주 역사문화 1박 2일",
        reservationCount: 5,
        paxCount: 13,
        salesAmount: 2340000,
      },
      {
        productName: "여수 밤바다 당일",
        reservationCount: 5,
        paxCount: 11,
        salesAmount: 780000,
      },
    ],
  },
};

/** 판매점 스코프 대시보드 조회 (API 교체 시 이 함수만 교체) */
export function getSellerDashboardSnapshot(sellerId: string): SellerDashboardSnapshot {
  const key = sellerId.trim();
  return (
    DASHBOARD_BY_SELLER[key] ?? {
      sellerId: key || "UNKNOWN",
      periodLabel: "이번 달",
      kpi: {
        availableProductCount: 0,
        monthReservationCount: 0,
        monthSalesAmount: 0,
        pendingCommissionAmount: 0,
      },
      recentReservations: [],
      topProducts: [],
    }
  );
}

export function formatSellerDashboardAmount(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function formatSellerDashboardCount(value: number, unit: string) {
  return `${value.toLocaleString("ko-KR")}${unit}`;
}

export function sellerDashboardStatusBadgeClass(status: SellerDashboardReservation["status"]) {
  if (status === "예약확정") return "success";
  if (status === "예약접수") return "info";
  if (status === "대기" || status === "취소요청") return "warn";
  if (status === "취소완료") return "danger";
  return "gray";
}
