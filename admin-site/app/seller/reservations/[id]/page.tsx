"use client";

import { AlertTriangle, ArrowLeft, Ban, Copy, ExternalLink, Info as InfoIcon, Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ShareConfirmDialog, type ShareConfirmDialogState } from "@/components/products/ShareConfirmDialog";
import { SellerProductsMockControls } from "@/components/seller/SellerProductsMockControls";
import { SellerReservationCancelModal, type SellerReservationCancelInput } from "@/components/seller/SellerReservationCancelModal";
import {
  formatSellerSettlementSigned,
  getSellerSettlementByReservation,
  sellerSettlementReflectionLabel,
} from "@/lib/admin/seller-channel-settlements";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import {
  sellerAdminProductStatusBadgeClass,
  sellerProductModeBadgeClass,
  sellerProductSalePrice,
} from "@/lib/seller/seller-admin-products-data";
import type { SupplierTradeStatus } from "@/lib/seller/seller-login-mock";
import { getSellerProductDetail } from "@/lib/seller/seller-product-detail-data";
import {
  SELLER_RESERVATION_STATUS_DESCRIPTIONS,
  formatSellerCancelReason,
  formatSellerReservationAmount,
  formatSellerReservationDateTime,
  isSellerReservationCancellable,
  sellerReservationAmount,
  sellerReservationCancelRequestedAt,
  sellerReservationTravelTiming,
  sellerReservationBookedProfit,
  sellerReservationExpectedProfit,
  sellerReservationPaymentBadgeClass,
  sellerReservationStatusBadgeClass,
  sellerReservationUnpaidAmount,
  type SellerReservationDetail,
} from "@/lib/seller/seller-reservations-data";
import { getSellerSupplierRelations } from "@/lib/seller/seller-suppliers-data";
import { useSellerProductsState } from "@/lib/seller/use-seller-products-state";
import { registerSellerReservationCancelRequest, useSellerReservationDetail } from "@/lib/seller/use-seller-reservations-state";
import { useSellerSession } from "@/lib/seller/use-seller-session";

const LIST_PATH = "/seller/reservations";
const TRAVEL_ENDED_MESSAGE = "여행이 종료된 예약은 일반 취소요청을 등록할 수 없습니다.";

type ToastState = { message: string; detail?: string };
const MOCK_KEYS = ["hyundamSuspended"] as const;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function Row({ label, children, emphasis }: { label: string; children: ReactNode; emphasis?: boolean }) {
  return (
    <div className={emphasis ? "is-emphasis" : undefined}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function formatTravelDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${value.replaceAll("-", ".")} (${weekday})`;
}

function formatBirthDate(value: string) {
  return value.replaceAll("-", ".");
}

function supplierStatusBadgeClass(status: SupplierTradeStatus) {
  if (status === "정상") return "success";
  if (status === "이용중지") return "danger";
  return "warn";
}

function profitNote(detail: SellerReservationDetail) {
  if (detail.status === "취소완료") return "취소완료";
  if (detail.status === "취소요청") return "취소 검토중";
  if (detail.status === "취소승인") return "취소승인 · 환불대기";
  return "예약 당시 조건 기준";
}

export default function SellerReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const reservationCode = decodeURIComponent(params.id ?? "");
  const session = useSellerSession();
  const sellerId = session?.sellerId ?? SELLER_ADMIN_DEMO_PROFILE.sellerId;
  const sellerName = session?.sellerName ?? SELLER_ADMIN_DEMO_PROFILE.sellerName;

  const { mock, supplierStatuses, products } = useSellerProductsState(sellerId);
  const detail = useSellerReservationDetail(sellerId, reservationCode);
  const product = detail ? (products.find((row) => row.productCode === detail.productCode) ?? null) : null;
  const productDetail = useMemo(() => (product ? getSellerProductDetail(product) : null), [product]);
  const relation = useMemo(
    () =>
      detail
        ? (getSellerSupplierRelations(sellerId, "normal").find((item) => item.supplierId === detail.supplierTravelAgencyId) ?? null)
        : null,
    [sellerId, detail],
  );

  const [toast, setToast] = useState<ToastState | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ShareConfirmDialogState | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const notify = (message: string, detailText?: string) => {
    setToast({ message, detail: detailText });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), detailText ? 3200 : 2400);
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${label}이(가) 복사되었습니다.`);
    } catch {
      notify(`${label}을(를) 복사할 수 없습니다.`);
    }
  };

  const scenarioFieldset = <SellerProductsMockControls sellerId={sellerId} mock={mock} keys={MOCK_KEYS} />;

  if (!detail) {
    return (
      <div className="seller-rsv-detail-page">
        <section className="panel seller-sup-empty">
          <h3>예약을 찾을 수 없습니다.</h3>
          <p>예약번호를 확인해주세요.</p>
          <Link href={LIST_PATH} className="secondary seller-pd-link-button">
            <ArrowLeft size={14} aria-hidden="true" />
            예약목록
          </Link>
        </section>
      </div>
    );
  }

  const amount = sellerReservationAmount(detail);
  const bookedProfit = sellerReservationBookedProfit(detail);
  const expectedProfit = sellerReservationExpectedProfit(detail);
  const unpaid = sellerReservationUnpaidAmount(detail);
  const isCommission = detail.saleMode === "수수료형";
  const supplierStatus: SupplierTradeStatus =
    supplierStatuses[detail.supplierTravelAgencyId] ?? ((relation?.status as SupplierTradeStatus | undefined) ?? "정상");
  const supplierSuspended = supplierStatus === "이용중지";
  const currentPrice = product ? (isCommission ? product.supplyPrice : sellerProductSalePrice(product)) : null;
  const priceChanged = currentPrice !== null && currentPrice !== detail.unitPrice;
  const formula = isCommission
    ? `${formatSellerReservationAmount(amount).replace("원", "")} × ${detail.bookedCommissionRate ?? 0}% = ${formatSellerReservationAmount(bookedProfit)}`
    : `(${detail.unitPrice.toLocaleString("ko-KR")} - ${(detail.bookedDepositPrice ?? 0).toLocaleString("ko-KR")}) × ${detail.pax}명 = ${formatSellerReservationAmount(bookedProfit)}`;
  const cancel = detail.cancelRequest;
  const settlementLookup = detail.status === "취소완료" ? getSellerSettlementByReservation(detail.reservationCode) : null;
  const settlementInfo = settlementLookup && settlementLookup.line.reflection !== "정상" ? settlementLookup : null;
  const travelTiming = sellerReservationTravelTiming(detail);
  const cancellable = isSellerReservationCancellable(detail.status) && !cancel;
  const cancelLocked = cancellable && travelTiming === "past";

  const openCancel = () => {
    if (cancellable && !cancelLocked) setCancelOpen(true);
  };

  const requestCancel = (input: SellerReservationCancelInput) => {
    setConfirmDialog({
      title: "취소요청을 등록하시겠습니까?",
      details: [
        { label: "예약번호", value: detail.reservationCode },
        { label: "취소사유", value: formatSellerCancelReason(input) },
      ],
      message: `${detail.supplierName}에 예약 취소요청이 전달됩니다.`,
      confirmLabel: "요청 등록",
      confirmTone: "danger",
      onConfirm: () => {
        setConfirmDialog(null);
        setCancelOpen(false);
        const lastAt = detail.statusHistory[detail.statusHistory.length - 1]?.at ?? detail.reservedAt;
        const registered = registerSellerReservationCancelRequest(sellerId, detail.reservationCode, {
          requestedAt: sellerReservationCancelRequestedAt(lastAt),
          registeredBy: sellerName,
          reason: input.reason,
          reasonDetail: input.reasonDetail,
          customerNote: input.customerNote,
        });
        if (registered) notify("취소요청이 등록되었습니다.", "공급여행사 확인 후 처리결과를 확인할 수 있습니다.");
        else notify("취소요청을 등록할 수 없는 예약입니다.");
      },
    });
  };

  return (
    <div className="seller-rsv-detail-page">
      <section className="page-head seller-pd-head">
        <div>
          <h1 className="seller-rsv-detail-title">
            {detail.reservationCode}
            <button
              type="button"
              className="seller-rsv-copy"
              aria-label="예약번호 복사"
              title="예약번호 복사"
              onClick={() => copyText(detail.reservationCode, "예약번호")}
            >
              <Copy size={13} aria-hidden="true" />
            </button>
          </h1>
          <p className="seller-pd-head-meta">
            <span className={`badge ${sellerReservationStatusBadgeClass(detail.status)}`}>{detail.status}</span>
            <span className={`badge ${sellerReservationPaymentBadgeClass(detail.paymentStatus)}`}>{detail.paymentStatus}</span>
            <span className="seller-pd-head-supplier">
              예약일시 <b>{formatSellerReservationDateTime(detail.reservedAt)}</b>
            </span>
          </p>
        </div>
        <div className="seller-pd-head-actions">
          <Link href={LIST_PATH} className="secondary seller-pd-link-button">
            <ArrowLeft size={14} aria-hidden="true" />
            목록
          </Link>
          {cancellable && cancelLocked ? (
            <span className="seller-prod-action-lock" title={TRAVEL_ENDED_MESSAGE}>
              <button type="button" className="secondary seller-pd-danger" disabled aria-label={`취소요청 불가 — ${TRAVEL_ENDED_MESSAGE}`}>
                <Ban size={14} aria-hidden="true" />
                취소요청
              </button>
            </span>
          ) : null}
          {cancellable && !cancelLocked ? (
            <button type="button" className="secondary seller-pd-danger" onClick={openCancel}>
              <Ban size={14} aria-hidden="true" />
              취소요청
            </button>
          ) : null}
          {detail.status === "취소요청" ? <span className="seller-rsv-cancel-pending">취소요청 확인중</span> : null}
          {detail.status === "취소승인" ? <span className="seller-rsv-cancel-pending">취소승인 · 환불대기</span> : null}
        </div>
      </section>

      {cancelLocked ? (
        <p className="seller-rsv-cancel-locked" role="note">
          <InfoIcon size={13} aria-hidden="true" />
          {TRAVEL_ENDED_MESSAGE}
        </p>
      ) : null}

      {detail.status === "취소요청" ? (
        <div className="seller-relation-drawer-alert seller-pd-alert is-warn" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            <b>공급여행사의 취소처리를 기다리고 있습니다.</b>
            <small>
              고객의 예약 취소 요청이 접수되어 {detail.supplierName}에서 확인중입니다. 결제상태는 변경되지 않으며, 예상수익은 취소
              검토중으로 표시됩니다.
            </small>
          </span>
        </div>
      ) : null}
      {detail.status === "취소승인" && cancel ? (
        <div className="seller-relation-drawer-alert seller-pd-alert is-warn" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            <b>{detail.supplierName}에서 취소를 승인했습니다.</b>
            <small>
              {cancel.refundFailed
                ? "환불처리가 실패하여 공급여행사에서 재처리 중입니다. 환불완료 후 취소완료됩니다."
                : "공급여행사의 환불처리 후 취소완료됩니다. 결제상태는 환불완료 전까지 변경되지 않습니다."}
            </small>
          </span>
        </div>
      ) : null}
      {cancel?.processStatus === "취소거절" ? (
        <div className="seller-relation-drawer-alert seller-pd-alert" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            <b>{detail.supplierName}에서 취소요청을 거절했습니다.</b>
            <small>예약은 취소요청 전 상태({detail.status})로 유지됩니다. 거절사유: {cancel.rejectReason ?? "-"}</small>
          </span>
        </div>
      ) : null}
      {detail.status === "취소완료" ? (
        <div className="seller-relation-drawer-alert seller-pd-alert" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            <b>{detail.paymentStatus === "미결제" ? "취소가 완료된 예약입니다." : "취소 및 환불이 완료된 예약입니다."}</b>
            <small>판매점 예상수익은 0원이며 정산 대상에서 제외됩니다.</small>
          </span>
        </div>
      ) : null}
      {supplierSuspended ? (
        <div className="seller-relation-drawer-alert seller-pd-alert" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            <b>현재 공급여행사와의 거래는 이용중지 상태입니다. 기존 예약내역은 유지됩니다.</b>
            <small>예약상태는 변경되지 않으며, 예약 관련 문의는 공급여행사 담당자에게 연락해주세요.</small>
          </span>
        </div>
      ) : null}

      <section className="panel seller-rsv-detail-summary" aria-label="예약 요약">
        <dl>
          <Row label="예약번호">{detail.reservationCode}</Row>
          <Row label="예약일시">{formatSellerReservationDateTime(detail.reservedAt)}</Row>
          <Row label="예약상태">
            <span className={`badge ${sellerReservationStatusBadgeClass(detail.status)}`}>{detail.status}</span>
          </Row>
          <Row label="결제상태">
            <span className={`badge ${sellerReservationPaymentBadgeClass(detail.paymentStatus)}`}>{detail.paymentStatus}</span>
          </Row>
          <Row label="예약인원">{detail.pax}명</Row>
          <Row label="예약금액">{formatSellerReservationAmount(amount)}</Row>
          <Row label="판매점 예상수익" emphasis>
            <span className={detail.status === "취소완료" ? "is-excluded" : undefined}>{formatSellerReservationAmount(expectedProfit)}</span>
            <small className={detail.status === "취소요청" || detail.status === "취소승인" ? "is-review" : undefined}>{profitNote(detail)}</small>
          </Row>
        </dl>
      </section>

      <div className="seller-rsv-detail-grid">
        <div className="seller-rsv-detail-col">
          <section className="panel seller-pd-card seller-rsv-card-customer" aria-labelledby="seller-rsv-customer-title">
            <h2 id="seller-rsv-customer-title">예약자 정보</h2>
            <dl className="seller-relation-dl seller-rsv-detail-dl">
              <Row label="예약자명">{detail.customerName}</Row>
              <Row label="연락처">
                <span className="seller-rsv-copy-line">
                  {detail.customerPhone}
                  <button
                    type="button"
                    className="seller-rsv-copy"
                    aria-label="예약자 연락처 복사"
                    title="연락처 복사"
                    onClick={() => copyText(detail.customerPhone, "연락처")}
                  >
                    <Copy size={12} aria-hidden="true" />
                  </button>
                </span>
              </Row>
              <Row label="이메일">{detail.customerEmail}</Row>
              <Row label="생년월일">{formatBirthDate(detail.customerBirthDate)}</Row>
              <Row label="성별">{detail.customerGender}</Row>
            </dl>
            <p className="seller-pd-origin-note">
              <Lock size={12} aria-hidden="true" />
              예약자 개인정보는 예약 확인 목적으로만 사용해주세요.
            </p>
          </section>

          <section className="panel seller-pd-card seller-rsv-card-companions" aria-labelledby="seller-rsv-companions-title">
            <h2 id="seller-rsv-companions-title">
              동행자 <small>{detail.companions.length}명</small>
            </h2>
            <p className="seller-rsv-pax-breakdown">
              <span>
                성인 <b>{detail.paxBreakdown.성인}</b>
              </span>
              <span>
                소아 <b>{detail.paxBreakdown.소아}</b>
              </span>
              <span>
                유아 <b>{detail.paxBreakdown.유아}</b>
              </span>
              <span className="is-total">
                총 <b>{detail.pax}명</b> <small>(예약자 포함)</small>
              </span>
            </p>
            {detail.companions.length > 0 ? (
              <div className="table-wrap">
                <table className="seller-dash-table seller-rsv-mini-table">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>구분</th>
                      <th>연락처</th>
                      <th>생년월일</th>
                      <th>비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.companions.map((companion, index) => (
                      <tr key={`${companion.name}-${index}`}>
                        <td data-label="이름">{companion.name}</td>
                        <td data-label="구분">{companion.type}</td>
                        <td data-label="연락처">{companion.phoneMasked ?? "-"}</td>
                        <td data-label="생년월일">{formatBirthDate(companion.birthDate)}</td>
                        <td data-label="비고">{companion.note ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="seller-rsv-empty-line">동행자 없이 예약자 1명만 예약했습니다.</p>
            )}
          </section>

          <section className="panel seller-pd-card seller-rsv-card-product" aria-labelledby="seller-rsv-product-title">
            <div className="seller-pd-card-head">
              <h2 id="seller-rsv-product-title">예약상품</h2>
              {product ? (
                <Link href={`/seller/products/${encodeURIComponent(product.productCode)}`} className="secondary seller-rsv-product-link">
                  <ExternalLink size={13} aria-hidden="true" />
                  상품 보기
                </Link>
              ) : null}
            </div>
            <dl className="seller-relation-dl seller-rsv-detail-dl">
              <Row label="상품명">{detail.productName}</Row>
              <Row label="상품코드">{detail.productCode}</Row>
              <Row label="판매방식">
                <span className={`badge ${sellerProductModeBadgeClass(detail.saleMode)}`}>{detail.saleMode}</span>
              </Row>
              <Row label="여행일">
                {formatTravelDate(detail.travelDate)}
                {detail.travelEndDate ? ` ~ ${formatTravelDate(detail.travelEndDate)}` : ""}
              </Row>
              <Row label="여행기간">{productDetail?.duration ?? "-"}</Row>
              <Row label="출발지">{productDetail?.departure ?? "-"}</Row>
              <Row label="공급여행사">
                {detail.supplierName} <small>{detail.supplierCode}</small>
              </Row>
              <Row label="상품 현재상태">
                {product ? (
                  <span className="seller-rsv-current-status">
                    <span className={`badge ${sellerAdminProductStatusBadgeClass(product.salesStatus)}`}>{product.salesStatus}</span>
                    {product.stopReason ? <small>{product.stopReason}</small> : null}
                  </span>
                ) : (
                  "확인 불가"
                )}
              </Row>
            </dl>
            <p className="seller-pd-origin-note">
              <InfoIcon size={12} aria-hidden="true" />
              상품 현재상태는 예약상태와 별개입니다. 상품이 판매중지되어도 기존 예약은 유지됩니다.
            </p>
          </section>

          <section className="panel seller-pd-card seller-rsv-card-departure" aria-labelledby="seller-rsv-departure-title">
            <h2 id="seller-rsv-departure-title">출발정보</h2>
            <dl className="seller-relation-dl seller-rsv-detail-dl is-three">
              <Row label="출발일">{formatTravelDate(detail.travelDate)}</Row>
              <Row label="출발시간">{detail.meetingTime}</Row>
              <Row label="탑승지">{detail.boardingPlace}</Row>
            </dl>
          </section>
        </div>

        <div className="seller-rsv-detail-col">
          <section className="panel seller-pd-card seller-rsv-card-supplier" aria-labelledby="seller-rsv-supplier-title">
            <h2 id="seller-rsv-supplier-title">공급여행사</h2>
            <dl className="seller-relation-dl seller-rsv-detail-dl">
              <Row label="여행사명">{detail.supplierName}</Row>
              <Row label="여행사코드">{detail.supplierCode}</Row>
              <Row label="관계상태">
                <span className={`badge ${supplierStatusBadgeClass(supplierStatus)}`}>{supplierStatus}</span>
              </Row>
              <Row label="담당자">
                {relation?.contact.managerName ?? "-"} {relation ? <small>{relation.contact.department}</small> : null}
              </Row>
              <Row label="연락처">{relation?.contact.phone ?? "-"}</Row>
            </dl>
            {supplierSuspended ? (
              <p className="seller-pd-conditions-stopped" role="note">
                현재 공급여행사와의 거래는 이용중지 상태입니다. 기존 예약내역은 유지됩니다.
              </p>
            ) : (
              <p className="seller-relation-drawer-help">예약 관련 문의는 공급여행사 담당자에게 연락해주세요.</p>
            )}
          </section>

          <section className="panel seller-pd-card seller-rsv-card-terms" aria-labelledby="seller-rsv-terms-title">
            <h2 id="seller-rsv-terms-title">예약 당시 판매조건</h2>
            <dl className="seller-pd-conditions-dl">
              <Row label="판매방식">
                <span className={`badge ${sellerProductModeBadgeClass(detail.saleMode)}`}>{detail.saleMode}</span>
              </Row>
              {isCommission ? (
                <>
                  <Row label="예약 당시 판매가">
                    {formatSellerReservationAmount(detail.unitPrice)}
                    <small>1인</small>
                  </Row>
                  <Row label="수수료율">{detail.bookedCommissionRate ?? 0}%</Row>
                </>
              ) : (
                <>
                  <Row label="예약 당시 입금가">
                    {formatSellerReservationAmount(detail.bookedDepositPrice ?? 0)}
                    <small>1인</small>
                  </Row>
                  <Row label="예약 당시 판매가">
                    {formatSellerReservationAmount(detail.unitPrice)}
                    <small>1인</small>
                  </Row>
                </>
              )}
              <Row label="예약인원">{detail.pax}명</Row>
              <Row label="예약금액">{formatSellerReservationAmount(amount)}</Row>
              <Row label="예상수익" emphasis>
                <span className={detail.status === "취소완료" ? "is-excluded" : undefined}>{formatSellerReservationAmount(expectedProfit)}</span>
                <small className={detail.status === "취소요청" || detail.status === "취소승인" ? "is-review" : undefined}>{profitNote(detail)}</small>
              </Row>
            </dl>
            <p className="seller-rsv-formula">
              <span>{isCommission ? "예약금액 × 수수료율" : "(판매가 - 입금가) × 인원"}</span>
              <b>{formula}</b>
              {detail.status === "취소완료" ? <small>취소완료로 정산 대상에서 제외되어 예상수익은 0원입니다.</small> : null}
            </p>
            <p className="seller-pd-conditions-scope">
              <Lock size={12} aria-hidden="true" />
              <span>
                현재 상품가격과 무관하게 예약 당시 조건이 적용됩니다.
                {priceChanged ? ` (참고: 현재 상품 판매가 ${formatSellerReservationAmount(currentPrice ?? 0)})` : ""}
              </span>
            </p>
          </section>

          <section className="panel seller-pd-card seller-rsv-card-payment" aria-labelledby="seller-rsv-payment-title">
            <h2 id="seller-rsv-payment-title">결제정보</h2>
            <dl className="seller-pd-conditions-dl">
              <Row label="결제상태">
                <span className={`badge ${sellerReservationPaymentBadgeClass(detail.paymentStatus)}`}>{detail.paymentStatus}</span>
              </Row>
              <Row label="총 예약금액">{formatSellerReservationAmount(amount)}</Row>
              <Row label="결제금액">{formatSellerReservationAmount(detail.paidAmount)}</Row>
              {detail.refundAmount > 0 ? <Row label="환불금액">{formatSellerReservationAmount(detail.refundAmount)}</Row> : null}
              <Row label="미결제금액">
                <span className={unpaid > 0 ? "seller-rsv-unpaid" : undefined}>{formatSellerReservationAmount(unpaid)}</span>
              </Row>
              <Row label="결제수단">{detail.paymentMethod ?? "-"}</Row>
              <Row label="결제일시">{detail.payments[0] ? formatSellerReservationDateTime(detail.payments[0].at) : "-"}</Row>
            </dl>
            <h3 className="seller-rsv-subtitle">결제이력</h3>
            {detail.payments.length > 0 ? (
              <ol className="seller-rsv-history">
                {detail.payments.map((record) => (
                  <li key={`${record.at}-${record.type}`} className={record.type === "환불" ? "is-refund" : undefined}>
                    <time>{formatSellerReservationDateTime(record.at)}</time>
                    <span>{record.type}</span>
                    <b>
                      {record.type === "환불" ? "-" : ""}
                      {formatSellerReservationAmount(record.amount)}
                    </b>
                    <small>{record.result}</small>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="seller-rsv-empty-line">결제이력이 없습니다.</p>
            )}
          </section>
        </div>
      </div>

      <div className="seller-rsv-detail-bottom">
        <section className="panel seller-pd-card seller-rsv-card-status" aria-labelledby="seller-rsv-status-title">
          <h2 id="seller-rsv-status-title">예약상태</h2>
          <p className="seller-rsv-status-current">
            <span className={`badge ${sellerReservationStatusBadgeClass(detail.status)}`}>{detail.status}</span>
            <span>{SELLER_RESERVATION_STATUS_DESCRIPTIONS[detail.status]}</span>
          </p>
          <ol className="seller-pd-timeline seller-rsv-timeline">
            {detail.statusHistory.map((record) => (
              <li key={`${record.at}-${record.status}`}>
                <time>{formatSellerReservationDateTime(record.at)}</time>
                <span>
                  <b>{record.status}</b>
                  {record.note ? <small>{record.note}</small> : null}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {cancel ? (
          <section className="panel seller-pd-card seller-rsv-card-cancel" aria-labelledby="seller-rsv-cancel-title">
            <h2 id="seller-rsv-cancel-title">{cancel.processStatus === "취소완료" ? "취소정보" : "취소요청"}</h2>
            <dl className="seller-relation-dl seller-rsv-detail-dl">
              <Row label="요청일시">{formatSellerReservationDateTime(cancel.requestedAt)}</Row>
              <Row label="요청자">
                {cancel.registeredBy ?? sellerName} <small>시스템 등록</small>
              </Row>
              <Row label="고객명">
                {cancel.requester} <small>고객 요청</small>
              </Row>
              <Row label="취소사유">{formatSellerCancelReason(cancel)}</Row>
              <Row label="고객 요청내용">{cancel.customerNote ?? "-"}</Row>
              <Row label="처리상태">
                <span className={`badge ${cancel.processStatus === "취소완료" ? "danger" : cancel.processStatus === "취소거절" ? "gray" : "warn"}`}>
                  {cancel.processStatus}
                </span>
              </Row>
              {cancel.processStatus === "취소승인" ? (
                <>
                  <Row label="승인일시">{cancel.completedAt ? formatSellerReservationDateTime(cancel.completedAt) : "-"}</Row>
                  <Row label="취소수수료">
                    {formatSellerReservationAmount(cancel.cancelFee ?? 0)} <small>공급여행사 확정</small>
                  </Row>
                  <Row label="환불예정금액">
                    {formatSellerReservationAmount(cancel.refundAmount ?? 0)}{" "}
                    <small>{cancel.refundFailed ? "환불실패 · 공급여행사 재처리 중" : "공급여행사 환불처리 대기"}</small>
                  </Row>
                </>
              ) : null}
              {cancel.processStatus === "취소거절" ? (
                <>
                  <Row label="처리일시">{cancel.completedAt ? formatSellerReservationDateTime(cancel.completedAt) : "-"}</Row>
                  <Row label="거절사유">{cancel.rejectReason ?? "-"}</Row>
                </>
              ) : null}
              {cancel.processStatus === "취소완료" ? (
                <>
                  <Row label="처리일시">{cancel.completedAt ? formatSellerReservationDateTime(cancel.completedAt) : "-"}</Row>
                  <Row label="처리결과">취소완료</Row>
                  {cancel.cancelFee !== undefined && cancel.cancelFee !== null ? (
                    <Row label="취소수수료">{formatSellerReservationAmount(cancel.cancelFee)}</Row>
                  ) : null}
                  <Row label="환불금액">{formatSellerReservationAmount(cancel.refundAmount ?? 0)}</Row>
                  <Row label="판매점 예상수익">
                    {formatSellerReservationAmount(0)} <small>취소완료</small>
                  </Row>
                </>
              ) : null}
            </dl>
            <p className="seller-relation-drawer-help">
              {cancel.processStatus === "취소완료"
                ? "취소완료 예약은 정산 대상에서 제외됩니다."
                : cancel.processStatus === "취소거절"
                  ? "공급여행사가 거절한 취소요청입니다. 요청 이력은 유지됩니다."
                : "취소 승인 · 환불 처리는 공급여행사에서 진행하며, 처리 결과가 이 화면에 반영됩니다."}
            </p>
          </section>
        ) : null}

        {settlementInfo ? (
          <section className="panel seller-pd-card" aria-labelledby="seller-rsv-settle-title">
            <h2 id="seller-rsv-settle-title">정산반영</h2>
            <dl className="seller-relation-dl seller-rsv-detail-dl">
              <Row label="정산건">
                {settlementInfo.settlement.label} <small>{settlementInfo.settlement.code}</small>
              </Row>
              <Row label="반영상태">{sellerSettlementReflectionLabel(settlementInfo)}</Row>
              <Row label="예약 당시 수익">{formatSellerReservationAmount(settlementInfo.line.originalProfit)}</Row>
              <Row label="정산조정" emphasis>
                {formatSellerSettlementSigned(
                  settlementInfo.line.adjustment || settlementInfo.line.pendingAdjustment || (settlementInfo.nextAdjustment?.amount ?? 0),
                )}{" "}
                <small>{settlementInfo.nextAdjustment ? `차기정산 ${settlementInfo.nextAdjustment.targetSettlementCode}` : "예약 취소"}</small>
              </Row>
            </dl>
            <p className="seller-relation-drawer-help">
              정산조정은 예약 당시 판매점 수익 기준이며 고객 환불금액과 다릅니다.{" "}
              <Link href="/seller/settlements" className="reservation-code-link">
                정산관리에서 보기
              </Link>
            </p>
          </section>
        ) : null}

        <section className="panel seller-pd-card seller-rsv-card-memo" aria-labelledby="seller-rsv-memo-title">
          <h2 id="seller-rsv-memo-title">메모</h2>
          <dl className="seller-relation-dl seller-rsv-detail-dl is-single">
            <Row label="예약 메모">{detail.memo ?? "-"}</Row>
            <Row label="공급여행사 전달사항">{detail.supplierMemo ?? "-"}</Row>
          </dl>
          <p className="seller-pd-origin-note">
            <Lock size={12} aria-hidden="true" />
            메모는 조회만 가능합니다.
          </p>
        </section>
      </div>

      {scenarioFieldset}

      {cancelOpen && cancellable && !cancelLocked ? (
        <SellerReservationCancelModal
          reservation={detail}
          travelDateLabel={formatTravelDate(detail.travelDate)}
          sameDay={travelTiming === "today"}
          supplierSuspended={supplierSuspended}
          cancelPolicy={productDetail?.cancelPolicy ?? []}
          suspended={Boolean(confirmDialog)}
          onClose={() => setCancelOpen(false)}
          onSubmit={requestCancel}
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
