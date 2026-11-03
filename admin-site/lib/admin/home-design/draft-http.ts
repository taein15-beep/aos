import { DraftStoreError } from "./draft-store.ts";
import { DEV_DRAFT_MODE } from "./draft-store.ts";

function modeHeader(mode = DEV_DRAFT_MODE) {
  return { "X-Home-Design-Mode": mode, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
}

export function draftOk(data: unknown, status = 200, mode = DEV_DRAFT_MODE): Response {
  return Response.json({ ok: true, data }, { status, headers: modeHeader(mode) });
}

export function draftFail(status: number, code: string, message: string, mode = DEV_DRAFT_MODE): Response {
  return Response.json({ ok: false, error: { code, message } }, { status, headers: modeHeader(mode) });
}

export function draftRouteError(error: unknown): Response {
  if (error instanceof DraftStoreError) {
    return draftFail(error.status, error.code, error.message);
  }
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : "알 수 없는 오류";
  console.error("[home-design-draft]", error);
  return draftFail(
    500,
    "INTERNAL_ERROR",
    process.env.NODE_ENV === "production" ? "초안 요청을 처리하지 못했습니다." : `초안 요청을 처리하지 못했습니다. (${detail})`,
  );
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new DraftStoreError(400, "INVALID_JSON", "올바른 JSON 요청이 필요합니다.");
  }
}
