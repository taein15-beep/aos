import { getReservationList, type ReservationListItem } from "@/lib/admin/reservations-data";
import { getProductBoardingGroups, resolveBoardingProductCode } from "@/lib/admin/product-boarding-data";
import {
  GUIDE_ASSIGNMENT_STATUS_BADGE,
  GUIDE_POINT_UNDECIDED,
  GUIDE_SAMPLE_STAFF_POOL,
  buildGuideDepartureFromSeed,
  findGuideSampleDepartureKey,
  getGuideAssignmentPath,
  applyGuideBoardingSession,
  getGuideDeparture,
  getGuideOperationPlan,
  getGuideOperationPlanForSeed,
  getGuideOperationSummary,
  getGuideReservationOperation,
  previewGuideDeparture,
  saveGuideOperationPlan,
  saveGuideOperationPlanForKey,
  type GuideAssignmentStatus,
  type GuideDeparture,
  type GuideDepartureSeed,
  type GuideOperationPlan,
  type GuidePassenger,
} from "@/lib/admin/guide-operation-data";

/**
 * 출발회차 = 상품 + 출발일. 운영배정은 예약번호가 아니라 출발회차 단위로 처리합니다.
 * 가이드 운영 SAMPLE이 있는 회차는 해당 시드를, 그 외 회차는 예약 데이터로 운영배정 대상을 구성합니다.
 */

/** 예약상태별 운영배정 대상 여부 (UI 표시용 · 실제 정책 연동 전) */
export type OperationEligibility = "eligible" | "caution" | "pending" | "excluded";

export function getOperationEligibility(reservation: Pick<ReservationListItem, "reserveStatus">): OperationEligibility {
  const status = reservation.reserveStatus;
  if (status.includes("취소완료")) return "excluded";
  if (status.includes("취소요청")) return "caution";
  if (status === "예약접수" || status === "대기") return "pending";
  return "eligible";
}

export const OPERATION_ELIGIBILITY_META: Record<
  Exclude<OperationEligibility, "eligible">,
  { label: string; badge: string; description: string }
> = {
  caution: { label: "취소요청", badge: "danger", description: "취소요청 예약 · 운영배정 시 주의" },
  pending: { label: "배정대기", badge: "gray", description: "예약확정 후 운영배정 대상이 됩니다." },
  excluded: { label: "운영제외", badge: "gray", description: "취소완료 예약은 운영배정 대상에서 제외됩니다." },
};

const isInPool = (reservation: ReservationListItem) => {
  const eligibility = getOperationEligibility(reservation);
  return eligibility === "eligible" || eligibility === "caution";
};

type OperationDepartureEntry = {
  key: string;
  productName: string;
  departureDate: string;
  sampleKey: string | null;
  reservations: ReservationListItem[];
};

function listDepartureEntries(reservations = getReservationList()): OperationDepartureEntry[] {
  const groups = new Map<string, ReservationListItem[]>();
  reservations.forEach((reservation) => {
    const id = `${reservation.departureAt}|${reservation.productName}`;
    groups.set(id, [...(groups.get(id) ?? []), reservation]);
  });
  const sorted = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  const indexByDate: Record<string, number> = {};
  return sorted.map(([, items]) => {
    const { productName, departureAt } = items[0];
    const sampleKey = findGuideSampleDepartureKey(productName, departureAt);
    indexByDate[departureAt] = (indexByDate[departureAt] ?? 0) + 1;
    const key =
      sampleKey ?? `DEP-${departureAt.replace(/-/g, "")}-${String(indexByDate[departureAt]).padStart(2, "0")}`;
    return { key, productName, departureDate: departureAt, sampleKey, reservations: items };
  });
}

const PASSENGER_TYPE_LABEL = { adult: "", child: " (아동)", infant: " (유아)" } as const;

function buildReservationPassengers(reservation: ReservationListItem): GuidePassenger[] {
  const types = [
    ...Array.from({ length: reservation.counts.adult }, () => "adult" as const),
    ...Array.from({ length: reservation.counts.child }, () => "child" as const),
    ...Array.from({ length: reservation.counts.infant }, () => "infant" as const),
  ];
  const list = types.length ? types : (["adult"] as const);
  return list.map((type, index) => ({
    id: `${reservation.code}-P${index + 1}`,
    name: index === 0 ? reservation.bookerName : `${reservation.bookerName} 일행${index}${PASSENGER_TYPE_LABEL[type]}`,
    boardingPoint: "",
    boarding: { outbound: { status: "unchecked" } },
    assignment: {},
  }));
}

/** 예약 데이터만 있는 출발회차의 운영배정 시드. 호차는 없이 미배정으로 시작합니다. */
function buildReservationSeed(entry: OperationDepartureEntry): GuideDepartureSeed {
  const pool = entry.reservations.filter(isInPool);
  const points = Array.from(new Set(pool.map((reservation) => reservation.boardingPoint ?? GUIDE_POINT_UNDECIDED)));
  return {
    key: entry.key,
    productCode: resolveBoardingProductCode(entry.productName) || "-",
    productName: entry.productName,
    departureDate: entry.departureDate,
    guideName: "미지정",
    status: "출발예정",
    notifiedCount: 0,
    noteCount: 0,
    chatRoom: { registered: false, name: "", joinedCount: 0 },
    boardingTimes: points.map((name) => ({ name, time: "-" })),
    itinerary: [],
    segments: [
      {
        key: "outbound",
        label: "출발 탑승",
        route: `${points.join("/")} → ${entry.productName}`,
        usesReservationPoint: true,
      },
    ],
    staff: GUIDE_SAMPLE_STAFF_POOL.map((item) => ({ ...item })),
    leadStaffId: "",
    handover: null,
    vehicles: [],
    initialVehicleByGroup: {},
    reservations: pool.map((reservation) => ({
      id: reservation.code,
      reservationCode: reservation.code,
      reservedAt: reservation.reservedAt,
      boardingPoint: reservation.boardingPoint ?? GUIDE_POINT_UNDECIDED,
      phone: reservation.phone,
      passengers: buildReservationPassengers(reservation),
    })),
  };
}

function findEntry(key: string) {
  return listDepartureEntries().find((entry) => entry.key === key) ?? null;
}

/** 상품 탑승지 설정에 등록된 탑승지 그룹을 출발회차 데이터에 연결합니다. */
function withBoardingGroups(departure: GuideDeparture | null): GuideDeparture | null {
  if (!departure) return null;
  return { ...departure, boardingGroups: getProductBoardingGroups(departure.productCode) };
}

function departureOf(entry: OperationDepartureEntry) {
  return withBoardingGroups(
    entry.sampleKey ? getGuideDeparture(entry.sampleKey) : buildGuideDepartureFromSeed(buildReservationSeed(entry)),
  );
}

export function getOperationDeparture(key: string): GuideDeparture | null {
  const entry = findEntry(key);
  const departure = entry ? departureOf(entry) : null;
  return departure ? applyGuideBoardingSession(departure) : null;
}

/** 출발회차(상품 + 출발일)에 접수된 전체 예약. 취소 · 대기 예약을 포함합니다. */
export function getOperationDepartureReservations(key: string): ReservationListItem[] {
  return findEntry(key)?.reservations ?? [];
}

export function getOperationPlan(key: string): GuideOperationPlan | null {
  const entry = findEntry(key);
  if (!entry) return null;
  return entry.sampleKey
    ? getGuideOperationPlan(entry.sampleKey)
    : getGuideOperationPlanForSeed(buildReservationSeed(entry));
}

export function previewOperationDeparture(key: string, plan: GuideOperationPlan): GuideDeparture | null {
  const entry = findEntry(key);
  if (!entry) return null;
  return withBoardingGroups(
    entry.sampleKey
      ? previewGuideDeparture(entry.sampleKey, plan)
      : buildGuideDepartureFromSeed(buildReservationSeed(entry), plan),
  );
}

export function saveOperationPlan(key: string, plan: GuideOperationPlan) {
  const entry = findEntry(key);
  if (!entry) return;
  if (entry.sampleKey) saveGuideOperationPlan(entry.sampleKey, plan);
  else saveGuideOperationPlanForKey(key, plan);
}

export const getOperationAssignmentPath = getGuideAssignmentPath;

/** 출발회차 내 운영배정 대상이 아닌 예약 (배정대기 · 운영제외) 과 주의 예약 */
export function getOperationReservationNotices(key: string) {
  const entry = findEntry(key);
  if (!entry) return [];
  return entry.reservations
    .map((reservation) => ({ reservation, eligibility: getOperationEligibility(reservation) }))
    .filter(({ eligibility }) => eligibility !== "eligible")
    .map(({ reservation, eligibility }) => ({
      code: reservation.code,
      bookerName: reservation.bookerName,
      reserveStatus: reservation.reserveStatus,
      eligibility: eligibility as Exclude<OperationEligibility, "eligible">,
    }));
}

export type OperationDepartureOverview = {
  key: string;
  productName: string;
  departureDate: string;
  summary: ReturnType<typeof getGuideOperationSummary>;
  handedOver: boolean;
  departure: GuideDeparture;
};

export function getOperationDepartureOverviews(): OperationDepartureOverview[] {
  return listDepartureEntries()
    .map((entry) => {
      const departure = departureOf(entry);
      if (!departure) return null;
      return {
        key: entry.key,
        productName: entry.productName,
        departureDate: entry.departureDate,
        summary: getGuideOperationSummary(departure),
        handedOver: Boolean(departure.handover),
        departure,
      };
    })
    .filter((item): item is OperationDepartureOverview => item !== null);
}

export type ReservationOperationView = {
  departureKey: string;
  departureDate: string;
  eligibility: OperationEligibility;
  statusLabel: GuideAssignmentStatus | "배정대기" | "운영제외";
  badge: string;
  vehicleCount: number;
  /** 목록용 짧은 표기: "1호차" / "2개 호차" */
  vehicleShort: string;
  /** 상세용 표기: "1호차" / "1호차 2명 / 2호차 2명" */
  vehicleDetail: string;
  seatLabel: string;
  guideLabel: string;
};

function toView(entry: OperationDepartureEntry, departure: GuideDeparture | null, reservation: ReservationListItem) {
  const eligibility = getOperationEligibility(reservation);
  const base = { departureKey: entry.key, departureDate: entry.departureDate, eligibility };
  const empty = { vehicleCount: 0, vehicleShort: "", vehicleDetail: "", seatLabel: "", guideLabel: "" };
  if (eligibility === "pending" || eligibility === "excluded") {
    const meta = OPERATION_ELIGIBILITY_META[eligibility];
    return { ...base, ...empty, statusLabel: meta.label, badge: meta.badge } as ReservationOperationView;
  }
  const operation = departure ? getGuideReservationOperation(departure, reservation.code) : null;
  if (!operation) {
    return {
      ...base,
      ...empty,
      statusLabel: "미배정",
      badge: GUIDE_ASSIGNMENT_STATUS_BADGE.미배정,
    } as ReservationOperationView;
  }
  const { vehicleCounts } = operation;
  return {
    ...base,
    statusLabel: operation.status,
    badge: GUIDE_ASSIGNMENT_STATUS_BADGE[operation.status],
    vehicleCount: vehicleCounts.length,
    vehicleShort: vehicleCounts.length > 1 ? `${vehicleCounts.length}개 호차` : (vehicleCounts[0]?.vehicle.name ?? ""),
    vehicleDetail:
      vehicleCounts.length > 1
        ? vehicleCounts.map(({ vehicle, count }) => `${vehicle.name} ${count}명`).join(" / ")
        : (vehicleCounts[0]?.vehicle.name ?? ""),
    seatLabel: operation.seatLabel,
    guideLabel: operation.guideLabel,
  } as ReservationOperationView;
}

/** 예약번호 → 운영배정 표시값. 출발회차별 데이터를 한 번씩만 계산합니다. */
export function getReservationOperationViews(reservations: ReservationListItem[]) {
  const views: Record<string, ReservationOperationView> = {};
  listDepartureEntries().forEach((entry) => {
    const departure = departureOf(entry);
    entry.reservations.forEach((reservation) => {
      views[reservation.code] = toView(entry, departure, reservation);
    });
  });
  return Object.fromEntries(
    reservations.filter((item) => views[item.code]).map((item) => [item.code, views[item.code]]),
  );
}

export function getReservationOperationView(reservation: ReservationListItem): ReservationOperationView | null {
  const entry = listDepartureEntries().find((item) =>
    item.reservations.some((value) => value.code === reservation.code),
  );
  if (!entry) return null;
  const current = entry.reservations.find((value) => value.code === reservation.code) ?? reservation;
  return toView(entry, departureOf(entry), { ...current, reserveStatus: reservation.reserveStatus });
}
