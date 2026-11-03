import type { HomeDesignPermission } from "@/lib/admin/home-design/types";

export type HomeDesignPublicSession = {
  userId: string;
  loginId: string;
  displayName: string;
  agencyId: string;
  agencyName: string;
  role: string;
  permissions: HomeDesignPermission[];
  allowedSiteCodes: string[];
  platformScope: boolean;
  expiresAt: string;
  csrfToken: string;
  authMode: string;
  warning: string;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string }; status: number };

export async function homeDesignApi<T>(url: string, init?: RequestInit & { csrfToken?: string }): Promise<ApiResult<T>> {
  const headers = new Headers(init?.headers);
  if (init?.csrfToken) headers.set("X-CSRF-Token", init.csrfToken);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  const payload = (await response.json()) as { ok: boolean; data?: T; error?: { code: string; message: string } };
  if (!payload.ok) {
    return { ok: false, error: payload.error ?? { code: "UNKNOWN", message: "요청에 실패했습니다." }, status: response.status };
  }
  return { ok: true, data: payload.data as T };
}

export function can(session: HomeDesignPublicSession | null, permission: HomeDesignPermission): boolean {
  return !!session?.permissions.includes(permission);
}
