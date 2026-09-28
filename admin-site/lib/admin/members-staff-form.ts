/**
 * 관리자/직원 등록·상세 Form Mock 헬퍼
 * - DB/API 없음
 */

import { getStaffMemberByAdminCode, type StaffMemberRow } from "@/lib/admin/members-staff-data";
import type { ProductSearchField } from "@/lib/admin/products-data";
import { SAMPLE_PRODUCTS } from "@/lib/admin/products-data";

export const STAFF_POSITION_OPTIONS = [
  "대표",
  "임원",
  "부장",
  "차장",
  "과장",
  "대리",
  "주임",
  "사원",
  "기타",
] as const;

export const STAFF_BANK_OPTIONS = [
  "국민은행",
  "신한은행",
  "우리은행",
  "하나은행",
  "농협은행",
  "기업은행",
  "카카오뱅크",
  "토스뱅크",
  "케이뱅크",
] as const;

export type StaffAccountStatus = "사용" | "사용중지";
export type StaffProductScope = "해당사항없음" | "전체상품" | "지정상품";

export type StaffBasicFormState = {
  adminCode: string;
  password: string;
  position: string;
  permissionGroup: string;
  koreanName: string;
  englishName: string;
  hireDate: string;
  resignDate: string;
  mobile: string;
  directPhone: string;
  email: string;
  address: string;
  addressDetail: string;
  bank: string;
  accountNumber: string;
  accountStatus: StaffAccountStatus;
};

export type StaffScopeFormState = {
  productScope: StaffProductScope;
  productCodes: string[];
  sellerIds: string[];
  affiliateIds: string[];
};

export type StaffProductFilterState = {
  major: string;
  middle: string;
  minor: string;
  keyword: string;
  searchField: ProductSearchField;
};

export type StaffFormErrors = {
  adminCode?: string;
  password?: string;
  permissionGroup?: string;
  koreanName?: string;
  mobile?: string;
  email?: string;
};

export type StaffMemberDetail = StaffMemberRow & {
  hireDate: string;
  resignDate: string;
  address: string;
  addressDetail: string;
  bank: string;
  accountNumber: string;
  accountStatus: StaffAccountStatus;
  productScope: StaffProductScope;
  productCodes: string[];
  sellerIds: string[];
  affiliateIds: string[];
};

export const INITIAL_STAFF_BASIC: StaffBasicFormState = {
  adminCode: "",
  password: "",
  position: "",
  permissionGroup: "",
  koreanName: "",
  englishName: "",
  hireDate: "",
  resignDate: "",
  mobile: "",
  directPhone: "",
  email: "",
  address: "",
  addressDetail: "",
  bank: "",
  accountNumber: "",
  accountStatus: "사용",
};

export const INITIAL_STAFF_SCOPE: StaffScopeFormState = {
  productScope: "해당사항없음",
  productCodes: [],
  sellerIds: [],
  affiliateIds: [],
};

export const INITIAL_STAFF_PRODUCT_FILTER: StaffProductFilterState = {
  major: "",
  middle: "",
  minor: "",
  keyword: "",
  searchField: "상품명",
};

type ProductCategoryParts = {
  major: string;
  middle: string;
  minor: string;
};

type ProductCategoryTree = Record<string, Record<string, string[]>>;

export function parseProductCategory(category: string): ProductCategoryParts {
  const [major = "", middle = "", minor = ""] = category
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
  return { major, middle, minor };
}

function buildProductCategoryTree(): ProductCategoryTree {
  const tree: Record<string, Record<string, Set<string>>> = {};
  for (const product of SAMPLE_PRODUCTS) {
    const { major, middle, minor } = parseProductCategory(product.category);
    if (!major) continue;
    if (!tree[major]) tree[major] = {};
    if (!middle) continue;
    if (!tree[major][middle]) tree[major][middle] = new Set();
    if (minor) tree[major][middle].add(minor);
  }
  const result: ProductCategoryTree = {};
  for (const [major, middles] of Object.entries(tree)) {
    result[major] = {};
    for (const [middle, minors] of Object.entries(middles)) {
      result[major][middle] = Array.from(minors).sort((a, b) => a.localeCompare(b, "ko"));
    }
  }
  return result;
}

export const STAFF_PRODUCT_CATEGORY_TREE = buildProductCategoryTree();
export const STAFF_PRODUCT_MAJOR_OPTIONS = Object.keys(STAFF_PRODUCT_CATEGORY_TREE).sort((a, b) =>
  a.localeCompare(b, "ko"),
);

export function matchesStaffProductCategoryFilter(category: string, filter: StaffProductFilterState) {
  if (!filter.major) return true;
  const parts = parseProductCategory(category);
  if (parts.major !== filter.major) return false;
  if (filter.middle && parts.middle !== filter.middle) return false;
  if (filter.minor && parts.minor !== filter.minor) return false;
  return true;
}

export function toggleStaffId(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function validateStaffForm(
  basic: StaffBasicFormState,
  options?: { requirePassword?: boolean; requireProductSelection?: boolean; scope?: StaffScopeFormState },
): StaffFormErrors {
  const errors: StaffFormErrors = {};
  if (!basic.adminCode.trim()) errors.adminCode = "ID를 입력해주세요.";
  if (options?.requirePassword !== false && !basic.password) {
    errors.password = "비밀번호를 입력해주세요.";
  }
  if (!basic.permissionGroup.trim()) errors.permissionGroup = "권한그룹을 선택해주세요.";
  if (!basic.koreanName.trim()) errors.koreanName = "한글이름을 입력해주세요.";
  if (!basic.mobile.trim()) errors.mobile = "휴대폰을 입력해주세요.";
  if (!basic.email.trim()) errors.email = "이메일을 입력해주세요.";
  return errors;
}

const DETAIL_OVERRIDES: Record<string, Partial<StaffMemberDetail>> = {
  changys888: {
    position: "대표",
    mobile: "010-1111-2222",
    directPhone: "02-1234-5678",
    email: "changys888@avianext.example.com",
    hireDate: "2018-03-01",
    address: "서울특별시 강남구 테헤란로 100",
    addressDetail: "AOS빌딩 8층",
    bank: "국민은행",
    accountNumber: "123-456-789012",
    productScope: "전체상품",
  },
  admin_kim: {
    position: "부장",
    mobile: "010-2222-3333",
    directPhone: "02-2345-6789",
    email: "admin_kim@avianext.example.com",
    hireDate: "2019-05-12",
    address: "서울특별시 서초구 서초대로 50",
    addressDetail: "2층",
    bank: "신한은행",
    accountNumber: "110-234-567890",
    productScope: "지정상품",
    productCodes: ["HP0001", "paldo-111"],
  },
  staff_lee: {
    position: "대리",
    mobile: "010-3333-4444",
    email: "staff_lee@avianext.example.com",
    hireDate: "2021-01-15",
    productScope: "전체상품",
  },
  product_park: {
    position: "과장",
    mobile: "010-4444-5555",
    email: "product_park@avianext.example.com",
    hireDate: "2020-08-20",
    productScope: "지정상품",
    productCodes: ["boram01", "share-jeju"],
  },
  reserve_choi: {
    position: "주임",
    mobile: "010-5555-6666",
    email: "reserve_choi@avianext.example.com",
    hireDate: "2022-02-10",
  },
  account_jung: {
    position: "차장",
    mobile: "010-6666-7777",
    email: "account_jung@avianext.example.com",
    hireDate: "2017-11-01",
    bank: "우리은행",
    accountNumber: "1002-123-456789",
  },
  guide_hong: {
    position: "사원",
    mobile: "010-7777-8888",
    email: "guide_hong@avianext.example.com",
    hireDate: "2023-04-01",
  },
  driver_kim: {
    position: "사원",
    mobile: "010-8888-9999",
    email: "driver_kim@avianext.example.com",
    hireDate: "2023-06-15",
  },
};

export function buildStaffMemberDetail(row: StaffMemberRow): StaffMemberDetail {
  const override = DETAIL_OVERRIDES[row.adminCode] ?? {};
  return {
    ...row,
    hireDate: "",
    resignDate: "",
    address: "",
    addressDetail: "",
    bank: "",
    accountNumber: "",
    accountStatus: "사용",
    productScope: "해당사항없음",
    productCodes: [],
    sellerIds: [],
    affiliateIds: [],
    ...override,
    adminCode: row.adminCode,
    koreanName: override.koreanName ?? row.koreanName,
    englishName: override.englishName ?? row.englishName,
    position: override.position ?? row.position,
    mobile: override.mobile ?? row.mobile,
    directPhone: override.directPhone ?? row.directPhone,
    email: override.email ?? row.email,
    groupName: override.groupName ?? row.groupName,
  };
}

export function getStaffDetailByAdminCode(adminCode: string): StaffMemberDetail | null {
  const row = getStaffMemberByAdminCode(adminCode);
  if (!row) return null;
  return buildStaffMemberDetail(row);
}

export function staffDetailToFormState(detail: StaffMemberDetail): {
  basic: StaffBasicFormState;
  scope: StaffScopeFormState;
} {
  return {
    basic: {
      adminCode: detail.adminCode,
      password: "",
      position: detail.position,
      permissionGroup: detail.groupName,
      koreanName: detail.koreanName,
      englishName: detail.englishName,
      hireDate: detail.hireDate,
      resignDate: detail.resignDate,
      mobile: detail.mobile,
      directPhone: detail.directPhone,
      email: detail.email,
      address: detail.address,
      addressDetail: detail.addressDetail,
      bank: detail.bank,
      accountNumber: detail.accountNumber,
      accountStatus: detail.accountStatus,
    },
    scope: {
      productScope: detail.productScope,
      productCodes: [...detail.productCodes],
      sellerIds: [...detail.sellerIds],
      affiliateIds: [...detail.affiliateIds],
    },
  };
}
