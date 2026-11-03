import { requireMutationAccess, requireReadAccess, resolveAuthContext } from "./auth/guard.ts";
import { draftFail, draftOk, draftRouteError, readJsonBody } from "./draft-http.ts";
import { DraftStoreError, getDefaultDraftStore } from "./draft-store.ts";
import { DEV_PUBLISH_MODE, getDefaultPublishStore } from "./publish-store.ts";

export const PUBLISH_API_PREFIX = "/api/admin/home-design/published";

export function isHomeDesignPublishedPath(pathname: string): boolean {
  return pathname === PUBLISH_API_PREFIX || pathname.startsWith(`${PUBLISH_API_PREFIX}/`);
}

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new DraftStoreError(400, "PATH_FORBIDDEN", "경로 값이 올바르지 않습니다.");
  }
}

function store() {
  return getDefaultPublishStore(getDefaultDraftStore());
}

export async function handleHomeDesignPublishRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    if (!isHomeDesignPublishedPath(pathname)) {
      return draftFail(404, "NOT_FOUND", "발행 API 경로가 아닙니다.", DEV_PUBLISH_MODE);
    }
    const rest = pathname.slice(PUBLISH_API_PREFIX.length).replace(/^\//, "");
    const parts = rest ? rest.split("/") : [];
    const method = request.method.toUpperCase();
    const ctx = resolveAuthContext(request);

    if (parts.length === 2) {
      const siteCode = decodePart(parts[0]);
      const pageKey = decodePart(parts[1]);
      if (method === "GET") {
        requireReadAccess(ctx, { siteCode, pageKey, scope: "published", permission: "home_design.read" });
        const document = await store().readActive(siteCode, pageKey);
        if (!document) return draftFail(404, "NOT_FOUND", "활성 발행본이 없습니다.", DEV_PUBLISH_MODE);
        return draftOk({ document }, 200, DEV_PUBLISH_MODE);
      }
      if (method === "POST") {
        const session = requireMutationAccess(request, ctx, { siteCode, permission: "home_design.publish_dev" });
        const body = await readJsonBody<{
          expectedDraftRevision?: number;
          draftRevision?: number;
          publishedBy?: string;
          note?: string;
        }>(request);
        const expectedDraftRevision = body.expectedDraftRevision ?? body.draftRevision;
        if (typeof expectedDraftRevision !== "number") {
          throw new DraftStoreError(400, "VALIDATION", "expectedDraftRevision 값이 필요합니다.");
        }
        return draftOk(
          await store().publishFromDraft({
            site_code: siteCode,
            pageKey,
            expectedDraftRevision,
            publishedBy: session.loginId,
            note: body.note,
          }),
          200,
          DEV_PUBLISH_MODE,
        );
      }
    }

    if (parts.length === 3 && parts[2] === "versions" && method === "GET") {
      const siteCode = decodePart(parts[0]);
      const pageKey = decodePart(parts[1]);
      requireReadAccess(ctx, { siteCode, pageKey, scope: "published", permission: "home_design.read" });
      const version = url.searchParams.get("version");
      if (version) {
        return draftOk({ document: await store().readVersion(siteCode, pageKey, Number(version)) }, 200, DEV_PUBLISH_MODE);
      }
      return draftOk({ versions: await store().listVersions(siteCode, pageKey) }, 200, DEV_PUBLISH_MODE);
    }

    if (parts.length === 3 && parts[2] === "history" && method === "GET") {
      const siteCode = decodePart(parts[0]);
      const pageKey = decodePart(parts[1]);
      requireReadAccess(ctx, { siteCode, pageKey, scope: "published", permission: "home_design.read" });
      return draftOk({ history: await store().listHistory(siteCode, pageKey) }, 200, DEV_PUBLISH_MODE);
    }

    if (parts.length === 3 && parts[2] === "restore" && method === "POST") {
      const siteCode = decodePart(parts[0]);
      const pageKey = decodePart(parts[1]);
      const session = requireMutationAccess(request, ctx, { siteCode, permission: "home_design.restore" });
      const body = await readJsonBody<{ version?: number; expectedDraftRevision?: number }>(request);
      if (typeof body.version !== "number" || typeof body.expectedDraftRevision !== "number") {
        throw new DraftStoreError(400, "VALIDATION", "version 과 expectedDraftRevision 값이 필요합니다.");
      }
      const result = await store().restorePublishedToDraft(siteCode, pageKey, body.version, body.expectedDraftRevision, session.loginId);
      return draftOk(
        {
          document: result.document,
          message: "이전 발행본을 현재 초안으로 복사했습니다. 실홈은 바뀌지 않으며, 활성 발행본을 바꾸려면 다시 모의 발행하세요.",
        },
        200,
        DEV_PUBLISH_MODE,
      );
    }

    return draftFail(405, "METHOD_NOT_ALLOWED", "지원하지 않는 발행 API 요청입니다.", DEV_PUBLISH_MODE);
  } catch (error) {
    return draftRouteError(error);
  }
}
