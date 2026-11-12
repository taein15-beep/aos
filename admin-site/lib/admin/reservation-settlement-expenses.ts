/**
 * 정산서 STEP 5 — 지출·비용 (화면 임시 상태 / 저장 없음)
 * - 상품 예상원가 Mock이 없으므로 자동 시드는 하지 않습니다.
 * - 행사 공통비용은 비용 ID 기준 1회만 집계합니다.
 */

import { formatKrw } from "@/lib/admin/reservations-data";
import type { SettlementDocumentDraftView, SettlementMethod } from "@/lib/admin/reservation-settlement-draft";

export const SETTLEMENT_EXPENSE_CATEGORIES = [
  "항공·교통비",
  "차량비",
  "식사비",
  "가이드비",
  "랜드비",
  "숙박비",
  "입장·체험비",
  "보험료",
  "기타비용",
] as const;

export type SettlementExpenseCategory = (typeof SETTLEMENT_EXPENSE_CATEGORIES)[number];
export type SettlementExpenseScope = "reservation" | "event_common";
export type SettlementExpenseSourceType = "expected_seed" | "manual";

export type SettlementExpenseLine = {
  id: string;
  category: SettlementExpenseCategory | string;
  name: string;
  vendorName: string | null;
  vendorId: string | null;
  scope: SettlementExpenseScope;
  reservationCode: string | null;
  eventKey: string | null;
  /** null = 미등록 (0원과 구분) */
  expectedAmount: number | null;
  /** null = 미입력. 0은 유효한 금액 */
  actualAmount: number | null;
  confirmed: boolean;
  voucherNumber: string | null;
  note: string;
  sourceType: SettlementExpenseSourceType;
  removable: boolean;
};

export type SettlementExpenseDraftInput = {
  category: string;
  name: string;
  vendorName: string;
  scope: SettlementExpenseScope;
  expectedAmount: number | null;
  actualAmount: number | null;
  confirmed: boolean;
  note: string;
};

export type SettlementExpenseSummary = {
  expectedTotal: number | null;
  expectedTotalLabel: string;
  provisionalActualTotal: number;
  provisionalActualLabel: string;
  confirmedTotal: number;
  confirmedTotalLabel: string;
  confirmedCount: number;
  unconfirmedCount: number;
  lineCount: number;
  expectedSeedMissing: boolean;
};

export type SettlementExpenseView = {
  method: SettlementMethod;
  lines: SettlementExpenseLine[];
  summary: SettlementExpenseSummary;
  expectedSeedNote: string;
  stateNote: string;
};

function isFiniteAmount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** 목록에 표시할 잠정 금액. actual 우선, 없으면 expected 임시표시, 둘 다 없으면 null(미등록) */
export function resolveProvisionalAmount(line: SettlementExpenseLine): number | null {
  if (isFiniteAmount(line.actualAmount)) return line.actualAmount;
  if (isFiniteAmount(line.expectedAmount)) return line.expectedAmount;
  return null;
}

export function formatExpenseAmount(value: number | null): string {
  if (!isFiniteAmount(value)) return "미등록";
  return formatKrw(value);
}

export function createExpenseId(prefix = "exp"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 상품 예상원가 자동 시드.
 * admin-site에 차량/가이드/식사 등 예상원가 Mock이 없으므로 항상 빈 배열.
 */
export function loadExpectedExpenseSeeds(_input: {
  method: SettlementMethod;
  sourceReservationCode: string;
  eventKey: string;
  targetCodes: string[];
}): SettlementExpenseLine[] {
  return [];
}

export function buildInitialSettlementExpenses(draft: SettlementDocumentDraftView): SettlementExpenseLine[] {
  return loadExpectedExpenseSeeds({
    method: draft.method,
    sourceReservationCode: draft.sourceReservationCode,
    eventKey: draft.roundKeyLabel,
    targetCodes: draft.targets.map((item) => item.code),
  });
}

/** 개별: 선택 예약 직접비용만. 통합: 대상 예약 직접비용 + 행사 공통(비용 ID 1회). */
export function filterSettlementExpenses(
  lines: SettlementExpenseLine[],
  input: {
    method: SettlementMethod;
    sourceReservationCode: string;
    targetCodes: string[];
    eventKey: string;
  },
): SettlementExpenseLine[] {
  const targetSet = new Set(input.targetCodes);
  const seen = new Set<string>();
  const result: SettlementExpenseLine[] = [];

  for (const line of lines) {
    if (seen.has(line.id)) continue;

    if (input.method === "individual") {
      if (line.scope !== "reservation") continue;
      if (line.reservationCode !== input.sourceReservationCode) continue;
      seen.add(line.id);
      result.push(line);
      continue;
    }

    if (line.scope === "event_common") {
      if (line.eventKey && line.eventKey !== input.eventKey) continue;
      seen.add(line.id);
      result.push(line);
      continue;
    }

    if (line.scope === "reservation" && line.reservationCode && targetSet.has(line.reservationCode)) {
      seen.add(line.id);
      result.push(line);
    }
  }

  return result;
}

export function summarizeSettlementExpenses(lines: SettlementExpenseLine[]): SettlementExpenseSummary {
  let expectedTotal: number | null = null;
  let provisionalActualTotal = 0;
  let confirmedTotal = 0;
  let confirmedCount = 0;
  let unconfirmedCount = 0;
  let hasExpected = false;

  for (const line of lines) {
    if (isFiniteAmount(line.expectedAmount)) {
      expectedTotal = (expectedTotal ?? 0) + line.expectedAmount;
      hasExpected = true;
    }

    const provisional = resolveProvisionalAmount(line);
    if (isFiniteAmount(provisional)) provisionalActualTotal += provisional;

    if (line.confirmed && isFiniteAmount(line.actualAmount)) {
      confirmedTotal += line.actualAmount;
      confirmedCount += 1;
    } else {
      unconfirmedCount += 1;
    }
  }

  return {
    expectedTotal: hasExpected ? expectedTotal : null,
    expectedTotalLabel: hasExpected ? formatKrw(expectedTotal ?? 0) : "등록된 예상원가 없음",
    provisionalActualTotal,
    provisionalActualLabel: formatKrw(provisionalActualTotal),
    confirmedTotal,
    confirmedTotalLabel: formatKrw(confirmedTotal),
    confirmedCount,
    unconfirmedCount,
    lineCount: lines.length,
    expectedSeedMissing: !hasExpected,
  };
}

export function buildSettlementExpenseView(input: {
  method: SettlementMethod;
  sourceReservationCode: string;
  targetCodes: string[];
  eventKey: string;
  lines: SettlementExpenseLine[];
}): SettlementExpenseView {
  const lines = filterSettlementExpenses(input.lines, input);
  return {
    method: input.method,
    lines,
    summary: summarizeSettlementExpenses(lines),
    expectedSeedNote: "등록된 예상원가 없음 (상품 원가 Mock 미연동)",
    stateNote: "화면 임시 입력 상태입니다. DB에 저장되지 않습니다.",
  };
}

/** 예상원가를 실제 입력칸에 임시 표시하되 confirmed=false 유지 */
export function applyExpectedAsTemporaryActual(line: SettlementExpenseLine): SettlementExpenseLine {
  if (!isFiniteAmount(line.expectedAmount)) return { ...line, confirmed: false };
  if (isFiniteAmount(line.actualAmount)) return { ...line, confirmed: false };
  return {
    ...line,
    actualAmount: line.expectedAmount,
    confirmed: false,
  };
}

export function upsertSettlementExpense(
  lines: SettlementExpenseLine[],
  draft: SettlementExpenseDraftInput,
  context: {
    editingId?: string | null;
    sourceReservationCode: string;
    eventKey: string;
  },
): SettlementExpenseLine[] {
  const name = draft.name.trim() || draft.category;
  const nextLine: SettlementExpenseLine = {
    id: context.editingId || createExpenseId(),
    category: draft.category || "기타비용",
    name,
    vendorName: draft.vendorName.trim() || null,
    vendorId: null,
    scope: draft.scope,
    reservationCode: draft.scope === "reservation" ? context.sourceReservationCode : null,
    eventKey: draft.scope === "event_common" ? context.eventKey : null,
    expectedAmount: draft.expectedAmount,
    actualAmount: draft.actualAmount,
    confirmed: draft.confirmed && isFiniteAmount(draft.actualAmount),
    voucherNumber: null,
    note: draft.note.trim(),
    sourceType: "manual",
    removable: true,
  };

  if (context.editingId) {
    return lines.map((line) => {
      if (line.id !== context.editingId) return line;
      return {
        ...nextLine,
        id: line.id,
        sourceType: line.sourceType,
        removable: line.removable,
        voucherNumber: line.voucherNumber,
        expectedAmount: isFiniteAmount(draft.expectedAmount) ? draft.expectedAmount : line.expectedAmount,
      };
    });
  }

  return [...lines, nextLine];
}

export function removeSettlementExpense(lines: SettlementExpenseLine[], id: string): SettlementExpenseLine[] {
  return lines.filter((line) => !(line.id === id && line.removable));
}

/** 금액 변경 시 미확인으로 되돌림 */
export function patchExpenseActualAmount(
  lines: SettlementExpenseLine[],
  id: string,
  actualAmount: number | null,
): SettlementExpenseLine[] {
  return lines.map((line) =>
    line.id === id
      ? {
          ...line,
          actualAmount,
          confirmed: false,
        }
      : line,
  );
}

export function patchExpenseConfirmed(
  lines: SettlementExpenseLine[],
  id: string,
  confirmed: boolean,
): SettlementExpenseLine[] {
  return lines.map((line) => {
    if (line.id !== id) return line;
    if (!confirmed) return { ...line, confirmed: false };
    if (isFiniteAmount(line.actualAmount)) return { ...line, confirmed: true };
    // 임시 표시(예상원가)만 있는 경우 확인 시 실제원가로 명시 반영
    if (isFiniteAmount(line.expectedAmount)) {
      return { ...line, actualAmount: line.expectedAmount, confirmed: true };
    }
    return line;
  });
}

export function parseExpenseAmountInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d-]/g, "");
  if (!digits || digits === "-") return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}
