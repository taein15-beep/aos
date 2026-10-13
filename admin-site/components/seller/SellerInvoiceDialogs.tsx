"use client";

import { AlertTriangle, ArrowRight, Download, Info as InfoIcon, Lock, Printer, Send } from "lucide-react";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { SellerModalFrame } from "@/components/seller/SellerSupplierJoinDialogs";
import {
  SELLER_INVOICE_REASON_TEXT_MAX,
  SELLER_INVOICE_REISSUE_REASONS,
  SELLER_INVOICE_SEND_CHANNELS,
  SELLER_INVOICE_SEND_DEFAULT_EMAIL,
  SELLER_INVOICE_SEND_DEFAULT_PHONE,
  formatSellerInvoiceDelta,
  getSellerInvoiceSendState,
  isValidSellerInvoiceEmail,
  isValidSellerInvoicePhone,
  maskSellerInvoicePhone,
  sellerInvoiceStatusBadgeClass,
  type SellerInvoice,
  type SellerInvoiceReissueReason,
  type SellerInvoiceSendChannel,
  type SellerInvoiceSnapshot,
  type SellerInvoiceVersion,
} from "@/lib/seller/seller-invoices-data";
import {
  formatSellerReservationAmount,
  formatSellerReservationDateTime,
  sellerReservationPaymentBadgeClass,
} from "@/lib/seller/seller-reservations-data";
import { supplierLogoText } from "@/lib/seller/seller-suppliers-data";

export type SellerInvoiceReissueInput = { reason: SellerInvoiceReissueReason; reasonDetail: string | null };

export const SELLER_INVOICE_PDF_MOCK = "PDF 다운로드 기능은 다음 연동 단계에서 제공됩니다.";
export const SELLER_INVOICE_PRINT_MOCK = "인쇄 기능은 다음 연동 단계에서 제공됩니다.";
const SELLER_INVOICE_CANCEL_REVIEW_NOTE = "예약 취소요청 검토중 · 취소 확정 시 재발행된 최신 인보이스를 발송해주세요.";

function SnapshotAmountRows({ snapshot }: { snapshot: SellerInvoiceSnapshot }) {
  if (snapshot.cancelFee === null) {
    return (
      <>
        <div>
          <dt>상품금액</dt>
          <dd>
            {formatSellerReservationAmount(snapshot.productAmount)}
            <small>
              {formatSellerReservationAmount(snapshot.unitPrice)} × {snapshot.pax}명
            </small>
          </dd>
        </div>
        <div>
          <dt>추가금액</dt>
          <dd>{formatSellerReservationAmount(snapshot.extraAmount)}</dd>
        </div>
        <div>
          <dt>할인</dt>
          <dd>{formatSellerReservationAmount(snapshot.discountAmount)}</dd>
        </div>
      </>
    );
  }
  return (
    <>
      <div>
        <dt>총 예약금액</dt>
        <dd>{formatSellerReservationAmount(snapshot.productAmount)}</dd>
      </div>
      <div>
        <dt>결제금액</dt>
        <dd>{formatSellerReservationAmount(snapshot.paidAmount)}</dd>
      </div>
      <div>
        <dt>환불금액</dt>
        <dd>{formatSellerReservationAmount(snapshot.refundAmount)}</dd>
      </div>
      <div>
        <dt>취소수수료</dt>
        <dd>{formatSellerReservationAmount(snapshot.cancelFee)}</dd>
      </div>
    </>
  );
}

/** 인보이스 재발행 Modal — 기존 Version 보존 · 같은 인보이스번호로 Version 증가 */
export function SellerInvoiceReissueModal({
  invoice,
  target,
  defaultReason,
  suspended = false,
  onClose,
  onSubmit,
}: {
  invoice: SellerInvoice;
  target: SellerInvoiceSnapshot;
  defaultReason: SellerInvoiceReissueReason;
  /** Confirm Modal이 위에 열려 있으면 Esc/닫기 무시 */
  suspended?: boolean;
  onClose: () => void;
  onSubmit: (input: SellerInvoiceReissueInput) => void;
}) {
  const [reason, setReason] = useState<SellerInvoiceReissueReason>(defaultReason);
  const [reasonDetail, setReasonDetail] = useState("");
  const current = invoice.versions[invoice.versions.length - 1];
  const nextVersion = current.version + 1;
  const isOther = reason === "기타";
  const canSubmit = !isOther || reasonDetail.trim().length > 0;
  const delta = target.amount - current.amount;

  const guardedClose = useCallback(() => {
    if (!suspended) onClose();
  }, [suspended, onClose]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSubmit) return;
    onSubmit({ reason, reasonDetail: isOther ? reasonDetail.trim() : null });
  };

  return (
    <SellerModalFrame
      titleId="seller-inv-reissue-title"
      title="인보이스 재발행"
      className="seller-rsv-cancel-modal seller-inv-reissue-modal"
      onClose={guardedClose}
      actions={
        <>
          <button type="button" className="secondary" onClick={guardedClose}>
            닫기
          </button>
          <button type="submit" form="seller-inv-reissue-form" className="primary" disabled={!canSubmit}>
            재발행
          </button>
        </>
      }
    >
      <p className="seller-sup-modal-lead">기존 인보이스는 보존되고 새로운 Version으로 재발행됩니다.</p>

      <section className="seller-price-section" aria-labelledby="seller-inv-reissue-current-title">
        <h4 id="seller-inv-reissue-current-title">기존 인보이스 정보</h4>
        <dl className="seller-rsv-cancel-info">
          <div>
            <dt>현재 인보이스</dt>
            <dd>{invoice.invoiceCode}</dd>
          </div>
          <div>
            <dt>현재 Version</dt>
            <dd>v{current.version}</dd>
          </div>
          <div>
            <dt>현재 금액</dt>
            <dd>{formatSellerReservationAmount(current.amount)}</dd>
          </div>
          <div>
            <dt>현재상태</dt>
            <dd>
              <span className={`badge ${sellerInvoiceStatusBadgeClass(invoice.status)}`}>{invoice.status}</span>
            </dd>
          </div>
        </dl>
      </section>

      <form id="seller-inv-reissue-form" className="seller-price-section seller-rsv-cancel-form" onSubmit={submit} noValidate>
        <label className="seller-price-label" htmlFor="seller-inv-reissue-reason">
          재발행 사유 <em className="seller-rsv-required">필수</em>
        </label>
        <select
          id="seller-inv-reissue-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value as SellerInvoiceReissueReason)}
        >
          {SELLER_INVOICE_REISSUE_REASONS.map((item) => (
            <option key={item} value={item}>
              {item}
              {item === defaultReason ? " (자동선택)" : ""}
            </option>
          ))}
        </select>
        {isOther ? (
          <>
            <textarea
              aria-label="기타 재발행 사유"
              value={reasonDetail}
              maxLength={SELLER_INVOICE_REASON_TEXT_MAX}
              rows={2}
              placeholder="재발행 사유를 입력해주세요."
              aria-required="true"
              aria-invalid={reasonDetail.trim().length === 0}
              onChange={(event) => setReasonDetail(event.target.value)}
              autoFocus
            />
            <p className="seller-rsv-cancel-count">
              {reasonDetail.trim().length === 0 ? <span>기타 사유를 입력해야 재발행할 수 있습니다.</span> : <span />}
              {reasonDetail.length}/{SELLER_INVOICE_REASON_TEXT_MAX}
            </p>
          </>
        ) : null}
      </form>

      <section className="seller-price-section" aria-labelledby="seller-inv-reissue-basis-title">
        <h4 id="seller-inv-reissue-basis-title">재발행 기준 (현재 예약/결제 Snapshot)</h4>
        <dl className="seller-price-readonly seller-rsv-cancel-pay">
          <SnapshotAmountRows snapshot={target} />
          <div className="is-total">
            <dt>{target.cancelFee === null ? "총 인보이스 금액" : "최종 고객 부담금"}</dt>
            <dd>{formatSellerReservationAmount(target.amount)}</dd>
          </div>
        </dl>
        {target.cancelFee !== null ? (
          <p className="seller-price-help">
            취소 재발행 금액은 취소 후 고객 최종 부담금(취소수수료) 기준입니다. 환불금액과 인보이스 금액은 서로 다른 값입니다.
          </p>
        ) : null}
      </section>

      <section className="seller-price-section" aria-labelledby="seller-inv-reissue-preview-title">
        <h4 id="seller-inv-reissue-preview-title">재발행 Preview</h4>
        <div className="seller-inv-compare">
          <div>
            <span>기존 v{current.version}</span>
            <strong>{formatSellerReservationAmount(current.amount)}</strong>
            <small>총액 · 재발행 후 무효</small>
          </div>
          <ArrowRight size={16} aria-hidden="true" />
          <div className="is-next">
            <span>재발행 v{nextVersion}</span>
            <strong>{formatSellerReservationAmount(target.amount)}</strong>
            <small>{target.cancelFee !== null && target.amount === target.productAmount ? "취소수수료 100%" : "최종금액 · 현재 유효"}</small>
          </div>
        </div>
        <p className="seller-inv-delta">
          변경금액 <b className={delta < 0 ? "is-minus" : undefined}>{formatSellerInvoiceDelta(delta)}</b>
        </p>
      </section>

      <p className="seller-pd-origin-note">
        <Lock size={12} aria-hidden="true" />
        인보이스번호는 유지되고 Version만 증가합니다. 판매점은 인보이스 내용을 직접 수정할 수 없습니다.
      </p>
    </SellerModalFrame>
  );
}

type DocParty = { representative: string; businessNumber: string; phone: string; address?: string; contactName?: string } | null;

function DocField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function amountText(value: number) {
  return value.toLocaleString("ko-KR");
}

/** 인보이스 문서 본문 — 인쇄용 CSS 적용 대상 (.invoice-document) */
function InvoiceDocument({
  invoice,
  version,
  sellerName,
  supplier,
  seller,
  travelDate,
}: {
  invoice: SellerInvoice;
  version: SellerInvoiceVersion;
  sellerName: string;
  supplier: DocParty;
  seller: DocParty;
  travelDate: string;
}) {
  const snapshot = version.snapshot;
  const isCancel = snapshot.cancelFee !== null;
  const isVoid = version.status === "무효";
  const isPast = version.version !== invoice.currentVersion;
  const adjustment = snapshot.extraAmount - snapshot.discountAmount;
  const unpaid = isCancel ? 0 : Math.max(0, version.amount - snapshot.paidAmount);
  const fullFee = isCancel && snapshot.productAmount > 0 && snapshot.cancelFee === snapshot.productAmount;

  return (
    <article className={`invoice-document${isVoid ? " is-void" : ""}`} aria-label={`${invoice.invoiceCode} v${version.version} 인보이스 문서`}>
      {isVoid ? (
        <span className="invoice-document-watermark" aria-hidden="true">
          <b>무효 VOID</b>
        </span>
      ) : null}

      <header className="invoice-document-head">
        <div className="invoice-document-brand">
          <span className="seller-relation-logo is-large" aria-hidden="true">
            {supplierLogoText(invoice.supplierName)}
          </span>
          <div>
            <strong>{invoice.supplierName}</strong>
            <small>{invoice.supplierCode}</small>
          </div>
        </div>
        <div className="invoice-document-title">
          <h4>INVOICE</h4>
          <p>
            인보이스{isCancel ? " · 취소 반영" : ""}
            {version.status !== "정상" ? (
              <span className={`badge ${sellerInvoiceStatusBadgeClass(version.status)}`}>{version.status}</span>
            ) : null}
          </p>
        </div>
      </header>

      <dl className="invoice-document-meta">
        <DocField label="인보이스번호">{invoice.invoiceCode}</DocField>
        <DocField label="Version">v{version.version}</DocField>
        <DocField label="발행일">{formatSellerReservationDateTime(version.issuedAt)}</DocField>
        <DocField label="예약번호">{invoice.reservationCode}</DocField>
      </dl>

      <div className="invoice-document-parties">
        <section aria-label="공급자">
          <h5>공급자</h5>
          <dl>
            <DocField label="상호">
              {invoice.supplierName} <small>{invoice.supplierCode}</small>
            </DocField>
            <DocField label="대표자">{supplier?.representative ?? "-"}</DocField>
            <DocField label="사업자등록번호">{supplier?.businessNumber ?? "-"}</DocField>
            <DocField label="주소">{supplier?.address ?? "-"}</DocField>
            <DocField label="연락처">{supplier?.phone ?? "-"}</DocField>
          </dl>
        </section>
        <section aria-label="판매점">
          <h5>판매점</h5>
          <dl>
            <DocField label="상호">
              {sellerName} <small>{invoice.sellerId}</small>
            </DocField>
            <DocField label="대표자">{seller?.representative ?? "-"}</DocField>
            <DocField label="사업자번호">{seller?.businessNumber ?? "-"}</DocField>
            <DocField label="담당자">{seller?.contactName ?? "-"}</DocField>
            <DocField label="연락처">{seller?.phone ?? "-"}</DocField>
          </dl>
        </section>
      </div>

      <section className="invoice-document-section" aria-label="예약정보">
        <h5>예약정보</h5>
        <dl className="invoice-document-grid">
          <DocField label="상품명">{invoice.productName}</DocField>
          <DocField label="상품코드">{invoice.productCode}</DocField>
          <DocField label="여행일">{travelDate.replaceAll("-", ".")}</DocField>
          <DocField label="인원">{snapshot.pax}명</DocField>
          <DocField label="예약상태">{snapshot.reservationStatus}</DocField>
          <DocField label="예약자">
            {invoice.customerName} <small>{invoice.customerPhoneMasked}</small>
          </DocField>
        </dl>
      </section>

      <section className="invoice-document-section" aria-label="금액">
        <h5>금액</h5>
        <div className="invoice-document-table-wrap">
          <table className="invoice-document-table">
            <thead>
              <tr>
                <th scope="col">항목</th>
                <th scope="col">단가</th>
                <th scope="col">수량</th>
                <th scope="col">금액</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {invoice.productName}
                  <small>{snapshot.saleMode}{isCancel ? " · 예약금액" : ""}</small>
                </td>
                <td>{amountText(snapshot.unitPrice)}</td>
                <td>{snapshot.pax}</td>
                <td>{amountText(snapshot.productAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {isCancel ? (
          <dl className="invoice-document-total">
            <DocField label="예약금액">{amountText(snapshot.productAmount)}</DocField>
            {snapshot.paidAmount !== snapshot.productAmount ? <DocField label="실결제금액">{amountText(snapshot.paidAmount)}</DocField> : null}
            <DocField label="환불반영">
              <span className={snapshot.refundAmount > 0 ? "is-minus" : undefined}>
                {snapshot.refundAmount > 0 ? `-${amountText(snapshot.refundAmount)}` : "0"}
              </span>
            </DocField>
            <DocField label={fullFee ? "취소수수료 (100%)" : "취소수수료"}>{amountText(snapshot.cancelFee ?? 0)}</DocField>
            <div className="is-total">
              <dt>최종 인보이스 금액</dt>
              <dd>{formatSellerReservationAmount(version.amount)}</dd>
            </div>
          </dl>
        ) : (
          <dl className="invoice-document-total">
            <DocField label="Subtotal">{amountText(snapshot.productAmount)}</DocField>
            <DocField label="Adjustment">{amountText(adjustment)}</DocField>
            <div className="is-total">
              <dt>Total</dt>
              <dd>{formatSellerReservationAmount(version.amount)}</dd>
            </div>
          </dl>
        )}
        {isCancel ? (
          <p className="invoice-document-note">
            최종 인보이스 금액 = 취소수수료(고객 최종 부담금) · 결제금액 {amountText(snapshot.paidAmount)} − 환불 {amountText(snapshot.refundAmount)} ={" "}
            {amountText(version.amount)}. 환불반영과 취소수수료는 합산하지 않습니다.
          </p>
        ) : null}
      </section>

      <section className="invoice-document-section" aria-label="결제정보">
        <h5>결제정보</h5>
        <dl className="invoice-document-grid">
          <DocField label="결제상태">
            <span className={`badge ${sellerReservationPaymentBadgeClass(snapshot.paymentStatus)}`}>{snapshot.paymentStatus}</span>
          </DocField>
          <DocField label="결제수단">{snapshot.paymentMethod ?? "-"}</DocField>
          <DocField label="결제금액">{formatSellerReservationAmount(snapshot.paidAmount)}</DocField>
          <DocField label="환불금액">{isCancel ? formatSellerReservationAmount(snapshot.refundAmount) : "-"}</DocField>
          {!isCancel ? (
            <DocField label="미결제금액">
              <span className={unpaid > 0 ? "seller-rsv-unpaid" : undefined}>{formatSellerReservationAmount(unpaid)}</span>
            </DocField>
          ) : null}
          <DocField label={isCancel ? "최종 부담금" : "최종 청구금액"}>
            <b>{formatSellerReservationAmount(version.amount)}</b>
          </DocField>
        </dl>
      </section>

      <footer className="invoice-document-foot">
        {isPast || isVoid ? (
          <p className="is-warn">
            <AlertTriangle size={12} aria-hidden="true" />
            {isPast ? "본 문서는 현재 무효 처리된 과거 Version입니다." : "본 문서는 무효 처리된 인보이스입니다."}
          </p>
        ) : null}
        {version.version > 1 ? (
          <p>
            본 문서는 {invoice.invoiceCode} v{version.version - 1}을 대체하는 v{version.version} 문서입니다.
          </p>
        ) : null}
        <p>본 인보이스는 예약 및 결제정보를 기준으로 생성된 거래문서입니다.</p>
        <p>
          <small>세금계산서가 아닙니다. · 발행: {invoice.supplierName} (AOS 자동발행) · 발행사유: {version.reason}</small>
        </p>
      </footer>
    </article>
  );
}

/** 인보이스 미리보기 — 실제 PDF 생성 · 인쇄 · 발송 없음 (재발행은 상세 Header에서만) */
export function SellerInvoicePreviewModal({
  invoice,
  versionNumber,
  sellerName,
  supplier,
  seller,
  travelDate,
  suspended = false,
  onClose,
  onShowCurrent,
  onPdf,
  onPrint,
  onSend,
}: {
  invoice: SellerInvoice | null;
  versionNumber: number;
  sellerName: string;
  supplier: DocParty;
  seller: DocParty;
  travelDate: string;
  /** 발송 Modal · Confirm이 위에 열려 있으면 Esc/닫기 무시 */
  suspended?: boolean;
  onClose: () => void;
  onShowCurrent: () => void;
  onPdf: () => void;
  onPrint: () => void;
  onSend: () => void;
}) {
  const guardedClose = useCallback(() => {
    if (!suspended) onClose();
  }, [suspended, onClose]);
  const version = invoice?.versions.find((item) => item.version === versionNumber) ?? null;
  const isPast = Boolean(invoice && version && version.version !== invoice.currentVersion);
  const sendState = invoice && version ? getSellerInvoiceSendState(invoice, version.version) : null;
  const barWarn = isPast
    ? null
    : sendState?.kind === "blocked"
      ? sendState.message
      : invoice?.reservationStatus === "취소요청"
        ? SELLER_INVOICE_CANCEL_REVIEW_NOTE
        : null;

  return (
    <SellerModalFrame
      titleId="seller-inv-preview-title"
      title="인보이스 미리보기"
      className="seller-inv-preview-modal"
      onClose={guardedClose}
      actions={
        <>
          <button type="button" className="secondary" disabled={!version} onClick={onPdf}>
            <Download size={14} aria-hidden="true" />
            PDF 다운로드
          </button>
          <button type="button" className="secondary" disabled={!version} onClick={onPrint}>
            <Printer size={14} aria-hidden="true" />
            인쇄
          </button>
          {sendState?.kind === "available" ? (
            <button type="button" className="secondary" onClick={onSend}>
              <Send size={14} aria-hidden="true" />
              발송
            </button>
          ) : (
            <span className="seller-prod-action-lock" title={sendState?.message ?? "발송할 문서가 없습니다."}>
              <button type="button" className="secondary" disabled aria-label={`발송 불가 — ${sendState?.message ?? "발송할 문서가 없습니다."}`}>
                <Send size={14} aria-hidden="true" />
                발송
              </button>
            </span>
          )}
          <button type="button" className="primary" onClick={guardedClose}>
            닫기
          </button>
        </>
      }
    >
      {!invoice ? (
        <div className="seller-sup-empty invoice-preview-empty">
          <h3>인보이스 문서를 표시할 수 없습니다.</h3>
          <p>인보이스 정보를 다시 확인해주세요.</p>
        </div>
      ) : !version ? (
        <div className="seller-sup-empty invoice-preview-empty">
          <h3>해당 Version을 찾을 수 없습니다.</h3>
          <p>현재 유효 Version 문서를 확인해주세요.</p>
          <button type="button" className="secondary" onClick={onShowCurrent}>
            현재 Version 보기
          </button>
        </div>
      ) : (
        <>
          <div className={`invoice-preview-bar${isPast ? " is-past" : ""}`}>
            <span className="invoice-preview-code">
              {invoice.invoiceCode} / v{version.version}
            </span>
            <span className={`badge ${sellerInvoiceStatusBadgeClass(version.status)}`}>{version.status}</span>
            {isPast ? (
              <strong className="invoice-preview-past">
                <Lock size={12} aria-hidden="true" />
                과거 Version · v{version.version} · 무효
              </strong>
            ) : version.status === "정상" || version.status === "재발행 필요" ? (
              <span className="seller-inv-current-chip">
                현재 Version <b>v{version.version}</b>
              </span>
            ) : null}
            {barWarn ? <small className="invoice-preview-warn">{barWarn}</small> : null}
          </div>
          <div className="invoice-preview-stage">
            <InvoiceDocument invoice={invoice} version={version} sellerName={sellerName} supplier={supplier} seller={seller} travelDate={travelDate} />
          </div>
        </>
      )}
    </SellerModalFrame>
  );
}

export type SellerInvoiceSendTarget = { channel: SellerInvoiceSendChannel; recipient: string };

/** 인보이스 발송 Modal — 이메일 · 문자 · 알림톡 복수 선택 (실제 발송 없음) */
export function SellerInvoiceSendModal({
  invoice,
  version,
  sellerName,
  suspended = false,
  onClose,
  onSubmit,
}: {
  invoice: SellerInvoice;
  version: SellerInvoiceVersion;
  sellerName: string;
  suspended?: boolean;
  onClose: () => void;
  onSubmit: (targets: SellerInvoiceSendTarget[]) => void;
}) {
  const [channels, setChannels] = useState<SellerInvoiceSendChannel[]>(["이메일"]);
  const [email, setEmail] = useState(SELLER_INVOICE_SEND_DEFAULT_EMAIL);
  const [phone, setPhone] = useState(SELLER_INVOICE_SEND_DEFAULT_PHONE);
  const useEmail = channels.includes("이메일");
  const usePhone = channels.includes("문자") || channels.includes("알림톡");
  const emailError = useEmail && !isValidSellerInvoiceEmail(email) ? "이메일 형식이 올바르지 않습니다." : null;
  const phoneError = usePhone && !isValidSellerInvoicePhone(phone) ? "휴대폰번호 형식이 올바르지 않습니다. (예: 010-1234-5678)" : null;
  const channelError = channels.length === 0 ? "발송방식을 1개 이상 선택해주세요." : null;
  const canSubmit = !emailError && !phoneError && !channelError;

  const guardedClose = useCallback(() => {
    if (!suspended) onClose();
  }, [suspended, onClose]);

  const toggleChannel = (channel: SellerInvoiceSendChannel) =>
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((item) => item !== channel)
        : SELLER_INVOICE_SEND_CHANNELS.filter((item) => item === channel || prev.includes(item)),
    );

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSubmit) return;
    onSubmit(
      channels.map((channel) => ({
        channel,
        recipient: channel === "이메일" ? email.trim() : maskSellerInvoicePhone(phone),
      })),
    );
  };

  return (
    <SellerModalFrame
      titleId="seller-inv-send-title"
      title="인보이스 발송"
      className="seller-rsv-cancel-modal seller-inv-send-modal"
      onClose={guardedClose}
      actions={
        <>
          <button type="button" className="secondary" onClick={guardedClose}>
            닫기
          </button>
          <button type="submit" form="seller-inv-send-form" className="primary" disabled={!canSubmit}>
            발송
          </button>
        </>
      }
    >
      <dl className="seller-rsv-cancel-info">
        <div>
          <dt>인보이스</dt>
          <dd>{invoice.invoiceCode}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>
            v{version.version} <span className={`badge ${sellerInvoiceStatusBadgeClass(version.status)}`}>{version.status}</span>
          </dd>
        </div>
        <div>
          <dt>수신자</dt>
          <dd>
            {sellerName} <small>{invoice.sellerId}</small>
          </dd>
        </div>
        <div>
          <dt>금액</dt>
          <dd>{formatSellerReservationAmount(version.amount)}</dd>
        </div>
      </dl>

      {invoice.reservationStatus === "취소요청" ? (
        <p className="seller-pd-origin-note seller-inv-send-review">
          <AlertTriangle size={12} aria-hidden="true" />
          {SELLER_INVOICE_CANCEL_REVIEW_NOTE}
        </p>
      ) : null}

      <form id="seller-inv-send-form" className="seller-price-section seller-inv-send-form" onSubmit={submit} noValidate>
        <fieldset className="seller-inv-send-channels">
          <legend className="seller-price-label">
            발송방식 <em className="seller-rsv-required">필수</em> <small>복수 선택 가능</small>
          </legend>
          {SELLER_INVOICE_SEND_CHANNELS.map((channel) => (
            <label key={channel}>
              <input type="checkbox" checked={channels.includes(channel)} onChange={() => toggleChannel(channel)} />
              {channel}
            </label>
          ))}
        </fieldset>
        {channelError ? <p className="seller-inv-send-error">{channelError}</p> : null}

        {useEmail ? (
          <label className="seller-inv-send-field">
            <span className="seller-price-label">이메일주소</span>
            <input
              type="email"
              value={email}
              maxLength={100}
              autoComplete="off"
              aria-invalid={Boolean(emailError)}
              onChange={(event) => setEmail(event.target.value)}
            />
            {emailError ? <span className="seller-inv-send-error">{emailError}</span> : null}
          </label>
        ) : null}
        {usePhone ? (
          <label className="seller-inv-send-field">
            <span className="seller-price-label">
              휴대폰번호 <small>{channels.filter((item) => item !== "이메일").join(" · ")}</small>
            </span>
            <input
              type="tel"
              value={phone}
              maxLength={13}
              autoComplete="off"
              aria-invalid={Boolean(phoneError)}
              onChange={(event) => setPhone(event.target.value)}
            />
            {phoneError ? <span className="seller-inv-send-error">{phoneError}</span> : null}
            <small className="seller-price-help">기본값은 판매점 등록 연락처(마스킹)입니다. 알림톡 템플릿은 다음 단계에서 제공됩니다.</small>
          </label>
        ) : null}
      </form>

      <section className="seller-price-section" aria-labelledby="seller-inv-send-message-title">
        <h4 id="seller-inv-send-message-title">발송 메시지 미리보기</h4>
        <p className="seller-inv-send-message">
          {invoice.supplierName} 인보이스 {invoice.invoiceCode}이 발행되었습니다.
          <small>
            Version v{version.version} · 금액 {formatSellerReservationAmount(version.amount)}
          </small>
        </p>
      </section>

      <p className="seller-pd-origin-note">
        <InfoIcon size={12} aria-hidden="true" />
        프로토타입 Mock · 실제 이메일 · 문자 · 알림톡은 발송되지 않고 발송이력만 기록됩니다.
      </p>
    </SellerModalFrame>
  );
}
