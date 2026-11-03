import type { SampleImagePreset } from "./types.ts";

export const SAMPLE_IMAGE_PRESETS: SampleImagePreset[] = [
  { id: "hero-ocean", label: "히어로 · 바다", tone: "#1d4ed8", accent: "#7dd3fc" },
  { id: "hero-city", label: "히어로 · 도시", tone: "#0f172a", accent: "#94a3b8" },
  { id: "hero-mountain", label: "히어로 · 산", tone: "#166534", accent: "#86efac" },
  { id: "card-danang", label: "카드 · 다낭", tone: "#0369a1", accent: "#67e8f9" },
  { id: "card-osaka", label: "카드 · 오사카", tone: "#9f1239", accent: "#fda4af" },
  { id: "card-jeju", label: "카드 · 제주", tone: "#0f766e", accent: "#5eead4" },
  { id: "card-mongolia", label: "카드 · 몽골", tone: "#b45309", accent: "#fcd34d" },
  { id: "plain-light", label: "단색 · 밝은 회색", tone: "#e2e8f0", accent: "#f8fafc" },
];

export function getSampleImagePreset(id: string): SampleImagePreset {
  return SAMPLE_IMAGE_PRESETS.find((item) => item.id === id) ?? SAMPLE_IMAGE_PRESETS[0];
}

export function mediaSwatchStyle(mediaId: string | null | undefined): { background: string } {
  const preset = getSampleImagePreset(mediaId || "plain-light");
  return { background: `linear-gradient(135deg, ${preset.tone}, ${preset.accent})` };
}
