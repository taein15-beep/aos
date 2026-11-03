import { handleHomeDesignAuthRequest } from "@/lib/admin/home-design/auth/auth-router";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleHomeDesignAuthRequest(request);
}
