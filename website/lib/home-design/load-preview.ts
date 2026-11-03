import {
  HOME_DRAFT_SCHEMA,
  validateHomeDraftSlice,
  validatePageKey,
  validateSiteCode,
  type HomeDesignDraftDocument,
} from "../../../packages/home-design-contract/src/index.ts";

export const DESIGN_PREVIEW_API_PATH = "/api/dev/home-design-preview";
export const DEFAULT_ADMIN_ORIGIN = "http://localhost:3001";

export type HomeDesignPreviewResult =
  | { status: "need-selection" }
  | { status: "forbidden"; message: string }
  | { status: "missing"; siteCode: string; pageKey: string; message: string }
  | { status: "admin-down"; message: string }
  | { status: "invalid"; message: string }
  | { status: "ready"; siteCode: string; pageKey: string; document: HomeDesignDraftDocument };

export type LoadHomeDesignPreviewInput = {
  siteCode?: string | null;
  pageKey?: string | null;
  previewToken?: string | null;
  env?: string;
  adminOrigin?: string;
  fetchImpl?: typeof fetch;
};

export function isDesignPreviewAllowed(env: string | undefined = process.env.NODE_ENV): boolean {
  return env === "development" || env === "test";
}

function adminDraftUrl(origin: string, siteCode: string, pageKey: string): string {
  return `${origin.replace(/\/+$/, "")}/api/admin/home-design/drafts/${encodeURIComponent(siteCode)}/${encodeURIComponent(pageKey)}`;
}

function asDocument(value: unknown): HomeDesignDraftDocument | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { document?: unknown; schema?: unknown };
  const document = "document" in record ? record.document : record;
  if (!document || typeof document !== "object") return null;
  const stored = document as HomeDesignDraftDocument;
  if (stored.schema !== HOME_DRAFT_SCHEMA || !stored.draft?.payload?.pages?.[0]) return null;
  return stored;
}

export async function loadHomeDesignPreview(input: LoadHomeDesignPreviewInput): Promise<HomeDesignPreviewResult> {
  if (!isDesignPreviewAllowed(input.env ?? process.env.NODE_ENV)) {
    return { status: "forbidden", message: "개발 전용 디자인 미리보기는 운영 환경에서 사용할 수 없습니다." };
  }

  const siteCode = input.siteCode?.trim() ?? "";
  const pageKey = input.pageKey?.trim() ?? "";
  const previewToken = input.previewToken?.trim() ?? "";
  if (!siteCode || !pageKey) {
    return { status: "need-selection" };
  }
  if (!previewToken) {
    return {
      status: "forbidden",
      message: "미리보기 토큰이 없습니다. 관리자에서 로그인한 뒤 ‘초안 테스트 보기’로 열어주세요.",
    };
  }

  const siteIssues = validateSiteCode(siteCode);
  const pageIssues = validatePageKey(pageKey);
  if (siteIssues.length || pageIssues.length) {
    return { status: "invalid", message: (siteIssues[0] ?? pageIssues[0]).message };
  }

  const origin = input.adminOrigin ?? process.env.HOME_DESIGN_ADMIN_ORIGIN ?? DEFAULT_ADMIN_ORIGIN;
  const fetchImpl = input.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl(adminDraftUrl(origin, siteCode, pageKey), {
      method: "GET",
      cache: "no-store",
      redirect: "error",
      headers: {
        Accept: "application/json",
        "X-Home-Design-Preview-Token": previewToken,
      },
    });
  } catch {
    return {
      status: "admin-down",
      message: "관리자 서버(3001)에 연결하지 못했습니다. 관리자를 실행한 뒤 다시 시도하세요.",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      status: "forbidden",
      message: "초안 미리보기 권한이 없거나 토큰이 만료되었습니다. 관리자에서 다시 열어주세요.",
    };
  }

  if (response.status === 404) {
    return {
      status: "missing",
      siteCode,
      pageKey,
      message: "저장된 초안이 없습니다. 관리자에서 초안을 저장하면 이 화면에 나타납니다.",
    };
  }

  if (!response.ok) {
    return {
      status: "admin-down",
      message: `관리자 초안 조회에 실패했습니다. (HTTP ${response.status})`,
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { status: "invalid", message: "관리자 초안 응답이 JSON이 아닙니다." };
  }

  const envelope = payload as { ok?: boolean; data?: unknown; error?: { message?: string } };
  if (envelope.ok === false) {
    return { status: "invalid", message: envelope.error?.message ?? "초안 데이터를 읽을 수 없습니다." };
  }

  const document = asDocument(envelope.data ?? envelope);
  if (!document) {
    return { status: "invalid", message: "초안 스키마가 올바르지 않습니다." };
  }
  if (document.draft.site_code !== siteCode || document.pageKey !== pageKey) {
    return { status: "invalid", message: "요청한 사이트·페이지와 초안 데이터가 일치하지 않습니다." };
  }

  const page = document.draft.payload.pages[0];
  const validated = validateHomeDraftSlice({
    site_code: siteCode,
    pageKey,
    tempCode: document.draft.payload.tempCode,
    page,
    media: document.draft.payload.media,
  });
  if (!validated.ok) {
    return { status: "invalid", message: validated.issues[0]?.message ?? "초안 데이터가 올바르지 않습니다." };
  }

  return { status: "ready", siteCode, pageKey, document };
}

export async function handleHomeDesignPreviewRequest(request: Request, options?: { env?: string; adminOrigin?: string }): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "초안 조회만 허용합니다." } }, { status: 405 });
  }
  const url = new URL(request.url);
  const result = await loadHomeDesignPreview({
    siteCode: url.searchParams.get("siteCode"),
    pageKey: url.searchParams.get("pageKey"),
    previewToken: url.searchParams.get("previewToken"),
    env: options?.env,
    adminOrigin: options?.adminOrigin,
  });
  const status =
    result.status === "ready"
      ? 200
      : result.status === "need-selection"
        ? 400
        : result.status === "missing"
          ? 404
          : result.status === "forbidden"
            ? 403
            : result.status === "admin-down"
              ? 503
              : 400;
  return Response.json({ ok: result.status === "ready", data: result }, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Home-Design-Mode": "dev-preview" } });
}
