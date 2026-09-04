/**
 * 제휴여행사 가입신청 폼 임시 상태 (CLIENT SESSION ONLY)
 * - React state로만 유지됩니다. 서버·DB·API에 저장하지 않습니다.
 * - 새로고침·탭 종료 시 초기화됩니다.
 * - password / 첨부파일(File)은 sessionStorage·localStorage에 쓰지 않습니다.
 */

export const APPLY_STEPS = [
  {
    id: 1,
    key: "agency",
    title: "여행사 정보",
    description: "사업자·여행사 기본 정보를 입력합니다.",
  },
  {
    id: 2,
    key: "admin",
    title: "관리자 정보",
    description: "가입 후 사용할 관리자 계정 정보를 입력합니다.",
  },
  {
    id: 3,
    key: "trade",
    title: "판매·거래정보",
    description: "취급상품·제휴 목적·판매 현황과 전달사항을 입력합니다.",
  },
  {
    id: 4,
    key: "docs",
    title: "서류·약관",
    description: "필요 서류와 약관 동의를 확인합니다.",
  },
  {
    id: 5,
    key: "review",
    title: "신청내용 확인",
    description: "입력 내용을 확인한 뒤 가입신청을 제출합니다.",
  },
] as const;

export type ApplyStepKey = (typeof APPLY_STEPS)[number]["key"];

export const BUSINESS_TYPE_OPTIONS = ["법인사업자", "개인사업자"] as const;
export const TOURISM_LICENSE_TYPE_OPTIONS = [
  "종합여행업",
  "국내외여행업",
  "국내여행업",
  "국외여행업",
  "기타",
] as const;

export type BusinessType = (typeof BUSINESS_TYPE_OPTIONS)[number] | "";
export type TourismLicenseType = (typeof TOURISM_LICENSE_TYPE_OPTIONS)[number] | "";
export type YesNo = "yes" | "no" | "";

export const PRODUCT_TYPE_OPTIONS = [
  "국내 당일여행",
  "국내 숙박여행",
  "해외 패키지",
  "항공권",
  "골프",
  "크루즈",
  "테마여행",
  "기업·단체",
  "인센티브",
  "입장권·액티비티",
  "기타",
] as const;

export const PARTNERSHIP_PURPOSE_OPTIONS = [
  "다른 여행사의 상품을 판매하고 싶음",
  "자사 상품을 다른 여행사에 공급하고 싶음",
  "상품공급과 판매를 모두 희망",
  "공동재고를 이용하고 싶음",
  "판매점 유통망을 확대하고 싶음",
  "기타",
] as const;

export const PASSWORD_MIN_LENGTH = 8;
export const LONG_TEXT_LIMITS = {
  companyIntro: 1000,
  flagshipProducts: 500,
  applyReason: 500,
  expectedCollaboration: 500,
  messageToAdmin: 500,
} as const;

export type PartnershipApplyForm = {
  // 1. 여행사 정보
  agencyName: string;
  businessNumber: string;
  businessType: BusinessType;
  ceoName: string;
  tourismLicenseNumber: string;
  tourismLicenseType: TourismLicenseType;
  address: string;
  addressDetail: string;
  phone: string;
  email: string;
  corporateRegistrationNumber: string;
  openDate: string;
  homepage: string;
  // 2. 관리자 정보 (password는 메모리만)
  adminName: string;
  department: string;
  position: string;
  adminPhone: string;
  adminEmail: string;
  useEmailAsLoginId: boolean;
  adminLoginId: string;
  adminPassword: string;
  adminPasswordConfirm: string;
  // 3. 판매·거래정보
  productTypes: string[];
  partnershipPurposes: string[];
  monthlyReservationCount: string;
  monthlySalesAmount: string;
  mainSalesRegions: string;
  mainCustomerSegments: string;
  sellsOnline: YesNo;
  hasOfflineStore: YesNo;
  hasSellers: YesNo;
  sellerCount: string;
  mainSalesChannels: string;
  currentErpSystem: string;
  companyIntro: string;
  flagshipProducts: string;
  applyReason: string;
  expectedCollaboration: string;
  messageToAdmin: string;
  // 4. 서류·약관 (File은 메모리만 — 서버 업로드 없음)
  businessLicenseFile: File | null;
  tourismLicenseFile: File | null;
  mailOrderLicenseFile: File | null;
  companyIntroFile: File | null;
  productIntroFile: File | null;
  insuranceFile: File | null;
  otherFiles: File[];
  // 필수 동의
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeBusinessInfo: boolean;
  agreeProductInfo: boolean;
  agreeCustomerInfo: boolean;
  agreeReshare: boolean;
  agreeReservationPreserve: boolean;
  // 선택 동의
  agreeEmailGuide: boolean;
  agreeMarketing: boolean;
  agreeSms: boolean;
  /** 최종 확인: 입력 정보가 사실과 다름이 없음 */
  confirmAccuracy: boolean;
};

export type SingleAttachmentKey =
  | "businessLicenseFile"
  | "tourismLicenseFile"
  | "mailOrderLicenseFile"
  | "companyIntroFile"
  | "productIntroFile"
  | "insuranceFile";

export type AttachmentSlot = {
  key: SingleAttachmentKey | "otherFiles";
  label: string;
  required: boolean;
  multiple?: boolean;
};

export const REQUIRED_ATTACHMENT_SLOTS: AttachmentSlot[] = [
  { key: "businessLicenseFile", label: "사업자등록증", required: true },
  { key: "tourismLicenseFile", label: "관광사업등록증 또는 여행업등록증", required: true },
];

export const OPTIONAL_ATTACHMENT_SLOTS: AttachmentSlot[] = [
  { key: "mailOrderLicenseFile", label: "통신판매업 신고증", required: false },
  { key: "companyIntroFile", label: "회사소개서", required: false },
  { key: "productIntroFile", label: "상품소개서", required: false },
  { key: "insuranceFile", label: "보험 관련 서류", required: false },
  { key: "otherFiles", label: "기타 서류", required: false, multiple: true },
];

export const FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
export const FILE_ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE_LABEL = "10MB";
export const MAX_OTHER_FILES = 3;

export type TermItem = {
  key: keyof Pick<
    PartnershipApplyForm,
    | "agreeTerms"
    | "agreePrivacy"
    | "agreeBusinessInfo"
    | "agreeProductInfo"
    | "agreeCustomerInfo"
    | "agreeReshare"
    | "agreeReservationPreserve"
    | "agreeEmailGuide"
    | "agreeMarketing"
    | "agreeSms"
  >;
  title: string;
  required: boolean;
  summary: string;
};

/** 확정된 법률 문서가 아닌 임시 안내문 */
export const TERM_ITEMS: TermItem[] = [
  {
    key: "agreeTerms",
    title: "서비스 이용약관",
    required: true,
    summary:
      "[임시 안내문] AOS 제휴여행사 서비스 이용에 관한 기본 안내입니다. 정식 약관은 추후 확정·게시됩니다. 서비스 범위, 계정 관리, 이용 제한 등이 포함될 예정입니다.",
  },
  {
    key: "agreePrivacy",
    title: "개인정보 수집 및 이용",
    required: true,
    summary:
      "[임시 안내문] 가입신청·심사·제휴 운영을 위해 사업자·담당자 연락처 등 개인정보를 수집·이용할 수 있습니다. 수집 항목·보유기간·파기 절차는 정식 고지문으로 대체됩니다.",
  },
  {
    key: "agreeBusinessInfo",
    title: "사업자정보 확인",
    required: true,
    summary:
      "[임시 안내문] 제출하신 사업자·여행업 등록 정보가 사실과 다를 경우 심사가 보류되거나 거절될 수 있습니다. 변경 사항은 관리자에게 알려 주세요.",
  },
  {
    key: "agreeProductInfo",
    title: "상품정보 이용정책",
    required: true,
    summary:
      "[임시 안내문] 공유·판매되는 상품정보의 정확성 유지를 위한 임시 안내입니다. 원본 상품정보는 공급여행사·플랫폼 정책에 따라 관리됩니다.",
  },
  {
    key: "agreeCustomerInfo",
    title: "고객정보 보호정책",
    required: true,
    summary:
      "[임시 안내문] 예약·고객정보는 업무 목적 외 이용·외부 유출을 금지하며, 관련 법령과 플랫폼 정책을 따릅니다. 세부 조항은 추후 확정됩니다.",
  },
  {
    key: "agreeReshare",
    title: "상품 재공유 제한정책",
    required: true,
    summary:
      "[임시 안내문] 공유받은 상품을 다른 독립 여행사에 임의로 재공유할 수 없습니다. 위반 시 제휴 이용이 제한될 수 있습니다.",
  },
  {
    key: "agreeReservationPreserve",
    title: "기존 예약·정산 보존정책",
    required: true,
    summary:
      "[임시 안내문] 거래중지·탈퇴 후에도 이미 발생한 예약과 정산 관계는 관련 정책에 따라 유지·처리됩니다. 세부 기준은 추후 안내됩니다.",
  },
  {
    key: "agreeEmailGuide",
    title: "제휴 및 상품 안내 이메일 수신",
    required: false,
    summary:
      "[임시 안내문] 제휴 운영·상품 안내 이메일을 받아보시겠습니까? 원하지 않으면 선택하지 않으셔도 됩니다.",
  },
  {
    key: "agreeMarketing",
    title: "마케팅 정보 수신",
    required: false,
    summary:
      "[임시 안내문] 이벤트·프로모션 등 마케팅 정보를 받아보시겠습니까? 선택 사항이며 언제든지 철회할 수 있습니다.",
  },
  {
    key: "agreeSms",
    title: "알림톡·문자 수신",
    required: false,
    summary:
      "[임시 안내문] 알림톡·문자로 안내를 받아보시겠습니까? 선택 사항이며 원하지 않으면 체크하지 않으셔도 됩니다.",
  },
];

export const REQUIRED_TERM_KEYS = TERM_ITEMS.filter((item) => item.required).map((item) => item.key);
export const OPTIONAL_TERM_KEYS = TERM_ITEMS.filter((item) => !item.required).map((item) => item.key);

export const POLICY_GUIDE_ITEMS = [
  "가입승인만으로 상품이 자동 공유되지 않음",
  "상품공유그룹은 승인 후 관리자가 별도로 지정",
  "상품공급여행사가 상품별 공유 대상을 지정",
  "별도 수락 절차 없이 상품이 공유됨",
  "판매여행사가 카테고리와 노출을 설정해야 판매 가능",
  "공유상품의 원본정보는 임의 수정 불가",
  "다른 독립 여행사에 상품 재공유 불가",
  "거래중지·탈퇴 후에도 기존 예약과 정산관계 유지",
] as const;

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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

export function areRequiredTermsAgreed(form: PartnershipApplyForm) {
  return REQUIRED_TERM_KEYS.every((key) => form[key]);
}

export type ApplyFieldErrors = Partial<Record<keyof PartnershipApplyForm, string>>;

export const INITIAL_PARTNERSHIP_APPLY_FORM: PartnershipApplyForm = {
  agencyName: "",
  businessNumber: "",
  businessType: "",
  ceoName: "",
  tourismLicenseNumber: "",
  tourismLicenseType: "",
  address: "",
  addressDetail: "",
  phone: "",
  email: "",
  corporateRegistrationNumber: "",
  openDate: "",
  homepage: "",
  adminName: "",
  department: "",
  position: "",
  adminPhone: "",
  adminEmail: "",
  useEmailAsLoginId: false,
  adminLoginId: "",
  adminPassword: "",
  adminPasswordConfirm: "",
  productTypes: [],
  partnershipPurposes: [],
  monthlyReservationCount: "",
  monthlySalesAmount: "",
  mainSalesRegions: "",
  mainCustomerSegments: "",
  sellsOnline: "",
  hasOfflineStore: "",
  hasSellers: "",
  sellerCount: "",
  mainSalesChannels: "",
  currentErpSystem: "",
  companyIntro: "",
  flagshipProducts: "",
  applyReason: "",
  expectedCollaboration: "",
  messageToAdmin: "",
  businessLicenseFile: null,
  tourismLicenseFile: null,
  mailOrderLicenseFile: null,
  companyIntroFile: null,
  productIntroFile: null,
  insuranceFile: null,
  otherFiles: [],
  agreeTerms: false,
  agreePrivacy: false,
  agreeBusinessInfo: false,
  agreeProductInfo: false,
  agreeCustomerInfo: false,
  agreeReshare: false,
  agreeReservationPreserve: false,
  agreeEmailGuide: false,
  agreeMarketing: false,
  agreeSms: false,
  confirmAccuracy: false,
};

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** 대표전화·휴대폰 공통: 숫자 9~11자리 (하이픈 무시) */
export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 11;
}

/** 사업자등록번호: 10자리 숫자 (000-00-00000) */
export function isValidBusinessNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10;
}

export function formatBusinessNumberInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function isValidHomepageUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    // 호스트에 점이 있어야 함 (예: example.com). 단일 라벨은 거부.
    return url.hostname.includes(".") && !url.hostname.startsWith(".") && !url.hostname.endsWith(".");
  } catch {
    return false;
  }
}

export function getPasswordMismatchMessage(password: string, confirm: string) {
  if (!confirm) return "";
  if (password !== confirm) return "비밀번호와 확인 값이 일치하지 않습니다.";
  return "";
}

export function validateAgencyStep(form: PartnershipApplyForm): ApplyFieldErrors {
  const errors: ApplyFieldErrors = {};
  if (!form.agencyName.trim()) errors.agencyName = "여행사명을 입력해 주세요.";
  if (!form.businessNumber.trim()) errors.businessNumber = "사업자등록번호를 입력해 주세요.";
  else if (!isValidBusinessNumber(form.businessNumber)) {
    errors.businessNumber = "사업자등록번호 형식이 올바르지 않습니다. (예: 000-00-00000)";
  }
  if (!form.businessType) errors.businessType = "사업자 구분을 선택해 주세요.";
  if (!form.ceoName.trim()) errors.ceoName = "대표자명을 입력해 주세요.";
  if (!form.tourismLicenseNumber.trim()) errors.tourismLicenseNumber = "여행업 등록번호를 입력해 주세요.";
  if (!form.tourismLicenseType) errors.tourismLicenseType = "여행업 종류를 선택해 주세요.";
  if (!form.address.trim()) errors.address = "사업장 주소를 입력해 주세요.";
  if (!form.addressDetail.trim()) errors.addressDetail = "상세주소를 입력해 주세요.";
  if (!form.phone.trim()) errors.phone = "대표 전화번호를 입력해 주세요.";
  else if (!isValidPhone(form.phone)) errors.phone = "전화번호 형식이 올바르지 않습니다.";
  if (!form.email.trim()) errors.email = "대표 이메일을 입력해 주세요.";
  else if (!isValidEmail(form.email)) errors.email = "이메일 형식이 올바르지 않습니다.";
  if (form.homepage.trim() && !isValidHomepageUrl(form.homepage)) {
    errors.homepage = "홈페이지 주소 형식이 올바르지 않습니다. (예: https://example.com)";
  }
  return errors;
}

export function validateAdminStep(form: PartnershipApplyForm): ApplyFieldErrors {
  const errors: ApplyFieldErrors = {};
  if (!form.adminName.trim()) errors.adminName = "관리자 이름을 입력해 주세요.";
  if (!form.department.trim()) errors.department = "부서를 입력해 주세요.";
  if (!form.position.trim()) errors.position = "직책을 입력해 주세요.";
  if (!form.adminPhone.trim()) errors.adminPhone = "휴대전화번호를 입력해 주세요.";
  else if (!isValidPhone(form.adminPhone)) errors.adminPhone = "휴대전화번호 형식이 올바르지 않습니다.";
  if (!form.adminEmail.trim()) errors.adminEmail = "이메일을 입력해 주세요.";
  else if (!isValidEmail(form.adminEmail)) errors.adminEmail = "이메일 형식이 올바르지 않습니다.";
  if (!form.adminLoginId.trim()) errors.adminLoginId = "로그인 아이디를 입력해 주세요.";
  if (!form.adminPassword) errors.adminPassword = "비밀번호를 입력해 주세요.";
  else if (form.adminPassword.length < PASSWORD_MIN_LENGTH) {
    errors.adminPassword = `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
  }
  if (!form.adminPasswordConfirm) errors.adminPasswordConfirm = "비밀번호 확인을 입력해 주세요.";
  else if (form.adminPassword !== form.adminPasswordConfirm) {
    errors.adminPasswordConfirm = "비밀번호와 확인 값이 일치하지 않습니다.";
  }
  return errors;
}

export function validateTradeStep(form: PartnershipApplyForm): ApplyFieldErrors {
  const errors: ApplyFieldErrors = {};
  if (form.productTypes.length === 0) errors.productTypes = "취급상품을 하나 이상 선택해 주세요.";
  if (form.partnershipPurposes.length === 0) {
    errors.partnershipPurposes = "제휴 목적을 하나 이상 선택해 주세요.";
  }
  if (!form.hasSellers) errors.hasSellers = "판매점 보유 여부를 선택해 주세요.";
  if (form.hasSellers === "yes") {
    if (!form.sellerCount.trim()) errors.sellerCount = "보유 판매점 수를 입력해 주세요.";
    else if (!/^\d+$/.test(form.sellerCount.trim()) || Number(form.sellerCount) < 1) {
      errors.sellerCount = "판매점 수는 1 이상의 숫자로 입력해 주세요.";
    }
  }
  if (form.companyIntro.length > LONG_TEXT_LIMITS.companyIntro) {
    errors.companyIntro = `회사 소개는 ${LONG_TEXT_LIMITS.companyIntro}자 이내로 입력해 주세요.`;
  }
  if (form.flagshipProducts.length > LONG_TEXT_LIMITS.flagshipProducts) {
    errors.flagshipProducts = `주력 상품은 ${LONG_TEXT_LIMITS.flagshipProducts}자 이내로 입력해 주세요.`;
  }
  if (form.applyReason.length > LONG_TEXT_LIMITS.applyReason) {
    errors.applyReason = `제휴 신청 사유는 ${LONG_TEXT_LIMITS.applyReason}자 이내로 입력해 주세요.`;
  }
  if (form.expectedCollaboration.length > LONG_TEXT_LIMITS.expectedCollaboration) {
    errors.expectedCollaboration = `예상 협업 방식은 ${LONG_TEXT_LIMITS.expectedCollaboration}자 이내로 입력해 주세요.`;
  }
  if (form.messageToAdmin.length > LONG_TEXT_LIMITS.messageToAdmin) {
    errors.messageToAdmin = `관리자 전달사항은 ${LONG_TEXT_LIMITS.messageToAdmin}자 이내로 입력해 주세요.`;
  }
  return errors;
}

export function validateDocsStep(form: PartnershipApplyForm): ApplyFieldErrors {
  const errors: ApplyFieldErrors = {};
  if (!form.businessLicenseFile) errors.businessLicenseFile = "사업자등록증을 첨부해 주세요.";
  if (!form.tourismLicenseFile) {
    errors.tourismLicenseFile = "관광사업등록증 또는 여행업등록증을 첨부해 주세요.";
  }
  if (!areRequiredTermsAgreed(form)) {
    errors.agreeTerms = "필수 약관에 모두 동의해 주세요.";
  }
  return errors;
}

export function validateReviewStep(form: PartnershipApplyForm): ApplyFieldErrors {
  const errors: ApplyFieldErrors = {};
  if (!form.confirmAccuracy) {
    errors.confirmAccuracy = "입력한 정보가 사실과 다름이 없음을 확인해 주세요.";
  }
  return errors;
}

export function validateStep(stepKey: ApplyStepKey, form: PartnershipApplyForm): ApplyFieldErrors {
  if (stepKey === "agency") return validateAgencyStep(form);
  if (stepKey === "admin") return validateAdminStep(form);
  if (stepKey === "trade") return validateTradeStep(form);
  if (stepKey === "docs") return validateDocsStep(form);
  if (stepKey === "review") return validateReviewStep(form);
  return {};
}

/** 제출 전 전체 단계 검증. 첫 오류 단계와 항목을 반환합니다. */
export function validateAllApplySteps(
  form: PartnershipApplyForm,
): { stepKey: ApplyStepKey; stepTitle: string; errors: ApplyFieldErrors } | null {
  for (const step of APPLY_STEPS) {
    const errors = validateStep(step.key, form);
    if (Object.keys(errors).length > 0) {
      return { stepKey: step.key, stepTitle: step.title, errors };
    }
  }
  return null;
}

export function toggleMultiSelectValue(values: string[], option: string) {
  return values.includes(option) ? values.filter((value) => value !== option) : [...values, option];
}

export function firstErrorFieldId(errors: ApplyFieldErrors): string | null {
  const order: (keyof PartnershipApplyForm)[] = [
    "agencyName",
    "businessNumber",
    "businessType",
    "ceoName",
    "tourismLicenseNumber",
    "tourismLicenseType",
    "address",
    "addressDetail",
    "phone",
    "email",
    "homepage",
    "adminName",
    "department",
    "position",
    "adminPhone",
    "adminEmail",
    "adminLoginId",
    "adminPassword",
    "adminPasswordConfirm",
    "productTypes",
    "partnershipPurposes",
    "hasSellers",
    "sellerCount",
    "companyIntro",
    "flagshipProducts",
    "applyReason",
    "expectedCollaboration",
    "messageToAdmin",
    "businessLicenseFile",
    "tourismLicenseFile",
    "agreeTerms",
    "confirmAccuracy",
  ];
  for (const key of order) {
    if (errors[key]) return key;
  }
  return null;
}

/** 민감 필드를 제외한 요약용 스냅샷 */
export function getApplyFormReviewSafe(form: PartnershipApplyForm) {
  return {
    agencyName: form.agencyName,
    businessNumber: form.businessNumber,
    businessType: form.businessType,
    ceoName: form.ceoName,
    tourismLicenseNumber: form.tourismLicenseNumber,
    tourismLicenseType: form.tourismLicenseType,
    address: form.address,
    addressDetail: form.addressDetail,
    phone: form.phone,
    email: form.email,
    corporateRegistrationNumber: form.corporateRegistrationNumber,
    openDate: form.openDate,
    homepage: form.homepage,
    adminName: form.adminName,
    department: form.department,
    position: form.position,
    adminPhone: form.adminPhone,
    adminEmail: form.adminEmail,
    adminLoginId: form.adminLoginId,
    adminPasswordSet: Boolean(form.adminPassword),
    productTypes: form.productTypes,
    partnershipPurposes: form.partnershipPurposes,
    monthlyReservationCount: form.monthlyReservationCount,
    monthlySalesAmount: form.monthlySalesAmount,
    mainSalesRegions: form.mainSalesRegions,
    mainCustomerSegments: form.mainCustomerSegments,
    sellsOnline: form.sellsOnline,
    hasOfflineStore: form.hasOfflineStore,
    hasSellers: form.hasSellers,
    sellerCount: form.sellerCount,
    mainSalesChannels: form.mainSalesChannels,
    currentErpSystem: form.currentErpSystem,
    companyIntro: form.companyIntro,
    flagshipProducts: form.flagshipProducts,
    applyReason: form.applyReason,
    expectedCollaboration: form.expectedCollaboration,
    messageToAdmin: form.messageToAdmin,
    businessLicenseFileName: form.businessLicenseFile?.name ?? "",
    tourismLicenseFileName: form.tourismLicenseFile?.name ?? "",
    mailOrderLicenseFileName: form.mailOrderLicenseFile?.name ?? "",
    companyIntroFileName: form.companyIntroFile?.name ?? "",
    productIntroFileName: form.productIntroFile?.name ?? "",
    insuranceFileName: form.insuranceFile?.name ?? "",
    otherFileNames: form.otherFiles.map((file) => file.name),
    agreeTerms: form.agreeTerms,
    agreePrivacy: form.agreePrivacy,
    agreeBusinessInfo: form.agreeBusinessInfo,
    agreeProductInfo: form.agreeProductInfo,
    agreeCustomerInfo: form.agreeCustomerInfo,
    agreeReshare: form.agreeReshare,
    agreeReservationPreserve: form.agreeReservationPreserve,
    agreeEmailGuide: form.agreeEmailGuide,
    agreeMarketing: form.agreeMarketing,
    agreeSms: form.agreeSms,
    requiredTermsAgreed: areRequiredTermsAgreed(form),
  };
}

export function maskBusinessNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 10) return value.trim() || "—";
  return `${digits.slice(0, 3)}-**-*****`;
}

export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 9) return value.trim() || "—";
  if (digits.length === 9) return `${digits.slice(0, 2)}-***-${digits.slice(5)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-***-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
}

export function maskEmail(value: string) {
  const trimmed = value.trim();
  if (!trimmed.includes("@")) return trimmed || "—";
  const [local, domain] = trimmed.split("@");
  if (!local || !domain) return trimmed;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

export function yesNoLabel(value: YesNo) {
  if (value === "yes") return "예";
  if (value === "no") return "아니오";
  return "—";
}

export type ApplyFormReviewSafe = ReturnType<typeof getApplyFormReviewSafe>;

/**
 * FRONTEND PROTOTYPE ONLY
 * 실제 관리자 시스템·DB·API에 신청 레코드를 만들지 않습니다.
 * 브라우저 sessionStorage에만 임시로 보관되며, 탭을 닫으면 사라질 수 있습니다.
 */
export const PROTOTYPE_APPLY_RECEIPT_STORAGE_KEY = "aos.partnership.apply.prototype.receipt.v1";

export type PrototypeApplyReceipt = {
  /** 프로토타입 표시 — 영구 저장·실서비스 연동 아님 */
  prototype: true;
  applicationNumber: string;
  submittedAt: string;
  status: "승인대기";
  agencyName: string;
  contactEmail: string;
  review: ApplyFormReviewSafe;
};

export function createPrototypeApplyReceipt(form: PartnershipApplyForm): PrototypeApplyReceipt {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return {
    prototype: true,
    applicationNumber: `AOS-P-${y}${m}${d}-${rand}`,
    submittedAt: now.toISOString(),
    status: "승인대기",
    agencyName: form.agencyName.trim(),
    contactEmail: form.adminEmail.trim() || form.email.trim(),
    review: getApplyFormReviewSafe(form),
  };
}

export function savePrototypeApplyReceipt(receipt: PrototypeApplyReceipt) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PROTOTYPE_APPLY_RECEIPT_STORAGE_KEY, JSON.stringify(receipt));
}

export function loadPrototypeApplyReceipt(): PrototypeApplyReceipt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PROTOTYPE_APPLY_RECEIPT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrototypeApplyReceipt;
    if (!parsed?.prototype || !parsed.applicationNumber) return null;
    return parsed;
  } catch {
    return null;
  }
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
