import { handleHomeDesignPublishedPreviewRequest } from "@/lib/home-design/load-published-preview";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleHomeDesignPublishedPreviewRequest(request);
}
