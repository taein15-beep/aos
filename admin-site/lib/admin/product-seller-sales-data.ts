/**
 * 상품공유 > 판매점 판매 설정 샘플 데이터 (SAMPLE)
 * - 가입 판매점: 현재 공급여행사에 가입된 전체 판매점 (한 판매점은 여러 공급여행사에 가입할 수 있음)
 * - 상품 판매점: 가입 판매점 중 현재 상품에 판매 허용된 판매점과 판매조건
 * DB/API 연동 전까지 화면 메모리에만 반영되며 저장되지 않습니다.
 */

export type SellerSalesMode = "commission" | "deposit";
/** 설정필요: 상품에 추가됐지만 판매조건 미설정 / 판매중: 조건 설정 완료 + 판매 허용 / 판매중지: 상품 판매 중단 */
export type SellerSalesStatus = "설정필요" | "판매중" | "판매중지";
/** 현재 공급여행사 ↔ 판매점 거래상태 (회원관리 > 판매점관리와 동일한 정책) */
export type SellerJoinStatus = "승인대기" | "정상" | "이용중지" | "승인거절";

export type JoinedSeller = {
  id: string;
  sellerCode: string;
  sellerName: string;
  joinStatus: SellerJoinStatus;
};

export type SellerSalesRow = {
  /** 가입 판매점 id */
  id: string;
  sellerCode: string;
  sellerName: string;
  status: SellerSalesStatus;
  /** 판매조건 미설정 시 null */
  mode: SellerSalesMode | null;
  /** 수수료형: 공급 판매가 기준 판매수수료율(%) */
  commissionRate: number;
  /** 입금가형: 판매점이 공급여행사에 정산할 기준 금액 */
  depositPrice: number | null;
  /** 입금가형: 판매점이 직접 설정한 판매가 (공급여행사는 조회만 가능, null이면 미설정) */
  sellerPrice: number | null;
  sellerPriceUpdatedAt: string | null;
};

export type SellerSalesFilter = "전체" | "설정필요" | "판매중" | "판매중지" | "수수료형" | "입금가형";

export const SELLER_SALES_FILTERS: SellerSalesFilter[] = ["전체", "설정필요", "판매중", "판매중지", "수수료형", "입금가형"];

export const SELLER_SALES_MODE_LABELS: Record<SellerSalesMode, string> = {
  commission: "수수료형",
  deposit: "입금가형",
};

export const SELLER_SALES_MODE_FLOW: Record<SellerSalesMode, string> = {
  commission: "공급 판매가 → 판매점 동일 판매가 → 수수료 수익",
  deposit: "공급 입금가 → 판매점 판매가 설정 → 차액 수익",
};

export const SELLER_SALES_MODE_DESCRIPTIONS: Record<SellerSalesMode, string> = {
  commission: "공급여행사 판매가를 그대로 사용하고, 판매점에 수수료를 지급합니다.",
  deposit: "판매점에 입금가를 지정하고, 판매점이 판매금액을 직접 설정합니다.",
};

export const SELLER_COMMISSION_NOTICE =
  "판매점은 공급여행사가 설정한 판매금액으로 판매하며 판매금액을 변경할 수 없습니다.";
export const SELLER_DEPOSIT_PRICE_HELP = "판매점이 예약을 판매한 후 공급여행사에 정산해야 하는 기준 금액입니다.";
export const SELLER_DEPOSIT_NOTICE =
  "입금가형 상품은 판매점이 판매금액을 직접 설정할 수 있습니다. 상품의 기타 원본정보는 수정할 수 없습니다.";

/** 공급여행사별 가입 판매점 (현재 공급여행사 기준으로만 조회) */
const JOINED_SELLERS_BY_SUPPLIER: Record<string, JoinedSeller[]> = {
  행복투어: [
    { id: "sel-032", sellerCode: "SEL00032", sellerName: "그래가자", joinStatus: "정상" },
    { id: "sel-041", sellerCode: "SEL00041", sellerName: "나드리투어", joinStatus: "정상" },
    { id: "sel-055", sellerCode: "SEL00055", sellerName: "한길여행", joinStatus: "이용중지" },
    { id: "sel-067", sellerCode: "SEL00067", sellerName: "바른길투어", joinStatus: "정상" },
    { id: "sel-073", sellerCode: "SEL00073", sellerName: "우리동네여행", joinStatus: "정상" },
    { id: "sel-081", sellerCode: "SEL00081", sellerName: "여행가자", joinStatus: "승인대기" },
    { id: "sel-092", sellerCode: "SEL00092", sellerName: "좋은여행", joinStatus: "승인거절" },
    { id: "sel-105", sellerCode: "SEL00105", sellerName: "서울투어", joinStatus: "정상" },
  ],
};

type ProductSellerSeed = Omit<SellerSalesRow, "sellerCode" | "sellerName">;

/** 상품별 판매 허용 판매점. 입금가·판매점 판매가는 상품 판매가와 무관하게 판매점별로 지정된 독립 금액입니다. */
const PRODUCT_SELLERS_BY_PRODUCT: Record<string, ProductSellerSeed[]> = {
  "HT-DMZ01": [
    {
      id: "sel-032",
      status: "판매중",
      mode: "commission",
      commissionRate: 10,
      depositPrice: null,
      sellerPrice: null,
      sellerPriceUpdatedAt: null,
    },
    {
      id: "sel-041",
      status: "판매중",
      mode: "deposit",
      commissionRate: 0,
      depositPrice: 55000,
      sellerPrice: 65000,
      sellerPriceUpdatedAt: "2026-10-02 14:10",
    },
    {
      id: "sel-055",
      status: "판매중지",
      mode: "deposit",
      commissionRate: 0,
      depositPrice: 52000,
      sellerPrice: 69000,
      sellerPriceUpdatedAt: "2026-09-21 09:40",
    },
  ],
};

export function getJoinedSellers(supplierName: string): JoinedSeller[] {
  return (JOINED_SELLERS_BY_SUPPLIER[supplierName] ?? []).map((seller) => ({ ...seller }));
}

/** 상품에 신규로 열어줄 수 있는 판매점은 거래상태 정상만 허용 */
export function isSellerSelectable(seller: Pick<JoinedSeller, "joinStatus">) {
  return seller.joinStatus === "정상";
}

export const SELLER_JOIN_BLOCK_REASONS: Record<Exclude<SellerJoinStatus, "정상">, string> = {
  승인대기: "가입 승인 후 상품을 설정할 수 있습니다.",
  이용중지: "이용중지된 판매점입니다.",
  승인거절: "가입 승인되지 않은 판매점입니다.",
};

export function sellerJoinStatusBadgeClass(status: SellerJoinStatus) {
  if (status === "정상") return "success";
  if (status === "승인대기") return "warn";
  if (status === "이용중지") return "danger";
  return "gray";
}

export function getSampleProductSellers(productCode: string, joinedSellers: JoinedSeller[]): SellerSalesRow[] {
  const seeds = PRODUCT_SELLERS_BY_PRODUCT[productCode] ?? [];
  return seeds.flatMap((seed) => {
    const seller = joinedSellers.find((item) => item.id === seed.id);
    if (!seller) return [];
    const status = seller.joinStatus === "이용중지" && seed.status === "판매중" ? "판매중지" : seed.status;
    return [{ ...seed, status, sellerCode: seller.sellerCode, sellerName: seller.sellerName }];
  });
}

/** 판매점 추가 직후 상태. 판매조건이 없으므로 판매중으로 만들지 않습니다. */
export function createPendingSellerRow(seller: JoinedSeller): SellerSalesRow {
  return {
    id: seller.id,
    sellerCode: seller.sellerCode,
    sellerName: seller.sellerName,
    status: "설정필요",
    mode: null,
    commissionRate: 0,
    depositPrice: null,
    sellerPrice: null,
    sellerPriceUpdatedAt: null,
  };
}

export type SellerSalesFigures = {
  /** 고객에게 실제 판매되는 판매점 판매가 (입금가형 미설정 시 null) */
  sellerPrice: number | null;
  /** 판매점 예상수익: 수수료형은 수수료 금액, 입금가형은 판매가 - 입금가 */
  expectedProfit: number | null;
};

export function calcCommissionAmount(supplyPrice: number, commissionRate: number) {
  return Math.round((supplyPrice * commissionRate) / 100);
}

export function calcSellerSalesFigures(
  row: Pick<SellerSalesRow, "mode" | "commissionRate" | "depositPrice" | "sellerPrice">,
  supplyPrice: number,
): SellerSalesFigures {
  if (row.mode === "commission") {
    return { sellerPrice: supplyPrice, expectedProfit: calcCommissionAmount(supplyPrice, row.commissionRate) };
  }
  if (row.mode === "deposit") {
    const expectedProfit =
      row.sellerPrice != null && row.depositPrice != null ? row.sellerPrice - row.depositPrice : null;
    return { sellerPrice: row.sellerPrice, expectedProfit };
  }
  return { sellerPrice: null, expectedProfit: null };
}

export function matchesSellerSalesFilter(row: SellerSalesRow, filter: SellerSalesFilter) {
  if (filter === "설정필요" || filter === "판매중" || filter === "판매중지") return row.status === filter;
  if (filter === "수수료형") return row.mode === "commission";
  if (filter === "입금가형") return row.mode === "deposit";
  return true;
}

export function countSellerSalesFilters(rows: SellerSalesRow[]) {
  return SELLER_SALES_FILTERS.reduce(
    (counts, filter) => ({ ...counts, [filter]: rows.filter((row) => matchesSellerSalesFilter(row, filter)).length }),
    {} as Record<SellerSalesFilter, number>,
  );
}

export function formatWon(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value.toLocaleString("ko-KR")}원`;
}

export function sellerSalesStatusBadgeClass(status: SellerSalesStatus) {
  if (status === "판매중") return "success";
  if (status === "설정필요") return "danger";
  return "gray";
}

export function sellerSalesModeBadgeClass(mode: SellerSalesMode | null) {
  if (mode === "commission") return "info";
  if (mode === "deposit") return "warn";
  return "gray";
}

export function sellerSalesModeLabel(mode: SellerSalesMode | null) {
  return mode ? SELLER_SALES_MODE_LABELS[mode] : "미설정";
}
