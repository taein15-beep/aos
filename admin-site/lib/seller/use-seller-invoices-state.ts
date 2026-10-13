"use client";

/**
 * 판매점 관리자 · 인보이스 Client State (목록 ↔ 상세 ↔ Summary 공유)
 * - 메모리 내 Module State — 새로고침 시 Mock 초기값으로 복귀 (LocalStorage 미사용)
 * - 재발행 Version · 발송이력은 누적만 하고 삭제하지 않음
 * - 공급여행사 취소처리 결과는 프로토타입 Mock (판매점 기능 아님) — 인보이스 계산에만 반영
 */

import { useMemo, useSyncExternalStore } from "react";
import {
  EMPTY_SELLER_INVOICE_CLIENT_STATE,
  buildSellerInvoices,
  getSellerInvoiceSendState,
  type SellerInvoice,
  type SellerInvoiceCancelOutcome,
  type SellerInvoiceClientState,
  type SellerInvoiceReissueReason,
  type SellerInvoiceSendChannel,
  type SellerInvoiceSendRecord,
} from "@/lib/seller/seller-invoices-data";
import { useSellerReservations } from "@/lib/seller/use-seller-reservations-state";

type State = Partial<Record<string, SellerInvoiceClientState>>;

const INITIAL_STATE: State = {};

let state = INITIAL_STATE;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL_STATE;

function update(sellerId: string, next: SellerInvoiceClientState) {
  state = { ...state, [sellerId]: next };
  listeners.forEach((listener) => listener());
}

/** 현재 판매점 인보이스 목록 — 예약 Client State + 인보이스 Client State 반영 */
export function useSellerInvoices(sellerId: string): SellerInvoice[] {
  const reservations = useSellerReservations(sellerId);
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const clientState = current[sellerId] ?? EMPTY_SELLER_INVOICE_CLIENT_STATE;
  return useMemo(() => buildSellerInvoices(sellerId, reservations, clientState), [sellerId, reservations, clientState]);
}

/** 인보이스 재발행 — 재발행 가능 상태에서만 같은 인보이스번호로 Version 1 증가 */
export function reissueSellerInvoice(
  sellerId: string,
  invoice: SellerInvoice,
  input: { issuedAt: string; reason: SellerInvoiceReissueReason; reasonDetail: string | null },
): boolean {
  if (invoice.reissue.kind !== "available") return false;
  const clientState = state[sellerId] ?? EMPTY_SELLER_INVOICE_CLIENT_STATE;
  const records = clientState.reissues[invoice.invoiceCode] ?? [];
  if (records.length + 1 !== invoice.currentVersion) return false;
  update(sellerId, {
    ...clientState,
    reissues: { ...clientState.reissues, [invoice.invoiceCode]: [...records, { ...input, snapshot: invoice.reissue.target }] },
  });
  return true;
}

/** 인보이스 발송 Mock — 현재 발송 가능한 Version만 · 채널별 발송이력 누적 (실제 전송 없음) */
export function sendSellerInvoice(
  sellerId: string,
  invoice: SellerInvoice,
  version: number,
  targets: readonly { channel: SellerInvoiceSendChannel; recipient: string }[],
  sentAt: string,
): boolean {
  if (targets.length === 0 || getSellerInvoiceSendState(invoice, version).kind !== "available") return false;
  const clientState = state[sellerId] ?? EMPTY_SELLER_INVOICE_CLIENT_STATE;
  const records = clientState.sends[invoice.invoiceCode] ?? [];
  const added: SellerInvoiceSendRecord[] = targets.map((target) => ({ ...target, sentAt, version, status: "발송완료" }));
  update(sellerId, { ...clientState, sends: { ...clientState.sends, [invoice.invoiceCode]: [...records, ...added] } });
  return true;
}

/** 공급여행사 취소처리 결과 Mock — 취소요청 → 취소승인 → 취소완료 순서만 허용 */
export function applySellerInvoiceCancelOutcome(
  sellerId: string,
  invoice: SellerInvoice,
  stage: SellerInvoiceCancelOutcome["stage"],
  feeRate: number,
  at: string,
): boolean {
  const clientState = state[sellerId] ?? EMPTY_SELLER_INVOICE_CLIENT_STATE;
  const existing = clientState.outcomes[invoice.reservationCode];
  let next: SellerInvoiceCancelOutcome;
  if (invoice.reservationStatus === "취소요청" && !existing) {
    next = { stage, feeRate, approvedAt: at, completedAt: stage === "취소완료" ? at : null };
  } else if (invoice.reservationStatus === "취소승인" && existing?.stage === "취소승인" && stage === "취소완료") {
    next = { ...existing, stage, completedAt: at };
  } else {
    return false;
  }
  update(sellerId, { ...clientState, outcomes: { ...clientState.outcomes, [invoice.reservationCode]: next } });
  return true;
}
