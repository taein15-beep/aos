"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Percent, Plus, Search } from "lucide-react";
import {
  EMPTY_SELLER_PRODUCT_ADD_FILTERS,
  EMPTY_SELLER_PRODUCT_FILTERS,
  SELLER_CATALOG_STATUS_OPTIONS,
  SELLER_PRODUCT_COMMISSION_FILTER_OPTIONS,
  SELLER_PRODUCT_SALES_STATUS_OPTIONS,
  addSellerProducts,
  formatCommissionPercent,
  formatSellerProductDate,
  formatSellerProductPrice,
  getSellerProductCategories,
  getSellerProductSummary,
  listCatalogForAdd,
  listSellerProductRows,
  parseCommissionInput,
  removeSellerProducts,
  setSellerProductCommission,
  setSellerProductSalesStatus,
  sellerProductSalesBadgeClass,
  updateSellerDefaultCommission,
  type SellerAssignedProduct,
  type SellerCommissionMode,
  type SellerProductAddFilters,
  type SellerProductListFilters,
  type SellerProductRow,
} from "@/lib/admin/members-seller-products-data";

type Props = {
  sellerId: string;
  sellerName: string;
  onNotify: (message: string) => void;
  onBundleChanged?: () => void;
};

type CommissionModalState =
  | { mode: "single"; productCode: string; productName: string }
  | { mode: "bulk"; productCodes: string[] }
  | null;

function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="member-affiliate-detail-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function SellerProductsPanel({ sellerId, sellerName, onNotify, onBundleChanged }: Props) {
  const [revision, setRevision] = useState(0);
  const [draftFilter, setDraftFilter] = useState<SellerProductListFilters>(EMPTY_SELLER_PRODUCT_FILTERS);
  const [appliedFilter, setAppliedFilter] = useState<SellerProductListFilters>(EMPTY_SELLER_PRODUCT_FILTERS);
  const [selected, setSelected] = useState<string[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<SellerProductAddFilters>(EMPTY_SELLER_PRODUCT_ADD_FILTERS);
  const [addApplied, setAddApplied] = useState<SellerProductAddFilters>(EMPTY_SELLER_PRODUCT_ADD_FILTERS);
  const [addSelected, setAddSelected] = useState<string[]>([]);

  const [defaultOpen, setDefaultOpen] = useState(false);
  const [defaultInput, setDefaultInput] = useState("");
  const [defaultError, setDefaultError] = useState("");

  const [commissionModal, setCommissionModal] = useState<CommissionModalState>(null);
  const [commissionMode, setCommissionMode] = useState<SellerCommissionMode>("기본");
  const [commissionInput, setCommissionInput] = useState("");
  const [commissionError, setCommissionError] = useState("");

  const refresh = () => {
    setRevision((value) => value + 1);
    setSelected([]);
    onBundleChanged?.();
  };

  const { bundle, rows } = useMemo(
    () => listSellerProductRows(sellerId, appliedFilter),
    [sellerId, appliedFilter, revision],
  );
  const summary = useMemo(() => getSellerProductSummary(sellerId), [sellerId, revision]);
  const categories = useMemo(() => getSellerProductCategories(), []);

  const addRows = useMemo(
    () => listCatalogForAdd(sellerId, addApplied),
    [sellerId, addApplied, revision],
  );

  const allChecked = rows.length > 0 && rows.every((row) => selected.includes(row.productCode));

  const toggleAll = () => {
    if (allChecked) {
      setSelected([]);
      return;
    }
    setSelected(rows.map((row) => row.productCode));
  };

  const toggleOne = (code: string) => {
    setSelected((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  };

  const applySearch = () => setAppliedFilter({ ...draftFilter });
  const resetSearch = () => {
    setDraftFilter(EMPTY_SELLER_PRODUCT_FILTERS);
    setAppliedFilter(EMPTY_SELLER_PRODUCT_FILTERS);
  };

  const openDefaultModal = () => {
    setDefaultInput(
      summary.defaultCommissionRate == null ? "" : String(summary.defaultCommissionRate),
    );
    setDefaultError("");
    setDefaultOpen(true);
  };

  const saveDefault = () => {
    const parsed = parseCommissionInput(defaultInput);
    if (!parsed.ok) {
      setDefaultError(parsed.message);
      return;
    }
    const result = updateSellerDefaultCommission(sellerId, parsed.value);
    if (!result.ok) {
      setDefaultError(result.message);
      return;
    }
    setDefaultOpen(false);
    refresh();
    onNotify(`기본 수수료를 ${formatCommissionPercent(parsed.value)}(으)로 저장했습니다.`);
  };

  const openAddModal = () => {
    setAddDraft(EMPTY_SELLER_PRODUCT_ADD_FILTERS);
    setAddApplied(EMPTY_SELLER_PRODUCT_ADD_FILTERS);
    setAddSelected([]);
    setAddOpen(true);
  };

  const confirmAdd = () => {
    const result = addSellerProducts(sellerId, addSelected);
    if (!result.ok) {
      onNotify(result.message);
      return;
    }
    setAddOpen(false);
    refresh();
    onNotify(`판매상품 ${result.added}개를 추가했습니다.`);
  };

  const openSingleCommission = (row: SellerProductRow) => {
    setCommissionModal({
      mode: "single",
      productCode: row.productCode,
      productName: row.catalog.name,
    });
    setCommissionMode(row.commissionMode);
    setCommissionInput(row.customRate == null ? "" : String(row.customRate));
    setCommissionError("");
  };

  const openBulkCommission = () => {
    if (selected.length === 0) {
      onNotify("수수료를 설정할 상품을 선택해 주세요.");
      return;
    }
    setCommissionModal({ mode: "bulk", productCodes: [...selected] });
    setCommissionMode("개별");
    setCommissionInput("");
    setCommissionError("");
  };

  const saveCommission = () => {
    if (!commissionModal) return;
    let mode = commissionMode;
    let rate: number | null = null;
    if (commissionModal.mode === "bulk") {
      mode = "개별";
    }
    if (mode === "개별") {
      const parsed = parseCommissionInput(commissionInput);
      if (!parsed.ok) {
        setCommissionError(parsed.message);
        return;
      }
      rate = parsed.value;
    }
    const codes =
      commissionModal.mode === "single" ? [commissionModal.productCode] : commissionModal.productCodes;
    const result = setSellerProductCommission(sellerId, codes, mode, rate);
    if (!result.ok) {
      setCommissionError(result.message);
      return;
    }
    setCommissionModal(null);
    refresh();
    onNotify(codes.length > 1 ? `선택한 상품 ${codes.length}개의 수수료를 저장했습니다.` : "상품 수수료를 저장했습니다.");
  };

  const bulkSalesStatus = (status: SellerAssignedProduct["salesStatus"]) => {
    if (selected.length === 0) {
      onNotify("대상 상품을 선택해 주세요.");
      return;
    }
    const result = setSellerProductSalesStatus(sellerId, selected, status);
    if (!result.ok) {
      onNotify(result.message);
      return;
    }
    refresh();
    onNotify(`선택한 상품을 ${status}(으)로 변경했습니다.`);
  };

  const toggleRowSales = (row: SellerProductRow) => {
    const next = row.salesStatus === "판매가능" ? "판매중지" : "판매가능";
    const result = setSellerProductSalesStatus(sellerId, [row.productCode], next);
    if (!result.ok) {
      onNotify(result.message);
      return;
    }
    refresh();
    onNotify(`${row.catalog.name}을(를) ${next}(으)로 변경했습니다.`);
  };

  const removeSelected = () => {
    if (selected.length === 0) {
      onNotify("제거할 상품을 선택해 주세요.");
      return;
    }
    const confirmed = window.confirm(
      selected.length === 1
        ? "해당 상품을 판매점 판매상품에서 제거하시겠습니까?"
        : `선택한 상품 ${selected.length}개를 판매점 판매상품에서 제거하시겠습니까?\n원본 여행상품은 삭제되지 않습니다.`,
    );
    if (!confirmed) return;
    const result = removeSellerProducts(sellerId, selected);
    if (!result.ok) {
      onNotify(result.message);
      return;
    }
    refresh();
    onNotify("판매상품에서 제거했습니다.");
  };

  const removeOne = (code: string) => {
    const confirmed = window.confirm("해당 상품을 판매점 판매상품에서 제거하시겠습니까?");
    if (!confirmed) return;
    const result = removeSellerProducts(sellerId, [code]);
    if (!result.ok) {
      onNotify(result.message);
      return;
    }
    refresh();
    onNotify("판매상품에서 제거했습니다.");
  };

  const defaultLabel =
    summary.defaultCommissionRate == null
      ? "미설정"
      : formatCommissionPercent(summary.defaultCommissionRate);

  return (
    <div className="member-affiliate-detail-stack member-seller-products">
      <section className="member-web-detail-summary" aria-label="판매상품 요약">
        <article className="member-web-detail-kpi">
          <span>
            <small>판매 가능 상품</small>
            <strong>{summary.sellableCount}개</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>전체 등록상품</small>
            <strong>{summary.catalogTotal}개</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>기본 수수료</small>
            <strong>{defaultLabel}</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>상품별 개별수수료</small>
            <strong>{summary.individualCommissionCount}개</strong>
          </span>
        </article>
      </section>

      <section className="panel member-affiliate-detail-card">
        <div className="member-affiliate-detail-card-head">
          <strong>기본 판매수수료</strong>
          <button type="button" className="secondary" onClick={openDefaultModal}>
            <Percent size={14} aria-hidden="true" />
            수정
          </button>
        </div>
        <div className="member-affiliate-detail-info-grid member-affiliate-detail-info-grid--2">
          <InfoField label="판매점" value={sellerName} />
          <InfoField
            label="기본 판매수수료"
            value={
              summary.defaultCommissionRate == null ? (
                <span className="badge gray">미설정</span>
              ) : (
                <span className="badge success">{defaultLabel}</span>
              )
            }
          />
        </div>
        <p className="member-affiliate-detail-hint member-affiliate-detail-hint--pad">
          개별 수수료가 없는 판매상품에 적용됩니다. 입력 범위는 0~100%이며 소수점(예: 7.5%)을 지원합니다.
        </p>
      </section>

      <section className="panel member-affiliate-filter member-seller-products-filter">
        <div className="member-affiliate-filter-grid member-seller-products-filter-grid">
          <label>
            <span>통합검색</span>
            <input
              value={draftFilter.keyword}
              onChange={(event) => setDraftFilter((current) => ({ ...current, keyword: event.target.value }))}
              placeholder="상품명, 상품코드 검색"
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
            />
          </label>
          <label>
            <span>카테고리</span>
            <select
              value={draftFilter.category}
              onChange={(event) =>
                setDraftFilter((current) => ({ ...current, category: event.target.value }))
              }
            >
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>판매상태</span>
            <select
              value={draftFilter.salesStatus}
              onChange={(event) =>
                setDraftFilter((current) => ({
                  ...current,
                  salesStatus: event.target.value as SellerProductListFilters["salesStatus"],
                }))
              }
            >
              {SELLER_PRODUCT_SALES_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>수수료 설정</span>
            <select
              value={draftFilter.commissionFilter}
              onChange={(event) =>
                setDraftFilter((current) => ({
                  ...current,
                  commissionFilter: event.target.value as SellerProductListFilters["commissionFilter"],
                }))
              }
            >
              {SELLER_PRODUCT_COMMISSION_FILTER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="member-affiliate-filter-actions">
          <button type="button" className="secondary" onClick={resetSearch}>
            조건 초기화
          </button>
          <button type="button" className="primary" onClick={applySearch}>
            <Search size={14} aria-hidden="true" />
            검색
          </button>
        </div>
      </section>

      <section className="panel member-affiliate-detail-card">
        <div className="member-affiliate-detail-card-head member-seller-products-toolbar">
          <strong>판매상품 목록</strong>
          <span className="member-affiliate-detail-count">{rows.length}건</span>
          <div className="member-seller-products-toolbar-actions">
            <button type="button" className="secondary" disabled={selected.length === 0} onClick={() => bulkSalesStatus("판매가능")}>
              판매가능
            </button>
            <button type="button" className="secondary" disabled={selected.length === 0} onClick={() => bulkSalesStatus("판매중지")}>
              판매중지
            </button>
            <button type="button" className="secondary" disabled={selected.length === 0} onClick={openBulkCommission}>
              수수료 일괄설정
            </button>
            <button type="button" className="member-affiliate-detail-danger-btn" disabled={selected.length === 0} onClick={removeSelected}>
              판매상품 제거
            </button>
            <button type="button" className="secondary" onClick={openDefaultModal}>
              기본 수수료 설정
            </button>
            <button type="button" className="primary" onClick={openAddModal}>
              <Plus size={14} aria-hidden="true" />
              상품 추가
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="member-affiliate-detail-empty">
            <strong>등록된 판매상품이 없습니다.</strong>
            <p>상품 추가 버튼으로 판매 허용 상품을 지정해 주세요.</p>
            <button type="button" className="primary" onClick={openAddModal}>
              상품 추가
            </button>
          </div>
        ) : (
          <div className="member-affiliate-detail-table-wrap">
            <table className="member-affiliate-detail-table member-seller-products-table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="전체 선택" />
                  </th>
                  <th>상품명</th>
                  <th>상품코드</th>
                  <th>카테고리</th>
                  <th>판매상태</th>
                  <th>판매가</th>
                  <th>수수료</th>
                  <th>예상 수수료</th>
                  <th>등록일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.productCode}>
                    <td className="member-seller-check">
                      <input
                        type="checkbox"
                        checked={selected.includes(row.productCode)}
                        onChange={() => toggleOne(row.productCode)}
                        aria-label={`${row.catalog.name} 선택`}
                      />
                    </td>
                    <td className="text-left member-seller-products-name">{row.catalog.name}</td>
                    <td className="member-number">{row.catalog.code}</td>
                    <td className="text-left">{row.catalog.category}</td>
                    <td>
                      <button
                        type="button"
                        className="member-seller-products-status-btn"
                        onClick={() => toggleRowSales(row)}
                        title="클릭 시 판매점 판매상태 전환 (원본 상품 상태 변경 없음)"
                      >
                        <span className={`badge ${sellerProductSalesBadgeClass(row.salesStatus)}`}>
                          {row.salesStatus}
                        </span>
                      </button>
                    </td>
                    <td className="amount-cell">{formatSellerProductPrice(row.catalog.price)}</td>
                    <td className="text-left">
                      <button
                        type="button"
                        className="member-seller-products-commission-btn"
                        onClick={() => openSingleCommission(row)}
                      >
                        <b>{row.commissionLabel.primary}</b>
                        {row.commissionLabel.secondary ? <small>{row.commissionLabel.secondary}</small> : null}
                      </button>
                    </td>
                    <td className="amount-cell">
                      {row.expectedCommission == null
                        ? "-"
                        : formatSellerProductPrice(row.expectedCommission)}
                    </td>
                    <td className="date-cell">{formatSellerProductDate(row.assignedAt)}</td>
                    <td>
                      <div className="member-seller-action-group">
                        <button type="button" className="secondary" onClick={() => openSingleCommission(row)}>
                          수수료
                        </button>
                        <button type="button" className="secondary" onClick={() => removeOne(row.productCode)}>
                          제거
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {addOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setAddOpen(false)}>
          <div
            className="modal member-affiliate-review-modal member-affiliate-review-modal--wide member-seller-products-add-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-product-add-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="seller-product-add-title">판매상품 추가</h3>
              <button type="button" onClick={() => setAddOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <p>
                <strong>{sellerName}</strong>에 판매 허용할 상품을 선택합니다. 이미 등록된 상품은 선택할 수 없습니다.
              </p>
              <div className="member-seller-products-add-filters">
                <label>
                  <span>검색</span>
                  <input
                    value={addDraft.keyword}
                    onChange={(event) => setAddDraft((current) => ({ ...current, keyword: event.target.value }))}
                    placeholder="상품명, 상품코드"
                  />
                </label>
                <label>
                  <span>카테고리</span>
                  <select
                    value={addDraft.category}
                    onChange={(event) => setAddDraft((current) => ({ ...current, category: event.target.value }))}
                  >
                    {categories.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>판매상태</span>
                  <select
                    value={addDraft.catalogStatus}
                    onChange={(event) =>
                      setAddDraft((current) => ({
                        ...current,
                        catalogStatus: event.target.value as SellerProductAddFilters["catalogStatus"],
                      }))
                    }
                  >
                    {SELLER_CATALOG_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setAddApplied({ ...addDraft });
                    setAddSelected([]);
                  }}
                >
                  검색
                </button>
              </div>
              <div className="member-affiliate-detail-table-wrap">
                <table className="member-affiliate-detail-table member-seller-products-add-table">
                  <thead>
                    <tr>
                      <th>선택</th>
                      <th>상품명</th>
                      <th>상품코드</th>
                      <th>카테고리</th>
                      <th>판매상태</th>
                      <th>판매가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addRows.map((row) => (
                      <tr key={row.code} className={row.alreadyAssigned ? "is-disabled" : undefined}>
                        <td>
                          {row.alreadyAssigned ? (
                            <span className="badge gray">등록됨</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={addSelected.includes(row.code)}
                              onChange={() =>
                                setAddSelected((current) =>
                                  current.includes(row.code)
                                    ? current.filter((item) => item !== row.code)
                                    : [...current, row.code],
                                )
                              }
                              aria-label={`${row.name} 선택`}
                            />
                          )}
                        </td>
                        <td className="text-left">{row.name}</td>
                        <td>{row.code}</td>
                        <td className="text-left">{row.category}</td>
                        <td>
                          <span className={`badge ${row.catalogStatus === "판매중" ? "success" : "gray"}`}>
                            {row.catalogStatus}
                          </span>
                        </td>
                        <td className="amount-cell">{formatSellerProductPrice(row.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setAddOpen(false)}>
                취소
              </button>
              <button type="button" className="primary" onClick={confirmAdd} disabled={addSelected.length === 0}>
                선택상품 추가
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {defaultOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setDefaultOpen(false)}>
          <div
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-default-commission-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="seller-default-commission-title">기본 수수료 설정</h3>
              <button type="button" onClick={() => setDefaultOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <p>판매점 전체에 적용되는 기본 판매수수료를 설정합니다. (0~100%, 소수점 가능)</p>
              <label className={`member-affiliate-review-modal-field${defaultError ? " is-invalid" : ""}`}>
                <span>
                  기본 판매수수료 <b>*</b>
                </span>
                <input
                  value={defaultInput}
                  onChange={(event) => {
                    setDefaultError("");
                    setDefaultInput(event.target.value);
                  }}
                  placeholder="예: 5 또는 7.5"
                  inputMode="decimal"
                />
              </label>
              {defaultError ? (
                <div className="member-affiliate-review-modal-error" role="alert">
                  <p>{defaultError}</p>
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setDefaultOpen(false)}>
                취소
              </button>
              <button type="button" className="primary" onClick={saveDefault}>
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {commissionModal ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setCommissionModal(null)}>
          <div
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-product-commission-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="seller-product-commission-title">
                {commissionModal.mode === "bulk" ? "수수료 일괄설정" : "상품 판매수수료 설정"}
              </h3>
              <button type="button" onClick={() => setCommissionModal(null)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              {commissionModal.mode === "single" ? (
                <p>
                  상품명: <strong>{commissionModal.productName}</strong>
                </p>
              ) : (
                <p>
                  선택한 상품 <strong>{commissionModal.productCodes.length}개</strong>의 수수료를 설정합니다.
                </p>
              )}
              {commissionModal.mode === "single" ? (
                <fieldset className="member-affiliate-review-modal-fieldset">
                  <legend>수수료 적용 방식</legend>
                  <label>
                    <input
                      type="radio"
                      name="seller-commission-mode"
                      checked={commissionMode === "기본"}
                      onChange={() => {
                        setCommissionMode("기본");
                        setCommissionError("");
                      }}
                    />
                    기본 수수료 적용
                    {bundle.defaultCommissionRate != null
                      ? ` (${formatCommissionPercent(bundle.defaultCommissionRate)})`
                      : " (미설정)"}
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="seller-commission-mode"
                      checked={commissionMode === "개별"}
                      onChange={() => {
                        setCommissionMode("개별");
                        setCommissionError("");
                      }}
                    />
                    개별 수수료 적용
                  </label>
                </fieldset>
              ) : null}
              {(commissionModal.mode === "bulk" || commissionMode === "개별") && (
                <label className={`member-affiliate-review-modal-field${commissionError ? " is-invalid" : ""}`}>
                  <span>
                    개별 수수료 (%) <b>*</b>
                  </span>
                  <input
                    value={commissionInput}
                    onChange={(event) => {
                      setCommissionError("");
                      setCommissionInput(event.target.value);
                    }}
                    placeholder="예: 7 또는 7.5"
                    inputMode="decimal"
                  />
                </label>
              )}
              {commissionError ? (
                <div className="member-affiliate-review-modal-error" role="alert">
                  <p>{commissionError}</p>
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setCommissionModal(null)}>
                취소
              </button>
              <button type="button" className="primary" onClick={saveCommission}>
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
