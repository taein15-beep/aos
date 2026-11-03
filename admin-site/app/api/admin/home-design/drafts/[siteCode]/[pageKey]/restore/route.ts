import { handleHomeDesignDraftRequest } from "@/lib/admin/home-design/draft-router";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleHomeDesignDraftRequest(request);
}
