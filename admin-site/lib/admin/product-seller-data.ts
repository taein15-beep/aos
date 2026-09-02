/**
 * 상품별 판매점 설정 샘플 데이터 (SAMPLE)
 * 현재 로그인 여행사 기준 판매점 관계만 다룹니다.
 * API 연동 전까지 UI 검증용이며, 저장은 세션 메모리에만 반영됩니다.
 */

export const LOGGED_IN_TRAVEL_AGENCY = "애비아넥스트";

export const COMMISSION_GRADE_OPTIONS = ["전체", "A등급", "B등급", "C등급", "D등급"] as const;
export type CommissionGrade = "A등급" | "B등급" | "C등급" | "D등급";
export type SellerStatus = "정상" | "승인대기" | "사용중지";

export type SellerStore = {
  id: string;
  name: string;
  sido: string;
  sigungu: string;
  commissionGrade: CommissionGrade;
  ceo: string;
  manager: string;
  phone: string;
  status: SellerStatus;
  /** 현재 로그인 여행사와의 가입 관계 ID (다른 여행사 관계와 구분) */
  relationshipId: string;
  hostAgency: string;
  assignedAt: string | null;
};

export const REGION_MAP: Record<string, string[]> = {
  "": ["전체"],
  서울: ["전체", "강남구", "마포구", "종로구", "송파구"],
  경기: ["전체", "수원시", "성남시", "고양시", "부천시"],
  인천: ["전체", "연수구", "남동구", "부평구"],
  부산: ["전체", "해운대구", "부산진구", "동래구"],
  대전: ["전체", "서구", "유성구", "중구"],
  제주: ["전체", "제주시", "서귀포시"],
};

/** 애비아넥스트에 가입된 판매점 마스터 (동일 법인이 타 여행사에도 가입할 수 있으나 이 목록은 현재 여행사 관계만 표시) */
export const SAMPLE_SELLER_STORES: SellerStore[] = [
  {
    id: "s001",
    name: "행복투어 일산점",
    sido: "경기",
    sigungu: "고양시",
    commissionGrade: "A등급",
    ceo: "김민준",
    manager: "박서연",
    phone: "031-918-7070",
    status: "정상",
    relationshipId: "REL-AVN-s001",
    hostAgency: LOGGED_IN_TRAVEL_AGENCY,
    assignedAt: null,
  },
  {
    id: "s002",
    name: "마포 모두투어센터",
    sido: "서울",
    sigungu: "마포구",
    commissionGrade: "B등급",
    ceo: "이도현",
    manager: "정하윤",
    phone: "02-778-2451",
    status: "정상",
    relationshipId: "REL-AVN-s002",
    hostAgency: LOGGED_IN_TRAVEL_AGENCY,
    assignedAt: null,
  },
  {
    id: "s003",
    name: "종로 프리미엄투어",
    sido: "서울",
    sigungu: "종로구",
    commissionGrade: "C등급",
    ceo: "최지훈",
    manager: "한유진",
    phone: "02-736-9012",
    status: "승인대기",
    relationshipId: "REL-AVN-s003",
    hostAgency: LOGGED_IN_TRAVEL_AGENCY,
    assignedAt: null,
  },
  {
    id: "s004",
    name: "송파 패밀리여행",
    sido: "서울",
    sigungu: "송파구",
    commissionGrade: "D등급",
    ceo: "오세준",
    manager: "윤다은",
    phone: "02-415-3300",
    status: "정상",
    relationshipId: "REL-AVN-s004",
    hostAgency: LOGGED_IN_TRAVEL_AGENCY,
    assignedAt: null,
  },
  {
    id: "s005",
    name: "수원 파트너투어",
    sido: "경기",
    sigungu: "수원시",
    commissionGrade: "B등급",
    ceo: "장현우",
    manager: "김나린",
    phone: "031-222-1234",
    status: "정상",
    relationshipId: "REL-AVN-s005",
    hostAgency: LOGGED_IN_TRAVEL_AGENCY,
    assignedAt: null,
  },
  {
    id: "s006",
    name: "성남 드림여행사",
    sido: "경기",
    sigungu: "성남시",
    commissionGrade: "C등급",
    ceo: "문태영",
    manager: "서지민",
    phone: "031-701-4411",
    status: "정상",
    relationshipId: "REL-AVN-s006",
    hostAgency: LOGGED_IN_TRAVEL_AGENCY,
    assignedAt: null,
  },
  {
    id: "s007",
    name: "고양 온누리투어",
    sido: "경기",
    sigungu: "고양시",
    commissionGrade: "A등급",
    ceo: "임수호",
    manager: "조아라",
    phone: "031-918-7071",
    status: "사용중지",
    relationshipId: "REL-AVN-s007",
    hostAgency: LOGGED_IN_TRAVEL_AGENCY,
    assignedAt: null,
  },
  {
    id: "s008",
    name: "부천 레일파트너",
    sido: "경기",
    sigungu: "부천시",
    commissionGrade: "D등급",
    ceo: "강도윤",
    manager: "백예린",
    phone: "032-611-8920",
    status: "정상",
    relationshipId: "REL-AVN-s008",
    hostAgency: LOGGED_IN_TRAVEL_AGENCY,
    assignedAt: null,
  },
  {
    id: "s009",
    name: "인천공항 제휴센터",
    sido: "인천",
    sigungu: "연수구",
    commissionGrade: "A등급",
    ceo: "손재원",
    manager: "이채원",
    phone: "032-811-6001",
    status: "정상",
    relationshipId: "REL-AVN-s009",
    hostAgency: LOGGED_IN_TRAVEL_AGENCY,
    assignedAt: null,
  },
  {
    id: "s010",
    name: "남동 스마트여행",
    sido: "인천",
    sigungu: "남동구",
    commissionGrade: "C등급",
    ceo: "신유찬",
    manager: "권미소",
    phone: "032-472-8088",
    status: "승인대기",
    relationshipId: "REL-AVN-s010",
    hostAgency: LOGGED_IN_TRAVEL_AGENCY,
    assignedAt: null,
  },
  {
    id: "s011",
    name: "대전 유성관광",
    sido: "대전",
    sigungu: "유성구",
    commissionGrade: "C등급",
    ceo: "배준호",
    manager: "남가은",
    phone: "042-862-7744",
    status: "정상",
    relationshipId: "REL-AVN-s011",
    hostAgency: LOGGED_IN_TRAVEL_AGENCY,
    assignedAt: null,
  },
  {
    id: "s012",
    name: "제주 하늘길투어",
    sido: "제주",
    sigungu: "제주시",
    commissionGrade: "A등급",
    ceo: "고은찬",
    manager: "양하늘",
    phone: "064-711-4522",
    status: "정상",
    relationshipId: "REL-AVN-s012",
    hostAgency: LOGGED_IN_TRAVEL_AGENCY,
    assignedAt: null,
  },
];

const INITIAL_SELECTED_BY_PRODUCT: Record<string, string[]> = {
  HP0001: ["s001", "s002", "s005", "s009", "s011", "s012"],
  HP0001C: [],
  "paldo-111": ["s001", "s009"],
  boram01: [],
  "share-jeju": ["s001", "s002", "s005", "s009"],
};

const LAST_SAVED_AT_BY_PRODUCT: Record<string, string> = {
  HP0001: "2026-05-28 14:32",
  "paldo-111": "2026-05-20 09:15",
  boram01: "2026-05-18 16:40",
  "share-jeju": "2026-06-02 11:20",
};

/** 세션 내 저장 상태 (SAMPLE) */
const sessionSelectedByProduct: Record<string, string[]> = { ...INITIAL_SELECTED_BY_PRODUCT };
const sessionLastSavedAt: Record<string, string> = { ...LAST_SAVED_AT_BY_PRODUCT };

export function getSellerStoresForCurrentAgency() {
  return SAMPLE_SELLER_STORES.filter((store) => store.hostAgency === LOGGED_IN_TRAVEL_AGENCY);
}

export function getSellerStoreById(id: string) {
  return SAMPLE_SELLER_STORES.find((store) => store.id === id) ?? null;
}

export function isSelectableSeller(store: SellerStore) {
  return store.status === "정상";
}

export function getInitialSelectedSellerIds(productCode: string) {
  return [...(INITIAL_SELECTED_BY_PRODUCT[productCode] ?? [])];
}

export function getSavedSellerIds(productCode: string) {
  return [...(sessionSelectedByProduct[productCode] ?? getInitialSelectedSellerIds(productCode))];
}

export function getSellerCountForProduct(productCode: string) {
  return getSavedSellerIds(productCode).length;
}

export function saveSellerSelections(productCode: string, sellerIds: string[]) {
  sessionSelectedByProduct[productCode] = [...sellerIds];
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  sessionLastSavedAt[productCode] =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function getSellerSettingLastSavedAt(productCode: string) {
  return sessionLastSavedAt[productCode] ?? LAST_SAVED_AT_BY_PRODUCT[productCode] ?? "-";
}

export function commissionGradeBadgeClass(grade: CommissionGrade) {
  if (grade === "A등급") return "info";
  if (grade === "B등급") return "success";
  if (grade === "C등급") return "gray";
  return "warn";
}

export function sellerStatusBadgeClass(status: SellerStatus) {
  if (status === "정상") return "success";
  if (status === "승인대기") return "warn";
  return "danger";
}

export function formatSellerRegion(store: SellerStore) {
  return `${store.sido} ${store.sigungu}`;
}

export function cloneSellerStore(store: SellerStore): SellerStore {
  return { ...store };
}
