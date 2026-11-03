"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isHomeSectionType, visibleSections, type HomeDesignViewport } from "../../../packages/home-design-contract/src/index.ts";
import {
  DESIGN_PUBLISHED_PREVIEW_API_PATH,
  type HomeDesignPublishedPreviewResult,
} from "@/lib/home-design/load-published-preview";
import { PreviewSection, UnsupportedSection } from "../design-preview/SectionRenderers";
import "../design-preview/design-preview.css";

const HINT_SITES = [
  { siteCode: "OY01470", label: "애비아넥스트 샘플" },
  { siteCode: "AOS01005", label: "해피투어 샘플" },
];

export function DesignPublishedPreviewApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteFromUrl = searchParams.get("siteCode") ?? "";
  const pageFromUrl = searchParams.get("pageKey") ?? "";
  const tokenFromUrl = searchParams.get("previewToken") ?? "";
  const [siteCode, setSiteCode] = useState(siteFromUrl);
  const [pageKey, setPageKey] = useState(pageFromUrl);
  const [viewport, setViewport] = useState<HomeDesignViewport>("pc");
  const [result, setResult] = useState<HomeDesignPublishedPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (nextSite: string, nextPage: string, token: string) => {
    if (!nextSite.trim() || !nextPage.trim()) {
      setResult({ status: "need-selection" });
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        siteCode: nextSite.trim(),
        pageKey: nextPage.trim(),
      });
      if (token) params.set("previewToken", token);
      const response = await fetch(`${DESIGN_PUBLISHED_PREVIEW_API_PATH}?${params}`);
      const payload = (await response.json()) as { data: HomeDesignPublishedPreviewResult };
      setResult(payload.data);
    } catch {
      setResult({
        status: "admin-down",
        message: "발행본 미리보기 API에 연결하지 못했습니다. website 개발 서버와 관리자 3001을 확인하세요.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSiteCode(siteFromUrl);
    setPageKey(pageFromUrl);
    if (siteFromUrl && pageFromUrl) {
      void load(siteFromUrl, pageFromUrl, tokenFromUrl);
    } else {
      setResult({ status: "need-selection" });
    }
  }, [siteFromUrl, pageFromUrl, tokenFromUrl]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (siteCode.trim()) params.set("siteCode", siteCode.trim());
    if (pageKey.trim()) params.set("pageKey", pageKey.trim());
    if (tokenFromUrl) params.set("previewToken", tokenFromUrl);
    router.replace(`/design-published-preview${params.toString() ? `?${params}` : ""}`);
  };

  const page = result?.status === "ready" ? result.document.published.payload.pages[0] : null;
  const sections = useMemo(() => (page ? visibleSections(page) : []), [page]);

  return (
    <main className="dp-page">
      <div className="dp-banner" role="status">
        <strong>개발 전용 발행본 미리보기</strong> — 관리자에서 발급한 미리보기 토큰이 필요합니다. 초안은 `/design-preview` 를 사용하세요. 운영 홈과 연결되어 있지 않습니다.
      </div>
      <form className="dp-toolbar" onSubmit={submit}>
        <label className="dp-field">
          사이트코드
          <input
            list="dpp-site-hints"
            value={siteCode}
            onChange={(event) => setSiteCode(event.target.value)}
            placeholder="직접 입력"
            aria-label="사이트코드"
          />
          <datalist id="dpp-site-hints">
            {HINT_SITES.map((item) => (
              <option key={item.siteCode} value={item.siteCode}>
                {item.label}
              </option>
            ))}
          </datalist>
        </label>
        <label className="dp-field">
          페이지코드
          <input value={pageKey} onChange={(event) => setPageKey(event.target.value)} placeholder="예: main" aria-label="페이지코드" />
        </label>
        <button type="submit" className="dp-btn dp-btn-primary" disabled={loading}>
          {loading ? "불러오는 중…" : "발행본 불러오기"}
        </button>
        <div className="dp-viewport" role="group" aria-label="미리보기 화면">
          <button type="button" className={viewport === "pc" ? "active" : ""} onClick={() => setViewport("pc")}>
            PC
          </button>
          <button type="button" className={viewport === "mobile" ? "active" : ""} onClick={() => setViewport("mobile")}>
            모바일
          </button>
        </div>
        {result?.status === "ready" ? (
          <span className="dp-meta">
            {result.document.siteName} · {result.pageKey} · 발행 v{result.document.published.version} · 초안 rev{" "}
            {result.document.published.sourceDraftRevision}
          </span>
        ) : null}
      </form>

      {result?.status === "need-selection" ? (
        <div className="dp-empty">사이트코드와 페이지코드를 입력한 뒤 불러오세요. 기본값으로 OY01470을 넣지 않습니다.</div>
      ) : null}
      {result?.status === "missing" ? <div className="dp-missing">{result.message}</div> : null}
      {result?.status === "admin-down" || result?.status === "invalid" || result?.status === "forbidden" ? (
        <div className="dp-error">{result.message}</div>
      ) : null}

      {page ? (
        <div className="dp-stage" data-viewport={viewport}>
          <header className="dp-hero align-left" style={{ minHeight: 88, padding: "18px 22px", background: "#071a34" }}>
            <small>모의 발행본 테스트 헤더</small>
            <b style={{ fontSize: 22 }}>{result && result.status === "ready" ? result.document.siteName : "발행본 미리보기"}</b>
          </header>
          {sections.map((section) =>
            isHomeSectionType(section.type) ? (
              <PreviewSection key={section.id} section={section} viewport={viewport} />
            ) : (
              <UnsupportedSection key={section.id} type={section.type} />
            ),
          )}
          <footer className="dp-footer">
            <b>테스트 푸터</b>
            운영 홈 푸터가 아닙니다. 모의 발행본 미리보기 전용입니다.
          </footer>
        </div>
      ) : null}
    </main>
  );
}
