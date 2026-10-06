import {
  formatSignedWon,
  type SettlementRecord,
  type SettlementStatus,
} from "@/lib/admin/settlement-data";
import {
  getActiveSettlementDocument,
  getOpenDispute,
  type SettlementDocument,
} from "@/lib/admin/settlement-document-data";

/**
 * 정산 대시보드 집계 (SAMPLE).
 * 현재 정산 진행현황은 live Mock 정산 데이터(SettlementRecord.amounts)로 계산합니다.
 * 금액은 정산 상세 · 목록과 같은 최종 정산액(amounts.finalSupplierAmount)을 사용합니다.
 * 기준일: 정산예정일(settlement.dueDate) · 지급완료는 지급일(payment.paidAt)
 */

export type SettlementDashboardMode = "supplier" | "selling";

export const SETTLEMENT_DASHBOARD_MODE_LABELS: Record<SettlementDashboardMode, string> = {
  supplier: "공급여행사",
  selling: "판매여행사",
};

export type SettlementPeriodPreset = "today" | "week" | "month" | "lastMonth" | "custom";

export const SETTLEMENT_PERIOD_PRESETS: { key: SettlementPeriodPreset; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "week", label: "이번주" },
  { key: "month", label: "이번달" },
  { key: "lastMonth", label: "지난달" },
  { key: "custom", label: "직접설정" },
];

export type SettlementDateRange = { from: string; to: string };

export type SettlementDashboardFilters = {
  /** 공급여행사 관점: 판매여행사 / 판매여행사 관점: 공급여행사 */
  counterparty: string;
  seller: string;
  product: string;
  status: "전체" | SettlementStatus;
};

export const EMPTY_SETTLEMENT_DASHBOARD_FILTERS: SettlementDashboardFilters = {
  counterparty: "전체",
  seller: "전체",
  product: "전체",
  status: "전체",
};

/** ---------- 날짜 ---------- */

const pad = (value: number) => String(value).padStart(2, "0");

function toDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateString(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function monthRange(year: number, monthIndex: number): SettlementDateRange {
  return { from: toDateString(new Date(Date.UTC(year, monthIndex, 1))), to: toDateString(new Date(Date.UTC(year, monthIndex + 1, 0))) };
}

/** 기간 Preset → 날짜범위 (이번주: 월요일 ~ 일요일) */
export function getSettlementPeriodRange(preset: SettlementPeriodPreset, today: string, custom?: SettlementDateRange): SettlementDateRange {
  const base = toDate(today);
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  if (preset === "today") return { from: today, to: today };
  if (preset === "week") {
    const offset = (base.getUTCDay() + 6) % 7;
    const monday = new Date(Date.UTC(year, month, base.getUTCDate() - offset));
    const sunday = new Date(Date.UTC(year, month, base.getUTCDate() - offset + 6));
    return { from: toDateString(monday), to: toDateString(sunday) };
  }
  if (preset === "lastMonth") return monthRange(year, month - 1);
  if (preset === "custom" && custom) return custom;
  return monthRange(year, month);
}

function inRange(value: string | undefined, range: SettlementDateRange) {
  if (!value) return false;
  const date = value.slice(0, 10);
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
}

/** ---------- 기본 판정 ---------- */

const RECEIVABLE_STATUSES: SettlementStatus[] = ["정산확정", "지급대기"];

export const isActiveSettlement = (record: SettlementRecord) => record.status !== "정산취소";
export const getSettlementBaseDate = (record: SettlementRecord) => record.settlement.dueDate;
const paidDateOf = (record: SettlementRecord) => record.settlement.payment?.paidAt;
/** 지급완료 금액: 지급 처리 금액 (없으면 최종 정산액) */
export const getSettlementPaidAmount = (record: SettlementRecord) => record.settlement.payment?.amount ?? record.amounts.finalSupplierAmount;

export function getSettlementCounterparty(record: SettlementRecord, mode: SettlementDashboardMode) {
  return mode === "supplier" ? record.sellingAgencyName : record.supplierAgencyName;
}

function matchesFilters(record: SettlementRecord, mode: SettlementDashboardMode, filters: SettlementDashboardFilters) {
  if (filters.counterparty !== "전체" && getSettlementCounterparty(record, mode) !== filters.counterparty) return false;
  if (mode === "selling" && filters.seller !== "전체" && (record.sellerName ?? "") !== filters.seller) return false;
  if (filters.product !== "전체" && record.productName !== filters.product) return false;
  if (filters.status !== "전체" && record.status !== filters.status) return false;
  return true;
}

/** ---------- KPI / Drill-down ---------- */

export type SettlementDashboardKpiKey =
  | "receivable"
  | "paid"
  | "pending"
  | "hold"
  | "adjustment"
  | "sales"
  | "revenue"
  | "payable"
  | "sellerPayable";

export type SettlementDashboardSummaryKey = "정산대기" | "정산확정" | "정산마감" | "확인대기" | "지급대기" | "지급완료" | "정산보류";

export const SETTLEMENT_DASHBOARD_SUMMARY_KEYS: SettlementDashboardSummaryKey[] = [
  "정산대기",
  "정산확정",
  "정산마감",
  "확인대기",
  "지급대기",
  "지급완료",
  "정산보류",
];

export type SettlementDashboardDrillKey = SettlementDashboardKpiKey | `status:${SettlementDashboardSummaryKey}`;

/** 대시보드 → 정산목록 필터 조건 (KPI와 같은 판정 함수를 사용해 건수 · 금액이 일치합니다) */
export type SettlementDashboardDrill = {
  key: SettlementDashboardDrillKey;
  label: string;
  mode: SettlementDashboardMode;
  range: SettlementDateRange;
  filters: SettlementDashboardFilters;
};

type DocumentLookup = (settlementCode: string) => SettlementDocument | undefined;

function matchesDrillKey(record: SettlementRecord, key: SettlementDashboardDrillKey, range: SettlementDateRange, documentOf: DocumentLookup) {
  if (!isActiveSettlement(record)) return false;
  if (key === "paid" || key === "status:지급완료") return record.status === "지급완료" && inRange(paidDateOf(record), range);
  if (!inRange(getSettlementBaseDate(record), range)) return false;
  switch (key) {
    case "receivable":
    case "payable":
      return RECEIVABLE_STATUSES.includes(record.status);
    case "sellerPayable":
      return RECEIVABLE_STATUSES.includes(record.status) && Boolean(record.sellerName);
    case "pending":
    case "status:정산대기":
      return record.status === "정산대기";
    case "hold":
    case "status:정산보류":
      return record.status === "정산보류";
    case "adjustment":
      return record.amounts.nextAdjustment !== 0 || record.adjustmentState === "required";
    case "sales":
    case "revenue":
      return true;
    case "status:정산확정":
      return record.status === "정산확정";
    case "status:지급대기":
      return record.status === "지급대기";
    case "status:정산마감":
      return record.status === "정산확정" && Boolean(record.settlement.closing);
    case "status:확인대기":
      return documentOf(record.settlementCode)?.status === "확인대기";
    default:
      return false;
  }
}

export function matchesSettlementDashboardDrill(record: SettlementRecord, drill: SettlementDashboardDrill, documentOf: DocumentLookup = getActiveSettlementDocument) {
  return matchesFilters(record, drill.mode, drill.filters) && matchesDrillKey(record, drill.key, drill.range, documentOf);
}

export type SettlementDashboardKpi = {
  key: SettlementDashboardKpiKey;
  label: string;
  count: number;
  amount: number;
  /** 조정금액처럼 +/− 기호를 표시 */
  signed?: boolean;
  tooltip: string;
  sub?: string;
  tone: "primary" | "success" | "muted" | "danger" | "warn" | "info";
};

export type SettlementDashboardStatusSummary = { key: SettlementDashboardSummaryKey; count: number; amount: number };

export type SettlementDashboardTrendPoint = { month: string; label: string; primary: number; secondary: number };

export type SettlementDashboardPartnerRow = {
  name: string;
  reservationCount: number;
  salesAmount: number;
  commissionAmount: number;
  settlementAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  adjustmentAmount: number;
};

export type SettlementDashboardIssueType = "정산보류" | "이의제기" | "조정필요" | "차기정산 예정" | "지급예정일 경과" | "정산서 미확인";

export type SettlementDashboardIssue = {
  id: string;
  settlementCode: string;
  counterparty: string;
  type: SettlementDashboardIssueType;
  amount: number;
  reason: string;
  badge: "danger" | "warn" | "info" | "gray";
};

export type SettlementDashboardUpcoming = {
  settlementCode: string;
  date: string;
  counterparty: string;
  amount: number;
  status: SettlementStatus;
};

export type SettlementDashboardPendingDocument = {
  settlementCode: string;
  documentNo: string;
  counterparty: string;
  requestedAt?: string;
  amount: number;
};

export type SettlementDashboardSummary = {
  mode: SettlementDashboardMode;
  range: SettlementDateRange;
  /** 기간 · 필터 적용 정산 (정산취소 제외) */
  scopedCount: number;
  totalSales: number;
  receivableAmount: number;
  payableAmount: number;
  paidAmount: number;
  pendingAmount: number;
  holdAmount: number;
  adjustmentAmount: number;
  kpis: SettlementDashboardKpi[];
  statusCounts: SettlementDashboardStatusSummary[];
  trend: SettlementDashboardTrendPoint[];
  partners: SettlementDashboardPartnerRow[];
  issues: SettlementDashboardIssue[];
  upcoming: SettlementDashboardUpcoming[];
  pendingDocuments: SettlementDashboardPendingDocument[];
};

const sumBy = (records: SettlementRecord[], pick: (record: SettlementRecord) => number) => records.reduce((total, record) => total + pick(record), 0);
const finalOf = (record: SettlementRecord) => record.amounts.finalSupplierAmount;

function buildTrend(records: SettlementRecord[], mode: SettlementDashboardMode, endDate: string): SettlementDashboardTrendPoint[] {
  const end = toDate(endDate);
  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5 + index, 1));
    const range = monthRange(monthDate.getUTCFullYear(), monthDate.getUTCMonth());
    const inMonth = records.filter((record) => inRange(getSettlementBaseDate(record), range));
    const paidInMonth = records.filter((record) => record.status === "지급완료" && inRange(paidDateOf(record), range));
    return {
      month: range.from.slice(0, 7),
      label: `${monthDate.getUTCMonth() + 1}월`,
      primary: mode === "supplier" ? sumBy(inMonth, finalOf) : sumBy(inMonth, (record) => record.breakdown.paidAmount),
      secondary: mode === "supplier" ? sumBy(paidInMonth, getSettlementPaidAmount) : sumBy(inMonth, (record) => record.breakdown.sellingAgencyRevenue),
    };
  });
}

function buildPartners(records: SettlementRecord[], mode: SettlementDashboardMode): SettlementDashboardPartnerRow[] {
  const groups = new Map<string, SettlementRecord[]>();
  records.forEach((record) => {
    const name = getSettlementCounterparty(record, mode);
    groups.set(name, [...(groups.get(name) ?? []), record]);
  });
  return Array.from(groups.entries())
    .map(([name, items]) => {
      const paid = items.filter((record) => record.status === "지급완료");
      return {
        name,
        reservationCount: items.length,
        salesAmount: sumBy(items, (record) => record.breakdown.paidAmount),
        commissionAmount:
          mode === "supplier" ? sumBy(items, (record) => record.breakdown.totalCommission) : sumBy(items, (record) => record.breakdown.sellingAgencyRevenue),
        settlementAmount: sumBy(items, finalOf),
        paidAmount: sumBy(paid, getSettlementPaidAmount),
        unpaidAmount: sumBy(
          items.filter((record) => record.status !== "지급완료"),
          finalOf,
        ),
        adjustmentAmount: sumBy(items, (record) => record.amounts.finalSupplierAmount - record.breakdown.supplierAmount),
      };
    })
    .sort((a, b) => b.settlementAmount - a.settlementAmount);
}

function buildIssues(records: SettlementRecord[], mode: SettlementDashboardMode, today: string, documentOf: DocumentLookup): SettlementDashboardIssue[] {
  const issues: SettlementDashboardIssue[] = [];
  records.forEach((record) => {
    const counterparty = getSettlementCounterparty(record, mode);
    const push = (type: SettlementDashboardIssueType, reason: string, badge: SettlementDashboardIssue["badge"], amount = finalOf(record)) =>
      issues.push({ id: `${record.settlementCode}-${type}`, settlementCode: record.settlementCode, counterparty, type, amount, reason, badge });
    const document = documentOf(record.settlementCode);
    if (record.status === "정산보류") {
      const hold = record.settlement.hold;
      push("정산보류", hold ? `${hold.reason} · ${hold.detail}` : "보류 사유 확인 필요", "danger");
    }
    const dispute = getOpenDispute(document);
    if (document?.status === "이의제기" && dispute) {
      push("이의제기", `${dispute.reason}${dispute.reasonEtc ? `(${dispute.reasonEtc})` : ""} · ${dispute.detail}`, "danger");
    }
    if (record.adjustmentState === "required") {
      push(
        "조정필요",
        record.amounts.unresolvedDifference !== 0
          ? `정산확정 이후 차액 ${formatSignedWon(record.amounts.unresolvedDifference)} · 조정내역 생성 필요`
          : "현재 정산 반영대기 조정 확인 필요",
        "warn",
        record.amounts.unresolvedDifference || record.amounts.pendingCurrentAdjustment,
      );
    }
    if (record.amounts.nextAdjustment !== 0) {
      push("차기정산 예정", `차기 정산 반영 예정 ${formatSignedWon(record.amounts.nextAdjustment)}`, "info", record.amounts.nextAdjustment);
    }
    if (getSettlementBaseDate(record) < today && record.status !== "지급완료") {
      push("지급예정일 경과", `정산예정일 ${getSettlementBaseDate(record)} 경과 · 현재 ${record.status}`, "warn");
    }
    if (document?.status === "확인대기") {
      push(
        "정산서 미확인",
        mode === "supplier"
          ? `${document.documentNo ?? "-"} · 판매여행사 확인 대기${document.requestedAt ? ` (요청 ${document.requestedAt})` : ""}`
          : `${document.documentNo ?? "-"} · 받은 정산서 확인 필요`,
        "gray",
      );
    }
  });
  const order: SettlementDashboardIssueType[] = ["이의제기", "정산보류", "조정필요", "지급예정일 경과", "정산서 미확인", "차기정산 예정"];
  return issues.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || a.settlementCode.localeCompare(b.settlementCode));
}

/**
 * 정산 대시보드 요약.
 * - KPI · 상태별 Summary · 거래처별 현황 · 월별 추이: 기간(정산예정일 기준) + 필터 적용
 * - 확인 필요 · 다가오는 지급일 · 확인 필요한 정산서: 기간과 무관한 미처리 건 (필터만 적용)
 */
export function getSettlementDashboardSummary({
  records,
  mode,
  range,
  filters,
  today,
  documentOf = getActiveSettlementDocument,
}: {
  records: SettlementRecord[];
  mode: SettlementDashboardMode;
  range: SettlementDateRange;
  filters: SettlementDashboardFilters;
  today: string;
  documentOf?: DocumentLookup;
}): SettlementDashboardSummary {
  const filtered = records.filter((record) => isActiveSettlement(record) && matchesFilters(record, mode, filters));
  const pick = (key: SettlementDashboardDrillKey) => filtered.filter((record) => matchesDrillKey(record, key, range, documentOf));
  const scoped = filtered.filter((record) => inRange(getSettlementBaseDate(record), range));

  const receivable = pick("receivable");
  const paid = pick("paid");
  const pending = pick("pending");
  const hold = pick("hold");
  const adjustment = pick("adjustment");
  const sellerPayable = pick("sellerPayable");

  const receivableAmount = sumBy(receivable, finalOf);
  const paidAmount = sumBy(paid, getSettlementPaidAmount);
  const pendingAmount = sumBy(pending, finalOf);
  const holdAmount = sumBy(hold, finalOf);
  const adjustmentAmount = sumBy(adjustment, (record) => record.amounts.nextAdjustment);
  const requiredCount = adjustment.filter((record) => record.adjustmentState === "required").length;
  const adjustmentSub = requiredCount ? `조정필요 ${requiredCount}건 포함` : "차기 정산 추가/차감 예정";
  const totalSales = sumBy(scoped, (record) => record.breakdown.paidAmount);
  const refunds = sumBy(scoped, (record) => record.breakdown.refundAmount);

  const kpis: SettlementDashboardKpi[] =
    mode === "supplier"
      ? [
          {
            key: "receivable",
            label: "받을 정산금액",
            count: receivable.length,
            amount: receivableAmount,
            tooltip: "정산확정 및 지급대기 상태의 공급사 최종 정산액 합계 (정산예정일 기준)",
            sub: "정산확정 · 지급대기",
            tone: "primary",
          },
          {
            key: "paid",
            label: "지급완료",
            count: paid.length,
            amount: paidAmount,
            tooltip: "선택기간에 지급완료 처리된 지급금액 합계 (지급일 기준)",
            sub: "지급일 기준",
            tone: "success",
          },
          {
            key: "pending",
            label: "정산대기",
            count: pending.length,
            amount: pendingAmount,
            tooltip: "아직 정산확정되지 않은 정산의 예상 공급사 정산액 합계",
            sub: "미확정 · 예상 금액",
            tone: "muted",
          },
          {
            key: "hold",
            label: "정산보류",
            count: hold.length,
            amount: holdAmount,
            tooltip: "정산보류 상태 정산의 공급사 정산액 합계",
            sub: "보류 해제 후 진행",
            tone: "danger",
          },
          {
            key: "adjustment",
            label: "차기정산 조정",
            count: adjustment.length,
            amount: adjustmentAmount,
            signed: true,
            tooltip: "차기 정산에 추가/차감 반영 예정인 조정금액 합계 (현재 정산액 미포함) · 조정필요 건 수 포함",
            sub: adjustmentSub,
            tone: "warn",
          },
        ]
      : [
          {
            key: "sales",
            label: "총 판매금액",
            count: scoped.length,
            amount: totalSales,
            tooltip: "선택기간 정산 대상의 고객 결제금액 합계 (정산취소 제외 · 환불 전 금액)",
            sub: refunds > 0 ? `환불 ${formatSignedWon(-refunds)} 별도` : "고객 결제금액",
            tone: "primary",
          },
          {
            key: "revenue",
            label: "판매수익",
            count: scoped.length,
            amount: sumBy(scoped, (record) => record.breakdown.sellingAgencyRevenue),
            tooltip: "판매수수료 + 판매여행사 귀속 취소수수료 합계",
            sub: "판매수수료",
            tone: "success",
          },
          {
            key: "payable",
            label: "공급사 지급예정",
            count: receivable.length,
            amount: receivableAmount,
            tooltip: "정산확정 및 지급대기 상태로 공급여행사에 정산할 최종 정산액 합계",
            sub: "정산확정 · 지급대기",
            tone: "info",
          },
          {
            key: "sellerPayable",
            label: "판매점 지급예정",
            count: sellerPayable.length,
            amount: sumBy(sellerPayable, (record) => record.breakdown.sellerRevenue),
            tooltip: "정산확정 및 지급대기 상태 판매점 예약의 판매점 수수료 합계",
            sub: "판매점 수수료",
            tone: "muted",
          },
          {
            key: "adjustment",
            label: "조정예정",
            count: adjustment.length,
            amount: adjustmentAmount,
            signed: true,
            tooltip: "차기 정산에 추가/차감 반영 예정인 조정금액 합계 · 조정필요 건 수 포함",
            sub: adjustmentSub,
            tone: "warn",
          },
        ];

  const statusCounts = SETTLEMENT_DASHBOARD_SUMMARY_KEYS.map((key) => {
    const matched = pick(`status:${key}`);
    return { key, count: matched.length, amount: sumBy(matched, key === "지급완료" ? getSettlementPaidAmount : finalOf) };
  });

  const upcoming = filtered
    .filter((record) => ["정산대기", "정산확정", "지급대기"].includes(record.status) && getSettlementBaseDate(record) >= today)
    .sort((a, b) => getSettlementBaseDate(a).localeCompare(getSettlementBaseDate(b)) || a.settlementCode.localeCompare(b.settlementCode))
    .slice(0, 6)
    .map((record) => ({
      settlementCode: record.settlementCode,
      date: getSettlementBaseDate(record),
      counterparty: getSettlementCounterparty(record, mode),
      amount: finalOf(record),
      status: record.status,
    }));

  const pendingDocuments = filtered
    .map((record) => ({ record, document: documentOf(record.settlementCode) }))
    .filter(({ document }) => document?.status === "확인대기")
    .map(({ record, document }) => ({
      settlementCode: record.settlementCode,
      documentNo: document?.documentNo ?? "-",
      counterparty: getSettlementCounterparty(record, mode),
      requestedAt: document?.requestedAt,
      amount: document?.versions[document.versions.length - 1]?.snapshot.totals.finalSettlementAmount ?? finalOf(record),
    }));

  return {
    mode,
    range,
    scopedCount: scoped.length + paid.filter((record) => !scoped.includes(record)).length,
    totalSales,
    receivableAmount,
    payableAmount: receivableAmount,
    paidAmount,
    pendingAmount,
    holdAmount,
    adjustmentAmount,
    kpis,
    statusCounts,
    trend: buildTrend(filtered, mode, range.to || today),
    partners: buildPartners(scoped, mode),
    issues: buildIssues(filtered, mode, today, documentOf),
    upcoming,
    pendingDocuments,
  };
}

/** 대시보드 Filter 옵션 (현재 조회 관점에서 보이는 정산 기준) */
export function getSettlementDashboardOptions(records: SettlementRecord[], mode: SettlementDashboardMode) {
  const unique = (values: (string | undefined)[]) => Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
  return {
    counterparty: unique(records.map((record) => getSettlementCounterparty(record, mode))),
    seller: unique(records.map((record) => record.sellerName)),
    product: unique(records.map((record) => record.productName)),
  };
}
