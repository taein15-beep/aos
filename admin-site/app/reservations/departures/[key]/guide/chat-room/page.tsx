"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  Link2,
  MessageCircle,
  PauseCircle,
  Pencil,
  PlayCircle,
  Send,
} from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { GuideOperationPhaseBadge } from "@/components/guide/GuideOperationPhaseBadge";
import { ShareConfirmDialog, type ShareConfirmDialogState } from "@/components/products/ShareConfirmDialog";
import {
  GUIDE_STAFF_ROLE_LABEL,
  formatGuideDepartureDate,
  getGuideAssignmentPath,
  getGuideLeadStaff,
  getGuideOperationPath,
  getGuideVehicleBoardingGroup,
  type GuideDeparture,
} from "@/lib/admin/guide-operation-data";
import { getGuideCommRows, getGuideMessageBatches, getGuideChatRoomId } from "@/lib/admin/guide-communication-data";
import {
  GUIDE_CHAT_INVITE_META,
  GUIDE_CHAT_MODE_META,
  findGuideChatRoom,
  formatGuideChatNow,
  getGuideChatDefaultName,
  getGuideChatInvitePath,
  getGuideChatInviteProgress,
  getGuideChatOwner,
  getGuideChatRoomLabel,
  getGuideChatScopes,
  getGuideChatState,
  saveGuideChatState,
  summarizeGuideChatRoom,
  validateGuideChatLink,
  type GuideChatMode,
  type GuideChatRoom,
  type GuideChatScope,
  type GuideChatState,
} from "@/lib/admin/guide-chatroom-data";
import { getOperationDeparture } from "@/lib/admin/operation-assignment-data";

const CHAT_MODES: GuideChatMode[] = ["all", "vehicle"];
const MODE_SHORT_LABEL: Record<GuideChatMode, string> = { all: "전체 안내방", vehicle: "호차별 안내방" };
const REINVITE_NAME_LIMIT = 5;

export default function GuideChatRoomPage() {
  const params = useParams<{ key: string }>();
  const router = useRouter();
  const departureKey = useMemo(() => decodeURIComponent(params.key ?? ""), [params.key]);
  const departure = useMemo(() => getOperationDeparture(departureKey), [departureKey]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const notify = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  };

  return (
    <ProductAdminShell
      activeMenu="예약관리"
      currentChild="가이드 운영"
      breadcrumb={
        <>
          <span>예약관리</span>
          <b>/</b>
          <span>가이드 운영</span>
          <b>/</b>
          <strong>카카오 안내방 관리</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
    >
      {!departure ? (
        <main className="content member-web-detail-content guide-ops-content">
          <section className="panel member-web-detail-not-found">
            <strong>출발상품을 찾을 수 없습니다.</strong>
            <p>요청한 출발상품({departureKey || "-"})의 안내방 정보가 없습니다.</p>
            <button type="button" className="secondary" onClick={() => router.push("/reservations")}>
              <ArrowLeft size={15} />
              예약목록으로
            </button>
          </section>
        </main>
      ) : (
        <GuideChatRoomBody
          key={departure.key}
          departure={departure}
          onBack={() => router.push(getGuideOperationPath(departure.key))}
          onNotify={notify}
        />
      )}
    </ProductAdminShell>
  );
}

function GuideChatRoomBody({
  departure,
  onBack,
  onNotify,
}: {
  departure: GuideDeparture;
  onBack: () => void;
  onNotify: (message: string) => void;
}) {
  const router = useRouter();
  const rows = useMemo(() => getGuideCommRows(departure), [departure]);
  const batches = useMemo(() => getGuideMessageBatches(departure.key), [departure.key]);
  const leadStaff = getGuideLeadStaff(departure);
  const [viewerId, setViewerId] = useState(leadStaff?.id ?? departure.staff[0]?.id ?? "");
  const [state, setState] = useState<GuideChatState>(() => getGuideChatState(departure.key));
  const [editing, setEditing] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ShareConfirmDialogState | null>(null);

  const commit = (next: GuideChatState) => {
    setState(next);
    saveGuideChatState(departure.key, next);
  };

  const scopes = getGuideChatScopes(departure, state.mode);
  const ownVehicleId = departure.vehicles.find((vehicle) => vehicle.guideId === viewerId)?.id ?? "";
  const orderedScopes =
    state.mode === "vehicle" && ownVehicleId
      ? [
          ...scopes.filter((item) => item.scope === ownVehicleId),
          ...scopes.filter((item) => item.scope !== ownVehicleId),
        ]
      : scopes;
  const unassignedCount = rows.filter((row) => !row.vehicle).length;
  const keptRooms = state.rooms.filter((room) => !scopes.some((item) => item.roomId === room.id));
  const summaryOf = (scope: string) => summarizeGuideChatRoom(departure, state, batches, scope, rows);

  const changeMode = (mode: GuideChatMode) => {
    if (mode === state.mode) return;
    const apply = () => {
      commit({ ...state, mode });
      setEditing(null);
      setDialog(null);
      onNotify(`${GUIDE_CHAT_MODE_META[mode].label}으로 변경했습니다.`);
    };
    const hasRegistered = scopes.some((item) => findGuideChatRoom(state, item.roomId));
    if (!hasRegistered) {
      apply();
      return;
    }
    setDialog({
      title: "안내방 운영방식 변경",
      message: `안내방 운영방식을 변경하시겠습니까?\n\n기존 ${MODE_SHORT_LABEL[state.mode]} 링크는 삭제하지 않지만\n현재 운영에서는 사용하지 않게 됩니다.`,
      confirmLabel: "변경",
      details: [
        { label: "현재", value: GUIDE_CHAT_MODE_META[state.mode].label },
        { label: "변경", value: GUIDE_CHAT_MODE_META[mode].label },
      ],
      onConfirm: apply,
    });
  };

  const saveRoom = (scope: string, name: string, link: string) => {
    const id = getGuideChatRoomId(scope);
    const existing = findGuideChatRoom(state, id);
    const now = formatGuideChatNow();
    const room: GuideChatRoom = existing
      ? { ...existing, name, link, updatedAt: now }
      : { id, scope, name, link, active: true, registeredAt: now, updatedAt: now };
    commit({
      ...state,
      rooms: existing ? state.rooms.map((item) => (item.id === id ? room : item)) : [...state.rooms, room],
    });
    setEditing(null);
    onNotify(existing ? "링크가 변경되었습니다." : "링크가 등록되었습니다.");
  };

  const startEdit = (scope: string, room: GuideChatRoom) => {
    const { sent } = summaryOf(scope);
    if (!sent) {
      setEditing(scope);
      return;
    }
    setDialog({
      title: "안내방 링크 수정",
      message: `이미 ${sent}건의 안내가 발송된 안내방입니다.\n\n링크를 변경하면 기존에 발송된 링크와\n현재 링크가 달라집니다.`,
      confirmLabel: "링크 변경",
      details: [
        { label: "안내방", value: getGuideChatRoomLabel(departure, scope) },
        { label: "현재 링크", value: room.link },
      ],
      onConfirm: () => {
        setDialog(null);
        setEditing(scope);
      },
    });
  };

  const copyLink = async (room: GuideChatRoom) => {
    try {
      await navigator.clipboard.writeText(room.link);
      onNotify("참여링크를 복사했습니다.");
    } catch {
      onNotify("복사하지 못했습니다. 링크를 직접 선택해 복사해 주세요.");
    }
  };

  const setRoomActive = (room: GuideChatRoom, active: boolean) => {
    commit({
      ...state,
      rooms: state.rooms.map((item) =>
        item.id === room.id ? { ...item, active, updatedAt: formatGuideChatNow() } : item,
      ),
    });
    onNotify(
      active
        ? `${getGuideChatRoomLabel(departure, room.scope)}을(를) 다시 사용합니다.`
        : `${getGuideChatRoomLabel(departure, room.scope)} 사용을 중지했습니다. (카카오 오픈채팅방은 삭제되지 않음)`,
    );
  };

  const requestStop = (room: GuideChatRoom) => {
    const label = getGuideChatRoomLabel(departure, room.scope);
    setDialog({
      title: "안내방 사용중지",
      message: `${label} 사용을 중지하시겠습니까?\n\nAOS에서만 사용을 중지합니다. 카카오톡 오픈채팅방은 삭제되지 않으며\n기존 발송이력은 그대로 유지됩니다.`,
      confirmLabel: "사용중지",
      details: [
        { label: "안내방", value: `${label} · ${room.name}` },
        { label: "참여링크", value: room.link },
      ],
      onConfirm: () => {
        setDialog(null);
        setRoomActive(room, false);
      },
    });
  };

  return (
    <>
      <main className="content member-web-detail-content guide-ops-content guide-chat-content">
        <section className="panel guide-ops-hero" aria-labelledby="guide-chat-title">
          <div className="guide-ops-hero-main">
            <p className="member-web-breadcrumb">예약관리 &gt; 가이드 운영 &gt; 카카오 안내방 관리</p>
            <div className="guide-ops-hero-status">
              <GuideOperationPhaseBadge departure={departure} />
              <span className="guide-ops-code">{departure.productCode}</span>
            </div>
            <h1 id="guide-chat-title">{departure.productName}</h1>
            <dl className="guide-ops-hero-meta">
              <div className="is-date">
                <dt>출발일</dt>
                <dd>{formatGuideDepartureDate(departure.departureDate)}</dd>
              </div>
              <div>
                <dt>전체고객</dt>
                <dd>{rows.length}명</dd>
              </div>
              <div>
                <dt>운영차량</dt>
                <dd>{departure.vehicles.length}대</dd>
              </div>
              <div>
                <dt>총괄가이드</dt>
                <dd>{leadStaff?.name ?? departure.guideName}</dd>
              </div>
            </dl>
          </div>
          <div className="guide-ops-hero-actions guide-customers-hero-actions">
            <label className="guide-viewer-select">
              <span>화면 기준 (SAMPLE)</span>
              <select value={viewerId} onChange={(event) => setViewerId(event.target.value)}>
                {departure.staff
                  .filter((staff) => staff.roles.length > 0)
                  .map((staff) => {
                    const ownVehicle = departure.vehicles.find((item) => item.guideId === staff.id);
                    const role = staff.roles.includes("lead")
                      ? GUIDE_STAFF_ROLE_LABEL.lead
                      : `${ownVehicle?.name ?? ""} 담당`;
                    return (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} · {role}
                      </option>
                    );
                  })}
              </select>
            </label>
            <button type="button" className="secondary" onClick={onBack}>
              <ArrowLeft size={15} />
              가이드 운영 메인
            </button>
          </div>
        </section>

        <section className="panel guide-chat-guide" aria-labelledby="guide-chat-flow-title">
          <div className="guide-ops-section-head">
            <h2 id="guide-chat-flow-title">안내방 운영 순서</h2>
            <span>AOS는 오픈채팅방을 만들지 않습니다. 카카오톡에서 만든 방의 참여링크만 등록해 사용합니다.</span>
          </div>
          <ol className="guide-chat-flow">
            <li>
              <b>1</b>
              <span>카카오톡에서 오픈채팅 안내방 생성</span>
            </li>
            <li>
              <b>2</b>
              <span>참여링크 복사</span>
            </li>
            <li>
              <b>3</b>
              <span>AOS에 링크 등록</span>
            </li>
            <li>
              <b>4</b>
              <span>고객소통에서 참여 안내 발송</span>
            </li>
          </ol>
          <p className="guide-chat-scope-note">
            AOS에서 확인할 수 있는 정보는 <b>링크 등록 여부</b>와 <b>참여 안내 발송 여부</b>뿐입니다. 고객의 실제
            오픈채팅 참여 여부는 확인하지 않습니다.
          </p>
          {!departure.handover && (
            <p className="ops-assign-notice is-warn" role="note">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <b>운영인계 전인 출발상품입니다.</b>
                <small>운영배정에서 호차·고객 배정을 확정하고 운영인계한 뒤 안내방을 관리하는 것을 권장합니다.</small>
              </span>
              <button
                type="button"
                className="secondary"
                onClick={() => router.push(getGuideAssignmentPath(departure.key))}
              >
                운영배정
              </button>
            </p>
          )}
        </section>

        <section className="panel guide-chat-mode" aria-labelledby="guide-chat-mode-title">
          <div className="guide-ops-section-head">
            <h2 id="guide-chat-mode-title">안내방 운영방식</h2>
            <span>방식을 바꿔도 등록된 링크는 삭제되지 않습니다.</span>
          </div>
          <div className="guide-chat-mode-options" role="radiogroup" aria-label="안내방 운영방식">
            {CHAT_MODES.map((mode) => (
              <label key={mode} className={`guide-chat-mode-option ${state.mode === mode ? "is-active" : ""}`}>
                <input
                  type="radio"
                  name="guide-chat-mode"
                  checked={state.mode === mode}
                  onChange={() => changeMode(mode)}
                />
                <span>
                  <strong>{GUIDE_CHAT_MODE_META[mode].label}</strong>
                  <small>{GUIDE_CHAT_MODE_META[mode].description}</small>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="guide-ops-section guide-chat-rooms" aria-labelledby="guide-chat-rooms-title">
          <div className="guide-ops-section-head">
            <h2 id="guide-chat-rooms-title">{state.mode === "all" ? "전체 고객 안내방" : "호차별 안내방"}</h2>
            <span>
              {state.mode === "all"
                ? "모든 고객에게 같은 안내방 링크를 안내합니다."
                : "운영배정에 등록된 호차별로 안내방 링크를 등록합니다."}
            </span>
          </div>
          {state.mode === "vehicle" && unassignedCount > 0 && (
            <p className="ops-assign-notice is-warn" role="note">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <b>호차 미배정 고객 {unassignedCount}명은 호차별 안내방 안내 대상에서 제외됩니다.</b>
                <small>운영배정에서 호차를 배정하면 해당 호차 안내방 대상에 포함됩니다.</small>
              </span>
            </p>
          )}
          {orderedScopes.length === 0 ? (
            <div className="panel guide-customers-empty">
              <strong>운영배정에 등록된 호차가 없습니다.</strong>
            </div>
          ) : (
            <div className="guide-chat-grid">
              {orderedScopes.map((item) => (
                <RoomCard
                  key={item.roomId}
                  departure={departure}
                  scope={item}
                  room={findGuideChatRoom(state, item.roomId)}
                  summary={summaryOf(item.scope)}
                  own={item.scope === ownVehicleId}
                  editing={editing === item.scope}
                  onStartEdit={(room) => startEdit(item.scope, room)}
                  onCancelEdit={() => setEditing(null)}
                  onSave={(name, link) => saveRoom(item.scope, name, link)}
                  onCopy={copyLink}
                  onStop={requestStop}
                  onResume={(room) => setRoomActive(room, true)}
                  onInvite={(room) => router.push(getGuideChatInvitePath(departure.key, room))}
                />
              ))}
            </div>
          )}
        </section>

        {keptRooms.length > 0 && (
          <section className="panel guide-chat-kept" aria-labelledby="guide-chat-kept-title">
            <div className="guide-ops-section-head">
              <h2 id="guide-chat-kept-title">현재 운영방식에서 사용하지 않는 안내방</h2>
              <span>운영방식을 바꿔도 링크와 발송이력은 삭제하지 않고 보관합니다.</span>
            </div>
            <ul className="guide-chat-kept-list">
              {keptRooms.map((room) => (
                <li key={room.id}>
                  <b>{getGuideChatRoomLabel(departure, room.scope)}</b>
                  <span>{room.name}</span>
                  <span className="guide-chat-link-url">{room.link}</span>
                  <span className="badge gray">{room.active ? "미사용 (보관)" : "사용중지"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <ShareConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

type RoomSummary = ReturnType<typeof summarizeGuideChatRoom>;

function RoomCard({
  departure,
  scope,
  room,
  summary,
  own,
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onCopy,
  onStop,
  onResume,
  onInvite,
}: {
  departure: GuideDeparture;
  scope: GuideChatScope;
  room: GuideChatRoom | null;
  summary: RoomSummary;
  own: boolean;
  editing: boolean;
  onStartEdit: (room: GuideChatRoom) => void;
  onCancelEdit: () => void;
  onSave: (name: string, link: string) => void;
  onCopy: (room: GuideChatRoom) => void;
  onStop: (room: GuideChatRoom) => void;
  onResume: (room: GuideChatRoom) => void;
  onInvite: (room: GuideChatRoom) => void;
}) {
  const owner = getGuideChatOwner(departure, scope.scope);
  const group = scope.vehicle ? getGuideVehicleBoardingGroup(departure, scope.vehicle) : null;
  const progress = getGuideChatInviteProgress(summary);
  const titleId = `guide-chat-card-${scope.scope}`;
  return (
    <article
      className={`panel guide-chat-card ${own ? "is-own" : ""} ${room && !room.active ? "is-stopped" : ""}`}
      aria-labelledby={titleId}
    >
      <header className="guide-chat-card-head">
        <div className="guide-chat-card-title">
          <MessageCircle size={17} aria-hidden="true" />
          <h3 id={titleId}>{scope.label}</h3>
          {own && <span className="badge info">내 호차</span>}
        </div>
        <div className="guide-chat-card-badges">
          {!room ? (
            <span className="badge gray">미등록</span>
          ) : room.active ? (
            <span className="badge success">등록완료</span>
          ) : (
            <span className="badge gray">사용중지</span>
          )}
          {room?.active && (
            <span className={`badge ${GUIDE_CHAT_INVITE_META[progress].badge}`}>
              {GUIDE_CHAT_INVITE_META[progress].label}
            </span>
          )}
        </div>
      </header>

      <dl className="guide-chat-card-meta">
        <div>
          <dt>대상 고객</dt>
          <dd>{summary.people}명</dd>
        </div>
        <div>
          <dt>담당</dt>
          <dd>
            {owner.role} {owner.name}
          </dd>
        </div>
        {scope.vehicle && (
          <div>
            <dt>탑승지 그룹</dt>
            <dd>{group?.name ?? "미선택"}</dd>
          </div>
        )}
        {room && (
          <div>
            <dt>사용상태</dt>
            <dd>{room.active ? "사용중" : "사용중지"}</dd>
          </div>
        )}
      </dl>

      {!room || editing ? (
        <RoomForm
          key={room ? `${room.id}-${room.updatedAt}` : scope.roomId}
          departure={departure}
          scope={scope}
          room={room}
          sentCount={summary.sent}
          onCancel={room ? onCancelEdit : undefined}
          onSave={onSave}
        />
      ) : (
        <>
          <div className="guide-chat-link">
            <div>
              <span>안내방 이름</span>
              <b>{room.name}</b>
            </div>
            <div>
              <span>참여링크</span>
              <b className="guide-chat-link-url">
                <Link2 size={13} aria-hidden="true" />
                {room.link}
              </b>
            </div>
            <small>
              등록 {room.registeredAt}
              {room.updatedAt !== room.registeredAt ? ` · 최근 변경 ${room.updatedAt}` : ""}
            </small>
          </div>

          <dl className="guide-chat-stats" aria-label={`${scope.label} 발송현황`}>
            <div>
              <dt>대상 고객</dt>
              <dd>{summary.people}명</dd>
            </div>
            <div>
              <dt>발송 연락처</dt>
              <dd>{summary.contacts}건</dd>
            </div>
            <div className="is-success">
              <dt>안내발송</dt>
              <dd>{summary.sent}건</dd>
            </div>
            <div className={summary.unsent ? "is-warn" : ""}>
              <dt>미발송</dt>
              <dd>{summary.unsent}건</dd>
            </div>
          </dl>
          <p className="guide-chat-stats-note">대표 연락처 기준 · 실제 참여 여부는 확인하지 않습니다.</p>

          {summary.reinvite.length > 0 && (
            <p className="ops-assign-notice is-warn" role="note">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <b>안내방 재안내 필요 {summary.reinvite.length}명</b>
                <small>
                  {summary.reinvite
                    .slice(0, REINVITE_NAME_LIMIT)
                    .map((row) => row.passenger.name)
                    .join(", ")}
                  {summary.reinvite.length > REINVITE_NAME_LIMIT
                    ? ` 외 ${summary.reinvite.length - REINVITE_NAME_LIMIT}명`
                    : ""}{" "}
                  · 다른 안내방 링크를 받은 고객입니다. 참여 안내 보내기에서 다시 안내해 주세요.
                </small>
              </span>
            </p>
          )}
          {!room.active && (
            <p className="ops-assign-notice is-warn" role="note">
              <PauseCircle size={16} aria-hidden="true" />
              <span>
                <b>AOS에서 사용중지된 안내방입니다.</b>
                <small>카카오톡 오픈채팅방은 삭제되지 않았으며, 기존 발송이력은 그대로 유지됩니다.</small>
              </span>
            </p>
          )}

          <div className="guide-chat-actions">
            {room.active ? (
              <>
                <button type="button" className="primary is-wide" onClick={() => onInvite(room)}>
                  <Send size={15} />
                  참여 안내 보내기
                </button>
                <button type="button" className="secondary" onClick={() => onCopy(room)}>
                  <Copy size={15} />
                  링크 복사
                </button>
                <button type="button" className="secondary" onClick={() => onStartEdit(room)}>
                  <Pencil size={15} />
                  링크 수정
                </button>
                <button type="button" className="secondary is-stop" onClick={() => onStop(room)}>
                  <PauseCircle size={15} />
                  사용중지
                </button>
              </>
            ) : (
              <>
                <button type="button" className="primary is-wide" onClick={() => onResume(room)}>
                  <PlayCircle size={15} />
                  다시 사용
                </button>
                <button type="button" className="secondary" onClick={() => onStartEdit(room)}>
                  <Pencil size={15} />
                  링크 수정
                </button>
              </>
            )}
          </div>
        </>
      )}
    </article>
  );
}

function RoomForm({
  departure,
  scope,
  room,
  sentCount,
  onCancel,
  onSave,
}: {
  departure: GuideDeparture;
  scope: GuideChatScope;
  room: GuideChatRoom | null;
  sentCount: number;
  onCancel?: () => void;
  onSave: (name: string, link: string) => void;
}) {
  const [name, setName] = useState(room?.name ?? getGuideChatDefaultName(departure, scope.scope));
  const [link, setLink] = useState(room?.link ?? "");
  const [checked, setChecked] = useState(false);
  const validation = validateGuideChatLink(link);
  const showResult = checked && link.trim() !== "";
  const nameId = `guide-chat-name-${scope.scope}`;
  const linkId = `guide-chat-link-${scope.scope}`;
  const messageId = `guide-chat-link-msg-${scope.scope}`;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecked(true);
    if (!validation.ok) return;
    onSave(name.trim() || getGuideChatDefaultName(departure, scope.scope), link.trim());
  };

  return (
    <form className="guide-chat-form" onSubmit={submit} noValidate>
      {room && sentCount > 0 && (
        <p className="guide-chat-form-warn">
          이미 {sentCount}건 안내된 링크입니다. 변경하면 기존에 받은 링크와 달라지므로 필요 시 다시 안내해 주세요.
        </p>
      )}
      <label htmlFor={nameId}>
        <span>안내방 이름</span>
        <input
          id={nameId}
          value={name}
          placeholder={getGuideChatDefaultName(departure, scope.scope)}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label htmlFor={linkId}>
        <span>오픈채팅 참여링크</span>
        <input
          id={linkId}
          type="url"
          inputMode="url"
          value={link}
          placeholder="카카오 오픈채팅 참여 URL 입력 (https://open.kakao.com/o/...)"
          aria-invalid={checked && !validation.ok}
          aria-describedby={messageId}
          onChange={(event) => setLink(event.target.value)}
          onBlur={() => setChecked(true)}
        />
      </label>
      <p id={messageId} className="guide-chat-form-msg" role="status">
        {checked && !validation.ok ? (
          <span className="is-error">{validation.message}</span>
        ) : showResult ? (
          <>
            <span className="is-ok">{validation.message}</span>
            {validation.warn && <span className="is-warn">{validation.warn}</span>}
          </>
        ) : (
          <span>카카오톡 오픈채팅방의 [링크 공유]에서 복사한 주소를 붙여넣어 주세요.</span>
        )}
      </p>
      <div className="guide-chat-form-actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            취소
          </button>
        )}
        <button type="submit" className="primary">
          <Link2 size={15} />
          {room ? "링크 변경" : "링크 등록"}
        </button>
      </div>
    </form>
  );
}
