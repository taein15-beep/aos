import { handleHomeDesignDraftRequest } from "@/lib/admin/home-design/draft-router";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleHomeDesignDraftRequest(request);
}

export async function PUT(request: Request) {
  return handleHomeDesignDraftRequest(request);
}
