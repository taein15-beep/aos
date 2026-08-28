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
    joinPath: "홈페이지 일반가입",
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
