"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import type { SettlementDocumentDraftView, SettlementTargetReservation } from "@/lib/admin/reservation-settlement-draft";
import type { SettlementExpenseLine } from "@/lib/admin/reservation-settlement-expenses";
import { buildSettlementProfitView } from "@/lib/admin/reservation-settlement-profit";
import type { SettlementRosterView } from "@/lib/admin/reservation-settlement-roster";
import type { MoneyDisplay, SettlementSalesFinanceView } from "@/lib/admin/reservation-settlement-sales";
import { SettlementExpensePanel } from "@/components/reservations/SettlementExpensePanel";
import { SettlementProfitSummary } from "@/components/reservations/SettlementProfitSummary";

function PlaceholderPanel({ title, note = "다음 단계에서 연동 예정" }: { title: string; note?: string }) {
  return (
    <section className="panel member-web-detail-card settlement-doc-draft-panel">
      <div className="member-web-detail-card-head">
        <strong>{title}</strong>
      </div>
      <p className="settlement-doc-draft-placeholder">{note}</p>
    </section>
  );
}

function MoneyValue({ value, tone }: { value: MoneyDisplay; tone?: "due" | "over" | "net" }) {
  if (value.kind === "needs_review") {
    return <strong className="settlement-sales-kpi-review">{value.label}</strong>;
  }
  return <strong className={tone ? `settlement-sales-kpi-${tone}` : undefined}>{value.label}</strong>;
}

export function SettlementDocumentHeader({ view }: { view: SettlementDocumentDraftView }) {
  return (
    <section className="panel member-web-detail-card settlement-doc-draft-header">
      <div className="member-web-detail-card-head">
        <strong>상품 정산서</strong>
        <span className={`badge ${view.method === "individual" ? "info" : "warn"}`}>{view.methodLabel}</span>
      </div>
      <div className="member-web-detail-info-grid settlement-doc-draft-info-grid">
        {[
          ["정산구분", view.methodLabel],
          ["상품명", view.productName || "-"],
          ["상품코드", view.productCode || "-"],
          ["출발일", view.departureAt || "-"],
          ["예약건수", `${view.reservationCount}건`],
          ["총 예약인원", `${view.totalPeopleCount}명`],
          ["원본 예약번호", view.sourceReservationCode],
          ["묶음 기준", view.roundKeyLabel || "-"],
        ].map(([label, value]) => (
          <div key={label} className="member-web-detail-field">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SettlementReservationList({
  targets,
  reservationHref,
}: {
  targets: SettlementTargetReservation[];
  reservationHref?: (code: string) => string;
}) {
  return (
    <section className="panel member-web-detail-card">
      <div className="member-web-detail-card-head">
        <strong>정산 대상 예약 목록</strong>
        <span className="badge gray">{targets.length}건</span>
      </div>
      <div className="member-web-table-wrap">
        <table className="member-web-table settlement-doc-draft-table">
          <thead>
            <tr>
              {["예약번호", "예약자명", "예약인원", "예약상태", "상품코드", "출발일"].map((title) => (
                <th key={title}>{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {targets.length ? (
              targets.map((item) => (
                <tr key={item.code} className={item.isSource ? "is-source-reservation" : undefined}>
                  <td className="member-number">
                    {reservationHref ? (
                      <Link href={reservationHref(item.code)} className="reservation-code-link">
                        {item.code}
                      </Link>
                    ) : (
                      item.code
                    )}
                    {item.isSource ? <span className="settlement-doc-draft-source-tag">선택</span> : null}
                  </td>
                  <td className="member-name">
                    <b>{item.bookerName || "-"}</b>
                  </td>
                  <td>{item.peopleLabel}</td>
                  <td>{item.reserveStatus || "-"}</td>
                  <td>{item.productCode || "-"}</td>
                  <td className="date-cell">{item.departureAt || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <div className="member-web-empty">
                    <strong>표시할 정산 대상 예약이 없습니다.</strong>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SettlementSalesFinanceSection({
  sales,
  reservationHref,
}: {
  sales: SettlementSalesFinanceView;
  reservationHref?: (code: string) => string;
}) {
  return (
    <>
      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>매출·입금 요약</strong>
          <span className="badge gray">고객 판매금액 기준</span>
        </div>
        <p className="settlement-sales-data-note">{sales.dataNote}</p>
        <div className="settlement-sales-kpi-grid">
          <article className="member-web-detail-kpi">
            <span>
              <small>총판매금액</small>
              <MoneyValue value={sales.totalSales} />
            </span>
          </article>
          <article className="member-web-detail-kpi">
            <span>
              <small>순수납액</small>
              <MoneyValue value={sales.netReceived} tone="net" />
            </span>
          </article>
          <article className="member-web-detail-kpi">
            <span>
              <small>미수금</small>
              <MoneyValue value={sales.unpaid} tone="due" />
            </span>
          </article>
          <article className="member-web-detail-kpi">
            <span>
              <small>초과수납액</small>
              <MoneyValue value={sales.overpaid} tone="over" />
            </span>
          </article>
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>예약별 입금내역</strong>
          <span className="badge gray">{sales.deposits.length}건</span>
        </div>
        {sales.deposits.length ? (
          <div className="member-web-table-wrap">
            <table className="member-web-table settlement-doc-draft-table settlement-sales-deposit-table">
              <thead>
                <tr>
                  {["예약번호", "입금일", "결제수단", "입금자·결제자", "거래금액", "거래상태"].map((title) => (
                    <th key={title}>{title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.deposits.map((row) => (
                  <tr key={row.id} className={row.kind === "refund" ? "is-refund-row" : undefined}>
                    <td className="member-number">
                      {reservationHref ? (
                        <Link href={reservationHref(row.reservationCode)} className="reservation-code-link">
                          {row.reservationCode}
                        </Link>
                      ) : (
                        row.reservationCode
                      )}
                    </td>
                    <td className="date-cell">{row.paidAt || "-"}</td>
                    <td>{row.method || "-"}</td>
                    <td>{row.payer || "-"}</td>
                    <td className={`amount-cell${row.kind === "refund" ? " is-refund" : ""}`}>
                      {row.kind === "refund" ? `-${row.amountLabel}` : row.amountLabel}
                    </td>
                    <td>
                      <span className={`badge ${row.kind === "refund" ? "gray" : row.status === "결제완료" ? "success" : "warn"}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="member-web-detail-empty">
            {sales.depositEmptyReason === "unavailable"
              ? "입금내역을 조회할 수 없습니다."
              : "입금내역 없음"}
          </div>
        )}
      </section>
    </>
  );
}

export function SettlementRosterSection({
  roster,
  reservationHref,
}: {
  roster: SettlementRosterView;
  reservationHref?: (code: string) => string;
}) {
  return (
    <section className="panel member-web-detail-card">
      <div className="member-web-detail-card-head">
        <strong>고객명단</strong>
        <span className="badge gray">
          예약 {roster.reservationCount}건 · 명단 {roster.listedPeopleCount}명 / 예약인원 {roster.expectedPeopleCount}명
        </span>
        {roster.headcountStatus !== "ok" ? (
          <span className={`badge ${roster.headcountStatus === "unavailable" ? "danger" : "warn"}`}>
            {roster.headcountLabel}
          </span>
        ) : (
          <span className="badge success">{roster.headcountLabel}</span>
        )}
      </div>
      <p className="settlement-sales-data-note">{roster.dataNote}</p>

      {roster.rows.length ? (
        <div className="member-web-table-wrap">
          <table className="member-web-table settlement-doc-draft-table settlement-roster-table">
            <thead>
              <tr>
                <th>번호</th>
                <th>예약번호</th>
                <th>예약자명</th>
                <th>여행자명</th>
                <th>인원구분</th>
                <th>성별</th>
                <th>생년월일</th>
                <th>연락처</th>
                <th>탑승지</th>
                {roster.showPassportColumns ? (
                  <>
                    <th>영문명</th>
                    <th>여권상태</th>
                    <th>여권만료일</th>
                  </>
                ) : null}
                <th>부가정보</th>
              </tr>
            </thead>
            <tbody>
              {roster.rows.map((row, index) => (
                <tr key={row.id}>
                  <td className="center">{index + 1}</td>
                  <td className="member-number">
                    {reservationHref ? (
                      <Link href={reservationHref(row.reservationCode)} className="reservation-code-link">
                        {row.reservationCode}
                      </Link>
                    ) : (
                      row.reservationCode
                    )}
                  </td>
                  <td>{row.bookerName || "-"}</td>
                  <td className="member-name">
                    <b>{row.travelerName || "-"}</b>
                    {row.role === "booker" ? <span className="settlement-doc-draft-source-tag">예약자</span> : null}
                  </td>
                  <td>{row.personType}</td>
                  <td>{row.gender || "-"}</td>
                  <td className="date-cell">{row.birthDate || "-"}</td>
                  <td>{row.phone || "-"}</td>
                  <td>{row.boardingPoint || "-"}</td>
                  {roster.showPassportColumns ? (
                    <>
                      <td>{row.passportEnglishName || "미등록"}</td>
                      <td>
                        <span className="badge gray">{row.passportStatus}</span>
                      </td>
                      <td>{row.passportExpiry || "미등록"}</td>
                    </>
                  ) : null}
                  <td>
                    <details className="settlement-roster-details">
                      <summary>보기</summary>
                      <dl>
                        <div>
                          <dt>구분</dt>
                          <dd>{row.role === "booker" ? "예약자" : "동행 여행자"}</dd>
                        </div>
                        <div>
                          <dt>성별</dt>
                          <dd>{row.gender || "데이터 없음"}</dd>
                        </div>
                        <div>
                          <dt>생년월일</dt>
                          <dd>{row.birthDate || "데이터 없음"}</dd>
                        </div>
                        <div>
                          <dt>연락처</dt>
                          <dd>{row.phone || "데이터 없음"}</dd>
                        </div>
                        <div>
                          <dt>탑승지</dt>
                          <dd>{row.boardingPoint || "데이터 없음"}</dd>
                        </div>
                        {roster.showPassportColumns ? (
                          <>
                            <div>
                              <dt>여권 영문명</dt>
                              <dd>{row.passportEnglishName || "미등록"}</dd>
                            </div>
                            <div>
                              <dt>여권 상태</dt>
                              <dd>{row.passportStatus}</dd>
                            </div>
                            <div>
                              <dt>여권 만료일</dt>
                              <dd>{row.passportExpiry || "미등록"}</dd>
                            </div>
                            <div>
                              <dt>여권번호</dt>
                              <dd>정산서 미표시</dd>
                            </div>
                          </>
                        ) : null}
                      </dl>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="member-web-detail-empty">
          {roster.emptyReason === "unavailable" ? "고객명단을 조회할 수 없습니다." : "등록된 고객명단이 없습니다."}
        </div>
      )}
    </section>
  );
}

export function SettlementDocumentFutureSections() {
  return <PlaceholderPanel title="입금·결제·지출전표 상세" />;
}

export function SettlementDocumentShell({
  view,
  sales,
  roster,
  expenses,
  onExpensesChange,
  reservationHref,
  actions,
}: {
  view: SettlementDocumentDraftView;
  sales: SettlementSalesFinanceView;
  roster: SettlementRosterView;
  expenses: SettlementExpenseLine[];
  onExpensesChange: (next: SettlementExpenseLine[]) => void;
  reservationHref?: (code: string) => string;
  actions?: ReactNode;
}) {
  const profit = useMemo(
    () =>
      buildSettlementProfitView({
        draft: view,
        expenses,
        sales,
      }),
    [view, expenses, sales],
  );

  return (
    <div className="member-web-detail-stack settlement-doc-draft-stack">
      {actions}
      <SettlementDocumentHeader view={view} />
      <SettlementReservationList targets={view.targets} reservationHref={reservationHref} />
      <SettlementSalesFinanceSection sales={sales} reservationHref={reservationHref} />
      <SettlementRosterSection roster={roster} reservationHref={reservationHref} />
      <SettlementExpensePanel
        method={view.method}
        sourceReservationCode={view.sourceReservationCode}
        targetCodes={view.targets.map((item) => item.code)}
        eventKey={view.roundKeyLabel}
        productName={view.productName}
        departureAt={view.departureAt}
        expenses={expenses}
        onChange={onExpensesChange}
      />
      <SettlementProfitSummary profit={profit} />
      <SettlementDocumentFutureSections />
    </div>
  );
}
