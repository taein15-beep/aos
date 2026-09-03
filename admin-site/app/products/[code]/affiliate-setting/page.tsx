"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  QrCode,
  RotateCcw,
  Save,
  Search,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import {
  AFFILIATE_ACCEPTANCE_FILTER_OPTIONS,
  AFFILIATE_PARTNERSHIP_STATUS_OPTIONS,
  AFFILIATE_REGION_OPTIONS,
  AFFILIATE_SHARE_FILTER_OPTIONS,
  AFFILIATE_SHARE_GROUP_OPTIONS,
  CANCEL_FEE_RULE_OPTIONS,
  EDIT_LOCKED_NOTICE,
  EDIT_PERMISSION_OPTIONS,
  GROUP_SETTLEMENT_DEFAULTS,
  INVENTORY_MODE_OPTIONS,
  PAYMENT_PARTY_OPTIONS,
  PRICE_APPLY_MODE_OPTIONS,
  RESHARE_LOCKED_NOTICE,
  SALES_CHANNEL_OPTIONS,
  SELLER_CHANNEL_NOTICE,
  SELLING_PRICE_PERMISSION_OPTIONS,
  SETTLEMENT_CYCLE_OPTIONS,
  SETTLEMENT_METHOD_OPTIONS,
  SETTLEMENT_SOURCE_OPTIONS,
  SHARE_ACTION_POLICY,
  SHARE_CONDITION_AGENCY_PREVIEW_LIMIT,
  SHARE_CONDITION_DRAFT_HINT,
  SHARE_REQUEST_MODE_OPTIONS,
  SHARED_INVENTORY_NOTICE,
  VAT_INCLUDED_OPTIONS,
  acceptanceLabel,
  classifyShareApplyTargets,
  cloneAffiliateRows,
  cloneShareCondition,
  countAffiliateShareStatuses,
  createShareConditionForm,
  formFromStoredRow,
  formatAffiliateGroups,
  formatPriceDisplay,
  formatShareApplyMessage,
  getProductAffiliateSummary,
  getSampleAffiliateAgencies,
  getShareConditionFieldErrors,
  getSharePeriodMessages,
  inventoryPolicyLabel,
  inventorySummaryLabel,
  isPartnershipShareable,
  isPriceChangeAllowed,
  isSharedStatus,
  parsePriceInput,
  partnershipShareBlockReason,
  partnershipStatusBadgeClass,
  pricePolicyLabel,
  requestModeSummaryLabel,
  sharePeriodSummaryLabel,
  shareStatusBadgeClass,
  shareStatusForRequestMode,
  storedConditionFromForm,
  toUnsharedRow,
  uniqueAgenciesByName,
  type AffiliateAcceptanceFilter,
  type AffiliateAgencyRow,
  type AffiliateRegionFilter,
  type AffiliateShareFilter,
  type AffiliateShareGroupFilter,
  type EditPermissionKey,
  type SalesChannelKey,
  type ShareConditionForm,
} from "@/lib/admin/product-affiliate-data";
import {
  getProductSellerSettingPath,
  getSupplierProductByCode,
} from "@/lib/admin/products-data";

const menu = [
  { icon: "▦", label: "대시보드" },
  { icon: "◇", label: "상품관리", children: ["상품목록", "상품등록", "일정표관리", "요금관리"] },
  { icon: "▤", label: "예약관리", children: ["예약접수현황", "예약달력"] },
  { icon: "₩", label: "결제관리", children: ["결제현황", "취소/환불"] },
  { icon: "⇄", label: "정산관리", children: ["정산현황", "판매점정산", "공급사정산"] },
  { icon: "♙", label: "회원관리", children: ["웹회원관리", "관리자/직원", "그룹/권한"] },
  { icon: "▣", label: "판매점관리" },
  { icon: "⌂", label: "거래처관리" },
  {
    icon: "qr",
    label: "스탬프투어 관리",
    children: ["스탬프투어 목록", "관광지 관리", "경품관리", "참여자·진행현황", "인증 이력", "완주·경품 관리", "통계"],
  },
  { icon: "▥", label: "통계관리" },
  { icon: "◎", label: "운영관리", children: ["팝업관리", "알림관리", "알림톡"] },
  { icon: "⚙", label: "시스템설정", children: ["홈페이지설정", "결제설정", "기본설정"] },
];

type SearchDraft = {
  agencyName: string;
  shareGroup: AffiliateShareGroupFilter;
  partnershipStatus: (typeof AFFILIATE_PARTNERSHIP_STATUS_OPTIONS)[number];
  region: AffiliateRegionFilter;
  shareFilter: AffiliateShareFilter;
  acceptanceFilter: AffiliateAcceptanceFilter;
};

const EMPTY_SEARCH: SearchDraft = {
  agencyName: "",
  shareGroup: "전체",
  partnershipStatus: "전체",
  region: "전체",
  shareFilter: "전체",
  acceptanceFilter: "전체",
};

function rowsEqual(a: AffiliateAgencyRow[], b: AffiliateAgencyRow[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span>
      {children}
      {required ? <b className="required-mark">필수</b> : null}
    </span>
  );
}

type DetailSectionId = "edit" | "sales" | "settlement" | "memo";
type ShareModalMode = "create" | "edit" | "view" | "reshare";
type ConfirmDialog = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

const DEFAULT_DETAIL_OPEN: Record<DetailSectionId, boolean> = {
  edit: true,
  sales: true,
  settlement: true,
  memo: true,
};

function optionLabel<T extends { value: string; label: string }>(options: readonly T[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function ShareManageActions({
  row,
  onEdit,
  onView,
  onReshare,
  onCancelRequest,
  onPause,
  onResume,
  onRelease,
}: {
  row: AffiliateAgencyRow;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onReshare: (id: string) => void;
  onCancelRequest: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRelease: (id: string) => void;
}) {
  if (row.shareStatus === "수락대기") {
    return (
      <>
        <button type="button" className="small-btn" onClick={() => onEdit(row.id)}>
          조건 수정
        </button>
        <button type="button" className="small-btn" onClick={() => onCancelRequest(row.id)}>
          공유 요청 취소
        </button>
      </>
    );
  }
  if (row.shareStatus === "공유 중") {
    return (
      <>
        <button type="button" className="small-btn" onClick={() => onEdit(row.id)}>
          조건 수정
        </button>
        <button type="button" className="small-btn" onClick={() => onPause(row.id)}>
          공유 중지
        </button>
      </>
    );
  }
  if (row.shareStatus === "공유 중지") {
    return (
      <>
        <button type="button" className="small-btn" onClick={() => onEdit(row.id)}>
          조건 수정
        </button>
        <button type="button" className="small-btn" onClick={() => onResume(row.id)}>
          공유 재개
        </button>
        <button type="button" className="small-btn" onClick={() => onRelease(row.id)}>
          공유 해제
        </button>
      </>
    );
  }
  if (row.shareStatus === "공유 종료" || row.shareStatus === "공유 거절") {
    return (
      <>
        <button type="button" className="small-btn" onClick={() => onView(row.id)}>
          상세보기
        </button>
        <button type="button" className="small-btn" onClick={() => onReshare(row.id)}>
          다시 공유
        </button>
      </>
    );
  }
  return null;
}

function DetailSection({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = `share-detail-${id}`;
  return (
    <div className="product-share-condition-detail-block">
      <button
        type="button"
        className="product-share-condition-detail-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <strong>{title}</strong>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open ? (
        <div id={panelId} className="product-share-condition-detail-panel">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function ProductAffiliateNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="panel product-affiliate-not-found">
      <strong>제휴여행사 공유설정을 열 수 없습니다.</strong>
      <p>상품공급여행사 상품이 아니거나, 공유설정 샘플 데이터가 없는 상품입니다.</p>
      <button type="button" className="secondary" onClick={onBack}>
        <ArrowLeft size={14} />
        상품목록으로
      </button>
    </div>
  );
}

export default function ProductAffiliateSettingPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const productCode = decodeURIComponent(params.code ?? "");

  const product = useMemo(() => getSupplierProductByCode(productCode), [productCode]);
  const summary = useMemo(() => getProductAffiliateSummary(productCode), [productCode]);
  const initialRows = useMemo(() => getSampleAffiliateAgencies(productCode), [productCode]);

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["상품관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const [savedRows, setSavedRows] = useState<AffiliateAgencyRow[]>(() => cloneAffiliateRows(initialRows ?? []));
  const [draftRows, setDraftRows] = useState<AffiliateAgencyRow[]>(() => cloneAffiliateRows(initialRows ?? []));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draftSearch, setDraftSearch] = useState<SearchDraft>(EMPTY_SEARCH);
  const [appliedSearch, setAppliedSearch] = useState<SearchDraft>(EMPTY_SEARCH);
  const [shareConditionModalOpen, setShareConditionModalOpen] = useState(false);
  const [shareModalMode, setShareModalMode] = useState<ShareModalMode>("create");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const [modalAgencyRows, setModalAgencyRows] = useState<AffiliateAgencyRow[]>([]);
  const [modalIncludedIds, setModalIncludedIds] = useState<string[]>([]);
  const [modalAgencyExpanded, setModalAgencyExpanded] = useState(false);
  const [shareForm, setShareForm] = useState<ShareConditionForm>(() => createShareConditionForm(0));
  /** 공유조건 임시저장. 이 화면 메모리에만 유지되며 새로고침하면 사라집니다. */
  const [shareFormDraft, setShareFormDraft] = useState<ShareConditionForm | null>(null);
  const [detailOpen, setDetailOpen] = useState<Record<DetailSectionId, boolean>>(DEFAULT_DETAIL_OPEN);
  const toastTimer = useRef<number | null>(null);

  const isDirty = useMemo(() => !rowsEqual(draftRows, savedRows), [draftRows, savedRows]);
  const counts = useMemo(() => countAffiliateShareStatuses(draftRows), [draftRows]);
  const sharedTargets = useMemo(() => draftRows.filter((row) => isSharedStatus(row.shareStatus)), [draftRows]);
  const includedModalAgencies = useMemo(
    () => modalAgencyRows.filter((row) => modalIncludedIds.includes(row.id)),
    [modalAgencyRows, modalIncludedIds],
  );
  const applicableModalAgencies = useMemo(
    () => includedModalAgencies.filter((row) => isPartnershipShareable(row.partnershipStatus)),
    [includedModalAgencies],
  );
  const blockedModalCount = includedModalAgencies.length - applicableModalAgencies.length;
  const visibleModalAgencies =
    modalAgencyExpanded || includedModalAgencies.length <= SHARE_CONDITION_AGENCY_PREVIEW_LIMIT
      ? includedModalAgencies
      : includedModalAgencies.slice(0, SHARE_CONDITION_AGENCY_PREVIEW_LIMIT);
  const shareApplyPreview = useMemo(
    () => classifyShareApplyTargets(includedModalAgencies, draftRows),
    [includedModalAgencies, draftRows],
  );
  const sharePeriodMessages = useMemo(
    () => getSharePeriodMessages(shareForm.startDate, shareForm.endDate, shareForm.noEndDate, product?.period ?? null),
    [shareForm.startDate, shareForm.endDate, shareForm.noEndDate, product?.period],
  );
  const shareFieldErrors = useMemo(() => getShareConditionFieldErrors(shareForm), [shareForm]);
  const hasShareFieldErrors = Object.keys(shareFieldErrors).length > 0;
  const autoShareStatus = shareStatusForRequestMode(shareForm.requestMode);
  const isImmediateShare = shareForm.requestMode === "immediate";
  const isViewMode = shareModalMode === "view";
  const isEditMode = shareModalMode === "edit";
  const primaryShareActionLabel = isEditMode
    ? "조건 적용"
    : isImmediateShare
      ? "공유 시작"
      : "상품공유 요청";
  const canSubmitShareRequest = isViewMode
    ? false
    : isEditMode
      ? includedModalAgencies.length > 0 && !hasShareFieldErrors
      : shareApplyPreview.applicable.length > 0 && !hasShareFieldErrors;
  const shareModalTitle =
    shareModalMode === "edit"
      ? "공유조건 수정"
      : shareModalMode === "view"
        ? "공유조건 상세"
        : shareModalMode === "reshare"
          ? "다시 공유"
          : "제휴여행사 상품공유 조건 설정";
  const shareModalLead =
    shareModalMode === "edit"
      ? "기존 공유조건을 불러와 수정합니다. 공유 상태는 유지되며, 이 화면의 임시 데이터에만 반영됩니다."
      : shareModalMode === "view"
        ? "저장된 공유조건을 확인합니다. 이 화면에서는 수정할 수 없습니다."
        : shareModalMode === "reshare"
          ? "종료·거절된 공유를 다시 요청합니다. 기존 조건을 불러오며 변경한 뒤 요청할 수 있습니다. 공유 해제 또는 종료 이후에도 기존 예약과 정산 관계는 유지됩니다."
          : "선택한 제휴여행사에 이 상품을 공유합니다. 그룹 가입만으로 상품이 자동 공유되지는 않으며, 아래 조건으로 상품공유 요청이 전송됩니다.";

  const act = (message: string, duration = 2200) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), duration);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const goBack = () => {
    if (isDirty && !window.confirm("저장하지 않은 변경사항이 있습니다. 목록으로 이동할까요?")) return;
    router.push("/products");
  };

  const filteredRows = useMemo(() => {
    return draftRows.filter((row) => {
      if (appliedSearch.agencyName && !row.name.includes(appliedSearch.agencyName)) return false;
      if (
        appliedSearch.shareGroup !== "전체" &&
        !row.groups.some((group) => group === appliedSearch.shareGroup)
      ) {
        return false;
      }
      if (appliedSearch.partnershipStatus !== "전체" && row.partnershipStatus !== appliedSearch.partnershipStatus) {
        return false;
      }
      if (appliedSearch.region !== "전체" && row.region !== appliedSearch.region) return false;
      if (appliedSearch.shareFilter === "공유함" && !isSharedStatus(row.shareStatus)) return false;
      if (appliedSearch.shareFilter === "미공유" && row.shareStatus !== "미공유") return false;
      if (appliedSearch.acceptanceFilter === "수락대기" && row.shareStatus !== "수락대기") return false;
      if (appliedSearch.acceptanceFilter === "수락완료" && !["공유 중", "공유 중지", "공유 종료"].includes(row.shareStatus)) {
        return false;
      }
      if (appliedSearch.acceptanceFilter === "거절" && row.shareStatus !== "공유 거절") return false;
      return true;
    });
  }, [draftRows, appliedSearch]);

  const toggleSelected = (id: string) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredRows.map((row) => row.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((ids) => ids.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedIds((ids) => [...new Set([...ids, ...visibleIds])]);
  };

  const updateRows = (updater: (rows: AffiliateAgencyRow[]) => AffiliateAgencyRow[]) => {
    setDraftRows((rows) => updater(rows));
  };

  const closeShareConditionModal = () => {
    setShareConditionModalOpen(false);
    setShareModalMode("create");
  };

  const openShareConditionModal = (ids: string[], mode: ShareModalMode = "create") => {
    if (ids.length === 0) return;
    const uniqueRows = uniqueAgenciesByName(draftRows.filter((row) => ids.includes(row.id)));
    if (uniqueRows.length === 0) return;
    setShareModalMode(mode);
    setModalAgencyRows(uniqueRows);
    setModalIncludedIds(uniqueRows.map((row) => row.id));
    setModalAgencyExpanded(false);
    const customerListPrice = parsePriceInput(product?.price ?? "") ?? 0;
    if (mode === "create") {
      setShareForm(
        shareFormDraft
          ? { ...shareFormDraft, customerListPrice }
          : createShareConditionForm(customerListPrice),
      );
    } else {
      setShareForm(formFromStoredRow(uniqueRows[0], customerListPrice));
    }
    setDetailOpen(DEFAULT_DETAIL_OPEN);
    setShareConditionModalOpen(true);
  };

  const askConfirm = (policy: (typeof SHARE_ACTION_POLICY)[keyof typeof SHARE_ACTION_POLICY], onConfirm: () => void) => {
    setConfirmDialog({
      title: policy.title,
      message: policy.message,
      confirmLabel: policy.confirmLabel,
      onConfirm: () => {
        setConfirmDialog(null);
        onConfirm();
      },
    });
  };

  const excludeModalAgency = (id: string) => {
    setModalIncludedIds((ids) => ids.filter((item) => item !== id));
  };

  const updateShareForm = <K extends keyof ShareConditionForm>(key: K, value: ShareConditionForm[K]) => {
    setShareForm((form) => ({ ...form, [key]: value }));
  };

  const toggleDetailSection = (id: DetailSectionId) => {
    setDetailOpen((value) => ({ ...value, [id]: !value[id] }));
  };

  const toggleEditPermission = (key: EditPermissionKey, allowed: boolean) => {
    if (key === "sellingPrice") return;
    setShareForm((form) => ({
      ...form,
      editPermissions: { ...form.editPermissions, [key]: allowed },
    }));
  };

  const toggleSalesChannel = (key: SalesChannelKey, allowed: boolean) => {
    setShareForm((form) => ({
      ...form,
      salesChannels: { ...form.salesChannels, [key]: allowed },
    }));
  };

  const saveShareConditionDraft = () => {
    setShareFormDraft({
      ...shareForm,
      editPermissions: { ...shareForm.editPermissions },
      salesChannels: { ...shareForm.salesChannels },
    });
    act(SHARE_CONDITION_DRAFT_HINT, 3600);
  };

  const applyShareFromModal = () => {
    if (isViewMode) {
      closeShareConditionModal();
      return;
    }
    if (hasShareFieldErrors) {
      act("필수 항목을 확인해 주세요.");
      return;
    }

    const shareStartDate = shareForm.startDate || null;
    const shareEndDate = shareForm.noEndDate ? null : shareForm.endDate || null;
    const shareCondition = storedConditionFromForm(shareForm);

    if (isEditMode) {
      const processIds = new Set(includedModalAgencies.map((row) => row.id));
      if (processIds.size === 0) {
        act("적용할 제휴여행사가 없습니다.");
        return;
      }
      updateRows((rows) =>
        rows.map((row) =>
          processIds.has(row.id)
            ? { ...row, shareStartDate, shareEndDate, shareCondition: cloneShareCondition(shareCondition) }
            : row,
        ),
      );
      closeShareConditionModal();
      act("공유조건을 수정했습니다.");
      return;
    }

    const { applicable, processable, skippedActive, skippedPending } = classifyShareApplyTargets(
      includedModalAgencies,
      draftRows,
    );
    const message = formatShareApplyMessage({
      mode: shareForm.requestMode,
      applicableCount: applicable.length,
      appliedCount: processable.length,
      skippedActiveCount: skippedActive.length,
      skippedPendingCount: skippedPending.length,
    });

    if (processable.length === 0) {
      act(message, 3600);
      return;
    }

    const nextStatus = shareStatusForRequestMode(shareForm.requestMode);
    const processIds = new Set(processable.map((row) => row.id));

    updateRows((rows) =>
      rows.map((row) =>
        processIds.has(row.id)
          ? {
              ...row,
              shareStatus: nextStatus,
              shareStartDate,
              shareEndDate,
              shareCondition: cloneShareCondition(shareCondition),
            }
          : row,
      ),
    );
    setShareFormDraft(null);
    closeShareConditionModal();
    act(message, 3600);
  };

  const addSelectedToShare = () => {
    openShareConditionModal(selectedIds);
  };

  const removeSelectedFromShare = () => {
    const targets = draftRows.filter((row) => selectedIds.includes(row.id) && isSharedStatus(row.shareStatus));
    if (targets.length === 0) {
      act("공유 대상에서 제외할 여행사를 선택해 주세요.");
      return;
    }
    updateRows((rows) =>
      rows.map((row) => (targets.some((target) => target.id === row.id) ? toUnsharedRow(row) : row)),
    );
    setSelectedIds([]);
    act("선택한 제휴여행사를 공유 대상에서 제외했습니다.");
  };

  const pauseShare = (id: string) => {
    askConfirm(SHARE_ACTION_POLICY.pause, () => {
      updateRows((rows) =>
        rows.map((row) => (row.id === id && row.shareStatus === "공유 중" ? { ...row, shareStatus: "공유 중지" } : row)),
      );
      act("상품공유를 중지했습니다. 신규예약만 차단되며 기존 예약과 정산은 유지됩니다.");
    });
  };

  const resumeShare = (id: string) => {
    askConfirm(SHARE_ACTION_POLICY.resume, () => {
      updateRows((rows) =>
        rows.map((row) =>
          row.id === id && row.shareStatus === "공유 중지" ? { ...row, shareStatus: "공유 중" } : row,
        ),
      );
      act("상품공유를 재개했습니다.");
    });
  };

  const cancelShareRequest = (id: string) => {
    askConfirm(SHARE_ACTION_POLICY.cancelRequest, () => {
      let cancelled = false;
      updateRows((rows) =>
        rows.map((row) => {
          if (row.id === id && row.shareStatus === "수락대기") {
            cancelled = true;
            return toUnsharedRow(row);
          }
          return row;
        }),
      );
      act(
        cancelled
          ? "공유 요청을 취소했습니다."
          : "아직 수락하지 않은 요청만 취소할 수 있습니다.",
      );
    });
  };

  const releaseShare = (id: string) => {
    askConfirm(SHARE_ACTION_POLICY.release, () => {
      updateRows((rows) =>
        rows.map((row) => (row.id === id && row.shareStatus === "공유 중지" ? toUnsharedRow(row) : row)),
      );
      act("상품공유를 해제했습니다. 기존 예약과 정산 관계는 유지됩니다.");
    });
  };

  const resetChanges = () => {
    if (!isDirty) {
      act("변경된 내용이 없습니다.");
      return;
    }
    if (!window.confirm("변경사항을 초기화할까요?")) return;
    setDraftRows(cloneAffiliateRows(savedRows));
    setSelectedIds([]);
    act("마지막 저장 상태로 초기화했습니다.");
  };

  const saveChanges = () => {
    setSavedRows(cloneAffiliateRows(draftRows));
    act("제휴여행사 상품공유 설정을 저장했습니다.");
  };

  const search = () => {
    setAppliedSearch({ ...draftSearch });
    act("검색 조건을 적용했습니다.");
  };

  if (!product || !summary || !initialRows) {
    return (
      <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
        <div className="workspace" style={{ marginLeft: collapsed ? 64 : 236 }}>
          <main className="content product-affiliate-content">
            <ProductAffiliateNotFound onBack={() => router.push("/products")} />
          </main>
        </div>
      </div>
    );
  }

  const salesStatusLabel = product.soldout ? "품절" : product.visible ? summary.salesStatus : "비노출";

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
          {menu.map((item) => (
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
                      onClick={() =>
                        child === "상품목록"
                          ? window.location.assign("/products")
                          : act(`${child} 화면은 다음 단계에서 제공될 예정입니다.`)
                      }
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
            <button type="button" className="product-affiliate-crumb" onClick={goBack}>
              상품목록
            </button>
            <b>/</b>
            <strong>제휴여행사 공유설정</strong>
          </div>
        </header>

        <main className="content product-affiliate-content">
          <section className="page-head product-affiliate-page-head">
            <div>
              <div className="product-affiliate-title-row">
                <button type="button" className="secondary product-affiliate-back" onClick={goBack}>
                  <ArrowLeft size={14} />
                  상품목록
                </button>
                <h1>제휴여행사 상품공유 설정</h1>
              </div>
              <p>
                상품공급여행사가 이 상품을 공유할 <strong>제휴여행사</strong>를 지정합니다. 판매점 설정과는 별도
                기능입니다.
              </p>
            </div>
            <div className="product-affiliate-head-actions">
              <button type="button" className="secondary" onClick={() => router.push(getProductSellerSettingPath(productCode))}>
                판매점 설정
              </button>
              <button type="button" className="primary" onClick={saveChanges} disabled={!isDirty}>
                <Save size={14} />
                설정 저장
              </button>
            </div>
          </section>

          <nav className="member-web-detail-tabs product-affiliate-tabs" aria-label="상품 설정 탭">
            <button type="button" onClick={goBack}>
              상품목록
            </button>
            <button type="button" className="active">
              제휴여행사 공유
            </button>
            <button type="button" onClick={() => router.push(getProductSellerSettingPath(productCode))}>
              판매점 설정
            </button>
          </nav>

          <section className="panel product-affiliate-notice" aria-label="상품공유 안내">
            <p>
              <strong>상품공유 안내</strong> 그룹 가입 승인만으로 상품이 자동 공유되지 않습니다. 공급여행사가 상품별로
              제휴여행사를 지정해야 합니다. 공유를 해제해도 <strong>기존 예약과 정산 관계는 유지</strong>됩니다. 상품은
              원본을 참조하며 복제되지 않습니다.
            </p>
          </section>

          <section className="product-affiliate-summary">
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
                <small>상품공급여행사</small>
                <strong>{summary.supplierName}</strong>
              </span>
            </article>
            <article className="member-web-detail-kpi">
              <span>
                <small>판매상태</small>
                <strong>{salesStatusLabel}</strong>
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
                <strong>{summary.lastModifiedAt}</strong>
              </span>
            </article>
          </section>

          <section className="panel product-affiliate-filter" aria-label="제휴여행사 검색">
            <div className="product-affiliate-filter-grid">
              <label>
                <span>여행사명</span>
                <input
                  value={draftSearch.agencyName}
                  onChange={(event) => setDraftSearch((value) => ({ ...value, agencyName: event.target.value }))}
                  placeholder="여행사명 검색"
                />
              </label>
              <label>
                <span>상품공유그룹</span>
                <select
                  value={draftSearch.shareGroup}
                  onChange={(event) =>
                    setDraftSearch((value) => ({
                      ...value,
                      shareGroup: event.target.value as AffiliateShareGroupFilter,
                    }))
                  }
                >
                  {AFFILIATE_SHARE_GROUP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>제휴 상태</span>
                <select
                  value={draftSearch.partnershipStatus}
                  onChange={(event) =>
                    setDraftSearch((value) => ({
                      ...value,
                      partnershipStatus: event.target.value as SearchDraft["partnershipStatus"],
                    }))
                  }
                >
                  {AFFILIATE_PARTNERSHIP_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>지역</span>
                <select
                  value={draftSearch.region}
                  onChange={(event) =>
                    setDraftSearch((value) => ({ ...value, region: event.target.value as AffiliateRegionFilter }))
                  }
                >
                  {AFFILIATE_REGION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>공유 여부</span>
                <select
                  value={draftSearch.shareFilter}
                  onChange={(event) =>
                    setDraftSearch((value) => ({
                      ...value,
                      shareFilter: event.target.value as AffiliateShareFilter,
                    }))
                  }
                >
                  {AFFILIATE_SHARE_FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>수락 상태</span>
                <select
                  value={draftSearch.acceptanceFilter}
                  onChange={(event) =>
                    setDraftSearch((value) => ({
                      ...value,
                      acceptanceFilter: event.target.value as AffiliateAcceptanceFilter,
                    }))
                  }
                >
                  {AFFILIATE_ACCEPTANCE_FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="product-affiliate-filter-actions">
              <button type="button" className="secondary" onClick={() => { setDraftSearch(EMPTY_SEARCH); setAppliedSearch(EMPTY_SEARCH); }}>
                <RotateCcw size={14} />
                초기화
              </button>
              <button type="button" className="primary" onClick={search}>
                <Search size={14} />
                검색
              </button>
            </div>
          </section>

          <section className="panel product-affiliate-toolbar">
            <div className="product-affiliate-toolbar-left">
              <button
                type="button"
                className="primary"
                onClick={addSelectedToShare}
                disabled={selectedIds.length === 0}
                aria-label={`선택 여행사 공유 대상 추가, 현재 ${selectedIds.length}건 선택`}
              >
                <UserPlus size={14} />
                선택 여행사 공유 대상 추가
              </button>
              <span className="product-affiliate-selection-count">선택 {selectedIds.length}건</span>
              <button type="button" className="secondary" onClick={removeSelectedFromShare}>
                <UserMinus size={14} />
                공유 대상 제외
              </button>
              {isDirty && <span className="product-affiliate-dirty">저장 전 변경사항 있음</span>}
            </div>
          </section>

          <section className="panel product-affiliate-list-panel">
            <div className="product-affiliate-list-head">
              <strong>
                제휴여행사 목록 <b>{filteredRows.length}</b>
              </strong>
              <span>그룹 가입 승인된 여행사만 표시 · 동일 여행사는 1행, 소속 그룹 복수 표시</span>
            </div>
            <div className="member-web-detail-table-wrap">
              <table className="member-web-detail-table product-affiliate-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="현재 목록 전체 선택"
                        checked={filteredRows.length > 0 && filteredRows.every((row) => selectedIds.includes(row.id))}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>여행사명</th>
                    <th>소속 상품공유그룹</th>
                    <th>지역</th>
                    <th>제휴 상태</th>
                    <th>해당 상품 공유 여부</th>
                    <th>상품 수락 상태</th>
                    <th>공유 시작일</th>
                    <th>공유 종료일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="product-affiliate-empty">
                        검색 조건에 맞는 제휴여행사가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${row.name} 선택`}
                            checked={selectedIds.includes(row.id)}
                            onChange={() => toggleSelected(row.id)}
                          />
                        </td>
                        <td className="text-left">
                          <strong>{row.name}</strong>
                        </td>
                        <td className="text-left product-affiliate-groups">{formatAffiliateGroups(row.groups)}</td>
                        <td>{row.region}</td>
                        <td>
                          <span className={`badge ${partnershipStatusBadgeClass(row.partnershipStatus)}`}>
                            {row.partnershipStatus}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${shareStatusBadgeClass(row.shareStatus)}`}>{row.shareStatus}</span>
                        </td>
                        <td>{acceptanceLabel(row.shareStatus)}</td>
                        <td className="date-cell">{row.shareStartDate ?? "-"}</td>
                        <td className="date-cell">{row.shareEndDate ?? "-"}</td>
                        <td>
                          <div className="product-affiliate-row-actions">
                            {row.shareStatus === "미공유" ? (
                              <button type="button" className="small-btn" onClick={() => openShareConditionModal([row.id])}>
                                공유 추가
                              </button>
                            ) : (
                              <ShareManageActions
                                row={row}
                                onEdit={(id) => openShareConditionModal([id], "edit")}
                                onView={(id) => openShareConditionModal([id], "view")}
                                onReshare={(id) => openShareConditionModal([id], "reshare")}
                                onCancelRequest={cancelShareRequest}
                                onPause={pauseShare}
                                onResume={resumeShare}
                                onRelease={releaseShare}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel product-affiliate-selected-panel">
            <div className="product-affiliate-list-head">
              <strong>
                선택된 공유 대상 <b>{sharedTargets.length}</b>
              </strong>
              <span>공유 중·수락대기·중지·종료·거절 상태의 제휴여행사</span>
            </div>
            <div className="member-web-detail-table-wrap">
              {sharedTargets.length === 0 ? (
                <p className="product-affiliate-empty">아직 상품공유 대상으로 지정된 제휴여행사가 없습니다.</p>
              ) : (
                <table className="member-web-detail-table product-affiliate-selected-table">
                  <thead>
                    <tr>
                      <th>여행사명</th>
                      <th>소속 상품공유그룹</th>
                      <th>가격정책</th>
                      <th>재고정책</th>
                      <th>공유 상태</th>
                      <th>수락 상태</th>
                      <th>공유 시작일</th>
                      <th>공유 종료일</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedTargets.map((row) => (
                      <tr key={row.id}>
                        <td className="text-left">
                          <strong>{row.name}</strong>
                        </td>
                        <td className="text-left product-affiliate-groups">{formatAffiliateGroups(row.groups)}</td>
                        <td className="text-left">{pricePolicyLabel(row.shareCondition)}</td>
                        <td className="text-left">{inventoryPolicyLabel(row.shareCondition)}</td>
                        <td>
                          <span className={`badge ${shareStatusBadgeClass(row.shareStatus)}`}>{row.shareStatus}</span>
                        </td>
                        <td>{acceptanceLabel(row.shareStatus)}</td>
                        <td className="date-cell">{row.shareStartDate ?? "-"}</td>
                        <td className="date-cell">{row.shareEndDate ?? "종료일 없음"}</td>
                        <td>
                          <div className="product-affiliate-row-actions">
                            <ShareManageActions
                              row={row}
                              onEdit={(id) => openShareConditionModal([id], "edit")}
                              onView={(id) => openShareConditionModal([id], "view")}
                              onReshare={(id) => openShareConditionModal([id], "reshare")}
                              onCancelRequest={cancelShareRequest}
                              onPause={pauseShare}
                              onResume={resumeShare}
                              onRelease={releaseShare}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="product-affiliate-sticky-actions">
            <div>
              {isDirty ? "저장하지 않은 변경사항이 있습니다." : "모든 변경사항이 저장되었습니다."}
            </div>
            <div className="product-affiliate-sticky-buttons">
              <button type="button" className="secondary" onClick={goBack}>
                취소
              </button>
              <button type="button" className="secondary" onClick={resetChanges}>
                <RotateCcw size={14} />
                변경사항 초기화
              </button>
              <button type="button" className="primary" onClick={saveChanges} disabled={!isDirty}>
                <Save size={14} />
                설정 저장
              </button>
            </div>
          </section>

          <footer>© 2026 AOS Travel ERP · AviaNext</footer>
        </main>
      </div>

      {shareConditionModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeShareConditionModal}>
          <div
            className="modal product-share-condition-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-condition-title"
            aria-describedby="share-condition-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head product-share-condition-head">
              <h3 id="share-condition-title">{shareModalTitle}</h3>
              <button type="button" aria-label="닫기" onClick={closeShareConditionModal}>
                <X size={18} />
              </button>
            </div>
            <div className="product-share-condition-body">
              <p id="share-condition-desc" className="product-share-condition-lead">
                {shareModalLead}
              </p>
              <fieldset className="product-share-condition-fields" disabled={isViewMode}>
              <section className="product-share-condition-section" aria-label="선택한 상품 요약">
                <h4>선택한 상품</h4>
                <div className="product-share-condition-summary">
                  <div>
                    <span>상품명</span>
                    <strong title={product.name}>{product.name}</strong>
                  </div>
                  <div>
                    <span>상품코드</span>
                    <strong>{product.code}</strong>
                  </div>
                  <div>
                    <span>상품공급여행사</span>
                    <strong>{summary.supplierName}</strong>
                  </div>
                  <div>
                    <span>선택한 제휴여행사 수</span>
                    <strong>{includedModalAgencies.length}곳</strong>
                  </div>
                </div>
              </section>
              <section className="product-share-condition-section" aria-label="선택한 제휴여행사">
                <div className="product-share-condition-section-head">
                  <h4>선택한 제휴여행사 {includedModalAgencies.length}개</h4>
                  <span>
                    적용 가능 {applicableModalAgencies.length}곳
                    {blockedModalCount > 0 ? ` · 적용 불가 ${blockedModalCount}곳` : ""}
                  </span>
                </div>
                {includedModalAgencies.length === 0 ? (
                  <p className="product-share-condition-empty">
                    공유 대상 여행사가 없습니다. 상품공유 요청을 진행할 수 없습니다.
                  </p>
                ) : (
                  <>
                    <div className="member-web-detail-table-wrap">
                      <table className="member-web-detail-table product-share-condition-agency-table">
                        <thead>
                          <tr>
                            <th>여행사명</th>
                            <th>소속 상품공유그룹</th>
                            <th>지역</th>
                            <th>제휴 상태</th>
                            <th>적용 여부</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleModalAgencies.map((agency) => {
                            const blockedReason = partnershipShareBlockReason(agency.partnershipStatus);
                            const shareable = !blockedReason;
                            return (
                              <tr key={agency.id} className={shareable ? undefined : "is-blocked"}>
                                <td className="text-left">
                                  <strong>{agency.name}</strong>
                                </td>
                                <td className="text-left">
                                  <div className="product-share-condition-groups">
                                    <span>{agency.groups[0] ?? "-"}</span>
                                    {agency.groups.length > 1 && (
                                      <span className="badge info">외 {agency.groups.length - 1}</span>
                                    )}
                                  </div>
                                </td>
                                <td>{agency.region}</td>
                                <td>
                                  <span className={`badge ${partnershipStatusBadgeClass(agency.partnershipStatus)}`}>
                                    {agency.partnershipStatus}
                                  </span>
                                </td>
                                <td className="text-left">
                                  <div className="product-share-condition-apply">
                                    {shareable ? (
                                      <span className="badge success">적용</span>
                                    ) : (
                                      <>
                                        <span className="badge gray">적용 불가</span>
                                        <small>{blockedReason}</small>
                                      </>
                                    )}
                                    {shareModalMode === "create" && (
                                      <button
                                        type="button"
                                        className="small-btn"
                                        onClick={() => excludeModalAgency(agency.id)}
                                      >
                                        선택 해제
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {includedModalAgencies.length > SHARE_CONDITION_AGENCY_PREVIEW_LIMIT && (
                      <button
                        type="button"
                        className="text-btn product-share-condition-expand"
                        onClick={() => setModalAgencyExpanded((value) => !value)}
                      >
                        {modalAgencyExpanded ? (
                          <>
                            <ChevronUp size={14} />
                            접기
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} />
                            나머지 {includedModalAgencies.length - SHARE_CONDITION_AGENCY_PREVIEW_LIMIT}개 펼치기
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </section>
              <section className="product-share-condition-section" aria-label="공유 기본설정">
                <h4>공유 기본설정</h4>
                <div className="product-share-condition-basic">
                  <fieldset className="product-share-condition-fieldset">
                    <legend>
                      상품공유 요청 방식 <b className="required-mark">필수</b>
                    </legend>
                    <div className="product-share-condition-options" role="radiogroup" aria-label="상품공유 요청 방식">
                      {SHARE_REQUEST_MODE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={shareForm.requestMode === option.value ? "is-selected" : undefined}
                        >
                          <input
                            type="radio"
                            name="share-request-mode"
                            value={option.value}
                            checked={shareForm.requestMode === option.value}
                            onChange={() => updateShareForm("requestMode", option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                    <p className="product-share-condition-auto-status">
                      자동 상태 <span className={`badge ${shareStatusBadgeClass(autoShareStatus)}`}>{autoShareStatus}</span>
                    </p>
                  </fieldset>
                  <fieldset className="product-share-condition-fieldset">
                    <legend>
                      공유기간 <b className="required-mark">필수</b>
                    </legend>
                    <div className="product-share-condition-period">
                      <label className={shareFieldErrors.startDate ? "is-invalid" : undefined}>
                        <FieldLabel required>공유 시작일</FieldLabel>
                        <input
                          type="date"
                          value={shareForm.startDate}
                          aria-invalid={Boolean(shareFieldErrors.startDate)}
                          onChange={(event) => updateShareForm("startDate", event.target.value)}
                        />
                        {shareFieldErrors.startDate ? (
                          <small className="product-share-condition-error">{shareFieldErrors.startDate}</small>
                        ) : sharePeriodMessages.startWarning ? (
                          <small className="product-share-condition-warn">{sharePeriodMessages.startWarning}</small>
                        ) : null}
                      </label>
                      <label className={shareFieldErrors.endDate ? "is-invalid" : undefined}>
                        <FieldLabel required={!shareForm.noEndDate}>공유 종료일</FieldLabel>
                        <input
                          type="date"
                          value={shareForm.endDate}
                          min={shareForm.startDate || undefined}
                          disabled={shareForm.noEndDate}
                          aria-invalid={Boolean(shareFieldErrors.endDate)}
                          onChange={(event) => updateShareForm("endDate", event.target.value)}
                        />
                        {shareFieldErrors.endDate ? (
                          <small className="product-share-condition-error">{shareFieldErrors.endDate}</small>
                        ) : sharePeriodMessages.endWarning ? (
                          <small className="product-share-condition-warn">{sharePeriodMessages.endWarning}</small>
                        ) : null}
                      </label>
                      <label className="product-share-condition-check">
                        <input
                          type="checkbox"
                          checked={shareForm.noEndDate}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setShareForm((form) => ({
                              ...form,
                              noEndDate: checked,
                              endDate: checked ? "" : form.startDate,
                            }));
                          }}
                        />
                        종료일 없음
                      </label>
                    </div>
                    {product.period ? (
                      <p className="product-share-condition-period-meta">
                        상품 판매기간 {product.period[0]} ~ {product.period[1]}
                      </p>
                    ) : (
                      <p className="product-share-condition-period-meta">상품 판매기간이 지정되지 않은 상품입니다.</p>
                    )}
                  </fieldset>
                  <fieldset className="product-share-condition-fieldset">
                    <legend>
                      가격 적용 방식 <b className="required-mark">필수</b>
                    </legend>
                    <div className="product-share-condition-options" role="radiogroup" aria-label="가격 적용 방식">
                      {PRICE_APPLY_MODE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={shareForm.priceApplyMode === option.value ? "is-selected" : undefined}
                        >
                          <input
                            type="radio"
                            name="price-apply-mode"
                            value={option.value}
                            checked={shareForm.priceApplyMode === option.value}
                            onChange={() => updateShareForm("priceApplyMode", option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                    {shareForm.priceApplyMode === "supply" ? (
                      <div className="product-share-condition-price">
                        <label>
                          <FieldLabel>고객 대표 판매가</FieldLabel>
                          <div className="product-share-condition-amount">
                            <input
                              type="text"
                              value={formatPriceDisplay(shareForm.customerListPrice)}
                              readOnly
                              aria-readonly="true"
                            />
                            <b>원</b>
                          </div>
                        </label>
                        <label className={shareFieldErrors.affiliateSupplyPrice ? "is-invalid" : undefined}>
                          <FieldLabel required>제휴여행사 공급가</FieldLabel>
                          <div className="product-share-condition-amount">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatPriceDisplay(shareForm.affiliateSupplyPrice)}
                              aria-invalid={Boolean(shareFieldErrors.affiliateSupplyPrice)}
                              onChange={(event) =>
                                updateShareForm("affiliateSupplyPrice", parsePriceInput(event.target.value))
                              }
                              placeholder="0"
                            />
                            <b>원</b>
                          </div>
                          {shareFieldErrors.affiliateSupplyPrice ? (
                            <small className="product-share-condition-error">{shareFieldErrors.affiliateSupplyPrice}</small>
                          ) : null}
                        </label>
                        <label className={shareFieldErrors.recommendedPrice ? "is-invalid" : undefined}>
                          <FieldLabel required>권장판매가</FieldLabel>
                          <div className="product-share-condition-amount">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatPriceDisplay(shareForm.recommendedPrice)}
                              aria-invalid={Boolean(shareFieldErrors.recommendedPrice)}
                              onChange={(event) =>
                                updateShareForm("recommendedPrice", parsePriceInput(event.target.value))
                              }
                              placeholder="0"
                            />
                            <b>원</b>
                          </div>
                          {shareFieldErrors.recommendedPrice ? (
                            <small className="product-share-condition-error">{shareFieldErrors.recommendedPrice}</small>
                          ) : null}
                        </label>
                        <label className={shareFieldErrors.minSellingPrice ? "is-invalid" : undefined}>
                          <FieldLabel required={shareForm.sellingPricePermission === "min"}>최저판매가</FieldLabel>
                          <div className="product-share-condition-amount">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatPriceDisplay(shareForm.minSellingPrice)}
                              aria-invalid={Boolean(shareFieldErrors.minSellingPrice)}
                              onChange={(event) =>
                                updateShareForm("minSellingPrice", parsePriceInput(event.target.value))
                              }
                              placeholder="0"
                            />
                            <b>원</b>
                          </div>
                          {shareFieldErrors.minSellingPrice ? (
                            <small className="product-share-condition-error">{shareFieldErrors.minSellingPrice}</small>
                          ) : null}
                        </label>
                        <div className="product-share-condition-permission">
                          <FieldLabel required>판매가 권한</FieldLabel>
                          <div className="product-share-condition-options" role="radiogroup" aria-label="판매가 권한">
                            {SELLING_PRICE_PERMISSION_OPTIONS.map((option) => (
                              <label
                                key={option.value}
                                className={shareForm.sellingPricePermission === option.value ? "is-selected" : undefined}
                              >
                                <input
                                  type="radio"
                                  name="selling-price-permission"
                                  value={option.value}
                                  checked={shareForm.sellingPricePermission === option.value}
                                  onChange={() =>
                                    setShareForm((form) => ({
                                      ...form,
                                      sellingPricePermission: option.value,
                                      editPermissions: {
                                        ...form.editPermissions,
                                        sellingPrice: isPriceChangeAllowed(option.value),
                                      },
                                    }))
                                  }
                                />
                                {option.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="product-share-condition-note">
                        {shareForm.priceApplyMode === "commission"
                          ? "판매수수료율 기준의 상세 입력은 다음 단계에서 구성합니다."
                          : "고정 판매마진 기준의 상세 입력은 다음 단계에서 구성합니다."}
                      </p>
                    )}
                  </fieldset>
                  <fieldset className="product-share-condition-fieldset">
                    <legend>
                      재고 운영방식 <b className="required-mark">필수</b>
                    </legend>
                    <div className="product-share-condition-mode-list" role="radiogroup" aria-label="재고 운영방식">
                      {INVENTORY_MODE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={shareForm.inventoryMode === option.value ? "is-selected" : undefined}
                        >
                          <input
                            type="radio"
                            name="inventory-mode"
                            value={option.value}
                            checked={shareForm.inventoryMode === option.value}
                            onChange={() => updateShareForm("inventoryMode", option.value)}
                          />
                          <span>
                            <strong>{option.label}</strong>
                            <small>{option.description}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                    {shareForm.inventoryMode === "shared" ? (
                      <p className="product-share-condition-notice" role="note">
                        <strong>공동재고 안내</strong>
                        {SHARED_INVENTORY_NOTICE}
                      </p>
                    ) : null}
                  </fieldset>
                </div>
              </section>
              <section className="product-share-condition-section" aria-label="상세설정">
                <h4>상세설정</h4>
                <div className="product-share-condition-detail">
                  <DetailSection
                    id="edit"
                    title="제휴여행사 수정 허용범위"
                    open={detailOpen.edit}
                    onToggle={() => toggleDetailSection("edit")}
                  >
                    <div className="product-share-condition-check-grid">
                      {EDIT_PERMISSION_OPTIONS.map((option) => {
                        const autoPrice = option.auto;
                        const allowed = autoPrice
                          ? isPriceChangeAllowed(shareForm.sellingPricePermission)
                          : shareForm.editPermissions[option.key];
                        return (
                          <label
                            key={option.key}
                            className={`product-share-condition-check-item${autoPrice ? " is-auto" : ""}${allowed ? " is-on" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={allowed}
                              disabled={autoPrice}
                              onChange={(event) => toggleEditPermission(option.key, event.target.checked)}
                            />
                            <span>
                              <strong>{option.label}</strong>
                              <small>
                                {autoPrice
                                  ? `가격정책에 따라 자동 결정 · 현재 ${allowed ? "허용" : "비허용"}`
                                  : allowed
                                    ? "허용"
                                    : "비허용"}
                              </small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="product-share-condition-notice" role="note">
                      {EDIT_LOCKED_NOTICE}
                    </p>
                  </DetailSection>
                  <DetailSection
                    id="sales"
                    title="판매 허용범위"
                    open={detailOpen.sales}
                    onToggle={() => toggleDetailSection("sales")}
                  >
                    <div className="product-share-condition-check-grid">
                      {SALES_CHANNEL_OPTIONS.map((option) => {
                        const allowed = shareForm.salesChannels[option.key];
                        return (
                          <label
                            key={option.key}
                            className={`product-share-condition-check-item${allowed ? " is-on" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={allowed}
                              onChange={(event) => toggleSalesChannel(option.key, event.target.checked)}
                            />
                            <span>
                              <strong>{option.label}</strong>
                              <small>{allowed ? "허용" : "비허용"}</small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {shareForm.salesChannels.sellers ? (
                      <p className="product-share-condition-notice" role="note">
                        {SELLER_CHANNEL_NOTICE}
                      </p>
                    ) : null}
                    <p className="product-share-condition-notice" role="note">
                      {RESHARE_LOCKED_NOTICE}
                    </p>
                  </DetailSection>
                  <DetailSection
                    id="settlement"
                    title="정산 기본조건"
                    open={detailOpen.settlement}
                    onToggle={() => toggleDetailSection("settlement")}
                  >
                    <div className="product-share-condition-options" role="radiogroup" aria-label="정산 조건 적용 방식">
                      {SETTLEMENT_SOURCE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={shareForm.settlementSource === option.value ? "is-selected" : undefined}
                        >
                          <input
                            type="radio"
                            name="settlement-source"
                            value={option.value}
                            checked={shareForm.settlementSource === option.value}
                            onChange={() => {
                              if (option.value === "group") {
                                setShareForm((form) => ({
                                  ...form,
                                  settlementSource: "group",
                                  ...GROUP_SETTLEMENT_DEFAULTS,
                                }));
                                return;
                              }
                              updateShareForm("settlementSource", "custom");
                            }}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                    {shareForm.settlementSource === "group" ? (
                      <dl className="product-share-condition-readonly">
                        <div>
                          <dt>정산방식</dt>
                          <dd>{optionLabel(SETTLEMENT_METHOD_OPTIONS, shareForm.settlementMethod)}</dd>
                        </div>
                        <div>
                          <dt>정산주기</dt>
                          <dd>{optionLabel(SETTLEMENT_CYCLE_OPTIONS, shareForm.settlementCycle)}</dd>
                        </div>
                        <div>
                          <dt>고객 결제 주체</dt>
                          <dd>{optionLabel(PAYMENT_PARTY_OPTIONS, shareForm.paymentParty)}</dd>
                        </div>
                        <div>
                          <dt>취소수수료 적용 기준</dt>
                          <dd>{optionLabel(CANCEL_FEE_RULE_OPTIONS, shareForm.cancelFeeRule)}</dd>
                        </div>
                        <div>
                          <dt>부가세 포함 여부</dt>
                          <dd>{optionLabel(VAT_INCLUDED_OPTIONS, shareForm.vatIncluded)}</dd>
                        </div>
                      </dl>
                    ) : (
                      <div className="product-share-condition-settle-grid">
                        <label>
                          <FieldLabel required>정산방식</FieldLabel>
                          <select
                            value={shareForm.settlementMethod}
                            onChange={(event) =>
                              updateShareForm(
                                "settlementMethod",
                                event.target.value as ShareConditionForm["settlementMethod"],
                              )
                            }
                          >
                            {SETTLEMENT_METHOD_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <FieldLabel required>정산주기</FieldLabel>
                          <select
                            value={shareForm.settlementCycle}
                            onChange={(event) =>
                              updateShareForm(
                                "settlementCycle",
                                event.target.value as ShareConditionForm["settlementCycle"],
                              )
                            }
                          >
                            {SETTLEMENT_CYCLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <FieldLabel required>고객 결제 주체</FieldLabel>
                          <select
                            value={shareForm.paymentParty}
                            onChange={(event) =>
                              updateShareForm("paymentParty", event.target.value as ShareConditionForm["paymentParty"])
                            }
                          >
                            {PAYMENT_PARTY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <FieldLabel required>취소수수료 적용 기준</FieldLabel>
                          <select
                            value={shareForm.cancelFeeRule}
                            onChange={(event) =>
                              updateShareForm(
                                "cancelFeeRule",
                                event.target.value as ShareConditionForm["cancelFeeRule"],
                              )
                            }
                          >
                            {CANCEL_FEE_RULE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <FieldLabel required>부가세 포함 여부</FieldLabel>
                          <select
                            value={shareForm.vatIncluded}
                            onChange={(event) =>
                              updateShareForm("vatIncluded", event.target.value as ShareConditionForm["vatIncluded"])
                            }
                          >
                            {VAT_INCLUDED_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                    <p className="product-share-condition-period-meta">실제 정산 금액 계산은 이 화면에서 처리하지 않습니다.</p>
                  </DetailSection>
                  <DetailSection
                    id="memo"
                    title="메모"
                    open={detailOpen.memo}
                    onToggle={() => toggleDetailSection("memo")}
                  >
                    <div className="product-share-condition-memo-grid">
                      <label>
                        <FieldLabel>제휴여행사 안내</FieldLabel>
                        <textarea
                          rows={4}
                          value={shareForm.affiliateNotice}
                          onChange={(event) => updateShareForm("affiliateNotice", event.target.value)}
                          placeholder="제휴여행사에 전달할 안내를 입력하세요."
                        />
                        <small>공개 범위: 상대 제휴여행사에 노출됩니다.</small>
                      </label>
                      <label>
                        <FieldLabel>공급여행사 내부 메모</FieldLabel>
                        <textarea
                          rows={4}
                          value={shareForm.supplierMemo}
                          onChange={(event) => updateShareForm("supplierMemo", event.target.value)}
                          placeholder="공급여행사 내부 메모를 입력하세요."
                        />
                        <small>공개 범위: 공급여행사 관리자만 확인할 수 있습니다.</small>
                      </label>
                    </div>
                  </DetailSection>
                </div>
              </section>
              </fieldset>
            </div>
            <div className="product-share-condition-footer">
              <div className="product-share-condition-footer-summary" aria-live="polite">
                <span>선택 여행사 {includedModalAgencies.length}개</span>
                {isEditMode ? (
                  <span>수정 대상 {includedModalAgencies.length}개</span>
                ) : isViewMode ? (
                  <span>조회 전용</span>
                ) : (
                  <span>공유 요청 {shareApplyPreview.processable.length}개</span>
                )}
                <span>{requestModeSummaryLabel(shareForm.requestMode)}</span>
                <span>{inventorySummaryLabel(shareForm.inventoryMode)}</span>
                <span>{sharePeriodSummaryLabel(shareForm)}</span>
                <span>{optionLabel(PRICE_APPLY_MODE_OPTIONS, shareForm.priceApplyMode)}</span>
              </div>
              {shareModalMode === "create" && (
                <p className="product-share-condition-draft-hint">
                  임시저장은 이 화면을 유지하는 동안만 보관되며, 새로고침하면 사라집니다.
                  {shareFormDraft ? " 임시보관된 조건이 있습니다." : ""}
                </p>
              )}
              <div className="modal-actions product-share-condition-actions">
                {isViewMode ? (
                  <button type="button" className="primary" onClick={closeShareConditionModal}>
                    닫기
                  </button>
                ) : (
                  <>
                    <button type="button" className="secondary" onClick={closeShareConditionModal}>
                      취소
                    </button>
                    {shareModalMode === "create" && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={saveShareConditionDraft}
                        aria-label="임시저장, 이 화면 세션에만 보관되며 새로고침 시 사라집니다"
                      >
                        임시저장
                      </button>
                    )}
                    <button
                      type="button"
                      className="primary"
                      disabled={!canSubmitShareRequest}
                      onClick={applyShareFromModal}
                      aria-label={
                        canSubmitShareRequest
                          ? primaryShareActionLabel
                          : "적용 가능한 제휴여행사와 필수 입력 항목을 확인해 주세요"
                      }
                    >
                      {primaryShareActionLabel}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div
          className="modal-backdrop product-share-confirm-backdrop"
          role="presentation"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="modal product-share-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="share-confirm-title">{confirmDialog.title}</h3>
              <button type="button" aria-label="닫기" onClick={() => setConfirmDialog(null)}>
                <X size={18} />
              </button>
            </div>
            <p>{confirmDialog.message}</p>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setConfirmDialog(null)}>
                취소
              </button>
              <button type="button" className="primary" onClick={confirmDialog.onConfirm}>
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast product-affiliate-toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
