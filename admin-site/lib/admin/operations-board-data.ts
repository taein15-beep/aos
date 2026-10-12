/**
 * 예약관리 > 운영현황 통합관리 (SAMPLE)
 * - 여러 출발상품의 운영배정 · 가이드 운영 · 운영결과 · 관리자 확인 · 후속조치 상태를 모아 보여주는 조회용 집계입니다.
 * - 각 상태는 1~8단계 화면의 데이터를 그대로 사용하며 이 화면에서 값을 수정하지 않습니다.
 * - 운영상태 · 관리자 확인 · 후속조치는 하나의 상태로 합치지 않고 각각 표시합니다.
 * - 기준일은 QA 테스트 기준일(TEST_REFERENCE_DATE)입니다. (실시간 위치 · 자동 새로고침 · 알림 미연동)
 */
import {
  GUIDE_ADMIN_REVIEW_BADGE,
  getGuideClosingPath,
  getGuideClosingState,
  type GuideAdminReviewStatus,
} from "@/lib/admin/guide-closing-data";
import {
  GUIDE_ASSIGNMENT_STATUS_BADGE,
  TEST_REFERENCE_DATE,
  getGuideAssignmentPath,
  getGuideCustomersPath,
  getGuideHandoverChecks,
  getGuideLeadStaff,
  getGuideOperationPath,
  getGuideOperationSummary,
  getGuideStaff,
  getGuideVehicleBoardingGroup,
  type GuideAssignmentStatus,
  type GuideDeparture,
} from "@/lib/admin/guide-operation-data";
import { getGuideNotes, getGuideNotesPath, type GuideNote } from "@/lib/admin/guide-notes-data";
import {
  getGuideFollowUpDue,
  getGuideOperationPhase,
  getGuideReviewPath,
  getGuideReviewState,
  isGuideFollowUpOpen,
  isGuideImportantIssue,
  summarizeGuideFollowUps,
  type GuideOperationPhase,
} from "@/lib/admin/guide-review-data";
import { getGuideSchedulePath, summarizeGuideScheduleOverview } from "@/lib/admin/guide-schedule-data";
import { getOperationDeparture, getOperationDepartureOverviews } from "@/lib/admin/operation-assignment-data";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const toDayNumber = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return year && month && day ? Date.UTC(year, month - 1, day) / 86_400_000 : 0;
};

const fromDayNumber = (value: number) => new Date(value * 86_400_000).toISOString().slice(0, 10);

export function shiftOpsBoardDate(date: string, days: number) {
  return fromDayNumber(toDayNumber(date) + days);
}

export function formatOpsBoardDate(date: string, withYear = false) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  const weekday = WEEKDAYS[new Date(toDayNumber(date) * 86_400_000).getUTCDay()];
  return `${withYear ? `${year}-` : ""}${month}-${day} (${weekday})`;
}

/* ---------------------------------------------------------------- 기간 */

export type OpsBoardPeriod = "today" | "tomorrow" | "this-week" | "next-week" | "custom" | "all";

export const OPS_BOARD_PERIODS: { key: Exclude<OpsBoardPeriod, "all">; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "tomorrow", label: "내일" },
  { key: "this-week", label: "이번 주" },
  { key: "next-week", label: "다음 주" },
  { key: "custom", label: "직접 선택" },
];

/** 주 단위는 월요일 시작 기준입니다. */
export function getOpsBoardPeriodRange(period: OpsBoardPeriod, custom: { from: string; to: string }) {
  const today = TEST_REFERENCE_DATE;
  const weekday = (new Date(toDayNumber(today) * 86_400_000).getUTCDay() + 6) % 7;
  const monday = shiftOpsBoardDate(today, -weekday);
  switch (period) {
    case "today":
      return { from: today, to: today };
    case "tomorrow":
      return { from: shiftOpsBoardDate(today, 1), to: shiftOpsBoardDate(today, 1) };
    case "this-week":
      return { from: monday, to: shiftOpsBoardDate(monday, 6) };
    case "next-week":
      return { from: shiftOpsBoardDate(monday, 7), to: shiftOpsBoardDate(monday, 13) };
    case "custom":
      return { from: custom.from, to: custom.to };
    default:
      return { from: "", to: "" };
  }
}

export function isInOpsBoardRange(date: string, range: { from: string; to: string }) {
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
}

/* ---------------------------------------------------------------- 운영 단계 */

/** 파이프라인 단계. 운영준비는 운영배정 진행 중인 출발상품입니다. 관리자 확인 · 후속조치는 별도 값입니다. */
export type OpsBoardStage = "prep" | "handover" | "live" | "closed" | "reviewed";

export const OPS_BOARD_STAGES: { key: OpsBoardStage; label: string; description: string; badge: string }[] = [
  { key: "prep", label: "운영준비", description: "운영배정 진행 중", badge: "gray" },
  { key: "handover", label: "운영인계", description: "인계 완료 · 출발 전", badge: "info" },
  { key: "live", label: "운영중", description: "가이드 현장 운영", badge: "info" },
  { key: "closed", label: "운영종료", description: "관리자 확인대기", badge: "warn" },
  { key: "reviewed", label: "관리자 확인완료", description: "운영결과 검토 완료", badge: "success" },
];

const PHASE_STAGE: Record<GuideOperationPhase, OpsBoardStage> = {
  운영배정: "prep",
  운영인계: "handover",
  운영중: "live",
  운영종료: "closed",
};

/* ---------------------------------------------------------------- 운영준비 */

export type OpsBoardPrepKey = "vehicles" | "guides" | "points" | "customers" | "handover";

export type OpsBoardPrepItem = { key: OpsBoardPrepKey; label: string; ok: boolean; detail: string; need: string };

function buildPrepItems(departure: GuideDeparture, summary: ReturnType<typeof getGuideOperationSummary>) {
  const checks = getGuideHandoverChecks(departure);
  const failed = (keys: string[]) => checks.filter((check) => keys.includes(check.key) && check.required && !check.ok);
  const detailOf = (keys: string[], okText: string) => {
    const list = failed(keys);
    return list.length ? list.map((check) => check.detail).join(" · ") : okText;
  };
  const items: OpsBoardPrepItem[] = [
    {
      key: "vehicles",
      label: "호차배정",
      ok: failed(["vehicles"]).length === 0,
      detail: detailOf(["vehicles"], `${departure.vehicles.length}대`),
      need: "호차 배정 필요",
    },
    {
      key: "guides",
      label: "가이드배정",
      ok: failed(["lead", "guide"]).length === 0,
      detail: detailOf(["lead", "guide"], "총괄 · 호차 담당 지정"),
      need: "가이드 배정 필요",
    },
    {
      key: "points",
      label: "탑승지 설정",
      ok: failed(["boardingGroups", "points"]).length === 0,
      detail: detailOf(["boardingGroups", "points"], "탑승지 그룹 · 고객 탑승지 지정"),
      need: "탑승지 설정 필요",
    },
    {
      key: "customers",
      label: "고객배정",
      ok: failed(["unassigned", "capacity"]).length === 0,
      detail: `${summary.assigned} / ${summary.total}명 배정${summary.unassigned ? ` · ${summary.unassigned}명 미배정` : ""}`,
      need: summary.unassigned
        ? `고객 ${summary.assigned} / ${summary.total} · ${summary.unassigned}명 미배정`
        : "고객 배정 확인 필요",
    },
    {
      key: "handover",
      label: "운영인계",
      ok: Boolean(departure.handover),
      detail: departure.handover ? `${departure.handover.at} · ${departure.handover.by}` : "운영인계 전",
      need: "운영인계 필요",
    },
  ];
  return items;
}

/* ---------------------------------------------------------------- 출발상품 집계 */

export type OpsBoardVehicle = {
  id: string;
  name: string;
  guideName: string;
  assigned: number;
  capacity: number;
  groupName: string;
  /** 운영중일 때 현재 일정 */
  current: string;
  progressLabel: string;
  progressBadge: string;
  delayMinutes: number;
  scheduleHref: string;
};

export type OpsBoardActionKind = "assignment" | "guide" | "schedule" | "closing" | "review" | "result";

export type OpsBoardAction = { label: string; href: string; kind: OpsBoardActionKind };

export type OpsBoardIssue = { id: string; title: string; vehicleName: string; status: string; href: string };

export type OpsBoardItem = {
  key: string;
  productCode: string;
  productName: string;
  departureDate: string;
  startTime: string;
  dday: number;
  ddayLabel: string;
  people: number;
  reservationCount: number;
  assignmentStatus: GuideAssignmentStatus;
  assignmentBadge: string;
  phase: GuideOperationPhase;
  stage: OpsBoardStage;
  /** 지난 출발일인데 운영기록이 없는 출발상품 (KPI · 파이프라인 집계 제외) */
  stale: boolean;
  adminReview: GuideAdminReviewStatus | null;
  adminReviewBadge: string;
  reviewedAt: string;
  leadName: string;
  guideNames: string[];
  guides: { assigned: number; required: number };
  vehicles: OpsBoardVehicle[];
  boardingPoints: string[];
  prep: OpsBoardPrepItem[];
  prepDone: number;
  prepRate: number;
  prepComplete: boolean;
  /** 출발 전 운영준비 미완료 */
  prepNeeded: boolean;
  customers: { total: number; assigned: number; unassigned: number };
  boarding: { reserved: number; boarded: number; noShow: number; unchecked: number };
  delayedVehicles: number;
  maxDelay: number;
  issues: OpsBoardIssue[];
  followUps: { total: number; open: number; overdue: number; done: number };
  closedAt: string;
  risk: boolean;
  actions: OpsBoardAction[];
  primaryAction: OpsBoardAction;
  links: { operation: string; assignment: string; review: string; notes: string; schedule: string };
};

function ddayLabelOf(dday: number, date: string) {
  if (dday === 0) return "D-Day";
  if (dday > 0) return `D-${dday}`;
  return formatOpsBoardDate(date);
}

function buildVehicles(departure: GuideDeparture, live: boolean): OpsBoardVehicle[] {
  const passengers = departure.reservations.flatMap((group) => group.passengers);
  const overview = live ? summarizeGuideScheduleOverview(departure) : null;
  return departure.vehicles.map((vehicle) => {
    const summary = overview?.vehicles.find((item) => item.vehicle.id === vehicle.id)?.summary ?? null;
    const current = summary?.current ?? null;
    const delay = current?.delayMinutes ?? 0;
    let progressLabel = "";
    let progressBadge = "gray";
    if (live && !overview) {
      progressLabel = "일정 미등록";
    } else if (summary && !current) {
      progressLabel = "전체 일정 완료";
      progressBadge = "success";
    } else if (current) {
      progressLabel = delay > 0 ? `${delay}분 지연` : current.status === "next" ? "이동 중" : "정상 진행";
      progressBadge = delay > 0 ? "danger" : "success";
    }
    return {
      id: vehicle.id,
      name: vehicle.name,
      guideName: getGuideStaff(departure, vehicle.guideId)?.name ?? "",
      assigned: passengers.filter((item) => item.assignment.default?.vehicleId === vehicle.id).length,
      capacity: vehicle.capacity,
      groupName: getGuideVehicleBoardingGroup(departure, vehicle)?.name ?? "",
      current: current?.item.title ?? "",
      progressLabel,
      progressBadge,
      delayMinutes: delay,
      scheduleHref: getGuideSchedulePath(departure.key, vehicle.id),
    };
  });
}

function buildIssues(departure: GuideDeparture, notes: GuideNote[], reviewed: boolean): OpsBoardIssue[] {
  if (reviewed) return [];
  return notes
    .filter((note) => isGuideImportantIssue(note) && note.status !== "처리완료")
    .map((note) => ({
      id: note.id,
      title: note.title,
      vehicleName:
        departure.vehicles.find((vehicle) => vehicle.id === note.vehicleId)?.name ??
        (note.vehicleId === "all" ? "전체 호차" : ""),
      status: note.status,
      href: getGuideNotesPath(departure.key, { note: note.id }),
    }));
}

function buildActions(item: Omit<OpsBoardItem, "actions" | "primaryAction">): OpsBoardAction[] {
  const { links } = item;
  const assignment: OpsBoardAction = { label: "운영배정", href: links.assignment, kind: "assignment" };
  const guide: OpsBoardAction = { label: "가이드 운영", href: links.operation, kind: "guide" };
  switch (item.stage) {
    case "prep":
      return [assignment, guide];
    case "handover":
      return [guide, assignment];
    case "live":
      return [{ label: "현장운영", href: links.schedule, kind: "schedule" }, guide];
    case "closed":
      return [
        { label: "결과확인", href: links.review, kind: "review" },
        { label: "운영결과", href: getGuideClosingPath(item.key), kind: "closing" },
      ];
    default:
      return [
        { label: "결과보기", href: links.review, kind: "result" },
        { label: "가이드 운영", href: links.operation, kind: "guide" },
      ];
  }
}

function buildItem(departure: GuideDeparture): OpsBoardItem {
  const summary = getGuideOperationSummary(departure);
  const closing = getGuideClosingState(departure.key);
  const review = getGuideReviewState(departure.key);
  const phase = getGuideOperationPhase(departure, closing);
  const adminReview = closing.adminReview ?? null;
  const stage: OpsBoardStage =
    phase === "운영종료" && adminReview === "관리자 확인완료" ? "reviewed" : PHASE_STAGE[phase];
  const dday = toDayNumber(departure.departureDate) - toDayNumber(TEST_REFERENCE_DATE);
  const preOperation = stage === "prep" || stage === "handover";
  const stale = dday < 0 && preOperation;
  const prep = buildPrepItems(departure, summary);
  const prepDone = prep.filter((value) => value.ok).length;
  const vehicles = buildVehicles(departure, stage === "live");
  const notes = getGuideNotes(departure.key);
  const followUpSummary = summarizeGuideFollowUps(review.followUps);
  const overdue = review.followUps.filter(
    (followUp) => isGuideFollowUpOpen(followUp) && getGuideFollowUpDue(followUp)?.label === "기한초과",
  ).length;
  const lead = getGuideLeadStaff(departure);
  const guideNames = Array.from(new Set([lead?.name, ...vehicles.map((vehicle) => vehicle.guideName)].filter(Boolean)));
  const delayed = vehicles.filter((vehicle) => vehicle.delayMinutes > 0);
  const firstTime = departure.boardingPoints.find((point) => /^\d{2}:\d{2}$/.test(point.time))?.time ?? "";
  const operation = getGuideOperationPath(departure.key);
  const issues = buildIssues(departure, notes, stage === "reviewed");
  const prepNeeded = preOperation && !stale && prepDone < prep.length;
  const base = {
    key: departure.key,
    productCode: departure.productCode,
    productName: departure.productName,
    departureDate: departure.departureDate,
    startTime: firstTime,
    dday,
    ddayLabel: ddayLabelOf(dday, departure.departureDate),
    people: summary.total,
    reservationCount: departure.reservations.length,
    assignmentStatus: summary.status,
    assignmentBadge: GUIDE_ASSIGNMENT_STATUS_BADGE[summary.status],
    phase,
    stage,
    stale,
    adminReview,
    adminReviewBadge: adminReview ? GUIDE_ADMIN_REVIEW_BADGE[adminReview] : "gray",
    reviewedAt: review.reviewedAt ?? "",
    leadName: lead?.name ?? "",
    guideNames: guideNames as string[],
    guides: {
      assigned: departure.vehicles.filter((vehicle) => vehicle.guideId).length,
      required: departure.vehicles.length,
    },
    vehicles,
    boardingPoints: departure.boardingPoints.map((point) => point.name),
    prep,
    prepDone,
    prepRate: Math.round((prepDone / prep.length) * 100),
    prepComplete: prepDone === prep.length,
    prepNeeded,
    customers: { total: summary.total, assigned: summary.assigned, unassigned: summary.unassigned },
    boarding: {
      reserved: departure.totalPeople,
      boarded: departure.boardedCount,
      noShow: departure.noShowCount,
      unchecked: departure.uncheckedCount,
    },
    delayedVehicles: delayed.length,
    maxDelay: Math.max(0, ...delayed.map((vehicle) => vehicle.delayMinutes)),
    issues,
    followUps: { total: followUpSummary.total, open: followUpSummary.open, done: followUpSummary.done, overdue },
    closedAt: closing.closedAt ?? "",
    risk:
      issues.length > 0 ||
      overdue > 0 ||
      delayed.length > 0 ||
      (prepNeeded && dday <= 1) ||
      (stage === "live" && departure.uncheckedCount > 0),
    links: {
      operation,
      assignment: getGuideAssignmentPath(departure.key),
      review: getGuideReviewPath(departure.key),
      notes: getGuideNotesPath(departure.key),
      schedule: getGuideSchedulePath(departure.key),
    },
  };
  const actions = buildActions(base);
  return { ...base, actions, primaryAction: actions[0] };
}

/** 운영현황 대상 출발상품 전체 (출발일 · 시작시간 순) */
export function getOpsBoardItems(): OpsBoardItem[] {
  return getOperationDepartureOverviews()
    .map((overview) => getOperationDeparture(overview.key))
    .filter((departure): departure is GuideDeparture => departure !== null)
    .map(buildItem)
    .sort(
      (a, b) =>
        a.departureDate.localeCompare(b.departureDate) ||
        (a.startTime || "99").localeCompare(b.startTime || "99") ||
        a.productName.localeCompare(b.productName),
    );
}

/** 출발회차 운영 마스터. 상품코드가 아니라 출발회차 key로 조회합니다. */
export function getOpsBoardItem(key: string): OpsBoardItem | null {
  const departure = getOperationDeparture(key);
  return departure ? buildItem(departure) : null;
}

export function getOpsDeparturePath(key: string) {
  return `/reservations/operations/${encodeURIComponent(key)}`;
}

/* ---------------------------------------------------------------- 확인 필요 */

export type OpsBoardAttention = {
  id: string;
  key: string;
  priority: 1 | 2 | 3 | 4 | 5;
  category: string;
  tone: "danger" | "warn" | "info";
  title: string;
  productName: string;
  departureDate: string;
  description: string;
  chips: string[];
  action: OpsBoardAction;
};

export const OPS_BOARD_ATTENTION_LABEL: Record<OpsBoardAttention["priority"], string> = {
  1: "중요 · 안전 이슈",
  2: "출발 임박 · 운영준비 미완료",
  3: "운영중 문제",
  4: "관리자 확인대기",
  5: "후속조치 기한초과",
};

/** 우선순위: 중요/안전 이슈 → 출발 임박 운영준비 미완료 → 운영중 문제 → 관리자 확인대기 → 기한초과 후속조치 */
export function buildOpsBoardAttention(items: OpsBoardItem[]): OpsBoardAttention[] {
  const list: OpsBoardAttention[] = [];
  items.forEach((item) => {
    const common = { key: item.key, productName: item.productName, departureDate: item.departureDate };
    item.issues.forEach((issue) => {
      list.push({
        ...common,
        id: `${item.key}-issue-${issue.id}`,
        priority: 1,
        category: "중요이슈",
        tone: "danger",
        title: issue.title,
        description: [issue.vehicleName, `처리상태 ${issue.status}`].filter(Boolean).join(" · "),
        chips: [],
        action: { label: "이슈 확인", href: issue.href, kind: "guide" },
      });
    });
    if (item.prepNeeded && item.dday >= 0 && item.dday <= 1) {
      list.push({
        ...common,
        id: `${item.key}-prep`,
        priority: 2,
        category: `출발 ${item.ddayLabel}`,
        tone: item.dday === 0 ? "danger" : "warn",
        title: "운영준비 미완료",
        description: `운영준비 ${item.prepDone} / ${item.prep.length} 완료`,
        chips: item.prep.filter((prep) => !prep.ok).map((prep) => prep.need),
        action: { label: "운영배정 바로가기", href: item.links.assignment, kind: "assignment" },
      });
    }
    if (item.stage === "live") {
      item.vehicles
        .filter((vehicle) => vehicle.delayMinutes > 0)
        .forEach((vehicle) => {
          list.push({
            ...common,
            id: `${item.key}-delay-${vehicle.id}`,
            priority: 3,
            category: "일정 지연",
            tone: "warn",
            title: `${vehicle.name} ${vehicle.current} ${vehicle.delayMinutes}분 지연`,
            description: vehicle.guideName ? `담당 ${vehicle.guideName}` : "담당가이드 미지정",
            chips: [],
            action: { label: "현장운영", href: vehicle.scheduleHref, kind: "schedule" },
          });
        });
      if (item.boarding.unchecked > 0) {
        list.push({
          ...common,
          id: `${item.key}-unchecked`,
          priority: 3,
          category: "탑승 미확인",
          tone: "warn",
          title: `탑승 미확인 ${item.boarding.unchecked}명`,
          description: `탑승 ${item.boarding.boarded} · 미탑승 ${item.boarding.noShow} / 예약 ${item.boarding.reserved}명`,
          chips: [],
          action: { label: "고객명단", href: getGuideCustomersPath(item.key, "unchecked"), kind: "guide" },
        });
      }
    }
    if (item.stage === "closed") {
      list.push({
        ...common,
        id: `${item.key}-review`,
        priority: 4,
        category: "관리자 확인대기",
        tone: "info",
        title: "운영종료 · 운영결과 확인 필요",
        description: item.closedAt ? `운영종료 ${item.closedAt}` : "운영종료",
        chips: [],
        action: { label: "운영결과 확인", href: item.links.review, kind: "review" },
      });
    }
    if (item.followUps.overdue > 0) {
      list.push({
        ...common,
        id: `${item.key}-overdue`,
        priority: 5,
        category: "후속조치",
        tone: "danger",
        title: `후속조치 기한초과 ${item.followUps.overdue}건`,
        description: `진행중 ${item.followUps.open}건 · 전체 ${item.followUps.total}건`,
        chips: [],
        action: { label: "후속조치 확인", href: item.links.review, kind: "result" },
      });
    }
  });
  return list.sort((a, b) => a.priority - b.priority || a.departureDate.localeCompare(b.departureDate));
}

/* ---------------------------------------------------------------- 필터 */

export type OpsBoardFocus =
  | "all"
  | "today"
  | "tomorrow"
  | "prep-needed"
  | "live"
  | "issue"
  | "review-wait"
  | "follow-up"
  | `stage:${OpsBoardStage}`;

export const OPS_BOARD_QUICK_FILTERS: { key: OpsBoardFocus; label: string }[] = [
  { key: "today", label: "오늘 출발" },
  { key: "tomorrow", label: "내일 출발" },
  { key: "prep-needed", label: "운영준비 미완료" },
  { key: "live", label: "운영중" },
  { key: "issue", label: "중요이슈" },
  { key: "review-wait", label: "관리자 확인대기" },
  { key: "follow-up", label: "후속조치" },
];

/** 운영준비 필요 KPI는 출발 7일 이내 출발상품만 집계합니다. */
export const OPS_BOARD_PREP_WINDOW = 7;

export function matchesOpsBoardFocus(item: OpsBoardItem, focus: OpsBoardFocus) {
  switch (focus) {
    case "all":
      return true;
    case "today":
      return item.dday === 0;
    case "tomorrow":
      return item.dday === 1;
    case "prep-needed":
      return item.prepNeeded && item.dday <= OPS_BOARD_PREP_WINDOW;
    case "live":
      return item.stage === "live";
    case "issue":
      return item.issues.length > 0;
    case "review-wait":
      return item.stage === "closed";
    case "follow-up":
      return item.followUps.open > 0;
    default:
      return !item.stale && item.stage === focus.slice("stage:".length);
  }
}

/** 기간과 관계없이 전체 출발상품에서 찾는 상태형 필터 */
export function isOpsBoardStatusFocus(focus: OpsBoardFocus) {
  return focus !== "all" && focus !== "today" && focus !== "tomorrow";
}

export type OpsBoardAdvancedFilter = {
  stage: "all" | OpsBoardStage;
  assignment: "all" | GuideAssignmentStatus;
  guide: string;
  vehicles: "all" | "none" | "single" | "multi";
  issue: "all" | "yes" | "no";
  followUp: "all" | "open" | "overdue" | "none";
};

export const OPS_BOARD_ADVANCED_DEFAULT: OpsBoardAdvancedFilter = {
  stage: "all",
  assignment: "all",
  guide: "all",
  vehicles: "all",
  issue: "all",
  followUp: "all",
};

export function matchesOpsBoardAdvanced(item: OpsBoardItem, filter: OpsBoardAdvancedFilter) {
  if (filter.stage !== "all" && item.stage !== filter.stage) return false;
  if (filter.assignment !== "all" && item.assignmentStatus !== filter.assignment) return false;
  if (filter.guide !== "all" && !item.guideNames.includes(filter.guide)) return false;
  if (filter.vehicles === "none" && item.vehicles.length > 0) return false;
  if (filter.vehicles === "single" && item.vehicles.length !== 1) return false;
  if (filter.vehicles === "multi" && item.vehicles.length < 2) return false;
  if (filter.issue === "yes" && item.issues.length === 0) return false;
  if (filter.issue === "no" && item.issues.length > 0) return false;
  if (filter.followUp === "open" && item.followUps.open === 0) return false;
  if (filter.followUp === "overdue" && item.followUps.overdue === 0) return false;
  if (filter.followUp === "none" && item.followUps.total > 0) return false;
  return true;
}

/** 상품명 · 상품코드 · 담당가이드 · 출발일 */
export function matchesOpsBoardKeyword(item: OpsBoardItem, keyword: string) {
  const value = keyword.trim().toLowerCase();
  if (!value) return true;
  return [item.productName, item.productCode, item.departureDate, ...item.guideNames].some((text) =>
    text.toLowerCase().includes(value),
  );
}

/** 위험 항목 우선 → 출발일 → 시작시간 */
export function sortOpsBoardItems(items: OpsBoardItem[]) {
  return [...items].sort(
    (a, b) =>
      Number(b.risk) - Number(a.risk) ||
      a.departureDate.localeCompare(b.departureDate) ||
      (a.startTime || "99").localeCompare(b.startTime || "99"),
  );
}
