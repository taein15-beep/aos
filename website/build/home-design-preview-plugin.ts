import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { DESIGN_PREVIEW_API_PATH, handleHomeDesignPreviewRequest } from "../lib/home-design/load-preview.ts";
import {
  DESIGN_PUBLISHED_PREVIEW_API_PATH,
  handleHomeDesignPublishedPreviewRequest,
} from "../lib/home-design/load-published-preview.ts";

async function incomingToRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "127.0.0.1";
  const url = `http://${host}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  return new Request(url, { method: req.method ?? "GET", headers });
}

export function homeDesignPreviewDevServer(): Plugin {
  return {
    name: "aos-home-design-preview-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res: ServerResponse, next) => {
        const pathname = (req.url ?? "").split("?")[0];
        const isDraft = pathname === DESIGN_PREVIEW_API_PATH;
        const isPublished = pathname === DESIGN_PUBLISHED_PREVIEW_API_PATH;
        if (!isDraft && !isPublished) {
          next();
          return;
        }
        try {
          const request = await incomingToRequest(req);
          const response = isPublished
            ? await handleHomeDesignPublishedPreviewRequest(request)
            : await handleHomeDesignPreviewRequest(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
