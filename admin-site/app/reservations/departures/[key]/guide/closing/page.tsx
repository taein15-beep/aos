"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Lock } from "lucide-react";
import Link from "next/link";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { getGuideReviewPath } from "@/lib/admin/guide-review-data";
import { GuideOperationPhaseBadge } from "@/components/guide/GuideOperationPhaseBadge";
import {
  BoardingResult,
  ChatResult,
  ClosingSection,
  MemoField,
  NoticeResult,
  NotesResult,
  PointResults,
  ScheduleResult,
  SheetModal,
  VehicleResults,
} from "@/components/guide/GuideClosingReportParts";
import {
  formatGuideDepartureDate,
  getGuideCustomersPath,
  getGuideLeadStaff,
  getGuideOperationPath,
  getGuideStaff,
  type GuideDeparture,
} from "@/lib/admin/guide-operation-data";
import { getGuideCommunicationPath } from "@/lib/admin/guide-communication-data";
import { getGuideChatRoomPath } from "@/lib/admin/guide-chatroom-data";
import { getGuideSchedulePath } from "@/lib/admin/guide-schedule-data";
import { GUIDE_NOTE_IMPORTANCE_META, GUIDE_NOTE_STATUS_BADGE, getGuideNotesPath } from "@/lib/admin/guide-notes-data";
import {
  GUIDE_ADMIN_REVIEW_BADGE,
  GUIDE_CLOSING_CHECKS,
  GUIDE_CLOSING_STATUS_BADGE,
  GUIDE_VEHICLE_OPERATION_BADGE,
  buildGuideClosingReport,
  buildGuideClosingSnapshot,
  completeGuideScheduleSample,
  countGuideClosingChecks,
  formatGuideClosingNow,
  getGuideClosingBlockers,
  getGuideClosingState,
  getGuideClosingStatus,
  isGuideClosingChecked,
  saveGuideClosingState,
  type GuideClosingCheckKey,
  type GuideClosingReport,
  type GuideClosingState,
} from "@/lib/admin/guide-closing-data";
import { getOperationDeparture } from "@/lib/admin/operation-assignment-data";

const UNRESOLVED_PREVIEW_LIMIT = 5;

type ClosingModal = "unresolved" | "confirm" | "done" | null;

export default function GuideClosingPage() {
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
          <strong>운영결과 보고</strong>
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
            <button type="button" className="secondary" onClick={() => router.push("/reservations/guide-operations")}>
              <ArrowLeft size={15} />
              가이드 운영 목록으로
            </button>
          </section>
        </main>
      ) : (
        <GuideClosingBody key={departure.key} departure={departure} onNotify={notify} />
      )}
    </ProductAdminShell>
  );
}

function GuideClosingBody({ departure, onNotify }: { departure: GuideDeparture; onNotify: (message: string) => void }) {
  const router = useRouter();
  const [state, setState] = useState<GuideClosingState>(() => getGuideClosingState(departure.key));
  const [, setRevision] = useState(0);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [modal, setModal] = useState<ClosingModal>(null);

  const report = buildGuideClosingReport(departure);
  const leadStaff = getGuideLeadStaff(departure);
  const status = getGuideClosingStatus(state, report);
  const closed = Boolean(state.closedAt);
  const blockers = getGuideClosingBlockers(report);
  const checkedCount = countGuideClosingChecks(state);
  const checked = isGuideClosingChecked(state);
  const canClose = !closed && checked && blockers.length === 0;
  const disabledReason = blockers[0] ?? (!checked ? `필수 확인 ${checkedCount} / ${GUIDE_CLOSING_CHECKS.length}` : "");
  const { boarding, schedule, notes } = report;
  const unresolvedCount = notes.unresolved.length;

  const commit = (next: GuideClosingState) => {
    setState(next);
    saveGuideClosingState(departure.key, next);
  };

  const toggleSection = (id: string) =>
    setOpenSections((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const toggleCheck = (key: GuideClosingCheckKey) =>
    commit({ ...state, checks: { ...state.checks, [key]: !state.checks[key] } });

  const requestClose = () => {
    if (!canClose) return;
    setModal(unresolvedCount > 0 ? "unresolved" : "confirm");
  };

  const confirmClose = () => {
    commit({
      ...state,
      prepared: true,
      closedAt: formatGuideClosingNow(),
      closedBy: leadStaff?.name ?? departure.guideName,
      adminReview: "관리자 확인대기",
      snapshot: buildGuideClosingSnapshot(report),
    });
    setModal("done");
    onNotify("운영 종료 인계가 완료되었습니다. (SAMPLE · 관리자 확인대기)");
  };

  const applyScheduleSample = () => {
    completeGuideScheduleSample(departure);
    setRevision((value) => value + 1);
    onNotify("SAMPLE · 남은 일정을 예정시간 기준으로 완료 처리했습니다.");
  };

  const firstIncompleteVehicle = schedule.incomplete[0]?.vehicle.id;
  const goCustomers = () => router.push(getGuideCustomersPath(departure.key, "unchecked"));
  const goSchedule = () => router.push(getGuideSchedulePath(departure.key, firstIncompleteVehicle));
  const goMain = () => router.push(getGuideOperationPath(departure.key));

  const kpis = [
    { key: "people", label: "예약인원", value: `${report.people}명`, tone: "", mobile: true },
    {
      key: "boarded",
      label: "실제 탑승",
      value: `${boarding.boarded}명`,
      tone: boarding.unchecked > 0 ? "is-pending" : "is-success",
      mobile: true,
    },
    {
      key: "noshow",
      label: "미탑승",
      value: `${boarding.noShow}명`,
      tone: boarding.noShow ? "is-danger" : "is-muted",
      mobile: true,
    },
    { key: "vehicles", label: "운영 호차", value: `${departure.vehicles.length}대`, tone: "is-muted" },
    {
      key: "schedule",
      label: "완료 일정",
      value: `${schedule.done} / ${schedule.total}`,
      tone: schedule.done >= schedule.total ? "is-success" : "is-warn",
    },
    { key: "notes", label: "운영기록", value: `${notes.summary.total}건`, tone: "is-muted" },
    {
      key: "check",
      label: "확인필요",
      value: `${notes.summary.check}건`,
      tone: notes.summary.check ? "is-warn" : "is-success",
    },
  ];

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

  return (
    <>
      <main
        className={`content member-web-detail-content guide-ops-content guide-close-content ${closed ? "is-closed" : ""}`}
      >
        <section className="panel guide-ops-hero" aria-labelledby="guide-close-title">
          <div className="guide-ops-hero-main">
            <p className="member-web-breadcrumb">예약관리 &gt; 가이드 운영 &gt; 운영결과 보고</p>
            <div className="guide-ops-hero-status">
              <span className={`badge ${GUIDE_CLOSING_STATUS_BADGE[status]}`}>{status}</span>
              {state.adminReview && (
                <span className={`badge ${GUIDE_ADMIN_REVIEW_BADGE[state.adminReview]}`}>{state.adminReview}</span>
              )}
              {closed && (
                <span className="badge gray guide-close-readonly">
                  <Lock size={11} aria-hidden="true" />
                  읽기전용
                </span>
              )}
              <span className="guide-ops-code">{departure.productCode}</span>
            </div>
            <h1 id="guide-close-title">{departure.productName}</h1>
            <dl className="guide-ops-hero-meta">
              <div className="is-date">
                <dt>출발일</dt>
                <dd>{formatGuideDepartureDate(departure.departureDate)}</dd>
              </div>
              <div>
                <dt>총 예약인원</dt>
                <dd>{report.people}명</dd>
              </div>
              <div>
                <dt>운영차량</dt>
                <dd>{departure.vehicles.length}대</dd>
              </div>
              <div>
                <dt>총괄가이드</dt>
                <dd>{leadStaff?.name ?? departure.guideName}</dd>
              </div>
              <div>
                <dt>운영상태</dt>
                <dd>{status}</dd>
              </div>
            </dl>
          </div>
          <div className="guide-ops-hero-actions">
            <button type="button" className="secondary" onClick={goMain}>
              <ArrowLeft size={15} />
              가이드 운영 메인
            </button>
          </div>
        </section>

        {closed ? (
          <p className="ops-assign-notice is-success guide-close-banner" role="status">
            <Lock size={16} aria-hidden="true" />
            <span>
              <b>운영종료 · 읽기전용</b>
              <small>
                {state.closedAt} {state.closedBy} 종료처리 · {state.adminReview}. 운영결과는 관리자에게 인계되었으며,
                운영 재오픈은 향후 관리자 권한으로 제공됩니다.
              </small>
            </span>
          </p>
        ) : status === "운영중" ? (
          <p className="ops-assign-notice is-warn guide-close-banner" role="note">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              <b>여행이 아직 운영중입니다.</b>
              <small>
                미완료 일정 {schedule.incomplete.length}건이 있습니다. 여행이 끝나면 운영종료 준비를 시작하고 운영결과를
                확인해 주세요.
              </small>
            </span>
            <button type="button" className="secondary" onClick={() => commit({ ...state, prepared: true })}>
              운영종료 준비 시작
            </button>
          </p>
        ) : null}

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
        <p className="guide-close-kpi-note">
          예약인원은 변경하지 않습니다. 예약인원 {report.people}명 = 실제 탑승 {boarding.boarded}명 + 미탑승{" "}
          {boarding.noShow}명{boarding.unchecked ? ` + 탑승 미확인 ${boarding.unchecked}명` : ""} (출발 탑승 구간 기준)
        </p>

        <div className="guide-close-layout">
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
                  <dt>출발회차 상태</dt>
                  <dd>
                    <GuideOperationPhaseBadge departure={departure} closing={state} />
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
                  <dt>운영인계</dt>
                  <dd>{departure.handover ? `${departure.handover.at} · ${departure.handover.by}` : "-"}</dd>
                </div>
                <div>
                  <dt>운영상태</dt>
                  <dd>
                    <span className={`badge ${GUIDE_CLOSING_STATUS_BADGE[status]}`}>{status}</span>
                  </dd>
                </div>
              </dl>,
            )}

            {section(
              "boarding",
              "2. 탑승결과",
              `탑승 ${boarding.boarded} · 미탑승 ${boarding.noShow}${boarding.unchecked ? ` · 미확인 ${boarding.unchecked}` : ""}`,
              <BoardingResult report={report} closed={closed} onCustomers={goCustomers} />,
              boarding.unchecked ? "is-danger" : "",
            )}

            {section(
              "vehicles",
              "3. 호차별 운영결과",
              report.vehicles.map((item) => `${item.vehicle.name} ${item.status}`).join(" · ") || "-",
              <VehicleResults report={report} />,
            )}

            {section(
              "points",
              "4. 탑승지별 결과",
              `${report.vehicles.reduce((sum, item) => sum + item.points.length, 0)}개 탑승지`,
              <PointResults report={report} />,
            )}

            {section(
              "schedule",
              "5. 일정 운영결과",
              `완료 ${schedule.done} / ${schedule.total} · 지연 ${schedule.delayed}`,
              <ScheduleResult report={report} />,
              schedule.incomplete.length ? "is-warn" : "",
            )}

            {section(
              "notices",
              "6. 고객 안내",
              `발송 ${report.notices.sends}회 · 성공 ${report.notices.success} · 실패 ${report.notices.failed}`,
              <NoticeResult report={report} onOpen={() => router.push(getGuideCommunicationPath(departure.key))} />,
            )}

            {section(
              "chat",
              "7. 카카오 안내방",
              report.chat.modeLabel,
              <ChatResult report={report} onOpen={() => router.push(getGuideChatRoomPath(departure.key))} />,
            )}

            {section(
              "notes",
              "8. 운영기록 · 특이사항",
              `전체 ${notes.summary.total}건 · 확인필요 ${notes.summary.check} · 중요 ${notes.summary.important}`,
              <NotesResult report={report} onOpen={() => router.push(getGuideNotesPath(departure.key))} />,
              notes.summary.important || notes.summary.check ? "is-warn" : "",
            )}

            {section(
              "unresolved",
              "9. 미처리사항",
              `${unresolvedCount}건`,
              <UnresolvedList
                report={report}
                onOpen={(id) => router.push(getGuideNotesPath(departure.key, { note: id }))}
              />,
              unresolvedCount ? "is-warn" : "",
            )}

            {section(
              "memo",
              "10. 가이드 최종 운영메모",
              state.finalMemo ? "작성됨" : "선택 입력",
              <MemoField
                id="guide-close-final-memo-input"
                label="가이드 최종 운영메모 (선택)"
                value={state.finalMemo}
                readOnly={closed}
                placeholder={
                  "예: 전체 일정은 큰 문제 없이 진행되었습니다.\n장금이파크에서 고객 집결이 늦어 20분 지연되었으며 이후 일정 조정으로 정상 마무리했습니다."
                }
                hint="여행 전체 운영에 대한 가이드 의견입니다. 고객에게 발송되지 않습니다."
                onChange={(finalMemo) => commit({ ...state, finalMemo })}
              />,
            )}

            {section(
              "admin-note",
              "11. 관리자 전달사항",
              state.adminNote ? "작성됨" : "선택 입력",
              <MemoField
                id="guide-close-admin-note-input"
                label="관리자 전달사항 (후속조치 필요 내용)"
                value={state.adminNote}
                readOnly={closed}
                placeholder={"예:\n- 1호차 에어컨 차량업체 확인 필요\n- 분실물 1건 사무실 전달 예정"}
                hint="관리자가 후속조치해야 할 내용만 적어 주세요. 최종 운영메모와 별도로 인계됩니다."
                onChange={(adminNote) => commit({ ...state, adminNote })}
              />,
            )}
          </div>

          <aside className="panel guide-close-side" aria-labelledby="guide-close-side-title">
            <h2 id="guide-close-side-title">
              <ClipboardCheck size={17} aria-hidden="true" />
              운영 종료 인계
            </h2>
            {closed ? (
              <ClosedSummary state={state} reviewHref={getGuideReviewPath(departure.key)} />
            ) : (
              <>
                <ValidationList
                  report={report}
                  onCustomers={goCustomers}
                  onSchedule={goSchedule}
                  onScheduleSample={applyScheduleSample}
                />
                <fieldset className="guide-close-checks">
                  <legend>
                    필수 확인{" "}
                    <b>
                      {checkedCount} / {GUIDE_CLOSING_CHECKS.length}
                    </b>
                  </legend>
                  {GUIDE_CLOSING_CHECKS.map((item) => (
                    <label key={item.key} className={state.checks[item.key] ? "is-checked" : ""}>
                      <input
                        type="checkbox"
                        checked={Boolean(state.checks[item.key])}
                        onChange={() => toggleCheck(item.key)}
                      />
                      <span>
                        <b>{item.label}</b>
                        <small>{item.description}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
              </>
            )}
            <div className="guide-close-vehicles">
              <span>호차별 담당가이드 운영상태</span>
              <ul>
                {report.vehicles.map((item) => (
                  <li key={item.vehicle.id}>
                    <b>{item.vehicle.name}</b>
                    <span>{item.guide?.name ?? "미배정"}</span>
                    <span className={`badge ${GUIDE_VEHICLE_OPERATION_BADGE[item.status]}`}>{item.status}</span>
                  </li>
                ))}
              </ul>
            </div>
            {!closed && (
              <div className="guide-close-action">
                <button type="button" className="primary" disabled={!canClose} onClick={requestClose}>
                  운영 종료 인계
                </button>
                {disabledReason ? (
                  <small className="is-blocked">
                    <AlertTriangle size={12} aria-hidden="true" /> {disabledReason}
                  </small>
                ) : unresolvedCount ? (
                  <small>미처리 {unresolvedCount}건은 관리자에게 미처리 상태로 인계됩니다.</small>
                ) : null}
                <small>최종 인계는 총괄가이드 또는 운영관리자가 진행합니다. (권한 확인 미구현 · SAMPLE)</small>
              </div>
            )}
          </aside>
        </div>

        {!closed && (
          <div className="guide-close-sticky">
            <span className="guide-close-sticky-info">
              <strong>
                필수확인 {checkedCount} / {GUIDE_CLOSING_CHECKS.length} · 미처리 {unresolvedCount}건
              </strong>
              {disabledReason && <small>{disabledReason}</small>}
            </span>
            <button type="button" className="primary" disabled={!canClose} onClick={requestClose}>
              운영 종료 인계
            </button>
          </div>
        )}
      </main>

      {modal === "unresolved" && (
        <SheetModal title="미처리 특이사항 확인" onClose={() => setModal(null)}>
          <div className="guide-sheet-body">
            <p className="ops-assign-notice is-warn" role="note">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <b>처리가 완료되지 않은 특이사항이 {unresolvedCount}건 있습니다.</b>
                <small>운영을 종료하면 해당 내용은 관리자에게 미처리 상태로 인계됩니다.</small>
              </span>
            </p>
            <ul className="guide-close-modal-list">
              {notes.unresolved.slice(0, UNRESOLVED_PREVIEW_LIMIT).map((note) => (
                <li key={note.id}>
                  <span className={`badge ${GUIDE_NOTE_IMPORTANCE_META[note.importance].badge}`}>
                    {note.importance}
                  </span>
                  <strong>{note.title}</strong>
                  <span className={`badge ${GUIDE_NOTE_STATUS_BADGE[note.status]}`}>{note.status}</span>
                </li>
              ))}
              {unresolvedCount > UNRESOLVED_PREVIEW_LIMIT && <li>외 {unresolvedCount - UNRESOLVED_PREVIEW_LIMIT}건</li>}
            </ul>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={() => setModal(null)}>
              취소
            </button>
            <button type="button" className="primary" onClick={() => setModal("confirm")}>
              미처리 포함 운영종료
            </button>
          </div>
        </SheetModal>
      )}

      {modal === "confirm" && (
        <SheetModal title="여행 운영을 종료하시겠습니까?" onClose={() => setModal(null)}>
          <div className="guide-sheet-body">
            <p className="guide-close-modal-product">
              <strong>{departure.productName}</strong>
              <span>{formatGuideDepartureDate(departure.departureDate)}</span>
            </p>
            <dl className="guide-sheet-summary">
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
                <dt>완료 일정</dt>
                <dd>
                  {schedule.done} / {schedule.total}
                </dd>
              </div>
              <div>
                <dt>운영기록</dt>
                <dd>{notes.summary.total}건</dd>
              </div>
              <div>
                <dt>미처리</dt>
                <dd>{unresolvedCount}건</dd>
              </div>
            </dl>
            <ul className="guide-close-verify">
              <li className="is-ok">
                <CheckCircle2 size={14} aria-hidden="true" /> 탑승 미확인 0명
              </li>
              <li className="is-ok">
                <CheckCircle2 size={14} aria-hidden="true" /> 미완료 일정 0건
              </li>
              <li className={notes.summary.check ? "is-warn" : "is-ok"}>
                확인필요 기록 {notes.summary.check}건 · 중요 기록 {notes.summary.important}건
              </li>
              <li className={unresolvedCount ? "is-warn" : "is-ok"}>미처리 기록 {unresolvedCount}건</li>
            </ul>
            <p className="guide-sheet-note">
              운영 종료 후 관리자에게 운영결과가 인계되며, 이 화면은 읽기전용으로 전환됩니다.
            </p>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={() => setModal(null)}>
              취소
            </button>
            <button type="button" className="primary" onClick={confirmClose}>
              운영 종료 인계
            </button>
          </div>
        </SheetModal>
      )}

      {modal === "done" && (
        <SheetModal title="운영 종료 인계 완료" onClose={() => setModal(null)}>
          <div className="guide-sheet-body guide-close-done">
            <CheckCircle2 size={36} aria-hidden="true" />
            <strong>운영 종료 인계가 완료되었습니다.</strong>
            <dl className="guide-close-dl">
              <div>
                <dt>상품</dt>
                <dd>{departure.productName}</dd>
              </div>
              <div>
                <dt>출발일</dt>
                <dd>{formatGuideDepartureDate(departure.departureDate)}</dd>
              </div>
              <div>
                <dt>종료처리</dt>
                <dd>
                  {state.closedBy} · {state.closedAt}
                </dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>
                  <span className="badge info">{state.adminReview}</span>
                </dd>
              </div>
            </dl>
            <p className="guide-sheet-note">현재 프로토타입에서는 새로고침 시 초기화됩니다.</p>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={goMain}>
              가이드 운영 메인
            </button>
            <button type="button" className="primary" onClick={() => setModal(null)}>
              운영결과 보기
            </button>
          </div>
        </SheetModal>
      )}
    </>
  );
}

function UnresolvedList({ report, onOpen }: { report: GuideClosingReport; onOpen: (id: string) => void }) {
  const { unresolved } = report.notes;
  if (unresolved.length === 0) return <p className="guide-sheet-note">처리가 끝나지 않은 운영기록이 없습니다.</p>;
  const vehicleName = (id: string) =>
    report.vehicles.find((item) => item.vehicle.id === id)?.vehicle.name ?? (id === "all" ? "전체" : "-");
  return (
    <div className="guide-close-stack">
      <ul className="guide-close-unresolved">
        {unresolved.map((note) => (
          <li key={note.id}>
            <button type="button" onClick={() => onOpen(note.id)}>
              <span className={`badge ${GUIDE_NOTE_IMPORTANCE_META[note.importance].badge}`}>{note.importance}</span>
              <strong>{note.title}</strong>
              <span className="guide-close-muted">
                {note.category} · {vehicleName(note.vehicleId)} · {note.occurredAt}
                {note.category === "분실물" && note.detail.lostState ? ` · ${note.detail.lostState}` : ""}
              </span>
              <span className={`badge ${GUIDE_NOTE_STATUS_BADGE[note.status]}`}>{note.status}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="guide-sheet-note">
        미처리사항이 있어도 운영 종료는 가능합니다. 종료 시 관리자에게 미처리 상태로 인계됩니다.
      </p>
    </div>
  );
}

function ValidationList({
  report,
  onCustomers,
  onSchedule,
  onScheduleSample,
}: {
  report: GuideClosingReport;
  onCustomers: () => void;
  onSchedule: () => void;
  onScheduleSample: () => void;
}) {
  const { unchecked, schedule, notes } = report;
  const unresolved = notes.unresolved.length;
  return (
    <div className="guide-close-validate">
      <span>운영 종료 전 검증</span>
      <ul>
        <li className={unchecked.length ? "is-blocked" : "is-ok"}>
          <span>
            <b>탑승상태 미확인</b>
            <em>{unchecked.length ? `${unchecked.length}명 · 종료 불가` : "0명 · 확인완료"}</em>
          </span>
          {unchecked.length > 0 && (
            <button type="button" className="secondary" onClick={onCustomers}>
              고객 확인
            </button>
          )}
        </li>
        <li className={schedule.incomplete.length ? "is-blocked" : "is-ok"}>
          <span>
            <b>미완료 일정</b>
            <em>{schedule.incomplete.length ? `${schedule.incomplete.length}건 · 종료 불가` : "0건 · 완료"}</em>
            {schedule.incomplete.length > 0 && (
              <small>
                {schedule.incomplete
                  .slice(0, 3)
                  .map((entry) => `${entry.vehicle.name} ${entry.item.title} ${entry.label}`)
                  .join(" · ")}
                {schedule.incomplete.length > 3 ? ` 외 ${schedule.incomplete.length - 3}건` : ""}
              </small>
            )}
          </span>
          {schedule.incomplete.length > 0 && (
            <span className="guide-close-validate-actions">
              <button type="button" className="secondary" onClick={onSchedule}>
                일정 확인
              </button>
              <button type="button" className="guide-close-sample" onClick={onScheduleSample}>
                SAMPLE 남은 일정 완료
              </button>
            </span>
          )}
        </li>
        <li className={notes.summary.check ? "is-warn" : "is-ok"}>
          <span>
            <b>확인필요 기록</b>
            <em>{notes.summary.check}건</em>
          </span>
        </li>
        <li className={notes.summary.important ? "is-warn" : "is-ok"}>
          <span>
            <b>중요 기록</b>
            <em>{notes.summary.important}건</em>
          </span>
        </li>
        <li className={unresolved ? "is-warn" : "is-ok"}>
          <span>
            <b>미처리 기록</b>
            <em>{unresolved ? `${unresolved}건 · 경고 후 종료 가능` : "0건"}</em>
          </span>
        </li>
      </ul>
    </div>
  );
}

function ClosedSummary({ state, reviewHref }: { state: GuideClosingState; reviewHref: string }) {
  const snapshot = state.snapshot;
  return (
    <div className="guide-close-stack">
      <p className="guide-close-closed">
        <CheckCircle2 size={16} aria-hidden="true" />
        <span>
          <b>운영 종료 인계 완료</b>
          <small>
            {state.closedAt} · {state.closedBy}
          </small>
        </span>
      </p>
      <dl className="guide-close-dl is-compact">
        <div>
          <dt>운영상태</dt>
          <dd>운영종료</dd>
        </div>
        <div>
          <dt>관리자 확인</dt>
          <dd>{state.adminReview}</dd>
        </div>
        {snapshot && (
          <>
            <div>
              <dt>종료 시점 탑승</dt>
              <dd>
                예약 {snapshot.people} · 탑승 {snapshot.boarded} · 미탑승 {snapshot.noShow}
              </dd>
            </div>
            <div>
              <dt>종료 시점 일정</dt>
              <dd>
                {snapshot.scheduleDone} / {snapshot.scheduleTotal} 완료
              </dd>
            </div>
            <div>
              <dt>종료 시점 기록</dt>
              <dd>
                {snapshot.notes}건 · 미처리 {snapshot.unresolved}건
              </dd>
            </div>
          </>
        )}
      </dl>
      <p className="guide-sheet-note">
        관리자 확인은 <Link href={reviewHref}>관리자 운영결과 확인</Link> 화면에서 진행합니다. 운영 재오픈은 향후 관리자
        권한으로 제공됩니다.
      </p>
    </div>
  );
}
