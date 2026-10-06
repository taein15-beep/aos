"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";
import { shareStatusBadgeClass } from "@/lib/admin/product-affiliate-data";
import { ProductAdminShell, type ProductToastAction } from "@/components/products/ProductAdminShell";
import { useSharedProductRequestFlow } from "@/components/products/useSharedProductRequestFlow";
import {
  SHARED_OWN_CATEGORY_MAINS,
  SHARED_SALES_STATUS_OPTIONS,
  SHARED_SHARE_STATUS_OPTIONS,
  canRespondToShareRequest,
  listSalesStatus,
  formatOwnCategory,
  getSharedProductPath,
  getSharedProductSalesPath,
  getSharedProducts,
  hasCustomSharedCondition,
  needsSharedSalesSetup,
  salesStatusBadgeClass,
  sharedConditionForm,
} from "@/lib/admin/product-shared-data";

type SharedListFilters = {
  keyword: string;
  supplier: string;
  shareStatus: string;
  salesStatus: string;
  visible: string;
  category: string;
};

const EMPTY_FILTERS: SharedListFilters = {
  keyword: "",
  supplier: "전체",
  shareStatus: "전체",
  salesStatus: "전체",
  visible: "전체",
  category: "전체",
};

const UNASSIGNED_CATEGORY = "미지정";

export default function SharedProductListPage() {
  const router = useRouter();
  const [toast, setToast] = useState("");
  const [toastAction, setToastAction] = useState<ProductToastAction | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [products, setProducts] = useState(() => getSharedProducts());
  const [filters, setFilters] = useState<SharedListFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<SharedListFilters>(EMPTY_FILTERS);

  const act = (message: string, action?: ProductToastAction) => {
    setToast(message);
    setToastAction(action ?? null);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(
      () => {
        setToast("");
        setToastAction(null);
      },
      action ? 6000 : 2200,
    );
  };

  const requestFlow = useSharedProductRequestFlow({
    notify: act,
    onChanged: () => setProducts(getSharedProducts()),
    onGoSales: (product) => router.push(getSharedProductSalesPath(product.code)),
  });

  const supplierOptions = useMemo(
    () => Array.from(new Set(products.map((product) => product.supplierName))),
    [products],
  );

  const kpis = useMemo(
    () => ({
      total: products.length,
      pending: products.filter((product) => product.shareStatus === "수락대기").length,
      selling: products.filter((product) => listSalesStatus(product) === "판매중").length,
      waiting: products.filter((product) => listSalesStatus(product) === "판매대기").length,
      paused: products.filter((product) => product.shareStatus === "공유 중지").length,
      setup: products.filter(needsSharedSalesSetup).length,
    }),
    [products],
  );

  const rows = useMemo(() => {
    const keyword = applied.keyword.trim().toLowerCase();
    return products.filter((product) => {
      if (
        keyword &&
        ![product.name, product.code, product.supplierName, product.sales.salesName].some((value) =>
          value.toLowerCase().includes(keyword),
        )
      ) {
        return false;
      }
      if (applied.supplier !== "전체" && product.supplierName !== applied.supplier) return false;
      if (applied.shareStatus !== "전체" && product.shareStatus !== applied.shareStatus) return false;
      if (applied.salesStatus !== "전체" && listSalesStatus(product) !== applied.salesStatus) return false;
      if (applied.visible !== "전체" && product.sales.homepageVisible !== (applied.visible === "노출중")) return false;
      if (applied.category === UNASSIGNED_CATEGORY && product.sales.categoryMain) return false;
      if (
        applied.category !== "전체" &&
        applied.category !== UNASSIGNED_CATEGORY &&
        product.sales.categoryMain !== applied.category
      ) {
        return false;
      }
      return true;
    });
  }, [products, applied]);

  const updateFilter = (key: keyof SharedListFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const search = () => setApplied(filters);

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  };

  const applyKpiFilter = (next: Partial<SharedListFilters>) => {
    const value = { ...EMPTY_FILTERS, ...next };
    setFilters(value);
    setApplied(value);
  };

  return (
    <ProductAdminShell
      currentChild="공유받은 상품"
      onNotify={act}
      toast={toast}
      toastAction={toastAction}
      overlays={requestFlow.modals}
      breadcrumb={
        <>
          <span>상품관리</span>
          <b>/</b>
          <strong>공유받은 상품</strong>
        </>
      }
    >
      <main className="content product-affiliate-content shared-product-content">
        <section className="page-head product-affiliate-page-head">
          <div>
            <h1>공유받은 상품</h1>
            <p>공급여행사에서 공유받은 상품을 확인하고 자사 판매설정을 관리합니다.</p>
          </div>
        </section>

        <section className="shared-product-kpis" aria-label="공유받은 상품 현황">
          <button type="button" className="member-web-detail-kpi" onClick={() => applyKpiFilter({})}>
            <span>
              <small>전체 공유상품</small>
              <strong>{kpis.total}건</strong>
            </span>
          </button>
          <button
            type="button"
            className="member-web-detail-kpi is-pending"
            onClick={() => applyKpiFilter({ shareStatus: "수락대기" })}
          >
            <span>
              <small>수락대기</small>
              <strong>{kpis.pending}건</strong>
            </span>
          </button>
          <button
            type="button"
            className="member-web-detail-kpi is-success"
            onClick={() => applyKpiFilter({ salesStatus: "판매중" })}
          >
            <span>
              <small>판매중</small>
              <strong>{kpis.selling}건</strong>
            </span>
          </button>
          <button
            type="button"
            className="member-web-detail-kpi is-warn"
            onClick={() => applyKpiFilter({ salesStatus: "판매대기" })}
          >
            <span>
              <small>판매대기</small>
              <strong>{kpis.waiting}건</strong>
            </span>
          </button>
          <button
            type="button"
            className="member-web-detail-kpi is-muted"
            onClick={() => applyKpiFilter({ shareStatus: "공유 중지" })}
          >
            <span>
              <small>공유 중지</small>
              <strong>{kpis.paused}건</strong>
            </span>
          </button>
          <button
            type="button"
            className="member-web-detail-kpi is-danger"
            onClick={() => applyKpiFilter({ shareStatus: "공유 중", category: UNASSIGNED_CATEGORY })}
            title="공유 중이지만 자사 카테고리가 지정되지 않은 상품"
          >
            <span>
              <small>설정필요</small>
              <strong>{kpis.setup}건</strong>
            </span>
          </button>
        </section>

        <section className="panel shared-product-filter" aria-label="공유받은 상품 검색">
          <label className="product-share-setting-search-input shared-product-search">
            <Search size={14} />
            <input
              aria-label="검색어"
              placeholder="상품명 / 상품코드 / 공급여행사 검색"
              value={filters.keyword}
              onChange={(event) => updateFilter("keyword", event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && search()}
            />
          </label>
          <select
            className="product-share-setting-select"
            aria-label="공급여행사"
            value={filters.supplier}
            onChange={(event) => updateFilter("supplier", event.target.value)}
          >
            <option value="전체">공급여행사 전체</option>
            {supplierOptions.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>
          <select
            className="product-share-setting-select"
            aria-label="공유상태"
            value={filters.shareStatus}
            onChange={(event) => updateFilter("shareStatus", event.target.value)}
          >
            <option value="전체">공유상태 전체</option>
            {SHARED_SHARE_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="product-share-setting-select"
            aria-label="판매상태"
            value={filters.salesStatus}
            onChange={(event) => updateFilter("salesStatus", event.target.value)}
          >
            <option value="전체">판매상태 전체</option>
            {SHARED_SALES_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="product-share-setting-select"
            aria-label="홈페이지 노출"
            value={filters.visible}
            onChange={(event) => updateFilter("visible", event.target.value)}
          >
            <option value="전체">홈페이지 노출 전체</option>
            <option value="노출중">노출중</option>
            <option value="미노출">미노출</option>
          </select>
          <select
            className="product-share-setting-select"
            aria-label="자사 카테고리"
            value={filters.category}
            onChange={(event) => updateFilter("category", event.target.value)}
          >
            <option value="전체">자사 카테고리 전체</option>
            {SHARED_OWN_CATEGORY_MAINS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
            <option value={UNASSIGNED_CATEGORY}>카테고리 미지정</option>
          </select>
          <div className="shared-product-filter-actions">
            <button type="button" className="primary" onClick={search}>
              <Search size={14} />
              검색
            </button>
            <button type="button" className="secondary" onClick={resetFilters}>
              <RotateCcw size={14} />
              초기화
            </button>
          </div>
        </section>

        <section className="panel member-web-detail-card">
          <div className="member-web-detail-card-head">
            <strong>공유받은 상품 목록</strong>
            <span className="product-share-setting-head-meta">
              검색결과 {rows.length}건 / 전체 {products.length}건
            </span>
          </div>
          <div className="member-web-detail-table-wrap">
            <table className="member-web-detail-table shared-product-table">
              <colgroup>
                <col className="c-supplier" />
                <col className="c-name" />
                <col className="c-code" />
                <col className="c-status" />
                <col className="c-condition" />
                <col className="c-rate" />
                <col className="c-category" />
                <col className="c-visible" />
                <col className="c-status" />
                <col className="c-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>공급여행사</th>
                  <th>상품명</th>
                  <th>상품코드</th>
                  <th>공유상태</th>
                  <th>공유조건</th>
                  <th>수수료</th>
                  <th>자사 카테고리</th>
                  <th>홈페이지 노출</th>
                  <th>판매상태</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="shared-product-empty">
                      검색 조건에 맞는 공유받은 상품이 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((product) => {
                    const form = sharedConditionForm(product);
                    const isCustom = hasCustomSharedCondition(product);
                    const salesStatus = listSalesStatus(product);
                    const ownCategory = formatOwnCategory(product.sales);
                    const canRespond = canRespondToShareRequest(product);
                    return (
                      <tr key={product.code} className={canRespond ? "is-request-pending" : undefined}>
                        <td>{product.supplierName}</td>
                        <td>
                          <button
                            type="button"
                            className="shared-product-name"
                            onClick={() => router.push(getSharedProductPath(product.code))}
                            title={product.name}
                          >
                            {product.name}
                          </button>
                          {canRespond ? (
                            <span className="product-share-setting-sub shared-product-request-hint">
                              공유 요청 확인 필요 · 요청일 {product.requestedAt.slice(0, 10)}
                            </span>
                          ) : (
                            product.sales.salesName !== product.name && (
                              <span className="product-share-setting-sub" title={product.sales.salesName}>
                                판매명: {product.sales.salesName}
                              </span>
                            )
                          )}
                        </td>
                        <td className="shared-product-code">{product.code}</td>
                        <td>
                          <span className={`badge ${shareStatusBadgeClass(product.shareStatus)}`}>
                            {product.shareStatus}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${isCustom ? "info" : "gray"}`}>{isCustom ? "별도조건" : "기본조건"}</span>
                        </td>
                        <td className="shared-product-rate">{form.commissionRate ? `${form.commissionRate}%` : "-"}</td>
                        <td>
                          {ownCategory ||
                            (product.shareStatus === "공유 중" ? (
                              <span className="shared-product-unassigned">미지정</span>
                            ) : (
                              <span className="shared-product-muted">
                                {product.shareStatus === "수락대기" ? "수락 후 설정" : "-"}
                              </span>
                            ))}
                        </td>
                        <td>
                          <span className={`badge ${product.sales.homepageVisible ? "success" : "gray"}`}>
                            {product.sales.homepageVisible ? "노출중" : "미노출"}
                          </span>
                        </td>
                        <td>
                          {salesStatus ? (
                            <span className={`badge ${salesStatusBadgeClass(salesStatus)}`}>{salesStatus}</span>
                          ) : (
                            <span className="shared-product-muted">수락 전</span>
                          )}
                        </td>
                        <td>
                          <div className="shared-product-actions">
                            {canRespond ? (
                              <>
                                <button type="button" className="small-btn" onClick={() => requestFlow.openRequest(product)}>
                                  요청 확인
                                </button>
                                <button
                                  type="button"
                                  className="small-btn shared-product-accept-btn"
                                  onClick={() => requestFlow.openAccept(product)}
                                >
                                  수락
                                </button>
                                <button
                                  type="button"
                                  className="small-btn shared-product-reject-btn"
                                  onClick={() => requestFlow.openReject(product)}
                                >
                                  거절
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="small-btn"
                                  onClick={() => router.push(getSharedProductPath(product.code))}
                                >
                                  상세
                                </button>
                                {product.shareStatus === "공유 중" && (
                                  <button
                                    type="button"
                                    className="small-btn"
                                    onClick={() => router.push(getSharedProductSalesPath(product.code))}
                                  >
                                    판매설정
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer>© 2026 AOS Travel ERP · AviaNext</footer>
      </main>
    </ProductAdminShell>
  );
}
