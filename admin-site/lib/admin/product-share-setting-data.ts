/**
 * 상품관리 > 상품 상세 > 상품공유 설정 (UI 확인용)
 * - DB/API 연동 없음
 * - 상품·제휴여행사·공유상태 데이터는 product-affiliate-data.ts / products-data.ts를 사용합니다.
 */

import {
  createShareConditionForm,
  defaultEditPermissions,
  defaultSalesChannels,
  getSharePeriodMessages,
  isPartnershipShareable,
  partnershipShareBlockReason,
  todayIsoDate,
  type AffiliateAgencyRow,
  type EditPermissionKey,
  type ProductShareStatus,
  type InventoryMode,
  type SalesChannelKey,
  type ShareConditionForm,
  type ShareRequestMode,
} from "@/lib/admin/product-affiliate-data";

export type ShareTargetMode = "selected" | "all";
export type SharePeriodMode = "always" | "range";

export type ShareEditableItem = {
  key: string;
  label: string;
  editable: boolean;
  /** 공통 공유조건 form(editPermissions)의 대응 키 */
  permissionKey?: EditPermissionKey;
};

export const PRODUCT_DETAIL_TABS = ["기본정보", "일정표", "요금설정", "판매설정", "상품공유", "탑승지 설정"] as const;
export type ProductDetailTab = (typeof PRODUCT_DETAIL_TABS)[number];

export const SHARE_EDITABLE_ITEMS: ShareEditableItem[] = [
  { key: "category", label: "자사 카테고리 지정", editable: true, permissionKey: "ownCategory" },
  { key: "visible", label: "홈페이지 노출 여부", editable: true, permissionKey: "homepageVisible" },
  { key: "salesName", label: "판매용 상품명 설정", editable: true, permissionKey: "displayName" },
  { key: "salesIntro", label: "판매용 상품 소개문구", editable: true, permissionKey: "promoText" },
];

export const SHARE_LOCKED_ITEMS: ShareEditableItem[] = [
  { key: "schedule", label: "원본 일정 수정", editable: false },
  { key: "price", label: "원본 요금 수정", editable: false },
  { key: "departure", label: "출발일 수정", editable: false },
  { key: "seat", label: "좌석수 수정", editable: false },
];

export const SHARE_PROVIDED_SALES_INFO = [
  "상품명",
  "상품 이미지",
  "일정",
  "출발일",
  "탑승지",
  "판매가격",
  "잔여좌석",
  "출발상태",
  "최소출발인원",
  "포함/불포함사항",
  "취소/환불규정",
];

export const SHARE_PROVIDED_ADMIN_INFO = ["공급여행사", "담당자", "판매수수료", "공유조건", "공유기간"];

export const SHARE_REQUEST_MODE_DESCRIPTIONS: Record<ShareRequestMode, string> = {
  accept: "제휴여행사가 공유 요청을 수락하면 판매가 시작됩니다. 추가 시 상태는 수락대기입니다.",
  immediate: "제휴여행사 수락 없이 바로 판매가 시작됩니다. 추가 시 상태는 공유 중입니다.",
};

export const SHARE_RESHARE_NOTICE = "제휴여행사의 재공유는 허용하지 않습니다.";

export const SHARE_DEFAULT_CONDITION_NOTICE =
  "기본 공유조건은 별도조건이 없는 모든 공유 대상에 적용되며, 신규 추가 시 공유기간·요청 방식의 초기값이 됩니다. 여행사별 별도조건이 설정된 경우 별도조건이 우선합니다.";

export const SHARE_MEMO_NOTICE = "내부 메모는 고객 또는 제휴여행사에게 노출되지 않습니다.";

export const INVENTORY_SHORT_LABELS: Record<InventoryMode, string> = {
  shared: "공동재고",
  allocated: "여행사별 할당",
  confirm: "요청 후 확정",
};

export const SHARE_REQUEST_MODE_LABELS: Record<ShareRequestMode, string> = {
  accept: "수락 후 공유",
  immediate: "즉시 공유",
};

/** 상품 단위 공유 설정. 신규 공유 대상의 초기 조건으로 사용합니다. */
export type ShareDefaultSettings = {
  shareEnabled: boolean;
  targetMode: ShareTargetMode;
  periodMode: SharePeriodMode;
  periodStart: string;
  periodEnd: string;
  requestMode: ShareRequestMode;
  commissionRate: string;
  inventoryMode: InventoryMode;
  editableItems: Record<string, boolean>;
  salesChannels: Record<SalesChannelKey, boolean>;
};

export function createDefaultShareSettings(): ShareDefaultSettings {
  return {
    shareEnabled: true,
    targetMode: "selected",
    periodMode: "always",
    periodStart: "2026-10-01",
    periodEnd: "2026-12-31",
    requestMode: "accept",
    commissionRate: "10",
    inventoryMode: "shared",
    editableItems: Object.fromEntries(SHARE_EDITABLE_ITEMS.map((item) => [item.key, true])),
    salesChannels: defaultSalesChannels(),
  };
}

export function cloneShareDefaultSettings(settings: ShareDefaultSettings): ShareDefaultSettings {
  return {
    ...settings,
    editableItems: { ...settings.editableItems },
    salesChannels: { ...settings.salesChannels },
  };
}

/** 숫자와 소수점만 남깁니다. */
export function normalizeCommissionInput(raw: string) {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const [integer, ...decimals] = cleaned.split(".");
  return decimals.length > 0 ? `${integer}.${decimals.join("").slice(0, 2)}` : integer;
}

export function commissionRateError(raw: string) {
  if (!raw.trim()) return "판매수수료를 입력해 주세요.";
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) return "판매수수료는 0~100% 범위로 입력해 주세요.";
  return null;
}

/**
 * 상품 기본 공유조건을 공통 공유조건 form으로 변환합니다.
 * period를 넘기면 해당 여행사의 현재 공유기간을 유지합니다.
 */
export function shareConditionFormFromDefaults(
  settings: ShareDefaultSettings,
  customerListPrice: number,
  period?: { start: string | null; end: string | null },
): ShareConditionForm {
  const base = createShareConditionForm(customerListPrice);
  const editPermissions = { ...defaultEditPermissions(base.sellingPricePermission) };
  for (const item of SHARE_EDITABLE_ITEMS) {
    if (item.permissionKey) editPermissions[item.permissionKey] = settings.editableItems[item.key] ?? false;
  }
  const isRange = settings.periodMode === "range";
  const startDate = period?.start ?? (isRange ? settings.periodStart || todayIsoDate() : todayIsoDate());
  const endDate = period ? period.end ?? "" : isRange ? settings.periodEnd : "";
  return {
    ...base,
    requestMode: settings.requestMode,
    startDate,
    endDate,
    noEndDate: !endDate,
    commissionRate: settings.commissionRate,
    inventoryMode: settings.inventoryMode,
    editPermissions,
    salesChannels: { ...settings.salesChannels },
  };
}

type ShareConditionSummarySource = Pick<ShareConditionForm, "commissionRate" | "inventoryMode" | "noEndDate" | "endDate">;

/** 예: 수수료 15% · 공동재고 · 2026-12-31까지 */
export function shareConditionSummary(condition: ShareConditionSummarySource) {
  const commission = condition.commissionRate ? `수수료 ${condition.commissionRate}%` : "수수료 미지정";
  const period = condition.noEndDate || !condition.endDate ? "종료일 없음" : `${condition.endDate}까지`;
  return `${commission} · ${INVENTORY_SHORT_LABELS[condition.inventoryMode]} · ${period}`;
}

export function shareEditableItemLabels(editPermissions: ShareConditionForm["editPermissions"]) {
  return SHARE_EDITABLE_ITEMS.filter((item) => item.permissionKey && editPermissions[item.permissionKey]).map(
    (item) => item.label,
  );
}

export function formatSharePeriod(start: string | null, end: string | null) {
  if (!start && !end) return "-";
  return `${start ?? "-"} ~ ${end ?? "종료일 없음"}`;
}

export function formatFormSharePeriod(form: Pick<ShareConditionForm, "startDate" | "endDate" | "noEndDate">) {
  return formatSharePeriod(form.startDate || null, form.noEndDate ? null : form.endDate || null);
}

export const SHARE_PERIOD_MESSAGES = {
  startRequired: "공유 시작일을 입력해주세요.",
  endRequired: "공유 종료일을 입력해주세요.",
  endBeforeStart: "종료일은 시작일 이후로 설정해주세요.",
  endPassed: "이미 종료된 날짜로 공유기간을 설정할 수 없습니다.",
  salesEndExceeded: "상품 판매 종료일 이후까지 공유기간이 설정되어 있습니다.",
  salesExceededHint: "상품 판매기간을 초과한 공유기간은 실제 판매가 불가능할 수 있습니다.",
} as const;

export type SharePeriodValidation = {
  errors: { startDate?: string; endDate?: string };
  warnings: string[];
  hasError: boolean;
};

/**
 * 공유기간 공통 검증. 페이지 기본 공유조건과 여행사별 조건 Modal이 함께 사용합니다.
 * - 오류: 저장/조건 적용 불가
 * - 경고: 상품 판매기간(salesPeriod) 초과 등. 저장은 가능
 */
export function validateSharePeriod(params: {
  hasEndDate: boolean;
  startDate: string;
  endDate: string;
  salesPeriod: [string, string] | null;
  today?: string;
}): SharePeriodValidation {
  const today = params.today ?? todayIsoDate();
  const startDate = params.startDate;
  const endDate = params.hasEndDate ? params.endDate : "";
  const errors: SharePeriodValidation["errors"] = {};

  if (params.hasEndDate) {
    if (!startDate) errors.startDate = SHARE_PERIOD_MESSAGES.startRequired;
    if (!endDate) errors.endDate = SHARE_PERIOD_MESSAGES.endRequired;
    else if (startDate && endDate < startDate) errors.endDate = SHARE_PERIOD_MESSAGES.endBeforeStart;
    else if (endDate < today) errors.endDate = SHARE_PERIOD_MESSAGES.endPassed;
  }

  const warnings: string[] = [];
  if (params.salesPeriod) {
    const saleEnd = params.salesPeriod[1];
    const { startWarning, endWarning } = getSharePeriodMessages(
      startDate || today,
      endDate,
      !params.hasEndDate,
      params.salesPeriod,
    );
    if (startWarning) warnings.push(startWarning);
    const exceedsSalesEnd = params.hasEndDate ? Boolean(endDate) && endDate > saleEnd : true;
    if (exceedsSalesEnd) {
      warnings.push(
        params.hasEndDate
          ? SHARE_PERIOD_MESSAGES.salesEndExceeded
          : `종료일 없이 공유되어 상품 판매 종료일(${saleEnd}) 이후에도 공유가 유지됩니다.`,
      );
    } else if (endWarning) {
      warnings.push(endWarning);
    }
    if (warnings.length > 0) warnings.push(SHARE_PERIOD_MESSAGES.salesExceededHint);
  }

  return { errors, warnings, hasError: Boolean(errors.startDate || errors.endDate) };
}

/**
 * share 페이지 row 규칙: shareCondition이 있으면 여행사별 별도조건, null이면 상품 기본 공유조건을 사용합니다.
 * 샘플 데이터가 채워 둔 조건은 기본조건 스냅샷이므로 초기 로드 시 비웁니다.
 */
export function toShareSettingRows(rows: AffiliateAgencyRow[]): AffiliateAgencyRow[] {
  return rows.map((row) => ({ ...row, groups: [...row.groups], shareCondition: null }));
}

export function hasCustomShareCondition(row: AffiliateAgencyRow) {
  return row.shareCondition !== null;
}

/** 별도조건 해제: 개별 조건을 제거하고 상품 기본 공유조건을 다시 사용합니다. */
export function clearCustomShareCondition(row: AffiliateAgencyRow): AffiliateAgencyRow {
  return { ...row, shareCondition: null };
}

/** 공유 불가 사유. 전체 공유 제외와 개별 다시 공유 차단이 같은 기준(isPartnershipShareable)을 사용합니다. */
export function agencyShareBlockReason(row: AffiliateAgencyRow) {
  if (isPartnershipShareable(row.partnershipStatus)) return null;
  return partnershipShareBlockReason(row.partnershipStatus) ?? "공유할 수 없는 제휴상태입니다.";
}

export const RESHARE_BLOCKED_MESSAGE = "현재 제휴상태에서는 상품을 다시 공유할 수 없습니다.";
export const PAUSED_NOT_RESUMED_NOTICE = "공유 중지 상태의 여행사는 자동 재개되지 않습니다.";

/** 전체 공유 시 신규로 공유 상태가 바뀌는 상태. 공유 중·수락대기·공유 중지는 현재 상태를 유지합니다. */
const ALL_SHARE_NEW_TARGET_STATUSES: ProductShareStatus[] = ["미공유", "공유 종료", "공유 거절"];

export type AllShareClassification = {
  shareable: AffiliateAgencyRow[];
  newTargets: AffiliateAgencyRow[];
  kept: AffiliateAgencyRow[];
  excluded: { row: AffiliateAgencyRow; reason: string }[];
};

/** 전체 제휴여행사 공유 대상 분류. 제휴상태 판단은 isPartnershipShareable을 따릅니다. */
export function classifyAllShareTargets(rows: AffiliateAgencyRow[]): AllShareClassification {
  const shareable = rows.filter((row) => isPartnershipShareable(row.partnershipStatus));
  const excluded = rows
    .filter((row) => !isPartnershipShareable(row.partnershipStatus))
    .map((row) => ({ row, reason: agencyShareBlockReason(row) ?? "" }));
  const newTargets = shareable.filter((row) => ALL_SHARE_NEW_TARGET_STATUSES.includes(row.shareStatus));
  const kept = shareable.filter((row) => !ALL_SHARE_NEW_TARGET_STATUSES.includes(row.shareStatus));
  return { shareable, newTargets, kept, excluded };
}

export function formatSalesPeriod(period: [string, string] | null) {
  return period ? `${period[0]} ~ ${period[1]}` : "판매기간 미지정";
}
