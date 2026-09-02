"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, QrCode, RotateCcw, Save, Search } from "lucide-react";
import {
  COMMISSION_GRADE_OPTIONS,
  LOGGED_IN_TRAVEL_AGENCY,
  REGION_MAP,
  commissionGradeBadgeClass,
  formatSellerRegion,
  getSavedSellerIds,
  getSellerSettingLastSavedAt,
  getSellerStoreById,
  getSellerStoresForCurrentAgency,
  isSelectableSeller,
  saveSellerSelections,
  type CommissionGrade,
  type SellerStore,
} from "@/lib/admin/product-seller-data";
import {
  getProductAffiliateSettingPath,
  getProductForSellerSetting,
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

type FilterDraft = {
  name: string;
  sido: string;
  sigungu: string;
  grade: (typeof COMMISSION_GRADE_OPTIONS)[number];
  ceo: string;
  manager: string;
  phone: string;
};

const EMPTY_FILTER: FilterDraft = {
  name: "",
  sido: "",
  sigungu: "",
  grade: "전체",
  ceo: "",
  manager: "",
  phone: "",
};

function idsEqual(a: string[], b: string[]) {
  return a.slice().sort().join(",") === b.slice().sort().join(",");
}

export default function ProductSellerSettingPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const productCode = decodeURIComponent(params.code ?? "");

  const product = useMemo(() => getProductForSellerSetting(productCode), [productCode]);
  const allStores = useMemo(() => getSellerStoresForCurrentAgency(), []);

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["상품관리"]);
  const [toast, setToast] = useState("");

  const [savedIds, setSavedIds] = useState<string[]>(() => getSavedSellerIds(productCode));
  const [workingIds, setWorkingIds] = useState<string[]>(() => getSavedSellerIds(productCode));
  const [lastSavedAt, setLastSavedAt] = useState(() => getSellerSettingLastSavedAt(productCode));
  const [assignedDates, setAssignedDates] = useState<Record<string, string>>({});

  const [draftFilter, setDraftFilter] = useState<FilterDraft>(EMPTY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState<FilterDraft>(EMPTY_FILTER);
  const [pendingCheckIds, setPendingCheckIds] = useState<string[]>([]);
  const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [selectedSortAsc, setSelectedSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [zeroSaveOpen, setZeroSaveOpen] = useState(false);

  const isDirty = useMemo(() => !idsEqual(workingIds, savedIds), [workingIds, savedIds]);

  useEffect(() => {
    const initial = getSavedSellerIds(productCode);
    setSavedIds(initial);
    setWorkingIds(initial);
    setLastSavedAt(getSellerSettingLastSavedAt(productCode));
    setAssignedDates((prev) => {
      const dates: Record<string, string> = {};
      initial.forEach((id) => {
        dates[id] = prev[id] ?? "2026-06-01";
      });
      return dates;
    });
    setPendingCheckIds([]);
    setSelectedCheckIds([]);
  }, [productCode]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const goBack = () => {
    if (isDirty && !window.confirm("저장하지 않은 변경사항이 있습니다. 상품목록으로 이동할까요?")) return;
    router.push("/products");
  };

  const filteredStores = useMemo(() => {
    return allStores.filter((store) => {
      if (appliedFilter.name && !store.name.includes(appliedFilter.name)) return false;
      if (appliedFilter.sido && store.sido !== appliedFilter.sido) return false;
      if (appliedFilter.sigungu && store.sigungu !== appliedFilter.sigungu) return false;
      if (appliedFilter.grade !== "전체" && store.commissionGrade !== appliedFilter.grade) return false;
      if (appliedFilter.ceo && !store.ceo.includes(appliedFilter.ceo)) return false;
      if (appliedFilter.manager && !store.manager.includes(appliedFilter.manager)) return false;
      if (appliedFilter.phone && !store.phone.includes(appliedFilter.phone)) return false;
      return true;
    });
  }, [allStores, appliedFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStores.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredStores.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedStores = useMemo(() => {
    let rows = workingIds.map((id) => getSellerStoreById(id)).filter((store): store is SellerStore => Boolean(store));
    if (selectedSortAsc) rows = [...rows].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    if (selectedKeyword.trim()) rows = rows.filter((store) => store.name.includes(selectedKeyword.trim()));
    return rows;
  }, [workingIds, selectedKeyword, selectedSortAsc]);

  const salesStatusLabel = product
    ? product.soldout
      ? "품절"
      : product.visible
        ? "판매중"
        : "비노출"
    : "-";

  const applySearch = () => {
    setAppliedFilter({ ...draftFilter });
    setPage(1);
    act("검색 조건을 적용했습니다.");
  };

  const resetFilters = () => {
    setDraftFilter(EMPTY_FILTER);
    setAppliedFilter(EMPTY_FILTER);
    setPendingCheckIds([]);
    setPage(1);
  };

  const addPendingToWorking = () => {
    const addable = pendingCheckIds.filter((id) => {
      const store = getSellerStoreById(id);
      return store && isSelectableSeller(store);
    });
    if (addable.length === 0) {
      act("추가할 판매점을 선택해 주세요.");
      return;
    }
    setWorkingIds((ids) => [...new Set([...ids, ...addable])]);
    setAssignedDates((dates) => {
      const next = { ...dates };
      addable.forEach((id) => {
        if (!next[id]) next[id] = "2026-06-01";
      });
      return next;
    });
    setPendingCheckIds([]);
    act(`${addable.length}개 판매점을 선택 목록에 추가했습니다.`);
  };

  const removeFromWorking = (id: string) => {
    setWorkingIds((ids) => ids.filter((value) => value !== id));
    setPendingCheckIds((ids) => ids.filter((value) => value !== id));
    setSelectedCheckIds((ids) => ids.filter((value) => value !== id));
  };

  const releaseCheckedSelected = () => {
    selectedCheckIds.forEach(removeFromWorking);
    setSelectedCheckIds([]);
    act("선택한 판매점을 공개 해제했습니다.");
  };

  const resetChanges = () => {
    if (!isDirty) {
      act("변경된 내용이 없습니다.");
      return;
    }
    if (!window.confirm("변경사항을 초기화할까요?")) return;
    setWorkingIds([...savedIds]);
    setPendingCheckIds([]);
    setSelectedCheckIds([]);
    setSelectedKeyword("");
    setSelectedSortAsc(false);
    act("마지막 저장 상태로 초기화했습니다.");
  };

  const persistSave = () => {
    saveSellerSelections(productCode, workingIds);
    setSavedIds([...workingIds]);
    setLastSavedAt(getSellerSettingLastSavedAt(productCode));
    act("판매점 설정을 저장했습니다.");
  };

  const requestSave = () => {
    if (workingIds.length === 0) {
      setZeroSaveOpen(true);
      return;
    }
    persistSave();
  };

  if (!product) {
    return (
      <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
        <div className="workspace" style={{ marginLeft: collapsed ? 64 : 236 }}>
          <main className="content product-seller-content">
            <section className="panel product-seller-not-found">
              <strong>판매점 설정을 열 수 없습니다.</strong>
              <p>상품코드를 확인해 주세요.</p>
              <button type="button" className="secondary" onClick={() => router.push("/products")}>
                <ArrowLeft size={14} />
                상품목록으로
              </button>
            </section>
          </main>
        </div>
      </div>
    );
  }

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
                        child === "상품목록" ? window.location.assign("/products") : act(`${child} 화면은 다음 단계에서 제공될 예정입니다.`)
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
            <strong>판매점 설정</strong>
          </div>
        </header>

        <main className="content product-seller-content">
          <section className="page-head product-seller-page-head">
            <div>
              <div className="product-affiliate-title-row">
                <button type="button" className="secondary product-affiliate-back" onClick={goBack}>
                  <ArrowLeft size={14} />
                  상품목록
                </button>
                <h1>판매점 설정</h1>
              </div>
              <p>
                <strong>{LOGGED_IN_TRAVEL_AGENCY}</strong> 소속 판매점 중 이 상품을 판매할 수 있는 채널을 선택합니다.
                제휴여행사 상품공유와는 별도 기능입니다.
              </p>
            </div>
            <button type="button" className="primary" onClick={requestSave} disabled={!isDirty}>
              <Save size={14} />
              판매점 설정 저장
            </button>
          </section>

          <nav className="member-web-detail-tabs product-affiliate-tabs" aria-label="상품 설정 탭">
            <button type="button" onClick={goBack}>
              상품목록
            </button>
            <button type="button" onClick={() => router.push(getProductAffiliateSettingPath(productCode))}>
              제휴여행사 공유
            </button>
            <button type="button" className="active">
              판매점 설정
            </button>
          </nav>

          <section className="panel product-seller-notice">
            <p>
              현재 로그인 여행사 <strong>{LOGGED_IN_TRAVEL_AGENCY}</strong> 기준 판매점 관계만 표시합니다. 동일
              판매점이 다른 여행사에도 가입한 경우 별도 관계로 관리됩니다. 커미션등급은 수수료 정책 연결용 필드이며,
              이번 단계에서는 계산·정산을 수행하지 않습니다.
            </p>
          </section>

          <section className="product-affiliate-summary product-seller-summary">
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
                <small>상품상태</small>
                <strong>{salesStatusLabel}</strong>
              </span>
            </article>
            <article className="member-web-detail-kpi">
              <span>
                <small>선택된 판매점</small>
                <strong className="product-affiliate-count-active">{workingIds.length}개</strong>
              </span>
            </article>
            <article className="member-web-detail-kpi">
              <span>
                <small>최종 수정일</small>
                <strong>{lastSavedAt}</strong>
              </span>
            </article>
          </section>

          <section className="panel product-seller-filter">
            <div className="product-seller-filter-head">
              <strong>판매점 검색</strong>
            </div>
            <div className="product-seller-filter-grid">
              <label>
                <span>판매점명</span>
                <input
                  value={draftFilter.name}
                  onChange={(event) => setDraftFilter((value) => ({ ...value, name: event.target.value }))}
                  placeholder="판매점명"
                />
              </label>
              <label>
                <span>시·도</span>
                <select
                  value={draftFilter.sido}
                  onChange={(event) =>
                    setDraftFilter((value) => ({ ...value, sido: event.target.value, sigungu: "" }))
                  }
                >
                  {Object.keys(REGION_MAP).map((option) => (
                    <option key={option || "all"} value={option}>
                      {option || "전체"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>시·군·구</span>
                <select
                  value={draftFilter.sigungu}
                  onChange={(event) => setDraftFilter((value) => ({ ...value, sigungu: event.target.value }))}
                >
                  {(REGION_MAP[draftFilter.sido] ?? ["전체"]).map((option) => (
                    <option key={option} value={option === "전체" ? "" : option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>커미션등급</span>
                <select
                  value={draftFilter.grade}
                  onChange={(event) =>
                    setDraftFilter((value) => ({
                      ...value,
                      grade: event.target.value as FilterDraft["grade"],
                    }))
                  }
                >
                  {COMMISSION_GRADE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>대표자명</span>
                <input
                  value={draftFilter.ceo}
                  onChange={(event) => setDraftFilter((value) => ({ ...value, ceo: event.target.value }))}
                />
              </label>
              <label>
                <span>담당자명</span>
                <input
                  value={draftFilter.manager}
                  onChange={(event) => setDraftFilter((value) => ({ ...value, manager: event.target.value }))}
                />
              </label>
              <label>
                <span>연락처</span>
                <input
                  value={draftFilter.phone}
                  onChange={(event) => setDraftFilter((value) => ({ ...value, phone: event.target.value }))}
                />
              </label>
            </div>
            <div className="product-affiliate-filter-actions">
              <button type="button" className="secondary" onClick={resetFilters}>
                검색조건 초기화
              </button>
              <button type="button" className="primary" onClick={applySearch}>
                <Search size={14} />
                검색
              </button>
            </div>
          </section>

          <div className="product-seller-management-grid">
            <section className="panel product-seller-result-panel">
              <div className="product-seller-panel-head">
                <strong>
                  판매점 <span className="muted">총 {filteredStores.length}개</span>
                </strong>
                <div className="product-seller-panel-actions">
                  <label className="product-seller-per-page">
                    <span>페이지당</span>
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setPage(1);
                      }}
                    >
                      {[5, 10, 20].map((size) => (
                        <option key={size} value={size}>
                          {size}개
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="primary" onClick={addPendingToWorking}>
                    선택항목 추가
                  </button>
                </div>
              </div>
              <div className="member-web-detail-table-wrap">
                <table className="member-web-detail-table product-seller-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="현재 페이지 전체 선택"
                          checked={
                            pageRows.filter(isSelectableSeller).length > 0 &&
                            pageRows.filter(isSelectableSeller).every((store) => pendingCheckIds.includes(store.id))
                          }
                          onChange={(event) => {
                            const ids = pageRows.filter(isSelectableSeller).map((store) => store.id);
                            if (event.target.checked) {
                              setPendingCheckIds((values) => [...new Set([...values, ...ids])]);
                            } else {
                              setPendingCheckIds((values) => values.filter((id) => !ids.includes(id)));
                            }
                          }}
                        />
                      </th>
                      <th>판매점명</th>
                      <th>지역</th>
                      <th>커미션등급</th>
                      <th>공개상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="product-affiliate-empty">
                          검색된 판매점이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((store) => {
                        const selectable = isSelectableSeller(store);
                        const isWorking = workingIds.includes(store.id);
                        return (
                          <tr key={store.id} className={!selectable ? "is-disabled" : isWorking ? "is-selected" : ""}>
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`${store.name} 선택`}
                                disabled={!selectable}
                                checked={pendingCheckIds.includes(store.id)}
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    setPendingCheckIds((ids) => [...ids, store.id]);
                                  } else {
                                    setPendingCheckIds((ids) => ids.filter((id) => id !== store.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="text-left">
                              <strong>{store.name}</strong>
                              <small className="product-seller-relationship">{store.relationshipId}</small>
                            </td>
                            <td>{formatSellerRegion(store)}</td>
                            <td>
                              <span className={`badge ${commissionGradeBadgeClass(store.commissionGrade)}`}>
                                {store.commissionGrade}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${isWorking ? "info" : "gray"}`}>
                                {isWorking ? "선택됨" : "미선택"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="pagination product-seller-pagination">
                <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                  ‹
                </button>
                {Array.from({ length: totalPages }).map((_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      className={pageNumber === currentPage ? "active" : ""}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                  ›
                </button>
              </div>
            </section>

            <section className="panel product-seller-selected-panel">
              <div className="product-seller-panel-head">
                <strong>
                  선택된 판매점 <span className="badge info">{workingIds.length}개</span>
                </strong>
                <div className="product-seller-panel-actions">
                  <input
                    className="product-seller-selected-search"
                    placeholder="선택된 판매점명 검색"
                    value={selectedKeyword}
                    onChange={(event) => setSelectedKeyword(event.target.value)}
                  />
                  <button type="button" className="secondary" onClick={() => setSelectedSortAsc(true)}>
                    가나다순 정렬
                  </button>
                  <button type="button" className="secondary danger-text" onClick={releaseCheckedSelected}>
                    선택 공개해제
                  </button>
                </div>
              </div>
              {selectedStores.length === 0 ? (
                <div className="product-seller-empty">
                  <strong>현재 이 상품에 공개된 판매점이 없습니다.</strong>
                  <span>위 판매점 목록에서 판매점을 선택한 후 추가해 주세요.</span>
                </div>
              ) : (
                <div className="member-web-detail-table-wrap">
                  <table className="member-web-detail-table product-seller-table">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            aria-label="선택된 판매점 전체 선택"
                            checked={
                              selectedStores.length > 0 &&
                              selectedStores.every((store) => selectedCheckIds.includes(store.id))
                            }
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedCheckIds(selectedStores.map((store) => store.id));
                              } else {
                                setSelectedCheckIds([]);
                              }
                            }}
                          />
                        </th>
                        <th>판매점명</th>
                        <th>지역</th>
                        <th>커미션등급</th>
                        <th>설정일</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStores.map((store) => (
                        <tr key={store.id}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`${store.name} 공개해제 선택`}
                              checked={selectedCheckIds.includes(store.id)}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setSelectedCheckIds((ids) => [...ids, store.id]);
                                } else {
                                  setSelectedCheckIds((ids) => ids.filter((id) => id !== store.id));
                                }
                              }}
                            />
                          </td>
                          <td className="text-left">{store.name}</td>
                          <td>{formatSellerRegion(store)}</td>
                          <td>
                            <span className={`badge ${commissionGradeBadgeClass(store.commissionGrade)}`}>
                              {store.commissionGrade}
                            </span>
                          </td>
                          <td className="date-cell">{assignedDates[store.id] ?? "2026-06-01"}</td>
                          <td>
                            <button type="button" className="small-btn" onClick={() => removeFromWorking(store.id)}>
                              공개해제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <section className="product-affiliate-sticky-actions product-seller-sticky-actions">
            <div>{isDirty ? "저장하지 않은 변경사항이 있습니다." : "저장 전까지 추가 및 삭제 내용은 임시상태로 유지됩니다."}</div>
            <div className="product-affiliate-sticky-buttons">
              <button type="button" className="secondary" onClick={goBack}>
                취소
              </button>
              <button type="button" className="secondary" onClick={resetChanges}>
                <RotateCcw size={14} />
                변경사항 초기화
              </button>
              <button type="button" className="primary" onClick={requestSave} disabled={!isDirty}>
                <Save size={14} />
                판매점 설정 저장
              </button>
            </div>
          </section>

          <footer>© 2026 AOS Travel ERP · AviaNext</footer>
        </main>
      </div>

      {zeroSaveOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setZeroSaveOpen(false)}>
          <div className="modal product-affiliate-date-modal" role="dialog" aria-labelledby="zero-save-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3 id="zero-save-title">판매점 공개 해제 확인</h3>
            </div>
            <p>선택된 판매점이 없습니다. 저장하면 해당 상품이 모든 판매점에서 비공개 처리됩니다. 계속하시겠습니까?</p>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setZeroSaveOpen(false)}>
                취소
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setZeroSaveOpen(false);
                  persistSave();
                }}
              >
                비공개로 저장
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
