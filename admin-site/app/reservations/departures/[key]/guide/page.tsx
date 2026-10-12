"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  MessageCircle,
  MessageSquare,
  Send,
  StickyNote,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { GuideOperationPhaseBadge } from "@/components/guide/GuideOperationPhaseBadge";
import {
  buildGuideMessageTemplates,
  formatGuideDepartureDate,
  getGuideCustomersPath,
  type GuideDeparture,
  type GuideMessageTemplate,
} from "@/lib/admin/guide-operation-data";
import {
  getGuideCommunicationPath,
  getGuideMessageBatches,
  summarizeGuideContacts,
} from "@/lib/admin/guide-communication-data";
import { getGuideChatRoomPath, summarizeGuideChatOverview } from "@/lib/admin/guide-chatroom-data";
import {
  describeGuideScheduleProgress,
  getGuideSchedulePath,
  summarizeGuideScheduleOverview,
} from "@/lib/admin/guide-schedule-data";
import { getGuideNotes, getGuideNotesPath, summarizeGuideNotes } from "@/lib/admin/guide-notes-data";
import {
  GUIDE_CLOSING_CHECKS,
  GUIDE_ADMIN_REVIEW_BADGE,
  buildGuideClosingReport,
  countGuideClosingChecks,
  getGuideClosingBlockers,
  getGuideClosingPath,
  getGuideClosingState,
  getGuideClosingStatus,
} from "@/lib/admin/guide-closing-data";
import { getOperationDeparture } from "@/lib/admin/operation-assignment-data";

type QuickTask = {
  key: string;
  title: string;
  icon: LucideIcon;
  value: string;
  detail: string;
  badge?: { tone: string; label: string };
  actionLabel: string;
  onAction: () => void;
};

const GUIDE_OPERATION_LIST_PATH = "/reservations/guide-operations";
const MESSAGE_SECTION_ID = "guide-ops-messages";

export default function GuideOperationPage() {
  const params = useParams<{ key: string }>();
  const router = useRouter();
  const departureKey = useMemo(() => decodeURIComponent(params.key ?? ""), [params.key]);
  const departure = useMemo(() => getOperationDeparture(departureKey), [departureKey]);
  const templates = useMemo(() => (departure ? buildGuideMessageTemplates(departure) : []), [departure]);
  const [previewTemplate, setPreviewTemplate] = useState<GuideMessageTemplate | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const notify = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const backToReservations = () => router.push(GUIDE_OPERATION_LIST_PATH);

  return (
    <ProductAdminShell
      activeMenu="예약관리"
      currentChild="가이드 운영"
      breadcrumb={
        <>
          <span>예약관리</span>
          <b>/</b>
          <strong>가이드 운영</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
      overlays={
        departure &&
        previewTemplate && (
          <GuideMessagePreviewModal
            departure={departure}
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            onConfirm={() => {
              setPreviewTemplate(null);
              notify("미리보기 확인 완료 · 실제 메시지는 발송되지 않았습니다. (SAMPLE)");
            }}
          />
        )
      }
    >
      <main className="content member-web-detail-content guide-ops-content">
        {!departure ? (
          <section className="panel member-web-detail-not-found">
            <strong>출발상품을 찾을 수 없습니다.</strong>
            <p>요청한 출발상품({departureKey || "-"})의 가이드 운영 정보가 없습니다.</p>
            <button type="button" className="secondary" onClick={backToReservations}>
              <ArrowLeft size={15} />
              가이드 운영 목록으로
            </button>
          </section>
        ) : (
          <GuideOperationBody
            departure={departure}
            templates={templates}
            onBack={backToReservations}
            onPreview={setPreviewTemplate}
          />
        )}
      </main>
    </ProductAdminShell>
  );
}

function GuideOperationBody({
  departure,
  templates,
  onBack,
  onPreview,
}: {
  departure: GuideDeparture;
  templates: GuideMessageTemplate[];
  onBack: () => void;
  onPreview: (template: GuideMessageTemplate) => void;
}) {
  const router = useRouter();
  const messageBatches = getGuideMessageBatches(departure.key);
  const contactSummary = summarizeGuideContacts(departure, messageBatches);
  const chatSummary = summarizeGuideChatOverview(departure, messageBatches);
  const scheduleOverview = summarizeGuideScheduleOverview(departure);
  const noteSummary = summarizeGuideNotes(getGuideNotes(departure.key));
  const closingState = getGuideClosingState(departure.key);
  const closingReport = buildGuideClosingReport(departure);
  const closingStatus = getGuideClosingStatus(closingState, closingReport);
  const closingBlockers = getGuideClosingBlockers(closingReport);
  const unsent = contactSummary.unsent + contactSummary.failed;
  const { totalPeople, boardedCount } = departure;
  const noteCount = departure.reservations
    .flatMap((group) => group.passengers)
    .filter((passenger) => passenger.notes?.length).length;

  const kpis = [
    { key: "total", label: "전체 고객", value: `${totalPeople}명`, tone: "" },
    {
      key: "boarded",
      label: "탑승 확인",
      value: `${boardedCount} / ${totalPeople}명`,
      tone: boardedCount >= totalPeople ? "is-success" : "is-muted",
    },
    {
      key: "notified",
      label: "고객 안내 (연락처)",
      value: `${contactSummary.sent} / ${contactSummary.contacts}건`,
      tone: contactSummary.sent >= contactSummary.contacts ? "is-success" : "is-pending",
    },
    { key: "unsent", label: "미발송 · 실패", value: `${unsent}건`, tone: unsent > 0 ? "is-warn" : "is-success" },
    {
      key: "notes",
      label: "고객 특이사항",
      value: `${noteCount}명`,
      tone: noteCount > 0 ? "is-danger" : "is-muted",
    },
  ];

  const tasks: QuickTask[] = [
    {
      key: "customers",
      title: "고객명단",
      icon: Users,
      value: `${totalPeople}명`,
      detail:
        departure.boardingPoints.map((point) => `${point.name} ${point.count}명`).join(" · ") || "탑승지별 고객 확인",
      actionLabel: "명단보기",
      onAction: () => router.push(getGuideCustomersPath(departure.key)),
    },
    {
      key: "communication",
      title: "고객소통",
      icon: MessageSquare,
      value: `발송완료 ${contactSummary.sent} / ${contactSummary.contacts}건`,
      detail: `미발송 ${contactSummary.unsent}건 · 발송실패 ${contactSummary.failed}건 (대표 연락처 기준)`,
      badge: unsent > 0 ? { tone: "warn", label: `미발송 ${unsent}` } : { tone: "success", label: "전원 안내" },
      actionLabel: "고객소통",
      onAction: () => router.push(getGuideCommunicationPath(departure.key)),
    },
    {
      key: "chat-room",
      title: "카카오 안내방",
      icon: MessageCircle,
      value:
        chatSummary.registered === 0
          ? "미등록"
          : `${chatSummary.mode === "all" ? "전체 안내방" : "호차별 안내방"} ${chatSummary.registered} / ${chatSummary.scopeCount}개 등록`,
      detail:
        chatSummary.registered === 0
          ? "카카오톡에서 만든 안내방 링크를 등록해 주세요."
          : [
              `참여 안내 발송 ${chatSummary.sent} / ${chatSummary.contacts}건`,
              chatSummary.reinvite ? `재안내 필요 ${chatSummary.reinvite}명` : "",
            ]
              .filter(Boolean)
              .join(" · "),
      badge:
        chatSummary.registered === 0
          ? { tone: "gray", label: "미등록" }
          : chatSummary.registered < chatSummary.scopeCount
            ? { tone: "warn", label: "일부 등록" }
            : { tone: "success", label: "등록완료" },
      actionLabel: "안내방 관리",
      onAction: () => router.push(getGuideChatRoomPath(departure.key)),
    },
    {
      key: "boarding",
      title: "탑승체크",
      icon: CheckSquare,
      value: `${boardedCount} / ${totalPeople}명`,
      detail:
        departure.uncheckedCount === 0
          ? `전체 탑승 확인 완료 · 미탑승 ${departure.noShowCount}명`
          : `미확인 ${departure.uncheckedCount}명 · 미탑승 ${departure.noShowCount}명`,
      actionLabel: "탑승 확인",
      onAction: () => router.push(getGuideCustomersPath(departure.key, "unchecked")),
    },
    {
      key: "schedule",
      title: "오늘의 일정",
      icon: CalendarDays,
      value: scheduleOverview
        ? scheduleOverview.vehicles.length > 1
          ? `호차별 완료 ${scheduleOverview.vehicles.map(({ summary }) => summary.done).join(" · ")} / ${scheduleOverview.total}개`
          : `완료 ${scheduleOverview.base.done} / ${scheduleOverview.total}개 일정`
        : `${departure.itinerary.length}개 일정`,
      detail: scheduleOverview
        ? scheduleOverview.vehicles
            .map(({ vehicle, summary }) => `${vehicle.name} ${describeGuideScheduleProgress(summary)}`)
            .join(" · ") || scheduleOverview.items.map((item) => item.title).join(" → ")
        : departure.itinerary.join(" → ") || "등록된 상품 일정표가 없습니다.",
      badge: scheduleOverview?.vehicles.some(({ summary }) => (summary.current?.delayMinutes ?? 0) > 0)
        ? { tone: "danger", label: "지연" }
        : undefined,
      actionLabel: "전체 일정",
      onAction: () => router.push(getGuideSchedulePath(departure.key)),
    },
    {
      key: "memo",
      title: "운영메모 · 특이사항",
      icon: StickyNote,
      value: `전체 ${noteSummary.total}건`,
      detail:
        noteSummary.total > 0
          ? `확인필요 ${noteSummary.check}건 · 중요 ${noteSummary.important}건 · 확인대기 ${noteSummary.awaiting}건`
          : "등록된 운영기록이 없습니다.",
      badge:
        noteSummary.important > 0
          ? { tone: "danger", label: `중요 ${noteSummary.important}` }
          : noteSummary.check > 0
            ? { tone: "warn", label: `확인필요 ${noteSummary.check}` }
            : undefined,
      actionLabel: "운영기록 보기",
      onAction: () => router.push(getGuideNotesPath(departure.key)),
    },
    {
      key: "closing",
      title: "운영 종료",
      icon: ClipboardCheck,
      value: closingStatus,
      detail: closingState.closedAt
        ? `${closingState.closedAt} ${closingState.closedBy} 종료처리 · ${closingState.adminReview} · 읽기전용`
        : [
            `필수 확인 ${countGuideClosingChecks(closingState)} / ${GUIDE_CLOSING_CHECKS.length}`,
            `미처리 ${closingReport.notes.unresolved.length}건`,
            ...closingBlockers,
          ].join(" · "),
      badge: closingState.adminReview
        ? { tone: GUIDE_ADMIN_REVIEW_BADGE[closingState.adminReview], label: closingState.adminReview }
        : undefined,
      actionLabel: "운영결과 확인",
      onAction: () => router.push(getGuideClosingPath(departure.key)),
    },
  ];

  return (
    <>
      <section className="panel guide-ops-hero" aria-labelledby="guide-ops-title">
        <div className="guide-ops-hero-main">
          <p className="member-web-breadcrumb">예약관리 &gt; 가이드 운영</p>
          <div className="guide-ops-hero-status">
            <GuideOperationPhaseBadge departure={departure} />
            <span className="guide-ops-code">{departure.productCode}</span>
          </div>
          <h1 id="guide-ops-title">{departure.productName}</h1>
          <dl className="guide-ops-hero-meta">
            <div className="is-date">
              <dt>출발일</dt>
              <dd>{formatGuideDepartureDate(departure.departureDate)}</dd>
            </div>
            <div>
              <dt>담당가이드</dt>
              <dd>{departure.guideName}</dd>
            </div>
          </dl>
        </div>
        <div className="guide-ops-hero-actions">
          <button type="button" className="secondary" onClick={onBack}>
            <ArrowLeft size={15} />
            가이드 운영 목록
          </button>
        </div>
      </section>

      <section className="guide-ops-kpis" aria-label="운영 현황">
        {kpis.map((kpi) => (
          <article className={`member-web-detail-kpi guide-ops-kpi ${kpi.tone}`} key={kpi.key}>
            <span>
              <small>{kpi.label}</small>
              <strong>{kpi.value}</strong>
            </span>
          </article>
        ))}
      </section>

      <section className="guide-ops-section" aria-labelledby="guide-ops-tasks-title">
        <div className="guide-ops-section-head">
          <h2 id="guide-ops-tasks-title">빠른업무</h2>
          <span>출발 당일 필요한 업무로 바로 이동합니다.</span>
        </div>
        <div className="guide-ops-task-grid">
          {tasks.map((task) => {
            const Icon = task.icon;
            return (
              <article className="panel guide-ops-task" key={task.key}>
                <div className="guide-ops-task-head">
                  <span className="guide-ops-task-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <strong>{task.title}</strong>
                  {task.badge && <span className={`badge ${task.badge.tone}`}>{task.badge.label}</span>}
                </div>
                <div className="guide-ops-task-body">
                  <b>{task.value}</b>
                  <p>{task.detail}</p>
                </div>
                <button type="button" className="secondary guide-ops-task-action" onClick={task.onAction}>
                  {task.actionLabel}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="panel guide-ops-section guide-ops-messages"
        id={MESSAGE_SECTION_ID}
        aria-labelledby="guide-ops-messages-title"
      >
        <div className="guide-ops-section-head">
          <h2 id="guide-ops-messages-title">빠른 고객안내</h2>
          <span>템플릿을 선택하면 메시지 미리보기가 열립니다. 실제 발송은 되지 않습니다.</span>
          <button
            type="button"
            className="secondary guide-comm-main-link"
            onClick={() => router.push(getGuideCommunicationPath(departure.key))}
          >
            <MessageSquare size={15} />
            고객소통에서 발송하기
          </button>
        </div>
        <div className="guide-ops-template-grid">
          {templates.map((template) => (
            <button
              type="button"
              key={template.key}
              className={`guide-ops-template ${template.urgent ? "is-urgent" : ""}`}
              onClick={() => onPreview(template)}
            >
              <Send size={16} aria-hidden="true" />
              <span>
                <strong>{template.label}</strong>
                <small>{template.description}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function GuideMessagePreviewModal({
  departure,
  template,
  onClose,
  onConfirm,
}: {
  departure: GuideDeparture;
  template: GuideMessageTemplate;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal guide-ops-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-ops-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="guide-ops-preview-title">{template.label} 미리보기</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <dl className="guide-ops-preview-meta">
          <div>
            <dt>발송 대상</dt>
            <dd>전체 고객 {departure.totalPeople}명</dd>
          </div>
          <div>
            <dt>발신</dt>
            <dd>담당가이드 {departure.guideName}</dd>
          </div>
        </dl>
        <div className={`guide-ops-preview-bubble ${template.urgent ? "is-urgent" : ""}`}>{template.body}</div>
        <p className="guide-ops-preview-note">
          SAMPLE 화면입니다. 문자·알림톡·카카오 발송은 연동되지 않으며 실제로 발송되지 않습니다.
        </p>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="primary" onClick={onConfirm}>
            미리보기 확인
          </button>
        </div>
      </div>
    </div>
  );
}
