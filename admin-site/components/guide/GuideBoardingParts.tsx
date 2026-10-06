"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  GUIDE_BOARDING_STATUS_META,
  GUIDE_NO_SHOW_REASONS,
  GUIDE_OTHER_POINT_REASON,
  type GuideBoardingDisplayStatus,
  type GuideBoardingSegment,
  type GuideNoShowReason,
} from "@/lib/admin/guide-operation-data";

export function GuideBoardingStatusBadge({ status }: { status: GuideBoardingDisplayStatus }) {
  const meta = GUIDE_BOARDING_STATUS_META[status];
  return (
    <span className={`badge ${meta.badge} guide-boarding-badge`}>
      <span aria-hidden="true">{meta.symbol}</span>
      {meta.label}
    </span>
  );
}

export type GuideSegmentSummary = { confirmed: number; total: number; complete: boolean };

/** 이동 구간(출발 탑승·귀가 탑승 등) 선택 탭. 구간 배열 길이에 맞춰 렌더링됩니다. */
export function GuideBoardingSegmentTabs({
  segments,
  activeKey,
  summaries,
  onChange,
}: {
  segments: GuideBoardingSegment[];
  activeKey: string;
  summaries: Record<string, GuideSegmentSummary>;
  onChange: (key: string) => void;
}) {
  return (
    <div className="guide-segment-tabs" role="tablist" aria-label="탑승 구간">
      {segments.map((segment) => {
        const summary = summaries[segment.key];
        const active = segment.key === activeKey;
        return (
          <button
            type="button"
            role="tab"
            key={segment.key}
            aria-selected={active}
            className={active ? "is-active" : ""}
            onClick={() => onChange(segment.key)}
          >
            <strong>{segment.label}</strong>
            <span>{segment.route}</span>
            {summary && (
              <em className={summary.complete ? "is-complete" : ""}>
                {summary.complete ? "확인 완료" : `확인 ${summary.confirmed} / ${summary.total}`}
              </em>
            )}
          </button>
        );
      })}
    </div>
  );
}

export type GuideNoShowTarget = {
  passengerName: string;
  reservationPoint: string;
  segment: GuideBoardingSegment;
};

export type GuideNoShowResult = { reason: GuideNoShowReason; memo?: string; actualPoint?: string };

export function GuideNoShowDialog({
  target,
  boardingPoints,
  onClose,
  onSubmit,
}: {
  target: GuideNoShowTarget;
  boardingPoints: string[];
  onClose: () => void;
  onSubmit: (result: GuideNoShowResult) => void;
}) {
  const reasons = GUIDE_NO_SHOW_REASONS.filter(
    (reason) => target.segment.usesReservationPoint || reason !== GUIDE_OTHER_POINT_REASON,
  );
  const otherPoints = boardingPoints.filter((point) => point !== target.reservationPoint);
  const [reason, setReason] = useState<GuideNoShowReason | "">("");
  const [memo, setMemo] = useState("");
  const [actualPoint, setActualPoint] = useState(otherPoints[0] ?? "");

  const isOtherPoint = reason === GUIDE_OTHER_POINT_REASON;
  const canSubmit = reason !== "" && (reason !== "기타" || memo.trim() !== "") && (!isOtherPoint || actualPoint !== "");

  const submit = () => {
    if (reason === "" || !canSubmit) return;
    onSubmit({
      reason,
      ...(reason === "기타" ? { memo: memo.trim() } : {}),
      ...(isOtherPoint ? { actualPoint } : {}),
    });
  };

  return (
    <div className="modal-backdrop guide-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal guide-sheet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-no-show-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="guide-no-show-title">미탑승 처리</h3>
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
              <dt>구간</dt>
              <dd>{target.segment.label}</dd>
            </div>
            <div>
              <dt>예약 탑승지</dt>
              <dd>{target.reservationPoint}</dd>
            </div>
          </dl>
          <p className="guide-sheet-question">고객의 미탑승 사유를 선택해주세요.</p>
          <div className="guide-sheet-options" role="radiogroup" aria-label="미탑승 사유">
            {reasons.map((item) => (
              <label key={item} className={reason === item ? "is-checked" : ""}>
                <input
                  type="radio"
                  name="guide-no-show-reason"
                  value={item}
                  checked={reason === item}
                  onChange={() => setReason(item)}
                />
                {item}
              </label>
            ))}
          </div>
          {reason === "기타" && (
            <label className="guide-sheet-field">
              <span>메모</span>
              <textarea
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                rows={3}
                maxLength={100}
                placeholder="미탑승 사유를 간단히 입력해주세요."
              />
            </label>
          )}
          {isOtherPoint && (
            <div className="guide-sheet-point">
              <div className="guide-sheet-point-row">
                <span>예약 탑승지</span>
                <strong>{target.reservationPoint}</strong>
              </div>
              <label className="guide-sheet-field">
                <span>실제 탑승지</span>
                <select value={actualPoint} onChange={(event) => setActualPoint(event.target.value)}>
                  {otherPoints.map((point) => (
                    <option key={point} value={point}>
                      {point}
                    </option>
                  ))}
                </select>
              </label>
              <p>다른 탑승지에서 탑승한 경우 미탑승이 아닌 탑승완료로 기록되며, 예약 탑승지와 실제 탑승지가 함께 표시됩니다.</p>
            </div>
          )}
          <p className="guide-sheet-note">예약인원과 예약상태는 변경되지 않으며, 이 구간의 탑승상태만 기록됩니다. (SAMPLE · 저장 안 됨)</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button type="button" className={isOtherPoint ? "primary" : "primary guide-danger-btn"} disabled={!canSubmit} onClick={submit}>
            {isOtherPoint ? "탑승완료로 처리" : "미탑승 처리"}
          </button>
        </div>
      </div>
    </div>
  );
}
