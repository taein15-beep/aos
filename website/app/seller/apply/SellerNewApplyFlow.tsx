"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BUSINESS_TYPES,
  EMPTY_NEW_SELLER_FORM,
  MOCK_ADDRESS_RESULTS,
  MOCK_CERTIFICATE_FILE_NAME,
  MOCK_NEW_SELLER_FORM,
  getNewSellerTerms,
  type ApplySupplier,
  type NewSellerForm,
  type NewSellerTermKey,
} from "./entry-mock";

export type NewSellerStage = "form" | "confirm" | "done";

type ErrorKey = keyof NewSellerForm | "certificate" | "terms";

type LogoPreview = { name: string; url: string };

const BUSINESS_NUMBER_PATTERN = /^\d{3}-\d{2}-\d{5}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_ORDER: ErrorKey[] = [
  "loginId",
  "password",
  "passwordConfirm",
  "sellerName",
  "representative",
  "phone",
  "email",
  "businessType",
  "businessNumber",
  "companyName",
  "businessRepresentative",
  "address",
  "certificate",
  "managerName",
  "managerPhone",
  "managerEmail",
  "terms",
];

function formatBusinessNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function fieldId(key: ErrorKey) {
  return `seller-new-${key}`;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <small className="seller-field-error" id={`${id}-error`} role="alert">
      {message}
    </small>
  );
}

function Label({ htmlFor, text, required }: { htmlFor?: string; text: string; required?: boolean }) {
  return (
    <span className="seller-field-label">
      <label htmlFor={htmlFor}>
        {text}
        {required ? <em aria-label="필수">*</em> : null}
      </label>
    </span>
  );
}

function useEscape(onClose: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, enabled]);
}

export function Dialog({
  titleId,
  className,
  onClose,
  children,
}: {
  titleId: string;
  className?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEscape(onClose, true);
  return (
    <div className="seller-apply-dialog" role="presentation">
      <button type="button" className="seller-apply-dialog-backdrop" aria-label="닫기" onClick={onClose} />
      <div
        className={`seller-apply-dialog-panel${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {children}
      </div>
    </div>
  );
}

export function SellerNewApplyFlow({
  supplier,
  stage,
  onStageChange,
  onBack,
  notify,
}: {
  supplier: ApplySupplier;
  stage: NewSellerStage;
  onStageChange: (stage: NewSellerStage) => void;
  onBack: () => void;
  notify: (message: string) => void;
}) {
  const terms = useMemo(() => getNewSellerTerms(supplier.name), [supplier.name]);
  const [form, setForm] = useState<NewSellerForm>(EMPTY_NEW_SELLER_FORM);
  const [sameRepresentative, setSameRepresentative] = useState(false);
  const [loginIdChecked, setLoginIdChecked] = useState(false);
  const [businessChecked, setBusinessChecked] = useState(false);
  const [logo, setLogo] = useState<LogoPreview | null>(null);
  const [certificateName, setCertificateName] = useState("");
  const [agreed, setAgreed] = useState<Record<NewSellerTermKey, boolean>>({
    service: false,
    privacy: false,
    supplierPolicy: false,
    marketing: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [checkErrors, setCheckErrors] = useState<Partial<Record<ErrorKey, string>>>({});
  const [addressOpen, setAddressOpen] = useState(false);
  const [openTerm, setOpenTerm] = useState<NewSellerTermKey | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const logoUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [stage]);

  const businessRepresentative = sameRepresentative ? form.representative : form.businessRepresentative;

  const update = <K extends keyof NewSellerForm>(key: K, value: NewSellerForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setCheckErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const errors = useMemo(() => {
    const next: Partial<Record<ErrorKey, string>> = {};
    if (!form.loginId.trim()) next.loginId = "아이디를 입력해주세요.";
    else if (!loginIdChecked) next.loginId = "아이디 중복확인을 해주세요.";
    if (!form.password) next.password = "비밀번호를 입력해주세요.";
    if (!form.passwordConfirm) next.passwordConfirm = "비밀번호 확인을 입력해주세요.";
    else if (form.password !== form.passwordConfirm) next.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    if (!form.sellerName.trim()) next.sellerName = "판매점명을 입력해주세요.";
    if (!form.representative.trim()) next.representative = "대표자명을 입력해주세요.";
    if (!form.phone.trim()) next.phone = "대표 전화번호를 입력해주세요.";
    if (!form.email.trim()) next.email = "이메일을 입력해주세요.";
    else if (!EMAIL_PATTERN.test(form.email.trim())) next.email = "이메일 형식을 확인해주세요.";
    if (!form.businessType) next.businessType = "사업자 구분을 선택해주세요.";
    if (!form.businessNumber) next.businessNumber = "사업자등록번호를 입력해주세요.";
    else if (!BUSINESS_NUMBER_PATTERN.test(form.businessNumber))
      next.businessNumber = "사업자등록번호 형식(000-00-00000)을 확인해주세요.";
    if (!form.companyName.trim()) next.companyName = "상호명을 입력해주세요.";
    if (!businessRepresentative.trim()) next.businessRepresentative = "사업자 대표자명을 입력해주세요.";
    if (!form.zipCode || !form.address) next.address = "사업장 주소를 입력해주세요.";
    if (!certificateName) next.certificate = "사업자등록증을 첨부해주세요.";
    if (!form.managerName.trim()) next.managerName = "담당자명을 입력해주세요.";
    if (!form.managerPhone.trim()) next.managerPhone = "담당자 연락처를 입력해주세요.";
    if (!form.managerEmail.trim()) next.managerEmail = "담당자 이메일을 입력해주세요.";
    else if (!EMAIL_PATTERN.test(form.managerEmail.trim())) next.managerEmail = "이메일 형식을 확인해주세요.";
    if (terms.some((term) => term.required && !agreed[term.key])) next.terms = "필수 약관에 동의해주세요.";
    return next;
  }, [form, loginIdChecked, businessRepresentative, certificateName, agreed, terms]);

  const isComplete = Object.keys(errors).length === 0;

  const errorFor = (key: ErrorKey) => {
    if (checkErrors[key]) return checkErrors[key];
    if (key === "passwordConfirm" && form.passwordConfirm && form.password !== form.passwordConfirm) {
      return errors.passwordConfirm;
    }
    return submitted ? errors[key] : undefined;
  };

  const invalidClass = (key: ErrorKey, base = "") => {
    const cls = errorFor(key) ? `${base} is-invalid` : base;
    return cls.trim() || undefined;
  };

  const describedBy = (key: ErrorKey) => (errorFor(key) ? `${fieldId(key)}-error` : undefined);

  const checkLoginId = () => {
    if (!form.loginId.trim()) {
      setLoginIdChecked(false);
      setCheckErrors((prev) => ({ ...prev, loginId: "아이디를 입력해주세요." }));
      return;
    }
    setCheckErrors((prev) => ({ ...prev, loginId: undefined }));
    setLoginIdChecked(true);
  };

  const checkBusinessNumber = () => {
    if (!BUSINESS_NUMBER_PATTERN.test(form.businessNumber)) {
      setBusinessChecked(false);
      setCheckErrors((prev) => ({
        ...prev,
        businessNumber: form.businessNumber
          ? "사업자등록번호 형식(000-00-00000)을 확인해주세요."
          : "사업자등록번호를 입력해주세요.",
      }));
      return;
    }
    setCheckErrors((prev) => ({ ...prev, businessNumber: undefined }));
    setBusinessChecked(true);
  };

  const selectLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      notify("판매점 로고는 JPG, PNG 파일만 선택할 수 있습니다.");
      return;
    }
    if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
    const url = URL.createObjectURL(file);
    logoUrlRef.current = url;
    setLogo({ name: file.name, url });
  };

  const removeLogo = () => {
    if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
    logoUrlRef.current = null;
    setLogo(null);
  };

  const selectCertificate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowed = /\.(pdf|jpe?g|png)$/i.test(file.name);
    if (!allowed) {
      notify("사업자등록증은 PDF, JPG, PNG 파일만 첨부할 수 있습니다.");
      return;
    }
    setCertificateName(file.name);
  };

  const allTermsChecked = terms.every((term) => agreed[term.key]);

  const toggleAllTerms = (checked: boolean) => {
    setAgreed({ service: checked, privacy: checked, supplierPolicy: checked, marketing: checked });
  };

  const fillMock = () => {
    setForm(MOCK_NEW_SELLER_FORM);
    setSameRepresentative(true);
    setLoginIdChecked(true);
    setBusinessChecked(true);
    setCertificateName(MOCK_CERTIFICATE_FILE_NAME);
    setAgreed({ service: true, privacy: true, supplierPolicy: true, marketing: false });
    setCheckErrors({});
  };

  const submitForm = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!isComplete) {
      const first = FIELD_ORDER.find((key) => errors[key]);
      if (first) {
        const target = document.getElementById(fieldId(first));
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        target?.focus({ preventScroll: true });
      }
      return;
    }
    onStageChange("confirm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitApplication = () => {
    setConfirmOpen(false);
    onStageChange("done");
    notify("판매점 가입신청이 접수되었습니다.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeTerm = terms.find((term) => term.key === openTerm) ?? null;
  const fullAddress = [form.address, form.addressDetail].filter(Boolean).join(" ");

  if (stage === "done") {
    return (
      <section className="seller-apply-panel seller-entry-panel" aria-labelledby="seller-new-done-title">
        <header className="seller-apply-panel-head">
          <span>STEP 4 · 신청완료 (Preview)</span>
          <h2 id="seller-new-done-title" ref={headingRef} tabIndex={-1}>
            가입신청이 완료되었습니다.
          </h2>
          <p>{supplier.name}에 판매점 가입신청이 정상적으로 접수되었습니다.</p>
        </header>

        <div className="seller-new-relation" aria-label="판매점 계정과 공급여행사 가입관계">
          <div className="seller-new-relation-row">
            <span className="seller-entry-logo" aria-hidden="true">
              {logo ? <img src={logo.url} alt="" /> : form.sellerName.slice(0, 1)}
            </span>
            <div>
              <small>판매점</small>
              <strong>{form.sellerName}</strong>
            </div>
            <span className="seller-entry-badge is-info">판매점 계정 생성</span>
          </div>
          <div className="seller-new-relation-row">
            <span className="seller-entry-logo is-supplier" aria-hidden="true">
              {supplier.logoText}
            </span>
            <div>
              <small>가입 공급여행사</small>
              <strong>{supplier.name}</strong>
            </div>
            <span className="seller-entry-badge is-warn">승인대기</span>
          </div>
        </div>

        <ul className="seller-new-done-notes">
          <li>공급여행사 승인 후 판매 가능한 상품을 확인할 수 있습니다.</li>
          <li>판매점 계정 생성과 {supplier.name} 가입 승인은 별개입니다. 승인 전까지는 상품을 판매할 수 없습니다.</li>
          <li>판매점코드는 가입 처리 후 발급됩니다.</li>
        </ul>

        <div className="seller-entry-actions">
          <button
            type="button"
            className="button ghost dark"
            onClick={() => notify("로그인 화면은 이후 단계에서 연결합니다.")}
          >
            로그인 화면으로
          </button>
        </div>
      </section>
    );
  }

  if (stage === "confirm") {
    return (
      <section className="seller-apply-panel seller-entry-panel" aria-labelledby="seller-new-confirm-title">
        <header className="seller-apply-panel-head">
          <span>STEP 3 · 신청확인</span>
          <h2 id="seller-new-confirm-title" ref={headingRef} tabIndex={-1}>
            가입신청 정보 확인
          </h2>
          <p>입력한 정보를 확인한 후 {supplier.name}에 판매점 가입을 신청해주세요.</p>
        </header>

        <div className="seller-new-target" aria-labelledby="seller-new-target-title">
          <h3 id="seller-new-target-title">가입 신청 대상</h3>
          <div>
            <span className="seller-entry-logo is-supplier" aria-hidden="true">
              {supplier.logoText}
            </span>
            <strong>{supplier.name}</strong>
            <span className="seller-entry-badge is-info">{supplier.typeLabel}</span>
          </div>
          <p>판매점 계정 생성과 함께 {supplier.name}에 판매점 가입신청이 접수됩니다.</p>
        </div>

        <div className="seller-new-review">
          <section aria-labelledby="seller-new-review-account">
            <h3 id="seller-new-review-account">계정정보</h3>
            <dl>
              <div>
                <dt>아이디</dt>
                <dd>{form.loginId}</dd>
              </div>
              <div>
                <dt>비밀번호</dt>
                <dd aria-label="비밀번호 숨김">••••••••</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="seller-new-review-seller">
            <h3 id="seller-new-review-seller">판매점 정보</h3>
            <dl>
              <div>
                <dt>판매점 로고</dt>
                <dd>
                  {logo ? (
                    <img className="seller-new-review-logo" src={logo.url} alt={`${form.sellerName} 로고`} />
                  ) : (
                    <span className="seller-new-muted">등록 안 함</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>판매점명</dt>
                <dd>{form.sellerName}</dd>
              </div>
              <div>
                <dt>대표자</dt>
                <dd>{form.representative}</dd>
              </div>
              <div>
                <dt>대표전화</dt>
                <dd>{form.phone}</dd>
              </div>
              <div>
                <dt>이메일</dt>
                <dd>{form.email}</dd>
              </div>
              <div>
                <dt>홈페이지</dt>
                <dd>{form.homepage || <span className="seller-new-muted">입력 안 함</span>}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="seller-new-review-business">
            <h3 id="seller-new-review-business">사업자정보</h3>
            <dl>
              <div>
                <dt>사업자 구분</dt>
                <dd>{form.businessType}</dd>
              </div>
              <div>
                <dt>사업자등록번호</dt>
                <dd>{form.businessNumber}</dd>
              </div>
              <div>
                <dt>상호명</dt>
                <dd>{form.companyName}</dd>
              </div>
              <div>
                <dt>대표자</dt>
                <dd>{businessRepresentative}</dd>
              </div>
              <div>
                <dt>사업장 주소</dt>
                <dd>
                  ({form.zipCode}) {fullAddress}
                </dd>
              </div>
              <div>
                <dt>사업자등록증</dt>
                <dd>
                  {certificateName} <span className="seller-entry-badge is-success">첨부완료</span>
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="seller-new-review-manager">
            <h3 id="seller-new-review-manager">담당자정보</h3>
            <dl>
              <div>
                <dt>담당자명</dt>
                <dd>{form.managerName}</dd>
              </div>
              <div>
                <dt>휴대전화</dt>
                <dd>{form.managerPhone}</dd>
              </div>
              <div>
                <dt>이메일</dt>
                <dd>{form.managerEmail}</dd>
              </div>
              <div>
                <dt>부서</dt>
                <dd>{form.department || <span className="seller-new-muted">입력 안 함</span>}</dd>
              </div>
              <div>
                <dt>직책</dt>
                <dd>{form.position || <span className="seller-new-muted">입력 안 함</span>}</dd>
              </div>
            </dl>
          </section>
        </div>

        <p className="seller-new-code-note">판매점코드는 가입신청 완료 후 자동 발급됩니다.</p>

        <div className="seller-apply-actions">
          <button type="button" className="button ghost dark" onClick={() => onStageChange("form")}>
            정보 수정
          </button>
          <button type="button" className="button primary" onClick={() => setConfirmOpen(true)}>
            가입신청
          </button>
        </div>

        {confirmOpen ? (
          <Dialog titleId="seller-new-confirm-dialog-title" onClose={() => setConfirmOpen(false)}>
            <h3 id="seller-new-confirm-dialog-title">판매점 가입을 신청하시겠습니까?</h3>
            <p className="seller-new-dialog-lead">AOS 판매점 계정을 생성하고 {supplier.name}에 판매점 가입을 신청합니다.</p>
            <p>공급여행사의 승인 후 상품 판매가 가능합니다.</p>
            <div>
              <button type="button" className="button ghost dark compact" onClick={() => setConfirmOpen(false)}>
                취소
              </button>
              <button type="button" className="button primary compact" onClick={submitApplication}>
                가입신청
              </button>
            </div>
          </Dialog>
        ) : null}
      </section>
    );
  }

  return (
    <section className="seller-apply-panel seller-entry-panel" aria-labelledby="seller-new-form-title">
      <header className="seller-apply-panel-head">
        <span>STEP 2 · 판매점정보</span>
        <h2 id="seller-new-form-title" ref={headingRef} tabIndex={-1}>
          판매점 정보 등록
        </h2>
        <p>AOS 판매점 계정을 만들고 {supplier.name}에 판매점 가입을 신청합니다.</p>
      </header>

      <p className="seller-new-info" role="note">
        판매점 계정은 최초 1회만 생성합니다. 계정 생성 후 동일한 판매점 계정으로 다른 공급여행사에도 추가 가입할 수
        있습니다.
      </p>

      <fieldset className="seller-entry-mock seller-new-mock">
        <legend>프로토타입 Mock 설정</legend>
        <p>
          UI 테스트용 입력값(그래가자)을 한 번에 채웁니다.{" "}
          <button type="button" className="seller-entry-link" onClick={fillMock}>
            테스트 데이터 입력
          </button>
        </p>
      </fieldset>

      <form onSubmit={submitForm} noValidate>
        <section className="seller-apply-section" aria-labelledby="seller-new-sec-account">
          <div className="seller-apply-section-head">
            <h3 id="seller-new-sec-account">계정정보</h3>
            <p>AOS 판매점 관리자 로그인에 사용할 정보를 입력해주세요.</p>
          </div>
          <div className="seller-apply-fields">
            <div className={invalidClass("loginId", "full seller-field-with-action")}>
              <Label htmlFor={fieldId("loginId")} text="아이디" required />
              <div className="seller-inline-action">
                <input
                  id={fieldId("loginId")}
                  value={form.loginId}
                  onChange={(event) => {
                    update("loginId", event.target.value);
                    setLoginIdChecked(false);
                  }}
                  autoComplete="username"
                  placeholder="사용할 아이디를 입력해주세요."
                  aria-invalid={Boolean(errorFor("loginId"))}
                  aria-describedby={describedBy("loginId")}
                />
                <button type="button" className="button ghost dark compact" onClick={checkLoginId}>
                  중복확인
                </button>
              </div>
              {loginIdChecked && !errorFor("loginId") ? (
                <small className="seller-field-info seller-new-ok" role="status">
                  사용 가능한 아이디입니다. (Mock)
                </small>
              ) : null}
              <FieldError id={fieldId("loginId")} message={errorFor("loginId")} />
            </div>
            <label className={invalidClass("password")}>
              <Label htmlFor={fieldId("password")} text="비밀번호" required />
              <input
                id={fieldId("password")}
                type="password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                autoComplete="new-password"
                placeholder="비밀번호를 입력해주세요."
                aria-invalid={Boolean(errorFor("password"))}
                aria-describedby={describedBy("password")}
              />
              <FieldError id={fieldId("password")} message={errorFor("password")} />
            </label>
            <label className={invalidClass("passwordConfirm")}>
              <Label htmlFor={fieldId("passwordConfirm")} text="비밀번호 확인" required />
              <input
                id={fieldId("passwordConfirm")}
                type="password"
                value={form.passwordConfirm}
                onChange={(event) => update("passwordConfirm", event.target.value)}
                autoComplete="new-password"
                placeholder="비밀번호를 다시 입력해주세요."
                aria-invalid={Boolean(errorFor("passwordConfirm"))}
                aria-describedby={describedBy("passwordConfirm")}
              />
              <FieldError id={fieldId("passwordConfirm")} message={errorFor("passwordConfirm")} />
            </label>
            <p className="seller-apply-secure-note full">판매점코드는 가입신청 완료 후 자동 발급됩니다.</p>
          </div>
        </section>

        <section className="seller-apply-section" aria-labelledby="seller-new-sec-seller">
          <div className="seller-apply-section-head">
            <h3 id="seller-new-sec-seller">판매점 기본정보</h3>
            <p>고객에게 표시되고 공급여행사가 판매점을 확인할 때 사용하는 정보입니다.</p>
          </div>
          <div className="seller-apply-fields">
            <label className={invalidClass("sellerName")}>
              <Label htmlFor={fieldId("sellerName")} text="판매점명" required />
              <input
                id={fieldId("sellerName")}
                value={form.sellerName}
                onChange={(event) => update("sellerName", event.target.value)}
                placeholder="예) 그래가자"
                aria-invalid={Boolean(errorFor("sellerName"))}
                aria-describedby={describedBy("sellerName")}
              />
              <FieldError id={fieldId("sellerName")} message={errorFor("sellerName")} />
            </label>
            <label className={invalidClass("representative")}>
              <Label htmlFor={fieldId("representative")} text="대표자명" required />
              <input
                id={fieldId("representative")}
                value={form.representative}
                onChange={(event) => update("representative", event.target.value)}
                placeholder="대표자명을 입력해주세요."
                aria-invalid={Boolean(errorFor("representative"))}
                aria-describedby={describedBy("representative")}
              />
              <FieldError id={fieldId("representative")} message={errorFor("representative")} />
            </label>
            <label className={invalidClass("phone")}>
              <Label htmlFor={fieldId("phone")} text="대표 전화번호" required />
              <input
                id={fieldId("phone")}
                type="tel"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                placeholder="예) 02-1234-5678"
                aria-invalid={Boolean(errorFor("phone"))}
                aria-describedby={describedBy("phone")}
              />
              <FieldError id={fieldId("phone")} message={errorFor("phone")} />
            </label>
            <label className={invalidClass("email")}>
              <Label htmlFor={fieldId("email")} text="이메일" required />
              <input
                id={fieldId("email")}
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="예) seller@example.com"
                aria-invalid={Boolean(errorFor("email"))}
                aria-describedby={describedBy("email")}
              />
              <FieldError id={fieldId("email")} message={errorFor("email")} />
            </label>
            <label className="full">
              <Label htmlFor={fieldId("homepage")} text="홈페이지 (선택)" />
              <input
                id={fieldId("homepage")}
                value={form.homepage}
                onChange={(event) => update("homepage", event.target.value)}
                placeholder="홈페이지 주소가 있는 경우 입력"
              />
            </label>
            <div className="full seller-file-slot seller-new-logo-slot">
              <div className="seller-file-slot-head">
                <Label text="판매점 로고 (선택)" />
                <button
                  type="button"
                  className="button ghost dark compact"
                  onClick={() => logoInputRef.current?.click()}
                >
                  파일선택
                </button>
              </div>
              <input
                ref={logoInputRef}
                className="seller-file-input-hidden"
                type="file"
                accept="image/jpeg,image/png"
                tabIndex={-1}
                aria-hidden="true"
                onChange={selectLogo}
              />
              <div className="seller-new-logo-body">
                <span className="seller-new-logo-preview">
                  {logo ? <img src={logo.url} alt="판매점 로고 미리보기" /> : <span aria-hidden="true">LOGO</span>}
                </span>
                <div className="seller-file-meta">
                  <strong>{logo ? logo.name : "등록된 로고가 없습니다."}</strong>
                  <span>JPG, PNG / 권장 300 × 300px · 화면 미리보기만 제공되며 서버에 업로드되지 않습니다.</span>
                  {logo ? (
                    <button type="button" className="seller-entry-link seller-new-remove" onClick={removeLogo}>
                      로고 삭제
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="seller-apply-section" aria-labelledby="seller-new-sec-business">
          <div className="seller-apply-section-head">
            <h3 id="seller-new-sec-business">사업자정보</h3>
            <p>사업자등록증과 동일한 정보로 입력해주세요.</p>
          </div>
          <div className="seller-apply-fields">
            <fieldset className={invalidClass("businessType", "full seller-new-radio-group")}>
              <legend className="seller-field-label">
                <span>
                  사업자 구분<em aria-label="필수">*</em>
                </span>
              </legend>
              <div className="seller-new-radios">
                {BUSINESS_TYPES.map((type, index) => (
                  <label key={type} className={form.businessType === type ? "is-selected" : undefined}>
                    <input
                      id={index === 0 ? fieldId("businessType") : undefined}
                      type="radio"
                      name="seller-new-business-type"
                      checked={form.businessType === type}
                      onChange={() => update("businessType", type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
              <FieldError id={fieldId("businessType")} message={errorFor("businessType")} />
            </fieldset>
            <div className={invalidClass("businessNumber", "seller-field-with-action")}>
              <Label htmlFor={fieldId("businessNumber")} text="사업자등록번호" required />
              <div className="seller-inline-action">
                <input
                  id={fieldId("businessNumber")}
                  inputMode="numeric"
                  value={form.businessNumber}
                  onChange={(event) => {
                    update("businessNumber", formatBusinessNumber(event.target.value));
                    setBusinessChecked(false);
                  }}
                  placeholder="예) 123-45-67890"
                  aria-invalid={Boolean(errorFor("businessNumber"))}
                  aria-describedby={describedBy("businessNumber")}
                />
                <button type="button" className="button ghost dark compact" onClick={checkBusinessNumber}>
                  확인
                </button>
              </div>
              {businessChecked && !errorFor("businessNumber") ? (
                <small className="seller-field-info seller-new-ok" role="status">
                  사업자등록번호 형식이 확인되었습니다. (Mock)
                </small>
              ) : null}
              <FieldError id={fieldId("businessNumber")} message={errorFor("businessNumber")} />
            </div>
            <label className={invalidClass("companyName")}>
              <Label htmlFor={fieldId("companyName")} text="상호명" required />
              <input
                id={fieldId("companyName")}
                value={form.companyName}
                onChange={(event) => update("companyName", event.target.value)}
                placeholder="사업자등록증의 상호명"
                aria-invalid={Boolean(errorFor("companyName"))}
                aria-describedby={describedBy("companyName")}
              />
              <FieldError id={fieldId("companyName")} message={errorFor("companyName")} />
            </label>
            <div className={invalidClass("businessRepresentative", "full seller-field-with-action")}>
              <Label htmlFor={fieldId("businessRepresentative")} text="대표자명" required />
              <div className="seller-new-rep-row">
                <input
                  id={fieldId("businessRepresentative")}
                  value={businessRepresentative}
                  readOnly={sameRepresentative}
                  onChange={(event) => update("businessRepresentative", event.target.value)}
                  placeholder="사업자등록증의 대표자명"
                  aria-invalid={Boolean(errorFor("businessRepresentative"))}
                  aria-describedby={describedBy("businessRepresentative")}
                />
                <label className="seller-check-inline">
                  <input
                    type="checkbox"
                    checked={sameRepresentative}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSameRepresentative(checked);
                      if (!checked) update("businessRepresentative", form.representative);
                    }}
                  />
                  판매점 대표자와 동일
                </label>
              </div>
              <FieldError id={fieldId("businessRepresentative")} message={errorFor("businessRepresentative")} />
            </div>
            <div className={invalidClass("address", "full seller-field-with-action")}>
              <Label htmlFor={fieldId("address")} text="사업장 주소" required />
              <div className="seller-new-address">
                <input value={form.zipCode} readOnly placeholder="우편번호" aria-label="우편번호" />
                <button type="button" className="button ghost dark compact" onClick={() => setAddressOpen(true)}>
                  주소검색
                </button>
                <input
                  id={fieldId("address")}
                  className="seller-new-address-main"
                  value={form.address}
                  readOnly
                  placeholder="주소검색으로 기본주소를 선택해주세요."
                  aria-label="기본주소"
                  aria-invalid={Boolean(errorFor("address"))}
                  aria-describedby={describedBy("address")}
                />
                <input
                  className="seller-new-address-main"
                  value={form.addressDetail}
                  onChange={(event) => update("addressDetail", event.target.value)}
                  placeholder="상세주소를 입력해주세요."
                  aria-label="상세주소"
                />
              </div>
              <FieldError id={fieldId("address")} message={errorFor("address")} />
            </div>
            <div className={`full seller-file-slot${errorFor("certificate") ? " is-invalid" : ""}`}>
              <div className="seller-file-slot-head">
                <Label text="사업자등록증" required />
                <button
                  id={fieldId("certificate")}
                  type="button"
                  aria-describedby={describedBy("certificate")}
                  className="button ghost dark compact"
                  onClick={() => certificateInputRef.current?.click()}
                >
                  사업자등록증 첨부
                </button>
              </div>
              <input
                ref={certificateInputRef}
                className="seller-file-input-hidden"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                tabIndex={-1}
                aria-hidden="true"
                onChange={selectCertificate}
              />
              {certificateName ? (
                <ul className="seller-file-list">
                  <li>
                    <div className="seller-file-meta">
                      <strong>{certificateName}</strong>
                      <span>Mock 첨부 · 서버에 업로드되지 않습니다.</span>
                    </div>
                    <span className="seller-new-file-actions">
                      <span className="seller-entry-badge is-success">첨부완료</span>
                      <button type="button" className="seller-entry-link" onClick={() => setCertificateName("")}>
                        삭제
                      </button>
                    </span>
                  </li>
                </ul>
              ) : (
                <p className="seller-file-empty">PDF, JPG, PNG 파일을 첨부해주세요.</p>
              )}
              <FieldError id={fieldId("certificate")} message={errorFor("certificate")} />
            </div>
          </div>
        </section>

        <section className="seller-apply-section" aria-labelledby="seller-new-sec-manager">
          <div className="seller-apply-section-head">
            <h3 id="seller-new-sec-manager">담당자정보</h3>
            <p>예약, 상품, 정산 등 공급여행사와 업무 연락을 담당할 담당자 정보를 입력해주세요.</p>
          </div>
          <div className="seller-apply-fields">
            <label className={invalidClass("managerName")}>
              <Label htmlFor={fieldId("managerName")} text="담당자명" required />
              <input
                id={fieldId("managerName")}
                value={form.managerName}
                onChange={(event) => update("managerName", event.target.value)}
                placeholder="담당자명을 입력해주세요."
                aria-invalid={Boolean(errorFor("managerName"))}
                aria-describedby={describedBy("managerName")}
              />
              <FieldError id={fieldId("managerName")} message={errorFor("managerName")} />
            </label>
            <label className={invalidClass("managerPhone")}>
              <Label htmlFor={fieldId("managerPhone")} text="휴대전화" required />
              <input
                id={fieldId("managerPhone")}
                type="tel"
                value={form.managerPhone}
                onChange={(event) => update("managerPhone", event.target.value)}
                placeholder="예) 010-1234-5678"
                aria-invalid={Boolean(errorFor("managerPhone"))}
                aria-describedby={describedBy("managerPhone")}
              />
              <FieldError id={fieldId("managerPhone")} message={errorFor("managerPhone")} />
            </label>
            <label className={invalidClass("managerEmail", "full")}>
              <Label htmlFor={fieldId("managerEmail")} text="이메일" required />
              <input
                id={fieldId("managerEmail")}
                type="email"
                value={form.managerEmail}
                onChange={(event) => update("managerEmail", event.target.value)}
                placeholder="예) sales@example.com"
                aria-invalid={Boolean(errorFor("managerEmail"))}
                aria-describedby={describedBy("managerEmail")}
              />
              <FieldError id={fieldId("managerEmail")} message={errorFor("managerEmail")} />
            </label>
            <label>
              <Label htmlFor={fieldId("department")} text="부서 (선택)" />
              <input
                id={fieldId("department")}
                value={form.department}
                onChange={(event) => update("department", event.target.value)}
                placeholder="예) 영업팀"
              />
            </label>
            <label>
              <Label htmlFor={fieldId("position")} text="직책 (선택)" />
              <input
                id={fieldId("position")}
                value={form.position}
                onChange={(event) => update("position", event.target.value)}
                placeholder="예) 팀장"
              />
            </label>
          </div>
        </section>

        <section className="seller-apply-section" aria-labelledby="seller-new-sec-terms">
          <div className="seller-apply-section-head">
            <h3 id="seller-new-sec-terms">약관동의</h3>
            <p>{supplier.name} 판매점 운영정책은 AOS 이용약관과 별도로 동의가 필요합니다.</p>
          </div>
          <fieldset className={`seller-apply-check-group${errorFor("terms") ? " is-invalid" : ""}`}>
            <legend>약관 동의</legend>
            <label className="check seller-agree-all">
              <input
                id={fieldId("terms")}
                type="checkbox"
                aria-describedby={describedBy("terms")}
                checked={allTermsChecked}
                onChange={(event) => toggleAllTerms(event.target.checked)}
              />
              전체 동의
            </label>
            {terms.map((term) => (
              <div className="seller-term-row" key={term.key}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={agreed[term.key]}
                    onChange={(event) => setAgreed((prev) => ({ ...prev, [term.key]: event.target.checked }))}
                  />
                  <span>
                    <b className={term.required ? "seller-new-term-required" : "seller-new-term-optional"}>
                      [{term.required ? "필수" : "선택"}]
                    </b>{" "}
                    {term.title}
                  </span>
                </label>
                <button type="button" className="seller-term-view" onClick={() => setOpenTerm(term.key)}>
                  보기
                </button>
              </div>
            ))}
          </fieldset>
          <FieldError id={fieldId("terms")} message={errorFor("terms")} />
        </section>

        <div className="seller-apply-actions">
          <button type="button" className="button ghost dark" onClick={onBack}>
            이전
          </button>
          <button
            type="submit"
            className={`button primary${isComplete ? "" : " seller-new-submit-pending"}`}
            aria-disabled={!isComplete}
          >
            입력내용 확인
          </button>
        </div>
        {!isComplete ? (
          <p className="seller-new-submit-hint">필수항목과 필수약관을 모두 완료하면 버튼이 활성화됩니다.</p>
        ) : null}
      </form>

      {addressOpen ? (
        <Dialog titleId="seller-new-address-title" onClose={() => setAddressOpen(false)}>
          <h3 id="seller-new-address-title">주소검색 (Mock)</h3>
          <p>실제 주소검색 API는 연결되지 않습니다. 테스트 주소를 선택해주세요.</p>
          <ul className="seller-new-address-list">
            {MOCK_ADDRESS_RESULTS.map((item) => (
              <li key={item.zipCode}>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, zipCode: item.zipCode, address: item.address }));
                    setAddressOpen(false);
                  }}
                >
                  <span>{item.zipCode}</span>
                  {item.address}
                </button>
              </li>
            ))}
          </ul>
          <div>
            <button type="button" className="button ghost dark compact" onClick={() => setAddressOpen(false)}>
              닫기
            </button>
          </div>
        </Dialog>
      ) : null}

      {activeTerm ? (
        <Dialog titleId="seller-new-term-title" className="seller-term-dialog" onClose={() => setOpenTerm(null)}>
          <h3 id="seller-new-term-title">
            [{activeTerm.required ? "필수" : "선택"}] {activeTerm.title}
          </h3>
          <p className="seller-term-badge">Mock 약관 · 실제 약관 전문은 이후 단계에서 연결합니다.</p>
          <p>{activeTerm.summary}</p>
          <div>
            <button type="button" className="button primary compact" onClick={() => setOpenTerm(null)}>
              확인
            </button>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}
