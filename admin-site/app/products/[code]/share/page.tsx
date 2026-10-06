"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye, Info, Lock, Plus, QrCode, RotateCcw, Save, Search, Share2, Users } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  getProductBoardingPath,
  getProductSellerSettingPath,
  getSupplierProductByCode,
} from "@/lib/admin/products-data";
import {
  AFFILIATE_PARTNERSHIP_STATUS_OPTIONS,
  AFFILIATE_SHARE_GROUP_OPTIONS,
  INVENTORY_MODE_OPTIONS,
  SALES_CHANNEL_OPTIONS,
  SELLER_CHANNEL_NOTICE,
  SHARED_INVENTORY_NOTICE,
  SHARE_ACTION_POLICY,
  SHARE_REQUEST_MODE_OPTIONS,
  classifyShareApplyTargets,
  cloneAffiliateRows,
  cloneShareCondition,
  countAffiliateShareStatuses,
  formatAffiliateGroups,
  formatShareApplyMessage,
  formFromStoredRow,
  getProductAffiliateSummary,
  getSampleAffiliateAgencies,
  isSharedStatus,
  parsePriceInput,
  partnershipStatusBadgeClass,
  requestModeSummaryLabel,
  shareStatusBadgeClass,
  shareStatusForRequestMode,
  storedConditionFromForm,
  todayIsoDate,
  toUnsharedRow,
  type AffiliateAgencyRow,
  type AffiliateShareGroupFilter,
  type ProductShareStatus,
  type ShareConditionForm,
} from "@/lib/admin/product-affiliate-data";
import {
  PRODUCT_DETAIL_TABS,
  INVENTORY_SHORT_LABELS,
  PAUSED_NOT_RESUMED_NOTICE,
  RESHARE_BLOCKED_MESSAGE,
  SHARE_DEFAULT_CONDITION_NOTICE,
  SHARE_EDITABLE_ITEMS,
  SHARE_LOCKED_ITEMS,
  SHARE_PROVIDED_ADMIN_INFO,
  SHARE_PROVIDED_SALES_INFO,
  SHARE_REQUEST_MODE_DESCRIPTIONS,
  SHARE_REQUEST_MODE_LABELS,
  SHARE_RESHARE_NOTICE,
  classifyAllShareTargets,
  cloneShareDefaultSettings,
  createDefaultShareSettings,
  agencyShareBlockReason,
  formatSalesPeriod,
  formatSharePeriod,
  hasCustomShareCondition,
  normalizeCommissionInput,
  shareConditionFormFromDefaults,
  shareConditionSummary,
  toShareSettingRows,
  validateSharePeriod,
  type ProductDetailTab,
  type ShareDefaultSettings,
} from "@/lib/admin/product-share-setting-data";
import { ProductAffiliateNotFound } from "@/components/products/ProductAffiliateNotFound";
import { ShareAgencyPickerModal } from "@/components/products/ShareAgencyPickerModal";
import { ShareAllTargetsModal } from "@/components/products/ShareAllTargetsModal";
import { ShareConditionModal } from "@/components/products/ShareConditionModal";
import { ShareConfirmDialog, type ShareConfirmDialogState } from "@/components/products/ShareConfirmDialog";
import { ShareDetailModal } from "@/components/products/ShareDetailModal";
import { ShareManageActions } from "@/components/products/ShareManageActions";
import { SharePreviewModal, type SharePreviewOption } from "@/components/products/SharePreviewModal";

type ShareDraft = {
  settings: ShareDefaultSettings;
  /** shareCondition이 있으면 여행사별 별도조건, null이면 상품 기본 공유조건 */
  rows: AffiliateAgencyRow[];
};

type PartnershipFilter = (typeof AFFILIATE_PARTNERSHIP_STATUS_OPTIONS)[number];

function cloneDraft(draft: ShareDraft): ShareDraft {
  return {
    settings: cloneShareDefaultSettings(draft.settings),
    rows: cloneAffiliateRows(draft.rows),
  };
}

function isClosedShareStatus(status: ProductShareStatus) {
  return status === "공유 종료" || status === "공유 거절";
}

/**
 * 상품관리 > 상품 상세 > 상품공유 설정 (공식 상품공유 페이지)
 * - 조건 우선순위: 상품 기본 공유조건 < 여행사별 별도조건(row.shareCondition)
 * - DB/API/정산조건 없음. 모든 변경은 화면 메모리에만 유지됩니다.
 */
export default function ProductShareSettingPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const productCode = decodeURIComponent(params.code ?? "");

  const product = useMemo(() => getSupplierProductByCode(productCode), [productCode]);
  const summary = useMemo(() => getProductAffiliateSummary(productCode), [productCode]);
  const initialRows = useMemo(() => getSampleAffiliateAgencies(productCode), [productCode]);

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["상품관리"]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const [saved, setSaved] = useState<ShareDraft>(() => ({
    settings: createDefaultShareSettings(),
    rows: toShareSettingRows(initialRows ?? []),
  }));
  const [draft, setDraft] = useState<ShareDraft>(() => cloneDraft(saved));
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [agencyKeyword, setAgencyKeyword] = useState("");
  const [groupFilter, setGroupFilter] = useState<AffiliateShareGroupFilter>("전체");
  const [partnershipFilter, setPartnershipFilter] = useState<PartnershipFilter>("전체");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ShareConfirmDialogState | null>(null);
  const [conditionTargetId, setConditionTargetId] = useState<string | null>(null);
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);
  const [allTargetsOpen, setAllTargetsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const settings = draft.settings;
  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const counts = useMemo(() => countAffiliateShareStatuses(draft.rows), [draft.rows]);
  const shareTargets = useMemo(() => draft.rows.filter((row) => isSharedStatus(row.shareStatus)), [draft.rows]);
  const pickerCandidates = useMemo(() => draft.rows.filter((row) => row.shareStatus === "미공유"), [draft.rows]);
  const allShare = useMemo(() => classifyAllShareTargets(draft.rows), [draft.rows]);
  const filteredTargets = useMemo(() => {
    const keyword = agencyKeyword.trim();
    return shareTargets.filter((row) => {
      if (keyword && !row.name.includes(keyword)) return false;
      if (groupFilter !== "전체" && !row.groups.includes(groupFilter)) return false;
      if (partnershipFilter !== "전체" && row.partnershipStatus !== partnershipFilter) return false;
      return true;
    });
  }, [shareTargets, agencyKeyword, groupFilter, partnershipFilter]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const act = (message: string, duration = 2200) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), duration);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const confirmLeave = () =>
    !isDirty || window.confirm("저장하지 않은 변경사항이 있습니다. 이동하면 변경사항이 사라집니다. 이동할까요?");

  const goList = () => {
    if (!confirmLeave()) return;
    router.push("/products");
  };

  if (!product || !summary || !initialRows) {
    return (
      <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
        <div className="workspace" style={{ marginLeft: collapsed ? 64 : 236 }}>
          <main className="content product-affiliate-content">
            <ProductAffiliateNotFound
              title="상품공유 설정을 열 수 없습니다."
              message="자사가 공급하는 상품이 아니거나, 상품공유 샘플 데이터가 없는 상품입니다."
              onBack={() => router.push("/products")}
            />
          </main>
        </div>
      </div>
    );
  }

  const salesStatusLabel = product.soldout ? "품절" : product.visible ? summary.salesStatus : "비노출";
  const salesStatusBadge = salesStatusLabel === "판매중" ? "success" : salesStatusLabel === "품절" ? "danger" : "gray";
  const newShareStatus = shareStatusForRequestMode(settings.requestMode);

  const updateSettings = <K extends keyof ShareDefaultSettings>(key: K, value: ShareDefaultSettings[K]) => {
    setDraft((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  };

  const updateRows = (updater: (rows: AffiliateAgencyRow[]) => AffiliateAgencyRow[]) => {
    setDraft((current) => ({ ...current, rows: updater(current.rows) }));
  };

  const listPrice = parsePriceInput(product.price) ?? 0;

  const isCustomRow = hasCustomShareCondition;

  /** 기본 공유조건 form. 진행 중인 공유는 여행사의 현재 공유기간을 유지합니다. */
  const defaultFormFor = (row?: AffiliateAgencyRow): ShareConditionForm => {
    const keepPeriod = row && isSharedStatus(row.shareStatus) && !isClosedShareStatus(row.shareStatus);
    return shareConditionFormFromDefaults(
      settings,
      listPrice,
      keepPeriod ? { start: row.shareStartDate, end: row.shareEndDate } : undefined,
    );
  };

  /** 현재 적용 중인 조건: 별도조건이 있으면 우선, 없으면 기본 공유조건 */
  const effectiveFormFor = (row: AffiliateAgencyRow): ShareConditionForm => {
    if (!row.shareCondition) return defaultFormFor(row);
    if (!isClosedShareStatus(row.shareStatus)) return formFromStoredRow(row, listPrice);
    return { ...formFromStoredRow(row, listPrice), ...cloneShareCondition(row.shareCondition), customerListPrice: listPrice };
  };

  /** 신규 추가·다시 공유 시 적용할 상태와 공유기간. 별도조건이 있으면 별도조건을 사용합니다. */
  const planFromForm = (form: ShareConditionForm) => {
    const today = todayIsoDate();
    const shareStartDate = form.noEndDate || !form.startDate || form.startDate < today ? today : form.startDate;
    const shareEndDate = form.noEndDate ? null : form.endDate || null;
    return { shareStatus: shareStatusForRequestMode(form.requestMode), shareStartDate, shareEndDate };
  };

  const sharePlanFor = (row: AffiliateAgencyRow) =>
    planFromForm(isCustomRow(row) ? effectiveFormFor(row) : shareConditionFormFromDefaults(settings, listPrice));

  const defaultSharePlan = planFromForm(shareConditionFormFromDefaults(settings, listPrice));

  const pagePeriod = validateSharePeriod({
    hasEndDate: settings.periodMode === "range",
    startDate: settings.periodMode === "range" ? settings.periodStart : todayIsoDate(),
    endDate: settings.periodEnd,
    salesPeriod: product.period,
  });
  const canSave = isDirty && !pagePeriod.hasError;

  const formatNow = () => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const commitSave = (next: ShareDraft, message: string) => {
    setDraft(next);
    setSaved(cloneDraft(next));
    setLastSavedAt(formatNow());
    act(message, 3200);
  };

  /** 전체 공유: 신규 대상(미공유·종료·거절)만 상태를 바꾸고, 별도조건 여행사는 별도조건으로 공유합니다. */
  const applyAllShareToDraft = () => {
    const ids = new Set(allShare.newTargets.map((row) => row.id));
    const rows = draft.rows.map((row) => (ids.has(row.id) ? { ...row, ...sharePlanFor(row) } : row));
    const applied = rows.filter((row) => ids.has(row.id));
    const active = applied.filter((row) => row.shareStatus === "공유 중").length;
    const message = `전체 제휴여행사 ${applied.length}곳에 상품공유를 적용했습니다. (공유 중 ${active} · 수락대기 ${applied.length - active})`;
    return { next: { ...draft, rows }, message };
  };

  const openAllShareConfirm = (andSave: boolean) => {
    const customCount = allShare.newTargets.filter((row) => isCustomRow(row)).length;
    const details = [
      {
        label: "공유 대상",
        value: `${allShare.shareable.length}개 여행사 (신규 공유 ${allShare.newTargets.length}곳 · 기존 상태 유지 ${allShare.kept.length}곳)`,
      },
      { label: "공유 제외", value: `${allShare.excluded.length}개 여행사` },
      { label: "공유 요청 방식", value: SHARE_REQUEST_MODE_LABELS[settings.requestMode] },
      { label: "공유기간", value: formatSharePeriod(defaultSharePlan.shareStartDate, defaultSharePlan.shareEndDate) },
      { label: "판매수수료", value: settings.commissionRate ? `${settings.commissionRate}%` : "미지정" },
      { label: "재고 운영", value: INVENTORY_SHORT_LABELS[settings.inventoryMode] },
    ];
    if (customCount > 0) details.push({ label: "별도조건 여행사", value: `${customCount}곳은 여행사별 별도조건으로 공유` });
    setConfirmDialog({
      title: "전체 제휴여행사에 상품을 공유하시겠습니까?",
      details,
      message:
        `공유 중·수락대기 상태인 여행사와 여행사별 별도조건은 그대로 유지됩니다. ${PAUSED_NOT_RESUMED_NOTICE}` +
        (andSave ? " 공유 적용 후 설정이 함께 저장됩니다." : " 하단 변경내용 저장을 눌러야 저장됩니다."),
      confirmLabel: "공유 적용",
      onConfirm: () => {
        setConfirmDialog(null);
        const { next, message } = applyAllShareToDraft();
        if (andSave) {
          commitSave(next, message);
          return;
        }
        setDraft(next);
        act(message, 3200);
      },
    });
  };

  const askConfirm = (
    policy: Pick<ShareConfirmDialogState, "title" | "message" | "confirmLabel">,
    onConfirm: () => void,
  ) => {
    setConfirmDialog({
      ...policy,
      onConfirm: () => {
        setConfirmDialog(null);
        onConfirm();
      },
    });
  };

  const addAgencies = (ids: string[]) => {
    const selected = draft.rows.filter((row) => ids.includes(row.id));
    const { applicable, processable, skippedActive, skippedPending } = classifyShareApplyTargets(selected, draft.rows);
    const message = formatShareApplyMessage({
      mode: settings.requestMode,
      applicableCount: applicable.length,
      appliedCount: processable.length,
      skippedActiveCount: skippedActive.length,
      skippedPendingCount: skippedPending.length,
    });
    if (processable.length > 0) {
      const processIds = new Set(processable.map((row) => row.id));
      updateRows((rows) =>
        rows.map((row) => (processIds.has(row.id) ? { ...row, ...sharePlanFor(row) } : row)),
      );
    }
    setPickerOpen(false);
    act(message, 3200);
  };

  const pauseShare = (id: string) =>
    askConfirm(SHARE_ACTION_POLICY.pause, () => {
      updateRows((rows) =>
        rows.map((row) => (row.id === id && row.shareStatus === "공유 중" ? { ...row, shareStatus: "공유 중지" } : row)),
      );
      act("상품공유를 중지했습니다. 신규예약만 차단되며 기존 예약과 정산은 유지됩니다.");
    });

  const resumeShare = (id: string) =>
    askConfirm(SHARE_ACTION_POLICY.resume, () => {
      updateRows((rows) =>
        rows.map((row) => (row.id === id && row.shareStatus === "공유 중지" ? { ...row, shareStatus: "공유 중" } : row)),
      );
      act("상품공유를 재개했습니다.");
    });

  const cancelShareRequest = (id: string) =>
    askConfirm(SHARE_ACTION_POLICY.cancelRequest, () => {
      updateRows((rows) => rows.map((row) => (row.id === id && row.shareStatus === "수락대기" ? toUnsharedRow(row) : row)));
      act("공유 요청을 취소했습니다.");
    });

  const releaseShare = (id: string) =>
    askConfirm(SHARE_ACTION_POLICY.release, () => {
      updateRows((rows) => rows.map((row) => (row.id === id && row.shareStatus === "공유 중지" ? toUnsharedRow(row) : row)));
      act("상품공유를 해제했습니다. 기존 예약과 정산 관계는 유지됩니다.");
    });

  const reshare = (id: string) => {
    const target = draft.rows.find((row) => row.id === id);
    if (!target) return;
    const blockReason = agencyShareBlockReason(target);
    if (blockReason) {
      act(`${RESHARE_BLOCKED_MESSAGE} ${blockReason}`, 3600);
      return;
    }
    const plan = sharePlanFor(target);
    const conditionLabel = isCustomRow(target) ? "여행사별 별도조건" : "기본 공유조건";
    askConfirm(
      {
        title: "다시 공유",
        message: `${conditionLabel}(${requestModeSummaryLabel(effectiveFormFor(target).requestMode)})으로 다시 공유합니다. 이전 공유의 기존 예약과 정산 관계는 유지됩니다.`,
        confirmLabel: "다시 공유",
      },
      () => {
        updateRows((rows) =>
          rows.map((row) =>
            row.id === id && isClosedShareStatus(row.shareStatus) && !agencyShareBlockReason(row) ? { ...row, ...plan } : row,
          ),
        );
        act(plan.shareStatus === "공유 중" ? "상품 공유를 다시 시작했습니다." : "상품공유를 다시 요청했습니다.");
      },
    );
  };

  const conditionTarget = conditionTargetId ? draft.rows.find((row) => row.id === conditionTargetId) ?? null : null;
  const detailTarget = detailTargetId ? draft.rows.find((row) => row.id === detailTargetId) ?? null : null;

  /** 여행사별 별도조건 저장. 종료·거절 상태는 공유상태·기간을 바꾸지 않고 조건만 보관합니다. */
  const applyCondition = (form: ShareConditionForm) => {
    if (!conditionTarget) return;
    const id = conditionTarget.id;
    updateRows((rows) =>
      rows.map((row) => {
        if (row.id !== id) return row;
        if (isClosedShareStatus(row.shareStatus)) return { ...row, shareCondition: storedConditionFromForm(form) };
        const shareStartDate = form.noEndDate ? row.shareStartDate ?? todayIsoDate() : form.startDate;
        const shareEndDate = form.noEndDate ? null : form.endDate;
        return {
          ...row,
          shareStartDate,
          shareEndDate,
          shareCondition: storedConditionFromForm({ ...form, startDate: shareStartDate }),
        };
      }),
    );
    setConditionTargetId(null);
    act("제휴여행사별 공유조건이 적용되었습니다.");
  };

  const selectTab = (tab: ProductDetailTab) => {
    if (tab === "상품공유") return;
    if (tab === "판매설정") {
      if (!confirmLeave()) return;
      router.push(getProductSellerSettingPath(product.code));
      return;
    }
    if (tab === "탑승지 설정") {
      if (!confirmLeave()) return;
      router.push(getProductBoardingPath(product.code));
      return;
    }
    act(`${tab} 화면은 다음 단계에서 제공됩니다.`);
  };

  const resetChanges = () => {
    if (!isDirty) {
      act("변경된 내용이 없습니다.");
      return;
    }
    if (!window.confirm("변경사항을 마지막 저장 상태로 초기화할까요?")) return;
    setDraft(cloneDraft(saved));
    act("마지막 저장 상태로 초기화했습니다.");
  };

  const save = () => {
    if (!canSave) return;
    const switchedToAll = settings.targetMode === "all" && saved.settings.targetMode !== "all";
    if (switchedToAll && allShare.newTargets.length > 0) {
      openAllShareConfirm(true);
      return;
    }
    commitSave(draft, "상품공유 설정이 저장되었습니다.");
  };

  const previewOptions: SharePreviewOption[] = [
    { value: "default", label: "기본 공유조건", form: shareConditionFormFromDefaults(settings, listPrice), isCustom: false },
    ...draft.rows
      .filter((row) => row.shareStatus === "공유 중")
      .map((row) => ({ value: row.id, label: row.name, form: effectiveFormFor(row), isCustom: isCustomRow(row) })),
  ];

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div className="brand-copy">
            <strong>AOS</strong>
            <span>TRAVEL ERP</span>
          </div>
          <button className="collapse" onClick={() => setCollapsed(!collapsed)} aria-label="사이드바 접기">
            ‹
          </button>
        </div>
        <nav aria-label="관리자 메뉴">
          {ADMIN_MENU.map((item) => (
            <div className="nav-group" key={item.label}>
              <button
                className={`nav-item ${item.label === "상품관리" ? "active" : ""}`}
                onClick={() =>
                  item.label === "대시보드"
                    ? window.location.assign("/")
                    : item.children
                      ? toggleMenu(item.label)
                      : act(`${item.label} 화면으로 이동합니다.`)
                }
              >
                <span className="nav-icon">
                  {item.icon === "qr" ? <QrCode size={16} strokeWidth={1.8} /> : item.icon}
                </span>
                <span className="nav-label">{item.label}</span>
                {item.children && <span className={`chevron ${expanded.includes(item.label) ? "open" : ""}`}>⌄</span>}
              </button>
              {item.children && expanded.includes(item.label) && !collapsed && (
                <div className="subnav">
                  {item.children.map((child) => (
                    <button
                      className={child === "상품목록" ? "current" : ""}
                      key={child}
                      onClick={() => navigateAdminChild(child, act)}
                    >
                      {child}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>상품관리</span>
            <b>/</b>
            <button type="button" className="product-affiliate-crumb" onClick={goList}>
              상품목록
            </button>
            <b>/</b>
            <strong>상품공유 설정</strong>
          </div>
        </header>

        <main className="content product-affiliate-content product-share-setting-content">
          <section className="page-head product-affiliate-page-head">
            <div>
              <div className="product-affiliate-title-row">
                <button type="button" className="secondary product-affiliate-back" onClick={goList}>
                  <ArrowLeft size={14} />
                  상품목록
                </button>
                <h1>상품공유 설정</h1>
              </div>
              <p>공급여행사가 이 상품을 공유할 제휴여행사와 공유조건을 설정합니다.</p>
            </div>
            <div className="product-affiliate-head-actions">
              <button type="button" className="secondary" onClick={() => setPreviewOpen(true)}>
                <Eye size={14} />
                공유 미리보기
              </button>
              <button type="button" className="primary" onClick={save} disabled={!canSave}>
                <Save size={14} />
                변경내용 저장
              </button>
            </div>
          </section>

          <nav className="member-web-detail-tabs product-affiliate-tabs" aria-label="상품 상세 탭">
            {PRODUCT_DETAIL_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={tab === "상품공유" ? "active" : ""}
                aria-current={tab === "상품공유" ? "page" : undefined}
                onClick={() => selectTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>

          <section className="product-share-setting-summary" aria-label="상품 기본정보">
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
                <strong>{summary.supplierName}</strong>
              </span>
            </article>
            <article className="member-web-detail-kpi">
              <span>
                <small>판매상태</small>
                <strong>
                  <span className={`badge ${salesStatusBadge}`}>{salesStatusLabel}</span>
                </strong>
              </span>
            </article>
            <article className="member-web-detail-kpi">
              <span>
                <small>공유 중</small>
                <strong className="product-affiliate-count-active">{counts.active}</strong>
              </span>
            </article>
            <article className="member-web-detail-kpi">
              <span>
                <small>수락대기</small>
                <strong className="product-affiliate-count-pending">{counts.pending}</strong>
              </span>
            </article>
            <article className="member-web-detail-kpi">
              <span>
                <small>최종 수정일</small>
                <strong>{lastSavedAt ?? summary.lastModifiedAt}</strong>
              </span>
            </article>
          </section>

          <section className="panel member-web-detail-card product-share-setting-card">
            <div className="member-web-detail-card-head">
              <strong>상품공유 사용</strong>
            </div>
            <div className="product-share-setting-card-body">
              <div className="product-share-setting-radios" role="radiogroup" aria-label="상품공유 사용 여부">
                <label>
                  <input
                    type="radio"
                    name="share-enabled"
                    checked={settings.shareEnabled}
                    onChange={() => updateSettings("shareEnabled", true)}
                  />
                  사용
                </label>
                <label>
                  <input
                    type="radio"
                    name="share-enabled"
                    checked={!settings.shareEnabled}
                    onChange={() => updateSettings("shareEnabled", false)}
                  />
                  사용 안 함
                </label>
              </div>
              <p className="product-share-setting-help">
                상품공유를 사용하면 선택한 제휴여행사가 해당 상품을 자사 홈페이지에서 판매할 수 있습니다.
              </p>
              <p className="product-share-setting-alert" role="note">
                <Info size={13} />
                공유를 중지해도 이미 접수된 예약은 유지됩니다.
              </p>
            </div>
          </section>

          <fieldset
            className={`product-share-setting-fields${settings.shareEnabled ? "" : " is-disabled"}`}
            disabled={!settings.shareEnabled}
            aria-disabled={!settings.shareEnabled}
          >
            {!settings.shareEnabled && (
              <p className="product-share-setting-disabled-note">
                상품공유 사용 안 함 상태입니다. 아래 설정은 사용 선택 시 적용됩니다.
              </p>
            )}

            <section className="panel member-web-detail-card product-share-setting-card">
              <div className="member-web-detail-card-head">
                <strong>공유 대상</strong>
                <span className="product-share-setting-head-meta">
                  공유 대상 {shareTargets.length}곳 · 공유 중 {counts.active} · 수락대기 {counts.pending}
                </span>
              </div>
              <div className="product-share-setting-card-body">
                <div className="product-share-setting-radios" role="radiogroup" aria-label="공유 대상">
                  <label>
                    <input
                      type="radio"
                      name="share-target"
                      checked={settings.targetMode === "selected"}
                      onChange={() => updateSettings("targetMode", "selected")}
                    />
                    특정 제휴여행사 선택
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="share-target"
                      checked={settings.targetMode === "all"}
                      onChange={() => updateSettings("targetMode", "all")}
                    />
                    전체 제휴여행사
                  </label>
                </div>

                {settings.targetMode === "all" && (
                  <div className="product-share-all-summary">
                    <div className="product-share-all-summary-head">
                      <strong>
                        <Share2 size={14} />
                        전체 제휴여행사 공유
                      </strong>
                      <span>
                        공유 가능 여행사 <b>{allShare.shareable.length}</b>곳
                      </span>
                      <span>
                        공유 제외 여행사 <b className="is-muted">{allShare.excluded.length}</b>곳
                      </span>
                      <span>
                        신규 공유 대상 <b>{allShare.newTargets.length}</b>곳
                      </span>
                    </div>
                    <ul className="product-share-all-summary-notes">
                      <li>현재 거래 가능한 모든 제휴여행사에 상품을 공유합니다.</li>
                      <li>승인대기, 거래중지, 탈퇴 상태의 여행사는 자동 제외됩니다.</li>
                      <li>{PAUSED_NOT_RESUMED_NOTICE} 개별 재개 버튼으로만 공유 중 상태로 변경됩니다.</li>
                      <li>신규 공유 대상에는 기본 공유조건이 적용되며, 여행사별 별도조건이 있는 여행사는 별도조건을 유지합니다.</li>
                    </ul>
                    <div className="product-share-all-summary-actions">
                      <button type="button" className="secondary" onClick={() => setAllTargetsOpen(true)}>
                        <Users size={14} />
                        대상 여행사 보기
                      </button>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => openAllShareConfirm(false)}
                        disabled={allShare.newTargets.length === 0 || pagePeriod.hasError}
                      >
                        <Share2 size={14} />
                        {allShare.newTargets.length === 0 ? "신규 공유 대상 없음" : "전체 공유 적용"}
                      </button>
                      {pagePeriod.hasError && <span>기본 공유조건의 공유기간 오류를 먼저 수정해주세요.</span>}
                    </div>
                  </div>
                )}
                <div className="product-share-setting-search">
                  <label className="product-share-setting-search-input">
                    <Search size={14} />
                    <input
                      value={agencyKeyword}
                      onChange={(event) => setAgencyKeyword(event.target.value)}
                      placeholder="여행사명 검색"
                      aria-label="제휴여행사 검색"
                    />
                  </label>
                  <select
                    className="product-share-setting-select"
                    value={groupFilter}
                    onChange={(event) => setGroupFilter(event.target.value as AffiliateShareGroupFilter)}
                    aria-label="공유그룹"
                  >
                    {AFFILIATE_SHARE_GROUP_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option === "전체" ? "공유그룹 전체" : option}
                      </option>
                    ))}
                  </select>
                  <select
                    className="product-share-setting-select"
                    value={partnershipFilter}
                    onChange={(event) => setPartnershipFilter(event.target.value as PartnershipFilter)}
                    aria-label="제휴상태"
                  >
                    {AFFILIATE_PARTNERSHIP_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option === "전체" ? "제휴상태 전체" : option}
                      </option>
                    ))}
                  </select>
                  {settings.targetMode === "selected" ? (
                    <button type="button" className="primary" onClick={() => setPickerOpen(true)}>
                      <Plus size={14} />
                      제휴여행사 추가
                    </button>
                  ) : (
                    <span className="product-share-setting-head-meta">
                      현재 공유 대상 {shareTargets.length}곳 · 개별 추가는 특정 제휴여행사 선택에서 할 수 있습니다.
                    </span>
                  )}
                </div>
                <div className="member-web-detail-table-wrap">
                  <table className="member-web-detail-table product-share-setting-table">
                    <colgroup>
                      <col className="c-agency" />
                      <col className="c-partnership" />
                      <col className="c-status" />
                      <col className="c-period" />
                      <col className="c-condition" />
                      <col className="c-actions" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>제휴여행사</th>
                        <th>제휴상태</th>
                        <th>공유상태</th>
                        <th>공유기간</th>
                        <th>판매조건</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTargets.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="product-affiliate-empty">
                            {shareTargets.length === 0
                              ? "아직 공유 대상으로 지정된 제휴여행사가 없습니다. 제휴여행사 추가로 공유 대상을 지정하세요."
                              : "검색 조건에 맞는 공유 대상이 없습니다."}
                          </td>
                        </tr>
                      ) : (
                        filteredTargets.map((row) => {
                          const isCustom = isCustomRow(row);
                          const reshareBlocked = isClosedShareStatus(row.shareStatus) ? agencyShareBlockReason(row) : null;
                          const conditionSummary = shareConditionSummary(effectiveFormFor(row));
                          return (
                            <tr key={row.id}>
                              <td className="text-left">
                                <strong>{row.name}</strong>
                                <small className="product-share-setting-sub">
                                  {formatAffiliateGroups(row.groups) || "-"}
                                </small>
                              </td>
                              <td>
                                <span className={`badge ${partnershipStatusBadgeClass(row.partnershipStatus)}`}>
                                  {row.partnershipStatus}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${shareStatusBadgeClass(row.shareStatus)}`}>
                                  {row.shareStatus}
                                </span>
                              </td>
                              <td className="date-cell">{formatSharePeriod(row.shareStartDate, row.shareEndDate)}</td>
                              <td className="text-left" title={conditionSummary}>
                                <span className={`badge ${isCustom ? "info" : "gray"}`}>
                                  {isCustom ? "별도조건" : "기본조건"}
                                </span>
                                <small className="product-share-setting-sub product-share-setting-condition">
                                  {conditionSummary}
                                </small>
                              </td>
                              <td>
                                <div className="product-affiliate-row-actions">
                                  <ShareManageActions
                                    row={row}
                                    editLabel="조건설정"
                                    onEdit={setConditionTargetId}
                                    onView={setDetailTargetId}
                                    onReshare={reshare}
                                    reshareBlockedReason={reshareBlocked}
                                    onCancelRequest={cancelShareRequest}
                                    onPause={pauseShare}
                                    onResume={resumeShare}
                                    onRelease={releaseShare}
                                  />
                                </div>
                                {reshareBlocked && (
                                  <small className="product-share-setting-sub product-share-reshare-blocked" title={reshareBlocked}>
                                    다시 공유 불가 · {row.partnershipStatus}
                                  </small>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="panel member-web-detail-card product-share-setting-card">
              <div className="member-web-detail-card-head">
                <strong>기본 공유조건</strong>
              </div>
              <div className="product-share-setting-card-body">
                <p className="product-share-setting-help">{SHARE_DEFAULT_CONDITION_NOTICE}</p>
                <div className="product-share-setting-row">
                  <span className="product-share-setting-label">공유기간</span>
                  <div className="product-share-setting-row-body">
                    <div className="product-share-setting-radios" role="radiogroup" aria-label="공유기간">
                      <label>
                        <input
                          type="radio"
                          name="share-period"
                          checked={settings.periodMode === "always"}
                          onChange={() => updateSettings("periodMode", "always")}
                        />
                        상시 공유
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="share-period"
                          checked={settings.periodMode === "range"}
                          onChange={() => updateSettings("periodMode", "range")}
                        />
                        기간 지정
                      </label>
                    </div>
                    {settings.periodMode === "range" && (
                      <div className="product-share-setting-date-range">
                        <input
                          type="date"
                          value={settings.periodStart}
                          onChange={(event) => updateSettings("periodStart", event.target.value)}
                          aria-label="공유 시작일"
                          aria-invalid={Boolean(pagePeriod.errors.startDate)}
                        />
                        <em>~</em>
                        <input
                          type="date"
                          value={settings.periodEnd}
                          min={settings.periodStart || undefined}
                          onChange={(event) => updateSettings("periodEnd", event.target.value)}
                          aria-label="공유 종료일"
                          aria-invalid={Boolean(pagePeriod.errors.endDate)}
                        />
                      </div>
                    )}
                    {(pagePeriod.errors.startDate || pagePeriod.errors.endDate) && (
                      <p className="product-share-agency-error" role="alert">
                        {pagePeriod.errors.startDate ?? pagePeriod.errors.endDate}
                      </p>
                    )}
                    {pagePeriod.warnings.length > 0 && (
                      <div className="product-share-setting-alert product-share-period-warning" role="note">
                        <span>상품 판매기간 {formatSalesPeriod(product.period)}</span>
                        {pagePeriod.warnings.map((warning) => (
                          <span key={warning}>{warning}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="product-share-setting-row">
                  <span className="product-share-setting-label">공유 요청 방식</span>
                  <div className="product-share-setting-row-body">
                    <div className="product-share-setting-option-list" role="radiogroup" aria-label="공유 요청 방식">
                      {SHARE_REQUEST_MODE_OPTIONS.map((option) => (
                        <label key={option.value} className={settings.requestMode === option.value ? "is-selected" : undefined}>
                          <input
                            type="radio"
                            name="share-request-mode"
                            checked={settings.requestMode === option.value}
                            onChange={() => updateSettings("requestMode", option.value)}
                          />
                          <span>
                            <strong>{option.value === "accept" ? "수락 후 공유" : "즉시 공유"}</strong>
                            <small>{SHARE_REQUEST_MODE_DESCRIPTIONS[option.value]}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="product-share-setting-help">
                      신규 추가 시 상태 <span className={`badge ${shareStatusBadgeClass(newShareStatus)}`}>{newShareStatus}</span>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel member-web-detail-card product-share-setting-card">
              <div className="member-web-detail-card-head">
                <strong>판매조건</strong>
              </div>
              <div className="product-share-setting-card-body">
                <div className="product-share-setting-row">
                  <span className="product-share-setting-label">판매가격 기준</span>
                  <div className="product-share-setting-row-body">
                    <div className="product-share-setting-radios" role="radiogroup" aria-label="판매가격 기준">
                      <label>
                        <input type="radio" name="share-price-basis" checked readOnly />
                        원본 판매가 그대로 사용
                      </label>
                    </div>
                  </div>
                </div>
                <div className="product-share-setting-row">
                  <span className="product-share-setting-label">판매수수료</span>
                  <div className="product-share-setting-row-body">
                    <div className="product-share-setting-commission">
                      <span>판매금액 기준</span>
                      <div className="product-share-setting-unit-input">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={settings.commissionRate}
                          onChange={(event) => {
                            const next = normalizeCommissionInput(event.target.value);
                            if (!next || Number(next) <= 100) updateSettings("commissionRate", next);
                          }}
                          aria-label="판매수수료율"
                        />
                        <b>%</b>
                      </div>
                    </div>
                    <p className="product-share-setting-help">
                      제휴여행사를 통해 발생한 예약의 판매금액을 기준으로 수수료를 계산합니다.
                    </p>
                  </div>
                </div>
                <div className="product-share-setting-row">
                  <span className="product-share-setting-label">재고 운영방식</span>
                  <div className="product-share-setting-row-body">
                    <div className="product-share-setting-option-list" role="radiogroup" aria-label="재고 운영방식">
                      {INVENTORY_MODE_OPTIONS.map((option) => (
                        <label key={option.value} className={settings.inventoryMode === option.value ? "is-selected" : undefined}>
                          <input
                            type="radio"
                            name="share-inventory-mode"
                            checked={settings.inventoryMode === option.value}
                            onChange={() => updateSettings("inventoryMode", option.value)}
                          />
                          <span>
                            <strong>{option.label}</strong>
                            <small>{option.description}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                    {settings.inventoryMode === "shared" && (
                      <p className="product-share-setting-help">{SHARED_INVENTORY_NOTICE}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel member-web-detail-card product-share-setting-card">
              <div className="member-web-detail-card-head">
                <strong>제휴여행사 수정 가능 항목</strong>
              </div>
              <div className="product-share-setting-card-body product-share-setting-perm">
                <div className="product-share-setting-perm-group">
                  <h4>
                    판매정보 <span className="badge info">수정 가능</span>
                  </h4>
                  <div className="product-share-setting-checks">
                    {SHARE_EDITABLE_ITEMS.map((item) => (
                      <label key={item.key}>
                        <input
                          type="checkbox"
                          checked={settings.editableItems[item.key] ?? false}
                          onChange={(event) =>
                            updateSettings("editableItems", { ...settings.editableItems, [item.key]: event.target.checked })
                          }
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="product-share-setting-perm-group is-locked">
                  <h4>
                    원본 상품정보 <span className="badge gray">수정 불가</span>
                  </h4>
                  <div className="product-share-setting-checks">
                    {SHARE_LOCKED_ITEMS.map((item) => (
                      <label key={item.key}>
                        <input type="checkbox" checked={false} disabled readOnly />
                        <Lock size={11} />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel member-web-detail-card product-share-setting-card">
              <div className="member-web-detail-card-head">
                <strong>판매채널 허용</strong>
              </div>
              <div className="product-share-setting-card-body">
                <div className="product-share-setting-checks product-share-setting-checks--channels">
                  {SALES_CHANNEL_OPTIONS.map((option) => (
                    <label key={option.key}>
                      <input
                        type="checkbox"
                        checked={settings.salesChannels[option.key]}
                        onChange={(event) =>
                          updateSettings("salesChannels", { ...settings.salesChannels, [option.key]: event.target.checked })
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {settings.salesChannels.sellers && <p className="product-share-setting-help">{SELLER_CHANNEL_NOTICE}</p>}
                <p className="product-share-setting-alert" role="note">
                  <Lock size={13} />
                  {SHARE_RESHARE_NOTICE}
                </p>
              </div>
            </section>
          </fieldset>

          <section className="panel member-web-detail-card product-share-setting-card">
            <div className="member-web-detail-card-head">
              <strong>예약 관리 정책</strong>
            </div>
            <div className="product-share-setting-card-body product-share-setting-policy">
              <div className="product-share-setting-policy-step">
                <span className="badge info">1단계</span>
                <strong>예약 접수 ~ 예약마감 전</strong>
                <p>예약을 접수한 판매여행사에서 예약정보를 수정할 수 있습니다.</p>
              </div>
              <div className="product-share-setting-policy-arrow" aria-hidden="true">
                →
              </div>
              <div className="product-share-setting-policy-step is-operator">
                <span className="badge success">2단계</span>
                <strong>예약마감 / 운영인계 후</strong>
                <p>운영인계 후 공급여행사에서 예약정보를 관리할 수 있습니다. 판매여행사는 읽기 전용으로 확인합니다.</p>
              </div>
            </div>
          </section>

          <section className="panel member-web-detail-card product-share-setting-card">
            <div className="member-web-detail-card-head">
              <strong>제휴여행사 제공 정보</strong>
            </div>
            <div className="product-share-setting-card-body product-share-setting-provided">
              <div className="product-share-setting-provided-group">
                <h4>
                  상품 판매정보 <span className="badge info">고객 노출</span>
                </h4>
                <ul>
                  {SHARE_PROVIDED_SALES_INFO.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="product-share-setting-provided-group is-admin">
                <h4>
                  제휴사 관리자 전용정보 <span className="badge warn">관리자 전용</span>
                </h4>
                <ul>
                  {SHARE_PROVIDED_ADMIN_INFO.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="product-affiliate-sticky-actions">
            <div>
              최종 수정일 {lastSavedAt ?? summary.lastModifiedAt}
              <span className={`product-share-setting-dirty${isDirty ? " is-dirty" : ""}`}>
                {isDirty ? "저장하지 않은 변경사항이 있습니다." : "모든 변경사항이 저장되었습니다."}
              </span>
              {pagePeriod.hasError && (
                <span className="product-share-setting-dirty is-error">공유기간 오류를 수정해야 저장할 수 있습니다.</span>
              )}
            </div>
            <div className="product-affiliate-sticky-buttons">
              <button type="button" className="secondary" onClick={goList}>
                취소
              </button>
              <button type="button" className="secondary" onClick={resetChanges} disabled={!isDirty}>
                <RotateCcw size={14} />
                초기화
              </button>
              <button type="button" className="primary" onClick={save} disabled={!canSave}>
                <Save size={14} />
                변경내용 저장
              </button>
            </div>
          </section>

          <footer>© 2026 AOS Travel ERP · AviaNext</footer>
        </main>
      </div>

      {pickerOpen && (
        <ShareAgencyPickerModal
          candidates={pickerCandidates}
          applyLabel={`${requestModeSummaryLabel(settings.requestMode)} · 추가 시 ${newShareStatus}`}
          onClose={() => setPickerOpen(false)}
          onConfirm={addAgencies}
        />
      )}

      {conditionTarget && (
        <ShareConditionModal
          key={conditionTarget.id}
          row={conditionTarget}
          isCustom={isCustomRow(conditionTarget)}
          initialForm={effectiveFormFor(conditionTarget)}
          defaultForm={defaultFormFor(conditionTarget)}
          salesPeriod={product.period}
          onClose={() => setConditionTargetId(null)}
          onApply={applyCondition}
        />
      )}

      {detailTarget && (
        <ShareDetailModal
          row={detailTarget}
          form={effectiveFormFor(detailTarget)}
          isCustom={isCustomRow(detailTarget)}
          onClose={() => setDetailTargetId(null)}
          onEdit={() => {
            setDetailTargetId(null);
            setConditionTargetId(detailTarget.id);
          }}
        />
      )}

      {allTargetsOpen && <ShareAllTargetsModal classification={allShare} onClose={() => setAllTargetsOpen(false)} />}

      {previewOpen && (
        <SharePreviewModal
          product={{
            name: product.name,
            code: product.code,
            category: product.category,
            supplierName: summary.supplierName,
            price: product.price,
            salesPeriod: product.period,
            salesStatusLabel,
            salesStatusBadge,
          }}
          options={previewOptions}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      <ShareConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />

      {toast && (
        <div className="toast product-affiliate-toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
