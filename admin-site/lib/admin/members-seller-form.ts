/**
 * 판매점 신규등록/수정 Form 상태 · Validation · Mock 등록 매핑
 */

import {
  createPrototypeSellerApplication,
  formatSellerBusinessNumber,
  formatSellerMobilePhone,
  getPrototypeSellerApplication,
  isSellerLoginIdTaken,
  updatePrototypeSellerProfile,
  type CreateSellerApplicationInput,
  type SellerApplication,
  type SellerApplicationStatus,
  type SellerBusinessKind,
  type SellerSalesStatus,
  type SellerType,
} from "@/lib/admin/members-seller-data";

export type SellerFormMode = "create" | "edit";

export type SellerFormSellerType = SellerType | "";

/** 신규등록 Select용 (거절은 생성 불가) */
export type SellerFormApprovalStatus = Extract<SellerApplicationStatus, "pending" | "approved">;

export type SellerFormValues = {
  sellerType: SellerFormSellerType;
  businessName: string;
  businessNumber: string;
  businessKind: SellerBusinessKind | "";
  representativeName: string;
  businessZipCode: string;
  businessAddress: string;
  businessAddressDetail: string;
  managerName: string;
  managerMobile: string;
  managerPhone: string;
  managerEmail: string;
  individualName: string;
  individualMobile: string;
  individualEmail: string;
  individualZipCode: string;
  individualAddress: string;
  individualAddressDetail: string;
  loginId: string;
  password: string;
  passwordConfirm: string;
  /** 수정 화면에서는 읽기전용(승인거절 포함) */
  approvalStatus: SellerApplicationStatus;
  /** 승인대기 등에서는 빈 문자열로 표시 */
  salesStatus: SellerSalesStatus | "";
  defaultCommission: string;
  adminMemo: string;
};

export type SellerFormFieldKey = keyof SellerFormValues;

export type SellerFormErrors = Partial<Record<SellerFormFieldKey, string>>;

export function createEmptySellerFormValues(): SellerFormValues {
  return {
    sellerType: "",
    businessName: "",
    businessNumber: "",
    businessKind: "",
    representativeName: "",
    businessZipCode: "",
    businessAddress: "",
    businessAddressDetail: "",
    managerName: "",
    managerMobile: "",
    managerPhone: "",
    managerEmail: "",
    individualName: "",
    individualMobile: "",
    individualEmail: "",
    individualZipCode: "",
    individualAddress: "",
    individualAddressDetail: "",
    loginId: "",
    password: "",
    passwordConfirm: "",
    approvalStatus: "approved",
    salesStatus: "active",
    defaultCommission: "",
    adminMemo: "",
  };
}

/** 유형별 입력값을 비워 유형 변경 Confirm 이후 초기화에 사용 */
export function clearSellerTypeSpecificValues(values: SellerFormValues): SellerFormValues {
  return {
    ...values,
    businessName: "",
    businessNumber: "",
    businessKind: "",
    representativeName: "",
    businessZipCode: "",
    businessAddress: "",
    businessAddressDetail: "",
    managerName: "",
    managerMobile: "",
    managerPhone: "",
    managerEmail: "",
    individualName: "",
    individualMobile: "",
    individualEmail: "",
    individualZipCode: "",
    individualAddress: "",
    individualAddressDetail: "",
  };
}

export function hasSellerTypeSpecificInput(values: SellerFormValues, sellerType: SellerType): boolean {
  if (sellerType === "business") {
    return Boolean(
      values.businessName.trim() ||
        values.businessNumber.trim() ||
        values.businessKind ||
        values.representativeName.trim() ||
        values.businessZipCode.trim() ||
        values.businessAddress.trim() ||
        values.businessAddressDetail.trim() ||
        values.managerName.trim() ||
        values.managerMobile.trim() ||
        values.managerPhone.trim() ||
        values.managerEmail.trim(),
    );
  }
  return Boolean(
    values.individualName.trim() ||
      values.individualMobile.trim() ||
      values.individualEmail.trim() ||
      values.individualZipCode.trim() ||
      values.individualAddress.trim() ||
      values.individualAddressDetail.trim(),
  );
}

export function formatBusinessNumberInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function formatMobilePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function formatOfficePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_PATTERN = /^01[016789]-?\d{3,4}-?\d{4}$/;
const BUSINESS_NUMBER_PATTERN = /^\d{3}-\d{2}-\d{5}$/;

function isValidMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && MOBILE_PATTERN.test(formatMobilePhoneInput(digits));
}

function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

function normalizeCommission(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/%/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return "__invalid__";
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0 || num > 100) return "__invalid__";
  const text = Number.isInteger(num) ? String(num) : String(num);
  return `${text}%`;
}

export function validateSellerForm(
  values: SellerFormValues,
  options?: { mode?: SellerFormMode; requirePassword?: boolean },
): { ok: true } | { ok: false; errors: SellerFormErrors; firstErrorField: SellerFormFieldKey } {
  const mode = options?.mode ?? "create";
  const requirePassword = options?.requirePassword ?? mode === "create";
  const errors: SellerFormErrors = {};

  if (!values.sellerType) {
    errors.sellerType = "판매점 유형을 선택해 주세요.";
  }

  if (values.sellerType === "business") {
    if (!values.businessName.trim()) errors.businessName = "상호명을 입력해 주세요.";
    if (!values.businessNumber.trim()) {
      errors.businessNumber = "사업자등록번호를 입력해 주세요.";
    } else if (!BUSINESS_NUMBER_PATTERN.test(formatBusinessNumberInput(values.businessNumber))) {
      errors.businessNumber = "사업자등록번호 형식(123-45-67890)을 확인해 주세요.";
    }
    if (!values.businessKind) errors.businessKind = "사업자 구분을 선택해 주세요.";
    if (!values.representativeName.trim()) errors.representativeName = "대표자명을 입력해 주세요.";
    if (!values.businessAddress.trim()) errors.businessAddress = "사업장 주소를 입력해 주세요.";
    if (!values.managerName.trim()) errors.managerName = "담당자명을 입력해 주세요.";
    if (!values.managerMobile.trim()) {
      errors.managerMobile = "휴대전화를 입력해 주세요.";
    } else if (!isValidMobile(values.managerMobile)) {
      errors.managerMobile = "올바른 휴대전화번호를 입력해 주세요.";
    }
    if (!values.managerEmail.trim()) {
      errors.managerEmail = "이메일을 입력해 주세요.";
    } else if (!isValidEmail(values.managerEmail)) {
      errors.managerEmail = "올바른 이메일 주소를 입력해 주세요.";
    }
  }

  if (values.sellerType === "individual") {
    if (!values.individualName.trim()) errors.individualName = "이름을 입력해 주세요.";
    if (!values.individualMobile.trim()) {
      errors.individualMobile = "휴대전화를 입력해 주세요.";
    } else if (!isValidMobile(values.individualMobile)) {
      errors.individualMobile = "올바른 휴대전화번호를 입력해 주세요.";
    }
    if (!values.individualEmail.trim()) {
      errors.individualEmail = "이메일을 입력해 주세요.";
    } else if (!isValidEmail(values.individualEmail)) {
      errors.individualEmail = "올바른 이메일 주소를 입력해 주세요.";
    }
  }

  if (mode === "create") {
    if (!values.loginId.trim()) {
      errors.loginId = "로그인 ID를 입력해 주세요.";
    } else if (values.loginId.trim().length < 4) {
      errors.loginId = "로그인 ID는 4자 이상 입력해 주세요.";
    }
  }

  if (requirePassword) {
    if (!values.password) errors.password = "초기 비밀번호를 입력해 주세요.";
    else if (values.password.length < 8) errors.password = "비밀번호는 8자 이상 입력해 주세요.";
    if (!values.passwordConfirm) errors.passwordConfirm = "비밀번호 확인을 입력해 주세요.";
    else if (values.password !== values.passwordConfirm) {
      errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }
  } else if (mode === "create" && (values.password || values.passwordConfirm)) {
    if (values.password.length > 0 && values.password.length < 8) {
      errors.password = "비밀번호는 8자 이상 입력해 주세요.";
    }
    if (values.password !== values.passwordConfirm) {
      errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }
  }

  const commission = normalizeCommission(values.defaultCommission);
  if (commission === "__invalid__") {
    errors.defaultCommission = "수수료는 0~100 사이의 숫자로 입력해 주세요.";
  }

  if (mode === "create" && values.approvalStatus === "approved" && !values.salesStatus) {
    errors.salesStatus = "판매상태를 선택해 주세요.";
  }

  const order: SellerFormFieldKey[] = [
    "sellerType",
    "businessName",
    "businessNumber",
    "businessKind",
    "representativeName",
    "businessZipCode",
    "businessAddress",
    "businessAddressDetail",
    "managerName",
    "managerMobile",
    "managerPhone",
    "managerEmail",
    "individualName",
    "individualMobile",
    "individualEmail",
    "individualZipCode",
    "individualAddress",
    "individualAddressDetail",
    "loginId",
    "password",
    "passwordConfirm",
    "approvalStatus",
    "salesStatus",
    "defaultCommission",
    "adminMemo",
  ];

  const firstErrorField = order.find((key) => errors[key]);
  if (firstErrorField) {
    return { ok: false, errors, firstErrorField };
  }
  return { ok: true };
}

export function mapSellerFormToCreateInput(values: SellerFormValues): CreateSellerApplicationInput | null {
  if (values.sellerType !== "business" && values.sellerType !== "individual") return null;

  const commission = normalizeCommission(values.defaultCommission);
  if (commission === "__invalid__") return null;

  const approvalStatus =
    values.approvalStatus === "approved" ? "approved" : "pending";
  const salesStatus: SellerSalesStatus | null =
    approvalStatus === "approved"
      ? values.salesStatus === "suspended"
        ? "suspended"
        : "active"
      : null;

  if (values.sellerType === "business") {
    return {
      sellerType: "business",
      sellerName: values.businessName.trim(),
      businessNumber: formatSellerBusinessNumber(values.businessNumber),
      representativeName: values.representativeName.trim(),
      contactName: values.managerName.trim(),
      contactPhone: formatSellerMobilePhone(values.managerMobile),
      contactEmail: values.managerEmail.trim(),
      officePhone: values.managerPhone.trim() ? formatOfficePhoneInput(values.managerPhone) : null,
      businessKind: values.businessKind || null,
      zipCode: values.businessZipCode.trim() || null,
      address: values.businessAddress.trim(),
      addressDetail: values.businessAddressDetail.trim(),
      loginId: values.loginId.trim(),
      applicationStatus: approvalStatus,
      salesStatus,
      commissionText: commission,
      adminMemo: values.adminMemo,
    };
  }

  return {
    sellerType: "individual",
    sellerName: values.individualName.trim(),
    businessNumber: null,
    representativeName: null,
    contactName: values.individualName.trim(),
    contactPhone: formatSellerMobilePhone(values.individualMobile),
    contactEmail: values.individualEmail.trim(),
    officePhone: null,
    businessKind: null,
    zipCode: values.individualZipCode.trim() || null,
    address: values.individualAddress.trim(),
    addressDetail: values.individualAddressDetail.trim(),
    loginId: values.loginId.trim(),
    applicationStatus: approvalStatus,
    salesStatus,
    commissionText: commission,
    adminMemo: values.adminMemo,
  };
}

export function submitSellerCreateForm(
  values: SellerFormValues,
):
  | { ok: true; application: SellerApplication }
  | { ok: false; errors?: SellerFormErrors; firstErrorField?: SellerFormFieldKey; message?: string } {
  const validation = validateSellerForm(values, { mode: "create", requirePassword: true });
  if (!validation.ok) {
    return { ok: false, errors: validation.errors, firstErrorField: validation.firstErrorField };
  }

  if (isSellerLoginIdTaken(values.loginId)) {
    return {
      ok: false,
      errors: { loginId: "이미 사용 중인 아이디입니다." },
      firstErrorField: "loginId",
    };
  }

  const input = mapSellerFormToCreateInput(values);
  if (!input) {
    return { ok: false, message: "입력값을 확인해 주세요." };
  }

  const result = createPrototypeSellerApplication(input);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, application: result.application };
}

export type SellerLoginCheckStatus = "idle" | "available" | "unavailable";

export const SELLER_LOGIN_CHECK_MESSAGES = {
  available: "사용 가능한 아이디입니다.",
  unavailable: "이미 사용 중인 아이디입니다.",
  needCheck: "로그인 ID 중복확인을 진행해 주세요.",
} as const;

export function checkSellerLoginIdAvailable(
  loginId: string,
  excludeApplicationId?: string,
): { ok: true; message: string; status: "available" } | { ok: false; message: string; status: "unavailable" | "idle" } {
  const trimmed = loginId.trim();
  if (!trimmed) return { ok: false, message: "로그인 ID를 입력해 주세요.", status: "idle" };
  if (trimmed.length < 4) return { ok: false, message: "로그인 ID는 4자 이상 입력해 주세요.", status: "idle" };
  if (isSellerLoginIdTaken(trimmed, excludeApplicationId)) {
    return { ok: false, message: SELLER_LOGIN_CHECK_MESSAGES.unavailable, status: "unavailable" };
  }
  return { ok: true, message: SELLER_LOGIN_CHECK_MESSAGES.available, status: "available" };
}

function commissionTextToFormInput(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "미설정" || trimmed === "개별설정") return "";
  return trimmed.replace(/%/g, "").trim();
}

function resolveCommissionForUpdate(
  raw: string,
  previous: string | null | undefined,
): string | null | "__invalid__" {
  const normalized = normalizeCommission(raw);
  if (normalized === "__invalid__") return "__invalid__";
  if (normalized !== null) return normalized;
  if (previous === "개별설정") return "개별설정";
  return null;
}

/** Mock SellerApplication → Form 초기값 */
export function mapSellerApplicationToFormValues(application: SellerApplication): SellerFormValues {
  const base = createEmptySellerFormValues();
  const salesStatus =
    application.applicationStatus === "approved" && application.salesStatus
      ? application.salesStatus
      : "";

  if (application.sellerType === "business") {
    return {
      ...base,
      sellerType: "business",
      businessName: application.sellerName,
      businessNumber: formatBusinessNumberInput(application.businessNumber ?? ""),
      businessKind: application.businessKind ?? "",
      representativeName: application.representativeName ?? "",
      businessZipCode: application.zipCode ?? "",
      businessAddress: application.address ?? "",
      businessAddressDetail: application.addressDetail ?? "",
      managerName: application.contactName,
      managerMobile: formatMobilePhoneInput(application.contactPhone),
      managerPhone: application.officePhone ? formatOfficePhoneInput(application.officePhone) : "",
      managerEmail: application.contactEmail,
      loginId: application.loginId ?? "",
      approvalStatus: application.applicationStatus,
      salesStatus,
      defaultCommission: commissionTextToFormInput(application.commissionText),
      adminMemo: application.adminMemo ?? "",
    };
  }

  return {
    ...base,
    sellerType: "individual",
    individualName: application.sellerName,
    individualMobile: formatMobilePhoneInput(application.contactPhone),
    individualEmail: application.contactEmail,
    individualZipCode: application.zipCode ?? "",
    individualAddress: application.address ?? "",
    individualAddressDetail: application.addressDetail ?? "",
    loginId: application.loginId ?? "",
    approvalStatus: application.applicationStatus,
    salesStatus,
    defaultCommission: commissionTextToFormInput(application.commissionText),
    adminMemo: application.adminMemo ?? "",
  };
}

/** Dirty 비교용 (비밀번호 필드 제외) */
export function serializeSellerFormValues(values: SellerFormValues): string {
  return JSON.stringify({
    sellerType: values.sellerType,
    businessName: values.businessName,
    businessNumber: values.businessNumber,
    businessKind: values.businessKind,
    representativeName: values.representativeName,
    businessZipCode: values.businessZipCode,
    businessAddress: values.businessAddress,
    businessAddressDetail: values.businessAddressDetail,
    managerName: values.managerName,
    managerMobile: values.managerMobile,
    managerPhone: values.managerPhone,
    managerEmail: values.managerEmail,
    individualName: values.individualName,
    individualMobile: values.individualMobile,
    individualEmail: values.individualEmail,
    individualZipCode: values.individualZipCode,
    individualAddress: values.individualAddress,
    individualAddressDetail: values.individualAddressDetail,
    loginId: values.loginId,
    approvalStatus: values.approvalStatus,
    salesStatus: values.salesStatus,
    defaultCommission: values.defaultCommission,
    adminMemo: values.adminMemo,
  });
}

export function submitSellerUpdateForm(
  applicationId: string,
  values: SellerFormValues,
):
  | { ok: true; application: SellerApplication }
  | { ok: false; errors?: SellerFormErrors; firstErrorField?: SellerFormFieldKey; message?: string } {
  const previous = getPrototypeSellerApplication(applicationId);
  if (!previous) {
    return { ok: false, message: "판매점 정보를 찾을 수 없습니다." };
  }

  const validation = validateSellerForm(values, { mode: "edit", requirePassword: false });
  if (!validation.ok) {
    return { ok: false, errors: validation.errors, firstErrorField: validation.firstErrorField };
  }

  if (values.sellerType !== previous.sellerType) {
    return { ok: false, message: "판매점 유형은 정보수정에서 변경할 수 없습니다." };
  }

  const commission = resolveCommissionForUpdate(values.defaultCommission, previous.commissionText);
  if (commission === "__invalid__") {
    return {
      ok: false,
      errors: { defaultCommission: "수수료는 0~100 사이의 숫자로 입력해 주세요." },
      firstErrorField: "defaultCommission",
    };
  }

  if (values.sellerType === "business") {
    const businessNumber = formatSellerBusinessNumber(values.businessNumber);
    const result = updatePrototypeSellerProfile(applicationId, {
      sellerName: values.businessName.trim(),
      businessNumber: businessNumber === "-" ? null : businessNumber,
      representativeName: values.representativeName.trim(),
      contactName: values.managerName.trim(),
      contactPhone: formatSellerMobilePhone(values.managerMobile),
      contactEmail: values.managerEmail.trim(),
      officePhone: values.managerPhone.trim() ? formatOfficePhoneInput(values.managerPhone) : null,
      businessKind: values.businessKind || null,
      zipCode: values.businessZipCode.trim() || null,
      address: values.businessAddress.trim(),
      addressDetail: values.businessAddressDetail.trim(),
      commissionText: commission,
      adminMemo: values.adminMemo,
    });
    if (!result.ok) return { ok: false, message: result.message };
    return { ok: true, application: result.application };
  }

  const result = updatePrototypeSellerProfile(applicationId, {
    sellerName: values.individualName.trim(),
    businessNumber: null,
    representativeName: null,
    contactName: values.individualName.trim(),
    contactPhone: formatSellerMobilePhone(values.individualMobile),
    contactEmail: values.individualEmail.trim(),
    officePhone: null,
    businessKind: null,
    zipCode: values.individualZipCode.trim() || null,
    address: values.individualAddress.trim(),
    addressDetail: values.individualAddressDetail.trim(),
    commissionText: commission,
    adminMemo: values.adminMemo,
  });
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, application: result.application };
}
