import {
  isReservationVisibleTo,
  type ReservationViewer,
} from "@/lib/admin/reservation-permission";
import {
  formatPeopleLabel,
  getReservationDetail,
  getReservationList,
  type ReservationDetail,
} from "@/lib/admin/reservations-data";
import { getSettlementDepartureKey } from "@/lib/admin/settlement-data";

export type SettlementMethod = "individual" | "bundled";

export function resolveReservationProductCode(reservation: ReservationDetail): string {
  return (
    reservation.bookingTerms?.productCode?.trim() ||
    reservation.source?.originalProductCode?.trim() ||
    reservation.source?.sharedProductCode?.trim() ||
    ""
  );
}

export type SettlementRoundKey = {
  /** 현재는 상품코드+출발일. 추후 roundId 추가 가능 */
  kind: "product_departure";
  productCode: string;
  departureDate: string;
  roundId?: string;
};

export type SettlementTargetReservation = {
  code: string;
  bookerName: string;
  productName: string;
  productCode: string;
  departureAt: string;
  reserveStatus: string;
  peopleLabel: string;
  peopleCount: number;
  /** 판매된 곳: 본사 / 제휴업체명 / 판매점명 */
  salesChannel: string;
  isSource: boolean;
};

/** 정산 목록용 판매채널 표기 — 본사 · 제휴업체명 · 판매점명 */
export function resolveSettlementSalesChannel(reservation: Pick<ReservationDetail, "source" | "agency">): string {
  const source = reservation.source;
  if (!source || source.type === "direct") return "본사";
  if (source.type === "seller") {
    const sellerName = source.sellerName?.trim() || source.sellingAgencyName?.trim() || "판매점";
    // SAMPLE: 판매점(그래가자) 접수는 본사 채널로 표기
    if (sellerName === "그래가자") return "본사";
    return sellerName;
  }
  return source.sellingAgencyName?.trim() || "제휴업체";
}

export type SettlementDocumentDraftView = {
  method: SettlementMethod;
  methodLabel: "개별정산" | "통합정산";
  sourceReservationCode: string;
  productName: string;
  productCode: string;
  departureAt: string;
  roundKey: SettlementRoundKey;
  roundKeyLabel: string;
  reservationCount: number;
  totalPeopleCount: number;
  targets: SettlementTargetReservation[];
};

export function normalizeDepartureDate(value: string | null | undefined): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  return raw.slice(0, 10);
}

export function buildSettlementRoundKey(input: {
  productCode: string;
  departureAt: string;
  roundId?: string;
}): SettlementRoundKey {
  return {
    kind: "product_departure",
    productCode: input.productCode.trim(),
    departureDate: normalizeDepartureDate(input.departureAt),
    roundId: input.roundId?.trim() || undefined,
  };
}

/** getSettlementDepartureKey와 동일한 문자열 키. roundId가 생기면 별도 경로로 확장한다. */
export function settlementRoundKeyToString(key: SettlementRoundKey): string {
  if (key.roundId) return `${key.productCode}_${key.departureDate}_${key.roundId}`;
  return getSettlementDepartureKey({ productCode: key.productCode, departureAt: key.departureDate });
}

export function countReservationPeople(counts: ReservationDetail["counts"]): number {
  return (counts.adult ?? 0) + (counts.child ?? 0) + (counts.infant ?? 0);
}

function toTarget(reservation: ReservationDetail, sourceCode: string): SettlementTargetReservation {
  const productCode = resolveReservationProductCode(reservation);
  return {
    code: reservation.code,
    bookerName: reservation.bookerName,
    productName: reservation.productName,
    productCode,
    departureAt: normalizeDepartureDate(reservation.departureAt),
    reserveStatus: reservation.reserveStatus,
    peopleLabel: formatPeopleLabel(reservation.counts),
    peopleCount: countReservationPeople(reservation.counts),
    salesChannel: resolveSettlementSalesChannel(reservation),
    isSource: reservation.code === sourceCode,
  };
}

function reservationMatchesRound(reservation: ReservationDetail, roundKey: SettlementRoundKey): boolean {
  const productCode = resolveReservationProductCode(reservation);
  const departureDate = normalizeDepartureDate(reservation.departureAt);
  if (!productCode || !departureDate) return false;
  if (productCode !== roundKey.productCode || departureDate !== roundKey.departureDate) return false;
  if (roundKey.roundId) {
    // 회차 ID가 도입되면 예약의 roundId와 비교한다. 현재 데이터에는 없으므로 키에 roundId가 있으면 매칭 실패.
    return false;
  }
  return true;
}

/**
 * 개별/통합 정산서에 표시할 대상 예약을 조회한다.
 * - 개별: 원본 예약 1건
 * - 통합: 동일 상품코드·출발일 + 조회 권한, 원본 예약은 항상 포함(권한 있는 경우)
 */
export function listSettlementTargetReservations(input: {
  method: SettlementMethod;
  sourceReservationCode: string;
  viewer: ReservationViewer;
}): { source: ReservationDetail; targets: SettlementTargetReservation[]; roundKey: SettlementRoundKey } | null {
  const source = getReservationDetail(input.sourceReservationCode);
  if (!source) return null;
  if (!isReservationVisibleTo(source, input.viewer)) return null;

  const productCode = resolveReservationProductCode(source);
  const departureAt = normalizeDepartureDate(source.departureAt);
  const roundKey = buildSettlementRoundKey({ productCode, departureAt });

  if (input.method === "individual") {
    return { source, targets: [toTarget(source, source.code)], roundKey };
  }

  if (!productCode || !departureAt) {
    return { source, targets: [toTarget(source, source.code)], roundKey };
  }

  const byCode = new Map<string, ReservationDetail>();
  for (const item of getReservationList({ includeSellerChannel: true })) {
    if (!reservationMatchesRound(item, roundKey)) continue;
    if (!isReservationVisibleTo(item, input.viewer)) continue;
    byCode.set(item.code, item);
  }
  byCode.set(source.code, source);

  const targets = Array.from(byCode.values())
    .map((item) => toTarget(item, source.code))
    .sort((a, b) => {
      if (a.isSource !== b.isSource) return a.isSource ? -1 : 1;
      return a.code.localeCompare(b.code);
    });

  return { source, targets, roundKey };
}

export function buildSettlementDocumentDraftView(input: {
  method: SettlementMethod;
  sourceReservationCode: string;
  viewer: ReservationViewer;
}): SettlementDocumentDraftView | null {
  const listed = listSettlementTargetReservations(input);
  if (!listed) return null;

  const { source, targets, roundKey } = listed;
  const productCode = resolveReservationProductCode(source);
  return {
    method: input.method,
    methodLabel: input.method === "individual" ? "개별정산" : "통합정산",
    sourceReservationCode: source.code,
    productName: source.productName,
    productCode,
    departureAt: normalizeDepartureDate(source.departureAt),
    roundKey,
    roundKeyLabel: settlementRoundKeyToString(roundKey),
    reservationCount: targets.length,
    totalPeopleCount: targets.reduce((sum, item) => sum + item.peopleCount, 0),
    targets,
  };
}

export function parseSettlementMethod(value: string | null | undefined): SettlementMethod | null {
  if (value === "individual" || value === "bundled") return value;
  return null;
}

export function buildReservationSettlementPath(
  reservationCode: string,
  method: SettlementMethod,
  viewerPath: (path: string) => string,
): string {
  const base = `/reservations/${encodeURIComponent(reservationCode)}/settlement?method=${method}`;
  return viewerPath(base);
}
