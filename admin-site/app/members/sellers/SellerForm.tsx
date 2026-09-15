"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, KeyRound, MapPin, Save, X } from "lucide-react";
import {
  checkSellerLoginIdAvailable,
  clearSellerTypeSpecificValues,
  createEmptySellerFormValues,
  formatBusinessNumberInput,
  formatMobilePhoneInput,
  formatOfficePhoneInput,
  hasSellerTypeSpecificInput,
  serializeSellerFormValues,
  submitSellerCreateForm,
  submitSellerUpdateForm,
  SELLER_LOGIN_CHECK_MESSAGES,
  type SellerFormErrors,
  type SellerFormFieldKey,
  type SellerFormMode,
  type SellerFormValues,
  type SellerLoginCheckStatus,
} from "@/lib/admin/members-seller-form";
import {
  SELLER_TYPE_LABELS,
  sellerApplicationStatusBadgeClass,
  sellerApprovalStatusLabel,
  sellerSalesStatusBadgeClass,
  sellerSalesStatusLabel,
  type SellerApplication,
  type SellerType,
} from "@/lib/admin/members-seller-data";

type SellerFormProps = {
  mode?: SellerFormMode;
  applicationId?: string;
  initialValues?: SellerFormValues;
  onCancel: () => void;
  onCreated?: (application: SellerApplication) => void;
  onUpdated?: (application: SellerApplication) => void;
  onSubmitSuccess?: (application: SellerApplication) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

const UNSAVED_LEAVE_MESSAGE = "저장하지 않은 변경사항이 있습니다. 페이지를 이동하시겠습니까?";

function RequiredMark() {
  return <b className="member-seller-form-required">*</b>;
}

function FieldLabel({
  children,
  required,
  optional,
}: {
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <span>
      {children}
      {required ? (
        <>
          {" "}
          <RequiredMark />
        </>
      ) : null}
      {optional && !required ? <em className="member-seller-form-optional">선택</em> : null}
    </span>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <small id={id} className="member-seller-form-error" role="alert">
      {message}
    </small>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="member-seller-form-hint">{children}</p>;
}

export function SellerForm({
  mode = "create",
  applicationId,
  initialValues,
  onCancel,
  onCreated,
  onUpdated,
  onSubmitSuccess,
  onDirtyChange,
}: SellerFormProps) {
  const isEdit = mode === "edit";
  const formId = useId();
  const [values, setValues] = useState<SellerFormValues>(
    () => initialValues ?? createEmptySellerFormValues(),
  );
  const [baseline, setBaseline] = useState(() =>
    serializeSellerFormValues(initialValues ?? createEmptySellerFormValues()),
  );
  const [errors, setErrors] = useState<SellerFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loginCheckStatus, setLoginCheckStatus] = useState<SellerLoginCheckStatus>("idle");
  const [loginCheckMessage, setLoginCheckMessage] = useState<string>("");
  const [typeChangeOpen, setTypeChangeOpen] = useState(false);
  const [pendingType, setPendingType] = useState<SellerType | null>(null);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const fieldRefs = useRef<Partial<Record<SellerFormFieldKey, HTMLElement | null>>>({});

  const isDirty = useMemo(() => serializeSellerFormValues(values) !== baseline, [values, baseline]);
  const fieldId = (key: SellerFormFieldKey | "sellerType") => `${formId}-${key}`;
  const errorId = (key: SellerFormFieldKey | "sellerType") => `${fieldId(key)}-error`;
  const salesLocked = !isEdit && values.approvalStatus !== "approved";
  const submitDisabled =
    submitting ||
    !values.sellerType ||
    (!isEdit && loginCheckStatus === "unavailable");

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const setField = <K extends SellerFormFieldKey>(key: K, value: SellerFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (key === "loginId") {
      setLoginCheckStatus("idle");
      setLoginCheckMessage("");
    }
  };

  const focusField = (key: SellerFormFieldKey) => {
    const el = fieldRefs.current[key];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof (el as HTMLInputElement).focus === "function") {
      window.setTimeout(() => (el as HTMLInputElement).focus(), 120);
    }
  };

  const applySellerType = (nextType: SellerType) => {
    setValues((prev) => ({
      ...clearSellerTypeSpecificValues(prev),
      sellerType: nextType,
    }));
    setErrors({});
    setPendingType(null);
    setTypeChangeOpen(false);
  };

  const requestSellerTypeChange = (nextType: SellerType) => {
    if (isEdit) return;
    if (values.sellerType === nextType) return;
    if (!values.sellerType) {
      setField("sellerType", nextType);
      return;
    }
    if (hasSellerTypeSpecificInput(values, values.sellerType)) {
      setPendingType(nextType);
      setTypeChangeOpen(true);
      return;
    }
    applySellerType(nextType);
  };

  const handleLoginDuplicateCheck = () => {
    const result = checkSellerLoginIdAvailable(values.loginId, applicationId);
    setLoginCheckStatus(result.status === "idle" ? "idle" : result.status);
    setLoginCheckMessage(result.message);
    if (!result.ok) {
      setErrors((prev) => ({ ...prev, loginId: result.message }));
      focusField("loginId");
      return;
    }
    setErrors((prev) => {
      if (!prev.loginId) return prev;
      const next = { ...prev };
      delete next.loginId;
      return next;
    });
  };

  const fillSampleAddress = (scope: "business" | "individual") => {
    if (scope === "business") {
      setValues((prev) => ({
        ...prev,
        businessZipCode: "06236",
        businessAddress: "서울특별시 강남구 테헤란로 100",
        businessAddressDetail: "AOS빌딩 8층",
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.businessZipCode;
        delete next.businessAddress;
        delete next.businessAddressDetail;
        return next;
      });
      return;
    }
    setValues((prev) => ({
      ...prev,
      individualZipCode: "03920",
      individualAddress: "서울특별시 마포구 월드컵북로 10",
      individualAddressDetail: "101동 1203호",
    }));
  };

  const requestCancel = () => {
    if (isDirty && !window.confirm(UNSAVED_LEAVE_MESSAGE)) return;
    onCancel();
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitDisabled) return;

    if (mode === "create") {
      if (loginCheckStatus === "idle") {
        setErrors((prev) => ({ ...prev, loginId: SELLER_LOGIN_CHECK_MESSAGES.needCheck }));
        setLoginCheckMessage(SELLER_LOGIN_CHECK_MESSAGES.needCheck);
        focusField("loginId");
        return;
      }
      if (loginCheckStatus === "unavailable") {
        setErrors((prev) => ({ ...prev, loginId: SELLER_LOGIN_CHECK_MESSAGES.unavailable }));
        focusField("loginId");
        return;
      }

      setSubmitting(true);
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      const result = submitSellerCreateForm(values);
      if (!result.ok) {
        setSubmitting(false);
        if (result.errors) setErrors(result.errors);
        if (result.firstErrorField) focusField(result.firstErrorField);
        if (result.message) act(result.message);
        if (result.errors?.loginId?.includes("사용 중")) {
          setLoginCheckStatus("unavailable");
          setLoginCheckMessage(SELLER_LOGIN_CHECK_MESSAGES.unavailable);
        }
        return;
      }
      setBaseline(serializeSellerFormValues(values));
      onCreated?.(result.application);
      onSubmitSuccess?.(result.application);
      return;
    }

    if (!applicationId) {
      act("판매점 ID가 없습니다.");
      return;
    }

    setSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    const result = submitSellerUpdateForm(applicationId, values);
    if (!result.ok) {
      setSubmitting(false);
      if (result.errors) setErrors(result.errors);
      if (result.firstErrorField) focusField(result.firstErrorField);
      if (result.message) act(result.message);
      return;
    }
    setBaseline(serializeSellerFormValues(values));
    onUpdated?.(result.application);
    onSubmitSuccess?.(result.application);
  };

  const confirmPasswordReset = () => {
    setPasswordResetOpen(false);
    act("비밀번호 초기화 요청을 접수했습니다. (Mock)");
  };

  const sellerTypeLabel =
    values.sellerType === "business" || values.sellerType === "individual"
      ? SELLER_TYPE_LABELS[values.sellerType]
      : "-";

  return (
    <>
      <form id={formId} className="member-seller-form" onSubmit={handleSubmit} noValidate>
        <div className="member-web-edit-stack">
          <section className="panel member-web-detail-card">
            <div className="member-web-detail-card-head">
              <strong>판매점 유형</strong>
            </div>
            <div className="member-web-edit-form-body">
              {isEdit ? (
                <div className="member-seller-type-readonly">
                  <FieldLabel>판매점 유형</FieldLabel>
                  <div className="member-seller-type-readonly-row">
                    <span className={`badge ${values.sellerType === "business" ? "info" : "gray"}`}>
                      {sellerTypeLabel}
                    </span>
                  </div>
                  <Hint>판매점 유형은 일반 정보수정에서 변경할 수 없습니다.</Hint>
                </div>
              ) : (
                <div
                  className={`member-seller-type-group${errors.sellerType ? " is-invalid" : ""}`}
                  ref={(el) => {
                    fieldRefs.current.sellerType = el;
                  }}
                >
                  <FieldLabel required>판매점 유형</FieldLabel>
                  <div className="member-seller-type-options" role="radiogroup" aria-label="판매점 유형">
                    <label
                      className={`member-seller-type-card${values.sellerType === "business" ? " selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`${formId}-seller-type`}
                        checked={values.sellerType === "business"}
                        onChange={() => requestSellerTypeChange("business")}
                      />
                      <span className="member-seller-type-radio" aria-hidden />
                      <span>
                        <strong>사업자 판매점</strong>
                        <small>사업자등록번호를 보유한 사업자가 판매점으로 등록됩니다.</small>
                      </span>
                    </label>
                    <label
                      className={`member-seller-type-card${values.sellerType === "individual" ? " selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`${formId}-seller-type`}
                        checked={values.sellerType === "individual"}
                        onChange={() => requestSellerTypeChange("individual")}
                      />
                      <span className="member-seller-type-radio" aria-hidden />
                      <span>
                        <strong>개인 판매점</strong>
                        <small>사업자등록 없이 개인 자격으로 판매점에 등록됩니다.</small>
                      </span>
                    </label>
                  </div>
                  <FieldError message={errors.sellerType} />
                </div>
              )}
            </div>
          </section>

          {values.sellerType === "business" ? (
            <>
              <section className="panel member-web-detail-card">
                <div className="member-web-detail-card-head">
                  <strong>사업자 정보</strong>
                </div>
                <div className="member-web-edit-form-body">
                  <div className="member-web-edit-form-grid">
                    <label
                      className={`member-web-edit-field member-web-edit-field--span-2${errors.businessName ? " is-invalid" : ""}`}
                    >
                      <FieldLabel required>상호명</FieldLabel>
                      <input
                        ref={(el) => {
                          fieldRefs.current.businessName = el;
                        }}
                        value={values.businessName}
                        onChange={(e) => setField("businessName", e.target.value)}
                        placeholder="사업자등록증의 상호명을 입력하세요"
                      />
                      <FieldError message={errors.businessName} />
                    </label>
                    <label className={`member-web-edit-field${errors.businessNumber ? " is-invalid" : ""}`}>
                      <FieldLabel required>사업자등록번호</FieldLabel>
                      <input
                        ref={(el) => {
                          fieldRefs.current.businessNumber = el;
                        }}
                        value={values.businessNumber}
                        onChange={(e) => setField("businessNumber", formatBusinessNumberInput(e.target.value))}
                        placeholder="123-45-67890"
                        inputMode="numeric"
                      />
                      <FieldError message={errors.businessNumber} />
                    </label>
                    <label className={`member-web-edit-field${errors.businessKind ? " is-invalid" : ""}`}>
                      <FieldLabel required>사업자 구분</FieldLabel>
                      <select
                        ref={(el) => {
                          fieldRefs.current.businessKind = el;
                        }}
                        value={values.businessKind}
                        onChange={(e) =>
                          setField("businessKind", e.target.value as SellerFormValues["businessKind"])
                        }
                      >
                        <option value="">선택</option>
                        <option value="개인사업자">개인사업자</option>
                        <option value="법인사업자">법인사업자</option>
                      </select>
                      <FieldError message={errors.businessKind} />
                    </label>
                    <label className={`member-web-edit-field${errors.representativeName ? " is-invalid" : ""}`}>
                      <FieldLabel required>대표자명</FieldLabel>
                      <input
                        ref={(el) => {
                          fieldRefs.current.representativeName = el;
                        }}
                        value={values.representativeName}
                        onChange={(e) => setField("representativeName", e.target.value)}
                        placeholder="대표자명"
                      />
                      <FieldError message={errors.representativeName} />
                    </label>
                    <div
                      className={`member-web-edit-field member-web-edit-field--span-3${errors.businessAddress ? " is-invalid" : ""}`}
                    >
                      <FieldLabel required>사업장 주소</FieldLabel>
                      <div className="member-seller-address-grid">
                        <input
                          ref={(el) => {
                            fieldRefs.current.businessZipCode = el;
                          }}
                          value={values.businessZipCode}
                          onChange={(e) =>
                            setField("businessZipCode", e.target.value.replace(/\D/g, "").slice(0, 5))
                          }
                          placeholder="우편번호"
                          inputMode="numeric"
                        />
                        <div className="address-input">
                          <input
                            ref={(el) => {
                              fieldRefs.current.businessAddress = el;
                            }}
                            value={values.businessAddress}
                            onChange={(e) => setField("businessAddress", e.target.value)}
                            placeholder="기본주소"
                          />
                          <button type="button" className="secondary" onClick={() => fillSampleAddress("business")}>
                            <MapPin size={13} />
                            주소검색
                          </button>
                        </div>
                        <input
                          ref={(el) => {
                            fieldRefs.current.businessAddressDetail = el;
                          }}
                          value={values.businessAddressDetail}
                          onChange={(e) => setField("businessAddressDetail", e.target.value)}
                          placeholder="상세주소"
                        />
                      </div>
                      <FieldError message={errors.businessAddress} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel member-web-detail-card">
                <div className="member-web-detail-card-head">
                  <strong>담당자 정보</strong>
                </div>
                <div className="member-web-edit-form-body">
                  <div className="member-web-edit-form-grid">
                    <label className={`member-web-edit-field${errors.managerName ? " is-invalid" : ""}`}>
                      <FieldLabel required>담당자명</FieldLabel>
                      <input
                        ref={(el) => {
                          fieldRefs.current.managerName = el;
                        }}
                        value={values.managerName}
                        onChange={(e) => setField("managerName", e.target.value)}
                        placeholder="담당자명"
                      />
                      <FieldError message={errors.managerName} />
                    </label>
                    <label className={`member-web-edit-field${errors.managerMobile ? " is-invalid" : ""}`}>
                      <FieldLabel required>휴대전화</FieldLabel>
                      <input
                        ref={(el) => {
                          fieldRefs.current.managerMobile = el;
                        }}
                        value={values.managerMobile}
                        onChange={(e) => setField("managerMobile", formatMobilePhoneInput(e.target.value))}
                        placeholder="010-1234-5678"
                        inputMode="tel"
                      />
                      <FieldError message={errors.managerMobile} />
                    </label>
                    <label className={`member-web-edit-field${errors.managerPhone ? " is-invalid" : ""}`}>
                      <FieldLabel optional>일반전화</FieldLabel>
                      <input
                        id={fieldId("managerPhone")}
                        ref={(el) => {
                          fieldRefs.current.managerPhone = el;
                        }}
                        value={values.managerPhone}
                        onChange={(e) => setField("managerPhone", formatOfficePhoneInput(e.target.value))}
                        placeholder="02-1234-5678"
                        inputMode="tel"
                        aria-invalid={Boolean(errors.managerPhone)}
                        aria-describedby={errors.managerPhone ? errorId("managerPhone") : undefined}
                      />
                      <FieldError id={errorId("managerPhone")} message={errors.managerPhone} />
                    </label>
                    <label className={`member-web-edit-field${errors.managerEmail ? " is-invalid" : ""}`}>
                      <FieldLabel required>이메일</FieldLabel>
                      <input
                        ref={(el) => {
                          fieldRefs.current.managerEmail = el;
                        }}
                        type="email"
                        value={values.managerEmail}
                        onChange={(e) => setField("managerEmail", e.target.value)}
                        placeholder="name@example.com"
                      />
                      <FieldError message={errors.managerEmail} />
                    </label>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {values.sellerType === "individual" ? (
            <section className="panel member-web-detail-card">
              <div className="member-web-detail-card-head">
                <strong>신청자 정보</strong>
              </div>
              <div className="member-web-edit-form-body">
                <div className="member-web-edit-form-grid">
                  <label className={`member-web-edit-field${errors.individualName ? " is-invalid" : ""}`}>
                    <FieldLabel required>이름</FieldLabel>
                    <input
                      ref={(el) => {
                        fieldRefs.current.individualName = el;
                      }}
                      value={values.individualName}
                      onChange={(e) => setField("individualName", e.target.value)}
                      placeholder="이름"
                    />
                    <FieldError message={errors.individualName} />
                  </label>
                  <label className={`member-web-edit-field${errors.individualMobile ? " is-invalid" : ""}`}>
                    <FieldLabel required>휴대전화</FieldLabel>
                    <input
                      ref={(el) => {
                        fieldRefs.current.individualMobile = el;
                      }}
                      value={values.individualMobile}
                      onChange={(e) => setField("individualMobile", formatMobilePhoneInput(e.target.value))}
                      placeholder="010-1234-5678"
                      inputMode="tel"
                    />
                    <FieldError message={errors.individualMobile} />
                  </label>
                  <label className={`member-web-edit-field${errors.individualEmail ? " is-invalid" : ""}`}>
                    <FieldLabel required>이메일</FieldLabel>
                    <input
                      ref={(el) => {
                        fieldRefs.current.individualEmail = el;
                      }}
                      type="email"
                      value={values.individualEmail}
                      onChange={(e) => setField("individualEmail", e.target.value)}
                      placeholder="name@example.com"
                    />
                    <FieldError message={errors.individualEmail} />
                  </label>
                  <div className="member-web-edit-field member-web-edit-field--span-3">
                    <FieldLabel optional>주소</FieldLabel>
                    <div className="member-seller-address-grid">
                      <input
                        ref={(el) => {
                          fieldRefs.current.individualZipCode = el;
                        }}
                        value={values.individualZipCode}
                        onChange={(e) =>
                          setField("individualZipCode", e.target.value.replace(/\D/g, "").slice(0, 5))
                        }
                        placeholder="우편번호"
                        inputMode="numeric"
                      />
                      <div className="address-input">
                        <input
                          ref={(el) => {
                            fieldRefs.current.individualAddress = el;
                          }}
                          value={values.individualAddress}
                          onChange={(e) => setField("individualAddress", e.target.value)}
                          placeholder="기본주소"
                        />
                        <button type="button" className="secondary" onClick={() => fillSampleAddress("individual")}>
                          <MapPin size={13} />
                          주소검색
                        </button>
                      </div>
                      <input
                        ref={(el) => {
                          fieldRefs.current.individualAddressDetail = el;
                        }}
                        value={values.individualAddressDetail}
                        onChange={(e) => setField("individualAddressDetail", e.target.value)}
                        placeholder="상세주소"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {values.sellerType ? (
            <>
              <section className="panel member-web-detail-card">
                <div className="member-web-detail-card-head">
                  <strong>계정 정보</strong>
                </div>
                <div className="member-web-edit-form-body">
                  {isEdit ? (
                    <div className="member-web-edit-form-grid member-web-edit-form-grid--3">
                      <div className="member-web-edit-field">
                        <FieldLabel>로그인 ID</FieldLabel>
                        <input value={values.loginId || "-"} disabled readOnly />
                        <Hint>로그인 ID 변경이 필요한 경우 별도 계정관리 기능을 이용합니다.</Hint>
                      </div>
                      <div className="member-web-edit-field member-web-edit-field--span-2">
                        <FieldLabel>비밀번호</FieldLabel>
                        <div className="member-seller-login-row">
                          <div className="member-web-edit-readonly member-seller-password-readonly">
                            보안상 기존 비밀번호는 표시하지 않습니다.
                          </div>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => setPasswordResetOpen(true)}
                          >
                            <KeyRound size={14} />
                            비밀번호 초기화
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="member-web-edit-form-grid member-web-edit-form-grid--3">
                      <div className={`member-web-edit-field${errors.loginId ? " is-invalid" : ""}`}>
                        <FieldLabel required>로그인 ID</FieldLabel>
                        <div className="member-seller-login-row">
                          <input
                            id={fieldId("loginId")}
                            ref={(el) => {
                              fieldRefs.current.loginId = el;
                            }}
                            value={values.loginId}
                            onChange={(e) => setField("loginId", e.target.value.replace(/\s/g, ""))}
                            placeholder="로그인 아이디"
                            autoComplete="off"
                            aria-invalid={Boolean(errors.loginId) || loginCheckStatus === "unavailable"}
                            aria-describedby={
                              errors.loginId || loginCheckMessage
                                ? errorId("loginId")
                                : undefined
                            }
                          />
                          <button
                            type="button"
                            className="secondary"
                            onClick={handleLoginDuplicateCheck}
                            aria-label="로그인 ID 중복확인"
                          >
                            중복확인
                          </button>
                        </div>
                        <FieldError id={errorId("loginId")} message={errors.loginId} />
                        {!errors.loginId && loginCheckStatus === "available" ? (
                          <small className="member-seller-form-success" role="status">
                            {loginCheckMessage || SELLER_LOGIN_CHECK_MESSAGES.available}
                          </small>
                        ) : null}
                        {!errors.loginId && loginCheckStatus === "idle" && values.loginId.trim() ? (
                          <small className="member-seller-form-hint" role="status">
                            중복확인을 진행해 주세요.
                          </small>
                        ) : null}
                      </div>
                      <label className={`member-web-edit-field${errors.password ? " is-invalid" : ""}`}>
                        <FieldLabel required>초기 비밀번호</FieldLabel>
                        <div className="member-seller-password-row">
                          <input
                            id={fieldId("password")}
                            ref={(el) => {
                              fieldRefs.current.password = el;
                            }}
                            type={showPassword ? "text" : "password"}
                            value={values.password}
                            onChange={(e) => setField("password", e.target.value)}
                            placeholder="8자 이상"
                            autoComplete="new-password"
                            aria-invalid={Boolean(errors.password)}
                            aria-describedby={errors.password ? errorId("password") : undefined}
                          />
                          <button
                            type="button"
                            className="secondary member-seller-password-toggle"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <FieldError id={errorId("password")} message={errors.password} />
                      </label>
                      <label className={`member-web-edit-field${errors.passwordConfirm ? " is-invalid" : ""}`}>
                        <FieldLabel required>비밀번호 확인</FieldLabel>
                        <div className="member-seller-password-row">
                          <input
                            id={fieldId("passwordConfirm")}
                            ref={(el) => {
                              fieldRefs.current.passwordConfirm = el;
                            }}
                            type={showPasswordConfirm ? "text" : "password"}
                            value={values.passwordConfirm}
                            onChange={(e) => setField("passwordConfirm", e.target.value)}
                            placeholder="비밀번호 재입력"
                            autoComplete="new-password"
                            aria-invalid={Boolean(errors.passwordConfirm)}
                            aria-describedby={errors.passwordConfirm ? errorId("passwordConfirm") : undefined}
                          />
                          <button
                            type="button"
                            className="secondary member-seller-password-toggle"
                            onClick={() => setShowPasswordConfirm((v) => !v)}
                            aria-label={showPasswordConfirm ? "비밀번호 확인 숨기기" : "비밀번호 확인 보기"}
                          >
                            {showPasswordConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <FieldError id={errorId("passwordConfirm")} message={errors.passwordConfirm} />
                      </label>
                    </div>
                  )}
                </div>
              </section>

              <section className="panel member-web-detail-card">
                <div className="member-web-detail-card-head">
                  <strong>운영 설정</strong>
                </div>
                <div className="member-web-edit-form-body">
                  <div className="member-web-edit-form-grid member-web-edit-form-grid--3">
                    {isEdit ? (
                      <>
                        <div className="member-web-edit-field">
                          <FieldLabel>승인상태</FieldLabel>
                          <div className="member-web-edit-readonly member-seller-status-readonly">
                            <span className={`badge ${sellerApplicationStatusBadgeClass(values.approvalStatus)}`}>
                              {sellerApprovalStatusLabel(values.approvalStatus)}
                            </span>
                          </div>
                          <Hint>승인/거절은 판매점 상세의 승인관리에서 처리합니다.</Hint>
                        </div>
                        <div className="member-web-edit-field">
                          <FieldLabel>판매상태</FieldLabel>
                          <div className="member-web-edit-readonly member-seller-status-readonly">
                            {values.salesStatus ? (
                              <span className={`badge ${sellerSalesStatusBadgeClass(values.salesStatus)}`}>
                                {sellerSalesStatusLabel(values.salesStatus)}
                              </span>
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                          <Hint>판매중지/재개는 판매점 상세에서 처리합니다.</Hint>
                        </div>
                      </>
                    ) : (
                      <>
                        <label className={`member-web-edit-field${errors.approvalStatus ? " is-invalid" : ""}`}>
                          <FieldLabel>승인상태</FieldLabel>
                          <select
                            id={fieldId("approvalStatus")}
                            ref={(el) => {
                              fieldRefs.current.approvalStatus = el;
                            }}
                            value={values.approvalStatus === "approved" ? "approved" : "pending"}
                            onChange={(e) => {
                              const next = e.target.value as "pending" | "approved";
                              setValues((prev) => ({
                                ...prev,
                                approvalStatus: next,
                                salesStatus: next === "pending" ? "" : prev.salesStatus || "active",
                              }));
                              setErrors((prev) => {
                                const copy = { ...prev };
                                delete copy.approvalStatus;
                                delete copy.salesStatus;
                                return copy;
                              });
                            }}
                          >
                            <option value="pending">승인대기</option>
                            <option value="approved">승인완료</option>
                          </select>
                          <FieldError id={errorId("approvalStatus")} message={errors.approvalStatus} />
                        </label>
                        <label
                          className={`member-web-edit-field${errors.salesStatus ? " is-invalid" : ""}${salesLocked ? " is-disabled" : ""}`}
                        >
                          <FieldLabel>판매상태</FieldLabel>
                          {salesLocked ? (
                            <>
                              <div className="member-web-edit-readonly" aria-disabled="true">
                                -
                              </div>
                              <Hint>승인완료 후 판매상태를 설정할 수 있습니다.</Hint>
                            </>
                          ) : (
                            <select
                              id={fieldId("salesStatus")}
                              ref={(el) => {
                                fieldRefs.current.salesStatus = el;
                              }}
                              value={values.salesStatus || "active"}
                              onChange={(e) =>
                                setField("salesStatus", e.target.value as SellerFormValues["salesStatus"])
                              }
                            >
                              <option value="active">판매중</option>
                              <option value="suspended">판매중지</option>
                            </select>
                          )}
                          <FieldError id={errorId("salesStatus")} message={errors.salesStatus} />
                        </label>
                      </>
                    )}
                    <label className={`member-web-edit-field${errors.defaultCommission ? " is-invalid" : ""}`}>
                      <FieldLabel optional>기본 판매수수료</FieldLabel>
                      <div className="member-seller-commission-row">
                        <input
                          id={fieldId("defaultCommission")}
                          ref={(el) => {
                            fieldRefs.current.defaultCommission = el;
                          }}
                          value={values.defaultCommission}
                          onChange={(e) =>
                            setField(
                              "defaultCommission",
                              e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"),
                            )
                          }
                          placeholder="미설정"
                          inputMode="decimal"
                          aria-invalid={Boolean(errors.defaultCommission)}
                          aria-describedby={
                            errors.defaultCommission ? errorId("defaultCommission") : undefined
                          }
                        />
                        <span className="member-seller-commission-suffix">%</span>
                      </div>
                      <Hint>
                        {isEdit
                          ? "판매점 기본 수수료만 변경됩니다. 상품별 개별 수수료는 변경되지 않습니다."
                          : "미입력 시 미설정으로 저장됩니다. 향후 상품별 수수료의 기본값으로 사용됩니다."}
                      </Hint>
                      <FieldError id={errorId("defaultCommission")} message={errors.defaultCommission} />
                    </label>
                  </div>
                </div>
              </section>

              <section className="panel member-web-detail-card">
                <div className="member-web-detail-card-head">
                  <strong>관리자 메모</strong>
                </div>
                <div className="member-web-edit-form-body">
                  <label className={`member-web-edit-field${errors.adminMemo ? " is-invalid" : ""}`}>
                    <FieldLabel optional>관리자 메모</FieldLabel>
                    <textarea
                      id={fieldId("adminMemo")}
                      ref={(el) => {
                        fieldRefs.current.adminMemo = el;
                      }}
                      rows={4}
                      value={values.adminMemo}
                      onChange={(e) => setField("adminMemo", e.target.value)}
                      placeholder="판매점 운영과 관련된 내부 메모를 입력하세요."
                      aria-invalid={Boolean(errors.adminMemo)}
                      aria-describedby={errors.adminMemo ? errorId("adminMemo") : undefined}
                    />
                    <Hint>고객이나 판매점에게 노출되지 않는 내부용 정보입니다.</Hint>
                    <FieldError id={errorId("adminMemo")} message={errors.adminMemo} />
                  </label>
                </div>
              </section>
            </>
          ) : (
            <section className="panel member-web-detail-card member-seller-form-placeholder">
              <div className="member-web-edit-form-body">
                <p>판매점 유형을 선택하면 등록 Form이 표시됩니다.</p>
              </div>
            </section>
          )}
        </div>

        <div className="sticky-action-bar member-seller-form-actions">
          <div>
            <Save size={18} />
            <span>
              <b>{isEdit ? "변경 사항을 저장하세요." : "판매점 정보를 확인한 뒤 등록하세요."}</b>
              <small>
                {isDirty ? "저장하지 않은 변경사항이 있습니다." : "필수 항목을 모두 입력해야 저장할 수 있습니다."}
              </small>
            </span>
          </div>
          <div>
            <button type="button" className="secondary" onClick={requestCancel} disabled={submitting}>
              <X size={14} />
              취소
            </button>
            <button type="submit" className="primary" disabled={submitDisabled} aria-busy={submitting}>
              <Save size={14} />
              {submitting
                ? isEdit
                  ? "저장 중..."
                  : "등록 중..."
                : isEdit
                  ? "변경사항 저장"
                  : "판매점 등록"}
            </button>
          </div>
        </div>
      </form>

      {typeChangeOpen && pendingType && !isEdit ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            setTypeChangeOpen(false);
            setPendingType(null);
          }}
        >
          <div
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-type-change-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="seller-type-change-title">판매점 유형을 변경하시겠습니까?</h3>
              <button
                type="button"
                onClick={() => {
                  setTypeChangeOpen(false);
                  setPendingType(null);
                }}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <p>판매점 유형을 변경하면 현재 입력한 유형별 정보가 초기화될 수 있습니다.</p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setTypeChangeOpen(false);
                  setPendingType(null);
                }}
              >
                취소
              </button>
              <button type="button" className="primary" onClick={() => applySellerType(pendingType)}>
                유형 변경
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {passwordResetOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setPasswordResetOpen(false)}
        >
          <div
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-password-reset-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="seller-password-reset-title">판매점 비밀번호 초기화</h3>
              <button type="button" onClick={() => setPasswordResetOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <p>판매점 로그인 비밀번호를 초기화하시겠습니까?</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setPasswordResetOpen(false)}>
                취소
              </button>
              <button type="button" className="primary" onClick={confirmPasswordReset}>
                초기화
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="toast-stack">
          <div className="toast">{toast}</div>
        </div>
      ) : null}
    </>
  );
}

/** 페이지 헤더 이동용 Dirty Confirm (상품설정 패턴 재사용) */
export function confirmSellerFormLeave(isDirty: boolean) {
  if (!isDirty) return true;
  return window.confirm(UNSAVED_LEAVE_MESSAGE);
}
