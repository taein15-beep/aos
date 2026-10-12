"use client";

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Paperclip,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { GuideOperationPhaseBadge } from "@/components/guide/GuideOperationPhaseBadge";
import { ShareConfirmDialog, type ShareConfirmDialogState } from "@/components/products/ShareConfirmDialog";
import { useQueryParam } from "@/components/settlements/SettlementParts";
import {
  GUIDE_STAFF_ROLE_LABEL,
  formatGuideDepartureDate,
  getGuideLeadStaff,
  getGuideOperationPath,
  getGuideStaff,
  maskGuidePhone,
  type GuideDeparture,
} from "@/lib/admin/guide-operation-data";
import {
  findGuideCommTemplate,
  getGuideCommRows,
  getGuideCommunicationPath,
  saveGuideCommPreset,
  type GuideCommRow,
} from "@/lib/admin/guide-communication-data";
import {
  buildGuideScheduleNotice,
  buildGuideScheduleViews,
  diffGuideMinutes,
  getGuideSchedule,
  getGuideScheduleState,
  getGuideSchedulePath,
  getGuideVehiclePassengerCount,
  type GuideScheduleItem,
  type GuideScheduleState,
} from "@/lib/admin/guide-schedule-data";
import {
  GUIDE_LOST_ITEM_STATES,
  GUIDE_NOTE_ACTION_PRESETS,
  GUIDE_NOTE_ALL_VEHICLES,
  GUIDE_NOTE_CATEGORIES,
  GUIDE_NOTE_FILTERS,
  GUIDE_NOTE_IMPORTANCES,
  GUIDE_NOTE_IMPORTANCE_META,
  GUIDE_NOTE_STATUSES,
  GUIDE_NOTE_STATUS_BADGE,
  GUIDE_NOTE_TEMPLATES,
  GUIDE_VEHICLE_ISSUE_TYPES,
  createGuideNoteId,
  findGuideNoteTemplate,
  formatGuideNoteNow,
  getGuideNoteDefaultImportance,
  getGuideNoteInitialStatus,
  getGuideNotes,
  getGuideNotesPath,
  isGuideNoteOpenImportant,
  isGuideNoteProtected,
  matchesGuideNoteFilter,
  saveGuideNotes,
  summarizeGuideNotes,
  summarizeGuideNotesByCategory,
  type GuideNote,
  type GuideNoteCategory,
  type GuideNoteDetail,
  type GuideNoteFilter,
  type GuideNoteImportance,
  type GuideNoteStatus,
} from "@/lib/admin/guide-notes-data";
import { getOperationDeparture } from "@/lib/admin/operation-assignment-data";

const ALL = GUIDE_NOTE_ALL_VEHICLES;
const PICKER_RESULT_LIMIT = 8;

/** 작성 · 수정 화면에서 편집하는 값 */
type NoteDraft = Pick<
  GuideNote,
  | "category"
  | "importance"
  | "title"
  | "content"
  | "scheduleItemId"
  | "passengerIds"
  | "vehicleId"
  | "occurredAt"
  | "needsAdmin"
  | "attachments"
  | "detail"
> & { id?: string; createdAt?: string; createdBy?: string };

type Lookups = {
  departure: GuideDeparture;
  rows: GuideCommRow[];
  items: GuideScheduleItem[];
  rowOf: (passengerId: string) => GuideCommRow | undefined;
  scheduleTitle: (itemId: string) => string;
  vehicleName: (vehicleId: string) => string;
};

export default function GuideNotesPage() {
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
          <strong>운영메모 · 특이사항</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
    >
      {!departure ? (
        <main className="content member-web-detail-content guide-ops-content">
          <section className="panel member-web-detail-not-found">
            <strong>출발상품을 찾을 수 없습니다.</strong>
            <p>요청한 출발상품({departureKey || "-"})의 운영기록이 없습니다.</p>
            <button type="button" className="secondary" onClick={() => router.push("/reservations/guide-operations")}>
              <ArrowLeft size={15} />
              가이드 운영 목록으로
            </button>
          </section>
        </main>
      ) : (
        <GuideNotesBody
          key={departure.key}
          departure={departure}
          onBack={() => router.push(getGuideOperationPath(departure.key))}
          onNotify={notify}
        />
      )}
    </ProductAdminShell>
  );
}

function GuideNotesBody({
  departure,
  onBack,
  onNotify,
}: {
  departure: GuideDeparture;
  onBack: () => void;
  onNotify: (message: string) => void;
}) {
  const router = useRouter();
  const items = useMemo(() => getGuideSchedule(departure.key)?.items ?? [], [departure.key]);
  const scheduleState = useMemo(() => getGuideScheduleState(departure.key), [departure.key]);
  const rows = useMemo(() => getGuideCommRows(departure), [departure]);
  const leadStaff = getGuideLeadStaff(departure);
  const [viewerId, setViewerId] = useState(leadStaff?.id ?? departure.staff[0]?.id ?? "");
  const [notes, setNotes] = useState<GuideNote[]>(() => getGuideNotes(departure.key));
  const [composeParam, setComposeParam] = useQueryParam("compose", "");
  const [scheduleParam, setScheduleParam] = useQueryParam("schedule", "");
  const [templateParam, setTemplateParam] = useQueryParam("template", "");
  const [vehicleParam, setVehicleParam] = useQueryParam("vehicle", "");
  const [noteParam, setNoteParam] = useQueryParam("note", "");
  const [filter, setFilter] = useState<GuideNoteFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [vehicleFilter, setVehicleFilter] = useState<string>(ALL);
  const [scheduleFilterState, setScheduleFilter] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [editor, setEditor] = useState<NoteDraft | null>(null);
  const [editorSeq, setEditorSeq] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ShareConfirmDialogState | null>(null);

  const viewer = getGuideStaff(departure, viewerId);
  const viewerName = viewer?.name ?? departure.guideName;
  const isLead = viewer?.roles.includes("lead") ?? false;
  const ownVehicleId =
    departure.vehicles.find((item) => item.guideId === viewerId)?.id ?? departure.vehicles[0]?.id ?? "";
  const headerVehicle =
    departure.vehicles.find((item) => item.id === vehicleParam) ??
    departure.vehicles.find((item) => item.id === ownVehicleId) ??
    null;
  const headerGuide = headerVehicle ? getGuideStaff(departure, headerVehicle.guideId) : null;

  const lookups: Lookups = {
    departure,
    rows,
    items,
    rowOf: (passengerId) => rows.find((row) => row.passenger.id === passengerId),
    scheduleTitle: (itemId) => items.find((item) => item.id === itemId)?.title ?? "",
    vehicleName: (vehicleId) =>
      vehicleId === ALL ? "전체" : (departure.vehicles.find((item) => item.id === vehicleId)?.name ?? "-"),
  };

  const commit = (next: GuideNote[]) => {
    setNotes(next);
    saveGuideNotes(departure.key, next);
  };

  const buildDraft = ({
    template = "",
    scheduleItemId = "",
    vehicleId = "",
    content = "",
    title = "",
  }: {
    template?: string;
    scheduleItemId?: string;
    vehicleId?: string;
    content?: string;
    title?: string;
  }): NoteDraft => {
    const tpl = findGuideNoteTemplate(template);
    const category: GuideNoteCategory = tpl?.category ?? "일반메모";
    const importance: GuideNoteImportance = tpl?.importance ?? getGuideNoteDefaultImportance(category);
    const noteVehicle = departure.vehicles.some((item) => item.id === vehicleId) ? vehicleId : headerVehicle?.id || ALL;
    const item = items.find((value) => value.id === scheduleItemId);
    const detail: GuideNoteDetail = {};
    let draftTitle = title || tpl?.title || "";
    let occurredAt = item ? (item.plannedDeparture ?? item.plannedArrival ?? "") : "";
    if (category === "일정관련" && item) {
      Object.assign(detail, delayPrefill(scheduleState, noteVehicle, item));
      occurredAt = detail.plannedTime || occurredAt;
      const delay = diffGuideMinutes(detail.changedTime, detail.plannedTime);
      if (!draftTitle) draftTitle = delay > 0 ? `${item.title} 출발 ${delay}분 지연` : `${item.title} 일정 지연`;
    }
    if (category === "분실물") Object.assign(detail, { lostKeeper: `${viewerName} 가이드`, lostState: "보관중" });
    if (category === "차량") detail.vehicleIssue = "차량고장";
    return {
      category,
      importance,
      title: draftTitle,
      content,
      scheduleItemId: item ? item.id : "",
      passengerIds: [],
      vehicleId: noteVehicle,
      occurredAt,
      needsAdmin: importance !== "일반",
      attachments: [],
      detail,
    };
  };

  const autoDraft =
    composeParam === "1"
      ? buildDraft({ template: templateParam, scheduleItemId: scheduleParam, vehicleId: vehicleParam })
      : null;
  const activeDraft = editor ?? autoDraft;
  const scheduleFilter = scheduleFilterState ?? (composeParam ? ALL : scheduleParam || ALL);

  const openEditor = (draft: NoteDraft) => {
    setDetailId(null);
    setEditorSeq((value) => value + 1);
    setEditor(draft);
  };

  const closeEditor = () => {
    setEditor(null);
    if (composeParam) {
      setComposeParam("");
      setTemplateParam("");
      setScheduleParam("");
    }
  };

  const saveNote = (draft: NoteDraft) => {
    const now = formatGuideNoteNow();
    if (draft.id) {
      const next = notes.map((note) => {
        if (note.id !== draft.id) return note;
        const status: GuideNoteStatus =
          draft.needsAdmin && note.status === "기록"
            ? "확인대기"
            : !draft.needsAdmin && note.status === "확인대기"
              ? "기록"
              : note.status;
        return { ...note, ...draft, id: note.id, status, updatedAt: now, updatedBy: viewerName };
      });
      commit(next);
      closeEditor();
      setDetailId(draft.id);
      onNotify("운영기록을 수정했습니다.");
      return;
    }
    const note: GuideNote = {
      ...draft,
      id: createGuideNoteId(),
      occurredAt: draft.occurredAt || now,
      status: getGuideNoteInitialStatus(draft.needsAdmin),
      createdAt: now,
      createdBy: viewerName,
    };
    commit([note, ...notes]);
    closeEditor();
    onNotify(
      `운영기록을 저장했습니다. (${note.importance} · ${note.status}) 고객에게 메시지는 발송되지 않습니다. (SAMPLE · 새로고침 시 초기화)`,
    );
  };

  const changeStatus = (note: GuideNote, status: GuideNoteStatus) => {
    commit(
      notes.map((item) =>
        item.id === note.id ? { ...item, status, updatedAt: formatGuideNoteNow(), updatedBy: viewerName } : item,
      ),
    );
    onNotify(`처리상태를 '${status}'(으)로 변경했습니다.`);
  };

  const requestRemove = (note: GuideNote) => {
    if (isGuideNoteProtected(note)) {
      setDialog({
        title: "기록 취소",
        message:
          "확인필요 · 중요 · 사고/안전 기록은 삭제하지 않고 '기록 취소'로 남깁니다.\n취소된 기록은 목록 하단에 표시되며 현황 집계에서 제외됩니다.",
        confirmLabel: "기록 취소",
        details: [
          { label: "기록", value: note.title },
          { label: "중요도", value: note.importance },
          { label: "구분", value: note.category },
        ],
        onConfirm: () => {
          commit(
            notes.map((item) =>
              item.id === note.id
                ? { ...item, canceled: true, updatedAt: formatGuideNoteNow(), updatedBy: viewerName }
                : item,
            ),
          );
          setDialog(null);
          onNotify("기록을 취소 처리했습니다. (기록은 보관됩니다)");
        },
      });
      return;
    }
    setDialog({
      title: "운영메모 삭제",
      message: "일반 운영메모를 삭제합니다.\n삭제한 기록은 복구할 수 없습니다. (SAMPLE)",
      confirmLabel: "삭제",
      details: [{ label: "기록", value: note.title }],
      onConfirm: () => {
        commit(notes.filter((item) => item.id !== note.id));
        setDialog(null);
        setDetailId(null);
        onNotify("운영메모를 삭제했습니다.");
      },
    });
  };

  const restore = (note: GuideNote) => {
    commit(
      notes.map((item) =>
        item.id === note.id
          ? { ...item, canceled: false, updatedAt: formatGuideNoteNow(), updatedBy: viewerName }
          : item,
      ),
    );
    onNotify("기록 취소를 해제했습니다.");
  };

  /** 내부 운영기록과 고객 안내는 별개입니다. 기록 내용을 그대로 쓰지 않고 고객용 문구로 시작합니다. */
  const openNotice = (note: GuideNote) => {
    const vehicle = departure.vehicles.find((item) => item.id === note.vehicleId) ?? null;
    const item = items.find((value) => value.id === note.scheduleItemId);
    const view =
      vehicle && item
        ? buildGuideScheduleViews(items, scheduleState[vehicle.id] ?? {}, vehicle).find(
            (value) => value.item.id === item.id,
          )
        : undefined;
    let templateKey = "custom";
    let body = "";
    if (note.category === "일정관련" && note.detail.changedTime) {
      templateKey = "time-change";
      body = view
        ? buildGuideScheduleNotice("time-change", {
            ...view,
            item: { ...view.item, plannedDeparture: note.detail.plannedTime || view.item.plannedDeparture },
            progress: { ...view.progress, operatingDeparture: note.detail.changedTime },
          })
        : (findGuideCommTemplate(templateKey)?.body ?? "");
    } else if (note.category === "일정관련") {
      templateKey = "schedule-change";
      body = view
        ? buildGuideScheduleNotice("schedule-change", view)
        : (findGuideCommTemplate(templateKey)?.body ?? "");
    }
    const presetId = `note-${note.id}`;
    const passengerIds = note.passengerIds.length ? [...note.passengerIds] : undefined;
    saveGuideCommPreset(departure.key, presetId, {
      templateKey,
      body,
      source: `운영메모 · 특이사항 (${note.title})`,
      returnLabel: "운영메모 · 특이사항",
      returnPath: getGuideNotesPath(departure.key),
      passengerIds,
    });
    router.push(
      getGuideCommunicationPath(departure.key, templateKey, {
        vehicle: passengerIds || !vehicle ? "all" : vehicle.id,
        preset: presetId,
      }),
    );
  };

  const scopeNotes = notes.filter(
    (note) => vehicleFilter === ALL || note.vehicleId === vehicleFilter || note.vehicleId === ALL,
  );
  const summary = summarizeGuideNotes(scopeNotes);
  const categoryCounts = summarizeGuideNotesByCategory(scopeNotes);
  const term = keyword.trim().toLowerCase();
  const matchesKeyword = (note: GuideNote) => {
    if (!term) return true;
    const related = note.passengerIds.map(lookups.rowOf).filter((row): row is GuideCommRow => Boolean(row));
    return [
      note.title,
      note.content,
      ...related.map((row) => row.passenger.name),
      ...related.map((row) => row.group.reservationCode),
    ].some((value) => value.toLowerCase().includes(term));
  };
  const visible = scopeNotes
    .filter(
      (note) =>
        (note.canceled ? filter === "all" : matchesGuideNoteFilter(note, filter)) &&
        (categoryFilter === ALL || note.category === categoryFilter) &&
        (scheduleFilter === ALL || note.scheduleItemId === scheduleFilter) &&
        matchesKeyword(note),
    )
    .sort(
      (a, b) => Number(Boolean(a.canceled)) - Number(Boolean(b.canceled)) || b.occurredAt.localeCompare(a.occurredAt),
    );
  const important = scopeNotes
    .filter(isGuideNoteOpenImportant)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const filtered =
    filter !== "all" || categoryFilter !== ALL || scheduleFilter !== ALL || vehicleFilter !== ALL || Boolean(term);
  const detail = notes.find((note) => note.id === (detailId ?? noteParam)) ?? null;
  const closeDetail = () => {
    setDetailId(null);
    if (noteParam) setNoteParam("");
  };

  const scheduleMemos = departure.vehicles
    .filter((vehicle) => vehicleFilter === ALL || vehicle.id === vehicleFilter)
    .flatMap((vehicle) =>
      items
        .map((item) => ({ vehicle, item, memo: scheduleState[vehicle.id]?.[item.id]?.memo?.trim() ?? "" }))
        .filter((entry) => entry.memo),
    );

  const kpis: { key: GuideNoteFilter; label: string; value: number; tone: string; mobile?: boolean }[] = [
    { key: "all", label: "전체 기록", value: summary.total, tone: "", mobile: true },
    { key: "일반", label: "일반", value: summary.normal, tone: "is-muted" },
    { key: "확인필요", label: "확인필요", value: summary.check, tone: "is-warn", mobile: true },
    { key: "중요", label: "중요", value: summary.important, tone: "is-danger", mobile: true },
    { key: "처리완료", label: "처리완료", value: summary.done, tone: "is-success" },
  ];

  const resetFilters = () => {
    setFilter("all");
    setCategoryFilter(ALL);
    setVehicleFilter(ALL);
    setScheduleFilter(ALL);
    setKeyword("");
  };

  return (
    <>
      <main className="content member-web-detail-content guide-ops-content guide-notes-content">
        <section className="panel guide-ops-hero" aria-labelledby="guide-notes-title">
          <div className="guide-ops-hero-main">
            <p className="member-web-breadcrumb">예약관리 &gt; 가이드 운영 &gt; 운영메모 · 특이사항</p>
            <div className="guide-ops-hero-status">
              <GuideOperationPhaseBadge departure={departure} />
              <span className="guide-ops-code">{departure.productCode}</span>
            </div>
            <h1 id="guide-notes-title">{departure.productName}</h1>
            <dl className="guide-ops-hero-meta">
              <div className="is-date">
                <dt>출발일</dt>
                <dd>{formatGuideDepartureDate(departure.departureDate)}</dd>
              </div>
              <div>
                <dt>호차</dt>
                <dd>{headerVehicle?.name ?? "미등록"}</dd>
              </div>
              <div>
                <dt>담당가이드</dt>
                <dd>{headerGuide?.name ?? viewerName}</dd>
              </div>
              <div>
                <dt>고객</dt>
                <dd>
                  {headerVehicle
                    ? `${getGuideVehiclePassengerCount(departure, headerVehicle)}명`
                    : `${departure.totalPeople}명`}
                </dd>
              </div>
            </dl>
          </div>
          <div className="guide-ops-hero-actions guide-customers-hero-actions">
            <label className="guide-viewer-select">
              <span>화면 기준 (SAMPLE)</span>
              <select
                value={viewerId}
                onChange={(event) => {
                  setViewerId(event.target.value);
                  setVehicleParam("");
                }}
              >
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

        <section className="guide-ops-kpis guide-notes-kpis" aria-label="운영기록 현황 (누르면 필터)">
          {kpis.map((kpi) => (
            <button
              type="button"
              key={kpi.key}
              className={`member-web-detail-kpi guide-ops-kpi ${kpi.tone} ${filter === kpi.key ? "is-active" : ""} ${kpi.mobile ? "" : "is-desktop"}`}
              aria-pressed={filter === kpi.key}
              onClick={() => setFilter(kpi.key)}
            >
              <span>
                <small>{kpi.label}</small>
                <strong>{kpi.value}건</strong>
              </span>
            </button>
          ))}
        </section>

        <section className="panel guide-notes-quick" aria-labelledby="guide-notes-quick-title">
          <div className="guide-notes-quick-head">
            <h2 id="guide-notes-quick-title">빠른 기록</h2>
            <span>운영기록은 내부 기록입니다. 저장해도 고객에게 메시지가 발송되지 않습니다.</span>
            <button type="button" className="primary guide-notes-compose" onClick={() => openEditor(buildDraft({}))}>
              <Plus size={16} aria-hidden="true" />
              운영기록 작성
            </button>
          </div>
          <div className="guide-notes-templates">
            {GUIDE_NOTE_TEMPLATES.map((tpl) => (
              <button
                type="button"
                key={tpl.key}
                className={`secondary ${tpl.key === "accident" ? "is-accident" : ""} ${tpl.mobile ? "" : "is-desktop"}`}
                onClick={() => openEditor(buildDraft({ template: tpl.key }))}
              >
                {tpl.key === "accident" && <ShieldAlert size={14} aria-hidden="true" />}
                {tpl.label}
              </button>
            ))}
          </div>
        </section>

        {important.length > 0 && (
          <section className="panel guide-notes-important" aria-labelledby="guide-notes-important-title">
            <h2 id="guide-notes-important-title">
              <AlertTriangle size={16} aria-hidden="true" />
              미처리 중요 기록 <span className="badge danger">중요 {important.length}</span>
            </h2>
            <ul>
              {important.map((note) => (
                <li key={note.id}>
                  <button type="button" onClick={() => setDetailId(note.id)}>
                    <b>{note.occurredAt}</b>
                    <strong>{note.title}</strong>
                    <span>
                      {note.category} · {lookups.vehicleName(note.vehicleId)}
                    </span>
                    <span className={`badge ${GUIDE_NOTE_STATUS_BADGE[note.status]}`}>{note.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="panel guide-notes-list" aria-labelledby="guide-notes-list-title">
          <div className="guide-ops-section-head">
            <h2 id="guide-notes-list-title">운영기록</h2>
            <span>최근 발생시간 순 · 기록을 누르면 상세를 확인합니다.</span>
          </div>

          <div className="guide-customers-chips guide-notes-chips" role="group" aria-label="중요도 · 처리상태 필터">
            {GUIDE_NOTE_FILTERS.map((item) => (
              <button
                type="button"
                key={item.key}
                className={filter === item.key ? "is-active" : ""}
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                {item.label}{" "}
                <b>
                  {item.key === "all"
                    ? summary.total
                    : scopeNotes.filter((note) => !note.canceled && matchesGuideNoteFilter(note, item.key)).length}
                </b>
              </button>
            ))}
          </div>

          <div className="guide-notes-filters">
            <label className="guide-notes-search">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={keyword}
                placeholder="제목 · 내용 · 고객명 · 예약번호"
                aria-label="운영기록 검색"
                onChange={(event) => setKeyword(event.target.value)}
              />
            </label>
            <select
              value={categoryFilter}
              aria-label="구분"
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value={ALL}>구분 전체</option>
              {categoryCounts.map((item) => (
                <option key={item.category} value={item.category}>
                  {item.category} ({item.count})
                </option>
              ))}
            </select>
            <select value={vehicleFilter} aria-label="호차" onChange={(event) => setVehicleFilter(event.target.value)}>
              <option value={ALL}>호차 전체</option>
              {departure.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
            <select
              value={scheduleFilter}
              aria-label="관련 일정"
              onChange={(event) => setScheduleFilter(event.target.value)}
            >
              <option value={ALL}>관련 일정 전체</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            {filtered && (
              <button type="button" className="secondary" onClick={resetFilters}>
                필터 초기화
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="guide-customers-empty">
              <strong>{filtered ? "조건에 맞는 운영기록이 없습니다." : "등록된 운영기록이 없습니다."}</strong>
            </div>
          ) : (
            <>
              <div className="guide-customers-table-wrap guide-notes-table-wrap">
                <table className="guide-notes-table">
                  <thead>
                    <tr>
                      <th scope="col">발생시간</th>
                      <th scope="col">구분</th>
                      <th scope="col">중요도</th>
                      <th scope="col">제목</th>
                      <th scope="col">관련 일정</th>
                      <th scope="col">관련 고객</th>
                      <th scope="col">호차</th>
                      <th scope="col">작성자</th>
                      <th scope="col">처리상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((note) => (
                      <tr
                        key={note.id}
                        className={note.canceled ? "is-canceled" : ""}
                        onClick={() => setDetailId(note.id)}
                      >
                        <td className="is-time">{note.occurredAt}</td>
                        <td>{note.category}</td>
                        <td>
                          <ImportanceBadge importance={note.importance} />
                        </td>
                        <td className="is-title">
                          <button type="button" onClick={() => setDetailId(note.id)}>
                            {note.title}
                          </button>
                          {note.needsAdmin && !note.canceled && <small>⚠ 관리자 확인 필요</small>}
                          {note.attachments.length > 0 && (
                            <small>
                              <Paperclip size={11} aria-hidden="true" /> {note.attachments.length}
                            </small>
                          )}
                        </td>
                        <td>{lookups.scheduleTitle(note.scheduleItemId) || "-"}</td>
                        <td>{passengerLabel(note, lookups)}</td>
                        <td>{lookups.vehicleName(note.vehicleId)}</td>
                        <td>{note.createdBy}</td>
                        <td>
                          <StatusBadge note={note} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="guide-notes-cards">
                {visible.map((note) => (
                  <li key={note.id} className={note.canceled ? "is-canceled" : ""}>
                    <button type="button" onClick={() => setDetailId(note.id)}>
                      <span className="guide-notes-card-top">
                        <b>{note.occurredAt}</b>
                        <span>{note.category}</span>
                        <ImportanceBadge importance={note.importance} />
                        <StatusBadge note={note} />
                      </span>
                      <strong>{note.title}</strong>
                      <span className="guide-notes-card-meta">
                        {[
                          lookups.vehicleName(note.vehicleId),
                          lookups.scheduleTitle(note.scheduleItemId),
                          note.passengerIds.length ? passengerLabel(note, lookups) : "",
                          note.createdBy,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {note.needsAdmin && !note.canceled && <small>⚠ 관리자 확인 필요</small>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {scheduleMemos.length > 0 && (
          <section className="panel guide-notes-memos" aria-labelledby="guide-notes-memos-title">
            <div className="guide-ops-section-head">
              <h2 id="guide-notes-memos-title">일정 · 현장 운영 메모</h2>
              <span>일정 화면에서 남긴 일정별 메모입니다. 관리자 확인이 필요하면 운영기록으로 남겨 주세요.</span>
            </div>
            <ul>
              {scheduleMemos.map(({ vehicle, item, memo }) => (
                <li key={`${vehicle.id}-${item.id}`}>
                  <span>
                    <b>
                      {vehicle.name} · {item.title}
                    </b>
                    <small>{memo}</small>
                  </span>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      openEditor(
                        buildDraft({
                          scheduleItemId: item.id,
                          vehicleId: vehicle.id,
                          content: memo,
                          title: `${item.title} 운영메모`,
                        }),
                      )
                    }
                  >
                    운영기록으로 남기기
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => router.push(getGuideSchedulePath(departure.key, vehicle.id))}
                  >
                    <CalendarClock size={14} aria-hidden="true" />
                    일정
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="guide-notes-sticky">
          <button type="button" className="primary" onClick={() => openEditor(buildDraft({}))}>
            <Plus size={18} aria-hidden="true" />
            운영기록 작성
          </button>
        </div>
      </main>

      {activeDraft && (
        <NoteEditorSheet
          key={editor ? `edit-${editorSeq}` : "auto"}
          draft={activeDraft}
          lookups={lookups}
          scheduleState={scheduleState}
          isLead={isLead}
          onClose={closeEditor}
          onSave={saveNote}
        />
      )}
      {detail && !activeDraft && (
        <NoteDetailSheet
          note={detail}
          lookups={lookups}
          onClose={closeDetail}
          onStatus={(status) => changeStatus(detail, status)}
          onEdit={() => openEditor({ ...detail })}
          onNotice={() => openNotice(detail)}
          onRemove={() => requestRemove(detail)}
          onRestore={() => restore(detail)}
        />
      )}
      <ShareConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

function delayPrefill(state: GuideScheduleState, vehicleId: string, item: GuideScheduleItem): GuideNoteDetail {
  const progress = state[vehicleId]?.[item.id];
  return {
    plannedTime: item.plannedDeparture ?? item.plannedArrival ?? "",
    changedTime: progress?.operatingDeparture ?? progress?.actualDeparture ?? "",
  };
}

function passengerLabel(note: GuideNote, lookups: Lookups) {
  const names = note.passengerIds.map((id) => lookups.rowOf(id)?.passenger.name).filter(Boolean);
  if (!names.length) return "-";
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} 외 ${names.length - 2}명` : names.join(", ");
}

function ImportanceBadge({ importance }: { importance: GuideNoteImportance }) {
  return <span className={`badge ${GUIDE_NOTE_IMPORTANCE_META[importance].badge}`}>{importance}</span>;
}

function StatusBadge({ note }: { note: GuideNote }) {
  if (note.canceled) return <span className="badge gray">기록 취소</span>;
  return <span className={`badge ${GUIDE_NOTE_STATUS_BADGE[note.status]}`}>{note.status}</span>;
}

/* ---------------------------------------------------------------- 작성 · 수정 */

function NoteEditorSheet({
  draft,
  lookups,
  scheduleState,
  isLead,
  onClose,
  onSave,
}: {
  draft: NoteDraft;
  lookups: Lookups;
  scheduleState: GuideScheduleState;
  isLead: boolean;
  onClose: () => void;
  onSave: (draft: NoteDraft) => void;
}) {
  const { departure, items } = lookups;
  const [form, setForm] = useState<NoteDraft>(draft);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const isEdit = Boolean(draft.id);
  const isAccident = form.category === "사고/안전";

  const update = (patch: Partial<NoteDraft>) => setForm((value) => ({ ...value, ...patch }));
  const updateDetail = (patch: Partial<GuideNoteDetail>) =>
    setForm((value) => ({ ...value, detail: { ...value.detail, ...patch } }));

  const changeCategory = (category: GuideNoteCategory) => {
    const importance = category === "사고/안전" ? "중요" : form.importance;
    const detail: GuideNoteDetail = { ...form.detail };
    if (category === "분실물" && !detail.lostState) detail.lostState = "보관중";
    if (category === "차량" && !detail.vehicleIssue) detail.vehicleIssue = "차량고장";
    const item = items.find((value) => value.id === form.scheduleItemId);
    if (category === "일정관련" && item && !detail.plannedTime) {
      Object.assign(detail, delayPrefill(scheduleState, form.vehicleId, item));
    }
    update({ category, importance, needsAdmin: importance !== "일반" || form.needsAdmin, detail });
  };

  const changeImportance = (importance: GuideNoteImportance) =>
    update({ importance, needsAdmin: importance !== "일반" });

  const changeSchedule = (scheduleItemId: string) => {
    const item = items.find((value) => value.id === scheduleItemId);
    const patch: Partial<NoteDraft> = { scheduleItemId };
    if (item && form.category === "일정관련") {
      patch.detail = { ...form.detail, ...delayPrefill(scheduleState, form.vehicleId, item) };
      if (!form.occurredAt) patch.occurredAt = patch.detail.plannedTime;
    }
    update(patch);
  };

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const names = Array.from(event.target.files ?? []).map((file) => file.name);
    if (names.length) update({ attachments: Array.from(new Set([...form.attachments, ...names])) });
    event.target.value = "";
  };

  const delay = diffGuideMinutes(form.detail.changedTime, form.detail.plannedTime);
  const errors = {
    title: !form.title.trim() ? "제목을 입력해 주세요." : "",
    content: !form.content.trim() ? `${contentLabel(form.category)}을 입력해 주세요.` : "",
  };
  const hasError = Object.values(errors).some(Boolean);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasError) return;
    onSave({ ...form, title: form.title.trim(), content: form.content.trim() });
  };

  const vehicleName = lookups.vehicleName(form.vehicleId);

  return (
    <div className="modal-backdrop guide-sheet-backdrop" role="presentation" onClick={onClose}>
      <form
        className={`modal guide-sheet-modal guide-notes-editor ${isAccident ? "is-accident" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-notes-editor-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
        noValidate
      >
        <div className="modal-head">
          <h3 id="guide-notes-editor-title">{isEdit ? "운영기록 수정" : "운영기록 작성"}</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="guide-sheet-body">
          {isAccident && (
            <p className="guide-notes-accident-note" role="note">
              <ShieldAlert size={16} aria-hidden="true" />
              <span>
                <b>사고/안전 기록</b>
                <small>현장에서 발생한 사실과 조치사항만 기록합니다. 의료·법률 판단은 기록하지 않습니다.</small>
              </span>
            </p>
          )}

          <div className="guide-notes-form-grid">
            <label className="guide-sheet-field">
              <span>
                구분 <em>*</em>
              </span>
              <select
                value={form.category}
                onChange={(event) => changeCategory(event.target.value as GuideNoteCategory)}
              >
                {GUIDE_NOTE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="guide-sheet-field">
              <span>발생시간</span>
              <input
                type="time"
                value={form.occurredAt}
                onChange={(event) => update({ occurredAt: event.target.value })}
              />
              <small>
                작성시간 {isEdit ? `${draft.createdAt ?? "-"} · ${draft.createdBy ?? ""}` : "저장 시 자동 기록"}
              </small>
            </label>
          </div>

          <fieldset className="guide-notes-importance">
            <legend>
              중요도 <em>*</em>
            </legend>
            {GUIDE_NOTE_IMPORTANCES.map((importance) => (
              <label key={importance} className={form.importance === importance ? "is-checked" : ""}>
                <input
                  type="radio"
                  name="guide-note-importance"
                  checked={form.importance === importance}
                  onChange={() => changeImportance(importance)}
                />
                <span>
                  <ImportanceBadge importance={importance} />
                  <small>{GUIDE_NOTE_IMPORTANCE_META[importance].description}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="guide-sheet-field">
            <span>
              제목 <em>*</em>
            </span>
            <input
              type="text"
              value={form.title}
              maxLength={60}
              aria-invalid={submitted && Boolean(errors.title)}
              placeholder="예: 장금이파크 출발 20분 지연"
              onChange={(event) => update({ title: event.target.value })}
            />
            {submitted && errors.title && <small className="is-error">{errors.title}</small>}
          </label>

          <label className="guide-sheet-field">
            <span>
              {contentLabel(form.category)} <em>*</em>
            </span>
            <textarea
              rows={4}
              value={form.content}
              maxLength={1000}
              aria-invalid={submitted && Boolean(errors.content)}
              placeholder={
                form.category === "민원" ? "예: 식사 제공시간 지연" : "현장에서 발생한 사실을 기록해 주세요."
              }
              onChange={(event) => update({ content: event.target.value })}
            />
            {submitted && errors.content && <small className="is-error">{errors.content}</small>}
          </label>

          <CategoryFields
            form={form}
            departure={departure}
            delay={delay}
            onDetail={updateDetail}
            onVehicle={(vehicleId) => update({ vehicleId })}
            isLead={isLead}
          />

          <div className="guide-notes-form-grid">
            <label className="guide-sheet-field">
              <span>관련 일정</span>
              <select value={form.scheduleItemId} onChange={(event) => changeSchedule(event.target.value)}>
                <option value="">선택 안 함</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.plannedArrival ?? item.plannedDeparture} {item.title}
                  </option>
                ))}
              </select>
            </label>
            {form.category !== "차량" && (
              <label className="guide-sheet-field">
                <span>관련 호차</span>
                {isLead ? (
                  <select value={form.vehicleId} onChange={(event) => update({ vehicleId: event.target.value })}>
                    <option value={ALL}>전체</option>
                    {departure.vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={vehicleName} readOnly aria-readonly="true" />
                )}
              </label>
            )}
          </div>

          <CustomerPicker
            label={form.category === "민원" ? "민원 고객" : "관련 고객"}
            rows={lookups.rows}
            vehicleId={form.vehicleId}
            selected={form.passengerIds}
            onChange={(passengerIds) => update({ passengerIds })}
          />

          <label className={`guide-notes-admin ${form.needsAdmin ? "is-checked" : ""}`}>
            <input
              type="checkbox"
              checked={form.needsAdmin}
              onChange={(event) => update({ needsAdmin: event.target.checked })}
            />
            <span>
              <b>⚠ 관리자 확인 필요</b>
              <small>체크하면 &apos;확인대기&apos; 상태로 저장됩니다.</small>
            </span>
          </label>

          <div className="guide-notes-attach">
            <span>첨부자료</span>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              className="guide-notes-file"
              aria-label="사진/파일 첨부"
              onChange={addFiles}
            />
            <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
              <Paperclip size={14} aria-hidden="true" />
              사진/파일 첨부
            </button>
            {form.attachments.length > 0 && (
              <ul>
                {form.attachments.map((name) => (
                  <li key={name}>
                    <Paperclip size={12} aria-hidden="true" />
                    {name}
                    <button
                      type="button"
                      aria-label={`${name} 첨부 삭제`}
                      onClick={() => update({ attachments: form.attachments.filter((value) => value !== name) })}
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <small>SAMPLE · 파일명만 표시되며 실제 업로드는 되지 않습니다.</small>
          </div>

          <p className="guide-sheet-note">
            운영기록은 내부 기록입니다. 저장해도 고객에게 메시지가 발송되지 않으며, 고객 안내는 기록 상세의 [고객 안내
            작성]에서 별도로 작성합니다.
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="primary">
            {isEdit ? "수정 저장" : "기록 저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

function contentLabel(category: GuideNoteCategory) {
  if (category === "민원") return "민원 내용";
  if (category === "사고/안전") return "상황";
  return "내용";
}

function CategoryFields({
  form,
  departure,
  delay,
  isLead,
  onDetail,
  onVehicle,
}: {
  form: NoteDraft;
  departure: GuideDeparture;
  delay: number;
  isLead: boolean;
  onDetail: (patch: Partial<GuideNoteDetail>) => void;
  onVehicle: (vehicleId: string) => void;
}) {
  const { detail, category } = form;
  if (category === "차량") {
    return (
      <div className="guide-notes-extra">
        <span>차량 문제 정보</span>
        <div className="guide-notes-form-grid">
          <label className="guide-sheet-field">
            <span>차량</span>
            <select value={form.vehicleId} disabled={!isLead} onChange={(event) => onVehicle(event.target.value)}>
              <option value={ALL}>전체</option>
              {departure.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
          </label>
          <label className="guide-sheet-field">
            <span>유형</span>
            <select
              value={detail.vehicleIssue ?? "차량고장"}
              onChange={(event) => onDetail({ vehicleIssue: event.target.value as GuideNoteDetail["vehicleIssue"] })}
            >
              {GUIDE_VEHICLE_ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    );
  }
  if (category === "분실물") {
    return (
      <div className="guide-notes-extra">
        <span>분실물 정보</span>
        <div className="guide-notes-form-grid">
          <label className="guide-sheet-field">
            <span>물품명</span>
            <input
              type="text"
              value={detail.lostItem ?? ""}
              placeholder="예: 검정색 지갑"
              onChange={(event) => onDetail({ lostItem: event.target.value })}
            />
          </label>
          <label className="guide-sheet-field">
            <span>발견장소</span>
            <input
              type="text"
              value={detail.lostFoundAt ?? ""}
              placeholder="예: 1호차 15번 좌석"
              onChange={(event) => onDetail({ lostFoundAt: event.target.value })}
            />
          </label>
          <label className="guide-sheet-field">
            <span>보관자</span>
            <input
              type="text"
              value={detail.lostKeeper ?? ""}
              onChange={(event) => onDetail({ lostKeeper: event.target.value })}
            />
          </label>
          <label className="guide-sheet-field">
            <span>처리상태</span>
            <select
              value={detail.lostState ?? "보관중"}
              onChange={(event) => onDetail({ lostState: event.target.value as GuideNoteDetail["lostState"] })}
            >
              {GUIDE_LOST_ITEM_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    );
  }
  if (category === "일정관련") {
    return (
      <div className="guide-notes-extra">
        <span>일정 지연 정보 (선택)</span>
        <div className="guide-notes-form-grid is-three">
          <label className="guide-sheet-field">
            <span>기존 예정시간</span>
            <input
              type="time"
              value={detail.plannedTime ?? ""}
              onChange={(event) => onDetail({ plannedTime: event.target.value })}
            />
          </label>
          <label className="guide-sheet-field">
            <span>실제/변경시간</span>
            <input
              type="time"
              value={detail.changedTime ?? ""}
              onChange={(event) => onDetail({ changedTime: event.target.value })}
            />
          </label>
          <div className="guide-sheet-field">
            <span>지연</span>
            <strong className={`guide-notes-delay ${delay > 0 ? "is-delay" : ""}`}>
              {detail.plannedTime && detail.changedTime
                ? delay > 0
                  ? `${delay}분 지연`
                  : delay < 0
                    ? `${-delay}분 앞당김`
                    : "변경 없음"
                : "-"}
            </strong>
          </div>
        </div>
        <label className="guide-sheet-field">
          <span>사유</span>
          <input
            type="text"
            value={detail.delayReason ?? ""}
            placeholder="예: 고객 집결 지연"
            onChange={(event) => onDetail({ delayReason: event.target.value })}
          />
        </label>
      </div>
    );
  }
  if (category === "고객관련" || category === "민원" || category === "사고/안전") {
    return (
      <div className={`guide-notes-extra ${category === "사고/안전" ? "is-accident" : ""}`}>
        <span>{category === "사고/안전" ? "사고/안전 상세" : "현장 조치"}</span>
        {category === "사고/안전" && (
          <label className="guide-sheet-field">
            <span>발생장소</span>
            <input
              type="text"
              value={detail.place ?? ""}
              placeholder="예: 선운사 주차장 계단"
              onChange={(event) => onDetail({ place: event.target.value })}
            />
          </label>
        )}
        <label className="guide-sheet-field">
          <span>현장 조치{category === "민원" ? "내용" : ""}</span>
          <textarea
            rows={2}
            value={detail.action ?? ""}
            placeholder={category === "민원" ? "예: 식당 확인 후 고객에게 상황 설명" : "예: 고객 연락 후 10분 대기"}
            onChange={(event) => onDetail({ action: event.target.value })}
          />
        </label>
        {category === "고객관련" && (
          <div className="guide-notes-action-chips" role="group" aria-label="현장 조치 빠른 입력">
            {GUIDE_NOTE_ACTION_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() =>
                  onDetail({
                    action: detail.action?.includes(preset)
                      ? detail.action
                      : [detail.action, preset].filter(Boolean).join(", "),
                  })
                }
              >
                + {preset}
              </button>
            ))}
          </div>
        )}
        {category === "사고/안전" && (
          <label className="guide-sheet-field">
            <span>추가 확인사항</span>
            <textarea
              rows={2}
              value={detail.followUp ?? ""}
              placeholder="관리자가 추가로 확인해야 할 사실관계"
              onChange={(event) => onDetail({ followUp: event.target.value })}
            />
          </label>
        )}
      </div>
    );
  }
  return null;
}

function CustomerPicker({
  label,
  rows,
  vehicleId,
  selected,
  onChange,
}: {
  label: string;
  rows: GuideCommRow[];
  vehicleId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const digits = term.replace(/\D/g, "");
  const results = term
    ? rows
        .filter(
          (row) =>
            row.passenger.name.toLowerCase().includes(term) ||
            row.group.reservationCode.toLowerCase().includes(term) ||
            (digits.length >= 3 &&
              [row.group.phone, row.ownPhone].some((phone) => phone.replace(/\D/g, "").includes(digits))),
        )
        .sort((a, b) => Number(b.vehicle?.id === vehicleId) - Number(a.vehicle?.id === vehicleId))
        .slice(0, PICKER_RESULT_LIMIT)
    : [];
  const selectedRows = selected
    .map((id) => rows.find((row) => row.passenger.id === id))
    .filter((row): row is GuideCommRow => Boolean(row));
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);

  return (
    <div className="guide-notes-picker">
      <span>
        {label} {selected.length > 0 && <b>{selected.length}명</b>}
      </span>
      <label className="guide-notes-search">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          value={query}
          placeholder="고객명 · 예약번호 · 연락처 일부"
          aria-label={`${label} 검색`}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {term && (
        <ul className="guide-notes-picker-results">
          {results.length === 0 ? (
            <li className="is-empty">검색 결과가 없습니다.</li>
          ) : (
            results.map((row) => (
              <li key={row.passenger.id}>
                <label className={selected.includes(row.passenger.id) ? "is-checked" : ""}>
                  <input
                    type="checkbox"
                    checked={selected.includes(row.passenger.id)}
                    onChange={() => toggle(row.passenger.id)}
                  />
                  <span>
                    <strong>{row.passenger.name}</strong>
                    <small>
                      {row.group.reservationCode} · {row.vehicle?.name ?? "미배정"} · {row.point || "탑승지 미지정"} ·{" "}
                      {maskGuidePhone(row.ownPhone || row.group.phone)}
                    </small>
                  </span>
                </label>
              </li>
            ))
          )}
        </ul>
      )}
      {selectedRows.length > 0 && (
        <ul className="guide-notes-picked">
          {selectedRows.map((row) => (
            <li key={row.passenger.id}>
              <span>
                <strong>{row.passenger.name}</strong>
                <small>
                  {row.group.reservationCode} · {row.vehicle?.name ?? "미배정"} · {row.point || "탑승지 미지정"}
                </small>
              </span>
              <button
                type="button"
                aria-label={`${row.passenger.name} 선택 해제`}
                onClick={() => toggle(row.passenger.id)}
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- 상세 */

function NoteDetailSheet({
  note,
  lookups,
  onClose,
  onStatus,
  onEdit,
  onNotice,
  onRemove,
  onRestore,
}: {
  note: GuideNote;
  lookups: Lookups;
  onClose: () => void;
  onStatus: (status: GuideNoteStatus) => void;
  onEdit: () => void;
  onNotice: () => void;
  onRemove: () => void;
  onRestore: () => void;
}) {
  const related = note.passengerIds.map(lookups.rowOf).filter((row): row is GuideCommRow => Boolean(row));
  const { detail } = note;
  const delay = diffGuideMinutes(detail.changedTime, detail.plannedTime);
  const extra: { label: string; value: string }[] = [];
  if (note.category === "차량") extra.push({ label: "차량 문제 유형", value: detail.vehicleIssue ?? "-" });
  if (note.category === "분실물") {
    extra.push(
      { label: "물품명", value: detail.lostItem || "-" },
      { label: "발견장소", value: detail.lostFoundAt || "-" },
      { label: "보관자", value: detail.lostKeeper || "-" },
      { label: "분실물 처리상태", value: detail.lostState ?? "-" },
    );
  }
  if (note.category === "일정관련" && (detail.plannedTime || detail.changedTime)) {
    extra.push(
      { label: "기존 예정시간", value: detail.plannedTime || "-" },
      { label: "실제/변경시간", value: detail.changedTime || "-" },
      { label: "지연", value: delay > 0 ? `${delay}분 지연` : delay < 0 ? `${-delay}분 앞당김` : "-" },
      { label: "사유", value: detail.delayReason || "-" },
    );
  }
  if (note.category === "사고/안전") extra.push({ label: "발생장소", value: detail.place || "-" });
  if (detail.action)
    extra.push({ label: note.category === "민원" ? "현장 조치내용" : "현장 조치", value: detail.action });
  if (note.category === "사고/안전") extra.push({ label: "추가 확인사항", value: detail.followUp || "-" });

  return (
    <div className="modal-backdrop guide-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal guide-sheet-modal guide-notes-detail ${note.category === "사고/안전" ? "is-accident" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-notes-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="guide-notes-detail-title">운영기록 상세</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="guide-sheet-body">
          <div className="guide-notes-detail-title">
            <span className="guide-notes-detail-badges">
              <span className="guide-notes-cat">{note.category}</span>
              <ImportanceBadge importance={note.importance} />
              <StatusBadge note={note} />
            </span>
            <strong>{note.title}</strong>
          </div>
          {note.needsAdmin && !note.canceled && (
            <p className="ops-assign-notice is-warn" role="note">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <b>⚠ 관리자 확인 필요</b>
                <small>관리자 확인 후 처리상태를 변경합니다.</small>
              </span>
            </p>
          )}
          <dl className="guide-sheet-summary guide-notes-detail-meta">
            <div>
              <dt>발생시간</dt>
              <dd>{note.occurredAt}</dd>
            </div>
            <div>
              <dt>작성시간</dt>
              <dd>{note.createdAt}</dd>
            </div>
            <div>
              <dt>작성자</dt>
              <dd>{note.createdBy}</dd>
            </div>
            <div>
              <dt>관련 일정</dt>
              <dd>{lookups.scheduleTitle(note.scheduleItemId) || "-"}</dd>
            </div>
            <div>
              <dt>호차</dt>
              <dd>{lookups.vehicleName(note.vehicleId)}</dd>
            </div>
            <div>
              <dt>최근 수정</dt>
              <dd>{note.updatedAt ? `${note.updatedAt} · ${note.updatedBy}` : "-"}</dd>
            </div>
          </dl>
          <div className="guide-notes-detail-block">
            <span>{contentLabel(note.category)}</span>
            <p>{note.content}</p>
          </div>
          {extra.length > 0 && (
            <dl className={`guide-notes-extra-view ${note.category === "사고/안전" ? "is-accident" : ""}`}>
              {extra.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="guide-notes-detail-block">
            <span>
              {note.category === "민원" ? "민원 고객" : "관련 고객"} {related.length > 0 && `${related.length}명`}
            </span>
            {related.length === 0 ? (
              <p className="guide-sheet-note">관련 고객 없음</p>
            ) : (
              <ul className="guide-notes-picked">
                {related.map((row) => (
                  <li key={row.passenger.id}>
                    <span>
                      <strong>{row.passenger.name}</strong>
                      <small>
                        {row.group.reservationCode} · {row.vehicle?.name ?? "미배정"} · {row.point || "탑승지 미지정"}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="guide-notes-detail-block">
            <span>첨부자료</span>
            {note.attachments.length === 0 ? (
              <p className="guide-sheet-note">첨부자료 없음</p>
            ) : (
              <ul className="guide-notes-files">
                {note.attachments.map((name) => (
                  <li key={name}>
                    <Paperclip size={12} aria-hidden="true" />
                    {name}
                    <small>SAMPLE</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <label className="guide-sheet-field">
            <span>처리상태</span>
            <select
              value={note.status}
              disabled={note.canceled}
              onChange={(event) => onStatus(event.target.value as GuideNoteStatus)}
            >
              {GUIDE_NOTE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <p className="guide-sheet-note">
            내부 운영기록입니다. 고객에게 안내가 필요하면 [고객 안내 작성]에서 고객용 문구로 별도 작성합니다.
          </p>
        </div>
        <div className="modal-actions guide-notes-detail-actions">
          {note.canceled ? (
            <button type="button" className="secondary" onClick={onRestore}>
              기록 취소 해제
            </button>
          ) : (
            <button type="button" className="secondary guide-notes-remove" onClick={onRemove}>
              <Trash2 size={14} aria-hidden="true" />
              {isGuideNoteProtected(note) ? "기록 취소" : "삭제"}
            </button>
          )}
          <button type="button" className="secondary" onClick={onEdit} disabled={note.canceled}>
            <Pencil size={14} aria-hidden="true" />
            수정
          </button>
          <button type="button" className="primary" onClick={onNotice}>
            <StickyNote size={14} aria-hidden="true" />
            고객 안내 작성
          </button>
        </div>
      </div>
    </div>
  );
}
