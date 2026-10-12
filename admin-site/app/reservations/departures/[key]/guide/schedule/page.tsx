"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Flag,
  MapPin,
  MessageCircle,
  MessageSquare,
  Pencil,
  StickyNote,
  Timer,
  Users,
  X,
} from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { GuideOperationPhaseBadge } from "@/components/guide/GuideOperationPhaseBadge";
import { useQueryParam } from "@/components/settlements/SettlementParts";
import {
  GUIDE_STAFF_ROLE_LABEL,
  formatGuideDepartureDate,
  getGuideAssignmentPath,
  getGuideLeadStaff,
  getGuideOperationPath,
  getGuidePassengerPoint,
  getGuideStaff,
  type GuideDeparture,
  type GuidePassenger,
  type GuideVehicle,
} from "@/lib/admin/guide-operation-data";
import { getGuideCommunicationPath, saveGuideCommPreset } from "@/lib/admin/guide-communication-data";
import { getGuideChatRoomPath } from "@/lib/admin/guide-chatroom-data";
import {
  GUIDE_SCHEDULE_NOTICE_LABEL,
  GUIDE_SCHEDULE_STATUS_META,
  buildGuideScheduleNotice,
  buildGuideScheduleViews,
  describeGuideScheduleProgress,
  diffGuideMinutes,
  formatGuideDuration,
  getGuideSchedule,
  getGuideScheduleBoardingPoints,
  getGuideScheduleCustomersPath,
  getGuideSchedulePath,
  getGuideScheduleState,
  getGuideScheduleUnchecked,
  getGuideVehiclePassengerCount,
  saveGuideScheduleState,
  shiftGuideTime,
  summarizeGuideSchedule,
  type GuideScheduleItem,
  type GuideScheduleNoticeKind,
  type GuideScheduleProgress,
  type GuideScheduleState,
  type GuideScheduleView,
} from "@/lib/admin/guide-schedule-data";
import { countGuideNotesBySchedule, getGuideNotesPath } from "@/lib/admin/guide-notes-data";
import { getOperationDeparture } from "@/lib/admin/operation-assignment-data";

const UNCHECKED_NAME_LIMIT = 8;
const DEFAULT_MEETING_GAP = 5;

type BoardingWarning = { view: GuideScheduleView; passengers: GuidePassenger[] };

type ScheduleActions = {
  onArrive: (view: GuideScheduleView) => void;
  onStartFree: (view: GuideScheduleView) => void;
  onFinish: (view: GuideScheduleView) => void;
  onChangeTime: (view: GuideScheduleView) => void;
  onNotice: (kind: GuideScheduleNoticeKind, view: GuideScheduleView) => void;
  onBoarding: (view: GuideScheduleView) => void;
  onSaveMeeting: (view: GuideScheduleView, meetingTime: string, meetingPlace: string) => void;
  onSaveMemo: (view: GuideScheduleView, memo: string) => void;
  onRecordNote: (view: GuideScheduleView, template?: string) => void;
  onOpenNotes: (view: GuideScheduleView) => void;
};

export default function GuideSchedulePage() {
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
          <strong>일정 · 현장 운영</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
    >
      {!departure ? (
        <main className="content member-web-detail-content guide-ops-content">
          <section className="panel member-web-detail-not-found">
            <strong>출발상품을 찾을 수 없습니다.</strong>
            <p>요청한 출발상품({departureKey || "-"})의 일정 정보가 없습니다.</p>
            <button type="button" className="secondary" onClick={() => router.push("/reservations/guide-operations")}>
              <ArrowLeft size={15} />
              가이드 운영 목록으로
            </button>
          </section>
        </main>
      ) : (
        <GuideScheduleBody
          key={departure.key}
          departure={departure}
          onBack={() => router.push(getGuideOperationPath(departure.key))}
          onNotify={notify}
        />
      )}
    </ProductAdminShell>
  );
}

function GuideScheduleBody({
  departure,
  onBack,
  onNotify,
}: {
  departure: GuideDeparture;
  onBack: () => void;
  onNotify: (message: string) => void;
}) {
  const router = useRouter();
  const schedule = useMemo(() => getGuideSchedule(departure.key), [departure.key]);
  const items = useMemo(() => schedule?.items ?? [], [schedule]);
  const leadStaff = getGuideLeadStaff(departure);
  const [viewerId, setViewerId] = useState(leadStaff?.id ?? departure.staff[0]?.id ?? "");
  const [vehicleParam, setVehicleParam] = useQueryParam("vehicle", "");
  const [state, setState] = useState<GuideScheduleState>(() => getGuideScheduleState(departure.key));
  const [expanded, setExpanded] = useState<string[]>([]);
  const [timeChange, setTimeChange] = useState<GuideScheduleView | null>(null);
  const [warning, setWarning] = useState<BoardingWarning | null>(null);

  const ownVehicleId = (staffId: string) =>
    departure.vehicles.find((item) => item.guideId === staffId)?.id ?? departure.vehicles[0]?.id ?? "";
  const vehicle =
    departure.vehicles.find((item) => item.id === vehicleParam) ??
    departure.vehicles.find((item) => item.id === ownVehicleId(viewerId)) ??
    null;
  const vehicleGuide = vehicle ? getGuideStaff(departure, vehicle.guideId) : null;
  const boarding = vehicle ? getGuideScheduleBoardingPoints(departure, vehicle) : null;

  const viewsOf = (target: GuideVehicle) => buildGuideScheduleViews(items, state[target.id] ?? {}, target);
  const views = vehicle ? viewsOf(vehicle) : [];
  const summary = summarizeGuideSchedule(views);
  const { current, next } = summary;

  const commit = (itemId: string, patch: Partial<GuideScheduleProgress>) => {
    if (!vehicle) return;
    const vehicleState = state[vehicle.id] ?? {};
    const nextState: GuideScheduleState = {
      ...state,
      [vehicle.id]: { ...vehicleState, [itemId]: { ...(vehicleState[itemId] ?? {}), ...patch } },
    };
    setState(nextState);
    saveGuideScheduleState(departure.key, nextState);
  };

  const changeVehicle = (vehicleId: string) => {
    setVehicleParam(vehicleId);
    setExpanded([]);
  };

  const changeViewer = (staffId: string) => {
    setViewerId(staffId);
    changeVehicle(ownVehicleId(staffId));
  };

  const finish = (view: GuideScheduleView) => {
    const { item, progress } = view;
    const time = item.plannedDeparture
      ? (progress.operatingDeparture ?? item.sampleDeparture ?? item.plannedDeparture)
      : item.kind === "meeting"
        ? (item.plannedArrival ?? "")
        : view.meetingTime || item.plannedArrival || "";
    commit(item.id, { actualDeparture: time });
    setWarning(null);
    const following = views[views.findIndex((value) => value.item.id === item.id) + 1];
    onNotify(
      `${item.title} ${item.plannedDeparture ? "출발" : "완료"} ${time} 기록 · ${
        following ? `다음 일정: ${following.item.title}` : "오늘 일정이 모두 완료되었습니다."
      }`,
    );
  };

  const actions: ScheduleActions = {
    onArrive: ({ item }) => {
      const time = item.sampleArrival ?? item.plannedArrival ?? "";
      commit(item.id, { actualArrival: time });
      onNotify(`${item.title} 실제 도착 ${time} 기록 (SAMPLE 시각)`);
    },
    onStartFree: (view) => {
      commit(view.item.id, { freeStartedAt: view.progress.actualArrival ?? view.item.sampleArrival ?? "" });
      onNotify(`자유시간 시작 · ${view.meetingTime}까지 집결해주세요.`);
    },
    onFinish: (view) => {
      if (!vehicle) return;
      const unchecked = view.item.plannedDeparture ? getGuideScheduleUnchecked(departure, vehicle, view.item) : [];
      if (unchecked.length) {
        setWarning({ view, passengers: unchecked });
        return;
      }
      finish(view);
    },
    onChangeTime: setTimeChange,
    onNotice: (kind, view) => {
      if (!vehicle) return;
      const presetId = `schedule-${vehicle.id}-${view.item.id}-${kind}`;
      saveGuideCommPreset(departure.key, presetId, {
        templateKey: kind,
        body: buildGuideScheduleNotice(kind, view),
        source: `일정 · 현장 운영 (${vehicle.name} · ${view.item.title})`,
        returnLabel: "일정 · 현장 운영",
        returnPath: getGuideSchedulePath(departure.key, vehicle.id),
      });
      router.push(getGuideCommunicationPath(departure.key, kind, { vehicle: vehicle.id, preset: presetId }));
    },
    onBoarding: (view) =>
      router.push(
        getGuideScheduleCustomersPath(departure.key, {
          vehicleId: vehicle?.id,
          status: view.done ? undefined : "unchecked",
          segment: view.item.boardingSegment,
        }),
      ),
    onSaveMeeting: (view, meetingTime, meetingPlace) => {
      commit(view.item.id, { meetingTime, meetingPlace });
      onNotify(
        `${view.item.title} 집결정보를 저장했습니다. (집결 ${meetingTime} · ${meetingPlace} · 새로고침 시 초기화)`,
      );
    },
    onSaveMemo: (view, memo) => {
      commit(view.item.id, { memo });
      onNotify(`${view.item.title} 운영메모를 저장했습니다. (SAMPLE · 새로고침 시 초기화)`);
    },
    onRecordNote: (view, template) =>
      router.push(
        getGuideNotesPath(departure.key, {
          compose: "1",
          schedule: view.item.id,
          ...(vehicle ? { vehicle: vehicle.id } : {}),
          ...(template ? { template } : {}),
        }),
      ),
    onOpenNotes: (view) => router.push(getGuideNotesPath(departure.key, { schedule: view.item.id })),
  };
  const noteCounts = vehicle ? countGuideNotesBySchedule(departure.key, vehicle.id) : {};

  const saveTimeChange = (view: GuideScheduleView, departureTime: string, meetingTime: string) => {
    const planned = view.item.plannedDeparture ?? "";
    const restore = departureTime === planned;
    commit(view.item.id, { operatingDeparture: restore ? undefined : departureTime, meetingTime });
    setTimeChange(null);
    const delay = diffGuideMinutes(departureTime, planned);
    onNotify(
      restore
        ? `${view.item.title} 출발시간을 예정시간(${planned})으로 되돌렸습니다.`
        : `${view.item.title} 운영 출발 ${departureTime} (예정 ${planned})${delay > 0 ? ` · ${delay}분 지연` : ""}`,
    );
  };

  const toggle = (itemId: string) =>
    setExpanded((value) => (value.includes(itemId) ? value.filter((id) => id !== itemId) : [...value, itemId]));

  const kpis = [
    { key: "total", label: "전체 일정", value: `${summary.total}개`, tone: "" },
    { key: "done", label: "완료", value: `${summary.done}개`, tone: "is-success" },
    {
      key: "current",
      label: "현재 진행",
      value: `${summary.inProgress}개`,
      tone: (current?.delayMinutes ?? 0) > 0 ? "is-danger" : "is-pending",
    },
    { key: "planned", label: "예정", value: `${summary.planned}개`, tone: "is-muted" },
  ];
  const rate = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;

  return (
    <>
      <main className="content member-web-detail-content guide-ops-content guide-sched-content">
        <section className="panel guide-ops-hero" aria-labelledby="guide-sched-title">
          <div className="guide-ops-hero-main">
            <p className="member-web-breadcrumb">예약관리 &gt; 가이드 운영 &gt; 일정 · 현장 운영</p>
            <div className="guide-ops-hero-status">
              <GuideOperationPhaseBadge departure={departure} />
              <span className="guide-ops-code">{departure.productCode}</span>
            </div>
            <h1 id="guide-sched-title">{departure.productName}</h1>
            <dl className="guide-ops-hero-meta">
              <div className="is-date">
                <dt>출발일</dt>
                <dd>{formatGuideDepartureDate(departure.departureDate)}</dd>
              </div>
              <div>
                <dt>호차</dt>
                <dd>{vehicle?.name ?? "미등록"}</dd>
              </div>
              <div>
                <dt>담당가이드</dt>
                <dd>{vehicleGuide?.name ?? "미지정"}</dd>
              </div>
              <div>
                <dt>고객</dt>
                <dd>{vehicle ? `${getGuideVehiclePassengerCount(departure, vehicle)}명` : "-"}</dd>
              </div>
              <div>
                <dt>탑승지 그룹</dt>
                <dd>{boarding?.groupName || "미선택"}</dd>
              </div>
            </dl>
          </div>
          <div className="guide-ops-hero-actions guide-customers-hero-actions">
            <label className="guide-viewer-select">
              <span>화면 기준 (SAMPLE)</span>
              <select value={viewerId} onChange={(event) => changeViewer(event.target.value)}>
                {departure.staff
                  .filter((staff) => staff.roles.length > 0)
                  .map((staff) => {
                    const own = departure.vehicles.find((item) => item.guideId === staff.id);
                    const role = staff.roles.includes("lead") ? GUIDE_STAFF_ROLE_LABEL.lead : `${own?.name ?? ""} 담당`;
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

        {!schedule || items.length === 0 ? (
          <section className="panel member-web-detail-not-found">
            <strong>등록된 상품 일정표가 없습니다.</strong>
            <p>상품관리의 일정표가 등록되면 출발일 일정과 현장 진행을 관리할 수 있습니다.</p>
          </section>
        ) : !vehicle ? (
          <section className="panel member-web-detail-not-found">
            <strong>운영 호차가 없습니다.</strong>
            <p>운영배정에서 호차와 담당가이드를 먼저 등록해 주세요.</p>
            <button
              type="button"
              className="secondary"
              onClick={() => router.push(getGuideAssignmentPath(departure.key))}
            >
              운영배정
            </button>
          </section>
        ) : (
          <>
            {departure.vehicles.length > 1 && (
              <div className="guide-vehicle-tabs guide-sched-tabs" role="tablist" aria-label="호차별 진행현황">
                {departure.vehicles.map((item) => {
                  const itemSummary = summarizeGuideSchedule(viewsOf(item));
                  const delayed = (itemSummary.current?.delayMinutes ?? 0) > 0;
                  return (
                    <button
                      type="button"
                      role="tab"
                      key={item.id}
                      aria-selected={item.id === vehicle.id}
                      className={item.id === vehicle.id ? "is-active" : ""}
                      onClick={() => changeVehicle(item.id)}
                    >
                      <strong>{item.name}</strong>
                      <span>{getGuideStaff(departure, item.guideId)?.name ?? "가이드 미지정"}</span>
                      <em className={!itemSummary.current ? "is-complete" : delayed ? "is-delayed" : "is-progress"}>
                        {describeGuideScheduleProgress(itemSummary)}
                      </em>
                    </button>
                  );
                })}
              </div>
            )}

            {!departure.handover && (
              <p className="ops-assign-notice is-warn guide-sched-handover" role="note">
                <AlertTriangle size={16} aria-hidden="true" />
                <span>
                  <b>운영인계 전인 출발상품입니다.</b>
                  <small>
                    호차·담당가이드·탑승지 그룹은 운영배정 값을 기준으로 표시합니다. 일정 진행은 SAMPLE로 확인할 수
                    있습니다.
                  </small>
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

            <section className="guide-ops-kpis guide-sched-kpis" aria-label={`${vehicle.name} 당일 운영현황`}>
              {kpis.map((kpi) => (
                <article className={`member-web-detail-kpi guide-ops-kpi ${kpi.tone}`} key={kpi.key}>
                  <span>
                    <small>{kpi.label}</small>
                    <strong>{kpi.value}</strong>
                  </span>
                </article>
              ))}
              <article className="member-web-detail-kpi guide-ops-kpi guide-sched-rate">
                <span>
                  <small>전체 진행률</small>
                  <strong>
                    {summary.done} / {summary.total} 완료
                  </strong>
                  <progress
                    className="guide-sched-rate-bar"
                    aria-label={`전체 진행률 ${rate}%`}
                    max={summary.total}
                    value={summary.done}
                  />
                </span>
              </article>
            </section>

            <div className="guide-sched-layout">
              <div className="guide-sched-side">
                {current ? (
                  <CurrentScheduleCard
                    key={`${vehicle.id}-${current.item.id}`}
                    view={current}
                    vehicle={vehicle}
                    departure={departure}
                    actions={actions}
                  />
                ) : (
                  <section className="panel guide-sched-current is-done">
                    <span className="guide-sched-eyebrow">오늘의 일정</span>
                    <h2>
                      <CheckCircle2 size={18} aria-hidden="true" /> 전체 일정이 완료되었습니다.
                    </h2>
                    <p className="guide-sched-muted">
                      {vehicle.name} · 일정 {summary.total}개 완료
                    </p>
                  </section>
                )}

                {current && (
                  <section className="panel guide-sched-next" aria-labelledby="guide-sched-next-title">
                    <span className="guide-sched-eyebrow" id="guide-sched-next-title">
                      {current.arrived ? "다음 일정" : "이후 일정"}
                    </span>
                    {next ? (
                      <>
                        <strong>{next.item.title}</strong>
                        <dl>
                          <div>
                            <dt>{next.item.plannedArrival ? "예정 도착" : "예정 출발"}</dt>
                            <dd>{next.item.plannedArrival ?? next.departureTime}</dd>
                          </div>
                          {next.item.moveMinutes ? (
                            <div>
                              <dt>예상 이동</dt>
                              <dd>{formatGuideDuration(next.item.moveMinutes)}</dd>
                            </div>
                          ) : null}
                          {next.meetingPlace && !next.item.plannedArrival ? (
                            <div>
                              <dt>집결장소</dt>
                              <dd>{next.meetingPlace}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </>
                    ) : (
                      <p className="guide-sched-muted">오늘의 마지막 일정입니다.</p>
                    )}
                  </section>
                )}

                <section className="panel guide-sched-links" aria-labelledby="guide-sched-links-title">
                  <span className="guide-sched-eyebrow" id="guide-sched-links-title">
                    현장 운영 바로가기
                  </span>
                  <div>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        router.push(getGuideScheduleCustomersPath(departure.key, { vehicleId: vehicle.id }))
                      }
                    >
                      <Users size={15} aria-hidden="true" />
                      고객명단
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        router.push(
                          getGuideScheduleCustomersPath(departure.key, { vehicleId: vehicle.id, status: "unchecked" }),
                        )
                      }
                    >
                      <CheckCircle2 size={15} aria-hidden="true" />
                      탑승체크
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        router.push(getGuideCommunicationPath(departure.key, undefined, { vehicle: vehicle.id }))
                      }
                    >
                      <MessageSquare size={15} aria-hidden="true" />
                      고객소통
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => router.push(getGuideChatRoomPath(departure.key))}
                    >
                      <MessageCircle size={15} aria-hidden="true" />
                      카카오 안내방
                    </button>
                  </div>
                </section>
              </div>

              <section className="panel guide-sched-timeline" aria-labelledby="guide-sched-timeline-title">
                <div className="guide-ops-section-head">
                  <h2 id="guide-sched-timeline-title">전체 일정</h2>
                  <span>{schedule.source} · 일정을 누르면 상세가 펼쳐집니다. 예정시간은 일정표 원본 값입니다.</span>
                </div>
                <ol className="guide-sched-list">
                  {views.map((view) => {
                    const open = expanded.includes(view.item.id);
                    const isCurrent = current?.item.id === view.item.id;
                    return (
                      <li
                        key={view.item.id}
                        className={`guide-sched-item is-${view.status} ${isCurrent ? "is-focus" : ""}`}
                      >
                        <button
                          type="button"
                          className="guide-sched-row"
                          aria-expanded={open}
                          onClick={() => toggle(view.item.id)}
                        >
                          <span className="guide-sched-time">
                            <b>{view.item.plannedArrival ?? view.item.plannedDeparture}</b>
                            {view.item.plannedArrival && view.item.plannedDeparture && (
                              <small>~ {view.item.plannedDeparture}</small>
                            )}
                          </span>
                          <span className="guide-sched-dot" aria-hidden="true" />
                          <span className="guide-sched-row-main">
                            <strong>{view.item.title}</strong>
                            <small>{describeRow(view)}</small>
                          </span>
                          <ScheduleBadges view={view} />
                          <ChevronDown size={16} aria-hidden="true" className="guide-sched-chevron" />
                        </button>
                        {open && (
                          <ScheduleDetail
                            key={`${vehicle.id}-${view.item.id}`}
                            view={view}
                            vehicle={vehicle}
                            departure={departure}
                            isCurrent={isCurrent}
                            noteCount={noteCounts[view.item.id] ?? 0}
                            actions={actions}
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            </div>

            {current && (
              <div className="guide-sched-sticky" role="region" aria-label="현재 일정 빠른 실행">
                <div className="guide-sched-sticky-info">
                  <strong>{current.item.title}</strong>
                  <small>
                    {current.arrived
                      ? current.meetingTime
                        ? `집결 ${current.meetingTime}${current.item.plannedDeparture ? ` · 출발 ${current.departureTime}` : ""}`
                        : `출발 ${current.departureTime}`
                      : `예정 도착 ${current.item.plannedArrival}`}
                  </small>
                </div>
                {current.arrived ? (
                  <>
                    {current.meetingTime && (
                      <button type="button" className="secondary" onClick={() => actions.onNotice("meeting", current)}>
                        집결 안내
                      </button>
                    )}
                    <button type="button" className="primary" onClick={() => actions.onFinish(current)}>
                      {finishLabel(current.item)}
                    </button>
                  </>
                ) : (
                  <button type="button" className="primary" onClick={() => actions.onArrive(current)}>
                    도착확인
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {timeChange && (
        <TimeChangeSheet
          view={timeChange}
          onClose={() => setTimeChange(null)}
          onSave={(departureTime, meetingTime) => saveTimeChange(timeChange, departureTime, meetingTime)}
        />
      )}
      {warning && vehicle && (
        <BoardingWarningSheet
          warning={warning}
          vehicle={vehicle}
          onClose={() => setWarning(null)}
          onOpenBoarding={() => actions.onBoarding(warning.view)}
          onForce={() => finish(warning.view)}
        />
      )}
    </>
  );
}

function finishLabel(item: GuideScheduleItem) {
  if (item.plannedDeparture) return "출발확인";
  return item.kind === "meeting" ? "집결 완료" : "일정 완료";
}

function describeRow(view: GuideScheduleView) {
  const { progress, item } = view;
  if (view.done) {
    return item.plannedDeparture ? `실제 출발 ${progress.actualDeparture}` : `완료 ${progress.actualDeparture}`;
  }
  const parts = [
    progress.actualArrival ? `실제 도착 ${progress.actualArrival}` : "",
    progress.operatingDeparture ? `운영 출발 ${progress.operatingDeparture}` : "",
    progress.freeStartedAt && view.meetingTime ? `${view.meetingTime}까지 집결` : "",
  ].filter(Boolean);
  return parts.join(" · ") || item.description || "";
}

function ScheduleBadges({ view }: { view: GuideScheduleView }) {
  const meta = GUIDE_SCHEDULE_STATUS_META[view.status];
  return (
    <span className="guide-sched-badges">
      <span className={`badge ${meta.badge}`}>
        {view.status === "delayed" ? `${view.delayMinutes}분 지연` : meta.label}
      </span>
      {view.done && view.delayMinutes > 0 && <span className="badge gray">+{view.delayMinutes}분</span>}
    </span>
  );
}

function ScheduleTimes({ view, large = false }: { view: GuideScheduleView; large?: boolean }) {
  const { item, progress } = view;
  const cells: { key: string; label: string; value: string; tone?: string; note?: string }[] = [];
  if (item.plannedArrival) {
    cells.push({ key: "pa", label: item.kind === "meeting" ? "예정 집결" : "예정 도착", value: item.plannedArrival });
    if (item.kind === "visit") {
      cells.push({
        key: "aa",
        label: "실제 도착",
        value: progress.actualArrival ?? "-",
        tone: progress.actualArrival ? "is-actual" : "",
        note: view.arrivalDelay > 0 ? `+${view.arrivalDelay}분` : "",
      });
    }
  }
  if (item.plannedDeparture) {
    cells.push({ key: "pd", label: "예정 출발", value: item.plannedDeparture });
    if (progress.operatingDeparture) {
      cells.push({
        key: "od",
        label: "운영 출발",
        value: progress.operatingDeparture,
        tone: "is-changed",
        note: view.delayMinutes > 0 && !view.done ? `${view.delayMinutes}분 지연` : "",
      });
    }
    cells.push({
      key: "ad",
      label: "실제 출발",
      value: progress.actualDeparture ?? "-",
      tone: progress.actualDeparture ? "is-actual" : "",
    });
  } else if (view.done) {
    cells.push({ key: "ad", label: "완료", value: progress.actualDeparture ?? "-", tone: "is-actual" });
  }
  if (item.freeMinutes) cells.push({ key: "free", label: "자유시간", value: `${item.freeMinutes}분` });
  if (view.meetingTime) {
    cells.push({
      key: "meet",
      label: "집결시간",
      value: view.meetingTime,
      tone: "is-meeting",
      note:
        progress.meetingTime && progress.meetingTime !== item.meetingTime ? `일정표 ${item.meetingTime ?? "-"}` : "",
    });
  }
  return (
    <dl className={`guide-sched-times ${large ? "is-large" : ""}`}>
      {cells.map((cell) => (
        <div key={cell.key} className={cell.tone}>
          <dt>{cell.label}</dt>
          <dd>
            {cell.value}
            {cell.note && <small>{cell.note}</small>}
          </dd>
        </div>
      ))}
      {view.meetingPlace && (
        <div className="is-place">
          <dt>집결장소</dt>
          <dd>
            <MapPin size={14} aria-hidden="true" />
            {view.meetingPlace}
          </dd>
        </div>
      )}
    </dl>
  );
}

function noticeKinds(view: GuideScheduleView): GuideScheduleNoticeKind[] {
  const { item } = view;
  return [
    ...(item.kind === "visit" ? (["arrival"] as const) : []),
    ...(item.freeMinutes ? (["free-time"] as const) : []),
    ...(view.meetingTime ? (["meeting"] as const) : []),
    ...(item.plannedDeparture ? (["departure-notice"] as const) : []),
    "schedule-change" as const,
  ];
}

function QuickNotices({ view, actions }: { view: GuideScheduleView; actions: ScheduleActions }) {
  return (
    <div className="guide-sched-quick">
      <span>
        빠른 고객안내 <small>고객소통 화면에서 내용을 확인한 뒤 발송합니다.</small>
      </span>
      <div>
        {noticeKinds(view).map((kind) => (
          <button type="button" key={kind} className="secondary" onClick={() => actions.onNotice(kind, view)}>
            {GUIDE_SCHEDULE_NOTICE_LABEL[kind]}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeChangeNotice({ view, actions }: { view: GuideScheduleView; actions: ScheduleActions }) {
  if (!view.progress.operatingDeparture || view.done) return null;
  return (
    <div className="guide-sched-change" role="note">
      <Clock3 size={16} aria-hidden="true" />
      <span>
        <b>
          예정 {view.item.plannedDeparture} → 운영 {view.progress.operatingDeparture}
          {view.delayMinutes > 0 ? ` · ${view.delayMinutes}분 지연` : ""}
        </b>
        <small>상품 일정표의 예정시간은 그대로 유지됩니다. 집결 {view.meetingTime || "-"}</small>
      </span>
      <button type="button" className="secondary" onClick={() => actions.onNotice("time-change", view)}>
        고객에게 변경안내
      </button>
      {view.delayMinutes > 0 && (
        <button type="button" className="secondary" onClick={() => actions.onRecordNote(view, "delay")}>
          지연 기록
        </button>
      )}
    </div>
  );
}

function BoardingPoints({
  departure,
  vehicle,
  view,
  actions,
}: {
  departure: GuideDeparture;
  vehicle: GuideVehicle;
  view: GuideScheduleView;
  actions: ScheduleActions;
}) {
  const boarding = getGuideScheduleBoardingPoints(departure, vehicle);
  return (
    <div className="guide-sched-points">
      <span>
        탑승지 일정 · {boarding.groupName || "탑승지 그룹 미선택"}
        <small>
          {boarding.groupName ? "운영배정에서 선택한 탑승지 그룹 순서" : "운영배정 그룹 미선택 · 고객 탑승지 기준"}
        </small>
      </span>
      {boarding.points.length === 0 ? (
        <p className="guide-sched-muted">표시할 탑승지가 없습니다.</p>
      ) : (
        <ol>
          {boarding.points.map((point, index) => (
            <li key={point.name}>
              <b>{index + 1}</b>
              <strong>{point.name}</strong>
              <span>{point.time}</span>
              <span>{point.count}명</span>
            </li>
          ))}
        </ol>
      )}
      <button type="button" className="secondary" onClick={() => actions.onBoarding(view)}>
        <Users size={14} aria-hidden="true" />
        탑승현황
      </button>
    </div>
  );
}

function CurrentScheduleCard({
  view,
  vehicle,
  departure,
  actions,
}: {
  view: GuideScheduleView;
  vehicle: GuideVehicle;
  departure: GuideDeparture;
  actions: ScheduleActions;
}) {
  const [editingMeeting, setEditingMeeting] = useState(false);
  const { item, progress } = view;
  const needsBoarding = Boolean(item.plannedDeparture && (item.boardingSegment || item.sampleUncheckedIds?.length));
  return (
    <section className={`panel guide-sched-current is-${view.status}`} aria-labelledby="guide-sched-current-title">
      <div className="guide-sched-current-head">
        <span className="guide-sched-eyebrow">{view.arrived ? "현재 일정" : "다음 일정 · 이동 중"}</span>
        <div className="guide-sched-current-title">
          <h2 id="guide-sched-current-title">{item.title}</h2>
          <ScheduleBadges view={view} />
        </div>
        {item.description && <p className="guide-sched-muted">{item.description}</p>}
      </div>

      <ScheduleTimes view={view} large />

      {progress.freeStartedAt && view.meetingTime && (
        <p className="guide-sched-free" role="status">
          <Timer size={18} aria-hidden="true" />
          <span>
            <b>{view.meetingTime}까지 집결해주세요.</b>
            <small>
              자유시간 {item.freeMinutes}분 · {progress.freeStartedAt} 시작 · {view.meetingPlace}
            </small>
          </span>
        </p>
      )}

      <TimeChangeNotice view={view} actions={actions} />

      {item.showBoardingPoints && (
        <BoardingPoints departure={departure} vehicle={vehicle} view={view} actions={actions} />
      )}

      <div className="guide-sched-actions">
        {!view.arrived ? (
          <button type="button" className="primary is-wide" onClick={() => actions.onArrive(view)}>
            <Flag size={16} aria-hidden="true" />
            도착확인
          </button>
        ) : (
          <>
            {item.freeMinutes && !progress.freeStartedAt ? (
              <button type="button" className="secondary" onClick={() => actions.onStartFree(view)}>
                <Timer size={15} aria-hidden="true" />
                자유시간 시작
              </button>
            ) : null}
            {item.plannedDeparture && (
              <button type="button" className="secondary" onClick={() => actions.onChangeTime(view)}>
                <Clock3 size={15} aria-hidden="true" />
                시간 변경
              </button>
            )}
            <button type="button" className="primary is-wide" onClick={() => actions.onFinish(view)}>
              <CheckCircle2 size={16} aria-hidden="true" />
              {finishLabel(item)}
            </button>
          </>
        )}
        <button type="button" className="secondary" onClick={() => setEditingMeeting((value) => !value)}>
          <Pencil size={14} aria-hidden="true" />
          집결 수정
        </button>
        {needsBoarding && !item.showBoardingPoints && (
          <button type="button" className="secondary" onClick={() => actions.onBoarding(view)}>
            <Users size={14} aria-hidden="true" />
            탑승현황
          </button>
        )}
      </div>

      {editingMeeting && (
        <MeetingEditor
          view={view}
          onCancel={() => setEditingMeeting(false)}
          onSave={(time, place) => {
            actions.onSaveMeeting(view, time, place);
            setEditingMeeting(false);
          }}
        />
      )}

      <QuickNotices view={view} actions={actions} />
    </section>
  );
}

function ScheduleDetail({
  view,
  vehicle,
  departure,
  isCurrent,
  noteCount,
  actions,
}: {
  view: GuideScheduleView;
  vehicle: GuideVehicle;
  departure: GuideDeparture;
  isCurrent: boolean;
  noteCount: number;
  actions: ScheduleActions;
}) {
  const [editingMeeting, setEditingMeeting] = useState(false);
  return (
    <div className="guide-sched-detail">
      <ScheduleTimes view={view} />
      {view.item.moveMinutes ? (
        <p className="guide-sched-muted">이전 일정에서 예상 이동 {formatGuideDuration(view.item.moveMinutes)}</p>
      ) : null}
      <TimeChangeNotice view={view} actions={actions} />
      {view.item.showBoardingPoints && (
        <BoardingPoints departure={departure} vehicle={vehicle} view={view} actions={actions} />
      )}
      {editingMeeting ? (
        <MeetingEditor
          view={view}
          onCancel={() => setEditingMeeting(false)}
          onSave={(time, place) => {
            actions.onSaveMeeting(view, time, place);
            setEditingMeeting(false);
          }}
        />
      ) : (
        <div className="guide-sched-detail-actions">
          <button type="button" className="secondary" onClick={() => setEditingMeeting(true)}>
            <Pencil size={14} aria-hidden="true" />
            집결시간 · 장소 수정
          </button>
          {!view.done && view.item.plannedDeparture && (
            <button type="button" className="secondary" onClick={() => actions.onChangeTime(view)}>
              <Clock3 size={14} aria-hidden="true" />
              시간 변경
            </button>
          )}
          <button type="button" className="secondary" onClick={() => actions.onRecordNote(view)}>
            <StickyNote size={14} aria-hidden="true" />
            특이사항 기록
          </button>
          {noteCount > 0 && (
            <button type="button" className="secondary" onClick={() => actions.onOpenNotes(view)}>
              운영기록 {noteCount}건
            </button>
          )}
          {isCurrent && <small>도착·출발 확인은 현재 일정 카드에서 진행합니다.</small>}
        </div>
      )}
      <MemoEditor view={view} onSave={(memo) => actions.onSaveMemo(view, memo)} />
      <QuickNotices view={view} actions={actions} />
    </div>
  );
}

function MeetingEditor({
  view,
  onCancel,
  onSave,
}: {
  view: GuideScheduleView;
  onCancel: () => void;
  onSave: (meetingTime: string, meetingPlace: string) => void;
}) {
  const [time, setTime] = useState(view.meetingTime);
  const [place, setPlace] = useState(view.meetingPlace);
  const departure = view.item.plannedDeparture ? view.departureTime : "";
  const error = !time
    ? "집결시간을 입력해 주세요."
    : departure && diffGuideMinutes(time, departure) > 0
      ? `집결시간은 출발시간(${departure})보다 늦을 수 없습니다.`
      : !place.trim()
        ? "집결장소를 입력해 주세요."
        : "";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (error) return;
    onSave(time, place.trim());
  };

  return (
    <form className="guide-sched-form" onSubmit={submit}>
      <div className="guide-sched-form-grid">
        <label>
          <span>집결시간</span>
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <label>
          <span>집결장소</span>
          <input
            type="text"
            value={place}
            maxLength={60}
            placeholder="예: 장금이파크 주차장 1호차 앞"
            onChange={(event) => setPlace(event.target.value)}
          />
        </label>
      </div>
      <p className={`guide-sched-form-msg ${error ? "is-error" : ""}`}>
        {error ||
          (departure
            ? `출발 ${departure} · 집결시간과 출발시간은 별도로 관리됩니다.`
            : "고객에게 안내할 집결시간과 장소입니다.")}
      </p>
      <div className="guide-sched-form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="primary" disabled={Boolean(error)}>
          저장
        </button>
      </div>
    </form>
  );
}

function MemoEditor({ view, onSave }: { view: GuideScheduleView; onSave: (memo: string) => void }) {
  const saved = view.progress.memo ?? "";
  const [memo, setMemo] = useState(saved);
  const changed = memo.trim() !== saved.trim();
  return (
    <label className="guide-sched-memo">
      <span>운영메모</span>
      <textarea
        rows={3}
        value={memo}
        maxLength={300}
        placeholder="예: 한방차 제공 완료 / 고객 1명 차량에서 대기"
        onChange={(event) => setMemo(event.target.value)}
      />
      <span className="guide-sched-memo-foot">
        <small>현재 호차 일정에만 저장됩니다. (SAMPLE · 새로고침 시 초기화)</small>
        <button type="button" className="secondary" disabled={!changed} onClick={() => onSave(memo.trim())}>
          메모 저장
        </button>
      </span>
    </label>
  );
}

function TimeChangeSheet({
  view,
  onClose,
  onSave,
}: {
  view: GuideScheduleView;
  onClose: () => void;
  onSave: (departureTime: string, meetingTime: string) => void;
}) {
  const planned = view.item.plannedDeparture ?? "";
  const gap = Math.max(0, diffGuideMinutes(planned, view.item.meetingTime)) || DEFAULT_MEETING_GAP;
  const [departureTime, setDepartureTime] = useState(view.departureTime);
  const [meetingTime, setMeetingTime] = useState(view.meetingTime || shiftGuideTime(view.departureTime, -gap));
  const [meetingTouched, setMeetingTouched] = useState(false);
  const delay = diffGuideMinutes(departureTime, planned);
  const error = !departureTime
    ? "변경할 출발시간을 입력해 주세요."
    : !meetingTime
      ? "집결시간을 입력해 주세요."
      : diffGuideMinutes(meetingTime, departureTime) > 0
        ? "집결시간은 출발시간보다 늦을 수 없습니다."
        : "";

  const changeDeparture = (value: string) => {
    setDepartureTime(value);
    if (!meetingTouched && value) setMeetingTime(shiftGuideTime(value, -gap));
  };

  return (
    <div className="modal-backdrop guide-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal guide-sheet-modal guide-sched-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-sched-time-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="guide-sched-time-title">출발시간 변경</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="guide-sheet-body">
          <dl className="guide-sheet-summary">
            <div>
              <dt>일정</dt>
              <dd>{view.item.title}</dd>
            </div>
            <div>
              <dt>예정 출발 (일정표)</dt>
              <dd>{planned}</dd>
            </div>
            <div>
              <dt>현재 운영시간</dt>
              <dd>{view.progress.operatingDeparture ?? "-"}</dd>
            </div>
          </dl>
          <label className="guide-sheet-field">
            <span>변경 출발시간</span>
            <input type="time" value={departureTime} onChange={(event) => changeDeparture(event.target.value)} />
          </label>
          <label className="guide-sheet-field">
            <span>집결시간</span>
            <input
              type="time"
              value={meetingTime}
              onChange={(event) => {
                setMeetingTouched(true);
                setMeetingTime(event.target.value);
              }}
            />
          </label>
          <p className={`guide-sched-form-msg ${error ? "is-error" : ""}`} role={error ? "alert" : undefined}>
            {error ||
              (departureTime === planned
                ? "예정시간과 같습니다. 저장하면 운영시간 변경이 해제됩니다."
                : `예정 ${planned} → 운영 ${departureTime}${delay > 0 ? ` · ${delay}분 지연` : delay < 0 ? ` · ${-delay}분 앞당김` : ""}`)}
          </p>
          <p className="guide-sheet-note">
            상품 일정표의 예정시간은 바뀌지 않고 운영시간으로 따로 표시됩니다. 이후 일정은 자동으로 다시 계산되지
            않습니다. 저장 후 [고객에게 변경안내]로 고객소통 화면에서 안내할 수 있습니다.
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          {view.progress.operatingDeparture && (
            <button type="button" className="secondary" onClick={() => onSave(planned, shiftGuideTime(planned, -gap))}>
              예정시간으로 되돌리기
            </button>
          )}
          <button
            type="button"
            className="primary"
            disabled={Boolean(error)}
            onClick={() => onSave(departureTime, meetingTime)}
          >
            변경 저장
          </button>
        </div>
      </div>
    </div>
  );
}

function BoardingWarningSheet({
  warning,
  vehicle,
  onClose,
  onOpenBoarding,
  onForce,
}: {
  warning: BoardingWarning;
  vehicle: GuideVehicle;
  onClose: () => void;
  onOpenBoarding: () => void;
  onForce: () => void;
}) {
  const { view, passengers } = warning;
  const shown = passengers.slice(0, UNCHECKED_NAME_LIMIT);
  return (
    <div className="modal-backdrop guide-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal guide-sheet-modal guide-sched-sheet"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="guide-sched-warning-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="guide-sched-warning-title">출발확인 · {view.item.title}</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="guide-sheet-body">
          <p className="ops-assign-notice is-warn" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              <b>탑승 미확인 고객이 {passengers.length}명 있습니다.</b>
              <small>
                {vehicle.name} 기준 ·{" "}
                {view.item.boardingSegment ? "탑승체크 기록 기준" : "SAMPLE 재탑승 상태 (탑승체크 연동 전)"}
              </small>
            </span>
          </p>
          <ul className="guide-sched-unchecked">
            {shown.map((passenger) => (
              <li key={passenger.id}>
                <strong>{passenger.name}</strong>
                <span>{getGuidePassengerPoint(passenger) || "탑승지 미지정"}</span>
              </li>
            ))}
            {passengers.length > shown.length && <li className="is-more">외 {passengers.length - shown.length}명</li>}
          </ul>
          <p className="guide-sheet-note">
            그래도 출발처리하면 실제 출발시간이 기록되고 일정이 완료됩니다. 탑승상태는 변경되지 않습니다.
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button type="button" className="secondary" onClick={onOpenBoarding}>
            탑승확인 보기
          </button>
          <button type="button" className="primary guide-danger-btn" onClick={onForce}>
            그래도 출발처리
          </button>
        </div>
      </div>
    </div>
  );
}
