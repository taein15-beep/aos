"use client";

/**
 * 판매점 관리자 · 예약 Client State (목록 ↔ 상세 ↔ Summary 공유)
 * - 메모리 내 Module State — 새로고침 시 Mock 초기값으로 복귀 (LocalStorage 미사용)
 * - 판매점은 취소요청 등록까지만 가능 · 승인/거절/환불/취소완료는 공급여행사 처리 (후속 단계)
 * - 예약 원본 Mock은 변경하지 않고 판매점별 취소요청만 보관 → 원본 위에 덮어서 계산
 */

import { useMemo, useSyncExternalStore } from "react";
import {
  applySellerReservationCancelRequests,
  getSellerReservationDetail,
  isSellerReservationCancellable,
  listSellerReservations,
  type SellerReservationCancelRequestEntry,
  type SellerReservationCancelRequestMap,
} from "@/lib/seller/seller-reservations-data";

type SellerReservationsClientState = Partial<Record<string, SellerReservationCancelRequestMap>>;

const INITIAL_STATE: SellerReservationsClientState = {};
const EMPTY_REQUESTS: SellerReservationCancelRequestMap = {};

let state = INITIAL_STATE;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL_STATE;

function useCancelRequests(sellerId: string) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return current[sellerId] ?? EMPTY_REQUESTS;
}

/** 현재 판매점 예약 목록 (취소요청 반영, 최신 예약순) */
export function useSellerReservations(sellerId: string) {
  const requests = useCancelRequests(sellerId);
  return useMemo(() => applySellerReservationCancelRequests(listSellerReservations(sellerId), requests), [sellerId, requests]);
}

/** 예약 상세 (취소요청 반영) — 없는 예약번호는 null */
export function useSellerReservationDetail(sellerId: string, reservationCode: string) {
  const requests = useCancelRequests(sellerId);
  return useMemo(() => getSellerReservationDetail(sellerId, reservationCode, requests), [sellerId, reservationCode, requests]);
}

/** 판매점 취소요청 등록 — 예약접수 · 예약확정만 가능, 중복 등록 불가 */
export function registerSellerReservationCancelRequest(
  sellerId: string,
  reservationCode: string,
  entry: SellerReservationCancelRequestEntry,
): boolean {
  const requests = state[sellerId] ?? EMPTY_REQUESTS;
  const reservation = getSellerReservationDetail(sellerId, reservationCode, requests);
  if (!reservation || requests[reservationCode] || !isSellerReservationCancellable(reservation.status)) return false;
  state = { ...state, [sellerId]: { ...requests, [reservationCode]: entry } };
  listeners.forEach((listener) => listener());
  return true;
}
