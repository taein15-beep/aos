import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { handleHomeDesignAuthRequest, isHomeDesignAuthPath } from "../lib/admin/home-design/auth/auth-router.ts";
import { handleHomeDesignDraftRequest, isHomeDesignDraftPath } from "../lib/admin/home-design/draft-router.ts";
import { handleHomeDesignPublishRequest, isHomeDesignPublishedPath } from "../lib/admin/home-design/publish-router.ts";

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  const method = req.method?.toUpperCase() ?? "GET";
  if (method === "GET" || method === "HEAD") return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

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
  const method = req.method ?? "GET";
  const body = await readBody(req);
  if (!body) return new Request(url, { method, headers });
  return new Request(url, { method, headers, body: new Uint8Array(body).buffer });
}

async function writeNodeResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}

export function homeDesignDraftDevServer(): Plugin {
  return {
    name: "aos-home-design-draft-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url ?? "").split("?")[0];
        const isAuth = isHomeDesignAuthPath(pathname);
        const isDraft = isHomeDesignDraftPath(pathname);
        const isPublished = isHomeDesignPublishedPath(pathname);
        if (!isAuth && !isDraft && !isPublished) {
          next();
          return;
        }
        try {
          const request = await incomingToRequest(req);
          const response = isAuth
            ? await handleHomeDesignAuthRequest(request)
            : isPublished
              ? await handleHomeDesignPublishRequest(request)
              : await handleHomeDesignDraftRequest(request);
          await writeNodeResponse(res, response);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
