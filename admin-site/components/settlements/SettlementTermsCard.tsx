"use client";

import { useState } from "react";
import { AlertTriangle, Lock } from "lucide-react";
import type { ReservationActor } from "@/lib/admin/reservations-data";
import { formatReservationTimestamp } from "@/lib/admin/reservations-data";
import {
  formatWon,
  isValidRate,
  previewSettlementRates,
  updateSettlementTerms,
  type SettlementRecord,
} from "@/lib/admin/settlement-data";

/** 정산 조건: 공유조건에서 넘어온 기준(읽기 전용) + 정산대기 상태에서만 수수료율 Mock 수정 */
export function SettlementTermsCard({
  record,
  editable,
  actor,
  onSaved,
}: {
  record: SettlementRecord;
  editable: boolean;
  actor: ReservationActor;
  onSaved: (changed: boolean) => void;
}) {
  const hasSeller = record.sourceType === "seller";
  const [affiliateRate, setAffiliateRate] = useState(String(record.settlement.affiliateCommissionRate));
  const [sellerRate, setSellerRate] = useState(String(record.settlement.sellerCommissionRate ?? 0));
  const affiliateValue = Number(affiliateRate);
  const sellerValue = hasSeller ? Number(sellerRate) : 0;
  const rateError =
    affiliateRate.trim() === "" || !isValidRate(affiliateValue) || (hasSeller && (sellerRate.trim() === "" || !isValidRate(sellerValue)));
  const preview = rateError
    ? null
    : previewSettlementRates(record, { affiliateCommissionRate: affiliateValue, sellerCommissionRate: sellerValue });
  const dirty =
    affiliateValue !== record.settlement.affiliateCommissionRate ||
    (hasSeller && sellerValue !== (record.settlement.sellerCommissionRate ?? 0));

  const save = () => {
    if (rateError) return;
    const changed = updateSettlementTerms(
      record,
      { affiliateCommissionRate: affiliateValue, sellerCommissionRate: hasSeller ? sellerValue : undefined },
      actor,
      formatReservationTimestamp(new Date()),
    );
    onSaved(changed);
  };

  return (
    <section className="panel member-web-detail-card settlement-terms-card">
      <div className="member-web-detail-card-head">
        <strong>정산 조건</strong>
        {editable ? (
          <span className="badge success">정산대기 · 수수료율 수정 가능</span>
        ) : (
          <span className="badge gray">
            <Lock size={10} /> 읽기 전용
          </span>
        )}
      </div>
      <div className="settlement-terms-body">
        <div className="member-web-detail-info-grid">
          <label className="member-web-detail-field settlement-rate-field">
            <span>판매수수료율</span>
            {editable ? (
              <span className="settlement-rate-input">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  aria-label="판매수수료율"
                  value={affiliateRate}
                  onChange={(event) => setAffiliateRate(event.target.value)}
                />
                %
              </span>
            ) : (
              <strong>{record.breakdown.affiliateCommissionRate}%</strong>
            )}
          </label>
          {hasSeller && (
            <label className="member-web-detail-field settlement-rate-field">
              <span>판매점 수수료율</span>
              {editable ? (
                <span className="settlement-rate-input">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    aria-label="판매점 수수료율"
                    value={sellerRate}
                    onChange={(event) => setSellerRate(event.target.value)}
                  />
                  %
                </span>
              ) : (
                <strong>{record.breakdown.sellerCommissionRate}%</strong>
              )}
            </label>
          )}
          <div className="member-web-detail-field">
            <span>정산방식</span>
            <strong>{record.settlement.method}</strong>
          </div>
          <div className="member-web-detail-field">
            <span>정산주기</span>
            <strong>{record.settlement.cycle}</strong>
          </div>
          <div className="member-web-detail-field">
            <span>결제주체</span>
            <strong>{record.settlement.payer}</strong>
          </div>
          <div className="member-web-detail-field">
            <span>정산예정일</span>
            <strong>{record.settlement.dueDate}</strong>
          </div>
        </div>
        {editable && (
          <div className="settlement-terms-footer">
            {rateError ? (
              <p className="product-share-setting-alert" role="alert">
                <AlertTriangle size={13} />
                수수료율은 0~100% 사이로 입력해주세요.
              </p>
            ) : (
              preview && (
                <p className={preview.warnings.length ? "product-share-setting-alert" : "product-share-setting-help"}>
                  {preview.warnings.length > 0 && <AlertTriangle size={13} />}
                  {preview.warnings.length
                    ? preview.warnings[0]
                    : `적용 시 수수료 ${formatWon(preview.totalCommission)} · 공급사 정산액 ${formatWon(preview.supplierAmount)}`}
                </p>
              )
            )}
            <button type="button" className="primary" disabled={rateError || !dirty} onClick={save}>
              정산조건 저장
            </button>
          </div>
        )}
        <p className="product-share-setting-help">공유조건에서 넘어온 정산 기준입니다. (SAMPLE · 공급가/고정마진 방식 미지원)</p>
      </div>
    </section>
  );
}
