/**
 * 회원관리 · 판매점 가입신청 샘플 데이터 및 프로토타입 로직 (SAMPLE)
 * - 공통 도메인: lib/seller/seller-domain.ts (website와 동일 모델)
 * - Seller(판매점) / SellerRelation(여행사 관계) 개념을 flat Mock에 함께 담음
 * - API·DB·실이메일 없음
 */

import {
  PROTOTYPE_DEFAULT_AGENCY_ID,
  PROTOTYPE_DEFAULT_AGENCY_NAME,
  PROTOTYPE_DEFAULT_SITE_ID,
  SELLER_APPROVAL_STATUS_LABELS,
  SELLER_APPLICATION_SOURCE_LABELS,
  SELLER_APPLICATION_SOURCE_SHORT_LABELS,
  SELLER_PUBLIC_APPROVAL_STATUS_LABELS,
  SELLER_REVIEW_ACTION_LABELS,
  SELLER_SALES_SETUP_STATUS_LABELS,
  SELLER_SALES_STATUS_LABELS,
  SELLER_SUPPLEMENT_ITEM_OPTIONS,
  SELLER_TYPE_BADGE_LABELS,
  SELLER_TYPE_LABELS as DOMAIN_SELLER_TYPE_LABELS,
  canStartSelling,
  deriveDefaultSalesStatus,
  deriveSellerSalesSetupStatus,
  isSellerApplicationSource,
  isSellerApprovalStatusCode,
  isSellerSalesSetupStatusCode,
  isSellerSalesStatusCode,
  isSellerType,
  parseSellerApprovalStatusLabel,
  parseSellerSalesStatusLabel,
  sellerApplicationSourceLabel,
  sellerApplicationSourceShortLabel,
  sellerApprovalStatusBadgeClass as domainApprovalBadgeClass,
  sellerApprovalStatusLabel,
  sellerPublicApprovalStatusLabel,
  sellerReviewActionLabel,
  sellerSalesSetupStatusBadgeClass,
  sellerSalesSetupStatusLabel,
  sellerSalesStatusBadgeClass as domainSalesBadgeClass,
  sellerSalesStatusLabel,
  sellerTypeBadgeClass as domainSellerTypeBadgeClass,
  type SellerAgencyRelation,
  type SellerApplicationSource,
  type SellerApprovalStatusCode,
  type SellerAttachmentMeta,
  type SellerProfile,
  type SellerReviewActionCode,
  type SellerSalesSetupStatusCode,
  type SellerSalesStatusCode,
  type SellerStartSellingCheckResult,
  type SellerSupplementRequest,
  type SellerType,
} from "@/lib/seller/seller-domain";


/** @deprecated 표시용 — 내부 저장은 SellerApprovalStatusCode */
export type SellerApplicationStatus = SellerApprovalStatusCode;
/** @deprecated 표시용 — 내부 저장은 SellerSalesStatusCode */
export type SellerSalesStatus = SellerSalesStatusCode;

export type SellerBusinessKind = "법인사업자" | "개인사업자";
export type { SellerType, SellerApplicationSource, SellerApprovalStatusCode, SellerSalesSetupStatusCode, SellerSalesStatusCode, SellerAttachmentMeta, SellerProfile, SellerAgencyRelation, SellerSupplementRequest, SellerReviewActionCode };

export type SellerProcessHistoryItem = {
  processedAt: string;
  action: string;
  /** Audit Log 연결용 코드 (optional for legacy history) */
  actionCode?: SellerReviewActionCode;
  statusBefore: string;
  statusAfter: string;
  actor: string;
  note: string;
};

/**
 * Mock 목록/상세용 flat 모델
 * - SellerProfile + SellerAgencyRelation 필드를 한 레코드에 포함
 * - applicationId 는 기존 URL 호환 키 (관계 applicationId 와 동일하게 사용)
 */
export type SellerApplication = {
  /** 판매점 ID (Mock: applicationId와 동일하거나 SEL-* 확장 가능) */
  sellerId: string;
  applicationId: string;
  relationId: string;
  applicationNumber: string;
  sellerType: SellerType;
  sellerName: string;
  businessNumber: string | null;
  representativeName: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  /** 승인 상태 코드 */
  applicationStatus: SellerApprovalStatusCode;
  /** 판매설정 상태 */
  salesSetupStatus: SellerSalesSetupStatusCode;
  /** 판매 운영 상태 */
  salesStatus: SellerSalesStatusCode;
  productCount: number | null;
  commissionText: string | null;
  appliedAt: string;
  updatedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  salesStartedAt: string | null;
  processedAt: string | null;
  processedBy: string | null;
  rejectionReason: string | null;
  rejectionGuideNote: string | null;
  salesStopReason: string | null;
  adminMemo: string;
  loginId: string | null;
  zipCode: string | null;
  address: string;
  addressDetail: string;
  businessKind: SellerBusinessKind | null;
  businessCategory: string | null;
  businessItem: string | null;
  officePhone: string | null;
  homepage: string | null;
  managerDepartment: string | null;
  birthDate: string | null;
  activityRegion: string | null;
  /** @deprecated applicationSource 사용 — 표시 호환용 */
  joinPath: string;
  applicationSource: SellerApplicationSource;
  agencyId: string;
  agencyName: string;
  siteId: string;
  businessLicense: SellerAttachmentMeta | null;
  /** 보완요청 메타 */
  supplementRequest: SellerSupplementRequest | null;
  identityVerified: boolean | null;
  phoneVerified: boolean | null;
  history: SellerProcessHistoryItem[];
};

export const SELLER_DEFAULT_JOIN_PATH = SELLER_APPLICATION_SOURCE_LABELS.homepage;
export const SELLER_ADMIN_JOIN_PATH = SELLER_APPLICATION_SOURCE_LABELS.admin;

export const SELLER_DEFAULT_PROCESSOR = "관리자 장윤호";

export const SELLER_DETAIL_TABS = ["기본정보", "판매상품", "예약현황", "정산현황"] as const;
export type SellerDetailTab = (typeof SELLER_DETAIL_TABS)[number];

/** URL ?tab= 값 → 상세 탭 */
export const SELLER_DETAIL_TAB_QUERY_MAP = {
  basic: "기본정보",
  products: "판매상품",
  reservations: "예약현황",
  settlements: "정산현황",
} as const satisfies Record<string, SellerDetailTab>;

export type SellerDetailTabQuery = keyof typeof SELLER_DETAIL_TAB_QUERY_MAP;

export function resolveSellerDetailTabFromQuery(tab: string | null | undefined): SellerDetailTab {
  if (!tab) return "기본정보";
  const key = tab.trim().toLowerCase() as SellerDetailTabQuery;
  return SELLER_DETAIL_TAB_QUERY_MAP[key] ?? "기본정보";
}

export function sellerDetailTabToQuery(tab: SellerDetailTab): SellerDetailTabQuery {
  const entry = (Object.entries(SELLER_DETAIL_TAB_QUERY_MAP) as [SellerDetailTabQuery, SellerDetailTab][]).find(
    ([, label]) => label === tab,
  );
  return entry?.[0] ?? "basic";
}

export const SELLER_REJECTION_REASON_OPTIONS = [
  "신청정보 불일치",
  "사업자 확인 불가",
  "운영정책 부적합",
  "중복 신청",
  "기타",
] as const;

export { SELLER_SUPPLEMENT_ITEM_OPTIONS };

export const SELLER_SALES_STOP_REASON_OPTIONS = [
  "운영 요청",
  "정산 문제",
  "정책 위반",
  "일시 중단",
  "기타",
] as const;

export type SellerListFilters = {
  keyword: string;
  sellerType: SellerType | "전체";
  approvalStatus: "전체" | SellerApprovalStatusCode;
  salesStatus: SellerSalesStatusCode | "전체";
  appliedFrom: string;
  appliedTo: string;
};

export type SellerListTotals = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  reviewing: number;
  supplement: number;
};

export const SELLER_LIST_PAGE_SIZE = 20;

export const SELLER_APPROVAL_STATUS_FILTER_OPTIONS = [
  "전체",
  "pending",
  "reviewing",
  "supplement_requested",
  "approved",
  "rejected",
] as const;

export const SELLER_TYPE_FILTER_OPTIONS = ["전체", "business", "individual"] as const;

export const SELLER_SALES_STATUS_FILTER_OPTIONS = ["전체", "not_started", "active", "suspended"] as const;

export const SELLER_TYPE_LABELS = DOMAIN_SELLER_TYPE_LABELS;
export { SELLER_TYPE_BADGE_LABELS, SELLER_APPROVAL_STATUS_LABELS, SELLER_SALES_STATUS_LABELS, SELLER_SALES_SETUP_STATUS_LABELS, SELLER_APPLICATION_SOURCE_SHORT_LABELS, SELLER_PUBLIC_APPROVAL_STATUS_LABELS, SELLER_REVIEW_ACTION_LABELS };

export function sellerTypeBadgeClass(sellerType: SellerType) {
  return domainSellerTypeBadgeClass(sellerType);
}

export const EMPTY_SELLER_LIST_FILTERS: SellerListFilters = {
  keyword: "",
  sellerType: "전체",
  approvalStatus: "전체",
  salesStatus: "전체",
  appliedFrom: "",
  appliedTo: "",
};

export const SELLER_PROTOTYPE_STORAGE_KEY = "aos.admin.members.sellers.prototype.v1";

const STORAGE_SCHEMA_VERSION = 15 as const;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function cloneHistory(items: readonly SellerProcessHistoryItem[]) {
  return items.map((item) => ({ ...item }));
}

function cloneApplication(row: SellerApplication): SellerApplication {
  return { ...row, history: cloneHistory(row.history) };
}

function cloneSeedList(rows: readonly SellerApplication[]) {
  return rows.map(cloneApplication);
}

type SellerSeedInput = {
  applicationId: string;
  applicationNumber: string;
  sellerType: SellerType;
  sellerName: string;
  businessNumber: string | null;
  representativeName: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  applicationStatus: SellerApprovalStatusCode;
  salesStatus?: SellerSalesStatusCode | null;
  salesSetupStatus?: SellerSalesSetupStatusCode;
  productCount: number | null;
  commissionText: string | null;
  appliedAt: string;
  address?: string;
  addressDetail?: string;
  businessKind?: SellerBusinessKind | null;
  businessCategory?: string | null;
  businessItem?: string | null;
  officePhone?: string | null;
  homepage?: string | null;
  managerDepartment?: string | null;
  birthDate?: string | null;
  activityRegion?: string | null;
  joinPath?: string;
  applicationSource?: SellerApplicationSource;
  agencyId?: string;
  agencyName?: string;
  siteId?: string;
  sellerId?: string;
  relationId?: string;
  businessLicense?: SellerAttachmentMeta | null;
  supplementRequest?: SellerSupplementRequest | null;
  identityVerified?: boolean | null;
  phoneVerified?: boolean | null;
  rejectionReason?: string | null;
  rejectionGuideNote?: string | null;
  salesStopReason?: string | null;
  adminMemo?: string;
  loginId?: string | null;
  zipCode?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  salesStartedAt?: string | null;
  processedAt?: string | null;
  processedBy?: string | null;
  updatedAt?: string;
  history?: SellerProcessHistoryItem[];
};

function buildSeller(input: SellerSeedInput): SellerApplication {
  const isBusiness = input.sellerType === "business";
  const approvalStatus = input.applicationStatus;
  const approved = approvalStatus === "approved";
  const rejected = approvalStatus === "rejected";
  const approvedAt = input.approvedAt ?? (approved ? input.appliedAt : null);
  const rejectedAt = input.rejectedAt ?? (rejected ? input.appliedAt : null);
  const processedAt = input.processedAt ?? approvedAt ?? rejectedAt;
  const salesSetupStatus =
    input.salesSetupStatus ??
    deriveSellerSalesSetupStatus({
      approvalStatus,
      productCount: input.productCount,
      commissionText: input.commissionText,
    });
  const preferredSales =
    input.salesStatus === null
      ? null
      : input.salesStatus ??
        (approved ? "active" : null);
  const salesStatus = deriveDefaultSalesStatus({
    approvalStatus,
    salesSetupStatus,
    preferred: preferredSales,
  });
  const applicationSource: SellerApplicationSource =
    input.applicationSource ??
    (input.joinPath === SELLER_ADMIN_JOIN_PATH ? "admin" : "homepage");
  const joinPath = input.joinPath?.trim() || sellerApplicationSourceLabel(applicationSource);

  const history =
    input.history ??
    (approved
      ? [
          {
            processedAt: approvedAt ?? input.appliedAt,
            action: SELLER_REVIEW_ACTION_LABELS.approved,
            actionCode: "approved" as const,
            statusBefore: SELLER_APPROVAL_STATUS_LABELS.pending,
            statusAfter: SELLER_APPROVAL_STATUS_LABELS.approved,
            actor: SELLER_DEFAULT_PROCESSOR,
            note: "샘플 승인 처리",
          },
        ]
      : rejected
        ? [
            {
              processedAt: rejectedAt ?? input.appliedAt,
              action: SELLER_REVIEW_ACTION_LABELS.rejected,
              actionCode: "rejected" as const,
              statusBefore: SELLER_APPROVAL_STATUS_LABELS.pending,
              statusAfter: SELLER_APPROVAL_STATUS_LABELS.rejected,
              actor: SELLER_DEFAULT_PROCESSOR,
              note: input.rejectionReason ?? "샘플 거절 처리",
            },
          ]
        : [
            {
              processedAt: input.appliedAt,
              action: SELLER_REVIEW_ACTION_LABELS.applied,
              actionCode: "applied" as const,
              statusBefore: "-",
              statusAfter: SELLER_APPROVAL_STATUS_LABELS[approvalStatus],
              actor: applicationSource === "admin" ? SELLER_DEFAULT_PROCESSOR : "홈페이지 신청자",
              note:
                applicationSource === "admin"
                  ? "관리자 직접등록"
                  : "홈페이지 판매점 가입신청",
            },
          ]);

  return {
    sellerId: input.sellerId ?? input.applicationId,
    applicationId: input.applicationId,
    relationId: input.relationId ?? `REL-${input.applicationId}`,
    applicationNumber: input.applicationNumber,
    sellerType: input.sellerType,
    sellerName: input.sellerName,
    businessNumber: input.businessNumber,
    representativeName: input.representativeName,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    applicationStatus: approvalStatus,
    salesSetupStatus,
    salesStatus,
    productCount: input.productCount,
    commissionText: input.commissionText,
    appliedAt: input.appliedAt,
    updatedAt: input.updatedAt ?? input.processedAt ?? input.appliedAt,
    approvedAt,
    rejectedAt,
    salesStartedAt:
      input.salesStartedAt ?? (salesStatus === "active" ? approvedAt : null),
    processedAt,
    processedBy: input.processedBy ?? (processedAt ? SELLER_DEFAULT_PROCESSOR : null),
    rejectionReason: input.rejectionReason ?? (rejected ? "운영정책 부적합" : null),
    rejectionGuideNote: input.rejectionGuideNote ?? (rejected ? "보완 후 재신청이 가능합니다." : null),
    salesStopReason:
      input.salesStopReason ?? (approved && salesStatus === "suspended" ? "일시 중단" : null),
    adminMemo: input.adminMemo ?? "",
    loginId: input.loginId ?? null,
    zipCode: input.zipCode ?? null,
    address: input.address ?? (isBusiness ? "서울특별시 강남구 테헤란로 100" : "서울특별시 마포구 월드컵북로 10"),
    addressDetail: input.addressDetail ?? (isBusiness ? "AOS빌딩 8층" : "101동 1203호"),
    businessKind: input.businessKind ?? (isBusiness ? "개인사업자" : null),
    businessCategory: input.businessCategory ?? (isBusiness ? "여행업" : null),
    businessItem: input.businessItem ?? (isBusiness ? "국내외 여행알선" : null),
    officePhone: input.officePhone ?? (isBusiness ? "02-1234-5678" : null),
    homepage: input.homepage ?? (isBusiness ? "https://example.com" : null),
    managerDepartment: input.managerDepartment ?? (isBusiness ? "영업팀" : null),
    birthDate: input.birthDate ?? (isBusiness ? null : "1990-01-15"),
    activityRegion: input.activityRegion ?? (isBusiness ? null : "서울·경기"),
    joinPath,
    applicationSource,
    agencyId: input.agencyId ?? PROTOTYPE_DEFAULT_AGENCY_ID,
    agencyName: input.agencyName ?? PROTOTYPE_DEFAULT_AGENCY_NAME,
    siteId: input.siteId ?? PROTOTYPE_DEFAULT_SITE_ID,
    businessLicense: input.businessLicense ?? null,
    supplementRequest: input.supplementRequest ?? null,
    identityVerified: input.identityVerified ?? (isBusiness ? null : true),
    phoneVerified: input.phoneVerified ?? (isBusiness ? null : true),
    history: cloneHistory(history),
  };
}


/** Mock 상세 URL: /members/sellers/SELLER-001 */
export const SELLER_APPLICATION_ID_PATTERN = /^SELLER-\d+$/;

export function formatSellerPartnerCode(applicationId: string) {
  const match = /^SELLER-(\d+)$/i.exec(applicationId.trim());
  if (!match?.[1]) return "—";
  return `AOS${match[1].padStart(5, "0")}`;
}

export function formatSellerBusinessNumber(value: string | null | undefined) {
  if (!value || !String(value).trim()) return "-";
  const digits = digitsOnly(value);
  if (digits.length !== 10) return value.trim();
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function formatSellerMobilePhone(value: string) {
  const digits = digitsOnly(value);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value.trim() || "—";
}

export function formatSellerDateTime(value: string | null | undefined) {
  if (!value || !String(value).trim()) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function displaySellerText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "-";
}

/** 본인확인·휴대전화 인증 표시 */
export function formatSellerVerificationStatus(verified: boolean | null | undefined) {
  if (verified === true) return "인증완료";
  if (verified === false) return "미인증";
  return "-";
}

/** 목록용 가입일(가입 신청일) — affiliates 목록과 동일하게 YYYY-MM-DD */
export function formatSellerAppliedDate(value: string) {
  const key = appliedDateKey(value);
  return key || "—";
}

/** 상세 요약용 가입일 — YYYY.MM.DD */
export function formatSellerSummaryDate(value: string | null | undefined) {
  if (!value || !String(value).trim()) return "-";
  const key = appliedDateKey(value);
  if (!key) return "-";
  return key.replace(/-/g, ".");
}

export function formatSellerProductCount(count: number | null | undefined) {
  if (count === null || count === undefined) return "미설정";
  return `${count}개`;
}

/** 판매상품 표시용 Badge 클래스 */
export function sellerProductCountBadgeClass(count: number | null | undefined) {
  if (count === null || count === undefined) return "gray";
  if (count === 0) return "warn";
  return "info";
}

export function formatSellerCommissionText(value: string | null | undefined) {
  if (!value || !String(value).trim()) return "미설정";
  return value.trim();
}

/** 수수료 표시용 Badge 클래스 */
export function sellerCommissionBadgeClass(value: string | null | undefined) {
  const label = formatSellerCommissionText(value);
  if (label === "미설정") return "gray";
  if (label === "개별설정") return "info";
  return "success";
}

/** 목록 판매점명: 사업자=상호명, 개인=신청자 이름 */
export function formatSellerListDisplayName(row: SellerApplication) {
  if (row.sellerType === "individual") {
    return row.contactName.trim() || "—";
  }
  return row.sellerName.trim() || "—";
}

/** 목록 「유형」 Subtext: 사업자만 사업자등록번호 표시 */
export function formatSellerListTypeSubtext(row: SellerApplication): string | null {
  if (row.sellerType !== "business") return null;
  const businessNumber = formatSellerBusinessNumber(row.businessNumber);
  return businessNumber === "-" ? null : businessNumber;
}

/** @deprecated 목록에서는 formatSellerListTypeSubtext 사용 */
export function formatSellerListNameSubtext(row: SellerApplication): string | null {
  return formatSellerListTypeSubtext(row);
}

/** 목록 「대표자 / 신청자」: 사업자=대표자명, 개인=신청자명 */
export function formatSellerPersonName(row: SellerApplication) {
  if (row.sellerType === "individual") {
    return row.contactName.trim() || "—";
  }
  return row.representativeName?.trim() || "—";
}

export function sellerApplicationStatusBadgeClass(status: SellerApprovalStatusCode) {
  return domainApprovalBadgeClass(status);
}

export function sellerSalesStatusBadgeClass(status: SellerSalesStatusCode) {
  return domainSalesBadgeClass(status);
}

export { sellerSalesSetupStatusBadgeClass, sellerApprovalStatusLabel, sellerSalesStatusLabel, sellerSalesSetupStatusLabel, sellerApplicationSourceLabel, sellerApplicationSourceShortLabel, sellerPublicApprovalStatusLabel, sellerReviewActionLabel, canStartSelling };

/**
 * 판매상태 표시값.
 * 승인 전·후에도 not_started(판매전)를 그대로 노출한다. (승인만으로 active 되지 않음)
 */
export function resolveSellerSalesStatus(row: SellerApplication): SellerSalesStatusCode {
  return row.salesStatus;
}

/** 판매개시 가능 여부 (Mock helper) */
export function evaluateSellerCanStartSelling(row: SellerApplication): SellerStartSellingCheckResult {
  const commission = (row.commissionText ?? "").trim();
  return canStartSelling({
    approvalStatus: row.applicationStatus,
    productCount: row.productCount,
    commissionReady: Boolean(commission) && commission !== "미설정",
    settlementReady: false,
  });
}

export function toSellerProfile(row: SellerApplication): SellerProfile {
  return {
    sellerId: row.sellerId,
    sellerType: row.sellerType,
    sellerName: row.sellerName,
    businessNumber: row.businessNumber,
    businessKind: row.businessKind,
    representativeName: row.representativeName,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    officePhone: row.officePhone,
    zipCode: row.zipCode,
    address: row.address,
    addressDetail: row.addressDetail,
    homepage: row.homepage,
    loginId: row.loginId,
    businessLicense: row.businessLicense,
  };
}

export function toSellerAgencyRelation(row: SellerApplication): SellerAgencyRelation {
  return {
    relationId: row.relationId,
    sellerId: row.sellerId,
    agencyId: row.agencyId,
    agencyName: row.agencyName,
    siteId: row.siteId,
    applicationId: row.applicationId,
    applicationNumber: row.applicationNumber,
    applicationSource: row.applicationSource,
    approvalStatus: row.applicationStatus,
    salesSetupStatus: row.salesSetupStatus,
    salesStatus: row.salesStatus,
    defaultCommission: row.commissionText,
    appliedAt: row.appliedAt,
    approvedAt: row.approvedAt,
    rejectedAt: row.rejectedAt,
    salesStartedAt: row.salesStartedAt,
    productCount: row.productCount,
    rejectionReason: row.rejectionReason,
    rejectionGuideNote: row.rejectionGuideNote,
    salesStopReason: row.salesStopReason,
    adminMemo: row.adminMemo,
  };
}


function appliedDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function filterSellerApplications(
  applications: readonly SellerApplication[],
  filters: SellerListFilters,
): { ok: true; rows: SellerApplication[] } | { ok: false; message: string } {
  const from = filters.appliedFrom.trim();
  const to = filters.appliedTo.trim();
  if (from && to && from > to) {
    return { ok: false, message: "가입 시작일이 종료일보다 늦을 수 없습니다." };
  }

  const keyword = filters.keyword.trim();
  const keywordLower = keyword.toLowerCase();
  const keywordDigits = digitsOnly(keyword);

  const rows = applications
    .filter((row) => {
      if (filters.sellerType !== "전체" && row.sellerType !== filters.sellerType) {
        return false;
      }
      if (filters.approvalStatus !== "전체" && row.applicationStatus !== filters.approvalStatus) {
        return false;
      }
      if (filters.salesStatus !== "전체") {
        const resolvedSales = resolveSellerSalesStatus(row);
        if (resolvedSales !== filters.salesStatus) {
          return false;
        }
      }

      const day = appliedDateKey(row.appliedAt);
      if (from && day && day < from) return false;
      if (to && day && day > to) return false;

      if (!keyword) return true;

      const haystack = [
        row.sellerName,
        row.representativeName ?? "",
        row.contactName,
        row.contactPhone,
        row.contactEmail,
        row.applicationNumber,
        formatSellerPartnerCode(row.applicationId),
        row.businessNumber ?? "",
        SELLER_TYPE_LABELS[row.sellerType],
      ]
        .join(" ")
        .toLowerCase();

      if (haystack.includes(keywordLower)) return true;
      const keywordIsContactLike = Boolean(keywordDigits) && !/[a-zA-Z가-힣]/.test(keyword);
      if (keywordIsContactLike && digitsOnly(row.contactPhone).includes(keywordDigits)) return true;
      if (keywordIsContactLike && digitsOnly(row.businessNumber ?? "").includes(keywordDigits)) return true;
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

export function getSellerListTotals(applications: readonly SellerApplication[]): SellerListTotals {
  return {
    total: applications.length,
    pending: applications.filter((row) => row.applicationStatus === "pending").length,
    reviewing: applications.filter((row) => row.applicationStatus === "reviewing").length,
    supplement: applications.filter((row) => row.applicationStatus === "supplement_requested").length,
    approved: applications.filter((row) => row.applicationStatus === "approved").length,
    rejected: applications.filter((row) => row.applicationStatus === "rejected").length,
  };
}

export function paginateSellerApplications(
  rows: readonly SellerApplication[],
  page: number,
  pageSize = SELLER_LIST_PAGE_SIZE,
) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    rows: rows.slice(start, start + pageSize),
  };
}

/** 상세화면 테스트용 Mock ID */
export const SELLER_DETAIL_TEST_BUSINESS_ID = "SELLER-001";
export const SELLER_DETAIL_TEST_INDIVIDUAL_ID = "SELLER-002";

const SEED_APPLICATIONS: SellerApplication[] = [
  // 상세 테스트 · 사업자 판매점
  buildSeller({
    applicationId: SELLER_DETAIL_TEST_BUSINESS_ID,
    applicationNumber: "AOS-S-20260909-2001",
    sellerType: "business",
    sellerName: "우리여행",
    businessNumber: "123-45-67890",
    representativeName: "김민수",
    contactName: "박영희",
    contactPhone: "010-2222-3333",
    contactEmail: "park.yh@woori-tour.example.com",
    applicationStatus: "approved",
    salesStatus: "active",
    productCount: 12,
    commissionText: "5%",
    appliedAt: "2026-09-08T01:00:00.000Z",
    approvedAt: "2026-09-09T02:10:00.000Z",
    updatedAt: "2026-09-09T02:10:00.000Z",
    businessKind: "법인사업자",
    officePhone: "02-1234-5678",
    managerDepartment: "영업팀",
    address: "서울특별시 강남구 테헤란로 100",
    addressDetail: "AOS빌딩 8층",
    salesStopReason: null,
    joinPath: "홈페이지 판매점 신청",
  }),
  // 상세 테스트 · 개인 판매점
  buildSeller({
    applicationId: SELLER_DETAIL_TEST_INDIVIDUAL_ID,
    applicationNumber: "AOS-S-20260908-2002",
    sellerType: "individual",
    sellerName: "이수진",
    businessNumber: null,
    representativeName: null,
    contactName: "이수진",
    contactPhone: "010-9876-5432",
    contactEmail: "leesujin@example.com",
    applicationStatus: "pending",
    salesStatus: null,
    productCount: 0,
    commissionText: "미설정",
    appliedAt: "2026-09-08T04:30:00.000Z",
    address: "서울특별시 마포구 월드컵북로 10",
    addressDetail: "101동 1203호",
    birthDate: "1988-03-22",
    activityRegion: "서울·경기",
    identityVerified: true,
    phoneVerified: true,
    joinPath: "홈페이지 판매점 신청",
  }),
  buildSeller({
    applicationId: "SELLER-003",
    applicationNumber: "AOS-S-20260907-2003",
    sellerType: "business",
    sellerName: "서울투어파트너",
    businessNumber: "234-56-78901",
    representativeName: "박성진",
    contactName: "박성진",
    contactPhone: "010-3456-7890",
    contactEmail: "seoulpartner@example.com",
    applicationStatus: "approved",
    salesStatus: "suspended",
    productCount: 8,
    commissionText: "개별설정",
    appliedAt: "2026-09-07T06:15:00.000Z",
  }),
  buildSeller({
    applicationId: "SELLER-004",
    applicationNumber: "AOS-S-20260906-2004",
    sellerType: "individual",
    sellerName: "정현우",
    businessNumber: null,
    representativeName: null,
    contactName: "정현우",
    contactPhone: "010-2468-1357",
    contactEmail: "junghw@example.com",
    applicationStatus: "reviewing",
    salesStatus: null,
    productCount: 0,
    commissionText: "미설정",
    appliedAt: "2026-09-06T08:40:00.000Z",
    identityVerified: true,
    phoneVerified: false,
    processedAt: "2026-09-09T01:10:00.000Z",
    processedBy: SELLER_DEFAULT_PROCESSOR,
    history: [
      {
        processedAt: "2026-09-09T01:10:00.000Z",
        action: SELLER_REVIEW_ACTION_LABELS.review_started,
        actionCode: "review_started",
        statusBefore: SELLER_APPROVAL_STATUS_LABELS.pending,
        statusAfter: SELLER_APPROVAL_STATUS_LABELS.reviewing,
        actor: SELLER_DEFAULT_PROCESSOR,
        note: "관리자가 가입신청 검토를 시작했습니다.",
      },
      {
        processedAt: "2026-09-06T08:40:00.000Z",
        action: SELLER_REVIEW_ACTION_LABELS.applied,
        actionCode: "applied",
        statusBefore: "-",
        statusAfter: SELLER_APPROVAL_STATUS_LABELS.pending,
        actor: "홈페이지 신청자",
        note: "홈페이지 판매점 가입신청",
      },
    ],
  }),
  buildSeller({
    applicationId: "SELLER-005",
    applicationNumber: "AOS-S-20260905-2005",
    sellerType: "business",
    sellerName: "한빛여행사",
    businessNumber: "345-67-89012",
    representativeName: "최유진",
    contactName: "한담당",
    contactPhone: "010-5555-1212",
    contactEmail: "hanbit@example.com",
    applicationStatus: "pending",
    salesStatus: null,
    productCount: null,
    commissionText: null,
    appliedAt: "2026-09-05T01:20:00.000Z",
    managerDepartment: "제휴영업팀",
    businessLicense: {
      name: "사업자등록증_한빛여행사.pdf",
      url: "#seller-license-hanbit",
      uploadedAt: "2026-09-05T01:18:00.000Z",
    },
  }),
  buildSeller({
    applicationId: "SELLER-006",
    applicationNumber: "AOS-S-20260903-2006",
    sellerType: "individual",
    sellerName: "오세린",
    businessNumber: null,
    representativeName: null,
    contactName: "오세린",
    contactPhone: "010-7788-9900",
    contactEmail: "ohserin@example.com",
    applicationStatus: "rejected",
    salesStatus: null,
    productCount: null,
    commissionText: null,
    appliedAt: "2026-09-03T09:05:00.000Z",
    rejectionReason: "운영정책 부적합",
    rejectionGuideNote: "현재 개인 판매점 모집이 일시 중단되었습니다.",
  }),
  buildSeller({
    applicationId: "SELLER-007",
    applicationNumber: "AOS-S-20260828-2007",
    sellerType: "business",
    sellerName: "제주올레투어",
    businessNumber: "456-78-90123",
    representativeName: "강동현",
    contactName: "제담당",
    contactPhone: "010-2222-3344",
    contactEmail: "jejuolle@example.com",
    applicationStatus: "rejected",
    salesStatus: null,
    productCount: null,
    commissionText: null,
    appliedAt: "2026-08-28T05:45:00.000Z",
    rejectionReason: "사업자 정보 확인 필요",
  }),
  buildSeller({
    applicationId: "SELLER-008",
    applicationNumber: "AOS-S-20260820-2008",
    sellerType: "business",
    sellerName: "부산해운대여행",
    businessNumber: "567-89-01234",
    representativeName: "윤서아",
    contactName: "부담당",
    contactPhone: "010-6666-7788",
    contactEmail: "haeundae@example.com",
    applicationStatus: "approved",
    salesStatus: "active",
    productCount: 6,
    commissionText: "8%",
    appliedAt: "2026-08-20T03:00:00.000Z",
    address: "부산광역시 해운대구 해운대해변로 264",
  }),
  buildSeller({
    applicationId: "SELLER-009",
    applicationNumber: "AOS-S-20260812-2009",
    sellerType: "individual",
    sellerName: "김나영",
    businessNumber: null,
    representativeName: null,
    contactName: "김나영",
    contactPhone: "010-1357-2468",
    contactEmail: "kimnayoung@example.com",
    applicationStatus: "approved",
    salesStatus: "suspended",
    productCount: 2,
    commissionText: "개별설정",
    appliedAt: "2026-08-12T07:25:00.000Z",
  }),
  buildSeller({
    applicationId: "SELLER-010",
    applicationNumber: "AOS-S-20260805-2010",
    sellerType: "business",
    sellerName: "행복파트너투어",
    businessNumber: "678-90-12345",
    representativeName: "송지훈",
    contactName: "행담당",
    contactPhone: "010-9999-0001",
    contactEmail: "happypartner@example.com",
    applicationStatus: "supplement_requested",
    salesStatus: null,
    productCount: null,
    commissionText: null,
    appliedAt: "2026-08-05T11:10:00.000Z",
    processedAt: "2026-09-10T01:30:00.000Z",
    processedBy: SELLER_DEFAULT_PROCESSOR,
    businessLicense: {
      name: "사업자등록증_행복파트너투어.jpg",
      url: "#seller-license-happy",
      uploadedAt: "2026-08-05T11:05:00.000Z",
    },
    supplementRequest: {
      requestedAt: "2026-09-10T01:30:00.000Z",
      requestedBy: SELLER_DEFAULT_PROCESSOR,
      supplementItems: ["사업자등록증", "주소"],
      supplementMessage: "사업자등록증 이미지가 식별되지 않아 재첨부 요청합니다. 주소도 사업해 주세요.",
      completedAt: null,
    },
    history: [
      {
        processedAt: "2026-09-10T01:30:00.000Z",
        action: SELLER_REVIEW_ACTION_LABELS.supplement_requested,
        actionCode: "supplement_requested",
        statusBefore: SELLER_APPROVAL_STATUS_LABELS.reviewing,
        statusAfter: SELLER_APPROVAL_STATUS_LABELS.supplement_requested,
        actor: SELLER_DEFAULT_PROCESSOR,
        note: "사업자등록증, 주소 — 사업자등록증 이미지가 식별되지 않아 재첨부 요청합니다. 주소도 확인해 주세요.",
      },
      {
        processedAt: "2026-09-09T23:50:00.000Z",
        action: SELLER_REVIEW_ACTION_LABELS.review_started,
        actionCode: "review_started",
        statusBefore: SELLER_APPROVAL_STATUS_LABELS.pending,
        statusAfter: SELLER_APPROVAL_STATUS_LABELS.reviewing,
        actor: SELLER_DEFAULT_PROCESSOR,
        note: "관리자가 가입신청 검토를 시작했습니다.",
      },
      {
        processedAt: "2026-08-05T11:10:00.000Z",
        action: SELLER_REVIEW_ACTION_LABELS.applied,
        actionCode: "applied",
        statusBefore: "-",
        statusAfter: SELLER_APPROVAL_STATUS_LABELS.pending,
        actor: "홈페이지 신청자",
        note: "홈페이지 판매점 가입신청",
      },
    ],
  }),
];

export const SELLER_APPLICATION_SEED = cloneSeedList(SEED_APPLICATIONS);

type SellerPrototypeStoragePayload = {
  version: typeof STORAGE_SCHEMA_VERSION;
  overrides: Record<string, SellerApplication>;
  deletedIds: string[];
  /** 시드 외 관리자 직접등록 판매점 ID */
  createdIds: string[];
};

function emptyPrototypePayload(): SellerPrototypeStoragePayload {
  return { version: STORAGE_SCHEMA_VERSION, overrides: {}, deletedIds: [], createdIds: [] };
}

function isBrowserStorageAvailable() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isApplicationStatus(value: unknown): value is SellerApprovalStatusCode {
  if (isSellerApprovalStatusCode(value)) return true;
  return parseSellerApprovalStatusLabel(String(value ?? "")) != null;
}

function isSalesStatus(value: unknown): value is SellerSalesStatusCode {
  if (isSellerSalesStatusCode(value)) return true;
  return parseSellerSalesStatusLabel(typeof value === "string" ? value : null) != null;
}

function isValidStoredApplication(value: unknown): value is SellerApplication {
  if (!value || typeof value !== "object") return false;
  const row = value as SellerApplication;
  if (typeof row.applicationId !== "string" || !SELLER_APPLICATION_ID_PATTERN.test(row.applicationId)) return false;
  if (typeof row.applicationNumber !== "string") return false;
  if (!isSellerType(row.sellerType)) return false;
  if (typeof row.sellerName !== "string" || typeof row.contactName !== "string") return false;
  if (!(row.businessNumber === null || typeof row.businessNumber === "string")) return false;
  if (!(row.representativeName === null || typeof row.representativeName === "string")) return false;
  if (typeof row.contactPhone !== "string" || typeof row.contactEmail !== "string") return false;
  if (!isApplicationStatus(row.applicationStatus)) return false;
  if (row.salesStatus != null && !isSalesStatus(row.salesStatus)) return false;
  if (!(row.productCount === null || typeof row.productCount === "number")) return false;
  if (!(row.commissionText === null || typeof row.commissionText === "string")) return false;
  if (typeof row.appliedAt !== "string") return false;
  return true;
}

function coerceStoredApplication(value: SellerApplication): SellerApplication {
  const approvalStatus =
    parseSellerApprovalStatusLabel(String(value.applicationStatus)) ??
    (isSellerApprovalStatusCode(value.applicationStatus) ? value.applicationStatus : "pending");
  const salesStatus =
    parseSellerSalesStatusLabel(
      value.salesStatus == null ? null : String(value.salesStatus),
    ) ?? (isSellerSalesStatusCode(value.salesStatus) ? value.salesStatus : null);
  const applicationSource: SellerApplicationSource =
    isSellerApplicationSource(value.applicationSource)
      ? value.applicationSource
      : value.joinPath === SELLER_ADMIN_JOIN_PATH
        ? "admin"
        : "homepage";

  return buildSeller({
    applicationId: value.applicationId,
    applicationNumber: value.applicationNumber,
    sellerType: value.sellerType,
    sellerName: value.sellerName,
    businessNumber: value.businessNumber,
    representativeName: value.representativeName,
    contactName: value.contactName,
    contactPhone: value.contactPhone,
    contactEmail: value.contactEmail,
    applicationStatus: approvalStatus,
    salesStatus,
    salesSetupStatus: isSellerSalesSetupStatusCode(value.salesSetupStatus)
      ? value.salesSetupStatus
      : undefined,
    productCount: value.productCount,
    commissionText: value.commissionText,
    appliedAt: value.appliedAt,
    address: typeof value.address === "string" ? value.address : undefined,
    addressDetail: typeof value.addressDetail === "string" ? value.addressDetail : undefined,
    businessKind: value.businessKind ?? undefined,
    businessCategory: value.businessCategory ?? undefined,
    businessItem: value.businessItem ?? undefined,
    officePhone: value.officePhone ?? undefined,
    homepage: value.homepage ?? undefined,
    managerDepartment: value.managerDepartment ?? undefined,
    birthDate: value.birthDate ?? undefined,
    activityRegion: value.activityRegion ?? undefined,
    joinPath: typeof value.joinPath === "string" ? value.joinPath : undefined,
    applicationSource,
    agencyId: typeof value.agencyId === "string" ? value.agencyId : undefined,
    agencyName: typeof value.agencyName === "string" ? value.agencyName : undefined,
    siteId: typeof value.siteId === "string" ? value.siteId : undefined,
    sellerId: typeof value.sellerId === "string" ? value.sellerId : undefined,
    relationId: typeof value.relationId === "string" ? value.relationId : undefined,
    businessLicense: value.businessLicense ?? undefined,
    supplementRequest: value.supplementRequest ?? undefined,
    identityVerified:
      typeof value.identityVerified === "boolean" || value.identityVerified === null
        ? value.identityVerified
        : undefined,
    phoneVerified:
      typeof value.phoneVerified === "boolean" || value.phoneVerified === null
        ? value.phoneVerified
        : undefined,
    rejectionReason: value.rejectionReason ?? undefined,
    rejectionGuideNote: value.rejectionGuideNote ?? undefined,
    salesStopReason: typeof value.salesStopReason === "string" || value.salesStopReason === null
      ? value.salesStopReason
      : undefined,
    adminMemo: typeof value.adminMemo === "string" ? value.adminMemo : undefined,
    loginId: typeof value.loginId === "string" || value.loginId === null ? value.loginId : undefined,
    zipCode: typeof value.zipCode === "string" || value.zipCode === null ? value.zipCode : undefined,
    approvedAt: value.approvedAt ?? undefined,
    rejectedAt: value.rejectedAt ?? undefined,
    salesStartedAt: value.salesStartedAt ?? undefined,
    processedAt: value.processedAt ?? undefined,
    processedBy: value.processedBy ?? undefined,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
    history: Array.isArray(value.history) ? value.history : undefined,
  });
}

function readPrototypePayload(): SellerPrototypeStoragePayload {
  if (!isBrowserStorageAvailable()) {
    return emptyPrototypePayload();
  }
  try {
    const raw = window.sessionStorage.getItem(SELLER_PROTOTYPE_STORAGE_KEY);
    if (!raw) return emptyPrototypePayload();
    const parsed = JSON.parse(raw) as Partial<SellerPrototypeStoragePayload>;
    if (parsed.version !== STORAGE_SCHEMA_VERSION || !parsed.overrides || typeof parsed.overrides !== "object") {
      return emptyPrototypePayload();
    }
    const overrides: Record<string, SellerApplication> = {};
    for (const [key, value] of Object.entries(parsed.overrides)) {
      if (!isValidStoredApplication(value)) continue;
      if (value.applicationId !== key) continue;
      overrides[key] = coerceStoredApplication(value);
    }
    const deletedIds = Array.isArray(parsed.deletedIds)
      ? parsed.deletedIds.filter((id): id is string => typeof id === "string" && SELLER_APPLICATION_ID_PATTERN.test(id))
      : [];
    const createdIds = Array.isArray(parsed.createdIds)
      ? parsed.createdIds.filter((id): id is string => typeof id === "string" && SELLER_APPLICATION_ID_PATTERN.test(id))
      : [];
    return { version: STORAGE_SCHEMA_VERSION, overrides, deletedIds, createdIds };
  } catch {
    return emptyPrototypePayload();
  }
}

function writePrototypePayload(payload: SellerPrototypeStoragePayload) {
  if (!isBrowserStorageAvailable()) return false;
  try {
    window.sessionStorage.setItem(SELLER_PROTOTYPE_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadPrototypeSellerApplications(): SellerApplication[] {
  const { overrides, deletedIds, createdIds } = readPrototypePayload();
  const deleted = new Set(deletedIds);
  const seedIds = new Set(SEED_APPLICATIONS.map((seed) => seed.applicationId));
  const seeds = SEED_APPLICATIONS.filter((seed) => !deleted.has(seed.applicationId)).map((seed) => {
    const override = overrides[seed.applicationId];
    return override ? cloneApplication(override) : cloneApplication(seed);
  });
  const created = createdIds
    .filter((id) => !deleted.has(id) && !seedIds.has(id))
    .map((id) => overrides[id])
    .filter((row): row is SellerApplication => Boolean(row))
    .map(cloneApplication);
  return [...seeds, ...created];
}

export function getPrototypeSellerApplication(applicationId: string): SellerApplication | null {
  const id = applicationId.trim();
  if (!id) return null;
  return loadPrototypeSellerApplications().find((row) => row.applicationId === id) ?? null;
}

function isKnownSellerApplicationId(applicationId: string, createdIds: string[]) {
  return (
    SEED_APPLICATIONS.some((seed) => seed.applicationId === applicationId) ||
    createdIds.includes(applicationId)
  );
}

export function savePrototypeSellerApplication(application: SellerApplication): boolean {
  if (!isValidStoredApplication(application)) return false;
  const payload = readPrototypePayload();
  if (!isKnownSellerApplicationId(application.applicationId, payload.createdIds)) return false;
  payload.overrides[application.applicationId] = cloneApplication(coerceStoredApplication(application));
  payload.deletedIds = payload.deletedIds.filter((id) => id !== application.applicationId);
  return writePrototypePayload(payload);
}

function nextSellerApplicationId(existing: readonly SellerApplication[]): string {
  let max = 0;
  for (const row of existing) {
    const match = /^SELLER-(\d+)$/i.exec(row.applicationId);
    if (!match?.[1]) continue;
    max = Math.max(max, Number(match[1]));
  }
  return `SELLER-${String(max + 1).padStart(3, "0")}`;
}

function nextSellerApplicationNumber(now: Date) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `AOS-S-${y}${m}${d}-${seq}`;
}

export type CreateSellerApplicationInput = {
  sellerType: SellerType;
  sellerName: string;
  businessNumber: string | null;
  representativeName: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  officePhone: string | null;
  businessKind: SellerBusinessKind | null;
  zipCode: string | null;
  address: string;
  addressDetail: string;
  loginId: string;
  applicationStatus: Extract<SellerApprovalStatusCode, "pending" | "approved">;
  salesStatus: SellerSalesStatusCode | null;
  commissionText: string | null;
  adminMemo: string;
};

export function createPrototypeSellerApplication(
  input: CreateSellerApplicationInput,
  actor = SELLER_DEFAULT_PROCESSOR,
): { ok: true; application: SellerApplication } | { ok: false; message: string } {
  if (!isBrowserStorageAvailable()) {
    return { ok: false, message: "브라우저 저장소를 사용할 수 없습니다." };
  }
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const existing = loadPrototypeSellerApplications();
  const applicationId = nextSellerApplicationId(existing);
  const approved = input.applicationStatus === "approved";
  const salesStatus = approved ? input.salesStatus ?? "active" : "not_started";
  const application = buildSeller({
    applicationId,
    applicationNumber: nextSellerApplicationNumber(nowDate),
    sellerType: input.sellerType,
    sellerName: input.sellerName.trim(),
    businessNumber: input.businessNumber,
    representativeName: input.representativeName,
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim(),
    contactEmail: input.contactEmail.trim(),
    applicationStatus: input.applicationStatus,
    salesStatus,
    productCount: approved ? 0 : null,
    commissionText: input.commissionText,
    appliedAt: now,
    updatedAt: now,
    approvedAt: approved ? now : null,
    rejectedAt: null,
    processedAt: approved ? now : null,
    processedBy: approved ? actor : null,
    rejectionReason: null,
    rejectionGuideNote: null,
    salesStopReason: approved && salesStatus === "suspended" ? "일시 중단" : null,
    adminMemo: input.adminMemo.trim(),
    loginId: input.loginId.trim(),
    zipCode: input.zipCode?.trim() || null,
    address: input.address.trim(),
    addressDetail: input.addressDetail.trim(),
    businessKind: input.businessKind,
    businessCategory: input.sellerType === "business" ? "여행업" : null,
    businessItem: input.sellerType === "business" ? "국내외 여행알선" : null,
    officePhone: input.officePhone,
    homepage: null,
    managerDepartment: input.sellerType === "business" ? "영업팀" : null,
    birthDate: null,
    activityRegion: null,
    joinPath: SELLER_ADMIN_JOIN_PATH,
    applicationSource: "admin",
    identityVerified: null,
    phoneVerified: null,
    history: approved
      ? [
          {
            processedAt: now,
            action: "관리자 직접등록",
            actionCode: "approved" as const,
            statusBefore: "-",
            statusAfter: SELLER_APPROVAL_STATUS_LABELS.approved,
            actor,
            note: "관리자가 판매점을 직접 등록하고 승인완료로 처리했습니다.",
          },
        ]
      : [
          {
            processedAt: now,
            action: "관리자 직접등록",
            actionCode: "applied" as const,
            statusBefore: "-",
            statusAfter: SELLER_APPROVAL_STATUS_LABELS.pending,
            actor,
            note: "관리자가 판매점을 직접 등록했습니다. 승인 처리가 필요합니다.",
          },
        ],
  });

  const payload = readPrototypePayload();
  if (!payload.createdIds.includes(applicationId)) {
    payload.createdIds = [...payload.createdIds, applicationId];
  }
  payload.overrides[applicationId] = cloneApplication(application);
  payload.deletedIds = payload.deletedIds.filter((id) => id !== applicationId);
  if (!writePrototypePayload(payload)) {
    return { ok: false, message: "판매점 등록 저장에 실패했습니다." };
  }
  return { ok: true, application };
}

export function isSellerLoginIdTaken(loginId: string, excludeApplicationId?: string): boolean {
  const normalized = loginId.trim().toLowerCase();
  if (!normalized) return false;
  return loadPrototypeSellerApplications().some((row) => {
    if (excludeApplicationId && row.applicationId === excludeApplicationId) return false;
    return (row.loginId ?? "").trim().toLowerCase() === normalized;
  });
}

/** 정보수정에서 변경 가능한 프로필 필드 (유형·승인·판매상태·로그인ID 제외) */
export type UpdateSellerProfileInput = {
  sellerName: string;
  businessNumber: string | null;
  representativeName: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  officePhone: string | null;
  businessKind: SellerBusinessKind | null;
  zipCode: string | null;
  address: string;
  addressDetail: string;
  commissionText: string | null;
  adminMemo: string;
};

export function updatePrototypeSellerProfile(
  applicationId: string,
  input: UpdateSellerProfileInput,
  actor = SELLER_DEFAULT_PROCESSOR,
): { ok: true; application: SellerApplication } | { ok: false; message: string } {
  const current = getPrototypeSellerApplication(applicationId);
  if (!current) return { ok: false, message: "판매점 정보를 찾을 수 없습니다." };

  const now = new Date().toISOString();
  const next: SellerApplication = {
    ...current,
    sellerName: input.sellerName.trim(),
    businessNumber: input.businessNumber,
    representativeName: input.representativeName,
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim(),
    contactEmail: input.contactEmail.trim(),
    officePhone: input.officePhone,
    businessKind: current.sellerType === "business" ? input.businessKind : null,
    zipCode: input.zipCode?.trim() || null,
    address: input.address.trim(),
    addressDetail: input.addressDetail.trim(),
    commissionText: input.commissionText,
    adminMemo: input.adminMemo.trim(),
    updatedAt: now,
    processedAt: now,
    processedBy: actor,
    history: [
      {
        processedAt: now,
        action: "정보수정",
        statusBefore: current.applicationStatus,
        statusAfter: current.applicationStatus,
        actor,
        note: "판매점 기본정보·운영 설정을 수정했습니다.",
      },
      ...current.history,
    ],
  };

  if (!savePrototypeSellerApplication(next)) {
    return { ok: false, message: "판매점 정보 저장에 실패했습니다." };
  }
  return { ok: true, application: next };
}

export function approveSellerApplication(
  applicationId: string,
  actor = SELLER_DEFAULT_PROCESSOR,
): { ok: true; application: SellerApplication } | { ok: false; message: string } {
  const current = getPrototypeSellerApplication(applicationId);
  if (!current) return { ok: false, message: "판매점 신청을 찾을 수 없습니다." };
  if (
    current.applicationStatus !== "pending" &&
    current.applicationStatus !== "reviewing" &&
    current.applicationStatus !== "supplement_requested"
  ) {
    return {
      ok: false,
      message: `현재 상태(${sellerApprovalStatusLabel(current.applicationStatus)})에서는 승인할 수 없습니다.`,
    };
  }
  const now = new Date().toISOString();
  const next: SellerApplication = {
    ...current,
    applicationStatus: "approved",
    salesSetupStatus: "not_configured",
    salesStatus: "not_started",
    productCount: current.productCount ?? 0,
    commissionText: current.commissionText ?? "미설정",
    approvedAt: now,
    rejectedAt: null,
    salesStartedAt: null,
    processedAt: now,
    processedBy: actor,
    rejectionReason: null,
    rejectionGuideNote: null,
    salesStopReason: null,
    supplementRequest: current.supplementRequest
      ? { ...current.supplementRequest, completedAt: current.supplementRequest.completedAt ?? now }
      : null,
    updatedAt: now,
    history: [
      {
        processedAt: now,
        action: SELLER_REVIEW_ACTION_LABELS.approved,
        actionCode: "approved",
        statusBefore: sellerApprovalStatusLabel(current.applicationStatus),
        statusAfter: SELLER_APPROVAL_STATUS_LABELS.approved,
        actor,
        note: "판매상품·수수료 설정 후 판매를 개시하세요.",
      },
      ...current.history,
    ],
  };
  if (!savePrototypeSellerApplication(next)) {
    return { ok: false, message: "승인 처리 저장에 실패했습니다." };
  }
  return { ok: true, application: next };
}

export function startSellerReview(
  applicationId: string,
  actor = SELLER_DEFAULT_PROCESSOR,
): { ok: true; application: SellerApplication } | { ok: false; message: string } {
  const current = getPrototypeSellerApplication(applicationId);
  if (!current) return { ok: false, message: "판매점 신청을 찾을 수 없습니다." };
  if (current.applicationStatus !== "pending") {
    return {
      ok: false,
      message: `현재 상태(${sellerApprovalStatusLabel(current.applicationStatus)})에서는 검토를 시작할 수 없습니다.`,
    };
  }
  const now = new Date().toISOString();
  const next: SellerApplication = {
    ...current,
    applicationStatus: "reviewing",
    processedAt: now,
    processedBy: actor,
    updatedAt: now,
    history: [
      {
        processedAt: now,
        action: SELLER_REVIEW_ACTION_LABELS.review_started,
        actionCode: "review_started",
        statusBefore: SELLER_APPROVAL_STATUS_LABELS.pending,
        statusAfter: SELLER_APPROVAL_STATUS_LABELS.reviewing,
        actor,
        note: "관리자가 가입신청 검토를 시작했습니다.",
      },
      ...current.history,
    ],
  };
  if (!savePrototypeSellerApplication(next)) {
    return { ok: false, message: "검토 시작 저장에 실패했습니다." };
  }
  return { ok: true, application: next };
}

export function requestSellerSupplement(
  applicationId: string,
  input: { items: string[]; message: string },
  actor = SELLER_DEFAULT_PROCESSOR,
): { ok: true; application: SellerApplication } | { ok: false; message: string } {
  const current = getPrototypeSellerApplication(applicationId);
  if (!current) return { ok: false, message: "판매점 신청을 찾을 수 없습니다." };
  if (current.applicationStatus !== "pending" && current.applicationStatus !== "reviewing") {
    return {
      ok: false,
      message: `현재 상태(${sellerApprovalStatusLabel(current.applicationStatus)})에서는 보완요청할 수 없습니다.`,
    };
  }
  const items = input.items.map((item) => item.trim()).filter(Boolean);
  const message = input.message.trim();
  if (items.length === 0) return { ok: false, message: "보완 항목을 1개 이상 선택해 주세요." };
  if (!message) return { ok: false, message: "보완 요청내용을 입력해 주세요." };

  const now = new Date().toISOString();
  const supplementRequest: SellerSupplementRequest = {
    requestedAt: now,
    requestedBy: actor,
    supplementItems: items,
    supplementMessage: message,
    completedAt: null,
  };
  const next: SellerApplication = {
    ...current,
    applicationStatus: "supplement_requested",
    salesSetupStatus: "not_configured",
    salesStatus: "not_started",
    processedAt: now,
    processedBy: actor,
    supplementRequest,
    updatedAt: now,
    history: [
      {
        processedAt: now,
        action: SELLER_REVIEW_ACTION_LABELS.supplement_requested,
        actionCode: "supplement_requested",
        statusBefore: sellerApprovalStatusLabel(current.applicationStatus),
        statusAfter: SELLER_APPROVAL_STATUS_LABELS.supplement_requested,
        actor,
        note: `${items.join(", ")} — ${message}`,
      },
      ...current.history,
    ],
  };
  if (!savePrototypeSellerApplication(next)) {
    return { ok: false, message: "보완요청 저장에 실패했습니다." };
  }
  return { ok: true, application: next };
}

export function rejectSellerApplication(
  applicationId: string,
  reason: string,
  guideNote = "",
  actor = SELLER_DEFAULT_PROCESSOR,
): { ok: true; application: SellerApplication } | { ok: false; message: string } {
  const current = getPrototypeSellerApplication(applicationId);
  if (!current) return { ok: false, message: "판매점 신청을 찾을 수 없습니다." };
  if (
    current.applicationStatus !== "pending" &&
    current.applicationStatus !== "reviewing" &&
    current.applicationStatus !== "supplement_requested"
  ) {
    return {
      ok: false,
      message: `현재 상태(${sellerApprovalStatusLabel(current.applicationStatus)})에서는 거절할 수 없습니다.`,
    };
  }
  const trimmedReason = reason.trim();
  if (!trimmedReason) return { ok: false, message: "거절 사유를 입력해 주세요." };
  const now = new Date().toISOString();
  const next: SellerApplication = {
    ...current,
    applicationStatus: "rejected",
    salesSetupStatus: "not_configured",
    salesStatus: "not_started",
    rejectedAt: now,
    approvedAt: null,
    salesStartedAt: null,
    processedAt: now,
    processedBy: actor,
    rejectionReason: trimmedReason,
    rejectionGuideNote: guideNote.trim(),
    salesStopReason: null,
    updatedAt: now,
    history: [
      {
        processedAt: now,
        action: SELLER_REVIEW_ACTION_LABELS.rejected,
        actionCode: "rejected",
        statusBefore: sellerApprovalStatusLabel(current.applicationStatus),
        statusAfter: SELLER_APPROVAL_STATUS_LABELS.rejected,
        actor,
        note: trimmedReason,
      },
      ...current.history,
    ],
  };
  if (!savePrototypeSellerApplication(next)) {
    return { ok: false, message: "거절 처리 저장에 실패했습니다." };
  }
  return { ok: true, application: next };
}

export function updateSellerSalesStatus(
  applicationId: string,
  salesStatus: SellerSalesStatusCode,
  options?: { reason?: string; actor?: string },
): { ok: true; application: SellerApplication } | { ok: false; message: string } {
  const actor = options?.actor ?? SELLER_DEFAULT_PROCESSOR;
  const current = getPrototypeSellerApplication(applicationId);
  if (!current) return { ok: false, message: "판매점 신청을 찾을 수 없습니다." };
  if (current.applicationStatus !== "approved") {
    return { ok: false, message: "승인완료된 판매점만 판매상태를 변경할 수 있습니다." };
  }
  if (current.salesStatus === salesStatus) {
    return { ok: true, application: current };
  }
  const stopReason = options?.reason?.trim() ?? "";
  if (salesStatus === "suspended" && !stopReason) {
    return { ok: false, message: "판매중지 사유를 입력해 주세요." };
  }
  const now = new Date().toISOString();
  const next: SellerApplication = {
    ...current,
    salesStatus,
    salesStopReason: salesStatus === "suspended" ? stopReason : null,
    salesStartedAt:
      salesStatus === "active" ? current.salesStartedAt ?? now : current.salesStartedAt,
    updatedAt: now,
    processedAt: now,
    processedBy: actor,
    history: [
      {
        processedAt: now,
        action: salesStatus === "suspended" ? "판매중지" : "판매개시/재개",
        statusBefore: sellerSalesStatusLabel(current.salesStatus),
        statusAfter: sellerSalesStatusLabel(salesStatus),
        actor,
        note:
          salesStatus === "suspended"
            ? `판매중지 사유: ${stopReason}`
            : "판매를 개시하여 판매중으로 변경했습니다.",
      },
      ...current.history,
    ],
  };
  if (!savePrototypeSellerApplication(next)) {
    return { ok: false, message: "판매상태 저장에 실패했습니다." };
  }
  return { ok: true, application: next };
}

export function deletePrototypeSellerApplication(applicationId: string): boolean {
  if (!SELLER_APPLICATION_ID_PATTERN.test(applicationId)) return false;
  const payload = readPrototypePayload();
  if (!isKnownSellerApplicationId(applicationId, payload.createdIds)) return false;
  if (!payload.deletedIds.includes(applicationId)) {
    payload.deletedIds = [...payload.deletedIds, applicationId];
  }
  delete payload.overrides[applicationId];
  if (payload.createdIds.includes(applicationId)) {
    payload.createdIds = payload.createdIds.filter((id) => id !== applicationId);
  }
  return writePrototypePayload(payload);
}

export function resetPrototypeSellerApplications(): boolean {
  if (!isBrowserStorageAvailable()) return true;
  try {
    window.sessionStorage.removeItem(SELLER_PROTOTYPE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
