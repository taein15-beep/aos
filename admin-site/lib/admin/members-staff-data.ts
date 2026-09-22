/**
 * 관리자/직원관리 Mock (UI 확인용)
 * - DB/API 연동 없음
 * - 소속그룹 = 권한그룹 표시용
 */

export type StaffMemberRow = {
  /** 로그인 ID (= 목록 ID 컬럼) */
  adminCode: string;
  koreanName: string;
  position: string;
  englishName: string;
  mobile: string;
  directPhone: string;
  email: string;
  /** 권한그룹명 (소속그룹 컬럼) */
  groupName: string;
  salesManage: string;
};

export function getStaffMemberByAdminCode(adminCode: string) {
  return STAFF_MEMBER_MOCK_ROWS.find((row) => row.adminCode === adminCode);
}

/** 이메일 2개 이상이면 줄바꿈 표시용으로 분리 */
export function splitStaffEmails(email: string): string[] {
  return email
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export const STAFF_MEMBER_MOCK_ROWS: StaffMemberRow[] = [
  {
    adminCode: "changys888",
    koreanName: "장용선",
    position: "",
    englishName: "Ted",
    mobile: "",
    directPhone: "",
    email: "",
    groupName: "최종관리자",
    salesManage: "",
  },
  {
    adminCode: "admin_kim",
    koreanName: "김관리",
    position: "",
    englishName: "",
    mobile: "",
    directPhone: "",
    email: "",
    groupName: "관리자",
    salesManage: "",
  },
  {
    adminCode: "staff_lee",
    koreanName: "이직원",
    position: "",
    englishName: "",
    mobile: "",
    directPhone: "",
    email: "",
    groupName: "직원",
    salesManage: "",
  },
  {
    adminCode: "product_park",
    koreanName: "박상품",
    position: "",
    englishName: "",
    mobile: "",
    directPhone: "",
    email: "",
    groupName: "상품담당",
    salesManage: "",
  },
  {
    adminCode: "reserve_choi",
    koreanName: "최예약",
    position: "",
    englishName: "",
    mobile: "",
    directPhone: "",
    email: "",
    groupName: "예약·CS담당",
    salesManage: "",
  },
  {
    adminCode: "account_jung",
    koreanName: "정회계",
    position: "",
    englishName: "",
    mobile: "",
    directPhone: "",
    email: "",
    groupName: "정산담당",
    salesManage: "",
  },
  {
    adminCode: "guide_hong",
    koreanName: "홍길동",
    position: "",
    englishName: "",
    mobile: "",
    directPhone: "",
    email: "",
    groupName: "가이드",
    salesManage: "",
  },
  {
    adminCode: "driver_kim",
    koreanName: "김기사",
    position: "",
    englishName: "",
    mobile: "",
    directPhone: "",
    email: "",
    groupName: "기사",
    salesManage: "",
  },
];
