import {
  HOME_SECTION_TYPE_LABEL,
  mediaSwatchStyle,
  safeHref,
  sanitizeHomeHtml,
  sectionFrameStyle,
  visibleCards,
  type HomeDesignViewport,
  type HomeSection,
} from "../../../packages/home-design-contract/src/index.ts";

function SectionTitle({ section }: { section: HomeSection }) {
  if (!section.props.titlesUsage || !section.props.titles) return null;
  return (
    <div className="dp-title">
      {section.props.titles}
      {section.props.titlesDesc ? <small>{section.props.titlesDesc}</small> : null}
    </div>
  );
}

function BannerSection({ section }: { section: HomeSection }) {
  const first = visibleCards(section)[0];
  if (!first) return <div className="dp-map">배너 이미지가 없습니다.</div>;
  return (
    <div className={`dp-hero align-${section.props.align}`} style={mediaSwatchStyle(first.mediaIdPc)}>
      {first.text1Usage && first.text1 ? <small style={{ color: first.text1Color }}>{first.text1}</small> : null}
      {first.text2Usage && first.text2 ? <b style={{ color: first.text2Color }}>{first.text2}</b> : null}
      {first.text3Usage && first.text3 ? <p style={{ color: first.text3Color }}>{first.text3}</p> : null}
    </div>
  );
}

function CardSection({ section }: { section: HomeSection }) {
  return (
    <>
      <SectionTitle section={section} />
      <div className="dp-cards">
        {visibleCards(section).map((card) => {
          const href = safeHref(card.cardLink);
          const body = (
            <>
              <div className="dp-card-media" style={mediaSwatchStyle(card.mediaIdPc)} />
              <div className="dp-card-copy">
                {card.text1Usage && card.text1 ? <b style={{ color: card.text1Color }}>{card.text1}</b> : null}
                {card.text2Usage && card.text2 ? <span style={{ color: card.text2Color }}>{card.text2}</span> : null}
                {card.text3Usage && card.text3 ? <em style={{ color: card.text3Color }}>{card.text3}</em> : null}
              </div>
            </>
          );
          return href ? (
            <a className="dp-card" key={card.id} href={href}>
              {body}
            </a>
          ) : (
            <article className="dp-card" key={card.id}>
              {body}
            </article>
          );
        })}
      </div>
    </>
  );
}

function ProductSection({ section }: { section: HomeSection }) {
  const cards = visibleCards(section);
  if (section.type === "category") {
    return (
      <>
        <SectionTitle section={section} />
        <div className="dp-chips">
          {cards.map((card) => (
            <span className="dp-chip" key={card.id} style={{ color: card.text1Color }}>
              {card.text1 || "카테고리"}
            </span>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <SectionTitle section={section} />
      <div className="dp-products">
        {cards.map((card) => (
          <article className="dp-card" key={card.id}>
            <div className="dp-card-media" style={mediaSwatchStyle(card.mediaIdPc)} />
            <div className="dp-card-copy">
              <b>{card.text1 || "상품 샘플"}</b>
              {card.text2 ? <span>{card.text2}</span> : null}
              {card.text3 ? <em>{card.text3}</em> : null}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function HtmlSection({ section }: { section: HomeSection }) {
  const html = sanitizeHomeHtml(section.props.html || section.cards[0]?.textData1 || "");
  return (
    <>
      <SectionTitle section={section} />
      <div className="dp-html" dangerouslySetInnerHTML={{ __html: html || "<p>표시할 텍스트가 없습니다.</p>" }} />
    </>
  );
}

function BoardSection({ section }: { section: HomeSection }) {
  const first = visibleCards(section)[0];
  const items = [first?.text1, first?.text2, first?.text3].filter(Boolean);
  return (
    <>
      <SectionTitle section={section} />
      <ul className="dp-board">
        {(items.length ? items : ["등록된 게시글 샘플이 없습니다."]).map((item) => (
          <li key={String(item)}>{item}</li>
        ))}
      </ul>
    </>
  );
}

export function PreviewSection({ section, viewport }: { section: HomeSection; viewport: HomeDesignViewport }) {
  const frame = sectionFrameStyle(section, viewport);
  let body;
  switch (section.type) {
    case "banner":
      body = <BannerSection section={section} />;
      break;
    case "imagecard":
      body = <CardSection section={section} />;
      break;
    case "category":
    case "multicategory":
      body = <ProductSection section={section} />;
      break;
    case "html":
      body = <HtmlSection section={section} />;
      break;
    case "board":
      body = <BoardSection section={section} />;
      break;
    case "video":
      body = (
        <>
          <SectionTitle section={section} />
          <div className="dp-video">동영상 안내 영역 · {section.props.videoUrl || "URL 없음"} · 실제 재생하지 않습니다.</div>
        </>
      );
      break;
    case "map":
      body = (
        <>
          <SectionTitle section={section} />
          <div className="dp-map">지도 · 안내 영역{section.props.address ? ` · ${section.props.address}` : ""}</div>
        </>
      );
      break;
    case "calendar":
      body = (
        <>
          <SectionTitle section={section} />
          <div className="dp-cal" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => (
              <i className={index === 6 ? "mark" : ""} key={index}>
                {index + 1}
              </i>
            ))}
          </div>
        </>
      );
      break;
    default:
      body = (
        <div className="dp-unknown">
          지원하지 않는 섹션입니다 ({HOME_SECTION_TYPE_LABEL[section.type] ?? section.type}). 이 영역만 건너뜁니다.
        </div>
      );
  }

  return (
    <section className="dp-section" data-section-type={section.type} data-section-id={section.id} style={frame}>
      {body}
    </section>
  );
}

export function UnsupportedSection({ type }: { type: string }) {
  return (
    <section className="dp-section" data-section-type={type}>
      <div className="dp-unknown">지원하지 않는 섹션입니다 ({type}). 페이지는 계속 표시됩니다.</div>
    </section>
  );
}
