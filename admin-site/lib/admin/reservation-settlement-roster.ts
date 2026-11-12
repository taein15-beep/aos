/**
 * 정산서 STEP 4 — 고객명단 조회 (읽기 전용)
 * - STEP 2 targets 재사용. 없는 여행자·여권정보를 생성하지 않습니다.
 * - SAMPLE Mock 기준이며 운영 수준의 개인정보 보안으로 간주하지 않습니다.
 */

import { SAMPLE_PRODUCTS } from "@/lib/admin/products-data";
import { resolveReservationProductCode, type SettlementTargetReservation } from "@/lib/admin/reservation-settlement-draft";
import {
  getReservationDetail,
  type ReservationDetail,
} from "@/lib/admin/reservations-data";
import { SELLER_CHANNEL_SELLER_ID } from "@/lib/admin/seller-channel-reservations";
import { getSellerCancelRequests } from "@/lib/seller/seller-cancel-request-store";
import { listSellerAdminProducts } from "@/lib/seller/seller-admin-products-data";
import {
  getSellerReservationDetail,
  type SellerReservationDetail,
  type SellerReservationTravelerType,
} from "@/lib/seller/seller-reservations-data";

export type SettlementTravelerRole = "booker" | "companion";

export type SettlementTravelerRow = {
  /** 예약별 여행자 식별키 (예약코드 + role + 순번). 이름만으로 병합하지 않음 */
  id: string;
  reservationCode: string;
  bookerName: string;
  travelerName: string;
  personType: SellerReservationTravelerType | "-";
  gender: string | null;
  birthDate: string | null;
  phone: string | null;
  boardingPoint: string | null;
  role: SettlementTravelerRole;
  passportEnglishName: string | null;
  passportStatus: "미등록" | "확인 필요";
  passportExpiry: string | null;
};

export type SettlementRosterHeadcountStatus = "ok" | "mismatch" | "empty" | "unavailable";

export type SettlementRosterView = {
  rows: SettlementTravelerRow[];
  reservationCount: number;
  expectedPeopleCount: number;
  listedPeopleCount: number;
  headcountStatus: SettlementRosterHeadcountStatus;
  headcountLabel: string;
  showPassportColumns: boolean;
  emptyReason: "no_roster" | "unavailable" | null;
  dataNote: string;
};

/** 테스트용 입력 — 운영 Mock에 허위 행을 넣지 않기 위한 픽스처 형태 */
export type SettlementRosterReservationInput = {
  code: string;
  bookerName: string;
  phone: string | null;
  boardingPoint: string | null;
  counts: ReservationDetail["counts"];
  productCode: string;
  productName?: string;
  productCategory?: string;
  bookerGender?: string | null;
  bookerBirthDate?: string | null;
  companions?: Array<{
    name: string;
    type: SellerReservationTravelerType;
    phoneMasked?: string | null;
    birthDate?: string | null;
  }>;
  /** true 이면 해당 예약 명단 조회 실패로 처리 */
  unavailable?: boolean;
};

const SELLER_PRODUCT_CATEGORY = new Map(
  listSellerAdminProducts(SELLER_CHANNEL_SELLER_ID).map((product) => [product.productCode, product.category]),
);

export function resolveTourRegion(input: {
  productCode?: string;
  productName?: string;
  productCategory?: string;
}): "domestic" | "overseas" | "unknown" {
  const category =
    input.productCategory?.trim() ||
    SAMPLE_PRODUCTS.find((item) => item.code === input.productCode)?.category ||
    SELLER_PRODUCT_CATEGORY.get(input.productCode ?? "") ||
    "";
  if (category.includes("해외여행") || /해외/.test(input.productName ?? "")) return "overseas";
  if (category.includes("국내여행") || category.includes("기차여행")) return "domestic";
  if (category) return "domestic";
  return "unknown";
}

function expectedPeople(counts: ReservationDetail["counts"]) {
  return (counts.adult ?? 0) + (counts.child ?? 0) + (counts.infant ?? 0);
}

function bookerPersonType(counts: ReservationDetail["counts"]): SellerReservationTravelerType | "-" {
  if ((counts.adult ?? 0) > 0) return "성인";
  if ((counts.child ?? 0) > 0) return "소아";
  if ((counts.infant ?? 0) > 0) return "유아";
  return "-";
}

export function buildRosterRowsForReservation(input: SettlementRosterReservationInput): SettlementTravelerRow[] {
  if (input.unavailable) return [];

  const rows: SettlementTravelerRow[] = [];
  const boarding = input.boardingPoint?.trim() || null;

  if (input.bookerName.trim()) {
    rows.push({
      id: `${input.code}:booker:0`,
      reservationCode: input.code,
      bookerName: input.bookerName,
      travelerName: input.bookerName,
      personType: bookerPersonType(input.counts),
      gender: input.bookerGender?.trim() || null,
      birthDate: input.bookerBirthDate?.trim() || null,
      phone: input.phone?.trim() || null,
      boardingPoint: boarding,
      role: "booker",
      passportEnglishName: null,
      passportStatus: "미등록",
      passportExpiry: null,
    });
  }

  (input.companions ?? []).forEach((companion, index) => {
    if (!companion.name?.trim()) return;
    rows.push({
      id: `${input.code}:companion:${index}`,
      reservationCode: input.code,
      bookerName: input.bookerName,
      travelerName: companion.name.trim(),
      personType: companion.type,
      gender: null,
      birthDate: companion.birthDate?.trim() || null,
      phone: companion.phoneMasked?.trim() || null,
      boardingPoint: boarding,
      role: "companion",
      passportEnglishName: null,
      passportStatus: "미등록",
      passportExpiry: null,
    });
  });

  return rows;
}

export function summarizeRosterHeadcount(listed: number, expected: number, unavailable: boolean): {
  status: SettlementRosterHeadcountStatus;
  label: string;
} {
  if (unavailable) return { status: "unavailable", label: "명단 조회 실패" };
  if (listed === 0) return { status: "empty", label: expected > 0 ? "명단 확인 필요" : "등록된 고객명단 없음" };
  if (listed !== expected) return { status: "mismatch", label: "명단 확인 필요" };
  return { status: "ok", label: "인원 일치" };
}

/**
 * 예약 입력 목록으로 고객명단 뷰를 만든다.
 * 동일 예약 code 는 한 번만 처리한다. 이름 같음만으로 타 예약 여행자를 제거하지 않는다.
 */
export function buildSettlementRoster(inputs: SettlementRosterReservationInput[]): SettlementRosterView {
  const byCode = new Map<string, SettlementRosterReservationInput>();
  for (const item of inputs) {
    if (!byCode.has(item.code)) byCode.set(item.code, item);
  }
  const unique = Array.from(byCode.values());

  if (!unique.length) {
    return {
      rows: [],
      reservationCount: 0,
      expectedPeopleCount: 0,
      listedPeopleCount: 0,
      headcountStatus: "unavailable",
      headcountLabel: "명단 조회 실패",
      showPassportColumns: false,
      emptyReason: "unavailable",
      dataNote: "SAMPLE Mock 고객명단 기준 (실운영 고객정보 아님)",
    };
  }

  const allUnavailable = unique.every((item) => item.unavailable);
  if (allUnavailable) {
    return {
      rows: [],
      reservationCount: unique.length,
      expectedPeopleCount: unique.reduce((sum, item) => sum + expectedPeople(item.counts), 0),
      listedPeopleCount: 0,
      headcountStatus: "unavailable",
      headcountLabel: "명단 조회 실패",
      showPassportColumns: false,
      emptyReason: "unavailable",
      dataNote: "SAMPLE Mock 고객명단 기준 (실운영 고객정보 아님)",
    };
  }

  const rows: SettlementTravelerRow[] = [];
  let expectedPeopleCount = 0;
  let showPassportColumns = false;

  for (const item of unique) {
    expectedPeopleCount += expectedPeople(item.counts);
    if (resolveTourRegion(item) === "overseas") showPassportColumns = true;
    if (item.unavailable) continue;
    rows.push(...buildRosterRowsForReservation(item));
  }

  rows.sort((a, b) => {
    if (a.reservationCode !== b.reservationCode) return a.reservationCode.localeCompare(b.reservationCode);
    if (a.role !== b.role) return a.role === "booker" ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  const listedPeopleCount = rows.length;
  const headcount = summarizeRosterHeadcount(listedPeopleCount, expectedPeopleCount, false);

  return {
    rows,
    reservationCount: unique.length,
    expectedPeopleCount,
    listedPeopleCount,
    headcountStatus: headcount.status,
    headcountLabel: headcount.label,
    showPassportColumns,
    emptyReason: listedPeopleCount === 0 ? "no_roster" : null,
    dataNote: "SAMPLE Mock 고객명단 기준 (실운영 고객정보 아님) · 여권번호는 정산서에 표시하지 않습니다",
  };
}

function reservationToRosterInput(
  reservation: ReservationDetail,
  sellerDetail: SellerReservationDetail | null,
): SettlementRosterReservationInput {
  const productCode = resolveReservationProductCode(reservation);
  return {
    code: reservation.code,
    bookerName: reservation.bookerName,
    phone: sellerDetail?.customerPhone || reservation.phone || null,
    boardingPoint: reservation.boardingPoint || sellerDetail?.boardingPlace || null,
    counts: reservation.counts,
    productCode,
    productName: reservation.productName,
    bookerGender: sellerDetail?.customerGender ?? null,
    bookerBirthDate: sellerDetail?.customerBirthDate ?? null,
    companions: sellerDetail?.companions.map((item) => ({
      name: item.name,
      type: item.type,
      phoneMasked: item.phoneMasked,
      birthDate: item.birthDate,
    })),
  };
}

function loadSellerDetailForRoster(code: string): SellerReservationDetail | null {
  return getSellerReservationDetail(SELLER_CHANNEL_SELLER_ID, code, getSellerCancelRequests(SELLER_CHANNEL_SELLER_ID));
}

/**
 * STEP 2 대상 예약 목록을 재사용해 고객명단을 구성한다.
 */
export function buildSettlementRosterFromTargets(targets: SettlementTargetReservation[]): SettlementRosterView {
  const inputs: SettlementRosterReservationInput[] = [];
  const seen = new Set<string>();

  for (const target of targets) {
    if (seen.has(target.code)) continue;
    seen.add(target.code);
    const detail = getReservationDetail(target.code);
    if (!detail) {
      inputs.push({
        code: target.code,
        bookerName: target.bookerName,
        phone: null,
        boardingPoint: null,
        counts: { adult: target.peopleCount, child: 0, infant: 0 },
        productCode: target.productCode,
        productName: target.productName,
        unavailable: true,
      });
      continue;
    }
    inputs.push(reservationToRosterInput(detail, loadSellerDetailForRoster(detail.code)));
  }

  return buildSettlementRoster(inputs);
}
