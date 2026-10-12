"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, ChevronRight } from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { SheetModal } from "@/components/guide/GuideClosingReportParts";
import {
  TEST_REFERENCE_DATE,
  getGuideCustomersPath,
  getGuideLeadStaff,
  getGuideStaff,
  getGuideVehicleBoardingGroup,
  type GuideDeparture,
} from "@/lib/admin/guide-operation-data";
import {
  getGuideCommunicationPath,
  getGuideMessageBatches,
  summarizeGuideContacts,
} from "@/lib/admin/guide-communication-data";
import { GUIDE_CHAT_INVITE_META, getGuideChatRoomPath } from "@/lib/admin/guide-chatroom-data";
import { GUIDE_NOTE_IMPORTANCE_META, GUIDE_NOTE_STATUS_BADGE, getGuideNotesPath } from "@/lib/admin/guide-notes-data";
import { buildGuideClosingReport, getGuideClosingPath, getGuideClosingState } from "@/lib/admin/guide-closing-data";
import {
  GUIDE_FOLLOW_UP_STATUS_BADGE,
  getGuideFollowUpDue,
  getGuideReviewAssigneeName,
  getGuideReviewState,
} from "@/lib/admin/guide-review-data";
import {
  getGuideSchedulePath,
  getGuideScheduleState,
  summarizeGuideScheduleOverview,
} from "@/lib/admin/guide-schedule-data";
import { getOperationDeparture, getOperationDepartureReservations } from "@/lib/admin/operation-assignment-data";
import {
  OPS_BOARD_STAGES,
  formatOpsBoardDate,
  getOpsBoardItem,
  type OpsBoardItem,
} from "@/lib/admin/operations-board-data";

const OPS_BOARD_PATH = "/reservations/operations";

/** 출발 전 · 운영중 · 운영종료 후. 섹션 배치와 주요 버튼이 달라집니다. */
type HubGroup = "pre" | "live" | "after";

type HubAction = { label: string; href: string };

type HubLinks = Record<
  | "reservations"
  | "assignment"
  | "guide"
  | "customers"
  | "unchecked"
  | "communication"
  | "chatRoom"
  | "schedule"
  | "notes"
  | "closing"
  | "review"
  | "product",
  string
>;

type HubAlert = { id: string; tone: "danger" | "warn" | "info"; category: string; title: string; action: HubAction };

type HubData = {
  departure: GuideDeparture;
  item: OpsBoardItem;
  group: HubGroup;
  links: HubLinks;
  closing: ReturnType<typeof getGuideClosingState>;
  review: ReturnType<typeof getGuideReviewState>;
  report: ReturnType<typeof buildGuideClosingReport>;
  schedule: ReturnType<typeof summarizeGuideScheduleOverview>;
  batches: ReturnType<typeof getGuideMessageBatches>;
  contacts: ReturnType<typeof summarizeGuideContacts>;
  reservations: ReturnType<typeof getOperationDepartureReservations>;
};

const WORKFLOW_STEPS = ["예약접수", "운영배정", "운영인계", "운영중", "운영종료", "관리자 확인"] as const;

const WORKFLOW_CURRENT: Record<OpsBoardItem["stage"], number> = {
  prep: 1,
  handover: 2,
  live: 3,
  closed: 5,
  reviewed: WORKFLOW_STEPS.length,
};

const groupOf = (item: OpsBoardItem): HubGroup =>
  item.stage === "live" ? "live" : item.stage === "closed" || item.stage === "reviewed" ? "after" : "pre";

const formatHubDate = (date: string) => formatOpsBoardDate(date, true).replace(/-/g, ".");

const countBy = (values: string[]) =>
  values.reduce<{ label: string; count: number }[]>((acc, value) => {
    const found = acc.find((entry) => entry.label === value);
    if (found) found.count += 1;
    else acc.push({ label: value, count: 1 });
    return acc;
  }, []);

/* ---------------------------------------------------------------- 공통 표시 */

function HubSection({
  id,
  title,
  meta,
  actions,
  children,
}: {
  id: string;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel ops-hub-section" aria-labelledby={`ops-hub-${id}`}>
      <header className="ops-hub-section-head">
        <h2 id={`ops-hub-${id}`}>
          {title}
          {meta && <small>{meta}</small>}
        </h2>
        {actions && <div className="ops-hub-section-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

function HubLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link href={href} className={`${primary ? "primary" : "secondary"} ops-hub-btn`}>
      {children}
    </Link>
  );
}

function HubStats({ items }: { items: { label: string; value: string; tone?: string }[] }) {
  return (
    <dl className="ops-hub-stats">
      {items.map((stat) => (
        <div key={stat.label} className={stat.tone ?? ""}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StageBadges({ item }: { item: OpsBoardItem }) {
  if (item.stale) return <span className="badge gray">운영기록 없음</span>;
  const stage = OPS_BOARD_STAGES.find((value) => value.key === item.stage);
  return (
    <span className="ops-board-badges">
      <span className={`badge ${stage?.badge ?? "gray"}`}>{item.phase}</span>
      {item.adminReview && <span className={`badge ${item.adminReviewBadge}`}>{item.adminReview}</span>}
      {item.stage === "prep" && <span className={`badge ${item.assignmentBadge}`}>{item.assignmentStatus}</span>}
    </span>
  );
}

/* ---------------------------------------------------------------- 상태별 버튼 · 알림 */

function buildHeaderActions(item: OpsBoardItem, links: HubLinks): { primary: HubAction; secondary: HubAction[] } {
  const assignment = { label: "운영배정", href: links.assignment };
  const guide = { label: "가이드 운영", href: links.guide };
  switch (item.stage) {
    case "prep":
      return { primary: assignment, secondary: [guide] };
    case "handover":
      return { primary: guide, secondary: [assignment] };
    case "live":
      return {
        primary: { label: "현장운영", href: links.schedule },
        secondary: [
          { label: "탑승현황", href: links.customers },
          { label: "고객소통", href: links.communication },
        ],
      };
    case "closed":
      return {
        primary: { label: "관리자 확인", href: links.review },
        secondary: [{ label: "운영결과", href: links.closing }],
      };
    default:
      return {
        primary: { label: "결과보기", href: links.review },
        secondary: [{ label: "운영결과", href: links.closing }],
      };
  }
}

/** 우선순위: 중요/안전 → 탑승 미확인 → 운영준비 미완료 → 일정 지연 → 관리자 확인대기 → 후속조치 기한초과 */
function buildAlerts({ item, links }: HubData): HubAlert[] {
  const list: HubAlert[] = [];
  item.issues.forEach((issue) =>
    list.push({
      id: `issue-${issue.id}`,
      tone: "danger",
      category: "중요 · 안전",
      title: [issue.vehicleName, issue.title, `처리상태 ${issue.status}`].filter(Boolean).join(" · "),
      action: { label: "이슈 확인", href: issue.href },
    }),
  );
  if (item.stage === "live" && item.boarding.unchecked > 0) {
    list.push({
      id: "unchecked",
      tone: "warn",
      category: "탑승 미확인",
      title: `탑승 미확인 ${item.boarding.unchecked}명 · 탑승 ${item.boarding.boarded} / 예약 ${item.boarding.reserved}명`,
      action: { label: "고객명단", href: links.unchecked },
    });
  }
  if (item.prepNeeded) {
    list.push({
      id: "prep",
      tone: item.dday <= 1 ? "danger" : "warn",
      category: `운영준비 미완료 · 출발 ${item.ddayLabel}`,
      title: item.prep
        .filter((prep) => !prep.ok)
        .map((prep) => prep.need)
        .join(" · "),
      action: { label: "운영배정", href: links.assignment },
    });
  }
  if (item.stage === "live") {
    item.vehicles
      .filter((vehicle) => vehicle.delayMinutes > 0)
      .forEach((vehicle) =>
        list.push({
          id: `delay-${vehicle.id}`,
          tone: "warn",
          category: "일정 지연",
          title: `${vehicle.name} ${vehicle.current} ${vehicle.delayMinutes}분 지연`,
          action: { label: "현장운영", href: vehicle.scheduleHref },
        }),
      );
  }
  if (item.stage === "closed") {
    list.push({
      id: "review",
      tone: "info",
      category: "관리자 확인대기",
      title: item.closedAt ? `운영종료 ${item.closedAt} · 운영결과 확인 필요` : "운영결과 확인 필요",
      action: { label: "관리자 확인", href: links.review },
    });
  }
  if (item.followUps.overdue > 0) {
    list.push({
      id: "overdue",
      tone: "danger",
      category: "후속조치 기한초과",
      title: `기한초과 ${item.followUps.overdue}건 · 진행중 ${item.followUps.open}건`,
      action: { label: "후속조치 확인", href: links.review },
    });
  }
  return list;
}

/* ---------------------------------------------------------------- 섹션 */

function WorkflowSection({ data }: { data: HubData }) {
  const { item, departure, closing, reservations, links } = data;
  const current = WORKFLOW_CURRENT[item.stage];
  const details = [
    `${reservations.length}건 접수`,
    departure.handover ? "배정완료" : item.assignmentStatus,
    departure.handover ? `인계 ${departure.handover.at.slice(5)}` : current > 2 ? "인계기록 없음" : "인계 전",
    item.stage === "live" ? "현장 운영 중" : closing.closedAt ? "운영 완료" : "-",
    closing.closedAt ? closing.closedAt.slice(5) : "-",
    item.adminReview ?? "-",
  ];
  const hrefs = [links.reservations, links.assignment, links.assignment, links.guide, links.closing, links.review];
  return (
    <section className="panel ops-hub-workflow" aria-label="출발회차 진행단계">
      <ol>
        {WORKFLOW_STEPS.map((label, index) => {
          const state = index < current ? "done" : index === current ? "current" : "todo";
          const stateLabel = state === "done" ? "완료" : state === "current" ? "현재" : "-";
          const body = (
            <>
              <small>
                {index + 1}. {stateLabel}
              </small>
              <b>{label}</b>
              <span>{state === "todo" ? "-" : details[index]}</span>
            </>
          );
          return (
            <li key={label} className={`is-${state}`} aria-current={state === "current" ? "step" : undefined}>
              {state === "todo" ? <div>{body}</div> : <Link href={hrefs[index]}>{body}</Link>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ReservationSection({ data }: { data: HubData }) {
  const { item, reservations, links } = data;
  const cancelled = reservations.filter((reservation) => reservation.reserveStatus.includes("취소완료")).length;
  const cancelRequested = reservations.filter((reservation) => reservation.reserveStatus.includes("취소요청")).length;
  const statuses = countBy(reservations.map((reservation) => reservation.reserveStatus));
  const payments = countBy(reservations.map((reservation) => reservation.paymentStatus));
  return (
    <HubSection
      id="reservations"
      title="예약현황"
      meta={`예약 ${item.people}명 · ${item.reservationCount}건`}
      actions={<HubLink href={links.reservations}>예약목록 보기</HubLink>}
    >
      <HubStats
        items={[
          { label: "총 접수", value: `${reservations.length}건` },
          { label: "예약취소", value: `${cancelled}건`, tone: cancelled ? "is-muted" : "" },
          { label: "운영대상", value: `${item.reservationCount}건 · ${item.people}명` },
        ]}
      />
      <div className="ops-hub-chip-row">
        <span>예약상태</span>
        {statuses.map((status) => (
          <span key={status.label} className={`ops-board-chip ${status.label.includes("취소") ? "is-warn" : ""}`}>
            {status.label} {status.count}
          </span>
        ))}
      </div>
      <div className="ops-hub-chip-row">
        <span>결제상태</span>
        {payments.map((payment) => (
          <span key={payment.label} className="ops-board-chip">
            {payment.label} {payment.count}
          </span>
        ))}
      </div>
      <p className="guide-sheet-note">
        운영대상은 취소완료 · 예약접수 · 대기 예약을 제외한 예약입니다.
        {cancelRequested ? ` 취소요청 ${cancelRequested}건은 운영대상에 포함되어 있어 확인이 필요합니다.` : ""}
      </p>
    </HubSection>
  );
}

function PrepSection({ data }: { data: HubData }) {
  const { item, links, group } = data;
  return (
    <HubSection
      id="prep"
      title="운영준비"
      meta={`${item.prepDone} / ${item.prep.length} 완료`}
      actions={group !== "after" && <HubLink href={links.assignment}>운영배정</HubLink>}
    >
      <progress className="ops-board-progress" max={100} value={item.prepRate} aria-label="운영준비 진행률" />
      <ul className="ops-board-checklist ops-hub-checklist">
        {item.prep.map((prep) => (
          <li key={prep.key} className={prep.ok ? "is-ok" : "is-missing"}>
            <span aria-hidden="true">{prep.ok ? "✓" : "!"}</span>
            <b>{prep.label}</b>
            <small>{prep.ok ? prep.detail : `${prep.need} · ${prep.detail}`}</small>
          </li>
        ))}
      </ul>
    </HubSection>
  );
}

function VehicleSection({ data }: { data: HubData }) {
  const { departure, item, report, group, links } = data;
  const lead = getGuideLeadStaff(departure);
  const leadStatus = lead ? (group === "after" ? "운영종료" : group === "live" ? "운영중" : "지정") : "미지정";
  return (
    <HubSection
      id="vehicles"
      title="호차 · 가이드"
      meta={`호차 ${departure.vehicles.length}대 · 가이드 ${item.guides.assigned} / ${item.guides.required}`}
    >
      <p className="ops-hub-lead">
        <span>총괄가이드</span>
        <b className={lead ? "" : "is-warn"}>{lead?.name ?? "미지정"}</b>
        <span className={`badge ${lead ? "gray" : "warn"}`}>{leadStatus}</span>
      </p>
      {departure.vehicles.length === 0 ? (
        <div className="ops-hub-empty">
          <p className="ops-board-muted">등록된 호차가 없습니다. 운영배정에서 호차를 추가해주세요.</p>
          <HubLink href={links.assignment}>운영배정</HubLink>
        </div>
      ) : (
        <ul className="ops-hub-vehicles">
          {departure.vehicles.map((vehicle) => {
            const board = item.vehicles.find((value) => value.id === vehicle.id);
            const result = report.vehicles.find((value) => value.vehicle.id === vehicle.id);
            const guide = getGuideStaff(departure, vehicle.guideId);
            const groupName = getGuideVehicleBoardingGroup(departure, vehicle)?.name ?? "";
            const status =
              group === "pre"
                ? guide
                  ? { label: "배정", badge: "gray" }
                  : { label: "가이드 미배정", badge: "warn" }
                : group === "live"
                  ? { label: board?.progressLabel || "운영중", badge: board?.progressBadge ?? "info" }
                  : { label: result?.status ?? "운영종료", badge: result?.status === "운영완료" ? "success" : "warn" };
            return (
              <li key={vehicle.id}>
                <header>
                  <b>{vehicle.name}</b>
                  <span className={`badge ${status.badge}`}>{status.label}</span>
                </header>
                <dl className="ops-board-dl">
                  <div>
                    <dt>차량번호</dt>
                    <dd>{vehicle.plateNo || "-"}</dd>
                  </div>
                  <div>
                    <dt>기사</dt>
                    <dd>{vehicle.driverName || "-"}</dd>
                  </div>
                  <div>
                    <dt>담당가이드</dt>
                    <dd className={guide ? "" : "is-warn"}>{guide?.name ?? "미배정"}</dd>
                  </div>
                  <div>
                    <dt>탑승지 그룹</dt>
                    <dd className={groupName ? "" : "is-warn"}>{groupName || "미선택"}</dd>
                  </div>
                  <div>
                    <dt>고객배정</dt>
                    <dd>
                      {board?.assigned ?? 0} / {vehicle.capacity}석
                    </dd>
                  </div>
                </dl>
                <div className="ops-hub-inline-actions">
                  {group !== "pre" || departure.handover ? (
                    <HubLink href={getGuideSchedulePath(departure.key, vehicle.id)}>호차 운영보기</HubLink>
                  ) : null}
                  {group === "pre" && <HubLink href={links.assignment}>운영배정 수정</HubLink>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </HubSection>
  );
}

function PointSection({ data }: { data: HubData }) {
  const { departure, report } = data;
  const points = departure.boardingPoints.map((point) => {
    const entries = report.entries.filter((entry) => entry.point === point.name);
    const byVehicle = countBy(entries.map((entry) => entry.vehicle?.name ?? "미배정"));
    return { ...point, count: entries.length, byVehicle };
  });
  return (
    <HubSection id="points" title="탑승지" meta={`${points.length}곳 · 운영대상 ${report.entries.length}명`}>
      {points.length === 0 ? (
        <p className="ops-board-muted">등록된 탑승지가 없습니다.</p>
      ) : (
        <ul className="ops-hub-rows">
          {points.map((point) => (
            <li key={point.name}>
              <time>{point.time}</time>
              <b>{point.name}</b>
              <span>{point.count}명</span>
              <small>
                {point.byVehicle.length
                  ? point.byVehicle.map((value) => `${value.label} ${value.count}`).join(" · ")
                  : "-"}
              </small>
            </li>
          ))}
        </ul>
      )}
    </HubSection>
  );
}

function CurrentSection({ data }: { data: HubData }) {
  const { departure, item, schedule, links } = data;
  return (
    <HubSection
      id="current"
      title="현재 운영"
      meta="호차별 현재 일정"
      actions={<HubLink href={links.schedule}>현장운영 보기</HubLink>}
    >
      {!schedule ? (
        <p className="ops-board-muted">등록된 일정이 없습니다.</p>
      ) : (
        <ul className="ops-hub-current">
          {departure.vehicles.map((vehicle) => {
            const board = item.vehicles.find((value) => value.id === vehicle.id);
            const summary = schedule.vehicles.find((value) => value.vehicle.id === vehicle.id)?.summary;
            const current = summary?.current ?? null;
            const planned = current?.item.plannedDeparture ?? current?.item.plannedArrival ?? "-";
            return (
              <li key={vehicle.id}>
                <div>
                  <b>{vehicle.name}</b>
                  <small>{board?.guideName || "가이드 미배정"}</small>
                </div>
                <div>
                  <strong>{current?.item.title ?? "전체 일정 완료"}</strong>
                  <small>
                    예정 {planned} · 운영 {current?.departureTime || "-"}
                  </small>
                </div>
                {board?.progressLabel && <span className={`badge ${board.progressBadge}`}>{board.progressLabel}</span>}
                <HubLink href={getGuideSchedulePath(departure.key, vehicle.id)}>{vehicle.name} 보기</HubLink>
              </li>
            );
          })}
        </ul>
      )}
    </HubSection>
  );
}

function BoardingSection({ data }: { data: HubData }) {
  const { item, report, links } = data;
  return (
    <HubSection
      id="boarding"
      title="탑승현황"
      meta={report.vehicles.length > 1 ? "출발 탑승 기준 · 호차별" : "출발 탑승 기준"}
      actions={<HubLink href={links.customers}>탑승현황 보기</HubLink>}
    >
      <HubStats
        items={[
          { label: "예약", value: `${item.boarding.reserved}명` },
          { label: "탑승", value: `${item.boarding.boarded}명`, tone: "is-success" },
          { label: "미탑승", value: `${item.boarding.noShow}명`, tone: item.boarding.noShow ? "is-warn" : "" },
          {
            label: "미확인",
            value: `${item.boarding.unchecked}명`,
            tone: item.boarding.unchecked && item.stage === "live" ? "is-danger" : "",
          },
        ]}
      />
      {report.vehicles.length > 1 && (
        <ul className="ops-hub-rows">
          {report.vehicles.map(({ vehicle, summary }) => (
            <li key={vehicle.id}>
              <b>{vehicle.name}</b>
              <span>예약 {summary.reserved}</span>
              <span>
                탑승 {summary.boarded} · 미탑승 {summary.noShow}
              </span>
              <small className={summary.unchecked ? "is-warn" : ""}>미확인 {summary.unchecked}</small>
            </li>
          ))}
        </ul>
      )}
      {report.unassigned.length > 0 && (
        <p className="ops-board-muted">호차 미배정 {report.unassigned.length}명은 호차별 집계에서 제외됩니다.</p>
      )}
    </HubSection>
  );
}

function CommunicationSection({ data }: { data: HubData }) {
  const { report, contacts, batches, links } = data;
  const latest = [...batches].sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
  return (
    <HubSection
      id="communication"
      title="고객소통"
      meta={report.chat.modeLabel}
      actions={
        <>
          <HubLink href={links.communication}>고객소통</HubLink>
          <HubLink href={links.chatRoom}>안내방 관리</HubLink>
        </>
      }
    >
      <HubStats
        items={[
          { label: "안내발송", value: `${report.notices.sends}회` },
          { label: "발송완료", value: `${contacts.sent} / ${contacts.contacts}` },
          { label: "미발송", value: `${contacts.unsent}`, tone: contacts.unsent ? "is-warn" : "" },
          { label: "실패", value: `${contacts.failed}`, tone: contacts.failed ? "is-danger" : "" },
        ]}
      />
      <p className="ops-hub-line">
        <span>최근 발송</span>
        {latest ? `${latest.sentAt} · ${latest.templateLabel} · ${latest.targetLabel}` : "발송 이력 없음"}
      </p>
      <ul className="ops-hub-rows">
        {report.chat.rooms.map(({ scope, room, active, progress }) => (
          <li key={scope.roomId}>
            <b>{scope.label}</b>
            <span>{active ? room?.name : "안내방 미등록"}</span>
            <span className={`badge ${active && progress ? GUIDE_CHAT_INVITE_META[progress].badge : "gray"}`}>
              {active && progress ? GUIDE_CHAT_INVITE_META[progress].label : "미등록"}
            </span>
          </li>
        ))}
      </ul>
    </HubSection>
  );
}

function ScheduleSection({ data }: { data: HubData }) {
  const { departure, schedule, links } = data;
  const rows = schedule
    ? schedule.vehicles.length
      ? schedule.vehicles.map(({ vehicle, summary }) => ({ id: vehicle.id, name: vehicle.name, summary }))
      : [{ id: "base", name: "공통 일정", summary: schedule.base }]
    : [];
  return (
    <HubSection
      id="schedule"
      title="일정"
      meta={schedule ? `전체 ${schedule.total}개` : "일정 미등록"}
      actions={(departure.handover || data.group !== "pre") && <HubLink href={links.schedule}>일정 운영보기</HubLink>}
    >
      {rows.length === 0 ? (
        <p className="ops-board-muted">등록된 일정이 없습니다.</p>
      ) : (
        <ul className="ops-hub-schedule">
          {rows.map(({ id, name, summary }) => (
            <li key={id}>
              <header>
                <b>{name}</b>
                <small>
                  완료 {summary.done} · 진행중 {summary.inProgress} · 예정 {summary.planned} / {summary.total}
                </small>
              </header>
              <p>
                <span>현재</span>
                <strong>{summary.current?.item.title ?? "전체 일정 완료"}</strong>
                {summary.current && summary.current.delayMinutes > 0 && (
                  <span className="badge danger">{summary.current.delayMinutes}분 지연</span>
                )}
              </p>
              <p>
                <span>다음</span>
                {summary.next?.item.title ?? "-"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </HubSection>
  );
}

function NotesSection({ data }: { data: HubData }) {
  const { departure, report, links } = data;
  const { summary, unresolved } = report.notes;
  return (
    <HubSection
      id="notes"
      title="특이사항 · 운영기록"
      meta={`전체 ${summary.total}건`}
      actions={<HubLink href={links.notes}>운영기록 보기</HubLink>}
    >
      <HubStats
        items={[
          { label: "중요", value: `${summary.important}`, tone: summary.important ? "is-danger" : "" },
          { label: "확인필요", value: `${summary.check}`, tone: summary.check ? "is-warn" : "" },
          { label: "처리중", value: `${summary.inProgress}` },
          { label: "미처리", value: `${unresolved.length}`, tone: unresolved.length ? "is-warn" : "" },
        ]}
      />
      {unresolved.length === 0 ? (
        <p className="ops-board-muted">미처리 운영기록이 없습니다.</p>
      ) : (
        <ul className="ops-board-issue-list ops-hub-notes">
          {unresolved.slice(0, 4).map((note) => (
            <li key={note.id}>
              <span className={`badge ${GUIDE_NOTE_IMPORTANCE_META[note.importance].badge}`}>{note.importance}</span>
              <Link href={getGuideNotesPath(departure.key, { note: note.id })}>{note.title}</Link>
              <span className={`badge ${GUIDE_NOTE_STATUS_BADGE[note.status]}`}>{note.status}</span>
              <small>{note.occurredAt}</small>
            </li>
          ))}
          {unresolved.length > 4 && <li className="ops-board-muted">외 {unresolved.length - 4}건</li>}
        </ul>
      )}
    </HubSection>
  );
}

function ResultSection({ data }: { data: HubData }) {
  const { closing, report, links } = data;
  return (
    <HubSection
      id="result"
      title="운영결과"
      meta={closing.closedAt ? `운영종료 ${closing.closedAt}${closing.closedBy ? ` · ${closing.closedBy}` : ""}` : ""}
      actions={<HubLink href={links.closing}>운영결과 보기</HubLink>}
    >
      <HubStats
        items={[
          { label: "탑승", value: `${report.boarding.boarded} / ${report.people}명` },
          { label: "미탑승", value: `${report.boarding.noShow}명`, tone: report.boarding.noShow ? "is-warn" : "" },
          { label: "일정완료", value: `${report.schedule.done} / ${report.schedule.total}` },
          { label: "지연 일정", value: `${report.schedule.delayed}건`, tone: report.schedule.delayed ? "is-warn" : "" },
          { label: "운영기록", value: `${report.notes.summary.total}건` },
          { label: "안내발송", value: `${report.notices.sends}회` },
        ]}
      />
    </HubSection>
  );
}

function ReviewSection({ data }: { data: HubData }) {
  const { item, review, links } = data;
  const done = item.adminReview === "관리자 확인완료";
  return (
    <HubSection
      id="review"
      title="관리자 확인"
      actions={<HubLink href={links.review}>{done ? "결과보기" : "관리자 확인"}</HubLink>}
    >
      <p className="ops-hub-line">
        <span>상태</span>
        <span className={`badge ${item.adminReviewBadge}`}>{item.adminReview ?? "운영종료 후"}</span>
      </p>
      {done ? (
        <p className="ops-hub-line">
          <span>확인</span>
          {[review.reviewedBy, review.reviewedAt].filter(Boolean).join(" · ") || "-"}
        </p>
      ) : (
        <p className="ops-board-muted">가이드가 인계한 운영결과를 검토한 뒤 관리자 확인을 완료합니다.</p>
      )}
    </HubSection>
  );
}

function FollowUpSection({ data }: { data: HubData }) {
  const { item, review, links } = data;
  return (
    <HubSection
      id="follow-ups"
      title="후속조치"
      meta={`전체 ${item.followUps.total}건`}
      actions={<HubLink href={links.review}>후속조치 보기</HubLink>}
    >
      <HubStats
        items={[
          { label: "진행중", value: `${item.followUps.open}건`, tone: item.followUps.open ? "is-warn" : "" },
          { label: "처리완료", value: `${item.followUps.done}건`, tone: "is-success" },
          {
            label: "기한초과",
            value: `${item.followUps.overdue}건`,
            tone: item.followUps.overdue ? "is-danger" : "",
          },
        ]}
      />
      {review.followUps.length === 0 ? (
        <p className="ops-board-muted">등록된 후속조치가 없습니다.</p>
      ) : (
        <ul className="ops-board-issue-list ops-hub-notes">
          {review.followUps.slice(0, 5).map((followUp) => {
            const due = getGuideFollowUpDue(followUp);
            return (
              <li key={followUp.id}>
                <span className={`badge ${GUIDE_FOLLOW_UP_STATUS_BADGE[followUp.status]}`}>{followUp.status}</span>
                <b>{followUp.content}</b>
                <small>{getGuideReviewAssigneeName(followUp.assigneeId)}</small>
                {due && <span className={`badge ${due.badge}`}>{due.label}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </HubSection>
  );
}

/** 조회용 요약 타임라인. 일정 진행 · 안내발송 · 운영기록 · 상태변경을 시간순으로 모아 보여줍니다. */
function TimelineSection({ data }: { data: HubData }) {
  const { departure, closing, review, batches, schedule } = data;
  const atDate = (time: string) => (/^\d{2}:\d{2}$/.test(time) ? `${departure.departureDate} ${time}` : time);
  const events: { id: string; at: string; type: string; badge: string; text: string }[] = [];
  if (departure.handover) {
    events.push({
      id: "handover",
      at: departure.handover.at,
      type: "상태",
      badge: "info",
      text: `운영인계 · ${departure.handover.by}`,
    });
  }
  if (schedule) {
    const state = getGuideScheduleState(departure.key);
    departure.vehicles.forEach((vehicle) => {
      schedule.items.forEach((scheduleItem) => {
        const progress = state[vehicle.id]?.[scheduleItem.id];
        if (progress?.actualDeparture) {
          events.push({
            id: `sched-${vehicle.id}-${scheduleItem.id}`,
            at: atDate(progress.actualDeparture),
            type: "일정",
            badge: "gray",
            text: `${vehicle.name} ${scheduleItem.title} 완료`,
          });
        }
      });
    });
  }
  batches.forEach((batch) =>
    events.push({
      id: `send-${batch.id}`,
      at: batch.sentAt,
      type: "안내발송",
      badge: "gray",
      text: `${batch.templateLabel} · ${batch.targetLabel}`,
    }),
  );
  data.report.notes.list
    .filter((note) => !note.canceled)
    .forEach((note) =>
      events.push({
        id: `note-${note.id}`,
        at: atDate(note.occurredAt),
        type: "운영기록",
        badge: GUIDE_NOTE_IMPORTANCE_META[note.importance].badge,
        text: `${note.importance} · ${note.title}`,
      }),
    );
  if (closing.closedAt) {
    events.push({ id: "closed", at: closing.closedAt, type: "상태", badge: "warn", text: "운영종료" });
  }
  if (review.reviewedAt) {
    events.push({ id: "reviewed", at: review.reviewedAt, type: "상태", badge: "success", text: "관리자 확인완료" });
  }
  const recent = events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
  return (
    <HubSection id="timeline" title="최근 운영기록" meta="조회용 요약 · 감사로그 아님">
      {recent.length === 0 ? (
        <p className="ops-board-muted">아직 운영기록이 없습니다.</p>
      ) : (
        <ol className="ops-hub-timeline">
          {recent.map((event) => (
            <li key={event.id}>
              <time>{event.at.slice(5)}</time>
              <span className={`badge ${event.badge}`}>{event.type}</span>
              <span>{event.text}</span>
            </li>
          ))}
        </ol>
      )}
    </HubSection>
  );
}

function ShortcutSection({ data }: { data: HubData }) {
  const { links, group } = data;
  const beforeHandover = data.item.stage === "prep";
  const shortcuts: { label: string; href: string; disabled?: string }[] = [
    { label: "예약목록", href: links.reservations },
    { label: "운영배정", href: links.assignment },
    { label: "탑승현황", href: links.customers, disabled: beforeHandover ? "운영인계 후" : "" },
    { label: "고객소통", href: links.communication },
    { label: "안내방", href: links.chatRoom },
    { label: "일정운영", href: links.schedule, disabled: beforeHandover ? "운영인계 후" : "" },
    { label: "운영기록", href: links.notes, disabled: beforeHandover ? "운영인계 후" : "" },
    { label: "운영결과", href: links.closing, disabled: group === "after" ? "" : "운영종료 후" },
  ];
  return (
    <section className="panel ops-hub-shortcuts" aria-label="바로가기">
      {shortcuts.map((shortcut) =>
        shortcut.disabled ? (
          <span key={shortcut.label} className="ops-hub-shortcut is-disabled" aria-disabled="true">
            <b>{shortcut.label}</b>
            <small>{shortcut.disabled}</small>
          </span>
        ) : (
          <Link key={shortcut.label} href={shortcut.href} className="ops-hub-shortcut">
            <b>{shortcut.label}</b>
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        ),
      )}
    </section>
  );
}

function ProductInfoModal({ data, onClose }: { data: HubData; onClose: () => void }) {
  const { departure, links } = data;
  return (
    <SheetModal title="상품정보" onClose={onClose}>
      <div className="guide-sheet-body">
        <dl className="guide-sheet-summary ops-hub-product-summary">
          <div>
            <dt>상품명</dt>
            <dd>{departure.productName}</dd>
          </div>
          <div>
            <dt>상품코드</dt>
            <dd>{departure.productCode || "-"}</dd>
          </div>
          <div>
            <dt>출발회차</dt>
            <dd>{departure.key}</dd>
          </div>
          <div>
            <dt>출발일</dt>
            <dd>{formatHubDate(departure.departureDate)}</dd>
          </div>
        </dl>
        <p className="guide-sheet-note">
          상품 원본 정보는 상품관리에서 관리합니다. 상품 정보를 변경해도 이미 생성된 출발회차의 운영배정 · 운영기록은
          자동으로 변경되지 않습니다.
        </p>
      </div>
      <div className="modal-actions">
        <Link href="/products" className="secondary ops-hub-btn">
          상품목록
        </Link>
        {links.product && (
          <Link href={links.product} className="primary ops-hub-btn">
            상품 탑승지 설정
          </Link>
        )}
      </div>
    </SheetModal>
  );
}

/* ---------------------------------------------------------------- 본문 */

function HubBody({ departure, item }: { departure: GuideDeparture; item: OpsBoardItem }) {
  const [productOpen, setProductOpen] = useState(false);
  const key = departure.key;
  const batches = getGuideMessageBatches(key);
  const links: HubLinks = {
    reservations: `/reservations?departure=${encodeURIComponent(key)}`,
    assignment: item.links.assignment,
    guide: item.links.operation,
    customers: getGuideCustomersPath(key),
    unchecked: getGuideCustomersPath(key, "unchecked"),
    communication: getGuideCommunicationPath(key),
    chatRoom: getGuideChatRoomPath(key),
    schedule: item.links.schedule,
    notes: item.links.notes,
    closing: getGuideClosingPath(key),
    review: item.links.review,
    product:
      departure.productCode && departure.productCode !== "-"
        ? `/products/${encodeURIComponent(departure.productCode)}/boarding`
        : "",
  };
  const data: HubData = {
    departure,
    item,
    group: groupOf(item),
    links,
    closing: getGuideClosingState(key),
    review: getGuideReviewState(key),
    report: buildGuideClosingReport(departure),
    schedule: summarizeGuideScheduleOverview(departure),
    batches,
    contacts: summarizeGuideContacts(departure, batches),
    reservations: getOperationDepartureReservations(key),
  };
  const { group } = data;
  const alerts = buildAlerts(data);
  const actions = buildHeaderActions(item, links);
  const hasFollowUps = item.followUps.total > 0;

  const kpis: { label: string; value: string; sub: string; tone: string }[] = [
    { label: "예약인원", value: `${item.people}명`, sub: "운영대상 기준", tone: "is-pending" },
    {
      label: "예약건",
      value: `${item.reservationCount}건`,
      sub: `총 접수 ${data.reservations.length}건`,
      tone: "is-muted",
    },
    {
      label: "호차",
      value: `${departure.vehicles.length}대`,
      sub: `고객배정 ${item.customers.assigned} / ${item.customers.total}`,
      tone: item.customers.unassigned ? "is-warn" : "is-muted",
    },
    {
      label: "가이드",
      value: `${item.guides.assigned} / ${item.guides.required}`,
      sub: item.leadName ? `총괄 ${item.leadName}` : "총괄 미지정",
      tone: item.guides.assigned < item.guides.required || !item.leadName ? "is-warn" : "is-muted",
    },
    { label: "탑승지", value: `${item.boardingPoints.length}곳`, sub: item.boardingPoints[0] ?? "-", tone: "is-muted" },
    {
      label: "운영기록",
      value: `${data.report.notes.summary.total}건`,
      sub: `중요이슈 ${item.issues.length} · 미처리 ${data.report.notes.unresolved.length}`,
      tone: item.issues.length ? "is-danger" : "is-muted",
    },
  ];
  if (group === "live") {
    kpis.push(
      {
        label: "탑승",
        value: `${item.boarding.boarded}명`,
        sub: `예약 ${item.boarding.reserved}명`,
        tone: "is-success",
      },
      { label: "미탑승", value: `${item.boarding.noShow}명`, sub: "현장 확인", tone: "is-muted" },
      {
        label: "미확인",
        value: `${item.boarding.unchecked}명`,
        sub: "탑승 확인 필요",
        tone: item.boarding.unchecked ? "is-danger" : "is-muted",
      },
    );
  }

  const left: ReactNode[] = [];
  const right: ReactNode[] = [];
  if (group === "pre") {
    left.push(
      <ReservationSection key="reservations" data={data} />,
      <PointSection key="points" data={data} />,
      <ScheduleSection key="schedule" data={data} />,
    );
    right.push(
      <PrepSection key="prep" data={data} />,
      <VehicleSection key="vehicles" data={data} />,
      <CommunicationSection key="communication" data={data} />,
      <NotesSection key="notes" data={data} />,
    );
  } else if (group === "live") {
    left.push(
      <CurrentSection key="current" data={data} />,
      <BoardingSection key="boarding" data={data} />,
      <ScheduleSection key="schedule" data={data} />,
      <ReservationSection key="reservations" data={data} />,
    );
    right.push(
      <VehicleSection key="vehicles" data={data} />,
      <CommunicationSection key="communication" data={data} />,
      <NotesSection key="notes" data={data} />,
      <PointSection key="points" data={data} />,
    );
  } else {
    left.push(
      <ResultSection key="result" data={data} />,
      <NotesSection key="notes" data={data} />,
      <BoardingSection key="boarding" data={data} />,
      <ReservationSection key="reservations" data={data} />,
    );
    right.push(
      <ReviewSection key="review" data={data} />,
      <FollowUpSection key="follow-ups" data={data} />,
      <VehicleSection key="vehicles" data={data} />,
      <CommunicationSection key="communication" data={data} />,
    );
  }
  if (group !== "after" && hasFollowUps) right.push(<FollowUpSection key="follow-ups" data={data} />);

  const liveCurrent = group === "live" ? item.vehicles.filter((vehicle) => vehicle.current) : [];

  return (
    <main className="content member-web-detail-content guide-ops-content ops-board-content ops-hub-content">
      <section className="panel guide-ops-hero ops-board-hero ops-hub-hero" aria-labelledby="ops-hub-title">
        <div className="guide-ops-hero-main">
          <Link href={OPS_BOARD_PATH} className="ops-board-link ops-hub-back">
            <ArrowLeft size={14} aria-hidden="true" />
            운영현황
          </Link>
          <p className="member-web-breadcrumb">
            예약관리 &gt; 운영현황 &gt; {departure.productName} &gt; {formatOpsBoardDate(departure.departureDate)}
          </p>
          <div className="guide-ops-hero-status">
            <StageBadges item={item} />
            <span className="ops-board-muted">{item.ddayLabel}</span>
          </div>
          <h1 id="ops-hub-title">{departure.productName}</h1>
          <dl className="guide-ops-hero-meta">
            <div className="is-date">
              <dt>출발일</dt>
              <dd>
                {formatHubDate(departure.departureDate)} 출발{item.startTime ? ` · ${item.startTime}` : ""}
              </dd>
            </div>
            <div>
              <dt>상품코드</dt>
              <dd>{departure.productCode || "-"}</dd>
            </div>
            <div>
              <dt>출발회차</dt>
              <dd>{departure.key}</dd>
            </div>
          </dl>
          {liveCurrent.length > 0 && (
            <p className="ops-hub-live-line">
              <span>현재 일정</span>
              {liveCurrent.map((vehicle) => `${vehicle.name} ${vehicle.current}`).join(" · ")}
            </p>
          )}
          <p className="ops-board-base">
            QA 테스트 기준일 {formatOpsBoardDate(TEST_REFERENCE_DATE, true)} (실제 현재일 아님) · 조회 전용 화면 ·
            수정은 각 업무 화면에서 진행합니다.
          </p>
        </div>
        <div className="guide-ops-hero-actions ops-hub-hero-actions">
          <button type="button" className="secondary ops-board-icon-btn" onClick={() => setProductOpen(true)}>
            상품정보
          </button>
          {actions.secondary.map((action) => (
            <Link key={action.label} href={action.href} className="secondary ops-board-icon-btn">
              {action.label}
            </Link>
          ))}
          <Link href={actions.primary.href} className="primary ops-board-icon-btn">
            {actions.primary.label}
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <WorkflowSection data={data} />

      {alerts.length > 0 && (
        <section className="panel ops-hub-alerts" aria-label="확인 필요">
          <ul className="ops-board-attention-list">
            {alerts.map((alert) => (
              <li key={alert.id} className={`is-${alert.tone}`}>
                <div className="ops-board-attention-main">
                  <span className="ops-board-attention-meta">
                    <AlertTriangle size={13} aria-hidden="true" />
                    <span className={`badge ${alert.tone === "info" ? "info" : alert.tone}`}>{alert.category}</span>
                  </span>
                  <strong>{alert.title}</strong>
                </div>
                <Link href={alert.action.href} className="secondary">
                  {alert.action.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="guide-ops-kpis ops-hub-kpis" aria-label="출발회차 요약">
        {kpis.map((kpi) => (
          <article className={`member-web-detail-kpi guide-ops-kpi ${kpi.tone}`} key={kpi.label}>
            <span>
              <small>{kpi.label}</small>
              <strong>{kpi.value}</strong>
              <em>{kpi.sub}</em>
            </span>
          </article>
        ))}
      </section>

      <div className="ops-hub-columns">
        <div className="ops-hub-column">{left}</div>
        <div className="ops-hub-column">{right}</div>
      </div>

      <TimelineSection data={data} />
      <ShortcutSection data={data} />

      {productOpen && <ProductInfoModal data={data} onClose={() => setProductOpen(false)} />}
    </main>
  );
}

/* ---------------------------------------------------------------- 페이지 */

export default function OperationsDepartureHubPage() {
  const params = useParams<{ key: string }>();
  const departureKey = decodeURIComponent(params.key ?? "");
  const departure = getOperationDeparture(departureKey);
  const item = departure ? getOpsBoardItem(departureKey) : null;
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const notify = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  return (
    <ProductAdminShell
      activeMenu="예약관리"
      currentChild="운영현황"
      breadcrumb={
        <>
          <span>예약관리</span>
          <b>/</b>
          <span>운영현황</span>
          <b>/</b>
          <strong>
            {departure ? `${departure.productName} · ${formatOpsBoardDate(departure.departureDate)}` : "출발회차"}
          </strong>
        </>
      }
      toast={toast}
      onNotify={notify}
    >
      {!departure || !item ? (
        <main className="content member-web-detail-content guide-ops-content">
          <section className="panel member-web-detail-not-found">
            <strong>출발회차를 찾을 수 없습니다.</strong>
            <p>요청한 출발회차({departureKey || "-"})의 운영정보가 없습니다.</p>
            <Link href={OPS_BOARD_PATH} className="secondary ops-hub-btn">
              <ArrowLeft size={15} />
              운영현황으로
            </Link>
          </section>
        </main>
      ) : (
        <HubBody key={departure.key} departure={departure} item={item} />
      )}
    </ProductAdminShell>
  );
}
