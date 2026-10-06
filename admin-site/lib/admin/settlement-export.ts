import { formatWon, type SettlementPayment } from "@/lib/admin/settlement-data";
import {
  SETTLEMENT_DOCUMENT_TYPE_LABELS,
  formatDocumentVersion,
  getCurrentDocumentVersion,
  type SettlementDocument,
  type SettlementDocumentSnapshot,
  type SettlementDocumentType,
  type SettlementDocumentVersion,
} from "@/lib/admin/settlement-document-data";

/**
 * 정산서 출력 · 내보내기 (SAMPLE).
 * 서버 PDF/xlsx 생성 없이 브라우저 인쇄와 CSV 다운로드만 사용합니다.
 * 모든 값은 선택된 정산서 버전의 snapshot에서만 읽습니다. (현재 정산 데이터로 다시 계산하지 않음)
 */

export const SETTLEMENT_OUTPUT_LABELS: Record<
  SettlementDocumentType,
  {
    title: string;
    no: string;
    issueDate: string;
    version: string;
    supplier: string;
    buyer: string;
    seller: string;
    summary: string;
    amount: string;
    commission: string;
    settlement: string;
  }
> = {
  settlement_statement: {
    title: "정산서",
    no: "문서번호",
    issueDate: "발행일",
    version: "버전",
    supplier: "공급자",
    buyer: "정산 대상",
    seller: "판매점",
    summary: "정산 대상 요약",
    amount: "고객 결제금액",
    commission: "판매수수료",
    settlement: "최종 정산액",
  },
  invoice: {
    title: "INVOICE",
    no: "Invoice No.",
    issueDate: "Issue Date",
    version: "Version",
    supplier: "Supplier",
    buyer: "Buyer",
    seller: "Seller (판매점)",
    summary: "Description",
    amount: "Amount (고객 결제금액)",
    commission: "Commission (판매수수료)",
    settlement: "Settlement Amount (최종 정산액)",
  },
};

export type SettlementDocumentConfirmationInfo = {
  state: "확인완료" | "확인대기" | "이의제기" | "확인 요청 전" | "대체된 버전" | "발행취소";
  badge: "success" | "warn" | "danger" | "gray" | "info";
  agency?: string;
  at?: string;
  reason?: string;
  detail?: string;
};

/** 선택한 버전 기준 정산 확인 상태 (이의제기는 해당 버전 대상 건만 표시) */
export function getSettlementDocumentConfirmationInfo(document: SettlementDocument, version: number): SettlementDocumentConfirmationInfo {
  const dispute = [...document.disputes].reverse().find((item) => item.version === version);
  const current = getCurrentDocumentVersion(document);
  const isCurrent = current?.version === version;
  if (isCurrent && document.status === "발행취소") {
    return { state: "발행취소", badge: "gray", agency: document.cancelledBy?.agency, at: document.cancelledAt };
  }
  if (dispute && (!isCurrent || document.status === "이의제기")) {
    return {
      state: "이의제기",
      badge: "danger",
      agency: dispute.by.agency,
      at: dispute.at,
      reason: `${dispute.reason}${dispute.reasonEtc ? ` (${dispute.reasonEtc})` : ""}`,
      detail: dispute.resolvedVersion ? `${formatDocumentVersion(dispute.resolvedVersion)} 재발행으로 해소` : dispute.detail,
    };
  }
  if (!isCurrent) return { state: "대체된 버전", badge: "gray", detail: `${formatDocumentVersion(current?.version ?? version)}으로 재발행되었습니다.` };
  if (document.status === "확인완료") return { state: "확인완료", badge: "success", agency: document.confirmedBy?.agency, at: document.confirmedAt };
  if (document.status === "확인대기") return { state: "확인대기", badge: "warn", agency: document.requestedBy?.agency, at: document.requestedAt, detail: "판매여행사 확인 대기" };
  return { state: "확인 요청 전", badge: "info" };
}

export function formatSettlementConfirmationText(info: SettlementDocumentConfirmationInfo) {
  return [info.state, info.agency, info.at, info.reason, info.detail].filter(Boolean).join(" · ");
}

export type SettlementOutputAmountRow = {
  item: string;
  /** 기준금액 (없으면 null) */
  base: number | null;
  /** 수수료율 표시 (없으면 null) */
  rate: string | null;
  /** 공급사 정산액 기준 증감 (차감은 음수) */
  amount: number;
  note: string;
  tone?: "minus" | "plus" | "subtotal";
};

/** 정산서 본문 정산내역 행 (snapshot 합계 기준) */
export function buildSettlementDocumentAmountRows(snapshot: SettlementDocumentSnapshot): SettlementOutputAmountRow[] {
  const t = snapshot.totals;
  const labels = SETTLEMENT_OUTPUT_LABELS[snapshot.documentType];
  const hasCancellation = t.refundAmount > 0 || t.cancellationFee > 0;
  const nonSupplierFee = t.cancellationFee - t.cancellationFeeSupplierShare;
  const rateText = (rate: number | null) => (rate === null ? "예약별 상이" : `${rate}%`);
  const signedTone = (value: number): SettlementOutputAmountRow["tone"] => (value < 0 ? "minus" : "plus");
  const rows: SettlementOutputAmountRow[] = [
    {
      item: labels.amount,
      base: null,
      rate: null,
      amount: t.paidAmount,
      note: t.discountAmount > 0 ? `할인 ${formatWon(t.discountAmount)} 반영` : "",
    },
  ];
  if (hasCancellation) {
    rows.push({ item: "환불금액", base: null, rate: null, amount: -t.refundAmount, note: "고객 환불", tone: "minus" });
    rows.push({
      item: "정산대상금액",
      base: null,
      rate: null,
      amount: t.settlementBaseAmount,
      note: t.cancellationFee > 0 ? `취소수수료 ${formatWon(t.cancellationFee)} 포함` : "",
      tone: "subtotal",
    });
  }
  rows.push({
    item: labels.commission,
    base: t.commissionBaseAmount,
    rate: rateText(t.affiliateCommissionRate),
    amount: -t.affiliateCommission,
    note: snapshot.sellingAgency.companyName,
    tone: "minus",
  });
  if (snapshot.seller) {
    rows.push({
      item: "판매점 수수료",
      base: t.commissionBaseAmount,
      rate: rateText(t.sellerCommissionRate),
      amount: -t.sellerCommission,
      note: snapshot.seller.companyName,
      tone: "minus",
    });
  }
  if (nonSupplierFee > 0) {
    rows.push({ item: "취소수수료 (판매측 귀속)", base: t.cancellationFee, rate: null, amount: -nonSupplierFee, note: "귀속 정책값", tone: "minus" });
  }
  rows.push({ item: "기본 공급사 정산액", base: null, rate: null, amount: t.baseSupplierAmount, note: "조정 전", tone: "subtotal" });
  if (t.cancellationAdjustment !== 0) {
    rows.push({ item: "환불조정", base: null, rate: null, amount: t.cancellationAdjustment, note: "취소/환불 · 예약금액 변경", tone: signedTone(t.cancellationAdjustment) });
  }
  if (t.manualAdjustment !== 0) {
    rows.push({ item: "수동조정", base: null, rate: null, amount: t.manualAdjustment, note: "관리자 수동조정", tone: signedTone(t.manualAdjustment) });
  }
  if (t.carriedAdjustment !== 0) {
    rows.push({ item: "이전 정산 조정", base: null, rate: null, amount: t.carriedAdjustment, note: "이전 정산에서 이월", tone: signedTone(t.carriedAdjustment) });
  }
  return rows;
}

/** 파일명 정규화: 파일시스템 금지문자 제거 · 공백은 _ 로 치환 */
export function sanitizeExportFilename(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.]+|[_.]+$/g, "")
    .slice(0, 150);
}

/** 정산서_{문서번호}_{회사명}_{발행일} / Invoice_{문서번호}_{회사명}_{발행일} */
export function buildSettlementDocumentFilename(snapshot: SettlementDocumentSnapshot, documentNo: string | undefined, extension?: string) {
  const prefix = snapshot.documentType === "invoice" ? "Invoice" : "정산서";
  const company = snapshot.receiver.replace(/\s*\(예약별 상세 참고\)$/, "");
  const base = sanitizeExportFilename([prefix, documentNo ?? "미발행", company, snapshot.issueDate].join("_"));
  return extension ? `${base}.${extension}` : base;
}

export type SettlementExportCell = string | number;

export type SettlementExportContext = {
  snapshot: SettlementDocumentSnapshot;
  documentNo?: string;
  version?: number;
  reissueReason?: string;
  /** 지급완료 정보 (현재 정산 기준 · 최신 버전에만 표시) */
  payment?: SettlementPayment;
  /** 정산 확인 상태 한 줄 요약 */
  confirmation?: string;
};

/** CSV/Excel 행: 문서정보 · 정산금액 · 예약별 상세 · 조정내역 · 지급정보 */
export function buildSettlementExportRows({ snapshot, documentNo, version, reissueReason, payment, confirmation }: SettlementExportContext): SettlementExportCell[][] {
  const t = snapshot.totals;
  const rows: SettlementExportCell[][] = [
    ["[문서정보]"],
    ["정산번호", Array.from(new Set(snapshot.lines.map((line) => line.settlementCode))).join(", ")],
    ["문서번호", documentNo ?? "미발행 (문서번호 미부여)"],
    ["버전", version ? formatDocumentVersion(version) : "-"],
    ["문서유형", SETTLEMENT_DOCUMENT_TYPE_LABELS[snapshot.documentType]],
    ["정산단위", snapshot.scope === "departure" ? "출발상품 단위" : "예약 단위"],
    ["발행일", snapshot.issueDate],
    ["정산기간", `${snapshot.periodFrom} ~ ${snapshot.periodTo}`],
    ["공급여행사", snapshot.supplierAgency.companyName],
    ["판매여행사", snapshot.sellingAgency.companyName],
    ["판매점", snapshot.seller?.companyName ?? "-"],
    ["상품명", snapshot.product.name],
    ["상품코드", snapshot.product.code],
    ["출발일", snapshot.departureDate],
    ["예약건수", snapshot.reservationCount],
    ["인원", snapshot.peopleCount],
    ["담당자", snapshot.manager],
    ...(reissueReason ? [["재발행 사유", reissueReason]] : []),
    [],
    ["[정산금액]"],
    ["고객 결제금액", t.paidAmount],
    ["판매수수료", t.affiliateCommission],
    ["판매점 수수료", t.sellerCommission],
    ["조정금액", t.adjustmentAmount],
    ["최종 정산액", t.finalSettlementAmount],
    ["차기 정산 반영 예정 (미포함)", t.nextAdjustmentAmount],
    [],
    ["[정산내역]"],
    ["구분", "기준금액", "수수료율", "금액", "비고"],
    ...buildSettlementDocumentAmountRows(snapshot).map((row) => [row.item, row.base ?? "", row.rate ?? "", row.amount, row.note]),
    ["최종 정산액", "", "", t.finalSettlementAmount, ""],
    [],
    ["[예약별 상세]"],
    ["예약번호", "예약자", "인원", "판매여행사", "판매점", "결제금액", "수수료", "조정금액", "정산액"],
    ...snapshot.lines.map((line) => [
      line.reservationCode,
      line.bookerName,
      line.peopleCount,
      line.sellingAgencyName,
      line.sellerName ?? "-",
      line.paidAmount,
      line.affiliateCommission + line.sellerCommission,
      line.adjustmentAmount,
      line.finalSupplierAmount,
    ]),
    ["합계", "", snapshot.peopleCount, "", "", t.paidAmount, t.totalCommission, t.adjustmentAmount, t.finalSettlementAmount],
  ];
  const adjustments = [...snapshot.adjustments, ...snapshot.nextAdjustments];
  if (adjustments.length) {
    rows.push(
      [],
      ["[정산 조정내역]"],
      ["발생일", "예약번호", "조정유형", "사유", "조정금액", "반영방식"],
      ...adjustments.map((adjustment) => [
        adjustment.createdAt?.slice(0, 10) ?? "-",
        adjustment.reservationCode,
        `${adjustment.direction} · ${adjustment.cause}`,
        adjustment.reason,
        adjustment.amount,
        adjustment.applyLabel ?? (adjustment.carriedFrom ? "이전 정산 이월" : "-"),
      ]),
    );
  }
  if (payment) {
    rows.push([], ["[지급정보]"], ["지급일", payment.paidAt], ["지급금액", payment.amount], ["지급방법", payment.method], ["처리자", `${payment.processedBy.name} (${payment.processedBy.agency})`]);
  }
  if (confirmation) rows.push([], ["[정산 확인 상태]"], [confirmation]);
  rows.push([], ["SAMPLE 데이터 · 법적 효력 없음 · AOS Travel Ops Platform"]);
  return rows;
}

/** 발행 문서의 특정 버전 내보내기 (지급정보는 최신 버전에만 포함) */
export function getSettlementDocumentExport(document: SettlementDocument, version: SettlementDocumentVersion, payment?: SettlementPayment) {
  const isCurrent = getCurrentDocumentVersion(document)?.version === version.version;
  return {
    filename: buildSettlementDocumentFilename(version.snapshot, document.documentNo, "csv"),
    rows: buildSettlementExportRows({
      snapshot: version.snapshot,
      documentNo: document.documentNo,
      version: version.version,
      reissueReason: version.reason,
      payment: isCurrent ? payment : undefined,
      confirmation: formatSettlementConfirmationText(getSettlementDocumentConfirmationInfo(document, version.version)),
    }),
  };
}

function escapeCsvCell(cell: SettlementExportCell) {
  if (typeof cell === "number") return String(cell);
  // 수식 실행 방지 (CSV injection)
  const text = /^[=+@\t\r]/.test(cell) ? `'${cell}` : cell;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toSettlementCsv(rows: SettlementExportCell[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

/** CSV 다운로드 (Excel 한글 표시를 위해 UTF-8 BOM 포함) */
export function downloadSettlementCsv(filename: string, rows: SettlementExportCell[][]) {
  const blob = new Blob([`\uFEFF${toSettlementCsv(rows)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
