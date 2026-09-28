"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PERMISSION_GROUP_OPTIONS } from "@/lib/admin/members-permission-groups-data";
import { SAMPLE_PRODUCTS, matchesProductSearch } from "@/lib/admin/products-data";
import {
  INITIAL_STAFF_PRODUCT_FILTER,
  STAFF_BANK_OPTIONS,
  STAFF_POSITION_OPTIONS,
  STAFF_PRODUCT_CATEGORY_TREE,
  STAFF_PRODUCT_MAJOR_OPTIONS,
  matchesStaffProductCategoryFilter,
  toggleStaffId,
  validateStaffForm,
  type StaffBasicFormState,
  type StaffFormErrors,
  type StaffProductFilterState,
  type StaffProductScope,
  type StaffScopeFormState,
} from "@/lib/admin/members-staff-form";
import type { ProductSearchField } from "@/lib/admin/products-data";

function RequiredMark() {
  return <b className="member-seller-form-required">*</b>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <small className="member-seller-form-error" role="alert">
      {message}
    </small>
  );
}

type StaffMemberFormProps = {
  mode: "create" | "edit";
  initialBasic: StaffBasicFormState;
  initialScope: StaffScopeFormState;
  onNotify: (message: string) => void;
  onSubmit: (basic: StaffBasicFormState, scope: StaffScopeFormState) => void;
  footer: ReactNode;
  formClassName?: string;
  submitLabel?: string;
};

/**
 * 관리자/직원 신규등록·상세 공통 Form (Mock UI)
 */
export function StaffMemberForm({
  mode,
  initialBasic,
  initialScope,
  onNotify,
  onSubmit,
  footer,
  formClassName,
  submitLabel,
}: StaffMemberFormProps) {
  const [basic, setBasic] = useState<StaffBasicFormState>(initialBasic);
  const [scope, setScope] = useState<StaffScopeFormState>(initialScope);
  const [errors, setErrors] = useState<StaffFormErrors>({});
  const [productDraft, setProductDraft] = useState<StaffProductFilterState>(INITIAL_STAFF_PRODUCT_FILTER);
  const [productApplied, setProductApplied] = useState<StaffProductFilterState>(INITIAL_STAFF_PRODUCT_FILTER);

  const filteredProducts = useMemo(() => {
    return SAMPLE_PRODUCTS.filter((product) => {
      if (!matchesStaffProductCategoryFilter(product.category, productApplied)) return false;
      return matchesProductSearch(product, productApplied.keyword, productApplied.searchField);
    });
  }, [productApplied]);

  const middleOptions = useMemo(() => {
    if (!productDraft.major) return [] as string[];
    return Object.keys(STAFF_PRODUCT_CATEGORY_TREE[productDraft.major] ?? {}).sort((a, b) =>
      a.localeCompare(b, "ko"),
    );
  }, [productDraft.major]);

  const minorOptions = useMemo(() => {
    if (!productDraft.major || !productDraft.middle) return [] as string[];
    return STAFF_PRODUCT_CATEGORY_TREE[productDraft.major]?.[productDraft.middle] ?? [];
  }, [productDraft.major, productDraft.middle]);

  const selectedProducts = useMemo(() => {
    const byCode = new Map(SAMPLE_PRODUCTS.map((product) => [product.code, product]));
    return scope.productCodes
      .map((code) => byCode.get(code))
      .filter((product): product is (typeof SAMPLE_PRODUCTS)[number] => Boolean(product));
  }, [scope.productCodes]);

  const clearError = (key: keyof StaffFormErrors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateBasic = <K extends keyof StaffBasicFormState>(key: K, value: StaffBasicFormState[K]) => {
    setBasic((prev) => ({ ...prev, [key]: value }));
    if (key in { adminCode: 1, password: 1, permissionGroup: 1, koreanName: 1, mobile: 1, email: 1 }) {
      clearError(key as keyof StaffFormErrors);
    }
  };

  const setProductScope = (productScope: StaffProductScope) => {
    setScope((prev) => ({
      ...prev,
      productScope,
      productCodes: productScope === "지정상품" ? prev.productCodes : [],
    }));
    if (productScope !== "지정상품") {
      setProductDraft(INITIAL_STAFF_PRODUCT_FILTER);
      setProductApplied(INITIAL_STAFF_PRODUCT_FILTER);
    }
  };

  const applyProductFilter = () => {
    setProductApplied({ ...productDraft });
  };

  const updateCategoryFilter = (patch: Partial<Pick<StaffProductFilterState, "major" | "middle" | "minor">>) => {
    setProductDraft((prev) => {
      const next = { ...prev, ...patch };
      if ("major" in patch) {
        next.middle = "";
        next.minor = "";
      } else if ("middle" in patch) {
        next.minor = "";
      }
      return next;
    });
    setProductApplied((prev) => {
      const next = { ...prev, ...patch };
      if ("major" in patch) {
        next.middle = "";
        next.minor = "";
      } else if ("middle" in patch) {
        next.minor = "";
      }
      return next;
    });
  };

  const toggleAllVisibleProducts = (checked: boolean) => {
    const visibleCodes = filteredProducts.map((product) => product.code);
    setScope((prev) => {
      if (checked) {
        return {
          ...prev,
          productCodes: Array.from(new Set([...prev.productCodes, ...visibleCodes])),
        };
      }
      return {
        ...prev,
        productCodes: prev.productCodes.filter((code) => !visibleCodes.includes(code)),
      };
    });
  };

  const visibleSelectedCount = filteredProducts.filter((product) =>
    scope.productCodes.includes(product.code),
  ).length;
  const allVisibleSelected =
    filteredProducts.length > 0 && visibleSelectedCount === filteredProducts.length;

  const handleSubmit = () => {
    const nextErrors = validateStaffForm(basic, {
      requirePassword: mode === "create",
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      onNotify("필수 입력값을 확인해주세요.");
      return;
    }
    if (scope.productScope === "지정상품" && scope.productCodes.length === 0) {
      onNotify("담당할 지정상품을 선택해주세요.");
      return;
    }
    onSubmit(basic, scope);
  };

  const radioName = mode === "create" ? "staff-new" : "staff-edit";

  return (
    <div className={formClassName ?? "member-staff-form"}>
      <section className="member-staff-new-section" aria-label="기본정보">
        <div className="member-staff-new-section-head">
          <strong>기본정보</strong>
        </div>
        <div className="member-staff-new-form-body">
          <div className="member-staff-new-modal-row member-staff-new-modal-row--4">
            <div className={`member-web-edit-field${errors.adminCode ? " is-invalid" : ""}`}>
              <span>
                ID <RequiredMark />
              </span>
              {mode === "edit" ? (
                <div className="member-web-edit-readonly">{basic.adminCode}</div>
              ) : (
                <>
                  <div className="member-seller-login-row">
                    <input
                      value={basic.adminCode}
                      onChange={(e) => updateBasic("adminCode", e.target.value.replace(/\s/g, ""))}
                      placeholder="예: changys888"
                      autoComplete="off"
                      aria-label="ID"
                      aria-invalid={Boolean(errors.adminCode)}
                    />
                    <button
                      type="button"
                      className="secondary member-staff-new-mini-btn"
                      onClick={() => onNotify("중복확인 기능은 다음 단계에서 제공됩니다.")}
                    >
                      중복확인
                    </button>
                  </div>
                  <FieldError message={errors.adminCode} />
                </>
              )}
            </div>

            <label className={`member-web-edit-field${errors.password ? " is-invalid" : ""}`}>
              <span>
                비밀번호 {mode === "create" ? <RequiredMark /> : null}
              </span>
              <input
                type="password"
                value={basic.password}
                onChange={(e) => updateBasic("password", e.target.value)}
                placeholder={mode === "edit" ? "변경 시에만 입력" : "비밀번호"}
                autoComplete="new-password"
                aria-label="비밀번호"
                aria-invalid={Boolean(errors.password)}
              />
              <FieldError message={errors.password} />
            </label>

            <label className="member-web-edit-field">
              <span>직급</span>
              <select
                value={basic.position}
                onChange={(e) => updateBasic("position", e.target.value)}
                aria-label="직급"
              >
                <option value="">선택</option>
                {STAFF_POSITION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className={`member-web-edit-field${errors.permissionGroup ? " is-invalid" : ""}`}>
              <span>
                권한그룹 <RequiredMark />
              </span>
              <select
                value={basic.permissionGroup}
                onChange={(e) => updateBasic("permissionGroup", e.target.value)}
                aria-label="권한그룹"
                aria-invalid={Boolean(errors.permissionGroup)}
              >
                <option value="">선택</option>
                {PERMISSION_GROUP_OPTIONS.map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.permissionGroup} />
            </label>
          </div>

          <div className="member-staff-new-modal-row member-staff-new-modal-row--4">
            <label className={`member-web-edit-field${errors.koreanName ? " is-invalid" : ""}`}>
              <span>
                한글이름 <RequiredMark />
              </span>
              <input
                value={basic.koreanName}
                onChange={(e) => updateBasic("koreanName", e.target.value)}
                placeholder="한글이름"
                aria-label="한글이름"
                aria-invalid={Boolean(errors.koreanName)}
              />
              <FieldError message={errors.koreanName} />
            </label>

            <label className="member-web-edit-field">
              <span>영문이름</span>
              <input
                value={basic.englishName}
                onChange={(e) => updateBasic("englishName", e.target.value)}
                placeholder="영문이름"
                aria-label="영문이름"
              />
            </label>

            <label className="member-web-edit-field">
              <span>입사일</span>
              <input
                type="date"
                value={basic.hireDate}
                onChange={(e) => updateBasic("hireDate", e.target.value)}
                aria-label="입사일"
              />
            </label>

            <label className="member-web-edit-field">
              <span>퇴사일</span>
              <input
                type="date"
                value={basic.resignDate}
                onChange={(e) => updateBasic("resignDate", e.target.value)}
                aria-label="퇴사일"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="member-staff-new-section" aria-label="개인정보">
        <div className="member-staff-new-section-head">
          <strong>개인정보</strong>
        </div>
        <div className="member-staff-new-form-body">
          <div className="member-staff-new-modal-row member-staff-new-modal-row--3">
            <label className={`member-web-edit-field${errors.mobile ? " is-invalid" : ""}`}>
              <span>
                휴대폰 <RequiredMark />
              </span>
              <input
                value={basic.mobile}
                onChange={(e) => updateBasic("mobile", e.target.value)}
                placeholder="010-0000-0000"
                aria-label="휴대폰"
                aria-invalid={Boolean(errors.mobile)}
              />
              <FieldError message={errors.mobile} />
            </label>

            <label className="member-web-edit-field">
              <span>직통번호</span>
              <input
                value={basic.directPhone}
                onChange={(e) => updateBasic("directPhone", e.target.value)}
                placeholder="02-0000-0000"
                aria-label="직통번호"
              />
            </label>

            <label className={`member-web-edit-field${errors.email ? " is-invalid" : ""}`}>
              <span>
                이메일 <RequiredMark />
              </span>
              <input
                type="email"
                value={basic.email}
                onChange={(e) => updateBasic("email", e.target.value)}
                placeholder="name@example.com"
                aria-label="이메일"
                aria-invalid={Boolean(errors.email)}
              />
              <FieldError message={errors.email} />
            </label>
          </div>

          <div className="member-staff-new-modal-row member-staff-new-modal-row--address">
            <label className="member-web-edit-field">
              <span>주소</span>
              <input
                value={basic.address}
                onChange={(e) => updateBasic("address", e.target.value)}
                placeholder="기본주소"
                aria-label="주소"
              />
            </label>
            <div className="member-web-edit-field">
              <span>상세주소</span>
              <div className="member-seller-login-row">
                <input
                  value={basic.addressDetail}
                  onChange={(e) => updateBasic("addressDetail", e.target.value)}
                  placeholder="상세주소"
                  aria-label="상세주소"
                />
                <button
                  type="button"
                  className="secondary member-staff-new-mini-btn"
                  onClick={() => onNotify("주소검색 기능은 다음 단계에서 제공됩니다.")}
                >
                  주소검색
                </button>
              </div>
            </div>
          </div>

          <div className="member-staff-new-modal-row member-staff-new-modal-row--3">
            <label className="member-web-edit-field">
              <span>은행</span>
              <select
                value={basic.bank}
                onChange={(e) => updateBasic("bank", e.target.value)}
                aria-label="은행"
              >
                <option value="">선택</option>
                {STAFF_BANK_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="member-web-edit-field">
              <span>계좌번호</span>
              <input
                value={basic.accountNumber}
                onChange={(e) => updateBasic("accountNumber", e.target.value)}
                placeholder="계좌번호"
                aria-label="계좌번호"
              />
            </label>

            <div className="member-web-edit-field">
              <span>계정상태</span>
              <div className="member-staff-new-radio-row" role="radiogroup" aria-label="계정상태">
                <label className="member-staff-new-radio">
                  <input
                    type="radio"
                    name={`${radioName}-account-status`}
                    checked={basic.accountStatus === "사용"}
                    onChange={() => updateBasic("accountStatus", "사용")}
                  />
                  <span>사용</span>
                </label>
                <label className="member-staff-new-radio">
                  <input
                    type="radio"
                    name={`${radioName}-account-status`}
                    checked={basic.accountStatus === "사용중지"}
                    onChange={() => updateBasic("accountStatus", "사용중지")}
                  />
                  <span>사용중지</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="member-staff-new-section" aria-label="업무범위">
        <div className="member-staff-new-section-head">
          <strong>업무범위</strong>
        </div>
        <div className="member-staff-new-form-body">
          <div className="member-web-edit-field">
            <span>담당상품범위</span>
            <div className="member-staff-new-radio-row" role="radiogroup" aria-label="담당상품범위">
              <label className="member-staff-new-radio">
                <input
                  type="radio"
                  name={`${radioName}-product-scope`}
                  checked={scope.productScope === "해당사항없음"}
                  onChange={() => setProductScope("해당사항없음")}
                />
                <span>해당사항없음</span>
              </label>
              <label className="member-staff-new-radio">
                <input
                  type="radio"
                  name={`${radioName}-product-scope`}
                  checked={scope.productScope === "전체상품"}
                  onChange={() => setProductScope("전체상품")}
                />
                <span>전체상품</span>
              </label>
              <label className="member-staff-new-radio">
                <input
                  type="radio"
                  name={`${radioName}-product-scope`}
                  checked={scope.productScope === "지정상품"}
                  onChange={() => setProductScope("지정상품")}
                />
                <span>지정상품</span>
              </label>
            </div>
          </div>

          {scope.productScope === "지정상품" ? (
            <div className="member-staff-new-product-picker" aria-label="지정상품 선택">
              <div className="member-staff-new-product-filters">
                <label className="member-web-edit-field">
                  <span>대분류</span>
                  <select
                    value={productDraft.major}
                    onChange={(e) => updateCategoryFilter({ major: e.target.value })}
                    aria-label="대분류"
                  >
                    <option value="">전체</option>
                    {STAFF_PRODUCT_MAJOR_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="member-web-edit-field">
                  <span>중분류</span>
                  <select
                    value={productDraft.middle}
                    onChange={(e) => updateCategoryFilter({ middle: e.target.value })}
                    aria-label="중분류"
                    disabled={!productDraft.major}
                  >
                    <option value="">전체</option>
                    {middleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="member-web-edit-field">
                  <span>소분류</span>
                  <select
                    value={productDraft.minor}
                    onChange={(e) => updateCategoryFilter({ minor: e.target.value })}
                    aria-label="소분류"
                    disabled={!productDraft.middle || minorOptions.length === 0}
                  >
                    <option value="">전체</option>
                    {minorOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="member-web-edit-field member-staff-new-product-search-field">
                  <span>검색조건</span>
                  <select
                    value={productDraft.searchField}
                    onChange={(e) =>
                      setProductDraft((prev) => ({
                        ...prev,
                        searchField: e.target.value as ProductSearchField,
                      }))
                    }
                    aria-label="상품 검색조건"
                  >
                    <option value="상품명">상품명</option>
                    <option value="상품코드">상품코드</option>
                  </select>
                </label>
                <label className="member-web-edit-field member-staff-new-product-keyword">
                  <span>상품검색</span>
                  <input
                    value={productDraft.keyword}
                    onChange={(e) => setProductDraft((prev) => ({ ...prev, keyword: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyProductFilter();
                      }
                    }}
                    placeholder="검색어"
                    aria-label="상품검색"
                  />
                </label>
                <div className="member-web-edit-field member-staff-new-product-search-action">
                  <span>&nbsp;</span>
                  <button
                    type="button"
                    className="primary member-staff-new-mini-btn"
                    onClick={applyProductFilter}
                  >
                    검색
                  </button>
                </div>
              </div>

              <div className="member-staff-new-product-panels">
                <div className="member-staff-new-product-panel" aria-label="상품선택">
                  <div className="member-staff-new-product-panel-head">
                    <label className="member-staff-new-product-panel-title">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={(e) => toggleAllVisibleProducts(e.target.checked)}
                        disabled={filteredProducts.length === 0}
                        aria-label="현재 목록 전체선택"
                      />
                      <strong>상품선택</strong>
                    </label>
                    <span>{filteredProducts.length}개</span>
                  </div>
                  <div className="member-staff-new-product-list" role="group" aria-label="상품선택 목록">
                    {filteredProducts.length === 0 ? (
                      <p className="member-staff-new-placeholder">검색 결과가 없습니다.</p>
                    ) : (
                      filteredProducts.map((product) => (
                        <label key={product.code} className="member-staff-new-product-row">
                          <input
                            type="checkbox"
                            checked={scope.productCodes.includes(product.code)}
                            onChange={() =>
                              setScope((prev) => ({
                                ...prev,
                                productCodes: toggleStaffId(prev.productCodes, product.code),
                              }))
                            }
                            aria-label={`${product.name} 선택`}
                          />
                          <span className="member-staff-new-product-copy">
                            <em title={product.category}>{product.category}</em>
                            <b title={product.name}>{product.name}</b>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="member-staff-new-product-panel" aria-label="선택된상품">
                  <div className="member-staff-new-product-panel-head">
                    <strong>선택된상품</strong>
                    <span>{selectedProducts.length}개</span>
                  </div>
                  <div className="member-staff-new-product-list" role="group" aria-label="선택된상품 목록">
                    {selectedProducts.length === 0 ? (
                      <p className="member-staff-new-placeholder">선택된 상품이 없습니다.</p>
                    ) : (
                      selectedProducts.map((product) => (
                        <label key={`selected-${product.code}`} className="member-staff-new-product-row">
                          <input
                            type="checkbox"
                            checked
                            onChange={() =>
                              setScope((prev) => ({
                                ...prev,
                                productCodes: prev.productCodes.filter((code) => code !== product.code),
                              }))
                            }
                            aria-label={`${product.name} 선택 해제`}
                          />
                          <span className="member-staff-new-product-copy">
                            <em title={product.category}>{product.category}</em>
                            <b title={product.name}>{product.name}</b>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="member-staff-form-actions">
        <div className="member-staff-form-actions-left">{footer}</div>
        <button type="button" className="primary" onClick={handleSubmit}>
          {submitLabel ?? (mode === "create" ? "등록" : "저장")}
        </button>
      </div>
    </div>
  );
}
