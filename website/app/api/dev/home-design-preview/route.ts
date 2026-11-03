import { handleHomeDesignPreviewRequest } from "@/lib/home-design/load-preview";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleHomeDesignPreviewRequest(request);
}
