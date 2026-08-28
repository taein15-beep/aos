export type AdminMenuItem = {
  icon: string;
  label: string;
  children?: string[];
};

export const ADMIN_MENU: AdminMenuItem[] = [
  { icon: "▦", label: "대시보드" },
  { icon: "◇", label: "상품관리", children: ["상품목록", "상품등록", "일정표관리", "요금관리"] },
  { icon: "▤", label: "예약관리", children: ["예약접수현황", "예약달력"] },
  { icon: "₩", label: "결제관리", children: ["결제현황", "취소/환불"] },
  { icon: "⇄", label: "정산관리", children: ["정산현황", "판매점정산", "공급사정산"] },
  { icon: "♙", label: "회원관리", children: ["웹회원관리", "관리자/직원", "그룹/권한"] },
  { icon: "▣", label: "판매점관리" },
  { icon: "⌂", label: "거래처관리" },
  {
    icon: "qr",
    label: "스탬프투어 관리",
    children: ["스탬프투어 목록", "관광지 관리", "참여자·진행현황", "인증 이력", "완주·경품 관리", "통계"],
  },
  { icon: "▥", label: "통계관리" },
  { icon: "◎", label: "운영관리", children: ["팝업관리", "알림관리", "알림톡"] },
  { icon: "⚙", label: "시스템설정", children: ["홈페이지설정", "결제설정", "기본설정"] },
];

const STAMP_TOUR_CHILD_PATHS: Record<string, string> = {
  "관광지 관리": "attractions",
  "참여자·진행현황": "participants",
  "인증 이력": "verifications",
  "완주·경품 관리": "rewards",
  통계: "statistics",
};

export function getStampTourChildPath(child: string) {
  if (child === "스탬프투어 목록") return "/stamp-tours";
  const segment = STAMP_TOUR_CHILD_PATHS[child];
  return segment ? `/stamp-tours/${segment}` : undefined;
}

export function navigateAdminChild(child: string, act: (message: string) => void) {
  if (child === "상품목록") {
    window.location.assign("/products");
    return;
  }
  if (child === "웹회원관리") {
    window.location.assign("/members/web");
    return;
  }

  const stampTourPath = getStampTourChildPath(child);
  if (stampTourPath) {
    window.location.assign(stampTourPath);
    return;
  }

  act(`${child} 화면은 다음 단계에서 제공될 예정입니다.`);
}
