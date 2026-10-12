"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { useQueryParam } from "@/components/settlements/SettlementParts";
import {
  GUIDE_ASSIGNMENT_STATUS_BADGE,
  formatGuideDepartureDate,
  getGuideOperationPath,
} from "@/lib/admin/guide-operation-data";
import { getGuideCommunicationPath } from "@/lib/admin/guide-communication-data";
import { getGuideChatRoomPath } from "@/lib/admin/guide-chatroom-data";
import { GUIDE_ADMIN_REVIEW_BADGE } from "@/lib/admin/guide-closing-data";
import {
  GUIDE_OPERATION_PHASE_BADGE,
  getGuideReviewOverview,
  getGuideReviewPath,
  type GuideReviewOverview,
} from "@/lib/admin/guide-review-data";
import {
  getOperationAssignmentPath,
  getOperationDeparture,
  getOperationDepartureOverviews,
} from "@/lib/admin/operation-assignment-data";

type OperationFilter = "all" | "운영중" | "운영종료" | "관리자 확인대기" | "관리자 확인완료";

const OPERATION_FILTERS: OperationFilter[] = ["all", "운영중", "운영종료", "관리자 확인대기", "관리자 확인완료"];

function matchesOperationFilter(review: GuideReviewOverview | null, filter: OperationFilter) {
  if (filter === "all") return true;
  if (!review) return false;
  if (filter === "운영중" || filter === "운영종료") return review.phase === filter;
  return review.adminReview === filter;
}

export default function GuideOperationListPage() {
  const departures = useMemo(
    () =>
      [...getOperationDepartureOverviews()]
        .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
        .map((item) => {
          const departure = getOperationDeparture(item.key);
          return {
            ...item,
            hasVehicles: Boolean(departure?.vehicles.length),
            review: departure ? getGuideReviewOverview(departure) : null,
          };
        }),
    [],
  );
  const [filterParam, setFilterParam] = useQueryParam("status", "all");
  const filter: OperationFilter = OPERATION_FILTERS.includes(filterParam as OperationFilter)
    ? (filterParam as OperationFilter)
    : "all";
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const notify = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const awaiting = departures.filter((item) => item.review?.adminReview === "관리자 확인대기");
  const kpis = [
    {
      key: "awaiting",
      label: "관리자 확인대기",
      value: `${awaiting.length}건`,
      tone: awaiting.length ? "is-warn" : "is-muted",
    },
    {
      key: "unresolved",
      label: "미처리사항 (확인대기)",
      value: `${awaiting.reduce((sum, item) => sum + (item.review?.unresolved ?? 0), 0)}건`,
      tone: "is-muted",
    },
    {
      key: "important",
      label: "중요이슈 미확인",
      value: `${awaiting.reduce((sum, item) => sum + (item.review?.unconfirmedIssues ?? 0), 0)}건`,
      tone: awaiting.some((item) => item.review?.unconfirmedIssues) ? "is-danger" : "is-muted",
    },
    {
      key: "follow-ups",
      label: "후속조치 진행중",
      value: `${departures.reduce((sum, item) => sum + (item.review?.followUps.open ?? 0), 0)}건`,
      tone: "is-muted",
    },
  ];
  const visible = departures.filter((item) => matchesOperationFilter(item.review, filter));

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
    >
      <main className="content member-web-detail-content guide-ops-content">
        <section className="panel guide-ops-list-head" aria-labelledby="guide-ops-list-title">
          <p className="member-web-breadcrumb">예약관리 &gt; 가이드 운영</p>
          <h1 id="guide-ops-list-title">가이드 운영</h1>
          <p>
            출발회차(상품 + 출발일)별로 고객명단, 고객소통, 카카오 안내방을 관리합니다. 운영배정과 운영인계를 마친 뒤
            가이드 운영을 시작하는 것을 기본으로 합니다. 가이드가 운영 종료 인계한 회차는 [운영결과]에서 관리자가
            확인합니다. (SAMPLE)
          </p>
        </section>

        <section className="guide-ops-kpis guide-review-list-kpis" aria-label="운영결과 확인 현황">
          {kpis.map((kpi) => (
            <div key={kpi.key} className={`member-web-detail-kpi guide-ops-kpi ${kpi.tone}`}>
              <span>
                <small>{kpi.label}</small>
                <strong>{kpi.value}</strong>
              </span>
            </div>
          ))}
        </section>

        {departures.length === 0 ? (
          <section className="panel guide-customers-empty">
            <strong>가이드 운영 대상 출발회차가 없습니다.</strong>
          </section>
        ) : (
          <section className="panel reservation-ops-panel" aria-label="가이드 운영 출발회차">
            <div className="reservation-ops-panel-head">
              <strong>출발회차 목록</strong>
              <span>
                출발일 순 · {visible.length} / {departures.length}개 출발회차
              </span>
            </div>
            <div className="guide-customers-chips guide-review-list-filter" role="group" aria-label="운영상태 필터">
              {OPERATION_FILTERS.map((key) => (
                <button
                  type="button"
                  key={key}
                  className={filter === key ? "is-active" : ""}
                  aria-pressed={filter === key}
                  onClick={() => setFilterParam(key)}
                >
                  {key === "all" ? "전체" : key}{" "}
                  <b>{departures.filter((item) => matchesOperationFilter(item.review, key)).length}</b>
                </button>
              ))}
            </div>
            {visible.length === 0 && <p className="guide-sheet-note">조건에 맞는 출발회차가 없습니다.</p>}
            {visible.map((departure) => {
              const { summary, review } = departure;
              const awaitingReview = review?.adminReview === "관리자 확인대기";
              return (
                <div
                  className={`reservation-ops-row ${awaitingReview ? "guide-review-list-row is-awaiting" : ""}`}
                  key={departure.key}
                >
                  <div className="reservation-ops-title">
                    {!departure.handedOver && (
                      <span className={`badge ${GUIDE_ASSIGNMENT_STATUS_BADGE[summary.status]}`}>{summary.status}</span>
                    )}
                    <b>{departure.productName}</b>
                    <small>출발 {formatGuideDepartureDate(departure.departureDate)}</small>
                  </div>
                  <dl className="reservation-ops-stats guide-ops-list-stats">
                    <div>
                      <dt>예약인원</dt>
                      <dd>{summary.total}명</dd>
                    </div>
                    <div className={summary.unassigned > 0 ? "is-warn" : ""}>
                      <dt>미배정</dt>
                      <dd>{summary.unassigned}명</dd>
                    </div>
                    <div>
                      <dt>운영차량</dt>
                      <dd>{summary.vehicleCount}대</dd>
                    </div>
                    <div>
                      <dt>담당가이드</dt>
                      <dd>{summary.guideCount}명</dd>
                    </div>
                  </dl>
                  <div className="reservation-ops-actions guide-ops-list-actions">
                    <Link href={getGuideCommunicationPath(departure.key)} className="secondary">
                      고객소통
                    </Link>
                    <Link href={getGuideChatRoomPath(departure.key)} className="secondary">
                      카카오 안내방
                    </Link>
                    <Link href={getOperationAssignmentPath(departure.key)} className="secondary">
                      운영배정
                    </Link>
                    <Link
                      href={getGuideOperationPath(departure.key)}
                      className={awaitingReview ? "secondary" : "primary"}
                    >
                      가이드 운영
                    </Link>
                    {departure.hasVehicles && (
                      <Link
                        href={getGuideReviewPath(departure.key)}
                        className={review?.phase === "운영종료" ? "primary" : "secondary"}
                      >
                        {review?.adminReview === "관리자 확인완료" ? "결과보기" : "결과확인"}
                      </Link>
                    )}
                  </div>
                  {review && review.phase !== "운영배정" && (
                    <dl className="guide-review-list-status">
                      <div>
                        <dt>운영상태</dt>
                        <dd>
                          <span className={`badge ${GUIDE_OPERATION_PHASE_BADGE[review.phase]}`}>{review.phase}</span>
                        </dd>
                      </div>
                      <div>
                        <dt>관리자 확인</dt>
                        <dd>
                          {review.adminReview ? (
                            <span className={`badge ${GUIDE_ADMIN_REVIEW_BADGE[review.adminReview]}`}>
                              {review.adminReview}
                            </span>
                          ) : (
                            <span className="guide-close-muted">운영종료 후</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>후속조치</dt>
                        <dd>
                          {review.followUps.total === 0 ? (
                            <span className="guide-close-muted">없음</span>
                          ) : (
                            <span className={`badge ${review.followUps.open ? "info" : "success"}`}>
                              {review.followUps.open
                                ? `${review.followUps.open}건 진행중`
                                : `${review.followUps.total}건 처리완료`}
                            </span>
                          )}
                        </dd>
                      </div>
                      {awaitingReview && (
                        <div>
                          <dt>검토 필요</dt>
                          <dd>
                            미처리 {review.unresolved}건 · 중요이슈 {review.importantIssues}건
                            {review.unconfirmedIssues ? ` (미확인 ${review.unconfirmedIssues})` : ""}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {!departure.handedOver && review?.phase !== "운영종료" && (
                    <p className="guide-ops-list-note">
                      운영인계 전입니다. 운영배정에서 배정을 확정하고 운영인계해 주세요.
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </main>
    </ProductAdminShell>
  );
}
