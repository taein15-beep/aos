"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  Eye,
  History,
  MapPin,
  MessageCircle,
  RotateCcw,
  Send,
  X,
  Zap,
} from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { GuideOperationPhaseBadge } from "@/components/guide/GuideOperationPhaseBadge";
import { ShareConfirmDialog, type ShareConfirmDialogState } from "@/components/products/ShareConfirmDialog";
import { useQueryParam } from "@/components/settlements/SettlementParts";
import {
  GUIDE_STAFF_ROLE_LABEL,
  formatGuideDepartureDate,
  getGuideDefaultVehicleFilter,
  getGuideLeadStaff,
  getGuideOperationPath,
  getGuideStaff,
  getGuideVehicleBoardingGroup,
  maskGuidePhone,
  type GuideDeparture,
  type GuideVehicle,
  formatTestReferenceNow,
} from "@/lib/admin/guide-operation-data";
import {
  GUIDE_CHAT_TEMPLATE_KEY,
  GUIDE_COMM_TEMPLATES,
  GUIDE_CONTACT_STATUS_META,
  GUIDE_MESSAGE_PLACEHOLDERS,
  GUIDE_MESSAGE_VARIABLES,
  buildGuideContactTargets,
  buildGuideMessageVariables,
  createGuideMessageBatchId,
  findGuideCommTemplate,
  formatGuideSentAt,
  getGuideCommRows,
  getGuideContactHistory,
  getGuideCommPreset,
  getGuideContactStatus,
  getGuideMessageBatches,
  getGuideTargetPoints,
  getGuideTargetVehicles,
  renderGuideMessage,
  resolveGuideContact,
  saveGuideMessageBatches,
  simulateGuideSend,
  summarizeGuideContacts,
  type GuideCommRow,
  type GuideContactTarget,
  type GuideMessageBatch,
} from "@/lib/admin/guide-communication-data";
import {
  findGuideChatRoom,
  getGuideChatInviteStatus,
  getGuideChatRoomLabel,
  getGuideChatRoomPath,
  getGuideChatScopes,
  getGuideChatState,
  getGuideTargetChatRoom,
  type GuideChatInviteStatus,
  type GuideChatState,
} from "@/lib/admin/guide-chatroom-data";
import { getOperationDeparture } from "@/lib/admin/operation-assignment-data";

const ALL = "all";
const UNASSIGNED = "unassigned";
const POINT_NONE = "__none";
const DEFAULT_TEMPLATE = "day-before";
const COMPOSE_SECTION_ID = "guide-comm-compose";
const RESULT_SECTION_ID = "guide-comm-result";

function formatNow() {
  return formatTestReferenceNow();
}

const scrollToSection = (id: string) =>
  window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

export default function GuideCommunicationPage() {
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
          <strong>고객소통</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
    >
      {!departure ? (
        <main className="content member-web-detail-content guide-ops-content">
          <section className="panel member-web-detail-not-found">
            <strong>출발상품을 찾을 수 없습니다.</strong>
            <p>요청한 출발상품({departureKey || "-"})의 고객소통 정보가 없습니다.</p>
            <button type="button" className="secondary" onClick={() => router.push("/reservations")}>
              <ArrowLeft size={15} />
              예약목록으로
            </button>
          </section>
        </main>
      ) : (
        <GuideCommunicationBody
          key={departure.key}
          departure={departure}
          onBack={() => router.push(getGuideOperationPath(departure.key))}
          onNotify={notify}
        />
      )}
    </ProductAdminShell>
  );
}

function GuideCommunicationBody({
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
  const chatState = useMemo(() => getGuideChatState(departure.key), [departure.key]);
  const leadStaff = getGuideLeadStaff(departure);
  const [viewerId, setViewerId] = useState(leadStaff?.id ?? departure.staff[0]?.id ?? "");
  const [vehicleParam, setVehicleParam] = useQueryParam("vehicle", ALL);
  const [templateParam] = useQueryParam("template", DEFAULT_TEMPLATE);
  const [roomParam] = useQueryParam("room", "");
  const [presetParam] = useQueryParam("preset", "");
  const [point, setPoint] = useState(ALL);
  const [includeCompanion, setIncludeCompanion] = useState(false);
  /** null = 아직 직접 선택하지 않음. 안내방 관리에서 진입하면 해당 안내방 대상 고객을 기본 선택합니다. */
  const [selectedState, setSelectedState] = useState<string[] | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [chosenTemplate, setChosenTemplate] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [fallback, setFallback] = useState(true);
  const [batches, setBatches] = useState<GuideMessageBatch[]>(() => getGuideMessageBatches(departure.key));
  const [resultBatchId, setResultBatchId] = useState<string | null>(null);
  const [previewPhone, setPreviewPhone] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ShareConfirmDialogState | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const hasUnassigned = rows.some((row) => !row.vehicle);
  const vehicleFilter =
    vehicleParam === ALL ||
    (vehicleParam === UNASSIGNED && hasUnassigned) ||
    departure.vehicles.some((vehicle) => vehicle.id === vehicleParam)
      ? vehicleParam
      : ALL;
  const selectedVehicle = departure.vehicles.find((vehicle) => vehicle.id === vehicleFilter) ?? null;
  const selectedGroup = getGuideVehicleBoardingGroup(departure, selectedVehicle);
  const viewer = getGuideStaff(departure, viewerId);

  const inVehicle = (row: GuideCommRow) =>
    vehicleFilter === ALL ? true : vehicleFilter === UNASSIGNED ? !row.vehicle : row.vehicle?.id === vehicleFilter;
  const scopeRows = rows.filter(inVehicle);

  /** 선택 호차의 탑승지 그룹 순서를 우선 사용하고, 그룹에 없는 탑승지는 뒤에 붙입니다. */
  const pointOrder = Array.from(
    new Set([
      ...(vehicleFilter === ALL
        ? departure.vehicles.flatMap((vehicle) => getGuideVehicleBoardingGroup(departure, vehicle)?.points ?? [])
        : (selectedGroup?.points ?? [])
      ).map((item) => item.name),
      ...scopeRows.map((row) => row.point).filter(Boolean),
    ]),
  );
  const pointCount = (name: string) => scopeRows.filter((row) => row.point === name).length;
  const noPointCount = scopeRows.filter((row) => !row.point).length;
  const activePoint = point === ALL || point === POINT_NONE || pointOrder.includes(point) ? point : ALL;
  const matchesPoint = (row: GuideCommRow) =>
    activePoint === ALL ? true : activePoint === POINT_NONE ? !row.point : row.point === activePoint;
  const visibleRows = scopeRows.filter(matchesPoint);
  const visibleIds = visibleRows.map((row) => row.passenger.id);

  const linkedRoom = roomParam ? findGuideChatRoom(chatState, roomParam) : null;
  const preset = presetParam ? getGuideCommPreset(departure.key, presetParam) : null;
  const presetPassengerIds = preset?.passengerIds?.length ? preset.passengerIds : null;
  const defaultSelected = presetPassengerIds
    ? scopeRows.filter((row) => presetPassengerIds.includes(row.passenger.id)).map((row) => row.passenger.id)
    : linkedRoom?.active || preset
      ? scopeRows.map((row) => row.passenger.id)
      : [];
  const selected = selectedState ?? defaultSelected;
  const setSelected = (next: string[] | ((value: string[]) => string[])) =>
    setSelectedState((value) => (typeof next === "function" ? next(value ?? defaultSelected) : next));

  const scopeSummary = summarizeGuideContacts(departure, batches, scopeRows, includeCompanion);
  const selectedRows = rows.filter((row) => selected.includes(row.passenger.id));
  const selection = buildGuideContactTargets(selectedRows, includeCompanion);

  const vehicleLabel = selectedVehicle?.name ?? (vehicleFilter === UNASSIGNED ? "호차 미배정" : "전체 호차");
  const pointLabel = activePoint === ALL ? "전체" : activePoint === POINT_NONE ? "탑승지 미지정" : activePoint;
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const targetLabel = [
    vehicleLabel,
    activePoint === ALL ? "" : pointLabel,
    allVisibleSelected && selected.length === visibleIds.length ? "전체" : `선택 ${selection.selectedCount}명`,
  ]
    .filter(Boolean)
    .join(" · ");

  const templateKey = chosenTemplate ?? (findGuideCommTemplate(templateParam) ? templateParam : DEFAULT_TEMPLATE);
  const template = findGuideCommTemplate(templateKey) ?? GUIDE_COMM_TEMPLATES[0];
  const presetBody = preset && preset.templateKey === template.key ? preset.body : null;
  const baseBody = presetBody ?? template.body;
  const body = draft ?? baseBody;
  const edited = draft !== null && draft !== baseBody;

  const isChatTemplate = template.key === GUIDE_CHAT_TEMPLATE_KEY;
  const usesChatLink = body.includes("{안내방링크}");
  const chatLinkFor = (target: GuideContactTarget) => getGuideTargetChatRoom(chatState, target)?.link ?? "";
  const chatStatusOf = (row: GuideCommRow) => getGuideChatInviteStatus(departure, chatState, batches, row);
  const missingLinkTargets = usesChatLink ? selection.targets.filter((target) => !chatLinkFor(target)) : [];
  const alreadyInvited = isChatTemplate ? selectedRows.filter((row) => chatStatusOf(row).kind === "sent") : [];
  const reinviteSelected = selectedRows.filter((row) => chatStatusOf(row).kind === "reinvite");
  const chatRoomLabel = linkedRoom
    ? getGuideChatRoomLabel(departure, linkedRoom.scope)
    : chatState.mode === "all"
      ? "전체 고객 안내방"
      : "호차별 안내방 (고객 호차 기준)";
  const unregisteredChatScopes = getGuideChatScopes(departure, chatState.mode).filter(
    (item) => !findGuideChatRoom(chatState, item.roomId)?.active,
  );

  const toggleIds = (ids: string[], checked: boolean) =>
    setSelected((value) =>
      checked ? Array.from(new Set([...value, ...ids])) : value.filter((id) => !ids.includes(id)),
    );

  const resetSelection = () => {
    setSelected([]);
    setExpanded([]);
  };

  const changeVehicle = (next: string) => {
    setVehicleParam(next);
    setPoint(ALL);
    resetSelection();
  };

  const changeViewer = (staffId: string) => {
    setViewerId(staffId);
    changeVehicle(getGuideDefaultVehicleFilter(departure, staffId));
  };

  const changePoint = (next: string) => {
    setPoint(next);
    resetSelection();
  };

  const applyTemplate = (key: string) => {
    setChosenTemplate(key);
    setDraft(null);
  };

  const selectTemplate = (key: string, scroll = false) => {
    const next = findGuideCommTemplate(key);
    if (!next) return;
    const go = () => {
      applyTemplate(key);
      if (scroll) scrollToSection(COMPOSE_SECTION_ID);
    };
    if (key === templateKey && !edited) {
      if (scroll) scrollToSection(COMPOSE_SECTION_ID);
      return;
    }
    if (!edited) {
      go();
      return;
    }
    setDialog({
      title: "템플릿 변경",
      message: `작성 중인 메시지가 있습니다.\n'${next.label}' 템플릿으로 바꾸면 작성한 내용이 사라집니다.`,
      confirmLabel: "템플릿 변경",
      onConfirm: () => {
        setDialog(null);
        go();
      },
    });
  };

  const insertVariable = (variable: string) => {
    const element = bodyRef.current;
    const start = element?.selectionStart ?? body.length;
    const end = element?.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${variable}${body.slice(end)}`;
    setDraft(next);
    window.requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + variable.length, start + variable.length);
    });
  };

  const validateSend = () => {
    if (!selection.selectedCount) {
      onNotify("발송대상 고객을 먼저 선택해 주세요.");
      return false;
    }
    if (!selection.targets.length) {
      onNotify("선택한 고객 중 발송 가능한 연락처가 없습니다.");
      return false;
    }
    if (!body.trim()) {
      onNotify("메시지 내용을 입력해 주세요.");
      return false;
    }
    const blank = GUIDE_MESSAGE_PLACEHOLDERS.find((item) => body.includes(item));
    if (blank) {
      onNotify(`메시지의 빈칸 ${blank}을(를) 입력한 뒤 발송해 주세요.`);
      bodyRef.current?.focus();
      return false;
    }
    if (missingLinkTargets.length) {
      onNotify(
        `안내방 링크가 등록되지 않은 연락처 ${missingLinkTargets.length}건이 있습니다. 안내방 관리에서 링크를 먼저 등록해 주세요.`,
      );
      return false;
    }
    return true;
  };

  const openPreview = () => {
    const pool = selection.targets.length
      ? selection.targets
      : buildGuideContactTargets(visibleRows, includeCompanion).targets;
    if (!pool.length) {
      onNotify("미리보기할 수 있는 연락처가 없습니다.");
      return;
    }
    if (!body.trim()) {
      onNotify("메시지 내용을 입력해 주세요.");
      return;
    }
    setPreviewPhone(pool[0].phone);
  };

  const saveBatches = (next: GuideMessageBatch[]) => {
    setBatches(next);
    saveGuideMessageBatches(departure.key, next);
  };

  const pointBreakdown = (list: GuideCommRow[]) => {
    const counts = new Map<string, number>();
    list.forEach((row) =>
      counts.set(row.point || "탑승지 미지정", (counts.get(row.point || "탑승지 미지정") ?? 0) + 1),
    );
    return Array.from(counts.entries())
      .map(([name, count]) => `${name} ${count}명`)
      .join(" / ");
  };

  const send = () => {
    const results = simulateGuideSend(selection.targets, fallback).map((result, index) => {
      const room = isChatTemplate ? getGuideTargetChatRoom(chatState, selection.targets[index]) : null;
      return room ? { ...result, chatRoomId: room.id } : result;
    });
    const batch: GuideMessageBatch = {
      id: createGuideMessageBatchId(),
      sentAt: formatNow(),
      templateKey: template.key,
      templateLabel: template.label,
      targetLabel,
      vehicleLabel,
      pointLabel,
      fallback,
      sender: viewer?.name ?? departure.guideName,
      results,
    };
    saveBatches([batch, ...batches]);
    setResultBatchId(batch.id);
    setSelected([]);
    setDialog(null);
    const failed = results.filter((item) => item.status === "failed").length;
    onNotify(
      `${results.length}건 발송요청 · 성공 ${results.length - failed}건 · 실패 ${failed}건 (SAMPLE · 실제 발송 없음)`,
    );
    scrollToSection(RESULT_SECTION_ID);
  };

  const requestSend = () => {
    if (!validateSend()) return;
    setPreviewPhone(null);
    setDialog({
      title: "고객 안내 발송",
      message: [
        `실제 발송 연락처 ${selection.targets.length}건으로 안내를 발송합니다.`,
        "같은 번호로 묶인 고객에게는 한 번만 발송됩니다. (SAMPLE · 실제 발송되지 않음)",
        alreadyInvited.length
          ? `이미 안내방 참여 안내가 발송된 고객 ${alreadyInvited.length}명이 포함되어 있습니다. 다시 발송할 수 있습니다.`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      confirmLabel: `${selection.targets.length}건 발송`,
      details: [
        { label: "대상", value: targetLabel },
        { label: "선택 고객", value: `${selection.selectedCount}명` },
        { label: "실제 발송 연락처", value: `${selection.targets.length}건` },
        ...(selection.duplicateCount ? [{ label: "중복 제외", value: `${selection.duplicateCount}건` }] : []),
        ...(selection.noContact.length
          ? [{ label: "연락처 없음", value: `${selection.noContact.length}명 (발송 제외)` }]
          : []),
        { label: "탑승지", value: pointBreakdown(selectedRows) },
        { label: "템플릿", value: template.label },
        ...(usesChatLink ? [{ label: "안내방", value: chatRoomLabel }] : []),
        ...(alreadyInvited.length
          ? [{ label: "이미 안내", value: `${alreadyInvited.length}명 · 이미 안내방 참여 안내가 발송된 고객입니다.` }]
          : []),
        { label: "발송수단", value: "알림톡" },
        { label: "실패 시", value: fallback ? "SMS/LMS 대체발송" : "대체발송 안 함" },
      ],
      onConfirm: send,
    });
  };

  const resultBatch = batches.find((batch) => batch.id === resultBatchId) ?? null;

  const retryFailed = (batch: GuideMessageBatch) => {
    const failed = batch.results.filter((item) => item.status === "failed");
    if (!failed.length) return;
    setDialog({
      title: "실패건 다시 발송",
      message: `발송에 실패한 ${failed.length}건을 다시 발송합니다. (SAMPLE · 실제 발송되지 않음)`,
      confirmLabel: `${failed.length}건 다시 발송`,
      details: failed.map((item) => ({ label: item.ownerName, value: maskGuidePhone(item.phone) })),
      onConfirm: () => {
        const targets: GuideContactTarget[] = failed.map((item) => ({
          phone: item.phone,
          ownerName: item.ownerName,
          rows: rows.filter((row) => item.passengerIds.includes(row.passenger.id)),
        }));
        const retry: GuideMessageBatch = {
          ...batch,
          id: createGuideMessageBatchId(),
          sentAt: formatNow(),
          templateLabel: `${batch.templateLabel} (재발송)`,
          targetLabel: `${batch.targetLabel} · 실패건`,
          sender: viewer?.name ?? departure.guideName,
          results: simulateGuideSend(targets, batch.fallback, true).map((result, index) =>
            failed[index].chatRoomId ? { ...result, chatRoomId: failed[index].chatRoomId } : result,
          ),
          retryOf: batch.id,
        };
        saveBatches([retry, ...batches]);
        setResultBatchId(retry.id);
        setDialog(null);
        onNotify(`실패건 ${failed.length}건을 다시 발송했습니다. (SAMPLE)`);
      },
    });
  };

  const vehicleTabs = [
    { key: ALL, label: "전체", count: rows.length },
    ...departure.vehicles.map((vehicle) => ({
      key: vehicle.id,
      label: vehicle.name,
      count: rows.filter((row) => row.vehicle?.id === vehicle.id).length,
    })),
    ...(hasUnassigned
      ? [{ key: UNASSIGNED, label: "호차 미배정", count: rows.filter((row) => !row.vehicle).length }]
      : []),
  ];

  const kpis = [
    { key: "people", label: "전체 고객", value: `${scopeSummary.people}명`, tone: "" },
    { key: "contacts", label: "안내대상 연락처", value: `${scopeSummary.contacts}건`, tone: "is-pending" },
    { key: "sent", label: "발송완료", value: `${scopeSummary.sent}건`, tone: "is-success" },
    {
      key: "unsent",
      label: "미발송",
      value: `${scopeSummary.unsent}건`,
      tone: scopeSummary.unsent > 0 ? "is-warn" : "is-success",
    },
    {
      key: "failed",
      label: "발송실패",
      value: `${scopeSummary.failed}건`,
      tone: scopeSummary.failed > 0 ? "is-danger" : "is-muted",
    },
  ];

  const previewTargets = selection.targets.length
    ? selection.targets
    : buildGuideContactTargets(visibleRows, includeCompanion).targets;
  const previewTarget = previewTargets.find((item) => item.phone === previewPhone) ?? null;

  const canSend = selection.targets.length > 0 && body.trim() !== "";

  return (
    <>
      <main className="content member-web-detail-content guide-ops-content guide-comm-content">
        <section className="panel guide-ops-hero" aria-labelledby="guide-comm-title">
          <div className="guide-ops-hero-main">
            <p className="member-web-breadcrumb">예약관리 &gt; 가이드 운영 &gt; 고객소통</p>
            <div className="guide-ops-hero-status">
              <GuideOperationPhaseBadge departure={departure} />
              <span className="guide-ops-code">{departure.productCode}</span>
            </div>
            <h1 id="guide-comm-title">{departure.productName}</h1>
            <dl className="guide-ops-hero-meta">
              <div className="is-date">
                <dt>출발일</dt>
                <dd>{formatGuideDepartureDate(departure.departureDate)}</dd>
              </div>
              {selectedVehicle ? (
                <>
                  <div>
                    <dt>담당가이드</dt>
                    <dd>{getGuideStaff(departure, selectedVehicle.guideId)?.name ?? "미지정"}</dd>
                  </div>
                  <div>
                    <dt>호차</dt>
                    <dd>{selectedVehicle.name}</dd>
                  </div>
                  <div>
                    <dt>탑승지 그룹</dt>
                    <dd>{selectedGroup?.name ?? "미선택"}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>총괄가이드</dt>
                    <dd>{leadStaff?.name ?? departure.guideName}</dd>
                  </div>
                  <div>
                    <dt>호차</dt>
                    <dd>{vehicleFilter === UNASSIGNED ? "호차 미배정" : `전체 ${departure.vehicles.length}대`}</dd>
                  </div>
                </>
              )}
            </dl>
            {selectedVehicle ? (
              <p className="guide-comm-route">
                <MapPin size={14} aria-hidden="true" />
                <span>운행 탑승지</span>
                <b>
                  {selectedGroup
                    ? selectedGroup.points.map((item) => item.name).join(" → ")
                    : "운영배정에서 탑승지 그룹 미선택"}
                </b>
              </p>
            ) : (
              vehicleFilter === ALL && (
                <ul className="guide-comm-fleet" aria-label="호차별 운영정보">
                  {departure.vehicles.map((vehicle) => (
                    <FleetItem
                      key={vehicle.id}
                      departure={departure}
                      vehicle={vehicle}
                      onSelect={() => changeVehicle(vehicle.id)}
                    />
                  ))}
                </ul>
              )
            )}
          </div>
          <div className="guide-ops-hero-actions guide-customers-hero-actions">
            <label className="guide-viewer-select">
              <span>화면 기준 (SAMPLE)</span>
              <select value={viewerId} onChange={(event) => changeViewer(event.target.value)}>
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

        <section className="guide-ops-kpis" aria-label={`${vehicleLabel} 고객소통 현황`}>
          {kpis.map((kpi) => (
            <article className={`member-web-detail-kpi guide-ops-kpi ${kpi.tone}`} key={kpi.key}>
              <span>
                <small>{kpi.label}</small>
                <strong>{kpi.value}</strong>
              </span>
            </article>
          ))}
        </section>
        <p className="guide-comm-kpi-note">
          {vehicleLabel} 기준 · 안내대상 연락처는 {includeCompanion ? "대표 + 동행자 개별 연락처" : "대표 연락처"}를
          중복 제거한 건수입니다. 가족이 대표 연락처 하나를 쓰면 탑승객 4명이어도 1건으로 계산합니다.
        </p>

        <section className="panel guide-comm-quick" aria-labelledby="guide-comm-quick-title">
          <h2 id="guide-comm-quick-title">
            <Zap size={16} aria-hidden="true" />
            빠른 현장공지
          </h2>
          <div className="guide-comm-quick-actions">
            {GUIDE_COMM_TEMPLATES.filter((item) => item.quickLabel).map((item) => (
              <button
                type="button"
                key={item.key}
                className={`secondary ${item.urgent ? "is-urgent" : ""} ${templateKey === item.key ? "is-active" : ""}`}
                onClick={() => selectTemplate(item.key, true)}
              >
                {item.quickLabel}
              </button>
            ))}
          </div>
        </section>

        <div className="guide-comm-layout">
          <section className="panel guide-comm-targets" aria-labelledby="guide-comm-targets-title">
            <div className="guide-ops-section-head">
              <h2 id="guide-comm-targets-title">발송대상</h2>
              <span>호차·탑승지를 고른 뒤 고객을 선택합니다. 연락처는 마스킹되어 표시됩니다.</span>
            </div>

            <div className="guide-vehicle-tabs" role="tablist" aria-label="호차 필터">
              {vehicleTabs.map((tab) => (
                <button
                  type="button"
                  role="tab"
                  key={tab.key}
                  aria-selected={vehicleFilter === tab.key}
                  className={vehicleFilter === tab.key ? "is-active" : ""}
                  onClick={() => changeVehicle(tab.key)}
                >
                  <strong>{tab.label}</strong>
                  <span>{tab.count}명</span>
                </button>
              ))}
            </div>

            <div className="guide-comm-filter-row">
              <div className="guide-customers-chips" role="group" aria-label="탑승지 필터">
                <button
                  type="button"
                  className={activePoint === ALL ? "is-active" : ""}
                  aria-pressed={activePoint === ALL}
                  onClick={() => changePoint(ALL)}
                >
                  전체 <b>{scopeRows.length}</b>
                </button>
                {pointOrder.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className={activePoint === name ? "is-active" : ""}
                    aria-pressed={activePoint === name}
                    onClick={() => changePoint(name)}
                  >
                    {name} <b>{pointCount(name)}</b>
                  </button>
                ))}
                {noPointCount > 0 && (
                  <button
                    type="button"
                    className={`is-unchecked ${activePoint === POINT_NONE ? "is-active" : ""}`}
                    aria-pressed={activePoint === POINT_NONE}
                    onClick={() => changePoint(POINT_NONE)}
                  >
                    탑승지 미지정 <b>{noPointCount}</b>
                  </button>
                )}
              </div>
              <label className="guide-comm-toggle">
                <input
                  type="checkbox"
                  checked={includeCompanion}
                  onChange={(event) => setIncludeCompanion(event.target.checked)}
                />
                <span>동행자 개별 연락처 포함</span>
              </label>
            </div>
            {selectedVehicle && !selectedGroup && (
              <p className="ops-assign-notice is-warn" role="note">
                <AlertTriangle size={16} aria-hidden="true" />
                <span>
                  <b>{selectedVehicle.name}의 탑승지 그룹이 선택되지 않았습니다.</b>
                  <small>운영배정에서 지정된 고객 탑승지를 기준으로 표시합니다.</small>
                </span>
              </p>
            )}

            <div className="guide-comm-select-bar">
              <label>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => toggleIds(visibleIds, event.target.checked)}
                  aria-label="표시된 고객 전체 선택"
                />
                <span>
                  표시된 고객 전체 선택 <b>{visibleRows.length}명</b>
                </span>
              </label>
              {selected.length > 0 && (
                <button type="button" className="secondary" onClick={resetSelection}>
                  선택 해제
                </button>
              )}
            </div>

            {visibleRows.length === 0 ? (
              <div className="guide-customers-empty">
                <strong>조건에 맞는 고객이 없습니다.</strong>
              </div>
            ) : (
              <>
                <div className="guide-customers-table-wrap guide-comm-table-wrap">
                  <table className="guide-comm-table">
                    <thead>
                      <tr>
                        <th scope="col" className="is-check" aria-label="선택" />
                        <th scope="col">고객명</th>
                        <th scope="col">구분</th>
                        <th scope="col">예약번호</th>
                        <th scope="col">호차</th>
                        <th scope="col">탑승지</th>
                        <th scope="col">연락처</th>
                        <th scope="col">연락가능</th>
                        <th scope="col">최근 안내상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row) => (
                        <TargetRow
                          key={row.passenger.id}
                          row={row}
                          batches={batches}
                          chatStatus={chatStatusOf(row)}
                          showChatSent={isChatTemplate}
                          includeCompanion={includeCompanion}
                          visibleRows={visibleRows}
                          selected={selected}
                          open={expanded.includes(row.passenger.id)}
                          onToggleIds={toggleIds}
                          onToggleOpen={() =>
                            setExpanded((value) =>
                              value.includes(row.passenger.id)
                                ? value.filter((id) => id !== row.passenger.id)
                                : [...value, row.passenger.id],
                            )
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="guide-comm-cards">
                  {visibleRows.map((row) => (
                    <TargetCard
                      key={row.passenger.id}
                      row={row}
                      batches={batches}
                      chatStatus={chatStatusOf(row)}
                      showChatSent={isChatTemplate}
                      includeCompanion={includeCompanion}
                      visibleRows={visibleRows}
                      selected={selected}
                      onToggleIds={toggleIds}
                    />
                  ))}
                </ul>
              </>
            )}
          </section>

          <section
            className="panel guide-comm-compose"
            id={COMPOSE_SECTION_ID}
            aria-labelledby="guide-comm-compose-title"
          >
            <div className="guide-ops-section-head">
              <h2 id="guide-comm-compose-title">안내 메시지</h2>
              <span>템플릿을 고르고 내용을 확인한 뒤 발송합니다. 실제 발송은 되지 않습니다.</span>
            </div>

            {preset && (
              <div className="guide-comm-chat-banner" role="note">
                <CalendarClock size={16} aria-hidden="true" />
                <span>
                  <b>{preset.source}에서 작성한 안내입니다.</b>
                  <small>
                    {presetPassengerIds ? `관련 고객 ${defaultSelected.length}명` : `${vehicleLabel} 고객`}이
                    선택되었습니다. 내용과 대상을 확인한 뒤 발송해 주세요.
                    {presetBody !== null ? "" : " (선택한 템플릿은 작성된 안내와 다릅니다)"}
                  </small>
                </span>
                <button type="button" className="secondary" onClick={() => router.push(preset.returnPath)}>
                  {preset.returnLabel}
                </button>
              </div>
            )}

            {(isChatTemplate || usesChatLink) && (
              <div className="guide-comm-chat-banner" role="note">
                <MessageCircle size={16} aria-hidden="true" />
                <span>
                  <b>안내방: {chatRoomLabel}</b>
                  <small>
                    {linkedRoom
                      ? `${linkedRoom.name} · ${linkedRoom.link}`
                      : "{안내방링크}에는 고객에게 해당하는 안내방 링크가 들어갑니다."}
                  </small>
                  {unregisteredChatScopes.length > 0 && (
                    <small className="is-warn">
                      링크 미등록: {unregisteredChatScopes.map((item) => item.label).join(", ")}
                    </small>
                  )}
                </span>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => router.push(getGuideChatRoomPath(departure.key))}
                >
                  안내방 관리
                </button>
              </div>
            )}

            <dl className="guide-comm-summary" aria-label="발송대상 요약">
              <div>
                <dt>선택 고객</dt>
                <dd>{selection.selectedCount}명</dd>
              </div>
              <div className="is-primary">
                <dt>실제 발송 연락처</dt>
                <dd>{selection.targets.length}건</dd>
              </div>
              <div>
                <dt>중복 제외</dt>
                <dd>{selection.duplicateCount}건</dd>
              </div>
              <div className={selection.noContact.length ? "is-warn" : ""}>
                <dt>연락처 없음</dt>
                <dd>{selection.noContact.length}명</dd>
              </div>
            </dl>
            <p className="guide-comm-summary-note">
              {selection.selectedCount === 0
                ? "발송대상 고객을 선택해 주세요."
                : [
                    `선택 ${selection.selectedCount}명 중 ${selection.targets.length}건으로 발송합니다.`,
                    selection.duplicateCount
                      ? `${selection.duplicateCount}명은 같은 연락처(대표 연락처 등)로 함께 안내되어 중복 발송하지 않습니다.`
                      : "",
                    selection.noContact.length
                      ? `연락처 없음: ${selection.noContact.map((row) => row.passenger.name).join(", ")} (발송 제외)`
                      : "",
                    alreadyInvited.length
                      ? `이미 안내방 참여 안내가 발송된 고객 ${alreadyInvited.length}명이 포함되어 있습니다. (재발송 가능)`
                      : "",
                    reinviteSelected.length ? `안내방 재안내 필요 ${reinviteSelected.length}명 포함.` : "",
                    missingLinkTargets.length ? `안내방 링크 미등록 연락처 ${missingLinkTargets.length}건.` : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
            </p>

            <div className="guide-comm-templates" role="group" aria-label="빠른 안내 템플릿">
              {GUIDE_COMM_TEMPLATES.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={`guide-ops-template ${item.urgent ? "is-urgent" : ""} ${templateKey === item.key ? "is-active" : ""}`}
                  aria-pressed={templateKey === item.key}
                  onClick={() => selectTemplate(item.key)}
                >
                  <Send size={15} aria-hidden="true" />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </button>
              ))}
            </div>

            <label className="guide-comm-body">
              <span>
                메시지 내용{" "}
                <small>
                  {template.label}
                  {edited ? " · 수정됨" : ""}
                </small>
              </span>
              <textarea
                ref={bodyRef}
                value={body}
                rows={11}
                placeholder="안내할 내용을 입력해 주세요."
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>
            <div className="guide-comm-vars">
              <span>변수 넣기</span>
              {GUIDE_MESSAGE_VARIABLES.map((variable) => (
                <button type="button" key={variable} onClick={() => insertVariable(variable)}>
                  {variable}
                </button>
              ))}
              {edited && (
                <button type="button" className="is-reset" onClick={() => applyTemplate(template.key)}>
                  <RotateCcw size={12} aria-hidden="true" />
                  템플릿 원문
                </button>
              )}
            </div>

            <fieldset className="guide-comm-channel">
              <legend>발송방식</legend>
              <label>
                <input type="radio" name="guide-comm-channel" checked readOnly />
                <span>알림톡</span>
              </label>
              <label>
                <input type="checkbox" checked={fallback} onChange={(event) => setFallback(event.target.checked)} />
                <span>알림톡 실패 시 SMS/LMS 대체발송</span>
              </label>
            </fieldset>

            <div className="guide-comm-actions">
              <button type="button" className="secondary" onClick={openPreview}>
                <Eye size={15} />
                미리보기
              </button>
              <button type="button" className="primary" disabled={!canSend} onClick={requestSend}>
                <Send size={15} />
                {selection.targets.length ? `안내 발송 (${selection.targets.length}건)` : "안내 발송"}
              </button>
            </div>
            <p className="guide-ops-preview-note">
              SAMPLE 화면입니다. 알림톡·SMS/LMS는 연동되지 않으며 실제로 발송되지 않습니다.
            </p>
          </section>
        </div>

        {resultBatch && (
          <ResultPanel
            batch={resultBatch}
            onRetry={() => retryFailed(resultBatch)}
            onClose={() => setResultBatchId(null)}
          />
        )}

        <HistoryPanel batches={batches} />
      </main>

      <div className="guide-comm-sticky" role="region" aria-label="발송대상 요약">
        <div>
          <span>
            선택 고객 <b>{selection.selectedCount}명</b>
          </span>
          <span>
            발송 연락처 <b>{selection.targets.length}건</b>
          </span>
        </div>
        <button type="button" className="secondary" onClick={openPreview}>
          미리보기
        </button>
        <button type="button" className="primary" disabled={!canSend} onClick={requestSend}>
          안내 발송
        </button>
      </div>

      {previewTarget && (
        <PreviewModal
          departure={departure}
          body={body}
          urgent={Boolean(template.urgent)}
          button={template.button}
          chatState={usesChatLink || template.button ? chatState : null}
          targets={previewTargets}
          target={previewTarget}
          canSend={canSend}
          onChangeTarget={setPreviewPhone}
          onClose={() => setPreviewPhone(null)}
          onSend={requestSend}
        />
      )}
      <ShareConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

function FleetItem({
  departure,
  vehicle,
  onSelect,
}: {
  departure: GuideDeparture;
  vehicle: GuideVehicle;
  onSelect: () => void;
}) {
  const group = getGuideVehicleBoardingGroup(departure, vehicle);
  return (
    <li>
      <button type="button" onClick={onSelect}>
        <b>{vehicle.name}</b>
        <span>담당 {getGuideStaff(departure, vehicle.guideId)?.name ?? "미지정"}</span>
        <span>{group?.name ?? "탑승지 그룹 미선택"}</span>
        <small>
          {group ? group.points.map((item) => item.name).join(" → ") : "운영배정에서 탑승지 그룹을 선택해 주세요."}
        </small>
      </button>
    </li>
  );
}

/** 대표예약자 행 체크 = 같은 예약의 표시된 탑승객 전체 선택 */
function getRowSelection(row: GuideCommRow, visibleRows: GuideCommRow[], selected: string[]) {
  const ids = row.isLeader
    ? visibleRows.filter((item) => item.group.id === row.group.id).map((item) => item.passenger.id)
    : [row.passenger.id];
  const checkedCount = ids.filter((id) => selected.includes(id)).length;
  return {
    ids,
    checked: ids.length > 0 && checkedCount === ids.length,
    partial: checkedCount > 0 && checkedCount < ids.length,
  };
}

function ContactInfo({ row, includeCompanion }: { row: GuideCommRow; includeCompanion: boolean }) {
  const contact = resolveGuideContact(row, includeCompanion);
  if (row.isLeader) {
    return row.contactIssue ? (
      <span className="guide-comm-via">
        <span className="badge danger">연락처 없음</span>
        <small>{row.contactIssue}</small>
      </span>
    ) : (
      <span className="badge success">발송가능</span>
    );
  }
  if (contact && !contact.viaLeader) return <span className="badge success">발송가능 · 개별</span>;
  if (!contact) return <span className="badge danger">연락처 없음</span>;
  return (
    <span className="guide-comm-via">
      <span className="badge gray">대표 연락처</span>
      {row.ownPhone && <small>개별 연락처 있음</small>}
    </span>
  );
}

function LatestStatus({
  row,
  batches,
  includeCompanion,
}: {
  row: GuideCommRow;
  batches: GuideMessageBatch[];
  includeCompanion: boolean;
}) {
  const contact = resolveGuideContact(row, includeCompanion);
  if (!contact) return <span className="guide-customers-muted">-</span>;
  const latest = getGuideContactHistory(batches, contact.phone)[0];
  const status = GUIDE_CONTACT_STATUS_META[getGuideContactStatus(batches, contact.phone)];
  return (
    <span className="guide-comm-latest">
      <span className={`badge ${status.badge}`}>{status.label}</span>
      {latest && (
        <small>
          {latest.templateLabel} · {formatGuideSentAt(latest.sentAt)}
          {contact.viaLeader ? " · 대표 연락처" : ""}
        </small>
      )}
    </span>
  );
}

function ContactHistory({ phone, batches }: { phone: string; batches: GuideMessageBatch[] }) {
  const history = getGuideContactHistory(batches, phone);
  if (!history.length) return <p className="guide-comm-history-empty">발송이력이 없습니다.</p>;
  return (
    <ol className="guide-comm-history-list">
      {history.map((item) => (
        <li key={`${item.batchId}-${phone}`}>
          <time>{formatGuideSentAt(item.sentAt)}</time>
          <b>{item.templateLabel}</b>
          <span>{item.channel}</span>
          <span className={`badge ${item.status === "success" ? "success" : "danger"}`}>
            {item.status === "success" ? "성공" : "실패"}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ChatInviteFlag({ status, showSent }: { status: GuideChatInviteStatus; showSent: boolean }) {
  if (status.kind === "reinvite") {
    return (
      <span className="guide-comm-chat-flag is-warn">
        <b>
          <AlertTriangle size={12} aria-hidden="true" />
          안내방 재안내 필요
        </b>
        <small>
          {status.roomLabel} 발송완료 · {status.currentLabel}
        </small>
      </span>
    );
  }
  if (status.kind === "sent" && showSent) {
    return (
      <span className="guide-comm-chat-flag is-ok">
        <b>
          <MessageCircle size={12} aria-hidden="true" />
          안내방 안내발송 완료
        </b>
        <small>
          {status.roomLabel} · {formatGuideSentAt(status.sentAt)}
        </small>
      </span>
    );
  }
  return null;
}

type TargetItemProps = {
  row: GuideCommRow;
  batches: GuideMessageBatch[];
  chatStatus: GuideChatInviteStatus;
  showChatSent: boolean;
  includeCompanion: boolean;
  visibleRows: GuideCommRow[];
  selected: string[];
  onToggleIds: (ids: string[], checked: boolean) => void;
};

function SelectCheckbox({
  row,
  visibleRows,
  selected,
  onToggleIds,
}: Pick<TargetItemProps, "row" | "visibleRows" | "selected" | "onToggleIds">) {
  const { ids, checked, partial } = getRowSelection(row, visibleRows, selected);
  const groupSize = ids.length;
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(element) => {
        if (element) element.indeterminate = partial;
      }}
      onChange={() => onToggleIds(ids, !checked)}
      aria-label={
        row.isLeader && groupSize > 1 ? `${row.passenger.name} 예약 ${groupSize}명 선택` : `${row.passenger.name} 선택`
      }
    />
  );
}

function TargetRow({ open, onToggleOpen, ...props }: TargetItemProps & { open: boolean; onToggleOpen: () => void }) {
  const { row, batches, includeCompanion, chatStatus, showChatSent } = props;
  const contact = resolveGuideContact(row, includeCompanion);
  const companions = row.group.passengers.length - 1;
  return (
    <Fragment>
      <tr className={row.isLeader ? "" : "is-companion"}>
        <td className="is-check">
          <SelectCheckbox {...props} />
        </td>
        <td>
          <div className="guide-customers-name">
            <strong>{row.passenger.name}</strong>
            {row.isLeader && companions > 0 && <small className="guide-customers-leader">외 {companions}명</small>}
          </div>
        </td>
        <td>
          <span className={`badge ${row.isLeader ? "info" : "gray"}`}>{row.isLeader ? "대표예약자" : "동행자"}</span>
        </td>
        <td className="guide-comm-code">{row.group.reservationCode}</td>
        <td>{row.vehicle?.name ?? <span className="badge warn">미배정</span>}</td>
        <td>{row.point || <span className="badge warn">미지정</span>}</td>
        <td className="guide-comm-phone">
          {row.ownPhone ? maskGuidePhone(row.ownPhone) : <span className="guide-customers-muted">-</span>}
        </td>
        <td>
          <ContactInfo row={row} includeCompanion={includeCompanion} />
        </td>
        <td>
          <div className="guide-comm-status-cell">
            <div className="guide-comm-status-stack">
              <LatestStatus row={row} batches={batches} includeCompanion={includeCompanion} />
              <ChatInviteFlag status={chatStatus} showSent={showChatSent} />
            </div>
            {contact && (
              <button
                type="button"
                className={`guide-customers-toggle ${open ? "is-open" : ""}`}
                aria-expanded={open}
                aria-label={`${row.passenger.name} 발송이력 ${open ? "접기" : "보기"}`}
                onClick={onToggleOpen}
              >
                <ChevronDown size={14} aria-hidden="true" />
                이력
              </button>
            )}
          </div>
        </td>
      </tr>
      {open && contact && (
        <tr className="guide-comm-history-row">
          <td />
          <td colSpan={8}>
            <span className="guide-comm-history-title">
              {maskGuidePhone(contact.phone)} 발송이력{contact.viaLeader ? " (대표 연락처)" : ""}
            </span>
            <ContactHistory phone={contact.phone} batches={batches} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function TargetCard(props: TargetItemProps) {
  const { row, batches, includeCompanion, chatStatus, showChatSent } = props;
  const contact = resolveGuideContact(row, includeCompanion);
  return (
    <li className={`guide-comm-card ${row.isLeader ? "" : "is-companion"}`}>
      <label className="guide-comm-card-check">
        <SelectCheckbox {...props} />
      </label>
      <div className="guide-comm-card-body">
        <div className="guide-comm-card-title">
          <strong>{row.passenger.name}</strong>
          <span className={`badge ${row.isLeader ? "info" : "gray"}`}>{row.isLeader ? "대표" : "동행"}</span>
          <small>
            {row.vehicle?.name ?? "호차 미배정"} · {row.point || "탑승지 미지정"}
          </small>
        </div>
        <p>
          {row.group.reservationCode} · {row.ownPhone ? maskGuidePhone(row.ownPhone) : "연락처 없음"}
        </p>
        <div className="guide-comm-card-status">
          <ContactInfo row={row} includeCompanion={includeCompanion} />
          <LatestStatus row={row} batches={batches} includeCompanion={includeCompanion} />
          <ChatInviteFlag status={chatStatus} showSent={showChatSent} />
        </div>
        {contact && (
          <details className="guide-comm-card-history">
            <summary>발송이력</summary>
            <ContactHistory phone={contact.phone} batches={batches} />
          </details>
        )}
      </div>
    </li>
  );
}

function PreviewModal({
  departure,
  body,
  urgent,
  button,
  chatState,
  targets,
  target,
  canSend,
  onChangeTarget,
  onClose,
  onSend,
}: {
  departure: GuideDeparture;
  body: string;
  urgent: boolean;
  button?: string;
  chatState: GuideChatState | null;
  targets: GuideContactTarget[];
  target: GuideContactTarget;
  canSend: boolean;
  onChangeTarget: (phone: string) => void;
  onClose: () => void;
  onSend: () => void;
}) {
  const chatRoom = chatState ? getGuideTargetChatRoom(chatState, target) : null;
  const message = renderGuideMessage(body, buildGuideMessageVariables(departure, target, chatRoom?.link));
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal guide-ops-preview-modal guide-comm-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-comm-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="guide-comm-preview-title">메시지 미리보기</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <label className="guide-comm-preview-target">
          <span>샘플 수신자 ({targets.length}건 중)</span>
          <select value={target.phone} onChange={(event) => onChangeTarget(event.target.value)}>
            {targets.map((item) => (
              <option key={item.phone} value={item.phone}>
                {item.ownerName} · {maskGuidePhone(item.phone)}
                {item.rows.length > 1 ? ` (${item.rows.length}명)` : ""}
              </option>
            ))}
          </select>
        </label>
        <dl className="guide-ops-preview-meta">
          <div>
            <dt>수신</dt>
            <dd>
              {target.ownerName} · {maskGuidePhone(target.phone)}
            </dd>
          </div>
          <div>
            <dt>함께 안내되는 고객</dt>
            <dd>{target.rows.map((row) => row.passenger.name).join(", ")}</dd>
          </div>
          <div>
            <dt>호차</dt>
            <dd>{getGuideTargetVehicles(target)}</dd>
          </div>
          <div>
            <dt>탑승지</dt>
            <dd>{getGuideTargetPoints(target)}</dd>
          </div>
          {chatState && (
            <div>
              <dt>안내방</dt>
              <dd>{chatRoom ? getGuideChatRoomLabel(departure, chatRoom.scope) : "링크 미등록"}</dd>
            </div>
          )}
        </dl>
        <div className={`guide-ops-preview-bubble ${urgent ? "is-urgent" : ""}`}>{message || "(메시지 내용 없음)"}</div>
        {button && (
          <div className="guide-comm-preview-button">
            <span>{button}</span>
            <small>알림톡 버튼 미리보기 · {chatRoom?.link ?? "안내방 링크 미등록"}</small>
          </div>
        )}
        <p className="guide-ops-preview-note">
          변수({"{고객명}"}, {"{탑승지}"} 등)는 고객별 정보로 바뀌어 발송됩니다. SAMPLE 미리보기이며 실제로 발송되지
          않습니다.
        </p>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
          {canSend && (
            <button type="button" className="primary" onClick={onSend}>
              안내 발송
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  batch,
  onRetry,
  onClose,
}: {
  batch: GuideMessageBatch;
  onRetry: () => void;
  onClose: () => void;
}) {
  const failed = batch.results.filter((item) => item.status === "failed");
  const success = batch.results.length - failed.length;
  const fallbackCount = batch.results.filter((item) => item.status === "success" && item.channel === "SMS/LMS").length;
  return (
    <section className="panel guide-comm-result" id={RESULT_SECTION_ID} aria-labelledby="guide-comm-result-title">
      <div className="guide-comm-result-head">
        <div className="guide-ops-section-head">
          <h2 id="guide-comm-result-title">발송 결과</h2>
          <span>
            {batch.sentAt} · {batch.templateLabel} · {batch.targetLabel} (SAMPLE)
          </span>
        </div>
        <button type="button" className="ops-assign-icon-btn" aria-label="발송 결과 닫기" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <dl className="guide-comm-summary">
        <div>
          <dt>발송요청</dt>
          <dd>{batch.results.length}건</dd>
        </div>
        <div className="is-success">
          <dt>성공</dt>
          <dd>{success}건</dd>
        </div>
        <div className={failed.length ? "is-danger" : ""}>
          <dt>실패</dt>
          <dd>{failed.length}건</dd>
        </div>
        <div>
          <dt>SMS/LMS 대체발송</dt>
          <dd>{fallbackCount}건</dd>
        </div>
      </dl>
      {failed.length > 0 ? (
        <div className="guide-comm-failed">
          <b>실패 고객</b>
          <ul>
            {failed.map((item) => (
              <li key={item.phone}>
                <strong>{item.ownerName}</strong>
                <span>{maskGuidePhone(item.phone)}</span>
                <small>{item.passengerIds.length > 1 ? `${item.passengerIds.length}명 함께 안내` : "1명"}</small>
              </li>
            ))}
          </ul>
          <button type="button" className="primary" onClick={onRetry}>
            <RotateCcw size={14} />
            실패건 다시 발송
          </button>
        </div>
      ) : (
        <p className="ops-assign-notice is-success" role="status">
          <span>
            <b>모든 연락처에 발송되었습니다.</b>
          </span>
        </p>
      )}
    </section>
  );
}

function HistoryPanel({ batches }: { batches: GuideMessageBatch[] }) {
  return (
    <section className="panel guide-comm-history" aria-labelledby="guide-comm-history-title">
      <div className="guide-ops-section-head">
        <h2 id="guide-comm-history-title">
          <History size={16} aria-hidden="true" />
          발송이력
        </h2>
        <span>발송건수는 실제 발송 연락처 기준입니다.</span>
      </div>
      {batches.length === 0 ? (
        <p className="guide-comm-history-empty">발송이력이 없습니다.</p>
      ) : (
        <div className="guide-customers-table-wrap">
          <table className="guide-comm-history-table">
            <thead>
              <tr>
                <th scope="col">발송일시</th>
                <th scope="col">템플릿</th>
                <th scope="col">대상</th>
                <th scope="col">호차</th>
                <th scope="col">탑승지</th>
                <th scope="col">발송건수</th>
                <th scope="col">성공</th>
                <th scope="col">실패</th>
                <th scope="col">발송자</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => {
                const failed = batch.results.filter((item) => item.status === "failed").length;
                return (
                  <tr key={batch.id}>
                    <td className="guide-comm-code">{batch.sentAt}</td>
                    <td>{batch.templateLabel}</td>
                    <td>{batch.targetLabel}</td>
                    <td>{batch.vehicleLabel}</td>
                    <td>{batch.pointLabel}</td>
                    <td className="is-num">{batch.results.length}</td>
                    <td className="is-num">{batch.results.length - failed}</td>
                    <td className={`is-num ${failed ? "is-danger" : ""}`}>{failed}</td>
                    <td>{batch.sender}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
