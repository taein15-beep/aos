"use client";

import type { ReactNode } from "react";
import { AlertTriangle, ChevronDown, X } from "lucide-react";
import { GUIDE_CHAT_INVITE_META } from "@/lib/admin/guide-chatroom-data";
import { GUIDE_NOTE_IMPORTANCES } from "@/lib/admin/guide-notes-data";
import { GUIDE_VEHICLE_OPERATION_BADGE, type GuideClosingReport } from "@/lib/admin/guide-closing-data";

/** 가이드 운영결과 보고서 공통 섹션. 가이드 운영결과 보고(7단계)와 관리자 운영결과 확인(8단계)에서 함께 사용합니다. */

export function ClosingSection({
  id,
  title,
  summary,
  tone,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  summary: string;
  tone: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const bodyId = `guide-close-${id}`;
  return (
    <section
      className={`panel guide-close-section ${tone} ${open ? "is-open" : ""}`}
      aria-labelledby={`${bodyId}-title`}
    >
      <div className="guide-close-section-head">
        <h2 id={`${bodyId}-title`}>{title}</h2>
        <span>{summary}</span>
        <button
          type="button"
          className="guide-close-section-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={`${title} ${open ? "접기" : "펼치기"}`}
          onClick={onToggle}
        >
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="guide-close-section-body" id={bodyId}>
        {children}
      </div>
    </section>
  );
}

export function SheetModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop guide-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal guide-sheet-modal guide-close-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-close-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="guide-close-modal-title">{title}</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`guide-close-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/* ---------------------------------------------------------------- 섹션 */

export function BoardingResult({
  report,
  closed,
  onCustomers,
}: {
  report: GuideClosingReport;
  closed: boolean;
  onCustomers: () => void;
}) {
  const { boarding, noShows, unchecked } = report;
  return (
    <div className="guide-close-stack">
      <div className="guide-close-stats">
        <Stat label="예약인원" value={`${report.people}명`} />
        <Stat label="탑승완료" value={`${boarding.boarded}명`} tone="is-success" />
        <Stat label="미탑승" value={`${boarding.noShow}명`} tone={boarding.noShow ? "is-danger" : ""} />
        <Stat label="탑승 미확인" value={`${boarding.unchecked}명`} tone={boarding.unchecked ? "is-warn" : ""} />
      </div>
      <p className="guide-sheet-note">
        출발 탑승 구간 기준입니다. 미탑승은 예약취소가 아니며 예약은 그대로 유지됩니다. 예약취소 고객은 운영 대상에서
        제외되어 집계에 포함되지 않습니다.
      </p>
      {unchecked.length > 0 && (
        <div className="guide-close-alert" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            <b>⚠ 탑승상태가 확인되지 않은 고객이 {unchecked.length}명 있습니다.</b>
            <small>
              {unchecked.map((entry) => `${entry.passenger.name}(${entry.vehicle?.name ?? "미배정"})`).join(", ")}
            </small>
          </span>
          {!closed && (
            <button type="button" className="secondary" onClick={onCustomers}>
              고객 확인
            </button>
          )}
        </div>
      )}
      <div className="guide-close-sub">
        <h3>
          미탑승 고객 <b>{noShows.length}명</b>
        </h3>
        {noShows.length === 0 ? (
          <p className="guide-sheet-note">미탑승 고객이 없습니다.</p>
        ) : (
          <ul className="guide-close-people">
            {noShows.map((entry) => (
              <li key={entry.passenger.id}>
                <strong>{entry.passenger.name}</strong>
                <span>
                  {entry.vehicle?.name ?? "미배정"} · {entry.point || "탑승지 미지정"} · {entry.group.reservationCode}
                </span>
                <span className="badge danger">미탑승</span>
                <em>{entry.record.reason ?? "사유 미입력"}</em>
                {entry.record.memo && <small>{entry.record.memo}</small>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function VehicleResults({ report }: { report: GuideClosingReport }) {
  return (
    <div className="guide-close-stack">
      <div className="guide-close-vehicle-cards">
        {report.vehicles.map((item) => (
          <article key={item.vehicle.id} className="guide-close-vehicle-card">
            <header>
              <strong>{item.vehicle.name}</strong>
              <span className={`badge ${GUIDE_VEHICLE_OPERATION_BADGE[item.status]}`}>{item.status}</span>
            </header>
            <dl className="guide-close-dl is-compact">
              <div>
                <dt>담당가이드</dt>
                <dd>{item.guide?.name ?? "미배정"}</dd>
              </div>
              <div>
                <dt>예약인원</dt>
                <dd>{item.summary.reserved}명</dd>
              </div>
              <div>
                <dt>탑승완료</dt>
                <dd>{item.summary.boarded}명</dd>
              </div>
              <div>
                <dt>미탑승</dt>
                <dd>{item.summary.noShow}명</dd>
              </div>
              {item.summary.unchecked > 0 && (
                <div>
                  <dt>탑승 미확인</dt>
                  <dd className="is-warn">{item.summary.unchecked}명</dd>
                </div>
              )}
              <div>
                <dt>일정</dt>
                <dd>
                  완료 {item.summary.scheduleDone} / {item.summary.scheduleTotal}
                </dd>
              </div>
              <div>
                <dt>차량</dt>
                <dd>
                  {item.vehicle.plateNo || "-"} · 기사 {item.vehicle.driverName || "-"}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      {report.unassigned.length > 0 && (
        <p className="guide-sheet-note">호차 미배정 고객 {report.unassigned.length}명은 호차별 결과에서 제외됩니다.</p>
      )}
    </div>
  );
}

export function PointResults({ report }: { report: GuideClosingReport }) {
  return (
    <div className="guide-customers-table-wrap guide-close-table-wrap">
      <table className="guide-close-table">
        <thead>
          <tr>
            <th scope="col">호차</th>
            <th scope="col">탑승지</th>
            <th scope="col">예약</th>
            <th scope="col">탑승</th>
            <th scope="col">미탑승</th>
            <th scope="col">미확인</th>
          </tr>
        </thead>
        <tbody>
          {report.vehicles.flatMap((item) =>
            item.points.map((point, index) => (
              <tr key={`${item.vehicle.id}-${point.point}`}>
                <td>{index === 0 ? item.vehicle.name : ""}</td>
                <td>
                  {point.point}
                  {point.otherPoint > 0 && <small> (다른 탑승지 탑승 {point.otherPoint})</small>}
                </td>
                <td>{point.reserved}</td>
                <td>{point.boarded}</td>
                <td className={point.noShow ? "is-danger" : ""}>{point.noShow || "-"}</td>
                <td className={point.unchecked ? "is-warn" : ""}>{point.unchecked || "-"}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ScheduleResult({ report }: { report: GuideClosingReport }) {
  const { schedule } = report;
  return (
    <div className="guide-close-stack">
      <div className="guide-close-stats">
        <Stat label="전체 일정" value={`${schedule.total}개`} />
        <Stat label="정상완료" value={`${schedule.normal}개`} tone="is-success" />
        <Stat label="지연" value={`${schedule.delayed}개`} tone={schedule.delayed ? "is-warn" : ""} />
        <Stat
          label="미완료"
          value={`${schedule.total - schedule.done}개`}
          tone={schedule.total - schedule.done ? "is-danger" : ""}
        />
      </div>
      <ol className="guide-close-timeline">
        {schedule.timeline.map(({ item, rows, done, maxDelay }) => (
          <li key={item.id} className={!done ? "is-open" : maxDelay > 0 ? "is-delayed" : "is-done"}>
            <div className="guide-close-timeline-head">
              <strong>{item.title}</strong>
              <span className={`badge ${!done ? "warn" : maxDelay > 0 ? "danger" : "success"}`}>
                {!done ? "미완료" : maxDelay > 0 ? `최대 ${maxDelay}분 지연` : "정상"}
              </span>
            </div>
            <ul>
              {rows.map((row) => (
                <li key={row.vehicle.id}>
                  <b>{row.vehicle.name}</b>
                  <span>예정 {row.planned || "-"}</span>
                  <span>실제 {row.actual || "-"}</span>
                  <span className={row.delayMinutes > 0 ? "is-delay" : ""}>
                    {!row.done ? "미완료" : row.delayMinutes > 0 ? `${row.delayMinutes}분 지연` : "정상"}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="guide-close-sub">
        <h3>
          일정 변경 <b>{schedule.changes.length}건</b>
        </h3>
        {schedule.changes.length === 0 ? (
          <p className="guide-sheet-note">현장에서 변경된 출발시간이 없습니다.</p>
        ) : (
          <ul className="guide-close-changes">
            {schedule.changes.map((change) => (
              <li key={`${change.vehicle.id}-${change.item.id}`}>
                <strong>{change.item.title}</strong>
                <span>{change.vehicle.name}</span>
                <b>
                  {change.from} → {change.to}
                </b>
              </li>
            ))}
          </ul>
        )}
        <p className="guide-sheet-note">상품 일정표의 예정시간은 변경되지 않으며, 현장 운영시간만 별도로 기록됩니다.</p>
      </div>
    </div>
  );
}

export function NoticeResult({ report, onOpen }: { report: GuideClosingReport; onOpen: () => void }) {
  const { notices } = report;
  return (
    <div className="guide-close-stack">
      <div className="guide-close-stats">
        <Stat label="전체 발송" value={`${notices.sends}회`} />
        <Stat label="발송 연락처" value={`${notices.contacts}건`} />
        <Stat label="성공" value={`${notices.success}건`} tone="is-success" />
        <Stat label="실패" value={`${notices.failed}건`} tone={notices.failed ? "is-danger" : ""} />
      </div>
      <div className="guide-close-sub">
        <h3>안내유형</h3>
        {notices.types.length === 0 ? (
          <p className="guide-sheet-note">발송한 고객 안내가 없습니다.</p>
        ) : (
          <ul className="guide-close-chips">
            {notices.types.map((type) => (
              <li key={type.label}>
                {type.label} <b>{type.count}회</b>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="guide-close-foot">
        <small>SAMPLE · 실제 발송이 아닌 고객소통 화면의 더미 발송이력입니다. 안내방 참여 안내는 제외합니다.</small>
        <button type="button" className="secondary" onClick={onOpen}>
          발송이력 보기
        </button>
      </div>
    </div>
  );
}

export function ChatResult({ report, onOpen }: { report: GuideClosingReport; onOpen: () => void }) {
  const { chat } = report;
  return (
    <div className="guide-close-stack">
      <p className="guide-close-line">
        운영방식 <b>{chat.modeLabel}</b>
      </p>
      <ul className="guide-close-rooms">
        {chat.rooms.map(({ scope, room, active, progress }) => (
          <li key={scope.scope}>
            <strong>{scope.label}</strong>
            <span className={`badge ${active ? "success" : room ? "gray" : "warn"}`}>
              {active ? "링크 등록" : room ? "사용중지" : "미등록"}
            </span>
            {progress ? (
              <span className={`badge ${GUIDE_CHAT_INVITE_META[progress].badge}`}>
                {GUIDE_CHAT_INVITE_META[progress].label}
              </span>
            ) : (
              <span className="guide-close-muted">안내발송 없음</span>
            )}
          </li>
        ))}
      </ul>
      <div className="guide-close-foot">
        <small>카카오 오픈채팅의 실제 참여인원 · 참여율은 확인할 수 없어 표시하지 않습니다.</small>
        <button type="button" className="secondary" onClick={onOpen}>
          안내방 관리
        </button>
      </div>
    </div>
  );
}

export function NotesResult({ report, onOpen }: { report: GuideClosingReport; onOpen: () => void }) {
  const { notes } = report;
  const counts = { 일반: notes.summary.normal, 확인필요: notes.summary.check, 중요: notes.summary.important };
  return (
    <div className="guide-close-stack">
      <div className="guide-close-stats">
        <Stat label="운영기록" value={`${notes.summary.total}건`} />
        {GUIDE_NOTE_IMPORTANCES.map((importance) => (
          <Stat
            key={importance}
            label={importance}
            value={`${counts[importance]}건`}
            tone={
              importance === "중요" && counts[importance]
                ? "is-danger"
                : importance === "확인필요" && counts[importance]
                  ? "is-warn"
                  : ""
            }
          />
        ))}
      </div>
      <p className="guide-sheet-note">
        중요도는 미처리 기록 기준입니다. 처리완료된 기록은 처리완료로 집계됩니다. (처리완료 {notes.summary.done}건)
      </p>
      <div className="guide-close-sub">
        <h3>구분별</h3>
        <ul className="guide-close-chips">
          {notes.categories.map((item) => (
            <li key={item.category}>
              {item.category} <b>{item.count}건</b>
            </li>
          ))}
        </ul>
      </div>
      <div className="guide-close-foot">
        <small>기록 취소된 운영기록은 집계에서 제외됩니다.</small>
        <button type="button" className="secondary" onClick={onOpen}>
          운영기록 보기
        </button>
      </div>
    </div>
  );
}

export function MemoField({
  id,
  label,
  value,
  readOnly,
  placeholder,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  readOnly: boolean;
  placeholder: string;
  hint: string;
  onChange: (value: string) => void;
}) {
  if (readOnly) {
    return (
      <div className="guide-close-memo-view">
        <span>{label}</span>
        <p>{value || "작성된 내용이 없습니다."}</p>
      </div>
    );
  }
  return (
    <div className="guide-sheet-field guide-close-memo">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        rows={5}
        maxLength={1000}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <small>
        {hint} ({value.length}/1000)
      </small>
    </div>
  );
}
