"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ClipboardList, Minus, Pencil, Plus, QrCode, Receipt } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  calculatePaymentSummary,
  formatKrw,
  getReservationDetail,
  getReservationPayments,
  getReservationRefunds,
  parseKrw,
  paymentRecordBadgeClass,
  refundRecordBadgeClass,
  type ReservationPayment,
  type ReservationRefund,
} from "@/lib/admin/reservations-data";

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="member-web-detail-field">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

const CANCEL_REASON_OPTIONS = [
  "고객 요청",
  "일정 변경",
  "상품 변경",
  "중복 예약",
  "결제 문제",
  "운영 취소",
  "기타",
] as const;

const REFUND_METHOD_OPTIONS = ["원결제 수단 환불", "계좌 환불", "환불 없음"] as const;

type CancelReason = (typeof CANCEL_REASON_OPTIONS)[number];
type RefundMethod = (typeof REFUND_METHOD_OPTIONS)[number];
type CancelType = "예약 전체 취소" | "부분 취소";

type ReservationStatusHistory = {
  processedAt: string;
  action: string;
  statusBefore: string;
  statusAfter: string;
  paymentBefore: string;
  paymentAfter: string;
  reason: string;
  actor: string;
};

function isCancelledReservation(status: string) {
  return status === "취소" || status === "취소완료" || status === "취소요청";
}

function formatHistoryTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function reserveDisplayClass(status: string) {
  if (status === "취소" || status === "취소완료") return "gray";
  if (status === "취소요청") return "danger";
  if (status === "예약확정") return "success";
  if (status === "대기") return "warn";
  return "info";
}

function paymentDisplayClass(status: string) {
  if (status === "결제완료") return "success";
  if (status === "환불완료") return "gray";
  if (status === "환불대기") return "warn";
  if (status === "미결제" || status === "결제대기" || status === "부분결제") return "warn";
  return "info";
}

function CountLimitStepper({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const update = (next: number) => onChange(Math.min(max, Math.max(0, next)));

  return (
    <label className="member-web-edit-field reservation-count-field">
      <span>
        {label} <em>(최대 {max}명)</em>
      </span>
      <div className="reservation-count-stepper">
        <button type="button" className="secondary" onClick={() => update(value - 1)} disabled={value <= 0}>
          <Minus size={14} />
        </button>
        <input
          type="number"
          min={0}
          max={max}
          value={value}
          onChange={(event) => update(Number(event.target.value) || 0)}
        />
        <button type="button" className="secondary" onClick={() => update(value + 1)} disabled={value >= max}>
          <Plus size={14} />
        </button>
      </div>
    </label>
  );
}

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const reservationId = useMemo(() => decodeURIComponent(params.id ?? ""), [params.id]);
  const reservation = useMemo(() => getReservationDetail(reservationId), [reservationId]);

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["예약관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [displayReserveStatus, setDisplayReserveStatus] = useState(() => reservation?.reserveStatus ?? "");
  const [displayPaymentStatus, setDisplayPaymentStatus] = useState(() => reservation?.paymentStatus ?? "");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelType, setCancelType] = useState<CancelType>("예약 전체 취소");
  const [cancelCounts, setCancelCounts] = useState({ adult: 0, child: 0, infant: 0 });
  const [cancelReason, setCancelReason] = useState<CancelReason | "">("");
  const [cancelOtherReason, setCancelOtherReason] = useState("");
  const [cancelFee, setCancelFee] = useState(0);
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("원결제 수단 환불");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [adminMemo, setAdminMemo] = useState("");
  const [internalMemo, setInternalMemo] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [reasonError, setReasonError] = useState(false);
  const [statusHistory, setStatusHistory] = useState<ReservationStatusHistory[]>([]);
  const [payments, setPayments] = useState<ReservationPayment[]>([]);
  const [refunds, setRefunds] = useState<ReservationRefund[]>([]);

  useEffect(() => {
    setPayments(getReservationPayments(reservationId));
    setRefunds(getReservationRefunds(reservationId));
  }, [reservationId]);

  const paymentSummary = useMemo(() => {
    if (!reservation) {
      return calculatePaymentSummary(0, [], []);
    }
    return calculatePaymentSummary(parseKrw(reservation.totalAmount), payments, refunds);
  }, [reservation, payments, refunds]);

  const isCancelled = isCancelledReservation(displayReserveStatus);
  const paidAmountValue = reservation ? parseKrw(reservation.paidAmount) : 0;
  const totalPeople = reservation
    ? reservation.counts.adult + reservation.counts.child + reservation.counts.infant
    : 0;
  const cancelPeople = cancelCounts.adult + cancelCounts.child + cancelCounts.infant;
  const cancelTargetAmount =
    cancelType === "예약 전체 취소" || totalPeople === 0
      ? paidAmountValue
      : Math.round(paidAmountValue * (cancelPeople / totalPeople));
  const expectedRefundAmount = Math.max(0, cancelTargetAmount - cancelFee);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const resetCancelForm = () => {
    setCancelType("예약 전체 취소");
    setCancelCounts({ adult: 0, child: 0, infant: 0 });
    setCancelReason("");
    setCancelOtherReason("");
    setCancelFee(0);
    setRefundMethod("원결제 수단 환불");
    setBankName("");
    setAccountNumber("");
    setAccountHolder("");
    setAdminMemo("");
    setInternalMemo("");
    setConfirmChecked(false);
    setReasonError(false);
  };

  const openCancelModal = () => {
    if (isCancelled) return;
    resetCancelForm();
    setCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setCancelModalOpen(false);
    resetCancelForm();
  };

  const confirmCancel = () => {
    if (!cancelReason) {
      setReasonError(true);
      return;
    }
    if (cancelReason === "기타" && !cancelOtherReason.trim()) {
      setReasonError(true);
      act("기타 취소 사유를 입력해 주세요.");
      return;
    }
    if (cancelType === "부분 취소" && cancelPeople === 0) {
      act("부분 취소할 인원을 선택해 주세요.");
      return;
    }
    if (refundMethod === "계좌 환불" && (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim())) {
      act("계좌 환불 정보를 모두 입력해 주세요.");
      return;
    }

    const reserveBefore = displayReserveStatus;
    const paymentBefore = displayPaymentStatus;
    const reasonText = cancelReason === "기타" ? cancelOtherReason.trim() : cancelReason;
    const nowLabel = formatHistoryTimestamp(new Date());
    const primaryPaymentNumber = payments[0]?.paymentNumber ?? "PAY-UNKNOWN";

    let nextPaymentStatus = displayPaymentStatus;
    if (refundMethod === "환불 없음") {
      nextPaymentStatus = "환불완료";
    } else if (refundMethod === "원결제 수단 환불") {
      nextPaymentStatus = "환불완료";
    } else {
      nextPaymentStatus = "환불대기";
    }

    setDisplayReserveStatus("취소");
    setDisplayPaymentStatus(nextPaymentStatus);

    if (refundMethod !== "환불 없음" && expectedRefundAmount > 0) {
      const refundStatus = refundMethod === "원결제 수단 환불" ? "환불완료" : "환불대기";
      const refundMethodLabel = refundMethod === "원결제 수단 환불" ? "원결제 취소" : "계좌환불";
      const refundSuffix = String(Date.now()).slice(-6);

      setRefunds((current) => [
        {
          id: `ref-${refundSuffix}`,
          refundedAt: nowLabel,
          refundNumber: `REF-${nowLabel.replace(/[.:\s]/g, "").slice(0, 12)}-${refundSuffix}`,
          paymentNumber: primaryPaymentNumber,
          method: refundMethodLabel,
          amount: expectedRefundAmount,
          status: refundStatus,
          reason: reasonText,
          processedBy: "장윤호",
        },
        ...current,
      ]);
    }

    setStatusHistory((current) => [
      {
        processedAt: formatHistoryTimestamp(new Date()),
        action: cancelType,
        statusBefore: reserveBefore,
        statusAfter: "취소",
        paymentBefore,
        paymentAfter: nextPaymentStatus,
        reason: reasonText,
        actor: "장윤호",
      },
      ...current,
    ]);
    closeCancelModal();
    act("예약 취소 및 환불 처리가 완료되었습니다.");
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  if (!reservation) {
    return (
      <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
        <main className="content member-web-detail-content">
          <section className="panel member-web-detail-not-found">
            <strong>예약을 찾을 수 없습니다.</strong>
            <p>요청하신 예약번호({reservationId || "-"})에 해당하는 예약 정보가 없습니다.</p>
            <button type="button" className="secondary" onClick={() => window.history.back()}>
              <ArrowLeft size={14} />
              이전 화면으로
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div className="brand-copy">
            <strong>AOS</strong>
            <span>TRAVEL ERP</span>
          </div>
          <button className="collapse" onClick={() => setCollapsed(!collapsed)} aria-label="사이드바 접기">
            ‹
          </button>
        </div>
        <nav aria-label="관리자 메뉴">
          {ADMIN_MENU.map((item) => (
            <div className="nav-group" key={item.label}>
              <button
                className={`nav-item ${item.label === "예약관리" ? "active" : ""}`}
                onClick={() =>
                  item.label === "대시보드"
                    ? window.location.assign("/")
                    : item.children
                      ? toggleMenu(item.label)
                      : act(`${item.label} 화면으로 이동합니다.`)
                }
              >
                <span className="nav-icon">
                  {item.icon === "qr" ? <QrCode size={16} strokeWidth={1.8} /> : item.icon}
                </span>
                <span className="nav-label">{item.label}</span>
                {item.children && <span className={`chevron ${expanded.includes(item.label) ? "open" : ""}`}>⌄</span>}
              </button>
              {item.children && expanded.includes(item.label) && !collapsed && (
                <div className="subnav">
                  {item.children.map((child) => (
                    <button key={child} onClick={() => navigateAdminChild(child, act)}>
                      {child}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-help">
          <span className="nav-icon">?</span>
          <div>
            <strong>업무지원센터</strong>
            <p>평일 09:00–18:00</p>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>예약관리</span>
            <b>/</b>
            <strong>예약상세</strong>
          </div>
          <div className="top-actions">
            <label className="search">
              <span>⌕</span>
              <input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-btn" title="업무지원" onClick={() => act("업무지원센터를 엽니다.")}>
              ?
            </button>
            <div className="dropdown-wrap">
              <button
                className="icon-btn notice"
                aria-label="알림"
                onClick={() => {
                  setNoticeOpen(!noticeOpen);
                  setProfileOpen(false);
                }}
              >
                ♢<i>5</i>
              </button>
              {noticeOpen && (
                <div className="dropdown notice-menu">
                  <div className="drop-head">
                    <strong>알림</strong>
                    <button onClick={() => setNoticeOpen(false)}>모두 읽음</button>
                  </div>
                  <button>예약 확정 요청 2건</button>
                  <button>결제 대기 1건</button>
                </div>
              )}
            </div>
            <div className="dropdown-wrap">
              <button
                className="profile"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNoticeOpen(false);
                }}
              >
                <span className="avatar">장</span>
                <span>
                  <b>애비아넥스트</b>
                  <small>관리자 장윤호</small>
                </span>
                <em>⌄</em>
              </button>
              {profileOpen && (
                <div className="dropdown profile-menu">
                  <button>내 정보</button>
                  <button>환경설정</button>
                  <hr />
                  <button className="logout">로그아웃</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content member-web-detail-content reservation-detail-content">
          <section className="page-head member-web-detail-page-head">
            <div>
              <p className="member-web-breadcrumb">예약관리 &gt; 예약상세</p>
              <div className="member-web-detail-title-row">
                <h1>{reservation.code}</h1>
                <span className={`badge ${reserveDisplayClass(displayReserveStatus)}`}>{displayReserveStatus}</span>
              </div>
              <p className="member-web-detail-subtitle">{reservation.productName}</p>
            </div>
            <div className="member-web-detail-actions">
              <button type="button" className="secondary" onClick={() => window.location.assign("/reservations")}>
                <ArrowLeft size={14} />
                목록
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => window.location.assign(`/reservations/${reservation.code}/edit`)}
              >
                <Pencil size={14} />
                예약수정
              </button>
              <button
                type="button"
                className={isCancelled ? "secondary" : "primary"}
                onClick={openCancelModal}
                disabled={isCancelled}
              >
                <Receipt size={14} />
                {isCancelled ? "취소완료" : "취소/환불"}
              </button>
            </div>
          </section>

          <section className="panel member-web-detail-hero">
            <div className="member-web-detail-identity">
              <span className="member-web-detail-avatar">
                <ClipboardList size={23} />
              </span>
              <div>
                <div className="member-web-detail-code-row">
                  <span>{reservation.code}</span>
                  <span className={`badge ${reserveDisplayClass(displayReserveStatus)}`}>{displayReserveStatus}</span>
                  <span className={`badge ${paymentDisplayClass(displayPaymentStatus)}`}>{displayPaymentStatus}</span>
                </div>
                <h2>{reservation.productName}</h2>
                <p>
                  {reservation.bookerName} · {reservation.phone} · 출발 {reservation.departureAt}
                </p>
              </div>
            </div>
          </section>

          <div className="member-web-detail-stack">
            <section className="panel member-web-detail-card">
              <div className="member-web-detail-card-head">
                <strong>기본정보</strong>
              </div>
              <div className="member-web-detail-info-grid">
                <InfoField label="예약번호" value={reservation.code} />
                <InfoField label="예약일" value={reservation.reservedAt} />
                <InfoField label="예약자명" value={reservation.bookerName} />
                <InfoField label="연락처" value={reservation.phone} />
                <InfoField label="상품명" value={reservation.productName} />
                <InfoField label="출발일" value={reservation.departureAt} />
                <InfoField label="예약상태" value={displayReserveStatus} />
                <InfoField label="결제상태" value={displayPaymentStatus} />
              </div>
            </section>

            <section className="panel member-web-detail-card">
              <div className="member-web-detail-card-head">
                <strong>인원/금액</strong>
              </div>
              <div className="member-web-detail-info-grid">
                <InfoField label="성인" value={`${reservation.counts.adult}명`} />
                <InfoField label="소아" value={`${reservation.counts.child}명`} />
                <InfoField label="유아" value={`${reservation.counts.infant}명`} />
                <InfoField label="총 예약금액" value={reservation.totalAmount} />
                <InfoField label="결제금액" value={reservation.paidAmount} />
                <InfoField label="미수금" value={reservation.unpaidAmount} />
                <InfoField label="판매점" value={reservation.agency} />
              </div>
            </section>

            <section className="panel member-web-detail-card">
              <div className="member-web-detail-card-head">
                <strong>결제 요약</strong>
              </div>
              <div className="member-web-detail-usage-grid reservation-payment-summary">
                <article className="member-web-detail-kpi">
                  <span>
                    <small>총 예약금액</small>
                    <strong>{paymentSummary.totalReservationLabel}</strong>
                  </span>
                </article>
                <article className="member-web-detail-kpi">
                  <span>
                    <small>총 결제금액</small>
                    <strong>{paymentSummary.totalPaidLabel}</strong>
                  </span>
                </article>
                <article className="member-web-detail-kpi">
                  <span>
                    <small>총 환불금액</small>
                    <strong>{paymentSummary.totalRefundLabel}</strong>
                  </span>
                </article>
                <article className="member-web-detail-kpi">
                  <span>
                    <small>실 결제금액</small>
                    <strong>{paymentSummary.netPaidLabel}</strong>
                  </span>
                </article>
                <article className="member-web-detail-kpi">
                  <span>
                    <small>미수금</small>
                    <strong>{paymentSummary.unpaidLabel}</strong>
                  </span>
                </article>
              </div>
            </section>

            <section className="panel member-web-detail-card">
              <div className="member-web-detail-card-head">
                <strong>결제내역</strong>
                <span className="member-web-status-history-count">{payments.length}건</span>
              </div>
              {payments.length > 0 ? (
                <div className="member-web-detail-table-wrap">
                  <table className="member-web-detail-table member-web-detail-table--payment">
                    <thead>
                      <tr>
                        <th>결제일시</th>
                        <th>결제번호</th>
                        <th>결제수단</th>
                        <th>결제금액</th>
                        <th>결제상태</th>
                        <th>승인번호</th>
                        <th>처리자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((item) => (
                        <tr key={item.id}>
                          <td className="date-cell">{item.paidAt}</td>
                          <td className="member-number">{item.paymentNumber}</td>
                          <td>{item.method}</td>
                          <td className="amount-cell">{formatKrw(item.amount)}</td>
                          <td>
                            <span className={`badge ${paymentRecordBadgeClass(item.status)}`}>{item.status}</span>
                          </td>
                          <td>{item.approvalNumber}</td>
                          <td>{item.processedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="member-web-detail-empty">결제내역이 없습니다.</div>
              )}
            </section>

            <section className="panel member-web-detail-card">
              <div className="member-web-detail-card-head">
                <strong>환불내역</strong>
                <span className="member-web-status-history-count">{refunds.length}건</span>
              </div>
              {refunds.length > 0 ? (
                <div className="member-web-detail-table-wrap">
                  <table className="member-web-detail-table member-web-detail-table--refund">
                    <thead>
                      <tr>
                        <th>환불일시</th>
                        <th>환불번호</th>
                        <th>원 결제번호</th>
                        <th>환불방법</th>
                        <th>환불금액</th>
                        <th>환불상태</th>
                        <th>환불사유</th>
                        <th>처리 관리자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refunds.map((item) => (
                        <tr key={item.id}>
                          <td className="date-cell">{item.refundedAt}</td>
                          <td className="member-number">{item.refundNumber}</td>
                          <td className="member-number">{item.paymentNumber}</td>
                          <td>{item.method}</td>
                          <td className="amount-cell">{formatKrw(item.amount)}</td>
                          <td>
                            <span className={`badge ${refundRecordBadgeClass(item.status)}`}>{item.status}</span>
                          </td>
                          <td className="text-left member-web-status-history-reason">{item.reason}</td>
                          <td>{item.processedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="member-web-detail-empty">환불내역이 없습니다.</div>
              )}
            </section>

            <section className="panel member-web-detail-card">
              <div className="member-web-detail-card-head">
                <strong>고객 요청사항</strong>
              </div>
              <div className="reservation-detail-notes">
                <div className="member-web-detail-memo-item">
                  <header>
                    <span>요청사항</span>
                  </header>
                  <p>{reservation.requestNote || "-"}</p>
                </div>
                <div className="member-web-detail-memo-item">
                  <header>
                    <span>관리자 메모</span>
                  </header>
                  <p>{reservation.adminMemo || "-"}</p>
                </div>
              </div>
            </section>

            {statusHistory.length > 0 && (
              <section className="panel member-web-detail-card">
                <div className="member-web-detail-card-head">
                  <strong>예약 상태 변경 이력</strong>
                  <span className="member-web-status-history-count">{statusHistory.length}건</span>
                </div>
                <div className="member-web-detail-table-wrap">
                  <table className="member-web-detail-table member-web-detail-table--status-history">
                    <thead>
                      <tr>
                        <th>처리일시</th>
                        <th>처리구분</th>
                        <th>변경 전</th>
                        <th>변경 후</th>
                        <th>결제상태</th>
                        <th>사유</th>
                        <th>처리 관리자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusHistory.map((item, index) => (
                        <tr key={`${item.processedAt}-${index}`}>
                          <td className="date-cell">{item.processedAt}</td>
                          <td>
                            <span className="badge danger">{item.action}</span>
                          </td>
                          <td>
                            <span className={`badge ${reserveDisplayClass(item.statusBefore)}`}>{item.statusBefore}</span>
                          </td>
                          <td>
                            <span className={`badge ${reserveDisplayClass(item.statusAfter)}`}>{item.statusAfter}</span>
                          </td>
                          <td>
                            <span className={`badge ${paymentDisplayClass(item.paymentAfter)}`}>{item.paymentAfter}</span>
                          </td>
                          <td className="text-left member-web-status-history-reason">{item.reason}</td>
                          <td>{item.actor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {cancelModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="예약 취소 / 환불">
          <div className="member-web-suspend-modal reservation-cancel-modal">
            <div className="modal-head">
              <div>
                <span className="danger">
                  <Receipt size={17} />
                </span>
                <h3>예약 취소 / 환불</h3>
              </div>
              <button type="button" onClick={closeCancelModal} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-web-suspend-body reservation-cancel-body">
              <div className="reservation-cancel-target">
                <div>
                  <span>예약번호</span>
                  <b>{reservation.code}</b>
                </div>
                <div>
                  <span>예약자명</span>
                  <b>{reservation.bookerName}</b>
                </div>
                <div>
                  <span>상품명</span>
                  <b>{reservation.productName}</b>
                </div>
                <div>
                  <span>출발일</span>
                  <b>{reservation.departureAt}</b>
                </div>
                <div>
                  <span>예약상태</span>
                  <b>
                    <span className={`badge ${reserveDisplayClass(displayReserveStatus)}`}>{displayReserveStatus}</span>
                  </b>
                </div>
                <div>
                  <span>결제상태</span>
                  <b>
                    <span className={`badge ${paymentDisplayClass(displayPaymentStatus)}`}>{displayPaymentStatus}</span>
                  </b>
                </div>
                <div>
                  <span>총 예약금액</span>
                  <b>{reservation.totalAmount}</b>
                </div>
                <div>
                  <span>결제금액</span>
                  <b>{reservation.paidAmount}</b>
                </div>
              </div>

              <div className="reservation-cancel-section">
                <span className="reservation-cancel-section-title">
                  처리 유형 <b>*</b>
                </span>
                <div className="member-web-suspend-period-options">
                  <label>
                    <input
                      type="radio"
                      name="cancel-type"
                      checked={cancelType === "예약 전체 취소"}
                      onChange={() => setCancelType("예약 전체 취소")}
                    />
                    예약 전체 취소
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="cancel-type"
                      checked={cancelType === "부분 취소"}
                      onChange={() => setCancelType("부분 취소")}
                    />
                    부분 취소
                  </label>
                </div>
              </div>

              {cancelType === "부분 취소" && (
                <div className="reservation-cancel-partial-grid">
                  <CountLimitStepper
                    label="성인 취소 인원"
                    value={cancelCounts.adult}
                    max={reservation.counts.adult}
                    onChange={(adult) => setCancelCounts((prev) => ({ ...prev, adult }))}
                  />
                  <CountLimitStepper
                    label="소아 취소 인원"
                    value={cancelCounts.child}
                    max={reservation.counts.child}
                    onChange={(child) => setCancelCounts((prev) => ({ ...prev, child }))}
                  />
                  <CountLimitStepper
                    label="유아 취소 인원"
                    value={cancelCounts.infant}
                    max={reservation.counts.infant}
                    onChange={(infant) => setCancelCounts((prev) => ({ ...prev, infant }))}
                  />
                </div>
              )}

              <label className={reasonError && !cancelReason ? "invalid" : ""}>
                <span>
                  취소 사유 <b>*</b>
                </span>
                <select
                  value={cancelReason}
                  onChange={(event) => {
                    setCancelReason(event.target.value as CancelReason | "");
                    setReasonError(false);
                  }}
                >
                  <option value="">사유 선택</option>
                  {CANCEL_REASON_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              {cancelReason === "기타" && (
                <label className={reasonError && !cancelOtherReason.trim() ? "invalid" : ""}>
                  <span>취소 사유 상세</span>
                  <textarea
                    rows={3}
                    value={cancelOtherReason}
                    onChange={(event) => {
                      setCancelOtherReason(event.target.value);
                      setReasonError(false);
                    }}
                    placeholder="취소 사유를 입력해 주세요."
                  />
                </label>
              )}

              <div className="reservation-cancel-refund-summary">
                <div>
                  <span>총 결제금액</span>
                  <b>{reservation.paidAmount}</b>
                </div>
                <div>
                  <span>취소 대상 금액</span>
                  <b>{formatKrw(cancelTargetAmount)}</b>
                </div>
                <label>
                  <span>취소 수수료</span>
                  <input
                    type="number"
                    min={0}
                    value={cancelFee}
                    onChange={(event) => setCancelFee(Math.max(0, Number(event.target.value) || 0))}
                  />
                </label>
                <div>
                  <span>예상 환불금액</span>
                  <b className="reservation-refund-amount">{formatKrw(expectedRefundAmount)}</b>
                </div>
              </div>

              <div className="reservation-cancel-section">
                <span className="reservation-cancel-section-title">환불 방법</span>
                <div className="member-web-suspend-period-options reservation-refund-methods">
                  {REFUND_METHOD_OPTIONS.map((option) => (
                    <label key={option}>
                      <input
                        type="radio"
                        name="refund-method"
                        checked={refundMethod === option}
                        onChange={() => setRefundMethod(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              {refundMethod === "계좌 환불" && (
                <div className="reservation-cancel-bank-grid">
                  <label>
                    <span>은행명</span>
                    <input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="은행명" />
                  </label>
                  <label>
                    <span>계좌번호</span>
                    <input
                      value={accountNumber}
                      onChange={(event) => setAccountNumber(event.target.value)}
                      placeholder="계좌번호"
                    />
                  </label>
                  <label>
                    <span>예금주</span>
                    <input
                      value={accountHolder}
                      onChange={(event) => setAccountHolder(event.target.value)}
                      placeholder="예금주"
                    />
                  </label>
                </div>
              )}

              <label>
                <span>관리자 메모</span>
                <textarea
                  rows={2}
                  value={adminMemo}
                  onChange={(event) => setAdminMemo(event.target.value)}
                  placeholder="관리자 메모를 입력하세요."
                />
              </label>
              <label>
                <span>내부 처리 메모</span>
                <textarea
                  rows={2}
                  value={internalMemo}
                  onChange={(event) => setInternalMemo(event.target.value)}
                  placeholder="내부 처리 메모를 입력하세요."
                />
              </label>

              <label className="reservation-cancel-confirm">
                <input type="checkbox" checked={confirmChecked} onChange={(event) => setConfirmChecked(event.target.checked)} />
                <span>예약 취소 및 환불 내용을 확인했습니다.</span>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeCancelModal}>
                닫기
              </button>
              <button type="button" className="danger-button" onClick={confirmCancel} disabled={!confirmChecked}>
                취소/환불 처리
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
