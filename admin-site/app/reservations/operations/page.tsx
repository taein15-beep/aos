"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import {
  GUIDE_ASSIGNMENT_STATUS_BADGE,
  TEST_REFERENCE_DATE,
  type GuideAssignmentStatus,
} from "@/lib/admin/guide-operation-data";
import {
  OPS_BOARD_ADVANCED_DEFAULT,
  OPS_BOARD_ATTENTION_LABEL,
  OPS_BOARD_PERIODS,
  OPS_BOARD_PREP_WINDOW,
  OPS_BOARD_QUICK_FILTERS,
  OPS_BOARD_STAGES,
  buildOpsBoardAttention,
  formatOpsBoardDate,
  getOpsBoardItems,
  getOpsBoardPeriodRange,
  getOpsDeparturePath,
  isInOpsBoardRange,
  isOpsBoardStatusFocus,
  matchesOpsBoardAdvanced,
  matchesOpsBoardFocus,
  matchesOpsBoardKeyword,
  sortOpsBoardItems,
  type OpsBoardAdvancedFilter,
  type OpsBoardFocus,
  type OpsBoardItem,
  type OpsBoardPeriod,
} from "@/lib/admin/operations-board-data";

type BoardView = "departure" | "guide";

const ATTENTION_PREVIEW = 6;
const ASSIGNMENT_STATUSES = Object.keys(GUIDE_ASSIGNMENT_STATUS_BADGE) as GuideAssignmentStatus[];

const stopRow = (event: MouseEvent) => event.stopPropagation();

function nowLabel() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/* ---------------------------------------------------------------- 셀 표시 */

function StageBadges({ item }: { item: OpsBoardItem }) {
  if (item.stale) return <span className="badge gray">운영기록 없음</span>;
  const stage = OPS_BOARD_STAGES.find((value) => value.key === item.stage);
  return (
    <span className="ops-board-badges">
      <span className={`badge ${stage?.badge ?? "gray"}`}>{item.phase}</span>
      {item.adminReview && <span className={`badge ${item.adminReviewBadge}`}>{item.adminReview}</span>}
    </span>
  );
}

function PrepProgress({ item, compact = false }: { item: OpsBoardItem; compact?: boolean }) {
  const missing = item.prep.filter((prep) => !prep.ok);
  const imminent = item.prepNeeded && item.dday >= 0 && item.dday <= 1;
  return (
    <div className="ops-board-prep">
      <div className="ops-board-prep-head">
        <strong>
          {item.prepDone} / {item.prep.length} 완료
        </strong>
        <small>{item.prepRate}%</small>
      </div>
      <progress className="ops-board-progress" max={100} value={item.prepRate} aria-label="운영준비 진행률" />
      {!compact && item.prepNeeded && missing.length > 0 && (
        <div className="ops-board-chips">
          {missing.map((prep) => (
            <span key={prep.key} className="ops-board-chip is-warn">
              {prep.need}
            </span>
          ))}
        </div>
      )}
      {!compact && imminent && (
        <p className="ops-board-imminent">
          <span className="badge danger">출발 {item.ddayLabel}</span>
          <AlertTriangle size={13} aria-hidden="true" /> 운영준비 미완료
        </p>
      )}
    </div>
  );
}

function FollowUpCell({ item }: { item: OpsBoardItem }) {
  const { followUps } = item;
  if (followUps.total === 0) return <span className="ops-board-muted">없음</span>;
  if (followUps.open === 0) return <span className="badge success">{followUps.total}건 처리완료</span>;
  return (
    <span className="ops-board-stack">
      <span className="badge info">{followUps.open}건 진행중</span>
      {followUps.overdue > 0 && <span className="badge danger">{followUps.overdue}건 기한초과</span>}
    </span>
  );
}

function IssueCell({ item }: { item: OpsBoardItem }) {
  if (item.issues.length === 0) return <span className="ops-board-muted">없음</span>;
  const [first] = item.issues;
  return (
    <span className="ops-board-stack">
      <span className="badge danger">중요 {item.issues.length}건</span>
      <Link href={first.href} className="ops-board-link" onClick={stopRow}>
        {[first.vehicleName, first.title].filter(Boolean).join(" · ")}
      </Link>
    </span>
  );
}

function BoardingLine({ item }: { item: OpsBoardItem }) {
  const { boarding } = item;
  return (
    <span className="ops-board-boarding">
      <span>예약 {boarding.reserved}</span>
      <span>탑승 {boarding.boarded}</span>
      <span>미탑승 {boarding.noShow}</span>
      <span className={boarding.unchecked > 0 && item.stage === "live" ? "is-unchecked" : ""}>
        미확인 {boarding.unchecked}
      </span>
    </span>
  );
}

function LiveVehicles({ item }: { item: OpsBoardItem }) {
  if (item.stage !== "live") return null;
  return (
    <ul className="ops-board-live">
      {item.vehicles.map((vehicle) => (
        <li key={vehicle.id}>
          <b>{vehicle.name}</b>
          <span>{vehicle.current || "-"}</span>
          {vehicle.delayMinutes > 0 ? (
            <Link href={vehicle.scheduleHref} className="ops-board-chip is-danger" onClick={stopRow}>
              {vehicle.progressLabel}
            </Link>
          ) : (
            vehicle.progressLabel && <span className={`badge ${vehicle.progressBadge}`}>{vehicle.progressLabel}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function ActionLinks({ item }: { item: OpsBoardItem }) {
  return (
    <div className="ops-board-actions">
      {item.actions.map((action, index) => (
        <Link key={action.label} href={action.href} className={index === 0 ? "primary" : "secondary"} onClick={stopRow}>
          {action.label}
        </Link>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- 상세 패널 (읽기 전용) */

function DetailDrawer({ item, onClose }: { item: OpsBoardItem; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ops-board-drawer-layer">
      <button type="button" className="ops-board-drawer-backdrop" aria-label="상세 패널 닫기" onClick={onClose} />
      <aside className="ops-board-drawer" role="dialog" aria-modal="true" aria-labelledby="ops-board-drawer-title">
        <header className="ops-board-drawer-head">
          <div>
            <span className="ops-board-drawer-date">
              {formatOpsBoardDate(item.departureDate, true)} · {item.ddayLabel}
              {item.startTime ? ` · ${item.startTime} 출발` : ""}
            </span>
            <h2 id="ops-board-drawer-title">{item.productName}</h2>
            <small>{item.productCode}</small>
          </div>
          <button ref={closeRef} type="button" className="ops-board-drawer-close" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="ops-board-drawer-body">
          <section>
            <h3>현재 상태</h3>
            <dl className="ops-board-dl">
              <div>
                <dt>운영상태</dt>
                <dd>
                  <StageBadges item={item} />
                </dd>
              </div>
              <div>
                <dt>관리자 확인</dt>
                <dd>
                  {item.adminReview ? (
                    <span className={`badge ${item.adminReviewBadge}`}>{item.adminReview}</span>
                  ) : (
                    <span className="ops-board-muted">운영종료 후</span>
                  )}
                  {item.reviewedAt && <small className="ops-board-muted"> {item.reviewedAt}</small>}
                </dd>
              </div>
              <div>
                <dt>후속조치</dt>
                <dd>
                  <FollowUpCell item={item} />
                </dd>
              </div>
              <div>
                <dt>운영배정</dt>
                <dd>
                  <span className={`badge ${item.assignmentBadge}`}>{item.assignmentStatus}</span>
                </dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>인원 · 탑승</h3>
            <dl className="ops-board-dl">
              <div>
                <dt>예약</dt>
                <dd>
                  {item.people}명 · {item.reservationCount}건
                </dd>
              </div>
              <div>
                <dt>고객배정</dt>
                <dd className={item.customers.unassigned ? "is-warn" : ""}>
                  {item.customers.assigned} / {item.customers.total}
                  {item.customers.unassigned ? ` · ${item.customers.unassigned}명 미배정` : ""}
                </dd>
              </div>
              <div>
                <dt>탑승현황</dt>
                <dd>
                  <BoardingLine item={item} />
                </dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>운영준비</h3>
            <PrepProgress item={item} compact />
            <ul className="ops-board-checklist">
              {item.prep.map((prep) => (
                <li key={prep.key} className={prep.ok ? "is-ok" : "is-missing"}>
                  <span aria-hidden="true">{prep.ok ? "✓" : "!"}</span>
                  <b>{prep.label}</b>
                  <small>{prep.ok ? prep.detail : prep.need}</small>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>
              호차 · 가이드{" "}
              <small>
                가이드 {item.guides.assigned} / {item.guides.required}
              </small>
            </h3>
            {item.leadName && <p className="ops-board-muted">총괄가이드 {item.leadName}</p>}
            {item.vehicles.length === 0 ? (
              <p className="ops-board-muted">등록된 호차가 없습니다.</p>
            ) : (
              <ul className="ops-board-vehicle-list">
                {item.vehicles.map((vehicle) => (
                  <li key={vehicle.id}>
                    <b>{vehicle.name}</b>
                    <span className={vehicle.guideName ? "" : "is-warn"}>{vehicle.guideName || "가이드 미배정"}</span>
                    <span>
                      {vehicle.assigned} / {vehicle.capacity}석
                    </span>
                    <span className={vehicle.groupName ? "" : "is-warn"}>
                      {vehicle.groupName || "탑승지 그룹 미선택"}
                    </span>
                    {vehicle.progressLabel && (
                      <span className={`badge ${vehicle.progressBadge}`}>
                        {vehicle.current ? `${vehicle.current} · ` : ""}
                        {vehicle.progressLabel}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="ops-board-muted">탑승지 {item.boardingPoints.join(" → ") || "-"}</p>
          </section>
          <section>
            <h3>중요이슈 · 후속조치</h3>
            {item.issues.length === 0 ? (
              <p className="ops-board-muted">진행 중인 중요이슈가 없습니다.</p>
            ) : (
              <ul className="ops-board-issue-list">
                {item.issues.map((issue) => (
                  <li key={issue.id}>
                    <span className="badge danger">중요</span>
                    <Link href={issue.href}>{[issue.vehicleName, issue.title].filter(Boolean).join(" · ")}</Link>
                    <small>{issue.status}</small>
                  </li>
                ))}
              </ul>
            )}
            <p className="ops-board-muted">
              후속조치 전체 {item.followUps.total}건 · 진행중 {item.followUps.open}건 · 기한초과{" "}
              {item.followUps.overdue}건
            </p>
          </section>
          <p className="guide-sheet-note">조회 전용 패널입니다. 수정은 각 업무 화면에서 진행합니다.</p>
        </div>
        <footer className="ops-board-drawer-foot">
          <Link href={getOpsDeparturePath(item.key)} className="secondary">
            상세 운영보기
          </Link>
          <Link href={item.primaryAction.href} className="primary">
            {item.primaryAction.label}
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </footer>
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------- 페이지 */

export default function OperationsBoardPage() {
  const [items, setItems] = useState(() => getOpsBoardItems());
  const [refreshedAt, setRefreshedAt] = useState("");
  const [period, setPeriod] = useState<OpsBoardPeriod>("today");
  const [custom, setCustom] = useState(() => getOpsBoardPeriodRange("this-week", { from: "", to: "" }));
  const [focus, setFocus] = useState<OpsBoardFocus>("all");
  const [keyword, setKeyword] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advanced, setAdvanced] = useState<OpsBoardAdvancedFilter>(OPS_BOARD_ADVANCED_DEFAULT);
  const [view, setView] = useState<BoardView>("departure");
  const [attentionExpanded, setAttentionExpanded] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const notify = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const refresh = () => {
    setItems(getOpsBoardItems());
    const at = nowLabel();
    setRefreshedAt(at);
    notify(`운영현황을 다시 불러왔습니다. (${at} · SAMPLE 데이터)`);
  };

  const closeDrawer = useCallback(() => setSelectedKey(null), []);

  const range = getOpsBoardPeriodRange(period, custom);
  const scope = items.filter((item) => isInOpsBoardRange(item.departureDate, range));
  const active = items.filter((item) => !item.stale);
  const attention = useMemo(() => buildOpsBoardAttention(items), [items]);
  const guideOptions = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.guideNames))).sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const visible = sortOpsBoardItems(
    scope.filter(
      (item) =>
        matchesOpsBoardFocus(item, focus) &&
        matchesOpsBoardAdvanced(item, advanced) &&
        matchesOpsBoardKeyword(item, keyword),
    ),
  );
  const selected = items.find((item) => item.key === selectedKey) ?? null;
  const todayItems = items.filter((item) => item.dday === 0);

  const applyFocus = (next: OpsBoardFocus) => {
    if (next === "today" || next === "tomorrow") {
      setPeriod(next);
      setFocus("all");
      return;
    }
    const toggled = focus === next ? "all" : next;
    setFocus(toggled);
    if (toggled !== "all" && isOpsBoardStatusFocus(toggled) && !toggled.startsWith("stage:")) setPeriod("all");
  };

  const isFocusActive = (key: OpsBoardFocus) =>
    key === "today" || key === "tomorrow" ? period === key && focus === "all" : focus === key;

  const resetFilters = () => {
    setPeriod("today");
    setFocus("all");
    setKeyword("");
    setAdvanced(OPS_BOARD_ADVANCED_DEFAULT);
  };

  const updateAdvanced = <K extends keyof OpsBoardAdvancedFilter>(key: K, value: OpsBoardAdvancedFilter[K]) =>
    setAdvanced((prev) => ({ ...prev, [key]: value }));

  const kpis: { key: OpsBoardFocus; label: string; value: number; sub: string; tone: string }[] = [
    {
      key: "today",
      label: "오늘 출발",
      value: todayItems.length,
      sub: `운영중 ${todayItems.filter((item) => item.stage === "live").length}건`,
      tone: "is-pending",
    },
    {
      key: "prep-needed",
      label: "운영준비 필요",
      value: items.filter((item) => matchesOpsBoardFocus(item, "prep-needed")).length,
      sub: `출발 ${OPS_BOARD_PREP_WINDOW}일 이내`,
      tone: "is-warn",
    },
    {
      key: "live",
      label: "운영중",
      value: items.filter((item) => item.stage === "live").length,
      sub: `지연 호차 ${items.reduce((sum, item) => sum + item.delayedVehicles, 0)}대`,
      tone: "is-success",
    },
    {
      key: "review-wait",
      label: "관리자 확인대기",
      value: items.filter((item) => item.stage === "closed").length,
      sub: "운영종료 · 결과확인 필요",
      tone: "is-warn",
    },
    {
      key: "issue",
      label: "중요이슈",
      value: items.reduce((sum, item) => sum + item.issues.length, 0),
      sub: "처리완료 전 · 중요/사고·안전",
      tone: "is-danger",
    },
    {
      key: "follow-up",
      label: "후속조치",
      value: items.reduce((sum, item) => sum + item.followUps.open, 0),
      sub: `기한초과 ${items.reduce((sum, item) => sum + item.followUps.overdue, 0)}건`,
      tone: items.some((item) => item.followUps.overdue > 0) ? "is-danger" : "is-muted",
    },
  ];

  const pipeline = OPS_BOARD_STAGES.map((stage) => {
    const list = scope.filter((item) => !item.stale && item.stage === stage.key);
    let detail = stage.description;
    if (stage.key === "prep") {
      const counts = ASSIGNMENT_STATUSES.filter((status) => status !== "운영인계완료")
        .map((status) => ({ status, count: list.filter((item) => item.assignmentStatus === status).length }))
        .filter((value) => value.count > 0);
      detail = counts.length ? counts.map((value) => `${value.status} ${value.count}`).join(" · ") : "운영배정 진행";
    }
    if (stage.key === "live") {
      const delayed = list.filter((item) => item.delayedVehicles > 0).length;
      detail = delayed ? `지연 ${delayed}건` : "지연 없음";
    }
    if (stage.key === "reviewed") {
      const open = list.filter((item) => item.followUps.open > 0).length;
      detail = open ? `후속조치 진행 ${open}건` : "후속조치 없음";
    }
    return { ...stage, count: list.length, detail };
  });

  const periodLabel =
    period === "all"
      ? "전체 기간"
      : range.from === range.to
        ? formatOpsBoardDate(range.from)
        : `${formatOpsBoardDate(range.from)} ~ ${formatOpsBoardDate(range.to)}`;

  const guideRows = guideOptions
    .filter((name) => advanced.guide === "all" || advanced.guide === name)
    .map((name) => ({
      name,
      list: visible
        .filter((item) => item.guideNames.includes(name))
        .map((item) => {
          const vehicles = item.vehicles.filter((vehicle) => vehicle.guideName === name).map((vehicle) => vehicle.name);
          const role = [item.leadName === name ? "총괄" : "", vehicles.join(", ")].filter(Boolean).join(" · ");
          return { item, role };
        }),
    }))
    .filter((row) => row.list.length > 0);
  const unassignedGuideItems = visible.filter((item) => item.guides.required > item.guides.assigned);

  return (
    <ProductAdminShell
      activeMenu="예약관리"
      currentChild="운영현황"
      breadcrumb={
        <>
          <span>예약관리</span>
          <b>/</b>
          <strong>운영현황</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
      overlays={selected && <DetailDrawer item={selected} onClose={closeDrawer} />}
    >
      <main className="content member-web-detail-content guide-ops-content ops-board-content">
        <section className="panel guide-ops-hero ops-board-hero" aria-labelledby="ops-board-title">
          <div className="guide-ops-hero-main">
            <p className="member-web-breadcrumb">예약관리 &gt; 운영현황</p>
            <h1 id="ops-board-title">운영현황</h1>
            <p className="ops-board-desc">출발 예정부터 운영종료까지 여행 운영현황을 한눈에 확인합니다.</p>
            <p className="ops-board-base">
              QA 테스트 기준일 {formatOpsBoardDate(TEST_REFERENCE_DATE, true)} (실제 현재일 아님)
              {refreshedAt ? ` · 마지막 새로고침 ${refreshedAt}` : ""} · 자동 새로고침 없음 · 실시간 위치 미연동
            </p>
          </div>
          <div className="guide-ops-hero-actions">
            <button type="button" className="secondary ops-board-icon-btn" onClick={refresh}>
              <RefreshCw size={15} aria-hidden="true" />
              새로고침
            </button>
            <Link href="/reservations/guide-operations" className="primary ops-board-icon-btn">
              출발상품 보기
            </Link>
          </div>
        </section>

        <section className="panel ops-board-period" aria-label="조회 기간">
          <div className="guide-customers-chips" role="group" aria-label="기간 선택">
            {OPS_BOARD_PERIODS.map((value) => (
              <button
                key={value.key}
                type="button"
                className={period === value.key ? "is-active" : ""}
                aria-pressed={period === value.key}
                onClick={() => setPeriod(value.key)}
              >
                {value.label}
              </button>
            ))}
            <button
              type="button"
              className={period === "all" ? "is-active" : ""}
              aria-pressed={period === "all"}
              onClick={() => setPeriod("all")}
            >
              전체 기간
            </button>
          </div>
          {period === "custom" && (
            <div className="ops-board-range">
              <label>
                <span>시작일</span>
                <input
                  type="date"
                  value={custom.from}
                  max={custom.to || undefined}
                  onChange={(event) => setCustom((prev) => ({ ...prev, from: event.target.value }))}
                />
              </label>
              <span aria-hidden="true">~</span>
              <label>
                <span>종료일</span>
                <input
                  type="date"
                  value={custom.to}
                  min={custom.from || undefined}
                  onChange={(event) => setCustom((prev) => ({ ...prev, to: event.target.value }))}
                />
              </label>
            </div>
          )}
          <strong className="ops-board-period-label">
            {periodLabel} · {scope.length}개 출발상품
          </strong>
        </section>

        <section className="guide-ops-kpis ops-board-kpis" aria-label="운영 현황 KPI (누르면 목록 필터)">
          {kpis.map((kpi) => (
            <button
              key={kpi.key}
              type="button"
              className={`member-web-detail-kpi guide-ops-kpi ${kpi.value > 0 ? kpi.tone : "is-muted"} ${isFocusActive(kpi.key) ? "is-active" : ""}`}
              aria-pressed={isFocusActive(kpi.key)}
              onClick={() => applyFocus(kpi.key)}
            >
              <span>
                <small>{kpi.label}</small>
                <strong>{kpi.value}건</strong>
                <em>{kpi.sub}</em>
              </span>
            </button>
          ))}
        </section>

        <div className="ops-board-top">
          <section className="panel ops-board-attention" aria-labelledby="ops-board-attention-title">
            <div className="guide-ops-section-head">
              <h2 id="ops-board-attention-title">확인 필요</h2>
              <span>우선순위 순 · 기간과 관계없이 전체 출발상품 기준 · {attention.length}건</span>
            </div>
            {attention.length === 0 ? (
              <p className="ops-board-muted">지금 확인이 필요한 항목이 없습니다.</p>
            ) : (
              <ol className="ops-board-attention-list">
                {(attentionExpanded ? attention : attention.slice(0, ATTENTION_PREVIEW)).map((entry) => (
                  <li key={entry.id} className={`is-${entry.tone}`}>
                    <div className="ops-board-attention-main">
                      <span className="ops-board-attention-meta">
                        <span className={`badge ${entry.tone}`}>{entry.category}</span>
                        <small>
                          {OPS_BOARD_ATTENTION_LABEL[entry.priority]} · {formatOpsBoardDate(entry.departureDate)}
                        </small>
                      </span>
                      <strong>{entry.title}</strong>
                      <button type="button" className="ops-board-link" onClick={() => setSelectedKey(entry.key)}>
                        {entry.productName}
                      </button>
                      <span className="ops-board-muted">{entry.description}</span>
                      {entry.chips.length > 0 && (
                        <span className="ops-board-chips">
                          {entry.chips.map((chip) => (
                            <span key={chip} className="ops-board-chip is-warn">
                              {chip}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    <Link href={entry.action.href} className={entry.priority <= 2 ? "primary" : "secondary"}>
                      {entry.action.label}
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            {attention.length > ATTENTION_PREVIEW && (
              <button
                type="button"
                className="secondary ops-board-more"
                onClick={() => setAttentionExpanded((v) => !v)}
              >
                {attentionExpanded ? "접기" : `${attention.length - ATTENTION_PREVIEW}건 더보기`}
              </button>
            )}
          </section>

          <section className="panel ops-board-today" aria-labelledby="ops-board-today-title">
            <div className="guide-ops-section-head">
              <h2 id="ops-board-today-title">오늘 출발</h2>
              <span>{formatOpsBoardDate(TEST_REFERENCE_DATE)}</span>
            </div>
            {todayItems.length === 0 ? (
              <p className="ops-board-muted">오늘 출발하는 상품이 없습니다.</p>
            ) : (
              <ul className="ops-board-today-list">
                {todayItems.map((item) => (
                  <li key={item.key}>
                    <button type="button" onClick={() => setSelectedKey(item.key)}>
                      <time>{item.startTime || "시간 미정"}</time>
                      <span>
                        <b>{item.productName}</b>
                        <small>
                          {item.people}명 · 호차 {item.vehicles.length}대
                          {item.delayedVehicles ? ` · ${item.delayedVehicles}개 호차 지연` : ""}
                        </small>
                      </span>
                      <StageBadges item={item} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="panel ops-board-pipeline-panel" aria-labelledby="ops-board-pipeline-title">
          <div className="guide-ops-section-head">
            <h2 id="ops-board-pipeline-title">운영 흐름</h2>
            <span>{periodLabel} 기준 · 단계를 누르면 목록이 필터됩니다. 관리자 확인 · 후속조치는 별도 표시합니다.</span>
          </div>
          <ol className="ops-board-pipeline">
            {pipeline.map((stage) => {
              const key = `stage:${stage.key}` as OpsBoardFocus;
              return (
                <li key={stage.key}>
                  <button
                    type="button"
                    className={focus === key ? "is-active" : ""}
                    aria-pressed={focus === key}
                    onClick={() => applyFocus(key)}
                  >
                    <small>{stage.label}</small>
                    <strong>{stage.count}</strong>
                    <span>{stage.detail}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="panel ops-board-list" aria-labelledby="ops-board-list-title">
          <div className="ops-board-toolbar">
            <div className="guide-ops-section-head">
              <h2 id="ops-board-list-title">출발상품 운영현황</h2>
              <span>
                위험 항목 우선 · {visible.length} / {scope.length}개
              </span>
            </div>
            <div className="guide-customers-chips" role="group" aria-label="빠른 필터">
              {OPS_BOARD_QUICK_FILTERS.map((quick) => (
                <button
                  key={quick.key}
                  type="button"
                  className={isFocusActive(quick.key) ? "is-active" : ""}
                  aria-pressed={isFocusActive(quick.key)}
                  onClick={() => applyFocus(quick.key)}
                >
                  {quick.label} <b>{active.filter((item) => matchesOpsBoardFocus(item, quick.key)).length}</b>
                </button>
              ))}
            </div>
            <div className="ops-board-search-row">
              <label className="guide-customers-search">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="상품명 · 상품코드 · 담당가이드 · 출발일 검색"
                  aria-label="운영현황 검색"
                />
                {keyword && (
                  <button type="button" aria-label="검색어 지우기" onClick={() => setKeyword("")}>
                    <X size={15} />
                  </button>
                )}
              </label>
              <button
                type="button"
                className={`secondary ops-board-icon-btn ${advancedOpen ? "is-open" : ""}`}
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((value) => !value)}
              >
                <SlidersHorizontal size={15} aria-hidden="true" />
                상세 필터
              </button>
              <button type="button" className="secondary" onClick={resetFilters}>
                초기화
              </button>
              <div className="ops-board-view" role="group" aria-label="보기 방식">
                <button
                  type="button"
                  className={view === "departure" ? "is-active" : ""}
                  aria-pressed={view === "departure"}
                  onClick={() => setView("departure")}
                >
                  출발상품별
                </button>
                <button
                  type="button"
                  className={view === "guide" ? "is-active" : ""}
                  aria-pressed={view === "guide"}
                  onClick={() => setView("guide")}
                >
                  가이드별
                </button>
              </div>
            </div>
            {advancedOpen && (
              <div className="ops-board-advanced">
                <label>
                  <span>출발기간</span>
                  <span className="ops-board-advanced-range">
                    <input
                      type="date"
                      value={period === "custom" ? custom.from : range.from}
                      onChange={(event) => {
                        setCustom({ from: event.target.value, to: period === "custom" ? custom.to : range.to });
                        setPeriod("custom");
                      }}
                      aria-label="출발기간 시작일"
                    />
                    <input
                      type="date"
                      value={period === "custom" ? custom.to : range.to}
                      onChange={(event) => {
                        setCustom({ from: period === "custom" ? custom.from : range.from, to: event.target.value });
                        setPeriod("custom");
                      }}
                      aria-label="출발기간 종료일"
                    />
                  </span>
                </label>
                <label>
                  <span>운영상태</span>
                  <select
                    value={advanced.stage}
                    onChange={(event) => updateAdvanced("stage", event.target.value as OpsBoardAdvancedFilter["stage"])}
                  >
                    <option value="all">전체</option>
                    {OPS_BOARD_STAGES.map((stage) => (
                      <option key={stage.key} value={stage.key}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>운영배정</span>
                  <select
                    value={advanced.assignment}
                    onChange={(event) =>
                      updateAdvanced("assignment", event.target.value as OpsBoardAdvancedFilter["assignment"])
                    }
                  >
                    <option value="all">전체</option>
                    {ASSIGNMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>담당가이드</span>
                  <select value={advanced.guide} onChange={(event) => updateAdvanced("guide", event.target.value)}>
                    <option value="all">전체</option>
                    {guideOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>호차</span>
                  <select
                    value={advanced.vehicles}
                    onChange={(event) =>
                      updateAdvanced("vehicles", event.target.value as OpsBoardAdvancedFilter["vehicles"])
                    }
                  >
                    <option value="all">전체</option>
                    <option value="none">호차 미등록</option>
                    <option value="single">1대</option>
                    <option value="multi">2대 이상</option>
                  </select>
                </label>
                <label>
                  <span>중요이슈</span>
                  <select
                    value={advanced.issue}
                    onChange={(event) => updateAdvanced("issue", event.target.value as OpsBoardAdvancedFilter["issue"])}
                  >
                    <option value="all">전체</option>
                    <option value="yes">있음</option>
                    <option value="no">없음</option>
                  </select>
                </label>
                <label>
                  <span>후속조치</span>
                  <select
                    value={advanced.followUp}
                    onChange={(event) =>
                      updateAdvanced("followUp", event.target.value as OpsBoardAdvancedFilter["followUp"])
                    }
                  >
                    <option value="all">전체</option>
                    <option value="open">진행중</option>
                    <option value="overdue">기한초과</option>
                    <option value="none">없음</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="ops-board-empty">
              <strong>조건에 맞는 출발상품이 없습니다.</strong>
              <span>기간을 넓히거나 필터를 초기화해 주세요.</span>
              <button type="button" className="secondary" onClick={resetFilters}>
                필터 초기화
              </button>
            </div>
          ) : view === "guide" ? (
            <div className="ops-board-guides">
              {unassignedGuideItems.length > 0 && (
                <div className="ops-assign-notice is-warn">
                  <AlertTriangle size={15} aria-hidden="true" />
                  <span>
                    <strong>가이드 미배정 출발상품 {unassignedGuideItems.length}건</strong>
                    <small className="ops-board-notice-links">
                      {unassignedGuideItems.map((item) => (
                        <Link key={item.key} href={item.links.assignment}>
                          {formatOpsBoardDate(item.departureDate)} {item.productName} ·{" "}
                          {item.guides.required - item.guides.assigned}명 미배정
                        </Link>
                      ))}
                    </small>
                  </span>
                </div>
              )}
              {guideRows.length === 0 && <p className="ops-board-muted">배정된 가이드가 없습니다.</p>}
              {guideRows.map((row) => (
                <article key={row.name} className="ops-board-guide">
                  <header>
                    <b>{row.name}</b>
                    <small>{row.list.length}개 출발상품</small>
                  </header>
                  <ul>
                    {row.list.map(({ item, role }) => (
                      <li key={item.key}>
                        <time>
                          {formatOpsBoardDate(item.departureDate)} {item.startTime}
                        </time>
                        <button type="button" className="ops-board-link" onClick={() => setSelectedKey(item.key)}>
                          {item.productName}
                        </button>
                        <span>{role || "-"}</span>
                        <StageBadges item={item} />
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <>
              <div className="guide-customers-table-wrap ops-board-table-wrap">
                <table className="ops-board-table">
                  <thead>
                    <tr>
                      <th scope="col">출발일</th>
                      <th scope="col">상품명</th>
                      <th scope="col" className="is-wide">
                        예약
                      </th>
                      <th scope="col" className="is-wide">
                        호차
                      </th>
                      <th scope="col" className="is-wide">
                        담당가이드
                      </th>
                      <th scope="col" className="is-wide">
                        운영배정
                      </th>
                      <th scope="col">운영상태</th>
                      <th scope="col">중요이슈</th>
                      <th scope="col" className="is-wide">
                        후속조치
                      </th>
                      <th scope="col">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((item) => (
                      <tr
                        key={item.key}
                        className={`${item.risk ? "is-risk" : ""} ${selectedKey === item.key ? "is-selected" : ""}`}
                        onClick={() => setSelectedKey(item.key)}
                      >
                        <td>
                          <span className="ops-board-date">
                            <b>{formatOpsBoardDate(item.departureDate)}</b>
                            <span
                              className={`badge ${item.dday === 0 ? "danger" : item.dday === 1 ? "warn" : item.dday > 0 ? "info" : "gray"}`}
                            >
                              {item.dday < 0 ? (item.stale ? "지난 출발" : "종료") : item.ddayLabel}
                            </span>
                            <small>{item.startTime || "시간 미정"}</small>
                          </span>
                        </td>
                        <td>
                          <span className="ops-board-product">
                            <button
                              type="button"
                              className="ops-board-link"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedKey(item.key);
                              }}
                            >
                              {item.risk && <AlertTriangle size={13} aria-label="확인 필요" />}
                              {item.productName}
                            </button>
                            <small>{item.productCode}</small>
                          </span>
                        </td>
                        <td className="is-wide">
                          <span className="ops-board-stack">
                            <b>{item.people}명</b>
                            <small>{item.reservationCount}건</small>
                            {(item.stage === "live" || item.stage === "closed" || item.stage === "reviewed") && (
                              <BoardingLine item={item} />
                            )}
                          </span>
                        </td>
                        <td className="is-wide">
                          {item.vehicles.length === 0 ? (
                            <span className="ops-board-muted">미등록</span>
                          ) : (
                            <span className="ops-board-stack">
                              <b>{item.vehicles.length}대</b>
                              {item.vehicles.map((vehicle) => (
                                <small key={vehicle.id} className={vehicle.groupName ? "" : "is-warn"}>
                                  {vehicle.name} {vehicle.assigned}/{vehicle.capacity} ·{" "}
                                  {vehicle.groupName || "탑승지 미선택"}
                                </small>
                              ))}
                            </span>
                          )}
                        </td>
                        <td className="is-wide">
                          <span className="ops-board-stack">
                            <b>
                              {item.guides.assigned} / {item.guides.required}
                            </b>
                            <small>{item.guideNames.join(", ") || "미지정"}</small>
                            {item.guides.required > item.guides.assigned && (
                              <Link href={item.links.assignment} className="ops-board-chip is-warn" onClick={stopRow}>
                                {item.guides.required - item.guides.assigned}명 미배정
                              </Link>
                            )}
                          </span>
                        </td>
                        <td className="is-wide">
                          {item.stage === "prep" || item.stage === "handover" ? (
                            <PrepProgress item={item} />
                          ) : (
                            <span className={`badge ${item.assignmentBadge}`}>{item.assignmentStatus}</span>
                          )}
                        </td>
                        <td>
                          <span className="ops-board-stack">
                            <StageBadges item={item} />
                            <LiveVehicles item={item} />
                            {item.delayedVehicles > 1 && (
                              <Link href={item.links.schedule} className="ops-board-chip is-danger" onClick={stopRow}>
                                {item.delayedVehicles}개 호차 지연
                              </Link>
                            )}
                            {item.stage === "closed" && item.closedAt && (
                              <small className="ops-board-muted">종료 {item.closedAt}</small>
                            )}
                          </span>
                        </td>
                        <td>
                          <IssueCell item={item} />
                        </td>
                        <td className="is-wide">
                          <FollowUpCell item={item} />
                        </td>
                        <td>
                          <ActionLinks item={item} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="ops-board-cards" aria-label="출발상품 운영현황 (모바일)">
                {visible.map((item) => (
                  <li key={item.key} className={item.risk ? "is-risk" : ""}>
                    <button type="button" className="ops-board-card-main" onClick={() => setSelectedKey(item.key)}>
                      <span className="ops-board-card-date">
                        {formatOpsBoardDate(item.departureDate)} · {item.startTime || "시간 미정"} ·{" "}
                        {item.dday < 0 ? "종료" : item.ddayLabel}
                      </span>
                      <b>{item.productName}</b>
                      <span className="ops-board-card-meta">
                        {item.people}명 · 호차 {item.vehicles.length}대 · 가이드 {item.guides.assigned}/
                        {item.guides.required}
                      </span>
                    </button>
                    <StageBadges item={item} />
                    {(item.stage === "prep" || item.stage === "handover") && <PrepProgress item={item} />}
                    <LiveVehicles item={item} />
                    <dl className="ops-board-card-row">
                      <div>
                        <dt>중요이슈</dt>
                        <dd>
                          <IssueCell item={item} />
                        </dd>
                      </div>
                      <div>
                        <dt>후속조치</dt>
                        <dd>
                          <FollowUpCell item={item} />
                        </dd>
                      </div>
                    </dl>
                    <ActionLinks item={item} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </main>
    </ProductAdminShell>
  );
}
