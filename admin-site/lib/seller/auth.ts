import { SELLER_APPLICATION_SEED } from "@/lib/admin/members-seller-data";
import {
  getSellerAdminProfileByLoginId,
  SELLER_ADMIN_DEMO_PROFILE,
} from "@/lib/seller/seller-admin-profile";
import { SELLER_LOGIN_PATH } from "@/lib/seller/navigation";

export const SELLER_SESSION_COOKIE = "aos_seller_admin_session";
export const SELLER_REMEMBERED_LOGIN_ID_KEY = "aos.seller.login.remembered-id";
export const SELLER_MOCK_PASSWORD = "seller123!";

export type SellerMockAccount = {
  applicationId: string;
  sellerId: string;
  sellerName: string;
  loginId: string;
  password: string;
};

export type SellerSession = {
  sellerId: string;
  sellerCode: string;
  sellerName: string;
  sellerTypeLabel: string;
  contactName: string;
  loginId: string;
  logoUrl: string | null;
};

const SEED_MOCK_ACCOUNTS: SellerMockAccount[] = SELLER_APPLICATION_SEED.filter(
  (row) => row.applicationStatus === "approved",
).map((row, index) => ({
  applicationId: row.applicationId,
  sellerId: row.sellerId,
  sellerName: row.sellerName,
  loginId: row.loginId?.trim() || `seller${String(index + 1).padStart(3, "0")}`,
  password: SELLER_MOCK_PASSWORD,
}));

const DEMO_MOCK_ACCOUNT: SellerMockAccount = {
  applicationId: SELLER_ADMIN_DEMO_PROFILE.sellerId,
  sellerId: SELLER_ADMIN_DEMO_PROFILE.sellerId,
  sellerName: SELLER_ADMIN_DEMO_PROFILE.sellerName,
  loginId: SELLER_ADMIN_DEMO_PROFILE.loginId,
  password: SELLER_MOCK_PASSWORD,
};

export const SELLER_MOCK_ACCOUNTS: SellerMockAccount[] = [
  DEMO_MOCK_ACCOUNT,
  ...SEED_MOCK_ACCOUNTS.filter(
    (account) => account.loginId.toLowerCase() !== DEMO_MOCK_ACCOUNT.loginId.toLowerCase(),
  ),
];

export function getSellerMockAccount(loginId: string) {
  const normalized = loginId.trim().toLowerCase();
  if (!normalized) return null;
  return SELLER_MOCK_ACCOUNTS.find((account) => account.loginId.toLowerCase() === normalized) ?? null;
}

export function validateSellerLogin(loginId: string, password: string) {
  const account = getSellerMockAccount(loginId);
  if (!account) {
    return { ok: false as const, message: "승인된 판매점 계정을 찾을 수 없습니다." };
  }
  if (password !== account.password) {
    return { ok: false as const, message: "비밀번호를 다시 확인해 주세요." };
  }
  return { ok: true as const, account };
}

export function toSellerSession(account: SellerMockAccount): SellerSession {
  const profile = getSellerAdminProfileByLoginId(account.loginId);
  return {
    sellerId: profile?.sellerId ?? account.sellerId,
    sellerCode: profile?.sellerCode ?? account.sellerId,
    sellerName: profile?.sellerName ?? account.sellerName,
    sellerTypeLabel: profile?.sellerTypeLabel ?? "판매점",
    contactName: profile?.contactName ?? account.sellerName,
    loginId: account.loginId,
    logoUrl: profile?.logoUrl ?? null,
  };
}

export function serializeSellerSession(account: SellerMockAccount): string {
  return encodeURIComponent(JSON.stringify(toSellerSession(account)));
}

export function parseSellerSession(value: string | undefined | null): SellerSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<SellerSession>;
    if (!parsed.sellerId || !parsed.sellerName || !parsed.loginId) return null;
    const session: SellerSession = {
      sellerId: parsed.sellerId,
      sellerCode: parsed.sellerCode ?? parsed.sellerId,
      sellerName: parsed.sellerName,
      sellerTypeLabel: parsed.sellerTypeLabel ?? "판매점",
      contactName: parsed.contactName ?? parsed.sellerName,
      loginId: parsed.loginId,
      logoUrl: parsed.logoUrl ?? null,
    };
    const profile = getSellerAdminProfileByLoginId(session.loginId);
    if (!profile) return session;
    return {
      ...session,
      sellerId: profile.sellerId,
      sellerCode: profile.sellerCode,
      sellerName: profile.sellerName,
      sellerTypeLabel: profile.sellerTypeLabel,
      contactName: profile.contactName,
      logoUrl: profile.logoUrl,
    };
  } catch {
    return null;
  }
}

export function createSellerSessionCookieValue(account: SellerMockAccount) {
  return `${SELLER_SESSION_COOKIE}=${serializeSellerSession(account)}; Path=/; Max-Age=${60 * 60 * 8}; SameSite=Lax`;
}

export function clearSellerSessionCookieValue() {
  return `${SELLER_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readSellerSessionFromDocument(): SellerSession | null {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${SELLER_SESSION_COOKIE}=`))
    ?.slice(SELLER_SESSION_COOKIE.length + 1);
  return parseSellerSession(cookie);
}

export function isSellerLoginPath(pathname: string) {
  return pathname === SELLER_LOGIN_PATH;
}
