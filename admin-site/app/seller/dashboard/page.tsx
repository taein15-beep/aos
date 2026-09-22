"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SellerSectionPageHead } from "@/components/seller/SellerSectionPageHead";
import { readSellerSessionFromDocument } from "@/lib/seller/auth";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import {
  formatSellerDashboardAmount,
  formatSellerDashboardCount,
  getSellerDashboardSnapshot,
  sellerDashboardStatusBadgeClass,
} from "@/lib/seller/seller-dashboard-data";
import { SELLER_ADMIN_BASE_PATH } from "@/lib/seller/navigation";

export default function SellerDashboardPage() {
  const [sellerId, setSellerId] = useState(SELLER_ADMIN_DEMO_PROFILE.sellerId);

  useEffect(() => {
    const session = readSellerSessionFromDocument();
    if (session?.sellerId) setSellerId(session.sellerId);
  }, []);

  const snapshot = useMemo(() => getSellerDashboardSnapshot(sellerId), [sellerId]);
  const { kpi, recentReservations, topProducts, periodLabel } = snapshot;

  return (
    <div className="seller-dashboard">
      <SellerSectionPageHead
        title="대시보드"
        description={`${periodLabel} 기준 · 판매점 본인 데이터만 표시됩니다.`}
      />

      <section className="kpi-grid seller-dashboard-kpi" aria-label="판매점 주요 지표">
        <article className="kpi">
          <span className="kpi-icon">▦</span>
          <span className="kpi-copy">
            <small>판매 가능 상품</small>
            <strong>{formatSellerDashboardCount(kpi.availableProductCount, "개")}</strong>
          </span>
        </article>
        <article className="kpi">
          <span className="kpi-icon">▤</span>
          <span className="kpi-copy">
            <small>이번 달 예약</small>
            <strong>{formatSellerDashboardCount(kpi.monthReservationCount, "건")}</strong>
          </span>
        </article>
        <article className="kpi">
          <span className="kpi-icon">₩</span>
          <span className="kpi-copy">
            <small>이번 달 판매금액</small>
            <strong>{formatSellerDashboardAmount(kpi.monthSalesAmount)}</strong>
          </span>
        </article>
        <article className="kpi">
          <span className="kpi-icon">⇄</span>
          <span className="kpi-copy">
            <small>정산 예정 수수료</small>
            <strong>{formatSellerDashboardAmount(kpi.pendingCommissionAmount)}</strong>
          </span>
        </article>
      </section>

      <div className="seller-dashboard-grid">
        <section className="panel seller-dashboard-recent" aria-labelledby="seller-recent-title">
          <div className="panel-head">
            <div>
              <h2 id="seller-recent-title">최근 예약</h2>
              <p>판매점에서 최근 접수한 예약입니다.</p>
            </div>
            <Link href={`${SELLER_ADMIN_BASE_PATH}/reservations`} className="text-btn">
              전체 예약 보기 →
            </Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>예약번호</th>
                  <th>상품명</th>
                  <th>고객명</th>
                  <th>출발일</th>
                  <th>인원</th>
                  <th>결제금액</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {recentReservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="seller-dashboard-empty">
                      최근 예약이 없습니다.
                    </td>
                  </tr>
                ) : (
                  recentReservations.map((row) => (
                    <tr key={row.reservationCode}>
                      <td>
                        <a>{row.reservationCode}</a>
                      </td>
                      <td className="product-cell">{row.productName}</td>
                      <td>
                        <b>{row.customerName}</b>
                      </td>
                      <td>{row.departureDate.replaceAll("-", ".")}</td>
                      <td>{formatSellerDashboardCount(row.pax, "명")}</td>
                      <td className="money">{formatSellerDashboardAmount(row.paymentAmount)}</td>
                      <td>
                        <span className={`badge ${sellerDashboardStatusBadgeClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel seller-dashboard-top" aria-labelledby="seller-top-title">
          <div className="panel-head">
            <div>
              <h2 id="seller-top-title">판매 TOP 상품</h2>
              <p>{periodLabel} 기준 판매 실적</p>
            </div>
          </div>
          <div className="mini-table seller-dashboard-top-table">
            <div className="mini-head">
              <span>상품명</span>
              <span>예약건수</span>
              <span>판매인원</span>
              <span>판매금액</span>
            </div>
            {topProducts.length === 0 ? (
              <div className="seller-dashboard-empty seller-dashboard-empty--block">
                판매 실적이 없습니다.
              </div>
            ) : (
              topProducts.map((item, index) => (
                <div key={item.productName} className="seller-dashboard-top-row">
                  <strong>
                    <em>{index + 1}</em>
                    {item.productName}
                  </strong>
                  <span>{formatSellerDashboardCount(item.reservationCount, "건")}</span>
                  <span>{formatSellerDashboardCount(item.paxCount, "명")}</span>
                  <span>{formatSellerDashboardAmount(item.salesAmount)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
