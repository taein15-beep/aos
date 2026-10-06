"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ClipboardList, FileText, Info, Lock } from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import {
  ReservationActionDialog,
  ReservationSourceBadge,
  ReservationViewerSwitch,
  useReservationViewer,
  type ReservationActionDialogState,
} from "@/components/reservations/ReservationSource";
import {
  SettlementCalc,
  SettlementHoldModal,
  SettlementPaymentModal,
  SettlementPerspectiveCard,
  SettlementStatusBadge,
  useQueryParam,
  type SettlementCalcRow,
} from "@/components/settlements/SettlementParts";
import {
  SettlementCloseCard,
  SettlementDisputeModal,
  SettlementDocumentFormModal,
  SettlementDocumentSection,
  SettlementDocumentStatusBadge,
} from "@/components/settlements/SettlementDocumentParts";
import {
  acknowledgeSettlementDispute,
  cancelSettlementDocument,
  confirmSettlementDocument,
  disputeSettlementDocument,
  formatDocumentVersion,
  getActiveSettlementDocument,
  getCurrentDocumentVersion,
  getDefaultDocumentForm,
  getOpenDispute,
  getSettlementDocumentActions,
  getSettlementDocumentIssueStatus,
  getSettlementDocuments,
  getSettlementPaymentPendingStatus,
  isSettlementDocumentReceiver,
  issueSettlementDocument,
  markSettlementPaymentPendingByDocument,
  reissueSettlementDocument,
  requestSettlementDocumentConfirmation,
  saveSettlementDocumentDraft,
  type SettlementDocumentForm,
} from "@/lib/admin/settlement-document-data";
import {
  SettlementAdjustmentSection,
  SettlementAdjustmentStateBadge,
  SettlementCancellationCard,
  SettlementCancellationModal,
  SettlementChangeList,
  SettlementConfirmationCard,
  SettlementFinalSummaryCard,
  SettlementManualAdjustmentModal,
  SettlementNextAdjustmentSection,
} from "@/components/settlements/SettlementAdjustmentParts";
import {
  RESERVATION_CANCELLATION_LABELS,
  formatReservationTimestamp,
  reserveStatusBadgeClass,
} from "@/lib/admin/reservations-data";
import { getViewerActor, withReservationViewer } from "@/lib/admin/reservation-permission";
import {
  SETTLEMENT_HISTORY_LABELS,
  addManualSettlementAdjustment,
  applySettlementCancellation,
  canAdjustSettlement,
  canEditSettlementTerms,
  canManageSettlement,
  cancelSettlement,
  cancelSettlementAdjustment,
  closeSettlement,
  completeSettlementPayment,
  confirmSettlement,
  createSettlementDifferenceAdjustment,
  formatSignedWon,
  formatWon,
  getAdjustmentDirection,
  getSettlementActionAvailability,
  getSettlementCloseStatus,
  getSettlementConfirmationStatus,
  getSettlementHistory,
  getSettlementPerspective,
  getSettlementRecord,
  holdSettlement,
  isSettlementAmountLocked,
  resumeSettlement,
  settlementHistoryBadgeClass,
  type SettlementAdjustmentView,
  type SettlementStatus,
} from "@/lib/admin/settlement-data";
import { SettlementTermsCard } from "@/components/settlements/SettlementTermsCard";

const STATUS_GUIDE: Record<SettlementStatus, string> = {
  정산대기: "금액/조건 수정 가능 · 예약금액 변경 시 정산금액을 다시 계산합니다.",
  정산확정: "금액 수정 제한 · 확정 시점 금액 기준으로 정산합니다.",
  지급대기: "금액 수정 불가 · 지급완료 처리를 기다리고 있습니다.",
  지급완료: "지급이 완료된 정산입니다. 변경분은 차기 정산 조정으로만 반영합니다.",
  정산보류: "보류 해제 외 정산확정·지급 Action이 제한됩니다.",
  정산취소: "취소된 정산입니다. 읽기 전용입니다.",
};

function todayLabel() {
  return formatReservationTimestamp(new Date()).slice(0, 10);
}

function now() {
  return formatReservationTimestamp(new Date());
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="member-web-detail-field">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

type DetailTab = "info" | "document" | "history";

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: "info", label: "정산정보" },
  { key: "document", label: "정산서" },
  { key: "history", label: "정산이력" },
];

function scrollToAdjustments() {
  window.setTimeout(() => document.getElementById("settlement-adjustments")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
}

function formFromSnapshot(snapshot: SettlementDocumentForm, issueDate: string): SettlementDocumentForm {
  return {
    documentType: snapshot.documentType,
    issueDate,
    periodFrom: snapshot.periodFrom,
    periodTo: snapshot.periodTo,
    manager: snapshot.manager,
    note: snapshot.note,
  };
}

export default function SettlementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const settlementId = useMemo(() => decodeURIComponent(params.id ?? ""), [params.id]);
  const [version, setVersion] = useState(0);
  const record = useMemo(
    () => getSettlementRecord(settlementId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settlementId, version],
  );
  const history = useMemo(() => (record ? getSettlementHistory(record) : []), [record]);
  const documents = useMemo(() => (record ? getSettlementDocuments(record.settlementCode) : []), [record]);
  const activeDocument = useMemo(() => (record ? getActiveSettlementDocument(record.settlementCode) : undefined), [record]);
  const [tabValue, setTab] = useQueryParam("tab", "info");
  const [documentForm, setDocumentForm] = useState<{ mode: "create" | "reissue"; initial: SettlementDocumentForm } | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [viewer, changeViewer] = useReservationViewer();
  const [toast, setToast] = useState("");
  const [dialog, setDialog] = useState<ReservationActionDialogState | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [cancellationOpen, setCancellationOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const shell = (content: ReactNode, overlays?: ReactNode) => (
    <ProductAdminShell
      activeMenu="정산관리"
      currentChild="정산현황"
      breadcrumb={
        <>
          <span>정산관리</span>
          <b>/</b>
          <span>정산현황</span>
          <b>/</b>
          <strong>정산 상세</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
      overlays={overlays}
    >
      {content}
    </ProductAdminShell>
  );

  if (!record) {
    return shell(
      <main className="content member-web-detail-content">
        <section className="panel member-web-detail-not-found">
          <strong>정산내역을 찾을 수 없습니다.</strong>
          <p>요청하신 정산번호({settlementId || "-"})에 해당하는 정산 정보가 없습니다.</p>
          <button type="button" className="secondary" onClick={() => router.push("/settlements")}>
            <ArrowLeft size={14} />
            목록으로
          </button>
        </section>
      </main>,
    );
  }

  const b = record.breakdown;
  const live = record.liveBreakdown;
  const amounts = record.amounts;
  const settlement = record.settlement;
  const hasSeller = Boolean(record.sellerName);
  const hasCancellation = b.refundAmount > 0 || b.cancellationFee > 0;
  const closed = Boolean(settlement.closing);
  const actions = getSettlementActionAvailability(record.status, closed);
  const canManage = canManageSettlement(record, viewer);
  const closeStatus = getSettlementCloseStatus(record);
  const receiverView = isSettlementDocumentReceiver(record, viewer);
  const documentActions = getSettlementDocumentActions(record, activeDocument, viewer);
  const issueStatus = getSettlementDocumentIssueStatus(record, activeDocument);
  const paymentPendingStatus = getSettlementPaymentPendingStatus(record, activeDocument);
  const currentDocumentVersion = getCurrentDocumentVersion(activeDocument);
  const openDispute = getOpenDispute(activeDocument);
  const documentStatus = activeDocument?.status ?? "미발행";
  const canAdjust = canAdjustSettlement(record.status);
  const locked = isSettlementAmountLocked(settlement);
  const perspective = getSettlementPerspective(record, viewer);
  const confirmation = getSettlementConfirmationStatus(record);
  const isSellerView = viewer.type === "seller";
  const tabs = DETAIL_TABS.filter((tab) => !(isSellerView && tab.key === "document"));
  const tab: DetailTab = tabs.some((item) => item.key === tabValue) ? (tabValue as DetailTab) : "info";
  const actor = getViewerActor(viewer);
  const linkFor = (code: string) => withReservationViewer(`/settlements/${code}`, viewer);
  const showAdjustments = () => {
    setTab("info");
    scrollToAdjustments();
  };

  const refresh = (message: string) => {
    setVersion((value) => value + 1);
    setDialog(null);
    notify(message);
  };

  const openConfirm = () =>
    setDialog({
      title: "정산내역을 확정하시겠습니까?",
      details: [
        { label: hasCancellation ? "정산대상금액" : "고객 결제금액", value: formatWon(live.settlementBaseAmount) },
        { label: "판매수수료", value: `${formatWon(live.affiliateCommission)} (${live.affiliateCommissionRate}%)` },
        ...(hasSeller ? [{ label: "판매점 수수료", value: `${formatWon(live.sellerCommission)} (${live.sellerCommissionRate}%)` }] : []),
        { label: "공급사 정산액", value: formatWon(live.supplierAmount) },
        ...(amounts.finalSupplierAmount !== live.supplierAmount
          ? [{ label: "조정 반영 최종 정산액", value: formatWon(amounts.finalSupplierAmount) }]
          : []),
      ],
      notes: ["정산확정 후 금액 수정은 제한됩니다.", ...confirmation.warnings.map((warning) => `확인 필요 · ${warning}`)],
      confirmLabel: "정산확정",
      onConfirm: () => {
        confirmSettlement(record, actor, now());
        refresh("정산내역을 확정했습니다.");
      },
    });

  const openPaymentPending = () =>
    setDialog({
      title: "지급대기로 변경하시겠습니까?",
      details: [
        { label: "정산번호", value: record.settlementCode },
        { label: "확정 정산액", value: formatWon(b.supplierAmount) },
        ...(amounts.finalSupplierAmount !== b.supplierAmount ? [{ label: "최종 정산액", value: formatWon(amounts.finalSupplierAmount) }] : []),
      ],
      notes: ["실제 지급은 진행되지 않으며 지급 예정 상태로만 표시됩니다.", "정산서 확인완료 기준으로 지급대기 처리합니다."],
      confirmLabel: "지급대기 처리",
      onConfirm: () => {
        if (markSettlementPaymentPendingByDocument(record, actor, now())) refresh("지급대기로 변경했습니다.");
        else setDialog(null);
      },
    });

  const openClose = () =>
    setDialog({
      title: "정산을 마감하시겠습니까?",
      details: [
        { label: "정산번호", value: record.settlementCode },
        { label: "상품명", value: record.productName },
        { label: "출발일", value: record.departureAt },
        { label: "판매여행사", value: record.sellingAgencyName },
        { label: "판매점", value: record.sellerName },
        { label: "고객 결제금액", value: formatWon(b.paidAmount) },
        ...(hasCancellation ? [{ label: "정산대상금액", value: formatWon(b.settlementBaseAmount) }] : []),
        { label: "판매수수료", value: `${formatWon(b.affiliateCommission)} (${b.affiliateCommissionRate}%)` },
        ...(hasSeller ? [{ label: "판매점 수수료", value: `${formatWon(b.sellerCommission)} (${b.sellerCommissionRate}%)` }] : []),
        { label: "조정금액", value: formatSignedWon(amounts.finalSupplierAmount - b.supplierAmount) },
        { label: "최종 정산액", value: formatWon(amounts.finalSupplierAmount) },
      ],
      notes: [
        "정산마감 이후 기본 정산금액은 직접 수정할 수 없습니다.",
        "이후 변경사항은 정산조정 내역으로 관리됩니다.",
        ...closeStatus.warnings.map((warning) => `확인 필요 · ${warning}`),
      ],
      confirmLabel: "정산마감",
      onConfirm: () => {
        if (closeSettlement(record, actor, now())) refresh("정산이 마감되었습니다.");
        else setDialog(null);
      },
    });

  const openDocumentCreate = () =>
    setDocumentForm({
      mode: "create",
      initial: activeDocument?.status === "작성중" && activeDocument.draft ? activeDocument.draft : getDefaultDocumentForm(record, todayLabel(), actor),
    });

  const openDocumentReissue = () => {
    if (!currentDocumentVersion) return;
    setDocumentForm({ mode: "reissue", initial: formFromSnapshot(currentDocumentVersion.snapshot, todayLabel()) });
  };

  const openDocumentView = () => setTab("document");

  const requestDocumentConfirmation = () => {
    if (requestSettlementDocumentConfirmation(record, actor, now())) refresh("판매여행사에 정산서 확인을 요청했습니다.");
  };

  const acknowledgeDispute = () => {
    if (acknowledgeSettlementDispute(record, actor, now())) refresh("이의내용을 확인했습니다. 정산조정 후 정산서를 재발행해주세요.");
  };

  const openDocumentCancel = () =>
    setDialog({
      title: "정산서 발행을 취소하시겠습니까?",
      details: [
        { label: "문서번호", value: activeDocument?.documentNo },
        { label: "현재 버전", value: currentDocumentVersion ? formatDocumentVersion(currentDocumentVersion.version) : undefined },
        { label: "문서상태", value: activeDocument?.status },
      ],
      notes: ["발행취소된 문서는 삭제되지 않고 이력에 남습니다.", "발행 취소 후 새 정산서를 다시 생성할 수 있습니다."],
      confirmLabel: "발행 취소",
      onConfirm: () => {
        if (cancelSettlementDocument(record, actor, now())) refresh("정산서 발행을 취소했습니다.");
        else setDialog(null);
      },
    });

  const openDocumentConfirm = () =>
    setDialog({
      title: "정산내역을 확인하시겠습니까?",
      details: [
        { label: "문서번호", value: activeDocument?.documentNo },
        { label: "버전", value: currentDocumentVersion ? formatDocumentVersion(currentDocumentVersion.version) : undefined },
        { label: "공급여행사", value: record.supplierAgencyName },
        { label: "최종 정산액", value: formatWon(currentDocumentVersion?.snapshot.totals.finalSettlementAmount ?? 0) },
      ],
      notes: ["확인 후 지급 절차를 진행할 수 있습니다."],
      confirmLabel: "확인완료",
      onConfirm: () => {
        if (confirmSettlementDocument(record, actor, now())) refresh("정산서 확인이 완료되었습니다.");
        else setDialog(null);
      },
    });

  const openResume = () =>
    setDialog({
      title: "정산보류를 해제하시겠습니까?",
      details: [
        { label: "정산번호", value: record.settlementCode },
        { label: "보류사유", value: settlement.hold?.reason },
      ],
      notes: ["보류 해제 시 정산대기 상태로 변경되며, 정산금액은 현재 예약금액 기준으로 다시 계산됩니다."],
      confirmLabel: "보류 해제",
      onConfirm: () => {
        resumeSettlement(record, actor, now());
        refresh("정산보류를 해제했습니다.");
      },
    });

  const openCancel = () =>
    setDialog({
      title: "정산을 취소하시겠습니까?",
      details: [
        { label: "정산번호", value: record.settlementCode },
        { label: "현재 상태", value: record.status },
        { label: "공급사 정산액", value: formatWon(amounts.finalSupplierAmount) },
      ],
      notes: ["지급완료된 정산은 취소할 수 없습니다.", "정산취소 후에는 정산 Action을 진행할 수 없습니다."],
      confirmLabel: "정산취소",
      onConfirm: () => {
        cancelSettlement(record, actor, now());
        refresh("정산을 취소했습니다.");
      },
    });

  const openCancelAdjustment = (adjustment: SettlementAdjustmentView) =>
    setDialog({
      title: "조정내역을 취소하시겠습니까?",
      details: [
        { label: "조정유형", value: `${adjustment.direction} · ${adjustment.cause}` },
        { label: "조정금액", value: formatSignedWon(adjustment.amount) },
        { label: "사유", value: adjustment.reason },
      ],
      notes: ["취소된 조정은 정산금액에서 제외되며 이력은 유지됩니다."],
      confirmLabel: "조정 취소",
      onConfirm: () => {
        cancelSettlementAdjustment(record, adjustment.id, actor, now());
        refresh("조정내역을 취소했습니다.");
      },
    });

  const createDifference = () => {
    createSettlementDifferenceAdjustment(record, actor, now());
    refresh("차액조정을 생성했습니다.");
  };

  const paymentMismatch = settlement.payment && settlement.payment.amount !== amounts.finalSupplierAmount;
  const confirmedDifference = live.supplierAmount - b.supplierAmount;
  const differenceLabel = `${getAdjustmentDirection(confirmedDifference)} ${formatWon(Math.abs(confirmedDifference))}`;
  const needsAdjustment = record.adjustmentState === "required";
  const paymentScheduled = amounts.finalSupplierAmount - amounts.pendingCurrentAdjustment;
  const paymentGap = amounts.pendingCurrentAdjustment + amounts.unresolvedDifference;

  const salesRows: SettlementCalcRow[] = [
    { label: "정상 판매금액", value: b.grossAmount },
    { label: "할인금액", value: b.discountAmount, sign: "-", hint: "쿠폰 · 프로모션 (Mock)" },
    { label: "고객 결제금액", value: b.paidAmount, sign: "=" },
    ...(hasCancellation
      ? [
          { label: "환불금액", value: b.refundAmount, sign: "-" as const, hint: "취소/환불 Mock 입력값" },
          { label: "정산대상금액", value: b.settlementBaseAmount, sign: "=" as const, hint: `취소수수료 ${formatWon(b.cancellationFee)} 포함` },
        ]
      : []),
  ];

  const distributionRows: SettlementCalcRow[] = [
    ...(hasCancellation
      ? [
          { label: "정산대상금액", value: b.settlementBaseAmount },
          { label: "취소수수료 제외", value: b.cancellationFee, sign: "-" as const, hint: "판매수수료 계산 대상 아님" },
          { label: "수수료 기준금액", value: b.commissionBaseAmount, sign: "=" as const },
        ]
      : [{ label: "고객 결제금액", value: b.paidAmount }]),
    ...(hasSeller
      ? [
          {
            label: "판매점 수수료",
            value: b.sellerCommission,
            sign: "-" as const,
            hint: `${record.sellerName} · ${b.sellerCommissionRate}%`,
          },
        ]
      : []),
    {
      label: "판매수수료",
      value: b.affiliateCommission,
      sign: "-",
      hint: `${record.sellingAgencyName} · ${b.affiliateCommissionRate}%`,
    },
    ...(b.cancellationFeeShare.supplier > 0
      ? [{ label: "취소수수료 귀속분", value: b.cancellationFeeShare.supplier, sign: "+" as const, hint: "공급여행사 귀속 (정책값)" }]
      : []),
    { label: "공급여행사 정산액", value: b.supplierAmount, sign: "=", hint: record.supplierAgencyName },
  ];

  const overlays = (
    <>
      <ReservationActionDialog dialog={dialog} onClose={() => setDialog(null)} />
      {paymentOpen && (
        <SettlementPaymentModal
          record={record}
          defaultDate={todayLabel()}
          onClose={() => setPaymentOpen(false)}
          onConfirm={(payment) => {
            completeSettlementPayment(record, payment, actor, now());
            setPaymentOpen(false);
            refresh("지급완료 처리했습니다.");
          }}
        />
      )}
      {holdOpen && (
        <SettlementHoldModal
          record={record}
          onClose={() => setHoldOpen(false)}
          onConfirm={(reason, detail) => {
            holdSettlement(record, reason, detail, actor, now());
            setHoldOpen(false);
            refresh("정산을 보류했습니다.");
          }}
        />
      )}
      {cancellationOpen && (
        <SettlementCancellationModal
          record={record}
          onClose={() => setCancellationOpen(false)}
          onApply={(input) => {
            const errors = applySettlementCancellation(record, input, actor, now());
            if (!errors.length) {
              setCancellationOpen(false);
              refresh(locked ? "취소/환불을 반영하고 조정내역을 생성했습니다." : "취소/환불을 반영해 정산금액을 다시 계산했습니다.");
            }
            return errors;
          }}
        />
      )}
      {manualOpen && (
        <SettlementManualAdjustmentModal
          record={record}
          onClose={() => setManualOpen(false)}
          onApply={(input) => {
            const errors = addManualSettlementAdjustment(record, input, actor, now());
            if (!errors.length) {
              setManualOpen(false);
              refresh("수동조정을 추가했습니다.");
            }
            return errors;
          }}
        />
      )}
      {documentForm && (
        <SettlementDocumentFormModal
          mode={documentForm.mode}
          record={record}
          initial={documentForm.initial}
          issueStatus={issueStatus}
          onClose={() => setDocumentForm(null)}
          onSaveDraft={(form) => {
            if (saveSettlementDocumentDraft(record, form, actor, now())) {
              setDocumentForm(null);
              refresh("정산서를 작성중 상태로 저장했습니다.");
            }
          }}
          onSubmit={(form, reason) => {
            const errors =
              documentForm.mode === "create"
                ? issueSettlementDocument(record, form, actor, now())
                : reissueSettlementDocument(record, form, reason, actor, now());
            if (!errors.length) {
              setDocumentForm(null);
              setTab("document");
              refresh(documentForm.mode === "create" ? "정산서가 생성되었습니다." : "정산서를 재발행했습니다.");
            }
            return errors;
          }}
        />
      )}
      {disputeOpen && activeDocument && (
        <SettlementDisputeModal
          record={record}
          document={activeDocument}
          onClose={() => setDisputeOpen(false)}
          onSubmit={(input) => {
            const errors = disputeSettlementDocument(record, input, actor, now());
            if (!errors.length) {
              setDisputeOpen(false);
              refresh("이의제기를 등록했습니다.");
            }
            return errors;
          }}
        />
      )}
    </>
  );

  return shell(
    <main className="content member-web-detail-content settlement-detail-content">
      <section className="page-head member-web-detail-page-head">
        <div>
          <p className="member-web-breadcrumb">정산관리 &gt; 정산현황 &gt; 정산 상세</p>
          <div className="member-web-detail-title-row">
            <h1>정산 상세</h1>
            <SettlementStatusBadge status={record.status} />
            {locked && (
              <span className="badge gray">
                <Lock size={10} /> 확정 금액 기준
              </span>
            )}
            {record.cancellationStatus !== "none" && (
              <span className={`badge ${record.cancellationStatus === "full" ? "danger" : "warn"}`}>
                {RESERVATION_CANCELLATION_LABELS[record.cancellationStatus]}
              </span>
            )}
            {record.adjustmentState === "required" && <SettlementAdjustmentStateBadge state="required" />}
            {amounts.nextAdjustment !== 0 && <span className="badge warn">차기 정산 반영 예정</span>}
            {settlement.closing && (
              <span className="badge success">
                <Lock size={10} /> 정산마감 완료
              </span>
            )}
            {!isSellerView && (closed || activeDocument) && <SettlementDocumentStatusBadge status={documentStatus} />}
          </div>
          <p className="member-web-detail-subtitle">
            {record.settlementCode} · {record.productName}
            {settlement.closing && (
              <span className="settlement-closing-meta">
                마감 {settlement.closing.closedAt} · {settlement.closing.closedBy.name} ({settlement.closing.closedBy.agency})
              </span>
            )}
          </p>
        </div>
        <div className="member-web-detail-actions">
          <ReservationViewerSwitch viewer={viewer} onChange={changeViewer} />
          <button type="button" className="secondary" onClick={() => router.push(withReservationViewer("/settlements", viewer))}>
            <ArrowLeft size={14} />
            목록
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => router.push(withReservationViewer(`/reservations/${record.reservation.code}`, viewer))}
          >
            <ClipboardList size={14} />
            예약 상세
          </button>
          {canManage && record.status === "정산확정" && !closed && (
            <button
              type="button"
              className="primary"
              disabled={!closeStatus.canClose}
              title={closeStatus.canClose ? undefined : `마감 불가: ${closeStatus.blockers.join(" / ")}`}
              onClick={openClose}
            >
              <Lock size={14} />
              정산마감
            </button>
          )}
          {canManage && closed && documentActions.create.visible && (
            <button
              type="button"
              className="primary"
              disabled={!documentActions.create.allowed}
              title={documentActions.create.reason}
              onClick={openDocumentCreate}
            >
              <FileText size={14} />
              {activeDocument?.status === "작성중" ? "정산서 이어서 작성" : "정산서 생성"}
            </button>
          )}
          {!isSellerView && currentDocumentVersion && (receiverView ? Boolean(activeDocument?.sharedVersion) : true) && (
            <button type="button" className="secondary" onClick={openDocumentView}>
              <FileText size={14} />
              {receiverView ? "받은 정산서" : "정산서 보기"}
            </button>
          )}
          {documentActions.reissue.visible && (
            <button
              type="button"
              className="secondary"
              disabled={!documentActions.reissue.allowed}
              title={documentActions.reissue.reason}
              onClick={openDocumentReissue}
            >
              재발행
            </button>
          )}
        </div>
      </section>

      <div className="reservation-permission-notices">
        {openDispute && !isSellerView && (receiverView || canManage) && (
          <div className="product-share-setting-alert reservation-permission-alert" role="alert">
            <AlertTriangle size={14} />
            <div>
              <strong>판매여행사에서 정산내역에 이의를 제기했습니다.</strong>
              <p>
                {openDispute.acknowledgedAt
                  ? "이의내용 확인 완료 · 정산조정 후 정산서를 재발행해주세요. 이의 해소 전까지 지급대기로 넘어가지 않습니다."
                  : "정산상태는 지급대기로 자동 변경되지 않습니다. 이의내용을 확인한 뒤 정산조정 · 재발행을 진행해주세요."}
              </p>
              <dl>
                <div>
                  <dt>이의제기 일시</dt>
                  <dd>{openDispute.at}</dd>
                </div>
                <div>
                  <dt>여행사</dt>
                  <dd>
                    {openDispute.by.agency} · {openDispute.by.name}
                  </dd>
                </div>
                <div>
                  <dt>사유</dt>
                  <dd>
                    {openDispute.reason}
                    {openDispute.reasonEtc ? ` (${openDispute.reasonEtc})` : ""}
                  </dd>
                </div>
                <div>
                  <dt>상세내용</dt>
                  <dd>{openDispute.detail}</dd>
                </div>
              </dl>
              {tab !== "document" && (
                <button type="button" className="secondary settlement-inline-button" onClick={openDocumentView}>
                  정산서 확인
                </button>
              )}
            </div>
          </div>
        )}
        {receiverView && activeDocument?.status === "확인대기" && !openDispute && (
          <div className="product-share-setting-alert reservation-permission-alert is-info" role="status">
            <Info size={14} />
            <div>
              <strong>{record.supplierAgencyName}에서 정산서 확인을 요청했습니다.</strong>
              <p>받은 정산서를 검토한 뒤 확인 또는 이의제기를 진행해주세요.</p>
              {tab !== "document" && (
                <button type="button" className="secondary settlement-inline-button" onClick={openDocumentView}>
                  받은 정산서 보기
                </button>
              )}
            </div>
          </div>
        )}
        {record.isReservationCancelled && (
          <div className="product-share-setting-alert reservation-permission-alert" role="alert">
            <AlertTriangle size={14} />
            <div>
              <strong>취소된 예약입니다. 정산금액을 확인해주세요.</strong>
              <p>
                {record.cancellation
                  ? "환불금액과 취소수수료는 Mock 입력값이며 취소규정에 따라 자동 계산하지 않습니다."
                  : "환불금액·취소수수료가 입력되지 않아 정산확정을 진행할 수 없습니다."}
              </p>
              {record.cancellation && (
                <dl>
                  <div>
                    <dt>환불금액</dt>
                    <dd>{formatWon(live.refundAmount)}</dd>
                  </div>
                  <div>
                    <dt>취소수수료</dt>
                    <dd>{formatWon(live.cancellationFee)}</dd>
                  </div>
                  <div>
                    <dt>최종 정산대상금액</dt>
                    <dd>{formatWon(live.settlementBaseAmount)}</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        )}
        {record.status === "정산대기" && settlement.autoRecalculated && (
          <div className="product-share-setting-alert reservation-permission-alert is-info" role="status">
            <Info size={14} />
            <div>
              <strong>예약 변경사항이 정산금액에 자동 반영되었습니다.</strong>
              <p>{settlement.autoRecalculated.at} · 정산대기 상태이므로 별도 조정건은 생성되지 않았습니다.</p>
              <SettlementChangeList changes={settlement.autoRecalculated.changes} />
            </div>
          </div>
        )}
        {needsAdjustment && record.status === "지급대기" && (
          <div className="product-share-setting-alert reservation-permission-alert" role="alert">
            <AlertTriangle size={14} />
            <div>
              <strong>지급예정 금액과 현재 정산금액이 일치하지 않습니다.</strong>
              <p>지급금액은 자동으로 수정되지 않습니다. 조정금액을 확인한 뒤 지급완료 처리해주세요.</p>
              <dl>
                <div>
                  <dt>지급예정 금액</dt>
                  <dd>{formatWon(paymentScheduled)}</dd>
                </div>
                <div>
                  <dt>현재 정산금액</dt>
                  <dd>{formatWon(paymentScheduled + paymentGap)}</dd>
                </div>
                <div>
                  <dt>조정금액</dt>
                  <dd>{formatSignedWon(paymentGap)}</dd>
                </div>
              </dl>
              <button type="button" className="secondary settlement-inline-button" onClick={showAdjustments}>
                조정내역 확인
              </button>
            </div>
          </div>
        )}
        {needsAdjustment && record.status !== "지급대기" && (
          <div className="product-share-setting-alert reservation-permission-alert" role="alert">
            <AlertTriangle size={14} />
            <div>
              <strong>{record.status === "지급완료" ? "지급완료 이후 예약금액이 변경되었습니다." : "정산확정 이후 예약금액이 변경되었습니다."}</strong>
              <p>
                {record.status === "지급완료"
                  ? "기존 지급내역은 변경하지 않습니다. 차기 정산 조정이 필요합니다."
                  : "차액조정이 필요합니다. 기존 확정 정산액은 유지됩니다."}
              </p>
              <dl>
                <div>
                  <dt>확정 정산액</dt>
                  <dd>{formatWon(b.supplierAmount)}</dd>
                </div>
                <div>
                  <dt>변경 후 계산액</dt>
                  <dd>{formatWon(live.supplierAmount)}</dd>
                </div>
                <div>
                  <dt>차액</dt>
                  <dd>{differenceLabel}</dd>
                </div>
              </dl>
              <button type="button" className="secondary settlement-inline-button" onClick={showAdjustments}>
                조정내역 확인
              </button>
            </div>
          </div>
        )}
        {record.status === "지급완료" && amounts.nextAdjustment !== 0 && (
          <div className="product-share-setting-alert reservation-permission-alert is-info" role="status">
            <Info size={14} />
            <div>
              <strong>차기 정산 반영 예정 {formatSignedWon(amounts.nextAdjustment)}</strong>
              <p>지급완료 정산은 기존 지급정보를 수정하지 않고, 차액을 다음 정산에서 차감/추가합니다.</p>
            </div>
          </div>
        )}
        {record.status === "정산보류" && settlement.hold && (
          <div className="product-share-setting-alert reservation-permission-alert" role="alert">
            <AlertTriangle size={14} />
            <div>
              <strong>정산보류 중입니다.</strong>
              <p>보류 해제 전까지 정산확정·지급 처리를 진행할 수 없습니다.</p>
              <dl>
                <div>
                  <dt>보류사유</dt>
                  <dd>{settlement.hold.reason}</dd>
                </div>
                {settlement.hold.detail && (
                  <div>
                    <dt>상세</dt>
                    <dd>{settlement.hold.detail}</dd>
                  </div>
                )}
                <div>
                  <dt>보류일시</dt>
                  <dd>
                    {settlement.hold.heldAt} · {settlement.hold.heldBy.name} ({settlement.hold.heldBy.agency})
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
        {b.warnings.map((warning) => (
          <div key={warning} className="product-share-setting-alert reservation-permission-alert" role="alert">
            <AlertTriangle size={14} />
            <div>
              <strong>{warning}</strong>
            </div>
          </div>
        ))}
        {paymentMismatch && (
          <div className="product-share-setting-alert reservation-permission-alert" role="alert">
            <AlertTriangle size={14} />
            <div>
              <strong>지급금액이 최종 정산액과 다릅니다.</strong>
              <p>
                지급금액 {formatWon(settlement.payment?.amount ?? 0)} · 최종 정산액 {formatWon(amounts.finalSupplierAmount)}
              </p>
            </div>
          </div>
        )}
        {!canManage && (
          <div className="product-share-setting-alert reservation-permission-alert is-info" role="status">
            <Info size={14} />
            <div>
              <strong>현재 관점에서는 정산내역을 조회만 할 수 있습니다.</strong>
              <p>
                정산확정·마감·지급·조정 처리는 공급여행사 또는 통합 관리자 화면에서 진행합니다. (SAMPLE 권한)
                {receiverView ? " 받은 정산서의 확인 · 이의제기는 [정산서] 탭에서 진행할 수 있습니다." : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="member-web-detail-tabs settlement-detail-tabs" role="tablist" aria-label="정산 상세 보기">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={tab === item.key ? "active" : ""}
            onClick={() => setTab(item.key)}
          >
            {item.key === "document" && receiverView ? "받은 정산서" : item.label}
            {item.key === "history" && <small>{history.length}</small>}
            {item.key === "document" && activeDocument && <small>{documentStatus}</small>}
          </button>
        ))}
      </div>

      {tab === "document" && (
        <SettlementDocumentSection
          key={`${record.settlementCode}-${version}-${viewer.key}`}
          record={record}
          documents={documents}
          active={activeDocument}
          receiverView={receiverView}
          canManage={canManage}
          actions={documentActions}
          paymentPending={paymentPendingStatus}
          handlers={{
            onCreate: openDocumentCreate,
            onReissue: openDocumentReissue,
            onRequest: requestDocumentConfirmation,
            onCancel: openDocumentCancel,
            onAcknowledge: acknowledgeDispute,
            onConfirm: openDocumentConfirm,
            onDispute: () => setDisputeOpen(true),
          }}
          outputHref={(documentVersion, documentNo) =>
            linkFor(`${record.settlementCode}/document/${documentVersion}${documentNo ? `?doc=${encodeURIComponent(documentNo)}` : ""}`)
          }
        />
      )}

      {tab === "info" && (
        <div className="member-web-detail-stack">
          <section className="panel member-web-detail-card">
            <div className="member-web-detail-card-head">
              <strong>정산 요약</strong>
              <ReservationSourceBadge reservation={record.reservation} />
            </div>
            <div className="member-web-detail-info-grid">
              <Field label="정산번호">{record.settlementCode}</Field>
              <Field label="예약번호">{record.reservation.code}</Field>
              <Field label="상품명">{record.productName}</Field>
              <Field label="출발일">{record.departureAt}</Field>
              <Field label="예약상태">
                <span className={`badge ${reserveStatusBadgeClass(record.reservation.reserveStatus)}`}>
                  {record.reservation.reserveStatus}
                </span>
              </Field>
              <Field label="취소상태">{RESERVATION_CANCELLATION_LABELS[record.cancellationStatus]}</Field>
              <Field label="정산상태">
                <SettlementStatusBadge status={record.status} />
              </Field>
              <Field label="공급여행사">{record.supplierAgencyName}</Field>
              <Field label="판매여행사">{record.sellingAgencyName}</Field>
              <Field label="판매점">{record.sellerName ?? "-"}</Field>
              <Field label="예약인원">{record.peopleCount}명</Field>
              {!isSellerView && <Field label="최종 정산액">{formatWon(amounts.finalSupplierAmount)}</Field>}
              <Field label="정산마감">
                {settlement.closing ? `마감완료 · ${settlement.closing.closedAt}` : record.closeStatus}
              </Field>
              {!isSellerView && (
                <Field label="정산서">
                  <SettlementDocumentStatusBadge status={documentStatus} />
                </Field>
              )}
            </div>
          </section>

          <SettlementPerspectiveCard perspective={perspective} />

          {isSellerView ? (
            <p className="product-share-setting-help settlement-seller-note">
              판매점 관점에서는 예약금액과 판매수수료 정보만 표시됩니다.
            </p>
          ) : (
            <>
              <div className="settlement-amount-grid">
                <section className="panel member-web-detail-card">
                  <div className="member-web-detail-card-head">
                    <strong>판매금액</strong>
                    {locked && <span className="badge gray">확정 시점 금액</span>}
                  </div>
                  <SettlementCalc rows={salesRows} />
                </section>
                <section className="panel member-web-detail-card">
                  <div className="member-web-detail-card-head">
                    <strong>정산 배분</strong>
                    <span className="badge info">{hasSeller ? "고객 → 판매점 → 판매여행사 → 공급여행사" : "고객 → 판매여행사 → 공급여행사"}</span>
                  </div>
                  <SettlementCalc rows={distributionRows} />
                </section>
              </div>
              <SettlementFinalSummaryCard record={record} />
            </>
          )}

          {!isSellerView && <SettlementConfirmationCard confirmation={confirmation} status={record.status} />}

          {!isSellerView && (record.status === "정산확정" || closed) && <SettlementCloseCard record={record} closeStatus={closeStatus} />}

          {!isSellerView && (
            <SettlementTermsCard
              key={`${record.settlementCode}-${version}`}
              record={record}
              editable={canManage && canEditSettlementTerms(record.status)}
              actor={actor}
              onSaved={(changed) => (changed ? refresh("정산조건을 저장했습니다.") : notify("변경된 정산조건이 없습니다."))}
            />
          )}

          <SettlementCancellationCard
            record={record}
            canEdit={canManage && canAdjust && !isSellerView}
            onEdit={() => setCancellationOpen(true)}
          />

          {!isSellerView && (
            <SettlementAdjustmentSection
              record={record}
              canManage={canManage}
              canAdjust={canAdjust}
              onAddManual={() => setManualOpen(true)}
              onCancelAdjustment={openCancelAdjustment}
              onCreateDifference={createDifference}
              linkFor={linkFor}
            />
          )}

          {!isSellerView && <SettlementNextAdjustmentSection record={record} linkFor={linkFor} />}

          {settlement.payment && (
            <section className="panel member-web-detail-card">
              <div className="member-web-detail-card-head">
                <strong>지급정보</strong>
                <span className="settlement-card-head-actions">
                  <SettlementStatusBadge status="지급완료" />
                  <span className="badge gray">
                    <Lock size={10} /> 수정 불가
                  </span>
                </span>
              </div>
              <div className="member-web-detail-info-grid">
                <Field label="지급일">{settlement.payment.paidAt}</Field>
                <Field label="지급금액">{formatWon(settlement.payment.amount)}</Field>
                <Field label="지급방법">{settlement.payment.method}</Field>
                <Field label="처리자">
                  {settlement.payment.processedBy.name} ({settlement.payment.processedBy.agency})
                </Field>
                {settlement.payment.memo && <Field label="메모">{settlement.payment.memo}</Field>}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="member-web-detail-stack">
          <section className="panel member-web-detail-card">
            <div className="member-web-detail-card-head">
              <strong>정산이력</strong>
              <span className="member-web-status-history-count">{history.length}건</span>
            </div>
            <div className="member-web-detail-table-wrap">
              <table className="member-web-detail-table settlement-history-table">
                <thead>
                  <tr>
                    <th>일시</th>
                    <th>작업자</th>
                    <th>소속</th>
                    <th>작업구분</th>
                    <th>변경내용</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr key={entry.id}>
                      <td className="date-cell">{entry.at}</td>
                      <td>{entry.actor?.name ?? "시스템"}</td>
                      <td>{entry.actor?.agency ?? "-"}</td>
                      <td>
                        <span className={`badge ${settlementHistoryBadgeClass(entry.type)}`}>
                          {SETTLEMENT_HISTORY_LABELS[entry.type]}
                        </span>
                      </td>
                      <td className="text-left">
                        <span className="settlement-adjustment-reason">
                          <b>{entry.description}</b>
                          <SettlementChangeList changes={entry.changes} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      <div className="sticky-action-bar settlement-action-bar">
        <div>
          <SettlementStatusBadge status={record.status} />
          <span>
            <b>
              {closed && record.status === "정산확정"
                ? "정산마감 완료 · 정산서 확인완료 후 지급대기로 변경할 수 있습니다."
                : STATUS_GUIDE[record.status]}
            </b>
            <small>{canManage ? `${actor.name} (${actor.agency}) 처리` : "조회 전용 관점"}</small>
          </span>
        </div>
        <div>
          {record.status === "정산보류" ? (
            <button type="button" className="secondary" disabled={!canManage || !actions.resume} onClick={openResume}>
              보류 해제
            </button>
          ) : (
            <button
              type="button"
              className="secondary"
              disabled={!canManage || !actions.hold}
              title={closed ? "정산마감된 정산은 보류할 수 없습니다." : undefined}
              onClick={() => setHoldOpen(true)}
            >
              정산보류
            </button>
          )}
          <button
            type="button"
            className="secondary"
            disabled={!canManage || !actions.cancel}
            title={
              record.status === "지급완료"
                ? "지급완료된 정산은 취소할 수 없습니다."
                : closed
                  ? "정산마감된 정산은 취소할 수 없습니다."
                  : undefined
            }
            onClick={openCancel}
          >
            정산취소
          </button>
          {record.status === "정산확정" && !closed ? (
            <button
              type="button"
              className="primary"
              disabled={!canManage || !closeStatus.canClose}
              title={closeStatus.canClose ? undefined : `마감 불가: ${closeStatus.blockers.join(" / ")}`}
              onClick={openClose}
            >
              정산마감
            </button>
          ) : record.status === "정산확정" && !currentDocumentVersion && documentActions.create.visible ? (
            <button
              type="button"
              className="primary"
              disabled={!canManage || !documentActions.create.allowed}
              title={documentActions.create.reason}
              onClick={openDocumentCreate}
            >
              {activeDocument?.status === "작성중" ? "정산서 이어서 작성" : "정산서 생성"}
            </button>
          ) : record.status === "지급완료" || record.status === "정산취소" ? (
            <button
              type="button"
              className="secondary"
              onClick={() => router.push(withReservationViewer("/settlements", viewer))}
            >
              정산목록으로
            </button>
          ) : record.status === "정산확정" ? (
            <button
              type="button"
              className="primary"
              disabled={!canManage || !paymentPendingStatus.allowed}
              title={paymentPendingStatus.reason}
              onClick={openPaymentPending}
            >
              지급대기 처리
            </button>
          ) : record.status === "지급대기" ? (
            <button type="button" className="primary" disabled={!canManage} onClick={() => setPaymentOpen(true)}>
              지급완료
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              disabled={!canManage || !actions.confirm || !confirmation.canConfirm}
              title={actions.confirm && !confirmation.canConfirm ? `확정 불가: ${confirmation.blockers.join(" / ")}` : undefined}
              onClick={openConfirm}
            >
              정산확정
            </button>
          )}
        </div>
      </div>
    </main>,
    overlays,
  );
}
