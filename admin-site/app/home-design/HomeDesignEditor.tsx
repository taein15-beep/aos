"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, History, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import type { StoredHomeDraft } from "@/lib/admin/home-design/draft-store";
import type { HomeDesignPublishedDocument } from "@/lib/admin/home-design/types";
import {
  addSectionCard,
  applyDraftPage,
  patchSectionCard,
  patchSectionProps,
  removeSection,
  removeSectionCard,
  renameSection,
  reorderSections,
  replacePageSections,
  toggleSectionEnabled,
} from "@/lib/admin/home-design/editor-ops";
import { createEmptySection, createSampleSites } from "@/lib/admin/home-design/sample-data";
import {
  HOME_SECTION_TYPE_LABEL,
  HOME_SECTION_TYPES,
  primaryDomain,
  type HomeDesignViewport,
  type HomeSection,
  type HomeSectionCard,
  type HomeSectionProperties,
  type HomeSectionType,
  type HomeSite,
} from "@/lib/admin/home-design/types";
import { PreviewCanvas } from "./PreviewCanvas";
import { PropertyPanel } from "./PropertyPanel";

import { can, homeDesignApi, type HomeDesignPublicSession } from "./home-design-auth";

type VersionItem = { revision: number; updatedAt: string; updatedBy: string };
type PublishVersionItem = {
  version: number;
  publishedAt: string;
  publishedBy: string;
  status: string;
  sourceDraftRevision: number;
  note: string;
};
type PublishHistoryItem = {
  id: string;
  versionId: string;
  actor: string;
  startedAt: string;
  finishedAt: string;
  result: string;
  errorMessage: string;
};

function cloneSites() {
  return structuredClone(createSampleSites());
}

function draftUrl(siteCode: string, pageKey: string, suffix = "") {
  return `/api/admin/home-design/drafts/${encodeURIComponent(siteCode)}/${encodeURIComponent(pageKey)}${suffix}`;
}

function publishedUrl(siteCode: string, pageKey: string, suffix = "") {
  return `/api/admin/home-design/published/${encodeURIComponent(siteCode)}/${encodeURIComponent(pageKey)}${suffix}`;
}

function formatSavedAt(iso: string | null) {
  if (!iso) return "저장된 초안 없음";
  return `마지막 저장 ${new Date(iso).toLocaleString("ko-KR")}`;
}

export function HomeDesignEditor() {
  const [session, setSession] = useState<HomeDesignPublicSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginId, setLoginId] = useState("oy-master");
  const [password, setPassword] = useState("dev-oy-master!");
  const [loggingIn, setLoggingIn] = useState(false);
  const [sites, setSites] = useState<HomeSite[]>(cloneSites);
  const [siteCode, setSiteCode] = useState(() => cloneSites()[0].site_code);
  const [pageKey, setPageKey] = useState("main");
  const [selectedId, setSelectedId] = useState<string | null>(() => cloneSites()[0].pages[0].sections[0]?.id ?? null);
  const [viewport, setViewport] = useState<HomeDesignViewport>("pc");
  const [dirty, setDirty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [versionPreview, setVersionPreview] = useState<StoredHomeDraft | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publishedVersion, setPublishedVersion] = useState(0);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishVersions, setPublishVersions] = useState<PublishVersionItem[]>([]);
  const [publishHistory, setPublishHistory] = useState<PublishHistoryItem[]>([]);
  const [publishPreview, setPublishPreview] = useState<HomeDesignPublishedDocument | null>(null);

  const visibleSites = useMemo(() => {
    if (!session) return [] as HomeSite[];
    return sites.filter((item) => session.allowedSiteCodes.includes(item.site_code));
  }, [sites, session]);

  const site = visibleSites.find((item) => item.site_code === siteCode) ?? visibleSites[0] ?? sites[0];
  const page = site.pages.find((item) => item.pageKey === pageKey) ?? site.pages[0];
  const sections = page.sections;
  const selected = sections.find((item) => item.id === selectedId) ?? null;
  const csrf = session?.csrfToken;

  const applyDocument = (document: StoredHomeDraft) => {
    const nextPage = document.draft.payload.pages[0];
    if (!nextPage) return;
    setSites((current) =>
      current.map((item) =>
        item.site_code === document.draft.site_code
          ? applyDraftPage(item, nextPage, document.draft.payload.media, document.draft.payload.tempCode)
          : item,
      ),
    );
    setSelectedId(nextPage.sections[0]?.id ?? null);
    setRevision(document.draft.revision);
    setLastSavedAt(document.draft.updatedAt);
    setDirty(false);
  };

  const loadDraft = async (nextSite: string, nextPage: string, silent = false) => {
    setLoadingDraft(true);
    try {
      const result = await homeDesignApi<{ document: StoredHomeDraft }>(draftUrl(nextSite, nextPage));
      if (result.ok) {
        applyDocument(result.data.document);
        if (!silent) setStatus({ tone: "ok", text: "저장된 초안을 불러왔습니다. 운영 홈에는 반영되지 않습니다." });
        return;
      }
      if (result.error.code === "NOT_FOUND") {
        setRevision(0);
        setLastSavedAt(null);
        setPublishedVersion(0);
        setPublishedAt(null);
        if (!silent) setStatus({ tone: "info", text: "이 페이지의 저장된 초안이 없어 샘플 데이터를 유지합니다." });
        return;
      }
      setStatus({ tone: "error", text: result.error.message });
    } catch {
      setStatus({ tone: "error", text: "초안을 불러오지 못했습니다." });
    } finally {
      setLoadingDraft(false);
      await loadPublished(nextSite, nextPage);
    }
  };

  const loadPublished = async (nextSite: string, nextPage: string) => {
    const result = await homeDesignApi<{ document: HomeDesignPublishedDocument }>(publishedUrl(nextSite, nextPage));
    if (result.ok) {
      setPublishedVersion(result.data.document.published.version);
      setPublishedAt(result.data.document.published.publishedAt);
      return;
    }
    if (result.status === 401 || result.status === 403) {
      setStatus({ tone: "error", text: result.error.message });
    }
    setPublishedVersion(0);
    setPublishedAt(null);
  };

  const applySession = (next: HomeDesignPublicSession) => {
    setSession(next);
    const allowed = sites.filter((item) => next.allowedSiteCodes.includes(item.site_code));
    const nextSite = allowed.find((item) => item.site_code === siteCode) ?? allowed[0];
    if (nextSite) {
      setSiteCode(nextSite.site_code);
      const nextPage = nextSite.pages.find((item) => item.pageKey === pageKey) ?? nextSite.pages[0];
      setPageKey(nextPage.pageKey);
      setSelectedId(nextPage.sections[0]?.id ?? null);
    }
  };

  const refreshSession = async () => {
    setAuthLoading(true);
    try {
      const result = await homeDesignApi<{ session: HomeDesignPublicSession }>("/api/admin/home-design/auth/me");
      if (result.ok) applySession(result.data.session);
      else setSession(null);
    } catch {
      setSession(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadDraft(site.site_code, page.pageKey, true);
  }, [session?.userId, site.site_code, page.pageKey]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoggingIn(true);
    setStatus(null);
    try {
      const result = await homeDesignApi<{ session: HomeDesignPublicSession }>("/api/admin/home-design/auth/login", {
        method: "POST",
        body: JSON.stringify({ loginId, password }),
      });
      if (!result.ok) {
        setStatus({ tone: "error", text: result.error.message });
        return;
      }
      applySession(result.data.session);
      setStatus({ tone: "ok", text: "개발용 홈디자인 계정으로 로그인했습니다. 운영 계정과 연결되어 있지 않습니다." });
    } catch {
      setStatus({ tone: "error", text: "로그인에 실패했습니다." });
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = async () => {
    if (!session) return;
    await homeDesignApi("/api/admin/home-design/auth/logout", { method: "POST", csrfToken: session.csrfToken });
    setSession(null);
    setStatus({ tone: "info", text: "로그아웃했습니다." });
  };

  const confirmIfDirty = () => {
    if (!dirty) return true;
    return window.confirm("저장하지 않은 변경사항이 있습니다. 이동하면 현재 수정 내용이 사라집니다. 계속할까요?");
  };

  const markDirty = () => {
    setDirty(true);
    setStatus(null);
  };

  const updatePage = (mutator: (current: HomeSection[]) => HomeSection[]) => {
    if (!can(session, "home_design.edit")) return;
    markDirty();
    setSites((current) =>
      current.map((item) => (item.site_code === site.site_code ? replacePageSections(item, page.pageKey, mutator(page.sections)) : item)),
    );
  };

  const changeSite = (nextCode: string) => {
    if (nextCode === siteCode) return;
    if (!confirmIfDirty()) return;
    if (session && !session.allowedSiteCodes.includes(nextCode)) {
      setStatus({ tone: "error", text: "접근이 허용되지 않은 사이트입니다." });
      return;
    }
    const next = visibleSites.find((item) => item.site_code === nextCode) ?? visibleSites[0];
    if (!next) return;
    setDirty(false);
    setRevision(0);
    setLastSavedAt(null);
    setStatus(null);
    setSiteCode(next.site_code);
    setPageKey(next.pages[0].pageKey);
    setSelectedId(next.pages[0].sections[0]?.id ?? null);
  };

  const changePage = (nextKey: string) => {
    if (nextKey === pageKey) return;
    if (!confirmIfDirty()) return;
    const next = site.pages.find((item) => item.pageKey === nextKey) ?? site.pages[0];
    setDirty(false);
    setRevision(0);
    setLastSavedAt(null);
    setStatus(null);
    setPageKey(next.pageKey);
    setSelectedId(next.sections[0]?.id ?? null);
  };

  const addSection = (gubun: HomeSectionType) => {
    const created = createEmptySection(site, page, gubun, sections.length + 1);
    updatePage((list) => [...list, created]);
    setSelectedId(created.id);
    setAddOpen(false);
  };

  const resetSample = () => {
    if (!confirmIfDirty()) return;
    const fresh = cloneSites();
    setSites(fresh);
    setSiteCode(fresh[0].site_code);
    setPageKey("main");
    setSelectedId(fresh[0].pages[0].sections[0]?.id ?? null);
    setDirty(false);
    setRevision(0);
    setLastSavedAt(null);
    setPublishedVersion(0);
    setPublishedAt(null);
    setAddOpen(false);
    setPreviewOpen(false);
    setStatus({ tone: "info", text: "샘플 데이터로 되돌렸습니다. 저장된 초안 파일은 삭제하지 않았습니다." });
  };

  const saveDraft = async () => {
    setSaving(true);
    setStatus({ tone: "info", text: "초안 저장 중…" });
    try {
      if (!csrf || !can(session, "home_design.draft_save")) {
        setStatus({ tone: "error", text: "초안 저장 권한이 없습니다." });
        return;
      }
      const result = await homeDesignApi<{ document: StoredHomeDraft }>(draftUrl(site.site_code, page.pageKey), {
        method: "PUT",
        csrfToken: csrf,
        body: JSON.stringify({
          expectedRevision: revision,
          site_code: site.site_code,
          pageKey: page.pageKey,
          siteName: site.siteName,
          domains: site.domains,
          siteStatus: site.status,
          tempCode: site.tempCode,
          page,
          media: site.media,
          updatedBy: session?.loginId,
        }),
      });
      if (!result.ok) {
        setStatus({
          tone: "error",
          text:
            result.error.code === "STALE_DRAFT"
              ? `저장 충돌: ${result.error.message}`
              : result.status === 401
                ? "세션이 만료되었습니다. 다시 로그인하세요."
                : result.error.message,
        });
        return;
      }
      applyDocument(result.data.document);
      setStatus({ tone: "ok", text: `초안 revision ${result.data.document.draft.revision} 을 로컬 JSON에 저장했습니다.` });
    } catch {
      setStatus({ tone: "error", text: "초안 저장에 실패했습니다. 기존 파일은 유지됩니다." });
    } finally {
      setSaving(false);
    }
  };

  const openVersions = async () => {
    setVersionOpen(true);
    setVersionPreview(null);
    const result = await homeDesignApi<{ versions: VersionItem[] }>(draftUrl(site.site_code, page.pageKey, "/versions"));
    if (result.ok) setVersions(result.data.versions);
    else setStatus({ tone: "error", text: result.error.message });
  };

  const previewVersion = async (version: number) => {
    const result = await homeDesignApi<{ document: StoredHomeDraft }>(draftUrl(site.site_code, page.pageKey, `/versions?revision=${version}`));
    if (result.ok) setVersionPreview(result.data.document);
    else setStatus({ tone: "error", text: result.error.message });
  };

  const websiteOrigin = process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || "http://localhost:3002";

  const openWebsitePreview = async (source: "draft" | "published") => {
    if (!csrf || !can(session, "home_design.preview")) {
      setStatus({ tone: "error", text: "미리보기 권한이 없습니다." });
      return;
    }
    if (source === "draft" && dirty) {
      const ok = window.confirm("저장하지 않은 변경사항은 테스트 홈페이지에 반영되지 않습니다. 마지막으로 저장한 초안만 표시됩니다. 열까요?");
      if (!ok) return;
    }
    if (source === "draft" && revision === 0) {
      const ok = window.confirm("저장된 초안이 없습니다. 테스트 페이지는 초안 없음 안내를 표시합니다. 열까요?");
      if (!ok) return;
    }
    if (source === "published" && publishedVersion === 0) {
      const ok = window.confirm("활성 발행본이 없습니다. 모의 발행 후 확인할 수 있습니다. 열까요?");
      if (!ok) return;
    }
    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) previewWindow.opener = null;
    const tokenResult = await homeDesignApi<{ token: string }>("/api/admin/home-design/auth/preview-token", {
      method: "POST",
      csrfToken: csrf,
      body: JSON.stringify({ siteCode: site.site_code, pageKey: page.pageKey, scope: source }),
    });
    if (!tokenResult.ok) {
      previewWindow?.close();
      setStatus({ tone: "error", text: tokenResult.error.message });
      return;
    }
    const path = source === "published" ? "/design-published-preview" : "/design-preview";
    const url = `${websiteOrigin}${path}?siteCode=${encodeURIComponent(site.site_code)}&pageKey=${encodeURIComponent(page.pageKey)}&previewToken=${encodeURIComponent(tokenResult.data.token)}`;
    if (previewWindow) previewWindow.location.replace(url);
    else window.location.assign(url);
  };

  const publishDraft = async () => {
    if (dirty) {
      setStatus({ tone: "error", text: "저장하지 않은 변경사항이 있습니다. 먼저 초안을 저장한 뒤 모의 발행하세요." });
      return;
    }
    if (revision === 0) {
      setStatus({ tone: "error", text: "저장된 초안이 없습니다. 먼저 초안을 저장하세요." });
      return;
    }
    if (!csrf || !can(session, "home_design.publish_dev")) {
      setStatus({ tone: "error", text: "모의 발행 권한이 없습니다." });
      return;
    }
    setPublishing(true);
    setStatus({ tone: "info", text: "모의 발행 중…" });
    try {
      const result = await homeDesignApi<{ document: HomeDesignPublishedDocument }>(publishedUrl(site.site_code, page.pageKey), {
        method: "POST",
        csrfToken: csrf,
        body: JSON.stringify({ expectedDraftRevision: revision, publishedBy: session?.loginId, note: "개발 전용 모의 발행" }),
      });
      if (!result.ok) {
        setStatus({ tone: "error", text: result.error.message });
        return;
      }
      setPublishedVersion(result.data.document.published.version);
      setPublishedAt(result.data.document.published.publishedAt);
      setStatus({
        tone: "ok",
        text: `모의 발행 v${result.data.document.published.version} 완료 (초안 rev ${result.data.document.published.sourceDraftRevision}). 실홈·운영 파일은 변경되지 않았습니다.`,
      });
    } catch {
      setStatus({ tone: "error", text: "모의 발행에 실패했습니다. 기존 활성 발행본은 유지됩니다." });
    } finally {
      setPublishing(false);
    }
  };

  const openPublishHistory = async () => {
    setPublishOpen(true);
    setPublishPreview(null);
    const versionsResult = await homeDesignApi<{ versions: PublishVersionItem[] }>(publishedUrl(site.site_code, page.pageKey, "/versions"));
    const historyResult = await homeDesignApi<{ history: PublishHistoryItem[] }>(publishedUrl(site.site_code, page.pageKey, "/history"));
    if (versionsResult.ok) setPublishVersions(versionsResult.data.versions);
    else setStatus({ tone: "error", text: versionsResult.error.message });
    if (historyResult.ok) setPublishHistory(historyResult.data.history);
  };

  const previewPublished = async (version: number) => {
    const result = await homeDesignApi<{ document: HomeDesignPublishedDocument }>(publishedUrl(site.site_code, page.pageKey, `/versions?version=${version}`));
    if (result.ok) setPublishPreview(result.data.document);
    else setStatus({ tone: "error", text: result.error.message });
  };

  const restorePublished = async (version: number) => {
    if (!csrf || !can(session, "home_design.restore")) {
      setStatus({ tone: "error", text: "복구 권한이 없습니다." });
      return;
    }
    if (!window.confirm(`발행본 v${version} 을 현재 초안으로 복사할까요? 활성 발행본과 실홈은 바뀌지 않습니다.`)) return;
    const result = await homeDesignApi<{ document: StoredHomeDraft }>(publishedUrl(site.site_code, page.pageKey, "/restore"), {
      method: "POST",
      csrfToken: csrf,
      body: JSON.stringify({ version, expectedDraftRevision: revision }),
    });
    if (!result.ok) {
      setStatus({ tone: "error", text: result.error.message });
      return;
    }
    applyDocument(result.data.document);
    setPublishOpen(false);
    setStatus({ tone: "ok", text: `발행본 v${version} 을 초안으로 복구했습니다. 활성 발행본을 바꾸려면 다시 모의 발행하세요.` });
  };

  const restoreVersion = async (version: number) => {
    if (!csrf || !can(session, "home_design.restore")) {
      setStatus({ tone: "error", text: "복구 권한이 없습니다." });
      return;
    }
    if (!window.confirm(`revision ${version} 을 현재 초안으로 복원할까요? 실홈에는 반영되지 않습니다.`)) return;
    const result = await homeDesignApi<{ document: StoredHomeDraft }>(draftUrl(site.site_code, page.pageKey, "/restore"), {
      method: "POST",
      csrfToken: csrf,
      body: JSON.stringify({ revision: version, expectedRevision: revision }),
    });
    if (!result.ok) {
      setStatus({ tone: "error", text: result.error.message });
      return;
    }
    applyDocument(result.data.document);
    setVersionOpen(false);
    setStatus({ tone: "ok", text: `revision ${version} 을 현재 초안으로 복원했습니다.` });
  };

  const selectedLabel = useMemo(() => {
    if (!selected) return "섹션 미선택";
    return `${HOME_SECTION_TYPE_LABEL[selected.type]} · ${selected.name}`;
  }, [selected]);

  if (authLoading) {
    return (
      <main className="hd-page">
        <div className="hd-banner">개발용 세션 확인 중…</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="hd-page">
        <div className="hd-banner" role="status">
          <strong>개발 전용 인증</strong> — 운영 로그인과 연결되어 있지 않습니다. fixture 계정으로만 테스트하세요.
        </div>
        {status ? <div className={`hd-status is-${status.tone}`}>{status.text}</div> : null}
        <form className="hd-auth-card" onSubmit={(event) => void login(event)}>
          <h2>홈디자인 개발 로그인</h2>
          <p>예: oy-master / dev-oy-master! · oy-staff / dev-oy-staff! · platform / dev-platform!</p>
          <label className="hd-field">
            로그인 ID
            <input className="hd-input" value={loginId} onChange={(event) => setLoginId(event.target.value)} autoComplete="username" />
          </label>
          <label className="hd-field">
            비밀번호
            <input
              className="hd-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="hd-btn hd-btn-save" disabled={loggingIn}>
            {loggingIn ? "로그인 중…" : "개발 로그인"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="hd-page">
      <div className="hd-banner" role="status">
        <span>
          <strong>개발 전용 초안·모의 발행</strong> — {session.displayName} · {session.agencyName} · 허용 사이트{" "}
          {session.allowedSiteCodes.join(", ")}. 운영 DB·실홈과 연결되어 있지 않습니다.
        </span>
        <span className="hd-auth-actions">
          <button type="button" className="hd-btn" onClick={() => void logout()}>
            로그아웃
          </button>
          <button type="button" className="hd-btn" onClick={resetSample}>
            <RotateCcw size={14} />
            샘플 초기화
          </button>
        </span>
      </div>

      <div className="hd-toolbar">
        <div className="hd-toolbar-left">
          <label className="hd-field">
            홈페이지
            <select value={site.site_code} onChange={(event) => changeSite(event.target.value)} aria-label="홈페이지 선택">
              {visibleSites.map((item) => (
                <option key={item.site_code} value={item.site_code}>
                  {item.siteName} ({item.site_code})
                </option>
              ))}
            </select>
          </label>
          <label className="hd-field">
            페이지
            <select value={page.pageKey} onChange={(event) => changePage(event.target.value)} aria-label="페이지 선택">
              {site.pages.map((item) => (
                <option key={item.pageKey} value={item.pageKey}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="hd-viewport" role="group" aria-label="미리보기 화면">
            <button type="button" className={viewport === "pc" ? "active" : ""} onClick={() => setViewport("pc")}>
              PC
            </button>
            <button type="button" className={viewport === "mobile" ? "active" : ""} onClick={() => setViewport("mobile")}>
              모바일
            </button>
          </div>
          <span className={`hd-dirty${dirty ? " is-on" : ""}`}>수정 중 · 저장 안 됨</span>
          <span className="hd-saved">
            {loadingDraft ? "초안 확인 중…" : formatSavedAt(lastSavedAt)}
            {revision > 0 ? ` · 초안 rev ${revision}` : ""}
            {publishedVersion > 0
              ? ` · 발행 v${publishedVersion}${publishedAt ? ` · ${new Date(publishedAt).toLocaleString("ko-KR")}` : ""}`
              : " · 발행본 없음"}
          </span>
        </div>
        <div className="hd-toolbar-right">
          <button
            type="button"
            className="hd-btn"
            onClick={() => void loadDraft(site.site_code, page.pageKey)}
            disabled={loadingDraft || saving || !can(session, "home_design.read")}
          >
            초안 불러오기
          </button>
          <button type="button" className="hd-btn" onClick={() => void openVersions()} disabled={!can(session, "home_design.read")}>
            <History size={14} />
            버전
          </button>
          <button
            type="button"
            className="hd-btn hd-btn-save"
            onClick={() => void saveDraft()}
            disabled={saving || !can(session, "home_design.draft_save")}
            title={!can(session, "home_design.draft_save") ? "초안 저장 권한이 없습니다." : undefined}
          >
            <Save size={14} />
            {saving ? "저장 중…" : "초안 저장 (개발)"}
          </button>
          <button type="button" className="hd-btn" onClick={() => setPreviewOpen(true)}>
            미리보기
          </button>
          <button
            type="button"
            className="hd-btn"
            onClick={() => void openWebsitePreview("draft")}
            disabled={!can(session, "home_design.preview")}
            title="저장된 초안만 홈페이지 테스트 경로에서 확인합니다."
          >
            <ExternalLink size={14} />
            초안 테스트 보기
          </button>
          <button
            type="button"
            className="hd-btn"
            onClick={() => void openWebsitePreview("published")}
            disabled={!can(session, "home_design.preview")}
            title="활성 모의 발행본만 표시합니다."
          >
            발행본 테스트 보기
          </button>
          <button type="button" className="hd-btn" onClick={() => void openPublishHistory()} disabled={!can(session, "home_design.read")}>
            발행 이력
          </button>
          <button
            type="button"
            className="hd-btn hd-btn-save"
            onClick={() => void publishDraft()}
            disabled={publishing || saving || dirty || revision === 0 || !can(session, "home_design.publish_dev")}
            title={
              !can(session, "home_design.publish_dev")
                ? "모의 발행 권한이 없습니다."
                : dirty
                  ? "저장하지 않은 변경이 있으면 모의 발행할 수 없습니다."
                  : "개발 전용 모의 발행. 실홈 파일을 쓰지 않습니다."
            }
          >
            <Upload size={14} />
            {publishing ? "발행 중…" : "모의 발행 (개발)"}
          </button>
          <button type="button" className="hd-btn-primary hd-btn" disabled title="운영용 라이브 적용은 비활성입니다. 모의 발행과 별개입니다.">
            라이브 적용
          </button>
        </div>
      </div>
      {status ? (
        <div className={`hd-status is-${status.tone}`} role="status">
          {status.text}
        </div>
      ) : null}

      <div className="hd-body">
        <section className="hd-col hd-left" aria-label="섹션 목록">
          <div className="hd-col-head">
            <h2>섹션 목록</h2>
            <span>{sections.length}개</span>
          </div>
          <div className="hd-scroll">
            <div className="hd-section-list">
              {sections.map((item, index) => (
                <div
                  key={item.id}
                  className={`hd-section-item${item.id === selectedId ? " is-selected" : ""}${item.enabled ? "" : " is-off"}`}
                  onClick={() => setSelectedId(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setSelectedId(item.id);
                  }}
                >
                  <span className="hd-section-handle">☰</span>
                  <div className="hd-section-text">
                    <small>
                      {index + 1}. [{HOME_SECTION_TYPE_LABEL[item.type]}]
                    </small>
                    <b>{item.name}</b>
                  </div>
                  <fieldset disabled={!can(session, "home_design.edit")} className="hd-section-tools hd-permission-fieldset" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="hd-icon" aria-label="위로" disabled={index === 0} onClick={() => updatePage((list) => reorderSections(list, item.id, -1))}>
                      <ChevronUp size={14} />
                    </button>
                    <button type="button" className="hd-icon" aria-label="아래로" disabled={index === sections.length - 1} onClick={() => updatePage((list) => reorderSections(list, item.id, 1))}>
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      className={`hd-switch${item.enabled ? " on" : ""}`}
                      aria-label="표시 여부"
                      onClick={() => updatePage((list) => toggleSectionEnabled(list, item.id))}
                    >
                      <i />
                    </button>
                    <button
                      type="button"
                      className="hd-icon danger"
                      aria-label="삭제"
                      onClick={() => {
                        if (!confirm(`‘${item.name}’ 섹션을 삭제할까요? 샘플 데이터만 변경됩니다.`)) return;
                        updatePage((list) => removeSection(list, item.id));
                        if (selectedId === item.id) setSelectedId(null);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </fieldset>
                </div>
              ))}
            </div>
            <button type="button" className="hd-btn hd-add" disabled={!can(session, "home_design.edit")} onClick={() => setAddOpen(true)}>
              <Plus size={14} />
              섹션 추가
            </button>
          </div>
        </section>

        <section className="hd-col hd-center" aria-label="홈페이지 미리보기">
          <div className="hd-preview-head">
            <strong>홈페이지 미리보기</strong>
            <em>
              {primaryDomain(site)} · {page.name} · {viewport === "pc" ? "PC" : "모바일"}
            </em>
            <span>{selectedLabel}</span>
          </div>
          <div className="hd-preview-scroll">
            <PreviewCanvas sections={sections} selectedId={selectedId} viewport={viewport} onSelect={setSelectedId} />
          </div>
        </section>

        <section className="hd-col hd-right" aria-label="속성 편집">
          <div className="hd-col-head">
            <h2>속성 편집</h2>
            <span>{selected ? HOME_SECTION_TYPE_LABEL[selected.type] : "미선택"}</span>
          </div>
          <div className="hd-scroll">
            <fieldset className="hd-permission-fieldset" disabled={!can(session, "home_design.edit")}>
            <PropertyPanel
              section={selected}
              onChangeRowName={(name) => updatePage((list) => renameSection(list, selectedId ?? "", name))}
              onChangeSet={(patch: Partial<HomeSectionProperties>) => updatePage((list) => patchSectionProps(list, selectedId ?? "", patch))}
              onChangeCard={(cardId, patch: Partial<HomeSectionCard>) => updatePage((list) => patchSectionCard(list, selectedId ?? "", cardId, patch))}
              onAddCard={() => {
                if (!selected) return;
                const created = addSectionCard(selected);
                updatePage((list) => list.map((item) => (item.id === selectedId ? { ...item, cards: [...item.cards, created] } : item)));
              }}
              onRemoveCard={(cardId) => updatePage((list) => removeSectionCard(list, selectedId ?? "", cardId))}
            />
            </fieldset>
          </div>
        </section>
      </div>

      {addOpen ? (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal hd-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3>섹션 추가</h3>
              <button type="button" onClick={() => setAddOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <p>샘플 섹션을 현재 페이지 맨 아래에 추가합니다. 운영 데이터에는 기록되지 않습니다.</p>
            <div className="hd-type-grid">
              {HOME_SECTION_TYPES.map((type) => (
                <button type="button" key={type} onClick={() => addSection(type)}>
                  {HOME_SECTION_TYPE_LABEL[type]}
                  <small>{type}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {previewOpen ? (
        <div className="modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="modal hd-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3>페이지 미리보기 · {page.name}</h3>
              <button type="button" onClick={() => setPreviewOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="hd-preview-scroll">
              <PreviewCanvas sections={sections} selectedId={selectedId} viewport={viewport} onSelect={setSelectedId} />
            </div>
          </div>
        </div>
      ) : null}

      {publishOpen ? (
        <div className="modal-backdrop" onClick={() => setPublishOpen(false)}>
          <div className="modal hd-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3>모의 발행 이력 · {page.name}</h3>
              <button type="button" onClick={() => setPublishOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <p className="hd-version-help">
              개발 전용 모의 발행본입니다. 복구는 초안으로만 복사되며, 활성 발행본과 실홈은 즉시 바뀌지 않습니다.
            </p>
            <div className="hd-version-layout">
              <div className="hd-version-list">
                <strong className="hd-history-label">발행 버전</strong>
                {publishVersions.length ? (
                  publishVersions.map((item) => (
                    <div key={item.version} className={`hd-version-item${publishPreview?.published.version === item.version ? " is-selected" : ""}`}>
                      <button type="button" onClick={() => void previewPublished(item.version)}>
                        <b>
                          v{item.version} · {item.status}
                        </b>
                        <small>
                          {new Date(item.publishedAt).toLocaleString("ko-KR")} · 초안 rev {item.sourceDraftRevision}
                        </small>
                      </button>
                      <button
                        type="button"
                        className="hd-btn"
                        onClick={() => void restorePublished(item.version)}
                        disabled={!can(session, "home_design.restore")}
                        title={!can(session, "home_design.restore") ? "복구 권한이 없습니다." : undefined}
                      >
                        초안 복구
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="hd-empty">발행본이 없습니다. 초안을 모의 발행하면 목록에 나타납니다.</p>
                )}
                <strong className="hd-history-label">처리 이력</strong>
                {publishHistory.length ? (
                  publishHistory.map((item) => (
                    <div key={item.id} className="hd-history-item">
                      <b className={item.result === "error" ? "is-error" : ""}>{item.result === "ok" ? "성공" : "실패"}</b>
                      <small>
                        {new Date(item.finishedAt).toLocaleString("ko-KR")} · {item.actor}
                        {item.errorMessage ? ` · ${item.errorMessage}` : ""}
                      </small>
                    </div>
                  ))
                ) : (
                  <p className="hd-empty">기록된 발행 이력이 없습니다.</p>
                )}
              </div>
              <div className="hd-preview-scroll">
                {publishPreview?.published.payload.pages[0] ? (
                  <PreviewCanvas
                    sections={publishPreview.published.payload.pages[0].sections}
                    selectedId={null}
                    viewport={viewport}
                    onSelect={() => undefined}
                  />
                ) : (
                  <p className="hd-empty">왼쪽에서 발행 버전을 선택하면 미리보기만 표시합니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {versionOpen ? (
        <div className="modal-backdrop" onClick={() => setVersionOpen(false)}>
          <div className="modal hd-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3>초안 버전 · {page.name}</h3>
              <button type="button" onClick={() => setVersionOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <p className="hd-version-help">이전 저장본은 로컬 JSON에만 있습니다. 복원해도 실홈은 바뀌지 않습니다.</p>
            <div className="hd-version-layout">
              <div className="hd-version-list">
                {versions.length ? (
                  versions.map((item) => (
                    <div key={item.revision} className={`hd-version-item${versionPreview?.draft.revision === item.revision ? " is-selected" : ""}`}>
                      <button type="button" onClick={() => void previewVersion(item.revision)}>
                        <b>rev {item.revision}</b>
                        <small>
                          {new Date(item.updatedAt).toLocaleString("ko-KR")} · {item.updatedBy}
                        </small>
                      </button>
                      <button
                        type="button"
                        className="hd-btn"
                        onClick={() => void restoreVersion(item.revision)}
                        disabled={!can(session, "home_design.restore")}
                        title={!can(session, "home_design.restore") ? "복원 권한이 없습니다." : undefined}
                      >
                        복원
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="hd-empty">보존된 이전 버전이 없습니다. 초안을 두 번 이상 저장하면 목록에 나타납니다.</p>
                )}
              </div>
              <div className="hd-preview-scroll">
                {versionPreview?.draft.payload.pages[0] ? (
                  <PreviewCanvas
                    sections={versionPreview.draft.payload.pages[0].sections}
                    selectedId={null}
                    viewport={viewport}
                    onSelect={() => undefined}
                  />
                ) : (
                  <p className="hd-empty">왼쪽에서 버전을 선택하면 미리보기만 표시합니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
