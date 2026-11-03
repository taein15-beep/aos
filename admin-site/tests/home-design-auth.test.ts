import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { handleHomeDesignAuthRequest } from "../lib/admin/home-design/auth/auth-router.ts";
import { findHomeDesignDevUser } from "../lib/admin/home-design/auth/fixtures.ts";
import {
  assertHomeDesignAuthAllowed,
  createHomeDesignSession,
  createPreviewToken,
  HOME_DESIGN_CSRF_HEADER,
  HOME_DESIGN_SESSION_COOKIE,
  isHomeDesignAuthAllowed,
  parseHomeDesignSession,
  serializeHomeDesignSession,
  sessionCookieHeader,
} from "../lib/admin/home-design/auth/session.ts";
import { handleHomeDesignDraftRequest } from "../lib/admin/home-design/draft-router.ts";
import { createDraftStore, setDefaultDraftStoreForTests } from "../lib/admin/home-design/draft-store.ts";
import { handleHomeDesignPublishRequest } from "../lib/admin/home-design/publish-router.ts";
import { createPublishStore, setDefaultPublishStoreForTests } from "../lib/admin/home-design/publish-store.ts";
import { createSampleSites } from "../lib/admin/home-design/sample-data.ts";
import { isHomeDesignDraftPath } from "../lib/admin/home-design/draft-router.ts";
import { isHomeDesignPublishedPath } from "../lib/admin/home-design/publish-router.ts";
import { isHomeDesignAuthPath } from "../lib/admin/home-design/auth/auth-router.ts";

async function withStores<T>(fn: (stores: { draft: ReturnType<typeof createDraftStore>; publish: ReturnType<typeof createPublishStore> }) => Promise<T>): Promise<T> {
  const draftRoot = await mkdtemp(path.join(os.tmpdir(), "aos-auth-draft-"));
  const publishRoot = await mkdtemp(path.join(os.tmpdir(), "aos-auth-pub-"));
  const draft = createDraftStore({ rootDir: draftRoot, env: "development" });
  const publish = createPublishStore({ rootDir: publishRoot, draftStore: draft, env: "development" });
  setDefaultDraftStoreForTests(draft);
  setDefaultPublishStoreForTests(publish);
  try {
    return await fn({ draft, publish });
  } finally {
    setDefaultDraftStoreForTests(null);
    setDefaultPublishStoreForTests(null);
  }
}

function cookieFrom(response: Response): string {
  const raw = response.headers.getSetCookie?.() ?? [];
  const line = raw.find((item) => item.startsWith(`${HOME_DESIGN_SESSION_COOKIE}=`)) ?? response.headers.get("set-cookie") ?? "";
  const match = line.match(new RegExp(`${HOME_DESIGN_SESSION_COOKIE}=([^;]+)`));
  assert.ok(match, "세션 쿠키가 없습니다.");
  return decodeURIComponent(match[1]);
}

async function login(loginId: string, password: string) {
  const response = await handleHomeDesignAuthRequest(
    new Request("http://localhost:3001/api/admin/home-design/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    }),
  );
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { ok: boolean; data: { session: { csrfToken: string; loginId: string } } };
  assert.equal(payload.ok, true);
  const cookie = cookieFrom(response);
  return { cookie, csrf: payload.data.session.csrfToken, session: payload.data.session };
}

function authHeaders(cookie: string, csrf?: string): HeadersInit {
  const headers: Record<string, string> = { Cookie: `${HOME_DESIGN_SESSION_COOKIE}=${encodeURIComponent(cookie)}` };
  if (csrf) headers[HOME_DESIGN_CSRF_HEADER] = csrf;
  return headers;
}

async function saveSampleDraft(siteIndex = 0) {
  const site = structuredClone(createSampleSites()[siteIndex]);
  const page = site.pages[0];
  const store = (await import("../lib/admin/home-design/draft-store.ts")).getDefaultDraftStore();
  return store.saveDraft({
    site_code: site.site_code,
    pageKey: page.pageKey,
    expectedRevision: 0,
    siteName: site.siteName,
    domains: site.domains,
    siteStatus: site.status,
    tempCode: site.tempCode,
    page,
    media: site.media,
    updatedBy: "test",
  });
}

test("1. 미인증 접근 거부", async () => {
  await withStores(async () => {
    const response = await handleHomeDesignDraftRequest(new Request("http://localhost/api/admin/home-design/drafts/OY01470/main"));
    assert.equal(response.status, 401);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "UNAUTHORIZED");
  });
});

test("2. 인증 사용자 정상 조회", async () => {
  await withStores(async () => {
    await saveSampleDraft(0);
    const { cookie } = await login("oy-master", "dev-oy-master!");
    const response = await handleHomeDesignDraftRequest(
      new Request("http://localhost/api/admin/home-design/drafts/OY01470/main", { headers: authHeaders(cookie) }),
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as { ok: boolean; data: { document: { draft: { site_code: string } } } };
    assert.equal(body.ok, true);
    assert.equal(body.data.document.draft.site_code, "OY01470");
  });
});

test("3. 사이트별 접근 격리", async () => {
  await withStores(async () => {
    await saveSampleDraft(0);
    await saveSampleDraft(1);
    const { cookie } = await login("oy-master", "dev-oy-master!");
    const list = await handleHomeDesignDraftRequest(
      new Request("http://localhost/api/admin/home-design/drafts", { headers: authHeaders(cookie) }),
    );
    const listBody = (await list.json()) as { data: { drafts: { site_code: string }[] } };
    assert.ok(listBody.data.drafts.every((item) => item.site_code === "OY01470"));
    assert.equal(listBody.data.drafts.some((item) => item.site_code === "AOS01005"), false);
  });
});

test("4. 타 여행사 초안 조회 거부", async () => {
  await withStores(async () => {
    await saveSampleDraft(1);
    const { cookie } = await login("oy-master", "dev-oy-master!");
    const response = await handleHomeDesignDraftRequest(
      new Request("http://localhost/api/admin/home-design/drafts/AOS01005/main", { headers: authHeaders(cookie) }),
    );
    assert.equal(response.status, 403);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "SITE_FORBIDDEN");
  });
});

test("5. 타 여행사 초안 수정 거부", async () => {
  await withStores(async () => {
    const site = structuredClone(createSampleSites()[1]);
    const page = site.pages[0];
    const { cookie, csrf } = await login("oy-master", "dev-oy-master!");
    const response = await handleHomeDesignDraftRequest(
      new Request("http://localhost/api/admin/home-design/drafts/AOS01005/main", {
        method: "PUT",
        headers: { ...authHeaders(cookie, csrf), "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 0,
          siteName: site.siteName,
          tempCode: site.tempCode,
          page,
          media: site.media,
          domains: site.domains,
        }),
      }),
    );
    assert.equal(response.status, 403);
  });
});

test("6. 편집 권한 없는 사용자 저장 거부", async () => {
  await withStores(async () => {
    const site = structuredClone(createSampleSites()[0]);
    const page = site.pages[0];
    const { cookie, csrf } = await login("oy-staff", "dev-oy-staff!");
    const response = await handleHomeDesignDraftRequest(
      new Request("http://localhost/api/admin/home-design/drafts/OY01470/main", {
        method: "PUT",
        headers: { ...authHeaders(cookie, csrf), "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 0,
          siteName: site.siteName,
          tempCode: site.tempCode,
          page,
          media: site.media,
          domains: site.domains,
        }),
      }),
    );
    assert.equal(response.status, 403);
    const body = (await response.json()) as { error: { code: string; message: string } };
    assert.equal(body.error.code, "FORBIDDEN");
    assert.match(body.error.message, /home_design\.draft_save/);
  });
});

test("7. 발행 권한 없는 사용자 모의 발행 거부", async () => {
  await withStores(async () => {
    await saveSampleDraft(0);
    const { cookie, csrf } = await login("oy-editor", "dev-oy-editor!");
    const response = await handleHomeDesignPublishRequest(
      new Request("http://localhost/api/admin/home-design/published/OY01470/main", {
        method: "POST",
        headers: { ...authHeaders(cookie, csrf), "Content-Type": "application/json" },
        body: JSON.stringify({ expectedDraftRevision: 1 }),
      }),
    );
    assert.equal(response.status, 403);
    const body = (await response.json()) as { error: { message: string } };
    assert.match(body.error.message, /home_design\.publish_dev/);
  });
});

test("8. 복구 권한 없는 사용자 복원 거부", async () => {
  await withStores(async () => {
    const saved = await saveSampleDraft(0);
    const page = structuredClone(createSampleSites()[0].pages[0]);
    page.name = "rev2";
    const store = (await import("../lib/admin/home-design/draft-store.ts")).getDefaultDraftStore();
    await store.saveDraft({
      site_code: "OY01470",
      pageKey: "main",
      expectedRevision: saved.document.draft.revision,
      siteName: "애비아넥스트 샘플",
      domains: ["avianext.localhost"],
      tempCode: createSampleSites()[0].tempCode,
      page,
      media: createSampleSites()[0].media,
      updatedBy: "test",
    });
    const { cookie, csrf } = await login("oy-editor", "dev-oy-editor!");
    const response = await handleHomeDesignDraftRequest(
      new Request("http://localhost/api/admin/home-design/drafts/OY01470/main/restore", {
        method: "POST",
        headers: { ...authHeaders(cookie, csrf), "Content-Type": "application/json" },
        body: JSON.stringify({ revision: 1, expectedRevision: 2 }),
      }),
    );
    assert.equal(response.status, 403);
    const body = (await response.json()) as { error: { message: string } };
    assert.match(body.error.message, /home_design\.restore/);
  });
});

test("9. 만료 세션 거부", async () => {
  const user = findHomeDesignDevUser("oy-master");
  assert.ok(user);
  const session = createHomeDesignSession(user, Date.now() - 1000 * 60 * 60 * 9);
  session.expiresAt = new Date(Date.now() - 1000).toISOString();
  const cookie = serializeHomeDesignSession(session);
  assert.equal(parseHomeDesignSession(cookie), null);
  await withStores(async () => {
    const response = await handleHomeDesignDraftRequest(
      new Request("http://localhost/api/admin/home-design/drafts/OY01470/main", {
        headers: authHeaders(cookie),
      }),
    );
    assert.equal(response.status, 401);
  });
});

test("10. 위조 세션 및 권한 상승 거부", async () => {
  const user = findHomeDesignDevUser("oy-staff");
  assert.ok(user);
  const session = createHomeDesignSession(user);
  session.permissions = [...session.permissions, "home_design.publish_dev", "home_design.draft_save"];
  session.allowedSiteCodes = ["OY01470", "AOS01005"];
  const forgedPayload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const forged = `${forgedPayload}.invalid-signature`;
  assert.equal(parseHomeDesignSession(forged), null);

  // 서명된 쿠키의 permissions를 바꿔도 서버 시크릿으로 재서명하지 않으면 거부된다.
  const valid = serializeHomeDesignSession(createHomeDesignSession(user));
  const [payload] = valid.split(".");
  const mutated = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  mutated.permissions.push("home_design.publish_dev");
  const tampered = `${Buffer.from(JSON.stringify(mutated)).toString("base64url")}.${valid.split(".")[1]}`;
  assert.equal(parseHomeDesignSession(tampered), null);

  await withStores(async () => {
    await saveSampleDraft(0);
    const { cookie, csrf } = await login("oy-staff", "dev-oy-staff!");
    const response = await handleHomeDesignPublishRequest(
      new Request("http://localhost/api/admin/home-design/published/OY01470/main", {
        method: "POST",
        headers: { ...authHeaders(cookie, csrf), "Content-Type": "application/json" },
        body: JSON.stringify({ expectedDraftRevision: 1 }),
      }),
    );
    assert.equal(response.status, 403);
  });
});

test("11. CSRF 방어", async () => {
  await withStores(async () => {
    const site = structuredClone(createSampleSites()[0]);
    const page = site.pages[0];
    const { cookie } = await login("oy-master", "dev-oy-master!");
    const response = await handleHomeDesignDraftRequest(
      new Request("http://localhost/api/admin/home-design/drafts/OY01470/main", {
        method: "PUT",
        headers: { ...authHeaders(cookie), "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 0,
          siteName: site.siteName,
          tempCode: site.tempCode,
          page,
          media: site.media,
          domains: site.domains,
        }),
      }),
    );
    assert.equal(response.status, 403);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "CSRF_REJECTED");
  });
});

test("12. Vite 미들웨어 우회 차단", async () => {
  assert.equal(isHomeDesignAuthPath("/api/admin/home-design/auth/login"), true);
  assert.equal(isHomeDesignDraftPath("/api/admin/home-design/drafts/OY01470/main"), true);
  assert.equal(isHomeDesignPublishedPath("/api/admin/home-design/published/OY01470/main"), true);
  await withStores(async () => {
    // 미들웨어가 동일 라우터를 호출하므로 미인증 요청은 동일하게 거부된다.
    const response = await handleHomeDesignDraftRequest(new Request("http://localhost/api/admin/home-design/drafts/OY01470/main"));
    assert.equal(response.status, 401);
    const pub = await handleHomeDesignPublishRequest(new Request("http://localhost/api/admin/home-design/published/OY01470/main"));
    assert.equal(pub.status, 401);
  });
});

test("13. 홈페이지 테스트 미리보기 무단 접근 차단", async () => {
  await withStores(async () => {
    await saveSampleDraft(0);
    const noToken = await handleHomeDesignDraftRequest(new Request("http://localhost/api/admin/home-design/drafts/OY01470/main"));
    assert.equal(noToken.status, 401);

    const { cookie, csrf } = await login("oy-master", "dev-oy-master!");
    const tokenRes = await handleHomeDesignAuthRequest(
      new Request("http://localhost/api/admin/home-design/auth/preview-token", {
        method: "POST",
        headers: { ...authHeaders(cookie, csrf), "Content-Type": "application/json" },
        body: JSON.stringify({ siteCode: "OY01470", pageKey: "main", scope: "draft" }),
      }),
    );
    assert.equal(tokenRes.status, 200);
    const tokenBody = (await tokenRes.json()) as { data: { token: string } };
    const ok = await handleHomeDesignDraftRequest(
      new Request("http://localhost/api/admin/home-design/drafts/OY01470/main", {
        headers: { "X-Home-Design-Preview-Token": tokenBody.data.token },
      }),
    );
    assert.equal(ok.status, 200);

    const wrongSite = await handleHomeDesignDraftRequest(
      new Request("http://localhost/api/admin/home-design/drafts/AOS01005/main", {
        headers: { "X-Home-Design-Preview-Token": tokenBody.data.token },
      }),
    );
    assert.equal(wrongSite.status, 403);

    const happy = await login("happy-master", "dev-happy!");
    const happyTokenRes = await handleHomeDesignAuthRequest(
      new Request("http://localhost/api/admin/home-design/auth/preview-token", {
        method: "POST",
        headers: { ...authHeaders(happy.cookie, happy.csrf), "Content-Type": "application/json" },
        body: JSON.stringify({ siteCode: "AOS01005", pageKey: "main", scope: "draft" }),
      }),
    );
    const happyToken = ((await happyTokenRes.json()) as { data: { token: string } }).data.token;
    const cross = await handleHomeDesignDraftRequest(
      new Request("http://localhost/api/admin/home-design/drafts/OY01470/main", {
        headers: { "X-Home-Design-Preview-Token": happyToken },
      }),
    );
    assert.equal(cross.status, 403);
  });
});

test("14. 기존 초안 및 발행 기능 정상 동작", async () => {
  await withStores(async () => {
    const site = structuredClone(createSampleSites()[0]);
    const page = site.pages[0];
    const { cookie, csrf } = await login("oy-master", "dev-oy-master!");
    const save = await handleHomeDesignDraftRequest(
      new Request("http://localhost/api/admin/home-design/drafts/OY01470/main", {
        method: "PUT",
        headers: { ...authHeaders(cookie, csrf), "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 0,
          siteName: site.siteName,
          tempCode: site.tempCode,
          page,
          media: site.media,
          domains: site.domains,
        }),
      }),
    );
    assert.equal(save.status, 200);
    const published = await handleHomeDesignPublishRequest(
      new Request("http://localhost/api/admin/home-design/published/OY01470/main", {
        method: "POST",
        headers: { ...authHeaders(cookie, csrf), "Content-Type": "application/json" },
        body: JSON.stringify({ expectedDraftRevision: 1, note: "auth-test" }),
      }),
    );
    assert.equal(published.status, 200);
    const active = await handleHomeDesignPublishRequest(
      new Request("http://localhost/api/admin/home-design/published/OY01470/main", { headers: authHeaders(cookie) }),
    );
    assert.equal(active.status, 200);

    const tokenRes = await handleHomeDesignAuthRequest(
      new Request("http://localhost/api/admin/home-design/auth/preview-token", {
        method: "POST",
        headers: { ...authHeaders(cookie, csrf), "Content-Type": "application/json" },
        body: JSON.stringify({ siteCode: "OY01470", pageKey: "main", scope: "published" }),
      }),
    );
    const token = ((await tokenRes.json()) as { data: { token: string } }).data.token;
    const viaPreview = await handleHomeDesignPublishRequest(
      new Request("http://localhost/api/admin/home-design/published/OY01470/main", {
        headers: { "X-Home-Design-Preview-Token": token },
      }),
    );
    assert.equal(viaPreview.status, 200);

    // 세션 쿠키 헤더 형식 점검
    const session = parseHomeDesignSession(cookie);
    assert.ok(session);
    assert.match(sessionCookieHeader(cookie), /HttpOnly/);
    assert.match(sessionCookieHeader(cookie), /SameSite=Lax/);
    assert.ok(createPreviewToken(session, { siteCode: "OY01470", pageKey: "main", scope: "draft" }));
  });
});

test("운영 환경에서 개발 인증 거부", () => {
  assert.equal(isHomeDesignAuthAllowed("production"), false);
  assert.equal(isHomeDesignAuthAllowed("development"), true);
  assert.throws(
    () => assertHomeDesignAuthAllowed("production"),
    (error: { code?: string }) => error?.code === "PRODUCTION_FORBIDDEN",
  );
});

test("15. 로그아웃은 복사한 세션 및 기존 미리보기 토큰도 폐기한다", async () => {
  const { cookie, csrf } = await login("oy-master", "dev-oy-master!");
  const session = parseHomeDesignSession(cookie)!;
  const token = createPreviewToken(session, { siteCode: "OY01470", pageKey: "main", scope: "draft" });
  const response = await handleHomeDesignAuthRequest(new Request("http://localhost:3001/api/admin/home-design/auth/logout", {
    method: "POST", headers: authHeaders(cookie, csrf),
  }));
  assert.equal(response.status, 200);
  assert.equal(parseHomeDesignSession(cookie), null);
  const { parsePreviewToken } = await import("../lib/admin/home-design/auth/session.ts");
  assert.equal(parsePreviewToken(token), null);
});

test("16. 로그인 CSRF 및 잘못된 로그인 본문 차단", async () => {
  for (const [headers, body, status] of [
    [{ "Content-Type": "application/json", Origin: "https://evil.example" }, { loginId: "platform", password: "dev-platform!" }, 403],
    [{ "Content-Type": "text/plain" }, { loginId: "platform", password: "dev-platform!" }, 415],
    [{ "Content-Type": "application/json" }, { loginId: [], password: {} }, 400],
  ] as const) {
    const response = await handleHomeDesignAuthRequest(new Request("http://localhost:3001/api/admin/home-design/auth/login", {
      method: "POST", headers, body: JSON.stringify(body),
    }));
    assert.equal(response.status, status);
    assert.equal(response.headers.get("set-cookie"), null);
  }
});

test("17. 고정 기본 키 위조와 손상된 쿠키 거부", async () => {
  const { createHmac } = await import("node:crypto");
  const payload = Buffer.from(JSON.stringify(createHomeDesignSession(findHomeDesignDevUser("platform")!))).toString("base64url");
  const signature = createHmac("sha256", "aos-home-design-dev-secret-local-only").update(payload).digest("base64url");
  assert.equal(parseHomeDesignSession(`${payload}.${signature}`), null);
  const response = await handleHomeDesignDraftRequest(new Request("http://localhost/api/admin/home-design/drafts/OY01470/main", {
    headers: { Cookie: `${HOME_DESIGN_SESSION_COOKIE}=%ZZ` },
  }));
  assert.equal(response.status, 401);
  assert.equal(isHomeDesignAuthAllowed("staging"), false);
  assert.equal(isHomeDesignAuthAllowed(""), false);
});

test("18. 역할명으로 플랫폼 범위를 획득할 수 없다", async () => {
  const { requireSiteAccess, requirePermission } = await import("../lib/admin/home-design/auth/guard.ts");
  const session = createHomeDesignSession({ ...findHomeDesignDevUser("platform")!, platformScope: false });
  assert.throws(() => requireSiteAccess(session, "AOS01005"));
  const noPermission = createHomeDesignSession({ ...findHomeDesignDevUser("platform")!, permissions: [] });
  assert.throws(() => requirePermission(noPermission, "home_design.read"));
});

test("19. 홈페이지 로더부터 관리자까지 토큰 범위·만료·쓰기 금지 확인", async () => {
  await withStores(async () => {
    await saveSampleDraft(0);
    const { loadHomeDesignPreview } = await import("../../website/lib/home-design/load-preview.ts");
    const { loadHomeDesignPublishedPreview } = await import("../../website/lib/home-design/load-published-preview.ts");
    const session = createHomeDesignSession(findHomeDesignDevUser("oy-master")!);
    const token = createPreviewToken(session, { siteCode: "OY01470", pageKey: "main", scope: "draft" });
    const fetchImpl: typeof fetch = async (url, init) => {
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.redirect, "error");
      const request = new Request(url, init);
      return request.url.includes("/published/") ? handleHomeDesignPublishRequest(request) : handleHomeDesignDraftRequest(request);
    };
    const input = { siteCode: "OY01470", pageKey: "main", previewToken: token, env: "test", fetchImpl };
    assert.equal((await loadHomeDesignPreview(input)).status, "ready");
    assert.equal((await loadHomeDesignPreview({ ...input, siteCode: "AOS01005" })).status, "forbidden");
    assert.equal((await loadHomeDesignPreview({ ...input, pageKey: "other" })).status, "forbidden");
    assert.equal((await loadHomeDesignPublishedPreview(input)).status, "forbidden");
    const expired = createPreviewToken(session, { siteCode: "OY01470", pageKey: "main", scope: "draft" }, Date.now() - 700000);
    assert.equal((await loadHomeDesignPreview({ ...input, previewToken: expired })).status, "forbidden");
    const mutation = await handleHomeDesignDraftRequest(new Request("http://localhost/api/admin/home-design/drafts/OY01470/main", {
      method: "PUT", headers: { "X-Home-Design-Preview-Token": token }, body: "{}",
    }));
    assert.equal(mutation.status, 401);
  });
});

test("20. 발행 이력·버전·복구까지 타 사이트 차단 및 판매점 쿠키 분리", async () => {
  const { cookie, csrf } = await login("oy-master", "dev-oy-master!");
  for (const [handler, prefix] of [[handleHomeDesignDraftRequest, "drafts"], [handleHomeDesignPublishRequest, "published"]] as const) {
    for (const suffix of ["", "/versions", ...(prefix === "published" ? ["/history"] : []), "/restore"]) {
      const response = await handler(new Request(`http://localhost/api/admin/home-design/${prefix}/AOS01005/main${suffix}`, {
        method: suffix === "/restore" ? "POST" : "GET", headers: authHeaders(cookie, csrf),
      }));
      assert.equal(response.status, 403);
    }
  }
  const seller = await handleHomeDesignDraftRequest(new Request("http://localhost/api/admin/home-design/drafts/OY01470/main", {
    headers: { Cookie: 'aos_seller_admin_session={"loginId":"platform"}' },
  }));
  assert.equal(seller.status, 401);
});

test("21. 실제 Vite 미들웨어가 미인증 요청을 라우터로 전달하여 거부", async () => {
  const { homeDesignDraftDevServer } = await import("../build/home-design-draft-plugin.ts");
  const { Readable } = await import("node:stream");
  let middleware: Function | undefined;
  const plugin = homeDesignDraftDevServer();
  const configure = plugin.configureServer as Function;
  configure({ middlewares: { use(fn: Function) { middleware = fn; } } });
  for (const endpoint of ["drafts/OY01470/main", "published/OY01470/main", "auth/me"]) {
    const req = Object.assign(Readable.from([]), { method: "GET", url: `/api/admin/home-design/${endpoint}`, headers: { host: "localhost:3001" } });
    const headers: Record<string, string> = {};
    const res = { statusCode: 0, setHeader(key: string, value: string) { headers[key] = value; }, end(body: Buffer) { assert.equal(JSON.parse(body.toString()).ok, false); } };
    await middleware!(req, res, () => assert.fail("보호 API는 다음 미들웨어로 통과하면 안 됩니다."));
    assert.equal(res.statusCode, 401);
    assert.equal(headers["cache-control"], "no-store");
  }
});

test("22. 클라이언트 수정자 위조 무시 및 편집 권한 서버 검사", async () => {
  await withStores(async () => {
    const { cookie, csrf } = await login("oy-master", "dev-oy-master!");
    const site = createSampleSites()[0];
    const body = { expectedRevision: 0, siteName: site.siteName, tempCode: site.tempCode, page: site.pages[0], media: site.media, updatedBy: "forged-admin" };
    const save = await handleHomeDesignDraftRequest(new Request("http://localhost/api/admin/home-design/drafts/OY01470/main", {
      method: "PUT", headers: { ...authHeaders(cookie, csrf), "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    assert.equal(save.status, 200);
    assert.equal((await save.json()).data.document.draft.updatedBy, "oy-master");
    const publish = await handleHomeDesignPublishRequest(new Request("http://localhost/api/admin/home-design/published/OY01470/main", {
      method: "POST", headers: { ...authHeaders(cookie, csrf), "Content-Type": "application/json" }, body: JSON.stringify({ expectedDraftRevision: 1, publishedBy: "forged-admin" }),
    }));
    assert.equal(publish.status, 200);
    assert.equal((await publish.json()).data.document.published.publishedBy, "oy-master");
    const restricted = createHomeDesignSession({ ...findHomeDesignDevUser("oy-master")!, permissions: ["home_design.draft_save"] });
    const rejected = await handleHomeDesignDraftRequest(new Request("http://localhost/api/admin/home-design/drafts/OY01470/main", {
      method: "PUT", headers: authHeaders(serializeHomeDesignSession(restricted), restricted.csrfToken), body: JSON.stringify(body),
    }));
    assert.equal(rejected.status, 403);
  });
});
