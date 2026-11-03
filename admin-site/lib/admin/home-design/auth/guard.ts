import {
  hasHomeDesignPermission,
  type HomeDesignPermission,
} from "../../../../../packages/home-design-contract/src/permissions.ts";
import { DraftStoreError } from "../draft-store.ts";
import {
  assertHomeDesignAuthAllowed,
  HOME_DESIGN_CSRF_HEADER,
  HOME_DESIGN_SESSION_COOKIE,
  parseHomeDesignSession,
  parsePreviewToken,
  readCookie,
  type HomeDesignPreviewTokenPayload,
  type HomeDesignSession,
} from "./session.ts";

export type AuthContext = {
  session: HomeDesignSession | null;
  preview: HomeDesignPreviewTokenPayload | null;
  actorLabel: string;
};

function readPreviewTokenFromRequest(request: Request): string | null {
  const named = request.headers.get("x-home-design-preview-token")?.trim();
  if (named) return named;
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return new URL(request.url).searchParams.get("previewToken");
}

export function resolveAuthContext(request: Request, env?: string): AuthContext {
  assertHomeDesignAuthAllowed(env);
  const session = parseHomeDesignSession(readCookie(request, HOME_DESIGN_SESSION_COOKIE));
  const preview = parsePreviewToken(readPreviewTokenFromRequest(request));
  const actorLabel = session?.loginId || preview?.loginId || "anonymous";
  return { session, preview, actorLabel };
}

export function requireSession(ctx: AuthContext): HomeDesignSession {
  if (!ctx.session) {
    throw new DraftStoreError(401, "UNAUTHORIZED", "로그인이 필요합니다. 개발용 홈디자인 계정으로 다시 로그인하세요.");
  }
  return ctx.session;
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new DraftStoreError(403, "CSRF_REJECTED", "다른 출처의 인증 요청은 허용하지 않습니다.");
  }
}

export function requireCsrf(request: Request, session: HomeDesignSession): void {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  requireSameOrigin(request);
  const token = request.headers.get(HOME_DESIGN_CSRF_HEADER)?.trim() ?? "";
  if (!token || token !== session.csrfToken) {
    throw new DraftStoreError(403, "CSRF_REJECTED", "CSRF 토큰이 없거나 올바르지 않습니다.");
  }
}

export function requirePermission(session: HomeDesignSession, permission: HomeDesignPermission): void {
  if (!hasHomeDesignPermission(session.permissions, permission)) {
    throw new DraftStoreError(403, "FORBIDDEN", `권한이 없습니다. (${permission})`);
  }
}

export function requireSiteAccess(session: HomeDesignSession, siteCode: string): void {
  if (session.role === "platform_admin" && !session.platformScope) {
    throw new DraftStoreError(403, "SITE_FORBIDDEN", "플랫폼 범위 권한이 필요합니다.");
  }
  if (!session.allowedSiteCodes.includes(siteCode)) {
    throw new DraftStoreError(403, "SITE_FORBIDDEN", "허용되지 않은 사이트코드입니다.");
  }
}

/** 브라우저 세션 또는 미리보기 토큰으로 읽기 접근을 허용한다. */
export function requireReadAccess(
  ctx: AuthContext,
  input: { siteCode: string; pageKey?: string; scope: "draft" | "published"; permission: HomeDesignPermission },
): { actorLabel: string; via: "session" | "preview" } {
  if (ctx.session) {
    requireSiteAccess(ctx.session, input.siteCode);
    requirePermission(ctx.session, input.permission);
    return { actorLabel: ctx.session.loginId, via: "session" };
  }
  if (ctx.preview) {
    if (ctx.preview.scope !== input.scope) {
      throw new DraftStoreError(403, "FORBIDDEN", "미리보기 토큰 범위가 요청과 일치하지 않습니다.");
    }
    if (ctx.preview.siteCode !== input.siteCode || (input.pageKey && ctx.preview.pageKey !== input.pageKey)) {
      throw new DraftStoreError(403, "SITE_FORBIDDEN", "미리보기 토큰의 사이트·페이지와 요청이 일치하지 않습니다.");
    }
    if (!hasHomeDesignPermission(ctx.preview.permissions, input.permission)) {
      throw new DraftStoreError(403, "FORBIDDEN", `미리보기 권한이 없습니다. (${input.permission})`);
    }
    if (!ctx.preview.allowedSiteCodes.includes(input.siteCode)) {
      throw new DraftStoreError(403, "SITE_FORBIDDEN", "허용되지 않은 사이트코드입니다.");
    }
    return { actorLabel: ctx.preview.loginId, via: "preview" };
  }
  throw new DraftStoreError(401, "UNAUTHORIZED", "인증되지 않은 요청입니다.");
}

export function requireMutationAccess(
  request: Request,
  ctx: AuthContext,
  input: { siteCode: string; permission: HomeDesignPermission },
): HomeDesignSession {
  const session = requireSession(ctx);
  requireSiteAccess(session, input.siteCode);
  requirePermission(session, input.permission);
  requireCsrf(request, session);
  if (input.permission === "home_design.draft_save") requirePermission(session, "home_design.edit");
  return session;
}

export function requireSessionPermission(
  request: Request,
  ctx: AuthContext,
  permission: HomeDesignPermission,
  options?: { csrf?: boolean },
): HomeDesignSession {
  const session = requireSession(ctx);
  if (options?.csrf !== false) requireCsrf(request, session);
  requirePermission(session, permission);
  return session;
}
