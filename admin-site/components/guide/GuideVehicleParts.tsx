"use client";

import { useState } from "react";
import { Bus, Phone, X } from "lucide-react";
import {
  GUIDE_STAFF_ROLE_LABEL,
  formatGuideSeat,
  getGuidePhoneHref,
  maskGuidePhone,
  type GuideBoardingSummary,
  type GuideSeatAssignment,
  type GuideStaff,
  type GuideVehicle,
} from "@/lib/admin/guide-operation-data";

export type GuideVehicleStat = { vehicle: GuideVehicle; guide: GuideStaff | null; summary: GuideBoardingSummary };

function VehicleState({ summary }: { summary: GuideBoardingSummary }) {
  if (summary.total === 0) return <span className="badge gray">배정 없음</span>;
  return summary.complete ? (
    <span className="badge success">✓ 확인완료</span>
  ) : (
    <span className="badge warn">○ 미확인 {summary.unchecked}</span>
  );
}

/** 전체 / 호차 선택 탭 */
export function GuideVehicleTabs({
  stats,
  total,
  active,
  onChange,
}: {
  stats: GuideVehicleStat[];
  total: number;
  active: string;
  onChange: (vehicleId: string) => void;
}) {
  return (
    <div className="guide-vehicle-tabs" role="tablist" aria-label="호차 선택">
      <button type="button" role="tab" aria-selected={active === "all"} className={active === "all" ? "is-active" : ""} onClick={() => onChange("all")}>
        <strong>전체</strong>
        <span>{total}명</span>
      </button>
      {stats.map(({ vehicle, summary }) => (
        <button
          type="button"
          role="tab"
          key={vehicle.id}
          aria-selected={active === vehicle.id}
          className={`${active === vehicle.id ? "is-active" : ""} ${summary.unchecked > 0 ? "has-unchecked" : ""}`}
          onClick={() => onChange(vehicle.id)}
        >
          <strong>{vehicle.name}</strong>
          <span>{summary.total}명</span>
          {summary.unchecked > 0 ? (
            <em className="is-unchecked">미확인 {summary.unchecked}</em>
          ) : summary.total > 0 ? (
            <em className="is-complete">✓</em>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/** 전체 선택 시 차량별 운영현황 (총괄가이드 화면) */
export function GuideFleetOverview({
  stats,
  total,
  segmentLabel,
  onSelect,
}: {
  stats: GuideVehicleStat[];
  total: number;
  segmentLabel: string;
  onSelect: (vehicleId: string) => void;
}) {
  const pendingVehicles = stats.filter((item) => item.summary.unchecked > 0).length;
  const unassigned = total - stats.reduce((sum, item) => sum + item.summary.total, 0);
  return (
    <section className="panel guide-fleet" aria-labelledby="guide-fleet-title">
      <div className="guide-ops-section-head">
        <h2 id="guide-fleet-title">차량별 운영현황 · {segmentLabel}</h2>
        <span>
          전체 {total}명 · 차량 {stats.length}대
          {pendingVehicles > 0 ? ` · 확인 미완료 차량 ${pendingVehicles}대` : " · 전 차량 확인완료"}
          {unassigned > 0 ? ` · 호차 미배정 ${unassigned}명` : ""}
        </span>
      </div>
      <div className="guide-fleet-grid">
        {stats.map(({ vehicle, guide, summary }) => (
          <button
            type="button"
            key={vehicle.id}
            className={`guide-fleet-card ${summary.unchecked > 0 ? "has-unchecked" : "is-complete"}`}
            onClick={() => onSelect(vehicle.id)}
          >
            <span className="guide-fleet-card-head">
              <Bus size={16} aria-hidden="true" />
              <strong>{vehicle.name}</strong>
              <VehicleState summary={summary} />
            </span>
            <span className="guide-fleet-card-guide">담당 {guide?.name ?? "미배정"}</span>
            <span className="guide-fleet-card-count">
              <b>{summary.boarded}</b> / {summary.total} 탑승
            </span>
            <span className="guide-fleet-card-stats">
              <span className={summary.unchecked > 0 ? "is-unchecked" : ""}>미확인 {summary.unchecked}</span>
              <span className={summary.noShow > 0 ? "is-noshow" : ""}>미탑승 {summary.noShow}</span>
              {summary.excluded > 0 && <span>제외 {summary.excluded}</span>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** 호차 선택 시 차량정보 */
export function GuideVehicleInfo({ stat, segmentLabel }: { stat: GuideVehicleStat; segmentLabel: string }) {
  const { vehicle, guide, summary } = stat;
  return (
    <section className="panel guide-vehicle-info" aria-labelledby="guide-vehicle-info-title">
      <div className="guide-vehicle-info-head">
        <h2 id="guide-vehicle-info-title">
          <Bus size={18} aria-hidden="true" />
          {vehicle.name} · {guide?.name ?? "미배정"} 가이드
        </h2>
        <VehicleState summary={summary} />
        <span className="guide-vehicle-info-segment">{segmentLabel}</span>
      </div>
      <dl className="guide-vehicle-info-grid">
        <div>
          <dt>차량번호</dt>
          <dd>{vehicle.plateNo.trim() || <span className="guide-vehicle-pending">미입력</span>}</dd>
        </div>
        <div>
          <dt>기사</dt>
          <dd>
            {vehicle.driverName.trim() || <span className="guide-vehicle-pending">미입력</span>}
            {vehicle.driverPhone.trim() && (
              <a
                className="guide-vehicle-phone"
                href={getGuidePhoneHref(vehicle.driverPhone)}
                aria-label={`기사 ${vehicle.driverName}에게 전화`}
              >
                <Phone size={13} aria-hidden="true" />
                {maskGuidePhone(vehicle.driverPhone)}
              </a>
            )}
          </dd>
        </div>
        <div>
          <dt>담당가이드</dt>
          <dd>
            {guide ? (
              <>
                {guide.name}
                <small>{guide.roles.map((role) => GUIDE_STAFF_ROLE_LABEL[role]).join(" · ")}</small>
                <a className="guide-vehicle-phone" href={getGuidePhoneHref(guide.phone)} aria-label={`가이드 ${guide.name}에게 전화`}>
                  <Phone size={13} aria-hidden="true" />
                  {maskGuidePhone(guide.phone)}
                </a>
              </>
            ) : (
              "미배정"
            )}
          </dd>
        </div>
        <div>
          <dt>탑승예정</dt>
          <dd>{summary.total}명</dd>
        </div>
      </dl>
    </section>
  );
}

export type GuideVehicleChangeTarget = {
  passengerName: string;
  current: GuideSeatAssignment;
  statusLabel: string;
};

export function GuideVehicleChangeDialog({
  target,
  vehicles,
  occupiedSeats,
  onClose,
  onSubmit,
}: {
  target: GuideVehicleChangeTarget;
  vehicles: GuideVehicle[];
  /** 차량 id별 사용 중인 좌석 (대상 고객 본인 좌석 제외) */
  occupiedSeats: Record<string, number[]>;
  onClose: () => void;
  onSubmit: (next: GuideSeatAssignment) => void;
}) {
  const currentVehicle = vehicles.find((item) => item.id === target.current.vehicleId);
  const firstOther = vehicles.find((item) => item.id !== target.current.vehicleId) ?? currentVehicle;
  const freeSeats = (vehicleId: string) => {
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    const occupied = occupiedSeats[vehicleId] ?? [];
    return vehicle ? Array.from({ length: vehicle.capacity }, (_, index) => index + 1).filter((seat) => !occupied.includes(seat)) : [];
  };
  const [vehicleId, setVehicleId] = useState(firstOther?.id ?? "");
  const [seat, setSeat] = useState(() => freeSeats(firstOther?.id ?? "")[0] ?? 0);
  const seats = freeSeats(vehicleId);
  const unchanged = vehicleId === target.current.vehicleId && seat === target.current.seat;

  const changeVehicle = (next: string) => {
    setVehicleId(next);
    setSeat(next === target.current.vehicleId ? target.current.seat : freeSeats(next)[0] ?? 0);
  };

  return (
    <div className="modal-backdrop guide-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal guide-sheet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-vehicle-change-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="guide-vehicle-change-title">호차 변경</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="guide-sheet-body">
          <dl className="guide-sheet-summary">
            <div>
              <dt>탑승객</dt>
              <dd>{target.passengerName}</dd>
            </div>
            <div>
              <dt>현재</dt>
              <dd>
                {currentVehicle?.name ?? "미배정"} / {formatGuideSeat(target.current.seat)}
              </dd>
            </div>
            <div>
              <dt>탑승상태</dt>
              <dd>{target.statusLabel}</dd>
            </div>
          </dl>
          <div className="guide-vehicle-change-fields">
            <label className="guide-sheet-field">
              <span>호차</span>
              <select value={vehicleId} onChange={(event) => changeVehicle(event.target.value)}>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                    {vehicle.id === target.current.vehicleId ? " (현재)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="guide-sheet-field">
              <span>좌석</span>
              <select value={seat} onChange={(event) => setSeat(Number(event.target.value))}>
                {seats.map((item) => (
                  <option key={item} value={item}>
                    {String(item).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="guide-sheet-note">
            현재 구간과 이후 구간의 배정만 변경되며, 탑승상태와 예약정보는 그대로 유지됩니다. (SAMPLE · 저장 안 됨)
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" disabled={unchanged || seat === 0} onClick={() => onSubmit({ vehicleId, seat })}>
            변경 적용
          </button>
        </div>
      </div>
    </div>
  );
}
