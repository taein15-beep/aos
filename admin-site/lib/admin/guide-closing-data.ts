/**
 * 가이드 운영 > 여행 종료 · 운영결과 보고 (SAMPLE)
 * - 보고서 내용은 새로 입력받지 않고 1~6단계 운영 데이터(탑승체크 · 일정 · 고객소통 · 안내방 · 운영기록)를 모아 계산합니다.
 * - 가이드가 직접 작성하는 값은 최종 운영메모와 관리자 전달사항뿐입니다.
 * - 운영종료 상태는 세션에만 보관합니다. (DB/API 미연동 · 새로고침 시 초기화)
 * - 향후 관리자 확인(관리자 확인대기 → 확인완료), 운영 재오픈, 정산 화면의 운영종료 확인에 같은 상태를 사용합니다.
 */
import {
  getGuideBoardingRecord,
  getGuideOperationPath,
  getGuidePassengerPoint,
  getGuidePassengerVehicle,
  getGuideSegmentStatus,
  getGuideStaff,
  summarizeGuideBoarding,
  type GuideBoardingDisplayStatus,
  type GuideBoardingRecord,
  type GuideDeparture,
  type GuidePassenger,
  type GuideReservationGroup,
  type GuideVehicle,
  formatTestReferenceNow,
} from "@/lib/admin/guide-operation-data";
import { GUIDE_CHAT_TEMPLATE_KEY, getGuideMessageBatches } from "@/lib/admin/guide-communication-data";
import {
  GUIDE_CHAT_MODE_META,
  findGuideChatRoom,
  getGuideChatInviteProgress,
  getGuideChatScopes,
  getGuideChatState,
  summarizeGuideChatRoom,
  type GuideChatInviteProgress,
} from "@/lib/admin/guide-chatroom-data";
import {
  buildGuideScheduleViews,
  getGuideSchedule,
  getGuideScheduleState,
  saveGuideScheduleState,
  type GuideScheduleItem,
  type GuideScheduleState,
} from "@/lib/admin/guide-schedule-data";
import {
  getGuideNotes,
  isGuideNoteUnresolved,
  summarizeGuideNotes,
  summarizeGuideNotesByCategory,
  type GuideNote,
} from "@/lib/admin/guide-notes-data";

/* ---------------------------------------------------------------- 상태 */

/** 여행 운영상태. 예약상태 · 탑승상태 · 운영기록 처리상태 · 관리자 확인상태와는 별개의 값입니다. */
export type GuideClosingStatus = "운영중" | "운영종료 준비" | "운영종료";

export const GUIDE_CLOSING_STATUS_BADGE: Record<GuideClosingStatus, string> = {
  운영중: "info",
  "운영종료 준비": "warn",
  운영종료: "success",
};

/** 운영종료 이후 관리자 확인 단계. 운영상태와 별도로 표시합니다. (관리자 운영결과 확인 화면에서 변경) */
export type GuideAdminReviewStatus = "관리자 확인대기" | "관리자 확인완료";

export const GUIDE_ADMIN_REVIEW_BADGE: Record<GuideAdminReviewStatus, string> = {
  "관리자 확인대기": "warn",
  "관리자 확인완료": "success",
};

export const GUIDE_CLOSING_CHECKS = [
  { key: "boarding", label: "탑승현황 확인", description: "예약인원 대비 실제 탑승 · 미탑승 인원" },
  { key: "no-show", label: "미탑승 고객 확인", description: "미탑승 고객과 미탑승 사유" },
  { key: "schedule", label: "일정 운영결과 확인", description: "일정 완료 · 지연 · 변경 내역" },
  { key: "notes", label: "특이사항 확인", description: "운영기록 구분별 · 중요도별 현황" },
  { key: "unresolved", label: "미처리사항 확인", description: "관리자에게 미처리로 인계될 기록" },
] as const;

export type GuideClosingCheckKey = (typeof GUIDE_CLOSING_CHECKS)[number]["key"];

/** 운영종료 시점의 집계 (관리자 확인 · 정산 화면에서 사용할 값) */
export type GuideClosingSnapshot = {
  people: number;
  boarded: number;
  noShow: number;
  scheduleDone: number;
  scheduleTotal: number;
  notes: number;
  unresolved: number;
};

export type GuideClosingState = {
  /** 가이드가 운영종료 준비를 시작했는지 (모든 일정 완료 시 자동으로 준비 상태) */
  prepared: boolean;
  checks: Partial<Record<GuideClosingCheckKey, boolean>>;
  finalMemo: string;
  adminNote: string;
  closedAt?: string;
  closedBy?: string;
  adminReview?: GuideAdminReviewStatus;
  snapshot?: GuideClosingSnapshot;
};

const sessionClosing: Record<string, GuideClosingState> = {};

const ALL_CLOSING_CHECKS = { boarding: true, "no-show": true, schedule: true, notes: true, unresolved: true };

/** 운영현황 통합관리 SAMPLE: 이미 운영종료된 출발상품 */
const SAMPLE_CLOSING: Record<string, GuideClosingState> = {
  "OPS-JEONJU-20261016": {
    prepared: true,
    checks: ALL_CLOSING_CHECKS,
    finalMemo: "전체 일정 정상 종료. 미탑승 1명(연락두절).",
    adminNote: "- 1호차 에어컨 작동불량 차량업체 확인 필요\n- 검정색 지갑 1건 사무실 보관 중",
    closedAt: "2026-10-16 18:40",
    closedBy: "이수민",
    adminReview: "관리자 확인대기",
    snapshot: { people: 10, boarded: 9, noShow: 1, scheduleDone: 0, scheduleTotal: 0, notes: 3, unresolved: 2 },
  },
  "OPS-ANDONG-20261015": {
    prepared: true,
    checks: ALL_CLOSING_CHECKS,
    finalMemo: "하회마을 경상 사고 1건 응급처치 완료. 그 외 일정 정상 종료.",
    adminNote: "- 사고 고객 보험 접수 여부 확인 필요\n- 월영교 관람시간 민원 확인 필요",
    closedAt: "2026-10-15 18:10",
    closedBy: "홍길동",
    adminReview: "관리자 확인완료",
    snapshot: { people: 6, boarded: 6, noShow: 0, scheduleDone: 0, scheduleTotal: 0, notes: 3, unresolved: 2 },
  },
};

const emptyClosing = (): GuideClosingState => ({ prepared: false, checks: {}, finalMemo: "", adminNote: "" });

export function getGuideClosingState(key: string): GuideClosingState {
  const state = sessionClosing[key] ?? SAMPLE_CLOSING[key] ?? emptyClosing();
  return {
    ...state,
    checks: { ...state.checks },
    ...(state.snapshot ? { snapshot: { ...state.snapshot } } : {}),
  };
}

export function saveGuideClosingState(key: string, state: GuideClosingState) {
  sessionClosing[key] = { ...state, checks: { ...state.checks } };
}

export function getGuideClosingPath(key: string) {
  return `${getGuideOperationPath(key)}/closing`;
}

/** YYYY-MM-DD HH:MM (종료처리 시각) */
export function formatGuideClosingNow() {
  return formatTestReferenceNow();
}

export function isGuideClosingChecked(state: GuideClosingState) {
  return GUIDE_CLOSING_CHECKS.every((item) => state.checks[item.key]);
}

export function countGuideClosingChecks(state: GuideClosingState) {
  return GUIDE_CLOSING_CHECKS.filter((item) => state.checks[item.key]).length;
}

/* ---------------------------------------------------------------- 운영결과 집계 */

export type GuideClosingEntry = {
  passenger: GuidePassenger;
  group: GuideReservationGroup;
  vehicle: GuideVehicle | null;
  point: string;
  status: GuideBoardingDisplayStatus;
  record: GuideBoardingRecord;
};

export type GuideClosingPointResult = {
  point: string;
  reserved: number;
  boarded: number;
  noShow: number;
  unchecked: number;
  /** 예약 탑승지가 아닌 곳에서 탑승 (탑승완료에 포함) */
  otherPoint: number;
};

export type GuideVehicleOperationStatus = "운영완료" | "운영중" | "탑승 확인필요";

export const GUIDE_VEHICLE_OPERATION_BADGE: Record<GuideVehicleOperationStatus, string> = {
  운영완료: "success",
  운영중: "info",
  "탑승 확인필요": "warn",
};

export type GuideClosingTimelineRow = {
  vehicle: GuideVehicle;
  planned: string;
  actual: string;
  done: boolean;
  delayMinutes: number;
};

export type GuideClosingTimelineItem = {
  item: GuideScheduleItem;
  rows: GuideClosingTimelineRow[];
  done: boolean;
  maxDelay: number;
};

function summarizePoints(entries: GuideClosingEntry[]): GuideClosingPointResult[] {
  const results: GuideClosingPointResult[] = [];
  entries.forEach((entry) => {
    const point = entry.point || "탑승지 미지정";
    let found = results.find((item) => item.point === point);
    if (!found) {
      found = { point, reserved: 0, boarded: 0, noShow: 0, unchecked: 0, otherPoint: 0 };
      results.push(found);
    }
    found.reserved += 1;
    if (entry.status === "boarded") found.boarded += 1;
    if (entry.status === "no_show") found.noShow += 1;
    if (entry.status === "unchecked") found.unchecked += 1;
    if (entry.status === "boarded" && entry.record.actualPoint && entry.record.actualPoint !== point) {
      found.otherPoint += 1;
    }
  });
  return results;
}

const NOTE_IMPORTANCE_ORDER = { 중요: 0, 확인필요: 1, 일반: 2 } as const;

export function buildGuideClosingReport(departure: GuideDeparture) {
  const { segments } = departure;
  const firstSegment = segments[0];
  const passengers = departure.reservations.flatMap((group) => group.passengers);

  /* 탑승결과: 첫 구간(출발 탑승) 기준. 예약인원은 그대로 두고 탑승 · 미탑승을 따로 집계합니다. */
  const entries: GuideClosingEntry[] = departure.reservations.flatMap((group) =>
    group.passengers.map((passenger) => ({
      passenger,
      group,
      vehicle: getGuidePassengerVehicle(departure, passenger),
      point: getGuidePassengerPoint(passenger) || group.boardingPoint,
      status: getGuideSegmentStatus(passenger, segments, 0),
      record: firstSegment ? getGuideBoardingRecord(passenger, firstSegment.key) : { status: "unchecked" },
    })),
  );
  const boarding = summarizeGuideBoarding(passengers, segments, 0);
  const returnBoarding =
    segments.length > 1
      ? { segment: segments[segments.length - 1], ...summarizeGuideBoarding(passengers, segments, segments.length - 1) }
      : null;
  const noShows = entries.filter((entry) => entry.status === "no_show");
  const unchecked = entries.filter((entry) => entry.status === "unchecked");

  /* 일정 운영결과 (5단계) */
  const items = getGuideSchedule(departure.key)?.items ?? [];
  const scheduleState = getGuideScheduleState(departure.key);
  const vehicleViews = departure.vehicles.map((vehicle) => ({
    vehicle,
    views: buildGuideScheduleViews(items, scheduleState[vehicle.id] ?? {}, vehicle),
  }));
  const timeline: GuideClosingTimelineItem[] = items.map((item) => {
    const rows = vehicleViews.map(({ vehicle, views }) => {
      const view = views.find((value) => value.item.id === item.id);
      return {
        vehicle,
        planned: item.plannedDeparture ?? item.plannedArrival ?? "",
        actual: view?.progress.actualDeparture ?? "",
        done: Boolean(view?.done),
        delayMinutes: view?.done ? view.delayMinutes : 0,
      };
    });
    return {
      item,
      rows,
      done: rows.length > 0 && rows.every((row) => row.done),
      maxDelay: Math.max(0, ...rows.map((row) => row.delayMinutes)),
    };
  });
  const scheduleDone = timeline.filter((item) => item.done).length;
  const scheduleDelayed = timeline.filter((item) => item.done && item.maxDelay > 0).length;
  const scheduleChanges = vehicleViews.flatMap(({ vehicle, views }) =>
    views
      .filter(
        (view) => view.progress.operatingDeparture && view.progress.operatingDeparture !== view.item.plannedDeparture,
      )
      .map((view) => ({
        vehicle,
        item: view.item,
        from: view.item.plannedDeparture ?? "",
        to: view.progress.operatingDeparture ?? "",
      })),
  );
  const incompleteSchedules = vehicleViews.flatMap(({ vehicle, views }) =>
    views
      .filter((view) => !view.done)
      .map((view) => ({
        vehicle,
        item: view.item,
        label: view.status === "planned" ? "예정" : "진행중",
      })),
  );

  /* 호차별 운영결과 */
  const vehicles = departure.vehicles.map((vehicle) => {
    const vehicleEntries = entries.filter((entry) => entry.vehicle?.id === vehicle.id);
    const views = vehicleViews.find((value) => value.vehicle.id === vehicle.id)?.views ?? [];
    const count = (status: GuideBoardingDisplayStatus) =>
      vehicleEntries.filter((entry) => entry.status === status).length;
    const summary = {
      reserved: vehicleEntries.length,
      boarded: count("boarded"),
      noShow: count("no_show"),
      unchecked: count("unchecked"),
      scheduleDone: views.filter((view) => view.done).length,
      scheduleTotal: views.length,
    };
    const status: GuideVehicleOperationStatus =
      summary.unchecked > 0 ? "탑승 확인필요" : summary.scheduleDone < summary.scheduleTotal ? "운영중" : "운영완료";
    return {
      vehicle,
      guide: getGuideStaff(departure, vehicle.guideId),
      summary,
      status,
      points: summarizePoints(vehicleEntries),
    };
  });
  const unassigned = entries.filter((entry) => !entry.vehicle);

  /* 고객 안내 결과 (3단계) · 안내방 (4단계) */
  const batches = getGuideMessageBatches(departure.key);
  const noticeBatches = batches.filter((batch) => batch.templateKey !== GUIDE_CHAT_TEMPLATE_KEY);
  const noticeResults = noticeBatches.flatMap((batch) => batch.results);
  const noticeTypes = noticeBatches.reduce<{ label: string; count: number }[]>((acc, batch) => {
    const found = acc.find((item) => item.label === batch.templateLabel);
    if (found) found.count += 1;
    else acc.push({ label: batch.templateLabel, count: 1 });
    return acc;
  }, []);
  const notices = {
    sends: noticeBatches.length,
    contacts: noticeResults.length,
    success: noticeResults.filter((item) => item.status === "success").length,
    failed: noticeResults.filter((item) => item.status === "failed").length,
    retries: noticeBatches.filter((batch) => batch.retryOf).length,
    types: noticeTypes,
  };
  const chatState = getGuideChatState(departure.key);
  const chatRooms = getGuideChatScopes(departure, chatState.mode).map((scope) => {
    const room = findGuideChatRoom(chatState, scope.roomId);
    const active = Boolean(room?.active);
    const progress: GuideChatInviteProgress | null = active
      ? getGuideChatInviteProgress(summarizeGuideChatRoom(departure, chatState, batches, scope.scope))
      : null;
    return { scope, room, active, progress };
  });
  const chat = { mode: chatState.mode, modeLabel: GUIDE_CHAT_MODE_META[chatState.mode].label, rooms: chatRooms };

  /* 운영기록 (6단계) */
  const notes = getGuideNotes(departure.key);
  const noteSummary = summarizeGuideNotes(notes);
  const noteCategories = summarizeGuideNotesByCategory(notes).filter((item) => item.count > 0);
  const unresolved: GuideNote[] = notes
    .filter(isGuideNoteUnresolved)
    .sort(
      (a, b) =>
        NOTE_IMPORTANCE_ORDER[a.importance] - NOTE_IMPORTANCE_ORDER[b.importance] ||
        b.occurredAt.localeCompare(a.occurredAt),
    );

  return {
    reservations: departure.reservations.length,
    people: departure.totalPeople,
    boarding,
    returnBoarding,
    entries,
    noShows,
    unchecked,
    vehicles,
    unassigned,
    schedule: {
      total: items.length,
      done: scheduleDone,
      delayed: scheduleDelayed,
      normal: scheduleDone - scheduleDelayed,
      timeline,
      changes: scheduleChanges,
      incomplete: incompleteSchedules,
    },
    notices,
    chat,
    notes: { list: notes, summary: noteSummary, categories: noteCategories, unresolved },
  };
}

export type GuideClosingReport = ReturnType<typeof buildGuideClosingReport>;

/** 운영 종료 불가 사유. 미처리 특이사항은 경고 후 종료할 수 있으므로 포함하지 않습니다. */
export function getGuideClosingBlockers(report: GuideClosingReport) {
  const blockers: string[] = [];
  if (report.unchecked.length) blockers.push(`탑승 미확인 고객 ${report.unchecked.length}명`);
  if (report.schedule.incomplete.length)
    blockers.push(`미완료 일정 ${report.schedule.incomplete.length}건 (호차별 합계)`);
  return blockers;
}

export function getGuideClosingStatus(state: GuideClosingState, report: GuideClosingReport): GuideClosingStatus {
  if (state.closedAt) return "운영종료";
  if (state.prepared || (report.schedule.total > 0 && report.schedule.incomplete.length === 0)) return "운영종료 준비";
  return "운영중";
}

export function buildGuideClosingSnapshot(report: GuideClosingReport): GuideClosingSnapshot {
  return {
    people: report.people,
    boarded: report.boarding.boarded,
    noShow: report.boarding.noShow,
    scheduleDone: report.schedule.done,
    scheduleTotal: report.schedule.total,
    notes: report.notes.summary.total,
    unresolved: report.notes.unresolved.length,
  };
}

/**
 * SAMPLE · 테스트용: 남은 일정을 예정시간 기준으로 완료 처리합니다.
 * 실제 운영에서는 일정 · 현장 운영 화면에서 가이드가 도착 · 출발을 확인합니다.
 */
export function completeGuideScheduleSample(departure: GuideDeparture) {
  const items = getGuideSchedule(departure.key)?.items ?? [];
  const state: GuideScheduleState = getGuideScheduleState(departure.key);
  departure.vehicles.forEach((vehicle) => {
    const progressMap = { ...(state[vehicle.id] ?? {}) };
    items.forEach((item) => {
      const progress = progressMap[item.id] ?? {};
      if (progress.actualDeparture) return;
      const departureTime = progress.operatingDeparture ?? item.plannedDeparture ?? item.plannedArrival ?? "";
      progressMap[item.id] = {
        ...progress,
        ...(item.kind === "visit" && !progress.actualArrival
          ? { actualArrival: item.sampleArrival ?? item.plannedArrival ?? departureTime }
          : {}),
        actualDeparture: departureTime,
      };
    });
    state[vehicle.id] = progressMap;
  });
  saveGuideScheduleState(departure.key, state);
}
