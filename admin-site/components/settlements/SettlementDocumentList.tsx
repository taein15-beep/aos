"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, Printer, RotateCcw, Search } from "lucide-react";
import { ReservationActionDialog, type ReservationActionDialogState } from "@/components/reservations/ReservationSource";
import { SettlementDisputeModal, SettlementDocumentStatusBadge } from "@/components/settlements/SettlementDocumentParts";
import { formatReservationTimestamp } from "@/lib/admin/reservations-data";
import { getViewerActor, type ReservationViewer } from "@/lib/admin/reservation-permission";
import { canManageSettlement, formatWon, type SettlementRecord } from "@/lib/admin/settlement-data";
import {
  SETTLEMENT_DOCUMENT_TYPE_LABELS,
  confirmSettlementDocument,
  disputeSettlementDocument,
  formatDocumentVersion,
  getAllSettlementDocuments,
  getCurrentDocumentVersion,
  getSettlementDocumentActions,
  getSettlementDocumentConfirmState,
  getViewerVisibleVersions,
  isSettlementDocumentOutdated,
  isSettlementDocumentReceiver,
  type SettlementDocument,
  type SettlementDocumentConfirmState,
  type SettlementDocumentVersion,
} from "@/lib/admin/settlement-document-data";
import { downloadSettlementCsv, getSettlementDocumentExport } from "@/lib/admin/settlement-export";

type DocumentRow = {
  record: SettlementRecord;
  document: SettlementDocument;
  /** 현재 관점에서 볼 수 있는 최신 버전 */
  version: SettlementDocumentVersion;
  versionCount: number;
  confirmState: SettlementDocumentConfirmState;
  outdated: boolean;
};

const STATUS_FILTERS = ["전체", "발행완료", "확인대기", "확인완료", "이의제기", "발행취소"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const CONFIRM_BADGE: Record<SettlementDocumentConfirmState, string> = {
  "확인 요청 전": "gray",
  확인대기: "warn",
  확인완료: "success",
  이의제기: "danger",
  "-": "gray",
};

function now() {
  return formatReservationTimestamp(new Date());
}

export function SettlementDocumentList({
  records,
  viewer,
  received,
  dataVersion,
  outputHref,
  detailHref,
  onChanged,
  onNotify,
}: {
  records: SettlementRecord[];
  viewer: ReservationViewer;
  /** 판매여행사 관점: 받은 정산서 */
  received: boolean;
  dataVersion: number;
  outputHref: (row: { record: SettlementRecord; document: SettlementDocument; version: number }, print?: boolean) => string;
  detailHref: (settlementCode: string, tab?: string) => string;
  onChanged: (message: string) => void;
  onNotify: (message: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<StatusFilter>("전체");
  const [dialog, setDialog] = useState<ReservationActionDialogState | null>(null);
  const [disputeTarget, setDisputeTarget] = useState<DocumentRow | null>(null);
  const actor = getViewerActor(viewer);

  const rows = useMemo<DocumentRow[]>(() => {
    const recordMap = new Map(records.map((record) => [record.settlementCode, record]));
    return getAllSettlementDocuments()
      .flatMap((document) => {
        const record = recordMap.get(document.settlementCode);
        if (!record || !document.documentNo) return [];
        const allowed = received ? isSettlementDocumentReceiver(record, viewer) : canManageSettlement(record, viewer);
        const versions = allowed ? getViewerVisibleVersions(record, document, viewer) : [];
        const version = versions[versions.length - 1];
        if (!version) return [];
        return [
          {
            record,
            document,
            version,
            versionCount: versions.length,
            confirmState: getSettlementDocumentConfirmState(document),
            outdated: document.status !== "발행취소" && isSettlementDocumentOutdated(record, document),
          },
        ];
      })
      .sort((a, b) => b.version.issuedAt.localeCompare(a.version.issuedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, viewer, received, dataVersion]);

  const filtered = rows.filter((row) => {
    const text = keyword.trim().toLowerCase();
    if (
      text &&
      ![row.document.documentNo, row.record.settlementCode, row.record.sellingAgencyName, row.record.supplierAgencyName, row.version.snapshot.product.name]
        .join(" ")
        .toLowerCase()
        .includes(text)
    ) {
      return false;
    }
    if (status === "전체") return true;
    if (status === "발행완료") return row.document.status === "발행완료";
    return row.document.status === status;
  });

  const exportRow = (row: DocumentRow) => {
    const { filename, rows: csvRows } = getSettlementDocumentExport(row.document, row.version, row.record.settlement.payment);
    downloadSettlementCsv(filename, csvRows);
    onNotify(`${filename} 파일을 내려받았습니다.`);
  };

  const openConfirm = (row: DocumentRow) =>
    setDialog({
      title: "정산내역을 확인하시겠습니까?",
      details: [
        { label: "문서번호", value: row.document.documentNo },
        { label: "버전", value: formatDocumentVersion(row.version.version) },
        { label: "공급여행사", value: row.record.supplierAgencyName },
        { label: "최종 정산액", value: formatWon(row.version.snapshot.totals.finalSettlementAmount) },
      ],
      notes: ["확인 후 지급 절차를 진행할 수 있습니다."],
      confirmLabel: "확인완료",
      onConfirm: () => {
        const done = confirmSettlementDocument(row.record, actor, now());
        setDialog(null);
        if (done) onChanged("정산서 확인이 완료되었습니다.");
      },
    });

  const empty = received ? "받은 정산서가 없습니다." : "발행된 정산서가 없습니다.";

  return (
    <section className="panel member-web-list-panel">
      <ReservationActionDialog dialog={dialog} onClose={() => setDialog(null)} />
      {disputeTarget && (
        <SettlementDisputeModal
          record={disputeTarget.record}
          document={disputeTarget.document}
          onClose={() => setDisputeTarget(null)}
          onSubmit={(input) => {
            const errors = disputeSettlementDocument(disputeTarget.record, input, actor, now());
            if (!errors.length) {
              setDisputeTarget(null);
              onChanged("이의제기를 등록했습니다.");
            }
            return errors;
          }}
        />
      )}
      <div className="member-web-list-head settlement-document-list-head">
        <div>
          <strong>
            {received ? "받은 정산서" : "정산서"} <b>{filtered.length}</b>건
          </strong>
          <span>발행 snapshot 기준 금액 · 작성중(미발행) 문서는 정산 상세에서 확인</span>
        </div>
        <div className="settlement-document-list-tools">
          <label className="member-web-keyword">
            <span className="sr-only">정산서 검색</span>
            <div>
              <Search size={14} />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="문서번호 / 정산번호 / 여행사 / 상품" aria-label="정산서 검색" />
            </div>
          </label>
          <select aria-label="정산서 상태" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            {STATUS_FILTERS.map((item) => (
              <option key={item} value={item}>
                {item === "전체" ? "전체 상태" : item}
              </option>
            ))}
          </select>
          {(keyword || status !== "전체") && (
            <button
              type="button"
              className="secondary settlement-inline-button"
              onClick={() => {
                setKeyword("");
                setStatus("전체");
              }}
            >
              <RotateCcw size={12} />
              초기화
            </button>
          )}
        </div>
      </div>
      <div className="member-web-table-wrap">
        <table className="member-web-table settlement-document-list-table">
          <thead>
            <tr>
              {(received
                ? ["문서번호", "공급여행사", "발행일", "정산기간", "정산금액", "상태", "확인", "관리"]
                : ["문서번호", "발행일", "판매여행사", "정산기간", "최종 정산액", "문서상태", "확인상태", "버전", "관리"]
              ).map((title) => (
                <th key={title}>{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((row) => {
                const snapshot = row.version.snapshot;
                const cancelled = row.document.status === "발행취소";
                const viewLink = (
                  <Link href={outputHref({ record: row.record, document: row.document, version: row.version.version })} className="member-detail-button">
                    <Eye size={12} />
                    보기
                  </Link>
                );
                const documentCell = (
                  <td className="member-number text-left">
                    <span className="settlement-document-list-no">
                      <Link href={detailHref(row.record.settlementCode, "document")} className={`reservation-code-link ${cancelled ? "is-cancelled" : ""}`}>
                        {row.document.documentNo}
                      </Link>
                      <small>
                        {row.record.settlementCode} · {SETTLEMENT_DOCUMENT_TYPE_LABELS[snapshot.documentType]}
                      </small>
                    </span>
                  </td>
                );
                if (received) {
                  const actions = getSettlementDocumentActions(row.record, row.document, viewer);
                  return (
                    <tr key={row.document.id}>
                      {documentCell}
                      <td>{row.record.supplierAgencyName}</td>
                      <td className="date-cell">{snapshot.issueDate}</td>
                      <td className="date-cell">
                        {snapshot.periodFrom} ~ {snapshot.periodTo}
                      </td>
                      <td className="amount-cell">
                        <b>{formatWon(snapshot.totals.finalSettlementAmount)}</b>
                      </td>
                      <td>
                        <SettlementDocumentStatusBadge status={row.document.status} />
                      </td>
                      <td>
                        {row.document.status === "확인완료" ? (
                          <span className="settlement-document-list-confirm">
                            <span className="badge success">확인완료</span>
                            <small>{row.document.confirmedAt}</small>
                          </span>
                        ) : row.document.status === "확인대기" ? (
                          <span className="badge warn">확인 필요</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <span className="settlement-document-list-actions">
                          {viewLink}
                          {actions.confirm.visible && (
                            <button type="button" className="primary settlement-inline-button" disabled={!actions.confirm.allowed} title={actions.confirm.reason} onClick={() => openConfirm(row)}>
                              확인
                            </button>
                          )}
                          {actions.dispute.visible && (
                            <button type="button" className="secondary settlement-inline-button" disabled={!actions.dispute.allowed} title={actions.dispute.reason} onClick={() => setDisputeTarget(row)}>
                              이의제기
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                }
                const reissue = getSettlementDocumentActions(row.record, row.document, viewer).reissue;
                const current = getCurrentDocumentVersion(row.document);
                return (
                  <tr key={row.document.id}>
                    {documentCell}
                    <td className="date-cell">{snapshot.issueDate}</td>
                    <td>{snapshot.sellingAgency.companyName}</td>
                    <td className="date-cell">
                      {snapshot.periodFrom} ~ {snapshot.periodTo}
                    </td>
                    <td className="amount-cell">
                      <b>{formatWon(snapshot.totals.finalSettlementAmount)}</b>
                    </td>
                    <td>
                      <span className="reservation-status-stack">
                        <span className={`badge ${cancelled ? "gray" : "info"}`}>{cancelled ? "발행취소" : "발행완료"}</span>
                        {row.outdated && (
                          <span className="badge warn" title="발행 후 정산금액이 변경되었습니다.">
                            재발행 필요
                          </span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${CONFIRM_BADGE[row.confirmState]}`}>{row.confirmState}</span>
                    </td>
                    <td>
                      <span className="settlement-document-list-version">
                        <b>{formatDocumentVersion(current?.version ?? row.version.version)}</b>
                        <small>{row.versionCount}개 버전</small>
                      </span>
                    </td>
                    <td>
                      <span className="settlement-document-list-actions">
                        {viewLink}
                        <Link
                          href={outputHref({ record: row.record, document: row.document, version: row.version.version }, true)}
                          className="member-detail-button"
                          title="출력 화면에서 인쇄창을 엽니다."
                        >
                          <Printer size={12} />
                          인쇄
                        </Link>
                        <button type="button" className="secondary settlement-inline-button" title="CSV 파일로 내보냅니다. (Excel에서 열기)" onClick={() => exportRow(row)}>
                          <Download size={12} />
                          Excel
                        </button>
                        {reissue.visible &&
                          (reissue.allowed ? (
                            <Link href={detailHref(row.record.settlementCode, "document")} className="member-detail-button" title="정산 상세 정산서 탭에서 재발행 사유를 입력합니다.">
                              재발행
                            </Link>
                          ) : (
                            <button type="button" className="secondary settlement-inline-button" disabled title={reissue.reason}>
                              재발행
                            </button>
                          ))}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={received ? 8 : 9}>
                  <div className="member-web-empty">
                    <strong>{rows.length ? "검색 조건에 맞는 정산서가 없습니다." : empty}</strong>
                    <p>{received ? "공급여행사가 확인을 요청한 정산서가 표시됩니다." : "정산마감 후 정산 상세 [정산서] 탭에서 정산서를 발행할 수 있습니다."}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="member-web-footer">
        <span>총 {filtered.length}건</span>
        <div />
        <div />
      </div>
    </section>
  );
}
