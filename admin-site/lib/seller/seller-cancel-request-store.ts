/**
 * 판매점 취소요청 Store — 판매점 관리자 · 공급여행사 관리자 공통 Source
 * - 메모리 내 Module State — 새로고침 시 초기화 (LocalStorage 미사용)
 * - React 의존성이 없는 순수 모듈 (공급여행사 예약 Data에서도 읽음)
 */

import type { SellerReservationCancelRequestEntry, SellerReservationCancelRequestMap } from "@/lib/seller/seller-reservations-data";

type SellerCancelRequestState = Partial<Record<string, SellerReservationCancelRequestMap>>;

const EMPTY_REQUESTS: SellerReservationCancelRequestMap = {};

let state: SellerCancelRequestState = {};
let version = 0;
const listeners = new Set<() => void>();

export function subscribeSellerCancelRequests(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSellerCancelRequestState() {
  return state;
}

/** 변경 시 증가 — 공급여행사 예약 Data 재계산 기준 */
export function getSellerCancelRequestVersion() {
  return version;
}

export function getSellerCancelRequests(sellerId: string): SellerReservationCancelRequestMap {
  return state[sellerId] ?? EMPTY_REQUESTS;
}

export function addSellerCancelRequest(sellerId: string, reservationCode: string, entry: SellerReservationCancelRequestEntry) {
  state = { ...state, [sellerId]: { ...getSellerCancelRequests(sellerId), [reservationCode]: entry } };
  version += 1;
  listeners.forEach((listener) => listener());
}
