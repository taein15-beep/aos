"use client";

import { AlertTriangle, Download, Lock } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { SellerModalFrame } from "@/components/seller/SellerSupplierJoinDialogs";
import {
  formatSellerSettlementAmount as won,
  formatSellerSettlementSigned as signed,
  type SellerSettlement,
  type SellerSettlementDocument,
} from "@/lib/admin/seller-channel-settlements";
import { formatSellerReservationDateTime } from "@/lib/seller/seller-reservations-data";
import { supplierLogoText } from "@/lib/seller/seller-suppliers-data";

export const SELLER_SETTLEMENT_PDF_MOCK = "정산서 PDF 다운로드 기능은 다음 연동 단계에서 제공됩니다.";

function dotted(value: string) {
  return value.replace(/-/g, ".");
}

function DocField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function SettlementDocument({ settlement, doc, sellerName }: { settlement: SellerSettlement; doc: SellerSettlementDocument; sellerName: string }) {
  const adjustment = doc.amount - doc.principal;
  return (
    <article className="invoice-document" aria-label={`${settlement.code} v${doc.version} 정산서`}>
      <header className="invoice-document-head">
        <div className="invoice-document-brand">
          <span className="seller-relation-logo is-large" aria-hidden="true">
            {supplierLogoText(settlement.supplierName)}
          </span>
          <div>
            <strong>{settlement.supplierName}</strong>
            <small>{settlement.supplierCode}</small>
          </div>
        </div>
        <div className="invoice-document-title">
          <h4>SETTLEMENT</h4>
          <p>판매점 수익 정산서</p>
        </div>
      </header>

      <dl className="invoice-document-meta">
        <DocField label="정산번호">{settlement.code}</DocField>
        <DocField label="Version">v{doc.version}</DocField>
        <DocField label="발행일">{formatSellerReservationDateTime(doc.issuedAt)}</DocField>
        <DocField label="정산기간">
          {dotted(settlement.periodFrom)} ~ {dotted(settlement.periodTo)}
        </DocField>
      </dl>

      <div className="invoice-document-parties">
        <section aria-label="지급">
          <h5>지급 (공급여행사)</h5>
          <dl>
            <DocField label="상호">
              {settlement.supplierName} <small>{settlement.supplierCode}</small>
            </DocField>
            <DocField label="발행">{doc.issuedBy}</DocField>
          </dl>
        </section>
        <section aria-label="수령">
          <h5>수령 (판매점)</h5>
          <dl>
            <DocField label="상호">
              {sellerName} <small>{settlement.sellerId}</small>
            </DocField>
            <DocField label="정산차수">{settlement.label}</DocField>
          </dl>
        </section>
      </div>

      <section className="invoice-document-section" aria-label="정산금액">
        <h5>정산금액</h5>
        <dl className="invoice-document-total">
          <DocField label="예약건수">{doc.reservationCount}건</DocField>
          <DocField label="정산 원금">{won(doc.principal)}</DocField>
          <DocField label="조정금액">
            <span className={adjustment < 0 ? "is-minus" : undefined}>{signed(adjustment)}</span>
          </DocField>
          <div className="is-total">
            <dt>최종 정산금액</dt>
            <dd>{won(doc.amount)}</dd>
          </div>
        </dl>
      </section>

      <section className="invoice-document-section" aria-label="조정내역">
        <h5>조정내역</h5>
        {doc.adjustments.length === 0 ? (
          <p className="invoice-document-note">이 Version에 반영된 조정내역이 없습니다.</p>
        ) : (
          <div className="invoice-document-table-wrap">
            <table className="invoice-document-table">
              <thead>
                <tr>
                  <th scope="col">예약번호</th>
                  <th scope="col">조정유형</th>
                  <th scope="col">원 금액</th>
                  <th scope="col">조정금액</th>
                </tr>
              </thead>
              <tbody>
                {doc.adjustments.map((item) => (
                  <tr key={item.reservationCode}>
                    <td>
                      {item.reservationCode}
                      <small>{item.productName}</small>
                    </td>
                    <td>예약 취소완료</td>
                    <td>{won(item.originalProfit)}</td>
                    <td>{signed(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="invoice-document-note">
          정산금액은 예약 당시 판매점 수익(Snapshot) 기준입니다. 고객 환불금액 · 취소수수료는 정산금액에 포함하지 않습니다.
        </p>
      </section>

      <footer className="invoice-document-foot">
        {!doc.current ? (
          <p className="is-warn">
            <AlertTriangle size={12} aria-hidden="true" />본 문서는 재발행으로 대체된 이전 Version입니다.
          </p>
        ) : null}
        {doc.version > 1 ? (
          <p>
            본 문서는 {settlement.code} v{doc.version - 1}을 대체하는 v{doc.version} 정산서입니다. (사유: {doc.note})
          </p>
        ) : null}
        <p>
          <small>프로토타입 Mock 정산서 · 실제 정산서 · 세금계산서 · 회계전표가 아닙니다.</small>
        </p>
      </footer>
    </article>
  );
}

/** 정산서 미리보기 — Version별 발행 시점 Snapshot · 실제 PDF 생성 없음 */
export function SellerSettlementPreviewModal({
  settlement,
  versionNumber,
  sellerName,
  onClose,
  onShowCurrent,
  onPdf,
}: {
  settlement: SellerSettlement;
  versionNumber: number;
  sellerName: string;
  onClose: () => void;
  onShowCurrent: () => void;
  onPdf: () => void;
}) {
  const doc = settlement.documents.find((item) => item.version === versionNumber) ?? null;
  return (
    <SellerModalFrame
      titleId="seller-stl-preview-title"
      title="정산서 미리보기"
      className="seller-inv-preview-modal"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="secondary" disabled={!doc} onClick={onPdf}>
            <Download size={14} aria-hidden="true" />
            PDF 다운로드
          </button>
          <button type="button" className="primary" onClick={onClose}>
            닫기
          </button>
        </>
      }
    >
      {!doc ? (
        <div className="seller-sup-empty invoice-preview-empty">
          <h3>해당 Version을 찾을 수 없습니다.</h3>
          <p>현재 유효 정산서를 확인해주세요.</p>
          {settlement.documents.length > 0 ? (
            <button type="button" className="secondary" onClick={onShowCurrent}>
              현재 Version 보기
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className={`invoice-preview-bar${doc.current ? "" : " is-past"}`}>
            <span className="invoice-preview-code">
              {settlement.code} / v{doc.version}
            </span>
            {doc.current ? (
              <span className="seller-inv-current-chip">
                현재 유효 정산서 <b>v{doc.version}</b>
              </span>
            ) : (
              <strong className="invoice-preview-past">
                <Lock size={12} aria-hidden="true" />
                이전 Version · 조회 전용
              </strong>
            )}
          </div>
          <div className="invoice-preview-stage">
            <SettlementDocument settlement={settlement} doc={doc} sellerName={sellerName} />
          </div>
        </>
      )}
    </SellerModalFrame>
  );
}

/** 정산내역 확인 Modal — 필수 확인 Checkbox 후 Confirm 단계로 진행 */
export function SellerSettlementConfirmModal({
  settlement,
  doc,
  suspended = false,
  onClose,
  onSubmit,
}: {
  settlement: SellerSettlement;
  doc: SellerSettlementDocument;
  /** Confirm Dialog가 위에 열려 있으면 Esc/닫기 무시 */
  suspended?: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const guardedClose = useCallback(() => {
    if (!suspended) onClose();
  }, [suspended, onClose]);

  return (
    <SellerModalFrame
      titleId="seller-stl-confirm-title"
      title="정산내역 확인"
      className="seller-rsv-cancel-modal seller-stl-confirm-modal"
      onClose={guardedClose}
      actions={
        <>
          <button type="button" className="secondary" onClick={guardedClose}>
            닫기
          </button>
          <button type="button" className="primary" disabled={!checked} onClick={onSubmit}>
            정산 확인
          </button>
        </>
      }
    >
      <p className="seller-sup-modal-lead">재발행된 정산서의 정산내역과 조정내역을 확인해주세요.</p>
      <section className="seller-price-section" aria-label="확인 대상 정산">
        <dl className="seller-rsv-cancel-info">
          <div>
            <dt>정산번호</dt>
            <dd>{settlement.code}</dd>
          </div>
          <div>
            <dt>공급여행사</dt>
            <dd>{settlement.supplierName}</dd>
          </div>
          <div>
            <dt>정산기간</dt>
            <dd>
              {dotted(settlement.periodFrom)} ~ {dotted(settlement.periodTo)}
            </dd>
          </div>
          <div>
            <dt>최종 정산금액</dt>
            <dd>
              <b>{won(doc.amount)}</b>
            </dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>v{doc.version} · 현재 유효</dd>
          </div>
        </dl>
      </section>
      <div className="seller-sup-policy-row seller-stl-confirm-check">
        <label>
          <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          <span>
            <b>[필수]</b> 정산내역과 조정내역을 확인했습니다.
          </span>
        </label>
      </div>
    </SellerModalFrame>
  );
}
