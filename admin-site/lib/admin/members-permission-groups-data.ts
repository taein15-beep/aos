/**
 * 회원관리 > 권한그룹 설정 Mock (UI 확인용)
 * - DB/API 연동 없음
 */

export type PermissionGroupRow = {
  id: string;
  groupName: string;
  description: string;
  memberCount: string;
  permissionCount: string;
  useStatus: string;
};

export const PERMISSION_GROUP_MOCK_ROWS: PermissionGroupRow[] = [
  {
    id: "pg-super",
    groupName: "최종관리자",
    description: "모든 관리 기능 사용",
    memberCount: "1명",
    permissionCount: "전체",
    useStatus: "사용",
  },
  {
    id: "pg-admin",
    groupName: "관리자",
    description: "시스템 핵심설정을 제외한 관리 권한",
    memberCount: "2명",
    permissionCount: "00개",
    useStatus: "사용",
  },
  {
    id: "pg-staff",
    groupName: "직원",
    description: "상품, 예약, 고객, 정산 등 일반 실무업무 수행",
    memberCount: "5명",
    permissionCount: "",
    useStatus: "사용",
  },
  {
    id: "pg-product",
    groupName: "상품담당",
    description: "상품등록 및 상품운영",
    memberCount: "",
    permissionCount: "",
    useStatus: "사용",
  },
  {
    id: "pg-reserve",
    groupName: "예약·CS담당",
    description: "예약관리 및 고객응대",
    memberCount: "",
    permissionCount: "",
    useStatus: "사용",
  },
  {
    id: "pg-settlement",
    groupName: "정산담당",
    description: "정산 및 매출관리",
    memberCount: "",
    permissionCount: "",
    useStatus: "사용",
  },
  {
    id: "pg-guide",
    groupName: "가이드",
    description: "본인 지정 행사 조회",
    memberCount: "",
    permissionCount: "",
    useStatus: "사용",
  },
  {
    id: "pg-driver",
    groupName: "기사",
    description: "본인 지정 행사 및 운행정보 조회",
    memberCount: "",
    permissionCount: "",
    useStatus: "사용",
  },
];

export function getPermissionGroupById(id: string) {
  return PERMISSION_GROUP_MOCK_ROWS.find((row) => row.id === id);
}

export type PermissionAction = "view" | "create" | "update" | "delete";

export type PermissionRowState = Record<PermissionAction, boolean>;

export type PermissionMenuRow = {
  id: string;
  label: string;
  /** 0=대메뉴, 1=하위메뉴 */
  depth: 0 | 1;
  /** 하위가 있는 대메뉴 구분행(체크박스 없음) */
  isGroup?: boolean;
};

export const PERMISSION_ACTIONS: PermissionAction[] = ["view", "create", "update", "delete"];

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: "조회",
  create: "등록",
  update: "수정",
  delete: "삭제",
};

/** 권한설정 메뉴 트리 (UI Mock) */
export const PERMISSION_MENU_ROWS: PermissionMenuRow[] = [
  { id: "dashboard", label: "대시보드", depth: 0 },

  { id: "product", label: "상품관리", depth: 0, isGroup: true },
  { id: "product-list", label: "상품목록", depth: 1 },
  { id: "product-create", label: "상품등록", depth: 1 },
  { id: "product-schedule", label: "일정표", depth: 1 },
  { id: "product-price", label: "요금설정", depth: 1 },
  { id: "product-seller", label: "판매점설정", depth: 1 },

  { id: "reservation", label: "예약관리", depth: 0, isGroup: true },
  { id: "reservation-list", label: "예약현황", depth: 1 },
  { id: "reservation-detail", label: "예약상세", depth: 1 },
  { id: "reservation-create", label: "예약등록", depth: 1 },
  { id: "reservation-edit", label: "예약변경", depth: 1 },
  { id: "reservation-cancel", label: "예약취소", depth: 1 },

  { id: "member", label: "회원관리", depth: 0, isGroup: true },
  { id: "member-web", label: "웹회원", depth: 1 },
  { id: "member-seller", label: "판매점", depth: 1 },
  { id: "member-affiliate", label: "제휴여행사", depth: 1 },
  { id: "member-land", label: "랜드사", depth: 1 },
  { id: "member-partner", label: "거래처", depth: 1 },
  { id: "member-staff", label: "관리자/직원", depth: 1 },

  { id: "settlement", label: "정산관리", depth: 0, isGroup: true },
  { id: "settlement-reservation", label: "예약정산", depth: 1 },
  { id: "settlement-seller", label: "판매점정산", depth: 1 },
  { id: "settlement-affiliate", label: "제휴여행사정산", depth: 1 },
  { id: "settlement-land", label: "랜드사정산", depth: 1 },

  { id: "stats", label: "통계관리", depth: 0, isGroup: true },
  { id: "stats-sales", label: "매출통계", depth: 1 },
  { id: "stats-reservation", label: "예약통계", depth: 1 },
  { id: "stats-product", label: "상품통계", depth: 1 },
  { id: "stats-seller", label: "판매점통계", depth: 1 },

  { id: "notice", label: "알림관리", depth: 0, isGroup: true },
  { id: "notice-alimtalk", label: "알림톡", depth: 1 },
  { id: "notice-sms", label: "문자", depth: 1 },

  { id: "site", label: "사이트관리", depth: 0, isGroup: true },
  { id: "site-config", label: "사이트설정", depth: 1 },
  { id: "site-home", label: "홈설정", depth: 1 },
  { id: "site-payment", label: "결제설정", depth: 1 },
  { id: "site-reservation", label: "예약설정", depth: 1 },
  { id: "site-member", label: "회원설정", depth: 1 },

  { id: "etc", label: "기타관리", depth: 0, isGroup: true },
  { id: "etc-popup", label: "팝업관리", depth: 1 },
  { id: "etc-stamp", label: "스탬프투어", depth: 1 },
];

export function createEmptyPermissionRow(): PermissionRowState {
  return { view: false, create: false, update: false, delete: false };
}

export function createFullPermissionRow(): PermissionRowState {
  return { view: true, create: true, update: true, delete: true };
}

export function createViewOnlyPermissionRow(): PermissionRowState {
  return { view: true, create: false, update: false, delete: false };
}

export function createInitialPermissionState(): Record<string, PermissionRowState> {
  const state: Record<string, PermissionRowState> = {};
  for (const row of PERMISSION_MENU_ROWS) {
    if (row.isGroup) continue;
    state[row.id] = createEmptyPermissionRow();
  }
  return state;
}

export function isPermissionRowAllChecked(row: PermissionRowState) {
  return PERMISSION_ACTIONS.every((action) => row[action]);
}

const EDITABLE_MENU_IDS = PERMISSION_MENU_ROWS.filter((row) => !row.isGroup).map((row) => row.id);

function cloneRow(row: PermissionRowState): PermissionRowState {
  return { ...row };
}

function fillState(
  builder: (menuId: string) => PermissionRowState,
): Record<string, PermissionRowState> {
  const state: Record<string, PermissionRowState> = {};
  for (const menuId of EDITABLE_MENU_IDS) {
    state[menuId] = cloneRow(builder(menuId));
  }
  return state;
}

function matchPrefix(menuId: string, prefixes: string[]) {
  return prefixes.some((prefix) => menuId === prefix || menuId.startsWith(`${prefix}-`));
}

/**
 * 그룹별 권한 Mock Preset
 * - 백엔드 연동 전제 UI 구조 (현재는 프론트 Mock만)
 */
export function getPermissionPresetByGroupId(groupId: string): Record<string, PermissionRowState> {
  const full = createFullPermissionRow();
  const view = createViewOnlyPermissionRow();
  const none = createEmptyPermissionRow();

  switch (groupId) {
    case "pg-super":
      return fillState(() => full);

    case "pg-admin":
      // 허용: 상품/예약/회원/정산/통계/알림/판매점/랜드사
      // 제한: 관리자·권한관리, 시스템·결제 핵심설정
      return fillState((menuId) => {
        if (menuId === "dashboard") return full;
        if (matchPrefix(menuId, ["product", "reservation", "settlement", "stats", "notice"])) return full;
        if (matchPrefix(menuId, ["member"]) && menuId !== "member-staff") return full;
        if (menuId === "etc-popup") return full;
        return none;
      });

    case "pg-staff":
      // 허용: 대시보드, 상품, 예약, 회원조회, 정산, 알림
      // 제한: 관리자관리, 권한설정, 사이트 핵심설정
      return fillState((menuId) => {
        if (menuId === "dashboard") return full;
        if (matchPrefix(menuId, ["product", "reservation", "settlement", "notice"])) return full;
        if (matchPrefix(menuId, ["member"]) && menuId !== "member-staff") return view;
        return none;
      });

    case "pg-product":
      // 상품관리 중심
      return fillState((menuId) => {
        if (menuId === "dashboard") return view;
        if (matchPrefix(menuId, ["product"])) return full;
        if (menuId === "stats-product") return view;
        return none;
      });

    case "pg-reserve":
      // 예약 · 고객 · 알림 중심
      return fillState((menuId) => {
        if (menuId === "dashboard") return view;
        if (matchPrefix(menuId, ["reservation", "notice"])) return full;
        if (menuId === "member-web") return full;
        if (menuId === "stats-reservation") return view;
        return none;
      });

    case "pg-settlement":
      // 정산 · 매출 · 통계 중심
      return fillState((menuId) => {
        if (menuId === "dashboard") return view;
        if (matchPrefix(menuId, ["settlement", "stats"])) return full;
        return none;
      });

    case "pg-guide":
      // 본인 지정 행사 관련 조회만
      return fillState((menuId) => {
        if (menuId === "dashboard") return view;
        if (menuId === "reservation-list" || menuId === "reservation-detail") return view;
        return none;
      });

    case "pg-driver":
      // 본인 지정 행사 및 차량운행정보 조회만
      return fillState((menuId) => {
        if (menuId === "dashboard") return view;
        if (menuId === "reservation-list" || menuId === "reservation-detail") return view;
        if (menuId === "etc-stamp") return view;
        return none;
      });

    default:
      return createInitialPermissionState();
  }
}

/** 최종관리자 등 화면에서 권한 변경 불가 */
export function isPermissionPresetLocked(groupId: string) {
  return groupId === "pg-super";
}

export const SUPER_ADMIN_PERMISSION_NOTICE =
  "최종관리자는 모든 시스템 권한을 가지며 권한을 변경할 수 없습니다.";

export const PERMISSION_GROUP_OPTIONS = PERMISSION_GROUP_MOCK_ROWS.map((row) => ({
  id: row.id,
  name: row.groupName,
}));

export function getPermissionGroupIdByName(groupName: string) {
  return PERMISSION_GROUP_MOCK_ROWS.find((row) => row.groupName === groupName)?.id;
}

export function getPermissionPresetByGroupName(groupName: string) {
  const groupId = getPermissionGroupIdByName(groupName);
  return getPermissionPresetByGroupId(groupId ?? "");
}

export function isPermissionRowAllowed(row: PermissionRowState) {
  return PERMISSION_ACTIONS.some((action) => row[action]);
}

/** 개별 권한설정용 상위 메뉴 단위 */
export type StaffIndividualMenuRow = {
  id: string;
  label: string;
  /** preset menuId 매칭용 */
  match: (menuId: string) => boolean;
};

export const STAFF_INDIVIDUAL_MENU_ROWS: StaffIndividualMenuRow[] = [
  { id: "dashboard", label: "대시보드", match: (id) => id === "dashboard" },
  { id: "product", label: "상품관리", match: (id) => id === "product" || id.startsWith("product-") },
  { id: "reservation", label: "예약관리", match: (id) => id === "reservation" || id.startsWith("reservation-") },
  { id: "member", label: "회원관리", match: (id) => id === "member" || id.startsWith("member-") },
  { id: "settlement", label: "정산관리", match: (id) => id === "settlement" || id.startsWith("settlement-") },
  { id: "stats", label: "통계관리", match: (id) => id === "stats" || id.startsWith("stats-") },
  { id: "notice", label: "알림관리", match: (id) => id === "notice" || id.startsWith("notice-") },
  { id: "site", label: "사이트설정", match: (id) => id === "site" || id.startsWith("site-") },
  { id: "etc", label: "기타관리", match: (id) => id === "etc" || id.startsWith("etc-") },
];

export type GroupAccessLabel = "허용" | "차단";
export type IndividualSettingValue = "기본값 사용" | "허용" | "차단";

export function getCategoryGroupAccess(
  preset: Record<string, PermissionRowState>,
  category: StaffIndividualMenuRow,
): GroupAccessLabel {
  const matched = Object.entries(preset).filter(([menuId]) => category.match(menuId));
  if (matched.some(([, row]) => isPermissionRowAllowed(row))) return "허용";
  return "차단";
}

export function resolveFinalAccess(
  groupAccess: GroupAccessLabel,
  individual: IndividualSettingValue,
): GroupAccessLabel {
  if (individual === "허용") return "허용";
  if (individual === "차단") return "차단";
  return groupAccess;
}

export function createDefaultIndividualSettings(): Record<string, IndividualSettingValue> {
  const state: Record<string, IndividualSettingValue> = {};
  for (const row of STAFF_INDIVIDUAL_MENU_ROWS) {
    state[row.id] = "기본값 사용";
  }
  return state;
}

/** 신규등록 · 그룹 기본권한 요약 (UI Mock) */
export type PermissionGroupSummary = {
  groupName: string;
  allowed: string[];
  restricted: string[];
};

const PERMISSION_GROUP_SUMMARIES: Record<string, Omit<PermissionGroupSummary, "groupName">> = {
  최종관리자: {
    allowed: ["모든 메뉴 (조회/등록/수정/삭제)"],
    restricted: [],
  },
  관리자: {
    allowed: ["대시보드", "상품관리", "예약관리", "회원관리", "정산관리", "통계관리", "알림관리", "판매점관리", "랜드사관리"],
    restricted: ["관리자 권한관리", "시스템 핵심설정", "결제 핵심설정"],
  },
  직원: {
    allowed: ["대시보드", "상품관리", "예약관리", "고객관리", "정산업무", "알림업무"],
    restricted: ["관리자 권한관리", "시스템설정"],
  },
  상품담당: {
    allowed: ["대시보드(조회)", "상품관리", "상품통계(조회)"],
    restricted: ["예약관리", "회원관리", "정산관리", "시스템설정", "권한관리"],
  },
  "예약·CS담당": {
    allowed: ["대시보드(조회)", "예약관리", "고객관리", "알림관리", "예약통계(조회)"],
    restricted: ["상품관리", "정산관리", "시스템설정", "권한관리"],
  },
  정산담당: {
    allowed: ["대시보드(조회)", "정산관리", "매출/통계"],
    restricted: ["상품관리", "예약관리", "시스템설정", "권한관리"],
  },
  가이드: {
    allowed: ["내 행사 조회", "행사일정", "예약인원", "고객정보", "집결정보", "상품일정", "차량정보"],
    restricted: ["등록/수정/삭제", "관리자 기능", "시스템설정"],
  },
  기사: {
    allowed: ["내 운행 조회", "운행일", "집결장소", "출발시간", "탑승인원", "가이드정보", "차량정보", "상품일정"],
    restricted: ["등록/수정/삭제", "관리자 기능", "시스템설정"],
  },
};

export function getPermissionGroupSummaryByName(groupName: string): PermissionGroupSummary | null {
  const summary = PERMISSION_GROUP_SUMMARIES[groupName];
  if (!summary) return null;
  return { groupName, ...summary };
}


/** 가이드 / 기사 — 조회 전용 현장 메뉴 Mock */
export type FieldViewMenuRow = {
  id: string;
  label: string;
};

export const GUIDE_VIEW_NOTICE =
  "가이드는 본인에게 배정된 출발행사와 예약정보만 조회할 수 있습니다.";

export const DRIVER_VIEW_NOTICE =
  "기사는 본인에게 배정된 운행정보와 행사정보만 조회할 수 있습니다.";

export const GUIDE_VIEW_MENU_ROWS: FieldViewMenuRow[] = [
  { id: "guide-my-event", label: "내 행사" },
  { id: "guide-schedule", label: "행사일정" },
  { id: "guide-pax", label: "예약인원" },
  { id: "guide-customer", label: "고객정보" },
  { id: "guide-meeting", label: "집결정보" },
  { id: "guide-product-schedule", label: "상품일정" },
  { id: "guide-vehicle", label: "차량정보" },
];

export const DRIVER_VIEW_MENU_ROWS: FieldViewMenuRow[] = [
  { id: "driver-my-run", label: "내 운행" },
  { id: "driver-date", label: "운행일" },
  { id: "driver-meeting", label: "집결장소" },
  { id: "driver-depart", label: "출발시간" },
  { id: "driver-pax", label: "탑승인원" },
  { id: "driver-guide", label: "가이드정보" },
  { id: "driver-vehicle", label: "차량정보" },
  { id: "driver-product-schedule", label: "상품일정" },
];

export function isFieldViewOnlyGroup(groupName: string) {
  return groupName === "가이드" || groupName === "기사";
}

export function getFieldViewNotice(groupName: string) {
  if (groupName === "가이드") return GUIDE_VIEW_NOTICE;
  if (groupName === "기사") return DRIVER_VIEW_NOTICE;
  return "";
}

export function getFieldViewMenuRows(groupName: string): FieldViewMenuRow[] {
  if (groupName === "가이드") return GUIDE_VIEW_MENU_ROWS;
  if (groupName === "기사") return DRIVER_VIEW_MENU_ROWS;
  return [];
}

export function createDefaultFieldViewSettings(groupName: string): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const row of getFieldViewMenuRows(groupName)) {
    state[row.id] = true;
  }
  return state;
}


