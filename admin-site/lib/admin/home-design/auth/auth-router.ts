import { draftFail, draftOk, draftRouteError, readJsonBody } from "../draft-http.ts";
import { DraftStoreError } from "../draft-store.ts";
import { validateHomeDesignDevLogin } from "./fixtures.ts";
import { requireSameOrigin, requireCsrf, requirePermission, requireSession, requireSiteAccess, resolveAuthContext } from "./guard.ts";
import {
  assertHomeDesignAuthAllowed,
  clearSessionCookieHeader,
  revokeHomeDesignSession,
  createHomeDesignSession,
  createPreviewToken,
  HOME_DESIGN_AUTH_MODE,
  publicSessionView,
  serializeHomeDesignSession,
  sessionCookieHeader,
} from "./session.ts";

export const AUTH_API_PREFIX = "/api/admin/home-design/auth";

export function isHomeDesignAuthPath(pathname: string): boolean {
  return pathname === AUTH_API_PREFIX || pathname.startsWith(`${AUTH_API_PREFIX}/`);
}

export async function handleHomeDesignAuthRequest(request: Request): Promise<Response> {
  try {
    assertHomeDesignAuthAllowed();
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    if (!isHomeDesignAuthPath(pathname)) {
      return draftFail(404, "NOT_FOUND", "인증 API 경로가 아닙니다.", HOME_DESIGN_AUTH_MODE);
    }
    const action = pathname.slice(AUTH_API_PREFIX.length).replace(/^\//, "");
    const method = request.method.toUpperCase();
    const ctx = resolveAuthContext(request);

    if (action === "login" && method === "POST") {
      requireSameOrigin(request);
      if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
        throw new DraftStoreError(415, "INVALID_JSON", "JSON 로그인이 필요합니다.");
      }
      const body = await readJsonBody<{ loginId?: string; password?: string }>(request);
      if (!body || typeof body.loginId !== "string" || typeof body.password !== "string") {
        throw new DraftStoreError(400, "VALIDATION", "아이디와 비밀번호가 필요합니다.");
      }
      const result = validateHomeDesignDevLogin(body.loginId ?? "", body.password ?? "");
      if (!result.ok) throw new DraftStoreError(401, "UNAUTHORIZED", result.message);
      if (ctx.session) revokeHomeDesignSession(ctx.session.sid);
      const session = createHomeDesignSession(result.user);
      const response = draftOk({ session: publicSessionView(session) }, 200, HOME_DESIGN_AUTH_MODE);
      const headers = new Headers(response.headers);
      headers.append("Set-Cookie", sessionCookieHeader(serializeHomeDesignSession(session)));
      return new Response(response.body, { status: response.status, headers });
    }

    if (action === "logout" && method === "POST") {
      requireSameOrigin(request);
      if (ctx.session) { requireCsrf(request, ctx.session); revokeHomeDesignSession(ctx.session.sid); }
      const response = draftOk({ loggedOut: true }, 200, HOME_DESIGN_AUTH_MODE);
      const headers = new Headers(response.headers);
      headers.append("Set-Cookie", clearSessionCookieHeader());
      return new Response(response.body, { status: response.status, headers });
    }

    if (action === "me" && method === "GET") {
      if (!ctx.session) return draftFail(401, "UNAUTHORIZED", "로그인되어 있지 않습니다.", HOME_DESIGN_AUTH_MODE);
      return draftOk({ session: publicSessionView(ctx.session) }, 200, HOME_DESIGN_AUTH_MODE);
    }

    if (action === "preview-token" && method === "POST") {
      const session = requireSession(ctx);
      requireCsrf(request, session);
      requirePermission(session, "home_design.preview");
      const body = await readJsonBody<{ siteCode?: string; pageKey?: string; scope?: "draft" | "published" }>(request);
      const siteCode = body.siteCode?.trim() ?? "";
      const pageKey = body.pageKey?.trim() ?? "";
      const scope = body.scope === "published" ? "published" : "draft";
      if (!siteCode || !pageKey) throw new DraftStoreError(400, "VALIDATION", "siteCode 와 pageKey 가 필요합니다.");
      requireSiteAccess(session, siteCode);
      if (scope === "draft") requirePermission(session, "home_design.read");
      else requirePermission(session, "home_design.read");
      const token = createPreviewToken(session, { siteCode, pageKey, scope });
      return draftOk(
        {
          token,
          siteCode,
          pageKey,
          scope,
          expiresInSec: 600,
          warning: "개발 전용 미리보기 토큰입니다. URL에 포함되므로 공유하지 마세요.",
        },
        200,
        HOME_DESIGN_AUTH_MODE,
      );
    }

    return draftFail(405, "METHOD_NOT_ALLOWED", "지원하지 않는 인증 API 요청입니다.", HOME_DESIGN_AUTH_MODE);
  } catch (error) {
    return draftRouteError(error);
  }
}
