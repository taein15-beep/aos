import assert from "node:assert/strict";
import test from "node:test";
import { createSampleSites } from "../../admin-site/lib/admin/home-design/sample-data.ts";
import {
  HOME_DESIGN_CONTRACT_VERSION,
  HOME_DRAFT_SCHEMA,
  HOME_PUBLISHED_SCHEMA,
  isSupportedPreviewSection,
  sanitizeHomeHtml,
  sectionFrameStyle,
  visibleCards,
  visibleSections,
  type HomeDesignDraftDocument,
  type HomePage,
} from "../../packages/home-design-contract/src/index.ts";
import { handleHomeDesignPreviewRequest, loadHomeDesignPreview } from "../lib/home-design/load-preview.ts";

function documentFrom(siteIndex = 0, pageIndex = 0): HomeDesignDraftDocument {
  const site = structuredClone(createSampleSites()[siteIndex]);
  const page = site.pages[pageIndex];
  return {
    schema: HOME_DRAFT_SCHEMA,
    pageKey: page.pageKey,
    siteName: site.siteName,
    domains: site.domains,
    siteStatus: site.status,
    draft: {
      id: `draft-${site.site_code}-${page.pageKey}`,
      site_code: site.site_code,
      pageId: page.id,
      payload: { tempCode: site.tempCode, pages: [page], media: site.media },
      revision: 1,
      status: "saved",
      updatedAt: page.updatedAt,
      updatedBy: page.updatedBy,
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

test("계약 버전이 관리자·홈페이지 공유 패키지에 명시된다", () => {
  assert.equal(HOME_DESIGN_CONTRACT_VERSION, "1.1.0");
  assert.equal(HOME_DRAFT_SCHEMA, "aos-home-draft-v1");
  assert.equal(HOME_PUBLISHED_SCHEMA, "aos-home-published-v1");
});

test("1. 관리자 초안 조회", async () => {
  const document = documentFrom(0, 0);
  const result = await loadHomeDesignPreview({
    siteCode: "OY01470",
    pageKey: "main",
    previewToken: "dev-preview-token",
    env: "development",
    fetchImpl: async () => jsonResponse({ ok: true, data: { document } }),
  });
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    assert.equal(result.document.draft.site_code, "OY01470");
    assert.equal(result.document.pageKey, "main");
    assert.equal(result.document.draft.payload.pages[0].sections[0].name, "메인 비주얼");
  }
});

test("2. 사이트별 데이터 분리", async () => {
  const first = documentFrom(0, 0);
  const second = documentFrom(1, 0);
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/OY01470/")) return jsonResponse({ ok: true, data: { document: first } });
    if (url.includes("/AOS01005/")) return jsonResponse({ ok: true, data: { document: second } });
    return jsonResponse({ ok: false }, 404);
  };
  const a = await loadHomeDesignPreview({ siteCode: "OY01470", pageKey: "main", previewToken: "dev-preview-token", env: "development", fetchImpl });
  const b = await loadHomeDesignPreview({ siteCode: "AOS01005", pageKey: "main", previewToken: "dev-preview-token", env: "development", fetchImpl });
  assert.equal(a.status, "ready");
  assert.equal(b.status, "ready");
  if (a.status === "ready" && b.status === "ready") {
    assert.equal(a.document.siteName, "애비아넥스트 샘플");
    assert.equal(b.document.siteName, "해피투어 샘플");
    assert.notEqual(a.document.draft.payload.pages[0].sections[0].id, b.document.draft.payload.pages[0].sections[0].id);
  }
});

test("3. 페이지별 데이터 분리", async () => {
  const main = documentFrom(0, 0);
  const company = documentFrom(0, 1);
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/main")) return jsonResponse({ ok: true, data: { document: main } });
    if (url.endsWith("/company")) return jsonResponse({ ok: true, data: { document: company } });
    return jsonResponse({ ok: false }, 404);
  };
  const a = await loadHomeDesignPreview({ siteCode: "OY01470", pageKey: "main", previewToken: "dev-preview-token", env: "development", fetchImpl });
  const b = await loadHomeDesignPreview({ siteCode: "OY01470", pageKey: "company", previewToken: "dev-preview-token", env: "development", fetchImpl });
  assert.equal(a.status, "ready");
  assert.equal(b.status, "ready");
  if (a.status === "ready" && b.status === "ready") {
    assert.equal(a.document.draft.payload.pages[0].pageKey, "main");
    assert.equal(b.document.draft.payload.pages[0].pageKey, "company");
    assert.equal(b.document.draft.payload.pages[0].sections[0].type, "html");
  }
});

test("4. 비활성 섹션 미노출", () => {
  const page = documentFrom(0, 0).draft.payload.pages[0];
  const rendered = visibleSections(page);
  assert.ok(page.sections.some((section) => section.type === "video" && !section.enabled));
  assert.equal(rendered.some((section) => section.type === "video"), false);
  assert.ok(rendered.every((section) => section.enabled));
});

test("5. 섹션 정렬 유지", () => {
  const page: HomePage = structuredClone(documentFrom(0, 0).draft.payload.pages[0]);
  page.sections[0].sortOrder = 3;
  page.sections[1].sortOrder = 1;
  page.sections[2].sortOrder = 2;
  const order = visibleSections(page).map((section) => section.id);
  assert.deepEqual(order.slice(0, 3), ["sample-section-1002", "sample-section-1003", "sample-section-1001"]);
});

test("6. 텍스트·색상·높이 렌더링", () => {
  const banner = documentFrom(0, 0).draft.payload.pages[0].sections[0];
  const pc = sectionFrameStyle(banner, "pc");
  const mobile = sectionFrameStyle(banner, "mobile");
  assert.equal(pc.minHeight, "460px");
  assert.equal(mobile.minHeight, "320px");
  assert.equal(pc.textAlign, "left");
  const card = visibleCards(banner)[0];
  assert.equal(card.text1, "2026 해외여행");
  assert.equal(card.text1Color, "#ffffff");
  assert.equal(card.text2Color, "#ffffff");
});

test("7. 지원하지 않는 섹션 처리", () => {
  assert.equal(isSupportedPreviewSection({ type: "unknown-widget" }), false);
  const html = sanitizeHomeHtml("<p>정상</p><unknown>무시</unknown>");
  assert.match(html, /정상/);
  assert.doesNotMatch(html, /unknown/);
});

test("8. 잘못된 데이터 거부", async () => {
  const broken = documentFrom(0, 0);
  broken.draft.payload.pages[0].sections[1].id = broken.draft.payload.pages[0].sections[0].id;
  const duplicate = await loadHomeDesignPreview({
    siteCode: "OY01470",
    pageKey: "main",
    previewToken: "dev-preview-token",
    env: "development",
    fetchImpl: async () => jsonResponse({ ok: true, data: { document: broken } }),
  });
  assert.equal(duplicate.status, "invalid");

  const badJson = await loadHomeDesignPreview({
    siteCode: "OY01470",
    pageKey: "main",
    previewToken: "dev-preview-token",
    env: "development",
    fetchImpl: async () => new Response("{not-json", { status: 200 }),
  });
  assert.equal(badJson.status, "invalid");

  const xss = sanitizeHomeHtml(`<p>안내</p><script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">x</a>`);
  assert.equal(xss.includes("script"), false);
  assert.equal(xss.includes("onerror"), false);
  assert.equal(xss.includes("javascript"), false);
  assert.match(xss, /안내/);
});

test("9. 개발 환경 외 테스트 페이지 차단", async () => {
  const result = await loadHomeDesignPreview({
    siteCode: "OY01470",
    pageKey: "main",
    env: "production",
    fetchImpl: async () => {
      throw new Error("production must not fetch");
    },
  });
  assert.equal(result.status, "forbidden");
  const response = await handleHomeDesignPreviewRequest(new Request("http://localhost:3002/api/dev/home-design-preview?siteCode=OY01470&pageKey=main"), {
    env: "production",
  });
  assert.equal(response.status, 403);
});

test("10. 관리자 서버 중단 시 오류 처리", async () => {
  const result = await loadHomeDesignPreview({
    siteCode: "OY01470",
    pageKey: "main",
    previewToken: "dev-preview-token",
    env: "development",
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
  });
  assert.equal(result.status, "admin-down");
  if (result.status === "admin-down") {
    assert.match(result.message, /3001/);
  }
  const missing = await loadHomeDesignPreview({
    siteCode: "OY01470",
    pageKey: "main",
    previewToken: "dev-preview-token",
    env: "development",
    fetchImpl: async () => jsonResponse({ ok: false, error: { code: "NOT_FOUND" } }, 404),
  });
  assert.equal(missing.status, "missing");
});


test("11. 미리보기 토큰 없으면 차단", async () => {
  const result = await loadHomeDesignPreview({
    siteCode: "OY01470",
    pageKey: "main",
    env: "development",
    fetchImpl: async () => {
      throw new Error("must not fetch without token");
    },
  });
  assert.equal(result.status, "forbidden");
  const withToken = await loadHomeDesignPreview({
    siteCode: "OY01470",
    pageKey: "main",
    previewToken: "dev-preview-token",
    env: "development",
    fetchImpl: async (_input, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("X-Home-Design-Preview-Token"), "dev-preview-token");
      return jsonResponse({ ok: true, data: { document: documentFrom(0, 0) } });
    },
  });
  assert.equal(withToken.status, "ready");
});
