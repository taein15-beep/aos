const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h1", "h2", "h3", "span", "div"]);

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

export function escapeHtmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function stripHtmlToText(html: string): string {
  return decodeBasicEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

/** 허용 태그 외 HTML을 제거하고 이벤트/스크립트 URL을 차단한다. */
export function sanitizeHomeHtml(input: string): string {
  if (!input) return "";
  let html = input.replace(/<\s*(script|style|iframe|object|embed|link|meta|form|textarea|input)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  html = html.replace(/<\s*(script|style|iframe|object|embed|link|meta|form|textarea|input)[^>]*\/?\s*>/gi, "");
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/javascript\s*:/gi, "");
  html = html.replace(/data\s*:/gi, "");
  html = html.replace(/vbscript\s*:/gi, "");
  html = html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (all, rawTag: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (tag === "br") return "<br/>";
    return all.startsWith("</") ? `</${tag}>` : `<${tag}>`;
  });
  return html;
}

export function safeHref(url: string): string | undefined {
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^(https?:\/\/|\/|#)/i.test(trimmed) && !/^(javascript|data|vbscript):/i.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}
