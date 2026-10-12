/**
 * 가이드 운영 > 일정 · 현장 운영 샘플 데이터 (SAMPLE)
 * - 상품 일정표의 예정시간은 원본으로 유지하고, 현장 진행값(실제 도착·출발, 운영시간, 집결 변경, 메모)은
 *   호차별 진행기록에 따로 저장합니다. 실제시간으로 예정시간을 덮어쓰지 않습니다.
 * - 실제 현재시간·GPS·자동 일정 재계산은 연동하지 않으며, 도착·출발 확인 시각은 SAMPLE 시각을 사용합니다.
 * - 진행기록은 새로고침 시 초기화되는 프론트 Mock 저장소에 보관합니다.
 */
import {
  getGuideCustomersPath,
  getGuideOperationPath,
  getGuidePassengerPoint,
  getGuidePassengerVehicle,
  getGuideSegmentStatus,
  getGuideVehicleBoardingGroup,
  type GuideBoardingFilter,
  type GuideDeparture,
  type GuidePassenger,
  type GuideVehicle,
} from "@/lib/admin/guide-operation-data";

/** meeting: 집결 · departure: 출발(탑승) · visit: 관광지 방문 */
export type GuideScheduleKind = "meeting" | "departure" | "visit";

/** 상품 일정표 원본 일정. 예정시간은 현장에서 변경해도 바뀌지 않습니다. */
export type GuideScheduleItem = {
  id: string;
  title: string;
  /** 고객안내 문구에 사용하는 장소명 */
  place: string;
  kind: GuideScheduleKind;
  description?: string;
  plannedArrival?: string;
  plannedDeparture?: string;
  freeMinutes?: number;
  meetingTime?: string;
  /** {호차} 는 호차명으로 바뀝니다. */
  meetingPlace?: string;
  /** 이전 일정에서의 예상 이동시간 (분) */
  moveMinutes?: number;
  /** 출발 전 탑승확인에 사용하는 탑승체크 구간 key (고객명단 > 탑승체크) */
  boardingSegment?: string;
  /** 탑승체크 구간이 없는 일정의 재탑승 미확인 고객 (SAMPLE 더미) */
  sampleUncheckedIds?: string[];
  /** 탑승지 그룹의 탑승지 일정을 함께 표시 */
  showBoardingPoints?: boolean;
  /** 도착·출발 확인 시 기록되는 SAMPLE 시각 (실제 현재시간 연동 전) */
  sampleArrival?: string;
  sampleDeparture?: string;
};

/** 호차별 현장 진행기록. 같은 일정도 호차마다 독립적으로 관리합니다. */
export type GuideScheduleProgress = {
  actualArrival?: string;
  /** 실제 출발시간. 출발 일정이 없는 일정은 완료 처리 시각입니다. */
  actualDeparture?: string;
  freeStartedAt?: string;
  /** 현장에서 변경한 출발시간 (운영시간). 예정시간과 별도로 보관합니다. */
  operatingDeparture?: string;
  meetingTime?: string;
  meetingPlace?: string;
  memo?: string;
};

/** 호차 id → 일정 id → 진행기록 */
export type GuideScheduleState = Record<string, Record<string, GuideScheduleProgress>>;

type GuideScheduleSeed = {
  source: string;
  items: GuideScheduleItem[];
  /** 탑승지별 집결시간 (SAMPLE). 없으면 출발상품의 탑승지 시간을 사용합니다. */
  pointTimes: Record<string, string>;
  progress: GuideScheduleState;
};

const SAMPLE_SCHEDULES: Record<string, GuideScheduleSeed> = {
  "GC-WINE-20261017": {
    source: "상품 일정표 · 국악와인열차 고창 당일여행 (SAMPLE)",
    pointTimes: { 서울역: "07:00", 영등포: "07:30", 잠실종합운동장: "08:00" },
    items: [
      {
        id: "S-01",
        title: "서울역 집결",
        place: "서울역",
        kind: "meeting",
        description: "탑승객 집결 · 예약자 확인",
        plannedArrival: "07:00",
        meetingTime: "07:00",
        meetingPlace: "서울역 서부 관광버스 승차장 {호차} 앞",
      },
      {
        id: "S-02",
        title: "서울역 출발",
        place: "서울역",
        kind: "departure",
        description: "탑승지 그룹 순서대로 경유 탑승",
        plannedDeparture: "07:30",
        meetingTime: "07:20",
        meetingPlace: "서울역 서부 관광버스 승차장 {호차} 앞",
        boardingSegment: "outbound",
        showBoardingPoints: true,
        sampleDeparture: "07:34",
      },
      {
        id: "S-03",
        title: "장금이파크",
        place: "장금이파크",
        kind: "visit",
        description: "한방차 시음 · 자유관람",
        plannedArrival: "12:55",
        plannedDeparture: "13:30",
        freeMinutes: 35,
        meetingTime: "13:25",
        meetingPlace: "장금이파크 주차장 {호차} 앞",
        moveMinutes: 300,
        sampleUncheckedIds: ["P-05", "P-19"],
        sampleArrival: "13:02",
        sampleDeparture: "13:33",
      },
      {
        id: "S-04",
        title: "내장산 생태공원",
        place: "내장산 생태공원",
        kind: "visit",
        description: "생태공원 산책 · 단체 해설",
        plannedArrival: "14:00",
        plannedDeparture: "15:00",
        freeMinutes: 40,
        meetingTime: "14:55",
        meetingPlace: "생태공원 입구 버스 정류장 {호차} 앞",
        moveMinutes: 30,
        sampleArrival: "14:03",
        sampleDeparture: "15:02",
      },
      {
        id: "S-05",
        title: "선운사",
        place: "선운사",
        kind: "visit",
        description: "선운사 관람 · 자유시간",
        plannedArrival: "15:30",
        freeMinutes: 80,
        meetingTime: "16:50",
        meetingPlace: "선운사 주차장 {호차} 앞",
        moveMinutes: 30,
        sampleArrival: "15:34",
      },
      {
        id: "S-06",
        title: "선운사 출발",
        place: "선운사",
        kind: "departure",
        description: "귀가 차량 탑승 확인",
        plannedDeparture: "17:00",
        meetingTime: "16:50",
        meetingPlace: "선운사 주차장 {호차} 앞",
        boardingSegment: "return",
      },
    ],
    progress: {
      "V-1": {
        "S-01": { actualDeparture: "07:00" },
        "S-02": { actualDeparture: "07:34", memo: "영등포 탑승 고객 1명 5분 늦게 탑승" },
      },
      "V-2": {
        "S-01": { actualDeparture: "07:00" },
        "S-02": { actualDeparture: "07:36" },
        "S-03": {
          actualArrival: "12:58",
          freeStartedAt: "13:00",
          operatingDeparture: "13:40",
          meetingTime: "13:35",
          memo: "한방차 제공 완료\n고객 1명 차량에서 대기\n출발 10분 지연",
        },
      },
    },
  },
  "OPS-NAMWON-20261017": {
    source: "상품 일정표 · 남원 광한루 · 춘향테마파크 당일 (SAMPLE)",
    pointTimes: { 서울역: "07:00", 사당역: "07:20" },
    items: [
      {
        id: "S-01",
        title: "서울역 출발",
        place: "서울역",
        kind: "departure",
        description: "탑승지 그룹 순서대로 경유 탑승",
        plannedDeparture: "07:00",
        meetingTime: "06:50",
        meetingPlace: "서울역 서부 관광버스 승차장 {호차} 앞",
        boardingSegment: "outbound",
        showBoardingPoints: true,
      },
      {
        id: "S-02",
        title: "광한루원",
        place: "광한루원",
        kind: "visit",
        description: "광한루원 단체 해설 · 자유관람",
        plannedArrival: "10:20",
        plannedDeparture: "11:30",
        freeMinutes: 50,
        meetingTime: "11:25",
        meetingPlace: "광한루원 정문 주차장 {호차} 앞",
        moveMinutes: 200,
      },
      {
        id: "S-03",
        title: "춘향테마파크",
        place: "춘향테마파크",
        kind: "visit",
        description: "점심 · 테마파크 관람",
        plannedArrival: "12:30",
        plannedDeparture: "14:10",
        freeMinutes: 80,
        meetingTime: "14:05",
        meetingPlace: "춘향테마파크 주차장 {호차} 앞",
        moveMinutes: 20,
      },
      {
        id: "S-04",
        title: "남원 출발",
        place: "춘향테마파크",
        kind: "departure",
        description: "귀가 차량 탑승",
        plannedDeparture: "16:00",
        meetingTime: "15:50",
        meetingPlace: "춘향테마파크 주차장 {호차} 앞",
      },
    ],
    progress: {
      "V-1": {
        "S-01": { actualDeparture: "07:00" },
        "S-02": { actualArrival: "10:18", actualDeparture: "11:30" },
        "S-03": { actualArrival: "12:28", freeStartedAt: "12:30" },
      },
    },
  },
};

const sessionStates: Record<string, GuideScheduleState> = {};

const cloneState = (state: GuideScheduleState): GuideScheduleState =>
  Object.fromEntries(
    Object.entries(state).map(([vehicleId, items]) => [
      vehicleId,
      Object.fromEntries(Object.entries(items).map(([itemId, progress]) => [itemId, { ...progress }])),
    ]),
  );

export function getGuideSchedule(key: string) {
  const seed = SAMPLE_SCHEDULES[key];
  return seed ? { source: seed.source, items: seed.items.map((item) => ({ ...item })) } : null;
}

export function getGuideScheduleState(key: string): GuideScheduleState {
  return cloneState(sessionStates[key] ?? SAMPLE_SCHEDULES[key]?.progress ?? {});
}

export function saveGuideScheduleState(key: string, state: GuideScheduleState) {
  sessionStates[key] = cloneState(state);
}

export function getGuideSchedulePath(key: string, vehicleId?: string) {
  const base = `${getGuideOperationPath(key)}/schedule`;
  return vehicleId ? `${base}?vehicle=${encodeURIComponent(vehicleId)}` : base;
}

/** 기존 고객명단 · 탑승체크 화면으로 이동 (호차 · 탑승상태 · 구간 필터) */
export function getGuideScheduleCustomersPath(
  key: string,
  { vehicleId, status, segment }: { vehicleId?: string; status?: GuideBoardingFilter; segment?: string },
) {
  const path = getGuideCustomersPath(key, status);
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  if (vehicleId) params.set("vehicle", vehicleId);
  if (segment) params.set("segment", segment);
  const search = params.toString();
  return search ? `${base}?${search}` : base;
}

/* ---------------------------------------------------------------- 시간 */

export function toGuideMinutes(time?: string) {
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null;
}

export function shiftGuideTime(time: string, minutes: number) {
  const base = toGuideMinutes(time);
  if (base === null) return time;
  const value = (((base + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

/** later − earlier (분). 값이 없으면 0 */
export function diffGuideMinutes(later?: string, earlier?: string) {
  const a = toGuideMinutes(later);
  const b = toGuideMinutes(earlier);
  return a === null || b === null ? 0 : a - b;
}

export function formatGuideDuration(minutes: number) {
  if (minutes < 60) return `${minutes}분`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)}시간 ${rest}분` : `${minutes / 60}시간`;
}

/* ---------------------------------------------------------------- 상태 */

export type GuideScheduleStatus = "done" | "current" | "delayed" | "next" | "planned";

export const GUIDE_SCHEDULE_STATUS_META: Record<GuideScheduleStatus, { label: string; badge: string }> = {
  done: { label: "완료", badge: "success" },
  current: { label: "진행중", badge: "info" },
  delayed: { label: "지연", badge: "danger" },
  next: { label: "다음 일정", badge: "warn" },
  planned: { label: "예정", badge: "gray" },
};

/** 일정 원본 + 호차 진행기록을 합친 화면 표시값 */
export type GuideScheduleView = {
  item: GuideScheduleItem;
  progress: GuideScheduleProgress;
  status: GuideScheduleStatus;
  meetingTime: string;
  meetingPlace: string;
  /** 운영 출발시간 (현장 변경값 우선, 없으면 예정시간) */
  departureTime: string;
  /** 현장 변경으로 늦어진 출발시간 (분). 완료 일정은 실제 출발 기준입니다. */
  delayMinutes: number;
  arrivalDelay: number;
  done: boolean;
  arrived: boolean;
};

export function resolveGuideMeetingPlace(place: string, vehicle: GuideVehicle | null) {
  return place.split("{호차}").join(vehicle?.name ?? "차량");
}

export function isGuideScheduleDone(progress: GuideScheduleProgress) {
  return Boolean(progress.actualDeparture);
}

/** 도착 일정이 없는 일정(출발 · 집결)은 이전 일정 완료 시 바로 진행중으로 봅니다. */
function isArrived(item: GuideScheduleItem, progress: GuideScheduleProgress) {
  return item.kind !== "visit" || Boolean(progress.actualArrival);
}

export function buildGuideScheduleViews(
  items: GuideScheduleItem[],
  progressMap: Record<string, GuideScheduleProgress>,
  vehicle: GuideVehicle | null,
): GuideScheduleView[] {
  const currentIndex = items.findIndex((item) => !isGuideScheduleDone(progressMap[item.id] ?? {}));
  return items.map((item, index) => {
    const progress = progressMap[item.id] ?? {};
    const done = isGuideScheduleDone(progress);
    const arrived = isArrived(item, progress);
    const departureTime = progress.operatingDeparture ?? item.plannedDeparture ?? "";
    const delayMinutes = Math.max(
      0,
      diffGuideMinutes(done ? progress.actualDeparture : departureTime, item.plannedDeparture),
    );
    let status: GuideScheduleStatus = "planned";
    if (done) status = "done";
    else if (index === currentIndex) status = !arrived ? "next" : delayMinutes > 0 ? "delayed" : "current";
    return {
      item,
      progress,
      status,
      meetingTime: progress.meetingTime ?? item.meetingTime ?? "",
      meetingPlace: resolveGuideMeetingPlace(progress.meetingPlace ?? item.meetingPlace ?? "", vehicle),
      departureTime,
      delayMinutes: item.plannedDeparture ? delayMinutes : 0,
      arrivalDelay: Math.max(0, diffGuideMinutes(progress.actualArrival, item.plannedArrival)),
      done,
      arrived,
    };
  });
}

export function summarizeGuideSchedule(views: GuideScheduleView[]) {
  const currentIndex = views.findIndex((view) => !view.done);
  const done = views.filter((view) => view.done).length;
  return {
    total: views.length,
    done,
    inProgress: currentIndex >= 0 ? 1 : 0,
    planned: Math.max(0, views.length - done - (currentIndex >= 0 ? 1 : 0)),
    currentIndex,
    current: currentIndex >= 0 ? views[currentIndex] : null,
    next: currentIndex >= 0 ? (views[currentIndex + 1] ?? null) : null,
  };
}

/** 가이드 운영 메인 카드용 호차별 진행 요약 */
export function summarizeGuideScheduleOverview(departure: GuideDeparture) {
  const schedule = getGuideSchedule(departure.key);
  if (!schedule || schedule.items.length === 0) return null;
  const state = getGuideScheduleState(departure.key);
  const vehicles = departure.vehicles.map((vehicle) => {
    const views = buildGuideScheduleViews(schedule.items, state[vehicle.id] ?? {}, vehicle);
    return { vehicle, summary: summarizeGuideSchedule(views) };
  });
  const base = vehicles[0]?.summary ?? summarizeGuideSchedule(buildGuideScheduleViews(schedule.items, {}, null));
  return { total: schedule.items.length, base, vehicles, items: schedule.items };
}

export function describeGuideScheduleProgress(summary: ReturnType<typeof summarizeGuideSchedule>) {
  const { current } = summary;
  if (!current) return "전체 일정 완료";
  if (current.delayMinutes > 0) return `${current.item.title} ${current.delayMinutes}분 지연`;
  return `${current.item.title} ${current.status === "next" ? "이동 중" : GUIDE_SCHEDULE_STATUS_META[current.status].label}`;
}

/* ---------------------------------------------------------------- 탑승 */

const vehiclePassengers = (departure: GuideDeparture, vehicle: GuideVehicle) =>
  departure.reservations
    .flatMap((group) => group.passengers)
    .filter((item) => getGuidePassengerVehicle(departure, item)?.id === vehicle.id);

/** 출발확인 전 탑승 미확인 고객. 탑승체크 구간이 있으면 실제 탑승체크 상태를, 없으면 SAMPLE 더미를 사용합니다. */
export function getGuideScheduleUnchecked(
  departure: GuideDeparture,
  vehicle: GuideVehicle,
  item: GuideScheduleItem,
): GuidePassenger[] {
  const passengers = vehiclePassengers(departure, vehicle);
  if (item.boardingSegment) {
    const index = departure.segments.findIndex((segment) => segment.key === item.boardingSegment);
    if (index < 0) return [];
    return passengers.filter(
      (passenger) => getGuideSegmentStatus(passenger, departure.segments, index) === "unchecked",
    );
  }
  return passengers.filter((passenger) => item.sampleUncheckedIds?.includes(passenger.id));
}

/**
 * 호차의 탑승지 일정. 운영배정에서 선택한 탑승지 그룹 순서를 사용하고,
 * 그룹이 선택되지 않았으면 호차 고객의 탑승지를 기준으로 표시합니다.
 */
export function getGuideScheduleBoardingPoints(departure: GuideDeparture, vehicle: GuideVehicle) {
  const pointTimes = SAMPLE_SCHEDULES[departure.key]?.pointTimes ?? {};
  const passengers = vehiclePassengers(departure, vehicle);
  const group = getGuideVehicleBoardingGroup(departure, vehicle);
  const names = group
    ? group.points.map((point) => point.name)
    : Array.from(new Set(passengers.map(getGuidePassengerPoint).filter(Boolean)));
  return {
    groupName: group?.name ?? "",
    points: names.map((name) => ({
      name,
      time: pointTimes[name] ?? departure.boardingPoints.find((point) => point.name === name)?.time ?? "-",
      count: passengers.filter((passenger) => getGuidePassengerPoint(passenger) === name).length,
    })),
    total: passengers.length,
  };
}

export function getGuideVehiclePassengerCount(departure: GuideDeparture, vehicle: GuideVehicle) {
  return vehiclePassengers(departure, vehicle).length;
}

/* ---------------------------------------------------------------- 고객안내 */

export type GuideScheduleNoticeKind =
  "arrival" | "free-time" | "meeting" | "departure-notice" | "schedule-change" | "time-change";

/** 안내 종류 = 고객소통 템플릿 key (고객소통 화면에서 같은 템플릿이 선택됩니다) */
export const GUIDE_SCHEDULE_NOTICE_LABEL: Record<GuideScheduleNoticeKind, string> = {
  arrival: "도착 안내",
  "free-time": "자유시간 안내",
  meeting: "집결 안내",
  "departure-notice": "출발시간 안내",
  "schedule-change": "일정 변경",
  "time-change": "고객에게 변경안내",
};

/** 일정 값으로 채운 안내문. 고객소통 화면에서 수정 후 발송합니다. */
export function buildGuideScheduleNotice(kind: GuideScheduleNoticeKind, view: GuideScheduleView) {
  const { item, meetingTime, meetingPlace, departureTime } = view;
  const meet = meetingTime || "__:__";
  const place = meetingPlace || "(위치 입력)";
  switch (kind) {
    case "arrival":
      return [
        "안녕하세요.",
        "",
        `${item.place}에 도착했습니다.`,
        "",
        ...(item.freeMinutes ? ["자유시간:", `${meet}까지`, ""] : []),
        "집결장소:",
        place,
        "",
        "하차 시 소지품을 꼭 확인해주세요.",
      ].join("\n");
    case "free-time":
      return [
        "안녕하세요.",
        "",
        `${item.place} 자유시간 안내드립니다.`,
        "",
        "자유시간:",
        `${meet}까지`,
        "",
        "집결장소:",
        place,
        "",
        `${meet}까지 꼭 집결 부탁드립니다.`,
      ].join("\n");
    case "meeting":
      return [
        "잠시 후 다음 일정으로 이동합니다.",
        "",
        "집결시간:",
        meet,
        "",
        "집결장소:",
        place,
        "",
        "시간에 맞춰 집결 부탁드립니다.",
      ].join("\n");
    case "departure-notice":
      return [
        "안녕하세요.",
        "",
        `${item.place} 출발시간 안내드립니다.`,
        "",
        "출발시간:",
        departureTime || "__:__",
        "",
        "집결시간:",
        meet,
        "",
        "집결장소:",
        place,
        "",
        "늦지 않게 탑승 부탁드립니다.",
      ].join("\n");
    case "schedule-change":
      return [
        "일정 변경 안내드립니다.",
        "",
        "변경 일정:",
        item.title,
        "",
        "변경 내용:",
        "(내용 입력)",
        "",
        "이용에 불편을 드려 죄송합니다.",
      ].join("\n");
    case "time-change":
      return [
        "출발시간이 변경되었습니다.",
        "",
        "기존:",
        item.plannedDeparture ?? "__:__",
        "",
        "변경:",
        view.progress.operatingDeparture ?? "__:__",
        "",
        "집결시간:",
        meet,
        "",
        "집결장소:",
        place,
      ].join("\n");
  }
}
