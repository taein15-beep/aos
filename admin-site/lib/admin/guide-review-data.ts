/**
 * 가이드 운영 > 관리자 운영결과 확인 · 후속조치 (SAMPLE)
 * - 가이드가 운영 종료 인계한 운영결과(7단계)를 관리자가 검토합니다. 예약 · 운영배정 · 가이드 운영 데이터는 다시 입력하지 않습니다.
 * - 관리자 후속조치는 가이드 원본 운영기록(6단계)과 별도로 저장하며, 원본 기록을 덮어쓰지 않습니다.
 * - 관리자 확인완료는 "운영결과를 검토했다"는 의미입니다. 후속조치 상태와 독립적으로 관리합니다.
 * - 상태는 세션에만 보관합니다. (DB/API · 알림 · 정산 미연동 · 새로고침 시 초기화)
 * - 향후 정산 화면 · 관리자 Dashboard · 예약 상세(고객 관련 특이사항)에서 같은 상태를 참고할 수 있도록 구분합니다.
 */
import {
  GUIDE_CLOSING_CHECKS,
  buildGuideClosingReport,
  buildGuideClosingSnapshot,
  completeGuideScheduleSample,
  getGuideClosingState,
  saveGuideClosingState,
  type GuideAdminReviewStatus,
  type GuideClosingReport,
  type GuideClosingState,
} from "@/lib/admin/guide-closing-data";
import {
  TEST_REFERENCE_DATE,
  getGuideLeadStaff,
  saveGuideBoardingSession,
  type GuideDeparture,
  type GuideVehicle,
  formatTestReferenceNow,
} from "@/lib/admin/guide-operation-data";
import { getGuideNotes, isGuideNoteUnresolved, type GuideNote } from "@/lib/admin/guide-notes-data";
import { getGuideScheduleState, type GuideScheduleItem } from "@/lib/admin/guide-schedule-data";
import { STAFF_MEMBER_MOCK_ROWS } from "@/lib/admin/members-staff-data";
import { getOperationDeparture } from "@/lib/admin/operation-assignment-data";

/* ---------------------------------------------------------------- 상태 체계 */

/** 여행 운영 진행단계 (출발회차 목록 표시용). 관리자 확인 · 후속조치 상태와 별개입니다. */
export type GuideOperationPhase = "운영배정" | "운영인계" | "운영중" | "운영종료";

export const GUIDE_OPERATION_PHASE_BADGE: Record<GuideOperationPhase, string> = {
  운영배정: "gray",
  운영인계: "info",
  운영중: "info",
  운영종료: "success",
};

export function getGuideOperationPhase(departure: GuideDeparture, closing: GuideClosingState): GuideOperationPhase {
  if (closing.closedAt) return "운영종료";
  if (departure.boardedCount + departure.noShowCount > 0) return "운영중";
  return departure.handover ? "운영인계" : "운영배정";
}

/* ---------------------------------------------------------------- 검토 체크 */

export const GUIDE_REVIEW_CHECKS = [
  { key: "boarding", label: "탑승결과 확인", description: "예약인원 대비 실제 탑승 · 미탑승" },
  { key: "no-show", label: "미탑승 고객 확인", description: "미탑승 고객과 사유 (예약취소와 구분)" },
  { key: "schedule", label: "일정 변경/지연 확인", description: "지연 · 변경된 일정과 사유" },
  { key: "notes", label: "운영기록 확인", description: "가이드 특이사항 전체" },
  { key: "important", label: "중요이슈 확인", description: "중요 · 사고/안전 기록" },
  { key: "unresolved", label: "미처리사항 확인", description: "가이드가 미처리로 인계한 기록" },
  { key: "admin-note", label: "관리자 전달사항 확인", description: "가이드 최종 운영메모 · 관리자 전달사항" },
] as const;

export type GuideReviewCheckKey = (typeof GUIDE_REVIEW_CHECKS)[number]["key"];

/* ---------------------------------------------------------------- 후속조치 */

/** 환불/보상은 처리하지 않고 "검토 필요" 업무만 기록합니다. */
export const GUIDE_FOLLOW_UP_TYPES = [
  "고객확인",
  "분실물",
  "차량업체",
  "식당",
  "관광지",
  "가이드",
  "환불/보상 검토",
  "민원확인",
  "안전관련",
  "기타",
] as const;
export type GuideFollowUpType = (typeof GUIDE_FOLLOW_UP_TYPES)[number];

export const GUIDE_FOLLOW_UP_STATUSES = ["처리대기", "처리중", "처리완료", "보류"] as const;
export type GuideFollowUpStatus = (typeof GUIDE_FOLLOW_UP_STATUSES)[number];

export const GUIDE_FOLLOW_UP_STATUS_BADGE: Record<GuideFollowUpStatus, string> = {
  처리대기: "warn",
  처리중: "info",
  처리완료: "success",
  보류: "gray",
};

export type GuideFollowUpNeed = "필요" | "불필요";

/** 처리내용 · 상태 변경 이력 (하나의 후속조치에 여러 건) */
export type GuideFollowUpLog = {
  id: string;
  at: string;
  by: string;
  text: string;
  status?: GuideFollowUpStatus;
};

export type GuideFollowUp = {
  id: string;
  /** 관련 가이드 운영기록 id. 빈 문자열은 여행 전체 후속조치입니다. */
  noteId: string;
  type: GuideFollowUpType;
  /** 담당자 id (관리자/직원 adminCode 기준 · 향후 직원관리 연동) */
  assigneeId: string;
  dueDate: string;
  content: string;
  status: GuideFollowUpStatus;
  memo: string;
  createdAt: string;
  createdBy: string;
  logs: GuideFollowUpLog[];
};

export type GuideFollowUpDraft = Pick<
  GuideFollowUp,
  "noteId" | "type" | "assigneeId" | "dueDate" | "content" | "status" | "memo"
>;

/** 담당자 더미. 유미진은 SAMPLE 운영 담당자이며 나머지는 관리자/직원관리 Mock을 사용합니다. */
export const GUIDE_REVIEW_ASSIGNEES: { id: string; name: string; group: string }[] = [
  { id: "ops_yoo", name: "유미진", group: "운영팀 (SAMPLE)" },
  ...STAFF_MEMBER_MOCK_ROWS.map((row) => ({ id: row.adminCode, name: row.koreanName, group: row.groupName })),
];

/** 현재 로그인 관리자 (더미). 실제 권한 · 로그인 연동 전입니다. */
export const GUIDE_REVIEW_ADMIN = GUIDE_REVIEW_ASSIGNEES[0];

export function getGuideReviewAssigneeName(id: string) {
  return GUIDE_REVIEW_ASSIGNEES.find((item) => item.id === id)?.name ?? "미지정";
}

/** 관리자 처리시각: QA 테스트 기준일 + 현재 시:분 */
export function formatGuideReviewNow() {
  return formatTestReferenceNow();
}

let followUpSeq = 0;

export function createGuideFollowUpId(prefix = "FU") {
  followUpSeq += 1;
  return `${prefix}-${String(followUpSeq).padStart(3, "0")}`;
}

const toDayNumber = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return year && month && day ? Date.UTC(year, month - 1, day) / 86_400_000 : null;
};

/** 처리기한 표시 (오늘까지 · D-n · 기한초과). 처리완료 · 기한 미설정은 표시하지 않습니다. */
export function getGuideFollowUpDue(followUp: Pick<GuideFollowUp, "dueDate" | "status">, today = TEST_REFERENCE_DATE) {
  if (!followUp.dueDate || followUp.status === "처리완료") return null;
  const due = toDayNumber(followUp.dueDate);
  const base = toDayNumber(today);
  if (due === null || base === null) return null;
  const diff = due - base;
  if (diff < 0) return { label: "기한초과", badge: "danger" };
  if (diff === 0) return { label: "오늘까지", badge: "warn" };
  return { label: `D-${diff}`, badge: diff === 1 ? "warn" : "gray" };
}

export function isGuideFollowUpOpen(followUp: Pick<GuideFollowUp, "status">) {
  return followUp.status !== "처리완료";
}

export function summarizeGuideFollowUps(list: GuideFollowUp[]) {
  const count = (status: GuideFollowUpStatus) => list.filter((item) => item.status === status).length;
  const done = count("처리완료");
  return {
    total: list.length,
    waiting: count("처리대기"),
    progress: count("처리중"),
    done,
    hold: count("보류"),
    /** 처리완료 외 (처리대기 · 처리중 · 보류) */
    open: list.length - done,
  };
}

const FOLLOW_UP_TYPE_BY_CATEGORY: Partial<Record<GuideNote["category"], GuideFollowUpType>> = {
  고객관련: "고객확인",
  분실물: "분실물",
  차량: "차량업체",
  "식당/관광지": "식당",
  민원: "민원확인",
  "사고/안전": "안전관련",
};

export function getGuideFollowUpTypeForNote(note: GuideNote | null): GuideFollowUpType {
  return (note && FOLLOW_UP_TYPE_BY_CATEGORY[note.category]) ?? "기타";
}

/* ---------------------------------------------------------------- 검토 상태 */

export type GuideReviewState = {
  checks: Partial<Record<GuideReviewCheckKey, boolean>>;
  /** 운영기록 id → 후속조치 필요 여부 */
  needs: Record<string, GuideFollowUpNeed>;
  /** 관리자가 확인한 중요 이슈 (운영기록 id) */
  confirmedIssues: string[];
  followUps: GuideFollowUp[];
  /** 관리자 검토 메모 (내부용 · 여행 전체) */
  memo: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

const sessionReview: Record<string, GuideReviewState> = {};

/** 운영현황 통합관리 SAMPLE: 관리자 확인완료 + 후속조치 진행중 (1건 기한초과) */
const SAMPLE_REVIEW: Record<string, GuideReviewState> = {
  "OPS-ANDONG-20261015": {
    checks: Object.fromEntries(GUIDE_REVIEW_CHECKS.map((item) => [item.key, true])),
    needs: { "AN-01": "필요", "AN-02": "필요", "AN-03": "필요" },
    confirmedIssues: ["AN-01"],
    memo: "사고 고객 보험 접수 확인 후 종결 예정.",
    reviewedAt: "2026-10-16 10:30",
    reviewedBy: "유미진",
    followUps: [
      {
        id: "FU-AD-01",
        noteId: "AN-01",
        type: "안전관련",
        assigneeId: "ops_yoo",
        dueDate: "2026-10-17",
        content: "고객 상태 유선 확인 및 보험 접수 여부 확인",
        status: "처리완료",
        memo: "",
        createdAt: "2026-10-16 10:10",
        createdBy: "유미진",
        logs: [
          { id: "FU-AD-01-L1", at: "2026-10-16 10:10", by: "유미진", text: "후속조치 등록", status: "처리대기" },
          {
            id: "FU-AD-01-L2",
            at: "2026-10-16 15:20",
            by: "유미진",
            text: "고객 통화 · 보험 접수 완료",
            status: "처리완료",
          },
        ],
      },
      {
        id: "FU-AD-02",
        noteId: "AN-02",
        type: "민원확인",
        assigneeId: "ops_yoo",
        dueDate: "2026-10-16",
        content: "월영교 관람시간 민원 고객 유선 안내",
        status: "처리대기",
        memo: "",
        createdAt: "2026-10-16 10:15",
        createdBy: "유미진",
        logs: [{ id: "FU-AD-02-L1", at: "2026-10-16 10:15", by: "유미진", text: "후속조치 등록", status: "처리대기" }],
      },
      {
        id: "FU-AD-03",
        noteId: "AN-03",
        type: "분실물",
        assigneeId: GUIDE_REVIEW_ASSIGNEES[1]?.id ?? "ops_yoo",
        dueDate: "2026-10-20",
        content: "차량업체에 우산 습득 여부 확인",
        status: "처리중",
        memo: "",
        createdAt: "2026-10-16 10:20",
        createdBy: "유미진",
        logs: [
          { id: "FU-AD-03-L1", at: "2026-10-16 10:20", by: "유미진", text: "후속조치 등록", status: "처리대기" },
          { id: "FU-AD-03-L2", at: "2026-10-16 14:00", by: "유미진", text: "차량업체 확인 요청", status: "처리중" },
        ],
      },
    ],
  },
};

const emptyReview = (): GuideReviewState => ({ checks: {}, needs: {}, confirmedIssues: [], followUps: [], memo: "" });

const cloneFollowUp = (item: GuideFollowUp): GuideFollowUp => ({
  ...item,
  logs: item.logs.map((log) => ({ ...log })),
});

const cloneReview = (state: GuideReviewState): GuideReviewState => ({
  ...state,
  checks: { ...state.checks },
  needs: { ...state.needs },
  confirmedIssues: [...state.confirmedIssues],
  followUps: state.followUps.map(cloneFollowUp),
});

export function getGuideReviewState(key: string): GuideReviewState {
  return cloneReview(sessionReview[key] ?? SAMPLE_REVIEW[key] ?? emptyReview());
}

export function saveGuideReviewState(key: string, state: GuideReviewState) {
  sessionReview[key] = cloneReview(state);
}

export function getGuideReviewPath(key: string) {
  return `/reservations/departures/${encodeURIComponent(key)}/review`;
}

export function countGuideReviewChecks(state: GuideReviewState) {
  return GUIDE_REVIEW_CHECKS.filter((item) => state.checks[item.key]).length;
}

/* ---------------------------------------------------------------- 중요 이슈 · 미처리 */

/** 관리자 검토에서 별도 강조하는 기록: 중요 또는 사고/안전 */
export function isGuideImportantIssue(note: GuideNote) {
  return !note.canceled && (note.importance === "중요" || note.category === "사고/안전");
}

export function getGuideImportantIssues(notes: GuideNote[]) {
  return notes.filter(isGuideImportantIssue);
}

export function getGuideUnconfirmedIssues(notes: GuideNote[], state: GuideReviewState) {
  return getGuideImportantIssues(notes).filter((note) => !state.confirmedIssues.includes(note.id));
}

/** 관리자 검토 특이사항 필터 (중요도 · 처리상태) */
export type GuideReviewNoteFilter = "all" | "일반" | "확인필요" | "중요" | "미처리" | "처리완료";

export const GUIDE_REVIEW_NOTE_FILTERS: { key: GuideReviewNoteFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "일반", label: "일반" },
  { key: "확인필요", label: "확인필요" },
  { key: "중요", label: "중요" },
  { key: "미처리", label: "미처리" },
  { key: "처리완료", label: "처리완료" },
];

export function matchesGuideReviewNoteFilter(note: GuideNote, filter: GuideReviewNoteFilter) {
  if (filter === "all") return true;
  if (filter === "미처리") return isGuideNoteUnresolved(note);
  if (filter === "처리완료") return note.status === "처리완료";
  return note.importance === filter && note.status !== "처리완료";
}

/**
 * 관리자 확인완료 불가 사유
 * - 필수 검토 체크 미완료 · 확인하지 않은 중요 이슈는 차단합니다.
 * - 미처리 후속조치는 차단하지 않고 경고만 합니다. (확인완료 후에도 후속조치는 계속 관리)
 */
export function getGuideReviewBlockers(state: GuideReviewState, notes: GuideNote[]) {
  const blockers: string[] = [];
  const unconfirmed = getGuideUnconfirmedIssues(notes, state).length;
  if (unconfirmed) blockers.push(`확인하지 않은 중요 이슈 ${unconfirmed}건`);
  const checked = countGuideReviewChecks(state);
  if (checked < GUIDE_REVIEW_CHECKS.length) blockers.push(`필수 검토 ${checked} / ${GUIDE_REVIEW_CHECKS.length}`);
  return blockers;
}

/* ---------------------------------------------------------------- 일정 지연 · 변경 */

export type GuideReviewDelay = {
  id: string;
  item: GuideScheduleItem;
  vehicle: GuideVehicle;
  planned: string;
  actual: string;
  delayMinutes: number;
  /** 현장에서 변경한 운영 출발시간 */
  changedTo: string;
  reason: string;
};

/** 지연되었거나 현장에서 출발시간을 바꾼 일정만 모읍니다. 사유는 일정관련 운영기록 · 일정 메모에서 찾습니다. */
export function buildGuideReviewDelays(departure: GuideDeparture, report: GuideClosingReport, notes: GuideNote[]) {
  const scheduleState = getGuideScheduleState(departure.key);
  const rows: GuideReviewDelay[] = [];
  report.schedule.timeline.forEach(({ item, rows: vehicleRows }) => {
    vehicleRows.forEach((row) => {
      const change = report.schedule.changes.find(
        (value) => value.item.id === item.id && value.vehicle.id === row.vehicle.id,
      );
      if (row.delayMinutes <= 0 && !change) return;
      const note = notes.find(
        (value) =>
          !value.canceled &&
          value.category === "일정관련" &&
          value.scheduleItemId === item.id &&
          (value.vehicleId === row.vehicle.id || value.vehicleId === "all"),
      );
      rows.push({
        id: `${row.vehicle.id}-${item.id}`,
        item,
        vehicle: row.vehicle,
        planned: row.planned,
        actual: row.actual,
        delayMinutes: row.delayMinutes,
        changedTo: change?.to ?? "",
        reason:
          note?.detail.delayReason || scheduleState[row.vehicle.id]?.[item.id]?.memo || note?.content || "사유 미입력",
      });
    });
  });
  return rows;
}

/* ---------------------------------------------------------------- 이력 Timeline */

const shortDate = (date: string) => {
  const [, month, day] = date.split("-");
  return month && day ? `${month}/${day}` : date;
};

/** "2026-10-18 10:30" → "10/18 10:30" */
export function formatGuideReviewTime(value: string) {
  const [date, time] = value.split(" ");
  return time ? `${shortDate(date)} ${time}` : value;
}

export type GuideReviewTimelineEntry = {
  id: string;
  at: string;
  by: string;
  label: string;
  text: string;
  source: "guide" | "admin";
  status?: GuideFollowUpStatus;
};

/** 가이드 현장기록(원본) → 관리자 후속조치 이력 순서로 보여줍니다. */
export function buildGuideNoteTimeline(note: GuideNote, departureDate: string, followUps: GuideFollowUp[]) {
  const entries: GuideReviewTimelineEntry[] = [
    {
      id: `${note.id}-origin`,
      at: `${shortDate(departureDate)} ${note.occurredAt}`,
      by: note.createdBy,
      label: "현장기록",
      text: note.title,
      source: "guide",
    },
  ];
  followUps
    .filter((item) => item.noteId === note.id)
    .forEach((item) => {
      item.logs.forEach((log) => {
        entries.push({
          id: log.id,
          at: formatGuideReviewTime(log.at),
          by: log.by,
          label: item.type,
          text: log.text,
          source: "admin",
          ...(log.status ? { status: log.status } : {}),
        });
      });
    });
  return entries;
}

/* ---------------------------------------------------------------- 목록 요약 */

export type GuideReviewOverview = {
  phase: GuideOperationPhase;
  closing: GuideClosingState;
  adminReview: GuideAdminReviewStatus | null;
  followUps: ReturnType<typeof summarizeGuideFollowUps>;
  unresolved: number;
  importantIssues: number;
  unconfirmedIssues: number;
};

/** 출발회차 목록 · 향후 Dashboard · 정산 화면에서 참고할 운영결과 요약 */
export function getGuideReviewOverview(departure: GuideDeparture): GuideReviewOverview {
  const closing = getGuideClosingState(departure.key);
  const review = getGuideReviewState(departure.key);
  const notes = closing.closedAt ? getGuideNotes(departure.key) : [];
  return {
    phase: getGuideOperationPhase(departure, closing),
    closing,
    adminReview: closing.adminReview ?? null,
    followUps: summarizeGuideFollowUps(review.followUps),
    unresolved: notes.filter(isGuideNoteUnresolved).length,
    importantIssues: getGuideImportantIssues(notes).length,
    unconfirmedIssues: getGuideUnconfirmedIssues(notes, review).length,
  };
}

/* ---------------------------------------------------------------- SAMPLE */

const SAMPLE_FINAL_MEMO =
  "장금이파크 집결 지연으로 일정이 지연되었으나 이후 일정은 정상적으로 진행했습니다.\n점심 식사 제공 지연 민원은 현장에서 설명드렸습니다.";
const SAMPLE_ADMIN_NOTE = "- 2호차 에어컨 차량업체 확인 필요\n- 점심 식사 지연 민원 고객 유선 연락 필요";

/**
 * SAMPLE · 테스트용: 가이드 운영 종료 인계가 끝난 상태를 만듭니다.
 * - 탑승 미확인 고객은 첫 1명을 미탑승(연락두절), 나머지를 탑승완료로 기록
 * - 남은 일정 완료 처리, 가이드 메모 · 전달사항 예시 입력 후 운영종료 · 관리자 확인대기
 * 실제 운영에서는 가이드가 7단계 운영결과 보고 화면에서 직접 인계합니다.
 */
export function applyGuideHandoverSample(departure: GuideDeparture) {
  const segmentKey = departure.segments[0]?.key;
  if (segmentKey) {
    let marked = false;
    const groups = departure.reservations.map((group) => ({
      ...group,
      passengers: group.passengers.map((passenger) => {
        if ((passenger.boarding[segmentKey]?.status ?? "unchecked") !== "unchecked") return passenger;
        const status = marked ? ("boarded" as const) : ("no_show" as const);
        const record = status === "no_show" ? { status, reason: "연락두절" as const } : { status };
        marked = true;
        return { ...passenger, boarding: { ...passenger.boarding, [segmentKey]: record } };
      }),
    }));
    saveGuideBoardingSession(departure.key, groups);
  }
  completeGuideScheduleSample(departure);
  const updated = getOperationDeparture(departure.key) ?? departure;
  const report = buildGuideClosingReport(updated);
  const closing = getGuideClosingState(departure.key);
  saveGuideClosingState(departure.key, {
    ...closing,
    prepared: true,
    checks: Object.fromEntries(GUIDE_CLOSING_CHECKS.map((item) => [item.key, true])),
    finalMemo: closing.finalMemo || SAMPLE_FINAL_MEMO,
    adminNote: closing.adminNote || SAMPLE_ADMIN_NOTE,
    closedAt: closing.closedAt ?? `${departure.departureDate} 18:20`,
    closedBy: closing.closedBy ?? getGuideLeadStaff(updated)?.name ?? departure.guideName,
    adminReview: closing.adminReview ?? "관리자 확인대기",
    snapshot: closing.snapshot ?? buildGuideClosingSnapshot(report),
  });
}
