export type MemberStatus = "정상" | "휴면" | "탈퇴" | "차단";

export type JoinPath =
  | "홈페이지 일반가입"
  | "카카오 간편가입"
  | "네이버 간편가입"
  | "구글 간편가입"
  | "애플 간편가입"
  | "판매점 추천가입"
  | "관리자 등록";

export type WebMember = {
  id: string;
  name: string;
  loginId: string;
  phone: string;
  email: string;
  status: MemberStatus;
  joinPath: JoinPath;
  agency: string;
  joinedAt: string;
  lastAccessAt: string;
};

export type WebMemberConsultation = {
  date: string;
  type: string;
  content: string;
  status: "완료" | "처리중" | "접수";
  manager: string;
};

export type WebMemberAdminMemo = {
  date: string;
  author: string;
  content: string;
};

export type WebMemberReservation = {
  code: string;
  reservedAt: string;
  departureAt: string;
  productName: string;
  people: string;
  reserveStatus: string;
  reserveStatusClass: "success" | "warn" | "danger" | "gray" | "info";
  paymentStatus: string;
  paymentStatusClass: "success" | "warn" | "danger" | "gray" | "info";
  amount: string;
  agency: string;
};

export type WebMemberChangeHistory = {
  changedAt: string;
  field: string;
  before: string;
  after: string;
  actor: string;
};

export type WebMemberDetail = WebMember & {
  gender: "남성" | "여성";
  birthDate: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  referralCode: string;
  referredAt: string;
  agencyManager: string;
  agencyPhone: string;
  inflowMemo: string;
  consultations: WebMemberConsultation[];
  adminMemos: WebMemberAdminMemo[];
  reservationSummary: {
    totalCount: number;
    latestReservedAt: string;
    totalPaidAmount: string;
    statusSummary: string;
  };
  reservations: WebMemberReservation[];
  changeHistory: WebMemberChangeHistory[];
};

export const MEMBER_STATUS_OPTIONS = ["전체", "정상", "휴면", "탈퇴", "차단"] as const;

export const JOIN_PATH_OPTIONS = [
  "전체",
  "홈페이지 일반가입",
  "카카오 간편가입",
  "네이버 간편가입",
  "구글 간편가입",
  "애플 간편가입",
  "판매점 추천가입",
  "관리자 등록",
] as const;

export const WEB_MEMBERS: WebMember[] = [
  {
    id: "M000001",
    name: "홍길동",
    loginId: "hong",
    phone: "010-1234-5678",
    email: "hong@example.com",
    status: "정상",
    joinPath: "판매점 추천가입",
    agency: "행복투어",
    joinedAt: "2026-06-12",
    lastAccessAt: "2026-07-03",
  },
  {
    id: "M000002",
    name: "김민지",
    loginId: "minji",
    phone: "010-2222-3333",
    email: "minji@example.com",
    status: "정상",
    joinPath: "카카오 간편가입",
    agency: "직접가입",
    joinedAt: "2026-06-01",
    lastAccessAt: "2026-06-25",
  },
  {
    id: "M000003",
    name: "이성호",
    loginId: "sungho",
    phone: "010-3333-4444",
    email: "sungho@example.com",
    status: "휴면",
    joinPath: "판매점 추천가입",
    agency: "우리여행사",
    joinedAt: "2026-05-18",
    lastAccessAt: "2026-05-19",
  },
  {
    id: "M000004",
    name: "박준영",
    loginId: "junpark",
    phone: "010-4444-5555",
    email: "jun@example.com",
    status: "정상",
    joinPath: "네이버 간편가입",
    agency: "행복투어",
    joinedAt: "2026-04-03",
    lastAccessAt: "2026-07-02",
  },
  {
    id: "M000005",
    name: "최유나",
    loginId: "yuna",
    phone: "010-5555-6666",
    email: "yuna@example.com",
    status: "정상",
    joinPath: "관리자 등록",
    agency: "관리자 등록",
    joinedAt: "2026-06-21",
    lastAccessAt: "2026-06-29",
  },
  {
    id: "M000006",
    name: "정다은",
    loginId: "daeun",
    phone: "010-6666-7777",
    email: "daeun@example.com",
    status: "탈퇴",
    joinPath: "홈페이지 일반가입",
    agency: "직접가입",
    joinedAt: "2026-03-10",
    lastAccessAt: "2026-03-11",
  },
  {
    id: "M000007",
    name: "오세훈",
    loginId: "sehun",
    phone: "010-7777-8888",
    email: "sehun@example.com",
    status: "차단",
    joinPath: "판매점 추천가입",
    agency: "우리여행사",
    joinedAt: "2026-02-15",
    lastAccessAt: "2026-07-01",
  },
  {
    id: "M000008",
    name: "한소라",
    loginId: "sora",
    phone: "010-8888-9999",
    email: "sora@example.com",
    status: "정상",
    joinPath: "구글 간편가입",
    agency: "행복투어",
    joinedAt: "2026-07-03",
    lastAccessAt: "2026-07-03",
  },
  {
    id: "M000009",
    name: "강지훈",
    loginId: "jihoon",
    phone: "010-9012-3456",
    email: "jihoon@example.com",
    status: "정상",
    joinPath: "애플 간편가입",
    agency: "고양여행클럽",
    joinedAt: "2026-05-28",
    lastAccessAt: "2026-06-30",
  },
  {
    id: "M000010",
    name: "윤서현",
    loginId: "seohyun",
    phone: "010-3456-7890",
    email: "seohyun@example.com",
    status: "휴면",
    joinPath: "홈페이지 일반가입",
    agency: "직접가입",
    joinedAt: "2026-01-20",
    lastAccessAt: "2026-04-12",
  },
];

export function memberStatusBadgeClass(status: MemberStatus) {
  if (status === "정상") return "success";
  if (status === "휴면") return "warn";
  if (status === "차단") return "danger";
  return "gray";
}

const M000001_DETAIL: Omit<WebMemberDetail, keyof WebMember> = {
  gender: "남성",
  birthDate: "1990-03-15",
  zipCode: "06234",
  address: "서울특별시 강남구 테헤란로 123",
  addressDetail: "AOS빌딩 8층",
  referralCode: "HAPPYAOS",
  referredAt: "2026-06-12",
  agencyManager: "김담당",
  agencyPhone: "010-0000-0000",
  inflowMemo: "홈페이지 추천코드 입력 가입",
  consultations: [
    {
      date: "2026-06-28",
      type: "예약문의",
      content: "제주도 3박4일 상품 출발일 변경 가능 여부 문의",
      status: "완료",
      manager: "이상담",
    },
    {
      date: "2026-07-01",
      type: "회원정보",
      content: "휴대전화 번호 변경 요청 접수",
      status: "처리중",
      manager: "박운영",
    },
  ],
  adminMemos: [
    {
      date: "2026-06-15",
      author: "장윤호",
      content: "판매점 추천가입 회원. 행복투어 담당자 확인 완료.",
    },
    {
      date: "2026-06-30",
      author: "김관리",
      content: "예약 1건 확정. VIP 고객 관리 대상으로 분류.",
    },
  ],
  reservationSummary: {
    totalCount: 3,
    latestReservedAt: "2026-06-25",
    totalPaidAmount: "4,850,000원",
    statusSummary: "확정 2건 · 취소 1건",
  },
  reservations: [
    {
      code: "R20260620001",
      reservedAt: "2026-06-20",
      departureAt: "2026-07-10",
      productName: "제주도 3박4일 힐링 패키지",
      people: "2명",
      reserveStatus: "예약확정",
      reserveStatusClass: "success",
      paymentStatus: "결제완료",
      paymentStatusClass: "success",
      amount: "1,980,000원",
      agency: "행복투어",
    },
    {
      code: "R20260615002",
      reservedAt: "2026-06-15",
      departureAt: "2026-08-05",
      productName: "부산 해운대 2박3일",
      people: "3명",
      reserveStatus: "예약확정",
      reserveStatusClass: "success",
      paymentStatus: "부분결제",
      paymentStatusClass: "warn",
      amount: "1,450,000원",
      agency: "행복투어",
    },
    {
      code: "R20260528003",
      reservedAt: "2026-05-28",
      departureAt: "2026-06-10",
      productName: "경주 역사문화 1박2일",
      people: "2명",
      reserveStatus: "취소완료",
      reserveStatusClass: "gray",
      paymentStatus: "환불완료",
      paymentStatusClass: "gray",
      amount: "1,420,000원",
      agency: "행복투어",
    },
  ],
  changeHistory: [
    {
      changedAt: "2026-06-12 14:32",
      field: "회원가입",
      before: "-",
      after: "정상",
      actor: "시스템",
    },
    {
      changedAt: "2026-06-28 10:15",
      field: "휴대전화",
      before: "010-1111-2222",
      after: "010-1234-5678",
      actor: "박운영",
    },
    {
      changedAt: "2026-06-30 16:40",
      field: "회원등급",
      before: "일반",
      after: "VIP",
      actor: "장윤호",
    },
  ],
};

function buildDefaultDetail(member: WebMember): WebMemberDetail {
  const isAgencyReferral = member.joinPath === "판매점 추천가입";
  return {
    ...member,
    gender: "남성",
    birthDate: "1990-01-01",
    zipCode: "04524",
    address: "서울특별시 중구 세종대로 110",
    addressDetail: "101동 1001호",
    referralCode: isAgencyReferral ? "AOSREF01" : "-",
    referredAt: isAgencyReferral ? member.joinedAt : "-",
    agencyManager: isAgencyReferral ? "담당자" : "-",
    agencyPhone: isAgencyReferral ? "010-0000-0000" : "-",
    inflowMemo: isAgencyReferral ? `${member.agency} 추천코드 가입` : "일반 가입",
    consultations: [
      {
        date: member.joinedAt,
        type: "가입안내",
        content: "회원가입 완료 안내 발송",
        status: "완료",
        manager: "시스템",
      },
    ],
    adminMemos: [
      {
        date: member.joinedAt,
        author: "시스템",
        content: "웹회원 가입 등록",
      },
    ],
    reservationSummary: {
      totalCount: 0,
      latestReservedAt: "-",
      totalPaidAmount: "0원",
      statusSummary: "예약 없음",
    },
    reservations: [],
    changeHistory: [
      {
        changedAt: `${member.joinedAt} 09:00`,
        field: "회원가입",
        before: "-",
        after: member.status,
        actor: "시스템",
      },
    ],
  };
}

const DETAIL_OVERRIDES: Partial<Record<string, Omit<WebMemberDetail, keyof WebMember>>> = {
  M000001: M000001_DETAIL,
};

export function getWebMemberById(id: string): WebMember | undefined {
  return WEB_MEMBERS.find((member) => member.id === id);
}

export function getWebMemberDetail(id: string): WebMemberDetail | undefined {
  const member = getWebMemberById(id);
  if (!member) return undefined;

  const override = DETAIL_OVERRIDES[id];
  if (override) {
    return { ...member, ...override };
  }

  return buildDefaultDetail(member);
}
