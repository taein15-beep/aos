"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Info, Lock } from "lucide-react";
import { ReservationActionDialog, type ReservationActionDialogState } from "@/components/reservations/ReservationSource";
import { SellerSettlementPaymentModal } from "@/components/settlements/SellerSettlementPaymentModal";
import { useQueryParam } from "@/components/settlements/SettlementParts";
import {
  SELLER_SETTLEMENT_SCENARIOS,
  SELLER_SETTLEMENT_SUPPLIER_NAME,
  applySellerSettlementCancelAdjustments,
  confirmSellerSettlementBySeller,
  formatSellerSettlementAmount as won,
  formatSellerSettlementSigned as signed,
  getSellerSettlementConfirmCheck,
  getSellerSettlementPaymentCheck,
  getSellerSettlementScenario,
  isSellerPayoutAccountUnregisteredMock,
  isSettlementLockedAfterPayment,
  listSellerSettlementsBySupplier,
  paySellerSettlement,
  reconfirmSellerSettlement,
  reissueSellerSettlementDocument,
  sellerSettlementPaymentBadgeClass,
  sellerSettlementReflectionBadgeClass,
  sellerSettlementStatusBadgeClass,
  setSellerPayoutAccountUnregisteredMock,
  setSellerSettlementScenario,
  summarizeSellerSettlements,
  useSellerSettlementStoreVersion,
  type SellerNextAdjustment,
  type SellerSettlement,
  type SellerSettlementLine,
  type SellerSettlementPaymentInput,
} from "@/lib/admin/seller-channel-settlements";
import { getSellerRegisteredInfo } from "@/lib/seller/seller-admin-profile";

const REFLECTION_LABELS: Record<SellerSettlementLine["reflection"], string> = {
  정상: "정상",
  반영완료: "정산 반영완료",
  반영대기: "반영대기",
  "차기정산 반영예정": "차기정산 반영예정",
  취소처리중: "취소처리중 · 미반영",
};

function dotted(value: string) {
  return value.replace(/-/g, ".");
}

function period(settlement: SellerSettlement) {
  return `${dotted(settlement.periodFrom)} ~ ${dotted(settlement.periodTo)}`;
}

function totalAdjustment(settlement: SellerSettlement) {
  return settlement.currentAdjustment + settlement.carriedAdjustment;
}

function StatusBadges({ settlement }: { settlement: SellerSettlement }) {
  return (
    <span className="reservation-status-stack">
      {settlement.status === "수정필요" || settlement.status === "재확인대기" ? (
        <span className="badge info">정산확정</span>
      ) : null}
      <span className={`badge ${sellerSettlementStatusBadgeClass(settlement.status)}`}>{settlement.status}</span>
      {settlement.outgoingAdjustments.length > 0 ? <span className="badge warn">차기정산 반영예정</span> : null}
      {settlement.incomingAdjustments.length > 0 ? <span className="badge warn">이전 정산 조정</span> : null}
    </span>
  );
}

function NextAdjustmentTable({ items, incoming }: { items: SellerNextAdjustment[]; incoming: boolean }) {
  return (
    <div className="member-web-table-wrap">
      <table className="member-web-table seller-settle-table">
        <thead>
          <tr>
            {["예약번호", "조정유형", "조정금액", "발생일", "반영상태", incoming ? "발생 정산" : "반영 정산", "사유"].map((title) => (
              <th key={title}>{title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td data-label="예약번호" className="member-number">
                {item.reservationCode}
              </td>
              <td data-label="조정유형">
                <span className="badge warn">{item.type}</span>
              </td>
              <td data-label="조정금액" className="amount-cell seller-settle-minus">
                {signed(item.amount)}
              </td>
              <td data-label="발생일" className="date-cell">
                {dotted(item.occurredAt)}
              </td>
              <td data-label="반영상태">
                <span className="badge warn">{item.status}</span>
              </td>
              <td data-label={incoming ? "발생 정산" : "반영 정산"} className="member-number">
                {incoming ? item.sourceSettlementCode : item.targetSettlementCode}
              </td>
              <td data-label="사유" className="text-left">
                {item.reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 판매점 수익 정산 (행복투어 → 그래가자) — 공급여행사 정산관리 탭 · 판매점 정산관리 공용
 * 공급여행사 관리자만 수정 Action 가능 · 판매점은 조회 전용
 */
export function SellerChannelSettlementPanel({
  audience,
  supplierName = SELLER_SETTLEMENT_SUPPLIER_NAME,
  sellerId,
  canManage = false,
  reservationHref,
  onNotify,
}: {
  audience: "supplier" | "seller";
  /** 정산을 관리하는 공급여행사 (공급여행사 관리자 관점) */
  supplierName?: string;
  sellerId?: string;
  canManage?: boolean;
  reservationHref: (code: string) => string;
  onNotify: (message: string) => void;
}) {
  const storeVersion = useSellerSettlementStoreVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const settlements = useMemo(() => listSellerSettlementsBySupplier(supplierName, sellerId), [supplierName, sellerId, storeVersion]);
  const [selectedCode, setSelectedCode] = useQueryParam("period", "STL-202610-HT-001");
  const [dialog, setDialog] = useState<ReservationActionDialogState | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const isScenarioSupplier = supplierName === SELLER_SETTLEMENT_SUPPLIER_NAME;
  const selected = settlements.find((item) => item.code === selectedCode) ?? settlements.find((item) => item.status !== "지급완료") ?? null;
  const summary = summarizeSellerSettlements(settlements);
  const isSeller = audience === "seller";

  if (!settlements.length) {
    return (
      <section className="panel member-web-list-panel">
        <div className="member-web-empty">
          <strong>정산 내역이 없습니다.</strong>
          <p>판매점 예약 정산이 생성되면 이 영역에 표시됩니다.</p>
        </div>
      </section>
    );
  }

  const run = (action: () => unknown, message: string) => {
    setDialog(null);
    if (action()) onNotify(message);
    else onNotify("처리할 수 없는 상태입니다. 정산 상태를 다시 확인해주세요.");
  };

  const check = selected ? getSellerSettlementConfirmCheck(selected) : null;
  const isCurrentEditable = Boolean(selected && canManage && !isSeller && selected.lines.length > 0 && selected.status !== "지급완료");
  const latestDoc = selected?.documents.find((doc) => doc.current) ?? null;
  const adjustedLines = selected?.lines.filter((line) => line.reflection !== "정상") ?? [];
  const pendingLines = adjustedLines.filter((line) => line.reflection === "반영대기");

  const openApply = (settlement: SellerSettlement) =>
    setDialog({
      title: "취소조정을 반영하시겠습니까?",
      details: [
        { label: "정산번호", value: settlement.code },
        { label: "반영 예약", value: pendingLines.map((line) => line.reservationCode).join(", ") },
        { label: "조정금액", value: signed(settlement.pendingAdjustment) },
        { label: "정산금액", value: `${won(settlement.finalAmount)} → ${won(settlement.finalAmount + settlement.pendingAdjustment)}` },
      ],
      notes: [
        "예약 당시 판매점 수익(Snapshot) 기준으로 차감합니다. 환불금액 · 취소수수료와는 별개입니다.",
        "반영 후에도 상태는 수정필요로 유지되며, 정산서 재발행과 판매점 재확인이 필요합니다.",
      ],
      confirmLabel: "취소조정 반영",
      onConfirm: () => run(() => applySellerSettlementCancelAdjustments(settlement.code), "취소조정이 반영되었습니다."),
    });

  const openReissue = (settlement: SellerSettlement) => {
    const nextVersion = (latestDoc?.version ?? 1) + 1;
    setDialog({
      title: "정산서를 재발행하시겠습니까?",
      details: [
        { label: "정산번호", value: settlement.code },
        { label: "기존 정산서", value: latestDoc ? `v${latestDoc.version} · ${won(latestDoc.amount)}` : "-" },
        { label: "재발행 정산서", value: `v${nextVersion} · ${won(settlement.finalAmount)}` },
      ],
      notes: [
        `기존 정산서 v${latestDoc?.version ?? 1}은 삭제되지 않고 이력으로 보관됩니다.`,
        "재발행 후 판매점 재확인대기 상태가 됩니다.",
        "이번 Prototype에서는 실제 PDF 생성 · 발송 없이 Mock 상태만 변경됩니다.",
      ],
      confirmLabel: "정산서 재발행",
      onConfirm: () =>
        run(() => reissueSellerSettlementDocument(settlement.code), `정산서 v${nextVersion} 재발행이 완료되었습니다. 판매점 재확인대기 상태입니다.`),
    });
  };

  const openSellerConfirm = (settlement: SellerSettlement) =>
    setDialog({
      title: "판매점 정산 확인을 처리하시겠습니까?",
      details: [
        { label: "판매점", value: settlement.sellerName },
        { label: "정산서", value: latestDoc ? `v${latestDoc.version} · ${won(latestDoc.amount)}` : "-" },
      ],
      notes: [`판매점(${settlement.sellerName})이 재발행 정산서를 확인했다고 가정하는 Mock Action입니다.`],
      confirmLabel: "정산 확인",
      onConfirm: () => run(() => confirmSellerSettlementBySeller(settlement.code), "판매점 정산 확인이 처리되었습니다."),
    });

  const openReconfirm = (settlement: SellerSettlement) =>
    setDialog({
      title: "정산을 확정하시겠습니까?",
      details: [
        { label: "정산번호", value: settlement.code },
        { label: "정산서", value: latestDoc ? `v${latestDoc.version}` : "-" },
        { label: "최종 정산금액", value: won(settlement.finalAmount) },
      ],
      notes: ["확정 후 지급대기 상태가 됩니다. 실제 지급 · 계좌이체는 실행되지 않습니다.", ...(check?.warnings ?? [])],
      confirmLabel: "정산확정",
      onConfirm: () => run(() => reconfirmSellerSettlement(settlement.code), "정산이 다시 확정되었습니다."),
    });

  const paymentCheck = selected ? getSellerSettlementPaymentCheck(selected) : null;
  const canPay = Boolean(selected && canManage && !isSeller && paymentCheck?.canPay);
  const sellerInfo = selected ? getSellerRegisteredInfo(selected.sellerId) : null;

  const requestPayment = (settlement: SellerSettlement, input: SellerSettlementPaymentInput) =>
    setDialog({
      title: "정산금을 지급완료 처리하시겠습니까?",
      details: [
        { label: "판매점", value: `${settlement.sellerName} (${settlement.sellerId})` },
        { label: "정산번호", value: settlement.code },
        { label: "지급금액", value: won(settlement.finalAmount) },
        { label: "지급방법", value: input.method },
        { label: "지급일", value: dotted(input.paymentDate) },
      ],
      notes: ["이번 Prototype에서는 실제 계좌이체 없이 지급상태만 변경됩니다."],
      confirmLabel: "지급처리",
      onConfirm: () => {
        setDialog(null);
        const payment = paySellerSettlement(settlement.code, supplierName, input);
        setPaymentOpen(false);
        onNotify(
          payment
            ? "정산 지급처리가 완료되었습니다. 판매점에서 지급완료 내역을 확인할 수 있습니다."
            : "지급처리할 수 없는 상태입니다. 정산 상태를 다시 확인해주세요.",
        );
      },
    });

  return (
    <>
      {!isSeller && (
        <fieldset className="seller-dash-mock seller-settle-mock">
          <legend>{isScenarioSupplier ? "프로토타입 Mock 시나리오 · 10월 1차 정산의 취소 발생 전 상태" : "프로토타입 Mock"}</legend>
          {isScenarioSupplier && (
          <div role="radiogroup" aria-label="정산 Mock 시나리오">
            {SELLER_SETTLEMENT_SCENARIOS.map((item) => (
              <label key={item.key} className={item.key === getSellerSettlementScenario() ? "is-selected" : undefined}>
                <input
                  type="radio"
                  name="seller-settlement-scenario"
                  value={item.key}
                  checked={item.key === getSellerSettlementScenario()}
                  disabled={!canManage}
                  onChange={() => {
                    setSellerSettlementScenario(item.key);
                    onNotify(`정산 Mock 시나리오를 '${item.label}'(으)로 변경했습니다.`);
                  }}
                />
                {item.label}
              </label>
            ))}
          </div>
          )}
          <div className="seller-settle-mock-options">
            <label className={isSellerPayoutAccountUnregisteredMock() ? "is-selected" : undefined}>
              <input
                type="checkbox"
                name="seller-settlement-account-unregistered"
                checked={isSellerPayoutAccountUnregisteredMock()}
                disabled={!canManage}
                onChange={(event) => {
                  setSellerPayoutAccountUnregisteredMock(event.target.checked);
                  onNotify(event.target.checked ? "판매점 지급계좌 미등록 Mock을 적용했습니다." : "판매점 지급계좌 미등록 Mock을 해제했습니다.");
                }}
              />
              판매점 지급계좌 미등록 (QA)
            </label>
          </div>
        </fieldset>
      )}

      <section className="seller-settle-summary" aria-label="판매점 정산 요약">
        <div>
          <span>{isSeller ? "받을 정산금액 (지급 전)" : "판매점 지급예정"}</span>
          <strong>{won(summary.scheduledAmount)}</strong>
        </div>
        <div>
          <span>차기정산 조정</span>
          <strong className={summary.nextAdjustment < 0 ? "seller-settle-minus" : undefined}>{signed(summary.nextAdjustment)}</strong>
        </div>
        <div>
          <span>지급완료</span>
          <strong>{won(summary.paidAmount)}</strong>
        </div>
      </section>

      <section className="panel member-web-list-panel">
        <div className="member-web-list-head">
          <div>
            <strong>
              판매점 수익 정산 <b>{settlements.length}</b>건
            </strong>
            <span>
              {settlements[0].supplierName} → {settlements[0].sellerName} · 예약 당시 판매점 수익(Snapshot) 기준 · SAMPLE
            </span>
          </div>
        </div>
        <div className="member-web-table-wrap">
          <table className="member-web-table seller-settle-table">
            <thead>
              <tr>
                {["정산번호", "정산기간", "정산 원금", "취소/조정", "최종 정산금액", "정산상태", isSeller ? "지급일" : "정산예정일 / 지급일", "상세"].map(
                  (title) => (
                    <th key={title}>{title}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {settlements.map((item) => (
                <tr key={item.code} className={item.code === selected?.code ? "is-selected" : undefined}>
                  <td data-label="정산번호" className="member-number">
                    {item.code}
                  </td>
                  <td data-label="정산기간" className="date-cell">
                    <span className="seller-settle-period">
                      <b>{item.label}</b>
                      <small>{period(item)}</small>
                    </span>
                  </td>
                  <td data-label="정산 원금" className="amount-cell">
                    {won(item.principal)}
                  </td>
                  <td data-label="취소/조정" className={`amount-cell ${totalAdjustment(item) < 0 ? "seller-settle-minus" : ""}`}>
                    {signed(totalAdjustment(item))}
                    {item.pendingAdjustment !== 0 ? <small className="seller-settle-sub">반영대기 {signed(item.pendingAdjustment)}</small> : null}
                  </td>
                  <td data-label="최종 정산금액" className="amount-cell">
                    <b>{won(item.paidAmount ?? item.finalAmount)}</b>
                    {item.outgoingAdjustments.length ? (
                      <small className="seller-settle-sub">
                        차기 {signed(item.outgoingAdjustments.reduce((total, next) => total + next.amount, 0))}
                      </small>
                    ) : null}
                  </td>
                  <td data-label="정산상태">
                    <StatusBadges settlement={item} />
                  </td>
                  <td data-label={isSeller ? "지급일" : "정산예정일 / 지급일"} className="date-cell">
                    <span className="seller-settle-period">
                      <b>{item.paidAt ? `${dotted(item.paidAt.slice(0, 10))} 지급` : isSeller ? "-" : `${dotted(item.dueDate)} 예정`}</b>
                      <small>
                        <span className={`badge ${sellerSettlementPaymentBadgeClass(item.paymentStatus)}`}>{item.paymentStatus}</span>
                      </small>
                    </span>
                  </td>
                  <td data-label="상세">
                    <button
                      type="button"
                      className="member-detail-button"
                      aria-pressed={item.code === selected?.code}
                      onClick={() => {
                        setSelectedCode(item.code);
                        setShowAll(false);
                      }}
                    >
                      {item.code === selected?.code ? "선택됨" : "상세보기"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <section className="panel seller-settle-detail" aria-labelledby="seller-settle-detail-title">
          <div className="seller-settle-detail-head">
            <div>
              <h2 id="seller-settle-detail-title">
                {selected.label} 정산 <small>{selected.code}</small>
              </h2>
              <p>
                {period(selected)} · {selected.supplierName} → {selected.sellerName} ({selected.sellerId})
              </p>
            </div>
            <span className="reservation-status-stack">
              <StatusBadges settlement={selected} />
              <span className={`badge ${sellerSettlementPaymentBadgeClass(selected.paymentStatus)}`}>{selected.paymentStatus}</span>
              {latestDoc ? <span className="badge gray">정산서 v{latestDoc.version}</span> : null}
            </span>
          </div>

          <div className="seller-settle-amounts">
            <div>
              <span>정산 원금</span>
              <strong>{won(selected.principal)}</strong>
              <small>예약 당시 판매점 수익 합계</small>
            </div>
            <div>
              <span>{selected.carriedAdjustment !== 0 ? "취소/조정 (이전 정산 포함)" : "취소/조정"}</span>
              <strong className={totalAdjustment(selected) < 0 ? "seller-settle-minus" : undefined}>{signed(totalAdjustment(selected))}</strong>
              <small>
                {selected.pendingAdjustment !== 0 ? `반영대기 ${signed(selected.pendingAdjustment)}` : selected.carriedAdjustment !== 0 ? `이월 ${signed(selected.carriedAdjustment)}` : "취소완료 예약 판매점 수익 차감"}
              </small>
            </div>
            <div className="is-total">
              <span>{selected.paidAmount !== null ? "지급완료 금액" : isSeller ? "받을 정산금액" : "최종 정산금액"}</span>
              <strong>{won(selected.paidAmount ?? selected.finalAmount)}</strong>
              <small>{selected.paidAt ? `${dotted(selected.paidAt)} 지급 · 변경 없음` : `정산예정일 ${dotted(selected.dueDate)}`}</small>
            </div>
          </div>

          {selected.status === "수정필요" && (
            <div className="product-share-setting-alert reservation-permission-alert seller-cancel-alert" role="alert">
              <AlertTriangle size={14} />
              <div>
                <strong>정산확정 이후 취소완료 예약이 발생했습니다.</strong>
                <p>
                  {selected.pendingAdjustment !== 0
                    ? `취소금액 반영 후 정산서를 재확인해야 합니다. (반영대기 ${signed(selected.pendingAdjustment)})`
                    : "취소조정이 반영되었습니다. 정산서를 재발행한 뒤 판매점 재확인을 받아야 합니다."}
                </p>
              </div>
            </div>
          )}
          {selected.status === "재확인대기" && (
            <div className="product-share-setting-alert reservation-permission-alert is-info seller-cancel-alert" role="status">
              <Info size={14} />
              <div>
                <strong>정산서 v{latestDoc?.version} 재발행 · 판매점 재확인대기</strong>
                <p>
                  {selected.sellerConfirmed
                    ? "판매점 확인이 완료되었습니다. 정산확정을 진행할 수 있습니다."
                    : `${selected.sellerName}의 정산 확인 후 다시 정산확정할 수 있습니다.`}
                </p>
              </div>
            </div>
          )}
          {selected.outgoingAdjustments.length > 0 && (
            <div className="product-share-setting-alert reservation-permission-alert is-info seller-cancel-alert" role="status">
              <Info size={14} />
              <div>
                <strong>지급완료 이후 취소완료 예약이 발생했습니다.</strong>
                <p>
                  기존 지급금액 {won(selected.paidAmount ?? 0)}은 변경하지 않고, 차기정산({selected.outgoingAdjustments[0].targetSettlementCode})에서{" "}
                  {signed(selected.outgoingAdjustments.reduce((total, item) => total + item.amount, 0))} 차감합니다.
                </p>
              </div>
            </div>
          )}

          {!isSeller && selected.lines.length > 0 && (
            <div className="seller-settle-actions">
              {selected.status === "지급완료" ? (
                <p>
                  <Lock size={12} aria-hidden="true" />
                  지급완료된 정산은 수정 · 재발행할 수 없습니다. 이후 조정은 차기정산에서 처리합니다.
                </p>
              ) : (
                <>
                  <div>
                    {selected.status === "수정필요" && selected.pendingAdjustment !== 0 && (
                      <button type="button" className="primary" disabled={!isCurrentEditable} onClick={() => openApply(selected)}>
                        취소조정 반영
                      </button>
                    )}
                    {selected.status === "수정필요" && selected.pendingAdjustment === 0 && (
                      <button type="button" className="primary" disabled={!isCurrentEditable} onClick={() => openReissue(selected)}>
                        정산서 재발행
                      </button>
                    )}
                    {selected.status === "재확인대기" && !selected.sellerConfirmed && (
                      <button type="button" className="secondary" disabled={!isCurrentEditable} onClick={() => openSellerConfirm(selected)}>
                        정산 확인 (판매점 확인 Mock)
                      </button>
                    )}
                    {selected.status !== "정산확정" && (
                      <button
                        type="button"
                        className="primary"
                        disabled={!isCurrentEditable || !check?.canConfirm}
                        title={check?.blockers.join(" / ")}
                        onClick={() => openReconfirm(selected)}
                      >
                        정산확정
                      </button>
                    )}
                    {selected.status === "정산확정" && <span className="badge info">지급대기 · 아래 지급정보에서 지급처리</span>}
                  </div>
                  {check && (check.blockers.length > 0 || check.warnings.length > 0) && selected.status !== "정산확정" && (
                    <ul className="seller-settle-checks">
                      {check.blockers.map((text) => (
                        <li key={text} className="is-blocker">
                          {text}
                        </li>
                      ))}
                      {check.warnings.map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  )}
                  {!canManage && <p>정산 수정은 공급여행사({selected.supplierName}) 관리자 관점에서 진행할 수 있습니다.</p>}
                </>
              )}
            </div>
          )}

          {!isSeller && paymentCheck && (
            <div className="seller-settle-block seller-pay-block" aria-labelledby="seller-pay-block-title">
              <h3 id="seller-pay-block-title">지급정보</h3>
              <div className="seller-pay-grid">
                <section aria-label="판매점 정보">
                  <h4>판매점</h4>
                  <dl>
                    <div>
                      <dt>판매점명</dt>
                      <dd>{selected.sellerName}</dd>
                    </div>
                    <div>
                      <dt>판매점코드</dt>
                      <dd>{selected.sellerId}</dd>
                    </div>
                    <div>
                      <dt>대표자</dt>
                      <dd>{sellerInfo?.representative ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>담당자</dt>
                      <dd>{sellerInfo?.contactName ?? "-"}</dd>
                    </div>
                  </dl>
                </section>
                <section aria-label="지급계좌">
                  <h4>지급계좌</h4>
                  {paymentCheck.account ? (
                    <dl>
                      <div>
                        <dt>예금주</dt>
                        <dd>{paymentCheck.account.holder}</dd>
                      </div>
                      <div>
                        <dt>은행</dt>
                        <dd>{paymentCheck.account.bank}</dd>
                      </div>
                      <div>
                        <dt>계좌번호</dt>
                        <dd>{paymentCheck.account.maskedNumber}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="seller-pay-empty">판매점 지급계좌가 등록되어 있지 않습니다.</p>
                  )}
                  <p className="seller-settle-note">
                    <Lock size={11} aria-hidden="true" /> 조회 전용 · 계좌번호 일부 Masking
                  </p>
                </section>
                <section aria-label="지급상태" className="seller-pay-status">
                  <h4>
                    지급상태 <span className={`badge ${sellerSettlementPaymentBadgeClass(selected.paymentStatus)}`}>{selected.paymentStatus}</span>
                  </h4>
                  {selected.payment ? (
                    <dl>
                      <div className="is-total">
                        <dt>지급금액</dt>
                        <dd>{won(selected.payment.amount)}</dd>
                      </div>
                      <div>
                        <dt>지급일</dt>
                        <dd>{dotted(selected.payment.paymentDate)}</dd>
                      </div>
                      <div>
                        <dt>지급방법</dt>
                        <dd>{selected.payment.method}</dd>
                      </div>
                      <div>
                        <dt>지급참조번호</dt>
                        <dd>{selected.payment.reference ?? "-"}</dd>
                      </div>
                      <div>
                        <dt>처리자</dt>
                        <dd>
                          {selected.payment.paidBy} <small>{dotted(selected.payment.processedAt)}</small>
                        </dd>
                      </div>
                      <div>
                        <dt>지급기준</dt>
                        <dd>정산서 v{selected.payment.statementVersion}</dd>
                      </div>
                      {selected.payment.memo ? (
                        <div>
                          <dt>지급메모</dt>
                          <dd>{selected.payment.memo}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : (
                    <dl>
                      <div className="is-total">
                        <dt>지급예정금액</dt>
                        <dd>{selected.status === "정산대기" ? "정산확정 후 확정" : won(paymentCheck.amount)}</dd>
                      </div>
                      <div>
                        <dt>정산예정일</dt>
                        <dd>{dotted(selected.dueDate)}</dd>
                      </div>
                      <div>
                        <dt>지급기준</dt>
                        <dd>{paymentCheck.version ? `정산서 v${paymentCheck.version} (현재 유효)` : "정산서 미발행"}</dd>
                      </div>
                    </dl>
                  )}
                  {isSettlementLockedAfterPayment(selected) ? (
                    <p className="seller-settle-note">
                      <Lock size={11} aria-hidden="true" /> 지급완료된 정산은 금액 · 조정 · 정산서 Version을 변경할 수 없습니다. 이후 취소는 차기정산에서 차감합니다.
                    </p>
                  ) : selected.status === "정산확정" ? (
                    <div className="seller-pay-action">
                      <button type="button" className="primary" disabled={!canPay} onClick={() => setPaymentOpen(true)}>
                        지급처리
                      </button>
                      {paymentCheck.blockers.length > 0 ? (
                        <ul className="seller-settle-checks">
                          {paymentCheck.blockers.map((text) => (
                            <li key={text} className="is-blocker">
                              {text}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {!canManage && <p className="seller-settle-note">지급처리는 공급여행사({selected.supplierName}) 관리자 관점에서 진행할 수 있습니다.</p>}
                    </div>
                  ) : (
                    <p className="seller-settle-note">{paymentCheck.blockers[0] ?? "지급처리할 수 없는 상태입니다."}</p>
                  )}
                </section>
              </div>
            </div>
          )}

          {selected.lines.length > 0 && (
            <div className="seller-settle-block">
              <h3>
                취소조정 내역 <b>{adjustedLines.length}</b>건
              </h3>
              {adjustedLines.length ? (
                <div className="member-web-table-wrap">
                  <table className="member-web-table seller-settle-table seller-settle-adjust-table">
                    <thead>
                      <tr>
                        {["예약번호", "상품", "판매점", "기존 수익", "조정금액", "최종 정산금액", "조정사유", "반영상태"].map((title) => (
                          <th key={title}>{title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adjustedLines.map((line) => {
                        const adjustment = line.adjustment || line.pendingAdjustment || (line.reflection === "차기정산 반영예정" ? -line.originalProfit : 0);
                        return (
                          <tr key={line.reservationCode}>
                            <td data-label="예약번호" className="member-number">
                              <Link href={reservationHref(line.reservationCode)} className="reservation-code-link">
                                {line.reservationCode}
                              </Link>
                            </td>
                            <td data-label="상품" className="text-left">
                              <span className="seller-settle-period">
                                <b>{line.productName}</b>
                                <small>{line.saleMode}</small>
                              </span>
                            </td>
                            <td data-label="판매점">{selected.sellerName}</td>
                            <td data-label="기존 수익" className="amount-cell">
                              {won(line.originalProfit)}
                            </td>
                            <td data-label="조정금액" className={`amount-cell ${adjustment < 0 ? "seller-settle-minus" : ""}`}>
                              {line.reflection === "취소처리중" ? "미반영" : signed(adjustment)}
                              {line.reflection === "반영대기" ? <small className="seller-settle-sub">반영 전</small> : null}
                              {line.reflection === "차기정산 반영예정" ? <small className="seller-settle-sub">차기정산</small> : null}
                            </td>
                            <td data-label="최종 정산금액" className="amount-cell">
                              {won(line.finalProfit)}
                            </td>
                            <td data-label="조정사유" className="text-left">
                              <span className="seller-settle-period">
                                <b>{line.reflection === "취소처리중" ? `${line.reserveStatus} · 취소완료 전` : "예약 취소완료"}</b>
                                <small>
                                  {line.reflection === "취소처리중"
                                    ? `${line.refundNote ?? "취소처리중"} · 취소완료 후 정산조정`
                                    : `${line.refundNote ?? "환불정보 없음"}${line.cancelledAt ? ` · ${dotted(line.cancelledAt)}` : ""}`}
                                </small>
                              </span>
                            </td>
                            <td data-label="반영상태">
                              <span className="reservation-status-stack">
                                <span className={`badge ${sellerSettlementReflectionBadgeClass(line.reflection)}`}>{REFLECTION_LABELS[line.reflection]}</span>
                                {line.adjustment !== 0 || line.pendingAdjustment !== 0 ? <span className="badge warn">취소조정</span> : null}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="seller-settle-empty">취소조정 내역이 없습니다.</p>
              )}
              <p className="seller-settle-note">
                정산 차감액은 예약 당시 판매점 수익입니다. 환불금액(고객에게 돌려준 금액)과 다르며, 취소수수료의 정산 배분은 별도 정책으로 처리됩니다.
              </p>
            </div>
          )}

          {(selected.outgoingAdjustments.length > 0 || selected.incomingAdjustments.length > 0) && (
            <div className="seller-settle-block">
              <h3>차기정산 조정</h3>
              {selected.outgoingAdjustments.length > 0 && <NextAdjustmentTable items={selected.outgoingAdjustments} incoming={false} />}
              {selected.incomingAdjustments.length > 0 && (
                <>
                  <NextAdjustmentTable items={selected.incomingAdjustments} incoming />
                  <p className="seller-settle-note">
                    정산 원금 {won(selected.principal)} {signed(selected.carriedAdjustment)} = 최종 {won(selected.finalAmount)} · 각 조정은 이 정산에 한 번만 반영됩니다.
                  </p>
                </>
              )}
            </div>
          )}

          <div className="seller-settle-block">
            <h3>
              정산 대상 예약 <b>{selected.lines.length + 1}</b>건
            </h3>
            {selected.lines.length > 0 && (
              <button type="button" className="secondary seller-settle-toggle" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>
                {showAll ? "예약별 내역 접기" : `예약별 내역 보기 (${selected.lines.length}건)`}
              </button>
            )}
            {showAll && (
              <div className="member-web-table-wrap">
                <table className="member-web-table seller-settle-table">
                  <thead>
                    <tr>
                      {["예약번호", "예약일", "상품", "예약상태", "기존 수익", "조정금액", "최종 정산금액", "반영상태"].map((title) => (
                        <th key={title}>{title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((line) => (
                      <tr key={line.reservationCode}>
                        <td data-label="예약번호" className="member-number">
                          <Link href={reservationHref(line.reservationCode)} className="reservation-code-link">
                            {line.reservationCode}
                          </Link>
                        </td>
                        <td data-label="예약일" className="date-cell">
                          {dotted(line.reservedAt)}
                        </td>
                        <td data-label="상품" className="text-left">
                          {line.productName}
                        </td>
                        <td data-label="예약상태">{line.reserveStatus}</td>
                        <td data-label="기존 수익" className="amount-cell">
                          {won(line.originalProfit)}
                        </td>
                        <td data-label="조정금액" className={`amount-cell ${line.adjustment < 0 ? "seller-settle-minus" : ""}`}>
                          {signed(line.adjustment)}
                        </td>
                        <td data-label="최종 정산금액" className="amount-cell">
                          {won(line.finalProfit)}
                        </td>
                        <td data-label="반영상태">
                          <span className={`badge ${sellerSettlementReflectionBadgeClass(line.reflection)}`}>{REFLECTION_LABELS[line.reflection]}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="seller-settle-note">
              기타 정상 예약 {selected.otherReservations.count}건 · 판매점 수익 {won(selected.otherReservations.profit)} (SAMPLE 집계 · 예약별 Mock 미포함)
            </p>
          </div>

          <div className="seller-settle-bottom">
            <div className="seller-settle-block">
              <h3>정산서 버전</h3>
              {selected.documents.length ? (
                <ol className="seller-settle-docs">
                  {selected.documents.map((doc) => (
                    <li key={doc.version} className={doc.current ? "is-current" : undefined}>
                      <b>v{doc.version}</b>
                      <span>{won(doc.amount)}</span>
                      <small>
                        {dotted(doc.issuedAt)} · {doc.issuedBy}
                      </small>
                      <span className={`badge ${doc.current ? "info" : "gray"}`}>{doc.current ? "현재 버전" : "이전 버전 보관"}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="seller-settle-empty">정산확정 전으로 발행된 정산서가 없습니다.</p>
              )}
            </div>
            <div className="seller-settle-block">
              <h3>정산 Timeline</h3>
              <ol className="seller-cancel-timeline" aria-label="정산 Timeline">
                {selected.events.map((event, index) => (
                  <li key={`${event.at}-${event.label}-${index}`}>
                    <time>{dotted(event.at)}</time>
                    <span className={`badge ${event.tone}`}>{event.label}</span>
                    <b>{event.actor}</b>
                    {event.note ? <small>{event.note}</small> : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {paymentOpen && selected && paymentCheck?.canPay ? (
        <SellerSettlementPaymentModal
          settlement={selected}
          check={paymentCheck}
          suspended={Boolean(dialog)}
          onClose={() => setPaymentOpen(false)}
          onSubmit={(input) => requestPayment(selected, input)}
        />
      ) : null}
      <ReservationActionDialog dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}
