import { handleHomeDesignPublishRequest } from "@/lib/admin/home-design/publish-router";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleHomeDesignPublishRequest(request);
}
