/**
 * 제휴여행사 가입신청 폼 임시 상태 (CLIENT SESSION ONLY)
 * - React state로만 유지됩니다. 서버·DB·API에 저장하지 않습니다.
 * - 새로고침·탭 종료 시 초기화됩니다.
 * - 첨부파일(File)은 sessionStorage·localStorage에 쓰지 않습니다.
 * - 단일 페이지 신청 명세 기준입니다. (위저드 단계 없음)
 */

export const TOURISM_LICENSE_TYPE_OPTIONS = [
  "종합여행업",
  "국내외여행업",
  "국내여행업",
] as const;

export type TourismLicenseType = (typeof TOURISM_LICENSE_TYPE_OPTIONS)[number] | "";

export type PartnershipApplyForm = {
  // 여행사 정보
  agencyName: string;
  businessNumber: string;
  ceoName: string;
  tourismLicenseNumber: string;
  tourismLicenseType: TourismLicenseType;
  address: string;
  addressDetail: string;
  phone: string;
  homepage: string;
  // 담당자 정보 (department 라벨은 화면에서 「부서 또는 직책」으로 표시)
  adminName: string;
  department: string;
  adminPhone: string;
  adminEmail: string;
  adminEmailConfirm: string;
  // 증빙서류 (File은 메모리만 — 서버 업로드 없음)
  businessLicenseFile: File | null;
  tourismLicenseFile: File | null;
  mailOrderLicenseFile: File | null;
  otherFiles: File[];
  // 약관·동의
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeBusinessInfo: boolean;
  agreePartnershipPolicy: boolean;
  agreeEmailGuide: boolean;
};

export type SingleAttachmentKey =
  | "businessLicenseFile"
  | "tourismLicenseFile"
  | "mailOrderLicenseFile";

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
  { key: "otherFiles", label: "기타 증빙서류", required: false, multiple: true },
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
    | "agreePartnershipPolicy"
    | "agreeEmailGuide"
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
    title: "개인정보 수집·이용 동의",
    required: true,
    summary:
      "[임시 안내문] 가입신청·심사·제휴 운영을 위해 사업자·담당자 연락처 등 개인정보를 수집·이용할 수 있습니다. 수집 항목·보유기간·파기 절차는 정식 고지문으로 대체됩니다.",
  },
  {
    key: "agreeBusinessInfo",
    title: "사업자 정보 및 제출서류 확인 동의",
    required: true,
    summary:
      "[임시 안내문] 제출하신 사업자·여행업 등록 정보와 첨부 서류가 사실과 다를 경우 심사가 보류되거나 거절될 수 있습니다. 변경 사항은 관리자에게 알려 주세요.",
  },
  {
    key: "agreePartnershipPolicy",
    title: "제휴여행사 운영정책 동의",
    required: true,
    summary:
      "[임시 안내문] 가입 승인 후 관리자가 상품공유그룹을 별도로 지정합니다. 가입 승인만으로 상품은 자동 공유되지 않습니다. 상품공급여행사가 상품별로 공유 대상을 지정하며, 상대 여행사의 별도 수락 단계는 없습니다. 판매여행사는 공유 상품을 자사 카테고리에 지정하고 노출을 설정해야 판매할 수 있습니다. 공유받은 상품은 다른 여행사에 재공유할 수 없습니다. 원본 상품정보는 판매여행사가 직접 변경할 수 없으며, 기존 예약과 정산 관계는 상품공유 중지 후에도 유지됩니다.",
  },
  {
    key: "agreeEmailGuide",
    title: "제휴 및 상품 안내 수신 동의",
    required: false,
    summary:
      "[임시 안내문] 제휴 운영·상품 안내를 받아보시겠습니까? 원하지 않으면 선택하지 않으셔도 됩니다.",
  },
];

export const REQUIRED_TERM_KEYS = TERM_ITEMS.filter((item) => item.required).map((item) => item.key);
export const OPTIONAL_TERM_KEYS = TERM_ITEMS.filter((item) => !item.required).map((item) => item.key);

export const POLICY_GUIDE_ITEMS = [
  "신청 시 상품공유그룹을 선택하지 않습니다.",
  "가입 승인 후 관리자가 상품공유그룹을 별도로 지정합니다.",
  "가입 승인만으로 상품이 자동 공유되지 않습니다.",
  "상품공급여행사가 상품별로 공유 대상을 지정합니다.",
  "상품공유에 상대 여행사의 별도 수락 단계는 없습니다.",
  "판매여행사는 공유 상품을 자사 카테고리에 지정하고 노출해야 판매할 수 있습니다.",
  "공유받은 상품은 다른 여행사에 재공유할 수 없습니다.",
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

export function areRequiredDocsAttached(form: PartnershipApplyForm) {
  return Boolean(form.businessLicenseFile && form.tourismLicenseFile);
}

export type ApplyFieldErrors = Partial<Record<keyof PartnershipApplyForm, string>>;

export const INITIAL_PARTNERSHIP_APPLY_FORM: PartnershipApplyForm = {
  agencyName: "",
  businessNumber: "",
  ceoName: "",
  tourismLicenseNumber: "",
  tourismLicenseType: "",
  address: "",
  addressDetail: "",
  phone: "",
  homepage: "",
  adminName: "",
  department: "",
  adminPhone: "",
  adminEmail: "",
  adminEmailConfirm: "",
  businessLicenseFile: null,
  tourismLicenseFile: null,
  mailOrderLicenseFile: null,
  otherFiles: [],
  agreeTerms: false,
  agreePrivacy: false,
  agreeBusinessInfo: false,
  agreePartnershipPolicy: false,
  agreeEmailGuide: false,
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
    return url.hostname.includes(".") && !url.hostname.startsWith(".") && !url.hostname.endsWith(".");
  } catch {
    return false;
  }
}

/** 화면 포커스·스크롤용 필드 표시 순서 */
export const APPLY_FIELD_ORDER: (keyof PartnershipApplyForm)[] = [
  "agencyName",
  "businessNumber",
  "ceoName",
  "tourismLicenseNumber",
  "tourismLicenseType",
  "address",
  "addressDetail",
  "phone",
  "homepage",
  "adminName",
  "department",
  "adminPhone",
  "adminEmail",
  "adminEmailConfirm",
  "businessLicenseFile",
  "tourismLicenseFile",
  "mailOrderLicenseFile",
  "otherFiles",
  "agreeTerms",
  "agreePrivacy",
  "agreeBusinessInfo",
  "agreePartnershipPolicy",
  "agreeEmailGuide",
];

function validateAttachedFileField(
  file: File | null,
  emptyMessage: string,
): string | undefined {
  if (!file) return emptyMessage;
  return validateAttachmentFile(file) ?? undefined;
}

/** 단일 페이지 전체 검증. 필드별 오류 메시지를 반환합니다. */
export function validateApplyForm(form: PartnershipApplyForm): ApplyFieldErrors {
  const errors: ApplyFieldErrors = {};

  if (!form.agencyName.trim()) errors.agencyName = "여행사명을 입력해 주세요.";
  if (!form.businessNumber.trim()) errors.businessNumber = "사업자등록번호를 입력해 주세요.";
  else if (!isValidBusinessNumber(form.businessNumber)) {
    errors.businessNumber = "사업자등록번호 형식이 올바르지 않습니다. (예: 000-00-00000)";
  }
  if (!form.ceoName.trim()) errors.ceoName = "대표자명을 입력해 주세요.";
  if (!form.tourismLicenseNumber.trim()) errors.tourismLicenseNumber = "여행업 등록번호를 입력해 주세요.";
  if (!form.tourismLicenseType) errors.tourismLicenseType = "여행업 종류를 선택해 주세요.";
  if (!form.address.trim()) errors.address = "사업장 주소를 입력해 주세요.";
  // addressDetail: 선택 — 필수 검증 없음
  if (!form.phone.trim()) errors.phone = "대표 전화번호를 입력해 주세요.";
  else if (!isValidPhone(form.phone)) errors.phone = "전화번호 형식이 올바르지 않습니다.";
  if (form.homepage.trim() && !isValidHomepageUrl(form.homepage)) {
    errors.homepage = "홈페이지 주소 형식이 올바르지 않습니다. (예: https://example.com)";
  }

  if (!form.adminName.trim()) errors.adminName = "담당자명을 입력해 주세요.";
  if (!form.department.trim()) errors.department = "부서 또는 직책을 입력해 주세요.";
  if (!form.adminPhone.trim()) errors.adminPhone = "휴대전화번호를 입력해 주세요.";
  else if (!isValidPhone(form.adminPhone)) errors.adminPhone = "휴대전화번호 형식이 올바르지 않습니다.";
  if (!form.adminEmail.trim()) errors.adminEmail = "이메일을 입력해 주세요.";
  else if (!isValidEmail(form.adminEmail)) errors.adminEmail = "이메일 형식이 올바르지 않습니다.";
  if (!form.adminEmailConfirm.trim()) errors.adminEmailConfirm = "이메일 확인을 입력해 주세요.";
  else if (!isValidEmail(form.adminEmailConfirm)) {
    errors.adminEmailConfirm = "이메일 확인 형식이 올바르지 않습니다.";
  } else if (form.adminEmail.trim() !== form.adminEmailConfirm.trim()) {
    errors.adminEmailConfirm = "이메일과 이메일 확인이 일치하지 않습니다.";
  }

  const businessLicenseError = validateAttachedFileField(
    form.businessLicenseFile,
    "사업자등록증을 첨부해 주세요.",
  );
  if (businessLicenseError) errors.businessLicenseFile = businessLicenseError;

  const tourismLicenseError = validateAttachedFileField(
    form.tourismLicenseFile,
    "관광사업등록증 또는 여행업등록증을 첨부해 주세요.",
  );
  if (tourismLicenseError) errors.tourismLicenseFile = tourismLicenseError;

  if (form.mailOrderLicenseFile) {
    const mailOrderError = validateAttachmentFile(form.mailOrderLicenseFile);
    if (mailOrderError) errors.mailOrderLicenseFile = mailOrderError;
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

  if (!areRequiredTermsAgreed(form)) {
    errors.agreeTerms = "필수 약관에 모두 동의해 주세요.";
  }

  return errors;
}

export function firstErrorFieldId(errors: ApplyFieldErrors): string | null {
  for (const key of APPLY_FIELD_ORDER) {
    if (errors[key]) return key;
  }
  return null;
}

/** 같은 페이지 하단 요약용 — 민감·첨부 원본은 포함하지 않음 */
export type ApplyFormSummary = {
  agencyName: string;
  businessNumber: string;
  ceoName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  requiredDocsAttached: boolean;
  requiredTermsAgreed: boolean;
};

export function getApplyFormSummary(form: PartnershipApplyForm): ApplyFormSummary {
  return {
    agencyName: form.agencyName.trim(),
    businessNumber: form.businessNumber.trim(),
    ceoName: form.ceoName.trim(),
    contactName: form.adminName.trim(),
    contactPhone: form.adminPhone.trim(),
    contactEmail: form.adminEmail.trim(),
    requiredDocsAttached: areRequiredDocsAttached(form),
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

/**
 * FRONTEND PROTOTYPE ONLY
 * 실제 관리자 시스템·DB·API에 신청 레코드를 만들지 않습니다.
 * 브라우저 sessionStorage에만 임시로 보관되며, 탭을 닫으면 사라질 수 있습니다.
 */
export const PROTOTYPE_APPLY_RECEIPT_STORAGE_KEY = "aos.partnership.apply.prototype.receipt.v2";

export type PrototypeApplyReceipt = {
  /** 프로토타입 표시 — 영구 저장·실서비스 연동 아님 */
  prototype: true;
  applicationNumber: string;
  submittedAt: string;
  status: "승인대기";
  agencyName: string;
  contactEmail: string;
  summary: ApplyFormSummary;
};

export function createPrototypeApplyReceipt(form: PartnershipApplyForm): PrototypeApplyReceipt {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  const summary = getApplyFormSummary(form);
  return {
    prototype: true,
    applicationNumber: `AOS-P-${y}${m}${d}-${rand}`,
    submittedAt: now.toISOString(),
    status: "승인대기",
    agencyName: summary.agencyName,
    contactEmail: summary.contactEmail,
    summary,
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
    if (!parsed?.prototype || !parsed.applicationNumber || !parsed.summary) return null;
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
