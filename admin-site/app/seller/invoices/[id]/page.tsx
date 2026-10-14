"use client";

import { AlertTriangle, ArrowLeft, FileText, Info as InfoIcon, Lock, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ShareConfirmDialog, type ShareConfirmDialogState } from "@/components/products/ShareConfirmDialog";
import {
  SELLER_INVOICE_PDF_MOCK,
  SELLER_INVOICE_PRINT_MOCK,
  SellerInvoicePreviewModal,
  SellerInvoiceReissueModal,
  SellerInvoiceSendModal,
  type SellerInvoiceReissueInput,
  type SellerInvoiceSendTarget,
} from "@/components/seller/SellerInvoiceDialogs";
import { SellerProductsMockControls } from "@/components/seller/SellerProductsMockControls";
import { SELLER_ADMIN_DEMO_PROFILE, getSellerRegisteredInfo } from "@/lib/seller/seller-admin-profile";
import {
  sellerAdminProductStatusBadgeClass,
  sellerProductModeBadgeClass,
  sellerProductSalePrice,
} from "@/lib/seller/seller-admin-products-data";
import {
  formatSellerInvoiceDelta,
  getSellerInvoiceSendState,
  getSellerInvoiceSupplierInfo,
  sellerInvoiceEventAt,
  sellerInvoiceReservationStatusBadgeClass,
  sellerInvoiceStatusBadgeClass,
  type SellerInvoiceCancelOutcome,
  type SellerInvoiceVersion,
} from "@/lib/seller/seller-invoices-data";
import type { SupplierTradeStatus } from "@/lib/seller/seller-login-mock";
import {
  formatSellerReservationAmount,
  formatSellerReservationDateTime,
  sellerReservationDetailPath,
  sellerReservationPaymentBadgeClass,
} from "@/lib/seller/seller-reservations-data";
import { getSellerSupplierRelations } from "@/lib/seller/seller-suppliers-data";
import {
  applySellerInvoiceCancelOutcome,
  reissueSellerInvoice,
  sendSellerInvoice,
  useSellerInvoices,
} from "@/lib/seller/use-seller-invoices-state";
import { useSellerProductsState } from "@/lib/seller/use-seller-products-state";
import { isSellerReservationSupplierLinked, useSellerReservationDetail } from "@/lib/seller/use-seller-reservations-state";
import { useSellerSession } from "@/lib/seller/use-seller-session";

const LIST_PATH = "/seller/invoices";
const MOCK_KEYS = ["hyundamSuspended"] as const;
const CANCEL_FEE_PRESETS = [
  { rate: 10, label: "취소수수료 10%" },
  { rate: 0, label: "전액환불 (수수료 0%)" },
  { rate: 100, label: "환불불가 (수수료 100%)" },
];

type ToastState = { message: string; detail?: string };

function Row({ label, children, emphasis }: { label: string; children: ReactNode; emphasis?: boolean }) {
  return (
    <div className={emphasis ? "is-emphasis" : undefined}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function supplierStatusBadgeClass(status: SupplierTradeStatus) {
  if (status === "정상") return "success";
  if (status === "이용중지") return "danger";
  return "warn";
}

function versionLabel(version: SellerInvoiceVersion, currentVersion: number) {
  if (version.version !== currentVersion) return `v${version.version} · 무효`;
  return version.status === "무효" || version.status === "취소" ? `v${version.version} · ${version.status}` : `v${version.version} · 현재`;
}

export default function SellerInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceCode = decodeURIComponent(params.id ?? "");
  const session = useSellerSession();
  const sellerId = session?.sellerId ?? SELLER_ADMIN_DEMO_PROFILE.sellerId;
  const sellerName = session?.sellerName ?? SELLER_ADMIN_DEMO_PROFILE.sellerName;
  const sellerInfo = getSellerRegisteredInfo(sellerId);

  const { mock, supplierStatuses, products } = useSellerProductsState(sellerId);
  const invoices = useSellerInvoices(sellerId);
  const invoice = invoices.find((item) => item.invoiceCode === invoiceCode) ?? null;
  const reservation = useSellerReservationDetail(sellerId, invoiceCode.replace(/^INV-/, "RSV-"));

  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [reissueOpen, setReissueOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ShareConfirmDialogState | null>(null);
  const [feeRate, setFeeRate] = useState(CANCEL_FEE_PRESETS[0].rate);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const notify = (message: string, detailText?: string) => {
    setToast({ message, detail: detailText });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), detailText ? 3200 : 2400);
  };

  if (!invoice || !reservation) {
    return (
      <div className="seller-inv-detail-page">
        <section className="panel seller-sup-empty">
          <h3>인보이스를 찾을 수 없습니다.</h3>
          <p>인보이스번호를 확인해주세요.</p>
          <Link href={LIST_PATH} className="secondary seller-pd-link-button">
            <ArrowLeft size={14} aria-hidden="true" />
            인보이스 목록
          </Link>
        </section>
      </div>
    );
  }

  const current = invoice.versions[invoice.versions.length - 1];
  const view = invoice.versions.find((item) => item.version === selectedVersion) ?? current;
  const isPast = view.version !== invoice.currentVersion;
  const hasValidVersion = invoice.status !== "무효" && invoice.status !== "취소";
  const snapshot = view.snapshot;
  const isCancelSnapshot = snapshot.cancelFee !== null;
  const unpaid = isCancelSnapshot ? 0 : Math.max(0, view.amount - snapshot.paidAmount);
  const supplierInfo = getSellerInvoiceSupplierInfo(invoice.supplierCode);
  const relation = getSellerSupplierRelations(sellerId, "normal").find((item) => item.supplierCode === invoice.supplierCode) ?? null;
  const supplierStatus: SupplierTradeStatus =
    supplierStatuses[invoice.supplierTravelAgencyId] ?? ((relation?.status as SupplierTradeStatus | undefined) ?? "정상");
  const product = products.find((row) => row.productCode === invoice.productCode) ?? null;
  const currentPrice = product ? (product.saleMode === "수수료형" ? product.supplyPrice : sellerProductSalePrice(product)) : null;
  const priceChanged = !isCancelSnapshot && currentPrice !== null && currentPrice !== snapshot.unitPrice;
  const reissue = invoice.reissue;
  const lastEventAt = invoice.history[invoice.history.length - 1]?.at ?? invoice.issuedAt;
  const settlement = invoice.cancelSettlement;
  const supplierLinked = isSellerReservationSupplierLinked(sellerId, invoice.reservationCode);
  const canSimulate = invoice.reservationStatus === "취소요청" || (invoice.reservationStatus === "취소승인" && settlement?.simulated);
  const sendState = getSellerInvoiceSendState(invoice, view.version);
  const canSendCurrent = getSellerInvoiceSendState(invoice, invoice.currentVersion).kind === "available";
  const lastSentAt = invoice.sends[invoice.sends.length - 1]?.sentAt ?? "";
  const sends = [...invoice.sends].reverse();
  const supplierParty = supplierInfo
    ? { representative: supplierInfo.representative, businessNumber: supplierInfo.businessNumber, phone: supplierInfo.phone, address: supplierInfo.address }
    : null;
  const sellerParty = sellerInfo
    ? { representative: sellerInfo.representative, businessNumber: sellerInfo.businessNumber, phone: sellerInfo.contactPhone, contactName: sellerInfo.contactName }
    : null;
  const actionNotes = [
    !isPast && (reissue.kind === "blocked" || (reissue.kind === "none" && invoice.versions.length > 1)) ? reissue.message : null,
    sendState.kind === "blocked" && !isPast ? sendState.message : null,
  ].filter((note): note is string => Boolean(note));

  const requestSend = (targets: SellerInvoiceSendTarget[]) => {
    if (!canSendCurrent) return;
    setConfirmDialog({
      title: "인보이스를 발송하시겠습니까?",
      details: [
        { label: "문서", value: `${invoice.invoiceCode} v${current.version}` },
        { label: "수신", value: targets.map((target) => target.recipient).join(", ") },
        { label: "방식", value: targets.map((target) => target.channel).join(" · ") },
      ],
      message: "프로토타입 Mock · 실제 이메일 · 문자 · 알림톡은 발송되지 않고 발송이력만 기록됩니다.",
      confirmLabel: "발송",
      onConfirm: () => {
        setConfirmDialog(null);
        const at = sellerInvoiceEventAt(lastSentAt > lastEventAt ? lastSentAt : lastEventAt);
        const done = sendSellerInvoice(sellerId, invoice, current.version, targets, at);
        setSendOpen(false);
        if (done) notify("인보이스 발송이 완료되었습니다.", `v${current.version} · ${targets.map((target) => target.channel).join(" · ")} · 실제 전송 없음 (Mock)`);
      },
    });
  };

  const selectVersion = (version: number) => setSelectedVersion(version === invoice.currentVersion ? null : version);

  const requestReissue = (input: SellerInvoiceReissueInput) => {
    if (reissue.kind !== "available") return;
    const reasonText = input.reasonDetail ? `${input.reason} · ${input.reasonDetail}` : input.reason;
    setConfirmDialog({
      title: "인보이스를 재발행하시겠습니까?",
      details: [
        { label: "기존", value: `v${current.version} / ${formatSellerReservationAmount(current.amount)}` },
        { label: "신규", value: `v${current.version + 1} / ${formatSellerReservationAmount(reissue.target.amount)}` },
        { label: "사유", value: reasonText },
      ],
      message: `기존 v${current.version} 인보이스는 무효로 보존되고, 신규 v${current.version + 1} 인보이스가 현재 유효 인보이스가 됩니다.`,
      confirmLabel: "재발행",
      onConfirm: () => {
        setConfirmDialog(null);
        setReissueOpen(false);
        const done = reissueSellerInvoice(sellerId, invoice, { issuedAt: sellerInvoiceEventAt(lastEventAt), ...input });
        setSelectedVersion(null);
        if (done) notify(`v${current.version + 1} 인보이스로 재발행되었습니다.`, `기존 v${current.version} 인보이스는 무효 처리되어 이력에 보존됩니다.`);
        else notify("재발행할 변경사항이 없습니다.");
      },
    });
  };

  const simulate = (stage: SellerInvoiceCancelOutcome["stage"]) => {
    const rate = invoice.reservationStatus === "취소승인" && settlement ? settlement.feeRate : feeRate;
    const done = applySellerInvoiceCancelOutcome(sellerId, invoice, stage, rate, sellerInvoiceEventAt(lastEventAt));
    if (done) notify(stage === "취소승인" ? "공급여행사 취소승인이 반영되었습니다." : "취소완료 · 환불완료가 반영되었습니다.", "프로토타입 Mock · 인보이스 화면에만 반영됩니다.");
  };

  const reissueButton =
    reissue.kind === "available" ? (
      <button type="button" className="primary seller-inv-reissue-button" onClick={() => setReissueOpen(true)}>
        <RefreshCw size={14} aria-hidden="true" />
        재발행
      </button>
    ) : reissue.kind === "blocked" || invoice.versions.length > 1 ? (
      <span className="seller-prod-action-lock" title={reissue.message}>
        <button type="button" className="secondary" disabled aria-label={`재발행 불가 — ${reissue.message}`}>
          <RefreshCw size={14} aria-hidden="true" />
          재발행
        </button>
      </span>
    ) : null;

  return (
    <div className="seller-inv-detail-page">
      <section className="page-head seller-pd-head seller-inv-detail-head">
        <div className="seller-inv-detail-title-block">
          <nav className="seller-inv-breadcrumb" aria-label="Breadcrumb">
            <Link href={LIST_PATH}>인보이스</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">인보이스 상세</span>
          </nav>
          <h1 className="seller-rsv-detail-title">{invoice.invoiceCode}</h1>
          <p className="seller-pd-head-meta">
            <Link href={sellerReservationDetailPath(invoice.reservationCode)} className="seller-pd-code">
              {invoice.reservationCode}
            </Link>
            <span className={`badge ${sellerInvoiceStatusBadgeClass(invoice.status)}`}>{invoice.status}</span>
            <span className="badge gray seller-inv-version">v{invoice.currentVersion}</span>
            {hasValidVersion ? (
              <span className="seller-inv-current-chip">
                현재 유효 인보이스 <b>v{invoice.currentVersion}</b>
              </span>
            ) : (
              <span className="seller-inv-current-chip is-none">유효 인보이스 없음</span>
            )}
          </p>
        </div>
        <div className="seller-pd-head-actions seller-inv-detail-actions">
          <Link href={LIST_PATH} className="secondary seller-pd-link-button">
            <ArrowLeft size={14} aria-hidden="true" />
            목록
          </Link>
          <button type="button" className="secondary" onClick={() => setPreviewVersion(view.version)}>
            <FileText size={14} aria-hidden="true" />
            문서 미리보기
          </button>
          {sendState.kind === "available" ? (
            <button type="button" className="secondary" onClick={() => setSendOpen(true)}>
              <Send size={14} aria-hidden="true" />
              발송
            </button>
          ) : (
            <span className="seller-prod-action-lock" title={sendState.message}>
              <button type="button" className="secondary" disabled aria-label={`발송 불가 — ${sendState.message}`}>
                <Send size={14} aria-hidden="true" />
                발송
              </button>
            </span>
          )}
          {isPast ? null : reissueButton}
          {actionNotes.length > 0 ? <small className="seller-inv-action-note">{actionNotes.join(" · ")}</small> : null}
        </div>
      </section>

      {isPast ? (
        <div className="seller-relation-drawer-alert seller-pd-alert seller-inv-past-alert" role="status">
          <Lock size={15} aria-hidden="true" />
          <span>
            <b>v{view.version} 인보이스는 재발행으로 무효 처리된 과거 Version입니다.</b>
            <small>조회만 가능하며 수정 · 재발행 · 상태 변경을 할 수 없습니다.</small>
          </span>
          <button type="button" className="secondary" onClick={() => setSelectedVersion(null)}>
            현재 Version 보기
          </button>
        </div>
      ) : null}
      {invoice.reservationStatus === "취소요청" ? (
        <div className="seller-relation-drawer-alert seller-pd-alert is-warn" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            <b>예약 취소요청이 검토중입니다.</b>
            <small>최종 금액이 아직 확정되지 않아 재발행하지 않습니다. 공급여행사의 취소처리 완료 후 재발행할 수 있습니다.</small>
          </span>
        </div>
      ) : null}
      {invoice.reservationStatus === "취소승인" && settlement ? (
        <div className="seller-relation-drawer-alert seller-pd-alert is-warn" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            <b>예약 취소가 승인되어 기존 인보이스의 재발행이 필요합니다.</b>
            <small>
              취소수수료 {formatSellerReservationAmount(settlement.cancelFee)} · 환불예정 {formatSellerReservationAmount(settlement.refundAmount)} ·
              환불완료 후 재발행할 수 있습니다.
            </small>
          </span>
        </div>
      ) : null}
      {!isPast && invoice.status === "재발행 필요" && reissue.kind === "available" ? (
        <div className="seller-relation-drawer-alert seller-pd-alert is-warn" role="status">
          <RefreshCw size={15} aria-hidden="true" />
          <span>
            <b>재발행이 필요한 인보이스입니다.</b>
            <small>
              {invoice.statusNote} · 재발행 시 v{invoice.currentVersion + 1} 금액 {formatSellerReservationAmount(reissue.target.amount)} (
              {formatSellerInvoiceDelta(reissue.target.amount - current.amount)})
            </small>
          </span>
        </div>
      ) : null}
      {!isPast && invoice.status === "무효" ? (
        <div className="seller-relation-drawer-alert seller-pd-alert" role="status">
          <InfoIcon size={15} aria-hidden="true" />
          <span>
            <b>무효 처리된 인보이스입니다.</b>
            <small>
              {invoice.statusNote}
              {reissue.kind === "none" ? ` · ${reissue.message}` : ""}
            </small>
          </span>
        </div>
      ) : null}
      {supplierStatus === "이용중지" ? (
        <div className="seller-relation-drawer-alert seller-pd-alert" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            <b>현재 공급여행사와의 거래는 이용중지 상태입니다.</b>
            <small>기존 거래의 후속처리이므로 인보이스 조회 및 재발행 필요 문서 처리는 계속 가능합니다.</small>
          </span>
        </div>
      ) : null}

      <div className="seller-inv-version-tabs" role="group" aria-label="인보이스 Version 선택">
        {[...invoice.versions].reverse().map((version) => (
          <button
            key={version.version}
            type="button"
            className={version.version === view.version ? "is-active" : undefined}
            aria-pressed={version.version === view.version}
            onClick={() => selectVersion(version.version)}
          >
            {versionLabel(version, invoice.currentVersion)}
          </button>
        ))}
      </div>

      <div className="seller-inv-detail-grid">
        <section className="panel seller-rsv-detail-summary seller-inv-card-info" aria-label="인보이스 정보">
          <h2 className="seller-inv-summary-title">인보이스 정보</h2>
          <dl>
            <Row label="인보이스번호">{invoice.invoiceCode}</Row>
            <Row label="Version">
              v{view.version}
              <small>{isPast ? "과거 Version" : hasValidVersion ? "현재 유효" : `최신 Version · ${invoice.status}`}</small>
            </Row>
            <Row label="발행일시">{formatSellerReservationDateTime(view.issuedAt)}</Row>
            <Row label="현재상태">
              <span className={`badge ${sellerInvoiceStatusBadgeClass(view.status)}`}>{view.status}</span>
            </Row>
            <Row label="예약번호">{invoice.reservationCode}</Row>
            <Row label="공급여행사">{invoice.supplierName}</Row>
            <Row label="판매점">{sellerName}</Row>
          </dl>
        </section>

        <section className="panel seller-pd-card seller-inv-card-amount" aria-labelledby="seller-inv-amount-title">
          <h2 id="seller-inv-amount-title">
            인보이스 금액 <small>v{view.version} 발행 시점 Snapshot</small>
          </h2>
          <dl className="seller-pd-conditions-dl">
            <Row label="판매방식">
              <span className={`badge ${sellerProductModeBadgeClass(snapshot.saleMode)}`}>{snapshot.saleMode}</span>
            </Row>
            <Row label="예약 당시 판매가">
              {formatSellerReservationAmount(snapshot.unitPrice)}
              <small>1인</small>
            </Row>
            <Row label="인원">{snapshot.pax}명</Row>
            {isCancelSnapshot ? (
              <>
                <Row label="총 예약금액">{formatSellerReservationAmount(snapshot.productAmount)}</Row>
                <Row label="결제금액">{formatSellerReservationAmount(snapshot.paidAmount)}</Row>
                <Row label="환불금액">
                  <span className="seller-inv-refund">{formatSellerReservationAmount(snapshot.refundAmount)}</span>
                </Row>
                <Row label="취소수수료">
                  {formatSellerReservationAmount(snapshot.cancelFee ?? 0)}
                  {snapshot.productAmount > 0 && snapshot.cancelFee === snapshot.productAmount ? <small>취소수수료 100%</small> : null}
                </Row>
                <Row label="최종 인보이스 금액" emphasis>
                  {formatSellerReservationAmount(view.amount)}
                  <small>취소 후 고객 최종 부담금</small>
                </Row>
              </>
            ) : (
              <>
                <Row label="상품금액">{formatSellerReservationAmount(snapshot.productAmount)}</Row>
                <Row label="추가금액">{formatSellerReservationAmount(snapshot.extraAmount)}</Row>
                <Row label="할인">{formatSellerReservationAmount(snapshot.discountAmount)}</Row>
                <Row label="총 인보이스 금액" emphasis>
                  {formatSellerReservationAmount(view.amount)}
                </Row>
              </>
            )}
          </dl>
          {isCancelSnapshot ? (
            <p className="seller-rsv-formula">
              <span>결제금액 - 환불금액 = 최종 인보이스 금액</span>
              <b>
                {formatSellerReservationAmount(snapshot.paidAmount).replace("원", "")} - {formatSellerReservationAmount(snapshot.refundAmount).replace("원", "")} ={" "}
                {formatSellerReservationAmount(view.amount)}
              </b>
            </p>
          ) : null}
          <p className="seller-pd-conditions-scope">
            <Lock size={12} aria-hidden="true" />
            <span>
              현재 상품가격과 무관하게 발행 시점 예약 Snapshot이 적용됩니다.
              {priceChanged ? ` (참고: 현재 상품 판매가 ${formatSellerReservationAmount(currentPrice ?? 0)})` : ""}
            </span>
          </p>
        </section>

        <section className="panel seller-pd-card seller-inv-card-reservation" aria-labelledby="seller-inv-reservation-title">
          <h2 id="seller-inv-reservation-title">
            예약정보 <small>현재 예약 기준</small>
          </h2>
          <dl className="seller-relation-dl seller-rsv-detail-dl">
            <Row label="예약번호">
              <Link href={sellerReservationDetailPath(invoice.reservationCode)} className="seller-rsv-code">
                {invoice.reservationCode}
              </Link>
            </Row>
            <Row label="예약자">
              {invoice.customerName} <small>{invoice.customerPhoneMasked}</small>
            </Row>
            <Row label="상품명">{invoice.productName}</Row>
            <Row label="상품코드">{invoice.productCode}</Row>
            <Row label="여행일">{reservation.travelDate.replaceAll("-", ".")}</Row>
            <Row label="예약인원">{reservation.pax}명</Row>
            <Row label="예약상태">
              <span className="seller-rsv-current-status">
                <span className={`badge ${sellerInvoiceReservationStatusBadgeClass(invoice.reservationStatus)}`}>{invoice.reservationStatus}</span>
                {settlement?.simulated ? <small>공급여행사 처리결과 Mock</small> : null}
              </span>
            </Row>
            <Row label="결제상태">
              <span className={`badge ${sellerReservationPaymentBadgeClass(invoice.paymentStatus)}`}>{invoice.paymentStatus}</span>
            </Row>
            <Row label="상품 현재상태">
              {product ? (
                <span className={`badge ${sellerAdminProductStatusBadgeClass(product.salesStatus)}`}>{product.salesStatus}</span>
              ) : (
                "확인 불가"
              )}
            </Row>
          </dl>
          <p className="seller-pd-origin-note">
            <InfoIcon size={12} aria-hidden="true" />
            상품이 판매중지되어도 발행된 인보이스에는 영향이 없습니다.
          </p>
        </section>

        <section className="panel seller-pd-card seller-inv-card-supplier" aria-labelledby="seller-inv-supplier-title">
          <h2 id="seller-inv-supplier-title">공급여행사 정보</h2>
          <dl className="seller-relation-dl seller-rsv-detail-dl">
            <Row label="여행사명">{invoice.supplierName}</Row>
            <Row label="공급여행사 코드">{invoice.supplierCode}</Row>
            <Row label="사업자명">{supplierInfo?.businessName ?? "-"}</Row>
            <Row label="대표자">{supplierInfo?.representative ?? "-"}</Row>
            <Row label="사업자번호">{supplierInfo?.businessNumber ?? "-"}</Row>
            <Row label="연락처">{supplierInfo?.phone ?? "-"}</Row>
            <Row label="주소">{supplierInfo?.address ?? "-"}</Row>
            <Row label="관계상태">
              <span className={`badge ${supplierStatusBadgeClass(supplierStatus)}`}>{supplierStatus}</span>
            </Row>
          </dl>
          <p className="seller-pd-origin-note">
            <Lock size={12} aria-hidden="true" />
            조회 전용 · SAMPLE 사업자 정보
          </p>
        </section>

        <section className="panel seller-pd-card seller-inv-card-seller" aria-labelledby="seller-inv-seller-title">
          <h2 id="seller-inv-seller-title">판매점 정보</h2>
          <dl className="seller-relation-dl seller-rsv-detail-dl">
            <Row label="판매점명">{sellerName}</Row>
            <Row label="판매점코드">{invoice.sellerId}</Row>
            <Row label="대표자">{sellerInfo?.representative ?? "-"}</Row>
            <Row label="사업자번호">{sellerInfo?.businessNumber ?? "-"}</Row>
            <Row label="담당자">{sellerInfo?.contactName ?? "-"}</Row>
            <Row label="연락처">{sellerInfo?.contactPhone ?? "-"}</Row>
          </dl>
          <p className="seller-pd-origin-note">
            <Lock size={12} aria-hidden="true" />
            조회 전용 · 판매점 가입 시 등록된 정보
          </p>
        </section>

        <section className="panel seller-pd-card seller-inv-card-payment" aria-labelledby="seller-inv-payment-title">
          <h2 id="seller-inv-payment-title">
            결제정보 <small>v{view.version} 기준</small>
          </h2>
          <dl className="seller-pd-conditions-dl">
            {isCancelSnapshot ? (
              <>
                <Row label="총 예약금액">{formatSellerReservationAmount(snapshot.productAmount)}</Row>
                <Row label="결제금액">{formatSellerReservationAmount(snapshot.paidAmount)}</Row>
                <Row label="환불금액">{formatSellerReservationAmount(snapshot.refundAmount)}</Row>
                <Row label="최종 청구금액" emphasis>
                  {formatSellerReservationAmount(view.amount)}
                </Row>
              </>
            ) : (
              <>
                <Row label="총 청구금액">{formatSellerReservationAmount(view.amount)}</Row>
                <Row label="결제금액">{formatSellerReservationAmount(snapshot.paidAmount)}</Row>
              </>
            )}
            <Row label="미결제금액">
              <span className={unpaid > 0 ? "seller-rsv-unpaid" : undefined}>{formatSellerReservationAmount(unpaid)}</span>
            </Row>
            <Row label="결제수단">{snapshot.paymentMethod ?? "-"}</Row>
            <Row label="결제상태">
              <span className={`badge ${sellerReservationPaymentBadgeClass(snapshot.paymentStatus)}`}>{snapshot.paymentStatus}</span>
            </Row>
          </dl>
          {isCancelSnapshot ? (
            <p className="seller-relation-drawer-help">환불금액은 고객에게 돌려준 금액이며, 인보이스 금액은 취소 후 고객이 최종 부담하는 금액입니다.</p>
          ) : null}
        </section>

        <section className="panel seller-pd-card seller-inv-card-history" aria-labelledby="seller-inv-history-title">
          <h2 id="seller-inv-history-title">
            인보이스 이력 <small>{invoice.versions.length}개 Version</small>
          </h2>
          <ol className="seller-inv-versions">
            {[...invoice.versions].reverse().map((version) => {
              const isCurrentVersion = version.version === invoice.currentVersion && hasValidVersion;
              return (
                <li key={version.version} className={version.version === view.version ? "is-selected" : undefined}>
                  <button
                    type="button"
                    className="seller-inv-versions-doc"
                    aria-label={`v${version.version} 문서보기`}
                    onClick={() => setPreviewVersion(version.version)}
                  >
                    <FileText size={13} aria-hidden="true" />
                    문서보기
                  </button>
                  <button type="button" onClick={() => selectVersion(version.version)} aria-pressed={version.version === view.version}>
                    <span className="seller-inv-versions-head">
                      <b>v{version.version}</b>
                      <span className={`badge ${sellerInvoiceStatusBadgeClass(version.status)}`}>
                        {isCurrentVersion ? "현재 유효" : version.status}
                      </span>
                      {isCurrentVersion && version.status !== "정상" ? (
                        <span className={`badge ${sellerInvoiceStatusBadgeClass(version.status)}`}>{version.status}</span>
                      ) : null}
                    </span>
                    <time>{formatSellerReservationDateTime(version.issuedAt)}</time>
                    <strong>{formatSellerReservationAmount(version.amount)}</strong>
                    <small>{version.reason}</small>
                  </button>
                </li>
              );
            })}
          </ol>
          <h3 className="seller-rsv-subtitle">상태 변경 이력</h3>
          <ol className="seller-pd-timeline seller-rsv-timeline">
            {invoice.history.map((record, index) => (
              <li key={`${record.at}-${index}`}>
                <time>{formatSellerReservationDateTime(record.at)}</time>
                <span>
                  <b>{record.status}</b>
                  <small>{record.note}</small>
                </span>
              </li>
            ))}
          </ol>
          <p className="seller-pd-origin-note">
            <Lock size={12} aria-hidden="true" />
            Version은 삭제되지 않으며 과거 Version은 조회만 가능합니다.
          </p>
        </section>

        <section className="panel seller-pd-card seller-inv-card-issuer" aria-labelledby="seller-inv-issuer-title">
          <h2 id="seller-inv-issuer-title">발행정보</h2>
          <dl className="seller-relation-dl seller-rsv-detail-dl is-single">
            <Row label="발행주체">
              {invoice.supplierName} <small>공급여행사 · AOS 시스템 자동발행</small>
            </Row>
            <Row label="수신">
              {sellerName} <small>판매점 · {invoice.sellerId}</small>
            </Row>
            <Row label="문서 구분">
              예약/결제 기반 거래문서 <small>고객용 영수증 · 세금계산서 아님</small>
            </Row>
          </dl>
          <p className="seller-pd-origin-note">
            <Lock size={12} aria-hidden="true" />
            판매점은 인보이스 내용을 수정할 수 없습니다. 재발행은 예약/결제 변경 확정 시에만 가능합니다.
          </p>
        </section>

        <section className="panel seller-pd-card seller-inv-card-sends" aria-labelledby="seller-inv-sends-title">
          <h2 id="seller-inv-sends-title">
            발송이력 <small>{invoice.sends.length}건</small>
          </h2>
          {sends.length === 0 ? (
            <p className="seller-inv-sends-empty">발송이력이 없습니다.</p>
          ) : (
            <div className="seller-inv-sends-wrap">
              <table className="seller-inv-sends-table">
                <thead>
                  <tr>
                    <th scope="col">발송일시</th>
                    <th scope="col">Version</th>
                    <th scope="col">방식</th>
                    <th scope="col">수신</th>
                    <th scope="col">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {sends.map((record, index) => (
                    <tr key={`${record.sentAt}-${record.channel}-${index}`}>
                      <td>{formatSellerReservationDateTime(record.sentAt)}</td>
                      <td>
                        <b>v{record.version}</b>
                        {record.version !== invoice.currentVersion ? <small>현재 무효</small> : null}
                      </td>
                      <td>{record.channel}</td>
                      <td>{record.recipient}</td>
                      <td>
                        <span className="badge success">{record.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="seller-pd-origin-note">
            <InfoIcon size={12} aria-hidden="true" />
            프로토타입 Mock 발송이력 · 실제 발송 없음 · 재발행 후에도 과거 Version 발송기록은 보존됩니다.
          </p>
        </section>
      </div>

      {supplierLinked ? null : (
        <fieldset className="seller-dash-mock seller-inv-mock">
          <legend>프로토타입 Mock · 공급여행사 취소처리 결과</legend>
          {canSimulate ? (
            <div role="group" aria-label="공급여행사 취소처리 결과 Mock">
              <select
                aria-label="취소수수료 기준"
                value={invoice.reservationStatus === "취소승인" && settlement ? settlement.feeRate : feeRate}
                disabled={invoice.reservationStatus === "취소승인"}
                onChange={(event) => setFeeRate(Number(event.target.value))}
              >
                {CANCEL_FEE_PRESETS.map((preset) => (
                  <option key={preset.rate} value={preset.rate}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <button type="button" className="secondary" disabled={invoice.reservationStatus !== "취소요청"} onClick={() => simulate("취소승인")}>
                취소승인 반영 (환불 전)
              </button>
              <button type="button" className="secondary" onClick={() => simulate("취소완료")}>
                취소완료 + 환불완료 반영
              </button>
            </div>
          ) : (
            <p>취소요청 상태의 예약에서만 공급여행사 취소처리 결과를 재현할 수 있습니다. 예약 상세에서 취소요청을 먼저 등록해주세요.</p>
          )}
        </fieldset>
      )}
      <SellerProductsMockControls sellerId={sellerId} mock={mock} keys={MOCK_KEYS} />

      {reissueOpen && reissue.kind === "available" && !isPast ? (
        <SellerInvoiceReissueModal
          invoice={invoice}
          target={reissue.target}
          defaultReason={reissue.defaultReason}
          suspended={Boolean(confirmDialog)}
          onClose={() => setReissueOpen(false)}
          onSubmit={requestReissue}
        />
      ) : null}
      {previewVersion !== null ? (
        <SellerInvoicePreviewModal
          invoice={invoice}
          versionNumber={previewVersion}
          sellerName={sellerName}
          supplier={supplierParty}
          seller={sellerParty}
          travelDate={reservation.travelDate}
          suspended={sendOpen || Boolean(confirmDialog)}
          onClose={() => setPreviewVersion(null)}
          onShowCurrent={() => setPreviewVersion(invoice.currentVersion)}
          onPdf={() => notify(SELLER_INVOICE_PDF_MOCK)}
          onPrint={() => notify(SELLER_INVOICE_PRINT_MOCK)}
          onSend={() => setSendOpen(true)}
        />
      ) : null}
      {sendOpen && canSendCurrent ? (
        <SellerInvoiceSendModal
          invoice={invoice}
          version={current}
          sellerName={sellerName}
          suspended={Boolean(confirmDialog)}
          onClose={() => setSendOpen(false)}
          onSubmit={requestSend}
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
