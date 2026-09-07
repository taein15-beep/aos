/**
 * 회원관리 · 제휴여행사 가입신청 샘플 데이터 및 프로토타입 로직 (SAMPLE)
 *
 * - API·DB·이메일·계정 생성 연동 없음
 * - 홈페이지 sessionStorage와 키·스키마를 공유하지 않음
 * - 상품공유(수락대기 등) 정책·타입을 import하지 않음
 * - sessionStorage는 브라우저 프로토타입 전용 override 저장소
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type AffiliateApplicationStatus = "승인대기" | "보완요청" | "승인완료" | "가입거절";

export type AffiliatePartnershipStatus = "미활성" | "활성" | "거래중지" | "관계종료";

export type AffiliateDocumentSubmitState = "제출" | "미제출";

export type AffiliateDocumentReviewState = "미검토" | "확인완료" | "보완필요";

export type AffiliateHistoryAction =
  | "가입신청 접수"
  | "보완요청"
  | "보완 확인"
  | "가입승인"
  | "가입거절"
  | "상품공유그룹 변경";

export type AffiliateDocumentKey =
  | "businessLicenseFile"
  | "tourismLicenseFile"
  | "mailOrderLicenseFile";

export type AffiliateTermKey =
  | "agreeTerms"
  | "agreePrivacy"
  | "agreeBusinessInfo"
  | "agreePartnershipPolicy"
  | "agreeEmailGuide";

export type AffiliateTourismLicenseType = "종합여행업" | "국내외여행업" | "국내여행업";

export type AffiliateShareGroup = "동북아 상품공유" | "국내 기차 제휴" | "수도권 판매 제휴";

export type AffiliateSupplementItem =
  | "여행사 기본정보"
  | "담당자 정보"
  | "사업자등록증"
  | "관광사업등록증"
  | "통신판매업 신고증"
  | "필수약관"
  | "기타";

export type AffiliateDocumentItem = {
  key: AffiliateDocumentKey;
  label: string;
  required: boolean;
  fileName: string | null;
  submitState: AffiliateDocumentSubmitState;
  reviewState: AffiliateDocumentReviewState;
  reviewNote: string;
  submittedAt: string | null;
};

export type AffiliateTermItem = {
  key: AffiliateTermKey;
  title: string;
  required: boolean;
  agreed: boolean;
  agreedAt: string | null;
};

export type AffiliateSupplementRequest = {
  items: AffiliateSupplementItem[];
  reason: string;
  guideNote: string;
  requestedAt: string;
  actor: string;
};

export type AffiliateRejectionInfo = {
  reason: string;
  guideNote: string;
  rejectedAt: string;
  actor: string;
};

export type AffiliateProcessHistoryItem = {
  id: string;
  processedAt: string;
  action: AffiliateHistoryAction;
  statusBefore: AffiliateApplicationStatus | null;
  statusAfter: AffiliateApplicationStatus | null;
  actor: string;
  note: string;
  groupsBefore?: string[];
  groupsAfter?: string[];
};

export type AffiliateApplication = {
  applicationId: string;
  applicationNumber: string;
  /** 승인 전 null, 승인 후 AFF-### (agencyCode와 동일 의미) */
  affiliateAgencyId: string | null;
  appliedAt: string;
  updatedAt: string;
  processedAt: string | null;
  approvedAt: string | null;
  processedBy: string | null;
  applicationStatus: AffiliateApplicationStatus;
  partnershipStatus: AffiliatePartnershipStatus;
  shareGroups: AffiliateShareGroup[];
  agencyName: string;
  businessNumber: string;
  ceoName: string;
  tourismLicenseNumber: string;
  tourismLicenseType: AffiliateTourismLicenseType | "";
  address: string;
  addressDetail: string;
  phone: string;
  homepage: string;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  contactEmail: string;
  documents: AffiliateDocumentItem[];
  terms: AffiliateTermItem[];
  adminMemo: string;
  memoUpdatedAt: string | null;
  latestSupplement: AffiliateSupplementRequest | null;
  latestRejection: AffiliateRejectionInfo | null;
  approvalMemo: string | null;
  history: AffiliateProcessHistoryItem[];
};

export type AffiliateListFilters = {
  keyword: string;
  applicationStatus: AffiliateApplicationStatus | "전체";
  partnershipStatus: AffiliatePartnershipStatus | "전체";
  appliedFrom: string;
  appliedTo: string;
};

export type AffiliateListTotals = {
  total: number;
  pending: number;
  supplement: number;
};

export type AffiliateApprovalCheck = {
  canApprove: boolean;
  reasons: string[];
  issueKeys: string[];
};

export type AffiliateMutationSuccess = {
  ok: true;
  application: AffiliateApplication;
  message: string;
};

export type AffiliateMutationFailure = {
  ok: false;
  application: AffiliateApplication;
  message: string;
  reasons?: string[];
};

export type AffiliateMutationResult = AffiliateMutationSuccess | AffiliateMutationFailure;

export type AffiliateFilterSuccess = {
  ok: true;
  rows: AffiliateApplication[];
};

export type AffiliateFilterFailure = {
  ok: false;
  rows: AffiliateApplication[];
  message: string;
};

export type AffiliateFilterResult = AffiliateFilterSuccess | AffiliateFilterFailure;

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

export const AFFILIATE_APPLICATION_STATUS_OPTIONS = [
  "전체",
  "승인대기",
  "보완요청",
  "승인완료",
  "가입거절",
] as const;

export const AFFILIATE_PARTNERSHIP_STATUS_OPTIONS = [
  "전체",
  "미활성",
  "활성",
  "거래중지",
  "관계종료",
] as const;

/** 상품공유 화면과 동일한 그룹명 (필터용 '전체' 제외) */
export const AFFILIATE_SHARE_GROUP_CANDIDATES = [
  "동북아 상품공유",
  "국내 기차 제휴",
  "수도권 판매 제휴",
] as const satisfies readonly AffiliateShareGroup[];

export const AFFILIATE_SUPPLEMENT_ITEM_OPTIONS = [
  "여행사 기본정보",
  "담당자 정보",
  "사업자등록증",
  "관광사업등록증",
  "통신판매업 신고증",
  "필수약관",
  "기타",
] as const satisfies readonly AffiliateSupplementItem[];

export const AFFILIATE_DOCUMENT_SLOTS: ReadonlyArray<{
  key: AffiliateDocumentKey;
  label: string;
  required: boolean;
}> = [
  { key: "businessLicenseFile", label: "사업자등록증", required: true },
  { key: "tourismLicenseFile", label: "관광사업등록증 또는 여행업등록증", required: true },
  { key: "mailOrderLicenseFile", label: "통신판매업 신고증", required: false },
];

export const AFFILIATE_TERM_SLOTS: ReadonlyArray<{
  key: AffiliateTermKey;
  title: string;
  required: boolean;
}> = [
  { key: "agreeTerms", title: "서비스 이용약관", required: true },
  { key: "agreePrivacy", title: "개인정보 수집·이용 동의", required: true },
  { key: "agreeBusinessInfo", title: "사업자 정보 및 제출서류 확인 동의", required: true },
  { key: "agreePartnershipPolicy", title: "제휴여행사 운영정책 동의", required: true },
  { key: "agreeEmailGuide", title: "제휴 및 상품 안내 메일 수신", required: false },
];

export const AFFILIATE_LIST_PAGE_SIZE = 8;

export const AFFILIATE_ADMIN_MEMO_MAX_LENGTH = 1000;

export const AFFILIATE_DEFAULT_PROCESSOR = "장윤호";

/** 프로토타입 sessionStorage 키 — 홈페이지 receipt 키와 분리 */
export const AFFILIATE_PROTOTYPE_STORAGE_KEY = "aos.admin.members.affiliates.prototype.v1";

export const AFFILIATE_GROUP_POLICY_NOTICE =
  "상품공유그룹을 지정해도 상품이 자동으로 공유되지 않습니다. 상품공급여행사가 상품별로 공유 대상을 지정해야 하며, 상대 여행사의 별도 수락 단계는 없습니다.";

export const AFFILIATE_APPROVAL_POLICY_NOTES = [
  "승인 후 제휴관계가 활성화됩니다.",
  "상품공유그룹은 자동 지정되지 않습니다.",
  "가입 승인만으로 상품이 자동 공유되지 않습니다.",
  "상품공급여행사가 상품별로 공유 대상을 지정합니다.",
  "상품공유에 상대 여행사의 별도 수락 단계는 없습니다.",
] as const;

export const AFFILIATE_REJECTION_POLICY_NOTES = [
  "제휴관계는 활성화되지 않습니다.",
  "상품공유그룹은 지정되지 않습니다.",
  "상품은 공유되지 않습니다.",
  "가입거절 후 이 화면에서 승인상태로 되돌릴 수 없습니다.",
  "실제 이메일은 발송되지 않습니다.",
] as const;

/** 심사 처리 성공/실패 알림 문구 — 이메일 발송 완료처럼 표현하지 않는다. */
export const AFFILIATE_REVIEW_MESSAGES = {
  approveSuccess: "제휴여행사 가입이 승인되었습니다.",
  supplementSuccess: "가입신청 보완을 요청했습니다.",
  supplementRerequestSuccess: "가입신청 보완을 다시 요청했습니다.",
  confirmSupplementSuccess: "보완 완료를 확인했습니다. 가입승인을 별도로 진행해 주세요.",
  rejectSuccess: "제휴여행사 가입신청이 거절 처리되었습니다.",
  saveFailed: "처리 결과를 저장하지 못했습니다. 화면 상태는 변경되지 않았습니다.",
  invalidTransition: "허용되지 않은 상태 전환입니다.",
  approveBlocked: "승인 전 확인이 필요합니다.",
  supplementIncomplete: "보완 완료를 확인할 수 없습니다.",
} as const;

export const EMPTY_AFFILIATE_LIST_FILTERS: AffiliateListFilters = {
  keyword: "",
  applicationStatus: "전체",
  partnershipStatus: "전체",
  appliedFrom: "",
  appliedTo: "",
};

const STORAGE_SCHEMA_VERSION = 1 as const;
const MIN_NEXT_AFFILIATE_AGENCY_ID = 103;

const SUPPLEMENT_ITEM_TO_DOCUMENT_KEY: Partial<Record<AffiliateSupplementItem, AffiliateDocumentKey>> = {
  "사업자등록증": "businessLicenseFile",
  "관광사업등록증": "tourismLicenseFile",
  "통신판매업 신고증": "mailOrderLicenseFile",
};

const ALLOWED_APPLICATION_TRANSITIONS: ReadonlyArray<
  readonly [AffiliateApplicationStatus, AffiliateApplicationStatus]
> = [
  ["승인대기", "승인완료"],
  ["승인대기", "보완요청"],
  ["승인대기", "가입거절"],
  ["보완요청", "승인대기"],
  ["보완요청", "가입거절"],
];

/* -------------------------------------------------------------------------- */
/* Pure helpers — clone / format                                              */
/* -------------------------------------------------------------------------- */

function cloneApplication(application: AffiliateApplication): AffiliateApplication {
  return {
    ...application,
    shareGroups: [...application.shareGroups],
    documents: application.documents.map((doc) => ({ ...doc })),
    terms: application.terms.map((term) => ({ ...term })),
    latestSupplement: application.latestSupplement
      ? { ...application.latestSupplement, items: [...application.latestSupplement.items] }
      : null,
    latestRejection: application.latestRejection ? { ...application.latestRejection } : null,
    history: application.history.map((item) => ({
      ...item,
      groupsBefore: item.groupsBefore ? [...item.groupsBefore] : undefined,
      groupsAfter: item.groupsAfter ? [...item.groupsAfter] : undefined,
    })),
  };
}

function cloneSeedList(list: readonly AffiliateApplication[]): AffiliateApplication[] {
  return list.map((item) => cloneApplication(item));
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function trimText(value: string) {
  return value.trim();
}

function isBlank(value: string) {
  return trimText(value).length === 0;
}

function appliedDateKey(isoOrDate: string) {
  if (!isoOrDate) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate;
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function createHistoryId(prefix: string, at: string) {
  const stamp = at.replace(/\D/g, "").slice(0, 14) || "0";
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `AH-${prefix}-${stamp}-${rand}`;
}

function appendHistory(
  history: AffiliateProcessHistoryItem[],
  item: AffiliateProcessHistoryItem,
): AffiliateProcessHistoryItem[] {
  return [...history, item];
}

function sameStringArray(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function fail(
  application: AffiliateApplication,
  message: string,
  reasons?: string[],
): AffiliateMutationFailure {
  return {
    ok: false,
    application: cloneApplication(application),
    message,
    reasons: reasons && reasons.length > 0 ? [...reasons] : undefined,
  };
}

function succeed(application: AffiliateApplication, message: string): AffiliateMutationSuccess {
  return { ok: true, application: cloneApplication(application), message };
}

/* -------------------------------------------------------------------------- */
/* Masking / badges / groups                                                  */
/* -------------------------------------------------------------------------- */

export function maskAffiliateBusinessNumber(value: string) {
  const digits = digitsOnly(value);
  if (digits.length !== 10) return value.trim() || "—";
  return `${digits.slice(0, 3)}-**-*****`;
}

export function maskAffiliateMobilePhone(value: string) {
  const digits = digitsOnly(value);
  if (digits.length < 10) return value.trim() || "—";
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-***-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
}

export function maskAffiliateEmail(value: string) {
  const trimmed = value.trim();
  if (!trimmed.includes("@")) return trimmed || "—";
  const [local, domain] = trimmed.split("@");
  if (!local || !domain) return trimmed;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

export function affiliateApplicationStatusBadgeClass(status: AffiliateApplicationStatus) {
  if (status === "승인대기") return "warn";
  if (status === "보완요청") return "info";
  if (status === "승인완료") return "success";
  return "danger";
}

export function affiliatePartnershipStatusBadgeClass(status: AffiliatePartnershipStatus) {
  if (status === "활성") return "success";
  if (status === "거래중지") return "warn";
  return "info";
}

export function affiliateDocumentSubmitBadgeClass(state: AffiliateDocumentSubmitState) {
  return state === "제출" ? "success" : "warn";
}

export function affiliateDocumentReviewBadgeClass(state: AffiliateDocumentReviewState) {
  if (state === "확인완료") return "success";
  if (state === "보완필요") return "danger";
  return "warn";
}

export function normalizeAffiliateShareGroups(groups: readonly string[]): {
  ok: true;
  groups: AffiliateShareGroup[];
} | {
  ok: false;
  message: string;
} {
  const unknown = groups.filter(
    (group) => !(AFFILIATE_SHARE_GROUP_CANDIDATES as readonly string[]).includes(group),
  );
  if (unknown.length > 0) {
    return { ok: false, message: `허용되지 않은 상품공유그룹이 있습니다: ${unknown.join(", ")}` };
  }
  const unique = [...new Set(groups)] as AffiliateShareGroup[];
  const ordered = AFFILIATE_SHARE_GROUP_CANDIDATES.filter((candidate) => unique.includes(candidate));
  return { ok: true, groups: ordered };
}

export function formatAffiliateShareGroupsLabel(groups: readonly string[]) {
  if (groups.length === 0) return "미지정";
  if (groups.length === 1) return groups[0] ?? "미지정";
  const first = groups[0] ?? "";
  return `${first} 외 ${groups.length - 1}개`;
}

export function isAffiliateApplicationTransitionAllowed(
  from: AffiliateApplicationStatus,
  to: AffiliateApplicationStatus,
) {
  return ALLOWED_APPLICATION_TRANSITIONS.some(([start, end]) => start === from && end === to);
}

/* -------------------------------------------------------------------------- */
/* Document / term builders                                                   */
/* -------------------------------------------------------------------------- */

function buildDocuments(
  overrides: Partial<Record<AffiliateDocumentKey, Partial<AffiliateDocumentItem>>>,
): AffiliateDocumentItem[] {
  return AFFILIATE_DOCUMENT_SLOTS.map((slot) => {
    const patch = overrides[slot.key] ?? {};
    const submitState = patch.submitState ?? (patch.fileName ? "제출" : "미제출");
    return {
      key: slot.key,
      label: slot.label,
      required: slot.required,
      fileName: patch.fileName ?? null,
      submitState,
      reviewState: patch.reviewState ?? (submitState === "제출" ? "미검토" : "미검토"),
      reviewNote: patch.reviewNote ?? "",
      submittedAt: patch.submittedAt ?? null,
    };
  });
}

function buildTerms(
  agreedAt: string,
  overrides?: Partial<Record<AffiliateTermKey, Partial<AffiliateTermItem>>>,
): AffiliateTermItem[] {
  return AFFILIATE_TERM_SLOTS.map((slot) => {
    const patch = overrides?.[slot.key] ?? {};
    const agreed = patch.agreed ?? slot.required;
    return {
      key: slot.key,
      title: slot.title,
      required: slot.required,
      agreed,
      agreedAt: agreed ? (patch.agreedAt ?? agreedAt) : null,
    };
  });
}

function receiptHistory(
  id: string,
  at: string,
  actor = "신청자",
): AffiliateProcessHistoryItem {
  return {
    id,
    processedAt: at,
    action: "가입신청 접수",
    statusBefore: null,
    statusAfter: "승인대기",
    actor,
    note: "홈페이지 제휴여행사 가입신청 접수(샘플)",
  };
}

/* -------------------------------------------------------------------------- */
/* Approval eligibility                                                       */
/* -------------------------------------------------------------------------- */

export function getAffiliateApprovalCheck(application: AffiliateApplication): AffiliateApprovalCheck {
  const reasons: string[] = [];
  const issueKeys: string[] = [];

  // 승인 가능: 승인대기 + 필수 여행사/담당자 + 필수서류(제출·파일명·확인완료) + 필수약관 동의
  // 비방해: 상품공유그룹 미지정, 선택 통신판매업 신고증 미제출
  if (application.applicationStatus !== "승인대기") {
    reasons.push("가입신청 상태가 승인대기가 아닙니다.");
    issueKeys.push("applicationStatus");
  }

  if (isBlank(application.agencyName)) {
    reasons.push("여행사명을 확인해 주세요.");
    issueKeys.push("agencyName");
  }
  if (digitsOnly(application.businessNumber).length !== 10) {
    reasons.push("사업자등록번호가 올바르지 않습니다.");
    issueKeys.push("businessNumber");
  }
  if (isBlank(application.ceoName)) {
    reasons.push("대표자명을 확인해 주세요.");
    issueKeys.push("ceoName");
  }
  if (isBlank(application.tourismLicenseNumber)) {
    reasons.push("여행업 등록번호를 확인해 주세요.");
    issueKeys.push("tourismLicenseNumber");
  }
  if (!application.tourismLicenseType) {
    reasons.push("여행업 종류를 확인해 주세요.");
    issueKeys.push("tourismLicenseType");
  }
  if (isBlank(application.address)) {
    reasons.push("사업장 주소를 확인해 주세요.");
    issueKeys.push("address");
  }

  if (isBlank(application.contactName)) {
    reasons.push("담당자명을 확인해 주세요.");
    issueKeys.push("contactName");
  }
  if (digitsOnly(application.contactPhone).length < 10) {
    reasons.push("담당자 휴대전화번호를 확인해 주세요.");
    issueKeys.push("contactPhone");
  }
  if (!application.contactEmail.includes("@")) {
    reasons.push("담당자 이메일을 확인해 주세요.");
    issueKeys.push("contactEmail");
  }

  for (const doc of application.documents) {
    if (!doc.required) continue;
    if (doc.submitState !== "제출" || !doc.fileName) {
      reasons.push(`${doc.label}이(가) 제출되지 않았습니다.`);
      issueKeys.push(doc.key);
      continue;
    }
    if (doc.reviewState === "미검토") {
      reasons.push(`${doc.label} 검토가 완료되지 않았습니다.`);
      issueKeys.push(doc.key);
    }
    if (doc.reviewState === "보완필요") {
      reasons.push(`${doc.label}이(가) 보완필요 상태입니다.`);
      issueKeys.push(doc.key);
    }
  }

  for (const term of application.terms) {
    if (!term.required) continue;
    if (!term.agreed) {
      reasons.push(`${term.title}에 동의되지 않았습니다.`);
      issueKeys.push(term.key);
    }
  }

  return {
    canApprove: reasons.length === 0,
    reasons,
    issueKeys: [...new Set(issueKeys)],
  };
}

export function getAffiliateSupplementReadyCheck(application: AffiliateApplication): AffiliateApprovalCheck {
  const base = getAffiliateApprovalCheck({
    ...application,
    applicationStatus: "승인대기",
  });
  const reasons = base.reasons.filter((reason) => reason !== "가입신청 상태가 승인대기가 아닙니다.");
  return {
    canApprove: reasons.length === 0,
    reasons,
    issueKeys: base.issueKeys.filter((key) => key !== "applicationStatus"),
  };
}

const APPROVAL_AGENCY_ISSUE_KEYS = new Set([
  "agencyName",
  "businessNumber",
  "ceoName",
  "tourismLicenseNumber",
  "tourismLicenseType",
  "address",
]);
const APPROVAL_CONTACT_ISSUE_KEYS = new Set(["contactName", "contactPhone", "contactEmail"]);
const APPROVAL_TERM_ISSUE_KEYS = new Set(
  AFFILIATE_TERM_SLOTS.filter((slot) => slot.required).map((slot) => slot.key),
);

export type AffiliateDetailApprovalDiagnosis = {
  visible: boolean;
  canApprove: boolean;
  categories: string[];
  reasons: string[];
};

/** 상세 읽기 전용: 승인대기·보완요청의 승인 가능 진단 */
export function getAffiliateDetailApprovalDiagnosis(
  application: AffiliateApplication,
): AffiliateDetailApprovalDiagnosis {
  if (application.applicationStatus !== "승인대기" && application.applicationStatus !== "보완요청") {
    return { visible: false, canApprove: false, categories: [], reasons: [] };
  }

  const check =
    application.applicationStatus === "보완요청"
      ? getAffiliateSupplementReadyCheck(application)
      : getAffiliateApprovalCheck(application);

  if (check.canApprove) {
    return { visible: true, canApprove: true, categories: [], reasons: [] };
  }

  const keys = new Set(check.issueKeys);
  const categories: string[] = [];

  if ([...keys].some((key) => APPROVAL_AGENCY_ISSUE_KEYS.has(key))) {
    categories.push("필수 여행사 정보 누락");
  }
  if ([...keys].some((key) => APPROVAL_CONTACT_ISSUE_KEYS.has(key))) {
    categories.push("필수 담당자 정보 누락");
  }

  for (const doc of application.documents) {
    if (!doc.required || !keys.has(doc.key)) continue;
    if (doc.submitState !== "제출" || !doc.fileName) {
      if (!categories.includes("필수서류 미제출")) categories.push("필수서류 미제출");
    } else if (doc.reviewState === "미검토") {
      if (!categories.includes("필수서류 미검토")) categories.push("필수서류 미검토");
    } else if (doc.reviewState === "보완필요") {
      if (!categories.includes("필수서류 보완필요")) categories.push("필수서류 보완필요");
    }
  }

  if ([...keys].some((key) => APPROVAL_TERM_ISSUE_KEYS.has(key as AffiliateTermKey))) {
    categories.push("필수약관 미동의");
  }

  return {
    visible: true,
    canApprove: false,
    categories,
    reasons: [...check.reasons],
  };
}

export type AffiliateSupplementConfirmDiagnosis = {
  canConfirm: boolean;
  categories: string[];
  reasons: string[];
};

/** 보완 확인 버튼용: 미완료 시 모달에 표시할 카테고리 */
export function getAffiliateSupplementConfirmDiagnosis(
  application: AffiliateApplication,
): AffiliateSupplementConfirmDiagnosis {
  const check = getAffiliateSupplementReadyCheck(application);
  if (check.canApprove) {
    return { canConfirm: true, categories: [], reasons: [] };
  }

  const keys = new Set(check.issueKeys);
  const categories: string[] = [];

  if (
    [...keys].some((key) => APPROVAL_AGENCY_ISSUE_KEYS.has(key) || APPROVAL_CONTACT_ISSUE_KEYS.has(key))
  ) {
    categories.push("남아 있는 필수정보 문제");
  }

  for (const doc of application.documents) {
    if (!doc.required || !keys.has(doc.key)) continue;
    if (doc.submitState !== "제출" || !doc.fileName) {
      if (!categories.includes("미제출 필수서류")) categories.push("미제출 필수서류");
    } else if (doc.reviewState === "미검토") {
      if (!categories.includes("미검토 필수서류")) categories.push("미검토 필수서류");
    } else if (doc.reviewState === "보완필요") {
      if (!categories.includes("보완필요 서류")) categories.push("보완필요 서류");
    }
  }

  if ([...keys].some((key) => APPROVAL_TERM_ISSUE_KEYS.has(key as AffiliateTermKey))) {
    categories.push("미동의 필수약관");
  }

  return {
    canConfirm: false,
    categories,
    reasons: [...check.reasons],
  };
}

/* -------------------------------------------------------------------------- */
/* AFF id allocation                                                          */
/* -------------------------------------------------------------------------- */

export function parseAffiliateAgencyNumber(id: string | null | undefined) {
  if (!id) return null;
  const match = /^AFF-(\d+)$/i.exec(id.trim());
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : null;
}

export function allocateNextAffiliateAgencyId(
  applications: readonly AffiliateApplication[],
  extraIds: readonly string[] = [],
) {
  let max = MIN_NEXT_AFFILIATE_AGENCY_ID - 1;
  for (const row of applications) {
    const num = parseAffiliateAgencyNumber(row.affiliateAgencyId);
    if (num != null && num > max) max = num;
  }
  for (const id of extraIds) {
    const num = parseAffiliateAgencyNumber(id);
    if (num != null && num > max) max = num;
  }
  const next = Math.max(max + 1, MIN_NEXT_AFFILIATE_AGENCY_ID);
  return `AFF-${String(next).padStart(3, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export function approveAffiliateApplication(params: {
  application: AffiliateApplication;
  approvalMemo?: string;
  actor?: string;
  processedAt?: string;
  allApplications?: readonly AffiliateApplication[];
}): AffiliateMutationResult {
  const application = params.application;
  const actor = params.actor?.trim() || AFFILIATE_DEFAULT_PROCESSOR;
  const processedAt = params.processedAt ?? new Date().toISOString();
  const memo = trimText(params.approvalMemo ?? "");

  if (application.applicationStatus !== "승인대기") {
    return fail(application, "승인대기 상태의 신청만 승인할 수 있습니다.", [
      `현재 상태: ${application.applicationStatus}`,
    ]);
  }

  if (!isAffiliateApplicationTransitionAllowed(application.applicationStatus, "승인완료")) {
    return fail(application, AFFILIATE_REVIEW_MESSAGES.invalidTransition);
  }

  const check = getAffiliateApprovalCheck(application);
  if (!check.canApprove) {
    return fail(application, "승인 조건을 충족하지 않습니다.", check.reasons);
  }

  const catalog = params.allApplications ?? [application];
  const affiliateAgencyId = allocateNextAffiliateAgencyId(catalog);
  const next: AffiliateApplication = {
    ...cloneApplication(application),
    applicationStatus: "승인완료",
    partnershipStatus: "활성",
    affiliateAgencyId,
    shareGroups: [],
    approvedAt: processedAt,
    processedAt,
    updatedAt: processedAt,
    processedBy: actor,
    approvalMemo: memo || null,
    history: appendHistory(application.history, {
      id: createHistoryId(application.applicationId, processedAt),
      processedAt,
      action: "가입승인",
      statusBefore: application.applicationStatus,
      statusAfter: "승인완료",
      actor,
      note: memo || "제휴여행사 가입 승인",
    }),
  };

  return succeed(next, AFFILIATE_REVIEW_MESSAGES.approveSuccess);
}

export function requestAffiliateSupplement(params: {
  application: AffiliateApplication;
  items: readonly string[];
  reason: string;
  guideNote?: string;
  actor?: string;
  processedAt?: string;
}): AffiliateMutationResult {
  const application = params.application;
  const actor = params.actor?.trim() || AFFILIATE_DEFAULT_PROCESSOR;
  const processedAt = params.processedAt ?? new Date().toISOString();
  const reason = trimText(params.reason);
  const guideNote = trimText(params.guideNote ?? "");

  if (
    application.applicationStatus !== "승인대기" &&
    application.applicationStatus !== "보완요청"
  ) {
    return fail(application, "승인대기 또는 보완요청 상태의 신청만 보완요청할 수 있습니다.");
  }

  if (!isAffiliateApplicationTransitionAllowed(application.applicationStatus, "보완요청") &&
      application.applicationStatus !== "보완요청") {
    return fail(application, AFFILIATE_REVIEW_MESSAGES.invalidTransition);
  }

  if (params.items.length === 0) {
    return fail(application, "보완 항목을 1개 이상 선택해 주세요.");
  }

  const invalidItems = params.items.filter(
    (item) => !(AFFILIATE_SUPPLEMENT_ITEM_OPTIONS as readonly string[]).includes(item),
  );
  if (invalidItems.length > 0) {
    return fail(application, "허용되지 않은 보완 항목이 있습니다.", invalidItems);
  }

  if (isBlank(reason)) {
    return fail(application, "보완요청 사유를 입력해 주세요.");
  }

  const items = [...new Set(params.items)] as AffiliateSupplementItem[];
  const documents = application.documents.map((doc) => {
    const matched = items.some((item) => SUPPLEMENT_ITEM_TO_DOCUMENT_KEY[item] === doc.key);
    if (!matched) return { ...doc };
    return {
      ...doc,
      reviewState: "보완필요" as const,
      reviewNote: reason,
    };
  });

  const next: AffiliateApplication = {
    ...cloneApplication(application),
    applicationStatus: "보완요청",
    partnershipStatus: "미활성",
    affiliateAgencyId: null,
    shareGroups: [],
    documents,
    latestSupplement: {
      items,
      reason,
      guideNote,
      requestedAt: processedAt,
      actor,
    },
    processedAt,
    updatedAt: processedAt,
    processedBy: actor,
    history: appendHistory(application.history, {
      id: createHistoryId(application.applicationId, processedAt),
      processedAt,
      action: "보완요청",
      statusBefore: application.applicationStatus,
      statusAfter: "보완요청",
      actor,
      note: `${reason} (항목: ${items.join(", ")})`,
    }),
  };

  return succeed(
    next,
    application.applicationStatus === "보완요청"
      ? AFFILIATE_REVIEW_MESSAGES.supplementRerequestSuccess
      : AFFILIATE_REVIEW_MESSAGES.supplementSuccess,
  );
}

export function confirmAffiliateSupplement(params: {
  application: AffiliateApplication;
  actor?: string;
  processedAt?: string;
}): AffiliateMutationResult {
  const application = params.application;
  const actor = params.actor?.trim() || AFFILIATE_DEFAULT_PROCESSOR;
  const processedAt = params.processedAt ?? new Date().toISOString();

  if (application.applicationStatus !== "보완요청") {
    return fail(application, "보완요청 상태의 신청만 보완 확인할 수 있습니다.");
  }

  if (!isAffiliateApplicationTransitionAllowed("보완요청", "승인대기")) {
    return fail(application, AFFILIATE_REVIEW_MESSAGES.invalidTransition);
  }

  const ready = getAffiliateSupplementReadyCheck(application);
  if (!ready.canApprove) {
    return fail(application, "보완이 아직 완료되지 않았습니다.", ready.reasons);
  }

  const next: AffiliateApplication = {
    ...cloneApplication(application),
    applicationStatus: "승인대기",
    partnershipStatus: "미활성",
    affiliateAgencyId: null,
    shareGroups: [],
    processedAt,
    updatedAt: processedAt,
    processedBy: actor,
    history: appendHistory(application.history, {
      id: createHistoryId(application.applicationId, processedAt),
      processedAt,
      action: "보완 확인",
      statusBefore: "보완요청",
      statusAfter: "승인대기",
      actor,
      note: "보완 내용 확인 완료. 승인대기 상태로 복귀",
    }),
  };

  return succeed(next, AFFILIATE_REVIEW_MESSAGES.confirmSupplementSuccess);
}

export function rejectAffiliateApplication(params: {
  application: AffiliateApplication;
  reason: string;
  guideNote?: string;
  actor?: string;
  processedAt?: string;
}): AffiliateMutationResult {
  const application = params.application;
  const actor = params.actor?.trim() || AFFILIATE_DEFAULT_PROCESSOR;
  const processedAt = params.processedAt ?? new Date().toISOString();
  const reason = trimText(params.reason);
  const guideNote = trimText(params.guideNote ?? "");

  if (
    application.applicationStatus !== "승인대기" &&
    application.applicationStatus !== "보완요청"
  ) {
    return fail(application, "승인대기 또는 보완요청 상태의 신청만 거절할 수 있습니다.");
  }

  if (!isAffiliateApplicationTransitionAllowed(application.applicationStatus, "가입거절")) {
    return fail(application, AFFILIATE_REVIEW_MESSAGES.invalidTransition);
  }

  if (isBlank(reason)) {
    return fail(application, "거절 사유를 입력해 주세요.");
  }

  const next: AffiliateApplication = {
    ...cloneApplication(application),
    applicationStatus: "가입거절",
    partnershipStatus: "미활성",
    affiliateAgencyId: null,
    shareGroups: [],
    latestRejection: {
      reason,
      guideNote,
      rejectedAt: processedAt,
      actor,
    },
    processedAt,
    updatedAt: processedAt,
    processedBy: actor,
    history: appendHistory(application.history, {
      id: createHistoryId(application.applicationId, processedAt),
      processedAt,
      action: "가입거절",
      statusBefore: application.applicationStatus,
      statusAfter: "가입거절",
      actor,
      note: reason,
    }),
  };

  return succeed(next, AFFILIATE_REVIEW_MESSAGES.rejectSuccess);
}

export function saveAffiliateAdminMemo(params: {
  application: AffiliateApplication;
  memo: string;
  savedAt?: string;
}): AffiliateMutationResult {
  const application = params.application;
  const savedAt = params.savedAt ?? new Date().toISOString();
  const memo = params.memo.trim();

  if (memo.length > AFFILIATE_ADMIN_MEMO_MAX_LENGTH) {
    return fail(application, `관리자 메모는 최대 ${AFFILIATE_ADMIN_MEMO_MAX_LENGTH}자까지 입력할 수 있습니다.`);
  }

  const next: AffiliateApplication = {
    ...cloneApplication(application),
    adminMemo: memo,
    memoUpdatedAt: savedAt,
    updatedAt: savedAt,
  };

  return succeed(next, memo ? "관리자 메모를 저장했습니다." : "관리자 메모를 비웠습니다.");
}

export function saveAffiliateShareGroups(params: {
  application: AffiliateApplication;
  groups: readonly string[];
  actor?: string;
  processedAt?: string;
}): AffiliateMutationResult {
  const application = params.application;
  const actor = params.actor?.trim() || AFFILIATE_DEFAULT_PROCESSOR;
  const processedAt = params.processedAt ?? new Date().toISOString();

  if (application.applicationStatus !== "승인완료") {
    return fail(application, "승인완료된 신청만 상품공유그룹을 지정할 수 있습니다.");
  }
  if (application.partnershipStatus !== "활성") {
    return fail(application, "제휴관계가 활성인 경우에만 상품공유그룹을 지정할 수 있습니다.");
  }
  if (!application.affiliateAgencyId) {
    return fail(application, "제휴여행사 코드가 없어 상품공유그룹을 지정할 수 없습니다.");
  }

  const normalized = normalizeAffiliateShareGroups(params.groups);
  if (!normalized.ok) {
    return fail(application, normalized.message);
  }

  if (sameStringArray(application.shareGroups, normalized.groups)) {
    return succeed(cloneApplication(application), "변경된 상품공유그룹이 없습니다.");
  }

  const before = [...application.shareGroups];
  const next: AffiliateApplication = {
    ...cloneApplication(application),
    shareGroups: normalized.groups,
    updatedAt: processedAt,
    processedBy: actor,
    history: appendHistory(application.history, {
      id: createHistoryId(application.applicationId, processedAt),
      processedAt,
      action: "상품공유그룹 변경",
      statusBefore: application.applicationStatus,
      statusAfter: application.applicationStatus,
      actor,
      note: `${formatAffiliateShareGroupsLabel(before)} → ${formatAffiliateShareGroupsLabel(normalized.groups)}`,
      groupsBefore: before,
      groupsAfter: [...normalized.groups],
    }),
  };

  return succeed(next, "상품공유그룹을 저장했습니다. 상품이 자동 공유되지 않습니다.");
}

/* -------------------------------------------------------------------------- */
/* List filter / pagination / totals                                          */
/* -------------------------------------------------------------------------- */

export function filterAffiliateApplications(
  applications: readonly AffiliateApplication[],
  filters: AffiliateListFilters,
): AffiliateFilterResult {
  const keyword = filters.keyword.trim();
  const from = filters.appliedFrom.trim();
  const to = filters.appliedTo.trim();

  if (from && to && from > to) {
    return {
      ok: false,
      rows: [],
      message: "신청 시작일이 종료일보다 늦을 수 없습니다.",
    };
  }

  const keywordLower = keyword.toLowerCase();
  const keywordDigits = digitsOnly(keyword);

  const rows = applications
    .filter((row) => {
      if (filters.applicationStatus !== "전체" && row.applicationStatus !== filters.applicationStatus) {
        return false;
      }
      if (filters.partnershipStatus !== "전체" && row.partnershipStatus !== filters.partnershipStatus) {
        return false;
      }

      const day = appliedDateKey(row.appliedAt);
      if (from && day && day < from) return false;
      if (to && day && day > to) return false;

      if (!keyword) return true;

      const haystack = [
        row.agencyName,
        row.applicationNumber,
        row.affiliateAgencyId ?? "",
        row.contactName,
      ]
        .join(" ")
        .toLowerCase();

      if (haystack.includes(keywordLower)) return true;
      // 문자(영문·한글)가 포함된 검색어는 제휴코드 등과 혼동되지 않게 사업자번호 숫자 부분일치 제외
      const keywordIsBizLike = Boolean(keywordDigits) && !/[a-zA-Z가-힣]/.test(keyword);
      if (keywordIsBizLike && digitsOnly(row.businessNumber).includes(keywordDigits)) return true;
      return false;
    })
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.appliedAt).getTime();
      const bTime = new Date(b.appliedAt).getTime();
      const aSafe = Number.isNaN(aTime) ? 0 : aTime;
      const bSafe = Number.isNaN(bTime) ? 0 : bTime;
      if (bSafe !== aSafe) return bSafe - aSafe;
      return b.applicationId.localeCompare(a.applicationId);
    });

  return { ok: true, rows };
}

export function getAffiliateListTotals(
  applications: readonly AffiliateApplication[],
): AffiliateListTotals {
  return {
    total: applications.length,
    pending: applications.filter((row) => row.applicationStatus === "승인대기").length,
    supplement: applications.filter((row) => row.applicationStatus === "보완요청").length,
  };
}

export function paginateAffiliateApplications(
  rows: readonly AffiliateApplication[],
  page: number,
  pageSize: number = AFFILIATE_LIST_PAGE_SIZE,
) {
  const size = Math.max(1, pageSize);
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * size;
  return {
    page: safePage,
    pageSize: size,
    totalCount,
    totalPages,
    rows: rows.slice(start, start + size),
  };
}

/* -------------------------------------------------------------------------- */
/* Seed data                                                                  */
/* -------------------------------------------------------------------------- */

const SEED_APPLICATIONS: AffiliateApplication[] = [
  {
    applicationId: "AFA-001",
    applicationNumber: "AOS-P-20260901-1001",
    affiliateAgencyId: null,
    appliedAt: "2026-09-01T10:15:00.000Z",
    updatedAt: "2026-09-01T10:15:00.000Z",
    processedAt: null,
    approvedAt: null,
    processedBy: null,
    applicationStatus: "승인대기",
    partnershipStatus: "미활성",
    shareGroups: [],
    agencyName: "[샘플] 블루하버여행",
    businessNumber: "101-81-11111",
    ceoName: "김샘플",
    tourismLicenseNumber: "제2026-0001호",
    tourismLicenseType: "국내외여행업",
    address: "서울특별시 중구 세종대로 110",
    addressDetail: "샘플타워 3층",
    phone: "02-1111-1001",
    homepage: "https://blueharbor.example.com",
    contactName: "이담당",
    contactRole: "제휴운영팀",
    contactPhone: "010-1111-1001",
    contactEmail: "manager001@example.com",
    documents: buildDocuments({
      businessLicenseFile: {
        fileName: "sample-biz-001.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-09-01T10:14:00.000Z",
      },
      tourismLicenseFile: {
        fileName: "sample-tourism-001.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-09-01T10:14:20.000Z",
      },
      mailOrderLicenseFile: {
        fileName: "sample-mail-001.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-09-01T10:14:40.000Z",
      },
    }),
    terms: buildTerms("2026-09-01T10:13:00.000Z"),
    adminMemo: "",
    memoUpdatedAt: null,
    latestSupplement: null,
    latestRejection: null,
    approvalMemo: null,
    history: [receiptHistory("AH-AFA-001-SEED", "2026-09-01T10:15:00.000Z")],
  },
  {
    applicationId: "AFA-002",
    applicationNumber: "AOS-P-20260902-1002",
    affiliateAgencyId: null,
    appliedAt: "2026-09-02T11:20:00.000Z",
    updatedAt: "2026-09-02T11:20:00.000Z",
    processedAt: null,
    approvedAt: null,
    processedBy: null,
    applicationStatus: "승인대기",
    partnershipStatus: "미활성",
    shareGroups: [],
    agencyName: "[샘플] 그린코스트투어",
    businessNumber: "202-82-22222",
    ceoName: "박샘플",
    tourismLicenseNumber: "제2026-0002호",
    tourismLicenseType: "국내여행업",
    address: "부산광역시 해운대구 해운대로 570",
    addressDetail: "샘플빌딩 5층",
    phone: "051-2222-2002",
    homepage: "https://greencoast.example.com",
    contactName: "최담당",
    contactRole: "영업팀",
    contactPhone: "010-2222-2002",
    contactEmail: "manager002@example.com",
    documents: buildDocuments({
      businessLicenseFile: {
        fileName: "sample-biz-002.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-09-02T11:18:00.000Z",
      },
      tourismLicenseFile: {
        fileName: "sample-tourism-002.pdf",
        submitState: "제출",
        reviewState: "미검토",
        submittedAt: "2026-09-02T11:18:30.000Z",
      },
    }),
    terms: buildTerms("2026-09-02T11:17:00.000Z"),
    adminMemo: "",
    memoUpdatedAt: null,
    latestSupplement: null,
    latestRejection: null,
    approvalMemo: null,
    history: [receiptHistory("AH-AFA-002-SEED", "2026-09-02T11:20:00.000Z")],
  },
  {
    applicationId: "AFA-003",
    applicationNumber: "AOS-P-20260903-1003",
    affiliateAgencyId: null,
    appliedAt: "2026-09-03T09:05:00.000Z",
    updatedAt: "2026-09-03T09:05:00.000Z",
    processedAt: null,
    approvedAt: null,
    processedBy: null,
    applicationStatus: "승인대기",
    partnershipStatus: "미활성",
    shareGroups: [],
    agencyName: "[샘플] 선셋레일여행",
    businessNumber: "303-83-33333",
    ceoName: "정샘플",
    tourismLicenseNumber: "제2026-0003호",
    tourismLicenseType: "종합여행업",
    address: "대구광역시 중구 동성로 1",
    addressDetail: "",
    phone: "053-3333-3003",
    homepage: "",
    contactName: "한담당",
    contactRole: "운영팀",
    contactPhone: "010-3333-3003",
    contactEmail: "manager003@example.com",
    documents: buildDocuments({
      businessLicenseFile: {
        fileName: "sample-biz-003.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-09-03T09:03:00.000Z",
      },
      tourismLicenseFile: {
        fileName: null,
        submitState: "미제출",
        reviewState: "미검토",
        submittedAt: null,
      },
    }),
    terms: buildTerms("2026-09-03T09:02:00.000Z"),
    adminMemo: "",
    memoUpdatedAt: null,
    latestSupplement: null,
    latestRejection: null,
    approvalMemo: null,
    history: [receiptHistory("AH-AFA-003-SEED", "2026-09-03T09:05:00.000Z")],
  },
  {
    applicationId: "AFA-004",
    applicationNumber: "AOS-P-20260828-1004",
    affiliateAgencyId: null,
    appliedAt: "2026-08-28T14:40:00.000Z",
    updatedAt: "2026-09-03T15:10:00.000Z",
    processedAt: "2026-09-03T15:10:00.000Z",
    approvedAt: null,
    processedBy: "장윤호",
    applicationStatus: "보완요청",
    partnershipStatus: "미활성",
    shareGroups: [],
    agencyName: "[샘플] 미르여행클럽",
    businessNumber: "404-84-44444",
    ceoName: "오샘플",
    tourismLicenseNumber: "제2026-0004호",
    tourismLicenseType: "국내외여행업",
    address: "광주광역시 동구 금남로 1",
    addressDetail: "샘플센터 2층",
    phone: "062-4444-4004",
    homepage: "https://mirclub.example.com",
    contactName: "윤담당",
    contactRole: "기획팀",
    contactPhone: "010-4444-4004",
    contactEmail: "manager004@example.com",
    documents: buildDocuments({
      businessLicenseFile: {
        fileName: "sample-biz-004.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-08-28T14:38:00.000Z",
      },
      tourismLicenseFile: {
        fileName: "blurry-tourism-004.jpg",
        submitState: "제출",
        reviewState: "보완필요",
        reviewNote: "이미지가 흐려 상호·등록번호 확인이 어렵습니다.",
        submittedAt: "2026-08-28T14:38:30.000Z",
      },
    }),
    terms: buildTerms("2026-08-28T14:37:00.000Z"),
    adminMemo: "관광사업등록증 재첨부 대기",
    memoUpdatedAt: "2026-09-03T15:11:00.000Z",
    latestSupplement: {
      items: ["관광사업등록증"],
      reason: "관광사업등록증 이미지가 흐려 확인이 어렵습니다.",
      guideNote: "선명한 PDF 또는 JPG로 다시 제출해 주세요.",
      requestedAt: "2026-09-03T15:10:00.000Z",
      actor: "장윤호",
    },
    latestRejection: null,
    approvalMemo: null,
    history: [
      receiptHistory("AH-AFA-004-SEED-1", "2026-08-28T14:40:00.000Z"),
      {
        id: "AH-AFA-004-SEED-2",
        processedAt: "2026-09-03T15:10:00.000Z",
        action: "보완요청",
        statusBefore: "승인대기",
        statusAfter: "보완요청",
        actor: "장윤호",
        note: "관광사업등록증 이미지가 흐려 확인이 어렵습니다. (항목: 관광사업등록증)",
      },
    ],
  },
  {
    applicationId: "AFA-005",
    applicationNumber: "AOS-P-20260825-1005",
    affiliateAgencyId: null,
    appliedAt: "2026-08-25T08:30:00.000Z",
    updatedAt: "2026-09-04T10:00:00.000Z",
    processedAt: "2026-09-01T16:20:00.000Z",
    approvedAt: null,
    processedBy: "장윤호",
    applicationStatus: "보완요청",
    partnershipStatus: "미활성",
    shareGroups: [],
    agencyName: "[샘플] 오로라트래블",
    businessNumber: "505-85-55555",
    ceoName: "강샘플",
    tourismLicenseNumber: "제2026-0005호",
    tourismLicenseType: "국내외여행업",
    address: "인천광역시 연수구 컨벤시아대로 69",
    addressDetail: "샘플오피스 7층",
    phone: "032-5555-5005",
    homepage: "https://aurora.example.com",
    contactName: "송담당",
    contactRole: "제휴팀 / 과장",
    contactPhone: "010-5555-5005",
    contactEmail: "manager005@example.com",
    documents: buildDocuments({
      businessLicenseFile: {
        fileName: "sample-biz-005.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-08-25T08:28:00.000Z",
      },
      tourismLicenseFile: {
        fileName: "sample-tourism-005-resubmit.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        reviewNote: "재제출본 확인 완료(샘플)",
        submittedAt: "2026-09-04T09:50:00.000Z",
      },
      mailOrderLicenseFile: {
        fileName: "sample-mail-005.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-08-25T08:29:00.000Z",
      },
    }),
    terms: buildTerms("2026-08-25T08:27:00.000Z"),
    adminMemo: "재제출 서류 육안 확인 완료. 보완 확인 가능.",
    memoUpdatedAt: "2026-09-04T10:00:00.000Z",
    latestSupplement: {
      items: ["관광사업등록증"],
      reason: "등록증 유효기간 표기가 잘리지 않게 다시 첨부해 주세요.",
      guideNote: "전체 면이 보이도록 촬영해 주세요.",
      requestedAt: "2026-09-01T16:20:00.000Z",
      actor: "장윤호",
    },
    latestRejection: null,
    approvalMemo: null,
    history: [
      receiptHistory("AH-AFA-005-SEED-1", "2026-08-25T08:30:00.000Z"),
      {
        id: "AH-AFA-005-SEED-2",
        processedAt: "2026-09-01T16:20:00.000Z",
        action: "보완요청",
        statusBefore: "승인대기",
        statusAfter: "보완요청",
        actor: "장윤호",
        note: "등록증 유효기간 표기가 잘리지 않게 다시 첨부해 주세요. (항목: 관광사업등록증)",
      },
    ],
  },
  {
    applicationId: "AFA-006",
    applicationNumber: "AOS-P-20260810-1006",
    affiliateAgencyId: "AFF-101",
    appliedAt: "2026-08-10T13:00:00.000Z",
    updatedAt: "2026-08-20T11:00:00.000Z",
    processedAt: "2026-08-20T11:00:00.000Z",
    approvedAt: "2026-08-20T11:00:00.000Z",
    processedBy: "장윤호",
    applicationStatus: "승인완료",
    partnershipStatus: "활성",
    shareGroups: [],
    agencyName: "[샘플] 북극성투어",
    businessNumber: "606-86-66666",
    ceoName: "임샘플",
    tourismLicenseNumber: "제2026-0006호",
    tourismLicenseType: "종합여행업",
    address: "경기도 성남시 분당구 판교역로 235",
    addressDetail: "샘플스퀘어 10층",
    phone: "031-6666-6006",
    homepage: "https://polaris.example.com",
    contactName: "배담당",
    contactRole: "사업개발",
    contactPhone: "010-6666-6006",
    contactEmail: "manager006@example.com",
    documents: buildDocuments({
      businessLicenseFile: {
        fileName: "sample-biz-006.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-08-10T12:58:00.000Z",
      },
      tourismLicenseFile: {
        fileName: "sample-tourism-006.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-08-10T12:58:30.000Z",
      },
    }),
    terms: buildTerms("2026-08-10T12:57:00.000Z", {
      agreeEmailGuide: { agreed: true, agreedAt: "2026-08-10T12:57:00.000Z" },
    }),
    adminMemo: "그룹 미지정. 상품 공유는 별도 설정.",
    memoUpdatedAt: "2026-08-20T11:05:00.000Z",
    latestSupplement: null,
    latestRejection: null,
    approvalMemo: "서류·약관 확인 후 승인",
    history: [
      receiptHistory("AH-AFA-006-SEED-1", "2026-08-10T13:00:00.000Z"),
      {
        id: "AH-AFA-006-SEED-2",
        processedAt: "2026-08-20T11:00:00.000Z",
        action: "가입승인",
        statusBefore: "승인대기",
        statusAfter: "승인완료",
        actor: "장윤호",
        note: "서류·약관 확인 후 승인",
      },
    ],
  },
  {
    applicationId: "AFA-007",
    applicationNumber: "AOS-P-20260805-1007",
    affiliateAgencyId: "AFF-102",
    appliedAt: "2026-08-05T09:45:00.000Z",
    updatedAt: "2026-08-22T14:30:00.000Z",
    processedAt: "2026-08-22T14:30:00.000Z",
    approvedAt: "2026-08-18T10:00:00.000Z",
    processedBy: "장윤호",
    applicationStatus: "승인완료",
    partnershipStatus: "활성",
    shareGroups: ["동북아 상품공유", "수도권 판매 제휴"],
    agencyName: "[샘플] 하이웨이여행",
    businessNumber: "707-87-77777",
    ceoName: "류샘플",
    tourismLicenseNumber: "제2026-0007호",
    tourismLicenseType: "국내외여행업",
    address: "서울특별시 영등포구 여의대로 108",
    addressDetail: "샘플파크 12층",
    phone: "02-7777-7007",
    homepage: "https://highway.example.com",
    contactName: "문담당",
    contactRole: "제휴운영 / 팀장",
    contactPhone: "010-7777-7007",
    contactEmail: "manager007@example.com",
    documents: buildDocuments({
      businessLicenseFile: {
        fileName: "sample-biz-007.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-08-05T09:43:00.000Z",
      },
      tourismLicenseFile: {
        fileName: "sample-tourism-007.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-08-05T09:43:20.000Z",
      },
      mailOrderLicenseFile: {
        fileName: "sample-mail-007.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-08-05T09:43:40.000Z",
      },
    }),
    terms: buildTerms("2026-08-05T09:42:00.000Z"),
    adminMemo: "",
    memoUpdatedAt: null,
    latestSupplement: null,
    latestRejection: null,
    approvalMemo: "승인 완료",
    history: [
      receiptHistory("AH-AFA-007-SEED-1", "2026-08-05T09:45:00.000Z"),
      {
        id: "AH-AFA-007-SEED-2",
        processedAt: "2026-08-18T10:00:00.000Z",
        action: "가입승인",
        statusBefore: "승인대기",
        statusAfter: "승인완료",
        actor: "장윤호",
        note: "승인 완료",
      },
      {
        id: "AH-AFA-007-SEED-3",
        processedAt: "2026-08-22T14:30:00.000Z",
        action: "상품공유그룹 변경",
        statusBefore: "승인완료",
        statusAfter: "승인완료",
        actor: "장윤호",
        note: "미지정 → 동북아 상품공유 외 1개",
        groupsBefore: [],
        groupsAfter: ["동북아 상품공유", "수도권 판매 제휴"],
      },
    ],
  },
  {
    applicationId: "AFA-008",
    applicationNumber: "AOS-P-20260801-1008",
    affiliateAgencyId: null,
    appliedAt: "2026-08-01T07:10:00.000Z",
    updatedAt: "2026-08-12T17:40:00.000Z",
    processedAt: "2026-08-12T17:40:00.000Z",
    approvedAt: null,
    processedBy: "장윤호",
    applicationStatus: "가입거절",
    partnershipStatus: "미활성",
    shareGroups: [],
    agencyName: "[샘플] 나이트마켓투어",
    businessNumber: "808-88-88888",
    ceoName: "남샘플",
    tourismLicenseNumber: "제2026-0008호",
    tourismLicenseType: "국내여행업",
    address: "제주특별자치도 제주시 중앙로 1",
    addressDetail: "샘플플라자 1층",
    phone: "064-8888-8008",
    homepage: "https://nightmarket.example.com",
    contactName: "표담당",
    contactRole: "운영",
    contactPhone: "010-8888-8008",
    contactEmail: "manager008@example.com",
    documents: buildDocuments({
      businessLicenseFile: {
        fileName: "sample-biz-008.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-08-01T07:08:00.000Z",
      },
      tourismLicenseFile: {
        fileName: "sample-tourism-008.pdf",
        submitState: "제출",
        reviewState: "확인완료",
        submittedAt: "2026-08-01T07:08:20.000Z",
      },
    }),
    terms: buildTerms("2026-08-01T07:07:00.000Z"),
    adminMemo: "",
    memoUpdatedAt: null,
    latestSupplement: null,
    latestRejection: {
      reason: "제출 서류의 상호와 사업자등록증 정보가 일치하지 않습니다.",
      guideNote: "일치하는 서류로 신규 신청해 주세요.",
      rejectedAt: "2026-08-12T17:40:00.000Z",
      actor: "장윤호",
    },
    approvalMemo: null,
    history: [
      receiptHistory("AH-AFA-008-SEED-1", "2026-08-01T07:10:00.000Z"),
      {
        id: "AH-AFA-008-SEED-2",
        processedAt: "2026-08-12T17:40:00.000Z",
        action: "가입거절",
        statusBefore: "승인대기",
        statusAfter: "가입거절",
        actor: "장윤호",
        note: "제출 서류의 상호와 사업자등록증 정보가 일치하지 않습니다.",
      },
    ],
  },
];

export const AFFILIATE_APPLICATION_SEED = cloneSeedList(SEED_APPLICATIONS);

export function getAffiliateApplicationSeed() {
  return cloneSeedList(SEED_APPLICATIONS);
}

export function findAffiliateApplicationSeedById(applicationId: string) {
  const found = SEED_APPLICATIONS.find((row) => row.applicationId === applicationId);
  return found ? cloneApplication(found) : null;
}

/* -------------------------------------------------------------------------- */
/* Prototype sessionStorage                                                   */
/* -------------------------------------------------------------------------- */

type AffiliatePrototypeStoragePayload = {
  version: typeof STORAGE_SCHEMA_VERSION;
  overrides: Record<string, AffiliateApplication>;
};

function isBrowserStorageAvailable() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isApplicationStatus(value: unknown): value is AffiliateApplicationStatus {
  return value === "승인대기" || value === "보완요청" || value === "승인완료" || value === "가입거절";
}

function isPartnershipStatus(value: unknown): value is AffiliatePartnershipStatus {
  return value === "미활성" || value === "활성" || value === "거래중지" || value === "관계종료";
}

function isValidStoredApplication(value: unknown): value is AffiliateApplication {
  if (!value || typeof value !== "object") return false;
  const row = value as AffiliateApplication;
  if (typeof row.applicationId !== "string" || !/^AFA-\d+$/.test(row.applicationId)) return false;
  if (typeof row.applicationNumber !== "string") return false;
  if (!(row.affiliateAgencyId === null || typeof row.affiliateAgencyId === "string")) return false;
  if (!isApplicationStatus(row.applicationStatus)) return false;
  if (!isPartnershipStatus(row.partnershipStatus)) return false;
  if (!Array.isArray(row.shareGroups) || !Array.isArray(row.documents) || !Array.isArray(row.terms)) {
    return false;
  }
  if (!Array.isArray(row.history)) return false;
  if (typeof row.agencyName !== "string" || typeof row.contactName !== "string") return false;
  return true;
}

function readPrototypePayload(): AffiliatePrototypeStoragePayload {
  if (!isBrowserStorageAvailable()) {
    return { version: STORAGE_SCHEMA_VERSION, overrides: {} };
  }
  try {
    const raw = window.sessionStorage.getItem(AFFILIATE_PROTOTYPE_STORAGE_KEY);
    if (!raw) return { version: STORAGE_SCHEMA_VERSION, overrides: {} };
    const parsed = JSON.parse(raw) as Partial<AffiliatePrototypeStoragePayload>;
    if (parsed.version !== STORAGE_SCHEMA_VERSION || !parsed.overrides || typeof parsed.overrides !== "object") {
      return { version: STORAGE_SCHEMA_VERSION, overrides: {} };
    }
    const overrides: Record<string, AffiliateApplication> = {};
    for (const [key, value] of Object.entries(parsed.overrides)) {
      if (!isValidStoredApplication(value)) continue;
      if (value.applicationId !== key) continue;
      overrides[key] = cloneApplication(value);
    }
    return { version: STORAGE_SCHEMA_VERSION, overrides };
  } catch {
    return { version: STORAGE_SCHEMA_VERSION, overrides: {} };
  }
}

function writePrototypePayload(payload: AffiliatePrototypeStoragePayload) {
  if (!isBrowserStorageAvailable()) return false;
  try {
    window.sessionStorage.setItem(AFFILIATE_PROTOTYPE_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/** 시드 + sessionStorage override를 병합한 현재 목록 (프로토타입) */
export function loadPrototypeAffiliateApplications(): AffiliateApplication[] {
  const { overrides } = readPrototypePayload();
  return SEED_APPLICATIONS.map((seed) => {
    const override = overrides[seed.applicationId];
    return override ? cloneApplication(override) : cloneApplication(seed);
  });
}

export function getPrototypeAffiliateApplication(
  applicationId: string,
): AffiliateApplication | null {
  const list = loadPrototypeAffiliateApplications();
  const found = list.find((row) => row.applicationId === applicationId);
  return found ? cloneApplication(found) : null;
}

/** 변경된 신청 1건을 프로토타입 저장소에 반영 */
export function savePrototypeAffiliateApplication(application: AffiliateApplication): boolean {
  if (!isValidStoredApplication(application)) return false;
  if (!SEED_APPLICATIONS.some((seed) => seed.applicationId === application.applicationId)) {
    return false;
  }
  const payload = readPrototypePayload();
  payload.overrides[application.applicationId] = cloneApplication(application);
  return writePrototypePayload(payload);
}

export function resetPrototypeAffiliateApplications(): boolean {
  if (!isBrowserStorageAvailable()) return true;
  try {
    // 전용 키만 삭제 — 홈페이지·상품공유 등 다른 sessionStorage는 건드리지 않는다.
    window.sessionStorage.removeItem(AFFILIATE_PROTOTYPE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** 목록용 신청일 표시 — 잘못된 값에서도 예외 없이 안전 */
export function formatAffiliateAppliedDate(value: string) {
  const key = appliedDateKey(value);
  return key || "—";
}

/** 상세용 일시 표시 — 잘못된 값에서도 예외 없이 안전 */
export function formatAffiliateDateTime(value: string | null | undefined) {
  if (!value || !String(value).trim()) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function displayAffiliateText(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed || "-";
}
