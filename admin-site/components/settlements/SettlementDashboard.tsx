"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, FileText, Info, RotateCcw } from "lucide-react";
import { SettlementStatusBadge } from "@/components/settlements/SettlementParts";
import type { ReservationViewer } from "@/lib/admin/reservation-permission";
import { SETTLEMENT_STATUSES, formatSignedWon, formatWon, type SettlementRecord } from "@/lib/admin/settlement-data";
import {
  EMPTY_SETTLEMENT_DASHBOARD_FILTERS,
  SETTLEMENT_DASHBOARD_MODE_LABELS,
  SETTLEMENT_PERIOD_PRESETS,
  getSettlementDashboardOptions,
  getSettlementDashboardSummary,
  getSettlementPeriodRange,
  type SettlementDashboardDrill,
  type SettlementDashboardDrillKey,
  type SettlementDashboardFilters,
  type SettlementDashboardMode,
  type SettlementDateRange,
  type SettlementPeriodPreset,
} from "@/lib/admin/settlement-dashboard-data";

const ISSUE_LIMIT = 6;

/** 차트 라벨용 축약 금액 (₩74만 / ₩1.2억) */
function formatCompactWon(value: number) {
  const abs = Math.abs(value);
  if (abs >= 100_000_000) return `₩${(value / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
  if (abs >= 10_000) return `₩${Math.round(value / 10_000).toLocaleString("ko-KR")}만`;
  return formatWon(value);
}

export function getDashboardModeForViewer(viewer: ReservationViewer): SettlementDashboardMode | null {
  if (viewer.type === "supplierAgency") return "supplier";
  if (viewer.type === "sellingAgency") return "selling";
  return null;
}

export function SettlementDashboard({
  records,
  viewer,
  today,
  activeDrillKey,
  onDrill,
  detailHref,
}: {
  records: SettlementRecord[];
  viewer: ReservationViewer;
  today: string;
  activeDrillKey?: SettlementDashboardDrillKey;
  onDrill: (drill: SettlementDashboardDrill) => void;
  detailHref: (settlementCode: string, tab?: string) => string;
}) {
  const fixedMode = getDashboardModeForViewer(viewer);
  const [selectedMode, setSelectedMode] = useState<SettlementDashboardMode>("supplier");
  const mode = fixedMode ?? selectedMode;
  const [preset, setPreset] = useState<SettlementPeriodPreset>("month");
  const [custom, setCustom] = useState<SettlementDateRange>(() => getSettlementPeriodRange("month", today));
  const [filters, setFilters] = useState<SettlementDashboardFilters>(EMPTY_SETTLEMENT_DASHBOARD_FILTERS);
  const [collapsed, setCollapsed] = useState(false);

  const range = useMemo(() => getSettlementPeriodRange(preset, today, custom), [preset, today, custom]);
  const options = useMemo(() => getSettlementDashboardOptions(records, mode), [records, mode]);
  const summary = useMemo(
    () => getSettlementDashboardSummary({ records, mode, range, filters, today }),
    [records, mode, range, filters, today],
  );
  const counterpartyLabel = mode === "supplier" ? "판매여행사" : "공급여행사";
  const maxTrend = Math.max(1, ...summary.trend.flatMap((point) => [point.primary, point.secondary]));
  const trendLabels = mode === "supplier" ? ["받을 정산금액", "지급완료"] : ["총 판매금액", "판매수익"];
  const hasFilter = JSON.stringify(filters) !== JSON.stringify(EMPTY_SETTLEMENT_DASHBOARD_FILTERS);

  const changeMode = (next: SettlementDashboardMode) => {
    setSelectedMode(next);
    setFilters(EMPTY_SETTLEMENT_DASHBOARD_FILTERS);
  };

  const drill = (key: SettlementDashboardDrillKey, label: string) => onDrill({ key, label, mode, range, filters });

  const filterSelect = (key: keyof SettlementDashboardFilters, label: string, values: readonly string[]) => (
    <label>
      <span>{label}</span>
      <select aria-label={`대시보드 ${label}`} value={filters[key]} onChange={(event) => setFilters((value) => ({ ...value, [key]: event.target.value }))}>
        <option value="전체">전체</option>
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="panel settlement-dashboard" aria-label="정산 대시보드">
      <div className="settlement-dashboard-head">
        <div className="settlement-dashboard-title">
          <strong>정산 대시보드</strong>
          <span>
            {range.from} ~ {range.to} · 정산예정일 기준 (지급완료는 지급일 기준) · Mock 정산 데이터
          </span>
        </div>
        <div className="settlement-dashboard-controls">
          {fixedMode ? (
            <span className="badge info">{SETTLEMENT_DASHBOARD_MODE_LABELS[mode]} 관점</span>
          ) : (
            <div className="settlement-segmented" role="radiogroup" aria-label="대시보드 관점">
              <span>대시보드 관점</span>
              {(Object.keys(SETTLEMENT_DASHBOARD_MODE_LABELS) as SettlementDashboardMode[]).map((key) => (
                <button key={key} type="button" role="radio" aria-checked={mode === key} className={mode === key ? "active" : ""} onClick={() => changeMode(key)}>
                  {SETTLEMENT_DASHBOARD_MODE_LABELS[key]}
                </button>
              ))}
            </div>
          )}
          <div className="settlement-segmented" role="radiogroup" aria-label="조회기간">
            {SETTLEMENT_PERIOD_PRESETS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="radio"
                aria-checked={preset === item.key}
                className={preset === item.key ? "active" : ""}
                onClick={() => {
                  if (item.key === "custom") setCustom(range);
                  setPreset(item.key);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="settlement-dashboard-dates">
              <input
                type="date"
                aria-label="대시보드 조회 시작일"
                value={custom.from}
                max={custom.to || undefined}
                onChange={(event) => setCustom((value) => ({ ...value, from: event.target.value }))}
              />
              <em>~</em>
              <input
                type="date"
                aria-label="대시보드 조회 종료일"
                value={custom.to}
                min={custom.from || undefined}
                onChange={(event) => setCustom((value) => ({ ...value, to: event.target.value }))}
              />
            </div>
          )}
          <button type="button" className="secondary settlement-inline-button" aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            {collapsed ? "펼치기" : "접기"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="settlement-dashboard-body">
          <div className="settlement-dashboard-filters">
            {filterSelect("counterparty", counterpartyLabel, options.counterparty)}
            {mode === "selling" && filterSelect("seller", "판매점", options.seller)}
            {filterSelect("product", "상품", options.product)}
            {filterSelect("status", "정산상태", SETTLEMENT_STATUSES.filter((status) => status !== "정산취소"))}
            {hasFilter && (
              <button type="button" className="secondary settlement-inline-button" onClick={() => setFilters(EMPTY_SETTLEMENT_DASHBOARD_FILTERS)}>
                <RotateCcw size={12} />
                필터 초기화
              </button>
            )}
          </div>

          {summary.scopedCount === 0 && (
            <div className="member-web-empty settlement-dashboard-empty">
              <strong>조회기간에 해당하는 정산내역이 없습니다.</strong>
              <p>기간 또는 필터를 변경해 주세요. 확인이 필요한 정산 · 다가오는 지급일은 기간과 관계없이 표시됩니다.</p>
            </div>
          )}

          <div className="settlement-dashboard-kpis">
            {summary.kpis.map((kpi) => (
              <button
                key={kpi.key}
                type="button"
                className={`member-web-detail-kpi settlement-dashboard-kpi is-${kpi.tone} ${activeDrillKey === kpi.key ? "is-active" : ""}`}
                title={`${kpi.tooltip}\n클릭하면 정산목록을 해당 조건으로 필터링합니다.`}
                onClick={() => drill(kpi.key, kpi.label)}
              >
                <span>
                  <small>
                    {kpi.label}
                    <Info size={11} aria-label={kpi.tooltip} />
                  </small>
                  <strong>{kpi.signed ? formatSignedWon(kpi.amount) : formatWon(kpi.amount)}</strong>
                  <em>
                    {kpi.count}건 · {kpi.sub}
                  </em>
                </span>
              </button>
            ))}
          </div>

          <div className="settlement-dashboard-status" role="list" aria-label="상태별 정산현황">
            {summary.statusCounts.map((item) => (
              <button
                key={item.key}
                type="button"
                role="listitem"
                className={activeDrillKey === `status:${item.key}` ? "is-active" : ""}
                title={
                  item.key === "정산마감" || item.key === "확인대기"
                    ? "정산확정 건 중 진행단계 기준 (정산확정 건수와 중복 집계)"
                    : item.key === "지급완료"
                      ? "지급일 기준"
                      : "정산예정일 기준"
                }
                onClick={() => drill(`status:${item.key}`, `상태 · ${item.key}`)}
              >
                <small>{item.key}</small>
                <b>{item.count}건</b>
                <span>{formatWon(item.amount)}</span>
              </button>
            ))}
          </div>

          <div className="settlement-dashboard-grid">
            <section className="settlement-dashboard-card" aria-label="월별 정산 추이">
              <div className="settlement-dashboard-card-head">
                <strong>월별 정산 추이</strong>
                <span className="settlement-dashboard-legend">
                  <i className="is-primary" />
                  {trendLabels[0]}
                  <i className="is-secondary" />
                  {trendLabels[1]}
                </span>
              </div>
              <div className="settlement-trend-chart" role="img" aria-label={`최근 6개월 ${trendLabels.join(" · ")} 추이`}>
                {summary.trend.map((point) => (
                  <div
                    key={point.month}
                    className="settlement-trend-month"
                    title={`${point.month}\n${trendLabels[0]} ${formatWon(point.primary)}\n${trendLabels[1]} ${formatWon(point.secondary)}`}
                  >
                    <div className="settlement-trend-bars">
                      <span className="is-primary" style={{ height: `${(point.primary / maxTrend) * 100}%` }} />
                      <span className="is-secondary" style={{ height: `${(point.secondary / maxTrend) * 100}%` }} />
                    </div>
                    <b>{point.label}</b>
                    <small>{point.primary ? formatCompactWon(point.primary) : "-"}</small>
                  </div>
                ))}
              </div>
              <p className="settlement-dashboard-help">최근 6개월 · 정산예정일 월 기준{mode === "supplier" ? " (지급완료는 지급일 월)" : ""} · 막대에 마우스를 올리면 금액을 확인할 수 있습니다.</p>
            </section>

            <section className="settlement-dashboard-card" aria-label="확인이 필요한 정산">
              <div className="settlement-dashboard-card-head">
                <strong>확인이 필요한 정산</strong>
                <span className="member-web-status-history-count">{summary.issues.length}건</span>
              </div>
              {summary.issues.length ? (
                <ul className="settlement-issue-list">
                  {summary.issues.slice(0, ISSUE_LIMIT).map((issue) => (
                    <li key={issue.id}>
                      <div>
                        <span className="settlement-issue-meta">
                          <b>{issue.settlementCode}</b>
                          <span>{issue.counterparty}</span>
                          <span className={`badge ${issue.badge}`}>{issue.type}</span>
                        </span>
                        <span className="settlement-issue-reason">{issue.reason}</span>
                      </div>
                      <strong>{issue.type === "차기정산 예정" || issue.type === "조정필요" ? formatSignedWon(issue.amount) : formatWon(issue.amount)}</strong>
                      <Link
                        href={detailHref(issue.settlementCode, issue.type === "이의제기" || issue.type === "정산서 미확인" ? "document" : undefined)}
                        className="member-detail-button"
                      >
                        확인
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="member-web-empty settlement-dashboard-card-empty">
                  <strong>확인이 필요한 정산이 없습니다.</strong>
                </div>
              )}
              {summary.issues.length > ISSUE_LIMIT && <p className="settlement-dashboard-help">외 {summary.issues.length - ISSUE_LIMIT}건 · 정산목록의 조정상태 / 정산상태 필터로 확인하세요.</p>}
            </section>

            <section className="settlement-dashboard-card" aria-label="다가오는 지급일">
              <div className="settlement-dashboard-card-head">
                <strong>다가오는 지급일</strong>
                <span className="settlement-dashboard-sub">오늘({today.slice(5).replace("-", "/")}) 이후 · 정산예정일</span>
              </div>
              {summary.upcoming.length ? (
                <ul className="settlement-upcoming-list">
                  {summary.upcoming.map((item) => (
                    <li key={item.settlementCode}>
                      <b>{item.date.slice(5).replace("-", "/")}</b>
                      <Link href={detailHref(item.settlementCode)}>
                        <span>{item.counterparty}</span>
                        <small>{item.settlementCode}</small>
                      </Link>
                      <SettlementStatusBadge status={item.status} />
                      <strong>{formatWon(item.amount)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="member-web-empty settlement-dashboard-card-empty">
                  <strong>예정된 지급일이 없습니다.</strong>
                </div>
              )}
              <div className="settlement-pending-documents">
                <span>
                  <FileText size={13} />
                  확인 필요한 정산서
                  <span className={`badge ${summary.pendingDocuments.length ? "warn" : "gray"}`}>확인 필요 {summary.pendingDocuments.length}건</span>
                </span>
                {summary.pendingDocuments.map((document) => (
                  <Link key={document.documentNo} href={detailHref(document.settlementCode, "document")}>
                    <b>{document.documentNo}</b>
                    <span>
                      {document.counterparty} · {formatWon(document.amount)}
                      {document.requestedAt ? ` · 요청 ${document.requestedAt}` : ""}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <section className="settlement-dashboard-card" aria-label={`${counterpartyLabel}별 정산현황`}>
            <div className="settlement-dashboard-card-head">
              <strong>{counterpartyLabel}별 정산현황</strong>
              <span className="settlement-dashboard-sub">조회기간 · 정산취소 제외 · 최종 정산액 기준</span>
            </div>
            <div className="member-web-table-wrap">
              <table className="member-web-table settlement-partner-table">
                <thead>
                  <tr>
                    {[
                      counterpartyLabel,
                      "예약건수",
                      "판매금액",
                      mode === "supplier" ? "판매수수료" : "판매수익",
                      mode === "supplier" ? "받을 정산액" : "공급사 정산액",
                      "지급완료",
                      "미지급",
                      "조정금액",
                    ].map((title) => (
                      <th key={title}>{title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.partners.length ? (
                    summary.partners.map((row) => (
                      <tr key={row.name}>
                        <td className="text-left">
                          <b>{row.name}</b>
                        </td>
                        <td>{row.reservationCount}건</td>
                        <td className="amount-cell">{formatWon(row.salesAmount)}</td>
                        <td className="amount-cell">{formatWon(row.commissionAmount)}</td>
                        <td className="amount-cell">
                          <b>{formatWon(row.settlementAmount)}</b>
                        </td>
                        <td className="amount-cell">{formatWon(row.paidAmount)}</td>
                        <td className="amount-cell">{formatWon(row.unpaidAmount)}</td>
                        <td className="amount-cell">{formatSignedWon(row.adjustmentAmount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>
                        <div className="member-web-empty">
                          <strong>조회기간에 해당하는 정산내역이 없습니다.</strong>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
