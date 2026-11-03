import { handleHomeDesignPublishRequest } from "@/lib/admin/home-design/publish-router";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleHomeDesignPublishRequest(request);
}
