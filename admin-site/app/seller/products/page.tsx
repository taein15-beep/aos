"use client";

import { Eye, Info as InfoIcon, Link2, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SellerProductPriceAction, useSellerProductPriceFlow } from "@/components/seller/SellerProductPriceModal";
import { SellerProductShareModal } from "@/components/seller/SellerProductShareModal";
import { SellerProductsMockControls } from "@/components/seller/SellerProductsMockControls";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import {
  EMPTY_SELLER_PRODUCT_FILTERS,
  SELLER_PRODUCT_SALE_MODES,
  SELLER_PRODUCT_STATUSES,
  countSellerProductStatus,
  filterSellerAdminProducts,
  formatSellerAdminProductPrice,
  isSellerProductFilterActive,
  sellerAdminProductStatusBadgeClass,
  sellerProductDetailPath,
  sellerProductExpectedProfit,
  sellerProductModeBadgeClass,
  sellerProductSalePrice,
  toSellerProductShareAttribution,
  type SellerAdminProduct,
  type SellerProductFilters,
} from "@/lib/seller/seller-admin-products-data";
import type { SupplierTradeStatus } from "@/lib/seller/seller-login-mock";
import type { SellerProductShareAttribution } from "@/lib/seller/seller-product-share";
import { getSellerSupplierRelations, isJoinedOrApplied } from "@/lib/seller/seller-suppliers-data";
import {
  saveSellerProductPrice,
  setSellerProductsFilters,
  setSellerProductsPage,
  useSellerProductsState,
} from "@/lib/seller/use-seller-products-state";
import { useSellerSession } from "@/lib/seller/use-seller-session";

const PAGE_SIZE = 10;

type ToastState = { message: string; detail?: string };

type SupplierOption = {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  status: SupplierTradeStatus;
  productCount: number;
};

function PriceCell({ value, note, title }: { value: string; note: string; title?: string }) {
  return (
    <span className="seller-prod-money" title={title}>
      <b>{value}</b>
      <small>{note}</small>
    </span>
  );
}

export default function SellerProductsPage() {
  const session = useSellerSession();
  const sellerId = session?.sellerId ?? SELLER_ADMIN_DEMO_PROFILE.sellerId;
  const sellerName = session?.sellerName ?? SELLER_ADMIN_DEMO_PROFILE.sellerName;

  const { mock, filters, page, supplierStatuses, products } = useSellerProductsState(sellerId);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [shareTarget, setShareTarget] = useState<SellerProductShareAttribution | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const act = (message: string, detail?: string) => {
    setToast({ message, detail });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), detail ? 3200 : 2400);
  };

  const priceFlow = useSellerProductPriceFlow({
    products,
    sellerName,
    onSave: (product, price) => saveSellerProductPrice(sellerId, product, price),
    notify: act,
  });
  const setPage = setSellerProductsPage;

  const supplierOptions = useMemo<SupplierOption[]>(
    () =>
      getSellerSupplierRelations(sellerId, "normal")
        .filter(isJoinedOrApplied)
        .map((relation) => ({
          supplierId: relation.supplierId,
          supplierName: relation.supplierName,
          supplierCode: relation.supplierCode,
          status: supplierStatuses[relation.supplierId] ?? (relation.status as SupplierTradeStatus),
          productCount: products.filter((product) => product.supplierTravelAgencyId === relation.supplierId).length,
        })),
    [sellerId, supplierStatuses, products],
  );

  const summary = countSellerProductStatus(products);
  const filtered = useMemo(() => filterSellerAdminProducts(products, filters), [products, filters]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedSupplier = supplierOptions.find((option) => option.supplierId === filters.supplierId) ?? null;
  const filterActive = isSellerProductFilterActive(filters);

  const updateFilter = <K extends keyof SellerProductFilters>(key: K, value: SellerProductFilters[K]) => {
    setSellerProductsFilters({ ...filters, [key]: value });
  };

  const resetFilters = () => setSellerProductsFilters(EMPTY_SELLER_PRODUCT_FILTERS);

  const supplierLabel = (option: SupplierOption) =>
    option.status === "정상" ? `${option.supplierName} (${option.productCount})` : `${option.supplierName} (${option.status})`;

  const renderEmpty = () => {
    if (selectedSupplier && selectedSupplier.status === "승인대기") {
      return (
        <>
          <h3>판매 가능한 상품이 없습니다.</h3>
          <p>{selectedSupplier.supplierName} 가입 승인 후 공급여행사가 판매 허용한 상품을 확인할 수 있습니다.</p>
        </>
      );
    }
    if (products.length === 0) {
      return (
        <>
          <h3>판매 가능한 상품이 없습니다.</h3>
          <p>공급여행사가 {sellerName}에 판매 허용한 상품이 표시됩니다.</p>
        </>
      );
    }
    return (
      <>
        <h3>조건에 맞는 판매상품이 없습니다.</h3>
        <p>검색어 또는 필터 조건을 변경해주세요.</p>
        <button type="button" className="secondary" onClick={resetFilters}>
          조건 초기화
        </button>
      </>
    );
  };

  const renderActions = (product: SellerAdminProduct) => (
    <>
      <Link
        href={sellerProductDetailPath(product.productCode)}
        className="secondary seller-prod-view-link"
        aria-label={`${product.productName} 보기`}
      >
        <Eye size={14} aria-hidden="true" />
        보기
      </Link>
      <SellerProductPriceAction product={product} onOpen={priceFlow.open} />
      {product.salesStatus === "판매중" ? (
        <button
          type="button"
          className="secondary"
          aria-label={`${product.productName} 링크공유`}
          onClick={() => setShareTarget(toSellerProductShareAttribution(product))}
        >
          <Link2 size={14} aria-hidden="true" />
          링크공유
        </button>
      ) : null}
    </>
  );

  return (
    <div className="seller-products-page">
      <section className="page-head seller-sup-head">
        <div>
          <h1>판매상품</h1>
          <p>공급여행사가 {sellerName}에 판매 허용한 상품을 확인하고 관리합니다.</p>
        </div>
      </section>

      <p className="seller-prod-notice">
        <InfoIcon size={14} aria-hidden="true" />
        <span>
          공급여행사가 판매 허용한 상품만 표시됩니다. 상품 원본정보는 공급여행사에서 관리하며, 입금가형 상품은 판매점에서
          최종 판매가를 설정할 수 있습니다.
        </span>
      </p>

      <section className="panel seller-sup-summary" aria-label="판매상품 현황 요약">
        <dl className="seller-dash-stats">
          <div>
            <dt>전체 판매상품</dt>
            <dd>{products.length}개</dd>
          </div>
          <div className="is-success">
            <dt>판매중</dt>
            <dd>{summary.onSale}개</dd>
          </div>
          <div className="is-warn">
            <dt>설정대기</dt>
            <dd>{summary.setupPending}개</dd>
          </div>
          <div className={summary.stopped > 0 ? "is-danger" : undefined}>
            <dt>판매중지</dt>
            <dd>{summary.stopped}개</dd>
          </div>
        </dl>
        <p className="seller-sup-policy seller-prod-supplier-counts">
          {supplierOptions.map((option) => (
            <span key={option.supplierId}>
              {option.supplierName} <b>{option.productCount}개</b>
              {option.status !== "정상" ? <em className={option.status === "이용중지" ? "is-danger" : undefined}>{option.status}</em> : null}
            </span>
          ))}
        </p>
      </section>

      <section className="panel seller-sup-list" aria-labelledby="seller-prod-list-title">
        <div className="panel-head">
          <div>
            <h2 id="seller-prod-list-title">
              판매 허용 상품 <span className="count">{filtered.length}</span>
            </h2>
            <p>
              {filterActive ? `검색결과 ${filtered.length}건 · 전체 ${products.length}건` : "최근 판매허용 순으로 표시합니다."}
            </p>
          </div>
        </div>

        <div className="seller-sup-toolbar seller-prod-toolbar" role="search">
          <label className="seller-sup-search" htmlFor="seller-prod-keyword">
            <Search size={15} aria-hidden="true" />
            <input
              id="seller-prod-keyword"
              type="search"
              value={filters.keyword}
              onChange={(event) => updateFilter("keyword", event.target.value)}
              placeholder="상품명 또는 상품코드 검색"
              aria-label="상품명 또는 상품코드 검색"
            />
          </label>
          <select
            className="seller-prod-select"
            aria-label="공급여행사"
            value={filters.supplierId}
            onChange={(event) => updateFilter("supplierId", event.target.value)}
          >
            <option value="전체">전체 공급여행사</option>
            {supplierOptions.map((option) => (
              <option key={option.supplierId} value={option.supplierId}>
                {supplierLabel(option)}
              </option>
            ))}
          </select>
          <select
            className="seller-prod-select"
            aria-label="판매방식"
            value={filters.saleMode}
            onChange={(event) => updateFilter("saleMode", event.target.value as SellerProductFilters["saleMode"])}
          >
            <option value="전체">전체 판매방식</option>
            {SELLER_PRODUCT_SALE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          <select
            className="seller-prod-select"
            aria-label="판매상태"
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value as SellerProductFilters["status"])}
          >
            <option value="전체">전체 상태</option>
            {SELLER_PRODUCT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="button" className="secondary seller-prod-reset" onClick={resetFilters} disabled={!filterActive}>
            <RotateCcw size={14} aria-hidden="true" />
            초기화
          </button>
        </div>
        <p className="seller-prod-mode-guide">
          <span>
            <b>수수료형</b> 공급 판매가로 판매하고 수수료를 수익으로 받습니다.
          </span>
          <span>
            <b>입금가형</b> 공급 입금가를 기준으로 판매점이 최종 판매가를 설정합니다.
          </span>
        </p>

        {pageRows.length === 0 ? (
          <div className="seller-sup-empty">{renderEmpty()}</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="seller-dash-table seller-prod-table">
                <thead>
                  <tr>
                    <th>상품</th>
                    <th>공급여행사</th>
                    <th>판매방식</th>
                    <th className="money">공급조건</th>
                    <th className="money">판매점 판매가</th>
                    <th className="money">예상수익</th>
                    <th>판매상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((product) => {
                    const salePrice = sellerProductSalePrice(product);
                    const profit = sellerProductExpectedProfit(product);
                    const isCommission = product.saleMode === "수수료형";
                    return (
                      <tr key={product.productId} className={product.salesStatus === "판매중지" ? "is-stopped" : undefined}>
                        <td data-label="상품">
                          <div className="seller-prod-name">
                            <span className="seller-product-thumb" aria-hidden="true">
                              {product.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={product.imageUrl} alt="" />
                              ) : (
                                <em>IMG</em>
                              )}
                            </span>
                            <span>
                              <b>{product.productName}</b>
                              <small>
                                {product.productCode} · {product.category}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td data-label="공급여행사">
                          <span className="seller-prod-supplier">
                            <b>{product.supplyAgencyName}</b>
                            <small>{product.supplierCode}</small>
                          </span>
                        </td>
                        <td data-label="판매방식">
                          <span className={`badge ${sellerProductModeBadgeClass(product.saleMode)}`}>{product.saleMode}</span>
                        </td>
                        <td data-label="공급조건" className="money">
                          {isCommission ? (
                            <PriceCell
                              value={formatSellerAdminProductPrice(product.supplyPrice ?? 0)}
                              note={`수수료 ${product.commissionRate ?? 0}%`}
                            />
                          ) : (
                            <PriceCell value={formatSellerAdminProductPrice(product.depositPrice ?? 0)} note="입금가" />
                          )}
                        </td>
                        <td data-label="판매점 판매가" className="money">
                          {isCommission ? (
                            <PriceCell
                              value={formatSellerAdminProductPrice(salePrice ?? 0)}
                              note="공급가 적용"
                              title="수수료형 상품은 공급여행사가 설정한 판매가로 판매됩니다."
                            />
                          ) : salePrice !== null ? (
                            <PriceCell value={formatSellerAdminProductPrice(salePrice)} note="판매점 설정" />
                          ) : (
                            <span className="seller-prod-money">
                              <span className="badge warn">미설정</span>
                            </span>
                          )}
                        </td>
                        <td data-label="예상수익" className="money">
                          {profit !== null ? (
                            <PriceCell value={formatSellerAdminProductPrice(profit)} note={isCommission ? "수수료" : "판매마진"} />
                          ) : (
                            <PriceCell value="-" note="판매가 설정 후 계산" />
                          )}
                        </td>
                        <td data-label="판매상태">
                          <span className="seller-prod-status">
                            <span className={`badge ${sellerAdminProductStatusBadgeClass(product.salesStatus)}`}>
                              {product.salesStatus}
                            </span>
                            {product.stopReason ? (
                              <small className={product.stopCause === "재개확인 필요" ? "is-resume" : undefined}>{product.stopReason}</small>
                            ) : null}
                          </span>
                        </td>
                        <td data-label="관리">
                          <div className="seller-product-actions seller-prod-actions">{renderActions(product)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>
                총 {filtered.length}건 중 {(currentPage - 1) * PAGE_SIZE + 1}-
                {Math.min(currentPage * PAGE_SIZE, filtered.length)}건 표시
              </span>
              <div className="pagination" aria-label="페이지네이션">
                <button
                  type="button"
                  aria-label="이전 페이지"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ‹
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={item === currentPage ? "active" : undefined}
                    aria-current={item === currentPage ? "page" : undefined}
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="다음 페이지"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <SellerProductsMockControls sellerId={sellerId} mock={mock} />

      <SellerProductShareModal
        open={Boolean(shareTarget)}
        attribution={shareTarget}
        onClose={() => setShareTarget(null)}
        onCopied={() => act("상품 링크가 복사되었습니다.")}
      />

      {priceFlow.element}

      {toast ? (
        <div className="toast" role="status">
          <span>✓</span>
          {toast.detail ? (
            <span className="seller-prod-toast-text">
              <b>{toast.message}</b>
              <small>{toast.detail}</small>
            </span>
          ) : (
            toast.message
          )}
        </div>
      ) : null}
    </div>
  );
}
