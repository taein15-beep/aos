"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  APPLY_STEPS,
  areRequiredTermsAgreed,
  BUSINESS_TYPE_OPTIONS,
  createPrototypeApplyReceipt,
  FILE_ACCEPT,
  firstErrorFieldId,
  formatBusinessNumberInput,
  formatFileSize,
  getApplyFormReviewSafe,
  getPasswordMismatchMessage,
  INITIAL_PARTNERSHIP_APPLY_FORM,
  LONG_TEXT_LIMITS,
  maskBusinessNumber,
  maskEmail,
  maskPhone,
  MAX_FILE_SIZE_LABEL,
  MAX_OTHER_FILES,
  OPTIONAL_ATTACHMENT_SLOTS,
  PARTNERSHIP_PURPOSE_OPTIONS,
  PASSWORD_MIN_LENGTH,
  POLICY_GUIDE_ITEMS,
  PRODUCT_TYPE_OPTIONS,
  REQUIRED_ATTACHMENT_SLOTS,
  REQUIRED_TERM_KEYS,
  savePrototypeApplyReceipt,
  TERM_ITEMS,
  TOURISM_LICENSE_TYPE_OPTIONS,
  toggleMultiSelectValue,
  validateAllApplySteps,
  validateAttachmentFile,
  validateStep,
  yesNoLabel,
  type ApplyFieldErrors,
  type ApplyStepKey,
  type PartnershipApplyForm,
  type SingleAttachmentKey,
  type TermItem,
  type YesNo,
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
    <span className="partnership-field-label">
      <label htmlFor={htmlFor}>
        {children}
        {required ? <em aria-label="필수">*</em> : null}
      </label>
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <small className="partnership-field-error" role="alert">
      {message}
    </small>
  );
}

function TextValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") return <>{value ? "예" : "아니오"}</>;
  return <>{value.trim() ? value : "—"}</>;
}

function ImageFilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file.type.startsWith("image/")) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="partnership-file-preview" src={url} alt={`${file.name} 미리보기`} />
  );
}

function AttachmentSlot({
  id,
  label,
  required,
  file,
  files,
  multiple,
  error,
  onSelectSingle,
  onClearSingle,
  onSelectMultiple,
  onRemoveMultipleAt,
}: {
  id: string;
  label: string;
  required?: boolean;
  file?: File | null;
  files?: File[];
  multiple?: boolean;
  error?: string;
  onSelectSingle?: (file: File | null, pickError: string | null) => void;
  onClearSingle?: () => void;
  onSelectMultiple?: (files: File[], pickError: string | null) => void;
  onRemoveMultipleAt?: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    el.value = "";
    el.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (multiple) {
      if (selected.length === 0) return;
      const nextFiles: File[] = [...(files ?? [])];
      let pickError: string | null = null;
      for (const item of selected) {
        if (nextFiles.length >= MAX_OTHER_FILES) {
          pickError = `기타 서류는 최대 ${MAX_OTHER_FILES}개까지 첨부할 수 있습니다.`;
          break;
        }
        const invalid = validateAttachmentFile(item);
        if (invalid) {
          pickError = invalid;
          break;
        }
        nextFiles.push(item);
      }
      onSelectMultiple?.(pickError ? (files ?? []) : nextFiles, pickError);
      return;
    }
    const item = selected[0] ?? null;
    if (!item) {
      onSelectSingle?.(null, null);
      return;
    }
    const invalid = validateAttachmentFile(item);
    if (invalid) {
      onSelectSingle?.(file ?? null, invalid);
      return;
    }
    onSelectSingle?.(item, null);
  };

  const list = multiple ? files ?? [] : file ? [file] : [];

  return (
    <div className={`partnership-file-slot full ${error ? "is-invalid" : ""}`} id={id}>
      <div className="partnership-file-slot-head">
        <FieldLabel required={required} htmlFor={`${id}-input`}>
          {label}
        </FieldLabel>
        <button type="button" className="button ghost dark compact" onClick={openPicker}>
          {list.length > 0 ? (multiple ? "추가" : "교체") : "파일 선택"}
        </button>
        <input
          ref={inputRef}
          id={`${id}-input`}
          className="partnership-file-input-hidden"
          type="file"
          accept={FILE_ACCEPT}
          multiple={multiple}
          aria-invalid={Boolean(error)}
          onChange={handleChange}
        />
      </div>
      {list.length === 0 ? (
        <p className="partnership-file-empty">선택된 파일이 없습니다.</p>
      ) : (
        <ul className="partnership-file-list">
          {list.map((item, index) => (
            <li key={`${item.name}-${item.size}-${index}`}>
              <div className="partnership-file-meta">
                <strong>{item.name}</strong>
                <span>
                  {formatFileSize(item.size)} · {item.type || "파일"}
                </span>
                <ImageFilePreview file={item} />
              </div>
              <button
                type="button"
                className="button ghost dark compact"
                onClick={() => {
                  if (multiple) onRemoveMultipleAt?.(index);
                  else onClearSingle?.();
                }}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
      <FieldError message={error} />
    </div>
  );
}

export function PartnershipApplyForm() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<PartnershipApplyForm>(INITIAL_PARTNERSHIP_APPLY_FORM);
  const [dirty, setDirty] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [errors, setErrors] = useState<ApplyFieldErrors>({});
  const [businessCheckNote, setBusinessCheckNote] = useState("");
  const [emailVerifyNote, setEmailVerifyNote] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [filePickErrors, setFilePickErrors] = useState<Partial<Record<string, string>>>({});
  const [openTerm, setOpenTerm] = useState<TermItem | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [submitBanner, setSubmitBanner] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const step = APPLY_STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / APPLY_STEPS.length) * 100);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === APPLY_STEPS.length - 1;
  const review = useMemo(() => getApplyFormReviewSafe(form), [form]);
  const passwordMismatchHint = getPasswordMismatchMessage(form.adminPassword, form.adminPasswordConfirm);
  const requiredTermsAgreed = areRequiredTermsAgreed(form);

  const updateField = useCallback(<K extends keyof PartnershipApplyForm>(key: K, value: PartnershipApplyForm[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "adminEmail" && current.useEmailAsLoginId && typeof value === "string") {
        next.adminLoginId = value;
      }
      if (key === "useEmailAsLoginId" && value === true) {
        next.adminLoginId = current.adminEmail;
      }
      if (key === "hasSellers" && value === "no") {
        next.sellerCount = "";
      }
      return next;
    });
    setDirty(true);
    setErrors((current) => {
      const clearsAgree =
        REQUIRED_TERM_KEYS.includes(key as (typeof REQUIRED_TERM_KEYS)[number]) || key === "agreeTerms";
      if (!current[key] && !(key === "hasSellers" && current.sellerCount) && !clearsAgree) return current;
      const next = { ...current };
      delete next[key];
      if (key === "hasSellers") delete next.sellerCount;
      if (clearsAgree) delete next.agreeTerms;
      return next;
    });
  }, []);

  const setSingleAttachment = (key: SingleAttachmentKey, file: File | null, pickError: string | null) => {
    setFilePickErrors((current) => {
      const next = { ...current };
      if (pickError) next[key] = pickError;
      else delete next[key];
      return next;
    });
    if (pickError) return;
    updateField(key, file);
  };

  const setOtherFiles = (files: File[], pickError: string | null) => {
    setFilePickErrors((current) => {
      const next = { ...current };
      if (pickError) next.otherFiles = pickError;
      else delete next.otherFiles;
      return next;
    });
    if (pickError) return;
    updateField("otherFiles", files);
  };

  const setRequiredTermsAll = (checked: boolean) => {
    setForm((current) => {
      const next = { ...current };
      for (const key of REQUIRED_TERM_KEYS) next[key] = checked;
      return next;
    });
    setDirty(true);
    if (checked) {
      setErrors((current) => {
        if (!current.agreeTerms) return current;
        const next = { ...current };
        delete next.agreeTerms;
        return next;
      });
    }
  };

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const focusFirstError = (nextErrors: ApplyFieldErrors) => {
    const fieldId = firstErrorFieldId(nextErrors);
    if (!fieldId) return;
    window.requestAnimationFrame(() => {
      const target = document.getElementById(fieldId);
      target?.focus();
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const goNext = () => {
    if (isLast) return;
    const stepErrors = validateStep(step.key, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirstError(stepErrors);
      return;
    }
    setErrors({});
    setSubmitBanner("");
    setStepIndex((value) => Math.min(value + 1, APPLY_STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    if (isFirst) return;
    setErrors({});
    setSubmitBanner("");
    setStepIndex((value) => Math.max(value - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToStep = (stepKey: ApplyStepKey) => {
    const index = APPLY_STEPS.findIndex((item) => item.key === stepKey);
    if (index < 0) return;
    setErrors({});
    setSubmitBanner("");
    setStepIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTempSave = () => {
    // 실제 저장 API 없음 — 서버에 저장된 것처럼 표현하지 않음
    setDraftNote(
      "현재 화면에서만 작성내용이 유지됩니다. 새로고침하면 초기화될 수 있습니다. 서버에는 저장되지 않습니다.",
    );
  };

  const handleSubmitPrototype = () => {
    if (submitting) return;
    const failed = validateAllApplySteps(form);
    if (failed) {
      setErrors(failed.errors);
      setSubmitBanner(`「${failed.stepTitle}」단계에 보완이 필요합니다. 해당 단계로 이동합니다.`);
      const index = APPLY_STEPS.findIndex((item) => item.key === failed.stepKey);
      if (index >= 0) setStepIndex(index);
      focusFirstError(failed.errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    setSubmitBanner("");
    // FRONTEND PROTOTYPE ONLY — 실제 신청 레코드·이메일·알림톡을 생성/발송하지 않음
    const receipt = createPrototypeApplyReceipt(form);
    savePrototypeApplyReceipt(receipt);
    setDirty(false);
    router.push("/partnership/apply/complete");
  };

  const confirmCancel = () => {
    setCancelOpen(false);
    setDirty(false);
    router.push("/partnership");
  };

  const requestBusinessNumberCheck = () => {
    setBusinessCheckNote("실제 중복확인은 관리자 시스템 연동 후 제공됩니다.");
  };

  const requestEmailVerify = () => {
    setEmailVerifyNote("실제 인증번호 발송은 시스템 연동 후 제공됩니다. 지금은 발송되지 않습니다.");
  };

  return (
    <main className="partnership-apply-page">
      <div className="shell partnership-apply-shell">
        <nav className="partnership-apply-breadcrumb" aria-label="현재 위치">
          <Link href="/">홈</Link>
          <span aria-hidden="true">/</span>
          <Link href="/partnership">제휴여행사</Link>
          <span aria-hidden="true">/</span>
          <span>가입신청</span>
        </nav>

        <header className="partnership-apply-intro">
          <span className="section-kicker">PARTNERSHIP APPLY</span>
          <h1>제휴여행사 가입신청</h1>
          <p>
            여행사 및 담당자 정보를 입력하면 관리자가 신청내용을 검토합니다.
            <br />
            가입승인 후 제휴관계가 활성화되며 상품공유그룹은 관리자가 별도로 지정합니다.
          </p>
          <p className="partnership-apply-temp-note" role="note">
            작성 내용은 이 화면을 유지하는 동안만 임시 보관되며, 새로고침하면 초기화됩니다.
            서버에는 아직 저장되지 않습니다.
          </p>
        </header>

        <div className="partnership-apply-progress" aria-label={`진행률 ${progress}%`}>
          <div className="partnership-apply-progress-meta">
            <strong>
              {stepIndex + 1} / {APPLY_STEPS.length} 단계
            </strong>
            <span>{progress}%</span>
          </div>
          <div className="partnership-apply-progress-bar" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>

        <ol className="partnership-apply-steps" aria-label="신청 단계">
          {APPLY_STEPS.map((item, index) => {
            const status = index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";
            return (
              <li key={item.key} className={status} aria-current={status === "current" ? "step" : undefined}>
                <span>{index < stepIndex ? "✓" : item.id}</span>
                <b>{item.title}</b>
              </li>
            );
          })}
        </ol>

        <p className="partnership-apply-mobile-step" aria-live="polite">
          <strong>
            {step.id}단계 · {step.title}
          </strong>
          <span>{step.description}</span>
        </p>

        <section className="partnership-apply-panel" aria-labelledby="apply-step-title">
          <header className="partnership-apply-panel-head">
            <span>STEP {String(step.id).padStart(2, "0")}</span>
            <h2 id="apply-step-title">{step.title}</h2>
            <p>{step.description}</p>
            {submitBanner ? (
              <p className="partnership-apply-submit-banner" role="alert">
                {submitBanner}
              </p>
            ) : null}
          </header>

          {step.key === "agency" && (
            <div className="partnership-apply-fields">
              <label className={errors.agencyName ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="agencyName">
                  여행사명
                </FieldLabel>
                <input
                  id="agencyName"
                  value={form.agencyName}
                  aria-invalid={Boolean(errors.agencyName)}
                  onChange={(event) => updateField("agencyName", event.target.value)}
                  placeholder="상호명을 입력해 주세요"
                />
                <FieldError message={errors.agencyName} />
              </label>

              <div className={`partnership-field-with-action ${errors.businessNumber ? "is-invalid" : ""}`}>
                <FieldLabel required htmlFor="businessNumber">
                  사업자등록번호
                </FieldLabel>
                <div className="partnership-inline-action">
                  <input
                    id="businessNumber"
                    value={form.businessNumber}
                    aria-invalid={Boolean(errors.businessNumber)}
                    onChange={(event) => {
                      updateField("businessNumber", formatBusinessNumberInput(event.target.value));
                      setBusinessCheckNote("");
                    }}
                    placeholder="000-00-00000"
                    inputMode="numeric"
                  />
                  <button type="button" className="button ghost dark compact" onClick={requestBusinessNumberCheck}>
                    중복확인
                  </button>
                </div>
                <FieldError message={errors.businessNumber} />
                {businessCheckNote ? (
                  <small className="partnership-field-info" role="status">
                    {businessCheckNote}
                  </small>
                ) : null}
              </div>

              <fieldset
                id="businessType"
                className={`full partnership-apply-check-group ${errors.businessType ? "is-invalid" : ""}`}
              >
                <legend>
                  사업자 구분 <em aria-label="필수">*</em>
                </legend>
                <div className="partnership-radio-row">
                  {BUSINESS_TYPE_OPTIONS.map((option) => (
                    <label key={option} className="check">
                      <input
                        type="radio"
                        name="businessType"
                        checked={form.businessType === option}
                        onChange={() => updateField("businessType", option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                <FieldError message={errors.businessType} />
              </fieldset>

              <label className={errors.ceoName ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="ceoName">
                  대표자명
                </FieldLabel>
                <input
                  id="ceoName"
                  value={form.ceoName}
                  aria-invalid={Boolean(errors.ceoName)}
                  onChange={(event) => updateField("ceoName", event.target.value)}
                  placeholder="대표자 이름"
                />
                <FieldError message={errors.ceoName} />
              </label>

              <label>
                <FieldLabel htmlFor="corporateRegistrationNumber">법인등록번호</FieldLabel>
                <input
                  id="corporateRegistrationNumber"
                  value={form.corporateRegistrationNumber}
                  onChange={(event) => updateField("corporateRegistrationNumber", event.target.value)}
                  placeholder="법인인 경우 입력"
                />
              </label>

              <label className={errors.tourismLicenseNumber ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="tourismLicenseNumber">
                  여행업 등록번호
                </FieldLabel>
                <input
                  id="tourismLicenseNumber"
                  value={form.tourismLicenseNumber}
                  aria-invalid={Boolean(errors.tourismLicenseNumber)}
                  onChange={(event) => updateField("tourismLicenseNumber", event.target.value)}
                  placeholder="제0000-00호"
                />
                <FieldError message={errors.tourismLicenseNumber} />
              </label>

              <label className={errors.tourismLicenseType ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="tourismLicenseType">
                  여행업 종류
                </FieldLabel>
                <select
                  id="tourismLicenseType"
                  value={form.tourismLicenseType}
                  aria-invalid={Boolean(errors.tourismLicenseType)}
                  onChange={(event) =>
                    updateField("tourismLicenseType", event.target.value as PartnershipApplyForm["tourismLicenseType"])
                  }
                >
                  <option value="">선택해 주세요</option>
                  {TOURISM_LICENSE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.tourismLicenseType} />
              </label>

              <label className={`full ${errors.address ? "is-invalid" : ""}`}>
                <FieldLabel required htmlFor="address">
                  사업장 주소
                </FieldLabel>
                <input
                  id="address"
                  value={form.address}
                  aria-invalid={Boolean(errors.address)}
                  onChange={(event) => updateField("address", event.target.value)}
                  placeholder="기본 주소"
                />
                <FieldError message={errors.address} />
              </label>

              <label className={`full ${errors.addressDetail ? "is-invalid" : ""}`}>
                <FieldLabel required htmlFor="addressDetail">
                  상세주소
                </FieldLabel>
                <input
                  id="addressDetail"
                  value={form.addressDetail}
                  aria-invalid={Boolean(errors.addressDetail)}
                  onChange={(event) => updateField("addressDetail", event.target.value)}
                  placeholder="상세 주소"
                />
                <FieldError message={errors.addressDetail} />
              </label>

              <label className={errors.phone ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="phone">
                  대표 전화번호
                </FieldLabel>
                <input
                  id="phone"
                  value={form.phone}
                  aria-invalid={Boolean(errors.phone)}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="02-0000-0000"
                />
                <FieldError message={errors.phone} />
              </label>

              <label className={errors.email ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="email">
                  대표 이메일
                </FieldLabel>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  aria-invalid={Boolean(errors.email)}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="agency@example.com"
                />
                <FieldError message={errors.email} />
              </label>

              <label>
                <FieldLabel htmlFor="openDate">개업일</FieldLabel>
                <input
                  id="openDate"
                  type="date"
                  value={form.openDate}
                  onChange={(event) => updateField("openDate", event.target.value)}
                />
              </label>

              <label className={`full ${errors.homepage ? "is-invalid" : ""}`}>
                <FieldLabel htmlFor="homepage">홈페이지 주소</FieldLabel>
                <input
                  id="homepage"
                  value={form.homepage}
                  aria-invalid={Boolean(errors.homepage)}
                  onChange={(event) => updateField("homepage", event.target.value)}
                  placeholder="https://example.com"
                />
                <FieldError message={errors.homepage} />
              </label>
            </div>
          )}

          {step.key === "admin" && (
            <div className="partnership-apply-fields">
              <p className="partnership-apply-secure-note full">
                가입이 승인되기 전까지 관리자 계정은 활성화되지 않습니다. 승인 완료 후 로그인할 수 있습니다.
              </p>

              <label className={errors.adminName ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="adminName">
                  관리자 이름
                </FieldLabel>
                <input
                  id="adminName"
                  value={form.adminName}
                  aria-invalid={Boolean(errors.adminName)}
                  onChange={(event) => updateField("adminName", event.target.value)}
                  placeholder="담당 관리자 이름"
                />
                <FieldError message={errors.adminName} />
              </label>

              <label className={errors.department ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="department">
                  부서
                </FieldLabel>
                <input
                  id="department"
                  value={form.department}
                  aria-invalid={Boolean(errors.department)}
                  onChange={(event) => updateField("department", event.target.value)}
                  placeholder="예: 영업팀"
                />
                <FieldError message={errors.department} />
              </label>

              <label className={errors.position ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="position">
                  직책
                </FieldLabel>
                <input
                  id="position"
                  value={form.position}
                  aria-invalid={Boolean(errors.position)}
                  onChange={(event) => updateField("position", event.target.value)}
                  placeholder="예: 팀장"
                />
                <FieldError message={errors.position} />
              </label>

              <label className={errors.adminPhone ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="adminPhone">
                  휴대전화번호
                </FieldLabel>
                <input
                  id="adminPhone"
                  value={form.adminPhone}
                  aria-invalid={Boolean(errors.adminPhone)}
                  onChange={(event) => updateField("adminPhone", event.target.value)}
                  placeholder="010-0000-0000"
                />
                <FieldError message={errors.adminPhone} />
              </label>

              <div className={`partnership-field-with-action full ${errors.adminEmail ? "is-invalid" : ""}`}>
                <FieldLabel required htmlFor="adminEmail">
                  이메일
                </FieldLabel>
                <div className="partnership-inline-action">
                  <input
                    id="adminEmail"
                    type="email"
                    value={form.adminEmail}
                    aria-invalid={Boolean(errors.adminEmail)}
                    onChange={(event) => {
                      updateField("adminEmail", event.target.value);
                      setEmailVerifyNote("");
                    }}
                    placeholder="admin@example.com"
                  />
                  <button type="button" className="button ghost dark compact" onClick={requestEmailVerify}>
                    이메일 인증
                  </button>
                </div>
                <FieldError message={errors.adminEmail} />
                {emailVerifyNote ? (
                  <small className="partnership-field-info" role="status">
                    {emailVerifyNote}
                  </small>
                ) : null}
              </div>

              <label className="full check partnership-apply-login-option">
                <input
                  type="checkbox"
                  checked={form.useEmailAsLoginId}
                  onChange={(event) => updateField("useEmailAsLoginId", event.target.checked)}
                />
                <span>이메일을 로그인 아이디로 사용합니다.</span>
              </label>

              <label className={`full ${errors.adminLoginId ? "is-invalid" : ""}`}>
                <FieldLabel required htmlFor="adminLoginId">
                  로그인 아이디
                </FieldLabel>
                <input
                  id="adminLoginId"
                  value={form.adminLoginId}
                  aria-invalid={Boolean(errors.adminLoginId)}
                  onChange={(event) => updateField("adminLoginId", event.target.value)}
                  placeholder="영문·숫자 조합"
                  autoComplete="username"
                  readOnly={form.useEmailAsLoginId}
                />
                <FieldError message={errors.adminLoginId} />
              </label>

              <div className={`partnership-field-with-action ${errors.adminPassword ? "is-invalid" : ""}`}>
                <FieldLabel required htmlFor="adminPassword">
                  비밀번호
                </FieldLabel>
                <div className="partnership-inline-action">
                  <input
                    id="adminPassword"
                    type={showPassword ? "text" : "password"}
                    value={form.adminPassword}
                    aria-invalid={Boolean(errors.adminPassword)}
                    onChange={(event) => updateField("adminPassword", event.target.value)}
                    placeholder={`${PASSWORD_MIN_LENGTH}자 이상`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="button ghost dark compact"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "숨기기" : "보기"}
                  </button>
                </div>
                <FieldError message={errors.adminPassword} />
              </div>

              <div className={`partnership-field-with-action ${errors.adminPasswordConfirm ? "is-invalid" : ""}`}>
                <FieldLabel required htmlFor="adminPasswordConfirm">
                  비밀번호 확인
                </FieldLabel>
                <div className="partnership-inline-action">
                  <input
                    id="adminPasswordConfirm"
                    type={showPasswordConfirm ? "text" : "password"}
                    value={form.adminPasswordConfirm}
                    aria-invalid={Boolean(errors.adminPasswordConfirm)}
                    onChange={(event) => updateField("adminPasswordConfirm", event.target.value)}
                    placeholder="비밀번호 재입력"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="button ghost dark compact"
                    onClick={() => setShowPasswordConfirm((value) => !value)}
                    aria-pressed={showPasswordConfirm}
                  >
                    {showPasswordConfirm ? "숨기기" : "보기"}
                  </button>
                </div>
                <FieldError message={errors.adminPasswordConfirm} />
                {!errors.adminPasswordConfirm && passwordMismatchHint ? (
                  <small className="partnership-field-error" role="status">
                    {passwordMismatchHint}
                  </small>
                ) : null}
              </div>

              <p className="partnership-apply-secure-note full">
                비밀번호는 이 화면 메모리에만 유지되며 브라우저 저장소에 보관하지 않습니다.
              </p>
            </div>
          )}

          {step.key === "trade" && (
            <div className="partnership-apply-fields">
              <fieldset
                id="productTypes"
                className={`full partnership-apply-check-group ${errors.productTypes ? "is-invalid" : ""}`}
              >
                <legend>
                  취급상품 <em aria-label="필수">*</em>
                </legend>
                <div className="partnership-chip-grid">
                  {PRODUCT_TYPE_OPTIONS.map((option) => (
                    <label key={option} className="check">
                      <input
                        type="checkbox"
                        checked={form.productTypes.includes(option)}
                        onChange={() => updateField("productTypes", toggleMultiSelectValue(form.productTypes, option))}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                <FieldError message={errors.productTypes} />
              </fieldset>

              <fieldset
                id="partnershipPurposes"
                className={`full partnership-apply-check-group ${errors.partnershipPurposes ? "is-invalid" : ""}`}
              >
                <legend>
                  제휴 목적 <em aria-label="필수">*</em>
                </legend>
                <div className="partnership-chip-grid">
                  {PARTNERSHIP_PURPOSE_OPTIONS.map((option) => (
                    <label key={option} className="check">
                      <input
                        type="checkbox"
                        checked={form.partnershipPurposes.includes(option)}
                        onChange={() =>
                          updateField("partnershipPurposes", toggleMultiSelectValue(form.partnershipPurposes, option))
                        }
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                <FieldError message={errors.partnershipPurposes} />
                <small>상품공유그룹은 이 단계에서 선택하지 않습니다. 승인 후 관리자가 지정합니다.</small>
              </fieldset>

              <h3 className="partnership-apply-subhead full">판매 현황</h3>

              <label>
                <FieldLabel htmlFor="monthlyReservationCount">월평균 예약 건수</FieldLabel>
                <input
                  id="monthlyReservationCount"
                  value={form.monthlyReservationCount}
                  onChange={(event) => updateField("monthlyReservationCount", event.target.value)}
                  placeholder="예: 50건"
                />
              </label>
              <label>
                <FieldLabel htmlFor="monthlySalesAmount">월평균 판매금액</FieldLabel>
                <input
                  id="monthlySalesAmount"
                  value={form.monthlySalesAmount}
                  onChange={(event) => updateField("monthlySalesAmount", event.target.value)}
                  placeholder="예: 5,000만원"
                />
              </label>
              <label>
                <FieldLabel htmlFor="mainSalesRegions">주요 판매지역</FieldLabel>
                <input
                  id="mainSalesRegions"
                  value={form.mainSalesRegions}
                  onChange={(event) => updateField("mainSalesRegions", event.target.value)}
                  placeholder="예: 수도권, 부산"
                />
              </label>
              <label>
                <FieldLabel htmlFor="mainCustomerSegments">주요 고객층</FieldLabel>
                <input
                  id="mainCustomerSegments"
                  value={form.mainCustomerSegments}
                  onChange={(event) => updateField("mainCustomerSegments", event.target.value)}
                  placeholder="예: 가족, 시니어, 기업"
                />
              </label>

              <fieldset className="partnership-apply-check-group">
                <legend>온라인 판매 여부</legend>
                <div className="partnership-radio-row">
                  {(
                    [
                      ["yes", "예"],
                      ["no", "아니오"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="check">
                      <input
                        type="radio"
                        name="sellsOnline"
                        checked={form.sellsOnline === value}
                        onChange={() => updateField("sellsOnline", value)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="partnership-apply-check-group">
                <legend>오프라인 매장 여부</legend>
                <div className="partnership-radio-row">
                  {(
                    [
                      ["yes", "예"],
                      ["no", "아니오"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="check">
                      <input
                        type="radio"
                        name="hasOfflineStore"
                        checked={form.hasOfflineStore === value}
                        onChange={() => updateField("hasOfflineStore", value)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset
                id="hasSellers"
                className={`partnership-apply-check-group ${errors.hasSellers ? "is-invalid" : ""}`}
              >
                <legend>
                  판매점 보유 여부 <em aria-label="필수">*</em>
                </legend>
                <div className="partnership-radio-row">
                  {(
                    [
                      ["yes", "있음"],
                      ["no", "없음"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="check">
                      <input
                        type="radio"
                        name="hasSellers"
                        checked={form.hasSellers === value}
                        onChange={() => updateField("hasSellers", value as YesNo)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <FieldError message={errors.hasSellers} />
              </fieldset>

              <label className={errors.sellerCount ? "is-invalid" : undefined}>
                <FieldLabel required={form.hasSellers === "yes"} htmlFor="sellerCount">
                  보유 판매점 수
                </FieldLabel>
                <input
                  id="sellerCount"
                  value={form.sellerCount}
                  disabled={form.hasSellers !== "yes"}
                  aria-invalid={Boolean(errors.sellerCount)}
                  onChange={(event) => updateField("sellerCount", event.target.value.replace(/[^\d]/g, ""))}
                  placeholder={form.hasSellers === "yes" ? "예: 12" : "판매점 없음"}
                  inputMode="numeric"
                />
                <FieldError message={errors.sellerCount} />
              </label>

              <p className="partnership-apply-secure-note full">
                판매점이 있어도 가입승인 시 판매점 계정이 자동 생성되지 않습니다. 판매점은 승인 후 관리자에서 별도로
                등록합니다.
              </p>

              <label className="full">
                <FieldLabel htmlFor="mainSalesChannels">주요 판매채널</FieldLabel>
                <input
                  id="mainSalesChannels"
                  value={form.mainSalesChannels}
                  onChange={(event) => updateField("mainSalesChannels", event.target.value)}
                  placeholder="예: 자사몰, 네이버, 오프라인 매장"
                />
              </label>
              <label className="full">
                <FieldLabel htmlFor="currentErpSystem">현재 사용 중인 ERP 또는 예약시스템</FieldLabel>
                <input
                  id="currentErpSystem"
                  value={form.currentErpSystem}
                  onChange={(event) => updateField("currentErpSystem", event.target.value)}
                  placeholder="예: 자사 시스템, OO ERP"
                />
              </label>

              <h3 className="partnership-apply-subhead full">회사 소개 및 전달사항</h3>

              {(
                [
                  ["companyIntro", "회사 소개", LONG_TEXT_LIMITS.companyIntro],
                  ["flagshipProducts", "주력 상품", LONG_TEXT_LIMITS.flagshipProducts],
                  ["applyReason", "제휴 신청 사유", LONG_TEXT_LIMITS.applyReason],
                  ["expectedCollaboration", "예상 협업 방식", LONG_TEXT_LIMITS.expectedCollaboration],
                  ["messageToAdmin", "관리자 전달사항", LONG_TEXT_LIMITS.messageToAdmin],
                ] as const
              ).map(([key, label, limit]) => (
                <label key={key} className={`full ${errors[key] ? "is-invalid" : ""}`}>
                  <FieldLabel htmlFor={key}>{label}</FieldLabel>
                  <textarea
                    id={key}
                    rows={4}
                    value={form[key]}
                    maxLength={limit}
                    aria-invalid={Boolean(errors[key])}
                    onChange={(event) => updateField(key, event.target.value)}
                    placeholder={`${label}을(를) 입력해 주세요`}
                  />
                  <div className="partnership-char-count">
                    <FieldError message={errors[key]} />
                    <span>
                      {form[key].length} / {limit}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}

          {step.key === "docs" && (
            <div className="partnership-apply-fields">
              <p className="partnership-apply-secure-note full" role="note">
                허용 형식: PDF, JPG, JPEG, PNG · 파일당 최대 {MAX_FILE_SIZE_LABEL} · 필수 서류 각 1개 · 선택 서류
                항목당 1개 · 기타 서류 최대 {MAX_OTHER_FILES}개
                <br />
                선택한 파일은 이 화면에만 임시로 유지되며 서버로 업로드되지 않습니다.
              </p>
              <p className="partnership-apply-warn-note full" role="note">
                주민등록번호, 계좌 비밀번호 등 신청에 불필요한 개인정보가 포함된 서류는 첨부하지 마세요.
              </p>

              <h3 className="partnership-apply-subhead full">필수서류</h3>
              {REQUIRED_ATTACHMENT_SLOTS.map((slot) => (
                <AttachmentSlot
                  key={slot.key}
                  id={slot.key}
                  label={slot.label}
                  required
                  file={form[slot.key as SingleAttachmentKey]}
                  error={filePickErrors[slot.key] || errors[slot.key as SingleAttachmentKey]}
                  onSelectSingle={(nextFile, pickError) =>
                    setSingleAttachment(slot.key as SingleAttachmentKey, nextFile, pickError)
                  }
                  onClearSingle={() => setSingleAttachment(slot.key as SingleAttachmentKey, null, null)}
                />
              ))}

              <h3 className="partnership-apply-subhead full">선택서류</h3>
              {OPTIONAL_ATTACHMENT_SLOTS.map((slot) => {
                if (slot.key === "otherFiles") {
                  return (
                    <AttachmentSlot
                      key={slot.key}
                      id={slot.key}
                      label={slot.label}
                      multiple
                      files={form.otherFiles}
                      error={filePickErrors.otherFiles}
                      onSelectMultiple={setOtherFiles}
                      onRemoveMultipleAt={(index) =>
                        setOtherFiles(
                          form.otherFiles.filter((_, i) => i !== index),
                          null,
                        )
                      }
                    />
                  );
                }
                const singleKey = slot.key;
                return (
                  <AttachmentSlot
                    key={singleKey}
                    id={singleKey}
                    label={slot.label}
                    file={form[singleKey]}
                    error={filePickErrors[singleKey]}
                    onSelectSingle={(nextFile, pickError) => setSingleAttachment(singleKey, nextFile, pickError)}
                    onClearSingle={() => setSingleAttachment(singleKey, null, null)}
                  />
                );
              })}

              <h3 className="partnership-apply-subhead full">주요 정책 안내</h3>
              <ul className="partnership-policy-guide full">
                {POLICY_GUIDE_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h3 className="partnership-apply-subhead full">약관 동의</h3>
              <fieldset
                className={`full partnership-apply-check-group ${errors.agreeTerms ? "is-invalid" : ""}`}
                id="agreeTerms"
              >
                <legend>
                  필수 동의 <em aria-label="필수">*</em>
                </legend>
                <label className="check partnership-agree-all">
                  <input
                    type="checkbox"
                    checked={requiredTermsAgreed}
                    onChange={(event) => setRequiredTermsAll(event.target.checked)}
                  />
                  <span>필수약관 전체동의</span>
                </label>
                {TERM_ITEMS.filter((item) => item.required).map((item) => (
                  <div key={item.key} className="partnership-term-row">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={form[item.key]}
                        onChange={(event) => updateField(item.key, event.target.checked)}
                      />
                      <span>{item.title}</span>
                    </label>
                    <button type="button" className="partnership-term-view" onClick={() => setOpenTerm(item)}>
                      내용보기
                    </button>
                  </div>
                ))}
                <FieldError message={errors.agreeTerms} />
              </fieldset>

              <fieldset className="full partnership-apply-check-group">
                <legend>선택 동의</legend>
                {TERM_ITEMS.filter((item) => !item.required).map((item) => (
                  <div key={item.key} className="partnership-term-row">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={form[item.key]}
                        onChange={(event) => updateField(item.key, event.target.checked)}
                      />
                      <span>{item.title}</span>
                    </label>
                    <button type="button" className="partnership-term-view" onClick={() => setOpenTerm(item)}>
                      내용보기
                    </button>
                  </div>
                ))}
              </fieldset>
            </div>
          )}

          {step.key === "review" && (
            <div className="partnership-apply-review">
              <p className="partnership-apply-secure-note">
                비밀번호는 표시하지 않으며, 사업자·연락처는 일부 마스킹됩니다. 첨부파일은 파일명만 표시합니다.
              </p>
              <p className="partnership-apply-temp-note" role="note">
                이번 제출은 프론트엔드 프로토타입입니다. 실제 관리자 시스템에 신청이 생성되지 않으며, 이메일·알림톡도
                발송되지 않습니다.
              </p>

              <section className="partnership-review-block">
                <header>
                  <h3>여행사 정보</h3>
                  <button type="button" className="button ghost dark compact" onClick={() => goToStep("agency")}>
                    수정
                  </button>
                </header>
                <dl>
                  <div>
                    <dt>여행사명</dt>
                    <dd>
                      <TextValue value={review.agencyName} />
                    </dd>
                  </div>
                  <div>
                    <dt>사업자등록번호 / 구분</dt>
                    <dd>
                      {maskBusinessNumber(review.businessNumber)} / {review.businessType || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>대표자명</dt>
                    <dd>
                      <TextValue value={review.ceoName} />
                    </dd>
                  </div>
                  <div>
                    <dt>여행업 등록 / 종류</dt>
                    <dd>
                      {review.tourismLicenseNumber || "—"} / {review.tourismLicenseType || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>주소</dt>
                    <dd>
                      <TextValue value={`${review.address} ${review.addressDetail}`.trim()} />
                    </dd>
                  </div>
                  <div>
                    <dt>대표 전화 / 이메일</dt>
                    <dd>
                      {maskPhone(review.phone)} / {maskEmail(review.email)}
                    </dd>
                  </div>
                  <div>
                    <dt>홈페이지</dt>
                    <dd>
                      <TextValue value={review.homepage} />
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="partnership-review-block">
                <header>
                  <h3>대표 관리자 정보</h3>
                  <button type="button" className="button ghost dark compact" onClick={() => goToStep("admin")}>
                    수정
                  </button>
                </header>
                <dl>
                  <div>
                    <dt>이름 / 부서·직책</dt>
                    <dd>
                      {review.adminName || "—"} · {review.department || "—"} / {review.position || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>휴대전화 / 이메일</dt>
                    <dd>
                      {maskPhone(review.adminPhone)} / {maskEmail(review.adminEmail)}
                    </dd>
                  </div>
                  <div>
                    <dt>로그인 아이디</dt>
                    <dd>
                      <TextValue value={review.adminLoginId} />
                    </dd>
                  </div>
                  <div>
                    <dt>비밀번호</dt>
                    <dd>{review.adminPasswordSet ? "입력됨 (표시하지 않음)" : "—"}</dd>
                  </div>
                </dl>
              </section>

              <section className="partnership-review-block">
                <header>
                  <h3>취급상품</h3>
                  <button type="button" className="button ghost dark compact" onClick={() => goToStep("trade")}>
                    수정
                  </button>
                </header>
                <dl>
                  <div>
                    <dt>선택 항목</dt>
                    <dd>
                      <TextValue value={review.productTypes.join(", ")} />
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="partnership-review-block">
                <header>
                  <h3>제휴 목적</h3>
                  <button type="button" className="button ghost dark compact" onClick={() => goToStep("trade")}>
                    수정
                  </button>
                </header>
                <dl>
                  <div>
                    <dt>선택 항목</dt>
                    <dd>
                      <TextValue value={review.partnershipPurposes.join(", ")} />
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="partnership-review-block">
                <header>
                  <h3>판매 현황</h3>
                  <button type="button" className="button ghost dark compact" onClick={() => goToStep("trade")}>
                    수정
                  </button>
                </header>
                <dl>
                  <div>
                    <dt>월평균 예약 / 판매금액</dt>
                    <dd>
                      {review.monthlyReservationCount || "—"} / {review.monthlySalesAmount || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>주요 판매지역 / 고객층</dt>
                    <dd>
                      {review.mainSalesRegions || "—"} / {review.mainCustomerSegments || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>온라인 / 오프라인 매장</dt>
                    <dd>
                      {yesNoLabel(review.sellsOnline as YesNo)} / {yesNoLabel(review.hasOfflineStore as YesNo)}
                    </dd>
                  </div>
                  <div>
                    <dt>판매점</dt>
                    <dd>
                      {review.hasSellers === "yes"
                        ? `보유 · ${review.sellerCount || "—"}곳`
                        : review.hasSellers === "no"
                          ? "없음"
                          : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>주요 판매채널</dt>
                    <dd>
                      <TextValue value={review.mainSalesChannels} />
                    </dd>
                  </div>
                  <div>
                    <dt>사용 중 ERP·예약시스템</dt>
                    <dd>
                      <TextValue value={review.currentErpSystem} />
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="partnership-review-block">
                <header>
                  <h3>회사 소개</h3>
                  <button type="button" className="button ghost dark compact" onClick={() => goToStep("trade")}>
                    수정
                  </button>
                </header>
                <dl>
                  <div>
                    <dt>회사 소개</dt>
                    <dd>
                      <TextValue value={review.companyIntro} />
                    </dd>
                  </div>
                  <div>
                    <dt>주력 상품</dt>
                    <dd>
                      <TextValue value={review.flagshipProducts} />
                    </dd>
                  </div>
                  <div>
                    <dt>제휴 신청 사유</dt>
                    <dd>
                      <TextValue value={review.applyReason} />
                    </dd>
                  </div>
                  <div>
                    <dt>예상 협업 방식</dt>
                    <dd>
                      <TextValue value={review.expectedCollaboration} />
                    </dd>
                  </div>
                  <div>
                    <dt>관리자 전달사항</dt>
                    <dd>
                      <TextValue value={review.messageToAdmin} />
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="partnership-review-block">
                <header>
                  <h3>제출서류 목록</h3>
                  <button type="button" className="button ghost dark compact" onClick={() => goToStep("docs")}>
                    수정
                  </button>
                </header>
                <dl>
                  <div>
                    <dt>필수</dt>
                    <dd>
                      사업자등록증: {review.businessLicenseFileName || "미첨부"}
                      <br />
                      관광사업등록증/여행업등록증: {review.tourismLicenseFileName || "미첨부"}
                    </dd>
                  </div>
                  <div>
                    <dt>선택</dt>
                    <dd>
                      {!review.mailOrderLicenseFileName &&
                      !review.companyIntroFileName &&
                      !review.productIntroFileName &&
                      !review.insuranceFileName &&
                      review.otherFileNames.length === 0 ? (
                        "없음"
                      ) : (
                        <>
                          {review.mailOrderLicenseFileName ? (
                            <>
                              통신판매업 신고증: {review.mailOrderLicenseFileName}
                              <br />
                            </>
                          ) : null}
                          {review.companyIntroFileName ? (
                            <>
                              회사소개서: {review.companyIntroFileName}
                              <br />
                            </>
                          ) : null}
                          {review.productIntroFileName ? (
                            <>
                              상품소개서: {review.productIntroFileName}
                              <br />
                            </>
                          ) : null}
                          {review.insuranceFileName ? (
                            <>
                              보험 관련 서류: {review.insuranceFileName}
                              <br />
                            </>
                          ) : null}
                          {review.otherFileNames.length > 0 ? <>기타: {review.otherFileNames.join(", ")}</> : null}
                        </>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="partnership-review-block">
                <header>
                  <h3>약관 동의내역</h3>
                  <button type="button" className="button ghost dark compact" onClick={() => goToStep("docs")}>
                    수정
                  </button>
                </header>
                <dl>
                  <div>
                    <dt>필수 동의</dt>
                    <dd>
                      {TERM_ITEMS.filter((item) => item.required)
                        .map((item) => `${item.title}: ${review[item.key] ? "동의" : "미동의"}`)
                        .join(" · ")}
                    </dd>
                  </div>
                  <div>
                    <dt>선택 동의</dt>
                    <dd>
                      {[
                        review.agreeEmailGuide ? "제휴·상품 안내 이메일" : null,
                        review.agreeMarketing ? "마케팅 정보" : null,
                        review.agreeSms ? "알림톡·문자" : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "없음"}
                    </dd>
                  </div>
                </dl>
              </section>

              <fieldset
                className={`partnership-apply-check-group ${errors.confirmAccuracy ? "is-invalid" : ""}`}
                id="confirmAccuracy"
              >
                <legend>
                  최종 확인 <em aria-label="필수">*</em>
                </legend>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.confirmAccuracy}
                    onChange={(event) => updateField("confirmAccuracy", event.target.checked)}
                  />
                  <span>입력한 정보가 사실과 다름이 없음을 확인합니다.</span>
                </label>
                <FieldError message={errors.confirmAccuracy} />
              </fieldset>

              {draftNote ? (
                <p className="partnership-apply-draft-note" role="status">
                  {draftNote}
                </p>
              ) : null}
            </div>
          )}

          <div className="partnership-apply-actions">
            <button type="button" className="button ghost dark" onClick={() => setCancelOpen(true)}>
              신청 취소
            </button>
            <div className="partnership-apply-nav">
              <button type="button" className="button ghost dark" onClick={goPrev} disabled={isFirst}>
                이전
              </button>
              {isLast ? (
                <>
                  <button type="button" className="button ghost dark" onClick={handleTempSave}>
                    임시저장
                  </button>
                  <button
                    type="button"
                    className="button primary"
                    onClick={handleSubmitPrototype}
                    disabled={submitting}
                  >
                    가입신청 제출
                  </button>
                </>
              ) : (
                <button type="button" className="button primary" onClick={goNext}>
                  다음 <span>→</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {cancelOpen && (
        <div className="partnership-apply-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
          <button type="button" className="partnership-apply-dialog-backdrop" onClick={() => setCancelOpen(false)} aria-label="닫기" />
          <div className="partnership-apply-dialog-panel">
            <h3 id="cancel-title">신청을 취소할까요?</h3>
            <p>작성 중인 내용은 저장되지 않으며 제휴안내 페이지로 이동합니다.</p>
            <div>
              <button type="button" className="button ghost dark" onClick={() => setCancelOpen(false)}>
                계속 작성
              </button>
              <button type="button" className="button primary" onClick={confirmCancel}>
                신청 취소
              </button>
            </div>
          </div>
        </div>
      )}

      {openTerm && (
        <div className="partnership-apply-dialog" role="dialog" aria-modal="true" aria-labelledby="term-title">
          <button type="button" className="partnership-apply-dialog-backdrop" onClick={() => setOpenTerm(null)} aria-label="닫기" />
          <div className="partnership-apply-dialog-panel partnership-term-dialog">
            <h3 id="term-title">{openTerm.title}</h3>
            <p className="partnership-term-badge">{openTerm.required ? "필수 동의 · 임시 안내문" : "선택 동의 · 임시 안내문"}</p>
            <p>{openTerm.summary}</p>
            <div>
              <button type="button" className="button primary" onClick={() => setOpenTerm(null)}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
