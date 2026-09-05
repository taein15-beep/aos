"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FILE_ACCEPT,
  INITIAL_SELLER_APPLY_FORM,
  MAX_APPLICATION_NOTE_LENGTH,
  MAX_FILE_SIZE_LABEL,
  MAX_OTHER_FILES,
  OPTIONAL_SELLER_TERM_KEYS,
  PROTOTYPE_OPERATOR_AGENCY_DISPLAY_NAME,
  REQUIRED_SELLER_TERM_KEYS,
  SELLER_POLICY_GUIDE_ITEMS,
  SELLER_TERM_ITEMS,
  SELLER_TYPE_LABELS,
  SELLER_TYPE_OPTIONS,
  applicationNoteLength,
  changeSellerType,
  createPrototypeSellerApplyReceipt,
  firstSellerErrorFieldId,
  formatBusinessNumberInput,
  formatFileSize,
  formatMobilePhoneInput,
  getAttachmentSlotsForSellerType,
  hasDedicatedSellerTypeData,
  hasSellerApplyErrors,
  isSellerApplyFormDirty,
  isValidBusinessNumber,
  isValidMobilePhone,
  savePrototypeSellerApplyReceipt,
  sanitizeSellerFilePickErrors,
  setRepresentativeIsContact,
  setUseBusinessNameAsSellerName,
  setUseContactPhoneAsReferralCode,
  updateBusinessName,
  updateContactPhone,
  updateRepresentativeName,
  validateAttachmentFile,
  validateSellerApplyForm,
  type SelectedSellerType,
  type SellerApplyFieldErrors,
  type SellerApplyForm as SellerApplyFormState,
  type SellerSingleAttachmentKey,
  type SellerTermItem,
  type SellerType,
} from "./form-state";

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <span className="seller-field-label">
      <label htmlFor={htmlFor}>
        {children}
        {required ? <em aria-label="필수">*</em> : null}
      </label>
    </span>
  );
}

function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <small className="seller-field-error" role="alert" id={id}>
      {message}
    </small>
  );
}

function ImageFilePreview({ file }: { file: File }) {
  const url = useMemo(() => {
    if (!file.type.startsWith("image/")) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="seller-file-preview" src={url} alt={`${file.name} 미리보기`} />
  );
}

function SingleAttachmentSlot({
  id,
  label,
  required,
  file,
  error,
  onSelect,
  onClear,
}: {
  id: string;
  label: string;
  required?: boolean;
  file: File | null;
  error?: string;
  onSelect: (file: File | null, pickError: string | null) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const errorId = `${id}-error`;

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    el.value = "";
    el.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const item = event.target.files?.[0] ?? null;
    if (!item) {
      onSelect(null, null);
      return;
    }
    const invalid = validateAttachmentFile(item);
    if (invalid) {
      onSelect(file, invalid);
      return;
    }
    onSelect(item, null);
  };

  return (
    <div className={`seller-file-slot ${error ? "is-invalid" : ""}`} id={id}>
      <div className="seller-file-slot-head">
        <FieldLabel required={required} htmlFor={`${id}-input`}>
          {label}
        </FieldLabel>
        <button type="button" className="button ghost dark compact" onClick={openPicker}>
          {file ? "교체" : "파일 선택"}
        </button>
        <input
          ref={inputRef}
          id={`${id}-input`}
          className="seller-file-input-hidden"
          type="file"
          accept={FILE_ACCEPT}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={handleChange}
        />
      </div>
      {!file ? (
        <p className="seller-file-empty">선택된 파일이 없습니다.</p>
      ) : (
        <ul className="seller-file-list">
          <li>
            <div className="seller-file-meta">
              <strong>{file.name}</strong>
              <span>
                {formatFileSize(file.size)} · {file.type || "파일"}
              </span>
              <ImageFilePreview file={file} />
            </div>
            <button type="button" className="button ghost dark compact" onClick={onClear}>
              삭제
            </button>
          </li>
        </ul>
      )}
      <FieldError message={error} id={errorId} />
    </div>
  );
}

function MultipleAttachmentSlot({
  id,
  label,
  files,
  error,
  onSelect,
  onRemoveAt,
}: {
  id: string;
  label: string;
  files: File[];
  error?: string;
  onSelect: (files: File[], pickError: string | null) => void;
  onRemoveAt: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const errorId = `${id}-error`;

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    el.value = "";
    el.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;
    const nextFiles = [...files];
    let pickError: string | null = null;
    for (const item of selected) {
      if (nextFiles.length >= MAX_OTHER_FILES) {
        pickError = `기타 증빙서류는 최대 ${MAX_OTHER_FILES}개까지 첨부할 수 있습니다.`;
        break;
      }
      const invalid = validateAttachmentFile(item);
      if (invalid) {
        pickError = invalid;
        break;
      }
      nextFiles.push(item);
    }
    onSelect(pickError ? files : nextFiles, pickError);
  };

  return (
    <div className={`seller-file-slot ${error ? "is-invalid" : ""}`} id={id}>
      <div className="seller-file-slot-head">
        <FieldLabel htmlFor={`${id}-input`}>
          {label} (최대 {MAX_OTHER_FILES}개)
        </FieldLabel>
        <button type="button" className="button ghost dark compact" onClick={openPicker}>
          {files.length > 0 ? "추가" : "파일 선택"}
        </button>
        <input
          ref={inputRef}
          id={`${id}-input`}
          className="seller-file-input-hidden"
          type="file"
          accept={FILE_ACCEPT}
          multiple
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={handleChange}
        />
      </div>
      {files.length === 0 ? (
        <p className="seller-file-empty">선택된 파일이 없습니다.</p>
      ) : (
        <ul className="seller-file-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`}>
              <div className="seller-file-meta">
                <strong>{file.name}</strong>
                <span>
                  {formatFileSize(file.size)} · {file.type || "파일"}
                </span>
                <ImageFilePreview file={file} />
              </div>
              <button
                type="button"
                className="button ghost dark compact"
                onClick={() => onRemoveAt(index)}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
      <FieldError message={error} id={errorId} />
    </div>
  );
}

export function SellerApplyForm() {
  const router = useRouter();
  const [form, setForm] = useState<SellerApplyFormState>(INITIAL_SELLER_APPLY_FORM);
  const [errors, setErrors] = useState<SellerApplyFieldErrors>({});
  const [filePickErrors, setFilePickErrors] = useState<Partial<Record<string, string>>>({});
  const [businessCheckNote, setBusinessCheckNote] = useState("");
  const [referralCheckNote, setReferralCheckNote] = useState("");
  const [addressSearchNote, setAddressSearchNote] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [typeChangeOpen, setTypeChangeOpen] = useState(false);
  const [pendingSellerType, setPendingSellerType] = useState<SelectedSellerType | null>(null);
  const [openTerm, setOpenTerm] = useState<SellerTermItem | null>(null);
  const [submitBanner, setSubmitBanner] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allTermKeys = useMemo(
    () => [...REQUIRED_SELLER_TERM_KEYS, ...OPTIONAL_SELLER_TERM_KEYS] as const,
    [],
  );
  const allTermsChecked = allTermKeys.every((key) => form[key]);
  const attachmentSlots = getAttachmentSlotsForSellerType(form.sellerType);
  const isBusiness = form.sellerType === "business";
  const isIndividual = form.sellerType === "individual";

  const clearFieldError = (key: keyof SellerApplyFormState) => {
    setErrors((current) => {
      if (!current[key] && key !== "agreeTerms") return current;
      const next = { ...current };
      delete next[key];
      if (
        REQUIRED_SELLER_TERM_KEYS.includes(key as (typeof REQUIRED_SELLER_TERM_KEYS)[number]) ||
        key === "agreeTerms"
      ) {
        delete next.agreeTerms;
      }
      return next;
    });
  };

  const updateField = <K extends keyof SellerApplyFormState>(
    key: K,
    value: SellerApplyFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    clearFieldError(key);
    setSubmitBanner("");
  };

  const setSingleAttachment = (
    key: SellerSingleAttachmentKey,
    file: File | null,
    pickError: string | null,
  ) => {
    setForm((current) => ({ ...current, [key]: file }));
    setFilePickErrors((current) => {
      const next = { ...current };
      if (pickError) next[key] = pickError;
      else delete next[key];
      return next;
    });
    clearFieldError(key);
    setSubmitBanner("");
  };

  const setOtherFiles = (files: File[], pickError: string | null) => {
    setForm((current) => ({ ...current, otherFiles: files }));
    setFilePickErrors((current) => {
      const next = { ...current };
      if (pickError) next.otherFiles = pickError;
      else delete next.otherFiles;
      return next;
    });
    clearFieldError("otherFiles");
    setSubmitBanner("");
  };

  const requestSellerType = (nextType: SellerType) => {
    if (form.sellerType === nextType) return;
    if (form.sellerType && hasDedicatedSellerTypeData(form)) {
      setPendingSellerType(nextType);
      setTypeChangeOpen(true);
      return;
    }
    applySellerType(nextType);
  };

  const applySellerType = (nextType: SelectedSellerType) => {
    setForm((current) => changeSellerType(current, nextType));
    setFilePickErrors({});
    setErrors({});
    setBusinessCheckNote("");
    setAddressSearchNote("");
    setSubmitBanner("");
    setTypeChangeOpen(false);
    setPendingSellerType(null);
  };

  const setAgreeAll = (checked: boolean) => {
    setForm((current) => {
      const next = { ...current };
      for (const key of allTermKeys) next[key] = checked;
      return next;
    });
    clearFieldError("agreeTerms");
    setSubmitBanner("");
  };

  const focusFirstError = (nextErrors: SellerApplyFieldErrors) => {
    const id = firstSellerErrorFieldId(nextErrors);
    if (!id) return;
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusTarget =
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLButtonElement
        ? el
        : el?.querySelector<HTMLElement>("input, select, textarea, button");
    focusTarget?.focus?.();
  };

  const requestBusinessNumberCheck = () => {
    if (!form.businessNumber.trim()) {
      setBusinessCheckNote("");
      setErrors((current) => ({
        ...current,
        businessNumber: "사업자등록번호를 입력해 주세요.",
      }));
      document.getElementById("businessNumber")?.focus();
      return;
    }
    if (!isValidBusinessNumber(form.businessNumber)) {
      setBusinessCheckNote("");
      setErrors((current) => ({
        ...current,
        businessNumber: "사업자등록번호 형식이 올바르지 않습니다. (예: 000-00-00000)",
      }));
      document.getElementById("businessNumber")?.focus();
      return;
    }
    clearFieldError("businessNumber");
    setBusinessCheckNote("형식이 확인되었습니다. 실제 중복 여부는 가입 심사 과정에서 확인됩니다.");
  };

  const requestReferralCheck = () => {
    if (!form.referralCodePhone.trim()) {
      setReferralCheckNote("");
      setErrors((current) => ({
        ...current,
        referralCodePhone: "추천인코드용 휴대전화번호를 입력해 주세요.",
      }));
      document.getElementById("referralCodePhone")?.focus();
      return;
    }
    if (!isValidMobilePhone(form.referralCodePhone)) {
      setReferralCheckNote("");
      setErrors((current) => ({
        ...current,
        referralCodePhone:
          "추천인코드용 휴대전화번호 형식이 올바르지 않습니다. (예: 010-0000-0000)",
      }));
      document.getElementById("referralCodePhone")?.focus();
      return;
    }
    clearFieldError("referralCodePhone");
    setReferralCheckNote(
      "형식이 확인되었습니다. 동일 여행사 내 실제 중복 여부는 가입 심사 과정에서 확인됩니다.",
    );
  };

  const requestAddressSearch = () => {
    setAddressSearchNote("실제 주소검색은 우편번호 API 연동 후 제공됩니다.");
  };

  const requestCancel = () => {
    if (!isSellerApplyFormDirty(form)) {
      router.push("/seller");
      return;
    }
    setCancelOpen(true);
  };

  const confirmCancel = () => {
    setCancelOpen(false);
    router.push("/seller");
  };

  const handleSubmit = () => {
    const nextErrors = validateSellerApplyForm(form);
    const activePickErrors = sanitizeSellerFilePickErrors(form, filePickErrors);
    if (Object.keys(activePickErrors).length !== Object.keys(filePickErrors).length) {
      setFilePickErrors(activePickErrors);
    }

    const pickKeys = Object.keys(activePickErrors);
    if (hasSellerApplyErrors(nextErrors) || pickKeys.length > 0) {
      setErrors(nextErrors);
      setSubmitBanner("입력·동의·서류 항목을 확인해 주세요.");
      const merged: SellerApplyFieldErrors = { ...nextErrors };
      for (const key of pickKeys) {
        const message = activePickErrors[key];
        if (message && key in INITIAL_SELLER_APPLY_FORM) {
          merged[key as keyof SellerApplyFormState] = message;
        }
      }
      focusFirstError(hasSellerApplyErrors(merged) ? merged : nextErrors);
      return;
    }

    setSubmitting(true);
    setSubmitBanner("");
    const receipt = createPrototypeSellerApplyReceipt(form);
    savePrototypeSellerApplyReceipt(receipt);
    router.push("/seller/apply/complete");
  };

  useEffect(() => {
    if (!cancelOpen && !typeChangeOpen && !openTerm) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCancelOpen(false);
        setTypeChangeOpen(false);
        setPendingSellerType(null);
        setOpenTerm(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelOpen, typeChangeOpen, openTerm]);

  return (
    <main className="seller-apply-page">
      <div className="shell seller-apply-shell">
        <nav className="seller-apply-breadcrumb" aria-label="현재 위치">
          <Link href="/">홈</Link>
          <span aria-hidden="true">/</span>
          <Link href="/seller">판매점</Link>
          <span aria-hidden="true">/</span>
          <span>가입신청</span>
        </nav>

        <header className="seller-apply-intro">
          <span className="section-kicker">SELLER APPLY</span>
          <h1>판매점 가입신청</h1>
          <p>
            현재 홈페이지 운영 여행사의 판매점으로 가입을 신청합니다. 가입 승인 후 여행사가 판매 가능
            상품과 수수료 조건을 설정합니다.
          </p>
          <p className="seller-apply-belong" role="note">
            가입 대상: <strong>{PROTOTYPE_OPERATOR_AGENCY_DISPLAY_NAME}</strong>
            <br />
            가입할 여행사를 검색하거나 선택하지 않습니다.
          </p>
          <p className="seller-apply-temp-note" role="note">
            프론트엔드 프로토타입입니다. API·DB 저장, 실제 파일 업로드, 이메일 발송은 아직 연결되지
            않습니다.
          </p>
        </header>

        <section className="seller-apply-panel" aria-labelledby="seller-apply-form-title">
          <header className="seller-apply-panel-head">
            <span>APPLICATION</span>
            <h2 id="seller-apply-form-title">가입신청서</h2>
            <p>아래 항목을 한 페이지에서 작성한 뒤 신청해 주세요.</p>
            {submitBanner ? (
              <p className="seller-apply-submit-banner" role="alert">
                {submitBanner}
              </p>
            ) : null}
          </header>

          <section className="seller-apply-section" aria-labelledby="seller-guide-title">
            <header className="seller-apply-section-head">
              <h3 id="seller-guide-title">판매점 가입 안내</h3>
              <p>가입 및 판매점 운영 기준입니다.</p>
            </header>
            <div className="seller-apply-policy-box">
              <ul>
                {SELLER_POLICY_GUIDE_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="seller-apply-section" aria-labelledby="seller-type-title">
            <header className="seller-apply-section-head">
              <h3 id="seller-type-title">
                가입유형 선택 <em aria-label="필수">*</em>
              </h3>
              <p>사업자 판매점과 개인 판매점 중 하나를 선택해 주세요.</p>
            </header>
            <div
              className={`seller-type-choice ${errors.sellerType ? "is-invalid" : ""}`}
              id="sellerType"
              role="radiogroup"
              aria-label="가입유형"
              aria-invalid={Boolean(errors.sellerType)}
            >
              {SELLER_TYPE_OPTIONS.map((type) => (
                <label key={type} className={`seller-type-option ${form.sellerType === type ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="sellerType"
                    value={type}
                    checked={form.sellerType === type}
                    onChange={() => requestSellerType(type)}
                  />
                  <span>
                    <strong>{SELLER_TYPE_LABELS[type]}</strong>
                    <small>
                      {type === "business"
                        ? "법인사업자 또는 개인사업자가 사업자등록정보로 신청합니다."
                        : "사업자등록 없이 개인 자격으로 판매점 활동을 신청합니다."}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <FieldError message={errors.sellerType} />
          </section>

          {form.sellerType ? (
            <>
              <section className="seller-apply-section" aria-labelledby="seller-info-title">
                <header className="seller-apply-section-head">
                  <h3 id="seller-info-title">판매점 정보</h3>
                  <p>
                    {isBusiness
                      ? "사업자·판매점 기본 정보를 입력해 주세요."
                      : "판매점명과 활동 주소를 입력해 주세요."}
                  </p>
                </header>
                <div className="seller-apply-fields">
                  {isBusiness ? (
                    <>
                      <label className={errors.businessName ? "is-invalid" : undefined}>
                        <FieldLabel required htmlFor="businessName">
                          상호명
                        </FieldLabel>
                        <input
                          id="businessName"
                          value={form.businessName}
                          aria-invalid={Boolean(errors.businessName)}
                          onChange={(event) => {
                            setForm((current) => updateBusinessName(current, event.target.value));
                            clearFieldError("businessName");
                            clearFieldError("sellerName");
                            setSubmitBanner("");
                          }}
                          placeholder="상호명을 입력해 주세요"
                        />
                        <FieldError message={errors.businessName} />
                      </label>

                      <div
                        className={`seller-field-with-action ${errors.businessNumber ? "is-invalid" : ""}`}
                      >
                        <FieldLabel required htmlFor="businessNumber">
                          사업자등록번호
                        </FieldLabel>
                        <div className="seller-inline-action">
                          <input
                            id="businessNumber"
                            value={form.businessNumber}
                            aria-invalid={Boolean(errors.businessNumber)}
                            inputMode="numeric"
                            onChange={(event) => {
                              updateField(
                                "businessNumber",
                                formatBusinessNumberInput(event.target.value),
                              );
                              setBusinessCheckNote("");
                            }}
                            placeholder="000-00-00000"
                          />
                          <button
                            type="button"
                            className="button ghost dark compact"
                            onClick={requestBusinessNumberCheck}
                          >
                            중복확인
                          </button>
                        </div>
                        <FieldError message={errors.businessNumber} />
                        {businessCheckNote ? (
                          <small className="seller-field-info" role="status">
                            {businessCheckNote}
                          </small>
                        ) : null}
                      </div>

                      <label className={errors.sellerName ? "is-invalid" : undefined}>
                        <FieldLabel required htmlFor="sellerName">
                          판매점명
                        </FieldLabel>
                        <input
                          id="sellerName"
                          value={form.sellerName}
                          aria-invalid={Boolean(errors.sellerName)}
                          onChange={(event) => {
                            if (form.useBusinessNameAsSellerName) {
                              setForm((current) => ({
                                ...current,
                                useBusinessNameAsSellerName: false,
                                sellerName: event.target.value,
                              }));
                            } else {
                              updateField("sellerName", event.target.value);
                              return;
                            }
                            clearFieldError("sellerName");
                            setSubmitBanner("");
                          }}
                          placeholder="관리자와 판매 화면에 표시될 이름"
                        />
                        <FieldError message={errors.sellerName} />
                      </label>

                      <label className={errors.representativeName ? "is-invalid" : undefined}>
                        <FieldLabel required htmlFor="representativeName">
                          대표자명
                        </FieldLabel>
                        <input
                          id="representativeName"
                          value={form.representativeName}
                          aria-invalid={Boolean(errors.representativeName)}
                          onChange={(event) => {
                            setForm((current) =>
                              updateRepresentativeName(current, event.target.value),
                            );
                            clearFieldError("representativeName");
                            clearFieldError("contactName");
                            setSubmitBanner("");
                          }}
                          placeholder="대표자 이름"
                        />
                        <FieldError message={errors.representativeName} />
                      </label>

                      <label className="full seller-check-inline">
                        <input
                          type="checkbox"
                          checked={form.useBusinessNameAsSellerName}
                          onChange={(event) => {
                            setForm((current) =>
                              setUseBusinessNameAsSellerName(current, event.target.checked),
                            );
                            clearFieldError("sellerName");
                            setSubmitBanner("");
                          }}
                        />
                        <span>상호명을 판매점명으로 사용</span>
                      </label>

                      <label className={errors.address ? "is-invalid" : undefined}>
                        <FieldLabel required htmlFor="address">
                          사업장 주소
                        </FieldLabel>
                        <input
                          id="address"
                          value={form.address}
                          aria-invalid={Boolean(errors.address)}
                          onChange={(event) => {
                            updateField("address", event.target.value);
                            setAddressSearchNote("");
                          }}
                          placeholder="기본 주소"
                        />
                        <FieldError message={errors.address} />
                      </label>

                      <div className="seller-field-with-action">
                        <FieldLabel htmlFor="addressDetail">상세주소</FieldLabel>
                        <div className="seller-inline-action">
                          <input
                            id="addressDetail"
                            value={form.addressDetail}
                            onChange={(event) => updateField("addressDetail", event.target.value)}
                            placeholder="상세 주소"
                          />
                          <button
                            type="button"
                            className="button ghost dark compact"
                            onClick={requestAddressSearch}
                          >
                            주소검색
                          </button>
                        </div>
                        {addressSearchNote ? (
                          <small className="seller-field-info" role="status">
                            {addressSearchNote}
                          </small>
                        ) : null}
                      </div>

                      <label className={errors.businessPhone ? "is-invalid" : undefined}>
                        <FieldLabel htmlFor="businessPhone">대표 전화번호</FieldLabel>
                        <input
                          id="businessPhone"
                          value={form.businessPhone}
                          aria-invalid={Boolean(errors.businessPhone)}
                          onChange={(event) => updateField("businessPhone", event.target.value)}
                          placeholder="02-0000-0000"
                        />
                        <FieldError message={errors.businessPhone} />
                      </label>

                      <label className={errors.homepageOrSns ? "is-invalid" : undefined}>
                        <FieldLabel htmlFor="homepageOrSns">홈페이지 또는 SNS 주소</FieldLabel>
                        <input
                          id="homepageOrSns"
                          value={form.homepageOrSns}
                          aria-invalid={Boolean(errors.homepageOrSns)}
                          onChange={(event) => updateField("homepageOrSns", event.target.value)}
                          placeholder="https://example.com"
                        />
                        <FieldError message={errors.homepageOrSns} />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className={errors.sellerName ? "is-invalid" : undefined}>
                        <FieldLabel required htmlFor="sellerName">
                          판매점명
                        </FieldLabel>
                        <input
                          id="sellerName"
                          value={form.sellerName}
                          aria-invalid={Boolean(errors.sellerName)}
                          onChange={(event) => updateField("sellerName", event.target.value)}
                          placeholder="관리자와 판매 화면에 표시될 이름"
                        />
                        <FieldError message={errors.sellerName} />
                      </label>

                      <label className={errors.address ? "is-invalid" : undefined}>
                        <FieldLabel required htmlFor="address">
                          활동 주소
                        </FieldLabel>
                        <input
                          id="address"
                          value={form.address}
                          aria-invalid={Boolean(errors.address)}
                          onChange={(event) => {
                            updateField("address", event.target.value);
                            setAddressSearchNote("");
                          }}
                          placeholder="기본 주소"
                        />
                        <FieldError message={errors.address} />
                      </label>

                      <div className="seller-field-with-action">
                        <FieldLabel htmlFor="addressDetail">상세주소</FieldLabel>
                        <div className="seller-inline-action">
                          <input
                            id="addressDetail"
                            value={form.addressDetail}
                            onChange={(event) => updateField("addressDetail", event.target.value)}
                            placeholder="상세 주소"
                          />
                          <button
                            type="button"
                            className="button ghost dark compact"
                            onClick={requestAddressSearch}
                          >
                            주소검색
                          </button>
                        </div>
                        {addressSearchNote ? (
                          <small className="seller-field-info" role="status">
                            {addressSearchNote}
                          </small>
                        ) : null}
                      </div>

                      <label className={errors.homepageOrSns ? "is-invalid" : undefined}>
                        <FieldLabel htmlFor="homepageOrSns">홈페이지 또는 SNS 주소</FieldLabel>
                        <input
                          id="homepageOrSns"
                          value={form.homepageOrSns}
                          aria-invalid={Boolean(errors.homepageOrSns)}
                          onChange={(event) => updateField("homepageOrSns", event.target.value)}
                          placeholder="https://example.com"
                        />
                        <FieldError message={errors.homepageOrSns} />
                      </label>
                    </>
                  )}
                </div>
              </section>

              <section
                className="seller-apply-section"
                aria-labelledby="seller-contact-title"
              >
                <header className="seller-apply-section-head">
                  <h3 id="seller-contact-title">{isIndividual ? "신청자 정보" : "담당자 정보"}</h3>
                  <p>
                    {isIndividual
                      ? "신청자 본인 연락처입니다. 심사 결과 안내에 사용됩니다."
                      : "심사 결과 안내를 받을 담당자 연락처입니다."}
                  </p>
                </header>
                <div className="seller-apply-fields">
                  {isBusiness ? (
                    <label className="full seller-check-inline">
                      <input
                        type="checkbox"
                        checked={form.representativeIsContact}
                        onChange={(event) => {
                          setForm((current) =>
                            setRepresentativeIsContact(current, event.target.checked),
                          );
                          clearFieldError("contactName");
                          setSubmitBanner("");
                        }}
                      />
                      <span>대표자가 직접 관리합니다</span>
                    </label>
                  ) : null}

                  <label className={errors.contactName ? "is-invalid" : undefined}>
                    <FieldLabel required htmlFor="contactName">
                      {isIndividual ? "신청자명" : "담당자명"}
                    </FieldLabel>
                    <input
                      id="contactName"
                      value={form.contactName}
                      aria-invalid={Boolean(errors.contactName)}
                      readOnly={isBusiness && form.representativeIsContact}
                      onChange={(event) => {
                        if (isBusiness && form.representativeIsContact) {
                          setForm((current) => ({
                            ...current,
                            representativeIsContact: false,
                            contactName: event.target.value,
                          }));
                          clearFieldError("contactName");
                          setSubmitBanner("");
                          return;
                        }
                        updateField("contactName", event.target.value);
                      }}
                      placeholder={isIndividual ? "신청자 이름" : "담당자 이름"}
                    />
                    <FieldError message={errors.contactName} />
                  </label>

                  {isBusiness ? (
                    <label>
                      <FieldLabel htmlFor="contactRole">부서 또는 직책</FieldLabel>
                      <input
                        id="contactRole"
                        value={form.contactRole}
                        onChange={(event) => updateField("contactRole", event.target.value)}
                        placeholder="예: 영업팀 / 과장"
                      />
                    </label>
                  ) : null}

                  <label className={errors.contactPhone ? "is-invalid" : undefined}>
                    <FieldLabel required htmlFor="contactPhone">
                      휴대전화번호
                    </FieldLabel>
                    <input
                      id="contactPhone"
                      value={form.contactPhone}
                      aria-invalid={Boolean(errors.contactPhone)}
                      inputMode="tel"
                      onChange={(event) => {
                        const formatted = formatMobilePhoneInput(event.target.value);
                        setForm((current) => updateContactPhone(current, formatted));
                        clearFieldError("contactPhone");
                        if (form.useContactPhoneAsReferralCode) clearFieldError("referralCodePhone");
                        setReferralCheckNote("");
                        setSubmitBanner("");
                      }}
                      placeholder="010-0000-0000"
                    />
                    <FieldError message={errors.contactPhone} />
                  </label>

                  <label className={errors.contactEmail ? "is-invalid" : undefined}>
                    <FieldLabel required htmlFor="contactEmail">
                      이메일
                    </FieldLabel>
                    <input
                      id="contactEmail"
                      type="email"
                      value={form.contactEmail}
                      aria-invalid={Boolean(errors.contactEmail)}
                      autoComplete="email"
                      onChange={(event) => updateField("contactEmail", event.target.value)}
                      placeholder="contact@example.com"
                    />
                    <FieldError message={errors.contactEmail} />
                  </label>

                  <label className={`full ${errors.contactEmailConfirm ? "is-invalid" : ""}`}>
                    <FieldLabel required htmlFor="contactEmailConfirm">
                      이메일 확인
                    </FieldLabel>
                    <input
                      id="contactEmailConfirm"
                      type="email"
                      value={form.contactEmailConfirm}
                      aria-invalid={Boolean(errors.contactEmailConfirm)}
                      autoComplete="email"
                      onChange={(event) => updateField("contactEmailConfirm", event.target.value)}
                      placeholder="이메일을 다시 입력해 주세요"
                    />
                    <FieldError message={errors.contactEmailConfirm} />
                  </label>
                </div>
              </section>

              <section className="seller-apply-section" aria-labelledby="seller-referral-title">
                <header className="seller-apply-section-head">
                  <h3 id="seller-referral-title">추천인코드 안내 및 번호 설정</h3>
                  <p>
                    가입 승인 후 등록한 휴대전화번호가 판매점 추천인코드로 사용됩니다. 일반회원은
                    회원가입 시 추천인코드를 선택적으로 입력할 수 있으며, 여행사 관리자는
                    회원관리에서 추천 판매점을 등록·변경·해제할 수 있습니다.
                  </p>
                </header>
                <div className="seller-apply-policy-box seller-apply-referral-notes">
                  <ul>
                    <li>추천 판매점 변경은 변경 이후 발생한 예약부터 적용됩니다.</li>
                    <li>기존 예약은 예약 당시 판매점과 수수료 조건이 유지됩니다.</li>
                  </ul>
                </div>
                <div className="seller-apply-fields">
                  <label className="full seller-check-inline">
                    <input
                      type="checkbox"
                      checked={form.useContactPhoneAsReferralCode}
                      onChange={(event) => {
                        setForm((current) =>
                          setUseContactPhoneAsReferralCode(current, event.target.checked),
                        );
                        clearFieldError("referralCodePhone");
                        setReferralCheckNote("");
                        setSubmitBanner("");
                      }}
                    />
                    <span>
                      {isIndividual ? "신청자" : "담당자"} 휴대전화번호와 동일
                    </span>
                  </label>
                  <div
                    className={`full seller-field-with-action ${errors.referralCodePhone ? "is-invalid" : ""}`}
                  >
                    <FieldLabel required htmlFor="referralCodePhone">
                      추천인코드용 휴대전화번호
                    </FieldLabel>
                    <div className="seller-inline-action">
                      <input
                        id="referralCodePhone"
                        value={form.referralCodePhone}
                        aria-invalid={Boolean(errors.referralCodePhone)}
                        inputMode="tel"
                        readOnly={form.useContactPhoneAsReferralCode}
                        onChange={(event) => {
                          if (form.useContactPhoneAsReferralCode) {
                            setForm((current) => ({
                              ...current,
                              useContactPhoneAsReferralCode: false,
                              referralCodePhone: formatMobilePhoneInput(event.target.value),
                            }));
                          } else {
                            updateField(
                              "referralCodePhone",
                              formatMobilePhoneInput(event.target.value),
                            );
                            return;
                          }
                          clearFieldError("referralCodePhone");
                          setReferralCheckNote("");
                          setSubmitBanner("");
                        }}
                        placeholder="010-0000-0000"
                      />
                      <button
                        type="button"
                        className="button ghost dark compact"
                        onClick={requestReferralCheck}
                      >
                        중복확인
                      </button>
                    </div>
                    <FieldError message={errors.referralCodePhone} />
                    {referralCheckNote ? (
                      <small className="seller-field-info">{referralCheckNote}</small>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="seller-apply-section" aria-labelledby="seller-note-title">
                <header className="seller-apply-section-head">
                  <h3 id="seller-note-title">활동 및 신청내용</h3>
                  <p>선택 입력입니다. 여행사에 전달할 간단한 내용만 적어 주세요.</p>
                </header>
                <div className="seller-apply-fields">
                  <label className={`full ${errors.applicationNote ? "is-invalid" : ""}`}>
                    <FieldLabel htmlFor="applicationNote">활동 및 신청내용</FieldLabel>
                    <textarea
                      id="applicationNote"
                      rows={4}
                      value={form.applicationNote}
                      aria-invalid={Boolean(errors.applicationNote)}
                      maxLength={MAX_APPLICATION_NOTE_LENGTH + 50}
                      onChange={(event) => updateField("applicationNote", event.target.value)}
                      placeholder="주요 활동지역이나 판매방식 등 여행사에 전달할 내용이 있다면 입력해 주세요."
                    />
                    <div className="seller-char-count">
                      <FieldError message={errors.applicationNote} />
                      <span>
                        {applicationNoteLength(form.applicationNote)}/{MAX_APPLICATION_NOTE_LENGTH}
                      </span>
                    </div>
                  </label>
                </div>
              </section>

              <section className="seller-apply-section" aria-labelledby="seller-docs-title">
                <header className="seller-apply-section-head">
                  <h3 id="seller-docs-title">증빙서류 첨부</h3>
                  <p>
                    허용 형식 PDF, JPG, JPEG, PNG · 파일당 최대 {MAX_FILE_SIZE_LABEL} · 기타서류 최대{" "}
                    {MAX_OTHER_FILES}개. 현재는 프로토타입이며 서버에 실제 업로드되지 않습니다.
                  </p>
                </header>
                <div className="seller-apply-fields">
                  <p className="seller-apply-secure-note full" role="note">
                    선택한 파일은 브라우저 메모리에만 보관되며, 제출 시 sessionStorage에도 파일 내용은
                    저장되지 않습니다. 신분증과 통장사본은 가입 단계에서 받지 않습니다.
                  </p>
                  <div
                    className={`seller-apply-docs-row full ${isBusiness ? "is-business" : "is-individual"}`}
                  >
                    {attachmentSlots.map((slot) => {
                      if (slot.key === "otherFiles") {
                        return (
                          <MultipleAttachmentSlot
                            key={slot.key}
                            id={slot.key}
                            label={slot.label}
                            files={form.otherFiles}
                            error={filePickErrors.otherFiles || errors.otherFiles}
                            onSelect={setOtherFiles}
                            onRemoveAt={(index) =>
                              setOtherFiles(
                                form.otherFiles.filter((_, fileIndex) => fileIndex !== index),
                                null,
                              )
                            }
                          />
                        );
                      }
                      const singleKey = slot.key;
                      return (
                        <SingleAttachmentSlot
                          key={singleKey}
                          id={singleKey}
                          label={slot.label}
                          required={slot.required}
                          file={form[singleKey]}
                          error={filePickErrors[singleKey] || errors[singleKey]}
                          onSelect={(nextFile, pickError) =>
                            setSingleAttachment(singleKey, nextFile, pickError)
                          }
                          onClear={() => setSingleAttachment(singleKey, null, null)}
                        />
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="seller-apply-section" aria-labelledby="seller-terms-title">
                <header className="seller-apply-section-head">
                  <h3 id="seller-terms-title">약관 및 정책 동의</h3>
                  <p>필수 항목에 동의한 뒤 신청할 수 있습니다.</p>
                </header>
                <div className="seller-apply-fields">
                  <fieldset
                    className={`full seller-apply-check-group ${errors.agreeTerms ? "is-invalid" : ""}`}
                    id="agreeTerms"
                  >
                    <legend>
                      약관 동의 <em aria-label="필수">*</em>
                    </legend>
                    <label className="check seller-agree-all">
                      <input
                        type="checkbox"
                        checked={allTermsChecked}
                        onChange={(event) => setAgreeAll(event.target.checked)}
                      />
                      <span>전체 동의</span>
                    </label>
                    {SELLER_TERM_ITEMS.filter((item) => item.required).map((item) => (
                      <div className="seller-term-row" key={item.key}>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={form[item.key]}
                            onChange={(event) => updateField(item.key, event.target.checked)}
                          />
                          <span>(필수) {item.title}</span>
                        </label>
                        <button
                          type="button"
                          className="seller-term-view"
                          onClick={() => setOpenTerm(item)}
                        >
                          보기
                        </button>
                      </div>
                    ))}
                    {SELLER_TERM_ITEMS.filter((item) => !item.required).map((item) => (
                      <div className="seller-term-row" key={item.key}>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={form[item.key]}
                            onChange={(event) => updateField(item.key, event.target.checked)}
                          />
                          <span>(선택) {item.title}</span>
                        </label>
                        <button
                          type="button"
                          className="seller-term-view"
                          onClick={() => setOpenTerm(item)}
                        >
                          보기
                        </button>
                      </div>
                    ))}
                    <FieldError message={errors.agreeTerms} />
                  </fieldset>
                </div>
              </section>
            </>
          ) : null}

          <div className="seller-apply-actions">
            <button type="button" className="button ghost dark" onClick={requestCancel}>
              취소
            </button>
            <button
              type="button"
              className="button primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              판매점 가입 신청하기
            </button>
          </div>
        </section>
      </div>

      {cancelOpen ? (
        <div className="seller-apply-dialog" role="presentation">
          <button
            type="button"
            className="seller-apply-dialog-backdrop"
            aria-label="닫기"
            onClick={() => setCancelOpen(false)}
          />
          <div
            className="seller-apply-dialog-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-cancel-title"
          >
            <h3 id="seller-cancel-title">가입신청을 취소할까요?</h3>
            <p>작성 중인 판매점 가입신청 내용이 삭제됩니다. 가입신청을 취소하시겠습니까?</p>
            <div>
              <button type="button" className="button ghost dark" onClick={() => setCancelOpen(false)}>
                계속 작성
              </button>
              <button type="button" className="button primary" onClick={confirmCancel}>
                가입신청 취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {typeChangeOpen && pendingSellerType ? (
        <div className="seller-apply-dialog" role="presentation">
          <button
            type="button"
            className="seller-apply-dialog-backdrop"
            aria-label="닫기"
            onClick={() => {
              setTypeChangeOpen(false);
              setPendingSellerType(null);
            }}
          />
          <div
            className="seller-apply-dialog-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-type-change-title"
          >
            <h3 id="seller-type-change-title">가입유형을 변경할까요?</h3>
            <p>
              가입유형을 변경하면 현재 유형에서 입력한 전용 정보와 첨부파일이 초기화됩니다.
              변경하시겠습니까?
            </p>
            <div>
              <button
                type="button"
                className="button ghost dark"
                onClick={() => {
                  setTypeChangeOpen(false);
                  setPendingSellerType(null);
                }}
              >
                취소
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => applySellerType(pendingSellerType)}
              >
                유형 변경
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {openTerm ? (
        <div className="seller-apply-dialog" role="presentation">
          <button
            type="button"
            className="seller-apply-dialog-backdrop"
            aria-label="닫기"
            onClick={() => setOpenTerm(null)}
          />
          <div
            className="seller-apply-dialog-panel seller-term-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-term-title"
          >
            <h3 id="seller-term-title">{openTerm.title}</h3>
            <p className="seller-term-badge">
              {openTerm.required ? "필수 동의 · 임시 안내문" : "선택 동의 · 임시 안내문"}
            </p>
            <p>{openTerm.summary}</p>
            <div>
              <button type="button" className="button primary" onClick={() => setOpenTerm(null)}>
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
