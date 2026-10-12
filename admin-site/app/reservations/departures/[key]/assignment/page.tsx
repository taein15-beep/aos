"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { GuideOperationPhaseBadge } from "@/components/guide/GuideOperationPhaseBadge";
import { ShareConfirmDialog, type ShareConfirmDialogState } from "@/components/products/ShareConfirmDialog";
import { useQueryParam } from "@/components/settlements/SettlementParts";
import {
  GUIDE_ASSIGNMENT_STATUS_BADGE,
  GUIDE_DEFAULT_ASSIGNMENT_KEY,
  formatGuideDepartureDate,
  getGuideHandoverChecks,
  GUIDE_DEFERRABLE_VEHICLE_FIELDS,
  isGuideHandoverReady,
  getGuideOperationPath,
  getGuideOperationSummary,
  getGuideReservationOperation,
  countGuidePassengersByPoint,
  getGuidePassengerPoint,
  getGuidePassengerPointOptions,
  getGuidePassengerPointStatus,
  getGuidePassengerVehicle,
  getGuideVehicleBoardingGroup,
  type GuideDeparture,
  type GuideOperationPlan,
  type GuidePassenger,
  type GuideReservationGroup,
  type GuideVehicle,
  formatTestReferenceNow,
} from "@/lib/admin/guide-operation-data";
import {
  OPERATION_ELIGIBILITY_META,
  getOperationPlan,
  getOperationReservationNotices,
  previewOperationDeparture,
  saveOperationPlan,
} from "@/lib/admin/operation-assignment-data";
import { formatBoardingRoute } from "@/lib/admin/product-boarding-data";
import { getProductBoardingPath } from "@/lib/admin/products-data";

const UNASSIGNED_FILTER = "unassigned";
const POINT_MISSING_FILTER = "none";
const CLEAR_VALUE = "__clear";
const NONE_VALUE = "__none";
const MIXED_VALUE = "__mixed";
const PARTIAL_VALUE = "__partial";
const HANDOVER_BY = "장윤호 (관리자)";

function formatNow() {
  return formatTestReferenceNow();
}

function vehicleIdOf(passenger: GuidePassenger) {
  return passenger.assignment[GUIDE_DEFAULT_ASSIGNMENT_KEY]?.vehicleId ?? "";
}

function seatOf(passenger: GuidePassenger) {
  return passenger.assignment[GUIDE_DEFAULT_ASSIGNMENT_KEY]?.seat ?? 0;
}

export default function OperationAssignmentPage() {
  const params = useParams<{ key: string }>();
  const router = useRouter();
  const departureKey = useMemo(() => decodeURIComponent(params.key ?? ""), [params.key]);
  const initialPlan = useMemo(() => getOperationPlan(departureKey), [departureKey]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const notify = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  };

  const backToReservations = () => router.push("/reservations");

  return (
    <ProductAdminShell
      activeMenu="예약관리"
      currentChild="예약접수현황"
      breadcrumb={
        <>
          <span>예약관리</span>
          <b>/</b>
          <span>예약접수현황</span>
          <b>/</b>
          <strong>운영배정</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
    >
      <main className="content member-web-detail-content guide-ops-content ops-assign-content">
        {!initialPlan ? (
          <section className="panel member-web-detail-not-found">
            <strong>출발상품을 찾을 수 없습니다.</strong>
            <p>요청한 출발상품({departureKey || "-"})의 운영배정 정보가 없습니다.</p>
            <button type="button" className="secondary" onClick={backToReservations}>
              <ArrowLeft size={15} />
              예약목록으로
            </button>
          </section>
        ) : (
          <OperationAssignmentBody
            departureKey={departureKey}
            initialPlan={initialPlan}
            onBack={backToReservations}
            onNotify={notify}
          />
        )}
      </main>
    </ProductAdminShell>
  );
}

function OperationAssignmentBody({
  departureKey,
  initialPlan,
  onBack,
  onNotify,
}: {
  departureKey: string;
  initialPlan: GuideOperationPlan;
  onBack: () => void;
  onNotify: (message: string) => void;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [filter, setFilter] = useQueryParam("view", "all");
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [dialog, setDialog] = useState<ShareConfirmDialogState | null>(null);
  /** 호차 변경으로 탑승지가 미지정이 된 탑승객 → 기존 탑승지명 (새 탑승지 선택 시 해제) */
  const [pointNotices, setPointNotices] = useState<Record<string, string>>({});

  const departure = useMemo(() => previewOperationDeparture(departureKey, plan), [departureKey, plan]);
  const reservationNotices = useMemo(() => getOperationReservationNotices(departureKey), [departureKey]);
  if (!departure) return null;

  const summary = getGuideOperationSummary(departure);
  const checks = getGuideHandoverChecks(departure);
  const ready = isGuideHandoverReady(checks);
  const passengers = departure.reservations.flatMap((group) => group.passengers);
  const staffName = (id: string) => departure.staff.find((item) => item.id === id)?.name ?? "";
  const countIn = (vehicleId: string) => passengers.filter((item) => vehicleIdOf(item) === vehicleId).length;
  const activeFilter =
    filter === "all" ||
    filter === UNASSIGNED_FILTER ||
    filter === POINT_MISSING_FILTER ||
    departure.vehicles.some((vehicle) => vehicle.id === filter)
      ? filter
      : "all";
  const pointPending = summary.pointMissing + summary.pointCheck;
  const needsPoint = (item: GuidePassenger) => {
    const status = getGuidePassengerPointStatus(departure, item);
    return status === "missing" || status === "check" || status === "no_group";
  };
  const boardingPath =
    departure.productCode && departure.productCode !== "-" ? getProductBoardingPath(departure.productCode) : "";

  /** 저장 후 인계 상태가 있던 경우 변경사항이 생기면 재인계가 필요합니다. */
  const commit = (next: GuideOperationPlan, message?: string, options: { keepHandover?: boolean } = {}) => {
    const resetHandover = Boolean(plan.handover && next.handover && !options.keepHandover);
    const saved = resetHandover ? { ...next, handover: null } : next;
    setPlan(saved);
    saveOperationPlan(departureKey, saved);
    if (resetHandover) onNotify("운영정보가 변경되어 운영인계를 다시 진행해야 합니다.");
    else if (message) onNotify(message);
  };

  const matchesFilter = (item: GuidePassenger) => {
    if (activeFilter === "all") return true;
    if (activeFilter === UNASSIGNED_FILTER)
      return !departure.vehicles.some((vehicle) => vehicle.id === vehicleIdOf(item));
    if (activeFilter === POINT_MISSING_FILTER) return needsPoint(item);
    return vehicleIdOf(item) === activeFilter;
  };

  const search = keyword.trim();
  const visibleGroups = departure.reservations
    .map((group) => ({
      group,
      visible: group.passengers.filter(matchesFilter),
    }))
    .filter(({ group, visible }) => {
      if (!visible.length) return false;
      if (!search) return true;
      return (
        group.reservationCode.includes(search) ||
        group.phone.includes(search) ||
        group.passengers.some((item) => item.name.includes(search))
      );
    });
  const visibleGroupIds = visibleGroups.flatMap(({ group }) => group.passengers.map((item) => item.id));
  const selectedPassengers = passengers.filter((item) => selected.includes(item.id));

  const toggleIds = (ids: string[], checked: boolean) =>
    setSelected((value) =>
      checked ? Array.from(new Set([...value, ...ids])) : value.filter((id) => !ids.includes(id)),
    );

  const clearSelection = (ids: string[]) => setSelected((value) => value.filter((id) => !ids.includes(id)));

  /**
   * 호차가 바뀌는 탑승객은 기존 차량 좌석을 미지정으로 초기화합니다.
   * 기존 탑승지가 새 호차의 탑승지 그룹에 있으면 유지하고, 없으면 다른 장소를 자동 지정하지 않고 미지정으로 변경합니다.
   */
  const applyAssign = (vehicle: GuideVehicle, ids: string[], moving: string[]) => {
    const assignments = { ...plan.assignments };
    const boardingPoints = { ...plan.boardingPoints };
    const hadSeat = moving.some((id) => (plan.assignments[id]?.seat ?? 0) > 0);
    const group = getGuideVehicleBoardingGroup(departure, vehicle);
    const cleared: Record<string, string> = {};
    moving.forEach((id) => {
      assignments[id] = { vehicleId: vehicle.id, seat: 0 };
      const point = plan.boardingPoints[id] ?? "";
      if (group && point && !group.points.some((value) => value.name === point)) {
        boardingPoints[id] = "";
        cleared[id] = point;
      }
    });
    const clearedIds = Object.keys(cleared);
    setPointNotices((value) => {
      const next = { ...value, ...cleared };
      moving.filter((id) => !cleared[id]).forEach((id) => delete next[id]);
      return next;
    });
    if (clearedIds.length) {
      setExpanded((value) =>
        Array.from(
          new Set([
            ...value,
            ...departure.reservations
              .filter((item) => item.passengers.some((passenger) => clearedIds.includes(passenger.id)))
              .map((item) => item.id),
          ]),
        ),
      );
    }
    commit(
      { ...plan, assignments, boardingPoints },
      [
        `${moving.length}명을 ${vehicle.name}에 배정했습니다.`,
        hadSeat ? "이동한 탑승객의 좌석은 미지정으로 초기화했습니다." : "",
        clearedIds.length
          ? `변경한 호차의 탑승지에 기존 탑승지가 없습니다. 새 탑승지를 선택해주세요. (${clearedIds.length}명 탑승지 미지정)`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
    clearSelection(ids);
  };

  const requestAssign = (vehicle: GuideVehicle, ids: string[], options: { confirmMixed?: boolean } = {}) => {
    const moving = ids.filter((id) => plan.assignments[id]?.vehicleId !== vehicle.id);
    if (!moving.length) {
      onNotify(`선택한 탑승객은 이미 ${vehicle.name}에 배정되어 있습니다.`);
      return;
    }
    const checkCapacity = () => {
      const current = countIn(vehicle.id);
      const after = current + moving.length;
      if (after <= vehicle.capacity) {
        applyAssign(vehicle, ids, moving);
        return;
      }
      setDialog({
        title: "정원 초과 경고",
        message: `${vehicle.name} 정원을 초과합니다.\n정원 초과 상태에서는 운영인계를 진행할 수 없습니다.`,
        confirmLabel: "초과 배정",
        details: [
          { label: "현재", value: `${current}명` },
          { label: "추가", value: `${moving.length}명` },
          { label: "배정 후", value: `${after}명` },
          { label: "정원", value: `${vehicle.capacity}명` },
        ],
        onConfirm: () => {
          setDialog(null);
          applyAssign(vehicle, ids, moving);
        },
      });
    };
    if (!options.confirmMixed) {
      checkCapacity();
      return;
    }
    setDialog({
      title: "예약 전체 호차 변경",
      message: `이 예약에는 개별 호차가 지정된 탑승객이 있습니다.\n\n전체 호차를 ${vehicle.name}로 변경하면\n개별 배정도 모두 ${vehicle.name}로 변경됩니다.`,
      confirmLabel: "전체 변경",
      onConfirm: () => {
        setDialog(null);
        checkCapacity();
      },
    });
  };

  const unassign = (ids: string[]) => {
    const assignments = { ...plan.assignments };
    ids.forEach((id) => {
      assignments[id] = null;
    });
    commit({ ...plan, assignments }, `${ids.length}명의 호차 배정을 해제했습니다.`);
    clearSelection(ids);
  };

  const isMixedGroup = (group: GuideReservationGroup) =>
    new Set(group.passengers.map(vehicleIdOf).filter((id) => departure.vehicles.some((vehicle) => vehicle.id === id)))
      .size > 1;

  /** 예약 전체 호차배정: 대표예약자 + 동행자 전원에게 동일 호차를 적용합니다. */
  const changeGroupVehicle = (group: GuideReservationGroup, vehicleId: string) => {
    const ids = group.passengers.map((item) => item.id);
    if (vehicleId === CLEAR_VALUE) {
      unassign(ids);
      return;
    }
    const vehicle = departure.vehicles.find((value) => value.id === vehicleId);
    if (vehicle) requestAssign(vehicle, ids, { confirmMixed: isMixedGroup(group) });
  };

  /** 탑승객 개별 호차변경: 해당 탑승객만 변경하고 같은 예약의 다른 탑승객은 유지합니다. */
  const changePassengerVehicle = (item: GuidePassenger, vehicleId: string) => {
    const vehicle = departure.vehicles.find((value) => value.id === vehicleId);
    if (!vehicle) {
      unassign([item.id]);
      return;
    }
    requestAssign(vehicle, [item.id]);
  };

  const wholeGroups = departure.reservations.filter((group) =>
    group.passengers.every((item) => selected.includes(item.id)),
  );
  const wholeGroupIds = new Set(wholeGroups.flatMap((group) => group.passengers.map((item) => item.id)));
  const groupMode = selectedPassengers.length > 0 && selectedPassengers.every((item) => wholeGroupIds.has(item.id));
  const bulkAssign = (vehicle: GuideVehicle) =>
    requestAssign(vehicle, selected, {
      confirmMixed: groupMode && wholeGroups.some(isMixedGroup),
    });

  /** 탑승지만 변경합니다. 호차·좌석은 바꾸지 않습니다. */
  const applyPoint = (ids: string[], point: string) => {
    const boardingPoints = { ...plan.boardingPoints };
    ids.forEach((id) => {
      boardingPoints[id] = point;
    });
    setPointNotices((value) => {
      const next = { ...value };
      ids.forEach((id) => delete next[id]);
      return next;
    });
    commit({ ...plan, boardingPoints }, `${ids.length}명의 탑승지를 ${point || "미지정"}(으)로 변경했습니다.`);
    clearSelection(ids);
  };

  const requestPoint = (ids: string[], point: string, options: { confirmMixed?: boolean } = {}) => {
    const changing = ids.filter((id) => (plan.boardingPoints[id] ?? "") !== point);
    if (!changing.length) {
      onNotify(`선택한 탑승객의 탑승지는 이미 ${point || "미지정"}입니다.`);
      return;
    }
    if (!options.confirmMixed) {
      applyPoint(ids, point);
      return;
    }
    setDialog({
      title: "예약 전체 탑승지 변경",
      message: `이 예약에는 개별 탑승지가 지정된 탑승객이 있습니다.\n\n전체 탑승지를 ${point}(으)로 변경하면\n개별 탑승지도 모두 ${point}(으)로 변경됩니다.`,
      confirmLabel: "전체 변경",
      onConfirm: () => {
        setDialog(null);
        applyPoint(ids, point);
      },
    });
  };

  const isMixedPointGroup = (group: GuideReservationGroup) =>
    new Set(group.passengers.map(getGuidePassengerPoint)).size > 1;

  /** 여러 탑승객에게 공통 적용 가능한 탑승지 = 각자 배정 호차의 탑승지 그룹에 모두 포함된 탑승지 */
  const commonPointOptions = (list: GuidePassenger[]) => {
    const optionLists = list
      .map((item) => getGuidePassengerPointOptions(departure, item))
      .filter((options) => options.length > 0);
    if (!optionLists.length) return [];
    return optionLists[0].filter((point) => optionLists.every((options) => options.includes(point)));
  };

  /** 탑승지 그룹 변경: 기존 탑승지가 새 그룹에도 있으면 유지, 없으면 확인필요로 표시합니다 (자동 변경 없음). */
  const changeVehicleBoardingGroup = (vehicle: GuideVehicle, groupId: string) => {
    const nextGroup = departure.boardingGroups.find((item) => item.id === groupId) ?? null;
    const affected = passengers.filter((item) => {
      if (vehicleIdOf(item) !== vehicle.id) return false;
      const point = getGuidePassengerPoint(item);
      return Boolean(point) && !(nextGroup?.points.some((value) => value.name === point) ?? false);
    });
    const apply = () =>
      commit(
        {
          ...plan,
          vehicles: plan.vehicles.map((value) =>
            value.id === vehicle.id ? { ...value, boardingGroupId: groupId } : value,
          ),
        },
        `${vehicle.name}의 탑승지 그룹을 ${nextGroup?.name ?? "미선택"}(으)로 변경했습니다.${
          affected.length ? ` 확인필요 ${affected.length}명` : ""
        }`,
      );
    if (!affected.length) {
      apply();
      return;
    }
    setDialog({
      title: "탑승지 그룹 변경",
      message: `${vehicle.name}의 탑승지 그룹을 변경하면\n현재 배정된 고객 ${affected.length}명의 탑승지를 다시 지정해야 합니다.\n\n새 탑승지 그룹에 같은 이름의 탑승지가 있는 고객은 그대로 유지됩니다.`,
      confirmLabel: "변경",
      details: [
        {
          label: "변경 후 그룹",
          value: nextGroup ? `${nextGroup.name} (${formatBoardingRoute(nextGroup)})` : "미선택",
        },
        {
          label: "확인필요",
          value: affected.map((item) => `${item.name}(${getGuidePassengerPoint(item)})`).join(", "),
        },
      ],
      onConfirm: () => {
        setDialog(null);
        apply();
      },
    });
  };

  /** 예약 전체 탑승지: 대표예약자 + 동행자 전원에게 동일 탑승지를 적용합니다. */
  const changeGroupPoint = (group: GuideReservationGroup, point: string) =>
    requestPoint(
      group.passengers.map((item) => item.id),
      point,
      { confirmMixed: isMixedPointGroup(group) },
    );

  const bulkPointOptions = commonPointOptions(selectedPassengers);
  const bulkPoint = (point: string) =>
    requestPoint(selected, point, {
      confirmMixed: groupMode && wholeGroups.some(isMixedPointGroup),
    });

  const focusField = (id: string) => document.getElementById(id)?.focus();

  const changeSeat = (item: GuidePassenger, value: string) => {
    const current = plan.assignments[item.id];
    if (!current) return;
    const seat = Math.max(0, Math.floor(Number(value) || 0));
    commit({
      ...plan,
      assignments: { ...plan.assignments, [item.id]: { ...current, seat } },
    });
  };

  const updateVehicle = (vehicleId: string, patch: Partial<GuideVehicle>) =>
    commit(
      {
        ...plan,
        vehicles: plan.vehicles.map((vehicle) => (vehicle.id === vehicleId ? { ...vehicle, ...patch } : vehicle)),
      },
      undefined,
      {
        keepHandover: Object.keys(patch).every((field) =>
          (GUIDE_DEFERRABLE_VEHICLE_FIELDS as readonly string[]).includes(field),
        ),
      },
    );

  const addVehicle = () => {
    let index = plan.vehicles.length + 1;
    while (plan.vehicles.some((vehicle) => vehicle.id === `V-${index}`)) index += 1;
    const vehicle: GuideVehicle = {
      id: `V-${index}`,
      name: `${index}호차`,
      plateNo: "",
      driverName: "",
      driverPhone: "",
      guideId: "",
      capacity: 45,
      boardingGroupId: "",
    };
    commit(
      { ...plan, vehicles: [...plan.vehicles, vehicle] },
      `${vehicle.name}를 추가했습니다. 차량·기사·가이드 정보를 입력해 주세요.`,
    );
  };

  const removeVehicle = (vehicle: GuideVehicle) => {
    if (countIn(vehicle.id) > 0) {
      onNotify(`${vehicle.name}에 배정된 고객이 있어 삭제할 수 없습니다. 먼저 배정을 해제해 주세요.`);
      return;
    }
    if (activeFilter === vehicle.id) setFilter("all");
    commit(
      {
        ...plan,
        vehicles: plan.vehicles.filter((value) => value.id !== vehicle.id),
      },
      `${vehicle.name}를 삭제했습니다.`,
    );
  };

  const openHandover = () => {
    if (!ready) {
      onNotify("운영인계 조건을 먼저 확인해 주세요.");
      return;
    }
    setDialog({
      title: "가이드 운영인계",
      message: "운영정보를 가이드에게 인계하시겠습니까?",
      confirmLabel: "운영인계",
      details: [
        { label: "전체 고객", value: `${summary.total}명` },
        ...departure.vehicles.map((vehicle) => ({
          label: vehicle.name,
          value: `${countIn(vehicle.id)}명 / ${staffName(vehicle.guideId)}`,
        })),
        { label: "총괄가이드", value: departure.guideName },
        { label: "미배정", value: `${summary.unassigned}명` },
      ],
      onConfirm: () => {
        const next = {
          ...plan,
          handover: { at: formatNow(), by: HANDOVER_BY },
        };
        setPlan(next);
        saveOperationPlan(departureKey, next);
        setDialog(null);
        onNotify("가이드에게 운영정보를 인계했습니다. (SAMPLE)");
      },
    });
  };

  const kpis = [
    {
      key: "total",
      label: "전체 탑승객",
      value: `${summary.total}명`,
      tone: "",
    },
    {
      key: "assigned",
      label: "배정완료",
      value: `${summary.assigned}명`,
      tone: summary.unassigned === 0 ? "is-success" : "is-pending",
    },
    {
      key: "unassigned",
      label: "미배정",
      value: `${summary.unassigned}명`,
      tone: summary.unassigned > 0 ? "is-warn" : "is-success",
    },
    {
      key: "points",
      label: "탑승지 미지정",
      value: `${pointPending}명`,
      tone: pointPending > 0 ? "is-warn" : "is-success",
    },
    {
      key: "vehicles",
      label: "운영차량",
      value: `${summary.vehicleCount}대`,
      tone: "is-muted",
    },
    {
      key: "guides",
      label: "담당가이드",
      value: `${summary.guideCount}명`,
      tone: "is-muted",
    },
  ];

  return (
    <>
      <section className="panel guide-ops-hero" aria-labelledby="ops-assign-title">
        <div className="guide-ops-hero-main">
          <p className="member-web-breadcrumb">예약관리 &gt; 예약접수현황 &gt; 운영배정</p>
          <div className="guide-ops-hero-status">
            <GuideOperationPhaseBadge departure={departure} />
            {!departure.handover && (
              <span className={`badge ${GUIDE_ASSIGNMENT_STATUS_BADGE[summary.status]}`}>{summary.status}</span>
            )}
            <span className="guide-ops-code">{departure.productCode}</span>
          </div>
          <h1 id="ops-assign-title">{departure.productName}</h1>
          <dl className="guide-ops-hero-meta">
            <div className="is-date">
              <dt>출발일</dt>
              <dd>{formatGuideDepartureDate(departure.departureDate)}</dd>
            </div>
            <div>
              <dt>전체인원</dt>
              <dd>{summary.total}명</dd>
            </div>
            <div>
              <dt>총괄가이드</dt>
              <dd>{departure.leadStaffId ? departure.guideName : "미지정"}</dd>
            </div>
          </dl>
        </div>
        <div className="guide-ops-hero-actions">
          <button type="button" className="secondary" onClick={onBack}>
            <ArrowLeft size={15} />
            예약목록
          </button>
          {departure.handover ? (
            <button type="button" className="primary" onClick={() => router.push(getGuideOperationPath(departure.key))}>
              가이드 운영
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              disabled={!ready}
              title={ready ? undefined : "운영인계 조건을 모두 충족해야 합니다."}
              onClick={openHandover}
            >
              가이드 운영인계
            </button>
          )}
        </div>
      </section>

      <section className="guide-ops-kpis" aria-label="운영배정 현황">
        {kpis.map((kpi) => (
          <article className={`member-web-detail-kpi guide-ops-kpi ${kpi.tone}`} key={kpi.key}>
            <span>
              <small>{kpi.label}</small>
              <strong>{kpi.value}</strong>
            </span>
          </article>
        ))}
      </section>

      <HandoverPanel
        departure={departure}
        ready={ready}
        checks={checks}
        unassigned={summary.unassigned}
        onHandover={openHandover}
      />

      <section className="panel guide-ops-section ops-assign-section" aria-labelledby="ops-assign-vehicles-title">
        <div className="ops-assign-section-head">
          <div className="guide-ops-section-head">
            <h2 id="ops-assign-vehicles-title">호차 · 가이드 배정</h2>
            <span>차량·기사 정보와 호차별 담당가이드·탑승지 그룹을 지정합니다.</span>
          </div>
          <div className="ops-assign-head-actions">
            {boardingPath && (
              <button type="button" className="secondary" onClick={() => router.push(boardingPath)}>
                <MapPin size={14} />
                탑승지 설정
              </button>
            )}
            <label className="ops-assign-lead">
              <span>총괄가이드</span>
              <select
                value={plan.leadStaffId}
                aria-invalid={!plan.leadStaffId}
                onChange={(event) => commit({ ...plan, leadStaffId: event.target.value })}
              >
                <option value="">선택</option>
                {departure.staff.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="secondary" onClick={addVehicle}>
              <Plus size={14} />
              차량/호차 추가
            </button>
          </div>
        </div>
        {departure.boardingGroups.length === 0 && (
          <p className="ops-assign-notice is-warn" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              <b>이 상품에 등록된 탑승지 그룹이 없습니다.</b>
              <small>
                {boardingPath
                  ? "상품관리 > 탑승지 설정에서 탑승지 그룹을 먼저 등록해 주세요."
                  : "상품관리에서 상품을 찾을 수 없어 탑승지 그룹을 사용할 수 없습니다."}
              </small>
            </span>
          </p>
        )}
        {departure.vehicles.length ? (
          <div className="ops-assign-vehicle-grid">
            {departure.vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                departure={departure}
                assignedCount={countIn(vehicle.id)}
                passengers={passengers.filter((item) => vehicleIdOf(item) === vehicle.id)}
                onChange={(patch) => updateVehicle(vehicle.id, patch)}
                onChangeBoardingGroup={(groupId) => changeVehicleBoardingGroup(vehicle, groupId)}
                onRemove={() => removeVehicle(vehicle)}
              />
            ))}
          </div>
        ) : (
          <p className="ops-assign-empty">등록된 호차가 없습니다. [차량/호차 추가]로 운영차량을 등록해 주세요.</p>
        )}
      </section>

      <section className="panel guide-ops-section ops-assign-section" aria-labelledby="ops-assign-customers-title">
        <div className="ops-assign-section-head">
          <div className="guide-ops-section-head">
            <h2 id="ops-assign-customers-title">고객별 탑승지 · 호차 배정</h2>
            <span>예약 단위로 빠르게 배정하거나, 탑승객을 펼쳐 개별 탑승지·호차·좌석을 지정합니다.</span>
          </div>
          <label className="ops-assign-search">
            <Search size={14} aria-hidden="true" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="고객명, 예약번호, 연락처"
              aria-label="고객 검색"
            />
          </label>
        </div>

        <div className="guide-vehicle-tabs ops-assign-filter" role="tablist" aria-label="배정 필터">
          {[
            { key: "all", label: "전체", count: summary.total },
            {
              key: UNASSIGNED_FILTER,
              label: "미배정",
              count: summary.unassigned,
            },
            { key: POINT_MISSING_FILTER, label: "탑승지 미지정", count: pointPending },
            ...departure.vehicles.map((vehicle) => ({
              key: vehicle.id,
              label: vehicle.name,
              count: countIn(vehicle.id),
            })),
          ].map((tab) => (
            <button
              type="button"
              role="tab"
              key={tab.key}
              aria-selected={activeFilter === tab.key}
              className={`${activeFilter === tab.key ? "is-active" : ""} ${(tab.key === UNASSIGNED_FILTER || tab.key === POINT_MISSING_FILTER) && tab.count > 0 ? "is-warn" : ""}`}
              title={
                tab.key === POINT_MISSING_FILTER ? "탑승지 미지정 · 확인필요 고객 (호차 배정 고객 기준)" : undefined
              }
              onClick={() => setFilter(tab.key)}
            >
              <strong>{tab.label}</strong>
              <span>{tab.count}명</span>
            </button>
          ))}
        </div>

        <div className="ops-assign-fleet" aria-label="호차별 현황">
          {departure.vehicles.map((vehicle) => {
            const count = countIn(vehicle.id);
            return (
              <button
                type="button"
                key={vehicle.id}
                className={`ops-assign-fleet-item ${count > vehicle.capacity ? "is-over" : ""} ${activeFilter === vehicle.id ? "is-active" : ""}`}
                onClick={() => setFilter(vehicle.id)}
              >
                <b>{vehicle.name}</b>
                <span>
                  {count} / {vehicle.capacity}명
                </span>
                <small>담당가이드 {staffName(vehicle.guideId) || "미지정"}</small>
              </button>
            );
          })}
          <button
            type="button"
            className={`ops-assign-fleet-item is-unassigned ${summary.unassigned > 0 ? "has-warn" : ""} ${activeFilter === UNASSIGNED_FILTER ? "is-active" : ""}`}
            onClick={() => setFilter(UNASSIGNED_FILTER)}
          >
            <b>미배정</b>
            <span>{summary.unassigned}명</span>
            <small>{summary.unassigned > 0 ? "호차 배정 필요" : "전원 배정"}</small>
          </button>
        </div>

        {reservationNotices.length > 0 && (
          <div className="ops-assign-reservation-notices" role="note">
            <b>예약상태 확인</b>
            <ul>
              {reservationNotices.map((item) => (
                <li key={item.code}>
                  <span className={`badge ${OPERATION_ELIGIBILITY_META[item.eligibility].badge}`}>
                    {OPERATION_ELIGIBILITY_META[item.eligibility].label}
                  </span>
                  {item.code} · {item.bookerName} ({item.reserveStatus})
                  <small>{OPERATION_ELIGIBILITY_META[item.eligibility].description}</small>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedPassengers.length > 0 && (
          <div className="guide-customers-bulk ops-assign-bulk" role="status">
            <span>
              {groupMode ? (
                <>
                  <b>
                    예약 {wholeGroups.length}건 · 선택 {selectedPassengers.length}명
                  </b>{" "}
                  · 예약 전체배정
                </>
              ) : (
                <>
                  <b>탑승객 {selectedPassengers.length}명</b> · {selectedPassengers[0].name}
                  {selectedPassengers.length > 1 ? ` 외 ${selectedPassengers.length - 1}명` : ""} · 개별 호차변경
                </>
              )}
              {departure.vehicles.length === 0 && " · 먼저 [차량/호차 추가]로 호차를 등록해 주세요."}
            </span>
            {departure.vehicles.map((vehicle) => (
              <button type="button" key={vehicle.id} className="primary" onClick={() => bulkAssign(vehicle)}>
                {groupMode ? `${vehicle.name} 배정` : `${vehicle.name}로 변경`}
              </button>
            ))}
            <button type="button" className="secondary" onClick={() => unassign(selected)}>
              배정 해제
            </button>
            <select
              className="ops-assign-select ops-assign-bulk-point"
              value=""
              aria-label={groupMode ? "선택 예약 탑승지 변경" : "선택 탑승객 탑승지 변경"}
              disabled={bulkPointOptions.length === 0}
              title={
                bulkPointOptions.length === 0 ? "선택한 고객의 호차에 공통으로 포함된 탑승지가 없습니다." : undefined
              }
              onChange={(event) => bulkPoint(event.target.value)}
            >
              <option value="" disabled>
                {bulkPointOptions.length ? "탑승지 변경" : "공통 탑승지 없음"}
              </option>
              {bulkPointOptions.map((point) => (
                <option key={point} value={point}>
                  {point}(으)로 변경
                </option>
              ))}
            </select>
            <button type="button" className="secondary" onClick={() => setSelected([])}>
              선택 해제
            </button>
          </div>
        )}

        <div className="guide-customers-table-wrap">
          <table className="ops-assign-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="표시된 예약 전체 선택"
                    checked={visibleGroupIds.length > 0 && visibleGroupIds.every((id) => selected.includes(id))}
                    onChange={(event) => toggleIds(visibleGroupIds, event.target.checked)}
                  />
                </th>
                <th>예약번호</th>
                <th>고객명</th>
                <th>탑승지</th>
                <th>인원</th>
                <th>운영배정</th>
                <th>호차</th>
                <th>좌석</th>
                <th>탑승객</th>
              </tr>
            </thead>
            <tbody>
              {visibleGroups.length ? (
                visibleGroups.map(({ group, visible }) => (
                  <GroupRows
                    key={group.id}
                    group={group}
                    visible={visible}
                    caution={reservationNotices.some(
                      (item) => item.code === group.reservationCode && item.eligibility === "caution",
                    )}
                    departure={departure}
                    selected={selected}
                    open={expanded.includes(group.id)}
                    onToggleOpen={() =>
                      setExpanded((value) =>
                        value.includes(group.id) ? value.filter((id) => id !== group.id) : [...value, group.id],
                      )
                    }
                    onToggleIds={toggleIds}
                    onChangeGroupVehicle={(vehicleId) => changeGroupVehicle(group, vehicleId)}
                    groupPointOptions={commonPointOptions(group.passengers)}
                    pointNotices={pointNotices}
                    onChangeGroupPoint={(point) => changeGroupPoint(group, point)}
                    onChangePoint={(item, point) => requestPoint([item.id], point)}
                    onFocusField={focusField}
                    onChangeVehicle={changePassengerVehicle}
                    onChangeSeat={changeSeat}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="ops-assign-empty-cell">
                    {summary.total === 0
                      ? "운영배정 대상 예약이 없습니다. 예약확정 등 유효 예약만 배정 대상입니다."
                      : activeFilter === UNASSIGNED_FILTER && !search
                        ? "미배정 고객이 없습니다."
                        : activeFilter === POINT_MISSING_FILTER && !search
                          ? "탑승지 미지정 고객이 없습니다."
                          : "조건에 맞는 고객이 없습니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ShareConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

function HandoverPanel({
  departure,
  ready,
  checks,
  unassigned,
  onHandover,
}: {
  departure: GuideDeparture;
  ready: boolean;
  checks: ReturnType<typeof getGuideHandoverChecks>;
  unassigned: number;
  onHandover: () => void;
}) {
  const router = useRouter();
  return (
    <section className="panel guide-ops-section ops-assign-handover" aria-labelledby="ops-assign-handover-title">
      <div className="ops-assign-section-head">
        <div className="guide-ops-section-head">
          <h2 id="ops-assign-handover-title">운영인계 확인</h2>
          <span>필수 항목이 충족되면 인계할 수 있습니다. 차량번호·기사정보는 인계 후에도 입력할 수 있습니다.</span>
        </div>
        {departure.handover ? (
          <button type="button" className="primary" onClick={() => router.push(getGuideOperationPath(departure.key))}>
            가이드 운영
          </button>
        ) : (
          <button type="button" className="primary" disabled={!ready} onClick={onHandover}>
            가이드 운영인계
          </button>
        )}
      </div>
      {departure.handover ? (
        <p className="ops-assign-notice is-success" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>
            <b>
              운영인계 완료 · {departure.handover.at} · {departure.handover.by}
            </b>
            <small>
              배정 정보를 변경하면 인계가 해제되고 다시 인계해야 합니다. (차량번호·기사정보 입력은 인계 유지)
            </small>
          </span>
        </p>
      ) : (
        unassigned > 0 && (
          <p className="ops-assign-notice is-warn" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              <b>미배정 고객이 {unassigned}명 있습니다.</b>
              <small>모든 고객을 호차에 배정하고 탑승지를 지정해야 운영인계할 수 있습니다.</small>
            </span>
          </p>
        )
      )}
      <ul className="ops-assign-checks">
        {checks.map((check) => (
          <li key={check.key} className={check.ok ? "is-ok" : check.required ? "is-fail" : "is-later"}>
            <span className={`badge ${check.ok ? "success" : check.required ? "warn" : "gray"}`}>
              {check.ok ? "완료" : check.required ? "확인필요" : "추후입력"}
            </span>
            <b>{check.label}</b>
            <small>{check.detail}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

function VehicleCard({
  vehicle,
  departure,
  assignedCount,
  passengers,
  onChange,
  onChangeBoardingGroup,
  onRemove,
}: {
  vehicle: GuideVehicle;
  departure: GuideDeparture;
  assignedCount: number;
  passengers: GuidePassenger[];
  onChange: (patch: Partial<GuideVehicle>) => void;
  onChangeBoardingGroup: (groupId: string) => void;
  onRemove: () => void;
}) {
  const over = assignedCount > vehicle.capacity;
  const group = getGuideVehicleBoardingGroup(departure, vehicle);
  const pointCounts = countGuidePassengersByPoint(passengers);
  const countOf = (point: string) => pointCounts.counts.find((value) => value.point === point)?.count ?? 0;
  const checkCount = group
    ? passengers.filter((item) => getGuidePassengerPointStatus(departure, item) === "check").length
    : 0;
  return (
    <article className="ops-assign-vehicle">
      <div className="ops-assign-vehicle-head">
        <Bus size={16} aria-hidden="true" />
        <input
          className="ops-assign-vehicle-name"
          value={vehicle.name}
          aria-label="호차명"
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <span className={`badge ${over ? "danger" : assignedCount > 0 ? "info" : "gray"}`}>
          <Users size={11} aria-hidden="true" /> {assignedCount} / {vehicle.capacity}명
        </span>
        <button type="button" className="ops-assign-icon-btn" aria-label={`${vehicle.name} 삭제`} onClick={onRemove}>
          <Trash2 size={14} />
        </button>
      </div>
      <div className="ops-assign-vehicle-fields">
        <label>
          <span>정원</span>
          <input
            type="number"
            min={1}
            value={vehicle.capacity}
            aria-invalid={over}
            onChange={(event) =>
              onChange({
                capacity: Math.max(1, Math.floor(Number(event.target.value) || 1)),
              })
            }
          />
        </label>
        <label>
          <span>차량번호</span>
          <input
            value={vehicle.plateNo}
            placeholder="추후 입력 가능"
            className={vehicle.plateNo.trim() ? "" : "is-later"}
            onChange={(event) => onChange({ plateNo: event.target.value })}
          />
        </label>
        <label>
          <span>기사명</span>
          <input
            value={vehicle.driverName}
            placeholder="추후 입력 가능"
            className={vehicle.driverName.trim() ? "" : "is-later"}
            onChange={(event) => onChange({ driverName: event.target.value })}
          />
        </label>
        <label>
          <span>기사 연락처</span>
          <input
            value={vehicle.driverPhone}
            placeholder="010-0000-0000 (추후 입력)"
            className={vehicle.driverPhone.trim() ? "" : "is-later"}
            onChange={(event) => onChange({ driverPhone: event.target.value })}
          />
        </label>
        <label className="is-wide">
          <span>담당가이드</span>
          <select
            value={vehicle.guideId}
            aria-invalid={!vehicle.guideId}
            onChange={(event) => onChange({ guideId: event.target.value })}
          >
            <option value="">선택</option>
            {departure.staff.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.id === departure.leadStaffId ? " (총괄)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="is-wide">
          <span>탑승지</span>
          <select
            value={group ? vehicle.boardingGroupId : ""}
            aria-label={`${vehicle.name} 탑승지 그룹 선택`}
            aria-invalid={!group}
            disabled={departure.boardingGroups.length === 0}
            onChange={(event) => onChangeBoardingGroup(event.target.value)}
          >
            <option value="">{departure.boardingGroups.length ? "탑승지 그룹 선택" : "등록된 탑승지 그룹 없음"}</option>
            {departure.boardingGroups.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="ops-assign-vehicle-route">
        {group ? (
          <>
            <ol>
              {group.points.map((point) => (
                <li key={point.id}>
                  <MapPin size={11} aria-hidden="true" />
                  {point.name}
                  <b>{countOf(point.name)}명</b>
                </li>
              ))}
            </ol>
            {(checkCount > 0 || pointCounts.missing > 0) && (
              <p>
                {checkCount > 0 && <span className="is-warn">⚠ 확인필요 {checkCount}명</span>}
                {pointCounts.missing > 0 && <span className="is-warn">탑승지 미지정 {pointCounts.missing}명</span>}
              </p>
            )}
          </>
        ) : (
          <p className="is-empty">
            {departure.boardingGroups.length
              ? `탑승지 그룹을 선택해야 고객 탑승지를 지정할 수 있습니다.${assignedCount ? ` (배정 고객 ${assignedCount}명)` : ""}`
              : "상품의 탑승지 설정에서 탑승지 그룹을 먼저 등록해 주세요."}
          </p>
        )}
      </div>
    </article>
  );
}

function GroupRows({
  group,
  visible,
  caution,
  departure,
  selected,
  open,
  onToggleOpen,
  onToggleIds,
  groupPointOptions,
  pointNotices,
  onChangeGroupVehicle,
  onChangeGroupPoint,
  onChangePoint,
  onFocusField,
  onChangeVehicle,
  onChangeSeat,
}: {
  group: GuideReservationGroup;
  visible: GuidePassenger[];
  caution: boolean;
  departure: GuideDeparture;
  selected: string[];
  open: boolean;
  groupPointOptions: string[];
  pointNotices: Record<string, string>;
  onToggleOpen: () => void;
  onToggleIds: (ids: string[], checked: boolean) => void;
  onChangeGroupVehicle: (vehicleId: string) => void;
  onChangeGroupPoint: (point: string) => void;
  onChangePoint: (item: GuidePassenger, point: string) => void;
  onFocusField: (id: string) => void;
  onChangeVehicle: (item: GuidePassenger, vehicleId: string) => void;
  onChangeSeat: (item: GuidePassenger, value: string) => void;
}) {
  const operation = getGuideReservationOperation(departure, group.reservationCode);
  const ids = group.passengers.map((item) => item.id);
  const leader = group.passengers[0];
  const vehicleCounts = operation?.vehicleCounts ?? [];
  const unassignedCount = group.passengers.length - (operation?.assigned ?? 0);
  const mixed = vehicleCounts.length > 1;
  const groupValue =
    vehicleCounts.length === 1 && unassignedCount === 0
      ? vehicleCounts[0].vehicle.id
      : mixed
        ? MIXED_VALUE
        : vehicleCounts.length === 1
          ? PARTIAL_VALUE
          : NONE_VALUE;
  const breakdown = [
    ...vehicleCounts.map(({ vehicle, count }) => `${vehicle.name} ${count}명`),
    ...(unassignedCount > 0 && vehicleCounts.length > 0 ? [`미배정 ${unassignedCount}명`] : []),
  ];
  /** 같은 예약의 기본 호차(최다 인원)와 다른 호차에 배정된 탑승객 */
  const mainVehicleId = [...vehicleCounts].sort((a, b) => b.count - a.count)[0]?.vehicle.id ?? "";
  const notes = group.passengers.flatMap((item) => item.notes ?? []);
  const seatTaken = (item: GuidePassenger) => {
    const seat = seatOf(item);
    if (!seat) return false;
    return departure.reservations
      .flatMap((value) => value.passengers)
      .some((other) => other.id !== item.id && vehicleIdOf(other) === vehicleIdOf(item) && seatOf(other) === seat);
  };
  const vehicleExists = (item: GuidePassenger) =>
    departure.vehicles.some((vehicle) => vehicle.id === vehicleIdOf(item));

  const pointCounts = operation?.pointCounts ?? [];
  const pointMissing = operation?.pointMissing ?? group.passengers.length;
  const pointCheck = operation?.pointCheck ?? 0;
  const mixedPoint = pointCounts.length > 1;
  const groupPointValue =
    groupPointOptions.length === 0
      ? NONE_VALUE
      : pointCounts.length === 1 && pointMissing === 0 && groupPointOptions.includes(pointCounts[0].point)
        ? pointCounts[0].point
        : mixedPoint
          ? MIXED_VALUE
          : pointCounts.length === 1
            ? PARTIAL_VALUE
            : NONE_VALUE;
  const pointBreakdown = [
    ...pointCounts.map(({ point, count }) => `${point} ${count}명`),
    ...(pointMissing > 0 && pointCounts.length > 0 ? [`미지정 ${pointMissing}명`] : []),
  ];
  const mainPoint = [...pointCounts].sort((a, b) => b.count - a.count)[0]?.point ?? "";
  const pointStatusOf = (item: GuidePassenger) => getGuidePassengerPointStatus(departure, item);

  return (
    <Fragment>
      <tr className={`ops-assign-group ${open ? "is-open" : ""}`}>
        <td>
          <input
            type="checkbox"
            aria-label={`${leader?.name ?? ""} 예약 선택`}
            checked={ids.every((id) => selected.includes(id))}
            onChange={(event) => onToggleIds(ids, event.target.checked)}
          />
        </td>
        <td className="ops-assign-code">{group.reservationCode}</td>
        <td className="ops-assign-name">
          <b>
            {leader?.name}
            {group.passengers.length > 1 ? ` 외 ${group.passengers.length - 1}명` : ""}
          </b>
          {caution && <span className="badge danger">취소요청 · 배정 주의</span>}
          {notes.length > 0 && <small title={notes.join(" / ")}>특이사항 {notes.length}건</small>}
        </td>
        <td className="ops-assign-group-vehicle">
          <select
            className={`ops-assign-select ${groupPointValue === NONE_VALUE ? "is-empty" : ""}`}
            value={groupPointValue}
            aria-label={`${leader?.name ?? ""} 예약 전체 탑승지`}
            disabled={groupPointOptions.length === 0}
            title={groupPointOptions.length === 0 ? "호차 배정 후 호차의 탑승지 그룹을 먼저 선택해 주세요." : undefined}
            onChange={(event) => onChangeGroupPoint(event.target.value)}
          >
            {groupPointValue === NONE_VALUE && (
              <option value={NONE_VALUE} disabled>
                {groupPointOptions.length ? "탑승지 지정" : "호차·탑승지 그룹 먼저"}
              </option>
            )}
            {groupPointValue === MIXED_VALUE && (
              <option value={MIXED_VALUE} disabled>
                {pointCounts.length}개 탑승지
              </option>
            )}
            {groupPointValue === PARTIAL_VALUE && (
              <option value={PARTIAL_VALUE} disabled>
                {pointCheck > 0 ? "탑승지 확인필요" : "일부 지정"}
              </option>
            )}
            {groupPointOptions.map((point) => (
              <option key={point} value={point}>
                {groupPointValue === point ? point : `전체 ${point}`}
              </option>
            ))}
          </select>
          {pointBreakdown.length > 1 && (
            <span className="ops-assign-breakdown" title={pointBreakdown.join(" / ")}>
              {pointBreakdown.map((line) => (
                <small key={line}>{line}</small>
              ))}
            </span>
          )}
        </td>
        <td>
          {visible.length === group.passengers.length
            ? `${group.passengers.length}명`
            : `${visible.length} / ${group.passengers.length}명`}
        </td>
        <td>
          {operation && (
            <span className={`badge ${GUIDE_ASSIGNMENT_STATUS_BADGE[operation.status]}`}>{operation.status}</span>
          )}
          {pointCheck > 0 && (
            <button
              type="button"
              className="ops-assign-route-flag"
              title="배정 호차의 탑승지 그룹에 없는 탑승지가 있습니다. 펼쳐서 확인해 주세요."
              onClick={() => !open && onToggleOpen()}
            >
              ⚠ 탑승지 확인 {pointCheck}명
            </button>
          )}
          {pointMissing > 0 && <small className="ops-assign-status-note">탑승지 미지정 {pointMissing}명</small>}
        </td>
        <td className="ops-assign-group-vehicle">
          <select
            className={`ops-assign-select ${groupValue === NONE_VALUE ? "is-empty" : ""}`}
            value={groupValue}
            aria-label={`${leader?.name ?? ""} 예약 전체 호차`}
            disabled={departure.vehicles.length === 0}
            onChange={(event) => onChangeGroupVehicle(event.target.value)}
          >
            {groupValue === NONE_VALUE && (
              <option value={NONE_VALUE} disabled>
                {departure.vehicles.length ? "호차 배정" : "호차 없음"}
              </option>
            )}
            {groupValue === MIXED_VALUE && (
              <option value={MIXED_VALUE} disabled>
                {vehicleCounts.length}개 호차
              </option>
            )}
            {groupValue === PARTIAL_VALUE && (
              <option value={PARTIAL_VALUE} disabled>
                일부 배정
              </option>
            )}
            {departure.vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {groupValue === vehicle.id ? vehicle.name : `전체 ${vehicle.name}`}
              </option>
            ))}
            {vehicleCounts.length > 0 && <option value={CLEAR_VALUE}>전체 배정 해제</option>}
          </select>
          {breakdown.length > 1 && (
            <span className="ops-assign-breakdown" title={breakdown.join(" / ")}>
              {breakdown.map((line) => (
                <small key={line}>{line}</small>
              ))}
            </span>
          )}
        </td>
        <td className="ops-assign-muted">{vehicleCounts.length > 0 ? "좌석 개별지정" : "-"}</td>
        <td>
          <button type="button" className="secondary ops-assign-expand" aria-expanded={open} onClick={onToggleOpen}>
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {open ? "접기" : "개별 변경"}
          </button>
        </td>
      </tr>
      {open &&
        group.passengers.map((item, index) => {
          const point = getGuidePassengerPoint(item);
          const pointStatus = pointStatusOf(item);
          const pointOptions = getGuidePassengerPointOptions(departure, item);
          const itemVehicle = getGuidePassengerVehicle(departure, item);
          const itemGroup = getGuideVehicleBoardingGroup(departure, itemVehicle);
          const pointNotice = pointStatus === "missing" ? pointNotices[item.id] : undefined;
          const hasIssue = pointStatus === "check" || Boolean(pointNotice);
          return (
            <Fragment key={item.id}>
              <tr
                className={`ops-assign-pax ${visible.includes(item) ? "" : "is-dim"} ${hasIssue ? "has-route-issue" : ""}`}
              >
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${item.name} 선택`}
                    checked={selected.includes(item.id)}
                    onChange={(event) => onToggleIds([item.id], event.target.checked)}
                  />
                </td>
                <td className="ops-assign-muted">{index === 0 ? "대표" : "동행"}</td>
                <td className="ops-assign-name">
                  <b>{item.name}</b>
                  {item.notes && <small>{item.notes.join(" / ")}</small>}
                </td>
                <td>
                  <select
                    id={`ops-point-${item.id}`}
                    className={`ops-assign-select ${point ? "" : "is-empty"}`}
                    value={point}
                    aria-label={`${item.name} 탑승지`}
                    aria-invalid={pointStatus === "check" || pointStatus === "missing"}
                    disabled={pointOptions.length === 0 && !point}
                    title={
                      pointOptions.length === 0 ? "호차 배정 후 호차의 탑승지 그룹을 먼저 선택해 주세요." : undefined
                    }
                    onChange={(event) => onChangePoint(item, event.target.value)}
                  >
                    <option value="">{pointOptions.length ? "미지정" : "호차·탑승지 그룹 먼저 지정"}</option>
                    {point && !pointOptions.includes(point) && (
                      <option value={point} disabled>
                        {point} (확인필요)
                      </option>
                    )}
                    {pointOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </td>
                <td />
                <td className="ops-assign-pax-status">
                  {pointStatus === "pending" && <span className="badge gray">미배정</span>}
                  {pointStatus === "no_group" && <span className="badge warn">탑승지 그룹 미선택</span>}
                  {pointStatus === "missing" && <span className="badge warn">탑승지 미지정</span>}
                  {pointStatus === "check" && <span className="badge danger">확인필요</span>}
                  {mixed && vehicleExists(item) && vehicleIdOf(item) !== mainVehicleId && (
                    <span className="ops-assign-pax-tag">개별 호차</span>
                  )}
                  {mixedPoint && point && point !== mainPoint && (
                    <span className="ops-assign-pax-tag">개별 탑승지</span>
                  )}
                </td>
                <td>
                  <select
                    id={`ops-vehicle-${item.id}`}
                    aria-invalid={pointStatus === "check"}
                    className="ops-assign-select"
                    value={vehicleExists(item) ? vehicleIdOf(item) : ""}
                    aria-label={`${item.name} 호차`}
                    onChange={(event) => onChangeVehicle(item, event.target.value)}
                  >
                    <option value="">미배정</option>
                    {departure.vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    className="ops-assign-seat"
                    value={seatOf(item) || ""}
                    placeholder="미지정"
                    disabled={!vehicleExists(item)}
                    aria-label={`${item.name} 좌석`}
                    aria-invalid={seatTaken(item)}
                    title={seatTaken(item) ? "같은 호차에 중복된 좌석입니다." : undefined}
                    onChange={(event) => onChangeSeat(item, event.target.value)}
                  />
                </td>
                <td />
              </tr>
              {hasIssue && (
                <tr className="ops-assign-route-row">
                  <td />
                  <td colSpan={8}>
                    <span role="alert">
                      <AlertTriangle size={13} aria-hidden="true" />
                      {pointNotice
                        ? `변경한 호차의 탑승지에 기존 탑승지(${pointNotice})가 없습니다. 새 탑승지를 선택해주세요.`
                        : `${itemVehicle?.name ?? ""}의 탑승지 그룹(${itemGroup?.name ?? ""})에 '${point}'이(가) 없습니다. 탑승지 또는 호차를 직접 변경해 주세요.`}
                    </span>
                    <button type="button" className="secondary" onClick={() => onFocusField(`ops-point-${item.id}`)}>
                      탑승지 변경
                    </button>
                    <button type="button" className="secondary" onClick={() => onFocusField(`ops-vehicle-${item.id}`)}>
                      호차 변경
                    </button>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
    </Fragment>
  );
}
