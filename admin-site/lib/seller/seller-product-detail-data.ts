/**
 * 판매점 관리자 · 판매상품 상세 Mock (SAMPLE)
 * - 공급여행사가 제공한 상품 원본정보 — 판매점은 조회만 가능 (수정 불가)
 * - 상품코드 기준 조회, 실제 API 연결 시 동일 시그니처로 교체
 */

import type { SellerAdminProduct, SellerProductCategory } from "@/lib/seller/seller-admin-products-data";

export type SellerProductScheduleItem = {
  /** 숙박여행 일차 구분 (예: 1일차) */
  day?: string;
  time: string;
  title: string;
};

export type SellerProductDetail = {
  productType: string;
  duration: string;
  departure: string;
  arrival: string;
  intro: string;
  gallery: string[];
  schedule: SellerProductScheduleItem[];
  includes: string[];
  excludes: string[];
  notices: string[];
  /** 공급여행사 원본 취소정책 — 판매점 Read Only, 자동 계산하지 않음 */
  cancelPolicy: string[];
};

type DetailSeed = {
  arrival: string;
  intro: string;
  departure?: string;
  schedule?: SellerProductScheduleItem[];
  includes?: string[];
  excludes?: string[];
};

const GALLERY_POOL = [
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=320&h=240&fit=crop",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=320&h=240&fit=crop",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=320&h=240&fit=crop",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=320&h=240&fit=crop",
];

const DETAIL_SEEDS: Record<string, DetailSeed> = {
  "HT-DMZ01": {
    arrival: "철원",
    intro: "철원 DMZ와 소이산 모노레일을 하루에 둘러보는 국내 당일여행 상품입니다.",
    schedule: [
      { time: "07:00", title: "서울 출발" },
      { time: "09:30", title: "철원 도착" },
      { time: "10:00", title: "DMZ 관광" },
      { time: "12:00", title: "중식" },
      { time: "14:00", title: "소이산 모노레일" },
      { time: "17:30", title: "서울 출발" },
    ],
  },
  "HD-JS01": { arrival: "정선", intro: "정선 아리랑시장과 레일바이크를 즐기는 강원도 당일여행 상품입니다." },
  "HT-WINE01": {
    arrival: "영동",
    intro: "국악 공연과 와인 시음을 열차 안에서 즐기는 테마 열차여행 상품입니다.",
    schedule: [
      { time: "08:00", title: "서울역 출발 (와인열차 탑승)" },
      { time: "10:30", title: "영동 도착 · 와인터널 관람" },
      { time: "12:00", title: "중식" },
      { time: "13:30", title: "난계국악박물관 · 국악 체험" },
      { time: "16:00", title: "와이너리 시음" },
      { time: "18:00", title: "영동역 출발 · 서울 도착" },
    ],
    includes: ["왕복 열차 운임", "와인터널 입장료", "중식", "와인 시음", "여행자보험"],
  },
  "HD-BS02": { arrival: "부산", intro: "해운대와 감천문화마을, 광안리 야경을 담은 부산 1박 2일 상품입니다." },
  "HT-GC01": {
    arrival: "고창",
    intro: "선운사 꽃무릇 길과 고창 읍성을 함께 걷는 전북 고창 당일여행 상품입니다.",
    schedule: [
      { time: "07:00", title: "서울 출발" },
      { time: "10:30", title: "고창 도착 · 선운사 탐방" },
      { time: "12:30", title: "중식 (풍천장어 정식)" },
      { time: "14:00", title: "고창 읍성 산책" },
      { time: "16:30", title: "서울 출발" },
    ],
  },
  "HD-JC01": { arrival: "제천", intro: "청풍호 유람선과 케이블카로 제천의 호수 풍경을 즐기는 당일여행 상품입니다." },
  "HT-NAMI01": { arrival: "춘천", intro: "단풍이 물든 남이섬과 쁘띠프랑스를 둘러보는 가을 당일여행 상품입니다." },
  "HT-DY01": { arrival: "단양", intro: "단양 하늘에서 패러글라이딩을 체험하고 도담삼봉을 둘러보는 체험여행 상품입니다." },
  "HD-NH01": { arrival: "남해", intro: "독일마을과 다랭이마을을 둘러보는 남해 당일투어 상품입니다." },
  "HT-GP01": { arrival: "가평", intro: "가평 와이너리에서 소믈리에와 함께하는 와인 클래스 체험 상품입니다." },
  "HD-TY01": { arrival: "통영", intro: "통영 케이블카와 동피랑 벽화마을을 담은 1박 2일 상품입니다." },
  "HT-SR01": { arrival: "속초", intro: "설악산 단풍과 권금성 케이블카를 즐기는 당일여행 상품입니다." },
  "HT-GJ01": { arrival: "경주", intro: "동궁과 월지 야경과 불국사를 둘러보는 경주 1박 2일 상품입니다." },
  "HD-GJ01": { departure: "부산", arrival: "거제", intro: "외도 보타니아와 바람의 언덕을 둘러보는 거제 당일여행 상품입니다." },
  "HT-JJ01": { arrival: "전주", intro: "전주 한옥마을과 경기전, 남부시장을 둘러보는 당일여행 상품입니다." },
  "HT-YS01": { arrival: "여수", intro: "여수 밤바다 야경과 오동도를 담은 1박 2일 상품입니다." },
  "HD-SC01": { arrival: "순천", intro: "순천만 국가정원과 순천만 습지를 둘러보는 당일여행 상품입니다." },
  "HT-AD01": { arrival: "안동", intro: "안동 하회마을과 병산서원을 둘러보는 당일여행 상품입니다." },
  "HD-DY01": { arrival: "담양", intro: "죽녹원 대나무숲과 메타세쿼이아길을 걷는 담양 당일여행 상품입니다." },
  "HT-TA01": { arrival: "태안", intro: "꽃지해변 낙조와 안면도 수목원을 둘러보는 태안 당일여행 상품입니다." },
};

const PRODUCT_TYPE_BY_CATEGORY: Record<SellerProductCategory, string> = {
  당일여행: "국내 당일여행",
  숙박여행: "국내 숙박여행",
  테마여행: "국내 테마여행",
  체험여행: "국내 체험여행",
};

const DEFAULT_INCLUDES = ["왕복 교통비", "관광지 입장료", "중식", "여행자보험"];
const DEFAULT_EXCLUDES = ["개인경비", "선택관광", "기타 개인비용"];
const DEFAULT_NOTICES = [
  "출발 10분 전까지 탑승장소 도착",
  "일정은 현지 사정에 따라 변경될 수 있음",
  "최소 출발인원 미달 시 취소 가능",
];

/** 취소정책 구간 — 여행일 기준 남은 일수(minDays~maxDays)별 취소수수료율 %. maxDays null은 "N일 전까지" */
export type SellerCancelPolicyRule = { minDays: number; maxDays: number | null; rate: number };

const DAY_TRIP_CANCEL_RULES: SellerCancelPolicyRule[] = [
  { minDays: 7, maxDays: null, rate: 0 },
  { minDays: 3, maxDays: 6, rate: 10 },
  { minDays: 1, maxDays: 2, rate: 20 },
  { minDays: 0, maxDays: 0, rate: 100 },
];
const OVERNIGHT_CANCEL_RULES: SellerCancelPolicyRule[] = [
  { minDays: 10, maxDays: null, rate: 0 },
  { minDays: 7, maxDays: 9, rate: 10 },
  { minDays: 3, maxDays: 6, rate: 30 },
  { minDays: 1, maxDays: 2, rate: 50 },
  { minDays: 0, maxDays: 0, rate: 100 },
];

export function formatSellerCancelPolicyRule(rule: SellerCancelPolicyRule) {
  const period =
    rule.maxDays === null ? `여행 ${rule.minDays}일 전까지` : rule.maxDays === 0 ? "여행 당일" : `여행 ${rule.minDays}~${rule.maxDays}일 전`;
  const fee = rule.rate === 0 ? "취소수수료 없음" : rule.rate >= 100 ? "환불불가" : `여행요금의 ${rule.rate}%`;
  return `${period}: ${fee}`;
}

/** 상품 유형별 공급여행사 원본 취소정책 구간 */
export function sellerCancelPolicyRules(category: SellerProductCategory): SellerCancelPolicyRule[] {
  return category === "숙박여행" ? OVERNIGHT_CANCEL_RULES : DAY_TRIP_CANCEL_RULES;
}

/** 남은 일수에 해당하는 정책 구간 — 여행일이 지난 경우(음수) null */
export function findSellerCancelPolicyRule(rules: readonly SellerCancelPolicyRule[], daysBefore: number) {
  if (daysBefore < 0) return null;
  return rules.find((rule) => daysBefore >= rule.minDays && (rule.maxDays === null || daysBefore <= rule.maxDays)) ?? null;
}

function defaultSchedule(departure: string, arrival: string, overnight: boolean): SellerProductScheduleItem[] {
  if (overnight) {
    return [
      { day: "1일차", time: "07:30", title: `${departure} 출발` },
      { day: "1일차", time: "11:30", title: `${arrival} 도착 · 시내 관광` },
      { day: "1일차", time: "18:00", title: "석식 · 숙소 체크인" },
      { day: "2일차", time: "09:00", title: "조식 후 주요 명소 관광" },
      { day: "2일차", time: "12:30", title: "중식" },
      { day: "2일차", time: "15:00", title: `${departure} 출발` },
    ];
  }
  return [
    { time: "07:00", title: `${departure} 출발` },
    { time: "10:00", title: `${arrival} 도착 · 오전 관광` },
    { time: "12:00", title: "중식" },
    { time: "14:00", title: "오후 관광" },
    { time: "17:00", title: `${departure} 출발` },
  ];
}

export function getSellerProductDetail(product: SellerAdminProduct): SellerProductDetail {
  const seed = DETAIL_SEEDS[product.productCode] ?? { arrival: "-", intro: `${product.productName} 상품입니다.` };
  const overnight = product.category === "숙박여행";
  const departure = seed.departure ?? "서울";
  const offset = product.productCode.length % GALLERY_POOL.length;
  return {
    productType: PRODUCT_TYPE_BY_CATEGORY[product.category],
    duration: overnight ? "1박 2일" : "당일",
    departure,
    arrival: seed.arrival,
    intro: seed.intro,
    gallery: product.imageUrl ? [...GALLERY_POOL.slice(offset), ...GALLERY_POOL.slice(0, offset)].slice(0, 3) : [],
    schedule: seed.schedule ?? defaultSchedule(departure, seed.arrival, overnight),
    includes: seed.includes ?? (overnight ? ["왕복 교통비", "숙박 (2인 1실)", "관광지 입장료", "식사 (중식 2회 · 석식 1회 · 조식 1회)", "여행자보험"] : DEFAULT_INCLUDES),
    excludes: seed.excludes ?? DEFAULT_EXCLUDES,
    notices: DEFAULT_NOTICES,
    cancelPolicy: sellerCancelPolicyRules(product.category).map(formatSellerCancelPolicyRule),
  };
}
