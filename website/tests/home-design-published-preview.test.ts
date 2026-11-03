import assert from "node:assert/strict";
import test from "node:test";
import { createSampleSites } from "../../admin-site/lib/admin/home-design/sample-data.ts";
import {
  HOME_DRAFT_SCHEMA,
  HOME_PUBLISHED_SCHEMA,
  type HomeDesignPublishedDocument,
} from "../../packages/home-design-contract/src/index.ts";
import {
  handleHomeDesignPublishedPreviewRequest,
  loadHomeDesignPublishedPreview,
} from "../lib/home-design/load-published-preview.ts";

function publishedFrom(siteIndex = 0, pageIndex = 0): HomeDesignPublishedDocument {
  const site = structuredClone(createSampleSites()[siteIndex]);
  const page = site.pages[pageIndex];
  return {
    schema: HOME_PUBLISHED_SCHEMA,
    pageKey: page.pageKey,
    siteName: site.siteName,
    domains: site.domains,
    siteStatus: site.status,
    published: {
      id: `pub-${site.site_code}-${page.pageKey}-1`,
      site_code: site.site_code,
      pageKey: page.pageKey,
      version: 2,
      payload: { tempCode: site.tempCode, pages: [page], media: site.media },
      renderer: "website-json",
      status: "active",
      sourceDraftRevision: 4,
      publishedAt: page.updatedAt,
      publishedBy: "dev-local",
      note: "개발 전용 모의 발행",
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

test("1. 활성 발행본 조회", async () => {
  const published = publishedFrom(0, 0);
  published.published.payload.pages[0].name = "발행된 메인";
  const result = await loadHomeDesignPublishedPreview({
    siteCode: "OY01470",
    pageKey: "main",
    previewToken: "dev-preview-token",
    env: "development",
    fetchImpl: async (input, init) => {
      const url = String(input);
      assert.match(url, /\/published\/OY01470\/main/);
      assert.doesNotMatch(url, /\/drafts\//);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("X-Home-Design-Preview-Token"), "dev-preview-token");
      return jsonResponse({ ok: true, data: { document: published } });
    },
  });
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    assert.equal(result.document.published.version, 2);
    assert.equal(result.document.published.sourceDraftRevision, 4);
    assert.equal(result.document.published.payload.pages[0].name, "발행된 메인");
  }
});

test("2. 발행본 없음 안내", async () => {
  const result = await loadHomeDesignPublishedPreview({
    siteCode: "OY01470",
    pageKey: "company",
    previewToken: "dev-preview-token",
    env: "development",
    fetchImpl: async () => jsonResponse({ ok: false, error: { code: "NOT_FOUND" } }, 404),
  });
  assert.equal(result.status, "missing");
  if (result.status === "missing") {
    assert.match(result.message, /활성 발행본이 없습니다/);
  }
});

test("3. 초안 스키마는 발행본으로 거부", async () => {
  const site = createSampleSites()[0];
  const page = site.pages[0];
  const draftDoc = {
    schema: HOME_DRAFT_SCHEMA,
    pageKey: page.pageKey,
    siteName: site.siteName,
    domains: site.domains,
    siteStatus: site.status,
    draft: {
      id: "draft-x",
      site_code: site.site_code,
      pageId: page.id,
      payload: { tempCode: site.tempCode, pages: [page], media: site.media },
      revision: 1,
      status: "saved",
      updatedAt: page.updatedAt,
      updatedBy: "dev-local",
    },
  };
  const result = await loadHomeDesignPublishedPreview({
    siteCode: "OY01470",
    pageKey: "main",
    previewToken: "dev-preview-token",
    env: "development",
    fetchImpl: async () => jsonResponse({ ok: true, data: { document: draftDoc } }),
  });
  assert.equal(result.status, "invalid");
});

test("4. 운영 환경 차단", async () => {
  const result = await loadHomeDesignPublishedPreview({
    siteCode: "OY01470",
    pageKey: "main",
    env: "production",
    fetchImpl: async () => {
      throw new Error("production must not fetch");
    },
  });
  assert.equal(result.status, "forbidden");
  const response = await handleHomeDesignPublishedPreviewRequest(
    new Request("http://localhost:3002/api/dev/home-design-published-preview?siteCode=OY01470&pageKey=main"),
    { env: "production" },
  );
  assert.equal(response.status, 403);
});


test("5. 미리보기 토큰 없으면 차단", async () => {
  const result = await loadHomeDesignPublishedPreview({
    siteCode: "OY01470",
    pageKey: "main",
    env: "development",
    fetchImpl: async () => {
      throw new Error("must not fetch without token");
    },
  });
  assert.equal(result.status, "forbidden");
});
