/**
 * 회원관리 > 판매점관리 — 현재 공급여행사 ↔ 판매점 거래 관계 Mock.
 * - 현재 로그인한 공급여행사와 판매점 사이의 관계만 다룬다(다른 공급여행사 가입정보는 보관·노출하지 않음).
 * - DB/API 연동 없음. 화면 상태변경은 컴포넌트 state에서만 처리한다.
 * - 판매점 정보(연락처·이메일·사업자번호)는 모두 테스트용 샘플 값이다.
 * - SEL00032(그래가자)는 판매점 관리자 Data(판매상품 · 예약)를 기준으로 판매상품 · 판매현황을 계산한다.
 */

import type { SellerAdminProduct } from "@/lib/seller/seller-admin-products-data";
import {
  isSellerReservationInBaseMonth,
  sellerReservationAmount,
  type SellerReservation,
} from "@/lib/seller/seller-reservations-data";

export const CURRENT_SUPPLIER_NAME = "행복투어";
const CURRENT_SUPPLIER_ID = "AGENCY-HAPPY";

/** 판매점 관리자 Data와 연결된 판매점 코드 */
export const SELLER_CHANNEL_LINKED_SELLER_CODE = "SEL00032";

export type SellerRelationStatus = "승인대기" | "정상" | "이용중지" | "승인거절";
export type SellerRelationBusinessType = "개인사업자" | "법인사업자";
export type SellerRelationProductMode = "commission" | "deposit";
export type SellerRelationProductStatus = "판매중" | "설정대기" | "판매중지";

/** 가입 판매점 = 승인대기 + 정상 + 이용중지. 승인거절은 가입신청 이력으로 별도 필터에서만 조회 */
export const SELLER_RELATION_STATUS_FILTERS = ["가입 판매점", "승인대기", "정상", "이용중지", "승인거절"] as const;
export type SellerRelationStatusFilter = (typeof SELLER_RELATION_STATUS_FILTERS)[number];

export const SELLER_RELATION_PAGE_SIZE = 10;

export interface SellerRelationProduct {
  productCode: string;
  productName: string;
  mode: SellerRelationProductMode;
  /** 공급여행사 판매가 (수수료형은 판매점 판매가와 동일) */
  listPrice: number;
  commissionRate: number | null;
  depositPrice: number | null;
  /** 입금가형 판매점 판매가 (판매점이 설정, 공급여행사는 조회만) */
  sellerPrice: number | null;
  status: SellerRelationProductStatus;
}

export interface SellerRelation {
  id: string;
  sellerCode: string;
  sellerName: string;
  representative: string;
  managerName: string;
  phone: string;
  email: string;
  businessNumber: string;
  businessType: SellerRelationBusinessType;
  /** 가입신청일 (YYYY-MM-DD) */
  appliedAt: string;
  /** 가입승인일 (YYYY-MM-DD) — 승인 전에는 null */
  joinedAt: string | null;
  status: SellerRelationStatus;
  productCount: number;
  reservationCount: number;
  monthReservationCount: number;
  monthSalesAmount: number;
  products: SellerRelationProduct[];
}

type CatalogItem = Pick<SellerRelationProduct, "productCode" | "productName" | "listPrice">;

/** 행복투어 공급상품 샘플 카탈로그 (HT-DMZ01 외에는 판매점관리 조회용 테스트 상품) */
const SAMPLE_CATALOG: CatalogItem[] = [
  { productCode: "HT-DMZ01", productName: "철원 DMZ · 소이산 모노레일 당일", listPrice: 69000 },
  { productCode: "GC-WINE01", productName: "국악와인열차 고창 당일여행", listPrice: 89000 },
  { productCode: "HT-GC03", productName: "고창 청보리밭 당일여행", listPrice: 65000 },
  { productCode: "HT-GN04", productName: "강릉 정동진 바다부채길 당일", listPrice: 59000 },
  { productCode: "HT-GJ05", productName: "경주 역사유적 1박2일", listPrice: 159000 },
  { productCode: "HT-JN06", productName: "전주 한옥마을 미식 당일", listPrice: 65000 },
  { productCode: "HT-YS07", productName: "여수 밤바다 낭만 1박2일", listPrice: 179000 },
  { productCode: "HT-DY08", productName: "단양 패러글라이딩 체험 당일", listPrice: 99000 },
  { productCode: "HT-SC09", productName: "순천만 국가정원 당일", listPrice: 62000 },
  { productCode: "HT-BS10", productName: "부산 해운대 · 감천마을 1박2일", listPrice: 189000 },
  { productCode: "HT-TA11", productName: "태안 꽃지 일몰 당일", listPrice: 55000 },
  { productCode: "HT-AD12", productName: "안동 하회마을 당일", listPrice: 64000 },
  { productCode: "HT-NM13", productName: "남해 독일마을 1박2일", listPrice: 169000 },
  { productCode: "HT-SR14", productName: "설악산 케이블카 당일", listPrice: 72000 },
];

function catalog(code: string): CatalogItem {
  const item = SAMPLE_CATALOG.find((entry) => entry.productCode === code);
  if (!item) throw new Error(`Unknown sample product: ${code}`);
  return item;
}

function commission(code: string, rate: number, status: SellerRelationProductStatus = "판매중"): SellerRelationProduct {
  return { ...catalog(code), mode: "commission", commissionRate: rate, depositPrice: null, sellerPrice: null, status };
}

function deposit(
  code: string,
  depositPrice: number,
  sellerPrice: number | null,
  status: SellerRelationProductStatus = "판매중",
): SellerRelationProduct {
  return { ...catalog(code), mode: "deposit", commissionRate: null, depositPrice, sellerPrice, status };
}

/** 카탈로그 앞에서부터 count개 상품을 동일 수수료율의 수수료형으로 연결한 샘플 */
function commissionSet(count: number, rate: number): SellerRelationProduct[] {
  return SAMPLE_CATALOG.slice(0, count).map((item) => commission(item.productCode, rate));
}

interface SellerSeed {
  id: string;
  sellerCode: string;
  sellerName: string;
  representative: string;
  managerName: string;
  phone: string;
  businessType: SellerRelationBusinessType;
  appliedAt: string;
  joinedAt: string | null;
  status: SellerRelationStatus;
  reservationCount: number;
  monthReservationCount: number;
  monthSalesAmount: number;
  products: SellerRelationProduct[];
}

function seller(seed: SellerSeed): SellerRelation {
  const no = seed.sellerCode.replace("SEL", "");
  return {
    ...seed,
    email: `seller${no}@example.com`,
    businessNumber: `123-45-${no}`,
    productCount: seed.products.filter((product) => product.status === "판매중").length,
  };
}

const SAMPLE_SELLER_RELATIONS: SellerRelation[] = [
  seller({
    id: "rel-081",
    sellerCode: "SEL00081",
    sellerName: "여행가자",
    representative: "김OO",
    managerName: "이영희",
    phone: "010-3456-7890",
    businessType: "개인사업자",
    appliedAt: "2026-10-08",
    joinedAt: null,
    status: "승인대기",
    reservationCount: 0,
    monthReservationCount: 0,
    monthSalesAmount: 0,
    products: [],
  }),
  seller({
    id: "rel-110",
    sellerCode: "SEL00110",
    sellerName: "두리여행",
    representative: "정OO",
    managerName: "정다은",
    phone: "010-5678-0110",
    businessType: "법인사업자",
    appliedAt: "2026-10-06",
    joinedAt: null,
    status: "승인대기",
    reservationCount: 0,
    monthReservationCount: 0,
    monthSalesAmount: 0,
    products: [],
  }),
  seller({
    id: "rel-114",
    sellerCode: "SEL00114",
    sellerName: "해맑은투어",
    representative: "윤OO",
    managerName: "윤서준",
    phone: "010-6789-0114",
    businessType: "개인사업자",
    appliedAt: "2026-10-02",
    joinedAt: null,
    status: "승인대기",
    reservationCount: 0,
    monthReservationCount: 0,
    monthSalesAmount: 0,
    products: [],
  }),
  seller({
    id: "rel-032",
    sellerCode: "SEL00032",
    sellerName: "그래가자",
    representative: "최OO",
    managerName: "홍길동",
    phone: "010-1234-5678",
    businessType: "법인사업자",
    appliedAt: "2026-08-07",
    joinedAt: "2026-08-10",
    status: "정상",
    reservationCount: 38,
    monthReservationCount: 8,
    monthSalesAmount: 2450000,
    products: [
      commission("HT-DMZ01", 10),
      deposit("GC-WINE01", 70000, 89000),
      commission("HT-GN04", 10),
      commission("HT-GJ05", 8),
      deposit("HT-JN06", 52000, 65000),
      commission("HT-YS07", 8),
      commission("HT-DY08", 10),
      deposit("HT-SC09", 50000, 62000),
      commission("HT-BS10", 8),
      commission("HT-TA11", 10),
      deposit("HT-AD12", 51000, 64000),
      commission("HT-NM13", 8),
      deposit("HT-GC03", 55000, null, "설정대기"),
    ],
  }),
  seller({
    id: "rel-041",
    sellerCode: "SEL00041",
    sellerName: "나드리투어",
    representative: "강OO",
    managerName: "김민수",
    phone: "010-2345-6789",
    businessType: "법인사업자",
    appliedAt: "2026-08-14",
    joinedAt: "2026-08-18",
    status: "정상",
    reservationCount: 21,
    monthReservationCount: 5,
    monthSalesAmount: 1320000,
    products: [
      deposit("HT-DMZ01", 55000, 65000),
      commission("GC-WINE01", 9),
      commission("HT-GN04", 9),
      deposit("HT-JN06", 53000, 66000),
      commission("HT-SC09", 9),
      commission("HT-TA11", 9),
      deposit("HT-AD12", 52000, 63000),
      commission("HT-SR14", 9),
      deposit("HT-GC03", 54000, null, "설정대기"),
    ],
  }),
  seller({
    id: "rel-067",
    sellerCode: "SEL00067",
    sellerName: "바른길투어",
    representative: "오OO",
    managerName: "오세훈",
    phone: "010-3101-0067",
    businessType: "개인사업자",
    appliedAt: "2026-07-28",
    joinedAt: "2026-08-01",
    status: "정상",
    reservationCount: 17,
    monthReservationCount: 4,
    monthSalesAmount: 980000,
    products: commissionSet(6, 8),
  }),
  seller({
    id: "rel-073",
    sellerCode: "SEL00073",
    sellerName: "우리동네여행",
    representative: "임OO",
    managerName: "임하늘",
    phone: "010-3202-0073",
    businessType: "개인사업자",
    appliedAt: "2026-08-20",
    joinedAt: "2026-08-22",
    status: "정상",
    reservationCount: 9,
    monthReservationCount: 2,
    monthSalesAmount: 410000,
    products: commissionSet(4, 8),
  }),
  seller({
    id: "rel-105",
    sellerCode: "SEL00105",
    sellerName: "서울투어",
    representative: "서OO",
    managerName: "서지민",
    phone: "010-3303-0105",
    businessType: "법인사업자",
    appliedAt: "2026-09-10",
    joinedAt: "2026-09-12",
    status: "정상",
    reservationCount: 14,
    monthReservationCount: 6,
    monthSalesAmount: 1150000,
    products: commissionSet(7, 10),
  }),
  seller({
    id: "rel-012",
    sellerCode: "SEL00012",
    sellerName: "하늘여행사",
    representative: "한OO",
    managerName: "한지수",
    phone: "010-3404-0012",
    businessType: "법인사업자",
    appliedAt: "2026-05-02",
    joinedAt: "2026-05-06",
    status: "정상",
    reservationCount: 46,
    monthReservationCount: 7,
    monthSalesAmount: 2130000,
    products: commissionSet(10, 10),
  }),
  seller({
    id: "rel-018",
    sellerCode: "SEL00018",
    sellerName: "푸른투어",
    representative: "문OO",
    managerName: "문태호",
    phone: "010-3505-0018",
    businessType: "개인사업자",
    appliedAt: "2026-05-18",
    joinedAt: "2026-05-20",
    status: "정상",
    reservationCount: 22,
    monthReservationCount: 3,
    monthSalesAmount: 690000,
    products: commissionSet(5, 8),
  }),
  seller({
    id: "rel-023",
    sellerCode: "SEL00023",
    sellerName: "별빛여행",
    representative: "배OO",
    managerName: "배수연",
    phone: "010-3606-0023",
    businessType: "개인사업자",
    appliedAt: "2026-06-01",
    joinedAt: "2026-06-03",
    status: "정상",
    reservationCount: 11,
    monthReservationCount: 1,
    monthSalesAmount: 189000,
    products: commissionSet(3, 8),
  }),
  seller({
    id: "rel-027",
    sellerCode: "SEL00027",
    sellerName: "바다여행클럽",
    representative: "조OO",
    managerName: "조민혁",
    phone: "010-3707-0027",
    businessType: "법인사업자",
    appliedAt: "2026-06-10",
    joinedAt: "2026-06-12",
    status: "정상",
    reservationCount: 31,
    monthReservationCount: 6,
    monthSalesAmount: 1580000,
    products: commissionSet(9, 9),
  }),
  seller({
    id: "rel-036",
    sellerCode: "SEL00036",
    sellerName: "동행투어",
    representative: "신OO",
    managerName: "신유진",
    phone: "010-3808-0036",
    businessType: "개인사업자",
    appliedAt: "2026-06-24",
    joinedAt: "2026-06-25",
    status: "정상",
    reservationCount: 8,
    monthReservationCount: 2,
    monthSalesAmount: 318000,
    products: commissionSet(4, 8),
  }),
  seller({
    id: "rel-044",
    sellerCode: "SEL00044",
    sellerName: "새봄여행",
    representative: "권OO",
    managerName: "권나래",
    phone: "010-3909-0044",
    businessType: "개인사업자",
    appliedAt: "2026-07-01",
    joinedAt: "2026-07-03",
    status: "정상",
    reservationCount: 13,
    monthReservationCount: 3,
    monthSalesAmount: 547000,
    products: commissionSet(5, 9),
  }),
  seller({
    id: "rel-048",
    sellerCode: "SEL00048",
    sellerName: "다솜투어",
    representative: "황OO",
    managerName: "황보람",
    phone: "010-4010-0048",
    businessType: "법인사업자",
    appliedAt: "2026-07-08",
    joinedAt: "2026-07-09",
    status: "정상",
    reservationCount: 19,
    monthReservationCount: 4,
    monthSalesAmount: 864000,
    products: commissionSet(6, 10),
  }),
  seller({
    id: "rel-059",
    sellerCode: "SEL00059",
    sellerName: "한빛여행",
    representative: "안OO",
    managerName: "안재현",
    phone: "010-4111-0059",
    businessType: "개인사업자",
    appliedAt: "2026-07-20",
    joinedAt: "2026-07-22",
    status: "정상",
    reservationCount: 6,
    monthReservationCount: 1,
    monthSalesAmount: 159000,
    products: commissionSet(3, 8),
  }),
  seller({
    id: "rel-063",
    sellerCode: "SEL00063",
    sellerName: "소풍여행",
    representative: "송OO",
    managerName: "송지아",
    phone: "010-4212-0063",
    businessType: "개인사업자",
    appliedAt: "2026-07-24",
    joinedAt: "2026-07-26",
    status: "정상",
    reservationCount: 10,
    monthReservationCount: 2,
    monthSalesAmount: 248000,
    products: commissionSet(4, 9),
  }),
  seller({
    id: "rel-077",
    sellerCode: "SEL00077",
    sellerName: "즐거운여행",
    representative: "유OO",
    managerName: "유하준",
    phone: "010-4313-0077",
    businessType: "법인사업자",
    appliedAt: "2026-08-25",
    joinedAt: "2026-08-27",
    status: "정상",
    reservationCount: 15,
    monthReservationCount: 5,
    monthSalesAmount: 905000,
    products: commissionSet(8, 10),
  }),
  seller({
    id: "rel-085",
    sellerCode: "SEL00085",
    sellerName: "길벗투어",
    representative: "노OO",
    managerName: "노은비",
    phone: "010-4414-0085",
    businessType: "개인사업자",
    appliedAt: "2026-09-02",
    joinedAt: "2026-09-04",
    status: "정상",
    reservationCount: 5,
    monthReservationCount: 2,
    monthSalesAmount: 214000,
    products: commissionSet(3, 8),
  }),
  seller({
    id: "rel-097",
    sellerCode: "SEL00097",
    sellerName: "미소여행",
    representative: "전OO",
    managerName: "전소희",
    phone: "010-4515-0097",
    businessType: "개인사업자",
    appliedAt: "2026-09-15",
    joinedAt: "2026-09-17",
    status: "정상",
    reservationCount: 4,
    monthReservationCount: 3,
    monthSalesAmount: 297000,
    products: commissionSet(2, 8),
  }),
  seller({
    id: "rel-101",
    sellerCode: "SEL00101",
    sellerName: "온누리투어",
    representative: "남OO",
    managerName: "남궁민",
    phone: "010-4616-0101",
    businessType: "법인사업자",
    appliedAt: "2026-09-22",
    joinedAt: "2026-09-24",
    status: "정상",
    reservationCount: 3,
    monthReservationCount: 3,
    monthSalesAmount: 387000,
    products: commissionSet(5, 9),
  }),
  seller({
    id: "rel-055",
    sellerCode: "SEL00055",
    sellerName: "한길여행",
    representative: "박OO",
    managerName: "박지훈",
    phone: "010-4567-8901",
    businessType: "법인사업자",
    appliedAt: "2026-07-12",
    joinedAt: "2026-07-15",
    status: "이용중지",
    reservationCount: 12,
    monthReservationCount: 0,
    monthSalesAmount: 0,
    products: [
      deposit("HT-DMZ01", 52000, 69000),
      commission("HT-GN04", 8),
      commission("HT-JN06", 8),
      deposit("HT-SC09", 50000, 61000),
      commission("HT-TA11", 8),
    ],
  }),
  seller({
    id: "rel-029",
    sellerCode: "SEL00029",
    sellerName: "산들투어",
    representative: "구OO",
    managerName: "구민서",
    phone: "010-4717-0029",
    businessType: "개인사업자",
    appliedAt: "2026-06-14",
    joinedAt: "2026-06-16",
    status: "이용중지",
    reservationCount: 7,
    monthReservationCount: 0,
    monthSalesAmount: 0,
    products: commissionSet(3, 8),
  }),
  seller({
    id: "rel-070",
    sellerCode: "SEL00070",
    sellerName: "모아여행",
    representative: "지OO",
    managerName: "지유나",
    phone: "010-4818-0070",
    businessType: "개인사업자",
    appliedAt: "2026-08-03",
    joinedAt: "2026-08-05",
    status: "이용중지",
    reservationCount: 2,
    monthReservationCount: 0,
    monthSalesAmount: 0,
    products: commissionSet(2, 8),
  }),
  seller({
    id: "rel-092",
    sellerCode: "SEL00092",
    sellerName: "좋은여행",
    representative: "류OO",
    managerName: "류현우",
    phone: "010-4919-0092",
    businessType: "개인사업자",
    appliedAt: "2026-09-28",
    joinedAt: null,
    status: "승인거절",
    reservationCount: 0,
    monthReservationCount: 0,
    monthSalesAmount: 0,
    products: [],
  }),
];

export function loadSupplierSellerRelations(): SellerRelation[] {
  return SAMPLE_SELLER_RELATIONS.map((row) => ({ ...row, products: row.products.map((product) => ({ ...product })) }));
}

function toRelationProduct(product: SellerAdminProduct): SellerRelationProduct {
  const isCommission = product.saleMode === "수수료형";
  return {
    productCode: product.productCode,
    productName: product.productName,
    mode: isCommission ? "commission" : "deposit",
    listPrice: product.supplyPrice ?? product.depositPrice ?? 0,
    commissionRate: product.commissionRate,
    depositPrice: product.depositPrice,
    sellerPrice: product.sellerPrice,
    status: product.salesStatus,
  };
}

/**
 * 연결 판매점 관계정보 — 판매점 관리자의 판매상품 · 판매점 판매가 · 판매상태 · 예약을 현재 공급여행사 상품으로 한정해 반영
 * 관계상태(status)는 공급여행사 화면 값을 유지한다.
 */
export function linkSellerChannelRelation(
  row: SellerRelation,
  sellerProducts: readonly SellerAdminProduct[],
  sellerReservations: readonly SellerReservation[],
): SellerRelation {
  if (row.sellerCode !== SELLER_CHANNEL_LINKED_SELLER_CODE) return row;
  const products = sellerProducts
    .filter((product) => product.supplierTravelAgencyId === CURRENT_SUPPLIER_ID)
    .map(toRelationProduct);
  const reservations = sellerReservations.filter((item) => item.supplierTravelAgencyId === CURRENT_SUPPLIER_ID);
  const monthReservations = reservations.filter(isSellerReservationInBaseMonth);
  return {
    ...row,
    products,
    productCount: products.filter((product) => product.status === "판매중").length,
    reservationCount: reservations.length,
    monthReservationCount: monthReservations.length,
    monthSalesAmount: monthReservations
      .filter((item) => item.status !== "취소완료")
      .reduce((sum, item) => sum + sellerReservationAmount(item), 0),
  };
}

export interface SellerRelationCounts {
  total: number;
  승인대기: number;
  정상: number;
  이용중지: number;
  승인거절: number;
}

/** 전체 판매점 = 가입관계가 있거나 신청 중인 판매점 (승인거절 건 제외) */
export function countSellerRelations(rows: SellerRelation[]): SellerRelationCounts {
  const counts: SellerRelationCounts = { total: 0, 승인대기: 0, 정상: 0, 이용중지: 0, 승인거절: 0 };
  for (const row of rows) {
    counts[row.status] += 1;
    if (row.status !== "승인거절") counts.total += 1;
  }
  return counts;
}

export function filterSellerRelations(
  rows: SellerRelation[],
  keyword: string,
  status: SellerRelationStatusFilter,
): SellerRelation[] {
  const query = keyword.trim().toLowerCase();
  return rows.filter((row) => {
    if (status === "가입 판매점" ? row.status === "승인거절" : row.status !== status) return false;
    if (!query) return true;
    return [row.sellerName, row.sellerCode, row.managerName].some((value) => value.toLowerCase().includes(query));
  });
}

export function sellerRelationStatusBadgeClass(status: SellerRelationStatus) {
  if (status === "정상") return "success";
  if (status === "승인대기") return "warn";
  if (status === "이용중지") return "danger";
  return "gray";
}

export function sellerRelationProductModeLabel(mode: SellerRelationProductMode) {
  return mode === "commission" ? "수수료형" : "입금가형";
}

export function sellerRelationProductCondition(product: SellerRelationProduct) {
  if (product.mode === "commission") return `수수료 ${product.commissionRate ?? 0}%`;
  return `입금가 ${formatSellerRelationWon(product.depositPrice)}`;
}

/** 판매점 판매가: 수수료형은 공급 판매가와 동일, 입금가형은 판매점이 설정한 값(미설정 가능) */
export function sellerRelationProductSellerPrice(product: SellerRelationProduct): number | null {
  return product.mode === "commission" ? product.listPrice : product.sellerPrice;
}

export function formatSellerRelationWon(value: number | null) {
  return value === null ? "-" : `${value.toLocaleString("ko-KR")}원`;
}

export function formatSellerRelationDate(value: string | null) {
  return value ? value.replaceAll("-", ".") : "-";
}

export function sellerRelationLogoText(name: string) {
  return name.trim().charAt(0) || "?";
}
