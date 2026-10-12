/**
 * 가이드 운영 > 운영메모 · 특이사항 샘플 데이터 (SAMPLE)
 * - 출발일부터 종료까지 현장에서 발생한 내용을 내부 운영기록으로 남깁니다.
 * - 운영기록은 고객 안내(고객소통)와 별개이며, 기록을 저장해도 고객에게 메시지를 보내지 않습니다.
 * - 첨부자료는 파일명만 보관하며 실제 업로드는 하지 않습니다.
 * - 기록은 새로고침 시 초기화되는 프론트 Mock 저장소에 보관합니다.
 */
import { getGuideOperationPath } from "@/lib/admin/guide-operation-data";

export const GUIDE_NOTE_CATEGORIES = [
  "일반메모",
  "고객관련",
  "일정관련",
  "분실물",
  "차량",
  "식당/관광지",
  "민원",
  "사고/안전",
  "기타",
] as const;
export type GuideNoteCategory = (typeof GUIDE_NOTE_CATEGORIES)[number];

export const GUIDE_NOTE_IMPORTANCES = ["일반", "확인필요", "중요"] as const;
export type GuideNoteImportance = (typeof GUIDE_NOTE_IMPORTANCES)[number];

export const GUIDE_NOTE_IMPORTANCE_META: Record<GuideNoteImportance, { badge: string; description: string }> = {
  일반: { badge: "gray", description: "단순 운영기록" },
  확인필요: { badge: "warn", description: "여행 종료 후 관리자 확인 필요" },
  중요: { badge: "danger", description: "즉시 또는 우선 확인이 필요한 사항" },
};

export const GUIDE_NOTE_STATUSES = ["기록", "확인대기", "확인완료", "처리중", "처리완료"] as const;
export type GuideNoteStatus = (typeof GUIDE_NOTE_STATUSES)[number];

export const GUIDE_NOTE_STATUS_BADGE: Record<GuideNoteStatus, string> = {
  기록: "gray",
  확인대기: "warn",
  확인완료: "info",
  처리중: "info",
  처리완료: "success",
};

export const GUIDE_VEHICLE_ISSUE_TYPES = ["차량고장", "냉난방", "좌석", "운행지연", "기사관련", "기타"] as const;
export const GUIDE_LOST_ITEM_STATES = ["보관중", "고객확인", "전달완료", "미처리"] as const;
export const GUIDE_NOTE_ACTION_PRESETS = ["고객 연락", "현장 대기", "미탑승 처리", "고객 설명", "관리자 보고"] as const;

/** 관련 호차 전체 */
export const GUIDE_NOTE_ALL_VEHICLES = "all";

/** 구분별 추가 입력값. 해당 구분에서만 사용합니다. */
export type GuideNoteDetail = {
  /** 차량 문제 유형 */
  vehicleIssue?: (typeof GUIDE_VEHICLE_ISSUE_TYPES)[number];
  lostItem?: string;
  lostFoundAt?: string;
  lostKeeper?: string;
  lostState?: (typeof GUIDE_LOST_ITEM_STATES)[number];
  /** 사고/안전 발생장소 */
  place?: string;
  /** 현장 조치 (고객관련 · 민원 · 사고/안전) */
  action?: string;
  /** 사고/안전 추가 확인사항 */
  followUp?: string;
  /** 일정 지연 기록 */
  plannedTime?: string;
  changedTime?: string;
  delayReason?: string;
};

export type GuideNote = {
  id: string;
  category: GuideNoteCategory;
  importance: GuideNoteImportance;
  title: string;
  content: string;
  /** 5단계 일정 · 현장 운영의 일정 id */
  scheduleItemId: string;
  /** 관련 고객(탑승객) id. 예약/고객 상세의 "현장 특이사항"으로 확장할 수 있습니다. */
  passengerIds: string[];
  /** 관련 호차 id 또는 all */
  vehicleId: string;
  /** 현장에서 발생한 시각 (작성시각과 별도) */
  occurredAt: string;
  needsAdmin: boolean;
  status: GuideNoteStatus;
  attachments: string[];
  detail: GuideNoteDetail;
  /** 최초작성 · 수정 정보. 실제 수정 이력 저장은 향후 서버 연동 시 구현합니다. */
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  /** 삭제 대신 기록 취소로 남긴 기록 */
  canceled?: boolean;
};

const SAMPLE_NOTES: Record<string, GuideNote[]> = {
  "GC-WINE-20261017": [
    {
      id: "NOTE-01",
      category: "고객관련",
      importance: "일반",
      title: "앞좌석 요청 반영",
      content: "김민준 고객 앞좌석 요청으로 1호차 앞좌석 배정 확인.\n휠체어는 트렁크에 보관.",
      scheduleItemId: "S-01",
      passengerIds: ["P-05"],
      vehicleId: "V-1",
      occurredAt: "07:05",
      needsAdmin: false,
      status: "기록",
      attachments: [],
      detail: {},
      createdAt: "07:12",
      createdBy: "장윤호",
    },
    {
      id: "NOTE-02",
      category: "고객관련",
      importance: "일반",
      title: "영등포 탑승 고객 5분 늦게 탑승",
      content: "영등포역 탑승 고객 1명 5분 늦게 도착. 연락 후 대기하여 탑승 완료.",
      scheduleItemId: "S-02",
      passengerIds: ["P-20"],
      vehicleId: "V-1",
      occurredAt: "07:30",
      needsAdmin: false,
      status: "기록",
      attachments: [],
      detail: { action: "고객 연락, 현장 대기" },
      createdAt: "07:40",
      createdBy: "장윤호",
    },
    {
      id: "NOTE-03",
      category: "기타",
      importance: "일반",
      title: "정안 휴게소 15분 정차",
      content: "화장실 이용 위해 정안 휴게소 15분 정차 후 출발.",
      scheduleItemId: "",
      passengerIds: [],
      vehicleId: "V-1",
      occurredAt: "09:40",
      needsAdmin: false,
      status: "기록",
      attachments: [],
      detail: {},
      createdAt: "09:58",
      createdBy: "장윤호",
    },
    {
      id: "NOTE-04",
      category: "차량",
      importance: "확인필요",
      title: "2호차 에어컨 바람 약함",
      content: "후방 좌석 에어컨 바람이 약하다는 고객 의견. 기사님 확인 결과 필터 점검 필요.",
      scheduleItemId: "",
      passengerIds: [],
      vehicleId: "V-2",
      occurredAt: "10:20",
      needsAdmin: true,
      status: "확인대기",
      attachments: ["vehicle_issue_01.jpg"],
      detail: { vehicleIssue: "냉난방" },
      createdAt: "10:31",
      createdBy: "홍길동",
    },
    {
      id: "NOTE-05",
      category: "분실물",
      importance: "일반",
      title: "휴대폰 충전기 분실 신고",
      content: "오하린 고객 충전기 분실 신고. 2호차 좌석 하단에서 발견하여 전달.",
      scheduleItemId: "S-02",
      passengerIds: ["P-13"],
      vehicleId: "V-2",
      occurredAt: "11:10",
      needsAdmin: false,
      status: "처리완료",
      attachments: ["lost_item.jpg"],
      detail: {
        lostItem: "흰색 휴대폰 충전기",
        lostFoundAt: "2호차 18번 좌석 하단",
        lostKeeper: "홍길동 가이드",
        lostState: "전달완료",
      },
      createdAt: "11:15",
      createdBy: "홍길동",
      updatedAt: "11:40",
      updatedBy: "홍길동",
    },
    {
      id: "NOTE-06",
      category: "식당/관광지",
      importance: "일반",
      title: "장금이파크 한방차 제공 완료",
      content: "장금이파크 도착 후 전원 한방차 제공 완료.",
      scheduleItemId: "S-03",
      passengerIds: [],
      vehicleId: "V-2",
      occurredAt: "13:05",
      needsAdmin: false,
      status: "기록",
      attachments: [],
      detail: {},
      createdAt: "13:08",
      createdBy: "홍길동",
    },
    {
      id: "NOTE-07",
      category: "민원",
      importance: "중요",
      title: "점심 식사 제공시간 지연 민원",
      content: "식사 제공시간 지연",
      scheduleItemId: "S-03",
      passengerIds: ["P-11", "P-12"],
      vehicleId: "V-2",
      occurredAt: "12:40",
      needsAdmin: true,
      status: "처리중",
      attachments: [],
      detail: { action: "식당 확인 후 고객에게 상황 설명" },
      createdAt: "12:52",
      createdBy: "홍길동",
    },
    {
      id: "NOTE-08",
      category: "일정관련",
      importance: "확인필요",
      title: "장금이파크 출발 10분 지연",
      content: "고객 1명 차량 대기 지연으로 기존 13:30 출발에서 13:40 출발로 변경함.",
      scheduleItemId: "S-03",
      passengerIds: [],
      vehicleId: "V-2",
      occurredAt: "13:30",
      needsAdmin: true,
      status: "확인대기",
      attachments: [],
      detail: { plannedTime: "13:30", changedTime: "13:40", delayReason: "고객 1명 차량 대기" },
      createdAt: "13:36",
      createdBy: "홍길동",
    },
  ],
  /* 운영현황 통합관리 SAMPLE */
  "OPS-JEONJU-20261016": [
    {
      id: "JN-01",
      category: "차량",
      importance: "확인필요",
      title: "1호차 에어컨 작동불량",
      content: "오후 이동 중 1호차 에어컨 작동이 약해짐. 기사님 임시 조치 후 운행. 차량업체 점검 필요.",
      scheduleItemId: "",
      passengerIds: [],
      vehicleId: "V-1",
      occurredAt: "14:20",
      needsAdmin: true,
      status: "확인대기",
      attachments: [],
      detail: { vehicleIssue: "냉난방" },
      createdAt: "14:32",
      createdBy: "이수민",
    },
    {
      id: "JN-02",
      category: "분실물",
      importance: "일반",
      title: "검정색 지갑 습득",
      content: "남부시장 출발 후 1호차 좌석에서 검정색 지갑 습득. 사무실 보관 예정.",
      scheduleItemId: "",
      passengerIds: [],
      vehicleId: "V-1",
      occurredAt: "16:05",
      needsAdmin: false,
      status: "기록",
      attachments: [],
      detail: {
        lostItem: "검정색 지갑",
        lostFoundAt: "1호차 9번 좌석",
        lostKeeper: "이수민 가이드",
        lostState: "보관중",
      },
      createdAt: "16:10",
      createdBy: "이수민",
    },
    {
      id: "JN-03",
      category: "고객관련",
      importance: "일반",
      title: "이준서 고객 연락두절 · 미탑승",
      content: "출발시간까지 미도착, 3회 연락 시도 후 미탑승 처리.",
      scheduleItemId: "",
      passengerIds: ["JU-B-01"],
      vehicleId: "V-1",
      occurredAt: "07:35",
      needsAdmin: false,
      status: "기록",
      attachments: [],
      detail: { action: "고객 연락, 미탑승 처리" },
      createdAt: "07:40",
      createdBy: "이수민",
    },
  ],
  "OPS-ANDONG-20261015": [
    {
      id: "AN-01",
      category: "사고/안전",
      importance: "중요",
      title: "하회마을 고객 넘어짐 (경상)",
      content: "하회마을 관람 중 황시온 고객 돌길에서 넘어짐. 무릎 찰과상으로 응급처치 후 일정 계속 진행.",
      scheduleItemId: "",
      passengerIds: ["AD-C-02"],
      vehicleId: "V-1",
      occurredAt: "11:20",
      needsAdmin: true,
      status: "처리완료",
      attachments: [],
      detail: { place: "하회마을 북촌길", action: "응급처치 후 귀가 확인", followUp: "보험 접수 여부 확인" },
      createdAt: "11:35",
      createdBy: "홍길동",
      updatedAt: "18:00",
      updatedBy: "홍길동",
    },
    {
      id: "AN-02",
      category: "민원",
      importance: "확인필요",
      title: "월영교 관람시간 부족 민원",
      content: "월영교 관람시간이 짧았다는 고객 의견 2건.",
      scheduleItemId: "",
      passengerIds: ["AD-A-01"],
      vehicleId: "V-1",
      occurredAt: "15:40",
      needsAdmin: true,
      status: "확인대기",
      attachments: [],
      detail: { action: "고객 설명" },
      createdAt: "15:50",
      createdBy: "홍길동",
    },
    {
      id: "AN-03",
      category: "분실물",
      importance: "일반",
      title: "검정색 우산 분실",
      content: "임나연 고객 우산 분실 신고. 차량 내 미발견.",
      scheduleItemId: "",
      passengerIds: ["AD-B-01"],
      vehicleId: "V-1",
      occurredAt: "17:10",
      needsAdmin: false,
      status: "기록",
      attachments: [],
      detail: { lostItem: "검정색 장우산", lostState: "미처리" },
      createdAt: "17:15",
      createdBy: "홍길동",
    },
  ],
};

const sessionNotes: Record<string, GuideNote[]> = {};

const cloneNote = (note: GuideNote): GuideNote => ({
  ...note,
  passengerIds: [...note.passengerIds],
  attachments: [...note.attachments],
  detail: { ...note.detail },
});

export function getGuideNotes(key: string) {
  return (sessionNotes[key] ?? SAMPLE_NOTES[key] ?? []).map(cloneNote);
}

export function saveGuideNotes(key: string, notes: GuideNote[]) {
  sessionNotes[key] = notes.map(cloneNote);
}

let noteSeq = 0;

export function createGuideNoteId() {
  noteSeq += 1;
  return `NOTE-${Date.now().toString(36)}-${noteSeq}`;
}

/** 작성시각 (실제 서버시간 저장 전 · 화면 표시용) */
export function formatGuideNoteNow() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function getGuideNotesPath(key: string, params: Record<string, string> = {}) {
  const base = `${getGuideOperationPath(key)}/notes`;
  const query = new URLSearchParams(params).toString();
  return query ? `${base}?${query}` : base;
}

/** 관리자 확인 필요 체크 시 확인대기, 아니면 기록 상태로 시작합니다. */
export function getGuideNoteInitialStatus(needsAdmin: boolean): GuideNoteStatus {
  return needsAdmin ? "확인대기" : "기록";
}

/** 단순 삭제 대신 기록 취소로 남겨야 하는 기록 */
export function isGuideNoteProtected(note: Pick<GuideNote, "importance" | "category">) {
  return note.importance !== "일반" || note.category === "사고/안전";
}

/* ---------------------------------------------------------------- 현황 */

/** KPI · 필터 키. 처리완료를 제외한 기록은 중요도로, 처리완료는 상태로 구분합니다. */
export type GuideNoteFilter = "all" | GuideNoteImportance | "처리중" | "처리완료";

export const GUIDE_NOTE_FILTERS: { key: GuideNoteFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "일반", label: "일반" },
  { key: "확인필요", label: "확인필요" },
  { key: "중요", label: "중요" },
  { key: "처리중", label: "처리중" },
  { key: "처리완료", label: "처리완료" },
];

export function matchesGuideNoteFilter(note: GuideNote, filter: GuideNoteFilter) {
  if (filter === "all") return true;
  if (filter === "처리완료" || filter === "처리중") return note.status === filter;
  return note.importance === filter && note.status !== "처리완료";
}

export function isGuideNoteOpenImportant(note: GuideNote) {
  return note.importance === "중요" && note.status !== "처리완료" && !note.canceled;
}

export function summarizeGuideNotes(notes: GuideNote[]) {
  const active = notes.filter((note) => !note.canceled);
  const count = (filter: GuideNoteFilter) => active.filter((note) => matchesGuideNoteFilter(note, filter)).length;
  return {
    total: active.length,
    normal: count("일반"),
    check: count("확인필요"),
    important: count("중요"),
    inProgress: count("처리중"),
    done: count("처리완료"),
    awaiting: active.filter((note) => note.status === "확인대기").length,
    canceled: notes.length - active.length,
  };
}

/** 여행 종료 후 운영결과 요약에 사용할 구분별 건수 (종료보고서는 이번 단계에서 구현하지 않음) */
export function summarizeGuideNotesByCategory(notes: GuideNote[]) {
  const active = notes.filter((note) => !note.canceled);
  return GUIDE_NOTE_CATEGORIES.map((category) => ({
    category,
    count: active.filter((note) => note.category === category).length,
  }));
}

/**
 * 처리가 끝나지 않은 기록 (운영 종료 시 관리자에게 미처리로 인계)
 * - 처리완료 · 기록 취소는 제외
 * - 일반 · 기록 상태의 단순 메모는 제외. 단, 보관 중인 분실물은 미처리로 봅니다.
 */
export function isGuideNoteUnresolved(note: GuideNote) {
  if (note.canceled || note.status === "처리완료") return false;
  if (note.status !== "기록" || note.importance !== "일반") return true;
  return note.category === "분실물" && note.detail.lostState !== "전달완료";
}

/** 예약/고객 상세의 "현장 특이사항"으로 확장할 때 사용할 조회 */
export function getGuideNotesForPassengers(key: string, passengerIds: string[]) {
  return getGuideNotes(key).filter(
    (note) => !note.canceled && note.passengerIds.some((id) => passengerIds.includes(id)),
  );
}

/** 일정 · 현장 운영 화면의 일정별 기록 수 */
export function countGuideNotesBySchedule(key: string, vehicleId: string) {
  const counts: Record<string, number> = {};
  getGuideNotes(key)
    .filter((note) => !note.canceled && (note.vehicleId === vehicleId || note.vehicleId === GUIDE_NOTE_ALL_VEHICLES))
    .forEach((note) => {
      if (note.scheduleItemId) counts[note.scheduleItemId] = (counts[note.scheduleItemId] ?? 0) + 1;
    });
  return counts;
}

/* ---------------------------------------------------------------- 빠른 기록 템플릿 */

export type GuideNoteTemplateKey =
  "delay" | "no-show" | "lost" | "vehicle" | "request" | "complaint" | "accident" | "memo";

export const GUIDE_NOTE_TEMPLATES: {
  key: GuideNoteTemplateKey;
  label: string;
  category: GuideNoteCategory;
  importance: GuideNoteImportance;
  title: string;
  /** 모바일 상단 빠른 기록에 노출 */
  mobile?: boolean;
}[] = [
  { key: "delay", label: "일정 지연", category: "일정관련", importance: "확인필요", title: "", mobile: true },
  {
    key: "no-show",
    label: "고객 미집결",
    category: "고객관련",
    importance: "일반",
    title: "고객 미집결",
    mobile: true,
  },
  { key: "lost", label: "분실물", category: "분실물", importance: "일반", title: "", mobile: true },
  { key: "vehicle", label: "차량 문제", category: "차량", importance: "확인필요", title: "", mobile: true },
  { key: "request", label: "고객 요청", category: "고객관련", importance: "일반", title: "고객 요청" },
  { key: "complaint", label: "민원", category: "민원", importance: "확인필요", title: "" },
  { key: "accident", label: "사고/안전", category: "사고/안전", importance: "중요", title: "" },
];

export function findGuideNoteTemplate(key: string) {
  return GUIDE_NOTE_TEMPLATES.find((item) => item.key === key) ?? null;
}

/** 구분 선택 시 기본 중요도. 사고/안전은 중요가 기본값입니다. */
export function getGuideNoteDefaultImportance(category: GuideNoteCategory): GuideNoteImportance {
  return category === "사고/안전" ? "중요" : "일반";
}
