/**
 * 판매점 상세 · 판매상품/수수료 Mock (SAMPLE)
 * - 판매점별 판매 허용 상품·수수료만 관리 (원본 상품 상태/삭제와 무관)
 * - API·DB 없음 · sessionStorage 프로토타입
 */

import {
  getPrototypeSellerApplication,
  savePrototypeSellerApplication,
  type SellerApplication,
} from "@/lib/admin/members-seller-data";

export type SellerProductSalesStatus = "판매가능" | "판매중지";
export type SellerCommissionMode = "기본" | "개별";
export type CatalogProductStatus = "판매중" | "비노출" | "품절";

export type SellerCatalogProduct = {
  code: string;
  name: string;
  category: string;
  /** 판매가(원) */
  price: number;
  catalogStatus: CatalogProductStatus;
  registeredAt: string;
};

export type SellerAssignedProduct = {
  productCode: string;
  salesStatus: SellerProductSalesStatus;
  commissionMode: SellerCommissionMode;
  /** 개별 수수료 % (개별 모드일 때만) */
  customRate: number | null;
  assignedAt: string;
};

export type SellerProductBundle = {
  sellerId: string;
  /** 기본 판매수수료 % · null=미설정 */
  defaultCommissionRate: number | null;
  products: SellerAssignedProduct[];
};

export type SellerProductListFilters = {
  keyword: string;
  category: string | "전체";
  salesStatus: SellerProductSalesStatus | "전체";
  commissionFilter: "전체" | "기본수수료" | "개별수수료";
};

export type SellerProductAddFilters = {
  keyword: string;
  category: string | "전체";
  catalogStatus: CatalogProductStatus | "전체";
};

export const EMPTY_SELLER_PRODUCT_FILTERS: SellerProductListFilters = {
  keyword: "",
  category: "전체",
  salesStatus: "전체",
  commissionFilter: "전체",
};

export const EMPTY_SELLER_PRODUCT_ADD_FILTERS: SellerProductAddFilters = {
  keyword: "",
  category: "전체",
  catalogStatus: "전체",
};

export const SELLER_PRODUCT_COMMISSION_FILTER_OPTIONS = ["전체", "기본수수료", "개별수수료"] as const;
export const SELLER_PRODUCT_SALES_STATUS_OPTIONS = ["전체", "판매가능", "판매중지"] as const;
export const SELLER_CATALOG_STATUS_OPTIONS = ["전체", "판매중", "비노출", "품절"] as const;

const STORAGE_KEY = "aos.admin.members.sellers.products.prototype.v1";
const STORAGE_VERSION = 1 as const;

const CATEGORIES = [
  "해외여행 > 중국여행",
  "해외여행 > 일본여행",
  "국내여행 > 제주도",
  "기차여행 > 특별열차",
  "버스여행 > 당일여행",
  "테마여행 > 온천/휴양",
] as const;

function pad(n: number, width = 3) {
  return String(n).padStart(width, "0");
}

function buildCatalog(): SellerCatalogProduct[] {
  const rows: SellerCatalogProduct[] = [];
  for (let i = 1; i <= 45; i += 1) {
    const category = CATEGORIES[(i - 1) % CATEGORIES.length];
    const priceBase = [89000, 120000, 150000, 198000, 250000, 320000, 450000][(i - 1) % 7];
    const statusCycle: CatalogProductStatus[] = ["판매중", "판매중", "판매중", "비노출", "품절"];
    rows.push({
      code: `AOS-P-${pad(i)}`,
      name: `${category.split(" > ").pop()} 샘플상품 ${pad(i)}`,
      category,
      price: priceBase + i * 1000,
      catalogStatus: statusCycle[(i - 1) % statusCycle.length],
      registeredAt: `2026-0${(i % 8) + 1}-${pad((i % 27) + 1, 2)}T03:00:00.000Z`,
    });
  }
  return rows;
}

export const SELLER_PRODUCT_CATALOG: SellerCatalogProduct[] = buildCatalog();

export function getSellerProductCategories() {
  return ["전체", ...Array.from(new Set(SELLER_PRODUCT_CATALOG.map((row) => row.category)))];
}

function seedAssignments(sellerId: string): SellerProductBundle {
  if (sellerId === "SELLER-001") {
    const picks: Array<Omit<SellerAssignedProduct, "assignedAt"> & { assignedAt?: string }> = [
      { productCode: "AOS-P-001", salesStatus: "판매가능", commissionMode: "기본", customRate: null },
      { productCode: "AOS-P-002", salesStatus: "판매가능", commissionMode: "개별", customRate: 7 },
      { productCode: "AOS-P-003", salesStatus: "판매중지", commissionMode: "기본", customRate: null },
      { productCode: "AOS-P-004", salesStatus: "판매가능", commissionMode: "개별", customRate: 7.5 },
      { productCode: "AOS-P-005", salesStatus: "판매가능", commissionMode: "기본", customRate: null },
      { productCode: "AOS-P-006", salesStatus: "판매중지", commissionMode: "개별", customRate: 8 },
      { productCode: "AOS-P-007", salesStatus: "판매가능", commissionMode: "기본", customRate: null },
      { productCode: "AOS-P-008", salesStatus: "판매가능", commissionMode: "기본", customRate: null },
      { productCode: "AOS-P-009", salesStatus: "판매가능", commissionMode: "기본", customRate: null },
      { productCode: "AOS-P-010", salesStatus: "판매중지", commissionMode: "기본", customRate: null },
      { productCode: "AOS-P-011", salesStatus: "판매가능", commissionMode: "기본", customRate: null },
      { productCode: "AOS-P-012", salesStatus: "판매가능", commissionMode: "기본", customRate: null },
    ];
    return {
      sellerId,
      defaultCommissionRate: 5,
      products: picks.map((row, index) => ({
        ...row,
        assignedAt: `2026-09-${pad(index + 1, 2)}T05:00:00.000Z`,
      })),
    };
  }
  if (sellerId === "SELLER-003") {
    return {
      sellerId,
      defaultCommissionRate: 8,
      products: [
        {
          productCode: "AOS-P-013",
          salesStatus: "판매가능",
          commissionMode: "개별",
          customRate: 6,
          assignedAt: "2026-08-20T03:00:00.000Z",
        },
        {
          productCode: "AOS-P-014",
          salesStatus: "판매중지",
          commissionMode: "기본",
          customRate: null,
          assignedAt: "2026-08-21T03:00:00.000Z",
        },
      ],
    };
  }
  return { sellerId, defaultCommissionRate: null, products: [] };
}

type StoragePayload = {
  version: typeof STORAGE_VERSION;
  bundles: Record<string, SellerProductBundle>;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isValidAssigned(value: unknown): value is SellerAssignedProduct {
  if (!value || typeof value !== "object") return false;
  const row = value as SellerAssignedProduct;
  if (typeof row.productCode !== "string") return false;
  if (row.salesStatus !== "판매가능" && row.salesStatus !== "판매중지") return false;
  if (row.commissionMode !== "기본" && row.commissionMode !== "개별") return false;
  if (!(row.customRate === null || isValidRate(row.customRate))) return false;
  if (typeof row.assignedAt !== "string") return false;
  return true;
}

function isValidBundle(value: unknown): value is SellerProductBundle {
  if (!value || typeof value !== "object") return false;
  const row = value as SellerProductBundle;
  if (typeof row.sellerId !== "string") return false;
  if (!(row.defaultCommissionRate === null || isValidRate(row.defaultCommissionRate))) return false;
  if (!Array.isArray(row.products) || !row.products.every(isValidAssigned)) return false;
  return true;
}

function cloneBundle(bundle: SellerProductBundle): SellerProductBundle {
  return {
    sellerId: bundle.sellerId,
    defaultCommissionRate: bundle.defaultCommissionRate,
    products: bundle.products.map((row) => ({ ...row })),
  };
}

function readPayload(): StoragePayload {
  if (!isBrowser()) return { version: STORAGE_VERSION, bundles: {} };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: STORAGE_VERSION, bundles: {} };
    const parsed = JSON.parse(raw) as Partial<StoragePayload>;
    if (parsed.version !== STORAGE_VERSION || !parsed.bundles || typeof parsed.bundles !== "object") {
      return { version: STORAGE_VERSION, bundles: {} };
    }
    const bundles: Record<string, SellerProductBundle> = {};
    for (const [key, value] of Object.entries(parsed.bundles)) {
      if (!isValidBundle(value) || value.sellerId !== key) continue;
      bundles[key] = cloneBundle(value);
    }
    return { version: STORAGE_VERSION, bundles };
  } catch {
    return { version: STORAGE_VERSION, bundles: {} };
  }
}

function writePayload(payload: StoragePayload) {
  if (!isBrowser()) return false;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function getCatalogProduct(code: string) {
  return SELLER_PRODUCT_CATALOG.find((row) => row.code === code) ?? null;
}

export function getSellerProductBundle(sellerId: string): SellerProductBundle {
  const id = sellerId.trim();
  if (!id) return { sellerId: "", defaultCommissionRate: null, products: [] };
  const stored = readPayload().bundles[id];
  if (stored) return cloneBundle(stored);
  return cloneBundle(seedAssignments(id));
}

function syncSellerApplicationSummary(sellerId: string, bundle: SellerProductBundle) {
  const current = getPrototypeSellerApplication(sellerId);
  if (!current) return;
  const individualCount = bundle.products.filter((row) => row.commissionMode === "개별").length;
  let commissionText: string | null = null;
  if (bundle.defaultCommissionRate == null && individualCount === 0) {
    commissionText = "미설정";
  } else if (individualCount > 0 && individualCount === bundle.products.length) {
    commissionText = "개별설정";
  } else if (individualCount > 0) {
    commissionText = "개별설정";
  } else if (bundle.defaultCommissionRate != null) {
    commissionText = formatCommissionPercent(bundle.defaultCommissionRate);
  }
  const next: SellerApplication = {
    ...current,
    productCount: bundle.products.length,
    commissionText,
    updatedAt: new Date().toISOString(),
  };
  savePrototypeSellerApplication(next);
}

function saveBundle(bundle: SellerProductBundle) {
  const payload = readPayload();
  payload.bundles[bundle.sellerId] = cloneBundle(bundle);
  const ok = writePayload(payload);
  if (ok) syncSellerApplicationSummary(bundle.sellerId, bundle);
  return ok;
}

export function formatCommissionPercent(rate: number) {
  const rounded = Math.round(rate * 100) / 100;
  return `${Number.isInteger(rounded) ? String(rounded) : String(rounded)}%`;
}

export function formatSellerProductPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

export function formatSellerProductDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

export function resolveSellerProductRate(bundle: SellerProductBundle, row: SellerAssignedProduct) {
  if (row.commissionMode === "개별" && row.customRate != null) return row.customRate;
  return bundle.defaultCommissionRate;
}

export function formatSellerProductCommissionLabel(bundle: SellerProductBundle, row: SellerAssignedProduct) {
  if (row.commissionMode === "개별" && row.customRate != null) {
    return { primary: formatCommissionPercent(row.customRate), secondary: "개별설정" as const };
  }
  if (bundle.defaultCommissionRate == null) {
    return { primary: "미설정", secondary: null };
  }
  return { primary: `기본 ${formatCommissionPercent(bundle.defaultCommissionRate)}`, secondary: null };
}

export function calcExpectedCommission(price: number, rate: number | null) {
  if (rate == null) return null;
  return Math.round((price * rate) / 100);
}

export function sellerProductSalesBadgeClass(status: SellerProductSalesStatus) {
  return status === "판매가능" ? "success" : "warn";
}

export function parseCommissionInput(raw: string): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = raw.trim().replace(/%/g, "");
  if (!trimmed) return { ok: false, message: "수수료를 입력해 주세요." };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false, message: "숫자로 입력해 주세요." };
  if (value < 0 || value > 100) return { ok: false, message: "수수료는 0~100% 범위로 입력해 주세요." };
  return { ok: true, value: Math.round(value * 100) / 100 };
}

export type SellerProductRow = SellerAssignedProduct & {
  catalog: SellerCatalogProduct;
  effectiveRate: number | null;
  commissionLabel: ReturnType<typeof formatSellerProductCommissionLabel>;
  expectedCommission: number | null;
};

export function listSellerProductRows(
  sellerId: string,
  filters: SellerProductListFilters = EMPTY_SELLER_PRODUCT_FILTERS,
): { bundle: SellerProductBundle; rows: SellerProductRow[] } {
  const bundle = getSellerProductBundle(sellerId);
  const keyword = filters.keyword.trim().toLowerCase();
  const rows: SellerProductRow[] = [];
  for (const assigned of bundle.products) {
    const catalog = getCatalogProduct(assigned.productCode);
    if (!catalog) continue;
    if (keyword) {
      const hit =
        catalog.name.toLowerCase().includes(keyword) || catalog.code.toLowerCase().includes(keyword);
      if (!hit) continue;
    }
    if (filters.category !== "전체" && catalog.category !== filters.category) continue;
    if (filters.salesStatus !== "전체" && assigned.salesStatus !== filters.salesStatus) continue;
    if (filters.commissionFilter === "기본수수료" && assigned.commissionMode !== "기본") continue;
    if (filters.commissionFilter === "개별수수료" && assigned.commissionMode !== "개별") continue;
    const effectiveRate = resolveSellerProductRate(bundle, assigned);
    rows.push({
      ...assigned,
      catalog,
      effectiveRate,
      commissionLabel: formatSellerProductCommissionLabel(bundle, assigned),
      expectedCommission: calcExpectedCommission(catalog.price, effectiveRate),
    });
  }
  rows.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  return { bundle, rows };
}

export function getSellerProductSummary(sellerId: string) {
  const bundle = getSellerProductBundle(sellerId);
  const sellableCount = bundle.products.filter((row) => row.salesStatus === "판매가능").length;
  const individualCount = bundle.products.filter((row) => row.commissionMode === "개별").length;
  return {
    sellableCount,
    assignedCount: bundle.products.length,
    catalogTotal: SELLER_PRODUCT_CATALOG.length,
    defaultCommissionRate: bundle.defaultCommissionRate,
    individualCommissionCount: individualCount,
  };
}

export function listCatalogForAdd(
  sellerId: string,
  filters: SellerProductAddFilters = EMPTY_SELLER_PRODUCT_ADD_FILTERS,
) {
  const assigned = new Set(getSellerProductBundle(sellerId).products.map((row) => row.productCode));
  const keyword = filters.keyword.trim().toLowerCase();
  return SELLER_PRODUCT_CATALOG.filter((row) => {
    if (keyword) {
      const hit = row.name.toLowerCase().includes(keyword) || row.code.toLowerCase().includes(keyword);
      if (!hit) return false;
    }
    if (filters.category !== "전체" && row.category !== filters.category) return false;
    if (filters.catalogStatus !== "전체" && row.catalogStatus !== filters.catalogStatus) return false;
    return true;
  }).map((row) => ({
    ...row,
    alreadyAssigned: assigned.has(row.code),
  }));
}

export function updateSellerDefaultCommission(sellerId: string, rate: number) {
  if (!isValidRate(rate)) return { ok: false as const, message: "수수료는 0~100% 범위로 입력해 주세요." };
  const bundle = getSellerProductBundle(sellerId);
  bundle.defaultCommissionRate = rate;
  if (!saveBundle(bundle)) return { ok: false as const, message: "기본 수수료 저장에 실패했습니다." };
  return { ok: true as const, bundle: cloneBundle(bundle) };
}

export function addSellerProducts(sellerId: string, productCodes: string[]) {
  const unique = Array.from(new Set(productCodes.map((code) => code.trim()).filter(Boolean)));
  if (unique.length === 0) return { ok: false as const, message: "추가할 상품을 선택해 주세요." };
  const bundle = getSellerProductBundle(sellerId);
  const existing = new Set(bundle.products.map((row) => row.productCode));
  const now = new Date().toISOString();
  let added = 0;
  for (const code of unique) {
    if (existing.has(code)) continue;
    if (!getCatalogProduct(code)) continue;
    bundle.products.push({
      productCode: code,
      salesStatus: "판매가능",
      commissionMode: "기본",
      customRate: null,
      assignedAt: now,
    });
    added += 1;
  }
  if (added === 0) return { ok: false as const, message: "추가할 수 있는 신규 상품이 없습니다." };
  if (!saveBundle(bundle)) return { ok: false as const, message: "판매상품 추가에 실패했습니다." };
  return { ok: true as const, added, bundle: cloneBundle(bundle) };
}

export function removeSellerProducts(sellerId: string, productCodes: string[]) {
  const removeSet = new Set(productCodes);
  const bundle = getSellerProductBundle(sellerId);
  const before = bundle.products.length;
  bundle.products = bundle.products.filter((row) => !removeSet.has(row.productCode));
  if (bundle.products.length === before) {
    return { ok: false as const, message: "제거할 상품을 찾을 수 없습니다." };
  }
  if (!saveBundle(bundle)) return { ok: false as const, message: "판매상품 제거에 실패했습니다." };
  return { ok: true as const, bundle: cloneBundle(bundle) };
}

export function setSellerProductSalesStatus(
  sellerId: string,
  productCodes: string[],
  salesStatus: SellerProductSalesStatus,
) {
  const targets = new Set(productCodes);
  const bundle = getSellerProductBundle(sellerId);
  let changed = 0;
  bundle.products = bundle.products.map((row) => {
    if (!targets.has(row.productCode)) return row;
    if (row.salesStatus === salesStatus) return row;
    changed += 1;
    return { ...row, salesStatus };
  });
  if (changed === 0) return { ok: true as const, bundle: cloneBundle(bundle) };
  if (!saveBundle(bundle)) return { ok: false as const, message: "판매상태 변경에 실패했습니다." };
  return { ok: true as const, bundle: cloneBundle(bundle) };
}

export function setSellerProductCommission(
  sellerId: string,
  productCodes: string[],
  mode: SellerCommissionMode,
  customRate: number | null,
) {
  if (mode === "개별") {
    if (customRate == null || !isValidRate(customRate)) {
      return { ok: false as const, message: "개별 수수료는 0~100% 범위로 입력해 주세요." };
    }
  }
  const targets = new Set(productCodes);
  const bundle = getSellerProductBundle(sellerId);
  let changed = 0;
  bundle.products = bundle.products.map((row) => {
    if (!targets.has(row.productCode)) return row;
    changed += 1;
    return {
      ...row,
      commissionMode: mode,
      customRate: mode === "개별" ? customRate : null,
    };
  });
  if (changed === 0) return { ok: false as const, message: "대상 상품을 찾을 수 없습니다." };
  if (!saveBundle(bundle)) return { ok: false as const, message: "수수료 저장에 실패했습니다." };
  return { ok: true as const, bundle: cloneBundle(bundle) };
}
