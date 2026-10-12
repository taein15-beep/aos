"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Lock, Plus, Search, Store } from "lucide-react";
import {
  SELLER_SALES_FILTERS,
  SELLER_SALES_MODE_FLOW,
  calcSellerSalesFigures,
  countSellerSalesFilters,
  createPendingSellerRow,
  formatWon,
  getJoinedSellers,
  getSampleProductSellers,
  matchesSellerSalesFilter,
  sellerSalesModeBadgeClass,
  sellerSalesModeLabel,
  sellerSalesStatusBadgeClass,
  type SellerSalesFilter,
  type SellerSalesRow,
} from "@/lib/admin/product-seller-sales-data";
import { SellerPickerModal } from "@/components/products/SellerPickerModal";
import { SellerSalesSettingModal, type SellerSalesSettingValue } from "@/components/products/SellerSalesSettingModal";

export type SellerSalesSectionProps = {
  productCode: string;
  /** 현재 공급여행사. 이 여행사에 가입된 판매점만 선택할 수 있습니다. */
  supplierName: string;
  /** 공급여행사가 설정한 상품 판매가 */
  supplyPrice: number;
  onNotify: (message: string) => void;
};

/** 상품공유 > 판매점 판매. 가입 판매점 중 판매 허용 판매점을 추가하고 판매점별 판매조건을 Mock 상태로 관리합니다. */
export function SellerSalesSection({ productCode, supplierName, supplyPrice, onNotify }: SellerSalesSectionProps) {
  const joinedSellers = useMemo(() => getJoinedSellers(supplierName), [supplierName]);
  const [rows, setRows] = useState<SellerSalesRow[]>(() => getSampleProductSellers(productCode, joinedSellers));
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<SellerSalesFilter>("전체");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingTargetId, setSettingTargetId] = useState<string | null>(null);

  const counts = useMemo(() => countSellerSalesFilters(rows), [rows]);
  const filteredRows = useMemo(() => {
    const term = keyword.trim();
    return rows.filter((row) => (!term || row.sellerName.includes(term)) && matchesSellerSalesFilter(row, filter));
  }, [rows, keyword, filter]);

  const settingTarget = settingTargetId ? rows.find((row) => row.id === settingTargetId) ?? null : null;
  const isSuspendedSeller = (id: string) => joinedSellers.find((seller) => seller.id === id)?.joinStatus === "이용중지";

  const addSellers = (ids: string[]) => {
    const registered = new Set(rows.map((row) => row.id));
    const added = joinedSellers.filter((seller) => ids.includes(seller.id) && !registered.has(seller.id));
    setRows((current) => [...current, ...added.map(createPendingSellerRow)]);
    setPickerOpen(false);
    setFilter("전체");
    onNotify(`판매점 ${added.length}곳을 추가했습니다. 판매점별 판매조건을 설정해주세요.`);
  };

  const applySetting = (value: SellerSalesSettingValue) => {
    if (!settingTarget) return;
    const id = settingTarget.id;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...value } : row)));
    setSettingTargetId(null);
    onNotify("판매점 판매조건이 설정되었습니다.");
  };

  return (
    <section className="panel member-web-detail-card product-share-setting-card seller-sales-card">
      <div className="member-web-detail-card-head">
        <strong>판매점 판매 설정</strong>
        <span className="product-share-setting-head-meta">
          판매 허용 판매점 <b className="seller-sales-head-count">{rows.length}</b>곳
          {rows.length > 0 &&
            ` · 판매중 ${counts["판매중"]} · 판매중지 ${counts["판매중지"]} · 설정필요 ${counts["설정필요"]}`}
        </span>
        <button type="button" className="primary seller-sales-add-btn" onClick={() => setPickerOpen(true)}>
          <Plus size={14} />
          판매점 추가
        </button>
      </div>
      <div className="product-share-setting-card-body">
        <p className="product-share-setting-help">
          우리 여행사에 가입된 판매점별로 상품 판매여부와 판매조건을 설정합니다. 아래 목록은 현재 이 상품을 판매할 수
          있도록 설정된 판매점입니다.
        </p>

        {rows.length === 0 ? (
          <div className="seller-sales-empty">
            <Store size={22} />
            <strong>아직 이 상품을 판매할 판매점이 없습니다.</strong>
            <p>우리 여행사에 가입된 판매점을 추가하여 상품 판매를 시작할 수 있습니다.</p>
            <button type="button" className="primary seller-sales-add-btn" onClick={() => setPickerOpen(true)}>
              <Plus size={14} />
              판매점 추가
            </button>
          </div>
        ) : (
          <>
            <div className="seller-sales-legend" aria-label="판매방식 안내">
              <span className="seller-sales-legend-item">
                <span className="badge info">수수료형</span>
                {SELLER_SALES_MODE_FLOW.commission}
              </span>
              <span className="seller-sales-legend-item">
                <span className="badge warn">입금가형</span>
                {SELLER_SALES_MODE_FLOW.deposit}
              </span>
            </div>

            <div className="product-share-setting-search seller-sales-toolbar">
              <label className="product-share-setting-search-input">
                <Search size={14} />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="판매점명 검색"
                  aria-label="판매점명 검색"
                />
              </label>
              <div className="member-seller-quick-filters seller-sales-filters" role="group" aria-label="판매점 필터">
                {SELLER_SALES_FILTERS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`member-seller-quick-filter${filter === option ? " is-active" : ""}`}
                    aria-pressed={filter === option}
                    onClick={() => setFilter(option)}
                  >
                    {option}
                    <em>{counts[option]}</em>
                  </button>
                ))}
              </div>
            </div>

            <div className="member-web-detail-table-wrap">
              <table className="member-web-detail-table seller-sales-table">
                <colgroup>
                  <col className="c-seller" />
                  <col className="c-status" />
                  <col className="c-mode" />
                  <col className="c-price" />
                  <col className="c-term" />
                  <col className="c-price" />
                  <col className="c-profit" />
                  <col className="c-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>판매점</th>
                    <th>판매상태</th>
                    <th>판매방식</th>
                    <th>공급 판매가</th>
                    <th>수수료 / 입금가</th>
                    <th>판매점 판매가</th>
                    <th>예상수익</th>
                    <th>설정</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="product-affiliate-empty">
                        검색 조건에 맞는 판매점이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const figures = calcSellerSalesFigures(row, supplyPrice);
                      const isPending = row.mode === null;
                      const isCommission = row.mode === "commission";
                      const rowClass =
                        row.status === "판매중지" ? "is-stopped" : row.status === "설정필요" ? "is-pending" : undefined;
                      return (
                        <tr key={row.id} className={rowClass}>
                          <td className="text-left">
                            <strong>{row.sellerName}</strong>
                            <small className="product-share-setting-sub">{row.sellerCode}</small>
                          </td>
                          <td>
                            <span className={`badge ${sellerSalesStatusBadgeClass(row.status)} seller-sales-status-badge`}>
                              {row.status === "설정필요" && <AlertCircle size={10} />}
                              {row.status}
                            </span>
                            {isSuspendedSeller(row.id) && (
                              <small className="product-share-setting-sub">판매점 이용중지</small>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${sellerSalesModeBadgeClass(row.mode)}`}>
                              {sellerSalesModeLabel(row.mode)}
                            </span>
                          </td>
                          <td className="seller-sales-amount">{formatWon(supplyPrice)}</td>
                          <td className="seller-sales-amount">
                            {isPending ? (
                              <span className="seller-sales-muted">-</span>
                            ) : (
                              <>
                                <strong>{isCommission ? `${row.commissionRate}%` : formatWon(row.depositPrice)}</strong>
                                <small className="product-share-setting-sub">{isCommission ? "판매수수료" : "입금가"}</small>
                              </>
                            )}
                          </td>
                          <td className="seller-sales-amount">
                            {isPending ? (
                              <span className="seller-sales-muted">-</span>
                            ) : figures.sellerPrice != null ? (
                              <>
                                <strong>{formatWon(figures.sellerPrice)}</strong>
                                <small className="product-share-setting-sub">
                                  {isCommission ? (
                                    <>
                                      <Lock size={9} /> 공급가 동일
                                    </>
                                  ) : (
                                    "판매점 설정"
                                  )}
                                </small>
                              </>
                            ) : (
                              <span className="badge gray">미설정</span>
                            )}
                          </td>
                          <td className="seller-sales-amount seller-sales-profit">
                            {figures.expectedProfit != null ? (
                              <>
                                <strong>{formatWon(figures.expectedProfit)}</strong>
                                <small className="product-share-setting-sub">{isCommission ? "수수료" : "차액 마진"}</small>
                              </>
                            ) : (
                              <span className="seller-sales-muted">{isPending ? "-" : "판매가 설정 후 계산"}</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`small-btn${isPending ? " seller-sales-setup-btn" : ""}`}
                              onClick={() => setSettingTargetId(row.id)}
                            >
                              {isPending ? "판매조건 설정" : "판매설정"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {pickerOpen && (
        <SellerPickerModal
          joinedSellers={joinedSellers}
          registeredIds={rows.map((row) => row.id)}
          onClose={() => setPickerOpen(false)}
          onConfirm={addSellers}
        />
      )}

      {settingTarget && (
        <SellerSalesSettingModal
          key={settingTarget.id}
          row={settingTarget}
          supplyPrice={supplyPrice}
          salesLocked={isSuspendedSeller(settingTarget.id)}
          onClose={() => setSettingTargetId(null)}
          onApply={applySetting}
        />
      )}
    </section>
  );
}
