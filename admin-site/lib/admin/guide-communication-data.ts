/**
 * 가이드 운영 > 고객소통 샘플 데이터 (SAMPLE)
 * - 호차·탑승지·담당가이드·고객 정보는 운영배정과 같은 출발상품 데이터(GuideDeparture)를 사용합니다.
 * - 동행자 개별 연락처·발송이력·발송결과는 더미 값이며, 실제 알림톡/SMS/LMS 발송은 연동하지 않습니다.
 * - 발송이력은 새로고침 시 초기화되는 프론트 Mock 저장소에 보관합니다.
 */
import {
  SAMPLE_GUIDE_DEPARTURE_KEY,
  formatGuideDepartureDate,
  getGuideDeparture,
  getGuideLeadStaff,
  getGuideOperationPath,
  getGuidePassengerPoint,
  getGuidePassengerVehicle,
  getGuideStaff,
  type GuideDeparture,
  type GuidePassenger,
  type GuideReservationGroup,
  type GuideVehicle,
} from "@/lib/admin/guide-operation-data";

export function getGuideCommunicationPath(key: string, templateKey?: string, params: Record<string, string> = {}) {
  const base = `${getGuideOperationPath(key)}/communication`;
  const query = new URLSearchParams({ ...params, ...(templateKey ? { template: templateKey } : {}) }).toString();
  return query ? `${base}?${query}` : base;
}

/** 카카오 안내방 참여 안내 템플릿 key */
export const GUIDE_CHAT_TEMPLATE_KEY = "chat-invite";

/** 안내방 id. 전체 안내방은 "all", 호차별 안내방은 호차 id를 범위(scope)로 사용합니다. */
export function getGuideChatRoomId(scope: string) {
  return `ROOM-${scope}`;
}

/** 동행자 개별 연락처 (SAMPLE). 대표예약자와 같은 번호를 등록한 경우도 포함합니다. */
const SAMPLE_COMPANION_PHONES: Record<string, string> = {
  "P-02": "010-0000-5612",
  "P-03": "010-0000-3481",
  "P-06": "010-0000-6620",
  "P-09": "010-0000-2207",
  "P-12": "010-0000-7420",
  "P-20": "010-0000-5679",
  "P-22": "010-0000-8843",
};

/** 대표 연락처로 안내할 수 없는 예약 (SAMPLE) */
const SAMPLE_UNREACHABLE_GROUPS: Record<string, string> = {
  "GR-03": "결번 · 연락처 확인필요",
};

/** 더미 발송결과: 알림톡·SMS 모두 실패하는 번호 */
const SAMPLE_FAIL_PHONES = ["010-0000-5678", "010-0000-1968"];
/** 더미 발송결과: 알림톡 실패 → SMS/LMS 대체발송 시 성공하는 번호 */
const SAMPLE_ALIMTALK_FAIL_PHONES = ["010-0000-4420", "010-0000-6620"];

export type GuideMessageChannel = "알림톡" | "SMS/LMS";

export type GuideCommRow = {
  passenger: GuidePassenger;
  group: GuideReservationGroup;
  isLeader: boolean;
  vehicle: GuideVehicle | null;
  /** 운영배정에서 지정된 탑승지 (빈 문자열은 미지정) */
  point: string;
  /** 본인 연락처. 대표예약자는 예약 연락처, 동행자는 개별 등록 연락처 */
  ownPhone: string;
  /** 대표 연락처로 안내할 수 없는 사유 */
  contactIssue: string;
};

export function getGuideCommRows(departure: GuideDeparture): GuideCommRow[] {
  return departure.reservations.flatMap((group) => {
    const contactIssue = SAMPLE_UNREACHABLE_GROUPS[group.id] ?? (group.phone ? "" : "연락처 미등록");
    return group.passengers.map((passenger, index) => ({
      passenger,
      group,
      isLeader: index === 0,
      vehicle: getGuidePassengerVehicle(departure, passenger),
      point: getGuidePassengerPoint(passenger),
      ownPhone: index === 0 ? group.phone : (SAMPLE_COMPANION_PHONES[passenger.id] ?? ""),
      contactIssue,
    }));
  });
}

/**
 * 실제 발송 연락처 결정
 * - 기본: 대표 연락처 (동행자도 대표예약자 번호로 함께 안내)
 * - 동행자 개별 연락처 포함: 개별 연락처가 있는 동행자는 본인 번호로 안내
 */
export function resolveGuideContact(row: GuideCommRow, includeCompanion: boolean) {
  if (!row.isLeader && includeCompanion && row.ownPhone) {
    return { phone: row.ownPhone, ownerName: row.passenger.name, viaLeader: false };
  }
  if (row.contactIssue) return null;
  return { phone: row.group.phone, ownerName: row.group.passengers[0]?.name ?? "", viaLeader: !row.isLeader };
}

/** 같은 전화번호로 묶인 실제 발송 단위. 동일 번호에는 한 번만 발송합니다. */
export type GuideContactTarget = {
  phone: string;
  ownerName: string;
  rows: GuideCommRow[];
};

export function buildGuideContactTargets(rows: GuideCommRow[], includeCompanion: boolean) {
  const targets: GuideContactTarget[] = [];
  const noContact: GuideCommRow[] = [];
  rows.forEach((row) => {
    const contact = resolveGuideContact(row, includeCompanion);
    if (!contact) {
      noContact.push(row);
      return;
    }
    const found = targets.find((item) => item.phone === contact.phone);
    if (found) found.rows.push(row);
    else targets.push({ phone: contact.phone, ownerName: contact.ownerName, rows: [row] });
  });
  const reachable = rows.length - noContact.length;
  return {
    targets,
    noContact,
    selectedCount: rows.length,
    /** 같은 번호로 함께 안내되어 발송건수에서 제외된 인원 */
    duplicateCount: reachable - targets.length,
  };
}

const uniqueJoin = (values: string[], empty: string) =>
  Array.from(new Set(values.filter(Boolean))).join(" · ") || empty;

export function getGuideTargetPoints(target: GuideContactTarget) {
  return uniqueJoin(
    target.rows.map((row) => row.point),
    "미지정",
  );
}

export function getGuideTargetVehicles(target: GuideContactTarget) {
  return uniqueJoin(
    target.rows.map((row) => row.vehicle?.name ?? ""),
    "미배정",
  );
}

/* ---------------------------------------------------------------- 템플릿 */

export const GUIDE_MESSAGE_VARIABLES = [
  "{고객명}",
  "{상품명}",
  "{출발일}",
  "{탑승지}",
  "{호차}",
  "{가이드명}",
  "{가이드연락처}",
  "{안내방링크}",
] as const;

export type GuideCommTemplate = {
  key: string;
  label: string;
  description: string;
  /** 빠른 현장공지 버튼명 */
  quickLabel?: string;
  urgent?: boolean;
  /** 알림톡 버튼명. 실제 버튼은 연동하지 않고 미리보기로만 표시합니다. */
  button?: string;
  body: string;
};

/** 빈칸이 남아 있으면 발송 전에 안내합니다. */
export const GUIDE_MESSAGE_PLACEHOLDERS = ["__:__", "(내용 입력)", "(위치 입력)"];

export const GUIDE_COMM_TEMPLATES: GuideCommTemplate[] = [
  {
    key: "day-before",
    label: "출발 전날 안내",
    description: "탑승지·호차·담당가이드",
    body: "안녕하세요. {고객명} 고객님.\n{상품명} 담당 가이드 {가이드명}입니다.\n\n내일 여행 관련 안내드립니다.\n\n상품: {상품명}\n출발일: {출발일}\n탑승지: {탑승지}\n호차: {호차}\n담당가이드: {가이드명} ({가이드연락처})\n\n즐거운 여행이 될 수 있도록 최선을 다하겠습니다.\n감사합니다.",
  },
  {
    key: "meeting",
    label: "당일 집결 안내",
    description: "집결 장소·시간",
    quickLabel: "집결 안내",
    body: "안녕하세요. {고객명} 고객님.\n오늘 {상품명} 집결 안내드립니다.\n\n탑승지: {탑승지}\n호차: {호차}\n\n도착하시면 담당 가이드 {가이드명}에게 예약자 성함을 말씀해 주세요.\n문의: {가이드연락처}",
  },
  {
    key: "boarding",
    label: "탑승 안내",
    description: "차량 탑승 시작",
    body: "{고객명} 고객님, {호차} 탑승을 시작합니다.\n{탑승지}에서 {호차} 차량에 탑승해 주세요.\n담당 가이드: {가이드명} ({가이드연락처})",
  },
  {
    key: "bus",
    label: "버스 위치 안내",
    description: "탑승 차량 위치",
    quickLabel: "버스 위치",
    body: "{고객명} 고객님, {호차} 차량 위치 안내드립니다.\n위치: (위치 입력)\n차량 앞 안내판({상품명})을 확인해 주세요.\n문의: {가이드명} {가이드연락처}",
  },
  {
    key: "free-time",
    label: "자유시간 안내",
    description: "자유시간·재집결",
    quickLabel: "자유시간",
    body: "{고객명} 고객님, 지금부터 자유시간입니다.\n재집결 시간: __:__\n재집결 장소: {호차} 차량 앞\n시간을 꼭 지켜 주세요.",
  },
  {
    key: "time-change",
    label: "출발시간 변경",
    description: "변경된 출발시간",
    quickLabel: "출발시간 변경",
    body: "[{상품명}] 출발시간 변경 안내\n{고객명} 고객님, 현지 사정으로 출발시간이 변경되었습니다.\n변경 시간: __:__\n탑승지: {탑승지} / {호차}\n이용에 불편을 드려 죄송합니다.",
  },
  {
    key: "arrival",
    label: "도착 안내",
    description: "관광지 도착·집결장소",
    body: "{고객명} 고객님, (내용 입력)에 도착했습니다.\n집결시간: __:__\n집결장소: {호차} 차량 앞\n하차 시 소지품을 꼭 확인해 주세요.",
  },
  {
    key: "departure-notice",
    label: "출발시간 안내",
    description: "다음 일정 출발시간",
    body: "{고객명} 고객님, 다음 일정 출발시간 안내드립니다.\n출발시간: __:__\n집결장소: {호차} 차량 앞\n늦지 않게 탑승 부탁드립니다.",
  },
  {
    key: "schedule-change",
    label: "일정 변경",
    description: "현장 일정 변경 공지",
    body: "[{상품명}] 일정 변경 안내\n{고객명} 고객님, 현지 사정으로 일정이 변경되었습니다.\n(내용 입력)\n이용에 불편을 드려 죄송합니다.",
  },
  {
    key: "emergency",
    label: "긴급공지",
    description: "긴급 상황 안내",
    quickLabel: "긴급공지",
    urgent: true,
    body: "[긴급] {상품명}\n{고객명} 고객님, 긴급 안내드립니다.\n(내용 입력)\n문의: 담당 가이드 {가이드명} {가이드연락처}",
  },
  {
    key: GUIDE_CHAT_TEMPLATE_KEY,
    label: "카카오 안내방 참여",
    description: "오픈채팅 안내방 링크",
    button: "여행 안내방 참여하기",
    body: "안녕하세요. {고객명} 고객님.\n\n{출발일}\n{상품명} 여행을 담당하는\n{가이드명} 가이드입니다.\n\n여행 중 일정 및 현장 안내를 위해\n카카오톡 안내방을 운영합니다.\n\n아래 버튼 또는 링크를 통해\n안내방에 참여해주세요.\n\n[여행 안내방 참여하기]\n{안내방링크}\n\n감사합니다.",
  },
  {
    key: "custom",
    label: "직접작성",
    description: "메시지 직접 입력",
    body: "",
  },
];

export function findGuideCommTemplate(key: string) {
  return GUIDE_COMM_TEMPLATES.find((item) => item.key === key) ?? null;
}

/** 실제 템플릿 엔진 연동 전 미리보기용 변수 치환 */
export function buildGuideMessageVariables(departure: GuideDeparture, target: GuideContactTarget, chatLink = "") {
  const vehicle = target.rows.find((row) => row.vehicle)?.vehicle ?? null;
  const guide = (vehicle && getGuideStaff(departure, vehicle.guideId)) || getGuideLeadStaff(departure);
  return {
    "{고객명}": target.ownerName,
    "{상품명}": departure.productName,
    "{출발일}": formatGuideDepartureDate(departure.departureDate),
    "{탑승지}": getGuideTargetPoints(target),
    "{호차}": getGuideTargetVehicles(target),
    "{가이드명}": guide?.name ?? departure.guideName,
    "{가이드연락처}": guide?.phone ?? "-",
    "{안내방링크}": chatLink || "(안내방 링크 미등록)",
  } as Record<(typeof GUIDE_MESSAGE_VARIABLES)[number], string>;
}

export function renderGuideMessage(body: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce((text, [key, value]) => text.split(key).join(value), body);
}

/**
 * 다른 가이드 운영 화면(일정 · 현장 운영 등)에서 작성해 넘기는 안내문.
 * 고객소통 화면은 preset 쿼리로 받아 해당 템플릿과 내용을 채웁니다. (새로고침 시 초기화)
 */
export type GuideCommPreset = {
  templateKey: string;
  body: string;
  /** 안내문을 작성한 화면 · 일정 (예: 일정 · 현장 운영 · 장금이파크) */
  source: string;
  returnLabel: string;
  returnPath: string;
  /** 기본 선택할 고객. 없으면 현재 호차(대상 범위) 고객 전체를 선택합니다. */
  passengerIds?: string[];
};

const sessionPresets: Record<string, GuideCommPreset> = {};

export function saveGuideCommPreset(key: string, presetId: string, preset: GuideCommPreset) {
  sessionPresets[`${key}|${presetId}`] = { ...preset };
}

export function getGuideCommPreset(key: string, presetId: string) {
  const preset = sessionPresets[`${key}|${presetId}`];
  return preset ? { ...preset, ...(preset.passengerIds ? { passengerIds: [...preset.passengerIds] } : {}) } : null;
}

/* ---------------------------------------------------------------- 발송이력 */

export type GuideMessageResult = {
  phone: string;
  ownerName: string;
  passengerIds: string[];
  status: "success" | "failed";
  channel: GuideMessageChannel;
  /** 카카오 안내방 참여 안내인 경우 안내한 안내방 id */
  chatRoomId?: string;
};

export type GuideMessageBatch = {
  id: string;
  sentAt: string;
  templateKey: string;
  templateLabel: string;
  targetLabel: string;
  vehicleLabel: string;
  pointLabel: string;
  fallback: boolean;
  sender: string;
  results: GuideMessageResult[];
  /** 실패건 재발송인 경우 원 발송 id */
  retryOf?: string;
};

const sessionBatches: Record<string, GuideMessageBatch[]> = {};
let batchSeq = 0;

export function createGuideMessageBatchId() {
  batchSeq += 1;
  return `MSG-${Date.now().toString(36)}-${batchSeq}`;
}

const cloneBatches = (batches: GuideMessageBatch[]) =>
  batches.map((batch) => ({
    ...batch,
    results: batch.results.map((result) => ({ ...result, passengerIds: [...result.passengerIds] })),
  }));

function buildSeedBatches(key: string): GuideMessageBatch[] {
  if (key !== SAMPLE_GUIDE_DEPARTURE_KEY) return [];
  const departure = getGuideDeparture(key);
  if (!departure) return [];
  const result = (
    groupId: string,
    channel: GuideMessageChannel = "알림톡",
    chatRoomId?: string,
  ): GuideMessageResult[] => {
    const group = departure.reservations.find((item) => item.id === groupId);
    if (!group) return [];
    return [
      {
        phone: group.phone,
        ownerName: group.passengers[0]?.name ?? "",
        passengerIds: group.passengers.map((item) => item.id),
        status: "success",
        channel,
        ...(chatRoomId ? { chatRoomId } : {}),
      },
    ];
  };
  const chatRoomV1 = getGuideChatRoomId("V-1");
  return [
    {
      id: "MSG-SEED-03",
      sentAt: "2026-10-17 07:10",
      templateKey: "meeting",
      templateLabel: "당일 집결 안내",
      targetLabel: "1호차 · 서울역",
      vehicleLabel: "1호차",
      pointLabel: "서울역",
      fallback: true,
      sender: "장윤호",
      results: [...result("GR-01", "SMS/LMS"), ...result("GR-02")],
    },
    {
      id: "MSG-SEED-CHAT",
      sentAt: "2026-10-16 18:20",
      templateKey: GUIDE_CHAT_TEMPLATE_KEY,
      templateLabel: "카카오 안내방 참여",
      targetLabel: "1호차 · 전체",
      vehicleLabel: "1호차",
      pointLabel: "전체",
      fallback: true,
      sender: "장윤호",
      // GR-06은 1호차 배정 상태에서 안내받은 뒤 2호차로 변경된 더미 상태입니다. (안내방 재안내 필요 예시)
      results: [
        ...result("GR-01", "알림톡", chatRoomV1),
        ...result("GR-02", "알림톡", chatRoomV1),
        ...result("GR-04", "알림톡", chatRoomV1),
        ...result("GR-08", "알림톡", chatRoomV1),
        ...result("GR-11", "알림톡", chatRoomV1),
        ...result("GR-06", "알림톡", chatRoomV1),
      ],
    },
    {
      id: "MSG-SEED-02",
      sentAt: "2026-10-16 18:10",
      templateKey: "day-before",
      templateLabel: "출발 전날 안내",
      targetLabel: "2호차 · 전체",
      vehicleLabel: "2호차",
      pointLabel: "전체",
      fallback: true,
      sender: "홍길동",
      results: [
        ...result("GR-05"),
        ...result("GR-06", "SMS/LMS"),
        ...result("GR-07"),
        ...result("GR-09"),
        ...result("GR-10"),
      ],
    },
    {
      id: "MSG-SEED-01",
      sentAt: "2026-10-16 18:03",
      templateKey: "day-before",
      templateLabel: "출발 전날 안내",
      targetLabel: "1호차 · 전체",
      vehicleLabel: "1호차",
      pointLabel: "전체",
      fallback: true,
      sender: "장윤호",
      results: [...result("GR-01"), ...result("GR-02"), ...result("GR-04"), ...result("GR-08")],
    },
  ];
}

/** 최신순 발송이력 */
export function getGuideMessageBatches(key: string) {
  return cloneBatches(sessionBatches[key] ?? buildSeedBatches(key));
}

export function saveGuideMessageBatches(key: string, batches: GuideMessageBatch[]) {
  sessionBatches[key] = cloneBatches(batches);
}

export type GuideContactHistoryItem = {
  batchId: string;
  sentAt: string;
  templateLabel: string;
  channel: GuideMessageChannel;
  status: GuideMessageResult["status"];
};

export function getGuideContactHistory(batches: GuideMessageBatch[], phone: string): GuideContactHistoryItem[] {
  return batches.flatMap((batch) =>
    batch.results
      .filter((result) => result.phone === phone)
      .map((result) => ({
        batchId: batch.id,
        sentAt: batch.sentAt,
        templateLabel: batch.templateLabel,
        channel: result.channel,
        status: result.status,
      })),
  );
}

export type GuideContactStatus = "sent" | "unsent" | "failed";

export const GUIDE_CONTACT_STATUS_META: Record<GuideContactStatus, { label: string; badge: string }> = {
  sent: { label: "발송완료", badge: "success" },
  unsent: { label: "미발송", badge: "gray" },
  failed: { label: "발송실패", badge: "danger" },
};

/** 최근 발송결과 기준 연락처 상태 */
export function getGuideContactStatus(batches: GuideMessageBatch[], phone: string): GuideContactStatus {
  const latest = getGuideContactHistory(batches, phone)[0];
  if (!latest) return "unsent";
  return latest.status === "success" ? "sent" : "failed";
}

/** 연락처 기준 안내현황. 가이드 운영 메인과 고객소통 화면이 같은 계산을 사용합니다. */
export function summarizeGuideContacts(
  departure: GuideDeparture,
  batches: GuideMessageBatch[],
  rows = getGuideCommRows(departure),
  includeCompanion = false,
) {
  const { targets } = buildGuideContactTargets(rows, includeCompanion);
  const statuses = targets.map((target) => getGuideContactStatus(batches, target.phone));
  return {
    people: rows.length,
    contacts: targets.length,
    sent: statuses.filter((status) => status === "sent").length,
    unsent: statuses.filter((status) => status === "unsent").length,
    failed: statuses.filter((status) => status === "failed").length,
  };
}

/** 더미 발송 처리. 실제 발송하지 않고 SAMPLE 규칙으로 결과만 만듭니다. 재발송은 성공으로 처리합니다. */
export function simulateGuideSend(
  targets: GuideContactTarget[],
  fallback: boolean,
  retry = false,
): GuideMessageResult[] {
  return targets.map((target) => {
    const base = {
      phone: target.phone,
      ownerName: target.ownerName,
      passengerIds: target.rows.map((row) => row.passenger.id),
    };
    if (retry) return { ...base, status: "success", channel: fallback ? "SMS/LMS" : "알림톡" };
    if (SAMPLE_FAIL_PHONES.includes(target.phone)) {
      return { ...base, status: "failed", channel: fallback ? "SMS/LMS" : "알림톡" };
    }
    if (SAMPLE_ALIMTALK_FAIL_PHONES.includes(target.phone)) {
      return fallback
        ? { ...base, status: "success", channel: "SMS/LMS" }
        : { ...base, status: "failed", channel: "알림톡" };
    }
    return { ...base, status: "success", channel: "알림톡" };
  });
}

export function formatGuideSentAt(value: string) {
  const [date, time] = value.split(" ");
  const [, month, day] = date.split("-");
  return `${month}/${day} ${time ?? ""}`.trim();
}
