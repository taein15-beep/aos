"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { ReservationViewerSwitch, useReservationViewer } from "@/components/reservations/ReservationSource";
import { SettlementDocumentShell } from "@/components/reservations/SettlementDocumentDraftParts";
import {
  buildSettlementDocumentDraftView,
  parseSettlementMethod,
} from "@/lib/admin/reservation-settlement-draft";
import {
  buildInitialSettlementExpenses,
  type SettlementExpenseLine,
} from "@/lib/admin/reservation-settlement-expenses";
import { buildSettlementRosterFromTargets } from "@/lib/admin/reservation-settlement-roster";
import { buildSettlementSalesFinanceFromTargets } from "@/lib/admin/reservation-settlement-sales";
import { withReservationViewer } from "@/lib/admin/reservation-permission";

export default function ReservationSettlementDraftPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [viewer, changeViewer] = useReservationViewer();
  const [expenses, setExpenses] = useState<SettlementExpenseLine[]>([]);

  const reservationCode = useMemo(() => decodeURIComponent(params.id ?? ""), [params.id]);
  const method = parseSettlementMethod(searchParams.get("method"));

  const draft = useMemo(() => {
    if (!method || !reservationCode) return null;
    return buildSettlementDocumentDraftView({
      method,
      sourceReservationCode: reservationCode,
      viewer,
    });
  }, [method, reservationCode, viewer]);

  useEffect(() => {
    if (!draft) {
      setExpenses([]);
      return;
    }
    setExpenses(buildInitialSettlementExpenses(draft));
  }, [draft]);

  const sales = useMemo(
    () => (draft ? buildSettlementSalesFinanceFromTargets(draft.targets) : null),
    [draft],
  );

  const roster = useMemo(
    () => (draft ? buildSettlementRosterFromTargets(draft.targets) : null),
    [draft],
  );

  const backToReservation = () => {
    router.push(withReservationViewer(`/reservations/${encodeURIComponent(reservationCode)}`, viewer));
  };

  const reservationHref = (code: string) =>
    withReservationViewer(`/reservations/${encodeURIComponent(code)}`, viewer);

  const notify = () => undefined;

  return (
    <ProductAdminShell
      activeMenu="예약관리"
      currentChild="예약목록"
      breadcrumb={
        <>
          <span>예약관리</span>
          <b>/</b>
          <span>예약상세</span>
          <b>/</b>
          <strong>정산서</strong>
        </>
      }
      onNotify={notify}
    >
      <main className="content member-web-detail-content settlement-doc-draft-content">
        <section className="page-head member-web-detail-page-head">
          <div>
            <p className="member-web-breadcrumb">예약관리 &gt; 예약상세 &gt; 정산서</p>
            <div className="member-web-detail-title-row">
              <h1>
                <FileSpreadsheet size={22} />
                상품 정산서
              </h1>
              {draft ? <span className={`badge ${draft.method === "individual" ? "info" : "warn"}`}>{draft.methodLabel}</span> : null}
            </div>
            <p className="member-web-detail-subtitle">
              {draft
                ? `${draft.productName || "-"} · ${draft.departureAt || "-"} · 원본 ${draft.sourceReservationCode}`
                : reservationCode || "예약 확인 중"}
            </p>
          </div>
          <div className="member-web-detail-actions">
            <ReservationViewerSwitch viewer={viewer} onChange={changeViewer} />
            <button type="button" className="secondary" onClick={backToReservation}>
              <ArrowLeft size={14} />
              예약 상세
            </button>
          </div>
        </section>

        {!method ? (
          <section className="panel member-web-detail-not-found">
            <strong>정산방식이 없습니다.</strong>
            <p>예약 상세에서 정산서를 눌러 개별정산 또는 통합정산을 선택해 주세요.</p>
            <button type="button" className="secondary" onClick={backToReservation}>
              <ArrowLeft size={14} />
              예약 상세로
            </button>
          </section>
        ) : !draft ? (
          <section className="panel member-web-detail-not-found">
            <strong>정산서를 열 수 없습니다.</strong>
            <p>예약을 찾을 수 없거나, 현재 조회 관점에서 접근할 수 없는 예약입니다.</p>
            <button type="button" className="secondary" onClick={backToReservation}>
              <ArrowLeft size={14} />
              예약 상세로
            </button>
          </section>
        ) : (
          sales && roster && (
            <SettlementDocumentShell
              view={draft}
              sales={sales}
              roster={roster}
              expenses={expenses}
              onExpensesChange={setExpenses}
              reservationHref={reservationHref}
            />
          )
        )}
      </main>
    </ProductAdminShell>
  );
}
