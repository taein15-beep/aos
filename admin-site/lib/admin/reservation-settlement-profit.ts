/**
 * 정산서 STEP 7 — 손익 계산 (화면 표시 / 저장·승인 없음)
 *
 * - 고객 수납액 ≠ 정산 귀속매출
 * - 매출 귀속이 불명확하면 금액을 만들지 않고 계산 보류
 * - 비용 미등록을 0원으로 대체하지 않음
 */

import { formatKrw, getReservationDetail, type ReservationDetail } from "@/lib/admin/reservations-data";
import type { SettlementDocumentDraftView, SettlementMethod } from "@/lib/admin/reservation-settlement-draft";
import {
  filterSettlementExpenses,
  resolveProvisionalAmount,
  type SettlementExpenseLine,
} from "@/lib/admin/reservation-settlement-expenses";
import {
  buildSettlementSalesFinanceFromTargets,
  resolveConfirmedSaleAmount,
  type MoneyDisplay,
  type SettlementSalesFinanceView,
} from "@/lib/admin/reservation-settlement-sales";

export type SettlementProfitStatus = "expected" | "provisional" | "cost_confirmed" | "held";

export type SettlementSaleChannelType = "direct" | "affiliate" | "seller";

export type SettlementMoneyValue =
  | { kind: "amount"; value: number; label: string }
  | { kind: "unavailable"; label: string };

export type SettlementProfitReservationInput = {
  code: string;
  sourceType: SettlementSaleChannelType;
  confirmedSaleAmount: number | null;
  /** 제휴 마감 시 공급사 확정 정산액. 없으면 null */
  affiliateClosingSupplierAmount: number | null;
  bookingTerms: null | {
    saleMode: "입금가형" | "수수료형";
    commissionRate: number | null;
    depositPrice: number | null;
    pax: number;
    sellerProfit: number | null;
  };
};

export type SettlementRevenueAttribution =
  | {
      status: "ok";
      sourceType: SettlementSaleChannelType;
      attributableAmount: number;
      basis: string;
    }
  | {
      status: "needs_review";
      sourceType: SettlementSaleChannelType;
      reasons: string[];
    };

export type SettlementCostClassification = {
  mode: "expected" | "provisional" | "confirmed";
  directCost: number | null;
  commonCost: number | null;
  otherSeparateCost: number | null;
  totalCost: number | null;
  lineCount: number;
  confirmedCount: number;
  unconfirmedCount: number;
  missingAmountCount: number;
  ambiguousCommonCost: boolean;
  allCostsConfirmed: boolean;
  hasUsableCost: boolean;
  usesExpectedOnly: boolean;
  hasUnconfirmedActual: boolean;
};

export type SettlementProfitView = {
  status: SettlementProfitStatus;
  statusLabel: string;
  method: SettlementMethod;
  customerTotalSales: SettlementMoneyValue;
  attributableRevenue: SettlementMoneyValue;
  netReceived: SettlementMoneyValue;
  unpaid: SettlementMoneyValue;
  directCost: SettlementMoneyValue;
  commonCost: SettlementMoneyValue;
  otherSeparateCost: SettlementMoneyValue;
  totalCost: SettlementMoneyValue;
  profit: SettlementMoneyValue;
  marginLabel: string;
  holdReasons: string[];
  attributionNotes: string[];
  stateNote: string;
  cashNote: string;
};

function isFiniteAmount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function moneyAmount(value: number): SettlementMoneyValue {
  return { kind: "amount", value, label: formatKrw(value) };
}

function moneyUnavailable(label: string): SettlementMoneyValue {
  return { kind: "unavailable", label };
}

function fromSalesMoney(display: MoneyDisplay): SettlementMoneyValue {
  if (display.kind === "amount") return moneyAmount(display.value);
  return moneyUnavailable("확인 필요");
}

export function profitStatusLabel(status: SettlementProfitStatus): string {
  switch (status) {
    case "expected":
      return "예상 손익";
    case "provisional":
      return "잠정 손익";
    case "cost_confirmed":
      return "비용확인 완료 손익";
    default:
      return "계산 보류";
  }
}

export function formatProfitMargin(profit: number | null, attributable: number | null): string {
  if (!isFiniteAmount(profit) || !isFiniteAmount(attributable) || attributable === 0) {
    return "계산 불가";
  }
  const ratio = (profit / attributable) * 100;
  const rounded = Math.round(ratio * 10) / 10;
  return `${rounded}%`;
}

/** 예약 1건의 여행사 정산 귀속매출. 불명확하면 금액을 만들지 않는다. */
export function resolveRevenueAttribution(input: SettlementProfitReservationInput): SettlementRevenueAttribution {
  if (input.sourceType === "direct") {
    if (!isFiniteAmount(input.confirmedSaleAmount)) {
      return {
        status: "needs_review",
        sourceType: "direct",
        reasons: ["고객 판매금액 확인 필요"],
      };
    }
    return {
      status: "ok",
      sourceType: "direct",
      attributableAmount: input.confirmedSaleAmount,
      basis: "직접판매 · 고객 확정 판매금액",
    };
  }

  if (input.sourceType === "affiliate") {
    if (isFiniteAmount(input.affiliateClosingSupplierAmount)) {
      return {
        status: "ok",
        sourceType: "affiliate",
        attributableAmount: input.affiliateClosingSupplierAmount,
        basis: "제휴판매 · 공급사 마감정산액",
      };
    }
    return {
      status: "needs_review",
      sourceType: "affiliate",
      reasons: ["매출 귀속 확인 필요", "제휴여행사 정산 귀속액(마감액) 미확정"],
    };
  }

  const terms = input.bookingTerms;
  if (!terms) {
    return {
      status: "needs_review",
      sourceType: "seller",
      reasons: ["매출 귀속 확인 필요", "판매점 계약조건(판매조건 Snapshot) 누락"],
    };
  }

  if (terms.saleMode === "수수료형") {
    if (!isFiniteAmount(terms.commissionRate)) {
      return {
        status: "needs_review",
        sourceType: "seller",
        reasons: ["매출 귀속 확인 필요", "판매점 수수료형 계약조건 누락"],
      };
    }
    if (!isFiniteAmount(input.confirmedSaleAmount)) {
      return {
        status: "needs_review",
        sourceType: "seller",
        reasons: ["고객 판매금액 확인 필요"],
      };
    }
    const commission = isFiniteAmount(terms.sellerProfit)
      ? terms.sellerProfit
      : Math.round((input.confirmedSaleAmount * terms.commissionRate) / 100);
    return {
      status: "ok",
      sourceType: "seller",
      attributableAmount: Math.max(0, input.confirmedSaleAmount - commission),
      basis: `판매점 수수료형 · 고객판매액 − 확정수수료(${terms.commissionRate}%)`,
    };
  }

  if (!isFiniteAmount(terms.depositPrice) || !isFiniteAmount(terms.pax) || terms.pax <= 0) {
    return {
      status: "needs_review",
      sourceType: "seller",
      reasons: ["매출 귀속 확인 필요", "판매점 입금가형 계약조건 누락"],
    };
  }

  return {
    status: "ok",
    sourceType: "seller",
    attributableAmount: Math.round(terms.depositPrice * terms.pax),
    basis: "판매점 입금가형 · 계약 입금가 × 인원 (판매점 판매차액 제외)",
  };
}

function resolveCostLineAmount(
  line: SettlementExpenseLine,
  mode: SettlementCostClassification["mode"],
): number | null {
  if (mode === "confirmed") {
    if (line.confirmed && isFiniteAmount(line.actualAmount)) return line.actualAmount;
    return null;
  }
  if (mode === "expected") {
    return isFiniteAmount(line.expectedAmount) ? line.expectedAmount : null;
  }
  if (isFiniteAmount(line.actualAmount)) return line.actualAmount;
  return resolveProvisionalAmount(line);
}

export function classifySettlementCosts(input: {
  method: SettlementMethod;
  sourceReservationCode: string;
  targetCodes: string[];
  eventKey: string;
  lines: SettlementExpenseLine[];
  mode: SettlementCostClassification["mode"];
}): SettlementCostClassification {
  const lines = filterSettlementExpenses(input.lines, input);
  let directSum = 0;
  let commonSum = 0;
  let hasDirect = false;
  let hasCommon = false;
  let missingAmountCount = 0;
  let confirmedCount = 0;
  let unconfirmedCount = 0;
  let ambiguousCommonCost = false;
  let usesExpectedOnly = true;
  let hasUnconfirmedActual = false;

  for (const line of lines) {
    if (line.confirmed && isFiniteAmount(line.actualAmount)) confirmedCount += 1;
    else unconfirmedCount += 1;

    if (line.scope === "event_common" && (!line.eventKey || line.eventKey !== input.eventKey)) {
      ambiguousCommonCost = true;
    }

    if (isFiniteAmount(line.actualAmount)) {
      usesExpectedOnly = false;
      if (!line.confirmed) hasUnconfirmedActual = true;
    }

    const amount = resolveCostLineAmount(line, input.mode);
    if (!isFiniteAmount(amount)) {
      missingAmountCount += 1;
      continue;
    }

    if (line.scope === "event_common") {
      commonSum += amount;
      hasCommon = true;
    } else {
      directSum += amount;
      hasDirect = true;
    }
  }

  if (lines.some((line) => isFiniteAmount(line.actualAmount))) {
    usesExpectedOnly = false;
  } else if (lines.length === 0) {
    usesExpectedOnly = false;
  }

  const hasUsableCost = hasDirect || hasCommon;
  const totalCost = hasUsableCost ? directSum + commonSum : null;
  const allCostsConfirmed =
    lines.length > 0 &&
    missingAmountCount === 0 &&
    unconfirmedCount === 0 &&
    lines.every((line) => line.confirmed && isFiniteAmount(line.actualAmount));

  return {
    mode: input.mode,
    directCost: hasDirect ? directSum : null,
    commonCost: input.method === "individual" ? null : hasCommon ? commonSum : null,
    otherSeparateCost: null,
    totalCost,
    lineCount: lines.length,
    confirmedCount,
    unconfirmedCount,
    missingAmountCount,
    ambiguousCommonCost,
    allCostsConfirmed,
    hasUsableCost,
    usesExpectedOnly: lines.length > 0 && usesExpectedOnly && hasUsableCost,
    hasUnconfirmedActual,
  };
}

export function reservationToProfitInput(detail: ReservationDetail): SettlementProfitReservationInput {
  const sourceType = detail.source?.type ?? "direct";
  return {
    code: detail.code,
    sourceType,
    confirmedSaleAmount: resolveConfirmedSaleAmount(detail),
    affiliateClosingSupplierAmount:
      sourceType === "affiliate" && isFiniteAmount(detail.settlement?.closing?.finalSupplierAmount)
        ? detail.settlement!.closing!.finalSupplierAmount
        : null,
    bookingTerms: detail.bookingTerms
      ? {
          saleMode: detail.bookingTerms.saleMode,
          commissionRate: detail.bookingTerms.commissionRate,
          depositPrice: detail.bookingTerms.depositPrice,
          pax: detail.bookingTerms.pax,
          sellerProfit: detail.bookingTerms.sellerProfit,
        }
      : null,
  };
}

function costMoney(
  value: number | null,
  emptyLabel: string,
): SettlementMoneyValue {
  if (isFiniteAmount(value)) return moneyAmount(value);
  return moneyUnavailable(emptyLabel);
}

export function buildSettlementProfitViewFromInputs(input: {
  method: SettlementMethod;
  sourceReservationCode: string;
  targetCodes: string[];
  eventKey: string;
  reservations: SettlementProfitReservationInput[];
  expenses: SettlementExpenseLine[];
  sales?: SettlementSalesFinanceView | null;
}): SettlementProfitView {
  const byCode = new Map<string, SettlementProfitReservationInput>();
  for (const item of input.reservations) {
    if (!byCode.has(item.code)) byCode.set(item.code, item);
  }
  const unique = input.targetCodes
    .map((code) => byCode.get(code))
    .filter((item): item is SettlementProfitReservationInput => Boolean(item));

  const holdReasons: string[] = [];
  const attributionNotes: string[] = [];
  let customerSalesKnown = true;
  let customerTotal = 0;
  let attributableKnown = true;
  let attributableTotal = 0;

  for (const reservation of unique) {
    if (!isFiniteAmount(reservation.confirmedSaleAmount)) customerSalesKnown = false;
    else customerTotal += reservation.confirmedSaleAmount;

    const attribution = resolveRevenueAttribution(reservation);
    if (attribution.status === "ok") {
      attributableTotal += attribution.attributableAmount;
      attributionNotes.push(`${reservation.code}: ${attribution.basis}`);
    } else {
      attributableKnown = false;
      for (const reason of attribution.reasons) {
        holdReasons.push(`${reservation.code}: ${reason}`);
      }
    }
  }

  if (!unique.length) {
    attributableKnown = false;
    customerSalesKnown = false;
    holdReasons.push("정산 대상 예약이 없습니다.");
  }

  const filterInput = {
    method: input.method,
    sourceReservationCode: input.sourceReservationCode,
    targetCodes: input.targetCodes,
    eventKey: input.eventKey,
    lines: input.expenses,
  };

  const confirmedCosts = classifySettlementCosts({ ...filterInput, mode: "confirmed" });
  const provisionalCosts = classifySettlementCosts({ ...filterInput, mode: "provisional" });
  const expectedCosts = classifySettlementCosts({ ...filterInput, mode: "expected" });

  if (input.method === "bundled" && provisionalCosts.ambiguousCommonCost) {
    holdReasons.push("공통비용 확인 필요 (행사 회차 ID 없음 · eventKey 불일치)");
  }

  let status: SettlementProfitStatus = "held";
  let costClass = provisionalCosts;

  if (!attributableKnown) {
    status = "held";
  } else if (provisionalCosts.lineCount === 0) {
    status = "held";
    holdReasons.push("비용 미등록");
  } else if (!provisionalCosts.hasUsableCost) {
    status = "held";
    holdReasons.push("필수 원가 금액 미등록");
  } else if (provisionalCosts.ambiguousCommonCost) {
    status = "held";
  } else if (confirmedCosts.allCostsConfirmed) {
    status = "cost_confirmed";
    costClass = confirmedCosts;
  } else if (provisionalCosts.usesExpectedOnly) {
    status = "expected";
    costClass = expectedCosts.hasUsableCost ? expectedCosts : provisionalCosts;
  } else {
    status = "provisional";
    costClass = provisionalCosts;
  }

  const uniqueHoldReasons = Array.from(new Set(holdReasons));
  const sales = input.sales ?? null;

  const customerTotalSales = customerSalesKnown
    ? moneyAmount(customerTotal)
    : sales
      ? fromSalesMoney(sales.totalSales)
      : moneyUnavailable("확인 필요");

  const attributableRevenue = attributableKnown
    ? moneyAmount(attributableTotal)
    : moneyUnavailable("매출 귀속 확인 필요");

  const netReceived = sales ? fromSalesMoney(sales.netReceived) : moneyUnavailable("확인 필요");
  const unpaid = sales ? fromSalesMoney(sales.unpaid) : moneyUnavailable("확인 필요");

  const missingCostLabel = costClass.lineCount === 0 ? "비용 미등록" : "미등록";

  // 개별정산에서 직접비용만 있을 때 total과 동일하게 표시
  const directCostDisplay =
    input.method === "individual" && !isFiniteAmount(costClass.directCost) && isFiniteAmount(costClass.totalCost)
      ? moneyAmount(costClass.totalCost)
      : costMoney(costClass.directCost, missingCostLabel);

  const commonCostDisplay =
    input.method === "individual"
      ? moneyUnavailable("개별정산 제외")
      : costClass.ambiguousCommonCost
        ? moneyUnavailable("공통비용 확인 필요")
        : isFiniteAmount(costClass.commonCost)
          ? moneyAmount(costClass.commonCost)
          : costClass.hasUsableCost
            ? moneyAmount(0)
            : moneyUnavailable(missingCostLabel);

  const otherSeparateCost = moneyUnavailable("해당 없음");
  const totalCost = costMoney(costClass.totalCost, missingCostLabel);

  let profit: SettlementMoneyValue = moneyUnavailable("계산 보류");
  let marginLabel = "계산 불가";
  if (status !== "held" && attributableKnown && isFiniteAmount(costClass.totalCost)) {
    const value = attributableTotal - costClass.totalCost;
    profit = moneyAmount(value);
    marginLabel = formatProfitMargin(value, attributableTotal);
  }

  return {
    status,
    statusLabel: profitStatusLabel(status),
    method: input.method,
    customerTotalSales,
    attributableRevenue,
    netReceived,
    unpaid,
    directCost: directCostDisplay,
    commonCost: commonCostDisplay,
    otherSeparateCost,
    totalCost,
    profit,
    marginLabel,
    holdReasons: uniqueHoldReasons,
    attributionNotes: Array.from(new Set(attributionNotes)),
    stateNote: "화면 임시 비용 입력 기준의 참고 손익입니다. DB에 저장·승인되지 않습니다.",
    cashNote: "고객 수납·미수금은 현금 현황이며 정산 귀속매출을 대체하지 않습니다.",
  };
}

export function buildSettlementProfitView(input: {
  draft: SettlementDocumentDraftView;
  expenses: SettlementExpenseLine[];
  sales?: SettlementSalesFinanceView | null;
}): SettlementProfitView {
  const targetCodes = input.draft.targets.map((item) => item.code);
  const reservations: SettlementProfitReservationInput[] = [];
  for (const code of targetCodes) {
    const detail = getReservationDetail(code);
    if (!detail) continue;
    reservations.push(reservationToProfitInput(detail));
  }

  const sales = input.sales ?? buildSettlementSalesFinanceFromTargets(input.draft.targets);
  return buildSettlementProfitViewFromInputs({
    method: input.draft.method,
    sourceReservationCode: input.draft.sourceReservationCode,
    targetCodes,
    eventKey: input.draft.roundKeyLabel,
    reservations,
    expenses: input.expenses,
    sales,
  });
}
