/**
 * 판매점 공급여행사 가입신청 — 진입·계정 분기 프로토타입 Mock (SAMPLE)
 * - 판매점 계정 1개로 여러 공급여행사에 가입하는 구조를 화면으로만 표현합니다.
 * - 실제 인증·회원가입·저장(DB/API/Storage) 없음. 화면 state에서만 사용합니다.
 */

export type ApplySupplier = {
  name: string;
  typeLabel: string;
  logoText: string;
};

/** 판매점이 접속한 공급여행사 가입 페이지 (Mock) */
export const APPLY_SUPPLIER: ApplySupplier = {
  name: "행복투어",
  typeLabel: "AOS 공급여행사",
  logoText: "행",
};

export type MockSellerAccount = {
  sellerName: string;
  sellerCode: string;
  representative: string;
  managerName: string;
  managerPhone: string;
  email: string;
  businessNumber: string;
  logoText: string;
};

/** 기존 판매점 Mock 계정 (아이디·비밀번호는 테스트용 샘플) */
export const MOCK_SELLER_ACCOUNT: MockSellerAccount & { loginId: string; password: string } = {
  sellerName: "그래가자",
  sellerCode: "SEL00032",
  representative: "김민수",
  managerName: "홍길동",
  managerPhone: "010-1234-5678",
  email: "seller@example.com",
  businessNumber: "123-45-67890",
  logoText: "그",
  loginId: "seller00032@example.com",
  password: "test1234",
};

/** 현재 공급여행사와 기존 판매점 계정 사이의 가입관계 */
export type SupplierJoinState = "미가입" | "정상" | "승인대기" | "이용중지" | "승인거절";

export const SUPPLIER_JOIN_STATES: SupplierJoinState[] = ["미가입", "정상", "승인대기", "이용중지", "승인거절"];

export type SellerSupplierRelation = {
  supplierName: string;
  logoText: string;
  state: SupplierJoinState;
};

/** 기존 판매점(그래가자)이 이미 가입한 다른 공급여행사 — 안내용 조회 데이터 (SAMPLE) */
export const MOCK_SELLER_EXISTING_SUPPLIERS: SellerSupplierRelation[] = [
  { supplierName: "현담여행사", logoText: "현", state: "정상" },
  { supplierName: "A투어", logoText: "A", state: "이용중지" },
];

export type EntryStep = { key: string; label: string };

export const NEW_SELLER_STEPS: EntryStep[] = [
  { key: "type", label: "가입유형" },
  { key: "info", label: "판매점정보" },
  { key: "confirm", label: "신청확인" },
  { key: "done", label: "신청완료" },
];

export const EXISTING_SELLER_STEPS: EntryStep[] = [
  { key: "account", label: "계정확인" },
  { key: "info", label: "가입정보 확인" },
  { key: "apply", label: "가입신청" },
  { key: "done", label: "완료" },
];

/* ───────── 신규 판매점 계정 생성 + 공급여행사 가입신청 (SAMPLE) ───────── */

export type BusinessType = "" | "개인사업자" | "법인사업자";

export const BUSINESS_TYPES: Exclude<BusinessType, "">[] = ["개인사업자", "법인사업자"];

export type NewSellerForm = {
  loginId: string;
  password: string;
  passwordConfirm: string;
  sellerName: string;
  representative: string;
  phone: string;
  email: string;
  homepage: string;
  businessType: BusinessType;
  businessNumber: string;
  companyName: string;
  businessRepresentative: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  department: string;
  position: string;
};

export const EMPTY_NEW_SELLER_FORM: NewSellerForm = {
  loginId: "",
  password: "",
  passwordConfirm: "",
  sellerName: "",
  representative: "",
  phone: "",
  email: "",
  homepage: "",
  businessType: "",
  businessNumber: "",
  companyName: "",
  businessRepresentative: "",
  zipCode: "",
  address: "",
  addressDetail: "",
  managerName: "",
  managerPhone: "",
  managerEmail: "",
  department: "",
  position: "",
};

/** UI 테스트용 Mock 입력값 (실제 판매점 정보 아님) */
export const MOCK_NEW_SELLER_FORM: NewSellerForm = {
  loginId: "gragaja",
  password: "test1234",
  passwordConfirm: "test1234",
  sellerName: "그래가자",
  representative: "김민수",
  phone: "02-1234-5678",
  email: "seller@example.com",
  homepage: "",
  businessType: "개인사업자",
  businessNumber: "123-45-67890",
  companyName: "그래가자",
  businessRepresentative: "김민수",
  zipCode: "04524",
  address: "서울특별시 중구 세종대로 00",
  addressDetail: "3층",
  managerName: "홍길동",
  managerPhone: "010-1234-5678",
  managerEmail: "sales@example.com",
  department: "",
  position: "",
};

export const MOCK_CERTIFICATE_FILE_NAME = "사업자등록증_그래가자.pdf";

export type MockAddress = { zipCode: string; address: string };

/** 주소검색 Mock 결과 (실제 주소 API 미연결) */
export const MOCK_ADDRESS_RESULTS: MockAddress[] = [
  { zipCode: "04524", address: "서울특별시 중구 세종대로 00" },
  { zipCode: "06236", address: "서울특별시 강남구 테헤란로 00" },
  { zipCode: "48058", address: "부산광역시 해운대구 센텀중앙로 00" },
];

export type NewSellerTermKey = "service" | "privacy" | "supplierPolicy" | "marketing";

export type NewSellerTerm = {
  key: NewSellerTermKey;
  required: boolean;
  title: string;
  summary: string;
};

export function getNewSellerTerms(supplierName: string): NewSellerTerm[] {
  return [
    {
      key: "service",
      required: true,
      title: "AOS 판매점 이용약관 동의",
      summary: "AOS 판매점 계정 생성과 판매점 관리자 이용에 관한 기본 약관입니다. (Mock 요약)",
    },
    {
      key: "privacy",
      required: true,
      title: "개인정보 수집 및 이용 동의",
      summary: "대표자·담당자 연락처 등 판매점 운영에 필요한 개인정보의 수집 항목과 이용 목적입니다. (Mock 요약)",
    },
    {
      key: "supplierPolicy",
      required: true,
      title: `${supplierName} 판매점 운영정책 동의`,
      summary: `${supplierName}가 정한 상품 판매·예약·정산 등 판매점 운영 기준입니다. 가입 승인 후 적용됩니다. (Mock 요약)`,
    },
    {
      key: "marketing",
      required: false,
      title: "마케팅 정보 수신 동의",
      summary: "AOS 신규 기능 및 프로모션 안내 수신 여부입니다. 동의하지 않아도 가입할 수 있습니다. (Mock 요약)",
    },
  ];
}

export function joinStateBadgeClass(state: SupplierJoinState) {
  if (state === "정상") return "is-success";
  if (state === "승인대기") return "is-warn";
  if (state === "이용중지") return "is-danger";
  if (state === "승인거절") return "is-gray";
  return "is-info";
}
