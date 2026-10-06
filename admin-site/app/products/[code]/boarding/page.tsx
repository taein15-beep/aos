"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, MapPin, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { ProductAdminShell } from "@/components/products/ProductAdminShell";
import { ShareConfirmDialog, type ShareConfirmDialogState } from "@/components/products/ShareConfirmDialog";
import {
  findBoardingProduct,
  formatBoardingRoute,
  getProductBoardingGroups,
  saveProductBoardingGroups,
  type ProductBoardingGroup,
} from "@/lib/admin/product-boarding-data";
import { getProductSellerSettingPath, getProductSharePath } from "@/lib/admin/products-data";

let draftSeq = 0;
const nextDraftId = (prefix: string) => {
  draftSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${draftSeq}`;
};

function validateGroups(groups: ProductBoardingGroup[]) {
  const errors: string[] = [];
  const groupNames = groups.map((item) => item.name.trim());
  groups.forEach((item, index) => {
    const label = item.name.trim() || `${index + 1}번째 그룹`;
    if (!item.name.trim()) errors.push(`${index + 1}번째 탑승지 그룹명을 입력해 주세요.`);
    else if (groupNames.indexOf(item.name.trim()) !== index) errors.push(`탑승지 그룹명 '${label}'이(가) 중복됩니다.`);
    if (!item.points.length) errors.push(`${label}에 탑승지를 1개 이상 등록해 주세요.`);
    const pointNames = item.points.map((point) => point.name.trim());
    pointNames.forEach((name, pointIndex) => {
      if (!name) errors.push(`${label}의 ${pointIndex + 1}번째 탑승지명을 입력해 주세요.`);
      else if (pointNames.indexOf(name) !== pointIndex) errors.push(`${label}에 '${name}' 탑승지가 중복됩니다.`);
    });
  });
  return errors;
}

const normalize = (groups: ProductBoardingGroup[]) =>
  groups.map((item) => ({
    ...item,
    name: item.name.trim(),
    points: item.points.map((point) => ({ ...point, name: point.name.trim() })),
  }));

export default function ProductBoardingSettingPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const productCode = decodeURIComponent(params.code ?? "");
  const product = useMemo(() => findBoardingProduct(productCode), [productCode]);

  const [saved, setSaved] = useState(() => getProductBoardingGroups(productCode));
  const [groups, setGroups] = useState(() => getProductBoardingGroups(productCode));
  const [showErrors, setShowErrors] = useState(false);
  const [dialog, setDialog] = useState<ShareConfirmDialogState | null>(null);
  const [toast, setToast] = useState("");

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const dirty = JSON.stringify(normalize(groups)) !== JSON.stringify(saved);
  const errors = validateGroups(groups);
  const pointTotal = groups.reduce((sum, item) => sum + item.points.length, 0);

  const leave = (path: string) => {
    if (dirty && !window.confirm("저장하지 않은 탑승지 설정이 있습니다. 이동하시겠습니까?")) return;
    router.push(path);
  };

  const updateGroup = (groupId: string, update: (item: ProductBoardingGroup) => ProductBoardingGroup) =>
    setGroups((value) => value.map((item) => (item.id === groupId ? update(item) : item)));

  const addGroup = () => {
    const used = new Set(groups.map((item) => item.name));
    let index = groups.length;
    let name = `탑승지${String.fromCharCode(65 + index)}`;
    while (used.has(name)) {
      index += 1;
      name = index < 26 ? `탑승지${String.fromCharCode(65 + index)}` : `탑승지 그룹 ${index + 1}`;
    }
    setGroups((value) => [...value, { id: nextDraftId("BG"), name, points: [{ id: nextDraftId("BP"), name: "" }] }]);
  };

  const removeGroup = (target: ProductBoardingGroup) =>
    setDialog({
      title: "탑승지 그룹 삭제",
      message: `${target.name || "이름 없는 그룹"}을(를) 삭제하시겠습니까?\n\n운영배정에서 이 그룹을 선택한 호차는 저장 후 '탑승지 그룹 미선택' 상태가 됩니다.`,
      confirmLabel: "삭제",
      details: [{ label: "탑승지", value: formatBoardingRoute(target) }],
      onConfirm: () => {
        setGroups((value) => value.filter((item) => item.id !== target.id));
        setDialog(null);
      },
    });

  const addPoint = (groupId: string) =>
    updateGroup(groupId, (item) => ({ ...item, points: [...item.points, { id: nextDraftId("BP"), name: "" }] }));

  const updatePoint = (groupId: string, pointId: string, name: string) =>
    updateGroup(groupId, (item) => ({
      ...item,
      points: item.points.map((point) => (point.id === pointId ? { ...point, name } : point)),
    }));

  const removePoint = (groupId: string, pointId: string) =>
    updateGroup(groupId, (item) => ({ ...item, points: item.points.filter((point) => point.id !== pointId) }));

  const movePoint = (groupId: string, index: number, offset: number) =>
    updateGroup(groupId, (item) => {
      const target = index + offset;
      if (target < 0 || target >= item.points.length) return item;
      const points = [...item.points];
      [points[index], points[target]] = [points[target], points[index]];
      return { ...item, points };
    });

  const save = () => {
    if (errors.length) {
      setShowErrors(true);
      notify("입력값을 확인해 주세요.");
      return;
    }
    const next = normalize(groups);
    saveProductBoardingGroups(productCode, next);
    setSaved(next);
    setGroups(next);
    setShowErrors(false);
    notify("탑승지 설정을 저장했습니다. (SAMPLE)");
  };

  const reset = () => {
    setGroups(saved.map((item) => ({ ...item, points: item.points.map((point) => ({ ...point })) })));
    setShowErrors(false);
  };

  return (
    <ProductAdminShell
      currentChild="상품목록"
      breadcrumb={
        <>
          <span>상품관리</span>
          <b>/</b>
          <button type="button" className="product-affiliate-crumb" onClick={() => leave("/products")}>
            상품목록
          </button>
          <b>/</b>
          <strong>탑승지 설정</strong>
        </>
      }
      toast={toast}
      onNotify={notify}
      overlays={<ShareConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />}
    >
      <main className="content product-boarding-content">
        {!product ? (
          <section className="panel member-web-detail-not-found">
            <strong>상품을 찾을 수 없습니다.</strong>
            <p>요청한 상품({productCode || "-"})의 탑승지 설정 정보가 없습니다.</p>
            <button type="button" className="secondary" onClick={() => router.push("/products")}>
              <ArrowLeft size={15} />
              상품목록으로
            </button>
          </section>
        ) : (
          <>
            <section className="page-head product-seller-page-head">
              <div>
                <div className="product-affiliate-title-row">
                  <button type="button" className="secondary product-affiliate-back" onClick={() => leave("/products")}>
                    <ArrowLeft size={14} />
                    상품목록
                  </button>
                  <h1>탑승지 설정</h1>
                </div>
                <p>
                  상품별 탑승지 그룹을 미리 등록합니다. 운영배정에서는 호차마다 탑승지 그룹을 선택하고, 고객은 해당
                  그룹의 탑승지 중에서 지정합니다.
                </p>
              </div>
              <div className="product-boarding-head-actions">
                <button type="button" className="secondary" onClick={reset} disabled={!dirty}>
                  <RotateCcw size={14} />
                  되돌리기
                </button>
                <button type="button" className="primary" onClick={save} disabled={!dirty}>
                  <Save size={14} />
                  탑승지 설정 저장
                </button>
              </div>
            </section>

            <nav className="member-web-detail-tabs product-affiliate-tabs" aria-label="상품 설정 탭">
              <button type="button" onClick={() => leave("/products")}>
                상품목록
              </button>
              {product.inProductList && (
                <>
                  <button type="button" onClick={() => leave(getProductSharePath(product.code))}>
                    제휴여행사 공유
                  </button>
                  <button type="button" onClick={() => leave(getProductSellerSettingPath(product.code))}>
                    판매점 설정
                  </button>
                </>
              )}
              <button type="button" className="active" aria-current="page">
                탑승지 설정
              </button>
            </nav>

            <section className="product-affiliate-summary product-boarding-summary" aria-label="탑승지 설정 요약">
              <article className="member-web-detail-kpi">
                <span>
                  <small>상품명</small>
                  <strong title={product.name}>{product.name}</strong>
                </span>
              </article>
              <article className="member-web-detail-kpi">
                <span>
                  <small>상품코드</small>
                  <strong>{product.code}</strong>
                </span>
              </article>
              <article className="member-web-detail-kpi">
                <span>
                  <small>탑승지 그룹</small>
                  <strong>{groups.length}개</strong>
                </span>
              </article>
              <article className="member-web-detail-kpi">
                <span>
                  <small>등록 탑승지</small>
                  <strong>{pointTotal}개</strong>
                </span>
              </article>
              <article className="member-web-detail-kpi">
                <span>
                  <small>저장상태</small>
                  <strong className={dirty ? "product-boarding-dirty" : ""}>
                    {dirty ? "변경사항 있음" : "저장됨"}
                  </strong>
                </span>
              </article>
            </section>

            <section className="panel product-seller-notice">
              <p>
                탑승지 순서는 가이드 운영 시 탑승 순서로 사용됩니다. 탑승지명을 변경하거나 삭제하면, 운영배정에서 기존
                탑승지가 지정된 고객은 <strong>확인필요</strong>로 표시되어 탑승지를 다시 지정해야 합니다. 집결장소
                상세· 집결시간·주소·안내메모는 다음 단계에서 추가됩니다.
              </p>
            </section>

            {showErrors && errors.length > 0 && (
              <section className="panel product-boarding-errors" role="alert">
                <b>저장할 수 없습니다. 아래 항목을 확인해 주세요.</b>
                <ul>
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="product-boarding-groups" aria-label="탑승지 그룹 목록">
              {groups.map((item, groupIndex) => (
                <article className="panel product-boarding-group" key={item.id}>
                  <header>
                    <span className="product-boarding-group-no">{groupIndex + 1}</span>
                    <label>
                      <span>탑승지 그룹명</span>
                      <input
                        value={item.name}
                        placeholder="예: 탑승지A"
                        aria-invalid={showErrors && !item.name.trim()}
                        onChange={(event) => updateGroup(item.id, (value) => ({ ...value, name: event.target.value }))}
                      />
                    </label>
                    <span className="badge gray">탑승지 {item.points.length}개</span>
                    <button
                      type="button"
                      className="ops-assign-icon-btn"
                      aria-label={`${item.name || "탑승지 그룹"} 삭제`}
                      title="탑승지 그룹 삭제"
                      onClick={() => removeGroup(item)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </header>
                  <p className="product-boarding-route" title={formatBoardingRoute(item)}>
                    <MapPin size={12} aria-hidden="true" />
                    {formatBoardingRoute(item)}
                  </p>
                  <ol className="product-boarding-points">
                    {item.points.map((point, index) => (
                      <li key={point.id}>
                        <span className="product-boarding-point-no">{index + 1}</span>
                        <input
                          value={point.name}
                          placeholder="탑승지명 (예: 서울역)"
                          aria-label={`${item.name} ${index + 1}번째 탑승지명`}
                          aria-invalid={
                            showErrors &&
                            (!point.name.trim() ||
                              item.points.findIndex((value) => value.name.trim() === point.name.trim()) !== index)
                          }
                          onChange={(event) => updatePoint(item.id, point.id, event.target.value)}
                        />
                        <button
                          type="button"
                          className="ops-assign-icon-btn"
                          aria-label={`${point.name || "탑승지"} 위로`}
                          disabled={index === 0}
                          onClick={() => movePoint(item.id, index, -1)}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="ops-assign-icon-btn"
                          aria-label={`${point.name || "탑승지"} 아래로`}
                          disabled={index === item.points.length - 1}
                          onClick={() => movePoint(item.id, index, 1)}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="ops-assign-icon-btn"
                          aria-label={`${point.name || "탑승지"} 삭제`}
                          onClick={() => removePoint(item.id, point.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ol>
                  <button
                    type="button"
                    className="secondary product-boarding-add-point"
                    onClick={() => addPoint(item.id)}
                  >
                    <Plus size={14} />
                    탑승지 추가
                  </button>
                </article>
              ))}
              <button type="button" className="product-boarding-add-group" onClick={addGroup}>
                <Plus size={16} />
                탑승지 그룹 추가
              </button>
            </section>
          </>
        )}
      </main>
    </ProductAdminShell>
  );
}
