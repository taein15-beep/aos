"use client";

import { getSampleImagePreset } from "@/lib/admin/home-design/sample-data";
import { HOME_SECTION_TYPE_LABEL } from "@/lib/admin/home-design/types";
import type { HomeDesignViewport, HomeSection } from "@/lib/admin/home-design/types";

function swatch(id: string | null) {
  const preset = getSampleImagePreset(id || "plain-light");
  return { background: `linear-gradient(135deg, ${preset.tone}, ${preset.accent})` };
}

function SectionTitle({ section }: { section: HomeSection }) {
  if (!section.props.titlesUsage || !section.props.titles) return null;
  return (
    <div className="hd-html" style={{ paddingBottom: 0 }}>
      <b>{section.props.titles}</b>
      {section.props.titlesDesc ? <p>{section.props.titlesDesc}</p> : null}
    </div>
  );
}

function SectionPreview({ section }: { section: HomeSection }) {
  const { type } = section;
  const first = section.cards[0];
  const align = section.props.align;

  if (type === "banner" && first) {
    return (
      <div className={`hd-hero align-${align}`} style={swatch(first.mediaIdPc)}>
        {first.text1Usage && first.text1 ? <small style={{ color: first.text1Color }}>{first.text1}</small> : null}
        {first.text2Usage && first.text2 ? <b style={{ color: first.text2Color }}>{first.text2}</b> : null}
        {first.text3Usage && first.text3 ? <p style={{ color: first.text3Color }}>{first.text3}</p> : null}
      </div>
    );
  }

  if (type === "imagecard" || type === "multicategory") {
    return (
      <div>
        <SectionTitle section={section} />
        <div className="hd-cards">
        {section.cards.filter((card) => card.enabled).map((card) => (
          <article className="hd-card" key={card.id}>
            <div className="hd-card-media" style={swatch(card.mediaIdPc)} />
            <div className="hd-card-copy">
              <b>{card.text1 || "제목 없음"}</b>
              {card.text2 ? <span>{card.text2}</span> : null}
              {card.text3 ? <em>{card.text3}</em> : null}
            </div>
          </article>
        ))}
        </div>
      </div>
    );
  }

  if (type === "category") {
    return (
      <div>
        <SectionTitle section={section} />
        <div className="hd-cats">
        {section.cards.map((card) => (
          <span className="hd-chip" key={card.id}>
            {card.text1 || "카테고리"}
          </span>
        ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle section={section} />
      {type === "html" ? (
        <div className="hd-html" dangerouslySetInnerHTML={{ __html: section.props.html || "<p>HTML 본문이 없습니다.</p>" }} />
      ) : type === "board" ? (
        <ul className="hd-board">
          {([first?.text1, first?.text2, first?.text3].filter(Boolean).length
            ? [first?.text1, first?.text2, first?.text3].filter(Boolean)
            : ["등록된 게시글 샘플이 없습니다."]
          ).map((item) => (
            <li key={String(item)}>{item}</li>
          ))}
        </ul>
      ) : type === "video" ? (
        <div className="hd-placeholder">
          동영상 섹션 샘플
          <br />
          {section.props.videoUrl || "URL 없음"} · 실제 재생하지 않습니다.
        </div>
      ) : type === "map" ? (
        <div className="hd-placeholder">
          지도 섹션 샘플
          <br />
          {section.props.address || "주소 없음"}
        </div>
      ) : type === "calendar" ? (
        <div className="hd-cal" aria-hidden="true">
          {Array.from({ length: 21 }, (_, index) => (
            <i className={index === 6 || index === 13 ? "mark" : ""} key={index}>
              {index + 1}
            </i>
          ))}
        </div>
      ) : (
        <div className="hd-placeholder">{HOME_SECTION_TYPE_LABEL[type]} 미리보기</div>
      )}
    </div>
  );
}

export function PreviewCanvas({
  sections,
  selectedId,
  viewport,
  onSelect,
}: {
  sections: HomeSection[];
  selectedId: string | null;
  viewport: HomeDesignViewport;
  onSelect: (id: string) => void;
}) {
  if (!sections.length) {
    return <div className="hd-empty">이 페이지에 등록된 섹션이 없습니다. 왼쪽에서 섹션을 추가하세요.</div>;
  }

  return (
    <div className="hd-stage" data-viewport={viewport}>
      {sections.map((section) => {
        const off = !section.enabled;
        return (
          <article
            key={section.id}
            className={`hd-block${section.id === selectedId ? " is-selected" : ""}${off ? " is-off" : ""}`}
            onClick={() => onSelect(section.id)}
          >
            <div className="hd-caption">
              <span>[{HOME_SECTION_TYPE_LABEL[section.type]}]</span>
              <strong>{section.name}</strong>
              <em>{off ? "사용 안 함" : "사용"}</em>
            </div>
            <div className="hd-preview-body">
              {off ? <p className="hd-empty">사용 안 함</p> : <SectionPreview section={section} />}
            </div>
          </article>
        );
      })}
    </div>
  );
}
