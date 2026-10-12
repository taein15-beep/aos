/**
 * 판매점 관리자 로그인 화면 Preview용 Mock (SAMPLE)
 * - AOS 판매점 계정 상태(로그인 가능 여부)와 공급여행사별 거래상태(상품 판매 가능 여부)를 분리해서 표현합니다.
 * - 실제 인증·세션·저장(DB/API/Storage) 없음.
 */

/** AOS 판매점 계정 자체의 상태 — 판매점 관리자 로그인 가능 여부 */
export type SellerAccountStatus = "정상" | "이용제한";

/** 공급여행사 ↔ 판매점 거래상태 — 해당 공급여행사 상품 판매 가능 여부 */
export type SupplierTradeStatus = "정상" | "승인대기" | "이용중지";

export type SellerSupplierTrade = {
  supplierName: string;
  status: SupplierTradeStatus;
};

export type SellerLoginScenarioKey = "normal" | "supplierSuspended" | "restricted";

export type SellerLoginScenario = {
  key: SellerLoginScenarioKey;
  label: string;
  accountStatus: SellerAccountStatus;
  suppliers: SellerSupplierTrade[];
};

export const SELLER_LOGIN_SCENARIOS: SellerLoginScenario[] = [
  {
    key: "normal",
    label: "계정 정상",
    accountStatus: "정상",
    suppliers: [
      { supplierName: "행복투어", status: "정상" },
      { supplierName: "현담여행사", status: "정상" },
      { supplierName: "A투어", status: "승인대기" },
    ],
  },
  {
    key: "supplierSuspended",
    label: "계정 정상 · 공급여행사 일부 이용중지",
    accountStatus: "정상",
    suppliers: [
      { supplierName: "행복투어", status: "이용중지" },
      { supplierName: "현담여행사", status: "정상" },
      { supplierName: "A투어", status: "승인대기" },
    ],
  },
  {
    key: "restricted",
    label: "판매점 계정 이용제한",
    accountStatus: "이용제한",
    suppliers: [],
  },
];

export function getSellerLoginScenario(key: SellerLoginScenarioKey) {
  return SELLER_LOGIN_SCENARIOS.find((scenario) => scenario.key === key) ?? SELLER_LOGIN_SCENARIOS[0];
}

export function summarizeSupplierTrades(suppliers: SellerSupplierTrade[]) {
  return {
    total: suppliers.length,
    normal: suppliers.filter((item) => item.status === "정상").length,
    pending: suppliers.filter((item) => item.status === "승인대기").length,
    suspended: suppliers.filter((item) => item.status === "이용중지").length,
  };
}
