import { isHomeSectionType, type HomeDesignViewport, type HomePage, type HomeSection, type HomeSectionCard } from "./types.ts";

export type SectionFrameStyle = {
  marginLeft: string;
  marginRight: string;
  marginTop: string;
  marginBottom: string;
  minHeight: string | undefined;
  textAlign: HomeSection["props"]["align"];
};

export function visibleSections(page: HomePage): HomeSection[] {
  return [...page.sections].filter((section) => section.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function visibleCards(section: HomeSection): HomeSectionCard[] {
  return [...section.cards].filter((card) => card.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function sectionFrameStyle(section: HomeSection, viewport: HomeDesignViewport): SectionFrameStyle {
  const height = viewport === "mobile" ? section.props.heightMob : section.props.heightPc;
  return {
    marginLeft: `${section.props.marginLeft || 0}px`,
    marginRight: `${section.props.marginRight || 0}px`,
    marginTop: `${section.props.marginTop || 0}px`,
    marginBottom: `${section.props.marginBottom || 0}px`,
    minHeight: height > 0 ? `${height}px` : undefined,
    textAlign: section.props.align,
  };
}

export function isSupportedPreviewSection(section: { type: string }): boolean {
  return isHomeSectionType(section.type);
}
