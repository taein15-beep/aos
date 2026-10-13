"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Info as InfoIcon, Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ShareConfirmDialog, type ShareConfirmDialogState } from "@/components/products/ShareConfirmDialog";
import {
  SELLER_SETTLEMENT_PDF_MOCK,
  SellerSettlementConfirmModal,
  SellerSettlementPreviewModal,
} from "@/components/seller/SellerSettlementDialogs";
import { SellerProductsMockControls } from "@/components/seller/SellerProductsMockControls";
import { useQueryParam } from "@/components/settlements/SettlementParts";
import {
  confirmSellerSettlementAsSeller,
  formatSellerSettlementAmount as won,
  formatSellerSettlementSigned as signed,
  getSellerSettlementAdjustmentRows,
  getSellerSettlementDetailRows,
  getSellerSettlementForSeller,
  getSellerSettlementPayoutAccount,
  getSellerSettlementSellerConfirmState,
  getSettlementAdjustmentTotal,
  getSettlementCurrentVersion,
  getSettlementEffectiveStatus,
  getSettlementFinalAmount,
  getSettlementNextAdjustmentAmount,
  listSellerSettlementsAllSuppliers,
  sellerSettlementDetailPath,
  sellerSettlementPaymentBadgeClass,
  sellerSettlementStatusBadgeClass,
  useSellerSettlementStoreVersion,
  type SellerSettlementLine,
} from "@/lib/admin/seller-channel-settlements";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import type { SupplierTradeStatus } from "@/lib/seller/seller-login-mock";
import { formatSellerReservationDateTime, sellerReservationDetailPath } from "@/lib/seller/seller-reservations-data";
import { getSellerSupplierRelations } from "@/lib/seller/seller-suppliers-data";
import { useSellerProductsState } from "@/lib/seller/use-seller-products-state";
import { useSellerSession } from "@/lib/seller/use-seller-session";

const LIST_PATH = "/seller/settlements";
const MOCK_KEYS = ["hyundamSuspended"] as const;

type ToastState = { message: string; detail?: string };

function Row({ label, children, emphasis }: { label: string; children: ReactNode; emphasis?: boolean }) {
  return (
    <div className={emphasis ? "is-emphasis" : undefined}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function dotted(value: string) {
  return value.replace(/-/g, ".");
}

function supplierStatusBadgeClass(status: SupplierTradeStatus) {
  if (status === "정상") return "success";
  if (status === "이용중지") return "danger";
  return "warn";
}

function lineStatusBadgeClass(label: string) {
  if (label === "정상") return "success";
  if (label.startsWith("취소처리중")) return "gray";
  return "warn";
}

/** 예약 당시 Snapshot 기준 판매점 수익 산출식 */
function profitBasis(line: SellerSettlementLine) {
  if (line.saleMode === "수수료형") return `${won(line.reservationAmount)} × ${line.commissionRate ?? 0}%`;
  if (line.depositPrice === null) return null;
  return `(${line.unitPrice.toLocaleString("ko-KR")} − ${line.depositPrice.toLocaleString("ko-KR")}) × ${line.pax}명`;
}

export default function SellerSettlementDetailPage() {
  const params = useParams<{ id: string }>();
  const code = decodeURIComponent(params.id ?? "");
  const session = useSellerSession();
  const sellerId = session?.sellerId ?? SELLER_ADMIN_DEMO_PROFILE.sellerId;
  const sellerName = session?.sellerName ?? SELLER_ADMIN_DEMO_PROFILE.sellerName;

  const { mock, supplierStatuses } = useSellerProductsState(sellerId);
  const storeVersion = useSellerSettlementStoreVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const settlement = useMemo(() => getSellerSettlementForSeller(code, sellerId), [code, sellerId, storeVersion]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const settlementCodes = useMemo(() => new Set(listSellerSettlementsAllSuppliers(sellerId).map((item) => item.code)), [sellerId, storeVersion]);

  const [versionParam, setVersionParam] = useQueryParam("version", "");
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ShareConfirmDialogState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const notify = (message: string, detailText?: string) => {
    setToast({ message, detail: detailText });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), detailText ? 3200 : 2400);
  };

  if (!settlement) {
    return (
      <div className="seller-inv-detail-page">
        <section className="panel seller-sup-empty">
          <h3>정산내역을 찾을 수 없습니다.</h3>
          <p>정산번호를 확인해주세요.</p>
          <Link href={LIST_PATH} className="secondary seller-pd-link-button">
            <ArrowLeft size={14} aria-hidden="true" />
            정산목록
          </Link>
        </section>
      </div>
    );
  }

  const status = getSettlementEffectiveStatus(settlement);
  const currentDoc = getSettlementCurrentVersion(settlement);
  const requestedVersion = versionParam ? Number(versionParam) : null;
  const requestedDoc = requestedVersion !== null ? (settlement.documents.find((doc) => doc.version === requestedVersion) ?? null) : null;
  const versionMissing = requestedVersion !== null && !requestedDoc;
  const viewDoc = requestedDoc ?? currentDoc;
  const previousDoc = currentDoc ? (settlement.documents.find((doc) => doc.version === currentDoc.version - 1) ?? null) : null;
  const finalAmount = getSettlementFinalAmount(settlement);
  const adjustmentTotal = getSettlementAdjustmentTotal(settlement);
  const nextAdjustment = getSettlementNextAdjustmentAmount(settlement);
  const detail = getSellerSettlementDetailRows(settlement);
  const adjustmentRows = getSellerSettlementAdjustmentRows(settlement);
  const appliedAdjustment = adjustmentRows.filter((row) => row.status !== "반영대기").reduce((total, row) => total + row.adjustment, 0);
  const pendingRows = adjustmentRows.filter((row) => row.status === "반영대기");
  const confirmState = getSellerSettlementSellerConfirmState(settlement);
  const relation = getSellerSupplierRelations(sellerId, "normal").find((item) => item.supplierCode === settlement.supplierCode) ?? null;
  const payoutAccount = getSellerSettlementPayoutAccount(settlement.sellerId);
  const supplierStatus: SupplierTradeStatus =
    supplierStatuses[settlement.supplierTravelAgencyId] ?? ((relation?.status as SupplierTradeStatus | undefined) ?? "정상");
  const events = [...settlement.events].reverse();

  const selectVersion = (version: number) => setVersionParam(currentDoc && version === currentDoc.version ? "" : String(version));

  const requestConfirm = () => {
    if (!confirmState.canConfirm || !currentDoc) return;
    setConfirmDialog({
      title: "정산내역을 확인하시겠습니까?",
      details: [
        { label: "정산번호", value: `${settlement.code} · v${currentDoc.version}` },
        { label: "최종 정산금액", value: won(currentDoc.amount) },
      ],
      message: "확인 후 정산상태가 정산확정으로 변경됩니다.",
      confirmLabel: "정산 확인",
      onConfirm: () => {
        setConfirmDialog(null);
        const done = confirmSellerSettlementAsSeller(settlement.code, sellerId);
        setConfirmOpen(false);
        if (done) notify("정산내역을 확인했습니다.", "공급여행사의 지급처리를 기다립니다.");
        else notify("정산 확인을 처리할 수 없는 상태입니다. 정산 상태를 다시 확인해주세요.");
      },
    });
  };

  return (
    <div className="seller-inv-detail-page seller-stl-detail-page">
      <section className="page-head seller-pd-head seller-inv-detail-head">
        <div className="seller-inv-detail-title-block">
          <nav className="seller-inv-breadcrumb" aria-label="Breadcrumb">
            <Link href={LIST_PATH}>정산관리</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">정산상세</span>
          </nav>
          <h1 className="seller-rsv-detail-title">{settlement.code}</h1>
          <p className="seller-pd-head-meta">
            <span>
              {settlement.supplierName} · {dotted(settlement.periodFrom)} ~ {dotted(settlement.periodTo)}
            </span>
            <span className={`badge ${sellerSettlementStatusBadgeClass(status)}`}>{status}</span>
            <span className={`badge ${sellerSettlementPaymentBadgeClass(settlement.paymentStatus)}`}>{settlement.paymentStatus}</span>
            {currentDoc ? (
              <span className="seller-inv-current-chip">
                현재 유효 정산서 <b>v{currentDoc.version}</b>
              </span>
            ) : (
              <span className="seller-inv-current-chip is-none">정산서 미발행</span>
            )}
          </p>
        </div>
        <div className="seller-pd-head-actions seller-inv-detail-actions">
          <Link href={LIST_PATH} className="secondary seller-pd-link-button">
            <ArrowLeft size={14} aria-hidden="true" />
            목록
          </Link>
          {currentDoc ? (
            <button type="button" className="secondary" onClick={() => setPreviewVersion(viewDoc?.version ?? currentDoc.version)}>
              <FileText size={14} aria-hidden="true" />
              정산서 미리보기
            </button>
          ) : null}
          {confirmState.canConfirm ? (
            <button type="button" className="primary seller-stl-confirm-button" onClick={() => setConfirmOpen(true)}>
              <CheckCircle2 size={14} aria-hidden="true" />
              정산 확인
            </button>
          ) : null}
        </div>
      </section>

      {status === "재확인대기" && currentDoc ? (
        <div className="seller-relation-drawer-alert seller-pd-alert is-warn seller-stl-reconfirm-alert" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            <b>정산서 재확인이 필요합니다.</b>
            <small>
              {confirmState.canConfirm ? "예약 취소조정으로 정산금액이 변경되었습니다." : confirmState.message}
            </small>
            {previousDoc ? (
              <dl className="seller-stl-compare">
                <div>
                  <dt>기존 정산금액 (v{previousDoc.version})</dt>
                  <dd>{won(previousDoc.amount)}</dd>
                </div>
                <div>
                  <dt>조정</dt>
                  <dd className="seller-settle-minus">{signed(currentDoc.amount - previousDoc.amount)}</dd>
                </div>
                <div>
                  <dt>변경 후 (v{currentDoc.version})</dt>
                  <dd>{won(currentDoc.amount)}</dd>
                </div>
              </dl>
            ) : null}
          </span>
        </div>
      ) : null}
      {status === "수정필요" ? (
        <div className="seller-relation-drawer-alert seller-pd-alert is-warn" role="status">
          <InfoIcon size={15} aria-hidden="true" />
          <span>
            <b>취소조정 반영을 위해 정산서를 수정하고 있습니다.</b>
            <small>공급여행사가 정산서를 재발행하면 재확인대기 상태가 되며, 그때 정산 확인을 진행할 수 있습니다.</small>
          </span>
        </div>
      ) : null}
      {status === "정산대기" ? (
        <div className="seller-relation-drawer-alert seller-pd-alert is-info" role="status">
          <InfoIcon size={15} aria-hidden="true" />
          <span>
            <b>{settlement.scheduled ? "정산기간 시작 전 · 정산생성 예정입니다." : "공급여행사 정산확정 전입니다."}</b>
            <small>정산대기 상태에서는 조회만 가능합니다. 취소완료 예약은 이 정산에서 바로 차감됩니다.</small>
          </span>
        </div>
      ) : null}
      {settlement.outgoingAdjustments.length > 0 ? (
        <div className="seller-relation-drawer-alert seller-pd-alert is-info" role="status">
          <InfoIcon size={15} aria-hidden="true" />
          <span>
            <b>지급완료 이후 발생한 조정 {signed(nextAdjustment)}이 차기정산에 반영될 예정입니다.</b>
            <small>기존 지급금액 {won(finalAmount)}은 변경되지 않습니다.</small>
          </span>
        </div>
      ) : null}
      {supplierStatus === "이용중지" ? (
        <div className="seller-relation-drawer-alert seller-pd-alert" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            <b>현재 공급여행사와의 거래는 이용중지 상태입니다.</b>
            <small>기존 정산의 후속처리이므로 정산 상세 조회 및 정산 확인은 계속 가능합니다.</small>
          </span>
        </div>
      ) : null}
      {versionMissing ? (
        <div className="seller-relation-drawer-alert seller-pd-alert is-info" role="status">
          <InfoIcon size={15} aria-hidden="true" />
          <span>
            <b>요청한 정산서 Version(v{versionParam})을 찾을 수 없습니다.</b>
            <small>{currentDoc ? `현재 유효 정산서 v${currentDoc.version}을 표시합니다.` : "아직 발행된 정산서가 없습니다."}</small>
          </span>
          <button type="button" className="secondary" onClick={() => setVersionParam("")}>
            현재 Version 보기
          </button>
        </div>
      ) : null}

      <section className="panel seller-sup-summary" aria-label="정산 기본정보">
        <dl className="seller-dash-stats seller-stl-detail-stats">
          <div className="seller-stl-stat-period">
            <dt>정산기간</dt>
            <dd>
              {dotted(settlement.periodFrom)} ~ {dotted(settlement.periodTo).slice(5)}
            </dd>
          </div>
          <div className="seller-stl-stat-supplier">
            <dt>공급여행사</dt>
            <dd>{settlement.supplierName}</dd>
          </div>
          <div className="seller-stl-stat-count">
            <dt>예약건수</dt>
            <dd>{settlement.reservationCount}건</dd>
          </div>
          <div className="seller-stl-stat-principal">
            <dt>정산 원금</dt>
            <dd>{won(settlement.principal)}</dd>
          </div>
          <div className="seller-stl-stat-adjust">
            <dt>조정금액</dt>
            <dd className={adjustmentTotal < 0 ? "seller-settle-minus" : undefined}>{signed(adjustmentTotal)}</dd>
          </div>
          <div className="is-success seller-stl-stat-final">
            <dt>{settlement.paidAmount !== null ? "지급금액" : "최종 정산금액"}</dt>
            <dd>{won(finalAmount)}</dd>
          </div>
        </dl>
      </section>

      <div className="seller-stl-detail-grid">
        <section className="panel seller-pd-card" aria-labelledby="seller-stl-supplier-title">
          <h2 id="seller-stl-supplier-title">공급여행사</h2>
          <dl className="seller-relation-dl seller-rsv-detail-dl">
            <Row label="여행사명">{settlement.supplierName}</Row>
            <Row label="공급여행사 코드">{settlement.supplierCode}</Row>
            <Row label="담당자">{relation?.contact.managerName ?? "-"}</Row>
            <Row label="연락처">{relation?.contact.managerPhone ?? "-"}</Row>
            <Row label="관계상태">
              <span className={`badge ${supplierStatusBadgeClass(supplierStatus)}`}>{supplierStatus}</span>
            </Row>
          </dl>
          <p className="seller-pd-origin-note">
            <Lock size={12} aria-hidden="true" />
            조회 전용 · SAMPLE 담당자 정보
          </p>
        </section>
        <section className="panel seller-pd-card" aria-labelledby="seller-stl-period-title">
          <h2 id="seller-stl-period-title">정산기간</h2>
          <dl className="seller-relation-dl seller-rsv-detail-dl">
            <Row label="정산 시작일">{dotted(settlement.periodFrom)}</Row>
            <Row label="정산 종료일">{dotted(settlement.periodTo)}</Row>
            <Row label="정산차수">{settlement.label}</Row>
            <Row label="정산예정일">{dotted(settlement.dueDate)}</Row>
            <Row label="운영인계">
              {settlement.handoverCompletedAt ? `${formatSellerReservationDateTime(settlement.handoverCompletedAt)} 완료` : "운영인계 전"}
            </Row>
          </dl>
          <p className="seller-pd-origin-note">
            <Lock size={12} aria-hidden="true" />
            운영인계 완료 전에는 정산확정할 수 없습니다.
          </p>
        </section>
      </div>

      <section className="panel seller-sup-list" aria-labelledby="seller-stl-rsv-title">
        <div className="panel-head">
          <div>
            <h2 id="seller-stl-rsv-title">
              정산 대상 예약 <span className="count">{settlement.reservationCount}</span>
            </h2>
            <p>
              예약 당시 판매조건(Snapshot) 기준 판매점 수익입니다. 고객 환불금액 · 취소수수료는 정산금액에 사용하지 않습니다. 예약건수는 취소조정
              반영 예약을 제외한 건수입니다.
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="seller-dash-table seller-stl-detail-table">
            <thead>
              <tr>
                <th>예약번호</th>
                <th>여행일</th>
                <th>상품</th>
                <th>판매방식</th>
                <th>예약자</th>
                <th className="money">인원</th>
                <th className="money">예약금액</th>
                <th className="money">판매점 수익</th>
                <th className="money">조정금액</th>
                <th className="money">최종 정산금액</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {detail.rows.map((row) => {
                if (row.kind === "aggregate") {
                  return (
                    <tr key={row.key} className="seller-stl-aggregate-row">
                      <td data-label="예약번호">
                        <span className="seller-rsv-product">
                          <b>정상 예약 {row.count}건</b>
                          <small>SAMPLE 집계 · 예약별 상세 생략</small>
                        </span>
                      </td>
                      <td data-label="여행일">-</td>
                      <td data-label="상품">-</td>
                      <td data-label="판매방식">-</td>
                      <td data-label="예약자">-</td>
                      <td data-label="인원" className="money">
                        -
                      </td>
                      <td data-label="예약금액" className="money">
                        -
                      </td>
                      <td data-label="판매점 수익" className="money">
                        {won(row.profit)}
                      </td>
                      <td data-label="조정금액" className="money">
                        0원
                      </td>
                      <td data-label="최종 정산금액" className="money">
                        <b>{won(row.finalAmount)}</b>
                      </td>
                      <td data-label="상태">
                        <span className="badge success">{row.statusLabel}</span>
                      </td>
                    </tr>
                  );
                }
                const { line } = row;
                const basis = profitBasis(line);
                return (
                  <tr key={row.key}>
                    <td data-label="예약번호">
                      {row.kind === "reservation" ? (
                        <Link href={sellerReservationDetailPath(line.reservationCode)} className="seller-rsv-code">
                          {line.reservationCode}
                        </Link>
                      ) : (
                        <span className="seller-rsv-product">
                          <b className="seller-stl-code">{line.reservationCode}</b>
                          <small>SAMPLE · 예약상세 없음</small>
                        </span>
                      )}
                    </td>
                    <td data-label="여행일">{dotted(line.travelDate)}</td>
                    <td data-label="상품">
                      <span className="seller-rsv-product">
                        <b>{line.productName}</b>
                        <small>{line.productCode}</small>
                      </span>
                    </td>
                    <td data-label="판매방식">
                      <span className={`badge ${line.saleMode === "수수료형" ? "info" : "gray"}`}>{line.saleMode}</span>
                    </td>
                    <td data-label="예약자">{line.customerName}</td>
                    <td data-label="인원" className="money">
                      {line.pax}명
                    </td>
                    <td data-label="예약금액" className="money">
                      {won(line.reservationAmount)}
                    </td>
                    <td data-label="판매점 수익" className="money">
                      <span className="seller-prod-money">
                        <b>{won(row.profit)}</b>
                        {basis ? <small>{basis}</small> : null}
                      </span>
                    </td>
                    <td data-label="조정금액" className="money">
                      <span className="seller-prod-money">
                        <b className={row.adjustment < 0 ? "seller-settle-minus" : undefined}>{signed(row.adjustment)}</b>
                        {line.pendingAdjustment !== 0 ? <small className="is-review">반영대기 {signed(line.pendingAdjustment)}</small> : null}
                      </span>
                    </td>
                    <td data-label="최종 정산금액" className="money">
                      <b>{won(row.finalAmount)}</b>
                    </td>
                    <td data-label="상태">
                      <span className="seller-inv-status">
                        <span className={`badge ${lineStatusBadgeClass(row.statusLabel)}`}>{row.statusLabel}</span>
                        {line.refundNote ? (
                          <small>
                            참고 · {line.refundNote}
                            {line.refundAmount !== null ? " (정산 미반영)" : ""}
                          </small>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="seller-rsv-formula seller-stl-formula">
          <span>
            예약별 최종 정산금액 합계{detail.carriedAdjustment !== 0 ? " + 이전 정산 조정" : ""} = {settlement.paidAmount !== null ? "지급금액" : "최종 정산금액"}
          </span>
          <b>
            {won(detail.rowTotal)}
            {detail.carriedAdjustment !== 0 ? ` ${detail.carriedAdjustment < 0 ? "−" : "+"} ${won(Math.abs(detail.carriedAdjustment))}` : ""} ={" "}
            {won(detail.total)}
          </b>
        </p>
      </section>

      <section className="panel seller-sup-list" aria-labelledby="seller-stl-adjust-title">
        <div className="panel-head">
          <div>
            <h2 id="seller-stl-adjust-title">
              정산 조정내역 <span className="count">{adjustmentRows.length}</span>
            </h2>
            <p>조정내역은 공급여행사 · 시스템 계산 결과이며 판매점은 수정할 수 없습니다.</p>
          </div>
        </div>
        {adjustmentRows.length === 0 ? (
          <div className="seller-sup-empty">
            <h3>조정내역이 없습니다.</h3>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="seller-dash-table seller-stl-adjust-table">
                <thead>
                  <tr>
                    <th>발생일</th>
                    <th>예약번호</th>
                    <th>조정유형</th>
                    <th className="money">원 금액</th>
                    <th className="money">조정금액</th>
                    <th className="money">최종금액</th>
                    <th>반영상태</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustmentRows.map((row) => (
                    <tr key={row.key}>
                      <td data-label="발생일">{formatSellerReservationDateTime(row.occurredAt)}</td>
                      <td data-label="예약번호">
                        {row.linkable ? (
                          <Link href={sellerReservationDetailPath(row.reservationCode)} className="seller-rsv-code">
                            {row.reservationCode}
                          </Link>
                        ) : (
                          <span className="seller-stl-code">{row.reservationCode}</span>
                        )}
                      </td>
                      <td data-label="조정유형">
                        <span className="badge warn">{row.type}</span>
                      </td>
                      <td data-label="원 금액" className="money">
                        {won(row.originalAmount)}
                      </td>
                      <td data-label="조정금액" className="money">
                        <span className="seller-settle-minus">{signed(row.adjustment)}</span>
                      </td>
                      <td data-label="최종금액" className="money">
                        {won(row.finalAmount)}
                      </td>
                      <td data-label="반영상태">
                        <span className="seller-inv-status">
                          <span className={`badge ${row.status === "반영대기" ? "warn" : "info"}`}>{row.status}</span>
                          {row.sourceCode ? <small>{row.sourceCode} 지급완료 후 취소</small> : null}
                          {row.status === "반영대기" ? <small className="is-review">정산서 수정 후 반영</small> : null}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="seller-rsv-formula seller-stl-formula">
              <span>반영된 조정 합계 = 상세 조정금액{pendingRows.length > 0 ? " (반영대기 제외)" : ""}</span>
              <b>
                {signed(appliedAdjustment)} = {signed(adjustmentTotal)}
              </b>
            </p>
          </>
        )}
      </section>

      {settlement.outgoingAdjustments.length > 0 ? (
        <section className="panel seller-sup-list" aria-labelledby="seller-stl-next-title">
          <div className="panel-head">
            <div>
              <h2 id="seller-stl-next-title">
                차기정산 조정 <span className="count">{settlement.outgoingAdjustments.length}</span>
              </h2>
              <p>지급완료 이후 발생한 취소는 현재 정산금액을 바꾸지 않고 차기정산에서 차감합니다.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="seller-dash-table seller-stl-next-table">
              <thead>
                <tr>
                  <th>예약번호</th>
                  <th className="money">조정금액</th>
                  <th>발생일</th>
                  <th>상태</th>
                  <th>반영 정산</th>
                </tr>
              </thead>
              <tbody>
                {settlement.outgoingAdjustments.map((item) => (
                  <tr key={item.id}>
                    <td data-label="예약번호">
                      <span className="seller-rsv-product">
                        <b className="seller-stl-code">{item.reservationCode}</b>
                        <small>{item.productName}</small>
                      </span>
                    </td>
                    <td data-label="조정금액" className="money">
                      <span className="seller-settle-minus">{signed(item.amount)}</span>
                    </td>
                    <td data-label="발생일">{formatSellerReservationDateTime(item.occurredAt)}</td>
                    <td data-label="상태">
                      <span className="badge warn">차기정산 반영예정</span>
                    </td>
                    <td data-label="반영 정산">
                      {settlementCodes.has(item.targetSettlementCode) ? (
                        <Link href={sellerSettlementDetailPath(item.targetSettlementCode)} className="seller-rsv-code">
                          차기정산 보기 · {item.targetSettlementCode}
                        </Link>
                      ) : (
                        item.targetSettlementCode
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="seller-stl-detail-bottom">
        <section className="panel seller-pd-card" aria-labelledby="seller-stl-doc-title">
          <h2 id="seller-stl-doc-title">
            정산서 {settlement.documents.length > 0 ? <small>{settlement.documents.length}개 Version</small> : null}
          </h2>
          {!currentDoc || !viewDoc ? (
            <p className="seller-inv-sends-empty">정산확정 후 정산서가 발행됩니다. 현재는 정산대기 상태로 조회만 가능합니다.</p>
          ) : (
            <>
              <dl className="seller-relation-dl seller-rsv-detail-dl">
                <Row label="조회 Version">
                  v{viewDoc.version}
                  <small>{viewDoc.current ? "현재 유효" : "이전 Version · 조회 전용"}</small>
                </Row>
                <Row label="발행일">{formatSellerReservationDateTime(viewDoc.issuedAt)}</Row>
                <Row label="상태">
                  <span className={`badge ${viewDoc.current ? "success" : "gray"}`}>{viewDoc.current ? "현재 유효" : "이전 Version"}</span>
                </Row>
                <Row label="정산금액" emphasis>
                  {won(viewDoc.amount)}
                </Row>
              </dl>
              <h3 className="seller-rsv-subtitle">Version History</h3>
              <ol className="seller-inv-versions">
                {[...settlement.documents].reverse().map((doc) => (
                  <li key={doc.version} className={doc.version === viewDoc.version ? "is-selected" : undefined}>
                    <button
                      type="button"
                      className="seller-inv-versions-doc"
                      aria-label={`v${doc.version} 정산서 보기`}
                      onClick={() => setPreviewVersion(doc.version)}
                    >
                      <FileText size={13} aria-hidden="true" />
                      문서보기
                    </button>
                    <button type="button" onClick={() => selectVersion(doc.version)} aria-pressed={doc.version === viewDoc.version}>
                      <span className="seller-inv-versions-head">
                        <b>v{doc.version}</b>
                        <span className={`badge ${doc.current ? "success" : "gray"}`}>{doc.current ? "현재 유효" : "이전 Version"}</span>
                      </span>
                      <time>{formatSellerReservationDateTime(doc.issuedAt)}</time>
                      <strong>{won(doc.amount)}</strong>
                      <small>{doc.note}</small>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
          <p className="seller-pd-origin-note">
            <Lock size={12} aria-hidden="true" />
            정산서 Version은 삭제 · 수정되지 않으며 정산 확인은 현재 유효 Version만 대상입니다. 인보이스와는 별도 문서입니다.
          </p>
        </section>

        <div className="seller-stl-detail-side">
          <section className="panel seller-pd-card" aria-labelledby="seller-stl-pay-title">
            <h2 id="seller-stl-pay-title">지급정보</h2>
            <dl className="seller-relation-dl seller-rsv-detail-dl">
              <Row label="지급상태">
                <span className={`badge ${sellerSettlementPaymentBadgeClass(settlement.paymentStatus)}`}>{settlement.paymentStatus}</span>
              </Row>
              {settlement.payment ? (
                <>
                  <Row label="지급금액" emphasis>
                    {won(settlement.payment.amount)}
                  </Row>
                  <Row label="지급일">{dotted(settlement.payment.paymentDate)}</Row>
                  <Row label="지급방법">{settlement.payment.method}</Row>
                  {settlement.payment.reference ? <Row label="지급참조번호">{settlement.payment.reference}</Row> : null}
                  <Row label="지급기준">정산서 v{settlement.payment.statementVersion}</Row>
                </>
              ) : (
                <>
                  <Row label="지급예정금액" emphasis>
                    {status === "정산대기" ? "정산확정 후 확정" : won(settlement.finalAmount)}
                  </Row>
                  <Row label="정산예정일">{dotted(settlement.dueDate)}</Row>
                </>
              )}
              <Row label="지급계좌">
                {payoutAccount ? (
                  <>
                    {payoutAccount.bank} {payoutAccount.maskedNumber}
                    <small>예금주 {payoutAccount.holder}</small>
                  </>
                ) : (
                  <>
                    등록정보 없음 <small>판매점 지급계좌가 등록되어 있지 않습니다.</small>
                  </>
                )}
              </Row>
            </dl>
            <p className="seller-pd-origin-note">
              <Lock size={12} aria-hidden="true" />
              {settlement.payment
                ? "지급완료 내역은 공급여행사 지급처리 기록이며 판매점에서 변경할 수 없습니다. 실제 계좌이체는 실행되지 않습니다."
                : "조회 전용 · 지급처리는 공급여행사가 진행합니다. 실제 계좌이체는 실행되지 않습니다."}
            </p>
          </section>

          <section className="panel seller-pd-card" aria-labelledby="seller-stl-history-title">
            <h2 id="seller-stl-history-title">
              정산 이력 <small>{settlement.events.length}건</small>
            </h2>
            <ol className="seller-pd-timeline seller-rsv-timeline">
              {events.map((event, index) => (
                <li key={`${event.at}-${index}`}>
                  <time>{formatSellerReservationDateTime(event.at)}</time>
                  <span>
                    <b>{event.label}</b>
                    <small>
                      {event.actor}
                      {event.note ? ` · ${event.note}` : ""}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <SellerProductsMockControls sellerId={sellerId} mock={mock} keys={MOCK_KEYS} />

      {previewVersion !== null ? (
        <SellerSettlementPreviewModal
          settlement={settlement}
          versionNumber={previewVersion}
          sellerName={sellerName}
          onClose={() => setPreviewVersion(null)}
          onShowCurrent={() => setPreviewVersion(currentDoc?.version ?? null)}
          onPdf={() => notify(SELLER_SETTLEMENT_PDF_MOCK)}
        />
      ) : null}
      {confirmOpen && confirmState.canConfirm && currentDoc ? (
        <SellerSettlementConfirmModal
          settlement={settlement}
          doc={currentDoc}
          suspended={Boolean(confirmDialog)}
          onClose={() => setConfirmOpen(false)}
          onSubmit={requestConfirm}
        />
      ) : null}
      <ShareConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />

      {toast ? (
        <div className="toast seller-pd-toast" role="status">
          <span>✓</span>
          {toast.detail ? (
            <span className="seller-prod-toast-text">
              <b>{toast.message}</b>
              <small>{toast.detail}</small>
            </span>
          ) : (
            toast.message
          )}
        </div>
      ) : null}
    </div>
  );
}
