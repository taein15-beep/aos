"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { ReservationViewerSwitch, useReservationViewer } from "@/components/reservations/ReservationSource";
import { SettlementStatusBadge } from "@/components/settlements/SettlementParts";
import { SettlementAdjustmentStateBadge } from "@/components/settlements/SettlementAdjustmentParts";
import { SettlementDocumentPreview, SettlementDocumentStatusBadge } from "@/components/settlements/SettlementDocumentParts";
import { formatReservationTimestamp } from "@/lib/admin/reservations-data";
import { getViewerActor, isReservationVisibleTo, withReservationViewer } from "@/lib/admin/reservation-permission";
import { formatSignedWon, formatWon, getSettlementDepartureGroups, getSettlementRecords } from "@/lib/admin/settlement-data";
import {
  SETTLEMENT_DOCUMENT_TYPE_LABELS,
  buildDepartureDocumentSnapshot,
  getDefaultDocumentForm,
  getSettlementDocumentStatus,
  type SettlementDocumentType,
} from "@/lib/admin/settlement-document-data";

export default function SettlementDepartureDetailPage() {
  const params = useParams<{ key: string }>();
  const router = useRouter();
  const departureKey = useMemo(() => decodeURIComponent(params.key ?? ""), [params.key]);
  const [viewer, changeViewer] = useReservationViewer();
  const [toast, setToast] = useState("");
  const records = useMemo(() => getSettlementRecords(), []);
  const group = useMemo(
    () =>
      getSettlementDepartureGroups(records.filter((record) => isReservationVisibleTo(record.reservation, viewer))).find(
        (item) => item.key === departureKey,
      ),
    [records, viewer, departureKey],
  );

  const [documentType, setDocumentType] = useState<SettlementDocumentType>("settlement_statement");
  const documentSnapshot = useMemo(() => {
    if (!group?.records.length) return null;
    const actor = getViewerActor(viewer);
    const form = getDefaultDocumentForm(group.records[0], formatReservationTimestamp(new Date()).slice(0, 10), actor);
    return buildDepartureDocumentSnapshot(group, { ...form, documentType, note: "출발상품 단위 정산서 미리보기 (미발행 · SAMPLE)" }, actor);
  }, [group, viewer, documentType]);
  const showDocumentPreview = viewer.type !== "seller";

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const backToList = () => router.push(withReservationViewer("/settlements?tab=departure", viewer));

  return (
    <ProductAdminShell
      activeMenu="정산관리"
      currentChild="정산현황"
      breadcrumb={
        <>
          <span>정산관리</span>
          <b>/</b>
          <span>출발상품별 정산</span>
          <b>/</b>
          <strong>출발상품 정산 상세</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
    >
      <main className="content member-web-detail-content settlement-detail-content">
        <section className="page-head member-web-detail-page-head">
          <div>
            <p className="member-web-breadcrumb">정산관리 &gt; 출발상품별 정산 &gt; 상세</p>
            <div className="member-web-detail-title-row">
              <h1>출발상품 정산 상세</h1>
            </div>
            <p className="member-web-detail-subtitle">
              {group ? `${group.productName} · ${group.departureAt}` : departureKey}
            </p>
          </div>
          <div className="member-web-detail-actions">
            <ReservationViewerSwitch viewer={viewer} onChange={changeViewer} />
            <button type="button" className="secondary" onClick={backToList}>
              <ArrowLeft size={14} />
              목록
            </button>
          </div>
        </section>

        {!group ? (
          <section className="panel member-web-detail-not-found">
            <strong>출발상품 정산내역을 찾을 수 없습니다.</strong>
            <p>현재 조회 관점에서 볼 수 있는 정산이 없거나 잘못된 출발상품입니다.</p>
            <button type="button" className="secondary" onClick={backToList}>
              <ArrowLeft size={14} />
              목록으로
            </button>
          </section>
        ) : (
          <div className="member-web-detail-stack">
            <section className="panel member-web-detail-card">
              <div className="member-web-detail-card-head">
                <strong>출발상품 요약</strong>
                <span className="badge gray">{group.supplierAgencyName}</span>
              </div>
              <div className="member-web-detail-info-grid">
                {[
                  ["상품명", group.productName],
                  ["출발일", group.departureAt],
                  ["예약건수", `${group.reservationCount}건`],
                  ["총 인원", `${group.peopleCount}명`],
                  ["총 판매금액", formatWon(group.paidAmount)],
                  ["총 수수료", formatWon(group.affiliateCommission + group.sellerCommission)],
                  ["기본 정산액", formatWon(group.baseSupplierAmount)],
                  ["조정금액", formatSignedWon(group.adjustmentAmount)],
                  ["최종 정산액", formatWon(group.supplierAmount)],
                ].map(([label, value]) => (
                  <div key={label} className="member-web-detail-field">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel member-web-detail-card">
              <div className="member-web-detail-card-head">
                <strong>예약별 정산</strong>
                <span className="member-web-status-history-count">{group.records.length}건</span>
              </div>
              <div className="member-web-detail-table-wrap">
                <table className="member-web-detail-table settlement-departure-detail-table">
                  <thead>
                    <tr>
                      {["예약번호", "예약자", "판매여행사", "판매점", "결제금액", "판매수수료", "판매점수수료", "기본 정산액", "조정금액", "최종 정산액", "상태"].map(
                        (title) => (
                          <th key={title}>{title}</th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {group.records.map((record) => (
                      <tr key={record.settlementCode} className={record.status === "정산취소" ? "is-excluded" : ""}>
                        <td className="member-number">
                          <Link
                            href={withReservationViewer(`/settlements/${record.settlementCode}`, viewer)}
                            className="reservation-code-link"
                          >
                            {record.reservation.code}
                          </Link>
                        </td>
                        <td>{record.reservation.bookerName}</td>
                        <td>{record.sellingAgencyName}</td>
                        <td>{record.sellerName ?? "-"}</td>
                        <td className="amount-cell">{formatWon(record.breakdown.paidAmount)}</td>
                        <td className="amount-cell">{formatWon(record.breakdown.affiliateCommission)}</td>
                        <td className="amount-cell">{formatWon(record.breakdown.sellerCommission)}</td>
                        <td className="amount-cell">{formatWon(record.breakdown.supplierAmount)}</td>
                        <td className="amount-cell">
                          {formatSignedWon(record.amounts.finalSupplierAmount - record.breakdown.supplierAmount)}
                        </td>
                        <td className="amount-cell">{formatWon(record.amounts.finalSupplierAmount)}</td>
                        <td>
                          <span className="reservation-status-stack">
                            <SettlementStatusBadge status={record.status} />
                            {getSettlementDocumentStatus(record.settlementCode) !== "미발행" && (
                              <SettlementDocumentStatusBadge status={getSettlementDocumentStatus(record.settlementCode)} />
                            )}
                            <SettlementAdjustmentStateBadge state={record.adjustmentState} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={4}>합계 (정산취소 제외)</th>
                      <td className="amount-cell">{formatWon(group.paidAmount)}</td>
                      <td className="amount-cell">{formatWon(group.affiliateCommission)}</td>
                      <td className="amount-cell">{formatWon(group.sellerCommission)}</td>
                      <td className="amount-cell">{formatWon(group.baseSupplierAmount)}</td>
                      <td className="amount-cell">{formatSignedWon(group.adjustmentAmount)}</td>
                      <td className="amount-cell">{formatWon(group.supplierAmount)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {showDocumentPreview && documentSnapshot && (
              <section className="panel member-web-detail-card">
                <div className="member-web-detail-card-head">
                  <strong>출발상품 정산서 미리보기</strong>
                  <span className="settlement-card-head-actions">
                    <span className="badge warn">미발행 · 구조 준비 (SAMPLE)</span>
                    <span className="member-web-detail-tabs settlement-document-type-tabs" role="tablist" aria-label="문서 종류">
                      {(Object.keys(SETTLEMENT_DOCUMENT_TYPE_LABELS) as SettlementDocumentType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          role="tab"
                          aria-selected={documentType === type}
                          className={documentType === type ? "active" : ""}
                          onClick={() => setDocumentType(type)}
                        >
                          {SETTLEMENT_DOCUMENT_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </span>
                    <Link
                      href={withReservationViewer(
                        `/settlements/departures/${encodeURIComponent(group.key)}/document${documentType === "invoice" ? "?type=invoice" : ""}`,
                        viewer,
                      )}
                      className="member-detail-button"
                      title="A4 출력 화면 · 인쇄 / PDF 저장 / Excel 내보내기"
                    >
                      <Printer size={12} />
                      출력 화면
                    </Link>
                  </span>
                </div>
                <p className="product-share-setting-help settlement-card-note">
                  같은 출발상품의 예약 정산을 하나의 정산서로 집계한 미리보기입니다. 현재 발행 · 확인 업무는 예약별 정산 상세에서 진행하며, 출발상품 단위 발행은 다음 단계에서 연결합니다.
                </p>
                <SettlementDocumentPreview
                  snapshot={documentSnapshot}
                  status="미발행"
                  previewLabel="현재 정산 데이터 기준 미리보기 · 문서번호는 발행 시 부여"
                />
              </section>
            )}
          </div>
        )}
      </main>
    </ProductAdminShell>
  );
}
