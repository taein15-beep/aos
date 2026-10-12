"use client";

/**
 * 판매점 관리자 · 판매상품 Client State (목록 ↔ 상세 공유)
 * - 메모리 내 Module State — 새로고침 시 Mock 초기값으로 복귀 (LocalStorage 미사용)
 * - 판매가 · 자체중지 · 재개확인 값은 현재 판매점(sellerId)에만 적용, 상품 원본 · 입금가 · 수수료율 불변
 * - 공급여행사/상품 상위 상태가 해소되어도 자동 판매재개 없음 (판매중이던 상품은 재개확인 필요)
 */

import { useMemo, useSyncExternalStore } from "react";
import {
  EMPTY_SELLER_PRODUCT_FILTERS,
  UPSTREAM_STOP_CAUSES,
  formatSellerAdminProductPrice,
  listSellerAdminProducts,
  type SellerAdminProduct,
  type SellerProductFilters,
  type SellerProductFlagMap,
  type SellerProductPriceOverrideMap,
  type SellerProductStopCause,
  type SellerProductStopOverrideMap,
  type SellerProductSupplierStatusMap,
} from "@/lib/seller/seller-admin-products-data";
import type { SupplierTradeStatus } from "@/lib/seller/seller-login-mock";
import { getSellerSupplierRelations, isJoinedOrApplied } from "@/lib/seller/seller-suppliers-data";

export type SellerProductsMockKey = "hyundamSuspended" | "wineSupplierStopped" | "taeanEnded" | "noProducts";

/** 공급여행사 측 상태 변화 Mock — 판매점 관리자에서 변경하는 기능이 아님 */
export const SELLER_PRODUCTS_MOCK_CONTROLS: { key: SellerProductsMockKey; label: string }[] = [
  { key: "hyundamSuspended", label: "현담여행사 거래 이용중지" },
  { key: "wineSupplierStopped", label: "국악와인열차 공급여행사 판매중지" },
  { key: "taeanEnded", label: "태안 꽃지해변 상품 운영종료" },
  { key: "noProducts", label: "판매 허용 상품 없음" },
];

const MOCK_SUPPLIER_STOPS: SellerProductStopOverrideMap = { "HT-WINE01": "공급여행사 판매중지" };
const MOCK_OPERATION_ENDS: SellerProductStopOverrideMap = { "HT-TA01": "판매기간 종료" };

export type SellerProductHistoryEntry = { at: string; label: string };

type PerSeller<T> = Partial<Record<string, T>>;

type SellerProductsClientState = {
  mock: Record<SellerProductsMockKey, boolean>;
  filters: SellerProductFilters;
  page: number;
  priceOverrides: PerSeller<SellerProductPriceOverrideMap>;
  sellerStops: PerSeller<SellerProductFlagMap>;
  resumeRequired: PerSeller<SellerProductStopOverrideMap>;
  history: PerSeller<Partial<Record<string, SellerProductHistoryEntry[]>>>;
};

const INITIAL_STATE: SellerProductsClientState = {
  mock: { hyundamSuspended: false, wineSupplierStopped: false, taeanEnded: false, noProducts: false },
  filters: EMPTY_SELLER_PRODUCT_FILTERS,
  page: 1,
  priceOverrides: {},
  sellerStops: {},
  resumeRequired: {},
  history: {},
};

let state = INITIAL_STATE;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(updater: (current: SellerProductsClientState) => SellerProductsClientState) {
  state = updater(state);
  listeners.forEach((listener) => listener());
}

const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL_STATE;

function buildSupplierStatuses(sellerId: string, hyundamSuspended: boolean): SellerProductSupplierStatusMap {
  const map: SellerProductSupplierStatusMap = {};
  for (const relation of getSellerSupplierRelations(sellerId, "normal").filter(isJoinedOrApplied)) {
    map[relation.supplierId] = relation.status as SupplierTradeStatus;
  }
  if (hyundamSuspended) map["AGENCY-HYUNDAM"] = "이용중지";
  return map;
}

function computeProducts(current: SellerProductsClientState, sellerId: string, supplierStatuses: SellerProductSupplierStatusMap) {
  if (current.mock.noProducts) return [];
  return listSellerAdminProducts(sellerId, {
    supplierStatuses,
    priceOverrides: current.priceOverrides[sellerId],
    supplierStopOverrides: current.mock.wineSupplierStopped ? MOCK_SUPPLIER_STOPS : {},
    operationEndOverrides: current.mock.taeanEnded ? MOCK_OPERATION_ENDS : {},
    sellerStops: current.sellerStops[sellerId],
    resumeRequired: current.resumeRequired[sellerId],
  });
}

function nowLabel() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function appendHistory(
  current: SellerProductsClientState,
  sellerId: string,
  entries: { productId: string; label: string }[],
  at: string,
): SellerProductsClientState["history"] {
  const sellerHistory = { ...current.history[sellerId] };
  for (const entry of entries) {
    sellerHistory[entry.productId] = [{ at, label: entry.label }, ...(sellerHistory[entry.productId] ?? [])];
  }
  return { ...current.history, [sellerId]: sellerHistory };
}

const isUpstream = (cause: SellerProductStopCause | null) => cause !== null && UPSTREAM_STOP_CAUSES.includes(cause);

function upstreamLabels(product: SellerAdminProduct) {
  if (product.stopCause === "공급여행사 거래 이용중지") {
    return { block: "공급여행사 거래 이용중지", release: "공급여행사 거래 정상화", resume: "거래 정상화 · 판매재개 확인 필요" };
  }
  if (product.stopCause === "공급여행사 판매중지") {
    return {
      block: `${product.supplyAgencyName}에서 판매중지`,
      release: `${product.supplyAgencyName}에서 판매재개`,
      resume: "공급여행사 판매재개 · 판매재개 확인 필요",
    };
  }
  return { block: "상품 운영종료", release: "상품 운영 재개", resume: "운영 재개 · 판매재개 확인 필요" };
}

/**
 * 공급여행사 측 상태 Mock 전환 — 상위 원인 발생 시 판매중이던 상품만 재개확인 필요로 기록
 * 상위 원인 해소 시 자동 판매중 전환 없음, 판매점 자체중지 Flag는 그대로 유지
 */
export function toggleSellerProductsMock(sellerId: string, key: SellerProductsMockKey) {
  const at = nowLabel();
  setState((current) => {
    const next: SellerProductsClientState = {
      ...current,
      mock: { ...current.mock, [key]: !current.mock[key] },
      filters: EMPTY_SELLER_PRODUCT_FILTERS,
      page: 1,
    };
    if (key === "noProducts") return next;

    const before = computeProducts(current, sellerId, buildSupplierStatuses(sellerId, current.mock.hyundamSuspended));
    const after = computeProducts(next, sellerId, buildSupplierStatuses(sellerId, next.mock.hyundamSuspended));
    const resumeRequired = { ...current.resumeRequired[sellerId] };
    const entries: { productId: string; label: string }[] = [];

    for (const product of after) {
      const previous = before.find((row) => row.productId === product.productId);
      if (!previous) continue;
      if (!isUpstream(previous.stopCause) && isUpstream(product.stopCause)) {
        const labels = upstreamLabels(product);
        if (previous.salesStatus === "판매중") resumeRequired[product.productId] = labels.resume;
        entries.push({ productId: product.productId, label: labels.block });
      } else if (isUpstream(previous.stopCause) && !isUpstream(product.stopCause)) {
        entries.push({ productId: product.productId, label: upstreamLabels(previous).release });
      }
    }

    return {
      ...next,
      resumeRequired: { ...current.resumeRequired, [sellerId]: resumeRequired },
      history: appendHistory(current, sellerId, entries, at),
    };
  });
}

export function setSellerProductsFilters(filters: SellerProductFilters) {
  setState((current) => ({ ...current, filters, page: 1 }));
}

export function setSellerProductsPage(page: number) {
  setState((current) => ({ ...current, page }));
}

export function saveSellerProductPrice(sellerId: string, product: SellerAdminProduct, price: number) {
  const at = nowLabel();
  const label =
    product.sellerPrice === null
      ? `판매가 설정 ${formatSellerAdminProductPrice(price)}`
      : `판매가 변경 ${formatSellerAdminProductPrice(product.sellerPrice)} → ${formatSellerAdminProductPrice(price)}`;
  setState((current) => ({
    ...current,
    priceOverrides: {
      ...current.priceOverrides,
      [sellerId]: { ...current.priceOverrides[sellerId], [product.productId]: price },
    },
    history: appendHistory(current, sellerId, [{ productId: product.productId, label }], at),
  }));
}

/** 판매점 자체 판매중지 — 신규 판매만 중지, 판매가 · 원본 · 기존 예약/이력 유지 */
export function stopSellerProduct(sellerId: string, sellerName: string, product: SellerAdminProduct) {
  const at = nowLabel();
  setState((current) => {
    const resumeRequired = { ...current.resumeRequired[sellerId] };
    delete resumeRequired[product.productId];
    return {
      ...current,
      sellerStops: { ...current.sellerStops, [sellerId]: { ...current.sellerStops[sellerId], [product.productId]: true } },
      resumeRequired: { ...current.resumeRequired, [sellerId]: resumeRequired },
      history: appendHistory(current, sellerId, [{ productId: product.productId, label: `${sellerName}에서 판매중지` }], at),
    };
  });
}

/** 판매재개 — 판매점 자체중지 · 재개확인 필요 해제 (상위 원인은 해제 불가) */
export function resumeSellerProduct(sellerId: string, sellerName: string, product: SellerAdminProduct) {
  const at = nowLabel();
  setState((current) => {
    const sellerStops = { ...current.sellerStops[sellerId] };
    const resumeRequired = { ...current.resumeRequired[sellerId] };
    delete sellerStops[product.productId];
    delete resumeRequired[product.productId];
    return {
      ...current,
      sellerStops: { ...current.sellerStops, [sellerId]: sellerStops },
      resumeRequired: { ...current.resumeRequired, [sellerId]: resumeRequired },
      history: appendHistory(current, sellerId, [{ productId: product.productId, label: `${sellerName}에서 판매재개` }], at),
    };
  });
}

/** 현재 판매점의 판매상품 목록 + Mock 상태 반영 거래상태 */
export function useSellerProductsState(sellerId: string) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { hyundamSuspended } = current.mock;

  const supplierStatuses = useMemo(() => buildSupplierStatuses(sellerId, hyundamSuspended), [sellerId, hyundamSuspended]);
  const products = useMemo(() => computeProducts(current, sellerId, supplierStatuses), [current, sellerId, supplierStatuses]);

  return {
    mock: current.mock,
    filters: current.filters,
    page: current.page,
    history: current.history[sellerId] ?? {},
    supplierStatuses,
    products,
  };
}
