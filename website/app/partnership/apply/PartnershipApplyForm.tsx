"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  APPLY_FIELD_ORDER,
  createPrototypeApplyReceipt,
  FILE_ACCEPT,
  firstErrorFieldId,
  formatBusinessNumberInput,
  formatFileSize,
  INITIAL_PARTNERSHIP_APPLY_FORM,
  isValidBusinessNumber,
  MAX_FILE_SIZE_LABEL,
  ATTACHMENT_SLOTS,
  OPTIONAL_TERM_KEYS,
  POLICY_GUIDE_ITEMS,
  REQUIRED_TERM_KEYS,
  savePrototypeApplyReceipt,
  TERM_ITEMS,
  TOURISM_LICENSE_TYPE_OPTIONS,
  validateApplyForm,
  validateAttachmentFile,
  type ApplyFieldErrors,
  type PartnershipApplyForm,
  type SingleAttachmentKey,
  type TermItem,
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
    <img className="partnership-file-preview" src={url} alt={`${file.name} 미리보기`} />
  );
}

function AttachmentSlot({
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
    <div className={`partnership-file-slot ${error ? "is-invalid" : ""}`} id={id}>
      <div className="partnership-file-slot-head">
        <FieldLabel required={required} htmlFor={`${id}-input`}>
          {label}
        </FieldLabel>
        <button type="button" className="button ghost dark compact" onClick={openPicker}>
          {file ? "교체" : "파일 선택"}
        </button>
        <input
          ref={inputRef}
          id={`${id}-input`}
          className="partnership-file-input-hidden"
          type="file"
          accept={FILE_ACCEPT}
          aria-invalid={Boolean(error)}
          onChange={handleChange}
        />
      </div>
      {!file ? (
        <p className="partnership-file-empty">선택된 파일이 없습니다.</p>
      ) : (
        <ul className="partnership-file-list">
          <li>
            <div className="partnership-file-meta">
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
      <FieldError message={error} />
    </div>
  );
}

export function PartnershipApplyForm() {
  const router = useRouter();
  const [form, setForm] = useState<PartnershipApplyForm>(INITIAL_PARTNERSHIP_APPLY_FORM);
  const [dirty, setDirty] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [errors, setErrors] = useState<ApplyFieldErrors>({});
  const [businessCheckNote, setBusinessCheckNote] = useState("");
  const [addressSearchNote, setAddressSearchNote] = useState("");
  const [filePickErrors, setFilePickErrors] = useState<Partial<Record<string, string>>>({});
  const [openTerm, setOpenTerm] = useState<TermItem | null>(null);
  const [submitBanner, setSubmitBanner] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allTermKeys = useMemo(
    () => [...REQUIRED_TERM_KEYS, ...OPTIONAL_TERM_KEYS] as const,
    [],
  );

  const allTermsChecked = allTermKeys.every((key) => form[key]);

  const updateField = <K extends keyof PartnershipApplyForm>(key: K, value: PartnershipApplyForm[K]) => {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key] && key !== "agreeTerms") return current;
      const next = { ...current };
      delete next[key];
      if (
        REQUIRED_TERM_KEYS.includes(key as (typeof REQUIRED_TERM_KEYS)[number]) ||
        key === "agreeTerms"
      ) {
        delete next.agreeTerms;
      }
      return next;
    });
    setSubmitBanner("");
  };

  const setSingleAttachment = (key: SingleAttachmentKey, file: File | null, pickError: string | null) => {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: file }));
    setFilePickErrors((current) => {
      const next = { ...current };
      if (pickError) next[key] = pickError;
      else delete next[key];
      return next;
    });
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const setAgreeAll = (checked: boolean) => {
    setDirty(true);
    setForm((current) => {
      const next = { ...current };
      for (const key of allTermKeys) next[key] = checked;
      return next;
    });
    setErrors((current) => {
      const next = { ...current };
      delete next.agreeTerms;
      return next;
    });
  };

  const focusFirstError = (nextErrors: ApplyFieldErrors) => {
    const id = firstErrorFieldId(nextErrors);
    if (!id) return;
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusTarget =
      el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
        ? el
        : el?.querySelector<HTMLElement>("input, select, textarea, button");
    focusTarget?.focus?.();
  };

  const requestCancel = () => {
    if (!dirty) {
      router.push("/partnership");
      return;
    }
    setCancelOpen(true);
  };

  const confirmCancel = () => {
    setCancelOpen(false);
    setDirty(false);
    router.push("/partnership");
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
    setErrors((current) => {
      const next = { ...current };
      delete next.businessNumber;
      return next;
    });
    setBusinessCheckNote("실제 중복확인은 관리자 시스템 연동 후 제공됩니다.");
  };

  const requestAddressSearch = () => {
    setAddressSearchNote("실제 주소검색은 우편번호 API 연동 후 제공됩니다.");
  };

  const handleSubmitPrototype = () => {
    const nextErrors = validateApplyForm(form);

    // 선택 서류에서 거절된 파일 선택 오류가 남아 제출을 막지 않도록 정리
    const activePickErrors: Partial<Record<string, string>> = { ...filePickErrors };
    if (!form.mailOrderLicenseFile) delete activePickErrors.mailOrderLicenseFile;
    if (Object.keys(activePickErrors).length !== Object.keys(filePickErrors).length) {
      setFilePickErrors(activePickErrors);
    }

    const pickKeys = Object.keys(activePickErrors);
    if (Object.keys(nextErrors).length > 0 || pickKeys.length > 0) {
      setErrors(nextErrors);
      setSubmitBanner("입력·동의·서류 항목을 확인해 주세요.");
      const merged: ApplyFieldErrors = { ...nextErrors };
      for (const key of pickKeys) {
        const message = activePickErrors[key];
        if (message && APPLY_FIELD_ORDER.includes(key as keyof PartnershipApplyForm)) {
          merged[key as keyof PartnershipApplyForm] = message;
        }
      }
      focusFirstError(Object.keys(merged).length > 0 ? merged : nextErrors);
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
            AOS 제휴여행사 가입을 신청해 주세요. 관리자가 제출정보와 증빙서류를 검토한 후 승인 결과를 담당자
            이메일로 안내합니다.
          </p>
          <p className="partnership-apply-temp-note" role="note">
            프론트엔드 프로토타입입니다. API·DB 저장, 실제 파일 업로드, 이메일 발송은 아직 연결되지 않습니다.
          </p>
        </header>

        <section className="partnership-apply-panel" aria-labelledby="apply-form-title">
          <header className="partnership-apply-panel-head">
            <span>APPLICATION</span>
            <h2 id="apply-form-title">가입신청서</h2>
            <p>아래 항목을 한 페이지에서 작성한 뒤 신청해 주세요.</p>
            {submitBanner ? (
              <p className="partnership-apply-submit-banner" role="alert">
                {submitBanner}
              </p>
            ) : null}
          </header>

          {/* 1. 제휴 안내 */}
          <section className="partnership-apply-section" aria-labelledby="guide-title">
            <header className="partnership-apply-section-head">
              <h3 id="guide-title">제휴 안내</h3>
              <p>가입 및 상품공유 운영 기준입니다.</p>
            </header>
            <div className="partnership-apply-policy-box">
              <ul>
                {POLICY_GUIDE_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* 2. 여행사 정보 */}
          <section className="partnership-apply-section" aria-labelledby="agency-title">
            <header className="partnership-apply-section-head">
              <h3 id="agency-title">여행사 정보</h3>
              <p>사업자·여행업 등록 정보를 입력해 주세요.</p>
            </header>
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

              <div className="full partnership-apply-trio">
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
                      updateField(
                        "tourismLicenseType",
                        event.target.value as PartnershipApplyForm["tourismLicenseType"],
                      )
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
              </div>

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

              <div className={`partnership-field-with-action ${errors.addressDetail ? "is-invalid" : ""}`}>
                <FieldLabel htmlFor="addressDetail">상세주소</FieldLabel>
                <div className="partnership-inline-action">
                  <input
                    id="addressDetail"
                    value={form.addressDetail}
                    aria-invalid={Boolean(errors.addressDetail)}
                    onChange={(event) => updateField("addressDetail", event.target.value)}
                    placeholder="상세 주소"
                  />
                  <button type="button" className="button ghost dark compact" onClick={requestAddressSearch}>
                    주소검색
                  </button>
                </div>
                <FieldError message={errors.addressDetail} />
                {addressSearchNote ? (
                  <small className="partnership-field-info" role="status">
                    {addressSearchNote}
                  </small>
                ) : null}
              </div>

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

              <label className={errors.homepage ? "is-invalid" : undefined}>
                <FieldLabel htmlFor="homepage">홈페이지 URL</FieldLabel>
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
          </section>

          {/* 3. 담당자 정보 */}
          <section className="partnership-apply-section" aria-labelledby="contact-title">
            <header className="partnership-apply-section-head">
              <h3 id="contact-title">담당자 정보</h3>
              <p>심사 결과 안내를 받을 담당자 연락처입니다.</p>
            </header>
            <div className="partnership-apply-fields">
              <label className={errors.adminName ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="adminName">
                  담당자명
                </FieldLabel>
                <input
                  id="adminName"
                  value={form.adminName}
                  aria-invalid={Boolean(errors.adminName)}
                  onChange={(event) => updateField("adminName", event.target.value)}
                  placeholder="담당자 이름"
                />
                <FieldError message={errors.adminName} />
              </label>

              <label className={errors.department ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="department">
                  부서 또는 직책
                </FieldLabel>
                <input
                  id="department"
                  value={form.department}
                  aria-invalid={Boolean(errors.department)}
                  onChange={(event) => updateField("department", event.target.value)}
                  placeholder="예: 영업팀 / 과장"
                />
                <FieldError message={errors.department} />
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

              <label className={errors.adminEmail ? "is-invalid" : undefined}>
                <FieldLabel required htmlFor="adminEmail">
                  이메일
                </FieldLabel>
                <input
                  id="adminEmail"
                  type="email"
                  value={form.adminEmail}
                  aria-invalid={Boolean(errors.adminEmail)}
                  onChange={(event) => updateField("adminEmail", event.target.value)}
                  placeholder="contact@example.com"
                  autoComplete="email"
                />
                <FieldError message={errors.adminEmail} />
              </label>

              <label className={`full ${errors.adminEmailConfirm ? "is-invalid" : ""}`}>
                <FieldLabel required htmlFor="adminEmailConfirm">
                  이메일 확인
                </FieldLabel>
                <input
                  id="adminEmailConfirm"
                  type="email"
                  value={form.adminEmailConfirm}
                  aria-invalid={Boolean(errors.adminEmailConfirm)}
                  onChange={(event) => updateField("adminEmailConfirm", event.target.value)}
                  placeholder="이메일을 다시 입력해 주세요"
                  autoComplete="email"
                />
                <FieldError message={errors.adminEmailConfirm} />
              </label>
            </div>
          </section>

          {/* 4. 증빙서류 */}
          <section className="partnership-apply-section" aria-labelledby="docs-title">
            <header className="partnership-apply-section-head">
              <h3 id="docs-title">증빙서류 첨부</h3>
              <p>
                허용 형식 PDF, JPG, JPEG, PNG · 파일당 최대 {MAX_FILE_SIZE_LABEL}. 현재는 프로토타입이며 서버에
                실제 업로드되지 않습니다.
              </p>
            </header>
            <div className="partnership-apply-fields">
              <p className="partnership-apply-secure-note full" role="note">
                선택한 파일은 브라우저 메모리에만 보관되며, 제출 시 sessionStorage에도 파일 내용은 저장되지
                않습니다.
              </p>
              <div className="partnership-apply-docs-row full">
                {ATTACHMENT_SLOTS.map((slot) => (
                  <AttachmentSlot
                    key={slot.key}
                    id={slot.key}
                    label={slot.label}
                    required={slot.required}
                    file={form[slot.key]}
                    error={filePickErrors[slot.key] || errors[slot.key]}
                    onSelect={(nextFile, pickError) => setSingleAttachment(slot.key, nextFile, pickError)}
                    onClear={() => setSingleAttachment(slot.key, null, null)}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* 5. 약관 */}
          <section className="partnership-apply-section" aria-labelledby="terms-title">
            <header className="partnership-apply-section-head">
              <h3 id="terms-title">약관 및 정책 동의</h3>
              <p>필수 항목에 동의한 뒤 신청할 수 있습니다.</p>
            </header>
            <div className="partnership-apply-fields">
              <fieldset
                className={`full partnership-apply-check-group ${errors.agreeTerms ? "is-invalid" : ""}`}
                id="agreeTerms"
              >
                <legend>
                  약관 동의 <em aria-label="필수">*</em>
                </legend>
                <label className="check partnership-agree-all">
                  <input
                    type="checkbox"
                    checked={allTermsChecked}
                    onChange={(event) => setAgreeAll(event.target.checked)}
                  />
                  <span>전체 동의</span>
                </label>
                {TERM_ITEMS.filter((item) => item.required).map((item) => (
                  <div key={item.key} className="partnership-term-row">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={form[item.key]}
                        onChange={(event) => updateField(item.key, event.target.checked)}
                      />
                      <span>
                        (필수) {item.title}
                      </span>
                    </label>
                    <button type="button" className="partnership-term-view" onClick={() => setOpenTerm(item)}>
                      보기
                    </button>
                  </div>
                ))}
                {TERM_ITEMS.filter((item) => !item.required).map((item) => (
                  <div key={item.key} className="partnership-term-row">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={form[item.key]}
                        onChange={(event) => updateField(item.key, event.target.checked)}
                      />
                      <span>(선택) {item.title}</span>
                    </label>
                    <button type="button" className="partnership-term-view" onClick={() => setOpenTerm(item)}>
                      보기
                    </button>
                  </div>
                ))}
                <FieldError message={errors.agreeTerms} />
              </fieldset>
            </div>
          </section>

          <div className="partnership-apply-actions">
            <button type="button" className="button ghost dark" onClick={requestCancel}>
              취소
            </button>
            <button
              type="button"
              className="button primary"
              onClick={handleSubmitPrototype}
              disabled={submitting}
            >
              가입 신청하기
            </button>
          </div>
        </section>
      </div>

      {cancelOpen ? (
        <div className="partnership-apply-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
          <button
            type="button"
            className="partnership-apply-dialog-backdrop"
            onClick={() => setCancelOpen(false)}
            aria-label="닫기"
          />
          <div className="partnership-apply-dialog-panel">
            <h3 id="cancel-title">신청을 취소할까요?</h3>
            <p>입력 중인 내용은 저장되지 않습니다. 제휴여행사 안내 페이지로 이동합니다.</p>
            <div>
              <button type="button" className="button ghost dark" onClick={() => setCancelOpen(false)}>
                계속 작성
              </button>
              <button type="button" className="button primary" onClick={confirmCancel}>
                취소하고 나가기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {openTerm ? (
        <div className="partnership-apply-dialog" role="dialog" aria-modal="true" aria-labelledby="term-title">
          <button
            type="button"
            className="partnership-apply-dialog-backdrop"
            onClick={() => setOpenTerm(null)}
            aria-label="닫기"
          />
          <div className="partnership-apply-dialog-panel partnership-term-dialog">
            <h3 id="term-title">{openTerm.title}</h3>
            <p className="partnership-term-badge">
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
