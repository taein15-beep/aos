"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  PauseCircle,
  PlayCircle,
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
  acceptanceLabel,
  cloneAffiliateRows,
  countAffiliateShareStatuses,
  formatAffiliateGroups,
  getProductAffiliateSummary,
  getSampleAffiliateAgencies,
  isSharedStatus,
  shareStatusBadgeClass,
  type AffiliateAcceptanceFilter,
  type AffiliateAgencyRow,
  type AffiliateRegionFilter,
  type AffiliateShareFilter,
  type AffiliateShareGroupFilter,
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
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [pendingShareIds, setPendingShareIds] = useState<string[]>([]);
  const [shareStartDate, setShareStartDate] = useState("2026-06-01");
  const [shareEndDate, setShareEndDate] = useState("2026-12-31");

  const isDirty = useMemo(() => !rowsEqual(draftRows, savedRows), [draftRows, savedRows]);
  const counts = useMemo(() => countAffiliateShareStatuses(draftRows), [draftRows]);
  const sharedTargets = useMemo(() => draftRows.filter((row) => isSharedStatus(row.shareStatus)), [draftRows]);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
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

  const openShareDateModal = (ids: string[]) => {
    setPendingShareIds(ids);
    setShareStartDate("2026-06-01");
    setShareEndDate("2026-12-31");
    setDateModalOpen(true);
  };

  const applyShareTargets = () => {
    if (!shareStartDate || !shareEndDate) {
      act("공유 시작일과 종료일을 입력해 주세요.");
      return;
    }
    if (shareStartDate > shareEndDate) {
      act("공유 종료일은 시작일 이후여야 합니다.");
      return;
    }
    updateRows((rows) =>
      rows.map((row) =>
        pendingShareIds.includes(row.id)
          ? {
              ...row,
              shareStatus: "수락대기",
              shareStartDate,
              shareEndDate,
            }
          : row,
      ),
    );
    setSelectedIds((ids) => ids.filter((id) => !pendingShareIds.includes(id)));
    setDateModalOpen(false);
    act(`${pendingShareIds.length}개 제휴여행사를 상품공유 대상으로 추가했습니다.`);
  };

  const addSelectedToShare = () => {
    const targets = draftRows.filter((row) => selectedIds.includes(row.id) && row.shareStatus === "미공유");
    if (targets.length === 0) {
      act("공유 대상으로 추가할 미공유 여행사를 선택해 주세요.");
      return;
    }
    openShareDateModal(targets.map((row) => row.id));
  };

  const removeSelectedFromShare = () => {
    const targets = draftRows.filter((row) => selectedIds.includes(row.id) && isSharedStatus(row.shareStatus));
    if (targets.length === 0) {
      act("공유 대상에서 제외할 여행사를 선택해 주세요.");
      return;
    }
    updateRows((rows) =>
      rows.map((row) =>
        targets.some((target) => target.id === row.id)
          ? { ...row, shareStatus: "미공유", shareStartDate: null, shareEndDate: null }
          : row,
      ),
    );
    setSelectedIds([]);
    act("선택한 제휴여행사를 공유 대상에서 제외했습니다.");
  };

  const pauseShare = (id: string) => {
    updateRows((rows) =>
      rows.map((row) => (row.id === id && row.shareStatus === "공유 중" ? { ...row, shareStatus: "공유 중지" } : row)),
    );
    act("상품공유를 중지했습니다.");
  };

  const resumeShare = (id: string) => {
    updateRows((rows) =>
      rows.map((row) =>
        row.id === id && row.shareStatus === "공유 중지" ? { ...row, shareStatus: "공유 중" } : row,
      ),
    );
    act("상품공유를 재개했습니다.");
  };

  const excludeShare = (id: string) => {
    updateRows((rows) =>
      rows.map((row) =>
        row.id === id
          ? { ...row, shareStatus: "미공유", shareStartDate: null, shareEndDate: null }
          : row,
      ),
    );
    act("공유 대상에서 제외했습니다.");
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
              <button type="button" className="primary" onClick={addSelectedToShare}>
                <UserPlus size={14} />
                선택 여행사 공유 대상 추가
              </button>
              <button type="button" className="secondary" onClick={removeSelectedFromShare}>
                <UserMinus size={14} />
                공유 대상 제외
              </button>
              <span className="product-affiliate-selection-count">선택 {selectedIds.length}건</span>
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
                          <span className={`badge ${row.partnershipStatus === "정상" ? "success" : row.partnershipStatus === "협의중" ? "warn" : "gray"}`}>
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
                            {row.shareStatus === "미공유" && (
                              <button type="button" className="small-btn" onClick={() => openShareDateModal([row.id])}>
                                공유 추가
                              </button>
                            )}
                            {row.shareStatus === "공유 중" && (
                              <>
                                <button type="button" className="small-btn" onClick={() => pauseShare(row.id)} title="공유 중지">
                                  <PauseCircle size={12} />
                                  중지
                                </button>
                                <button type="button" className="small-btn" onClick={() => excludeShare(row.id)}>
                                  제외
                                </button>
                              </>
                            )}
                            {row.shareStatus === "공유 중지" && (
                              <>
                                <button type="button" className="small-btn" onClick={() => resumeShare(row.id)} title="공유 재개">
                                  <PlayCircle size={12} />
                                  재개
                                </button>
                                <button type="button" className="small-btn" onClick={() => excludeShare(row.id)}>
                                  제외
                                </button>
                              </>
                            )}
                            {["수락대기", "공유 종료", "공유 거절"].includes(row.shareStatus) && (
                              <button type="button" className="small-btn" onClick={() => excludeShare(row.id)}>
                                제외
                              </button>
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
            <div className="product-affiliate-selected-list">
              {sharedTargets.length === 0 ? (
                <p className="product-affiliate-empty">아직 상품공유 대상으로 지정된 제휴여행사가 없습니다.</p>
              ) : (
                sharedTargets.map((row) => (
                  <div key={row.id} className="product-affiliate-selected-item">
                    <div>
                      <strong>{row.name}</strong>
                      <small>{formatAffiliateGroups(row.groups)}</small>
                    </div>
                    <span className={`badge ${shareStatusBadgeClass(row.shareStatus)}`}>{row.shareStatus}</span>
                    <span className="product-affiliate-selected-period">
                      {row.shareStartDate ?? "-"} ~ {row.shareEndDate ?? "-"}
                    </span>
                    <button type="button" className="small-btn" onClick={() => excludeShare(row.id)}>
                      제외
                    </button>
                  </div>
                ))
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

      {dateModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDateModalOpen(false)}>
          <div
            className="modal product-affiliate-date-modal"
            role="dialog"
            aria-labelledby="affiliate-date-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="affiliate-date-title">상품공유 기간 지정</h3>
              <button type="button" aria-label="닫기" onClick={() => setDateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p>선택한 제휴여행사에 상품공유를 요청합니다. 수락 전까지 상태는 수락대기로 표시됩니다.</p>
            <div className="product-affiliate-date-fields">
              <label>
                <span>공유 시작일</span>
                <input type="date" value={shareStartDate} onChange={(event) => setShareStartDate(event.target.value)} />
              </label>
              <label>
                <span>공유 종료일</span>
                <input type="date" value={shareEndDate} onChange={(event) => setShareEndDate(event.target.value)} />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setDateModalOpen(false)}>
                취소
              </button>
              <button type="button" className="primary" onClick={applyShareTargets}>
                공유 대상 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
