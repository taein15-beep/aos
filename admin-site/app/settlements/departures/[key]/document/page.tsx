"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useReservationViewer } from "@/components/reservations/ReservationSource";
import { useQueryParam } from "@/components/settlements/SettlementParts";
import { SettlementPrintDocument, SettlementPrintShell } from "@/components/settlements/SettlementPrintDocument";
import { formatReservationTimestamp } from "@/lib/admin/reservations-data";
import { getViewerActor, isReservationVisibleTo, withReservationViewer } from "@/lib/admin/reservation-permission";
import { getSettlementDepartureGroups, getSettlementRecords } from "@/lib/admin/settlement-data";
import {
  SETTLEMENT_DOCUMENT_TYPE_LABELS,
  buildDepartureDocumentSnapshot,
  getDefaultDocumentForm,
  type SettlementDocumentType,
} from "@/lib/admin/settlement-document-data";
import { buildSettlementDocumentFilename, buildSettlementExportRows, downloadSettlementCsv } from "@/lib/admin/settlement-export";

/** 출발상품 단위 정산서 출력 미리보기 (미발행 · 현재 정산 데이터 기준) */
export default function SettlementDepartureDocumentOutputPage() {
  const params = useParams<{ key: string }>();
  const departureKey = decodeURIComponent(params.key ?? "");
  const [viewer] = useReservationViewer();
  const [typeParam, setTypeParam] = useQueryParam("type", "settlement_statement");
  const documentType: SettlementDocumentType = typeParam === "invoice" ? "invoice" : "settlement_statement";
  const group = useMemo(
    () =>
      getSettlementDepartureGroups(getSettlementRecords().filter((record) => isReservationVisibleTo(record.reservation, viewer))).find(
        (item) => item.key === departureKey,
      ),
    [viewer, departureKey],
  );
  const snapshot = useMemo(() => {
    if (!group?.records.length) return null;
    const actor = getViewerActor(viewer);
    const form = getDefaultDocumentForm(group.records[0], formatReservationTimestamp(new Date()).slice(0, 10), actor);
    return buildDepartureDocumentSnapshot(group, { ...form, documentType, note: "출발상품 단위 정산서 미리보기 (미발행 · SAMPLE)" }, actor);
  }, [group, viewer, documentType]);
  const backHref = withReservationViewer(`/settlements/departures/${encodeURIComponent(departureKey)}`, viewer);

  if (!snapshot || viewer.type === "seller") {
    return (
      <div className="settlement-print-page">
        <section className="panel member-web-detail-not-found settlement-print-missing">
          <strong>출발상품 정산서를 표시할 수 없습니다.</strong>
          <p>현재 조회 관점에서 볼 수 있는 정산이 없거나 잘못된 출발상품입니다.</p>
          <div className="settlement-print-missing-actions">
            <Link href={backHref} className="secondary settlement-print-back">
              <ArrowLeft size={14} />
              관리자 화면으로 돌아가기
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <SettlementPrintShell
      backHref={backHref}
      title={`출발상품 ${SETTLEMENT_DOCUMENT_TYPE_LABELS[documentType]} 미리보기`}
      meta={`${snapshot.product.name} · ${snapshot.departureDate} · 미발행 (현재 정산 데이터 기준)`}
      onExport={() => {
        const filename = buildSettlementDocumentFilename(snapshot, undefined, "csv");
        downloadSettlementCsv(filename, buildSettlementExportRows({ snapshot, confirmation: "미발행 미리보기 · 확인 요청 전" }));
        return filename;
      }}
      controls={
        <label className="settlement-print-version">
          <span>문서 종류</span>
          <select aria-label="문서 종류" value={documentType} onChange={(event) => setTypeParam(event.target.value)}>
            {(Object.keys(SETTLEMENT_DOCUMENT_TYPE_LABELS) as SettlementDocumentType[]).map((type) => (
              <option key={type} value={type}>
                {SETTLEMENT_DOCUMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
      }
    >
      <SettlementPrintDocument snapshot={snapshot} status="미발행" previewLabel="미발행 미리보기 · 문서번호는 발행 시 부여 · 출발상품 단위 발행은 다음 단계" />
    </SettlementPrintShell>
  );
}
