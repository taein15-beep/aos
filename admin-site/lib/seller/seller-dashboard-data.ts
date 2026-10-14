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
import { countSellerProductsBySupplier } from "@/lib/seller/seller-admin-products-data";
import { listSellerReservations, sellerReservationAmount } from "@/lib/seller/seller-reservations-data";

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

export type SellerDashboardReservationStatus = "예약접수" | "예약확정" | "취소요청" | "취소승인" | "취소완료";

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

const DASHBOARD_SELLER_ID = "SEL00032";

/** SEL00032(그래가자) 공급여행사별 Mock 실적 — 판매상품 수는 판매상품 목록 Mock에서 계산 */
const SUPPLIER_RECORDS: Record<string, SupplierRecord> = {
  행복투어: {
    supplierId: "AGENCY-HAPPY",
    supplierName: "행복투어",
    productStats: countSellerProductsBySupplier(DASHBOARD_SELLER_ID, "AGENCY-HAPPY"),
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
    productStats: countSellerProductsBySupplier(DASHBOARD_SELLER_ID, "AGENCY-HYUNDAM"),
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

/** 예약관리 목록 Mock과 동일한 예약 — 최근 5건 · 취소요청 건수는 이번 달 전체 기준 */
const DASHBOARD_RESERVATIONS = listSellerReservations(DASHBOARD_SELLER_ID);
const RECENT_RESERVATIONS: SellerDashboardReservation[] = DASHBOARD_RESERVATIONS.slice(0, 5).map((row) => ({
  reservationCode: row.reservationCode,
  reservedAt: row.reservedAt.slice(0, 10),
  supplierName: row.supplierName,
  productName: row.productName,
  customerName: row.customerName,
  pax: row.pax,
  salesAmount: sellerReservationAmount(row),
  status: row.status,
}));
const CANCEL_REQUEST_COUNT = DASHBOARD_RESERVATIONS.filter((row) => row.status === "취소요청").length;

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
  const cancelRequests = reservations.length > 0 ? CANCEL_REQUEST_COUNT : 0;
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
  if (status === "취소요청" || status === "취소승인") return "warn";
  return "danger";
}

export function supplierTradeBadgeClass(status: SupplierTradeStatus) {
  if (status === "정상") return "success";
  if (status === "승인대기") return "warn";
  return "danger";
}
