import { requireMutationAccess, requireReadAccess, requireSessionPermission, resolveAuthContext } from "./auth/guard.ts";
import { draftFail, draftOk, draftRouteError, readJsonBody } from "./draft-http.ts";
import { DraftStoreError, getDefaultDraftStore } from "./draft-store.ts";
import type { HomeMedia, HomePage, HomeSiteStatus } from "./types.ts";

export const DRAFT_API_PREFIX = "/api/admin/home-design/drafts";

type SaveBody = {
  site_code?: string;
  pageKey?: string;
  revision?: number;
  expectedRevision?: number;
  updatedBy?: string;
  siteName?: string;
  domains?: string[];
  siteStatus?: HomeSiteStatus;
  tempCode?: string;
  page?: HomePage;
  media?: HomeMedia[];
};

export function isHomeDesignDraftPath(pathname: string): boolean {
  return pathname === DRAFT_API_PREFIX || pathname.startsWith(`${DRAFT_API_PREFIX}/`);
}

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new DraftStoreError(400, "PATH_FORBIDDEN", "경로 값이 올바르지 않습니다.");
  }
}

export async function handleHomeDesignDraftRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    if (!isHomeDesignDraftPath(pathname)) {
      return draftFail(404, "NOT_FOUND", "초안 API 경로가 아닙니다.");
    }
    const rest = pathname.slice(DRAFT_API_PREFIX.length).replace(/^\//, "");
    const parts = rest ? rest.split("/") : [];
    const method = request.method.toUpperCase();
    const store = getDefaultDraftStore();
    const ctx = resolveAuthContext(request);

    if (parts.length === 0 && method === "GET") {
      const session = requireSessionPermission(request, ctx, "home_design.read", { csrf: false });
      const drafts = (await store.listDrafts()).filter((item) => session.allowedSiteCodes.includes(item.site_code));
      return draftOk({ drafts });
    }

    if (parts.length === 2) {
      const siteCode = decodePart(parts[0]);
      const pageKey = decodePart(parts[1]);
      if (method === "GET") {
        requireReadAccess(ctx, { siteCode, pageKey, scope: "draft", permission: "home_design.read" });
        const document = await store.readCurrent(siteCode, pageKey);
        if (!document) return draftFail(404, "NOT_FOUND", "저장된 초안이 없습니다.");
        return draftOk({ document });
      }
      if (method === "PUT") {
        const session = requireMutationAccess(request, ctx, { siteCode, permission: "home_design.draft_save" });
        const body = await readJsonBody<SaveBody>(request);
        if (body.site_code && body.site_code !== siteCode) {
          throw new DraftStoreError(400, "SITE_CODE_MISMATCH", "요청한 사이트코드와 저장 데이터의 사이트코드가 다릅니다.");
        }
        if (body.pageKey && body.pageKey !== pageKey) {
          throw new DraftStoreError(400, "PAGE_KEY_MISMATCH", "요청한 페이지코드와 저장 데이터의 페이지코드가 다릅니다.");
        }
        if (!body.page || !body.tempCode || !body.siteName) {
          throw new DraftStoreError(400, "VALIDATION", "siteName, tempCode, page 값은 필수입니다.");
        }
        const expectedRevision = body.expectedRevision ?? body.revision;
        if (typeof expectedRevision !== "number") {
          throw new DraftStoreError(400, "VALIDATION", "revision 값이 필요합니다.");
        }
        const result = await store.saveDraft({
          site_code: siteCode,
          pageKey,
          expectedRevision,
          updatedBy: session.loginId,
          siteName: body.siteName,
          domains: body.domains ?? [],
          siteStatus: body.siteStatus,
          tempCode: body.tempCode,
          page: body.page,
          media: body.media ?? [],
        });
        return draftOk(result);
      }
    }

    if (parts.length === 3 && parts[2] === "versions" && method === "GET") {
      const siteCode = decodePart(parts[0]);
      const pageKey = decodePart(parts[1]);
      requireReadAccess(ctx, { siteCode, pageKey, scope: "draft", permission: "home_design.read" });
      const revision = url.searchParams.get("revision");
      if (revision) {
        const document = await store.readVersion(siteCode, pageKey, Number(revision));
        return draftOk({ document });
      }
      return draftOk({ versions: await store.listVersions(siteCode, pageKey) });
    }

    if (parts.length === 3 && parts[2] === "restore" && method === "POST") {
      const siteCode = decodePart(parts[0]);
      const pageKey = decodePart(parts[1]);
      const session = requireMutationAccess(request, ctx, { siteCode, permission: "home_design.restore" });
      const body = await readJsonBody<{ revision?: number; expectedRevision?: number }>(request);
      if (typeof body.revision !== "number" || typeof body.expectedRevision !== "number") {
        throw new DraftStoreError(400, "VALIDATION", "revision 과 expectedRevision 값이 필요합니다.");
      }
      return draftOk(await store.restoreVersion(siteCode, pageKey, body.revision, body.expectedRevision, session.loginId));
    }

    return draftFail(405, "METHOD_NOT_ALLOWED", "지원하지 않는 초안 API 요청입니다.");
  } catch (error) {
    return draftRouteError(error);
  }
}
