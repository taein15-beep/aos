"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useReservationViewer } from "@/components/reservations/ReservationSource";
import { useQueryParam } from "@/components/settlements/SettlementParts";
import { SettlementPrintDocument, SettlementPrintShell } from "@/components/settlements/SettlementPrintDocument";
import { withReservationViewer } from "@/lib/admin/reservation-permission";
import { getSettlementRecord } from "@/lib/admin/settlement-data";
import {
  SETTLEMENT_DOCUMENT_TYPE_LABELS,
  formatDocumentVersion,
  getCurrentDocumentVersion,
  getSettlementDocumentForOutput,
  getViewerVisibleVersions,
} from "@/lib/admin/settlement-document-data";
import { downloadSettlementCsv, getSettlementDocumentConfirmationInfo, getSettlementDocumentExport } from "@/lib/admin/settlement-export";

function parseVersion(value: string | undefined) {
  const parsed = Number(String(value ?? "").replace(/^v/i, ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export default function SettlementDocumentOutputPage() {
  const params = useParams<{ id: string; version: string }>();
  const router = useRouter();
  const [viewer] = useReservationViewer();
  const [documentNo] = useQueryParam("doc", "");
  const [printParam] = useQueryParam("print", "");
  const settlementCode = decodeURIComponent(params.id ?? "");
  const versionNumber = parseVersion(params.version);

  const record = useMemo(() => getSettlementRecord(settlementCode), [settlementCode]);
  const document = useMemo(() => getSettlementDocumentForOutput(settlementCode, documentNo || undefined), [settlementCode, documentNo]);
  const versions = record ? getViewerVisibleVersions(record, document, viewer) : [];
  const selected = versions.find((version) => version.version === versionNumber);
  const latestVisible = versions[versions.length - 1];
  const current = getCurrentDocumentVersion(document);
  const backHref = withReservationViewer(`/settlements/${encodeURIComponent(settlementCode)}?tab=document`, viewer);

  const outputPath = (version: number) => {
    const query = documentNo ? `?doc=${encodeURIComponent(documentNo)}` : "";
    return withReservationViewer(`/settlements/${encodeURIComponent(settlementCode)}/document/${version}${query}`, viewer);
  };

  if (!record || !document || !selected) {
    return (
      <div className="settlement-print-page">
        <section className="panel member-web-detail-not-found settlement-print-missing">
          <strong>정산서를 찾을 수 없습니다.</strong>
          <p>
            {!record
              ? `정산번호(${settlementCode || "-"})에 해당하는 정산 정보가 없습니다.`
              : !document
                ? "발행된 정산서가 없습니다. 세션 중 발행한 정산서는 새로고침 시 초기화됩니다. (Mock)"
                : versions.length
                  ? `요청한 버전(${params.version})이 없습니다. 최신 버전은 ${formatDocumentVersion(latestVisible?.version ?? 1)}입니다.`
                  : "현재 조회 관점에서는 이 정산서를 볼 수 없습니다. (SAMPLE 권한)"}
          </p>
          <div className="settlement-print-missing-actions">
            <Link href={backHref} className="secondary settlement-print-back">
              <ArrowLeft size={14} />
              관리자 화면으로 돌아가기
            </Link>
            {latestVisible && (
              <Link href={outputPath(latestVisible.version)} className="primary settlement-print-back">
                최신 버전 보기
              </Link>
            )}
          </div>
        </section>
      </div>
    );
  }

  const isCurrent = current?.version === selected.version;
  const isLatestVisible = latestVisible?.version === selected.version;
  const snapshot = selected.snapshot;

  return (
    <SettlementPrintShell
      backHref={backHref}
      title={`${SETTLEMENT_DOCUMENT_TYPE_LABELS[snapshot.documentType]} · ${document.documentNo}`}
      meta={
        <>
          {record.settlementCode} · {snapshot.sellingAgency.companyName} · 발행 snapshot 기준
          {document.status === "발행취소" ? " · 발행취소 문서" : ""}
        </>
      }
      autoPrint={printParam === "1"}
      onExport={() => {
        const { filename, rows } = getSettlementDocumentExport(document, selected, record.settlement.payment);
        downloadSettlementCsv(filename, rows);
        return filename;
      }}
      controls={
        <label className="settlement-print-version">
          <span>문서 버전</span>
          <select aria-label="문서 버전" value={selected.version} onChange={(event) => router.replace(outputPath(Number(event.target.value)))}>
            {[...versions].reverse().map((version) => (
              <option key={version.version} value={version.version}>
                {formatDocumentVersion(version.version)} · {version.action} {version.issuedAt.slice(0, 10)}
                {version.version === current?.version ? " (최신)" : ""}
              </option>
            ))}
          </select>
        </label>
      }
    >
      <SettlementPrintDocument
        snapshot={snapshot}
        documentNo={document.documentNo}
        version={selected}
        status={isCurrent ? document.status : "발행완료"}
        payment={isCurrent ? record.settlement.payment : undefined}
        confirmation={getSettlementDocumentConfirmationInfo(document, selected.version)}
        previewLabel={
          !isLatestVisible || !isCurrent
            ? `과거 버전 ${formatDocumentVersion(selected.version)} · 읽기 전용 (최신 ${formatDocumentVersion(current?.version ?? selected.version)})`
            : undefined
        }
      />
    </SettlementPrintShell>
  );
}
