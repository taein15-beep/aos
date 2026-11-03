import { emptyCard, emptySection } from "./defaults.ts";
import { HOME_SECTION_TYPE_LABEL, type HomeMedia, type HomePage, type HomeSection, type HomeSectionCard, type HomeSectionProperties, type HomeSectionType, type HomeSite } from "./types.ts";

export function findPage(site: HomeSite, pageKey: string): HomePage | undefined {
  return site.pages.find((page) => page.pageKey === pageKey);
}

export function applyDraftPage(site: HomeSite, page: HomePage, media: HomeMedia[], tempCode: string): HomeSite {
  const exists = site.pages.some((item) => item.pageKey === page.pageKey);
  return {
    ...site,
    tempCode,
    media,
    updatedAt: page.updatedAt,
    updatedBy: page.updatedBy,
    pages: exists
      ? site.pages.map((item) => (item.pageKey === page.pageKey ? page : item))
      : [...site.pages, page],
  };
}

export function reorderSections(sections: HomeSection[], sectionId: string, direction: -1 | 1): HomeSection[] {
  const index = sections.findIndex((item) => item.id === sectionId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sections.length) return sections;
  const next = [...sections];
  const [row] = next.splice(index, 1);
  next.splice(target, 0, row);
  return next.map((item, sortOrder) => ({ ...item, sortOrder: sortOrder + 1 }));
}

export function toggleSectionEnabled(sections: HomeSection[], sectionId: string): HomeSection[] {
  return sections.map((item) => (item.id === sectionId ? { ...item, enabled: !item.enabled } : item));
}

export function removeSection(sections: HomeSection[], sectionId: string): HomeSection[] {
  return sections.filter((item) => item.id !== sectionId).map((item, index) => ({ ...item, sortOrder: index + 1 }));
}

export function addSection(page: HomePage, type: HomeSectionType, created: HomeSection): HomePage {
  return { ...page, sections: [...page.sections, { ...created, pageId: page.id, sortOrder: page.sections.length + 1 }] };
}

export function renameSection(sections: HomeSection[], sectionId: string, name: string): HomeSection[] {
  return sections.map((item) => (item.id === sectionId ? { ...item, name } : item));
}

export function patchSectionProps(sections: HomeSection[], sectionId: string, patch: Partial<HomeSectionProperties>): HomeSection[] {
  return sections.map((item) => (item.id === sectionId ? { ...item, props: { ...item.props, ...patch } } : item));
}

export function patchSectionCard(sections: HomeSection[], sectionId: string, cardId: string, patch: Partial<HomeSectionCard>): HomeSection[] {
  return sections.map((item) =>
    item.id === sectionId
      ? { ...item, cards: item.cards.map((card) => (card.id === cardId ? { ...card, ...patch } : card)) }
      : item,
  );
}

export function addSectionCard(section: HomeSection): HomeSectionCard {
  const nextNum = Math.max(0, ...section.cards.map((item) => item.sortOrder)) + 1;
  return emptyCard(nextNum, {
    id: `${section.id}-card-${nextNum}`,
    text1: `${HOME_SECTION_TYPE_LABEL[section.type]} ${nextNum}`,
    text2: "샘플",
    mediaIdPc: "plain-light",
    mediaIdMob: "plain-light",
  });
}

export function removeSectionCard(sections: HomeSection[], sectionId: string, cardId: string): HomeSection[] {
  return sections.map((item) =>
    item.id === sectionId ? { ...item, cards: item.cards.filter((card) => card.id !== cardId) } : item,
  );
}

export function replacePageSections(site: HomeSite, pageKey: string, sections: HomeSection[]): HomeSite {
  return {
    ...site,
    pages: site.pages.map((page) => (page.pageKey === pageKey ? { ...page, sections } : page)),
  };
}

export function createEditorSection(site: HomeSite, page: HomePage, type: HomeSectionType, uid: number): HomeSection {
  const name = HOME_SECTION_TYPE_LABEL[type];
  const first = emptyCard(1, {
    id: `sample-card-${uid}-1`,
    mediaIdPc: type === "banner" ? "hero-city" : "plain-light",
    mediaIdMob: type === "banner" ? "hero-city" : "plain-light",
    text1: `${name} 샘플`,
    text2: "속성을 수정하면 미리보기에 바로 반영됩니다.",
    textData1: type === "html" ? "<p>HTML 샘플 본문</p>" : "",
  });
  return emptySection(page, type, page.sections.length + 1, {
    id: `sample-section-${uid}`,
    name,
    legacyUid: uid,
    props: {
      titles: name,
      titlesUsage: true,
      html: type === "html" ? "<p>HTML 샘플 본문</p>" : "",
      videoUrl: type === "video" ? "https://example.invalid/sample" : "",
      address: type === "map" ? "서울특별시 샘플구" : "",
      boardName: type === "board" ? "게시판" : "",
    },
    cards: [first],
  });
}
