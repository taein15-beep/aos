export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}
export function ok(data: unknown, status = 200) { return Response.json({ data }, { status }); }
export function routeError(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: { code: error.code, message: error.message, details: error.details } }, { status: error.status });
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  if (message.includes("DATABASE_NOT_CONFIGURED") || message.includes("D1 binding")) return Response.json({ error: { code: "DATABASE_NOT_CONFIGURED", message: "데이터베이스 연결 설정이 필요합니다." } }, { status: 503 });
  if (message.includes("no such table")) return Response.json({ error: { code: "DATABASE_MIGRATION_REQUIRED", message: "스탬프투어 데이터베이스 마이그레이션 적용이 필요합니다." } }, { status: 503 });
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "요청을 처리하지 못했습니다." } }, { status: 500 });
}
export async function jsonBody<T>(request: Request): Promise<T> { try { return await request.json() as T; } catch { throw new ApiError(400, "INVALID_JSON", "올바른 JSON 요청이 필요합니다."); } }
export function required(value: unknown, field: string): string { if (typeof value !== "string" || !value.trim()) throw new ApiError(400, "VALIDATION_ERROR", `${field} 값이 필요합니다.`); return value.trim(); }
