/**
 * 판매점 관리자 대시보드 Mock (SAMPLE)
 * - 로그인한 판매점(sellerId) 기준 · 전체 공급여행사 합계가 기본
 * - 공급여행사별 거래상태는 seller-login-mock.ts 시나리오를 단일 기준으로 사용
 * - 합계·건수는 공급여행사별 데이터에서 계산 (화면 간 수치 불일치 방지)
 * - 이후 API 교체 시 getSellerDashboardSnapshot(sellerId, scenarioKey) 시그니처 유지
 */

import {
  getSellerLoginScenario,
  summarizeSupplierTrades,
  type SupplierTradeStatus,
} from "@/lib/seller/seller-login-mock";

export type SellerDashboardPeriodKey = "today" | "week" | "month";

export type SellerDashboardPeriod = {
  key: SellerDashboardPeriodKey;
  label: string;
  reservationLabel: string;
  salesLabel: string;
  compareLabel: string;
};

export const SELLER_DASHBOARD_PERIODS: SellerDashboardPeriod[] = [
  { key: "today", label: "오늘", reservationLabel: "오늘 예약", salesLabel: "오늘 판매금액", compareLabel: "어제 대비" },
  { key: "week", label: "7일", reservationLabel: "최근 7일 예약", salesLabel: "최근 7일 판매금액", compareLabel: "이전 7일 대비" },
  { key: "month", label: "이번 달", reservationLabel: "이번 달 예약", salesLabel: "이번 달 판매금액", compareLabel: "지난달 대비" },
];

export const SELLER_DASHBOARD_DEFAULT_PERIOD: SellerDashboardPeriodKey = "month";

export function getSellerDashboardPeriod(key: SellerDashboardPeriodKey) {
  return SELLER_DASHBOARD_PERIODS.find((period) => period.key === key) ?? SELLER_DASHBOARD_PERIODS[2];
}

/** 기간별 실적 — 판매금액: 고객 최종 판매가 / 예상수익: 수수료형 수수료 + 입금가형(판매가 - 입금가) */
export type SellerDashboardPerformance = {
  reservationCount: number;
  previousReservationCount: number;
  salesAmount: number;
  expectedProfit: number;
};

/** 판매상품 상태 — 판매중 / 설정대기(판매점 설정 미완료) / 판매중지(현재 판매 불가) */
export type SellerDashboardProductStats = {
  onSale: number;
  setupPending: number;
  stopped: number;
};

/** 판매점 → 공급여행사 지급 기준 정산 금액 */
export type SellerDashboardSettlement = {
  pending: number;
  confirmed: number;
  paid: number;
};

export type SellerDashboardSupplier = {
  supplierId: string;
  supplierName: string;
  status: SupplierTradeStatus;
  /** 승인대기는 실적 미표시(null) */
  productStats: SellerDashboardProductStats | null;
  performance: Record<SellerDashboardPeriodKey, SellerDashboardPerformance> | null;
  settlement: SellerDashboardSettlement | null;
};

export type SellerDashboardReservationStatus = "예약접수" | "예약확정" | "취소요청" | "취소완료";

export type SellerDashboardReservation = {
  reservationCode: string;
  reservedAt: string;
  supplierName: string;
  productName: string;
  customerName: string;
  pax: number;
  salesAmount: number;
  status: SellerDashboardReservationStatus;
};

export type SellerDashboardCheckItem = {
  key: string;
  label: string;
  count: number;
  unit: string;
  tone: "warn" | "danger" | "info";
};

export type SellerDashboardScenarioKey = "normal" | "supplierSuspended" | "pendingOnly" | "empty";

export const SELLER_DASHBOARD_SCENARIOS: { key: SellerDashboardScenarioKey; label: string }[] = [
  { key: "normal", label: "기본" },
  { key: "supplierSuspended", label: "행복투어 이용중지 Preview" },
  { key: "empty", label: "가입 공급여행사 없음" },
];

type SupplierRecord = Omit<SellerDashboardSupplier, "status">;

/** SEL00032(그래가자) 공급여행사별 Mock 실적 */
const SUPPLIER_RECORDS: Record<string, SupplierRecord> = {
  행복투어: {
    supplierId: "AGENCY-HAPPY",
    supplierName: "행복투어",
    productStats: { onSale: 10, setupPending: 2, stopped: 0 },
    performance: {
      today: { reservationCount: 2, previousReservationCount: 1, salesAmount: 276000, expectedProfit: 36000 },
      week: { reservationCount: 6, previousReservationCount: 5, salesAmount: 1380000, expectedProfit: 182000 },
      month: { reservationCount: 21, previousReservationCount: 18, salesAmount: 4820000, expectedProfit: 640000 },
    },
    settlement: { pending: 3850000, confirmed: 2100000, paid: 1500000 },
  },
  현담여행사: {
    supplierId: "AGENCY-HYUNDAM",
    supplierName: "현담여행사",
    productStats: { onSale: 7, setupPending: 0, stopped: 1 },
    performance: {
      today: { reservationCount: 1, previousReservationCount: 1, salesAmount: 180000, expectedProfit: 24000 },
      week: { reservationCount: 4, previousReservationCount: 3, salesAmount: 860000, expectedProfit: 114000 },
      month: { reservationCount: 17, previousReservationCount: 14, salesAmount: 3600000, expectedProfit: 480000 },
    },
    settlement: { pending: 3130000, confirmed: 1820000, paid: 1200000 },
  },
  A투어: {
    supplierId: "AGENCY-A",
    supplierName: "A투어",
    productStats: null,
    performance: null,
    settlement: null,
  },
};

const RECENT_RESERVATIONS: SellerDashboardReservation[] = [
  {
    reservationCode: "AOS-RSV-260101",
    reservedAt: "2026-10-12",
    supplierName: "행복투어",
    productName: "철원 DMZ 평화관광",
    customerName: "김민수",
    pax: 2,
    salesAmount: 138000,
    status: "예약확정",
  },
  {
    reservationCode: "AOS-RSV-260100",
    reservedAt: "2026-10-12",
    supplierName: "현담여행사",
    productName: "남해 독일마을 당일투어",
    customerName: "이서연",
    pax: 3,
    salesAmount: 237000,
    status: "예약접수",
  },
  {
    reservationCode: "AOS-RSV-260099",
    reservedAt: "2026-10-11",
    supplierName: "행복투어",
    productName: "단양 패러글라이딩 체험",
    customerName: "박지훈",
    pax: 2,
    salesAmount: 198000,
    status: "취소요청",
  },
  {
    reservationCode: "AOS-RSV-260098",
    reservedAt: "2026-10-10",
    supplierName: "현담여행사",
    productName: "통영 케이블카·동피랑 1박 2일",
    customerName: "최유진",
    pax: 4,
    salesAmount: 596000,
    status: "예약확정",
  },
  {
    reservationCode: "AOS-RSV-260097",
    reservedAt: "2026-10-09",
    supplierName: "행복투어",
    productName: "가평 와인 클래스",
    customerName: "정하늘",
    pax: 2,
    salesAmount: 158000,
    status: "취소완료",
  },
];

const SUPPORTED_SELLER_IDS = ["SEL00032"];

/** 이용중지 공급여행사 상품은 현재 판매 불가 → 판매중지로 집계 (과거 실적·정산은 유지) */
function applyStatusToProducts(
  stats: SellerDashboardProductStats | null,
  status: SupplierTradeStatus,
): SellerDashboardProductStats | null {
  if (!stats || status === "승인대기") return null;
  if (status === "이용중지") {
    return { onSale: 0, setupPending: 0, stopped: stats.onSale + stats.setupPending + stats.stopped };
  }
  return stats;
}

function buildSuppliers(scenarioKey: SellerDashboardScenarioKey): SellerDashboardSupplier[] {
  if (scenarioKey === "empty") return [];
  const trades =
    scenarioKey === "pendingOnly"
      ? getSellerLoginScenario("normal").suppliers.filter((trade) => trade.status === "승인대기")
      : getSellerLoginScenario(scenarioKey).suppliers;
  return trades.flatMap((trade) => {
    const record = SUPPLIER_RECORDS[trade.supplierName];
    if (!record) return [];
    const isPending = trade.status === "승인대기";
    return [
      {
        ...record,
        status: trade.status,
        productStats: applyStatusToProducts(record.productStats, trade.status),
        performance: isPending ? null : record.performance,
        settlement: isPending ? null : record.settlement,
      },
    ];
  });
}

export function sumSellerDashboardPerformance(
  suppliers: SellerDashboardSupplier[],
  period: SellerDashboardPeriodKey,
): SellerDashboardPerformance {
  return suppliers.reduce<SellerDashboardPerformance>(
    (acc, supplier) => {
      const row = supplier.performance?.[period];
      if (!row) return acc;
      return {
        reservationCount: acc.reservationCount + row.reservationCount,
        previousReservationCount: acc.previousReservationCount + row.previousReservationCount,
        salesAmount: acc.salesAmount + row.salesAmount,
        expectedProfit: acc.expectedProfit + row.expectedProfit,
      };
    },
    { reservationCount: 0, previousReservationCount: 0, salesAmount: 0, expectedProfit: 0 },
  );
}

export function sumSellerDashboardProducts(suppliers: SellerDashboardSupplier[]) {
  const stats = suppliers.reduce<SellerDashboardProductStats>(
    (acc, supplier) => ({
      onSale: acc.onSale + (supplier.productStats?.onSale ?? 0),
      setupPending: acc.setupPending + (supplier.productStats?.setupPending ?? 0),
      stopped: acc.stopped + (supplier.productStats?.stopped ?? 0),
    }),
    { onSale: 0, setupPending: 0, stopped: 0 },
  );
  return { ...stats, total: stats.onSale + stats.setupPending + stats.stopped };
}

export function sumSellerDashboardSettlement(suppliers: SellerDashboardSupplier[]): SellerDashboardSettlement {
  return suppliers.reduce<SellerDashboardSettlement>(
    (acc, supplier) => ({
      pending: acc.pending + (supplier.settlement?.pending ?? 0),
      confirmed: acc.confirmed + (supplier.settlement?.confirmed ?? 0),
      paid: acc.paid + (supplier.settlement?.paid ?? 0),
    }),
    { pending: 0, confirmed: 0, paid: 0 },
  );
}

export function supplierProductTotal(supplier: SellerDashboardSupplier) {
  const stats = supplier.productStats;
  return stats ? stats.onSale + stats.setupPending + stats.stopped : 0;
}

function buildCheckItems(
  suppliers: SellerDashboardSupplier[],
  reservations: SellerDashboardReservation[],
): SellerDashboardCheckItem[] {
  const summary = summarizeSupplierTrades(suppliers);
  const products = sumSellerDashboardProducts(suppliers);
  const cancelRequests = reservations.filter((row) => row.status === "취소요청").length;
  const items: SellerDashboardCheckItem[] = [
    { key: "price", label: "판매가 설정이 필요한 상품", count: products.setupPending, unit: "건", tone: "warn" },
    { key: "pending", label: "승인대기 공급여행사", count: summary.pending, unit: "곳", tone: "info" },
    { key: "suspended", label: "이용중지 공급여행사", count: summary.suspended, unit: "곳", tone: "danger" },
    { key: "cancel", label: "취소요청 예약", count: cancelRequests, unit: "건", tone: "danger" },
  ];
  return items.filter((item) => item.count > 0);
}

export type SellerDashboardSnapshot = {
  sellerId: string;
  suppliers: SellerDashboardSupplier[];
  supplierSummary: ReturnType<typeof summarizeSupplierTrades>;
  recentReservations: SellerDashboardReservation[];
  checkItems: SellerDashboardCheckItem[];
};

/** 판매점 스코프 대시보드 조회 (API 교체 시 이 함수만 교체) */
export function getSellerDashboardSnapshot(
  sellerId: string,
  scenarioKey: SellerDashboardScenarioKey = "normal",
): SellerDashboardSnapshot {
  const key = sellerId.trim();
  const hasData = SUPPORTED_SELLER_IDS.includes(key);
  const suppliers = hasData ? buildSuppliers(scenarioKey) : [];
  const recentReservations = suppliers.some((supplier) => supplier.performance) ? RECENT_RESERVATIONS : [];
  return {
    sellerId: key || "UNKNOWN",
    suppliers,
    supplierSummary: summarizeSupplierTrades(suppliers),
    recentReservations,
    checkItems: buildCheckItems(suppliers, recentReservations),
  };
}

export function formatSellerDashboardAmount(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function formatSellerDashboardCount(value: number, unit: string) {
  return `${value.toLocaleString("ko-KR")}${unit}`;
}

export function formatSellerDashboardDate(value: string) {
  return value.replaceAll("-", ".");
}

export function sellerDashboardStatusBadgeClass(status: SellerDashboardReservationStatus) {
  if (status === "예약확정") return "success";
  if (status === "예약접수") return "info";
  if (status === "취소요청") return "warn";
  return "danger";
}

export function supplierTradeBadgeClass(status: SupplierTradeStatus) {
  if (status === "정상") return "success";
  if (status === "승인대기") return "warn";
  return "danger";
}
