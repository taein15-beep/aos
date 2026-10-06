"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarCheck, Check, Copy, Eye, Info, Lock, RotateCcw, Save, X } from "lucide-react";
import {
  INVENTORY_MODE_OPTIONS,
  SALES_CHANNEL_OPTIONS,
  shareStatusBadgeClass,
} from "@/lib/admin/product-affiliate-data";
import {
  SHARE_LOCKED_ITEMS,
  SHARE_REQUEST_MODE_LABELS,
  formatFormSharePeriod,
  formatSalesPeriod,
  shareEditableItemLabels,
} from "@/lib/admin/product-share-setting-data";
import {
  SHARED_DATA_PENDING,
  SHARED_LOCKED_EDIT_MESSAGE,
  SHARED_ORIGINAL_LOCKED_NOTICE,
  SHARED_ORIGINAL_SYNC_NOTICE,
  SHARED_OWN_CATEGORIES,
  SHARED_OWN_CATEGORY_MAINS,
  SHARED_SALES_BLOCKED_MESSAGE,
  SHARED_SALES_STATUS_OPTIONS,
  SHARED_STATUS_NOTICES,
  SHARE_REQUEST_PENDING_TITLE,
  canRespondToShareRequest,
  cloneSharedSales,
  effectiveSalesStatus,
  formatOwnCategory,
  getSharedProductByCode,
  getSharedProductSalesLink,
  getSharedProductSalesPath,
  hasCustomSharedCondition,
  isSharedFieldAllowed,
  isSharedSalesDirty,
  isSharedSalesEditable,
  salesStatusBadgeClass,
  saveSharedProductSales,
  sharedConditionForm,
  type SharedSalesField,
  type SharedSalesSettings,
} from "@/lib/admin/product-shared-data";
import { ProductAdminShell, type ProductToastAction } from "@/components/products/ProductAdminShell";
import { ProductAffiliateNotFound } from "@/components/products/ProductAffiliateNotFound";
import { useSharedProductRequestFlow } from "@/components/products/useSharedProductRequestFlow";

const LIST_PATH = "/products/shared";
const reservationListPath = (code: string) => `/reservations?keyword=${encodeURIComponent(code)}`;
const ORIGINAL_PENDING_FIELDS = ["일정", "출발일", "좌석", "포함/불포함", "취소/환불"] as const;

export default function SharedProductDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = typeof params?.code === "string" ? params.code : "";
  const [productVersion, setProductVersion] = useState(0);
  const product = useMemo(() => getSharedProductByCode(code), [code, productVersion]);
  const hasProduct = !!product;

  const initialSales = useMemo<SharedSalesSettings | null>(
    () => (product ? { ...cloneSharedSales(product.sales), salesStatus: effectiveSalesStatus(product) } : null),
    [product],
  );
  const [saved, setSaved] = useState<SharedSalesSettings | null>(initialSales);
  const [draft, setDraft] = useState<SharedSalesSettings | null>(initialSales);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [toastAction, setToastAction] = useState<ProductToastAction | null>(null);
  const toastTimer = useRef<number | null>(null);
  const salesSectionRef = useRef<HTMLElement | null>(null);

  const isDirty = !!saved && !!draft && isSharedSalesDirty(saved, draft);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    if (!hasProduct) return;
    if (new URLSearchParams(window.location.search).get("section") !== "sales") return;
    const timer = window.setTimeout(
      () => salesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      60,
    );
    return () => window.clearTimeout(timer);
  }, [hasProduct]);

  const act = (message: string, action?: ProductToastAction, duration?: number) => {
    setToast(message);
    setToastAction(action ?? null);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(
      () => {
        setToast("");
        setToastAction(null);
      },
      duration ?? (action ? 6000 : 2200),
    );
  };

  const requestFlow = useSharedProductRequestFlow({
    notify: act,
    onChanged: (updated) => {
      const next = { ...cloneSharedSales(updated.sales), salesStatus: effectiveSalesStatus(updated) };
      setProductVersion((value) => value + 1);
      setSaved(next);
      setDraft(cloneSharedSales(next));
    },
    onGoSales: (updated) => {
      window.history.replaceState(window.history.state, "", getSharedProductSalesPath(updated.code));
      salesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setToast("");
      setToastAction(null);
    },
  });

  const confirmLeave = () =>
    !isDirty || window.confirm("저장하지 않은 변경사항이 있습니다. 이동하면 변경사항이 사라집니다. 이동할까요?");

  const goList = () => {
    if (!confirmLeave()) return;
    router.push(LIST_PATH);
  };

  if (!product || !saved || !draft) {
    return (
      <ProductAdminShell
        currentChild="공유받은 상품"
        onNotify={act}
        toast={toast}
        breadcrumb={
          <>
            <span>상품관리</span>
            <b>/</b>
            <strong>공유상품 상세</strong>
          </>
        }
      >
        <main className="content product-affiliate-content">
          <ProductAffiliateNotFound
            title="공유상품을 찾을 수 없습니다."
            message="공유받은 상품 목록에 없는 상품코드입니다."
            backLabel="공유받은 상품 목록으로"
            onBack={() => router.push(LIST_PATH)}
          />
        </main>
      </ProductAdminShell>
    );
  }

  const form = sharedConditionForm(product);
  const isCustom = hasCustomSharedCondition(product);
  const editable = isSharedSalesEditable(product);
  const canRespond = canRespondToShareRequest(product);
  const statusNotice = SHARED_STATUS_NOTICES[product.shareStatus];
  const allowed = (field: SharedSalesField) => isSharedFieldAllowed(form, field);
  const canEdit = (field: SharedSalesField) => editable && allowed(field);
  const editableLabels = shareEditableItemLabels(form.editPermissions);
  const allowedChannels = SALES_CHANNEL_OPTIONS.filter((option) => form.salesChannels[option.key]);
  const inventoryLabel =
    INVENTORY_MODE_OPTIONS.find((option) => option.value === form.inventoryMode)?.label ?? form.inventoryMode;
  const salesLink = getSharedProductSalesLink(product.code);
  const savedStatus = saved.salesStatus;
  const linkActive = editable && savedStatus === "판매중" && saved.homepageVisible;

  const errors: string[] = [];
  if (editable && allowed("salesName") && !draft.salesName.trim()) errors.push("판매용 상품명을 입력해주세요.");
  if (editable && draft.salesStatus === "판매중" && allowed("category") && !draft.categoryMain) {
    errors.push("판매중으로 설정하려면 자사 카테고리를 지정해주세요.");
  }
  const visibilityWarning =
    editable && draft.salesStatus === "판매중" && !draft.homepageVisible
      ? "홈페이지 미노출 상태입니다. 판매중으로 저장해도 홈페이지 상품목록에는 표시되지 않습니다."
      : null;
  const canSave = editable && isDirty && errors.length === 0;
  const canViewReservations = product.shareStatus !== "수락대기" && product.shareStatus !== "공유 거절";
  const goReservations = () => {
    if (!confirmLeave()) return;
    router.push(reservationListPath(product.code));
  };

  const update = <K extends keyof SharedSalesSettings>(key: K, value: SharedSalesSettings[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const changeCategoryMain = (value: string) =>
    setDraft((current) => (current ? { ...current, categoryMain: value, categorySub: "" } : current));

  const resetChanges = () => setDraft(cloneSharedSales(saved));

  const save = () => {
    if (!canSave) return;
    const next = cloneSharedSales(draft);
    saveSharedProductSales(product.code, next);
    setSaved(next);
    setLastSavedAt(new Date().toLocaleString("ko-KR", { hour12: false }));
    if (next.salesStatus === "판매중") {
      act("판매설정이 저장되었습니다. 판매중 상품의 예약은 예약관리에서 확인할 수 있습니다.", {
        label: "예약관리 보기",
        onClick: () => router.push(reservationListPath(product.code)),
      });
      return;
    }
    act("판매설정이 저장되었습니다.");
  };

  const copyWithSelection = () => {
    const field = document.createElement("textarea");
    field.value = salesLink;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(salesLink);
      act("판매 링크가 복사되었습니다.");
    } catch {
      if (copyWithSelection()) act("판매 링크가 복사되었습니다.");
      else act("클립보드에 접근할 수 없습니다. 링크를 직접 선택해 복사해주세요.", undefined, 3000);
    }
  };

  const lockedHelp = (field: SharedSalesField) =>
    !allowed(field) ? (
      <p className="shared-product-locked-help">
        <Lock size={11} />
        {SHARED_LOCKED_EDIT_MESSAGE}
      </p>
    ) : null;

  const subCategories = draft.categoryMain ? SHARED_OWN_CATEGORIES[draft.categoryMain] ?? [] : [];

  return (
    <ProductAdminShell
      currentChild="공유받은 상품"
      onNotify={act}
      toast={toast}
      toastAction={toastAction}
      breadcrumb={
        <>
          <span>상품관리</span>
          <b>/</b>
          <button type="button" className="product-affiliate-crumb" onClick={goList}>
            공유받은 상품
          </button>
          <b>/</b>
          <strong>공유상품 상세</strong>
        </>
      }
      overlays={
        <>
          {requestFlow.modals}
          {previewOpen && (
          <div className="modal-backdrop" role="presentation" onClick={() => setPreviewOpen(false)}>
            <div
              className="modal shared-product-preview-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shared-preview-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-head">
                <h3 id="shared-preview-title">판매화면 미리보기</h3>
                <button type="button" aria-label="닫기" onClick={() => setPreviewOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="product-share-agency-body">
                <p className="product-share-setting-help">
                  현재 입력값 기준으로 자사 홈페이지에 표시될 내용을 확인합니다. (SAMPLE · 실제 홈페이지 노출과 연동되지 않음)
                </p>
                <div className="shared-product-preview-card">
                  <div className="shared-product-preview-badges">
                    <span className={`badge ${salesStatusBadgeClass(draft.salesStatus)}`}>{draft.salesStatus}</span>
                    <span className={`badge ${draft.homepageVisible ? "success" : "gray"}`}>
                      {draft.homepageVisible ? "홈페이지 노출" : "홈페이지 미노출"}
                    </span>
                    <small>{formatOwnCategory(draft) || "자사 카테고리 미지정"}</small>
                  </div>
                  <strong>{draft.salesName || product.name}</strong>
                  <p>{draft.salesIntro || "등록된 소개문구가 없습니다."}</p>
                  <dl className="product-share-detail-list">
                    <div>
                      <dt>판매가격</dt>
                      <dd>{product.price}원</dd>
                    </div>
                    <div>
                      <dt>판매기간</dt>
                      <dd>{formatSalesPeriod(product.salesPeriod)}</dd>
                    </div>
                    <div className="is-wide">
                      <dt>판매 링크</dt>
                      <dd>{salesLink}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setPreviewOpen(false)}>
                  닫기
                </button>
              </div>
            </div>
          </div>
          )}
        </>
      }
    >
      <main className="content product-affiliate-content product-share-setting-content shared-product-content">
        <section className="page-head product-affiliate-page-head">
          <div>
            <div className="product-affiliate-title-row">
              <button type="button" className="secondary product-affiliate-back" onClick={goList}>
                <ArrowLeft size={14} />
                공유받은 상품
              </button>
              <h1>공유상품 상세</h1>
            </div>
            <p>공급여행사에서 공유받은 상품의 원본정보와 공유조건을 확인하고 자사 판매설정을 관리합니다.</p>
          </div>
          <div className="product-affiliate-head-actions">
            {canViewReservations && (
              <button type="button" className="secondary" onClick={goReservations}>
                <CalendarCheck size={14} />
                예약 보기
              </button>
            )}
            <button type="button" className="secondary" onClick={() => setPreviewOpen(true)}>
              <Eye size={14} />
              미리보기
            </button>
            <button type="button" className="primary" onClick={save} disabled={!canSave}>
              <Save size={14} />
              판매설정 저장
            </button>
          </div>
        </section>

        {canRespond ? (
          <section className="panel shared-product-request-card" aria-label="상품공유 요청">
            <div>
              <strong>
                <Info size={14} />
                {SHARE_REQUEST_PENDING_TITLE}
              </strong>
              <p>
                {product.supplierName} · 요청일 {product.requestedAt} · {statusNotice}
              </p>
            </div>
            <div className="shared-product-request-card-actions">
              <button type="button" className="secondary" onClick={() => requestFlow.openRequest(product)}>
                요청 확인
              </button>
              <button
                type="button"
                className="secondary shared-product-reject-btn"
                onClick={() => requestFlow.openReject(product)}
              >
                공유 거절
              </button>
              <button type="button" className="primary" onClick={() => requestFlow.openAccept(product)}>
                공유 수락
              </button>
            </div>
          </section>
        ) : !statusNotice ? (
          editable &&
          savedStatus === "판매대기" && (
            <div className="product-share-setting-alert shared-product-status-notice" role="note">
              <Info size={14} />
              <div>
                공유가 수락되어 판매대기 상태입니다. 자사 카테고리·판매용 상품명·홈페이지 노출을 확인한 뒤 판매상태를
                판매중으로 저장하면 판매가 시작됩니다.
              </div>
            </div>
          )
        ) : (
          statusNotice && (
            <div className="product-share-setting-alert shared-product-status-notice" role="alert">
              <AlertTriangle size={14} />
              <div>
                {statusNotice}
                {product.shareStatus === "공유 중지" && <span>판매상태가 판매중지로 표시됩니다.</span>}
                {product.shareStatus === "공유 거절" && product.rejection && (
                  <dl className="shared-product-rejection">
                    <div>
                      <dt>거절 사유</dt>
                      <dd>{product.rejection.reason}</dd>
                    </div>
                    {product.rejection.detail && (
                      <div>
                        <dt>기타 사유</dt>
                        <dd>{product.rejection.detail}</dd>
                      </div>
                    )}
                    <div>
                      <dt>거절일</dt>
                      <dd>{product.rejection.rejectedAt}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>
          )
        )}

        <section className="product-share-setting-summary shared-product-summary" aria-label="공유상품 기본정보">
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
              <small>공급여행사</small>
              <strong>{product.supplierName}</strong>
            </span>
          </article>
          <article className="member-web-detail-kpi">
            <span>
              <small>공유상태</small>
              <strong>
                <span className={`badge ${shareStatusBadgeClass(product.shareStatus)}`}>{product.shareStatus}</span>
              </strong>
            </span>
          </article>
          <article className="member-web-detail-kpi">
            <span>
              <small>공유조건</small>
              <strong>
                <span className={`badge ${isCustom ? "info" : "gray"}`}>{isCustom ? "별도조건" : "기본조건"}</span>
              </strong>
            </span>
          </article>
          <article className="member-web-detail-kpi">
            <span>
              <small>판매상태</small>
              <strong>
                <span className={`badge ${salesStatusBadgeClass(savedStatus)}`}>{savedStatus}</span>
              </strong>
            </span>
          </article>
          <article className="member-web-detail-kpi">
            <span>
              <small>판매수수료</small>
              <strong>{form.commissionRate ? `${form.commissionRate}%` : "-"}</strong>
            </span>
          </article>
          <article className="member-web-detail-kpi">
            <span>
              <small>공유기간</small>
              <strong title={formatFormSharePeriod(form)}>{formatFormSharePeriod(form)}</strong>
            </span>
          </article>
        </section>

        <div className="shared-product-grid">
          <section className="panel member-web-detail-card product-share-setting-card">
            <div className="member-web-detail-card-head">
              <strong>원본 상품정보</strong>
              <span className="badge gray">
                <Lock size={10} /> 읽기 전용
              </span>
              <span className="product-share-setting-head-meta">공급여행사 관리</span>
            </div>
            <div className="product-share-setting-card-body">
              <dl className="product-share-detail-list">
                <div className="is-wide">
                  <dt>원본 상품명</dt>
                  <dd>
                    <strong>{product.name}</strong>
                  </dd>
                </div>
                <div>
                  <dt>상품코드</dt>
                  <dd>{product.code}</dd>
                </div>
                <div>
                  <dt>공급여행사</dt>
                  <dd>{product.supplierName}</dd>
                </div>
                <div>
                  <dt>카테고리</dt>
                  <dd>{product.category}</dd>
                </div>
                <div>
                  <dt>판매기간</dt>
                  <dd>{formatSalesPeriod(product.salesPeriod)}</dd>
                </div>
                <div>
                  <dt>판매가격</dt>
                  <dd>{product.price}원</dd>
                </div>
                <div>
                  <dt>상품상태</dt>
                  <dd>{product.productStatus}</dd>
                </div>
                {ORIGINAL_PENDING_FIELDS.map((label) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd className="shared-product-pending">{SHARED_DATA_PENDING}</dd>
                  </div>
                ))}
              </dl>
              <p className="product-share-setting-help">{SHARED_ORIGINAL_SYNC_NOTICE}</p>
            </div>
          </section>

          <section className="panel member-web-detail-card product-share-setting-card">
            <div className="member-web-detail-card-head">
              <strong>공유조건</strong>
              <span className={`badge ${isCustom ? "info" : "gray"}`}>{isCustom ? "별도조건 적용" : "기본조건 적용"}</span>
              <span className="product-share-setting-head-meta">읽기 전용</span>
            </div>
            <div className="product-share-setting-card-body">
              <dl className="product-share-detail-list">
                <div>
                  <dt>요청방식</dt>
                  <dd>{SHARE_REQUEST_MODE_LABELS[form.requestMode]}</dd>
                </div>
                <div>
                  <dt>공유기간</dt>
                  <dd>{formatFormSharePeriod(form)}</dd>
                </div>
                <div>
                  <dt>판매수수료</dt>
                  <dd>{form.commissionRate ? `${form.commissionRate}%` : "미지정"}</dd>
                </div>
                <div>
                  <dt>재고 운영</dt>
                  <dd>{inventoryLabel}</dd>
                </div>
                <div className="is-wide">
                  <dt>판매채널</dt>
                  <dd>{allowedChannels.length ? allowedChannels.map((option) => option.label).join(", ") : "허용된 채널 없음"}</dd>
                </div>
                <div className="is-wide">
                  <dt>수정 가능 항목</dt>
                  <dd>{editableLabels.length ? editableLabels.join(", ") : "수정 가능한 항목 없음"}</dd>
                </div>
              </dl>
              {isCustom && (
                <p className="product-share-setting-help">공급여행사가 자사에 별도로 지정한 공유조건이 적용되어 있습니다.</p>
              )}
            </div>
          </section>
        </div>

        <section
          ref={salesSectionRef}
          id="shared-sales-settings"
          className="panel member-web-detail-card product-share-setting-card shared-product-sales-card"
        >
          <div className="member-web-detail-card-head">
            <strong>자사 판매설정</strong>
            <span className={`badge ${editable ? "info" : "gray"}`}>{editable ? "수정 가능" : "수정 불가"}</span>
            <span className="product-share-setting-head-meta">공급여행사가 허용한 항목만 수정할 수 있습니다.</span>
          </div>
          <fieldset
            className={`product-share-setting-fields${editable ? "" : " is-disabled"}`}
            disabled={!editable}
            aria-disabled={!editable}
          >
            <div className="product-share-setting-card-body">
              {!editable && statusNotice && <p className="product-share-setting-disabled-note">{statusNotice}</p>}

              <div className="product-share-setting-row">
                <span className="product-share-setting-label">자사 카테고리</span>
                <div className="product-share-setting-row-body">
                  <div className="shared-product-category">
                    <select
                      className="product-share-setting-select"
                      aria-label="자사 카테고리 대분류"
                      value={draft.categoryMain}
                      disabled={!canEdit("category")}
                      onChange={(event) => changeCategoryMain(event.target.value)}
                    >
                      <option value="">대분류 선택</option>
                      {SHARED_OWN_CATEGORY_MAINS.map((main) => (
                        <option key={main} value={main}>
                          {main}
                        </option>
                      ))}
                    </select>
                    <select
                      className="product-share-setting-select"
                      aria-label="자사 카테고리 중분류"
                      value={draft.categorySub}
                      disabled={!canEdit("category") || !draft.categoryMain}
                      onChange={(event) => update("categorySub", event.target.value)}
                    >
                      <option value="">중분류 선택</option>
                      {subCategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="product-share-setting-help">원본 카테고리: {product.category}</p>
                  {lockedHelp("category")}
                </div>
              </div>

              <div className="product-share-setting-row">
                <span className="product-share-setting-label">홈페이지 노출</span>
                <div className="product-share-setting-row-body">
                  <div className="shared-product-visible">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={draft.homepageVisible}
                      aria-label="홈페이지 노출"
                      className={`shared-product-switch${draft.homepageVisible ? " is-on" : ""}`}
                      disabled={!canEdit("visible")}
                      onClick={() => update("homepageVisible", !draft.homepageVisible)}
                    >
                      <i />
                    </button>
                    <span className={`badge ${draft.homepageVisible ? "success" : "gray"}`}>
                      {draft.homepageVisible ? "노출중" : "미노출"}
                    </span>
                  </div>
                  {lockedHelp("visible")}
                </div>
              </div>

              <div className="product-share-setting-row">
                <span className="product-share-setting-label">판매용 상품명</span>
                <div className="product-share-setting-row-body">
                  <input
                    className="shared-product-input"
                    aria-label="판매용 상품명"
                    value={draft.salesName}
                    maxLength={80}
                    disabled={!canEdit("salesName")}
                    aria-invalid={editable && allowed("salesName") && !draft.salesName.trim()}
                    onChange={(event) => update("salesName", event.target.value)}
                  />
                  <p className="product-share-setting-help">
                    원본 상품명: {product.name}
                    {canEdit("salesName") && draft.salesName !== product.name && (
                      <button type="button" className="shared-product-link-btn" onClick={() => update("salesName", product.name)}>
                        원본 상품명으로 되돌리기
                      </button>
                    )}
                  </p>
                  {lockedHelp("salesName")}
                </div>
              </div>

              <div className="product-share-setting-row">
                <span className="product-share-setting-label">소개문구</span>
                <div className="product-share-setting-row-body">
                  <textarea
                    className="product-share-agency-memo"
                    aria-label="판매용 소개문구"
                    rows={3}
                    maxLength={300}
                    placeholder="DMZ와 소이산 모노레일을 하루에 즐기는 철원 대표 당일여행입니다."
                    value={draft.salesIntro}
                    disabled={!canEdit("salesIntro")}
                    onChange={(event) => update("salesIntro", event.target.value)}
                  />
                  <p className="product-share-setting-help">{draft.salesIntro.length} / 300자</p>
                  {lockedHelp("salesIntro")}
                </div>
              </div>

              <div className="product-share-setting-row">
                <span className="product-share-setting-label">판매상태</span>
                <div className="product-share-setting-row-body">
                  <div className="product-share-setting-radios" role="radiogroup" aria-label="판매상태">
                    {SHARED_SALES_STATUS_OPTIONS.map((status) => (
                      <label key={status}>
                        <input
                          type="radio"
                          name="shared-sales-status"
                          checked={draft.salesStatus === status}
                          disabled={status === "판매중" && !editable}
                          onChange={() => update("salesStatus", status)}
                        />
                        <span className={`badge ${salesStatusBadgeClass(status)}`}>{status}</span>
                      </label>
                    ))}
                  </div>
                  {!editable && (
                    <p className="shared-product-locked-help">
                      <Lock size={11} />
                      {SHARED_SALES_BLOCKED_MESSAGE}
                    </p>
                  )}
                </div>
              </div>

              {errors.length > 0 && isDirty && (
                <div className="shared-product-errors" role="alert">
                  <strong>판매설정이 완료되지 않았습니다.</strong>
                  <ul>
                    {errors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {visibilityWarning && (
                <p className="product-share-setting-alert" role="note">
                  <Info size={13} />
                  {visibilityWarning}
                </p>
              )}
            </div>
          </fieldset>
        </section>

        <div className="shared-product-grid">
          <section className="panel member-web-detail-card product-share-setting-card">
            <div className="member-web-detail-card-head">
              <strong>원본 상품정보 수정</strong>
              <span className="badge gray">수정 불가</span>
            </div>
            <div className="product-share-setting-card-body">
              <div className="product-share-setting-perm-group is-locked">
                <ul className="product-share-preview-perm-list is-locked">
                  {SHARE_LOCKED_ITEMS.map((item) => (
                    <li key={item.key}>
                      <Lock size={12} />
                      {item.label.replace(/ 수정$/, "")}
                      <span className="badge gray">공급여행사 관리</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="product-share-setting-alert" role="note">
                <Info size={13} />
                {SHARED_ORIGINAL_LOCKED_NOTICE}
              </p>
            </div>
          </section>

          <section className="panel member-web-detail-card product-share-setting-card">
            <div className="member-web-detail-card-head">
              <strong>판매채널</strong>
              <span className="product-share-setting-head-meta">
                허용 {allowedChannels.length} / {SALES_CHANNEL_OPTIONS.length}
              </span>
            </div>
            <div className="product-share-setting-card-body">
              <ul className="product-share-preview-perm-list">
                {SALES_CHANNEL_OPTIONS.map((option) => {
                  const on = form.salesChannels[option.key];
                  return (
                    <li key={option.key} className={on ? "" : "is-off"}>
                      {on ? <Check size={12} /> : <Lock size={12} />}
                      {option.label}
                      <span className={`badge ${on ? "success" : "gray"}`}>{on ? "허용" : "미허용"}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="product-share-setting-help">
                판매채널은 공급여행사가 지정하며, 제휴여행사에서 채널을 추가할 수 없습니다.
              </p>
            </div>
          </section>
        </div>

        <section className="panel member-web-detail-card product-share-setting-card">
          <div className="member-web-detail-card-head">
            <strong>판매 링크</strong>
            <span className={`badge ${linkActive ? "success" : "gray"}`}>{linkActive ? "판매 가능" : "판매 불가"}</span>
            <span className="product-share-setting-head-meta">SAMPLE URL</span>
          </div>
          <div className="product-share-setting-card-body">
            <div className="shared-product-link">
              <input className="shared-product-input" aria-label="판매 링크" value={salesLink} readOnly />
              <button type="button" className="secondary" onClick={copyLink}>
                <Copy size={14} />
                링크 복사
              </button>
              <button type="button" className="secondary" onClick={() => setPreviewOpen(true)}>
                <Eye size={14} />
                미리보기
              </button>
            </div>
            {!linkActive && (
              <p className="product-share-setting-help">
                {editable
                  ? "저장된 판매상태가 판매중이고 홈페이지에 노출 중일 때 고객이 링크로 상품을 확인할 수 있습니다."
                  : SHARED_SALES_BLOCKED_MESSAGE}
              </p>
            )}
          </div>
        </section>

        <section className="product-affiliate-sticky-actions">
          <div>
            {lastSavedAt ? `최종 저장 ${lastSavedAt}` : "자사 판매설정"}
            <span className={`product-share-setting-dirty${isDirty ? " is-dirty" : ""}`}>
              {!editable
                ? "현재 공유상태에서는 판매설정을 수정할 수 없습니다."
                : isDirty
                  ? "저장하지 않은 변경사항이 있습니다."
                  : "모든 변경사항이 저장되었습니다."}
            </span>
            {isDirty && errors.length > 0 && (
              <span className="product-share-setting-dirty is-error">입력 오류를 수정해야 저장할 수 있습니다.</span>
            )}
          </div>
          <div className="product-affiliate-sticky-buttons">
            <button type="button" className="secondary" onClick={goList}>
              목록
            </button>
            <button type="button" className="secondary" onClick={resetChanges} disabled={!isDirty}>
              <RotateCcw size={14} />
              초기화
            </button>
            <button type="button" className="primary" onClick={save} disabled={!canSave}>
              <Save size={14} />
              판매설정 저장
            </button>
          </div>
        </section>

        <footer>© 2026 AOS Travel ERP · AviaNext</footer>
      </main>
    </ProductAdminShell>
  );
}
