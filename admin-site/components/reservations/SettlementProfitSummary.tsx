"use client";

import type { SettlementMoneyValue, SettlementProfitView } from "@/lib/admin/reservation-settlement-profit";

function MoneyCell({ value, emphasize = false, lossAware = false }: { value: SettlementMoneyValue; emphasize?: boolean; lossAware?: boolean }) {
  if (value.kind === "unavailable") {
    return <strong className="settlement-profit-muted">{value.label}</strong>;
  }
  const isLoss = lossAware && value.value < 0;
  return (
    <strong className={`${emphasize ? "settlement-profit-emphasis" : ""} ${isLoss ? "settlement-profit-loss" : ""}`.trim()}>
      {value.label}
    </strong>
  );
}

export function SettlementProfitSummary({ profit }: { profit: SettlementProfitView }) {
  return (
    <section className="panel member-web-detail-card settlement-profit-card">
      <div className="member-web-detail-card-head">
        <strong>정산 손익</strong>
        <span className={`badge ${profit.status === "held" ? "warn" : profit.status === "cost_confirmed" ? "success" : "info"}`}>
          {profit.statusLabel}
        </span>
      </div>

      <p className="settlement-sales-data-note">{profit.stateNote}</p>
      <p className="settlement-sales-data-note">{profit.cashNote}</p>

      {profit.holdReasons.length ? (
        <div className="settlement-profit-hold">
          <strong>확인 필요 항목</strong>
          <ul>
            {profit.holdReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {profit.attributionNotes.length ? (
        <div className="settlement-profit-basis">
          <strong>매출 귀속 근거</strong>
          <ul>
            {profit.attributionNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="settlement-profit-grid">
        <div className="settlement-profit-block">
          <h4>매출 · 수납</h4>
          <dl>
            <div>
              <dt>고객 총판매액</dt>
              <dd>
                <MoneyCell value={profit.customerTotalSales} />
              </dd>
            </div>
            <div>
              <dt>여행사 정산 귀속매출</dt>
              <dd>
                <MoneyCell value={profit.attributableRevenue} emphasize />
              </dd>
            </div>
            <div>
              <dt>고객 순수납액</dt>
              <dd>
                <MoneyCell value={profit.netReceived} />
              </dd>
            </div>
            <div>
              <dt>고객 미수금</dt>
              <dd>
                <MoneyCell value={profit.unpaid} />
              </dd>
            </div>
          </dl>
        </div>

        <div className="settlement-profit-block">
          <h4>비용</h4>
          <dl>
            <div>
              <dt>예약 직접비용</dt>
              <dd>
                <MoneyCell value={profit.directCost} />
              </dd>
            </div>
            <div>
              <dt>행사 공통비용</dt>
              <dd>
                <MoneyCell value={profit.commonCost} />
              </dd>
            </div>
            <div>
              <dt>기타 별도비용</dt>
              <dd>
                <MoneyCell value={profit.otherSeparateCost} />
              </dd>
            </div>
            <div>
              <dt>총 지출금액</dt>
              <dd>
                <MoneyCell value={profit.totalCost} emphasize />
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="settlement-profit-result">
        <div>
          <span>정산 손익</span>
          <MoneyCell value={profit.profit} emphasize lossAware />
        </div>
        <div>
          <span>이익률</span>
          <strong className={profit.marginLabel === "계산 불가" ? "settlement-profit-muted" : ""}>{profit.marginLabel}</strong>
        </div>
      </div>
    </section>
  );
}
