"use client";

import {
  SELLER_PRODUCTS_MOCK_CONTROLS,
  toggleSellerProductsMock,
  type SellerProductsMockKey,
} from "@/lib/seller/use-seller-products-state";

/** 프로토타입 Mock — 공급여행사 측 상태 변화 재현용 (판매점 관리자 기능 아님) */
export function SellerProductsMockControls({
  sellerId,
  mock,
  keys,
}: {
  sellerId: string;
  mock: Record<SellerProductsMockKey, boolean>;
  /** 표시할 Mock 항목 (기본: 전체) */
  keys?: readonly SellerProductsMockKey[];
}) {
  const controls = keys ? SELLER_PRODUCTS_MOCK_CONTROLS.filter((item) => keys.includes(item.key)) : SELLER_PRODUCTS_MOCK_CONTROLS;
  return (
    <fieldset className="seller-dash-mock">
      <legend>프로토타입 Mock · 공급여행사 측 상태</legend>
      <div role="group" aria-label="공급여행사 측 Mock 상태">
        {controls.map((item) => (
          <label key={item.key} className={mock[item.key] ? "is-selected" : undefined}>
            <input
              type="checkbox"
              value={item.key}
              checked={mock[item.key]}
              onChange={() => toggleSellerProductsMock(sellerId, item.key)}
            />
            {item.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
