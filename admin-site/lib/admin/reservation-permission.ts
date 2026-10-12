import type { ReservationActor, ReservationDetail, ReservationSourceType } from "@/lib/admin/reservations-data";

/**
 * 예약 수정권한 정책 (SAMPLE).
 * 실제 로그인 여행사 판별 전까지는 화면 상단의 "조회 관점"으로 현재 관리자를 가정합니다.
 */

export type ReservationViewerType = "integrated" | "sellingAgency" | "supplierAgency" | "seller";

export type ReservationViewer = {
  key: string;
  type: ReservationViewerType;
  agencyName: string;
  /** 변경이력에 기록할 Mock 작업자명 */
  userName: string;
  label: string;
};

export const RESERVATION_VIEWERS: ReservationViewer[] = [
  { key: "integrated", type: "integrated", agencyName: "애비아넥스트", userName: "장윤호", label: "통합 관리자 · 애비아넥스트" },
  { key: "selling-hyundam", type: "sellingAgency", agencyName: "현담여행사", userName: "이도현", label: "판매여행사 · 현담여행사" },
  { key: "selling-graegaja", type: "sellingAgency", agencyName: "그래가자", userName: "한지민", label: "판매여행사 · 그래가자" },
  { key: "seller-smarttour", type: "seller", agencyName: "스마트투어 판매점", userName: "오세린", label: "판매점 · 스마트투어 판매점" },
  { key: "supplier-happytour", type: "supplierAgency", agencyName: "행복투어", userName: "김민재", label: "공급여행사 · 행복투어" },
];

export const DEFAULT_RESERVATION_VIEWER = RESERVATION_VIEWERS[0];

export function getReservationViewer(key: string | null | undefined): ReservationViewer {
  return RESERVATION_VIEWERS.find((viewer) => viewer.key === key) ?? DEFAULT_RESERVATION_VIEWER;
}

export function getViewerActor(viewer: ReservationViewer): ReservationActor {
  return { name: viewer.userName, agency: viewer.agencyName };
}

export function withReservationViewer(path: string, viewer: ReservationViewer) {
  if (viewer.key === DEFAULT_RESERVATION_VIEWER.key) return path;
  return `${path}${path.includes("?") ? "&" : "?"}view=${viewer.key}`;
}

export const RESERVATION_SOURCE_LABELS: Record<ReservationSourceType, string> = {
  direct: "직접예약",
  affiliate: "제휴여행사",
  seller: "판매점",
};

export const RESERVATION_SOURCE_SHORT_LABELS: Record<ReservationSourceType, string> = {
  direct: "직접예약",
  affiliate: "제휴",
  seller: "판매점",
};

export function reservationSourceBadgeClass(type: ReservationSourceType) {
  if (type === "affiliate") return "info";
  if (type === "seller") return "warn";
  return "gray";
}

export function getReservationSourceType(reservation: Pick<ReservationDetail, "source">): ReservationSourceType {
  return reservation.source?.type ?? "direct";
}

type PermissionTarget = Pick<ReservationDetail, "source" | "reserveStatus">;

/** 예약마감 이후 단계의 예약상태 */
export const OPERATOR_MANAGED_STATUSES = ["예약마감", "운영인계", "행사완료"] as const;

export function isOperatorManagedStatus(status: string) {
  return (OPERATOR_MANAGED_STATUSES as readonly string[]).includes(status);
}

/** 예약마감/운영인계는 업무 Action으로만 처리합니다. (수정 Form에서 직접 선택 불가) */
export const ACTION_ONLY_STATUSES = ["예약마감", "운영인계"] as const;

export function isCancelledReservationStatus(status: string) {
  return status === "취소" || status === "취소요청" || status === "취소승인" || status === "취소완료";
}

/** 판매점 취소요청 검토 권한: 예약 상품의 공급여행사 관리자만 처리합니다. (판매점 이용상태 · 상품 판매상태와 무관) */
export function getSellerCancelReviewAction(
  reservation: Pick<ReservationDetail, "source" | "sellerCancelRequest">,
  viewer: ReservationViewer,
): ReservationActionPermission {
  const request = reservation.sellerCancelRequest;
  if (!request || request.status !== "검토대기") return { allowed: false, reason: "검토대기 중인 취소요청이 없습니다." };
  const supplierName = reservation.source?.supplierAgencyName ?? "공급여행사";
  if (viewer.type !== "supplierAgency" || viewer.agencyName !== reservation.source?.supplierAgencyName) {
    return { allowed: false, reason: `공급여행사(${supplierName}) 관리자 관점에서 처리할 수 있습니다.` };
  }
  return { allowed: true };
}

/** 취소승인 예약의 환불 · 취소완료 처리 권한: 공급여행사 관리자만 (판매점은 환불 불가) */
export function getSellerRefundAction(
  reservation: Pick<ReservationDetail, "source" | "sellerCancelRequest">,
  viewer: ReservationViewer,
): ReservationActionPermission {
  const request = reservation.sellerCancelRequest;
  if (!request?.approval || request.status !== "취소승인") return { allowed: false, reason: "환불처리 대상이 아닙니다." };
  const supplierName = reservation.source?.supplierAgencyName ?? "공급여행사";
  if (viewer.type !== "supplierAgency" || viewer.agencyName !== reservation.source?.supplierAgencyName) {
    return { allowed: false, reason: `환불처리는 공급여행사(${supplierName}) 관리자 관점에서 진행할 수 있습니다.` };
  }
  return { allowed: true };
}

export function isReservationClosed(reservation: PermissionTarget) {
  return Boolean(reservation.source?.closedAt) || isOperatorManagedStatus(reservation.reserveStatus);
}

export function isOperationHandedOver(reservation: PermissionTarget) {
  if (getReservationSourceType(reservation) === "direct") return false;
  return (
    Boolean(reservation.source?.handoverAt) ||
    reservation.reserveStatus === "운영인계" ||
    reservation.reserveStatus === "행사완료"
  );
}

/** 공유상품 예약의 운영 단계: 예약마감 전 → 운영인계 대기 → 운영인계 완료 */
export type ReservationOperationStage = "open" | "handoverPending" | "handedOver";

export function getReservationOperationStage(reservation: PermissionTarget): ReservationOperationStage {
  if (isOperationHandedOver(reservation)) return "handedOver";
  if (getReservationSourceType(reservation) !== "direct" && isReservationClosed(reservation)) return "handoverPending";
  return "open";
}

export type ReservationEditOwner = "sellingAgency" | "supplierAgency" | "seller" | "readonly";

/** 예약을 받은 판매 주체 (판매점 예약이면 판매점, 아니면 판매여행사) */
export function getReservationSalesOwner(reservation: PermissionTarget): "sellingAgency" | "seller" {
  return getReservationSourceType(reservation) === "seller" ? "seller" : "sellingAgency";
}

/**
 * 현재 예약 수정권한을 가진 주체.
 * - 직접예약: 예약을 받은 자사(sellingAgency)
 * - 예약마감 전: 실제 예약을 받은 판매여행사 또는 판매점
 * - 예약마감 완료 / 운영인계 전: 인계대기 (readonly)
 * - 운영인계 완료: 공급(운영)여행사
 */
export function getReservationEditOwner(reservation: PermissionTarget): ReservationEditOwner {
  if (getReservationSourceType(reservation) === "direct") return "sellingAgency";
  const stage = getReservationOperationStage(reservation);
  if (stage === "handedOver") return "supplierAgency";
  if (stage === "handoverPending") return "readonly";
  return getReservationSalesOwner(reservation);
}

export function getReservationEditOwnerName(reservation: PermissionTarget) {
  const owner = getReservationEditOwner(reservation);
  const source = reservation.source;
  if (!source || source.type === "direct") return "자사";
  if (owner === "supplierAgency") return source.supplierAgencyName ?? "공급여행사";
  if (owner === "seller") return source.sellerName ?? "판매점";
  if (owner === "sellingAgency") return source.sellingAgencyName ?? "판매여행사";
  return "운영인계 대기";
}

export const RESERVATION_EDIT_OWNER_LABELS: Record<ReservationEditOwner, string> = {
  sellingAgency: "판매여행사 수정 가능",
  supplierAgency: "공급여행사 수정 가능",
  seller: "판매점 수정 가능",
  readonly: "읽기 전용",
};

export function isReservationVisibleTo(reservation: Pick<ReservationDetail, "source">, viewer: ReservationViewer) {
  if (viewer.type === "integrated") return true;
  const source = reservation.source;
  if (!source || source.type === "direct") return false;
  if (viewer.type === "sellingAgency") return source.sellingAgencyName === viewer.agencyName;
  if (viewer.type === "seller") return source.sellerName === viewer.agencyName;
  return source.supplierAgencyName === viewer.agencyName;
}

function viewerMatchesOwner(reservation: PermissionTarget, viewer: ReservationViewer, owner: ReservationEditOwner) {
  const source = reservation.source;
  if (!source) return false;
  if (owner === "sellingAgency") return viewer.type === "sellingAgency" && source.sellingAgencyName === viewer.agencyName;
  if (owner === "seller") return viewer.type === "seller" && source.sellerName === viewer.agencyName;
  if (owner === "supplierAgency") return viewer.type === "supplierAgency" && source.supplierAgencyName === viewer.agencyName;
  return false;
}

export function canEditReservation({ reservation, viewer }: { reservation: PermissionTarget; viewer: ReservationViewer }) {
  if (getReservationSourceType(reservation) === "direct") return viewer.type === "integrated";
  return viewerMatchesOwner(reservation, viewer, getReservationEditOwner(reservation));
}

export type ReservationActionPermission = {
  allowed: boolean;
  /** 비활성 사유 (allowed가 false일 때) */
  reason?: string;
};

/** 예약마감 Action: 마감 전 + 현재 수정권한을 가진 주체만 */
export function getReservationCloseAction(reservation: PermissionTarget, viewer: ReservationViewer): ReservationActionPermission {
  if (isCancelledReservationStatus(reservation.reserveStatus)) return { allowed: false, reason: "취소된 예약은 마감할 수 없습니다." };
  if (isReservationClosed(reservation)) return { allowed: false, reason: "이미 예약마감된 예약입니다." };
  if (!canEditReservation({ reservation, viewer })) {
    return { allowed: false, reason: `${getReservationEditOwnerName(reservation)}에서 예약마감할 수 있습니다.` };
  }
  return { allowed: true };
}

/** 운영인계 Action: 예약마감 후 + 예약을 받은 판매 주체(판매여행사 또는 판매점)만 */
export function getReservationHandoverAction(reservation: PermissionTarget, viewer: ReservationViewer): ReservationActionPermission {
  if (getReservationSourceType(reservation) === "direct") return { allowed: false, reason: "직접예약은 운영인계 대상이 아닙니다." };
  if (isOperationHandedOver(reservation)) return { allowed: false, reason: "운영인계가 완료되었습니다." };
  if (!isReservationClosed(reservation)) return { allowed: false, reason: "예약마감 후 운영인계를 진행할 수 있습니다." };
  const salesOwner = getReservationSalesOwner(reservation);
  if (!viewerMatchesOwner(reservation, viewer, salesOwner)) {
    const name = salesOwner === "seller" ? reservation.source?.sellerName : reservation.source?.sellingAgencyName;
    return { allowed: false, reason: `${name ?? "판매여행사"}에서 운영인계를 진행할 수 있습니다.` };
  }
  return { allowed: true };
}

export type ReservationPermissionNotice = {
  tone: "warn" | "info";
  title: string;
  description?: string;
  items?: { label: string; value?: string }[];
};

/** 현재 관점에서 보여줄 권한 안내. 별도 안내가 필요 없으면 null. */
export function getReservationPermissionNotice(
  reservation: PermissionTarget,
  viewer: ReservationViewer,
): ReservationPermissionNotice | null {
  const source = reservation.source;
  const stage = getReservationOperationStage(reservation);

  if (stage === "handoverPending") {
    if (getReservationHandoverAction(reservation, viewer).allowed) {
      return { tone: "info", title: "예약마감이 완료되었습니다. 운영인계를 진행해주세요." };
    }
    return {
      tone: "info",
      title: "예약마감이 완료되어 운영인계를 기다리고 있습니다.",
      description: "운영인계가 완료되면 공급여행사에서 예약을 관리합니다. 현재는 조회만 가능합니다.",
      items: [
        { label: "판매여행사", value: source?.sellingAgencyName },
        { label: "판매점", value: source?.sellerName },
      ],
    };
  }

  if (canEditReservation({ reservation, viewer })) return null;
  if (!source || source.type === "direct") {
    return { tone: "warn", title: "자사 직접예약은 통합 관리자 화면에서 수정할 수 있습니다." };
  }
  const owner = getReservationEditOwner(reservation);

  if (owner === "supplierAgency") {
    if (viewer.type === "sellingAgency" || viewer.type === "seller") {
      return {
        tone: "warn",
        title: "운영관리 권한이 공급여행사로 인계되었습니다.",
        items: [
          { label: "공급여행사", value: source.supplierAgencyName },
          { label: "인계일시", value: source.handoverAt },
        ],
      };
    }
    return {
      tone: "warn",
      title: "통합 관리자 화면에서는 제휴여행사·판매점 예약을 조회만 할 수 있습니다.",
      description: `현재 ${getReservationEditOwnerName(reservation)}에서 예약을 수정할 수 있습니다.`,
    };
  }

  if (viewer.type === "supplierAgency") {
    return {
      tone: "warn",
      title: owner === "seller" ? "이 예약은 판매점에서 관리 중입니다." : "이 예약은 판매여행사에서 관리 중입니다.",
      description: "예약마감 및 운영인계 이후 공급여행사에서 수정할 수 있습니다.",
      items: [
        { label: "판매여행사", value: source.sellingAgencyName },
        { label: "판매점", value: source.sellerName },
      ],
    };
  }

  if (viewer.type === "sellingAgency" && owner === "seller") {
    return {
      tone: "warn",
      title: "이 예약은 판매점에서 관리 중입니다.",
      description: "예약마감 전까지 예약을 받은 판매점에서 수정할 수 있으며, 판매여행사에서는 조회만 가능합니다.",
      items: [{ label: "판매점", value: source.sellerName }],
    };
  }

  return {
    tone: "warn",
    title: "통합 관리자 화면에서는 제휴여행사·판매점 예약을 조회만 할 수 있습니다.",
    description: `현재 ${getReservationEditOwnerName(reservation)}에서 예약을 수정할 수 있습니다.`,
  };
}

/** 운영관리 권한 인계 완료 여부 (공유상품 예약) */
export function isReservationHandedOver(reservation: PermissionTarget) {
  return isOperationHandedOver(reservation);
}
