"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileDown, Printer } from "lucide-react";
import { formatSignedWon, formatWon, type SettlementPayment } from "@/lib/admin/settlement-data";
import {
  SETTLEMENT_DOCUMENT_TYPE_LABELS,
  type SettlementDocumentParty,
  type SettlementDocumentSnapshot,
  type SettlementDocumentStatus,
  type SettlementDocumentVersion,
} from "@/lib/admin/settlement-document-data";
import {
  SETTLEMENT_OUTPUT_LABELS,
  buildSettlementDocumentAmountRows,
  type SettlementDocumentConfirmationInfo,
} from "@/lib/admin/settlement-export";

const UNREGISTERED = "미등록 (거래처 연동 전)";
const PLATFORM_NAME = "AOS Travel Ops Platform";
export const SETTLEMENT_PDF_GUIDE = "브라우저 인쇄창에서 PDF로 저장할 수 있습니다.";

/** 출력 화면 공통 틀: Action Bar(인쇄 시 숨김) + 문서 영역 */
export function SettlementPrintShell({
  backHref,
  backLabel = "관리자 화면으로 돌아가기",
  title,
  meta,
  controls,
  onExport,
  exportDisabled,
  autoPrint,
  children,
}: {
  backHref: string;
  backLabel?: string;
  title: string;
  meta?: ReactNode;
  controls?: ReactNode;
  /** CSV 다운로드 후 파일명을 반환 */
  onExport?: () => string | undefined;
  exportDisabled?: boolean;
  /** 목록의 [인쇄]로 진입한 경우 인쇄창 자동 열기 */
  autoPrint?: boolean;
  children: ReactNode;
}) {
  const [toast, setToast] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const notify = (message: string) => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    if (!autoPrint) return;
    const id = window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("print");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
      window.print();
    }, 300);
    return () => window.clearTimeout(id);
  }, [autoPrint]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className="settlement-print-page">
      <div className="settlement-print-toolbar" role="toolbar" aria-label="정산서 출력 Action">
        <Link href={backHref} className="secondary settlement-print-back">
          <ArrowLeft size={14} />
          {backLabel}
        </Link>
        <div className="settlement-print-toolbar-title">
          <strong>{title}</strong>
          {meta && <span>{meta}</span>}
        </div>
        {controls}
        <div className="settlement-print-toolbar-actions">
          <button type="button" className="secondary" onClick={() => window.print()}>
            <Printer size={14} />
            인쇄
          </button>
          <button
            type="button"
            className="secondary"
            title={SETTLEMENT_PDF_GUIDE}
            onClick={() => {
              notify(`${SETTLEMENT_PDF_GUIDE} (대상: 'PDF로 저장')`);
              window.print();
            }}
          >
            <FileDown size={14} />
            PDF 저장
          </button>
          {onExport && (
            <button
              type="button"
              className="primary"
              disabled={exportDisabled}
              title="CSV 파일로 내보냅니다. (Excel에서 열기)"
              onClick={() => {
                const filename = onExport();
                if (filename) notify(`${filename} 파일을 내려받았습니다.`);
              }}
            >
              <Download size={14} />
              Excel 내보내기
            </button>
          )}
        </div>
        <p className="settlement-print-toolbar-help">PDF 저장: {SETTLEMENT_PDF_GUIDE} · Excel 내보내기는 CSV(UTF-8) 파일로 제공됩니다. (SAMPLE)</p>
      </div>
      <div className="settlement-print-scroll">{children}</div>
      {toast && (
        <div className="settlement-print-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function escapeCssContent(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]/g, " ");
}

function amountText(value: number) {
  return value < 0 ? `- ${formatWon(Math.abs(value))}` : formatWon(value);
}

function PrintParty({ title, party, compact }: { title: string; party?: SettlementDocumentParty; compact?: boolean }) {
  if (!party) return null;
  const fields: [string, string | undefined][] = compact
    ? [
        ["회사명", party.companyName],
        ["담당자", party.manager],
      ]
    : [
        ["회사명", party.companyName],
        ["사업자번호", party.businessNo],
        ["대표자", undefined],
        ["주소", undefined],
        ["담당자", party.manager],
        ["연락처", party.contact],
      ];
  return (
    <div className={`settlement-print-party ${compact ? "is-compact" : ""}`}>
      <h3>{title}</h3>
      <dl>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={value ? "" : "is-muted"}>{value ?? UNREGISTERED}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function SettlementPrintDocument({
  snapshot,
  documentNo,
  version,
  status,
  payment,
  confirmation,
  previewLabel,
}: {
  snapshot: SettlementDocumentSnapshot;
  documentNo?: string;
  version?: SettlementDocumentVersion;
  status: SettlementDocumentStatus;
  payment?: SettlementPayment;
  confirmation?: SettlementDocumentConfirmationInfo;
  previewLabel?: string;
}) {
  const labels = SETTLEMENT_OUTPUT_LABELS[snapshot.documentType];
  const t = snapshot.totals;
  const rows = buildSettlementDocumentAmountRows(snapshot);
  const adjustments = [...snapshot.adjustments, ...snapshot.nextAdjustments];
  const footerText = [documentNo ?? "미발행", snapshot.issueDate, PLATFORM_NAME].join(" · ");

  return (
    <article className={`settlement-print-sheet is-${snapshot.documentType}`} aria-label={`${labels.title} 출력 문서`}>
      <style>{`@media print{@page settlement-a4{@bottom-left{content:"${escapeCssContent(footerText)}"}}}`}</style>

      <header className="settlement-print-head">
        <div>
          <p className="settlement-print-kicker">
            {snapshot.scope === "departure" ? "출발상품 단위" : "예약 단위"} · {SETTLEMENT_DOCUMENT_TYPE_LABELS[snapshot.documentType]}
          </p>
          <h1>{labels.title}</h1>
          {previewLabel && <p className="settlement-print-preview-label">{previewLabel}</p>}
        </div>
        <dl>
          <div>
            <dt>{labels.no}</dt>
            <dd>{documentNo ?? "발행 시 부여"}</dd>
          </div>
          <div>
            <dt>{labels.issueDate}</dt>
            <dd>{snapshot.issueDate}</dd>
          </div>
          <div>
            <dt>{labels.version}</dt>
            <dd>{version ? `Version ${version.version}` : "-"}</dd>
          </div>
          <div>
            <dt>문서상태</dt>
            <dd>{status === "미발행" ? "미발행 (미리보기)" : status}</dd>
          </div>
        </dl>
      </header>

      {version?.reason && (
        <section className="settlement-print-block settlement-print-reissue">
          <h2>재발행 사유</h2>
          <p>
            {version.reason}
            <small>
              {version.issuedAt} · {version.issuedBy.name} ({version.issuedBy.agency}) · {version.summary}
            </small>
          </p>
        </section>
      )}

      <section className="settlement-print-block settlement-print-parties">
        <PrintParty title={labels.supplier} party={snapshot.supplierAgency} />
        <PrintParty title={labels.buyer} party={snapshot.sellingAgency} />
      </section>
      {snapshot.seller && (
        <section className="settlement-print-block settlement-print-parties is-single">
          <PrintParty title={labels.seller} party={snapshot.seller} compact />
        </section>
      )}

      <section className="settlement-print-block">
        <h2>{labels.summary}</h2>
        <dl className="settlement-print-summary">
          {[
            ["정산기간", `${snapshot.periodFrom} ~ ${snapshot.periodTo}`],
            ["상품명", snapshot.product.name],
            ["상품코드", snapshot.product.code],
            ["출발일", snapshot.departureDate],
            ["예약건수", `${snapshot.reservationCount}건`],
            ["인원", `${snapshot.peopleCount}명`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="settlement-print-block">
        <h2>정산내역</h2>
        <table className="settlement-print-table settlement-print-amounts">
          <thead>
            <tr>
              <th>구분</th>
              <th>기준금액</th>
              <th>수수료율</th>
              <th>금액</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.item} className={row.tone ? `is-${row.tone}` : ""}>
                <td>{row.item}</td>
                <td className="is-number">{row.base === null ? "-" : formatWon(row.base)}</td>
                <td className="is-center">{row.rate ?? "-"}</td>
                <td className="is-number">{row.tone === "plus" ? formatSignedWon(row.amount) : amountText(row.amount)}</td>
                <td>{row.note || "-"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={3}>{labels.settlement}</th>
              <td className="is-number">{formatWon(t.finalSettlementAmount)}</td>
              <td>{t.adjustmentAmount !== 0 ? `조정 ${formatSignedWon(t.adjustmentAmount)} 반영` : ""}</td>
            </tr>
          </tfoot>
        </table>
        {t.nextAdjustmentAmount !== 0 && (
          <p className="settlement-print-note">차기 정산 반영 예정 {formatSignedWon(t.nextAdjustmentAmount)}은 이 문서의 최종 정산액에 포함되지 않습니다.</p>
        )}
      </section>

      <section className="settlement-print-block is-breakable">
        <h2>예약별 상세내역</h2>
        <table className="settlement-print-table settlement-print-lines">
          <thead>
            <tr>
              {["예약번호", "예약자", "인원", "판매여행사", "판매점", "고객 결제금액", "수수료", "조정금액", "공급사 정산액"].map((title) => (
                <th key={title}>{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {snapshot.lines.map((line) => (
              <tr key={line.settlementCode}>
                <td>{line.reservationCode}</td>
                <td>{line.bookerName}</td>
                <td className="is-center">{line.peopleCount}명</td>
                <td>{line.sellingAgencyName}</td>
                <td>{line.sellerName ?? "-"}</td>
                <td className="is-number">{formatWon(line.paidAmount)}</td>
                <td className="is-number">{formatWon(line.affiliateCommission + line.sellerCommission)}</td>
                <td className="is-number">{formatSignedWon(line.adjustmentAmount)}</td>
                <td className="is-number">{formatWon(line.finalSupplierAmount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2}>합계</th>
              <td className="is-center">{snapshot.peopleCount}명</td>
              <td colSpan={2} />
              <td className="is-number">{formatWon(t.paidAmount)}</td>
              <td className="is-number">{formatWon(t.totalCommission)}</td>
              <td className="is-number">{formatSignedWon(t.adjustmentAmount)}</td>
              <td className="is-number">{formatWon(t.finalSettlementAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {adjustments.length > 0 && (
        <section className="settlement-print-block is-breakable">
          <h2>정산 조정내역</h2>
          <table className="settlement-print-table settlement-print-adjustments">
            <thead>
              <tr>
                {["발생일", "예약번호", "조정유형", "사유", "조정금액", "반영방식"].map((title) => (
                  <th key={title}>{title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adjustment) => {
                const next = snapshot.nextAdjustments.includes(adjustment);
                return (
                  <tr key={adjustment.id} className={next ? "is-excluded" : ""}>
                    <td className="is-center">{adjustment.createdAt?.slice(0, 10) ?? "-"}</td>
                    <td>{adjustment.reservationCode}</td>
                    <td>
                      {adjustment.direction}
                      <small>{adjustment.carriedFrom ? `이전 정산 ${adjustment.carriedFrom}` : adjustment.cause}</small>
                    </td>
                    <td>{adjustment.reason}</td>
                    <td className="is-number">{formatSignedWon(adjustment.amount)}</td>
                    <td>
                      {adjustment.applyLabel ?? (next ? "차기 정산 반영" : "현재 정산 반영")}
                      {next && <small>최종 정산액 미포함</small>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {payment && (
        <section className="settlement-print-block">
          <h2>지급정보</h2>
          <dl className="settlement-print-summary">
            {[
              ["지급일", payment.paidAt],
              ["지급금액", formatWon(payment.amount)],
              ["지급방법", payment.method],
              ["처리자", `${payment.processedBy.name} (${payment.processedBy.agency})`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {confirmation && (
        <section className="settlement-print-block">
          <h2>정산 확인 상태</h2>
          <div className={`settlement-print-confirm is-${confirmation.badge}`}>
            <b>{confirmation.state}</b>
            {confirmation.agency && <span>{confirmation.agency}</span>}
            {confirmation.at && <span>{confirmation.at}</span>}
            {confirmation.reason && <span>{confirmation.reason}</span>}
            {confirmation.detail && <small>{confirmation.detail}</small>}
          </div>
        </section>
      )}

      <section className="settlement-print-block">
        <h2>비고</h2>
        <p className="settlement-print-memo">{snapshot.note.trim() || "-"}</p>
      </section>

      <footer className="settlement-print-foot">
        <span>
          {labels.no} {documentNo ?? "미발행"}
        </span>
        <span>
          {labels.issueDate} {snapshot.issueDate}
        </span>
        <span>
          발행 {snapshot.issuer.name} ({snapshot.issuer.agency}) · 담당 {snapshot.manager}
        </span>
        <strong>{PLATFORM_NAME}</strong>
        <small>SAMPLE 문서 · 법적 효력 없음 · 발행 시점 snapshot 기준 (현재 정산 데이터로 다시 계산하지 않음)</small>
      </footer>
    </article>
  );
}
