/**
 * AOS 판매점 공통 도메인 모델 (Front / Admin Mock 정렬용)
 * - DB Schema 변경 없음. API 연결 전 Type·상태코드·표시라벨 기준.
 * - Seller(판매점 자체)와 SellerRelation(여행사↔판매점 관계)를 개념 분리.
 * - admin-site/lib/seller/seller-domain.ts 와 website/lib/seller/seller-domain.ts 내용은 동일하게 유지한다.
 */

/** 판매점 유형 */
export const SELLER_TYPE_CODES = ["business", "individual"] as const;
export type SellerType = (typeof SELLER_TYPE_CODES)[number];

export const SELLER_TYPE_LABELS: Record<SellerType, string> = {
  business: "사업자 판매점",
  individual: "개인 판매점",
};

/** 목록 Badge용 짧은 표기 */
export const SELLER_TYPE_BADGE_LABELS: Record<SellerType, string> = {
  business: "사업자",
  individual: "개인",
};

/** 신청 출처 */
export const SELLER_APPLICATION_SOURCE_CODES = ["homepage", "admin"] as const;
export type SellerApplicationSource = (typeof SELLER_APPLICATION_SOURCE_CODES)[number];

export const SELLER_APPLICATION_SOURCE_LABELS: Record<SellerApplicationSource, string> = {
  homepage: "홈페이지 신청",
  admin: "관리자 직접등록",
};

/** 목록용 짧은 신청경로 */
export const SELLER_APPLICATION_SOURCE_SHORT_LABELS: Record<SellerApplicationSource, string> = {
  homepage: "홈페이지",
  admin: "관리자등록",
};

/** 홈페이지 신청현황용 사용자 문구 (관리자 내부 라벨과 분리) */
export const SELLER_PUBLIC_APPROVAL_STATUS_LABELS: Record<SellerApprovalStatusCode, string> = {
  pending: "신청접수",
  reviewing: "검토중",
  supplement_requested: "보완이 필요합니다",
  approved: "가입승인",
  rejected: "가입승인 불가",
};

/** 검토 Audit Action 코드 */
export const SELLER_REVIEW_ACTION_CODES = [
  "applied",
  "review_started",
  "supplement_requested",
  "supplement_submitted",
  "approved",
  "rejected",
] as const;
export type SellerReviewActionCode = (typeof SELLER_REVIEW_ACTION_CODES)[number];

export const SELLER_REVIEW_ACTION_LABELS: Record<SellerReviewActionCode, string> = {
  applied: "신청접수",
  review_started: "검토 시작",
  supplement_requested: "보완요청",
  supplement_submitted: "보완제출",
  approved: "가입승인",
  rejected: "승인거절",
};

export const SELLER_SUPPLEMENT_ITEM_OPTIONS = [
  "사업자등록정보",
  "사업자등록증",
  "대표자 정보",
  "담당자 정보",
  "연락처",
  "주소",
  "기타",
] as const;
export type SellerSupplementItem = (typeof SELLER_SUPPLEMENT_ITEM_OPTIONS)[number];

/** 보완요청 메타 (API 연동 전 Mock) */
export type SellerSupplementRequest = {
  requestedAt: string;
  requestedBy: string;
  supplementItems: string[];
  supplementMessage: string;
  completedAt: string | null;
};

/** 승인(심사) 상태 — 관계(affiliation) 단위 */
export const SELLER_APPROVAL_STATUS_CODES = [
  "pending",
  "reviewing",
  "supplement_requested",
  "approved",
  "rejected",
] as const;
export type SellerApprovalStatusCode = (typeof SELLER_APPROVAL_STATUS_CODES)[number];

export const SELLER_APPROVAL_STATUS_LABELS: Record<SellerApprovalStatusCode, string> = {
  pending: "승인대기",
  reviewing: "검토중",
  supplement_requested: "보완요청",
  approved: "승인완료",
  rejected: "승인거절",
};

/** 판매설정 상태(상품·수수료) — 승인상태와 분리 */
export const SELLER_SALES_SETUP_STATUS_CODES = ["not_configured", "configuring", "configured"] as const;
export type SellerSalesSetupStatusCode = (typeof SELLER_SALES_SETUP_STATUS_CODES)[number];

export const SELLER_SALES_SETUP_STATUS_LABELS: Record<SellerSalesSetupStatusCode, string> = {
  not_configured: "미설정",
  configuring: "설정중",
  configured: "설정완료",
};

/**
 * 판매상태(관계 단위 판매 운영)
 * - 승인완료만으로 active가 되지 않음
 * - 레거시 관리자 "판매가능" ≈ active(표시: 판매중)
 * - 레거시 "판매중지" ≈ suspended
 */
export const SELLER_SALES_STATUS_CODES = ["not_started", "active", "suspended"] as const;
export type SellerSalesStatusCode = (typeof SELLER_SALES_STATUS_CODES)[number];

export const SELLER_SALES_STATUS_LABELS: Record<SellerSalesStatusCode, string> = {
  not_started: "판매전",
  active: "판매중",
  suspended: "판매중지",
};

/** 첨부파일 메타 (실제 Storage/API 없음) */
export type SellerAttachmentMeta = {
  name: string;
  url: string;
  uploadedAt: string;
};

/** 프로토타입: 홈페이지 접속 여행사(자동 지정, UI 미노출) */
export const PROTOTYPE_DEFAULT_AGENCY_ID = "agency-current-site";
export const PROTOTYPE_DEFAULT_AGENCY_NAME = "현재 홈페이지 운영 여행사";
export const PROTOTYPE_DEFAULT_SITE_ID = "site-current";

/**
 * Seller — 판매점 자체 정보
 * 한 판매점이 여러 여행사와 관계를 가질 수 있다.
 */
export type SellerProfile = {
  sellerId: string;
  sellerType: SellerType;
  /** 상호명(사업자) 또는 판매점명/신청자명(개인) */
  sellerName: string;
  businessNumber: string | null;
  businessKind: "법인사업자" | "개인사업자" | null;
  representativeName: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  officePhone: string | null;
  zipCode: string | null;
  address: string;
  addressDetail: string;
  homepage: string | null;
  loginId: string | null;
  /** 사업자등록증 등 — 가입신청 단계 Mock 메타 */
  businessLicense: SellerAttachmentMeta | null;
};

/**
 * SellerRelation / SellerAffiliation — 여행사↔판매점 관계
 */
export type SellerAgencyRelation = {
  relationId: string;
  sellerId: string;
  agencyId: string;
  agencyName: string;
  siteId: string;
  applicationId: string;
  applicationNumber: string;
  applicationSource: SellerApplicationSource;
  approvalStatus: SellerApprovalStatusCode;
  salesSetupStatus: SellerSalesSetupStatusCode;
  salesStatus: SellerSalesStatusCode;
  /** "5%" | "개별설정" | null(미설정) */
  defaultCommission: string | null;
  appliedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  salesStartedAt: string | null;
  productCount: number | null;
  rejectionReason: string | null;
  rejectionGuideNote: string | null;
  salesStopReason: string | null;
  adminMemo: string;
};

/** 판매개시 가능 여부 판단 입력 (향후 API 연결용) */
export type SellerStartSellingCheckInput = {
  approvalStatus: SellerApprovalStatusCode;
  productCount: number | null | undefined;
  /** 기본 또는 상품별 필수 수수료가 갖춰졌는지 */
  commissionReady: boolean;
  /** 정산정보 등록 완료 여부 (승인 후 별도 단계) */
  settlementReady: boolean;
};

export type SellerStartSellingCheckResult = {
  ok: boolean;
  reasons: string[];
};

/**
 * 판매개시 가능 기본조건 helper
 * 1) 승인완료 2) 판매상품 1개 이상 3) 수수료 조건 4) 정산정보
 */
export function canStartSelling(input: SellerStartSellingCheckInput): SellerStartSellingCheckResult {
  const reasons: string[] = [];
  if (input.approvalStatus !== "approved") {
    reasons.push("승인상태가 승인완료가 아닙니다.");
  }
  const productCount = input.productCount ?? 0;
  if (productCount < 1) {
    reasons.push("판매상품이 1개 이상 설정되어야 합니다.");
  }
  if (!input.commissionReady) {
    reasons.push("필수 수수료 조건이 설정되어야 합니다.");
  }
  if (!input.settlementReady) {
    reasons.push("필요한 정산정보가 등록되어야 합니다.");
  }
  return { ok: reasons.length === 0, reasons };
}

export function isSellerType(value: unknown): value is SellerType {
  return value === "business" || value === "individual";
}

export function isSellerApprovalStatusCode(value: unknown): value is SellerApprovalStatusCode {
  return (
    value === "pending" ||
    value === "reviewing" ||
    value === "supplement_requested" ||
    value === "approved" ||
    value === "rejected"
  );
}

export function isSellerSalesStatusCode(value: unknown): value is SellerSalesStatusCode {
  return value === "not_started" || value === "active" || value === "suspended";
}

export function isSellerSalesSetupStatusCode(value: unknown): value is SellerSalesSetupStatusCode {
  return value === "not_configured" || value === "configuring" || value === "configured";
}

export function isSellerApplicationSource(value: unknown): value is SellerApplicationSource {
  return value === "homepage" || value === "admin";
}

export function sellerTypeLabel(type: SellerType) {
  return SELLER_TYPE_LABELS[type];
}

export function sellerApprovalStatusLabel(status: SellerApprovalStatusCode) {
  return SELLER_APPROVAL_STATUS_LABELS[status];
}

export function sellerSalesStatusLabel(status: SellerSalesStatusCode) {
  return SELLER_SALES_STATUS_LABELS[status];
}

export function sellerSalesSetupStatusLabel(status: SellerSalesSetupStatusCode) {
  return SELLER_SALES_SETUP_STATUS_LABELS[status];
}

export function sellerApplicationSourceLabel(source: SellerApplicationSource) {
  return SELLER_APPLICATION_SOURCE_LABELS[source];
}

export function sellerApplicationSourceShortLabel(source: SellerApplicationSource) {
  return SELLER_APPLICATION_SOURCE_SHORT_LABELS[source];
}

export function sellerPublicApprovalStatusLabel(status: SellerApprovalStatusCode) {
  return SELLER_PUBLIC_APPROVAL_STATUS_LABELS[status];
}

export function sellerReviewActionLabel(action: SellerReviewActionCode) {
  return SELLER_REVIEW_ACTION_LABELS[action];
}

/** UI Badge class (AOS admin badge tone) */
export function sellerApprovalStatusBadgeClass(status: SellerApprovalStatusCode) {
  if (status === "pending" || status === "reviewing") return "warn";
  if (status === "supplement_requested") return "info";
  if (status === "approved") return "success";
  return "danger";
}

export function sellerSalesStatusBadgeClass(status: SellerSalesStatusCode) {
  if (status === "active") return "success";
  if (status === "suspended") return "warn";
  return "gray";
}

export function sellerSalesSetupStatusBadgeClass(status: SellerSalesSetupStatusCode) {
  if (status === "configured") return "success";
  if (status === "configuring") return "info";
  return "gray";
}

export function sellerTypeBadgeClass(sellerType: SellerType) {
  return sellerType === "business" ? "info" : "gray";
}

/**
 * 레거시 한글 승인상태 → 코드 (기존 Mock/홈페이지 샘플 호환)
 * - "가입거절" 은 "승인거절"과 동일 코드(rejected)
 */
export function parseSellerApprovalStatusLabel(value: string): SellerApprovalStatusCode | null {
  const trimmed = value.trim();
  if (isSellerApprovalStatusCode(trimmed)) return trimmed;
  const entry = (Object.entries(SELLER_APPROVAL_STATUS_LABELS) as [SellerApprovalStatusCode, string][]).find(
    ([, label]) => label === trimmed,
  );
  if (entry) return entry[0];
  if (trimmed === "가입거절") return "rejected";
  return null;
}

/** 레거시 판매상태 한글/구표현 → 코드 */
export function parseSellerSalesStatusLabel(value: string | null | undefined): SellerSalesStatusCode | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return null;
  if (isSellerSalesStatusCode(trimmed)) return trimmed;
  if (trimmed === "판매가능" || trimmed === "판매중") return "active";
  if (trimmed === "판매중지" || trimmed === "거래중지") return "suspended";
  if (trimmed === "판매전" || trimmed === "설정대기") return "not_started";
  if (trimmed === "관계종료") return "suspended";
  return null;
}

/** 상품수·수수료 텍스트로 판매설정 상태 추정 (Mock) */
export function deriveSellerSalesSetupStatus(input: {
  approvalStatus: SellerApprovalStatusCode;
  productCount: number | null | undefined;
  commissionText: string | null | undefined;
}): SellerSalesSetupStatusCode {
  if (input.approvalStatus !== "approved") return "not_configured";
  const count = input.productCount ?? 0;
  const commission = (input.commissionText ?? "").trim();
  const commissionReady = Boolean(commission) && commission !== "미설정";
  if (count <= 0 && !commissionReady) return "not_configured";
  if (count > 0 && commissionReady) return "configured";
  return "configuring";
}

export function deriveDefaultSalesStatus(input: {
  approvalStatus: SellerApprovalStatusCode;
  salesSetupStatus: SellerSalesSetupStatusCode;
  preferred?: SellerSalesStatusCode | null;
}): SellerSalesStatusCode {
  if (input.approvalStatus !== "approved") return "not_started";
  if (input.preferred === "active" || input.preferred === "suspended") return input.preferred;
  if (input.salesSetupStatus === "configured") return "active";
  return "not_started";
}
