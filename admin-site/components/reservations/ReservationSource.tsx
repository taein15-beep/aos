"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { AlertTriangle, ArrowRightLeft, Bus, Eye, Info, Lock, X } from "lucide-react";
import {
  OPERATION_ELIGIBILITY_META,
  type ReservationOperationView,
} from "@/lib/admin/operation-assignment-data";
import {
  RESERVATION_HISTORY_FILTER_OPTIONS,
  RESERVATION_HISTORY_TYPE_CATEGORY,
  RESERVATION_HISTORY_TYPE_LABELS,
  formatPeopleLabel,
  reservationHistoryBadgeClass,
  reserveStatusBadgeClass,
  type ReservationDetail,
  type ReservationHistoryCategory,
  type ReservationHistoryEntry,
} from "@/lib/admin/reservations-data";
import {
  RESERVATION_EDIT_OWNER_LABELS,
  RESERVATION_SOURCE_LABELS,
  RESERVATION_SOURCE_SHORT_LABELS,
  RESERVATION_VIEWERS,
  DEFAULT_RESERVATION_VIEWER,
  canEditReservation,
  getReservationCloseAction,
  getReservationEditOwner,
  getReservationEditOwnerName,
  getReservationHandoverAction,
  getReservationOperationStage,
  getReservationPermissionNotice,
  getReservationSourceType,
  getReservationViewer,
  isReservationClosed,
  reservationSourceBadgeClass,
  type ReservationViewer,
} from "@/lib/admin/reservation-permission";

type PermissionTarget = Pick<ReservationDetail, "source" | "reserveStatus">;

const viewerListeners = new Set<() => void>();

function subscribeViewer(listener: () => void) {
  viewerListeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    viewerListeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

function getViewerKeySnapshot() {
  return new URLSearchParams(window.location.search).get("view") ?? "";
}

/** URL의 ?view= 값으로 조회 관점을 유지합니다. (실제 로그인 여행사 판별 전 SAMPLE) */
export function useReservationViewer() {
  const viewerKey = useSyncExternalStore(subscribeViewer, getViewerKeySnapshot, () => "");
  const viewer = getReservationViewer(viewerKey);

  const changeViewer = (key: string) => {
    const next = getReservationViewer(key);
    const url = new URL(window.location.href);
    if (next.key === DEFAULT_RESERVATION_VIEWER.key) url.searchParams.delete("view");
    else url.searchParams.set("view", next.key);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
    viewerListeners.forEach((listener) => listener());
  };

  return [viewer, changeViewer] as const;
}

export function ReservationViewerSwitch({
  viewer,
  onChange,
}: {
  viewer: ReservationViewer;
  onChange: (key: string) => void;
}) {
  return (
    <label className="reservation-viewer-switch">
      <span>
        <Eye size={13} />
        조회 관점
      </span>
      <select aria-label="조회 관점" value={viewer.key} onChange={(event) => onChange(event.target.value)}>
        {RESERVATION_VIEWERS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
      <small>SAMPLE · {viewer.userName} · 로그인 여행사 연동 전</small>
    </label>
  );
}

export function ReservationSourceBadge({ reservation }: { reservation: Pick<ReservationDetail, "source"> }) {
  const type = getReservationSourceType(reservation);
  return (
    <span className={`badge ${reservationSourceBadgeClass(type)}`} title={RESERVATION_SOURCE_LABELS[type]}>
      {RESERVATION_SOURCE_SHORT_LABELS[type]}
    </span>
  );
}

/** 공유상품 예약의 운영 단계 보조 Badge (인계대기 / 인계완료) */
export function ReservationOperationStageBadge({
  reservation,
  compact = false,
}: {
  reservation: PermissionTarget;
  compact?: boolean;
}) {
  const stage = getReservationOperationStage(reservation);
  if (stage === "handoverPending") {
    return <span className="badge info reservation-stage-badge">{compact ? "인계대기" : "운영인계 대기"}</span>;
  }
  if (stage === "handedOver") {
    return <span className="badge success reservation-stage-badge">{compact ? "인계완료" : "운영인계 완료"}</span>;
  }
  return null;
}

export function ReservationPermissionBadges({
  reservation,
  viewer,
}: {
  reservation: PermissionTarget;
  viewer: ReservationViewer;
}) {
  const owner = getReservationEditOwner(reservation);
  const editable = canEditReservation({ reservation, viewer });
  const isShared = getReservationSourceType(reservation) !== "direct";
  return (
    <span className="reservation-permission-badges">
      {owner === "readonly" ? (
        <ReservationOperationStageBadge reservation={reservation} />
      ) : (
        <>
          <span className={`badge ${editable ? "success" : "info"}`} title={getReservationEditOwnerName(reservation)}>
            {isShared ? RESERVATION_EDIT_OWNER_LABELS[owner] : `${getReservationEditOwnerName(reservation)} 수정 가능`}
          </span>
          {owner === "supplierAgency" && <ReservationOperationStageBadge reservation={reservation} />}
        </>
      )}
      {!editable && (
        <span className="badge gray">
          <Lock size={10} /> 읽기 전용
        </span>
      )}
    </span>
  );
}

/** 수정불가 / 인계대기 안내 + 운영관리 권한 인계 카드 */
export function ReservationPermissionNotices({
  reservation,
  viewer,
}: {
  reservation: PermissionTarget;
  viewer: ReservationViewer;
}) {
  const notice = getReservationPermissionNotice(reservation, viewer);
  const handedOver = getReservationOperationStage(reservation) === "handedOver";
  const showHandoverCard = handedOver && !notice;
  if (!notice && !showHandoverCard) return null;
  const items = notice?.items?.filter((item) => item.value) ?? [];
  return (
    <div className="reservation-permission-notices">
      {notice && (
        <div
          className={`product-share-setting-alert reservation-permission-alert ${notice.tone === "info" ? "is-info" : ""}`}
          role={notice.tone === "warn" ? "alert" : "status"}
        >
          {notice.tone === "info" ? <Info size={14} /> : <AlertTriangle size={14} />}
          <div>
            <strong>{notice.title}</strong>
            {notice.description && <p>{notice.description}</p>}
            {items.length > 0 && (
              <dl>
                {items.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      )}
      {showHandoverCard && (
        <div className="panel reservation-handover-card" role="note">
          <ArrowRightLeft size={14} />
          <div>
            <strong>운영관리 권한이 공급여행사로 인계되었습니다.</strong>
            <p>
              공급여행사 {reservation.source?.supplierAgencyName ?? "-"} · 인계일시 {reservation.source?.handoverAt ?? "-"}
            </p>
            <small>예약 원본과 변경이력은 공급여행사·판매여행사·판매점 모두 계속 확인할 수 있습니다.</small>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="member-web-detail-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/** 판매 출처 Card + 상품 연결 정보 Card (읽기 전용) */
export function ReservationSourceCards({
  reservation,
  viewer,
}: {
  reservation: PermissionTarget;
  viewer: ReservationViewer;
}) {
  const source = reservation.source;
  const type = getReservationSourceType(reservation);
  return (
    <>
      <section className="panel member-web-detail-card reservation-source-card">
        <div className="member-web-detail-card-head">
          <strong>판매 출처</strong>
          <ReservationSourceBadge reservation={reservation} />
          <ReservationPermissionBadges reservation={reservation} viewer={viewer} />
        </div>
        <div className="member-web-detail-info-grid">
          <SourceField label="예약경로" value={RESERVATION_SOURCE_LABELS[type]} />
          <SourceField label="공급여행사" value={source?.supplierAgencyName} />
          <SourceField label="판매여행사" value={source?.sellingAgencyName} />
          <SourceField label="판매점" value={source?.sellerName} />
          <SourceField label="판매점코드" value={source?.sellerCode} />
          <SourceField label="원본 상품코드" value={source?.originalProductCode} />
          <SourceField label="판매 상품코드" value={source?.sharedProductCode} />
        </div>
      </section>

      {source && type !== "direct" && (
        <section className="panel member-web-detail-card reservation-source-card">
          <div className="member-web-detail-card-head">
            <strong>상품 연결 정보</strong>
            <span className="badge gray">읽기 전용</span>
          </div>
          <div className="member-web-detail-info-grid">
            <SourceField label="원본 상품" value={source.originalProductName} />
            <SourceField label="공급 상품코드" value={source.originalProductCode} />
            <SourceField label="판매 상품명" value={source.salesProductName} />
            <SourceField label="판매여행사" value={source.sellingAgencyName} />
            <SourceField label="판매점" value={source.sellerName} />
          </div>
        </section>
      )}
    </>
  );
}

function formatActor(actor?: { name: string; agency: string }) {
  return actor ? `${actor.name} (${actor.agency})` : "-";
}

/** 예약 운영관리 Card: 예약마감 / 운영인계 업무 Action */
export function ReservationOperationCard({
  reservation,
  viewer,
  onClose,
  onHandover,
  onViewSettlement,
  assignment,
  onOpenAssignment,
}: {
  reservation: PermissionTarget;
  viewer: ReservationViewer;
  onClose: () => void;
  onHandover: () => void;
  /** 운영인계 완료 후 다음 업무(정산) 이동 */
  onViewSettlement?: () => void;
  /** 출발회차(상품 + 출발일) 운영배정 결과. 배정 작업은 출발회차 운영배정 화면에서 합니다. */
  assignment?: ReservationOperationView | null;
  onOpenAssignment?: () => void;
}) {
  const source = reservation.source;
  const isShared = getReservationSourceType(reservation) !== "direct";
  const stage = getReservationOperationStage(reservation);
  const closed = isReservationClosed(reservation);
  const closeAction = getReservationCloseAction(reservation, viewer);
  const handoverAction = getReservationHandoverAction(reservation, viewer);
  const owner = getReservationEditOwner(reservation);
  const handoverLabel = !isShared
    ? "해당 없음"
    : stage === "handedOver"
      ? "완료"
      : stage === "handoverPending"
        ? "인계대기"
        : "미처리";

  return (
    <section className="panel member-web-detail-card reservation-operation-card">
      <div className="member-web-detail-card-head">
        <strong>예약 운영관리</strong>
        <ReservationOperationStageBadge reservation={reservation} />
      </div>
      <div className="reservation-operation-body">
        <dl className="reservation-operation-grid">
          <div>
            <dt>현재 예약상태</dt>
            <dd>
              <span className={`badge ${reserveStatusBadgeClass(reservation.reserveStatus)}`}>{reservation.reserveStatus}</span>
            </dd>
          </div>
          <div>
            <dt>수정권한</dt>
            <dd>{owner === "readonly" ? "운영인계 대기 (조회만 가능)" : getReservationEditOwnerName(reservation)}</dd>
          </div>
          <div>
            <dt>예약마감</dt>
            <dd>
              {closed ? `완료${source?.closedAt ? ` · ${source.closedAt}` : ""}` : "미처리"}
              {source?.closedBy && <small>{formatActor(source.closedBy)}</small>}
            </dd>
          </div>
          <div>
            <dt>운영인계</dt>
            <dd>{handoverLabel}</dd>
          </div>
          {isShared && (
            <>
              <div>
                <dt>운영인계 일시</dt>
                <dd>{source?.handoverAt ?? "-"}</dd>
              </div>
              <div>
                <dt>운영인계 처리자</dt>
                <dd>{formatActor(source?.handoverBy)}</dd>
              </div>
            </>
          )}
        </dl>
        <div className="reservation-operation-actions">
          {!closed && (
            <div className="reservation-operation-action">
              <button
                type="button"
                className={closeAction.allowed ? "primary" : "secondary"}
                disabled={!closeAction.allowed}
                onClick={onClose}
              >
                예약마감
              </button>
              {!closeAction.allowed && closeAction.reason && <small>{closeAction.reason}</small>}
            </div>
          )}
          {isShared &&
            (stage === "handedOver" ? (
              <div className="reservation-operation-action">
                <span className="badge success reservation-operation-done">운영인계 완료</span>
                {onViewSettlement && (
                  <button type="button" className="primary" onClick={onViewSettlement}>
                    정산내역 보기
                  </button>
                )}
              </div>
            ) : (
              <div className="reservation-operation-action">
                <button
                  type="button"
                  className={handoverAction.allowed ? "primary" : "secondary"}
                  disabled={!handoverAction.allowed}
                  onClick={onHandover}
                >
                  <ArrowRightLeft size={14} />
                  운영인계
                </button>
                {!handoverAction.allowed && handoverAction.reason && <small>{handoverAction.reason}</small>}
              </div>
            ))}
        </div>
      </div>
      {assignment && <ReservationAssignmentRow assignment={assignment} onOpen={onOpenAssignment} />}
    </section>
  );
}

/** 예약상세: 개별 예약의 운영배정 결과 확인 + 출발회차 운영배정 화면 이동 */
function ReservationAssignmentRow({
  assignment,
  onOpen,
}: {
  assignment: ReservationOperationView;
  onOpen?: () => void;
}) {
  const done = assignment.statusLabel === "배정완료" || assignment.statusLabel === "운영인계완료";
  const notice =
    assignment.eligibility === "eligible" ? null : OPERATION_ELIGIBILITY_META[assignment.eligibility].description;
  return (
    <div className="reservation-operation-body reservation-assignment-body">
      <dl className="reservation-operation-grid reservation-assignment-grid">
        <div>
          <dt>운영배정</dt>
          <dd>
            <span className={`badge ${assignment.badge}`}>{assignment.statusLabel}</span>
          </dd>
        </div>
        <div>
          <dt>출발일</dt>
          <dd>{assignment.departureDate}</dd>
        </div>
        <div>
          <dt>호차</dt>
          <dd>{assignment.vehicleDetail || "-"}</dd>
        </div>
        <div>
          <dt>좌석</dt>
          <dd>{assignment.seatLabel || "-"}</dd>
        </div>
        <div>
          <dt>담당가이드</dt>
          <dd>{assignment.guideLabel || "-"}</dd>
        </div>
      </dl>
      <div className="reservation-operation-actions">
        <div className="reservation-operation-action">
          {onOpen && (
            <button type="button" className={done ? "secondary" : "primary"} onClick={onOpen}>
              <Bus size={14} />
              {done ? "운영배정 보기" : "운영배정 바로가기"}
            </button>
          )}
          <small>{notice ?? "상품 + 출발일 전체 예약을 대상으로 배정합니다."}</small>
        </div>
      </div>
    </div>
  );
}

export type ReservationActionDialogState = {
  title: string;
  notes: string[];
  details: { label: string; value?: string }[];
  confirmLabel: string;
  onConfirm: () => void;
  /** 닫기 버튼 문구 (기본: 취소) */
  cancelLabel?: string;
  confirmTone?: "danger";
};

export function ReservationActionDialog({
  dialog,
  onClose,
}: {
  dialog: ReservationActionDialogState | null;
  onClose: () => void;
}) {
  if (!dialog) return null;
  return (
    <div className="modal-backdrop product-share-confirm-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal product-share-confirm-modal reservation-action-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-action-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="reservation-action-title">{dialog.title}</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <dl className="product-share-confirm-details">
          {dialog.details
            .filter((item) => item.value)
            .map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
        </dl>
        <ul className="reservation-action-notes">
          {dialog.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            {dialog.cancelLabel ?? "취소"}
          </button>
          <button
            type="button"
            className={dialog.confirmTone === "danger" ? "danger-button" : "primary"}
            onClick={dialog.onConfirm}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 예약마감 / 운영인계 확인 Modal에 보여줄 예약 요약 */
export function buildReservationActionDetails(reservation: ReservationDetail) {
  return [
    { label: "예약번호", value: reservation.code },
    { label: "상품명", value: reservation.source?.originalProductName ?? reservation.productName },
    { label: "출발일", value: reservation.departureAt },
    { label: "예약인원", value: formatPeopleLabel(reservation.counts) },
    { label: "판매여행사", value: reservation.source?.sellingAgencyName },
    { label: "판매점", value: reservation.source?.sellerName },
    { label: "공급여행사", value: reservation.source?.supplierAgencyName },
  ];
}

/** 변경이력 Section (수정권한이 없는 관점에서도 조회 가능) */
export function ReservationHistorySection({ history }: { history: ReservationHistoryEntry[] }) {
  const [filter, setFilter] = useState<"all" | ReservationHistoryCategory>("all");
  const filtered = useMemo(
    () => (filter === "all" ? history : history.filter((entry) => RESERVATION_HISTORY_TYPE_CATEGORY[entry.type] === filter)),
    [filter, history],
  );

  return (
    <section className="panel member-web-detail-card reservation-history-card">
      <div className="member-web-detail-card-head">
        <strong>변경이력</strong>
        <span className="member-web-status-history-count">{filtered.length}건</span>
        <div className="reservation-history-filter" role="group" aria-label="변경이력 필터">
          {RESERVATION_HISTORY_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={filter === option.value ? "active" : ""}
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {filtered.length > 0 ? (
        <div className="member-web-detail-table-wrap">
          <table className="member-web-detail-table reservation-history-table">
            <thead>
              <tr>
                <th>일시</th>
                <th>작업자</th>
                <th>소속</th>
                <th>작업구분</th>
                <th>변경내용</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id}>
                  <td className="date-cell">{entry.at}</td>
                  <td>{entry.actor.name}</td>
                  <td>{entry.actor.agency}</td>
                  <td>
                    <span className={`badge ${reservationHistoryBadgeClass(entry.type)}`}>
                      {RESERVATION_HISTORY_TYPE_LABELS[entry.type]}
                    </span>
                  </td>
                  <td className="text-left reservation-history-content">
                    {entry.summary && <p>{entry.summary}</p>}
                    {entry.changes && entry.changes.length > 0 && (
                      <ul>
                        {entry.changes.map((change) => (
                          <li key={change.label}>
                            <b>{change.label}:</b> {change.before} → {change.after}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="member-web-detail-empty">선택한 구분의 변경이력이 없습니다.</div>
      )}
    </section>
  );
}
