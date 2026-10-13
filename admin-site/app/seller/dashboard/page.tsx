"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import {
  SELLER_DASHBOARD_DEFAULT_PERIOD,
  SELLER_DASHBOARD_PERIODS,
  SELLER_DASHBOARD_SCENARIOS,
  formatSellerDashboardAmount,
  formatSellerDashboardCount,
  formatSellerDashboardDate,
  getSellerDashboardPeriod,
  getSellerDashboardSnapshot,
  sellerDashboardStatusBadgeClass,
  sumSellerDashboardPerformance,
  sumSellerDashboardProducts,
  sumSellerDashboardSettlement,
  supplierProductTotal,
  supplierTradeBadgeClass,
  type SellerDashboardPeriodKey,
  type SellerDashboardScenarioKey,
} from "@/lib/seller/seller-dashboard-data";
import { SELLER_ADMIN_BASE_PATH } from "@/lib/seller/navigation";
import { useSellerSession } from "@/lib/seller/use-seller-session";

export default function SellerDashboardPage() {
  const session = useSellerSession();
  const sellerId = session?.sellerId ?? SELLER_ADMIN_DEMO_PROFILE.sellerId;
  const sellerName = session?.sellerName ?? SELLER_ADMIN_DEMO_PROFILE.sellerName;
  const [periodKey, setPeriodKey] = useState<SellerDashboardPeriodKey>(SELLER_DASHBOARD_DEFAULT_PERIOD);
  const [scenarioKey, setScenarioKey] = useState<SellerDashboardScenarioKey>("normal");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const notify = (message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  };

  const snapshot = useMemo(() => getSellerDashboardSnapshot(sellerId, scenarioKey), [sellerId, scenarioKey]);
  const { suppliers, supplierSummary, recentReservations, checkItems } = snapshot;
  const period = getSellerDashboardPeriod(periodKey);
  const performance = sumSellerDashboardPerformance(suppliers, periodKey);
  const products = sumSellerDashboardProducts(suppliers);
  const settlement = sumSellerDashboardSettlement(suppliers);
  const settlementSuppliers = suppliers.filter((supplier) => supplier.settlement);
  const pendingSuppliers = suppliers.filter((supplier) => supplier.status === "승인대기");
  const maxProductCount = Math.max(1, ...suppliers.map(supplierProductTotal));
  const reservationDiff = performance.reservationCount - performance.previousReservationCount;

  const addSupplier = () => notify("공급여행사 추가 가입 기능은 다음 단계에서 제공됩니다.");

  return (
    <div className="seller-dashboard">
      <section className="page-head seller-dash-head">
        <div>
          <h1>대시보드</h1>
          <p>{sellerName}의 판매현황과 공급여행사별 운영현황을 확인합니다.</p>
        </div>
        <div className="seller-dash-head-tools">
          <span className="seller-dash-basis">전체 공급여행사 기준</span>
          <div className="segmented" role="group" aria-label="조회기간">
            {SELLER_DASHBOARD_PERIODS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={item.key === periodKey ? "active" : ""}
                aria-pressed={item.key === periodKey}
                onClick={() => setPeriodKey(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="kpi-grid seller-dashboard-kpi" aria-label="판매점 전체 실적">
        <article className="kpi">
          <span className="kpi-icon">▤</span>
          <span className="kpi-copy">
            <small>{period.reservationLabel}</small>
            <strong>{formatSellerDashboardCount(performance.reservationCount, "건")}</strong>
            <em className={reservationDiff > 0 ? "up" : undefined}>
              {period.compareLabel} {reservationDiff >= 0 ? "+" : ""}
              {formatSellerDashboardCount(reservationDiff, "건")}
            </em>
          </span>
        </article>
        <article className="kpi">
          <span className="kpi-icon">₩</span>
          <span className="kpi-copy">
            <small>{period.salesLabel}</small>
            <strong>{formatSellerDashboardAmount(performance.salesAmount)}</strong>
            <em>예약 판매가 기준</em>
          </span>
        </article>
        <article className="kpi">
          <span className="kpi-icon seller-dash-kpi-icon--profit">＋</span>
          <span className="kpi-copy">
            <small>예상 수익</small>
            <strong>{formatSellerDashboardAmount(performance.expectedProfit)}</strong>
            <em>수수료 + 입금가 마진</em>
          </span>
        </article>
        <article className="kpi">
          <span className="kpi-icon warn">⇄</span>
          <span className="kpi-copy">
            <small>공급여행사 정산 예정</small>
            <strong>{formatSellerDashboardAmount(settlement.pending)}</strong>
            <em>공급여행사 지급 예정 금액</em>
          </span>
        </article>
      </section>
      <p className="seller-dash-kpi-note">
        <span><b>판매금액</b> 고객에게 판매한 최종 판매금액</span>
        <span><b>예상 수익</b> 수수료형은 수수료, 입금가형은 판매가 − 입금가</span>
        <span><b>공급여행사 정산 예정</b> 판매점이 공급여행사에 지급할 금액</span>
      </p>

      <div className="seller-dash-row seller-dash-row--top">
        <section className="panel seller-dash-panel" aria-labelledby="seller-dash-supplier-title">
          <div className="panel-head">
            <div>
              <h2 id="seller-dash-supplier-title">공급여행사 현황</h2>
              <p>공급여행사별 거래상태는 서로 독립적으로 관리됩니다.</p>
            </div>
            <button type="button" className="secondary seller-dash-head-btn" onClick={addSupplier}>
              + 공급여행사 추가
            </button>
          </div>

          <dl className="seller-dash-stats">
            <div>
              <dt>가입 공급여행사</dt>
              <dd>{formatSellerDashboardCount(supplierSummary.total, "곳")}</dd>
            </div>
            <div>
              <dt>정상</dt>
              <dd>{formatSellerDashboardCount(supplierSummary.normal, "곳")}</dd>
            </div>
            <div>
              <dt>승인대기</dt>
              <dd>{formatSellerDashboardCount(supplierSummary.pending, "곳")}</dd>
            </div>
            <div className={supplierSummary.suspended > 0 ? "is-danger" : undefined}>
              <dt>이용중지</dt>
              <dd>{formatSellerDashboardCount(supplierSummary.suspended, "곳")}</dd>
            </div>
          </dl>

          {suppliers.length === 0 ? (
            <div className="seller-dash-empty">
              <p>가입된 공급여행사가 없습니다.</p>
              <button type="button" className="primary seller-dash-head-btn" onClick={addSupplier}>
                공급여행사 추가
              </button>
            </div>
          ) : (
            <ul className="seller-dash-suppliers">
              {suppliers.map((supplier) => {
                const row = supplier.performance?.[periodKey];
                const isPending = supplier.status === "승인대기";
                return (
                  <li key={supplier.supplierId} className={`is-${supplier.status === "정상" ? "normal" : isPending ? "pending" : "suspended"}`}>
                    <div className="seller-dash-supplier-name">
                      <strong>{supplier.supplierName}</strong>
                      <span className={`badge ${supplierTradeBadgeClass(supplier.status)}`}>{supplier.status}</span>
                      {isPending ? <small>가입 승인 대기 중</small> : null}
                      {supplier.status === "이용중지" ? (
                        <small className="is-danger">현재 이 공급여행사의 상품은 판매할 수 없습니다.</small>
                      ) : null}
                    </div>
                    <div className="seller-dash-supplier-metric">
                      <span>판매상품</span>
                      <b>{isPending ? "-" : formatSellerDashboardCount(supplierProductTotal(supplier), "개")}</b>
                    </div>
                    <div className="seller-dash-supplier-metric">
                      <span>{period.reservationLabel}</span>
                      <b>{row ? formatSellerDashboardCount(row.reservationCount, "건") : "-"}</b>
                    </div>
                    <div className="seller-dash-supplier-metric">
                      <span>{period.salesLabel.replace("판매금액", "판매")}</span>
                      <b>{row ? formatSellerDashboardAmount(row.salesAmount) : "-"}</b>
                    </div>
                    <button
                      type="button"
                      className="text-btn seller-dash-link"
                      onClick={() => notify("공급여행사 관리는 다음 단계에서 제공됩니다.")}
                      aria-label={`${supplier.supplierName} 상세보기`}
                    >
                      상세보기
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel seller-dash-panel" aria-labelledby="seller-dash-check-title">
          <div className="panel-head">
            <div>
              <h2 id="seller-dash-check-title">확인이 필요한 항목</h2>
              <p>처리가 필요한 업무를 확인합니다.</p>
            </div>
          </div>
          {checkItems.length === 0 ? (
            <div className="seller-dash-empty">
              <p>확인이 필요한 항목이 없습니다.</p>
            </div>
          ) : (
            <ul className="seller-dash-checks">
              {checkItems.map((item) => (
                <li key={item.key}>
                  <span>{item.label}</span>
                  <span className={`badge ${item.tone}`}>{formatSellerDashboardCount(item.count, item.unit)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel seller-dash-panel" aria-labelledby="seller-dash-recent-title">
        <div className="panel-head">
          <div>
            <h2 id="seller-dash-recent-title">최근 예약</h2>
            <p>전체 공급여행사 상품의 최근 판매점 예약입니다.</p>
          </div>
          <Link href={`${SELLER_ADMIN_BASE_PATH}/reservations`} className="text-btn seller-dash-link">
            전체보기 →
          </Link>
        </div>
        {recentReservations.length === 0 ? (
          <div className="seller-dash-empty">
            <p>최근 예약이 없습니다.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="seller-dash-table">
              <thead>
                <tr>
                  <th>예약번호</th>
                  <th>예약일</th>
                  <th>공급여행사</th>
                  <th>상품명</th>
                  <th>예약자</th>
                  <th>인원</th>
                  <th className="money">판매금액</th>
                  <th>예약상태</th>
                </tr>
              </thead>
              <tbody>
                {recentReservations.map((row) => (
                  <tr key={row.reservationCode}>
                    <td data-label="예약번호">
                      <b className="seller-dash-code">{row.reservationCode}</b>
                    </td>
                    <td data-label="예약일">{formatSellerDashboardDate(row.reservedAt)}</td>
                    <td data-label="공급여행사">
                      <span className="seller-dash-supplier-chip">{row.supplierName}</span>
                    </td>
                    <td data-label="상품명" className="product-cell">
                      {row.productName}
                    </td>
                    <td data-label="예약자">{row.customerName}</td>
                    <td data-label="인원">{formatSellerDashboardCount(row.pax, "명")}</td>
                    <td data-label="판매금액" className="money">
                      {formatSellerDashboardAmount(row.salesAmount)}
                    </td>
                    <td data-label="예약상태">
                      <span className={`badge ${sellerDashboardStatusBadgeClass(row.status)}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="seller-dash-row seller-dash-row--bottom">
        <section className="panel seller-dash-panel" aria-labelledby="seller-dash-product-title">
          <div className="panel-head">
            <div>
              <h2 id="seller-dash-product-title">판매상품 현황</h2>
              <p>설정대기: 판매가 등 판매점 설정이 아직 완료되지 않은 상품</p>
            </div>
          </div>
          <dl className="seller-dash-stats">
            <div>
              <dt>전체 판매상품</dt>
              <dd>{formatSellerDashboardCount(products.total, "개")}</dd>
            </div>
            <div className="is-success">
              <dt>판매중</dt>
              <dd>{formatSellerDashboardCount(products.onSale, "개")}</dd>
            </div>
            <div className="is-warn">
              <dt>설정대기</dt>
              <dd>{formatSellerDashboardCount(products.setupPending, "개")}</dd>
            </div>
            <div className="is-danger">
              <dt>판매중지</dt>
              <dd>{formatSellerDashboardCount(products.stopped, "개")}</dd>
            </div>
          </dl>
          {products.total === 0 ? (
            <div className="seller-dash-empty">
              <p>판매 가능한 상품이 없습니다.</p>
            </div>
          ) : (
            <ul className="seller-dash-bars" aria-label="공급여행사별 판매상품">
              {suppliers.map((supplier) => {
                const stats = supplier.productStats;
                const total = supplierProductTotal(supplier);
                return (
                  <li key={supplier.supplierId}>
                    <div className="seller-dash-bar-head">
                      <strong>{supplier.supplierName}</strong>
                      <b>{formatSellerDashboardCount(total, "개")}</b>
                    </div>
                    <div className="seller-dash-bar" aria-hidden="true">
                      {stats ? (
                        <>
                          <i className="is-sale" style={{ width: `${(stats.onSale / maxProductCount) * 100}%` }} />
                          <i className="is-setup" style={{ width: `${(stats.setupPending / maxProductCount) * 100}%` }} />
                          <i className="is-stop" style={{ width: `${(stats.stopped / maxProductCount) * 100}%` }} />
                        </>
                      ) : null}
                    </div>
                    <small>
                      {stats
                        ? `판매중 ${stats.onSale} · 설정대기 ${stats.setupPending} · 판매중지 ${stats.stopped}`
                        : `${supplier.status} · 판매상품 없음`}
                    </small>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel seller-dash-panel" aria-labelledby="seller-dash-settle-title">
          <div className="panel-head">
            <div>
              <h2 id="seller-dash-settle-title">정산 현황</h2>
              <p>판매점이 공급여행사에 지급할 정산 금액입니다. 판매점 수익은 ‘예상 수익’으로 별도 표시합니다.</p>
            </div>
            <Link href={`${SELLER_ADMIN_BASE_PATH}/settlements`} className="text-btn seller-dash-link">
              정산관리 →
            </Link>
          </div>
          {settlementSuppliers.length === 0 ? (
            <div className="seller-dash-empty">
              <p>정산 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="seller-dash-table seller-dash-table--settle">
                <thead>
                  <tr>
                    <th>공급여행사</th>
                    <th className="money">공급여행사 정산 예정</th>
                    <th className="money">정산확정</th>
                    <th className="money">지급완료</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementSuppliers.map((supplier) => (
                    <tr key={supplier.supplierId}>
                      <td data-label="공급여행사">
                        <span className="seller-dash-settle-name">
                          <strong>{supplier.supplierName}</strong>
                          {supplier.status !== "정상" ? (
                            <span className={`badge ${supplierTradeBadgeClass(supplier.status)}`}>{supplier.status}</span>
                          ) : null}
                        </span>
                      </td>
                      <td data-label="공급여행사 정산 예정" className="money">
                        {formatSellerDashboardAmount(supplier.settlement?.pending ?? 0)}
                      </td>
                      <td data-label="정산확정" className="money">
                        {formatSellerDashboardAmount(supplier.settlement?.confirmed ?? 0)}
                      </td>
                      <td data-label="지급완료" className="money">
                        {formatSellerDashboardAmount(supplier.settlement?.paid ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td data-label="구분">합계</td>
                    <td data-label="공급여행사 정산 예정" className="money">
                      {formatSellerDashboardAmount(settlement.pending)}
                    </td>
                    <td data-label="정산확정" className="money">
                      {formatSellerDashboardAmount(settlement.confirmed)}
                    </td>
                    <td data-label="지급완료" className="money">
                      {formatSellerDashboardAmount(settlement.paid)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          {pendingSuppliers.length > 0 ? (
            <p className="seller-dash-foot">
              승인대기 공급여행사({pendingSuppliers.map((supplier) => supplier.supplierName).join(", ")})는 정산 대상에서 제외됩니다.
            </p>
          ) : null}
        </section>
      </div>

      <fieldset className="seller-dash-mock">
        <legend>프로토타입 Mock 시나리오</legend>
        <div role="radiogroup" aria-label="대시보드 Mock 시나리오">
          {SELLER_DASHBOARD_SCENARIOS.map((item) => (
            <label key={item.key} className={item.key === scenarioKey ? "is-selected" : undefined}>
              <input
                type="radio"
                name="seller-dashboard-scenario"
                value={item.key}
                checked={item.key === scenarioKey}
                onChange={() => setScenarioKey(item.key)}
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      {toast ? (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
