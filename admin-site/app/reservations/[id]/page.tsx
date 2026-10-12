"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ClipboardList, Info, Minus, Pencil, Plus, QrCode, Receipt, Wallet } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  applySettlementCancellation,
  getSettlementRecordByReservation,
  syncSettlementAfterReservationChange,
} from "@/lib/admin/settlement-data";
import {
  applyReservationCancellation,
  approveSellerCancelRequest,
  calculatePaymentSummary,
  completeSellerCancelWithoutRefund,
  getSellerRefundMode,
  getSellerRefundStage,
  processSellerRefund,
  closeReservation,
  formatKrw,
  formatReservationTimestamp,
  getReservationDetail,
  getReservationHistory,
  handoverReservation,
  getReservationPayments,
  getReservationRefunds,
  parseKrw,
  paymentRecordBadgeClass,
  refundRecordBadgeClass,
  rejectSellerCancelRequest,
  type ReservationPayment,
  type ReservationRefund,
  type ReservationSellerCancelStatus,
} from "@/lib/admin/reservations-data";
import {
  isSellerRefundFailureScenario,
  sellerCancelProcessedAt,
  shouldSellerRefundFail,
} from "@/lib/admin/seller-channel-reservations";
import {
  SellerCancelReviewModal,
  type SellerCancelApproveInput,
  type SellerCancelRejectInput,
} from "@/components/reservations/SellerCancelReviewModal";
import { SellerRefundModal, type SellerRefundInput } from "@/components/reservations/SellerRefundModal";
import {
  formatSellerSettlementSigned,
  getSellerSettlementByReservation,
  sellerSettlementReflectionLabel,
  sellerSettlementStatusBadgeClass,
} from "@/lib/admin/seller-channel-settlements";
import { getOperationAssignmentPath, getReservationOperationView } from "@/lib/admin/operation-assignment-data";
import {
  canEditReservation,
  getReservationCloseAction,
  getReservationHandoverAction,
  getReservationSourceType,
  getSellerCancelReviewAction,
  getSellerRefundAction,
  getViewerActor,
  withReservationViewer,
} from "@/lib/admin/reservation-permission";
import {
  ReservationActionDialog,
  ReservationHistorySection,
  ReservationOperationCard,
  ReservationPermissionBadges,
  ReservationPermissionNotices,
  ReservationSourceBadge,
  ReservationSourceCards,
  ReservationViewerSwitch,
  buildReservationActionDetails,
  useReservationViewer,
  type ReservationActionDialogState,
} from "@/components/reservations/ReservationSource";

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
  if (status === "대기" || status === "취소승인") return "warn";
  return "info";
}

const SELLER_CANCEL_STATUS_BADGE: Record<ReservationSellerCancelStatus, string> = {
  검토대기: "danger",
  취소승인: "warn",
  취소거절: "gray",
  취소완료: "gray",
};

const SELLER_REFUND_STAGE_BADGE = { 환불대기: "warn", 환불실패: "danger", 환불완료: "gray", 환불없음: "gray" } as const;

function dottedDateTime(value: string) {
  return value.replace(/-/g, ".");
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
  const [reservationVersion, setReservationVersion] = useState(0);
  const reservation = useMemo(
    () => getReservationDetail(reservationId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservationId, reservationVersion],
  );
  const reservationHistory = useMemo(
    () => getReservationHistory(reservationId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservationId, reservationVersion],
  );
  const [actionDialog, setActionDialog] = useState<ReservationActionDialogState | null>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["예약관리"]);
  const [toast, setToast] = useState("");
  const [toastDetail, setToastDetail] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [toastTone, setToastTone] = useState<"" | "warn">("");
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
  const [payments, setPayments] = useState<ReservationPayment[]>(() => getReservationPayments(reservationId));
  const [refunds, setRefunds] = useState<ReservationRefund[]>(() => getReservationRefunds(reservationId));
  const [loadedReservationId, setLoadedReservationId] = useState(reservationId);
  if (loadedReservationId !== reservationId) {
    setLoadedReservationId(reservationId);
    setPayments(getReservationPayments(reservationId));
    setRefunds(getReservationRefunds(reservationId));
  }

  const paymentSummary = useMemo(() => {
    if (!reservation) {
      return calculatePaymentSummary(0, [], []);
    }
    const summary = calculatePaymentSummary(parseKrw(reservation.totalAmount), payments, refunds);
    if (reservation.sellerCancelRequest?.status === "취소완료") {
      return { ...summary, unpaid: 0, unpaidLabel: formatKrw(0) };
    }
    return summary;
  }, [reservation, payments, refunds]);

  const isCancelled = isCancelledReservation(displayReserveStatus);
  const router = useRouter();
  const [viewer, changeViewer] = useReservationViewer();
  const permissionTarget = { source: reservation?.source, reserveStatus: displayReserveStatus };
  const operationAssignment = useMemo(
    () => (reservation ? getReservationOperationView({ ...reservation, reserveStatus: displayReserveStatus }) : null),
    [reservation, displayReserveStatus],
  );
  const canEdit = reservation ? canEditReservation({ reservation: permissionTarget, viewer }) : false;
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

  const act = (message: string, detail = "", tone: "" | "warn" = "") => {
    setToast(message);
    setToastDetail(detail);
    setToastTone(tone);
    window.setTimeout(() => setToast(""), detail ? 3200 : 2200);
  };

  const sellerCancelRequest = reservation?.sellerCancelRequest;
  const bookingTerms = reservation?.bookingTerms;
  const isSellerChannel = Boolean(reservation?.source?.sellerCode);
  const sellerSettlement = useMemo(
    () => (isSellerChannel ? getSellerSettlementByReservation(reservationId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSellerChannel, reservationId, reservationVersion],
  );
  const reviewAction = getSellerCancelReviewAction(reservation ?? {}, viewer);

  const openReview = () => {
    if (!reviewAction.allowed) return;
    setReviewOpen(true);
  };

  const requestApprove = (input: SellerCancelApproveInput) => {
    if (!reservation || !sellerCancelRequest) return;
    setActionDialog({
      title: "예약 취소를 승인하시겠습니까?",
      details: [
        { label: "예약번호", value: reservation.code },
        { label: "취소수수료", value: formatKrw(input.cancellationFee) },
        { label: "환불예정금액", value: formatKrw(input.refundAmount) },
      ],
      notes: ["승인 후 예약은 취소처리 단계로 이동합니다."],
      cancelLabel: "닫기",
      confirmLabel: "취소 승인",
      onConfirm: () => {
        const actor = { name: `${viewer.agencyName} 관리자`, agency: viewer.agencyName };
        const done = approveSellerCancelRequest(
          reservation.code,
          input,
          actor,
          sellerCancelProcessedAt(sellerCancelRequest.requestedAt),
        );
        setActionDialog(null);
        if (!done) return;
        setReviewOpen(false);
        setDisplayReserveStatus("취소승인");
        setReservationVersion((value) => value + 1);
        act("취소요청을 승인했습니다.", "환불 및 최종 취소처리는 다음 단계에서 진행됩니다.");
      },
    });
  };

  const requestReject = (input: SellerCancelRejectInput) => {
    if (!reservation || !sellerCancelRequest) return;
    setActionDialog({
      title: "취소요청을 거절하시겠습니까?",
      details: [
        { label: "예약번호", value: reservation.code },
        { label: "거절사유", value: input.reasonDetail ? `${input.reason} · ${input.reasonDetail}` : input.reason },
      ],
      notes: [`판매점 ${sellerCancelRequest.sellerName}의 취소요청을 거절합니다.`],
      cancelLabel: "닫기",
      confirmLabel: "거절",
      confirmTone: "danger",
      onConfirm: () => {
        const actor = { name: `${viewer.agencyName} 관리자`, agency: viewer.agencyName };
        const done = rejectSellerCancelRequest(
          reservation.code,
          input,
          actor,
          sellerCancelProcessedAt(sellerCancelRequest.requestedAt),
        );
        setActionDialog(null);
        if (!done) return;
        setReviewOpen(false);
        setDisplayReserveStatus(sellerCancelRequest.previousReservationStatus);
        setReservationVersion((value) => value + 1);
        act("취소요청을 거절했습니다.", "예약은 기존 상태로 유지됩니다.");
      },
    });
  };

  const refundMode = reservation ? getSellerRefundMode(reservation) : null;
  const refundStage = getSellerRefundStage(sellerCancelRequest);
  const refundAction = getSellerRefundAction(reservation ?? {}, viewer);
  const sellerRefund = sellerCancelRequest?.refund;
  const timelineEntries = reservation?.statusTimeline ?? [];
  const lastTimelineAt = timelineEntries[timelineEntries.length - 1]?.at ?? sellerCancelRequest?.requestedAt ?? "";
  const supplierActor = () => ({ name: `${viewer.agencyName} 관리자`, agency: viewer.agencyName });

  const openRefundAction = () => {
    if (!reservation || !sellerCancelRequest?.approval || !refundAction.allowed || !refundMode) return;
    if (refundMode === "refund" || refundMode === "retry") {
      setRefundOpen(true);
      return;
    }
    const unpaid = refundMode === "completeUnpaid";
    setActionDialog({
      title: "예약을 취소완료 처리하시겠습니까?",
      details: unpaid
        ? [
            { label: "예약번호", value: reservation.code },
            { label: "결제금액", value: reservation.paidAmount },
          ]
        : [
            { label: "예약번호", value: reservation.code },
            { label: "취소수수료", value: formatKrw(sellerCancelRequest.approval.cancellationFee) },
            { label: "환불금액", value: formatKrw(0) },
          ],
      notes: [
        unpaid
          ? "결제된 금액이 없어 환불처리 없이 예약을 취소완료로 변경합니다."
          : "환불예정금액이 0원으로 별도 환불 없이 취소완료 처리됩니다.",
      ],
      cancelLabel: "닫기",
      confirmLabel: "취소완료 처리",
      onConfirm: () => {
        const done = completeSellerCancelWithoutRefund(reservation.code, supplierActor(), sellerCancelProcessedAt(lastTimelineAt));
        setActionDialog(null);
        if (!done) return;
        setDisplayReserveStatus("취소완료");
        setReservationVersion((value) => value + 1);
        act("예약을 취소완료 처리했습니다.", unpaid ? "결제된 금액이 없어 환불 없이 처리되었습니다." : "별도 환불 없이 처리되었습니다.");
      },
    });
  };

  const requestRefund = (input: SellerRefundInput) => {
    if (!reservation || !sellerCancelRequest?.approval) return;
    setActionDialog({
      title: "환불을 처리하시겠습니까?",
      details: [
        { label: "예약번호", value: reservation.code },
        { label: "환불금액", value: formatKrw(sellerCancelRequest.approval.refundAmount) },
        { label: "환불방법", value: input.method },
      ],
      notes: ["이번 Prototype에서는 실제 PG 환불 없이 Mock 상태만 변경됩니다."],
      cancelLabel: "닫기",
      confirmLabel: refundMode === "retry" ? "환불 재시도" : "환불처리",
      onConfirm: () => {
        setActionDialog(null);
        if (refundProcessing) return;
        setRefundProcessing(true);
        const fail = shouldSellerRefundFail(reservation.code, sellerRefund?.attempts.length ?? 0);
        const attemptAt = sellerCancelProcessedAt(lastTimelineAt);
        window.setTimeout(() => {
          const result = processSellerRefund(reservation.code, { ...input, fail }, supplierActor(), attemptAt);
          setRefundProcessing(false);
          setRefundOpen(false);
          setReservationVersion((value) => value + 1);
          if (result === "완료") {
            setDisplayReserveStatus("취소완료");
            setDisplayPaymentStatus("환불완료");
            setRefunds(getReservationRefunds(reservation.code));
            act("환불처리가 완료되었습니다.", "예약이 취소완료 상태로 변경되었습니다.");
          } else if (result === "실패") {
            act("환불처리에 실패했습니다.", "환불정보를 확인한 후 다시 처리해주세요.", "warn");
          }
        }, 700);
      },
    });
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
    if (isCancelled || !canEdit) return;
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

    if (!reservation) return;
    const actor = getViewerActor(viewer);
    const processedAt = formatReservationTimestamp(new Date());
    const cancellationType = cancelType === "예약 전체 취소" ? "full" : "partial";
    const refundTotal =
      (reservation.cancellation?.refundAmount ?? 0) + (refundMethod === "환불 없음" ? 0 : expectedRefundAmount);
    const feeTotal = (reservation.cancellation?.cancellationFee ?? 0) + cancelFee;
    const memo = adminMemo.trim();
    const settlementBefore = getSettlementRecordByReservation(reservation.code);
    if (settlementBefore && refundTotal + feeTotal > 0) {
      const errors = applySettlementCancellation(
        settlementBefore,
        {
          type: cancellationType,
          refundAmount: refundTotal,
          cancellationFee: feeTotal,
          feeOwner: settlementBefore.liveBreakdown.cancellationFeeOwner,
          reason: reasonText,
          memo,
        },
        actor,
        processedAt,
      );
      if (errors.length) {
        act(errors[0]);
        return;
      }
    } else {
      applyReservationCancellation(reservation.code, {
        type: cancellationType,
        refundAmount: refundTotal,
        cancellationFee: feeTotal,
        reason: reasonText,
        memo,
        processedAt,
        processedBy: actor,
      });
      if (settlementBefore) {
        syncSettlementAfterReservationChange(settlementBefore, actor, processedAt, { cause: "환불조정", reason: reasonText });
      }
    }
    setReservationVersion((value) => value + 1);

    let nextPaymentStatus = displayPaymentStatus;
    if (refundMethod === "환불 없음") {
      nextPaymentStatus = "환불완료";
    } else if (refundMethod === "원결제 수단 환불") {
      nextPaymentStatus = "환불완료";
    } else {
      nextPaymentStatus = "환불대기";
    }

    if (cancellationType === "full") setDisplayReserveStatus("취소완료");
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
        statusAfter: cancellationType === "full" ? "취소완료" : reserveBefore,
        paymentBefore,
        paymentAfter: nextPaymentStatus,
        reason: reasonText,
        actor: "장윤호",
      },
      ...current,
    ]);
    closeCancelModal();
    if (!settlementBefore) {
      act("예약 취소 및 환불 처리가 완료되었습니다.");
    } else if (settlementBefore.status === "정산대기") {
      act("예약 취소 및 환불 처리가 완료되었습니다. 정산금액이 자동 재계산되었습니다.");
    } else if (settlementBefore.status === "지급완료") {
      act("예약 취소 및 환불 처리가 완료되었습니다. 변경분은 차기 정산 조정으로 반영됩니다.");
    } else {
      act("예약 취소 및 환불 처리가 완료되었습니다. 정산 조정이 필요합니다.");
    }
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const openCloseDialog = () => {
    if (!reservation || !getReservationCloseAction(permissionTarget, viewer).allowed) return;
    const isShared = getReservationSourceType(reservation) !== "direct";
    setActionDialog({
      title: "예약을 마감하시겠습니까?",
      notes: isShared
        ? ["예약마감 후 판매여행사에서는 주요 예약정보 수정이 제한됩니다.", "운영인계가 완료되면 공급여행사에서 예약을 관리합니다."]
        : ["예약마감 후 신규 변경은 운영 담당자가 확인 후 처리합니다."],
      details: buildReservationActionDetails(reservation),
      confirmLabel: "예약마감",
      onConfirm: () => {
        closeReservation(reservation.code, getViewerActor(viewer), formatReservationTimestamp(new Date()));
        setDisplayReserveStatus("예약마감");
        setReservationVersion((value) => value + 1);
        setActionDialog(null);
        act(isShared ? "예약마감이 완료되었습니다. 운영인계를 진행해주세요." : "예약마감이 완료되었습니다.");
      },
    });
  };

  const openHandoverDialog = () => {
    if (!reservation || !getReservationHandoverAction(permissionTarget, viewer).allowed) return;
    setActionDialog({
      title: "운영관리 권한을 공급여행사로 인계하시겠습니까?",
      notes: [
        "운영인계 후 공급여행사가 예약정보를 관리합니다.",
        "판매여행사는 예약내용을 계속 확인할 수 있지만 수정권한은 제한됩니다.",
      ],
      details: buildReservationActionDetails(reservation),
      confirmLabel: "운영인계",
      onConfirm: () => {
        handoverReservation(reservation.code, getViewerActor(viewer), formatReservationTimestamp(new Date()));
        setReservationVersion((value) => value + 1);
        setActionDialog(null);
        act("운영관리 권한이 공급여행사로 인계되었습니다.");
      },
    });
  };

  if (!reservation) {
    return (
      <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
        <main className="content member-web-detail-content">
          <section className="panel member-web-detail-not-found">
            <strong>예약을 찾을 수 없습니다.</strong>
            <p>요청하신 예약번호({reservationId || "-"})에 해당하는 예약 정보가 없습니다.</p>
            <button
              type="button"
              className="secondary"
              onClick={() => router.push(withReservationViewer("/reservations", viewer))}
            >
              <ArrowLeft size={14} />
              예약목록으로
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
                <ReservationSourceBadge reservation={reservation} />
                <ReservationPermissionBadges reservation={permissionTarget} viewer={viewer} />
              </div>
              <p className="member-web-detail-subtitle">{reservation.productName}</p>
            </div>
            <div className="member-web-detail-actions">
              <ReservationViewerSwitch viewer={viewer} onChange={changeViewer} />
              <button
                type="button"
                className="secondary"
                onClick={() => router.push(withReservationViewer("/reservations", viewer))}
              >
                <ArrowLeft size={14} />
                목록
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => router.push(withReservationViewer(`/reservations/${reservation.code}/edit`, viewer))}
              >
                <Pencil size={14} />
                {canEdit ? "예약수정" : "예약정보 보기"}
              </button>
              {reservation.settlement && reservation.source?.type !== "direct" && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    router.push(withReservationViewer(`/settlements/${reservation.settlement?.settlementCode}`, viewer))
                  }
                >
                  <Wallet size={14} />
                  정산 상세
                </button>
              )}
              {refundMode && (
                <button
                  type="button"
                  className={refundAction.allowed ? "primary" : "secondary"}
                  onClick={openRefundAction}
                  disabled={!refundAction.allowed || refundProcessing}
                  title={!refundAction.allowed ? refundAction.reason : undefined}
                >
                  <Wallet size={14} />
                  {refundMode === "refund"
                    ? "환불처리"
                    : refundMode === "retry"
                      ? "환불 재시도"
                      : "취소완료 처리"}
                </button>
              )}
              {!isSellerChannel && (
                <button
                  type="button"
                  className={isCancelled || !canEdit ? "secondary" : "primary"}
                  onClick={openCancelModal}
                  disabled={isCancelled || !canEdit}
                  title={!canEdit ? "예약 수정권한이 없습니다." : undefined}
                >
                  <Receipt size={14} />
                  {isCancelled ? "취소완료" : "취소/환불"}
                </button>
              )}
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

          {sellerCancelRequest?.status === "검토대기" && (
            <div className="product-share-setting-alert reservation-permission-alert seller-cancel-alert" role="alert">
              <AlertTriangle size={14} />
              <div>
                <strong>판매점 취소요청</strong>
                <p>{sellerCancelRequest.sellerName}에서 고객의 예약 취소를 요청했습니다.</p>
                <dl>
                  <div>
                    <dt>요청일시</dt>
                    <dd>{dottedDateTime(sellerCancelRequest.requestedAt)}</dd>
                  </div>
                  <div>
                    <dt>취소사유</dt>
                    <dd>{sellerCancelRequest.reason}</dd>
                  </div>
                </dl>
              </div>
              <div className="seller-cancel-alert-action">
                <button type="button" className="primary" onClick={openReview} disabled={!reviewAction.allowed}>
                  취소요청 검토
                </button>
                {!reviewAction.allowed && reviewAction.reason && <small>{reviewAction.reason}</small>}
              </div>
            </div>
          )}
          {sellerCancelRequest?.status === "취소승인" && refundStage === "환불실패" && (
            <div className="product-share-setting-alert reservation-permission-alert seller-cancel-alert" role="alert">
              <AlertTriangle size={14} />
              <div>
                <strong>환불처리에 실패했습니다.</strong>
                <p>환불정보를 확인한 후 다시 처리해주세요. 예약은 취소승인 상태로 유지됩니다.</p>
              </div>
            </div>
          )}
          {sellerCancelRequest?.status === "취소승인" && refundStage !== "환불실패" && (
            <div className="product-share-setting-alert reservation-permission-alert is-info seller-cancel-alert" role="status">
              <Info size={14} />
              <div>
                <strong>취소승인 · 환불대기</strong>
                <p>
                  {refundMode === "completeUnpaid"
                    ? "결제된 금액이 없어 환불처리 없이 취소완료 처리할 수 있습니다."
                    : refundMode === "completeNoRefund"
                      ? "환불예정금액이 0원으로 별도 환불 없이 취소완료 처리할 수 있습니다."
                      : `환불예정금액 ${formatKrw(sellerCancelRequest.approval?.refundAmount ?? 0)}을 환불처리하면 예약이 취소완료됩니다.`}
                </p>
                {!refundAction.allowed && refundAction.reason && <p>{refundAction.reason}</p>}
              </div>
            </div>
          )}
          {sellerCancelRequest?.status === "취소완료" && (
            <div className="product-share-setting-alert reservation-permission-alert is-info seller-cancel-alert" role="status">
              <Info size={14} />
              <div>
                <strong>예약 취소가 완료되었습니다.</strong>
                <p>
                  {sellerRefund?.status === "환불완료"
                    ? `환불완료 · ${formatKrw(sellerRefund.amount)} · 환불금액과 취소수수료는 조회만 가능합니다.`
                    : "별도 환불 없이 취소완료되었습니다. 처리내역은 조회만 가능합니다."}
                </p>
              </div>
            </div>
          )}
          {sellerCancelRequest?.status === "취소거절" && (
            <div className="product-share-setting-alert reservation-permission-alert is-info seller-cancel-alert" role="status">
              <Info size={14} />
              <div>
                <strong>판매점 취소요청을 거절했습니다.</strong>
                <p>예약은 기존 상태({sellerCancelRequest.previousReservationStatus})로 유지됩니다.</p>
              </div>
            </div>
          )}

          <ReservationOperationCard
            reservation={permissionTarget}
            viewer={viewer}
            onClose={openCloseDialog}
            onHandover={openHandoverDialog}
            onViewSettlement={
              reservation.settlement
                ? () =>
                    router.push(withReservationViewer(`/settlements/${reservation.settlement?.settlementCode}`, viewer))
                : undefined
            }
            assignment={operationAssignment}
            onOpenAssignment={
              operationAssignment && viewer.type === "integrated"
                ? () => router.push(getOperationAssignmentPath(operationAssignment.departureKey))
                : undefined
            }
          />

          <ReservationPermissionNotices reservation={permissionTarget} viewer={viewer} />

          <div className="member-web-detail-stack">
            <ReservationSourceCards reservation={permissionTarget} viewer={viewer} />

            {sellerCancelRequest && (
              <section className="panel member-web-detail-card seller-cancel-info-card">
                <div className="member-web-detail-card-head">
                  <strong>취소요청 정보</strong>
                  <span className={`badge ${SELLER_CANCEL_STATUS_BADGE[sellerCancelRequest.status]}`}>
                    {sellerCancelRequest.status}
                  </span>
                </div>
                <div className="member-web-detail-info-grid">
                  <InfoField label="요청 판매점" value={sellerCancelRequest.sellerName} />
                  <InfoField label="판매점코드" value={sellerCancelRequest.sellerCode} />
                  <InfoField label="요청일시" value={dottedDateTime(sellerCancelRequest.requestedAt)} />
                  <InfoField label="고객명" value={sellerCancelRequest.customerName} />
                  <InfoField label="취소사유" value={sellerCancelRequest.reason} />
                  <InfoField label="고객 요청내용" value={sellerCancelRequest.customerNote ?? "-"} />
                  <InfoField label="현재 처리상태" value={sellerCancelRequest.status} />
                  <InfoField label="취소요청 전 예약상태" value={sellerCancelRequest.previousReservationStatus} />
                  {sellerCancelRequest.approval && (
                    <>
                      <InfoField label="처리자" value={sellerCancelRequest.approval.processedBy.name} />
                      <InfoField label="처리일시" value={dottedDateTime(sellerCancelRequest.approval.processedAt)} />
                      <InfoField label="정책 기준 수수료" value={formatKrw(sellerCancelRequest.approval.recommendedFee)} />
                      <InfoField label="적용 취소수수료" value={formatKrw(sellerCancelRequest.approval.cancellationFee)} />
                      <InfoField label="환불예정금액" value={formatKrw(sellerCancelRequest.approval.refundAmount)} />
                      <InfoField label="처리메모" value={sellerCancelRequest.approval.memo || "-"} />
                    </>
                  )}
                  {sellerCancelRequest.rejection && (
                    <>
                      <InfoField label="처리자" value={sellerCancelRequest.rejection.processedBy.name} />
                      <InfoField label="처리일시" value={dottedDateTime(sellerCancelRequest.rejection.processedAt)} />
                      <InfoField
                        label="거절사유"
                        value={
                          sellerCancelRequest.rejection.reasonDetail
                            ? `${sellerCancelRequest.rejection.reason} · ${sellerCancelRequest.rejection.reasonDetail}`
                            : sellerCancelRequest.rejection.reason
                        }
                      />
                    </>
                  )}
                </div>
              </section>
            )}

            {refundStage && sellerCancelRequest?.approval && (
              <section className="panel member-web-detail-card seller-refund-info-card">
                <div className="member-web-detail-card-head">
                  <strong>환불정보</strong>
                  <span className={`badge ${SELLER_REFUND_STAGE_BADGE[refundStage]}`}>{refundStage}</span>
                </div>
                <div className="member-web-detail-info-grid">
                  <InfoField label="환불상태" value={refundStage} />
                  <InfoField label="환불방법" value={sellerRefund?.method ?? "-"} />
                  <InfoField
                    label="환불금액"
                    value={formatKrw(sellerRefund?.status === "환불없음" ? 0 : sellerCancelRequest.approval.refundAmount)}
                  />
                  <InfoField label="취소수수료" value={formatKrw(sellerCancelRequest.approval.cancellationFee)} />
                  <InfoField label="환불일시" value={sellerRefund?.refundedAt ? dottedDateTime(sellerRefund.refundedAt) : "-"} />
                  <InfoField label="처리자" value={sellerRefund?.processedBy.name ?? "-"} />
                  <InfoField
                    label="취소완료일시"
                    value={sellerRefund?.completedAt ? dottedDateTime(sellerRefund.completedAt) : "-"}
                  />
                  <InfoField label="환불메모" value={sellerRefund?.memo || "-"} />
                  {sellerRefund?.bankAccount && (
                    <InfoField
                      label="환불계좌"
                      value={`${sellerRefund.bankAccount.bank} ${sellerRefund.bankAccount.accountMasked} · ${sellerRefund.bankAccount.holder}`}
                    />
                  )}
                </div>
                {sellerRefund && sellerRefund.attempts.length > 0 && (
                  <ol className="seller-cancel-timeline seller-refund-attempts" aria-label="환불처리 이력">
                    {sellerRefund.attempts.map((attempt, index) => (
                      <li key={`${attempt.at}-${index}`}>
                        <time>{dottedDateTime(attempt.at)}</time>
                        <span className={`badge ${attempt.result === "완료" ? "gray" : "danger"}`}>
                          {attempt.result === "완료" ? "환불완료" : "환불실패"}
                        </span>
                        <b>{attempt.processedBy.name}</b>
                        <small>
                          {attempt.method} · {formatKrw(attempt.amount)}
                        </small>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}

            {sellerSettlement && (
              <section className="panel member-web-detail-card">
                <div className="member-web-detail-card-head">
                  <strong>정산반영</strong>
                  <span className={`badge ${sellerSettlementStatusBadgeClass(sellerSettlement.settlement.status)}`}>
                    {sellerSettlement.settlement.status}
                  </span>
                </div>
                <div className="member-web-detail-info-grid">
                  <InfoField label="정산건" value={`${sellerSettlement.settlement.label} · ${sellerSettlement.settlement.code}`} />
                  <InfoField label="반영상태" value={sellerSettlementReflectionLabel(sellerSettlement)} />
                  <InfoField label="판매점 수익 (예약 당시)" value={formatKrw(sellerSettlement.line.originalProfit)} />
                  <InfoField
                    label="정산조정"
                    value={
                      sellerSettlement.line.reflection === "취소처리중"
                        ? "미반영 (취소완료 후 반영)"
                        : formatSellerSettlementSigned(
                            sellerSettlement.line.adjustment ||
                              sellerSettlement.line.pendingAdjustment ||
                              (sellerSettlement.nextAdjustment?.amount ?? 0),
                          )
                    }
                  />
                  {sellerSettlement.nextAdjustment && (
                    <InfoField label="차기정산" value={`${sellerSettlement.nextAdjustment.targetSettlementCode} · ${sellerSettlement.nextAdjustment.status}`} />
                  )}
                  {sellerSettlement.line.refundAmount !== null && (
                    <InfoField label="고객 환불금액 (별도)" value={formatKrw(sellerSettlement.line.refundAmount)} />
                  )}
                </div>
                <p className="seller-cancel-terms-note">
                  정산 차감액은 예약 당시 판매점 수익 기준이며 환불금액과 다릅니다. 취소수수료의 정산 배분은 별도 정책으로 처리됩니다.{" "}
                  {(viewer.type === "integrated" || viewer.agencyName === sellerSettlement.settlement.supplierName) && (
                    <Link
                      href={withReservationViewer(`/settlements?tab=seller&period=${sellerSettlement.settlement.code}`, viewer)}
                      className="reservation-code-link"
                    >
                      판매점 수익 정산 보기
                    </Link>
                  )}
                </p>
              </section>
            )}

            {bookingTerms && (
              <section className="panel member-web-detail-card seller-cancel-terms-card">
                <div className="member-web-detail-card-head">
                  <strong>예약 당시 판매조건</strong>
                  <span className="badge gray">Snapshot</span>
                </div>
                <div className="member-web-detail-info-grid">
                  <InfoField label="판매방식" value={bookingTerms.saleMode} />
                  {bookingTerms.saleMode === "수수료형" ? (
                    <InfoField label="수수료율" value={`${bookingTerms.commissionRate ?? 0}%`} />
                  ) : (
                    <InfoField label="입금가 (1인)" value={formatKrw(bookingTerms.depositPrice ?? 0)} />
                  )}
                  <InfoField label="판매점 판매가 (1인)" value={formatKrw(bookingTerms.unitPrice)} />
                  <InfoField label="인원" value={`${bookingTerms.pax}명`} />
                  <InfoField label="총 예약금액" value={formatKrw(bookingTerms.amount)} />
                  <InfoField
                    label="판매점 예상수익"
                    value={
                      displayReserveStatus === "취소완료"
                        ? `0원 (취소완료 · 예약 당시 ${formatKrw(bookingTerms.sellerProfit)})`
                        : sellerCancelRequest?.status === "취소승인"
                          ? `${formatKrw(bookingTerms.sellerProfit)} → 0원 (취소승인 · 정산 반영 대기)`
                          : formatKrw(bookingTerms.sellerProfit)
                    }
                  />
                </div>
                <p className="seller-cancel-terms-note">
                  예약 접수 시점의 판매조건입니다. 이후 상품 판매가 · 입금가가 변경되어도 이 예약에는 반영되지 않습니다.
                </p>
              </section>
            )}

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
                {reservation.boardingPoint !== undefined && (
                  <InfoField label="탑승지" value={reservation.boardingPoint} />
                )}
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

            {reservation.statusTimeline && reservation.statusTimeline.length > 0 && (
              <section className="panel member-web-detail-card">
                <div className="member-web-detail-card-head">
                  <strong>예약 상태 Timeline</strong>
                  <span className="member-web-status-history-count">{reservation.statusTimeline.length}건</span>
                </div>
                <ol className="seller-cancel-timeline">
                  {reservation.statusTimeline.map((entry, index) => (
                    <li key={`${entry.at}-${entry.label}-${index}`}>
                      <time>{dottedDateTime(entry.at)}</time>
                      <span className={`badge ${entry.tone}`}>{entry.label}</span>
                      <b>{entry.actor}</b>
                      {entry.note && <small>{entry.note}</small>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <ReservationHistorySection history={reservationHistory} />
          </div>
        </main>
      </div>

      {reviewOpen && sellerCancelRequest?.status === "검토대기" && bookingTerms && (
        <SellerCancelReviewModal
          reservation={{ ...reservation, reserveStatus: displayReserveStatus }}
          terms={bookingTerms}
          request={sellerCancelRequest}
          suspended={actionDialog !== null}
          onClose={() => setReviewOpen(false)}
          onApprove={requestApprove}
          onReject={requestReject}
        />
      )}

      {refundOpen && (refundMode === "refund" || refundMode === "retry") && sellerCancelRequest?.approval && (
        <SellerRefundModal
          reservation={{ ...reservation, reserveStatus: displayReserveStatus, paymentStatus: displayPaymentStatus }}
          request={{ ...sellerCancelRequest, approval: sellerCancelRequest.approval }}
          approvalNumber={payments[0]?.approvalNumber ?? "-"}
          retry={refundMode === "retry"}
          processing={refundProcessing}
          failureScenario={isSellerRefundFailureScenario(reservation.code)}
          suspended={actionDialog !== null}
          onClose={() => setRefundOpen(false)}
          onSubmit={requestRefund}
        />
      )}

      <ReservationActionDialog dialog={actionDialog} onClose={() => setActionDialog(null)} />

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

      {toast && (
        <div className={`toast${toastTone === "warn" ? " toast-warn" : ""}`} role="status">
          {toastDetail ? (
            <span className="seller-prod-toast-text">
              <b>{toast}</b>
              <small>{toastDetail}</small>
            </span>
          ) : (
            toast
          )}
        </div>
      )}
    </div>
  );
}
