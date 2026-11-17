export const STAMP_TOUR_CHILDREN = [
  "스탬프투어 목록",
  "관광지 관리",
  "경품관리",
  "참여자·진행현황",
  "인증 이력",
  "완주·경품 지급",
  "통계",
] as const;

export type StampTourChild = (typeof STAMP_TOUR_CHILDREN)[number];

const routes: Record<StampTourChild, string> = {
  "스탬프투어 목록": "/stamp-tours",
  "관광지 관리": "/stamp-tours/attractions",
  경품관리: "/stamp-tours/prizes",
  "참여자·진행현황": "/stamp-tours/participants",
  "인증 이력": "/stamp-tours/verifications",
  "완주·경품 지급": "/stamp-tours/rewards",
  통계: "/stamp-tours/statistics",
};

/** 스탬프투어 하위 메뉴 이동. 구명칭(완주·경품 관리)도 지급 화면으로 안내한다. */
export function goStampTourChild(child: string, fallback?: (message: string) => void) {
  if (child === "완주·경품 관리") {
    window.location.assign(routes["완주·경품 지급"]);
    return;
  }
  const path = routes[child as StampTourChild];
  if (path) {
    window.location.assign(path);
    return;
  }
  if (child === "상품목록") {
    window.location.assign("/products");
    return;
  }
  fallback?.(`${child} 화면은 다음 단계에서 제공될 예정입니다.`);
}

export function stampTourMenuItem() {
  return { icon: "qr", label: "스탬프투어 관리", children: [...STAMP_TOUR_CHILDREN] as string[] };
}
