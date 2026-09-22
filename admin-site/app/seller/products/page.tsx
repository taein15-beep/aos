"use client";

import { Eye, Link2, Search, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SellerProductShareModal } from "@/components/seller/SellerProductShareModal";
import { SellerSectionPageHead } from "@/components/seller/SellerSectionPageHead";
import { readSellerSessionFromDocument } from "@/lib/seller/auth";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import {
  buildSellerProductShareUrl,
  EMPTY_SELLER_ADMIN_PRODUCT_FILTERS,
  filterSellerAdminProducts,
  formatSellerAdminCommission,
  formatSellerAdminProductPrice,
  listSellerAdminProducts,
  sellerAdminProductStatusBadgeClass,
  SELLER_ADMIN_PRODUCT_STATUS_OPTIONS,
  toSellerProductShareAttribution,
  type SellerAdminProduct,
  type SellerAdminProductFilters,
} from "@/lib/seller/seller-admin-products-data";
import type { SellerProductShareAttribution } from "@/lib/seller/seller-product-share";

export default function SellerProductsPage() {
  const [sellerId, setSellerId] = useState(SELLER_ADMIN_DEMO_PROFILE.sellerId);
  const [draftFilter, setDraftFilter] = useState<SellerAdminProductFilters>(
    EMPTY_SELLER_ADMIN_PRODUCT_FILTERS,
  );
  const [appliedFilter, setAppliedFilter] = useState<SellerAdminProductFilters>(
    EMPTY_SELLER_ADMIN_PRODUCT_FILTERS,
  );
  const [toast, setToast] = useState("");
  const [shareTarget, setShareTarget] = useState<SellerProductShareAttribution | null>(null);

  useEffect(() => {
    const session = readSellerSessionFromDocument();
    if (!session) return;
    setSellerId(session.sellerId);
  }, []);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const products = useMemo(() => listSellerAdminProducts(sellerId), [sellerId]);
  const filtered = useMemo(
    () => filterSellerAdminProducts(products, appliedFilter),
    [products, appliedFilter],
  );

  const applySearch = () => {
    setAppliedFilter({ ...draftFilter });
    act("검색 조건을 적용했습니다.");
  };

  const resetSearch = () => {
    setDraftFilter(EMPTY_SELLER_ADMIN_PRODUCT_FILTERS);
    setAppliedFilter(EMPTY_SELLER_ADMIN_PRODUCT_FILTERS);
    act("검색 조건을 초기화했습니다.");
  };

  const openProductView = (product: SellerAdminProduct) => {
    const url = buildSellerProductShareUrl(product.sellerCode, product.productId);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openShareModal = (product: SellerAdminProduct) => {
    setShareTarget(toSellerProductShareAttribution(product));
  };

  return (
    <div className="seller-products-page">
      <SellerSectionPageHead
        title="판매상품"
        description="공급여행사가 판매 허용한 상품만 조회합니다. 상품 등록·수정은 할 수 없습니다."
      />

      <section className="panel member-affiliate-filter seller-products-filter" aria-label="판매상품 검색">
        <div className="member-affiliate-filter-grid seller-products-filter-grid">
          <label>
            <span>상품명</span>
            <input
              value={draftFilter.productName}
              onChange={(event) =>
                setDraftFilter((current) => ({ ...current, productName: event.target.value }))
              }
              placeholder="상품명, 상품코드"
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
            />
          </label>
          <label>
            <span>공급여행사</span>
            <input
              value={draftFilter.supplyAgency}
              onChange={(event) =>
                setDraftFilter((current) => ({ ...current, supplyAgency: event.target.value }))
              }
              placeholder="공급여행사명"
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
            />
          </label>
          <label>
            <span>판매상태</span>
            <select
              value={draftFilter.salesStatus}
              onChange={(event) =>
                setDraftFilter((current) => ({
                  ...current,
                  salesStatus: event.target.value as SellerAdminProductFilters["salesStatus"],
                }))
              }
            >
              {SELLER_ADMIN_PRODUCT_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="member-affiliate-filter-actions">
          <button type="button" className="secondary" onClick={resetSearch}>
            <RotateCcw size={14} aria-hidden="true" />
            초기화
          </button>
          <button type="button" className="primary" onClick={applySearch}>
            <Search size={14} aria-hidden="true" />
            검색
          </button>
        </div>
      </section>

      <section className="panel" aria-label="판매상품 목록">
        <div className="panel-head seller-products-toolbar">
          <div>
            <h2>판매 허용 상품</h2>
            <p>
              검색결과 <b>{filtered.length}</b>건 · 전체 {products.length}건
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="seller-products-table">
            <thead>
              <tr>
                <th>상품 이미지</th>
                <th>상품명</th>
                <th>공급여행사</th>
                <th>출발일/출발기간</th>
                <th>판매가</th>
                <th>판매수수료</th>
                <th>판매상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="seller-products-empty">
                    <strong>검색조건에 맞는 판매상품이 없습니다.</strong>
                    <p>상품명·공급여행사·판매상태를 변경해 주세요.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.productId}>
                    <td>
                      <span className="seller-product-thumb" aria-hidden="true">
                        {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <em>IMG</em>}
                      </span>
                    </td>
                    <td className="seller-product-name-cell">
                      <strong>{product.productName}</strong>
                      <small>{product.productCode}</small>
                    </td>
                    <td>{product.supplyAgencyName}</td>
                    <td>{product.departureLabel}</td>
                    <td className="money">{formatSellerAdminProductPrice(product.salesPrice)}</td>
                    <td className="money">{formatSellerAdminCommission(product.commissionRate)}</td>
                    <td>
                      <span className={`badge ${sellerAdminProductStatusBadgeClass(product.salesStatus)}`}>
                        {product.salesStatus}
                      </span>
                    </td>
                    <td>
                      <div className="seller-product-actions">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => openProductView(product)}
                        >
                          <Eye size={14} aria-hidden="true" />
                          상품보기
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => openShareModal(product)}
                        >
                          <Link2 size={14} aria-hidden="true" />
                          링크공유
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SellerProductShareModal
        open={Boolean(shareTarget)}
        attribution={shareTarget}
        onClose={() => setShareTarget(null)}
        onCopied={() => act("상품 링크가 복사되었습니다.")}
      />

      {toast ? (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
