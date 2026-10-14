"use client";

/**
 * 판매점 관리자 · 예약 Client State (목록 ↔ 상세 ↔ Summary 공유)
 * - 메모리 내 Module State — 새로고침 시 Mock 초기값으로 복귀 (LocalStorage 미사용)
 * - 판매점은 취소요청 등록까지만 가능 · 승인/거절/환불/취소완료는 공급여행사 처리
 * - 취소요청은 공급여행사 관리자와 같은 Store(seller-cancel-request-store)를 사용
 * - 공급여행사 처리결과(취소승인 · 거절 · 환불)는 공급여행사 예약 Data에서 읽어 덮어씀
 */

import { useMemo, useSyncExternalStore } from "react";
import { getReservationDetail } from "@/lib/admin/reservations-data";
import {
  addSellerCancelRequest,
  getSellerCancelRequestState,
  getSellerCancelRequests,
  subscribeSellerCancelRequests,
} from "@/lib/seller/seller-cancel-request-store";
import {
  applySellerReservationCancelRequests,
  getSellerReservationDetail,
  isSellerReservationCancellable,
  listSellerReservations,
  type SellerReservation,
  type SellerReservationCancelRequestEntry,
  type SellerReservationCancelRequestMap,
  type SellerReservationDetail,
  type SellerReservationStatus,
} from "@/lib/seller/seller-reservations-data";

const EMPTY_REQUESTS: SellerReservationCancelRequestMap = {};
const getServerSnapshot = () => ({});

function useCancelRequests(sellerId: string) {
  const current = useSyncExternalStore(subscribeSellerCancelRequests, getSellerCancelRequestState, getServerSnapshot);
  return (current as Partial<Record<string, SellerReservationCancelRequestMap>>)[sellerId] ?? EMPTY_REQUESTS;
}

/* ───────────── 공급여행사 취소처리 결과 ───────────── */

export type SellerSupplierCancelProgress =
  | { kind: "approved"; at: string; supplierName: string; cancelFee: number; refundAmount: number; refundFailed: boolean }
  | { kind: "completed"; at: string; approvedAt: string; supplierName: string; cancelFee: number; refundAmount: number; refunded: boolean }
  | { kind: "rejected"; at: string; supplierName: string; restoredStatus: SellerReservationStatus; reason: string };

/** 공급여행사 관리자 예약과 연동된 판매점 예약인지 — 연동 예약은 취소처리 결과를 공급여행사 Data에서만 읽음 */
export function isSellerReservationSupplierLinked(sellerId: string, reservationCode: string) {
  const source = getReservationDetail(reservationCode)?.source;
  return source?.type === "seller" && source.sellerCode === sellerId;
}

/** 공급여행사 관리자에서 처리한 판매점 취소요청 결과 — 판매점 취소요청이 없거나 검토대기면 null */
export function getSellerSupplierCancelProgress(sellerId: string, reservationCode: string): SellerSupplierCancelProgress | null {
  const reservation = getReservationDetail(reservationCode);
  const request = reservation?.source?.type === "seller" && reservation.source.sellerCode === sellerId ? reservation.sellerCancelRequest : undefined;
  if (!reservation || !request) return null;
  const supplierName = reservation.source?.supplierAgencyName ?? "공급여행사";
  if (request.status === "취소거절" && request.rejection) {
    const { reason, reasonDetail, processedAt } = request.rejection;
    return {
      kind: "rejected",
      at: processedAt,
      supplierName,
      restoredStatus: request.previousReservationStatus === "예약접수" ? "예약접수" : "예약확정",
      reason: reasonDetail ? `${reason} · ${reasonDetail}` : reason,
    };
  }
  if (!request.approval) return null;
  const cancelFee = request.approval.cancellationFee;
  if (request.status === "취소완료") {
    const refunded = request.refund?.status === "환불완료";
    return {
      kind: "completed",
      at: request.refund?.completedAt ?? request.approval.processedAt,
      approvedAt: request.approval.processedAt,
      supplierName,
      cancelFee,
      refundAmount: refunded ? (request.refund?.amount ?? 0) : 0,
      refunded,
    };
  }
  return {
    kind: "approved",
    at: request.approval.processedAt,
    supplierName,
    cancelFee,
    refundAmount: request.approval.refundAmount,
    refundFailed: request.refund?.status === "환불실패",
  };
}

function progressStatus(row: SellerReservation, progress: SellerSupplierCancelProgress | null): SellerReservation {
  if (!progress || row.status !== "취소요청") return row;
  if (progress.kind === "rejected") return { ...row, status: progress.restoredStatus };
  if (progress.kind === "approved") return { ...row, status: "취소승인" };
  return { ...row, status: "취소완료", paymentStatus: progress.refunded ? "환불완료" : row.paymentStatus };
}

function applyProgressToDetail(detail: SellerReservationDetail, progress: SellerSupplierCancelProgress | null): SellerReservationDetail {
  const cancel = detail.cancelRequest;
  if (!progress || !cancel || detail.status !== "취소요청") return detail;
  const next = progressStatus(detail, progress) as SellerReservationDetail;
  if (progress.kind === "rejected") {
    return {
      ...next,
      statusHistory: [...detail.statusHistory, { at: progress.at, status: progress.restoredStatus, note: `${progress.supplierName} 취소거절 · ${progress.reason}` }],
      cancelRequest: { ...cancel, processStatus: "취소거절", completedAt: progress.at, rejectReason: progress.reason },
    };
  }
  const fees = `취소수수료 ${progress.cancelFee.toLocaleString("ko-KR")}원`;
  const history = [...detail.statusHistory];
  if (progress.kind === "approved") {
    history.push({
      at: progress.at,
      status: "취소승인",
      note: `${progress.supplierName} 취소승인 · ${fees} · 환불예정 ${progress.refundAmount.toLocaleString("ko-KR")}원${progress.refundFailed ? " · 환불실패(재처리 대기)" : ""}`,
    });
    return {
      ...next,
      statusHistory: history,
      cancelRequest: { ...cancel, processStatus: "취소승인", completedAt: progress.at, refundAmount: progress.refundAmount, cancelFee: progress.cancelFee, refundFailed: progress.refundFailed },
    };
  }
  history.push({ at: progress.at, status: "취소완료", note: `${progress.supplierName} 취소완료 · ${fees}${progress.refunded ? ` · 환불 ${progress.refundAmount.toLocaleString("ko-KR")}원` : " · 환불 없음"}` });
  return {
    ...next,
    refundAmount: progress.refundAmount,
    payments: progress.refunded
      ? [...detail.payments, { at: progress.at, type: "환불", amount: progress.refundAmount, result: "완료" }]
      : detail.payments,
    statusHistory: history,
    cancelRequest: { ...cancel, processStatus: "취소완료", completedAt: progress.at, refundAmount: progress.refundAmount, cancelFee: progress.cancelFee },
  };
}

/** 판매점 예약 목록 (취소요청만 반영) — 인보이스 계산용 */
export function useSellerReservationsWithRequests(sellerId: string) {
  const requests = useCancelRequests(sellerId);
  return useMemo(() => applySellerReservationCancelRequests(listSellerReservations(sellerId), requests), [sellerId, requests]);
}

/** 현재 판매점 예약 목록 (취소요청 · 공급여행사 처리결과 반영, 최신 예약순) */
export function useSellerReservations(sellerId: string) {
  const rows = useSellerReservationsWithRequests(sellerId);
  return useMemo(() => rows.map((row) => progressStatus(row, getSellerSupplierCancelProgress(sellerId, row.reservationCode))), [sellerId, rows]);
}

/** 예약 상세 (취소요청 · 공급여행사 처리결과 반영) — 없는 예약번호는 null */
export function useSellerReservationDetail(sellerId: string, reservationCode: string) {
  const requests = useCancelRequests(sellerId);
  return useMemo(() => {
    const detail = getSellerReservationDetail(sellerId, reservationCode, requests);
    return detail ? applyProgressToDetail(detail, getSellerSupplierCancelProgress(sellerId, reservationCode)) : null;
  }, [sellerId, reservationCode, requests]);
}

/** 판매점 취소요청 등록 — 예약접수 · 예약확정만 가능, 중복 등록 불가 */
export function registerSellerReservationCancelRequest(
  sellerId: string,
  reservationCode: string,
  entry: SellerReservationCancelRequestEntry,
): boolean {
  const requests = getSellerCancelRequests(sellerId);
  const reservation = getSellerReservationDetail(sellerId, reservationCode, requests);
  if (!reservation || requests[reservationCode] || !isSellerReservationCancellable(reservation.status)) return false;
  addSellerCancelRequest(sellerId, reservationCode, entry);
  return true;
}
