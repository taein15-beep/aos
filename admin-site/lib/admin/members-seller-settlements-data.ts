/**
 * 판매점 상세 · 정산현황 Mock (SAMPLE)
 * - 조회 UI용 · 세금/원천징수/자동지급/API/DB 없음
 * - 사업자/개인 정산계좌 필드를 분리해 추후 정책 확장 가능
 */

import type { SellerType } from "@/lib/admin/members-seller-data";
import { formatSellerMoney } from "@/lib/admin/members-seller-reservations-data";

export type SellerSettlementStatus = "정산대기" | "정산예정" | "정산완료" | "보류";

export type SellerSettlementAccountBusiness = {
  sellerType: "business";
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  businessName: string;
};

export type SellerSettlementAccountIndividual = {
  sellerType: "individual";
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

export type SellerSettlementAccount = SellerSettlementAccountBusiness | SellerSettlementAccountIndividual;

export type SellerSettlementLineItem = {
  reservationCode: string;
  productName: string;
  salesAmount: number;
  cancelAmount: number;
  commissionRate: number;
  commissionAmount: number;
};

export type SellerSettlementRow = {
  settlementId: string;
  sellerId: string;
  periodFrom: string;
  periodTo: string;
  reservationCount: number;
  salesAmount: number;
  cancelAmount: number;
  settleTargetAmount: number;
  commissionAmount: number;
  adjustmentAmount: number;
  finalAmount: number;
  status: SellerSettlementStatus;
  paidAt: string | null;
  lineItems: SellerSettlementLineItem[];
  /** 추후 세금/원천징수 확장 슬롯 (이번 단계 미사용) */
  taxPolicyPlaceholder?: {
    withholdingApplicable: boolean;
    note: string;
  };
};

export type SellerSettlementFilters = {
  status: SellerSettlementStatus | "전체";
  keyword: string;
};

export const EMPTY_SELLER_SETTLEMENT_FILTERS: SellerSettlementFilters = {
  status: "전체",
  keyword: "",
};

export const SELLER_SETTLEMENT_STATUS_OPTIONS = ["전체", "정산대기", "정산예정", "정산완료", "보류"] as const;

const ACCOUNT_SEED: Record<string, SellerSettlementAccount> = {
  "SELLER-001": {
    sellerType: "business",
    bankName: "국민은행",
    accountNumber: "123-45-6789012",
    accountHolder: "김민수",
    businessName: "우리여행",
  },
  "SELLER-002": {
    sellerType: "individual",
    bankName: "카카오뱅크",
    accountNumber: "3333-01-1234567",
    accountHolder: "이수진",
  },
};

const SETTLEMENT_SEED: SellerSettlementRow[] = [
  {
    settlementId: "STL-202609-001",
    sellerId: "SELLER-001",
    periodFrom: "2026-08-01",
    periodTo: "2026-08-31",
    reservationCount: 6,
    salesAmount: 1850000,
    cancelAmount: 120000,
    settleTargetAmount: 1730000,
    commissionAmount: 86500,
    adjustmentAmount: 0,
    finalAmount: 86500,
    status: "정산완료",
    paidAt: "2026-09-05T02:00:00.000Z",
    lineItems: [
      {
        reservationCode: "R20260830016",
        productName: "제주도 샘플상품 009",
        salesAmount: 477000,
        cancelAmount: 0,
        commissionRate: 5,
        commissionAmount: 23850,
      },
      {
        reservationCode: "R20260828007",
        productName: "일본여행 샘플상품 008",
        salesAmount: 328000,
        cancelAmount: 328000,
        commissionRate: 5,
        commissionAmount: 0,
      },
    ],
    taxPolicyPlaceholder: { withholdingApplicable: false, note: "사업자 정산 — 세금계산서 정책 추후 반영" },
  },
  {
    settlementId: "STL-202609-014",
    sellerId: "SELLER-001",
    periodFrom: "2026-09-01",
    periodTo: "2026-09-15",
    reservationCount: 5,
    salesAmount: 2120000,
    cancelAmount: 153000,
    settleTargetAmount: 1967000,
    commissionAmount: 118020,
    adjustmentAmount: -5000,
    finalAmount: 113020,
    status: "정산예정",
    paidAt: null,
    lineItems: [
      {
        reservationCode: "R20260901001",
        productName: "중국여행 샘플상품 001",
        salesAmount: 302000,
        cancelAmount: 0,
        commissionRate: 5,
        commissionAmount: 15100,
      },
      {
        reservationCode: "R20260902014",
        productName: "일본여행 샘플상품 002",
        salesAmount: 363000,
        cancelAmount: 0,
        commissionRate: 7,
        commissionAmount: 25410,
      },
    ],
    taxPolicyPlaceholder: { withholdingApplicable: false, note: "사업자 정산 — 세금계산서 정책 추후 반영" },
  },
  {
    settlementId: "STL-202609-022",
    sellerId: "SELLER-001",
    periodFrom: "2026-09-16",
    periodTo: "2026-09-30",
    reservationCount: 4,
    salesAmount: 1549000,
    cancelAmount: 0,
    settleTargetAmount: 1549000,
    commissionAmount: 77450,
    adjustmentAmount: 0,
    finalAmount: 77450,
    status: "정산대기",
    paidAt: null,
    lineItems: [
      {
        reservationCode: "R20260909011",
        productName: "중국여행 샘플상품 007",
        salesAmount: 955000,
        cancelAmount: 0,
        commissionRate: 5,
        commissionAmount: 47750,
      },
    ],
    taxPolicyPlaceholder: { withholdingApplicable: false, note: "사업자 정산 — 세금계산서 정책 추후 반영" },
  },
  {
    settlementId: "STL-202608-008",
    sellerId: "SELLER-001",
    periodFrom: "2026-07-01",
    periodTo: "2026-07-31",
    reservationCount: 3,
    salesAmount: 980000,
    cancelAmount: 0,
    settleTargetAmount: 980000,
    commissionAmount: 49000,
    adjustmentAmount: 10000,
    finalAmount: 59000,
    status: "보류",
    paidAt: null,
    lineItems: [
      {
        reservationCode: "R20260715001",
        productName: "당일여행 샘플상품 015",
        salesAmount: 420000,
        cancelAmount: 0,
        commissionRate: 5,
        commissionAmount: 21000,
      },
    ],
    taxPolicyPlaceholder: { withholdingApplicable: false, note: "증빙 확인 대기" },
  },
  {
    settlementId: "STL-202607-003",
    sellerId: "SELLER-001",
    periodFrom: "2026-06-01",
    periodTo: "2026-06-30",
    reservationCount: 7,
    salesAmount: 2450000,
    cancelAmount: 200000,
    settleTargetAmount: 2250000,
    commissionAmount: 112500,
    adjustmentAmount: 0,
    finalAmount: 112500,
    status: "정산완료",
    paidAt: "2026-07-08T01:30:00.000Z",
    lineItems: [
      {
        reservationCode: "R20260620009",
        productName: "온천/휴양 샘플상품 018",
        salesAmount: 560000,
        cancelAmount: 0,
        commissionRate: 5,
        commissionAmount: 28000,
      },
    ],
    taxPolicyPlaceholder: { withholdingApplicable: false, note: "사업자 정산 — 세금계산서 정책 추후 반영" },
  },
  {
    settlementId: "STL-202609-IND-01",
    sellerId: "SELLER-002",
    periodFrom: "2026-09-01",
    periodTo: "2026-09-30",
    reservationCount: 1,
    salesAmount: 100000,
    cancelAmount: 0,
    settleTargetAmount: 100000,
    commissionAmount: 5000,
    adjustmentAmount: 0,
    finalAmount: 5000,
    status: "정산대기",
    paidAt: null,
    lineItems: [
      {
        reservationCode: "R20260901055",
        productName: "샘플 개인판매 예약",
        salesAmount: 100000,
        cancelAmount: 0,
        commissionRate: 5,
        commissionAmount: 5000,
      },
    ],
    taxPolicyPlaceholder: { withholdingApplicable: true, note: "개인 정산 — 원천징수 정책 추후 반영" },
  },
];

export { formatSellerMoney };

export function formatSellerSettlementPeriod(from: string, to: string) {
  return `${from.replace(/-/g, ".")} ~ ${to.replace(/-/g, ".")}`;
}

export function formatSellerPaidDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

export function sellerSettlementStatusBadgeClass(status: SellerSettlementStatus) {
  if (status === "정산완료") return "success";
  if (status === "정산예정") return "info";
  if (status === "정산대기") return "warn";
  return "danger";
}

export function getSellerSettlementAccount(
  sellerId: string,
  sellerType: SellerType,
): SellerSettlementAccount {
  const seeded = ACCOUNT_SEED[sellerId];
  if (seeded) return seeded;
  if (sellerType === "business") {
    return {
      sellerType: "business",
      bankName: "-",
      accountNumber: "-",
      accountHolder: "-",
      businessName: "-",
    };
  }
  return {
    sellerType: "individual",
    bankName: "-",
    accountNumber: "-",
    accountHolder: "-",
  };
}

export function listSellerSettlements(sellerId: string, filters: SellerSettlementFilters = EMPTY_SELLER_SETTLEMENT_FILTERS) {
  const keyword = filters.keyword.trim().toLowerCase();
  return SETTLEMENT_SEED.filter((row) => row.sellerId === sellerId)
    .filter((row) => {
      if (filters.status !== "전체" && row.status !== filters.status) return false;
      if (keyword && !row.settlementId.toLowerCase().includes(keyword)) return false;
      return true;
    })
    .sort((a, b) => b.periodTo.localeCompare(a.periodTo));
}

export function getSellerSettlementById(sellerId: string, settlementId: string) {
  return SETTLEMENT_SEED.find((row) => row.sellerId === sellerId && row.settlementId === settlementId) ?? null;
}

export function getSellerSettlementSummary(sellerId: string) {
  const list = SETTLEMENT_SEED.filter((row) => row.sellerId === sellerId);
  const scheduled = list.filter((row) => row.status === "정산예정");
  const completed = list.filter((row) => row.status === "정산완료");
  const unpaid = list.filter((row) => row.status === "정산대기" || row.status === "보류");
  const thisMonthKey = "2026-09";
  const thisMonth = list.filter((row) => row.periodFrom.startsWith(thisMonthKey) || row.periodTo.startsWith(thisMonthKey));
  return {
    scheduledAmount: scheduled.reduce((sum, row) => sum + row.finalAmount, 0),
    completedAmount: completed.reduce((sum, row) => sum + row.finalAmount, 0),
    unpaidAmount: unpaid.reduce((sum, row) => sum + row.finalAmount, 0),
    monthSalesAmount: thisMonth.reduce((sum, row) => sum + row.salesAmount, 0),
    monthCommissionAmount: thisMonth.reduce((sum, row) => sum + row.commissionAmount, 0),
  };
}
