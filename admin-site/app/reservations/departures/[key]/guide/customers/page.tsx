"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ChevronDown, Phone, Search, X } from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { ShareConfirmDialog, type ShareConfirmDialogState } from "@/components/products/ShareConfirmDialog";
import { useQueryParam } from "@/components/settlements/SettlementParts";
import {
  GuideBoardingSegmentTabs,
  GuideBoardingStatusBadge,
  GuideNoShowDialog,
  type GuideNoShowResult,
  type GuideSegmentSummary,
} from "@/components/guide/GuideBoardingParts";
import {
  GuideFleetOverview,
  GuideVehicleChangeDialog,
  GuideVehicleInfo,
  GuideVehicleTabs,
  type GuideVehicleStat,
} from "@/components/guide/GuideVehicleParts";
import {
  GUIDE_BOARDING_STATUS_META,
  GUIDE_DEPARTURE_STATUS_BADGE,
  GUIDE_STAFF_ROLE_LABEL,
  formatGuideDepartureDate,
  formatGuideSeat,
  getGuideAssignment,
  getGuideBoardingRecord,
  getGuideDefaultVehicleFilter,
  getGuideLeadStaff,
  getGuideOperationPath,
  getGuidePhoneHref,
  getGuideSegmentStatus,
  getGuideSegmentVehicles,
  getGuideStaff,
  maskGuidePhone,
  summarizeGuideBoarding,
  type GuideBoardingDisplayStatus,
  type GuideBoardingFilter,
  type GuideBoardingRecord,
  type GuideBoardingSegment,
  type GuideDeparture,
  type GuidePassenger,
  type GuideReservationGroup,
  type GuideSeatAssignment,
  type GuideVehicle,
} from "@/lib/admin/guide-operation-data";
import { getOperationDeparture } from "@/lib/admin/operation-assignment-data";

type PassengerRow = {
  key: string;
  group: GuideReservationGroup;
  passenger: GuidePassenger;
  leader: GuidePassenger;
  isLeader: boolean;
  /** 필터·검색 결과처럼 동행자가 대표예약자 행 없이 단독으로 보이는 경우 */
  standalone: boolean;
};

type GroupView = { group: GuideReservationGroup; visible: GuidePassenger[]; standaloneMode: boolean };

const STATUS_FILTERS: { key: GuideBoardingFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "boarded", label: "탑승완료" },
  { key: "unchecked", label: "미확인" },
  { key: "no_show", label: "미탑승" },
  { key: "notes", label: "특이사항" },
];

const LIST_SECTION_ID = "guide-customers-list";

const hasNotes = (passenger: GuidePassenger) => Boolean(passenger.notes?.length);

function toStatusFilter(value: string): GuideBoardingFilter {
  return STATUS_FILTERS.some((item) => item.key === value) ? (value as GuideBoardingFilter) : "all";
}

function formatRecordDetail(record: GuideBoardingRecord, status: GuideBoardingDisplayStatus) {
  if (status === "excluded") return "이전 구간 미탑승";
  if (status === "no_show") return record.reason === "기타" && record.memo ? `기타 · ${record.memo}` : record.reason ?? "";
  return "";
}

export default function GuideCustomersPage() {
  const params = useParams<{ key: string }>();
  const router = useRouter();
  const departureKey = useMemo(() => decodeURIComponent(params.key ?? ""), [params.key]);
  const departure = useMemo(() => getOperationDeparture(departureKey), [departureKey]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const notify = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  };

  return (
    <ProductAdminShell
      activeMenu="예약관리"
      currentChild=""
      breadcrumb={
        <>
          <span>예약관리</span>
          <b>/</b>
          <span>출발상품</span>
          <b>/</b>
          <span>가이드 운영</span>
          <b>/</b>
          <strong>고객명단</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
    >
      {!departure ? (
        <main className="content member-web-detail-content guide-ops-content">
          <section className="panel member-web-detail-not-found">
            <strong>출발상품을 찾을 수 없습니다.</strong>
            <p>요청한 출발상품({departureKey || "-"})의 고객명단 정보가 없습니다.</p>
            <button type="button" className="secondary" onClick={() => router.push("/reservations")}>
              <ArrowLeft size={15} />
              예약목록으로
            </button>
          </section>
        </main>
      ) : (
        <GuideCustomersBody
          key={departure.key}
          departure={departure}
          onBack={() => router.push(getGuideOperationPath(departure.key))}
          onNotify={notify}
        />
      )}
    </ProductAdminShell>
  );
}

function GuideCustomersBody({
  departure,
  onBack,
  onNotify,
}: {
  departure: GuideDeparture;
  onBack: () => void;
  onNotify: (message: string) => void;
}) {
  const { segments } = departure;
  const [groups, setGroups] = useState<GuideReservationGroup[]>(() => departure.reservations);
  const [keyword, setKeyword] = useState("");
  const [point, setPoint] = useState("all");
  const [statusParam, setStatusParam] = useQueryParam("status", "all");
  const [segmentParam, setSegmentParam] = useQueryParam("segment", segments[0]?.key ?? "");
  const status = toStatusFilter(statusParam);
  const segmentIndex = Math.max(0, segments.findIndex((item) => item.key === segmentParam));
  const segment = segments[segmentIndex];
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [activePassenger, setActivePassenger] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ShareConfirmDialogState | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<{ passenger: GuidePassenger; group: GuideReservationGroup } | null>(null);
  const [vehicleTarget, setVehicleTarget] = useState<GuidePassenger | null>(null);
  const leadStaff = getGuideLeadStaff(departure);
  const [viewerId, setViewerId] = useState(leadStaff?.id ?? departure.staff[0]?.id ?? "");
  const segmentVehicles = getGuideSegmentVehicles(departure, segment);
  const [vehicleParam, setVehicleParam] = useQueryParam("vehicle", "all");
  const vehicleFilter = segmentVehicles.some((item) => item.id === vehicleParam) ? vehicleParam : "all";
  const selectedVehicle = segmentVehicles.find((item) => item.id === vehicleFilter) ?? null;

  const passengers = useMemo(() => groups.flatMap((group) => group.passengers), [groups]);
  const statusOf = (passenger: GuidePassenger) => getGuideSegmentStatus(passenger, segments, segmentIndex);
  const assignmentOf = (passenger: GuidePassenger, segmentKey = segment.key) => getGuideAssignment(passenger, segmentKey);
  const inVehicle = (passenger: GuidePassenger, segmentKey = segment.key) =>
    vehicleFilter === "all" || assignmentOf(passenger, segmentKey).vehicleId === vehicleFilter;
  const scopePassengers = passengers.filter((item) => inVehicle(item));
  const summary = summarizeGuideBoarding(scopePassengers, segments, segmentIndex);
  const boardingRate = summary.total ? Math.round((summary.boarded / summary.total) * 100) : 0;
  const segmentSummaries = Object.fromEntries(
    segments.map((item, index) => {
      const value = summarizeGuideBoarding(
        passengers.filter((passenger) => inVehicle(passenger, item.key)),
        segments,
        index,
      );
      return [item.key, { confirmed: value.confirmed, total: value.total, complete: value.complete }];
    }),
  ) as Record<string, GuideSegmentSummary>;
  const vehicleStats: GuideVehicleStat[] = segmentVehicles.map((vehicle) => ({
    vehicle,
    guide: getGuideStaff(departure, vehicle.guideId),
    summary: summarizeGuideBoarding(
      passengers.filter((item) => assignmentOf(item).vehicleId === vehicle.id),
      segments,
      segmentIndex,
    ),
  }));
  const selectedVehicleStat = vehicleStats.find((item) => item.vehicle.id === vehicleFilter) ?? null;
  const scopeLabel = selectedVehicleStat
    ? `${selectedVehicleStat.vehicle.name} · ${selectedVehicleStat.guide?.name ?? "미배정"} 가이드`
    : `전체 차량 ${segmentVehicles.length}대`;

  const matchesStatus = (passenger: GuidePassenger, filter: GuideBoardingFilter) => {
    if (filter === "notes") return hasNotes(passenger);
    if (filter === "all") return true;
    return statusOf(passenger) === filter;
  };

  const pointCounts = Object.fromEntries(
    departure.boardingPoints.map((item) => [
      item.name,
      groups
        .filter((group) => group.boardingPoint === item.name)
        .reduce((sum, group) => sum + group.passengers.filter((passenger) => inVehicle(passenger)).length, 0),
    ]),
  ) as Record<string, number>;
  const pointGroups = point === "all" ? groups : groups.filter((group) => group.boardingPoint === point);
  const pointPassengers = pointGroups.flatMap((group) => group.passengers).filter((item) => inVehicle(item));
  const statusCounts = Object.fromEntries(
    STATUS_FILTERS.map((item) => [item.key, pointPassengers.filter((passenger) => matchesStatus(passenger, item.key)).length]),
  ) as Record<GuideBoardingFilter, number>;

  const trimmedKeyword = keyword.trim();
  const filterActive = status !== "all" || trimmedKeyword !== "";
  const digits = trimmedKeyword.replace(/\D/g, "");
  const keywordMatches = (group: GuideReservationGroup, passenger: GuidePassenger) =>
    !trimmedKeyword ||
    passenger.name.includes(trimmedKeyword) ||
    (digits.length >= 2 && group.phone.replace(/\D/g, "").slice(-4).includes(digits));

  const groupViews: GroupView[] = pointGroups
    .map((group) => {
      const inScope = group.passengers.filter((item) => inVehicle(item));
      /** 예약 일부만 선택 차량에 있으면 해당 탑승객만 단독 행으로 표시합니다. */
      const standaloneMode = filterActive || inScope.length !== group.passengers.length;
      return {
        group,
        standaloneMode,
        visible: standaloneMode
          ? inScope.filter((item) => matchesStatus(item, status) && keywordMatches(group, item))
          : group.passengers,
      };
    })
    .filter((view) => view.visible.length > 0);

  const rows: PassengerRow[] = groupViews.flatMap(({ group, visible, standaloneMode }) => {
    const [leader, ...companions] = group.passengers;
    const toRow = (item: GuidePassenger, standalone: boolean): PassengerRow => ({
      key: item.id,
      group,
      passenger: item,
      leader,
      isLeader: item.id === leader.id,
      standalone,
    });
    if (!standaloneMode) {
      return [toRow(leader, false), ...(expanded.includes(group.id) ? companions.map((item) => toRow(item, false)) : [])];
    }
    return visible.map((item) => toRow(item, true));
  });

  const occupiedSeats = (excludeId: string) =>
    passengers.reduce<Record<string, number[]>>((acc, item) => {
      if (item.id === excludeId) return acc;
      const { vehicleId, seat } = assignmentOf(item);
      acc[vehicleId] = [...(acc[vehicleId] ?? []), seat];
      return acc;
    }, {});

  /** 현재 구간과 이후 구간의 배정을 변경합니다. (이전 구간 배정 기록은 유지) */
  const applyAssignment = (passenger: GuidePassenger, next: GuideSeatAssignment) => {
    const before = departure.vehicles.find((item) => item.id === assignmentOf(passenger).vehicleId);
    const after = departure.vehicles.find((item) => item.id === next.vehicleId);
    setGroups((current) =>
      current.map((group) => ({
        ...group,
        passengers: group.passengers.map((item) =>
          item.id === passenger.id
            ? {
                ...item,
                assignment: {
                  ...item.assignment,
                  ...Object.fromEntries(segments.slice(segmentIndex).map((seg) => [seg.key, next])),
                },
              }
            : item,
        ),
      })),
    );
    setVehicleTarget(null);
    setDialog(null);
    onNotify(
      `${passenger.name} · ${before?.name ?? "-"} → ${after?.name ?? "-"} ${formatGuideSeat(next.seat)} 좌석으로 변경했습니다. (화면에만 반영 · SAMPLE)`,
    );
  };

  const submitVehicleChange = (next: GuideSeatAssignment) => {
    const passenger = vehicleTarget;
    if (!passenger) return;
    const current = assignmentOf(passenger);
    if (statusOf(passenger) === "boarded" && current.vehicleId !== next.vehicleId) {
      const before = departure.vehicles.find((item) => item.id === current.vehicleId)?.name ?? "-";
      const after = departure.vehicles.find((item) => item.id === next.vehicleId)?.name ?? "-";
      setVehicleTarget(null);
      setDialog({
        title: "탑승완료 고객 호차 변경",
        message: `이미 탑승확인된 고객입니다.\n${before}에서 ${after}로 변경하시겠습니까?\n탑승상태(탑승완료)는 그대로 유지됩니다.`,
        confirmLabel: "변경 적용",
        details: [
          { label: "탑승객", value: passenger.name },
          { label: "변경", value: `${before} ${formatGuideSeat(current.seat)} → ${after} ${formatGuideSeat(next.seat)}` },
        ],
        onConfirm: () => applyAssignment(passenger, next),
      });
      return;
    }
    applyAssignment(passenger, next);
  };

  const changeVehicle = (next: string) => {
    setVehicleParam(next);
    setSelected([]);
    setActivePassenger(null);
  };

  const changeViewer = (staffId: string) => {
    setViewerId(staffId);
    changeVehicle(getGuideDefaultVehicleFilter(departure, staffId));
  };

  const setRecord = (ids: string[], record: GuideBoardingRecord) => {
    setGroups((current) =>
      current.map((group) => ({
        ...group,
        passengers: group.passengers.map((item) =>
          ids.includes(item.id) ? { ...item, boarding: { ...item.boarding, [segment.key]: record } } : item,
        ),
      })),
    );
    if (record.status !== "unchecked") setSelected((current) => current.filter((id) => !ids.includes(id)));
  };

  const handlers: PassengerHandlers = {
    segment,
    statusOf,
    assignmentOf: (passenger) => assignmentOf(passenger),
    vehicleOf: (passenger) => departure.vehicles.find((item) => item.id === assignmentOf(passenger).vehicleId),
    onChangeVehicle: (passenger) => setVehicleTarget(passenger),
    selected,
    onToggleSelected: (id) =>
      setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id])),
    onConfirm: (passenger) => {
      setRecord([passenger.id], { status: "boarded" });
      onNotify(`${passenger.name} · ${segment.label} 탑승완료 (화면에만 반영 · SAMPLE)`);
    },
    onUndoBoarding: (passenger) =>
      setDialog({
        title: "탑승확인 취소",
        message: "탑승확인을 취소하면 '미확인' 상태로 되돌아갑니다.\n미탑승 처리가 아니며, 예약인원과 예약상태는 변경되지 않습니다.",
        confirmLabel: "탑승확인 취소",
        details: [
          { label: "탑승객", value: passenger.name },
          { label: "구간", value: segment.label },
        ],
        onConfirm: () => {
          setRecord([passenger.id], { status: "unchecked" });
          setDialog(null);
          onNotify(`${passenger.name} 고객을 미확인 상태로 되돌렸습니다.`);
        },
      }),
    onRevertNoShow: (passenger) =>
      setDialog({
        title: "미확인으로 변경",
        message: "미탑승 기록과 사유를 지우고 '미확인' 상태로 되돌립니다.",
        confirmLabel: "미확인으로 변경",
        details: [
          { label: "탑승객", value: passenger.name },
          { label: "구간", value: segment.label },
        ],
        onConfirm: () => {
          setRecord([passenger.id], { status: "unchecked" });
          setDialog(null);
          onNotify(`${passenger.name} 고객을 미확인 상태로 되돌렸습니다.`);
        },
      }),
    onNoShow: (passenger, group) => setNoShowTarget({ passenger, group }),
  };

  const submitNoShow = (result: GuideNoShowResult) => {
    if (!noShowTarget) return;
    const { passenger } = noShowTarget;
    if (result.actualPoint) {
      setRecord([passenger.id], { status: "boarded", reason: result.reason, actualPoint: result.actualPoint });
      onNotify(`${passenger.name} · 실제 탑승지 ${result.actualPoint}에서 탑승완료로 기록했습니다.`);
    } else {
      setRecord([passenger.id], { status: "no_show", reason: result.reason, memo: result.memo });
      onNotify(`${passenger.name} 고객을 미탑승(${result.reason}) 처리했습니다. 예약정보는 유지됩니다.`);
    }
    setNoShowTarget(null);
  };

  const confirmSelected = () => {
    if (!selected.length) return;
    const count = selected.length;
    setRecord(selected, { status: "boarded" });
    onNotify(`선택한 ${count}명을 ${segment.label} 탑승완료 처리했습니다. (화면에만 반영 · SAMPLE)`);
  };

  const changeStatus = (next: GuideBoardingFilter) => {
    setStatusParam(next);
    setSelected([]);
    setActivePassenger(null);
  };

  const changeSegment = (key: string) => {
    setSegmentParam(key);
    setSelected([]);
    setActivePassenger(null);
  };

  const toggleStatusFocus = (target: GuideBoardingFilter) => {
    changeStatus(status === target ? "all" : target);
    document.getElementById(LIST_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetFilters = () => {
    setKeyword("");
    setPoint("all");
    changeStatus("all");
  };

  const toggleExpanded = (id: string) =>
    setExpanded((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <>
      <main className="content member-web-detail-content guide-ops-content guide-customers-content">
        <section className="panel guide-ops-hero guide-customers-hero" aria-labelledby="guide-customers-title">
          <div className="guide-ops-hero-main">
            <p className="member-web-breadcrumb">예약관리 &gt; 출발상품 &gt; 가이드 운영 &gt; 고객명단</p>
            <div className="guide-ops-hero-status">
              <span className={`badge ${GUIDE_DEPARTURE_STATUS_BADGE[departure.status]}`}>{departure.status}</span>
              <span className="guide-ops-code">{departure.productCode}</span>
            </div>
            <h1 id="guide-customers-title">{departure.productName}</h1>
            <dl className="guide-ops-hero-meta">
              <div className="is-date">
                <dt>출발일</dt>
                <dd>{formatGuideDepartureDate(departure.departureDate)}</dd>
              </div>
              <div>
                <dt>총괄가이드</dt>
                <dd>{leadStaff?.name ?? departure.guideName}</dd>
              </div>
              <div>
                <dt>전체 예약인원</dt>
                <dd>{passengers.length}명</dd>
              </div>
              <div>
                <dt>운행 차량</dt>
                <dd>{departure.vehicles.length}대</dd>
              </div>
            </dl>
          </div>
          <div className="guide-ops-hero-actions guide-customers-hero-actions">
            <label className="guide-viewer-select">
              <span>화면 기준 (SAMPLE)</span>
              <select value={viewerId} onChange={(event) => changeViewer(event.target.value)}>
                {departure.staff.filter((staff) => staff.roles.length > 0).map((staff) => {
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

        <GuideBoardingSegmentTabs
          segments={segments}
          activeKey={segment.key}
          summaries={segmentSummaries}
          onChange={changeSegment}
        />

        <GuideVehicleTabs stats={vehicleStats} total={passengers.length} active={vehicleFilter} onChange={changeVehicle} />

        {selectedVehicleStat ? (
          <GuideVehicleInfo stat={selectedVehicleStat} segmentLabel={segment.label} />
        ) : (
          <GuideFleetOverview stats={vehicleStats} total={passengers.length} segmentLabel={segment.label} onSelect={changeVehicle} />
        )}

        <section className="guide-ops-kpis guide-customers-kpis" aria-label={`${scopeLabel} ${segment.label} 탑승현황`}>
          <article className={`member-web-detail-kpi guide-ops-kpi guide-customers-rate ${summary.complete ? "is-success" : "is-warn"}`}>
            <span>
              <span className={`badge ${summary.complete ? "success" : "warn"} guide-customers-progress-state`}>
                {summary.complete ? "✓ 전체 탑승 확인 완료" : "탑승 확인 진행중"}
              </span>
              <strong>
                탑승 {summary.boarded} / {summary.total}명 <em>{boardingRate}%</em>
              </strong>
              <progress
                className="guide-customers-progress"
                value={summary.boarded}
                max={summary.total || 1}
                aria-label={`탑승률 ${boardingRate}%`}
              />
              <small>
                {summary.complete
                  ? "모든 고객의 탑승 여부가 확정되었습니다."
                  : `확인 ${summary.confirmed} / ${summary.total}명 · 미확인 ${summary.unchecked}명`}
                {summary.excluded > 0 && ` · 대상 제외 ${summary.excluded}명`}
              </small>
            </span>
          </article>
          <article className="member-web-detail-kpi guide-ops-kpi">
            <span>
              <small>{selectedVehicle ? `${selectedVehicle.name} 예약인원` : "전체 예약인원"}</small>
              <strong>{summary.total}명</strong>
            </span>
          </article>
          <article className="member-web-detail-kpi guide-ops-kpi is-success">
            <span>
              <small>탑승완료</small>
              <strong>{summary.boarded}명</strong>
            </span>
          </article>
          <button
            type="button"
            className={`member-web-detail-kpi guide-ops-kpi guide-customers-kpi-action is-unchecked ${summary.unchecked > 0 ? "is-warn" : "is-success"} ${status === "unchecked" ? "is-active" : ""}`}
            onClick={() => toggleStatusFocus("unchecked")}
            aria-pressed={status === "unchecked"}
          >
            <span>
              <small>미확인 · 눌러서 보기</small>
              <strong>{summary.unchecked}명</strong>
            </span>
          </button>
          <button
            type="button"
            className={`member-web-detail-kpi guide-ops-kpi guide-customers-kpi-action ${summary.noShow > 0 ? "is-danger" : "is-muted"} ${status === "no_show" ? "is-active" : ""}`}
            onClick={() => toggleStatusFocus("no_show")}
            aria-pressed={status === "no_show"}
          >
            <span>
              <small>미탑승</small>
              <strong>{summary.noShow}명</strong>
            </span>
          </button>
        </section>

        <section className="panel guide-customers-panel" id={LIST_SECTION_ID} aria-labelledby="guide-customers-list-title">
          <div className="guide-customers-toolbar">
            <div className="guide-ops-section-head">
              <h2 id="guide-customers-list-title">
                고객명단 · {segment.label} · {selectedVehicle ? selectedVehicle.name : "전체 차량"}
              </h2>
              <span>탑승상태는 예약상태와 별도로 구간별·탑승객별로 관리됩니다. 연락처는 대표예약자 기준이며 마스킹되어 표시됩니다.</span>
            </div>
            <label className="guide-customers-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="고객명 또는 전화번호 뒷자리 검색"
                aria-label="고객 검색"
              />
              {keyword && (
                <button type="button" aria-label="검색어 지우기" onClick={() => setKeyword("")}>
                  <X size={15} />
                </button>
              )}
            </label>
            <div className="guide-customers-filter-row">
              <div className="guide-customers-chips" role="group" aria-label="탑승지 필터">
                <button
                  type="button"
                  className={point === "all" ? "is-active" : ""}
                  aria-pressed={point === "all"}
                  onClick={() => setPoint("all")}
                >
                  전체 <b>{summary.total}</b>
                </button>
                {departure.boardingPoints.map((item) => (
                  <button
                    type="button"
                    key={item.name}
                    className={point === item.name ? "is-active" : ""}
                    aria-pressed={point === item.name}
                    onClick={() => setPoint(item.name)}
                  >
                    {item.name} <b>{pointCounts[item.name] ?? 0}</b>
                  </button>
                ))}
              </div>
              <div className="guide-customers-chips is-status" role="group" aria-label="탑승상태 필터">
                {STATUS_FILTERS.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={`${status === item.key ? "is-active" : ""} ${item.key === "unchecked" ? "is-unchecked" : ""} ${item.key === "no_show" ? "is-noshow" : ""}`}
                    aria-pressed={status === item.key}
                    onClick={() => changeStatus(item.key)}
                  >
                    {item.key === "unchecked" && <AlertTriangle size={14} aria-hidden="true" />}
                    {item.label} <b>{statusCounts[item.key]}</b>
                  </button>
                ))}
              </div>
            </div>
            {selected.length > 0 && (
              <div className="guide-customers-bulk" role="status">
                <span>
                  <b>{selected.length}명</b> 선택됨 · {segment.label}
                </span>
                <button type="button" className="secondary" onClick={() => setSelected([])}>
                  선택 해제
                </button>
                <button type="button" className="primary" onClick={confirmSelected}>
                  선택 {selected.length}명 탑승확인
                </button>
              </div>
            )}
          </div>

          {groupViews.length === 0 ? (
            <div className="guide-customers-empty">
              <strong>
                {status === "unchecked" && !trimmedKeyword
                  ? "미확인 고객이 없습니다. 모든 고객의 탑승 여부가 확정되었습니다."
                  : "조건에 맞는 고객이 없습니다."}
              </strong>
              <button type="button" className="secondary" onClick={resetFilters}>
                필터 초기화
              </button>
            </div>
          ) : (
            <>
              <div className="guide-customers-table-wrap">
                <table className="guide-customers-table">
                  <thead>
                    <tr>
                      <th scope="col" className="is-check" aria-label="선택" />
                      <th scope="col">고객명</th>
                      <th scope="col">구분</th>
                      <th scope="col">연락처</th>
                      <th scope="col">탑승지</th>
                      <th scope="col">호차</th>
                      <th scope="col">좌석</th>
                      <th scope="col">예약인원</th>
                      <th scope="col">탑승상태</th>
                      <th scope="col">특이사항</th>
                      <th scope="col">연락</th>
                      <th scope="col">탑승처리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <PassengerTableRow
                        key={row.key}
                        row={row}
                        handlers={handlers}
                        expanded={expanded.includes(row.group.id)}
                        onToggleExpanded={() => toggleExpanded(row.group.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="guide-customers-cards">
                {groupViews.map((view) => (
                  <GroupCard
                    key={view.group.id}
                    view={view}
                    handlers={handlers}
                    filterActive={view.standaloneMode}
                    expanded={expanded.includes(view.group.id)}
                    onToggleExpanded={() => toggleExpanded(view.group.id)}
                    activePassenger={activePassenger}
                    onActivate={(id) => setActivePassenger((current) => (current === id ? null : id))}
                  />
                ))}
              </ul>
            </>
          )}
        </section>
      </main>

      <div className="guide-customers-sticky" role="region" aria-label="탑승현황 요약">
        <div className="guide-customers-sticky-stats">
          <small>
            {selectedVehicleStat ? scopeLabel : "전체"} · {segment.label}
          </small>
          <span>
            탑승 <b>{summary.boarded}</b>
          </span>
          <span className={summary.unchecked > 0 ? "is-unchecked" : ""}>
            미확인 <b>{summary.unchecked}</b>
          </span>
          <span className={summary.noShow > 0 ? "is-noshow" : ""}>
            미탑승 <b>{summary.noShow}</b>
          </span>
        </div>
        {selected.length > 0 ? (
          <button type="button" className="primary" onClick={confirmSelected}>
            선택 {selected.length}명 탑승확인
          </button>
        ) : (
          <button
            type="button"
            className={status === "unchecked" ? "secondary" : "guide-customers-focus-btn"}
            onClick={() => toggleStatusFocus("unchecked")}
          >
            {status === "unchecked" ? "전체 보기" : "미확인 보기"}
          </button>
        )}
      </div>

      <ShareConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />
      {vehicleTarget && (
        <GuideVehicleChangeDialog
          key={`${vehicleTarget.id}-${segment.key}`}
          target={{
            passengerName: vehicleTarget.name,
            current: assignmentOf(vehicleTarget),
            statusLabel: GUIDE_BOARDING_STATUS_META[statusOf(vehicleTarget)].label,
          }}
          vehicles={segmentVehicles}
          occupiedSeats={occupiedSeats(vehicleTarget.id)}
          onClose={() => setVehicleTarget(null)}
          onSubmit={submitVehicleChange}
        />
      )}
      {noShowTarget && (
        <GuideNoShowDialog
          key={`${noShowTarget.passenger.id}-${segment.key}`}
          target={{
            passengerName: noShowTarget.passenger.name,
            reservationPoint: noShowTarget.group.boardingPoint,
            segment,
          }}
          boardingPoints={departure.boardingPoints.map((item) => item.name)}
          onClose={() => setNoShowTarget(null)}
          onSubmit={submitNoShow}
        />
      )}
    </>
  );
}

type PassengerHandlers = {
  segment: GuideBoardingSegment;
  statusOf: (passenger: GuidePassenger) => GuideBoardingDisplayStatus;
  assignmentOf: (passenger: GuidePassenger) => GuideSeatAssignment;
  vehicleOf: (passenger: GuidePassenger) => GuideVehicle | undefined;
  onChangeVehicle: (passenger: GuidePassenger) => void;
  selected: string[];
  onToggleSelected: (id: string) => void;
  onConfirm: (passenger: GuidePassenger) => void;
  onUndoBoarding: (passenger: GuidePassenger) => void;
  onRevertNoShow: (passenger: GuidePassenger) => void;
  onNoShow: (passenger: GuidePassenger, group: GuideReservationGroup) => void;
};

function summarizeGroup(group: GuideReservationGroup, statusOf: PassengerHandlers["statusOf"]) {
  const statuses = group.passengers.map(statusOf);
  const count = (status: GuideBoardingDisplayStatus) => statuses.filter((item) => item === status).length;
  return { total: group.passengers.length, boarded: count("boarded"), unchecked: count("unchecked"), noShow: count("no_show"), excluded: count("excluded") };
}

function GroupStats({ group, statusOf }: { group: GuideReservationGroup; statusOf: PassengerHandlers["statusOf"] }) {
  const stats = summarizeGroup(group, statusOf);
  return (
    <span className="guide-customers-group-stats">
      <span>탑승 {stats.boarded}</span>
      {stats.unchecked > 0 && <span className="is-unchecked">미확인 {stats.unchecked}</span>}
      {stats.noShow > 0 && <span className="is-noshow">미탑승 {stats.noShow}</span>}
      {stats.excluded > 0 && <span>제외 {stats.excluded}</span>}
    </span>
  );
}

function PassengerNotes({ notes }: { notes?: string[] }) {
  if (!notes?.length) return <span className="guide-customers-muted">-</span>;
  const [first, ...rest] = notes;
  return (
    <details className="guide-customers-note">
      <summary title={notes.join(" / ")}>
        <AlertTriangle size={13} aria-hidden="true" />
        <span>{first.replace(/\s*\(.*\)$/, "")}</span>
        {rest.length > 0 && <b>+{rest.length}</b>}
      </summary>
      <ul>
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </details>
  );
}

function CallLink({ group, leader, label = "전화", compact }: { group: GuideReservationGroup; leader: GuidePassenger; label?: string; compact?: boolean }) {
  return (
    <a
      className={`guide-customers-call ${compact ? "is-compact" : ""}`}
      href={getGuidePhoneHref(group.phone)}
      aria-label={`${leader.name} 대표예약자에게 전화 (${maskGuidePhone(group.phone)})`}
    >
      <Phone size={15} aria-hidden="true" />
      {label}
    </a>
  );
}

function SelectBox({ passenger, handlers }: { passenger: GuidePassenger; handlers: PassengerHandlers }) {
  const selectable = handlers.statusOf(passenger) === "unchecked";
  return (
    <label className="guide-customers-check" title={selectable ? undefined : "미확인 상태의 탑승객만 선택할 수 있습니다."}>
      <input
        type="checkbox"
        checked={handlers.selected.includes(passenger.id)}
        disabled={!selectable}
        onChange={() => handlers.onToggleSelected(passenger.id)}
        aria-label={`${passenger.name} 선택`}
      />
    </label>
  );
}

function BoardingActions({
  passenger,
  group,
  handlers,
}: {
  passenger: GuidePassenger;
  group: GuideReservationGroup;
  handlers: PassengerHandlers;
}) {
  const status = handlers.statusOf(passenger);
  if (status === "excluded") return <span className="guide-customers-muted">대상 제외</span>;
  if (status === "boarded") {
    return (
      <button type="button" className="secondary guide-customers-undo" onClick={() => handlers.onUndoBoarding(passenger)}>
        탑승확인 취소
      </button>
    );
  }
  if (status === "no_show") {
    return (
      <button type="button" className="secondary guide-customers-undo" onClick={() => handlers.onRevertNoShow(passenger)}>
        미확인으로 변경
      </button>
    );
  }
  return (
    <>
      <button type="button" className="primary guide-customers-confirm" onClick={() => handlers.onConfirm(passenger)}>
        탑승확인
      </button>
      <button type="button" className="secondary guide-customers-noshow" onClick={() => handlers.onNoShow(passenger, group)}>
        미탑승 처리
      </button>
    </>
  );
}

function StatusCell({ passenger, handlers }: { passenger: GuidePassenger; handlers: PassengerHandlers }) {
  const status = handlers.statusOf(passenger);
  const detail = formatRecordDetail(getGuideBoardingRecord(passenger, handlers.segment.key), status);
  return (
    <div className="guide-customers-status">
      <GuideBoardingStatusBadge status={status} />
      {detail && <small>{detail}</small>}
    </div>
  );
}

function PointCell({ passenger, group, handlers }: { passenger: GuidePassenger; group: GuideReservationGroup; handlers: PassengerHandlers }) {
  const record = getGuideBoardingRecord(passenger, handlers.segment.key);
  const changed = handlers.statusOf(passenger) === "boarded" && record.actualPoint;
  return (
    <div className="guide-customers-point">
      <span>{changed ? `예약 ${group.boardingPoint}` : group.boardingPoint}</span>
      {changed && <span className="badge info">실제 {record.actualPoint}</span>}
    </div>
  );
}

function PassengerTableRow({
  row,
  handlers,
  expanded,
  onToggleExpanded,
}: {
  row: PassengerRow;
  handlers: PassengerHandlers;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const { passenger, group, isLeader, standalone, leader } = row;
  const status = handlers.statusOf(passenger);
  const showContact = isLeader || standalone;
  const companions = group.passengers.slice(1);
  const companionLabel = [
    `${companions.length}명`,
    ...(["unchecked", "no_show"] as const).flatMap((key) => {
      const count = companions.filter((item) => handlers.statusOf(item) === key).length;
      return count > 0 ? [`${key === "unchecked" ? "미확인" : "미탑승"} ${count}`] : [];
    }),
  ].join(" · ");
  return (
    <tr className={`${!isLeader && !standalone ? "is-companion" : ""} is-${status}`}>
      <td className="is-check">
        <SelectBox passenger={passenger} handlers={handlers} />
      </td>
      <td>
        <div className="guide-customers-name">
          <strong>{passenger.name}</strong>
          {isLeader && !standalone && companions.length > 0 && (
            <button
              type="button"
              className={`guide-customers-toggle ${expanded ? "is-open" : ""}`}
              aria-expanded={expanded}
              onClick={onToggleExpanded}
            >
              <ChevronDown size={14} aria-hidden="true" />
              동행자 {expanded ? "접기" : "보기"} ({companionLabel})
            </button>
          )}
        </div>
      </td>
      <td>
        <span className={`badge ${isLeader ? "info" : "gray"}`}>{isLeader ? "대표예약자" : "동행자"}</span>
        {!isLeader && standalone && <small className="guide-customers-leader">대표 {leader.name}</small>}
      </td>
      <td>{showContact ? maskGuidePhone(group.phone) : <span className="guide-customers-muted">대표 연락</span>}</td>
      <td>
        <PointCell passenger={passenger} group={group} handlers={handlers} />
      </td>
      <td>
        <div className="guide-customers-vehicle">
          <span className="badge gray">{handlers.vehicleOf(passenger)?.name ?? "미배정"}</span>
          {status !== "excluded" && (
            <button
              type="button"
              className="guide-customers-vehicle-change"
              onClick={() => handlers.onChangeVehicle(passenger)}
              aria-label={`${passenger.name} 호차 변경`}
            >
              변경
            </button>
          )}
        </div>
      </td>
      <td>{formatGuideSeat(handlers.assignmentOf(passenger).seat)}</td>
      <td>
        {isLeader ? (
          <div className="guide-customers-reserved">
            <strong>예약 {group.passengers.length}명</strong>
            <GroupStats group={group} statusOf={handlers.statusOf} />
          </div>
        ) : (
          <span className="guide-customers-muted">-</span>
        )}
      </td>
      <td>
        <StatusCell passenger={passenger} handlers={handlers} />
      </td>
      <td>
        <PassengerNotes notes={passenger.notes} />
      </td>
      <td>
        {showContact ? (
          <CallLink group={group} leader={leader} label={isLeader ? "전화" : "대표 전화"} compact />
        ) : (
          <span className="guide-customers-muted">-</span>
        )}
      </td>
      <td>
        <div className="guide-customers-actions">
          <BoardingActions passenger={passenger} group={group} handlers={handlers} />
        </div>
      </td>
    </tr>
  );
}

function PaxLabel({
  passenger,
  isLeader,
  status,
}: {
  passenger: GuidePassenger;
  isLeader: boolean;
  status: GuideBoardingDisplayStatus;
}) {
  return (
    <>
      <span className="guide-pax-name">
        <strong>{passenger.name}</strong>
        <small>{isLeader ? "대표" : "동행"}</small>
      </span>
      <GuideBoardingStatusBadge status={status} />
    </>
  );
}

function GroupCard({
  view,
  handlers,
  filterActive,
  expanded,
  onToggleExpanded,
  activePassenger,
  onActivate,
}: {
  view: GroupView;
  handlers: PassengerHandlers;
  filterActive: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  activePassenger: string | null;
  onActivate: (id: string) => void;
}) {
  const { group, visible } = view;
  const leader = group.passengers[0];
  const collapsible = !filterActive && group.passengers.length > 1;
  const showList = !collapsible || expanded;
  const single = visible.length === 1;
  const hasUnchecked = group.passengers.some((item) => handlers.statusOf(item) === "unchecked");
  return (
    <li className={`guide-customers-card ${hasUnchecked ? "has-unchecked" : ""}`}>
      <div className="guide-customers-card-head">
        <div className="guide-customers-card-title">
          <strong>{leader.name}</strong>
          <span>
            대표예약자 · {group.boardingPoint} · {maskGuidePhone(group.phone)}
          </span>
        </div>
      </div>
      <p className="guide-customers-card-meta">
        <b>예약 {group.passengers.length}명</b>
        <GroupStats group={group} statusOf={handlers.statusOf} />
      </p>
      {collapsible && (
        <button
          type="button"
          className={`guide-customers-toggle ${expanded ? "is-open" : ""}`}
          aria-expanded={expanded}
          onClick={onToggleExpanded}
        >
          <ChevronDown size={14} aria-hidden="true" />
          탑승객 {expanded ? "접기" : "보기"} ({group.passengers.length}명)
        </button>
      )}
      {showList && (
        <ul className="guide-pax-list">
          {visible.map((passenger) => {
            const status = handlers.statusOf(passenger);
            const open = single || activePassenger === passenger.id;
            const record = getGuideBoardingRecord(passenger, handlers.segment.key);
            const detail = formatRecordDetail(record, status);
            return (
              <li key={passenger.id} className={`guide-pax is-${status} ${open ? "is-open" : ""}`}>
                <div className="guide-pax-row">
                  <SelectBox passenger={passenger} handlers={handlers} />
                  {single ? (
                    <div className="guide-pax-main">
                      <PaxLabel passenger={passenger} isLeader={passenger.id === leader.id} status={status} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="guide-pax-main"
                      aria-expanded={open}
                      onClick={() => onActivate(passenger.id)}
                    >
                      <PaxLabel passenger={passenger} isLeader={passenger.id === leader.id} status={status} />
                      <ChevronDown size={16} aria-hidden="true" className="guide-pax-chevron" />
                    </button>
                  )}
                </div>
                <div className="guide-pax-extra">
                    <span className="guide-pax-seat">
                      <span className="badge gray">{handlers.vehicleOf(passenger)?.name ?? "미배정"}</span>
                      <span>좌석 {formatGuideSeat(handlers.assignmentOf(passenger).seat)}</span>
                    </span>
                    {detail && <small>{detail}</small>}
                    {status === "boarded" && record.actualPoint && (
                      <small>
                        예약 {group.boardingPoint} → <b>실제 {record.actualPoint}</b>
                      </small>
                    )}
                    {hasNotes(passenger) && <PassengerNotes notes={passenger.notes} />}
                </div>
                {open && status !== "excluded" && (
                  <div className="guide-pax-actions">
                    <BoardingActions passenger={passenger} group={group} handlers={handlers} />
                    <button
                      type="button"
                      className="secondary guide-pax-vehicle-btn"
                      onClick={() => handlers.onChangeVehicle(passenger)}
                    >
                      호차 변경
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="guide-customers-card-actions">
        <CallLink group={group} leader={leader} label="대표예약자 전화" />
      </div>
    </li>
  );
}
