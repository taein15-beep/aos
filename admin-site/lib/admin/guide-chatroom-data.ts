/**
 * 가이드 운영 > 카카오 안내방 관리 샘플 데이터 (SAMPLE)
 * - AOS는 카카오톡 오픈채팅방을 생성하지 않습니다. 가이드가 카카오톡에서 만든 방의 참여링크만 등록합니다.
 * - 실제 참여 여부는 확인할 수 없으므로 링크 등록 여부와 참여 안내 발송 여부만 관리합니다.
 * - 안내 발송 여부는 고객소통 발송이력(카카오 안내방 참여 템플릿)을 그대로 사용합니다.
 * - 안내방 정보는 새로고침 시 초기화되는 프론트 Mock 저장소에 보관합니다.
 */
import {
  SAMPLE_GUIDE_DEPARTURE_KEY,
  getGuideLeadStaff,
  getGuideOperationPath,
  getGuideStaff,
  type GuideDeparture,
  type GuideVehicle,
  formatTestReferenceNow,
} from "@/lib/admin/guide-operation-data";
import {
  GUIDE_CHAT_TEMPLATE_KEY,
  buildGuideContactTargets,
  getGuideChatRoomId,
  getGuideCommRows,
  getGuideCommunicationPath,
  type GuideCommRow,
  type GuideContactTarget,
  type GuideMessageBatch,
} from "@/lib/admin/guide-communication-data";

export type GuideChatMode = "all" | "vehicle";

export const GUIDE_CHAT_MODE_META: Record<GuideChatMode, { label: string; description: string }> = {
  all: { label: "전체 안내방 사용", description: "모든 고객이 하나의 안내방에 참여합니다." },
  vehicle: { label: "호차별 안내방 사용", description: "각 호차 고객이 해당 호차 안내방에 참여합니다." },
};

export const GUIDE_CHAT_SCOPE_ALL = "all";

export type GuideChatRoom = {
  id: string;
  /** "all" 또는 호차 id */
  scope: string;
  name: string;
  link: string;
  /** false = AOS에서 사용중지. 카카오 오픈채팅방 자체는 삭제되지 않습니다. */
  active: boolean;
  registeredAt: string;
  updatedAt: string;
};

export type GuideChatState = {
  mode: GuideChatMode;
  /** 운영방식을 바꿔도 다른 방식의 안내방 링크는 삭제하지 않고 보관합니다. */
  rooms: GuideChatRoom[];
};

const sessionChatStates: Record<string, GuideChatState> = {};

function buildSeedChatState(key: string): GuideChatState {
  if (key !== SAMPLE_GUIDE_DEPARTURE_KEY) return { mode: "vehicle", rooms: [] };
  return {
    mode: "vehicle",
    rooms: [
      {
        id: getGuideChatRoomId("V-1"),
        scope: "V-1",
        name: "10/17 국악와인열차 1호차",
        link: "https://open.kakao.com/o/sAOS1017A",
        active: true,
        registeredAt: "2026-10-16 17:50",
        updatedAt: "2026-10-16 17:50",
      },
    ],
  };
}

const cloneState = (state: GuideChatState): GuideChatState => ({
  mode: state.mode,
  rooms: state.rooms.map((room) => ({ ...room })),
});

export function getGuideChatState(key: string) {
  return cloneState(sessionChatStates[key] ?? buildSeedChatState(key));
}

export function saveGuideChatState(key: string, state: GuideChatState) {
  sessionChatStates[key] = cloneState(state);
}

export function getGuideChatRoomPath(key: string) {
  return `${getGuideOperationPath(key)}/chat-room`;
}

/** 참여 안내 보내기 → 고객소통 화면 (발송대상·템플릿·안내방 선택 상태로 이동) */
export function getGuideChatInvitePath(key: string, room: GuideChatRoom) {
  return getGuideCommunicationPath(key, GUIDE_CHAT_TEMPLATE_KEY, {
    vehicle: room.scope === GUIDE_CHAT_SCOPE_ALL ? "all" : room.scope,
    room: room.id,
  });
}

export type GuideChatScope = {
  scope: string;
  roomId: string;
  label: string;
  vehicle: GuideVehicle | null;
};

/** 현재 운영방식의 안내방 범위. 호차별 안내방은 운영배정에서 등록된 호차를 그대로 사용합니다. */
export function getGuideChatScopes(departure: GuideDeparture, mode: GuideChatMode): GuideChatScope[] {
  if (mode === "all") {
    return [
      {
        scope: GUIDE_CHAT_SCOPE_ALL,
        roomId: getGuideChatRoomId(GUIDE_CHAT_SCOPE_ALL),
        label: "전체 고객 안내방",
        vehicle: null,
      },
    ];
  }
  return departure.vehicles.map((vehicle) => ({
    scope: vehicle.id,
    roomId: getGuideChatRoomId(vehicle.id),
    label: `${vehicle.name} 안내방`,
    vehicle,
  }));
}

export function getGuideChatRoomLabel(departure: GuideDeparture, scope: string) {
  if (scope === GUIDE_CHAT_SCOPE_ALL) return "전체 고객 안내방";
  const vehicle = departure.vehicles.find((item) => item.id === scope);
  return vehicle ? `${vehicle.name} 안내방` : "삭제된 호차 안내방";
}

export function getGuideChatDefaultName(departure: GuideDeparture, scope: string) {
  const [, month, day] = departure.departureDate.split("-");
  const shortName = departure.productName.replace(/ 당일여행$/, "");
  if (scope === GUIDE_CHAT_SCOPE_ALL) return `${month}/${day} ${shortName} 고객 안내방`;
  const vehicle = departure.vehicles.find((item) => item.id === scope);
  return `${month}/${day} ${shortName} ${vehicle?.name ?? ""}`.trim();
}

/** 안내방 담당: 전체 안내방은 총괄가이드, 호차별 안내방은 호차 담당가이드 */
export function getGuideChatOwner(departure: GuideDeparture, scope: string) {
  if (scope === GUIDE_CHAT_SCOPE_ALL) {
    const lead = getGuideLeadStaff(departure);
    return { role: "총괄가이드", name: lead?.name ?? departure.guideName };
  }
  const vehicle = departure.vehicles.find((item) => item.id === scope);
  return { role: "담당가이드", name: (vehicle && getGuideStaff(departure, vehicle.guideId)?.name) || "미지정" };
}

export function findGuideChatRoom(state: GuideChatState, roomId: string) {
  return state.rooms.find((room) => room.id === roomId) ?? null;
}

/** 고객이 현재 운영방식에서 참여해야 하는 안내방 범위. 호차 미배정 고객은 호차별 안내방 대상이 아닙니다. */
export function getGuideRowChatScope(state: GuideChatState, row: GuideCommRow) {
  if (state.mode === "all") return GUIDE_CHAT_SCOPE_ALL;
  return row.vehicle?.id ?? "";
}

/** 고객에게 현재 안내할 수 있는 안내방 (등록 + 사용중) */
export function getGuideRowChatRoom(state: GuideChatState, row: GuideCommRow) {
  const scope = getGuideRowChatScope(state, row);
  if (!scope) return null;
  const room = findGuideChatRoom(state, getGuideChatRoomId(scope));
  return room && room.active ? room : null;
}

/** 실제 발송 단위(연락처)에 사용할 안내방. 같은 번호로 묶인 고객은 대표 고객의 호차를 기준으로 합니다. */
export function getGuideTargetChatRoom(state: GuideChatState, target: GuideContactTarget) {
  const row = target.rows.find((item) => item.isLeader) ?? target.rows[0];
  return row ? getGuideRowChatRoom(state, row) : null;
}

export type GuideChatInviteStatus =
  | { kind: "none" }
  | { kind: "sent"; sentAt: string; roomLabel: string }
  | { kind: "reinvite"; sentAt: string; roomLabel: string; currentLabel: string };

/**
 * 고객별 안내방 참여 안내 상태 (발송이력 기준)
 * - 최근 안내한 안내방 범위와 현재 운영방식·호차의 안내방 범위가 다르면 재안내 필요로 표시합니다.
 * - 오픈채팅방 실제 참여 여부는 확인하지 않습니다.
 */
export function getGuideChatInviteStatus(
  departure: GuideDeparture,
  state: GuideChatState,
  batches: GuideMessageBatch[],
  row: GuideCommRow,
): GuideChatInviteStatus {
  for (const batch of batches) {
    const result = batch.results.find(
      (item) => item.status === "success" && item.chatRoomId && item.passengerIds.includes(row.passenger.id),
    );
    if (!result?.chatRoomId) continue;
    const sentScope = result.chatRoomId.replace(/^ROOM-/, "");
    const currentScope = getGuideRowChatScope(state, row);
    const roomLabel = getGuideChatRoomLabel(departure, sentScope);
    if (sentScope === currentScope) return { kind: "sent", sentAt: batch.sentAt, roomLabel };
    const currentLabel =
      state.mode === "all" ? "현재 전체 안내방 사용" : row.vehicle ? `현재 ${row.vehicle.name}` : "현재 호차 미배정";
    return { kind: "reinvite", sentAt: batch.sentAt, roomLabel, currentLabel };
  }
  return { kind: "none" };
}

export function getGuideChatScopeRows(rows: GuideCommRow[], scope: string) {
  return scope === GUIDE_CHAT_SCOPE_ALL ? rows : rows.filter((row) => row.vehicle?.id === scope);
}

/** 안내방별 발송현황 (대표 연락처 기준 · 같은 번호는 1건) */
export function summarizeGuideChatRoom(
  departure: GuideDeparture,
  state: GuideChatState,
  batches: GuideMessageBatch[],
  scope: string,
  rows = getGuideCommRows(departure),
) {
  const roomId = getGuideChatRoomId(scope);
  const scopeRows = getGuideChatScopeRows(rows, scope);
  const { targets } = buildGuideContactTargets(scopeRows, false);
  const sentPhones = new Set(
    batches.flatMap((batch) =>
      batch.results.filter((item) => item.status === "success" && item.chatRoomId === roomId).map((item) => item.phone),
    ),
  );
  const sent = targets.filter((target) => sentPhones.has(target.phone)).length;
  const reinvite = scopeRows.filter(
    (row) => getGuideChatInviteStatus(departure, state, batches, row).kind === "reinvite",
  );
  return { people: scopeRows.length, contacts: targets.length, sent, unsent: targets.length - sent, reinvite };
}

export type GuideChatInviteProgress = "before" | "partial" | "done";

export const GUIDE_CHAT_INVITE_META: Record<GuideChatInviteProgress, { label: string; badge: string }> = {
  before: { label: "안내발송 전", badge: "gray" },
  partial: { label: "일부 안내발송", badge: "warn" },
  done: { label: "안내발송 완료", badge: "success" },
};

export function getGuideChatInviteProgress(summary: { contacts: number; sent: number }): GuideChatInviteProgress {
  if (summary.sent === 0) return "before";
  return summary.sent >= summary.contacts ? "done" : "partial";
}

/** 가이드 운영 메인 카드용 요약 */
export function summarizeGuideChatOverview(departure: GuideDeparture, batches: GuideMessageBatch[]) {
  const state = getGuideChatState(departure.key);
  const rows = getGuideCommRows(departure);
  const scopes = getGuideChatScopes(departure, state.mode);
  const registered = scopes.filter((item) => findGuideChatRoom(state, item.roomId)?.active).length;
  const totals = scopes.reduce(
    (sum, item) => {
      if (!findGuideChatRoom(state, item.roomId)?.active) return sum;
      const summary = summarizeGuideChatRoom(departure, state, batches, item.scope, rows);
      return {
        contacts: sum.contacts + summary.contacts,
        sent: sum.sent + summary.sent,
        reinvite: sum.reinvite + summary.reinvite.length,
      };
    },
    { contacts: 0, sent: 0, reinvite: 0 },
  );
  return { mode: state.mode, scopeCount: scopes.length, registered, ...totals };
}

/** 기본 URL 형식 검증. 카카오 서버에 방 존재 여부를 확인하지 않습니다. */
export function validateGuideChatLink(value: string): { ok: boolean; message: string; warn?: string } {
  const text = value.trim();
  if (!text) return { ok: false, message: "오픈채팅 참여링크를 입력해주세요." };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, message: "올바른 URL을 입력해주세요." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, message: "올바른 URL을 입력해주세요." };
  }
  if (url.hostname !== "open.kakao.com") {
    return {
      ok: true,
      message: "URL 형식이 확인되었습니다.",
      warn: "카카오 오픈채팅 링크(open.kakao.com)가 아닙니다. 링크를 다시 확인해 주세요.",
    };
  }
  return { ok: true, message: "URL 형식이 확인되었습니다." };
}

export function formatGuideChatNow() {
  return formatTestReferenceNow();
}
