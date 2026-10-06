import { RESERVATION_VIEWERS, type ReservationViewer } from "@/lib/admin/reservation-permission";
import type { ReservationActor } from "@/lib/admin/reservations-data";
import {
  SETTLEMENT_ADJUSTMENT_APPLY_LABELS,
  addSettlementHistory,
  canManageSettlement,
  formatSignedWon,
  formatWon,
  getSettlementRecord,
  isSettlementAmountLocked,
  isSettlementClosed,
  markSettlementPaymentPending,
  type SettlementAdjustmentDirection,
  type SettlementAdjustmentStatus,
  type SettlementCheckState,
  type SettlementConfirmationCheck,
  type SettlementDepartureGroup,
  type SettlementRecord,
  type SettlementStatus,
} from "@/lib/admin/settlement-data";

/**
 * 정산서 / 인보이스 (SAMPLE).
 * 실제 PDF · 이메일 · 전자세금계산서 없이 화면 미리보기와 프론트 state로만 관리합니다.
 * 발행 시 정산 데이터를 snapshot으로 저장하므로 이후 정산금액이 바뀌어도 발행된 버전은 변하지 않습니다.
 */

export type SettlementDocumentType = "settlement_statement" | "invoice";

export const SETTLEMENT_DOCUMENT_TYPE_LABELS: Record<SettlementDocumentType, string> = {
  settlement_statement: "정산서",
  invoice: "인보이스",
};

export const DEFAULT_SETTLEMENT_DOCUMENT_TYPE: SettlementDocumentType = "settlement_statement";

export const SETTLEMENT_DOCUMENT_STATUSES = ["미발행", "작성중", "발행완료", "확인대기", "확인완료", "이의제기", "발행취소"] as const;
export type SettlementDocumentStatus = (typeof SETTLEMENT_DOCUMENT_STATUSES)[number];

/** 목록 필터 (발행취소 문서만 있는 정산은 미발행으로 봅니다) */
export const SETTLEMENT_DOCUMENT_FILTER_STATUSES = ["미발행", "작성중", "발행완료", "확인대기", "확인완료", "이의제기"] as const;

export function settlementDocumentStatusBadgeClass(status: SettlementDocumentStatus) {
  if (status === "발행완료") return "info";
  if (status === "확인대기") return "warn";
  if (status === "확인완료") return "success";
  if (status === "이의제기") return "danger";
  return "gray";
}

export const SETTLEMENT_DISPUTE_REASONS = ["판매금액 불일치", "수수료 불일치", "취소/환불 반영 오류", "판매점 수수료 오류", "기타"] as const;
export type SettlementDisputeReason = (typeof SETTLEMENT_DISPUTE_REASONS)[number];

/** 거래 주체. 사업자번호 · 연락처는 거래처 마스터 연동 전이라 비워둡니다. (임의 생성하지 않음) */
export type SettlementDocumentParty = {
  role: "공급여행사" | "판매여행사" | "판매점";
  companyName: string;
  businessNo?: string;
  manager?: string;
  contact?: string;
};

export type SettlementDocumentLine = {
  settlementCode: string;
  reservationCode: string;
  bookerName: string;
  sellingAgencyName: string;
  sellerName?: string;
  peopleCount: number;
  paidAmount: number;
  refundAmount: number;
  affiliateCommissionRate: number;
  affiliateCommission: number;
  sellerCommissionRate: number;
  sellerCommission: number;
  baseSupplierAmount: number;
  adjustmentAmount: number;
  finalSupplierAmount: number;
  status: SettlementStatus;
};

export type SettlementDocumentAdjustmentLine = {
  id: string;
  settlementCode: string;
  reservationCode: string;
  cause: string;
  direction: SettlementAdjustmentDirection;
  amount: number;
  reason: string;
  status: SettlementAdjustmentStatus;
  /** 발생일 (7.2 이전에 발행된 snapshot에는 없을 수 있음) */
  createdAt?: string;
  /** 반영방식: 현재 정산 반영 / 차기 정산 반영 / 이전 정산 이월 */
  applyLabel?: string;
  /** 이전 정산에서 넘어온 조정이면 발생 정산번호 */
  carriedFrom?: string;
  /** 차기 정산 반영 예정이면 대상 정산번호 */
  targetSettlementCode?: string;
};

export type SettlementDocumentTotals = {
  grossAmount: number;
  discountAmount: number;
  paidAmount: number;
  refundAmount: number;
  cancellationFee: number;
  settlementBaseAmount: number;
  commissionBaseAmount: number;
  /** 예약별 수수료율이 다르면 null */
  affiliateCommissionRate: number | null;
  affiliateCommission: number;
  sellerCommissionRate: number | null;
  sellerCommission: number;
  totalCommission: number;
  cancellationFeeSupplierShare: number;
  /** 수수료 차감 후 공급사 정산액 (조정 전) */
  baseSupplierAmount: number;
  cancellationAdjustment: number;
  manualAdjustment: number;
  carriedAdjustment: number;
  adjustmentAmount: number;
  finalSettlementAmount: number;
  nextAdjustmentAmount: number;
};

/** 정산서 생성 Modal 입력값 */
export type SettlementDocumentForm = {
  documentType: SettlementDocumentType;
  issueDate: string;
  periodFrom: string;
  periodTo: string;
  manager: string;
  note: string;
};

export type SettlementDocumentScope = "reservation" | "departure";

/** 발행 시점 정산 데이터 snapshot */
export type SettlementDocumentSnapshot = SettlementDocumentForm & {
  scope: SettlementDocumentScope;
  supplierAgency: SettlementDocumentParty;
  sellingAgency: SettlementDocumentParty;
  seller?: SettlementDocumentParty;
  product: { code: string; name: string };
  departureDate: string;
  reservationCount: number;
  peopleCount: number;
  lines: SettlementDocumentLine[];
  totals: SettlementDocumentTotals;
  adjustments: SettlementDocumentAdjustmentLine[];
  nextAdjustments: SettlementDocumentAdjustmentLine[];
  issuer: ReservationActor;
  receiver: string;
  settlementStatus: SettlementStatus;
  closedAt?: string;
};

export type SettlementDocumentVersion = {
  version: number;
  action: "발행" | "재발행";
  issuedAt: string;
  issuedBy: ReservationActor;
  summary: string;
  reason?: string;
  snapshot: SettlementDocumentSnapshot;
};

export type SettlementDocumentDispute = {
  id: string;
  reason: SettlementDisputeReason;
  reasonEtc: string;
  detail: string;
  at: string;
  by: ReservationActor;
  /** 이의제기 대상 버전 */
  version: number;
  acknowledgedAt?: string;
  acknowledgedBy?: ReservationActor;
  resolvedAt?: string;
  resolvedVersion?: number;
};

export type SettlementDocument = {
  id: string;
  settlementCode: string;
  /** 발행 시 부여 (작성중 문서는 없음) */
  documentNo?: string;
  status: Exclude<SettlementDocumentStatus, "미발행">;
  createdAt: string;
  createdBy: ReservationActor;
  draft?: SettlementDocumentForm;
  versions: SettlementDocumentVersion[];
  /** 상대 여행사에 공유된 최신 버전 (확인 요청 시 갱신) */
  sharedVersion?: number;
  requestedAt?: string;
  requestedBy?: ReservationActor;
  confirmedAt?: string;
  confirmedBy?: ReservationActor;
  disputes: SettlementDocumentDispute[];
  cancelledAt?: string;
  cancelledBy?: ReservationActor;
};

/** ---------- 세션 state (새로고침 시 초기화) ---------- */

const documentStore: SettlementDocument[] = [];
let seedApplied = false;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const SEED_ISSUER: ReservationActor = { name: "장윤호", agency: "애비아넥스트" };

/**
 * 지급완료 SAMPLE(STL-260005)의 발행 · 확인완료 정산서.
 * 정산이력(SETTLEMENT_HISTORY)의 정산마감 · 발행 · 확인 기록과 같은 내용이며, snapshot은 기존 정산 데이터로 생성합니다.
 */
function ensureSeedDocuments() {
  if (seedApplied) return;
  seedApplied = true;
  const record = getSettlementRecord("STL-260005");
  if (!record) return;
  const form: SettlementDocumentForm = {
    documentType: "settlement_statement",
    issueDate: "2026-09-29",
    periodFrom: record.departureAt,
    periodTo: record.settlement.dueDate,
    manager: "김민재",
    note: "9월 26일 출발 행사 정산 (SAMPLE 발행본)",
  };
  const snapshot = buildReservationDocumentSnapshot(record, form, SEED_ISSUER);
  documentStore.push({
    id: "doc-seed-STL-260005",
    settlementCode: record.settlementCode,
    documentNo: "AOS-ST-202609-0001",
    status: "확인완료",
    createdAt: "2026-09-29 14:00",
    createdBy: SEED_ISSUER,
    versions: [
      {
        version: 1,
        action: "발행",
        issuedAt: "2026-09-29 14:00",
        issuedBy: SEED_ISSUER,
        summary: `최종 정산액 ${formatWon(snapshot.totals.finalSettlementAmount)} 기준 발행`,
        snapshot: { ...snapshot, settlementStatus: "정산확정" },
      },
    ],
    sharedVersion: 1,
    requestedAt: "2026-09-29 14:05",
    requestedBy: SEED_ISSUER,
    confirmedAt: "2026-09-30 10:20",
    confirmedBy: { name: "이도현", agency: "현담여행사" },
    disputes: [],
  });
}

/** 문서번호: AOS-ST-YYYYMM-XXXX (프론트 Mock 순번 · 발행월 기준) */
export function generateSettlementDocumentNo(issueDate: string, existingNumbers: string[]) {
  const yyyymm = issueDate.replace(/-/g, "").slice(0, 6);
  const prefix = `AOS-ST-${yyyymm}-`;
  const lastSequence = existingNumbers
    .filter((documentNo) => documentNo.startsWith(prefix))
    .map((documentNo) => Number(documentNo.slice(prefix.length)) || 0)
    .reduce((max, value) => Math.max(max, value), 0);
  return `${prefix}${String(lastSequence + 1).padStart(4, "0")}`;
}

export function formatDocumentVersion(version: number) {
  return `v${version}`;
}

/** 정산건의 전체 문서 (발행취소 포함, 생성순) */
export function getSettlementDocuments(settlementCode: string): SettlementDocument[] {
  ensureSeedDocuments();
  return clone(documentStore.filter((document) => document.settlementCode === settlementCode));
}

/** 전체 정산서 (발행취소 포함, 생성순) · 정산서 목록 / 대시보드용 */
export function getAllSettlementDocuments(): SettlementDocument[] {
  ensureSeedDocuments();
  return clone(documentStore);
}

/** 진행 중인 문서 (발행취소 제외 최신) */
export function getActiveSettlementDocument(settlementCode: string): SettlementDocument | undefined {
  ensureSeedDocuments();
  const active = [...documentStore].reverse().find((document) => document.settlementCode === settlementCode && document.status !== "발행취소");
  return active ? clone(active) : undefined;
}

/** 출력 화면 대상 문서: 문서번호 지정 시 해당 문서(발행취소 포함), 없으면 진행 중인 문서 */
export function getSettlementDocumentForOutput(settlementCode: string, documentNo?: string | null): SettlementDocument | undefined {
  if (documentNo) return getSettlementDocuments(settlementCode).find((document) => document.documentNo === documentNo);
  return getActiveSettlementDocument(settlementCode);
}

export type SettlementDocumentConfirmState = "확인 요청 전" | "확인대기" | "확인완료" | "이의제기" | "-";

/** 정산서 목록의 확인상태 (문서상태와 별도 표시) */
export function getSettlementDocumentConfirmState(document: Pick<SettlementDocument, "status">): SettlementDocumentConfirmState {
  if (document.status === "발행완료") return "확인 요청 전";
  if (document.status === "확인대기" || document.status === "확인완료" || document.status === "이의제기") return document.status;
  return "-";
}

/** 사용자 관점에서 볼 수 있는 버전 (공급여행사·통합관리자: 전체 / 판매여행사: 확인 요청된 버전까지) */
export function getViewerVisibleVersions(record: SettlementRecord, document: SettlementDocument | undefined, viewer: ReservationViewer) {
  if (!document) return [];
  if (canManageSettlement(record, viewer)) return document.versions;
  if (isSettlementDocumentReceiver(record, viewer)) return getReceiverVisibleVersions(document);
  return [];
}

export function getSettlementDocumentStatus(settlementCode: string): SettlementDocumentStatus {
  return getActiveSettlementDocument(settlementCode)?.status ?? "미발행";
}

export function getCurrentDocumentVersion(document: SettlementDocument | undefined) {
  return document?.versions[document.versions.length - 1];
}

export function getOpenDispute(document: SettlementDocument | undefined) {
  if (!document) return undefined;
  return [...document.disputes].reverse().find((dispute) => !dispute.resolvedAt);
}

/** 발행 후 정산금액(조정 포함)이 바뀌어 재발행이 필요한지 */
export function isSettlementDocumentOutdated(record: SettlementRecord, document: SettlementDocument | undefined) {
  const current = getCurrentDocumentVersion(document);
  if (!current) return false;
  return current.snapshot.totals.finalSettlementAmount !== record.amounts.finalSupplierAmount;
}

/** 판매여행사(수신자)에게 보이는 버전: 확인 요청된 버전까지 */
export function getReceiverVisibleVersions(document: SettlementDocument | undefined) {
  if (!document?.sharedVersion) return [];
  return document.versions.filter((version) => version.version <= (document.sharedVersion ?? 0));
}

/** ---------- snapshot 생성 ---------- */

function partyFor(role: SettlementDocumentParty["role"], companyName: string): SettlementDocumentParty {
  const contact = RESERVATION_VIEWERS.find((viewer) => viewer.agencyName === companyName);
  return { role, companyName, manager: contact ? `${contact.userName} (Mock 담당자)` : undefined };
}

function uniqueRate(values: number[]) {
  const unique = Array.from(new Set(values));
  return unique.length === 1 ? unique[0] : null;
}

function toDocumentLine(record: SettlementRecord): SettlementDocumentLine {
  const b = record.breakdown;
  return {
    settlementCode: record.settlementCode,
    reservationCode: record.reservation.code,
    bookerName: record.reservation.bookerName,
    sellingAgencyName: record.sellingAgencyName,
    sellerName: record.sellerName,
    peopleCount: record.peopleCount,
    paidAmount: b.paidAmount,
    refundAmount: b.refundAmount,
    affiliateCommissionRate: b.affiliateCommissionRate,
    affiliateCommission: b.affiliateCommission,
    sellerCommissionRate: b.sellerCommissionRate,
    sellerCommission: b.sellerCommission,
    baseSupplierAmount: b.supplierAmount,
    adjustmentAmount: record.amounts.finalSupplierAmount - b.supplierAmount,
    finalSupplierAmount: record.amounts.finalSupplierAmount,
    status: record.status,
  };
}

/** 정산 계산 결과를 그대로 합산합니다. (정산대기 건은 취소 반영이 기본 정산액에 이미 포함됨) */
function buildTotals(records: SettlementRecord[]): SettlementDocumentTotals {
  const sum = (pick: (record: SettlementRecord) => number) => records.reduce((total, record) => total + pick(record), 0);
  const cancellationAdjustment = sum((record) => (isSettlementAmountLocked(record.settlement) ? record.amounts.cancellationAdjustment : 0));
  const manualAdjustment = sum((record) => record.amounts.manualAdjustment);
  const carriedAdjustment = sum((record) => record.amounts.carriedAdjustment);
  const sellerRecords = records.filter((record) => record.sellerName);
  return {
    grossAmount: sum((record) => record.breakdown.grossAmount),
    discountAmount: sum((record) => record.breakdown.discountAmount),
    paidAmount: sum((record) => record.breakdown.paidAmount),
    refundAmount: sum((record) => record.breakdown.refundAmount),
    cancellationFee: sum((record) => record.breakdown.cancellationFee),
    settlementBaseAmount: sum((record) => record.breakdown.settlementBaseAmount),
    commissionBaseAmount: sum((record) => record.breakdown.commissionBaseAmount),
    affiliateCommissionRate: uniqueRate(records.map((record) => record.breakdown.affiliateCommissionRate)),
    affiliateCommission: sum((record) => record.breakdown.affiliateCommission),
    sellerCommissionRate: sellerRecords.length ? uniqueRate(sellerRecords.map((record) => record.breakdown.sellerCommissionRate)) : null,
    sellerCommission: sum((record) => record.breakdown.sellerCommission),
    totalCommission: sum((record) => record.breakdown.totalCommission),
    cancellationFeeSupplierShare: sum((record) => record.breakdown.cancellationFeeShare.supplier),
    baseSupplierAmount: sum((record) => record.breakdown.supplierAmount),
    cancellationAdjustment,
    manualAdjustment,
    carriedAdjustment,
    adjustmentAmount: cancellationAdjustment + manualAdjustment + carriedAdjustment,
    finalSettlementAmount: sum((record) => record.amounts.finalSupplierAmount),
    nextAdjustmentAmount: sum((record) => record.amounts.nextAdjustment),
  };
}

function buildAdjustmentLines(records: SettlementRecord[]) {
  const adjustments: SettlementDocumentAdjustmentLine[] = [];
  const nextAdjustments: SettlementDocumentAdjustmentLine[] = [];
  records.forEach((record) => {
    record.adjustments
      .filter((adjustment) => adjustment.status !== "취소")
      .forEach((adjustment) => {
        const line: SettlementDocumentAdjustmentLine = {
          id: adjustment.id,
          settlementCode: adjustment.settlementCode,
          reservationCode: adjustment.reservationCode,
          cause: adjustment.cause,
          direction: adjustment.direction,
          amount: adjustment.amount,
          reason: adjustment.reason,
          status: adjustment.status,
          createdAt: adjustment.createdAt,
          applyLabel: SETTLEMENT_ADJUSTMENT_APPLY_LABELS[adjustment.applyTo],
          targetSettlementCode: adjustment.targetSettlementCode,
        };
        if (adjustment.applyTo === "current") adjustments.push(line);
        else if (adjustment.status === "반영대기") nextAdjustments.push(line);
      });
    record.carriedAdjustments.forEach((adjustment) =>
      adjustments.push({
        id: adjustment.id,
        settlementCode: record.settlementCode,
        reservationCode: adjustment.reservationCode,
        cause: adjustment.cause,
        direction: adjustment.direction,
        amount: adjustment.amount,
        reason: adjustment.reason,
        status: adjustment.status,
        createdAt: adjustment.createdAt,
        applyLabel: "이전 정산 이월",
        carriedFrom: adjustment.settlementCode,
      }),
    );
  });
  return { adjustments, nextAdjustments };
}

function partyFromNames(role: SettlementDocumentParty["role"], names: string[]): SettlementDocumentParty | undefined {
  const unique = Array.from(new Set(names.filter(Boolean)));
  if (!unique.length) return undefined;
  if (unique.length === 1) return partyFor(role, unique[0]);
  return { role, companyName: `${unique.join(", ")} (예약별 상세 참고)` };
}

/** 예약 단위 정산서 snapshot */
export function buildReservationDocumentSnapshot(
  record: SettlementRecord,
  form: SettlementDocumentForm,
  issuer: ReservationActor,
): SettlementDocumentSnapshot {
  const { adjustments, nextAdjustments } = buildAdjustmentLines([record]);
  return clone({
    ...form,
    scope: "reservation" as const,
    supplierAgency: partyFor("공급여행사", record.supplierAgencyName),
    sellingAgency: partyFor("판매여행사", record.sellingAgencyName),
    seller: record.sellerName ? partyFor("판매점", record.sellerName) : undefined,
    product: { code: record.productCode, name: record.productName },
    departureDate: record.departureAt,
    reservationCount: 1,
    peopleCount: record.peopleCount,
    lines: [toDocumentLine(record)],
    totals: buildTotals([record]),
    adjustments,
    nextAdjustments,
    issuer,
    receiver: record.sellingAgencyName,
    settlementStatus: record.status,
    closedAt: record.settlement.closing?.closedAt,
  });
}

/** 출발상품 단위 정산서 snapshot (정산취소 건 제외 집계 · 예약별 상세 포함) */
export function buildDepartureDocumentSnapshot(
  group: SettlementDepartureGroup,
  form: SettlementDocumentForm,
  issuer: ReservationActor,
): SettlementDocumentSnapshot {
  const records = group.records.filter((record) => record.status !== "정산취소");
  const { adjustments, nextAdjustments } = buildAdjustmentLines(records);
  const sellingAgency = partyFromNames("판매여행사", records.map((record) => record.sellingAgencyName)) ?? {
    role: "판매여행사" as const,
    companyName: "-",
  };
  return clone({
    ...form,
    scope: "departure" as const,
    supplierAgency: partyFor("공급여행사", group.supplierAgencyName),
    sellingAgency,
    seller: partyFromNames("판매점", records.map((record) => record.sellerName ?? "")),
    product: { code: group.productCode, name: group.productName },
    departureDate: group.departureAt,
    reservationCount: records.length,
    peopleCount: records.reduce((total, record) => total + record.peopleCount, 0),
    lines: records.map(toDocumentLine),
    totals: buildTotals(records),
    adjustments,
    nextAdjustments,
    issuer,
    receiver: sellingAgency.companyName,
    settlementStatus: records[0]?.status ?? "정산대기",
  });
}

/** 정산서 생성 Modal 기본값: 기존 정산 데이터에서 자동 채움 */
export function getDefaultDocumentForm(
  record: Pick<SettlementRecord, "departureAt" | "settlement" | "supplierAgencyName">,
  issueDate: string,
  actor: ReservationActor,
): SettlementDocumentForm {
  const supplierContact = RESERVATION_VIEWERS.find((viewer) => viewer.agencyName === record.supplierAgencyName);
  return {
    documentType: DEFAULT_SETTLEMENT_DOCUMENT_TYPE,
    issueDate,
    periodFrom: record.departureAt,
    periodTo: record.settlement.dueDate,
    manager: actor.agency === record.supplierAgencyName ? actor.name : (supplierContact?.userName ?? actor.name),
    note: "",
  };
}

export function validateDocumentForm(form: SettlementDocumentForm) {
  const errors: string[] = [];
  if (!form.issueDate) errors.push("발행일을 입력해주세요.");
  if (!form.periodFrom || !form.periodTo) errors.push("정산기간을 입력해주세요.");
  else if (form.periodFrom > form.periodTo) errors.push("정산기간 시작일이 종료일보다 늦습니다.");
  if (!form.manager.trim()) errors.push("담당자를 입력해주세요.");
  return errors;
}

/** ---------- 발행 체크 / Action 가능 여부 ---------- */

export type SettlementDocumentIssueStatus = {
  canIssue: boolean;
  blockers: string[];
  warnings: string[];
  checks: SettlementConfirmationCheck[];
};

/** 정산서 발행(생성 · 재발행) 전 체크: 정산마감 · 최종 정산액 · 거래 주체 · 이의 미해결 */
export function getSettlementDocumentIssueStatus(
  record: SettlementRecord,
  document: SettlementDocument | undefined,
): SettlementDocumentIssueStatus {
  const checks: SettlementConfirmationCheck[] = [];
  const closing = record.settlement.closing;
  checks.push({
    key: "closed",
    label: "정산마감 완료",
    state: closing ? "ok" : "blocker",
    detail: closing ? `${closing.closedAt} · ${closing.closedBy.name} (${closing.closedBy.agency})` : "정산마감 후 정산서를 생성할 수 있습니다.",
  });

  const final = record.amounts.finalSupplierAmount;
  const finalState: SettlementCheckState = final < 0 ? "blocker" : final === 0 ? "warning" : "ok";
  checks.push({
    key: "final",
    label: "최종 정산액",
    state: finalState,
    detail:
      final < 0
        ? `${formatSignedWon(final)} · 차감 잔액은 정산서로 발행할 수 없습니다.`
        : `${formatWon(final)}${closing && closing.finalSupplierAmount !== final ? ` (마감 기준 ${formatWon(closing.finalSupplierAmount)} · 이후 조정 ${formatSignedWon(final - closing.finalSupplierAmount)})` : ""}`,
  });

  const partiesOk = record.supplierAgencyName !== "-" && record.sellingAgencyName !== "-";
  checks.push({
    key: "parties",
    label: "거래 주체 정보",
    state: partiesOk ? "ok" : "blocker",
    detail: partiesOk
      ? `${record.supplierAgencyName} → ${record.sellingAgencyName}${record.sellerName ? ` · ${record.sellerName}` : ""} (사업자번호·연락처 미등록 · 거래처 연동 전)`
      : "공급여행사 또는 판매여행사 정보가 없습니다.",
  });

  const dispute = getOpenDispute(document);
  checks.push({
    key: "dispute",
    label: "이의 미해결 여부",
    state: dispute && !dispute.acknowledgedAt ? "blocker" : "ok",
    detail: dispute
      ? dispute.acknowledgedAt
        ? `이의내용 확인 완료 · ${dispute.reason} · 재발행 시 해소`
        : `${dispute.reason} · 이의내용 확인 후 재발행할 수 있습니다.`
      : "미해결 이의 없음",
  });

  if (record.status !== "정산확정") {
    checks.push({
      key: "status",
      label: "정산상태",
      state: "blocker",
      detail: `${record.status} 상태에서는 정산서를 발행할 수 없습니다.`,
    });
  }

  const blockers = checks.filter((check) => check.state === "blocker").map((check) => `${check.label}: ${check.detail}`);
  const warnings = checks.filter((check) => check.state === "warning").map((check) => `${check.label}: ${check.detail}`);
  return { canIssue: blockers.length === 0, blockers, warnings, checks };
}

export type SettlementDocumentActionKey =
  | "create"
  | "reissue"
  | "request"
  | "cancel"
  | "acknowledge"
  | "confirm"
  | "dispute";

export type SettlementDocumentActionState = { visible: boolean; allowed: boolean; reason?: string };

/** 판매여행사(정산서 수신자) 관점 여부 */
export function isSettlementDocumentReceiver(record: SettlementRecord, viewer: ReservationViewer) {
  return viewer.type === "sellingAgency" && viewer.agencyName === record.sellingAgencyName;
}

export function getSettlementDocumentActions(
  record: SettlementRecord,
  document: SettlementDocument | undefined,
  viewer: ReservationViewer,
): Record<SettlementDocumentActionKey, SettlementDocumentActionState> {
  const manage = canManageSettlement(record, viewer);
  const receiver = isSettlementDocumentReceiver(record, viewer);
  const issue = getSettlementDocumentIssueStatus(record, document);
  const status = document?.status;
  const issued = status === "발행완료" || status === "확인대기" || status === "확인완료" || status === "이의제기";
  const dispute = getOpenDispute(document);
  const outdated = isSettlementDocumentOutdated(record, document);
  const blocked = (reason: string): SettlementDocumentActionState => ({ visible: true, allowed: false, reason });
  const ok: SettlementDocumentActionState = { visible: true, allowed: true };
  const hidden: SettlementDocumentActionState = { visible: false, allowed: false };

  return {
    create:
      !manage || issued
        ? hidden
        : issue.canIssue
          ? ok
          : blocked(issue.blockers[0] ?? "정산서를 생성할 수 없습니다."),
    reissue: !manage || !issued
      ? hidden
      : record.status !== "정산확정"
        ? blocked(`${record.status} 이후에는 재발행할 수 없습니다.`)
        : status === "이의제기" && !dispute?.acknowledgedAt
          ? blocked("이의내용 확인 후 재발행할 수 있습니다.")
          : issue.canIssue
            ? ok
            : blocked(issue.blockers[0] ?? "재발행할 수 없습니다."),
    request: !manage || status !== "발행완료"
      ? hidden
      : outdated
        ? blocked("발행 후 정산금액이 변경되었습니다. 재발행 후 확인 요청해주세요.")
        : ok,
    cancel: !manage || !issued
      ? hidden
      : status === "확인완료"
        ? blocked("확인완료된 정산서는 발행 취소할 수 없습니다.")
        : record.status !== "정산확정"
          ? blocked(`${record.status} 이후에는 발행 취소할 수 없습니다.`)
          : ok,
    acknowledge: manage && status === "이의제기" && dispute && !dispute.acknowledgedAt ? ok : hidden,
    confirm: !receiver || status !== "확인대기" ? hidden : ok,
    dispute: !receiver || status !== "확인대기" ? hidden : ok,
  };
}

/**
 * 지급대기 처리 가능 여부 (Mock 정책).
 * 정산서를 사용하는 정산건은 정산마감 → 정산서 발행 → 상대방 확인완료 이후에만 지급대기로 변경합니다.
 */
export function getSettlementPaymentPendingStatus(record: SettlementRecord, document: SettlementDocument | undefined) {
  const block = (reason: string) => ({ allowed: false, reason });
  if (record.status !== "정산확정") return block(`${record.status} 상태에서는 지급대기로 변경할 수 없습니다.`);
  if (!isSettlementClosed(record)) return block("정산마감 후 정산서 확인을 거쳐 지급대기로 변경할 수 있습니다.");
  if (!document || document.status === "작성중") return block("정산서를 발행하고 상대 여행사 확인을 받아야 지급대기로 변경할 수 있습니다.");
  if (document.status === "이의제기") return block("판매여행사 이의제기 건입니다. 정산조정 후 정산서를 재발행해주세요.");
  if (document.status !== "확인완료") return block("상대 여행사의 정산서 확인이 완료되어야 지급대기로 변경할 수 있습니다.");
  if (isSettlementDocumentOutdated(record, document)) {
    return block("정산서 확인 이후 정산금액이 변경되었습니다. 정산서를 재발행하고 다시 확인받아주세요.");
  }
  return { allowed: true, reason: undefined };
}

/** ---------- 문서 Action (즉시 반영) ---------- */

function findDocumentIndex(id: string) {
  return documentStore.findIndex((document) => document.id === id);
}

function updateDocument(id: string, patch: Partial<SettlementDocument>) {
  const index = findDocumentIndex(id);
  if (index >= 0) documentStore[index] = { ...documentStore[index], ...patch };
}

function activeStoreDocument(settlementCode: string) {
  ensureSeedDocuments();
  return [...documentStore].reverse().find((document) => document.settlementCode === settlementCode && document.status !== "발행취소");
}

function versionLabel(document: Pick<SettlementDocument, "documentNo">, version: number) {
  return `${document.documentNo ?? "-"} ${formatDocumentVersion(version)}`;
}

/** 작성중 저장 (문서번호는 발행 시 부여) */
export function saveSettlementDocumentDraft(record: SettlementRecord, form: SettlementDocumentForm, actor: ReservationActor, at: string) {
  const active = activeStoreDocument(record.settlementCode);
  if (active && active.status !== "작성중") return false;
  if (active) {
    updateDocument(active.id, { draft: clone(form) });
  } else {
    documentStore.push({
      id: `doc-${record.settlementCode}-${documentStore.length + 1}`,
      settlementCode: record.settlementCode,
      status: "작성중",
      createdAt: at,
      createdBy: actor,
      draft: clone(form),
      versions: [],
      disputes: [],
    });
  }
  addSettlementHistory(record.settlementCode, {
    at,
    type: "document_draft",
    actor,
    description: `${SETTLEMENT_DOCUMENT_TYPE_LABELS[form.documentType]} 작성중 저장 · 발행일 ${form.issueDate}`,
  });
  return true;
}

/** 정산서 생성(발행): 현재 정산 데이터를 v1 snapshot으로 저장합니다. */
export function issueSettlementDocument(record: SettlementRecord, form: SettlementDocumentForm, actor: ReservationActor, at: string): string[] {
  const active = activeStoreDocument(record.settlementCode);
  if (active && active.status !== "작성중") return ["이미 발행된 정산서가 있습니다. 재발행을 이용해주세요."];
  const errors = [...validateDocumentForm(form), ...getSettlementDocumentIssueStatus(record, undefined).blockers];
  if (errors.length) return errors;
  const documentNo = generateSettlementDocumentNo(
    form.issueDate,
    documentStore.map((document) => document.documentNo ?? ""),
  );
  const version: SettlementDocumentVersion = {
    version: 1,
    action: "발행",
    issuedAt: at,
    issuedBy: actor,
    summary: `최종 정산액 ${formatWon(record.amounts.finalSupplierAmount)} 기준 발행`,
    snapshot: buildReservationDocumentSnapshot(record, form, actor),
  };
  if (active) {
    updateDocument(active.id, { documentNo, status: "발행완료", draft: undefined, versions: [version] });
  } else {
    documentStore.push({
      id: `doc-${record.settlementCode}-${documentStore.length + 1}`,
      settlementCode: record.settlementCode,
      documentNo,
      status: "발행완료",
      createdAt: at,
      createdBy: actor,
      versions: [version],
      disputes: [],
    });
  }
  addSettlementHistory(record.settlementCode, {
    at,
    type: "document_issued",
    actor,
    description: `${documentNo} · ${SETTLEMENT_DOCUMENT_TYPE_LABELS[form.documentType]} ${formatDocumentVersion(1)} · 최종 정산액 ${formatWon(record.amounts.finalSupplierAmount)}`,
  });
  return [];
}

export function requestSettlementDocumentConfirmation(record: SettlementRecord, actor: ReservationActor, at: string) {
  const active = activeStoreDocument(record.settlementCode);
  if (!active || active.status !== "발행완료" || isSettlementDocumentOutdated(record, active)) return false;
  const current = getCurrentDocumentVersion(active);
  updateDocument(active.id, { status: "확인대기", requestedAt: at, requestedBy: actor, sharedVersion: current?.version });
  addSettlementHistory(record.settlementCode, {
    at,
    type: "document_requested",
    actor,
    description: `${record.sellingAgencyName} · ${versionLabel(active, current?.version ?? 1)} 확인 요청 (실제 이메일/알림톡 미발송)`,
  });
  return true;
}

export function confirmSettlementDocument(record: SettlementRecord, actor: ReservationActor, at: string) {
  const active = activeStoreDocument(record.settlementCode);
  if (!active || active.status !== "확인대기") return false;
  const current = getCurrentDocumentVersion(active);
  updateDocument(active.id, { status: "확인완료", confirmedAt: at, confirmedBy: actor });
  addSettlementHistory(record.settlementCode, {
    at,
    type: "document_confirmed",
    actor,
    description: `${versionLabel(active, current?.version ?? 1)} 정산내역 확인완료 · 최종 정산액 ${formatWon(current?.snapshot.totals.finalSettlementAmount ?? 0)}`,
  });
  return true;
}

export type SettlementDisputeInput = { reason: SettlementDisputeReason | ""; reasonEtc: string; detail: string };

export function validateSettlementDispute(input: SettlementDisputeInput) {
  const errors: string[] = [];
  if (!input.reason) errors.push("이의제기 사유를 선택해주세요.");
  if (input.reason === "기타" && !input.reasonEtc.trim()) errors.push("기타 사유를 입력해주세요.");
  if (!input.detail.trim()) errors.push("상세 내용을 입력해주세요.");
  return errors;
}

export function disputeSettlementDocument(record: SettlementRecord, input: SettlementDisputeInput, actor: ReservationActor, at: string): string[] {
  const active = activeStoreDocument(record.settlementCode);
  if (!active || active.status !== "확인대기") return ["확인대기 상태의 정산서만 이의제기할 수 있습니다."];
  const errors = validateSettlementDispute(input);
  if (errors.length || !input.reason) return errors;
  const current = getCurrentDocumentVersion(active);
  const dispute: SettlementDocumentDispute = {
    id: `dsp-${active.id}-${active.disputes.length + 1}`,
    reason: input.reason,
    reasonEtc: input.reasonEtc.trim(),
    detail: input.detail.trim(),
    at,
    by: actor,
    version: current?.version ?? 1,
  };
  updateDocument(active.id, { status: "이의제기", disputes: [...active.disputes, dispute] });
  addSettlementHistory(record.settlementCode, {
    at,
    type: "document_disputed",
    actor,
    description: `${versionLabel(active, dispute.version)} · 사유: ${dispute.reason}${dispute.reasonEtc ? `(${dispute.reasonEtc})` : ""} · ${dispute.detail}`,
  });
  return [];
}

/** 공급여행사 이의내용 확인 (재발행 전 필수) */
export function acknowledgeSettlementDispute(record: SettlementRecord, actor: ReservationActor, at: string) {
  const active = activeStoreDocument(record.settlementCode);
  const dispute = getOpenDispute(active);
  if (!active || active.status !== "이의제기" || !dispute || dispute.acknowledgedAt) return false;
  updateDocument(active.id, {
    disputes: active.disputes.map((item) => (item.id === dispute.id ? { ...item, acknowledgedAt: at, acknowledgedBy: actor } : item)),
  });
  addSettlementHistory(record.settlementCode, {
    at,
    type: "document_dispute_acknowledged",
    actor,
    description: `${dispute.by.agency} 이의제기(${dispute.reason}) 내용 확인 · 정산조정 후 재발행 예정`,
  });
  return true;
}

/** 재발행: 기존 버전은 유지하고 현재 정산 데이터로 새 버전 snapshot을 추가합니다. */
export function reissueSettlementDocument(
  record: SettlementRecord,
  form: SettlementDocumentForm,
  reason: string,
  actor: ReservationActor,
  at: string,
): string[] {
  const active = activeStoreDocument(record.settlementCode);
  const current = getCurrentDocumentVersion(active);
  if (!active || !current) return ["재발행할 정산서가 없습니다."];
  const errors = [...validateDocumentForm(form), ...getSettlementDocumentIssueStatus(record, active).blockers];
  if (!reason.trim()) errors.push("재발행 사유를 입력해주세요.");
  if (record.status !== "정산확정") errors.push(`${record.status} 이후에는 재발행할 수 없습니다.`);
  if (errors.length) return errors;
  const nextVersion = current.version + 1;
  const previousFinal = current.snapshot.totals.finalSettlementAmount;
  const final = record.amounts.finalSupplierAmount;
  const difference = final - previousFinal;
  const version: SettlementDocumentVersion = {
    version: nextVersion,
    action: "재발행",
    issuedAt: at,
    issuedBy: actor,
    summary: difference !== 0 ? `조정금액 ${formatSignedWon(difference)} 반영 · 최종 정산액 ${formatWon(final)}` : "금액 변경 없음",
    reason: reason.trim(),
    snapshot: buildReservationDocumentSnapshot(record, form, actor),
  };
  const openDispute = getOpenDispute(active);
  updateDocument(active.id, {
    status: "발행완료",
    versions: [...active.versions, version],
    requestedAt: undefined,
    requestedBy: undefined,
    confirmedAt: undefined,
    confirmedBy: undefined,
    disputes: active.disputes.map((item) =>
      openDispute && item.id === openDispute.id ? { ...item, resolvedAt: at, resolvedVersion: nextVersion } : item,
    ),
  });
  addSettlementHistory(record.settlementCode, {
    at,
    type: "document_reissued",
    actor,
    description: `${versionLabel(active, nextVersion)} · ${version.summary} · 사유: ${reason.trim()}`,
    changes: difference !== 0 ? [{ label: "정산서 최종 정산액", before: formatWon(previousFinal), after: formatWon(final) }] : undefined,
  });
  return [];
}

/** 발행 취소: 문서는 삭제하지 않고 발행취소 상태로 남깁니다. */
export function cancelSettlementDocument(record: SettlementRecord, actor: ReservationActor, at: string) {
  const active = activeStoreDocument(record.settlementCode);
  if (!active || active.status === "확인완료" || active.status === "작성중" || record.status !== "정산확정") return false;
  updateDocument(active.id, { status: "발행취소", cancelledAt: at, cancelledBy: actor });
  addSettlementHistory(record.settlementCode, {
    at,
    type: "document_cancelled",
    actor,
    description: `${versionLabel(active, getCurrentDocumentVersion(active)?.version ?? 1)} 발행 취소 · 문서 이력은 유지됩니다.`,
  });
  return true;
}

/** 정산서 확인완료 조건을 포함한 지급대기 처리 */
export function markSettlementPaymentPendingByDocument(record: SettlementRecord, actor: ReservationActor, at: string) {
  if (!getSettlementPaymentPendingStatus(record, getActiveSettlementDocument(record.settlementCode)).allowed) return false;
  markSettlementPaymentPending(record, actor, at);
  return true;
}
