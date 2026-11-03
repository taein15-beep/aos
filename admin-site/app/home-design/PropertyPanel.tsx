"use client";

import { SAMPLE_IMAGE_PRESETS, createEmptyCard } from "@/lib/admin/home-design/sample-data";
import { HOME_SECTION_TYPE_LABEL } from "@/lib/admin/home-design/types";
import type { HomeSection, HomeSectionCard, HomeSectionProperties } from "@/lib/admin/home-design/types";

type Props = {
  section: HomeSection | null;
  onChangeSet: (patch: Partial<HomeSectionProperties>) => void;
  onChangeRowName: (name: string) => void;
  onChangeCard: (cardId: string, patch: Partial<HomeSectionCard>) => void;
  onAddCard: () => void;
  onRemoveCard: (cardId: string) => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="hd-form-row">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function PropertyPanel({ section, onChangeSet, onChangeRowName, onChangeCard, onAddCard, onRemoveCard }: Props) {
  if (!section) {
    return <div className="hd-empty">왼쪽에서 섹션을 선택하면 속성을 편집할 수 있습니다.</div>;
  }

  const { type } = section;
  const showCards = type === "banner" || type === "imagecard" || type === "category" || type === "multicategory";
  const first = section.cards[0];

  return (
    <div className="hd-form">
      <Field label="섹션 이름">
        <input className="hd-input" value={section.name} onChange={(event) => onChangeRowName(event.target.value)} />
      </Field>
      <p className="hd-empty" style={{ padding: 0, textAlign: "left" }}>
        유형: {HOME_SECTION_TYPE_LABEL[type]} ({type})
      </p>
      <label className="hd-check">
        <input
          type="checkbox"
          checked={section.props.titlesUsage}
          onChange={(event) => onChangeSet({ titlesUsage: event.target.checked })}
        />
        섹션 제목 표시
      </label>
      {section.props.titlesUsage ? (
        <>
          <Field label="제목">
            <input className="hd-input" value={section.props.titles} onChange={(event) => onChangeSet({ titles: event.target.value })} />
          </Field>
          <Field label="설명">
            <input className="hd-input" value={section.props.titlesDesc} onChange={(event) => onChangeSet({ titlesDesc: event.target.value })} />
          </Field>
        </>
      ) : null}

      <div className="hd-form-grid">
        <Field label="PC 높이(px)">
          <input
            className="hd-input"
            type="number"
            value={section.props.heightPc}
            onChange={(event) => onChangeSet({ heightPc: Number(event.target.value) || 0 })}
          />
        </Field>
        <Field label="모바일 높이(px)">
          <input
            className="hd-input"
            type="number"
            value={section.props.heightMob}
            onChange={(event) => onChangeSet({ heightMob: Number(event.target.value) || 0 })}
          />
        </Field>
      </div>

      <Field label="정렬">
        <select className="hd-input" value={section.props.align} onChange={(event) => onChangeSet({ align: event.target.value as HomeSectionProperties["align"] })}>
          <option value="left">왼쪽</option>
          <option value="center">가운데</option>
          <option value="right">오른쪽</option>
        </select>
      </Field>

      {(type === "category" || type === "multicategory") && (
        <div>
          <span className="hd-check" style={{ marginBottom: 6, display: "block" }}>
            상품노출
          </span>
          <div className="hd-radio">
            <label>
              <input type="radio" name="productExpose" checked={section.props.productExpose === "A"} onChange={() => onChangeSet({ productExpose: "A" })} />
              카테고리 자동노출
            </label>
            <label>
              <input type="radio" name="productExpose" checked={section.props.productExpose === "M"} onChange={() => onChangeSet({ productExpose: "M" })} />
              상품 선택노출
            </label>
          </div>
        </div>
      )}

      {type === "html" ? (
        <Field label="HTML 본문">
          <textarea className="hd-textarea" value={section.props.html} onChange={(event) => onChangeSet({ html: event.target.value })} />
        </Field>
      ) : null}

      {type === "video" ? (
        <Field label="동영상 URL (샘플, 재생 안 함)">
          <input className="hd-input" value={section.props.videoUrl} onChange={(event) => onChangeSet({ videoUrl: event.target.value })} />
        </Field>
      ) : null}

      {type === "map" ? (
        <Field label="주소">
          <input className="hd-input" value={section.props.address} onChange={(event) => onChangeSet({ address: event.target.value })} />
        </Field>
      ) : null}

      {type === "board" && first ? (
        <>
          <Field label="게시판명">
            <input className="hd-input" value={section.props.boardName} onChange={(event) => onChangeSet({ boardName: event.target.value })} />
          </Field>
          <Field label="샘플 글 1">
            <input className="hd-input" value={first.text1} onChange={(event) => onChangeCard(first.id, { text1: event.target.value })} />
          </Field>
          <Field label="샘플 글 2">
            <input className="hd-input" value={first.text2} onChange={(event) => onChangeCard(first.id, { text2: event.target.value })} />
          </Field>
        </>
      ) : null}

      {showCards
        ? section.cards.map((item, index) => (
            <div className="hd-card-edit" key={item.id}>
              <h3>
                {type === "banner" ? "슬라이드" : "카드"} {index + 1}
              </h3>
              <label className="hd-check">
                <input type="checkbox" checked={item.enabled} onChange={(event) => onChangeCard(item.id, { enabled: event.target.checked })} />
                표시
              </label>
              <Field label="이미지">
                <select
                  className="hd-input"
                  value={item.mediaIdPc ?? "plain-light"}
                  onChange={(event) => onChangeCard(item.id, { mediaIdPc: event.target.value, mediaIdMob: event.target.value })}
                >
                  {SAMPLE_IMAGE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="텍스트 1">
                <input className="hd-input" value={item.text1} onChange={(event) => onChangeCard(item.id, { text1: event.target.value })} />
              </Field>
              <Field label="텍스트 2">
                <input className="hd-input" value={item.text2} onChange={(event) => onChangeCard(item.id, { text2: event.target.value })} />
              </Field>
              <Field label="텍스트 3">
                <input className="hd-input" value={item.text3} onChange={(event) => onChangeCard(item.id, { text3: event.target.value })} />
              </Field>
              <div className="hd-form-grid">
                <Field label="배경색">
                  <input className="hd-color" type="color" value={item.textBgcolor || "#0f172a"} onChange={(event) => onChangeCard(item.id, { textBgcolor: event.target.value })} />
                </Field>
                <Field label="제목 색">
                  <input className="hd-color" type="color" value={item.text2Color || "#ffffff"} onChange={(event) => onChangeCard(item.id, { text2Color: event.target.value })} />
                </Field>
              </div>
              {section.cards.length > 1 ? (
                <button type="button" className="hd-btn" onClick={() => onRemoveCard(item.id)}>
                  이 항목 삭제
                </button>
              ) : null}
            </div>
          ))
        : null}

      {showCards ? (
        <button type="button" className="hd-btn" onClick={onAddCard}>
          + {type === "banner" ? "슬라이드" : "카드"} 추가
        </button>
      ) : null}

      {!showCards && !["html", "video", "map", "board", "calendar"].includes(type) ? (
        <p className="hd-empty" style={{ padding: 0 }}>
          이 섹션 유형의 세부 설정은 이후 단계에서 확장합니다.
        </p>
      ) : null}
    </div>
  );
}

export function nextCard(section: HomeSection) {
  return createEmptyCard(section);
}
