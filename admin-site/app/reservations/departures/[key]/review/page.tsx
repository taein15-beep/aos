"use client";

import { useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lock,
  Plus,
  ShieldAlert,
  X,
} from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import {
  BoardingResult,
  ChatResult,
  ClosingSection,
  MemoField,
  NoticeResult,
  PointResults,
  ScheduleResult,
  SheetModal,
  Stat,
  VehicleResults,
} from "@/components/guide/GuideClosingReportParts";
import {
  TEST_REFERENCE_DATE,
  formatGuideDepartureDate,
  getGuideLeadStaff,
  getGuideStaff,
  type GuideDeparture,
} from "@/lib/admin/guide-operation-data";
import { getGuideCommunicationPath } from "@/lib/admin/guide-communication-data";
import { getGuideChatRoomPath } from "@/lib/admin/guide-chatroom-data";
import {
  GUIDE_NOTE_IMPORTANCE_META,
  GUIDE_NOTE_STATUS_BADGE,
  isGuideNoteUnresolved,
  type GuideNote,
} from "@/lib/admin/guide-notes-data";
import {
  GUIDE_ADMIN_REVIEW_BADGE,
  buildGuideClosingReport,
  getGuideClosingPath,
  getGuideClosingState,
  saveGuideClosingState,
  type GuideClosingReport,
  type GuideClosingState,
} from "@/lib/admin/guide-closing-data";
import {
  GUIDE_FOLLOW_UP_STATUSES,
  GUIDE_FOLLOW_UP_STATUS_BADGE,
  GUIDE_FOLLOW_UP_TYPES,
  GUIDE_OPERATION_PHASE_BADGE,
  GUIDE_REVIEW_ADMIN,
  GUIDE_REVIEW_ASSIGNEES,
  GUIDE_REVIEW_CHECKS,
  GUIDE_REVIEW_NOTE_FILTERS,
  applyGuideHandoverSample,
  buildGuideNoteTimeline,
  buildGuideReviewDelays,
  countGuideReviewChecks,
  createGuideFollowUpId,
  formatGuideReviewNow,
  formatGuideReviewTime,
  getGuideFollowUpDue,
  getGuideFollowUpTypeForNote,
  getGuideImportantIssues,
  getGuideOperationPhase,
  getGuideReviewAssigneeName,
  getGuideReviewBlockers,
  getGuideReviewState,
  getGuideUnconfirmedIssues,
  isGuideFollowUpOpen,
  isGuideImportantIssue,
  matchesGuideReviewNoteFilter,
  saveGuideReviewState,
  summarizeGuideFollowUps,
  type GuideFollowUp,
  type GuideFollowUpDraft,
  type GuideFollowUpNeed,
  type GuideFollowUpStatus,
  type GuideReviewCheckKey,
  type GuideReviewNoteFilter,
  type GuideReviewState,
} from "@/lib/admin/guide-review-data";
import { getOperationDeparture } from "@/lib/admin/operation-assignment-data";

const LIST_PATH = "/reservations/guide-operations";
const OPS_BOARD_PATH = "/reservations/operations";

type FollowUpFilter = "all" | GuideFollowUpStatus;

type ReviewModal =
  | { kind: "note"; id: string }
  | { kind: "follow-up"; draft: GuideFollowUpDraft; editingId: string | null }
  | { kind: "open-warning" }
  | { kind: "confirm" }
  | null;

export default function GuideReviewPage() {
  const params = useParams<{ key: string }>();
  const router = useRouter();
  const departureKey = decodeURIComponent(params.key ?? "");
  const [revision, setRevision] = useState(0);
  const departure = getOperationDeparture(departureKey);
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
          <strong>운영결과 확인</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
    >
      {!departure ? (
        <main className="content member-web-detail-content guide-ops-content">
          <section className="panel member-web-detail-not-found">
            <strong>출발상품을 찾을 수 없습니다.</strong>
            <p>요청한 출발상품({departureKey || "-"})의 운영결과가 없습니다.</p>
            <button type="button" className="secondary" onClick={() => router.push(LIST_PATH)}>
              <ArrowLeft size={15} />
              가이드 운영 목록으로
            </button>
          </section>
        </main>
      ) : (
        <GuideReviewBody
          key={`${departure.key}-${revision}`}
          departure={departure}
          onNotify={notify}
          onSampleApplied={() => setRevision((value) => value + 1)}
        />
      )}
    </ProductAdminShell>
  );
}

function GuideReviewBody({
  departure,
  onNotify,
  onSampleApplied,
}: {
  departure: GuideDeparture;
  onNotify: (message: string) => void;
  onSampleApplied: () => void;
}) {
  const router = useRouter();
  const [closing, setClosing] = useState<GuideClosingState>(() => getGuideClosingState(departure.key));
  const [review, setReview] = useState<GuideReviewState>(() => getGuideReviewState(departure.key));
  const [noteFilter, setNoteFilter] = useState<GuideReviewNoteFilter>("all");
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>("all");
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [modal, setModal] = useState<ReviewModal>(null);

  const report = buildGuideClosingReport(departure);
  const leadStaff = getGuideLeadStaff(departure);
  const phase = getGuideOperationPhase(departure, closing);
  const closed = Boolean(closing.closedAt);
  const reviewed = closing.adminReview === "관리자 확인완료";
  const notes = report.notes.list.filter((note) => !note.canceled);
  const issues = getGuideImportantIssues(notes);
  const unconfirmed = getGuideUnconfirmedIssues(notes, review);
  const delays = buildGuideReviewDelays(departure, report, notes);
  const followUps = review.followUps;
  const followUpSummary = summarizeGuideFollowUps(followUps);
  const blockers = getGuideReviewBlockers(review, notes);
  const checkedCount = countGuideReviewChecks(review);
  const canComplete = closed && !reviewed && blockers.length === 0;
  const disabledReason = blockers[0] ?? "";
  const needsWithoutFollowUp = notes.filter(
    (note) => review.needs[note.id] === "필요" && !followUps.some((item) => item.noteId === note.id),
  );
  const { boarding, schedule } = report;

  const commitReview = (next: GuideReviewState) => {
    setReview(next);
    saveGuideReviewState(departure.key, next);
  };

  const toggleSection = (id: string) =>
    setOpenSections((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const toggleCheck = (key: GuideReviewCheckKey) => {
    if (reviewed) return;
    commitReview({ ...review, checks: { ...review.checks, [key]: !review.checks[key] } });
  };

  const confirmIssue = (note: GuideNote) => {
    if (reviewed || review.confirmedIssues.includes(note.id)) return;
    commitReview({ ...review, confirmedIssues: [...review.confirmedIssues, note.id] });
    onNotify(`중요 이슈 "${note.title}" 확인완료로 표시했습니다.`);
  };

  const setNeed = (noteId: string, need: GuideFollowUpNeed) =>
    commitReview({ ...review, needs: { ...review.needs, [noteId]: need } });

  const openFollowUpForm = (note: GuideNote | null) =>
    setModal({
      kind: "follow-up",
      editingId: null,
      draft: {
        noteId: note?.id ?? "",
        type: getGuideFollowUpTypeForNote(note),
        assigneeId: GUIDE_REVIEW_ADMIN.id,
        dueDate: "",
        content: note ? note.title : "",
        status: "처리대기",
        memo: "",
      },
    });

  const editFollowUp = (item: GuideFollowUp) =>
    setModal({
      kind: "follow-up",
      editingId: item.id,
      draft: {
        noteId: item.noteId,
        type: item.type,
        assigneeId: item.assigneeId,
        dueDate: item.dueDate,
        content: item.content,
        status: item.status,
        memo: item.memo,
      },
    });

  const saveFollowUp = (draft: GuideFollowUpDraft, editingId: string | null) => {
    const at = formatGuideReviewNow();
    const by = GUIDE_REVIEW_ADMIN.name;
    const needs = draft.noteId ? { ...review.needs, [draft.noteId]: "필요" as const } : review.needs;
    if (editingId) {
      commitReview({
        ...review,
        needs,
        followUps: followUps.map((item) => {
          if (item.id !== editingId) return item;
          const statusChanged = item.status !== draft.status;
          return {
            ...item,
            ...draft,
            logs: [
              ...item.logs,
              {
                id: createGuideFollowUpId("LOG"),
                at,
                by,
                text: statusChanged ? `상태 변경 ${item.status} → ${draft.status}` : "후속조치 정보 수정",
                ...(statusChanged ? { status: draft.status } : {}),
              },
            ],
          };
        }),
      });
      onNotify("후속조치를 수정했습니다. (SAMPLE · 알림 미발송)");
    } else {
      const created: GuideFollowUp = {
        ...draft,
        id: createGuideFollowUpId(),
        createdAt: at,
        createdBy: by,
        logs: [
          {
            id: createGuideFollowUpId("LOG"),
            at,
            by,
            text: `후속조치 등록 · 담당 ${getGuideReviewAssigneeName(draft.assigneeId)}`,
            status: draft.status,
          },
        ],
      };
      commitReview({ ...review, needs, followUps: [...followUps, created] });
      onNotify(
        `후속조치를 등록했습니다. 담당 ${getGuideReviewAssigneeName(draft.assigneeId)} · ${draft.status} (SAMPLE · 새로고침 시 초기화)`,
      );
    }
    setModal(null);
  };

  const changeFollowUpStatus = (item: GuideFollowUp, status: GuideFollowUpStatus) => {
    if (item.status === status) return;
    commitReview({
      ...review,
      followUps: followUps.map((value) =>
        value.id === item.id
          ? {
              ...value,
              status,
              logs: [
                ...value.logs,
                {
                  id: createGuideFollowUpId("LOG"),
                  at: formatGuideReviewNow(),
                  by: GUIDE_REVIEW_ADMIN.name,
                  text: `상태 변경 ${value.status} → ${status}`,
                  status,
                },
              ],
            }
          : value,
      ),
    });
    onNotify(`후속조치 상태를 ${status}(으)로 변경했습니다.`);
  };

  const addFollowUpLog = (item: GuideFollowUp, text: string) => {
    commitReview({
      ...review,
      followUps: followUps.map((value) =>
        value.id === item.id
          ? {
              ...value,
              logs: [
                ...value.logs,
                { id: createGuideFollowUpId("LOG"), at: formatGuideReviewNow(), by: GUIDE_REVIEW_ADMIN.name, text },
              ],
            }
          : value,
      ),
    });
    onNotify("처리내용을 기록했습니다.");
  };

  const requestComplete = () => {
    if (!canComplete) return;
    setModal(followUpSummary.open > 0 ? { kind: "open-warning" } : { kind: "confirm" });
  };

  const confirmComplete = () => {
    const at = formatGuideReviewNow();
    const nextReview = { ...review, reviewedAt: at, reviewedBy: GUIDE_REVIEW_ADMIN.name };
    const nextClosing: GuideClosingState = { ...closing, adminReview: "관리자 확인완료" };
    commitReview(nextReview);
    setClosing(nextClosing);
    saveGuideClosingState(departure.key, nextClosing);
    setModal(null);
    onNotify("관리자 확인완료 처리했습니다. 후속조치는 계속 관리할 수 있습니다. (SAMPLE)");
  };

  const applySample = () => {
    applyGuideHandoverSample(departure);
    onNotify("SAMPLE · 가이드 운영 종료 인계 상태를 만들었습니다. (관리자 확인대기)");
    onSampleApplied();
  };

  const openIssue = () => {
    const target = unconfirmed[0];
    if (target) setModal({ kind: "note", id: target.id });
  };

  const goSection = (id: string) => {
    setOpenSections((current) => (current.includes(id) ? current : [...current, id]));
    document.getElementById(`guide-close-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const vehicleName = (id: string) =>
    departure.vehicles.find((vehicle) => vehicle.id === id)?.name ?? (id === "all" ? "전체 호차" : "-");
  const noteById = (id: string) => notes.find((note) => note.id === id) ?? null;
  const followUpsOf = (noteId: string) => followUps.filter((item) => item.noteId === noteId);

  const section = (id: string, title: string, summary: string, children: ReactNode, tone = "") => (
    <ClosingSection
      id={id}
      title={title}
      summary={summary}
      tone={tone}
      open={openSections.includes(id)}
      onToggle={() => toggleSection(id)}
    >
      {children}
    </ClosingSection>
  );

  const hero = (
    <section className="panel guide-ops-hero" aria-labelledby="guide-review-title">
      <div className="guide-ops-hero-main">
        <p className="member-web-breadcrumb">예약관리 &gt; 가이드 운영 &gt; 운영결과 확인</p>
        <div className="guide-ops-hero-status guide-review-status">
          <span className="guide-review-status-item">
            <small>운영상태</small>
            <span className={`badge ${GUIDE_OPERATION_PHASE_BADGE[phase]}`}>{phase}</span>
          </span>
          {closing.adminReview && (
            <span className="guide-review-status-item">
              <small>관리자 확인</small>
              <span className={`badge ${GUIDE_ADMIN_REVIEW_BADGE[closing.adminReview]}`}>{closing.adminReview}</span>
            </span>
          )}
          {followUpSummary.total > 0 && (
            <span className="guide-review-status-item">
              <small>후속조치</small>
              <span className={`badge ${followUpSummary.open ? "info" : "success"}`}>
                {followUpSummary.open ? `${followUpSummary.open}건 진행중` : "모두 처리완료"}
              </span>
            </span>
          )}
          {reviewed && (
            <span className="badge gray guide-close-readonly">
              <Lock size={11} aria-hidden="true" />
              운영결과 읽기전용
            </span>
          )}
          <span className="guide-ops-code">{departure.productCode}</span>
        </div>
        <h1 id="guide-review-title">{departure.productName}</h1>
        <dl className="guide-ops-hero-meta">
          <div className="is-date">
            <dt>출발일</dt>
            <dd>{formatGuideDepartureDate(departure.departureDate)}</dd>
          </div>
          <div>
            <dt>예약인원</dt>
            <dd>{report.people}명</dd>
          </div>
          <div>
            <dt>실제 탑승</dt>
            <dd>{boarding.boarded}명</dd>
          </div>
          <div>
            <dt>미탑승</dt>
            <dd>{boarding.noShow}명</dd>
          </div>
          <div>
            <dt>운영차량</dt>
            <dd>{departure.vehicles.length}대</dd>
          </div>
          <div>
            <dt>총괄가이드</dt>
            <dd>{leadStaff?.name ?? departure.guideName}</dd>
          </div>
        </dl>
      </div>
      <div className="guide-ops-hero-actions">
        <button type="button" className="secondary" onClick={() => router.push(LIST_PATH)}>
          <ArrowLeft size={15} />
          가이드 운영 목록
        </button>
        <button type="button" className="secondary" onClick={() => router.push(getGuideClosingPath(departure.key))}>
          <FileText size={15} />
          가이드 운영결과 보고
        </button>
        <button type="button" className="secondary" onClick={() => router.push(OPS_BOARD_PATH)}>
          <ClipboardCheck size={15} />
          운영현황
        </button>
      </div>
    </section>
  );

  if (!closed) {
    return (
      <main className="content member-web-detail-content guide-ops-content guide-close-content">
        {hero}
        <section className="panel guide-review-pending" aria-labelledby="guide-review-pending-title">
          <AlertTriangle size={22} aria-hidden="true" />
          <div>
            <h2 id="guide-review-pending-title">가이드 운영 종료 인계 전입니다.</h2>
            <p>
              현재 운영상태는 <b>{phase}</b>입니다. 가이드가 운영결과 보고 화면에서 [운영 종료 인계]를 완료하면 관리자
              확인대기 상태가 되고, 이 화면에서 운영결과를 검토할 수 있습니다.
            </p>
            <div className="guide-review-pending-actions">
              <button type="button" className="primary" onClick={() => router.push(getGuideClosingPath(departure.key))}>
                가이드 운영결과 보고로 이동
              </button>
              {departure.vehicles.length > 0 && (
                <button type="button" className="guide-close-sample" onClick={applySample}>
                  SAMPLE 운영종료 인계 상태 만들기
                </button>
              )}
            </div>
            <small>
              SAMPLE 버튼은 테스트용입니다. 탑승 미확인 고객과 남은 일정을 정리하고 가이드 메모 예시를 넣어 운영종료 ·
              관리자 확인대기 상태로 바꿉니다.
            </small>
          </div>
        </section>
      </main>
    );
  }

  const kpis = [
    { key: "people", label: "예약", value: `${report.people}명`, tone: "", mobile: true },
    { key: "boarded", label: "탑승", value: `${boarding.boarded}명`, tone: "is-success", mobile: true },
    {
      key: "noshow",
      label: "미탑승",
      value: `${boarding.noShow}명`,
      tone: boarding.noShow ? "is-danger" : "is-muted",
      mobile: true,
    },
    {
      key: "delay",
      label: "일정지연",
      value: `${schedule.delayed}건`,
      tone: schedule.delayed ? "is-warn" : "is-muted",
    },
    { key: "notes", label: "특이사항", value: `${notes.length}건`, tone: "is-muted" },
    {
      key: "unresolved",
      label: "미처리",
      value: `${report.notes.unresolved.length}건`,
      tone: report.notes.unresolved.length ? "is-warn" : "is-success",
    },
    { key: "important", label: "중요", value: `${issues.length}건`, tone: issues.length ? "is-danger" : "is-muted" },
  ];

  const filteredNotes = notes.filter((note) => matchesGuideReviewNoteFilter(note, noteFilter));
  const filteredFollowUps =
    followUpFilter === "all" ? followUps : followUps.filter((item) => item.status === followUpFilter);
  const modalNote = modal?.kind === "note" ? noteById(modal.id) : null;

  return (
    <>
      <main className="content member-web-detail-content guide-ops-content guide-close-content guide-review-content">
        {hero}

        {reviewed ? (
          <p className="ops-assign-notice is-success guide-close-banner" role="status">
            <Lock size={16} aria-hidden="true" />
            <span>
              <b>관리자 확인완료 · 운영결과 읽기전용</b>
              <small>
                {review.reviewedAt} {review.reviewedBy} 확인. 관리자 확인완료는 운영결과를 검토했다는 의미이며, 후속조치
                {followUpSummary.open ? ` ${followUpSummary.open}건은` : "는"} 아래 후속조치 영역에서 계속 관리합니다.
              </small>
            </span>
          </p>
        ) : (
          <p className="ops-assign-notice is-warn guide-close-banner" role="note">
            <ClipboardCheck size={16} aria-hidden="true" />
            <span>
              <b>관리자 확인대기</b>
              <small>
                {closing.closedAt} {closing.closedBy} 운영종료 인계. 가이드 전달사항과 중요 이슈를 먼저 확인한 뒤 검토
                체크를 완료해 주세요.
              </small>
            </span>
          </p>
        )}

        <section className="guide-ops-kpis guide-close-kpis" aria-label="운영결과 요약">
          {kpis.map((kpi) => (
            <div
              key={kpi.key}
              className={`member-web-detail-kpi guide-ops-kpi ${kpi.tone} ${kpi.mobile ? "" : "is-desktop"}`}
            >
              <span>
                <small>{kpi.label}</small>
                <strong>{kpi.value}</strong>
              </span>
            </div>
          ))}
        </section>

        <section className="panel guide-review-handover" aria-labelledby="guide-review-handover-title">
          <header>
            <h2 id="guide-review-handover-title">가이드 인계정보</h2>
            <span>
              {closing.closedAt} · {closing.closedBy} 운영종료 인계
            </span>
            {!reviewed && (
              <button
                type="button"
                className={review.checks["admin-note"] ? "secondary is-checked" : "secondary"}
                aria-pressed={Boolean(review.checks["admin-note"])}
                onClick={() => toggleCheck("admin-note")}
              >
                <CheckCircle2 size={14} aria-hidden="true" />
                {review.checks["admin-note"] ? "전달사항 확인완료" : "전달사항 확인"}
              </button>
            )}
          </header>
          <div className="guide-review-handover-grid">
            <div className="guide-review-handover-block">
              <span>가이드 최종 운영메모</span>
              <p>{closing.finalMemo || "작성된 내용이 없습니다."}</p>
            </div>
            <div className="guide-review-handover-block is-admin">
              <span>관리자 전달사항</span>
              <p>{closing.adminNote || "작성된 내용이 없습니다."}</p>
            </div>
          </div>
        </section>

        {issues.length > 0 && (
          <section
            className="panel guide-notes-important guide-review-issues"
            aria-labelledby="guide-review-issues-title"
          >
            <h2 id="guide-review-issues-title">
              <ShieldAlert size={16} aria-hidden="true" />
              중요 이슈 {issues.length}건<span className="badge danger">중요</span>
              {unconfirmed.length > 0 ? (
                <small>확인하지 않은 중요 이슈 {unconfirmed.length}건 · 확인 후 관리자 확인완료 가능</small>
              ) : (
                <small className="is-ok">모든 중요 이슈를 확인했습니다.</small>
              )}
            </h2>
            <ul>
              {issues.map((note) => {
                const confirmed = review.confirmedIssues.includes(note.id);
                return (
                  <li key={note.id}>
                    <button type="button" onClick={() => setModal({ kind: "note", id: note.id })}>
                      <b>{note.occurredAt}</b>
                      <strong>{note.title}</strong>
                      <span>
                        {note.category} · {vehicleName(note.vehicleId)} · {note.status}
                      </span>
                      <span className={`badge ${confirmed ? "success" : "danger"}`}>
                        {confirmed ? "확인완료" : "미확인 · 중요 이슈 확인"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="guide-close-layout guide-review-layout">
          <div className="guide-close-report">
            {section(
              "basic",
              "1. 기본정보",
              `${formatGuideDepartureDate(departure.departureDate)} · 예약 ${report.reservations}건`,
              <dl className="guide-close-dl">
                <div>
                  <dt>상품</dt>
                  <dd>
                    {departure.productName} ({departure.productCode})
                  </dd>
                </div>
                <div>
                  <dt>출발일</dt>
                  <dd>{formatGuideDepartureDate(departure.departureDate)}</dd>
                </div>
                <div>
                  <dt>예약</dt>
                  <dd>
                    {report.reservations}건 · {report.people}명
                  </dd>
                </div>
                <div>
                  <dt>총괄가이드</dt>
                  <dd>{leadStaff?.name ?? departure.guideName}</dd>
                </div>
                <div>
                  <dt>운영차량</dt>
                  <dd>
                    {departure.vehicles
                      .map(
                        (vehicle) => `${vehicle.name} (${getGuideStaff(departure, vehicle.guideId)?.name ?? "미배정"})`,
                      )
                      .join(" · ") || "-"}
                  </dd>
                </div>
                <div>
                  <dt>운영종료</dt>
                  <dd>
                    {closing.closedAt} · {closing.closedBy}
                  </dd>
                </div>
                <div>
                  <dt>운영상태</dt>
                  <dd>
                    <span className={`badge ${GUIDE_OPERATION_PHASE_BADGE[phase]}`}>{phase}</span>
                  </dd>
                </div>
                <div>
                  <dt>관리자 확인</dt>
                  <dd>
                    {closing.adminReview && (
                      <span className={`badge ${GUIDE_ADMIN_REVIEW_BADGE[closing.adminReview]}`}>
                        {closing.adminReview}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>,
            )}

            {section(
              "boarding",
              "2. 탑승결과",
              `예약 ${report.people} · 탑승 ${boarding.boarded} · 미탑승 ${boarding.noShow}`,
              <BoardingResult report={report} closed onCustomers={() => undefined} />,
            )}

            {section(
              "vehicles",
              "3. 호차별 운영결과",
              report.vehicles.map((item) => `${item.vehicle.name} ${item.status}`).join(" · ") || "-",
              <div className="guide-close-stack">
                <VehicleResults report={report} />
                <PointResults report={report} />
              </div>,
            )}

            {section(
              "schedule",
              "4. 일정 운영결과",
              `완료 ${schedule.done} / ${schedule.total} · 지연 ${schedule.delayed} · 변경 ${schedule.changes.length}`,
              <div className="guide-close-stack">
                <div className="guide-close-sub">
                  <h3>
                    지연 · 변경 일정 <b>{delays.length}건</b>
                  </h3>
                  {delays.length === 0 ? (
                    <p className="guide-sheet-note">지연되거나 변경된 일정이 없습니다.</p>
                  ) : (
                    <ul className="guide-review-delays">
                      {delays.map((row) => (
                        <li key={row.id}>
                          <header>
                            <strong>{row.item.title}</strong>
                            <span>{row.vehicle.name}</span>
                            {row.delayMinutes > 0 ? (
                              <span className="badge danger">{row.delayMinutes}분 지연</span>
                            ) : (
                              <span className="badge warn">출발시간 변경</span>
                            )}
                          </header>
                          <dl>
                            <div>
                              <dt>예정 출발</dt>
                              <dd>{row.planned || "-"}</dd>
                            </div>
                            {row.changedTo && (
                              <div>
                                <dt>변경 출발</dt>
                                <dd>{row.changedTo}</dd>
                              </div>
                            )}
                            <div>
                              <dt>실제 출발</dt>
                              <dd>{row.actual || "-"}</dd>
                            </div>
                            <div className="is-reason">
                              <dt>사유</dt>
                              <dd>{row.reason}</dd>
                            </div>
                          </dl>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <ScheduleResult report={report} />
              </div>,
              delays.length ? "is-warn" : "",
            )}

            {section(
              "notices",
              "5. 고객안내 결과",
              `발송 ${report.notices.sends}회 · 성공 ${report.notices.success} · 실패 ${report.notices.failed}`,
              <NoticeResult report={report} onOpen={() => router.push(getGuideCommunicationPath(departure.key))} />,
            )}

            {section(
              "chat",
              "6. 안내방 운영",
              report.chat.modeLabel,
              <ChatResult report={report} onOpen={() => router.push(getGuideChatRoomPath(departure.key))} />,
            )}

            {section(
              "notes",
              "7. 운영기록 · 특이사항",
              `전체 ${notes.length}건 · 중요 ${issues.length} · 후속조치 필요 ${
                notes.filter((note) => review.needs[note.id] === "필요").length
              }`,
              <div className="guide-close-stack">
                <div className="guide-customers-chips" role="group" aria-label="특이사항 필터">
                  {GUIDE_REVIEW_NOTE_FILTERS.map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      className={noteFilter === item.key ? "is-active" : ""}
                      aria-pressed={noteFilter === item.key}
                      onClick={() => setNoteFilter(item.key)}
                    >
                      {item.label} <b>{notes.filter((note) => matchesGuideReviewNoteFilter(note, item.key)).length}</b>
                    </button>
                  ))}
                </div>
                {filteredNotes.length === 0 ? (
                  <p className="guide-sheet-note">조건에 맞는 운영기록이 없습니다.</p>
                ) : (
                  <ul className="guide-review-notes">
                    {filteredNotes.map((note) => (
                      <ReviewNoteRow
                        key={note.id}
                        note={note}
                        vehicleName={vehicleName(note.vehicleId)}
                        need={review.needs[note.id]}
                        followUps={followUpsOf(note.id)}
                        onNeed={(need) => setNeed(note.id, need)}
                        onDetail={() => setModal({ kind: "note", id: note.id })}
                        onFollowUp={() => openFollowUpForm(note)}
                      />
                    ))}
                  </ul>
                )}
                <p className="guide-sheet-note">
                  가이드 원본 운영기록은 수정하지 않습니다. 관리자 조치는 후속조치로 별도 기록됩니다.
                </p>
              </div>,
              issues.length ? "is-danger" : "",
            )}

            {section(
              "unresolved",
              "8. 미처리사항",
              `${report.notes.unresolved.length}건 (가이드 인계 기준)`,
              report.notes.unresolved.length === 0 ? (
                <p className="guide-sheet-note">가이드가 미처리로 인계한 운영기록이 없습니다.</p>
              ) : (
                <ul className="guide-close-unresolved">
                  {report.notes.unresolved.map((note) => {
                    const linked = followUpsOf(note.id);
                    return (
                      <li key={note.id}>
                        <button type="button" onClick={() => setModal({ kind: "note", id: note.id })}>
                          <span className={`badge ${GUIDE_NOTE_IMPORTANCE_META[note.importance].badge}`}>
                            {note.importance}
                          </span>
                          <strong>{note.title}</strong>
                          <span className="guide-close-muted">
                            {note.category} · {vehicleName(note.vehicleId)} · {note.occurredAt} · 후속조치{" "}
                            {linked.length
                              ? `${linked.length}건 (${linked.map((item) => item.status).join(", ")})`
                              : review.needs[note.id] === "불필요"
                                ? "불필요"
                                : "미등록"}
                          </span>
                          <span className={`badge ${GUIDE_NOTE_STATUS_BADGE[note.status]}`}>{note.status}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ),
              report.notes.unresolved.length ? "is-warn guide-review-m1" : "guide-review-m1",
            )}

            {section(
              "final-memo",
              "9. 가이드 최종 운영메모",
              closing.finalMemo ? "작성됨" : "미작성",
              <MemoField
                id="guide-review-final-memo"
                label="가이드 최종 운영메모 (가이드 작성 · 수정 불가)"
                value={closing.finalMemo}
                readOnly
                placeholder=""
                hint=""
                onChange={() => undefined}
              />,
            )}

            {section(
              "admin-note",
              "10. 관리자 전달사항",
              closing.adminNote ? "작성됨" : "미작성",
              <MemoField
                id="guide-review-admin-note"
                label="관리자 전달사항 (가이드 작성 · 수정 불가)"
                value={closing.adminNote}
                readOnly
                placeholder=""
                hint=""
                onChange={() => undefined}
              />,
            )}

            {section(
              "review",
              "11. 관리자 검토",
              reviewed ? `확인완료 · ${review.reviewedBy}` : `검토 ${checkedCount} / ${GUIDE_REVIEW_CHECKS.length}`,
              <div className="guide-close-stack">
                <MemoField
                  id="guide-review-memo-input"
                  label="관리자 검토 메모 (내부용)"
                  value={review.memo}
                  readOnly={reviewed}
                  placeholder={"예: 전체 운영에는 문제 없음.\n차량 에어컨 문제는 차량업체 확인 후 종료 처리 예정."}
                  hint="여행 전체에 대한 관리자 내부 메모입니다. 가이드 · 고객에게 전달되지 않습니다."
                  onChange={(memo) => commitReview({ ...review, memo })}
                />
                {reviewed && (
                  <dl className="guide-close-dl">
                    <div>
                      <dt>확인자</dt>
                      <dd>{review.reviewedBy}</dd>
                    </div>
                    <div>
                      <dt>확인일시</dt>
                      <dd>{review.reviewedAt}</dd>
                    </div>
                  </dl>
                )}
              </div>,
            )}

            {section(
              "follow-ups",
              "12. 후속조치",
              `전체 ${followUpSummary.total} · 완료 ${followUpSummary.done} · 진행중 ${followUpSummary.open}`,
              <div className="guide-close-stack">
                <div className="guide-close-stats">
                  <Stat label="후속조치" value={`${followUpSummary.total}건`} />
                  <Stat label="완료" value={`${followUpSummary.done}건`} tone="is-success" />
                  <Stat
                    label="진행중"
                    value={`${followUpSummary.open}건`}
                    tone={followUpSummary.open ? "is-warn" : ""}
                  />
                  <Stat
                    label="필요 · 미등록"
                    value={`${needsWithoutFollowUp.length}건`}
                    tone={needsWithoutFollowUp.length ? "is-danger" : ""}
                  />
                </div>
                <div className="guide-review-follow-head">
                  <div className="guide-customers-chips" role="group" aria-label="후속조치 상태 필터">
                    {(["all", ...GUIDE_FOLLOW_UP_STATUSES] as FollowUpFilter[]).map((key) => (
                      <button
                        type="button"
                        key={key}
                        className={followUpFilter === key ? "is-active" : ""}
                        aria-pressed={followUpFilter === key}
                        onClick={() => setFollowUpFilter(key)}
                      >
                        {key === "all" ? "전체" : key}{" "}
                        <b>
                          {key === "all" ? followUps.length : followUps.filter((item) => item.status === key).length}
                        </b>
                      </button>
                    ))}
                  </div>
                  <button type="button" className="primary" onClick={() => openFollowUpForm(null)}>
                    <Plus size={15} aria-hidden="true" />
                    후속조치 등록
                  </button>
                </div>
                {needsWithoutFollowUp.length > 0 && (
                  <ul className="guide-review-needs">
                    {needsWithoutFollowUp.map((note) => (
                      <li key={note.id}>
                        <AlertTriangle size={14} aria-hidden="true" />
                        <span>
                          후속조치 필요 · 미등록 <b>{note.title}</b>
                        </span>
                        <button type="button" className="secondary" onClick={() => openFollowUpForm(note)}>
                          후속조치 등록
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {filteredFollowUps.length === 0 ? (
                  <p className="guide-sheet-note">
                    {followUps.length === 0
                      ? "등록된 후속조치가 없습니다. 특이사항에서 후속조치 필요를 선택하고 등록해 주세요."
                      : "조건에 맞는 후속조치가 없습니다."}
                  </p>
                ) : (
                  <ul className="guide-review-follow-list">
                    {filteredFollowUps.map((item) => (
                      <FollowUpCard
                        key={item.id}
                        item={item}
                        note={item.noteId ? noteById(item.noteId) : null}
                        onStatus={(status) => changeFollowUpStatus(item, status)}
                        onLog={(text) => addFollowUpLog(item, text)}
                        onEdit={() => editFollowUp(item)}
                        onNote={(id) => setModal({ kind: "note", id })}
                      />
                    ))}
                  </ul>
                )}
                <p className="guide-sheet-note">
                  후속조치는 관리자 확인완료 이후에도 계속 수정할 수 있습니다. 환불 · 보상은 처리하지 않고 검토 업무만
                  기록합니다. (SAMPLE · 담당자 알림 미발송)
                </p>
              </div>,
              followUpSummary.open || needsWithoutFollowUp.length ? "is-warn guide-review-m3" : "guide-review-m3",
            )}
          </div>

          <aside className="panel guide-close-side guide-review-m2" aria-labelledby="guide-review-side-title">
            <h2 id="guide-review-side-title">
              <ClipboardCheck size={17} aria-hidden="true" />
              관리자 검토
            </h2>
            {reviewed ? (
              <div className="guide-close-stack">
                <p className="guide-close-closed">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>
                    <b>관리자 확인완료</b>
                    <small>
                      {review.reviewedAt} · {review.reviewedBy}
                    </small>
                  </span>
                </p>
                <dl className="guide-close-dl is-compact">
                  <div>
                    <dt>운영상태</dt>
                    <dd>{phase}</dd>
                  </div>
                  <div>
                    <dt>관리자 확인</dt>
                    <dd>{closing.adminReview}</dd>
                  </div>
                  <div>
                    <dt>검토 체크</dt>
                    <dd>
                      {checkedCount} / {GUIDE_REVIEW_CHECKS.length}
                    </dd>
                  </div>
                  <div>
                    <dt>중요 이슈</dt>
                    <dd>{issues.length}건 확인</dd>
                  </div>
                  <div>
                    <dt>후속조치</dt>
                    <dd>
                      {followUpSummary.total}건 · 진행중 {followUpSummary.open}건
                    </dd>
                  </div>
                </dl>
                <button type="button" className="secondary" onClick={() => goSection("follow-ups")}>
                  후속조치 관리
                </button>
                <p className="guide-sheet-note">
                  운영결과는 읽기전용입니다. 후속조치는 계속 관리할 수 있습니다. 정산 화면 연동은 향후 제공됩니다.
                </p>
              </div>
            ) : (
              <>
                <div className="guide-close-validate">
                  <span>확인완료 전 검토</span>
                  <ul>
                    <li className={unconfirmed.length ? "is-blocked" : "is-ok"}>
                      <span>
                        <b>중요 이슈 확인</b>
                        <em>
                          {issues.length === 0
                            ? "중요 이슈 없음"
                            : unconfirmed.length
                              ? `미확인 ${unconfirmed.length}건 · 확인완료 불가`
                              : `${issues.length}건 확인완료`}
                        </em>
                      </span>
                      {unconfirmed.length > 0 && (
                        <button type="button" className="secondary" onClick={openIssue}>
                          중요 이슈 확인
                        </button>
                      )}
                    </li>
                    <li className={review.checks["admin-note"] ? "is-ok" : "is-blocked"}>
                      <span>
                        <b>관리자 전달사항</b>
                        <em>{review.checks["admin-note"] ? "확인완료" : "확인 필요"}</em>
                      </span>
                    </li>
                    <li className={checkedCount < GUIDE_REVIEW_CHECKS.length ? "is-blocked" : "is-ok"}>
                      <span>
                        <b>필수 검토 체크</b>
                        <em>
                          {checkedCount} / {GUIDE_REVIEW_CHECKS.length}
                        </em>
                      </span>
                    </li>
                    <li className={followUpSummary.open ? "is-warn" : "is-ok"}>
                      <span>
                        <b>미처리 후속조치</b>
                        <em>
                          {followUpSummary.open
                            ? `${followUpSummary.open}건 · 경고 후 확인완료 가능`
                            : `${followUpSummary.total}건 등록 · 미처리 0건`}
                        </em>
                      </span>
                    </li>
                    {needsWithoutFollowUp.length > 0 && (
                      <li className="is-warn">
                        <span>
                          <b>후속조치 필요 · 미등록</b>
                          <em>{needsWithoutFollowUp.length}건</em>
                        </span>
                        <button type="button" className="secondary" onClick={() => goSection("follow-ups")}>
                          후속조치
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
                <fieldset className="guide-close-checks">
                  <legend>
                    검토 체크{" "}
                    <b>
                      {checkedCount} / {GUIDE_REVIEW_CHECKS.length}
                    </b>
                  </legend>
                  {GUIDE_REVIEW_CHECKS.map((item) => (
                    <label key={item.key} className={review.checks[item.key] ? "is-checked" : ""}>
                      <input
                        type="checkbox"
                        checked={Boolean(review.checks[item.key])}
                        onChange={() => toggleCheck(item.key)}
                      />
                      <span>
                        <b>{item.label}</b>
                        <small>{item.description}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <div className="guide-close-action">
                  <button type="button" className="primary" disabled={!canComplete} onClick={requestComplete}>
                    관리자 확인완료
                  </button>
                  {disabledReason ? (
                    <small className="is-blocked">
                      <AlertTriangle size={12} aria-hidden="true" /> {disabledReason}
                    </small>
                  ) : followUpSummary.open ? (
                    <small>미처리 후속조치 {followUpSummary.open}건은 확인완료 후에도 계속 관리됩니다.</small>
                  ) : null}
                  <small>확인자: {GUIDE_REVIEW_ADMIN.name} (현재 관리자 더미 · 권한 확인 미구현)</small>
                </div>
              </>
            )}
          </aside>
        </div>

        {!reviewed && (
          <div className="guide-close-sticky">
            <span className="guide-close-sticky-info">
              <strong>
                검토 {checkedCount} / {GUIDE_REVIEW_CHECKS.length} · 미처리 후속조치 {followUpSummary.open}건
              </strong>
              {disabledReason && <small>{disabledReason}</small>}
            </span>
            <button type="button" className="primary" disabled={!canComplete} onClick={requestComplete}>
              관리자 확인완료
            </button>
          </div>
        )}
      </main>

      {modalNote && (
        <NoteReviewModal
          note={modalNote}
          departure={departure}
          report={report}
          followUps={followUpsOf(modalNote.id)}
          vehicleName={vehicleName(modalNote.vehicleId)}
          confirmed={review.confirmedIssues.includes(modalNote.id)}
          reviewed={reviewed}
          onConfirm={() => confirmIssue(modalNote)}
          onFollowUp={() => openFollowUpForm(modalNote)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === "follow-up" && (
        <FollowUpModal
          draft={modal.draft}
          editing={Boolean(modal.editingId)}
          notes={notes}
          onCancel={() => setModal(null)}
          onSave={(draft) => saveFollowUp(draft, modal.editingId)}
        />
      )}

      {modal?.kind === "open-warning" && (
        <SheetModal title="미처리 후속조치 확인" onClose={() => setModal(null)}>
          <div className="guide-sheet-body">
            <p className="ops-assign-notice is-warn" role="note">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <b>처리가 완료되지 않은 후속조치가 {followUpSummary.open}건 있습니다.</b>
                <small>관리자 확인을 완료해도 후속조치는 계속 관리됩니다.</small>
              </span>
            </p>
            <ul className="guide-close-modal-list">
              {followUps.filter(isGuideFollowUpOpen).map((item) => (
                <li key={item.id}>
                  <span className={`badge ${GUIDE_FOLLOW_UP_STATUS_BADGE[item.status]}`}>{item.status}</span>
                  <strong>{item.content}</strong>
                  <span className="guide-close-muted">{getGuideReviewAssigneeName(item.assigneeId)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={() => setModal(null)}>
              취소
            </button>
            <button type="button" className="primary" onClick={() => setModal({ kind: "confirm" })}>
              확인완료
            </button>
          </div>
        </SheetModal>
      )}

      {modal?.kind === "confirm" && (
        <SheetModal title="관리자 확인을 완료하시겠습니까?" onClose={() => setModal(null)}>
          <div className="guide-sheet-body">
            <dl className="guide-sheet-summary guide-review-confirm">
              <div>
                <dt>상품</dt>
                <dd>{departure.productName}</dd>
              </div>
              <div>
                <dt>출발일</dt>
                <dd>{formatGuideDepartureDate(departure.departureDate)}</dd>
              </div>
              <div>
                <dt>예약</dt>
                <dd>{report.people}명</dd>
              </div>
              <div>
                <dt>탑승</dt>
                <dd>{boarding.boarded}명</dd>
              </div>
              <div>
                <dt>미탑승</dt>
                <dd>{boarding.noShow}명</dd>
              </div>
              <div>
                <dt>운영기록</dt>
                <dd>{notes.length}건</dd>
              </div>
              <div>
                <dt>후속조치</dt>
                <dd>{followUpSummary.total}건</dd>
              </div>
              <div>
                <dt>미처리 후속조치</dt>
                <dd>{followUpSummary.open}건</dd>
              </div>
              <div>
                <dt>확인자</dt>
                <dd>{GUIDE_REVIEW_ADMIN.name}</dd>
              </div>
            </dl>
            <p className="guide-sheet-note">
              관리자 확인완료는 가이드가 인계한 운영결과를 검토했다는 의미입니다. 확인완료 후 운영결과는 읽기전용으로
              전환되며, 후속조치는 계속 관리할 수 있습니다.
            </p>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={() => setModal(null)}>
              취소
            </button>
            <button type="button" className="primary" onClick={confirmComplete}>
              관리자 확인완료
            </button>
          </div>
        </SheetModal>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- 특이사항 */

function ReviewNoteRow({
  note,
  vehicleName,
  need,
  followUps,
  onNeed,
  onDetail,
  onFollowUp,
}: {
  note: GuideNote;
  vehicleName: string;
  need: GuideFollowUpNeed | undefined;
  followUps: GuideFollowUp[];
  onNeed: (need: GuideFollowUpNeed) => void;
  onDetail: () => void;
  onFollowUp: () => void;
}) {
  const important = isGuideImportantIssue(note);
  return (
    <li className={important ? "is-important" : ""}>
      <div className="guide-review-note-main">
        <div className="guide-review-note-badges">
          <span className={`badge ${GUIDE_NOTE_IMPORTANCE_META[note.importance].badge}`}>{note.importance}</span>
          <span className="guide-notes-cat">{note.category}</span>
          <span className={`badge ${GUIDE_NOTE_STATUS_BADGE[note.status]}`}>가이드 {note.status}</span>
          {important && <span className="badge danger">중요 이슈</span>}
          {isGuideNoteUnresolved(note) && <span className="badge warn">미처리</span>}
        </div>
        <button type="button" className="guide-review-note-title" onClick={onDetail}>
          {note.title}
        </button>
        <small>
          {note.occurredAt} · {vehicleName} · {note.createdBy}
          {followUps.length > 0 &&
            ` · 후속조치 ${followUps.length}건 (${followUps.map((item) => item.status).join(", ")})`}
        </small>
      </div>
      <div className="guide-review-note-actions">
        <div className="guide-review-need" role="group" aria-label={`${note.title} 후속조치 필요 여부`}>
          <span>후속조치</span>
          {(["필요", "불필요"] as const).map((value) => (
            <button
              type="button"
              key={value}
              className={need === value ? `is-active is-${value === "필요" ? "need" : "none"}` : ""}
              aria-pressed={need === value}
              onClick={() => onNeed(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <button type="button" className="secondary" onClick={onFollowUp}>
          <Plus size={13} aria-hidden="true" />
          후속조치 등록
        </button>
        <button type="button" className="secondary" onClick={onDetail}>
          상세
        </button>
      </div>
    </li>
  );
}

function NoteReviewModal({
  note,
  departure,
  report,
  followUps,
  vehicleName,
  confirmed,
  reviewed,
  onConfirm,
  onFollowUp,
  onClose,
}: {
  note: GuideNote;
  departure: GuideDeparture;
  report: GuideClosingReport;
  followUps: GuideFollowUp[];
  vehicleName: string;
  confirmed: boolean;
  reviewed: boolean;
  onConfirm: () => void;
  onFollowUp: () => void;
  onClose: () => void;
}) {
  const important = isGuideImportantIssue(note);
  const passengers = note.passengerIds
    .map((id) => report.entries.find((entry) => entry.passenger.id === id))
    .filter((entry) => entry !== undefined)
    .map((entry) => `${entry.passenger.name} (${entry.group.reservationCode})`);
  const timeline = buildGuideNoteTimeline(note, departure.departureDate, followUps);
  const { detail } = note;
  const extra: { label: string; value: string }[] = [];
  if (passengers.length)
    extra.push({ label: note.category === "민원" ? "고객명" : "관련 고객", value: passengers.join(", ") });
  if (note.category === "민원") extra.push({ label: "민원내용", value: note.content });
  if (detail.vehicleIssue) extra.push({ label: "차량 문제", value: detail.vehicleIssue });
  if (detail.lostItem) extra.push({ label: "분실물", value: detail.lostItem });
  if (detail.lostFoundAt) extra.push({ label: "발견장소", value: detail.lostFoundAt });
  if (detail.lostKeeper) extra.push({ label: "보관자", value: detail.lostKeeper });
  if (detail.lostState) extra.push({ label: "현재 상태", value: detail.lostState });
  if (detail.place) extra.push({ label: "발생장소", value: detail.place });
  if (detail.plannedTime || detail.changedTime)
    extra.push({ label: "일정 변경", value: `${detail.plannedTime ?? "-"} → ${detail.changedTime ?? "-"}` });
  if (detail.delayReason) extra.push({ label: "지연 사유", value: detail.delayReason });
  if (detail.action) extra.push({ label: "현장조치", value: detail.action });
  if (detail.followUp) extra.push({ label: "추가 확인사항", value: detail.followUp });

  return (
    <div className="modal-backdrop guide-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal guide-sheet-modal guide-notes-detail ${important ? "is-accident" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-review-note-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="guide-review-note-title">운영기록 검토</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="guide-sheet-body">
          <div className="guide-notes-detail-title">
            <div className="guide-notes-detail-badges">
              <span className={`badge ${GUIDE_NOTE_IMPORTANCE_META[note.importance].badge}`}>{note.importance}</span>
              <span className="guide-notes-cat">{note.category}</span>
              <span className={`badge ${GUIDE_NOTE_STATUS_BADGE[note.status]}`}>가이드 {note.status}</span>
              {important && (
                <span className={`badge ${confirmed ? "success" : "danger"}`}>
                  {confirmed ? "중요 이슈 · 확인완료" : "중요 이슈 · 미확인"}
                </span>
              )}
            </div>
            <strong>{note.title}</strong>
            <small className="guide-close-muted">
              {formatGuideDepartureDate(departure.departureDate)} {note.occurredAt} · {vehicleName} · 작성{" "}
              {note.createdBy}
            </small>
          </div>
          <div className="guide-notes-detail-block">
            <span>가이드 원본 기록 (관리자 화면에서 수정하지 않음)</span>
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
            <span>관리자 후속조치 {followUps.length}건</span>
            {followUps.length === 0 ? (
              <p className="guide-sheet-note">등록된 후속조치가 없습니다.</p>
            ) : (
              <ul className="guide-close-modal-list">
                {followUps.map((item) => (
                  <li key={item.id}>
                    <span className={`badge ${GUIDE_FOLLOW_UP_STATUS_BADGE[item.status]}`}>{item.status}</span>
                    <strong>
                      [{item.type}] {item.content}
                    </strong>
                    <span className="guide-close-muted">{getGuideReviewAssigneeName(item.assigneeId)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="guide-notes-detail-block">
            <span>처리 이력</span>
            <ReviewTimeline entries={timeline} />
          </div>
          {important && !confirmed && !reviewed && (
            <p className="ops-assign-notice is-warn" role="note">
              <ShieldAlert size={16} aria-hidden="true" />
              <span>
                <b>중요 이슈입니다.</b>
                <small>내용을 확인한 뒤 [중요 이슈 확인완료]를 눌러야 관리자 확인완료를 진행할 수 있습니다.</small>
              </span>
            </p>
          )}
        </div>
        <div className="modal-actions guide-notes-detail-actions">
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="secondary" onClick={onFollowUp}>
            <Plus size={14} aria-hidden="true" />
            후속조치 등록
          </button>
          {important && !confirmed && !reviewed && (
            <button type="button" className="primary" onClick={onConfirm}>
              <CheckCircle2 size={14} aria-hidden="true" />
              중요 이슈 확인완료
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewTimeline({ entries }: { entries: ReturnType<typeof buildGuideNoteTimeline> }) {
  return (
    <ol className="guide-review-timeline">
      {entries.map((entry) => (
        <li key={entry.id} className={entry.source === "guide" ? "is-guide" : "is-admin"}>
          <span className="guide-review-timeline-at">{entry.at}</span>
          <span className="guide-review-timeline-body">
            <b>
              {entry.by} · {entry.source === "guide" ? "가이드" : "관리자"} {entry.label}
            </b>
            <span>{entry.text}</span>
          </span>
          {entry.status && (
            <span className={`badge ${GUIDE_FOLLOW_UP_STATUS_BADGE[entry.status]}`}>{entry.status}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------- 후속조치 */

function FollowUpCard({
  item,
  note,
  onStatus,
  onLog,
  onEdit,
  onNote,
}: {
  item: GuideFollowUp;
  note: GuideNote | null;
  onStatus: (status: GuideFollowUpStatus) => void;
  onLog: (text: string) => void;
  onEdit: () => void;
  onNote: (id: string) => void;
}) {
  const [logText, setLogText] = useState("");
  const due = getGuideFollowUpDue(item);
  const statusId = `guide-review-fu-status-${item.id}`;
  const logId = `guide-review-fu-log-${item.id}`;

  const submitLog = () => {
    const text = logText.trim();
    if (!text) return;
    onLog(text);
    setLogText("");
  };

  return (
    <li className={`guide-review-follow is-${item.status === "처리완료" ? "done" : "open"}`}>
      <header>
        <span className="guide-notes-cat">{item.type}</span>
        <span className={`badge ${GUIDE_FOLLOW_UP_STATUS_BADGE[item.status]}`}>{item.status}</span>
        {due && <span className={`badge ${due.badge}`}>{due.label}</span>}
        <strong>{item.content}</strong>
      </header>
      <dl className="guide-review-follow-meta">
        <div>
          <dt>담당자</dt>
          <dd>{getGuideReviewAssigneeName(item.assigneeId)}</dd>
        </div>
        <div>
          <dt>처리기한</dt>
          <dd>{item.dueDate || "미설정"}</dd>
        </div>
        <div>
          <dt>관련 기록</dt>
          <dd>
            {note ? (
              <button type="button" onClick={() => onNote(note.id)}>
                {note.title}
              </button>
            ) : (
              "여행 전체"
            )}
          </dd>
        </div>
        <div>
          <dt>등록</dt>
          <dd>
            {formatGuideReviewTime(item.createdAt)} · {item.createdBy}
          </dd>
        </div>
      </dl>
      {item.memo && <p className="guide-review-follow-memo">메모: {item.memo}</p>}
      <ol className="guide-review-timeline is-compact">
        {item.logs.map((log) => (
          <li key={log.id} className="is-admin">
            <span className="guide-review-timeline-at">{formatGuideReviewTime(log.at)}</span>
            <span className="guide-review-timeline-body">
              <b>{log.by}</b>
              <span>{log.text}</span>
            </span>
            {log.status && <span className={`badge ${GUIDE_FOLLOW_UP_STATUS_BADGE[log.status]}`}>{log.status}</span>}
          </li>
        ))}
      </ol>
      <div className="guide-review-follow-controls">
        <label htmlFor={statusId}>
          상태
          <select
            id={statusId}
            value={item.status}
            onChange={(event) => onStatus(event.target.value as GuideFollowUpStatus)}
          >
            {GUIDE_FOLLOW_UP_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={logId} className="guide-review-follow-log">
          처리내용 기록
          <span>
            <input
              id={logId}
              value={logText}
              maxLength={300}
              placeholder="예: 차량업체 확인 결과 에어컨 냉매 문제 확인. 정비 완료 예정."
              onChange={(event) => setLogText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) submitLog();
              }}
            />
            <button type="button" className="secondary" disabled={!logText.trim()} onClick={submitLog}>
              기록 추가
            </button>
          </span>
        </label>
        <button type="button" className="secondary" onClick={onEdit}>
          수정
        </button>
      </div>
    </li>
  );
}

function FollowUpModal({
  draft: initial,
  editing,
  notes,
  onCancel,
  onSave,
}: {
  draft: GuideFollowUpDraft;
  editing: boolean;
  notes: GuideNote[];
  onCancel: () => void;
  onSave: (draft: GuideFollowUpDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState(false);
  const contentError = touched && !draft.content.trim();
  const update = <K extends keyof GuideFollowUpDraft>(key: K, value: GuideFollowUpDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = () => {
    setTouched(true);
    if (!draft.content.trim()) return;
    onSave({ ...draft, content: draft.content.trim(), memo: draft.memo.trim() });
  };

  return (
    <div className="modal-backdrop guide-sheet-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal guide-sheet-modal guide-notes-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-review-fu-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="guide-review-fu-title">{editing ? "후속조치 수정" : "후속조치 등록"}</h3>
          <button type="button" aria-label="닫기" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <div className="guide-sheet-body">
          <label className="guide-sheet-field" htmlFor="guide-review-fu-note">
            <span>관련 운영기록</span>
            <select
              id="guide-review-fu-note"
              value={draft.noteId}
              onChange={(event) => update("noteId", event.target.value)}
            >
              <option value="">여행 전체 (특정 기록 없음)</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>
                  [{note.importance}] {note.category} · {note.title}
                </option>
              ))}
            </select>
          </label>
          <div className="guide-notes-form-grid">
            <label className="guide-sheet-field" htmlFor="guide-review-fu-type">
              <span>조치유형</span>
              <select
                id="guide-review-fu-type"
                value={draft.type}
                onChange={(event) => update("type", event.target.value as GuideFollowUpDraft["type"])}
              >
                {GUIDE_FOLLOW_UP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="guide-sheet-field" htmlFor="guide-review-fu-assignee">
              <span>담당자</span>
              <select
                id="guide-review-fu-assignee"
                value={draft.assigneeId}
                onChange={(event) => update("assigneeId", event.target.value)}
              >
                {GUIDE_REVIEW_ASSIGNEES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.group}
                  </option>
                ))}
              </select>
            </label>
            <label className="guide-sheet-field" htmlFor="guide-review-fu-due">
              <span>처리기한 (선택)</span>
              <input
                id="guide-review-fu-due"
                type="date"
                value={draft.dueDate}
                min={TEST_REFERENCE_DATE}
                onChange={(event) => update("dueDate", event.target.value)}
              />
            </label>
            <label className="guide-sheet-field" htmlFor="guide-review-fu-status">
              <span>상태</span>
              <select
                id="guide-review-fu-status"
                value={draft.status}
                onChange={(event) => update("status", event.target.value as GuideFollowUpStatus)}
              >
                {GUIDE_FOLLOW_UP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="guide-sheet-field" htmlFor="guide-review-fu-content">
            <span>
              처리내용 <em>*</em>
            </span>
            <textarea
              id="guide-review-fu-content"
              rows={3}
              maxLength={500}
              value={draft.content}
              aria-invalid={contentError}
              placeholder="예: 1호차 에어컨 이상 여부 차량업체 확인"
              onChange={(event) => update("content", event.target.value)}
            />
            {contentError ? (
              <small className="is-error">처리내용을 입력해 주세요.</small>
            ) : (
              <small>무엇을 확인 · 처리해야 하는지 적어 주세요.</small>
            )}
          </label>
          <label className="guide-sheet-field" htmlFor="guide-review-fu-memo">
            <span>메모 (선택)</span>
            <input
              id="guide-review-fu-memo"
              value={draft.memo}
              maxLength={200}
              onChange={(event) => update("memo", event.target.value)}
            />
          </label>
          {draft.type === "환불/보상 검토" && (
            <p className="guide-sheet-note">
              환불 · 보상은 이 화면에서 처리하지 않습니다. 검토 필요 업무로만 기록됩니다.
            </p>
          )}
          <p className="guide-sheet-note">
            가이드 원본 운영기록은 변경되지 않습니다. 담당자 알림은 발송되지 않습니다. (SAMPLE)
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            취소
          </button>
          <button type="button" className="primary" onClick={submit}>
            {editing ? "수정 저장" : "후속조치 등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
