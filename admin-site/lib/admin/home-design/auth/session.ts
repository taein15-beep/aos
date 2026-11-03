import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { HomeDesignPermission, HomeDesignRole } from "../../../../../packages/home-design-contract/src/permissions.ts";
import { DraftStoreError } from "../draft-store.ts";
import type { HomeDesignDevUser } from "./fixtures.ts";

export const HOME_DESIGN_SESSION_COOKIE = "aos_home_design_dev_session";
export const HOME_DESIGN_CSRF_HEADER = "x-csrf-token";
export const HOME_DESIGN_AUTH_MODE = "dev-auth";
export const HOME_DESIGN_SESSION_TTL_MS = 1000 * 60 * 60 * 8;
export const HOME_DESIGN_PREVIEW_TOKEN_TTL_MS = 1000 * 60 * 10;

export type HomeDesignSession = {
  sid: string;
  userId: string;
  loginId: string;
  displayName: string;
  agencyId: string;
  agencyName: string;
  role: HomeDesignRole;
  permissions: HomeDesignPermission[];
  allowedSiteCodes: string[];
  platformScope: boolean;
  issuedAt: string;
  expiresAt: string;
  csrfToken: string;
};

export type HomeDesignPreviewTokenPayload = {
  tokenId: string;
  sid: string;
  userId: string;
  loginId: string;
  siteCode: string;
  pageKey: string;
  scope: "draft" | "published";
  permissions: HomeDesignPermission[];
  allowedSiteCodes: string[];
  issuedAt: string;
  expiresAt: string;
};

// Process-local development sessions: restart and logout invalidate credentials.
const sessions = new Map<string, HomeDesignSession>();
const processSecret = randomBytes(32).toString("hex");
function secret(): string { return processSecret; }

export function revokeHomeDesignSession(sid: string): void { sessions.delete(sid); }
function activeSession(sid: string, now: number): HomeDesignSession | null {
  const session = sessions.get(sid);
  if (!session || !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= now) {
    sessions.delete(sid);
    return null;
  }
  return session;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function fromB64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isHomeDesignAuthAllowed(env: string | undefined = process.env.NODE_ENV): boolean {
  return env === "development" || env === "test";
}

export function assertHomeDesignAuthAllowed(env: string | undefined = process.env.NODE_ENV): void {
  if (!isHomeDesignAuthAllowed(env)) {
    throw new DraftStoreError(403, "PRODUCTION_FORBIDDEN", "개발 전용 홈디자인 인증은 운영 환경에서 사용할 수 없습니다.");
  }
}

export function createHomeDesignSession(user: HomeDesignDevUser, now = Date.now()): HomeDesignSession {
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + HOME_DESIGN_SESSION_TTL_MS).toISOString();
  for (const sid of sessions.keys()) activeSession(sid, now);
  const session: HomeDesignSession = {
    sid: randomBytes(16).toString("hex"),
    userId: user.userId,
    loginId: user.loginId,
    displayName: user.displayName,
    agencyId: user.agencyId,
    agencyName: user.agencyName,
    role: user.role,
    permissions: [...user.permissions],
    allowedSiteCodes: [...user.allowedSiteCodes],
    platformScope: user.platformScope === true,
    issuedAt,
    expiresAt,
    csrfToken: randomBytes(24).toString("hex"),
  };
  sessions.set(session.sid, structuredClone(session));
  return session;
}

export function serializeHomeDesignSession(session: HomeDesignSession): string {
  const payload = b64url(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

export function parseHomeDesignSession(raw: string | undefined | null, now = Date.now()): HomeDesignSession | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;
  try {
    const session = JSON.parse(fromB64url(payload)) as HomeDesignSession;
    if (!session?.userId || !session.loginId || !Array.isArray(session.permissions) || !Array.isArray(session.allowedSiteCodes)) {
      return null;
    }
    if (!session.csrfToken || !session.expiresAt) return null;
    const stored = activeSession(session.sid, now);
    if (!stored || JSON.stringify(stored) !== JSON.stringify(session)) return null;
    return structuredClone(stored);
  } catch {
    return null;
  }
}

export function createPreviewToken(
  session: HomeDesignSession,
  input: { siteCode: string; pageKey: string; scope: "draft" | "published" },
  now = Date.now(),
): string {
  const payloadObj: HomeDesignPreviewTokenPayload = {
    tokenId: randomBytes(12).toString("hex"),
    sid: session.sid,
    userId: session.userId,
    loginId: session.loginId,
    siteCode: input.siteCode,
    pageKey: input.pageKey,
    scope: input.scope,
    permissions: [...session.permissions],
    allowedSiteCodes: [...session.allowedSiteCodes],
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(Math.min(now + HOME_DESIGN_PREVIEW_TOKEN_TTL_MS, Date.parse(session.expiresAt))).toISOString(),
  };
  const payload = b64url(JSON.stringify(payloadObj));
  return `${payload}.${sign(`preview:${payload}`)}`;
}

export function parsePreviewToken(raw: string | undefined | null, now = Date.now()): HomeDesignPreviewTokenPayload | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature || !safeEqual(sign(`preview:${payload}`), signature)) return null;
  try {
    const token = JSON.parse(fromB64url(payload)) as HomeDesignPreviewTokenPayload;
    if (!token?.userId || !token.siteCode || !token.pageKey || (token.scope !== "draft" && token.scope !== "published")) return null;
    if (!Number.isFinite(Date.parse(token.expiresAt)) || Date.parse(token.expiresAt) <= now) return null;
    if (!activeSession(token.sid, now) || !Array.isArray(token.permissions) || !Array.isArray(token.allowedSiteCodes)) return null;
    return token;
  } catch {
    return null;
  }
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      try { return decodeURIComponent(rest.join("=")); } catch { return null; }
    }
  }
  return null;
}

export function sessionCookieHeader(value: string, maxAgeSec = Math.floor(HOME_DESIGN_SESSION_TTL_MS / 1000)): string {
  return `${HOME_DESIGN_SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

export function clearSessionCookieHeader(): string {
  return `${HOME_DESIGN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function publicSessionView(session: HomeDesignSession) {
  return {
    userId: session.userId,
    loginId: session.loginId,
    displayName: session.displayName,
    agencyId: session.agencyId,
    agencyName: session.agencyName,
    role: session.role,
    permissions: session.permissions,
    allowedSiteCodes: session.allowedSiteCodes,
    platformScope: session.platformScope,
    expiresAt: session.expiresAt,
    csrfToken: session.csrfToken,
    authMode: HOME_DESIGN_AUTH_MODE,
    warning: "개발 전용 인증입니다. 운영 계정·운영 API와 연결되어 있지 않습니다.",
  };
}
