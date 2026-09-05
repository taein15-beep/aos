/**
 * 판매점 가입신청 폼 임시 상태 (CLIENT SESSION ONLY)
 * - React state로만 유지됩니다. 서버·DB·API에 저장하지 않습니다.
 * - 새로고침·탭 종료 시 초기화됩니다.
 * - 첨부파일(File)은 sessionStorage·localStorage에 쓰지 않습니다.
 * - 단일 페이지 신청 명세 기준입니다. (위저드 단계 없음)
 * - 제휴여행사 form-state와 타입·키·약관을 공유하지 않습니다.
 */

/** 프로토타입 운영 여행사 — 실제 tenant ID가 아님. 향후 연동 시 교체 지점. */
export const PROTOTYPE_OPERATOR_AGENCY_REF = "prototype-current-site" as const;
export const PROTOTYPE_OPERATOR_AGENCY_DISPLAY_NAME = "현재 홈페이지 운영 여행사" as const;

export const SELLER_TYPE_OPTIONS = ["business", "individual"] as const;
export type SellerType = (typeof SELLER_TYPE_OPTIONS)[number];
/** 가입유형 선택 전 빈 상태 포함 */
export type SelectedSellerType = SellerType | "";

export const SELLER_TYPE_LABELS: Record<SellerType, string> = {
  business: "사업자 판매점",
  individual: "개인 판매점",
};

export type SellerApplyForm = {
  sellerType: SelectedSellerType;
  sellerName: string;
  homepageOrSns: string;
  address: string;
  addressDetail: string;
  // 사업자 전용
  businessName: string;
  useBusinessNameAsSellerName: boolean;
  businessNumber: string;
  representativeName: string;
  businessPhone: string;
  representativeIsContact: boolean;
  // 담당자 (개인: contactName = 신청자명)
  contactName: string;
  contactRole: string;
  contactPhone: string;
  contactEmail: string;
  contactEmailConfirm: string;
  // 추천인코드
  referralCodePhone: string;
  useContactPhoneAsReferralCode: boolean;
  // 선택
  applicationNote: string;
  // 첨부 (메모리만)
  businessLicenseFile: File | null;
  mailOrderLicenseFile: File | null;
  tourismLicenseFile: File | null;
  activityProofFile: File | null;
  otherFiles: File[];
  // 약관
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeSellerPolicy: boolean;
  agreeReferralPolicy: boolean;
  agreeSettlementPolicy: boolean;
  agreeMarketing: boolean;
};

export type SellerSingleAttachmentKey =
  | "businessLicenseFile"
  | "mailOrderLicenseFile"
  | "tourismLicenseFile"
  | "activityProofFile";

export type SellerAttachmentSlot = {
  key: SellerSingleAttachmentKey | "otherFiles";
  label: string;
  required: boolean;
  multiple?: boolean;
};

export const FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
export const FILE_ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_SIZE_LABEL = "10MB";
export const MAX_OTHER_FILES = 3;
export const MAX_APPLICATION_NOTE_LENGTH = 500;

export const BUSINESS_ATTACHMENT_SLOTS: SellerAttachmentSlot[] = [
  { key: "businessLicenseFile", label: "사업자등록증", required: true },
  { key: "mailOrderLicenseFile", label: "통신판매업 신고증", required: false },
  { key: "tourismLicenseFile", label: "여행업등록증", required: false },
  { key: "otherFiles", label: "기타 증빙서류", required: false, multiple: true },
];

export const INDIVIDUAL_ATTACHMENT_SLOTS: SellerAttachmentSlot[] = [
  { key: "activityProofFile", label: "활동 경력 증빙", required: false },
  { key: "otherFiles", label: "기타 증빙서류", required: false, multiple: true },
];

export function getAttachmentSlotsForSellerType(
  sellerType: SelectedSellerType,
): SellerAttachmentSlot[] {
  if (sellerType === "business") return BUSINESS_ATTACHMENT_SLOTS;
  if (sellerType === "individual") return INDIVIDUAL_ATTACHMENT_SLOTS;
  return [];
}

export type SellerTermKey = keyof Pick<
  SellerApplyForm,
  | "agreeTerms"
  | "agreePrivacy"
  | "agreeSellerPolicy"
  | "agreeReferralPolicy"
  | "agreeSettlementPolicy"
  | "agreeMarketing"
>;

export type SellerTermItem = {
  key: SellerTermKey;
  title: string;
  required: boolean;
  summary: string;
};

/** 확정된 법률 문서가 아닌 임시 안내문 */
export const SELLER_TERM_ITEMS: SellerTermItem[] = [
  {
    key: "agreeTerms",
    title: "서비스 이용약관",
    required: true,
    summary:
      "[임시 안내문] AOS 판매점 서비스 이용에 관한 기본 안내입니다. 정식 약관은 추후 확정·게시됩니다. 서비스 범위, 계정 관리, 이용 제한 등이 포함될 예정입니다.",
  },
  {
    key: "agreePrivacy",
    title: "개인정보 수집·이용",
    required: true,
    summary:
      "[임시 안내문] 판매점 가입신청·심사·운영을 위해 사업자·담당자(또는 신청자) 연락처 등 개인정보를 수집·이용할 수 있습니다. 수집 항목·보유기간·파기 절차는 정식 고지문으로 대체됩니다.",
  },
  {
    key: "agreeSellerPolicy",
    title: "판매점 운영정책",
    required: true,
    summary:
      "[임시 안내문] 현재 홈페이지 운영 여행사에 판매점으로 가입합니다. 해당 여행사가 신청을 승인해야 판매점 관계가 활성화됩니다. 판매 가능 상품과 수수료 조건은 여행사가 별도로 설정하며, 가입 승인만으로 바로 판매를 시작하지 않습니다. 한 판매점은 여러 여행사에 가입할 수 있으며 여행사별 관계·승인상태·수수료·판매상품·정산조건은 독립적으로 관리됩니다. 판매 중지 또는 관계 종료 후에도 기존 예약과 정산 관계는 유지됩니다.",
  },
  {
    key: "agreeReferralPolicy",
    title: "추천인코드 및 추천회원 연결",
    required: true,
    summary:
      "[임시 안내문] 가입 승인 후 등록한 휴대전화번호가 판매점 추천인코드로 사용됩니다. 일반회원 가입 시 추천인코드 입력은 선택 사항입니다. 여행사 관리자는 회원관리에서 추천 판매점을 등록·변경·해제할 수 있습니다. 추천 판매점 변경은 변경 이후 발생한 예약부터 적용되며, 기존 예약에는 예약 당시 판매점과 수수료 조건이 유지됩니다.",
  },
  {
    key: "agreeSettlementPolicy",
    title: "정산 및 수수료 정책",
    required: true,
    summary:
      "[임시 안내문] 수수료는 여행사 관리자가 정률 또는 정액으로 설정합니다. 예약·결제만으로 수수료가 확정되지 않으며, 추천회원이 상품을 예약·결제하고 정상적으로 행사를 완료하면 수수료가 확정됩니다. 취소·환불 시 수수료가 조정되거나 취소될 수 있고, 지급 후 환불이 발생하면 이후 정산에서 차감될 수 있습니다. 가입신청 단계에서는 수수료를 입력하지 않습니다.",
  },
  {
    key: "agreeMarketing",
    title: "제휴·상품 안내 메일 수신",
    required: false,
    summary:
      "[임시 안내문] 판매점 운영·상품 안내를 이메일로 받아보시겠습니까? 원하지 않으면 선택하지 않으셔도 됩니다.",
  },
];

export const REQUIRED_SELLER_TERM_KEYS = SELLER_TERM_ITEMS.filter((item) => item.required).map(
  (item) => item.key,
);
export const OPTIONAL_SELLER_TERM_KEYS = SELLER_TERM_ITEMS.filter((item) => !item.required).map(
  (item) => item.key,
);

export const SELLER_POLICY_GUIDE_ITEMS = [
  "현재 홈페이지 운영 여행사의 판매점으로 가입을 신청합니다.",
  "가입할 여행사를 검색하거나 선택하지 않습니다.",
  "여행사 승인 후 판매점 관계가 활성화됩니다.",
  "판매 가능 상품과 수수료는 여행사가 별도로 설정합니다.",
  "가입 승인만으로 바로 판매를 시작하지 않습니다.",
  "등록 휴대전화번호가 추천인코드로 사용됩니다.",
] as const;

/** 가입신청 상태 (신청 심사) — 운영상태와 합치지 않음 */
export const SELLER_APPLICATION_STATUSES = [
  "승인대기",
  "보완요청",
  "승인완료",
  "가입거절",
] as const;
export type SellerApplicationStatus = (typeof SELLER_APPLICATION_STATUSES)[number];

/** 운영상태 (승인 후 판매 가능 여부) — 가입신청 상태와 합치지 않음 */
export const SELLER_OPERATING_STATUSES = [
  "설정대기",
  "판매가능",
  "거래중지",
  "관계종료",
] as const;
export type SellerOperatingStatus = (typeof SELLER_OPERATING_STATUSES)[number];

export const INITIAL_SELLER_APPLY_FORM: SellerApplyForm = {
  sellerType: "",
  sellerName: "",
  homepageOrSns: "",
  address: "",
  addressDetail: "",
  businessName: "",
  useBusinessNameAsSellerName: false,
  businessNumber: "",
  representativeName: "",
  businessPhone: "",
  representativeIsContact: false,
  contactName: "",
  contactRole: "",
  contactPhone: "",
  contactEmail: "",
  contactEmailConfirm: "",
  referralCodePhone: "",
  useContactPhoneAsReferralCode: false,
  applicationNote: "",
  businessLicenseFile: null,
  mailOrderLicenseFile: null,
  tourismLicenseFile: null,
  activityProofFile: null,
  otherFiles: [],
  agreeTerms: false,
  agreePrivacy: false,
  agreeSellerPolicy: false,
  agreeReferralPolicy: false,
  agreeSettlementPolicy: false,
  agreeMarketing: false,
};

export type SellerApplyFieldErrors = Partial<Record<keyof SellerApplyForm, string>>;

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function applicationNoteLength(value: string) {
  return value.length;
}

export function isApplicationNoteWithinLimit(value: string) {
  return value.length <= MAX_APPLICATION_NOTE_LENGTH;
}

/** 사업자등록번호: 숫자 10자리 */
export function isValidBusinessNumber(value: string) {
  return digitsOnly(value).length === 10;
}

export function formatBusinessNumberInput(value: string) {
  const digits = digitsOnly(value).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/** 대표전화 등: 선택 입력 시 숫자 9~11자리 (지역·휴대 허용) */
export function isValidBusinessPhone(value: string) {
  const digits = digitsOnly(value);
  return digits.length >= 9 && digits.length <= 11;
}

/** 국내 휴대전화: 01로 시작, 숫자 10~11자리 */
export function isValidMobilePhone(value: string) {
  const digits = digitsOnly(value);
  return /^01\d{8,9}$/.test(digits);
}

export function formatMobilePhoneInput(value: string) {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * 이메일 일치 비교: trim 후 대소문자 무시.
 * (제휴여행사 폼은 trim만 하며 대소문자를 구분하지만, 이메일은 실무상 대소문자 무시가 자연스러워 판매점은 이 방식을 사용합니다.)
 */
export function emailsMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** http(s) URL만 허용. SNS 아이디만 입력은 불가. */
export function isValidHomepageOrSnsUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isAllowedAttachmentFile(file: File) {
  const name = file.name.toLowerCase();
  const hasExt = FILE_ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!hasExt) return false;
  if (!file.type) return true;
  return (
    file.type === "application/pdf" ||
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/jpg"
  );
}

export function validateAttachmentFile(file: File): string | null {
  if (!isAllowedAttachmentFile(file)) {
    return "허용 형식이 아닙니다. PDF, JPG, JPEG, PNG만 첨부할 수 있습니다.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `파일 용량이 초과되었습니다. 파일당 최대 ${MAX_FILE_SIZE_LABEL}까지 첨부할 수 있습니다.`;
  }
  return null;
}

export function areRequiredSellerTermsAgreed(form: SellerApplyForm) {
  return REQUIRED_SELLER_TERM_KEYS.every((key) => form[key]);
}

/** 상호명 → 판매점명 동기화 */
export function applyBusinessNameToSellerName(form: SellerApplyForm): SellerApplyForm {
  if (!form.useBusinessNameAsSellerName) return form;
  return { ...form, sellerName: form.businessName };
}

export function setUseBusinessNameAsSellerName(
  form: SellerApplyForm,
  checked: boolean,
): SellerApplyForm {
  const next = { ...form, useBusinessNameAsSellerName: checked };
  if (checked) next.sellerName = form.businessName;
  return next;
}

export function updateBusinessName(form: SellerApplyForm, businessName: string): SellerApplyForm {
  const next = { ...form, businessName };
  if (next.useBusinessNameAsSellerName) next.sellerName = businessName;
  return next;
}

/** 대표자명 → 담당자명 동기화 */
export function applyRepresentativeToContactName(form: SellerApplyForm): SellerApplyForm {
  if (!form.representativeIsContact) return form;
  return { ...form, contactName: form.representativeName };
}

export function setRepresentativeIsContact(form: SellerApplyForm, checked: boolean): SellerApplyForm {
  const next = { ...form, representativeIsContact: checked };
  if (checked) next.contactName = form.representativeName;
  return next;
}

export function updateRepresentativeName(
  form: SellerApplyForm,
  representativeName: string,
): SellerApplyForm {
  const next = { ...form, representativeName };
  if (next.representativeIsContact) next.contactName = representativeName;
  return next;
}

/** 담당자 휴대전화 → 추천인코드 동기화 */
export function applyContactPhoneToReferralCode(form: SellerApplyForm): SellerApplyForm {
  if (!form.useContactPhoneAsReferralCode) return form;
  return { ...form, referralCodePhone: form.contactPhone };
}

export function setUseContactPhoneAsReferralCode(
  form: SellerApplyForm,
  checked: boolean,
): SellerApplyForm {
  const next = { ...form, useContactPhoneAsReferralCode: checked };
  if (checked) next.referralCodePhone = form.contactPhone;
  return next;
}

export function updateContactPhone(form: SellerApplyForm, contactPhone: string): SellerApplyForm {
  const next = { ...form, contactPhone };
  if (next.useContactPhoneAsReferralCode) next.referralCodePhone = contactPhone;
  return next;
}

/**
 * 가입유형 변경.
 * 공통 연락처·약관·주소 등은 유지하고, 이탈 유형 전용 필드·첨부는 초기화합니다.
 * otherFiles는 유형별 의미가 달라 항상 비웁니다.
 */
export function changeSellerType(form: SellerApplyForm, nextType: SelectedSellerType): SellerApplyForm {
  if (form.sellerType === nextType) return form;

  const base: SellerApplyForm = {
    ...INITIAL_SELLER_APPLY_FORM,
    sellerType: nextType,
    sellerName: form.sellerName,
    homepageOrSns: form.homepageOrSns,
    address: form.address,
    addressDetail: form.addressDetail,
    contactName: form.contactName,
    contactPhone: form.contactPhone,
    contactEmail: form.contactEmail,
    contactEmailConfirm: form.contactEmailConfirm,
    referralCodePhone: form.referralCodePhone,
    useContactPhoneAsReferralCode: form.useContactPhoneAsReferralCode,
    applicationNote: form.applicationNote,
    agreeTerms: form.agreeTerms,
    agreePrivacy: form.agreePrivacy,
    agreeSellerPolicy: form.agreeSellerPolicy,
    agreeReferralPolicy: form.agreeReferralPolicy,
    agreeSettlementPolicy: form.agreeSettlementPolicy,
    agreeMarketing: form.agreeMarketing,
    otherFiles: [],
  };

  if (nextType === "individual" && form.useContactPhoneAsReferralCode) {
    base.referralCodePhone = base.contactPhone;
  }

  return base;
}

/** 유형 변경 확인 다이얼로그용 — 현재 유형 전용 입력·첨부 존재 여부 */
export function hasDedicatedSellerTypeData(form: SellerApplyForm): boolean {
  if (form.sellerType === "business") {
    return Boolean(
      form.businessName.trim() ||
        form.businessNumber.trim() ||
        form.representativeName.trim() ||
        form.businessPhone.trim() ||
        form.contactRole.trim() ||
        form.useBusinessNameAsSellerName ||
        form.representativeIsContact ||
        form.businessLicenseFile ||
        form.mailOrderLicenseFile ||
        form.tourismLicenseFile ||
        form.otherFiles.length > 0,
    );
  }
  if (form.sellerType === "individual") {
    return Boolean(form.activityProofFile || form.otherFiles.length > 0);
  }
  return false;
}

/** 취소 확인용 — 초기값과 다른 입력이 있는지 */
export function isSellerApplyFormDirty(form: SellerApplyForm): boolean {
  const initial = INITIAL_SELLER_APPLY_FORM;
  return (
    form.sellerType !== initial.sellerType ||
    form.sellerName !== initial.sellerName ||
    form.homepageOrSns !== initial.homepageOrSns ||
    form.address !== initial.address ||
    form.addressDetail !== initial.addressDetail ||
    form.businessName !== initial.businessName ||
    form.useBusinessNameAsSellerName !== initial.useBusinessNameAsSellerName ||
    form.businessNumber !== initial.businessNumber ||
    form.representativeName !== initial.representativeName ||
    form.businessPhone !== initial.businessPhone ||
    form.representativeIsContact !== initial.representativeIsContact ||
    form.contactName !== initial.contactName ||
    form.contactRole !== initial.contactRole ||
    form.contactPhone !== initial.contactPhone ||
    form.contactEmail !== initial.contactEmail ||
    form.contactEmailConfirm !== initial.contactEmailConfirm ||
    form.referralCodePhone !== initial.referralCodePhone ||
    form.useContactPhoneAsReferralCode !== initial.useContactPhoneAsReferralCode ||
    form.applicationNote !== initial.applicationNote ||
    form.businessLicenseFile !== null ||
    form.mailOrderLicenseFile !== null ||
    form.tourismLicenseFile !== null ||
    form.activityProofFile !== null ||
    form.otherFiles.length > 0 ||
    form.agreeTerms ||
    form.agreePrivacy ||
    form.agreeSellerPolicy ||
    form.agreeReferralPolicy ||
    form.agreeSettlementPolicy ||
    form.agreeMarketing
  );
}

function validateAttachedFileField(file: File | null, emptyMessage: string): string | undefined {
  if (!file) return emptyMessage;
  return validateAttachmentFile(file) ?? undefined;
}

/**
 * 화면·포커스용 필드 순서.
 * 유형에 맞지 않는 키는 firstErrorFieldId에서 오류가 없을 때만 건너뜁니다.
 */
export const SELLER_APPLY_FIELD_ORDER: (keyof SellerApplyForm)[] = [
  "sellerType",
  "businessName",
  "sellerName",
  "businessNumber",
  "representativeName",
  "address",
  "addressDetail",
  "businessPhone",
  "homepageOrSns",
  "contactName",
  "contactRole",
  "contactPhone",
  "contactEmail",
  "contactEmailConfirm",
  "referralCodePhone",
  "applicationNote",
  "businessLicenseFile",
  "mailOrderLicenseFile",
  "tourismLicenseFile",
  "activityProofFile",
  "otherFiles",
  "agreeTerms",
  "agreePrivacy",
  "agreeSellerPolicy",
  "agreeReferralPolicy",
  "agreeSettlementPolicy",
  "agreeMarketing",
];

export function validateSellerApplyForm(form: SellerApplyForm): SellerApplyFieldErrors {
  const errors: SellerApplyFieldErrors = {};

  if (!form.sellerType) {
    errors.sellerType = "가입유형을 선택해 주세요.";
    return errors;
  }

  const isBusiness = form.sellerType === "business";
  const isIndividual = form.sellerType === "individual";

  if (isBusiness) {
    if (!form.businessName.trim()) errors.businessName = "상호명을 입력해 주세요.";
  }

  if (!form.sellerName.trim()) errors.sellerName = "판매점명을 입력해 주세요.";

  if (isBusiness) {
    if (!form.businessNumber.trim()) {
      errors.businessNumber = "사업자등록번호를 입력해 주세요.";
    } else if (!isValidBusinessNumber(form.businessNumber)) {
      errors.businessNumber = "사업자등록번호 형식이 올바르지 않습니다. (예: 000-00-00000)";
    }
    if (!form.representativeName.trim()) {
      errors.representativeName = "대표자명을 입력해 주세요.";
    }
  }

  if (!form.address.trim()) {
    errors.address = isBusiness ? "사업장 주소를 입력해 주세요." : "활동 주소를 입력해 주세요.";
  }

  if (isBusiness && form.businessPhone.trim() && !isValidBusinessPhone(form.businessPhone)) {
    errors.businessPhone = "대표 전화번호 형식이 올바르지 않습니다.";
  }

  if (form.homepageOrSns.trim() && !isValidHomepageOrSnsUrl(form.homepageOrSns)) {
    errors.homepageOrSns =
      "홈페이지 또는 SNS 주소는 http:// 또는 https://로 시작하는 URL로 입력해 주세요.";
  }

  if (isBusiness) {
    if (!form.contactName.trim()) errors.contactName = "담당자명을 입력해 주세요.";
  } else if (isIndividual) {
    if (!form.contactName.trim()) errors.contactName = "신청자명을 입력해 주세요.";
  }

  if (!form.contactPhone.trim()) {
    errors.contactPhone = "휴대전화번호를 입력해 주세요.";
  } else if (!isValidMobilePhone(form.contactPhone)) {
    errors.contactPhone = "휴대전화번호 형식이 올바르지 않습니다. (예: 010-0000-0000)";
  }

  if (!form.contactEmail.trim()) {
    errors.contactEmail = "이메일을 입력해 주세요.";
  } else if (!isValidEmail(form.contactEmail)) {
    errors.contactEmail = "이메일 형식이 올바르지 않습니다.";
  }

  if (!form.contactEmailConfirm.trim()) {
    errors.contactEmailConfirm = "이메일 확인을 입력해 주세요.";
  } else if (!isValidEmail(form.contactEmailConfirm)) {
    errors.contactEmailConfirm = "이메일 확인 형식이 올바르지 않습니다.";
  } else if (!emailsMatch(form.contactEmail, form.contactEmailConfirm)) {
    errors.contactEmailConfirm = "이메일과 이메일 확인이 일치하지 않습니다.";
  }

  if (!form.referralCodePhone.trim()) {
    errors.referralCodePhone = "추천인코드용 휴대전화번호를 입력해 주세요.";
  } else if (!isValidMobilePhone(form.referralCodePhone)) {
    errors.referralCodePhone =
      "추천인코드용 휴대전화번호 형식이 올바르지 않습니다. (예: 010-0000-0000)";
  }

  if (form.applicationNote && !isApplicationNoteWithinLimit(form.applicationNote)) {
    errors.applicationNote = `활동 및 신청내용은 최대 ${MAX_APPLICATION_NOTE_LENGTH}자까지 입력할 수 있습니다.`;
  }

  if (isBusiness) {
    const licenseError = validateAttachedFileField(
      form.businessLicenseFile,
      "사업자등록증을 첨부해 주세요.",
    );
    if (licenseError) errors.businessLicenseFile = licenseError;

    if (form.mailOrderLicenseFile) {
      const mailError = validateAttachmentFile(form.mailOrderLicenseFile);
      if (mailError) errors.mailOrderLicenseFile = mailError;
    }
    if (form.tourismLicenseFile) {
      const tourismError = validateAttachmentFile(form.tourismLicenseFile);
      if (tourismError) errors.tourismLicenseFile = tourismError;
    }
  }

  if (isIndividual && form.activityProofFile) {
    const activityError = validateAttachmentFile(form.activityProofFile);
    if (activityError) errors.activityProofFile = activityError;
  }

  if (form.otherFiles.length > MAX_OTHER_FILES) {
    errors.otherFiles = `기타 증빙서류는 최대 ${MAX_OTHER_FILES}개까지 첨부할 수 있습니다.`;
  } else {
    for (const file of form.otherFiles) {
      const otherError = validateAttachmentFile(file);
      if (otherError) {
        errors.otherFiles = otherError;
        break;
      }
    }
  }

  if (!areRequiredSellerTermsAgreed(form)) {
    errors.agreeTerms = "필수 약관에 모두 동의해 주세요.";
  }

  return errors;
}

export function firstSellerErrorFieldId(errors: SellerApplyFieldErrors): string | null {
  for (const key of SELLER_APPLY_FIELD_ORDER) {
    if (errors[key]) return key;
  }
  return null;
}

export function hasSellerApplyErrors(errors: SellerApplyFieldErrors) {
  return Object.keys(errors).length > 0;
}

/**
 * 선택 서류 pick 오류 정리: 해당 슬롯에 파일이 없으면 제출을 막지 않음.
 * 현재 가입유형에 속하지 않는 슬롯 오류도 제거합니다.
 */
export function sanitizeSellerFilePickErrors(
  form: SellerApplyForm,
  pickErrors: Partial<Record<string, string>>,
): Partial<Record<string, string>> {
  const next = { ...pickErrors };
  const activeKeys = new Set(
    getAttachmentSlotsForSellerType(form.sellerType).map((slot) => slot.key),
  );

  for (const key of Object.keys(next)) {
    if (!activeKeys.has(key as SellerAttachmentSlot["key"])) {
      delete next[key];
    }
  }

  if (!form.mailOrderLicenseFile) delete next.mailOrderLicenseFile;
  if (!form.tourismLicenseFile) delete next.tourismLicenseFile;
  if (!form.activityProofFile) delete next.activityProofFile;

  const otherInvalid = form.otherFiles.map((file) => validateAttachmentFile(file)).find(Boolean);
  if (form.otherFiles.length <= MAX_OTHER_FILES && !otherInvalid) {
    delete next.otherFiles;
  }

  return next;
}

export type SellerDocumentMeta = {
  key: string;
  label: string;
  required: boolean;
  fileName: string | null;
  fileNames?: string[];
  fileSizeLabel?: string;
};

export type SellerApplyFormSummary = {
  sellerType: SellerType;
  sellerName: string;
  businessName?: string;
  businessNumber?: string;
  representativeName?: string;
  applicantOrContactName: string;
  address: string;
  addressDetail?: string;
  contactPhone: string;
  contactEmail: string;
  referralCodePhone: string;
  homepageOrSns?: string;
  applicationNote?: string;
  documents: SellerDocumentMeta[];
  requiredTermsAgreed: boolean;
};

function documentMetaFromFile(
  key: string,
  label: string,
  required: boolean,
  file: File | null,
): SellerDocumentMeta {
  if (!file) {
    return { key, label, required, fileName: null };
  }
  return {
    key,
    label,
    required,
    fileName: file.name,
    fileSizeLabel: formatFileSize(file.size),
  };
}

export function buildSellerApplyFormSummary(form: SellerApplyForm): SellerApplyFormSummary {
  if (form.sellerType !== "business" && form.sellerType !== "individual") {
    throw new Error("가입유형이 선택된 상태에서만 요약을 생성할 수 있습니다.");
  }

  const documents: SellerDocumentMeta[] = [];
  for (const slot of getAttachmentSlotsForSellerType(form.sellerType)) {
    if (slot.key === "otherFiles") {
      documents.push({
        key: slot.key,
        label: slot.label,
        required: slot.required,
        fileName: form.otherFiles[0]?.name ?? null,
        fileNames: form.otherFiles.map((file) => file.name),
        fileSizeLabel:
          form.otherFiles.length > 0
            ? form.otherFiles.map((file) => formatFileSize(file.size)).join(", ")
            : undefined,
      });
      continue;
    }
    documents.push(
      documentMetaFromFile(slot.key, slot.label, slot.required, form[slot.key] as File | null),
    );
  }

  const summary: SellerApplyFormSummary = {
    sellerType: form.sellerType,
    sellerName: form.sellerName.trim(),
    applicantOrContactName: form.contactName.trim(),
    address: form.address.trim(),
    contactPhone: form.contactPhone.trim(),
    contactEmail: form.contactEmail.trim(),
    referralCodePhone: form.referralCodePhone.trim(),
    documents,
    requiredTermsAgreed: areRequiredSellerTermsAgreed(form),
  };

  if (form.addressDetail.trim()) summary.addressDetail = form.addressDetail.trim();
  if (form.homepageOrSns.trim()) summary.homepageOrSns = form.homepageOrSns.trim();
  if (form.applicationNote.trim()) summary.applicationNote = form.applicationNote.trim();

  if (form.sellerType === "business") {
    summary.businessName = form.businessName.trim();
    summary.businessNumber = form.businessNumber.trim();
    summary.representativeName = form.representativeName.trim();
  }

  return summary;
}

export const PROTOTYPE_SELLER_APPLY_RECEIPT_STORAGE_KEY =
  "aos.seller.apply.prototype.receipt.v1" as const;

export type PrototypeSellerApplyReceipt = {
  prototype: true;
  applicationNumber: string;
  submittedAt: string;
  status: "승인대기";
  operatorAgencyRef: typeof PROTOTYPE_OPERATOR_AGENCY_REF;
  operatorAgencyDisplayName: string;
  sellerType: SellerType;
  sellerName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  referralCodePhone: string;
  summary: SellerApplyFormSummary;
};

const APPLICATION_NUMBER_PATTERN = /^AOS-S-\d{8}-\d{4}$/;

export function createSellerApplicationNumber(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `AOS-S-${y}${m}${d}-${rand}`;
}

export function createPrototypeSellerApplyReceipt(
  form: SellerApplyForm,
  options?: {
    operatorAgencyRef?: typeof PROTOTYPE_OPERATOR_AGENCY_REF;
    operatorAgencyDisplayName?: string;
    now?: Date;
  },
): PrototypeSellerApplyReceipt {
  if (form.sellerType !== "business" && form.sellerType !== "individual") {
    throw new Error("가입유형이 선택된 유효한 폼에서만 접수를 생성할 수 있습니다.");
  }

  const now = options?.now ?? new Date();
  const summary = buildSellerApplyFormSummary(form);

  return {
    prototype: true,
    applicationNumber: createSellerApplicationNumber(now),
    submittedAt: now.toISOString(),
    status: "승인대기",
    operatorAgencyRef: options?.operatorAgencyRef ?? PROTOTYPE_OPERATOR_AGENCY_REF,
    operatorAgencyDisplayName:
      options?.operatorAgencyDisplayName ?? PROTOTYPE_OPERATOR_AGENCY_DISPLAY_NAME,
    sellerType: form.sellerType,
    sellerName: summary.sellerName,
    contactName: summary.applicantOrContactName,
    contactPhone: summary.contactPhone,
    contactEmail: summary.contactEmail,
    referralCodePhone: summary.referralCodePhone,
    summary,
  };
}

export function savePrototypeSellerApplyReceipt(receipt: PrototypeSellerApplyReceipt) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PROTOTYPE_SELLER_APPLY_RECEIPT_STORAGE_KEY, JSON.stringify(receipt));
}

function isSellerType(value: unknown): value is SellerType {
  return value === "business" || value === "individual";
}

function isValidReceiptShape(value: unknown): value is PrototypeSellerApplyReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Record<string, unknown>;
  if (receipt.prototype !== true) return false;
  if (typeof receipt.applicationNumber !== "string") return false;
  if (!APPLICATION_NUMBER_PATTERN.test(receipt.applicationNumber)) return false;
  if (typeof receipt.submittedAt !== "string") return false;
  if (receipt.status !== "승인대기") return false;
  if (receipt.operatorAgencyRef !== PROTOTYPE_OPERATOR_AGENCY_REF) return false;
  if (typeof receipt.operatorAgencyDisplayName !== "string") return false;
  if (!isSellerType(receipt.sellerType)) return false;
  if (typeof receipt.sellerName !== "string") return false;
  if (typeof receipt.contactName !== "string") return false;
  if (typeof receipt.contactPhone !== "string") return false;
  if (typeof receipt.contactEmail !== "string") return false;
  if (typeof receipt.referralCodePhone !== "string") return false;
  if (!receipt.summary || typeof receipt.summary !== "object") return false;

  const summary = receipt.summary as Record<string, unknown>;
  if (!isSellerType(summary.sellerType)) return false;
  if (typeof summary.sellerName !== "string") return false;
  if (typeof summary.applicantOrContactName !== "string") return false;
  if (typeof summary.address !== "string") return false;
  if (typeof summary.contactPhone !== "string") return false;
  if (typeof summary.contactEmail !== "string") return false;
  if (typeof summary.referralCodePhone !== "string") return false;
  if (!Array.isArray(summary.documents)) return false;
  if (typeof summary.requiredTermsAgreed !== "boolean") return false;

  return true;
}

export function loadPrototypeSellerApplyReceipt(): PrototypeSellerApplyReceipt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PROTOTYPE_SELLER_APPLY_RECEIPT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidReceiptShape(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPrototypeSellerApplyReceipt() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PROTOTYPE_SELLER_APPLY_RECEIPT_STORAGE_KEY);
}

export function formatSubmittedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${hh}:${mm}`;
}
