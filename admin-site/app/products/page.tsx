"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Copy,
  DollarSign,
  Eye,
  FileSpreadsheet,
  Plus,
  QrCode,
  Search,
  Store,
  Trash2,
  Users,
} from "lucide-react";
import {
  AFFILIATE_FILTER_OPTIONS,
  PRODUCT_SEARCH_FIELD_OPTIONS,
  SELLER_FILTER_OPTIONS,
  getProductAffiliateSettingPath,
  getProductSellerSettingPath,
  getSampleProducts,
  matchesAffiliateFilter,
  matchesProductSearch,
  matchesSellerFilter,
  type ProductAffiliateFilter,
  type ProductListItem,
  type ProductSearchField,
  type ProductSellerFilter,
} from "@/lib/admin/products-data";
import { getAffiliateCountsForProduct } from "@/lib/admin/product-affiliate-data";
import { getSellerCountForProduct } from "@/lib/admin/product-seller-data";

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

const actionIcons = [
  ["예약", ClipboardList, "예약관리"],
  ["요금", DollarSign, "요금관리"],
  ["일정", CalendarDays, "일정관리"],
  ["보기", Eye, "미리보기"],
  ["복사", Copy, "상품복사"],
] as const;

type ToggleState = Record<string, { soldout: boolean; visible: boolean }>;

function ProductChannelCell({
  product,
  affiliateActive,
  affiliatePending,
  sellerCount,
  onAffiliate,
  onSeller,
}: {
  product: ProductListItem;
  affiliateActive: number;
  affiliatePending: number;
  sellerCount: number;
  onAffiliate: () => void;
  onSeller: () => void;
}) {
  const unshared = affiliateActive === 0 && affiliatePending === 0;

  return (
    <div className="product-channel">
      <div className="product-channel-summary" aria-label="제휴 공유 현황">
        {unshared ? (
          <span className="product-channel-muted">미공유</span>
        ) : (
          <>
            {affiliateActive > 0 && (
              <span className="product-channel-active">공유 중 {affiliateActive}</span>
            )}
            {affiliatePending > 0 && (
              <span className="product-channel-pending">수락대기 {affiliatePending}</span>
            )}
          </>
        )}
      </div>
      <div className="product-channel-seller" aria-label="판매점 현황">
        판매점 {sellerCount}
      </div>
      <div className="product-channel-actions">
        <button
          type="button"
          className={`product-channel-btn${product.isSupplier ? "" : " is-disabled"}`}
          title={product.isSupplier ? "제휴여행사 공유설정" : "공급여행사만 제휴 설정이 가능합니다"}
          aria-label={product.isSupplier ? `${product.name} 제휴여행사 공유설정` : "제휴여행사 공유설정 불가"}
          disabled={!product.isSupplier}
          onClick={onAffiliate}
        >
          <Users size={14} strokeWidth={1.9} />
          <span>제휴</span>
        </button>
        <button
          type="button"
          className="product-channel-btn"
          title="판매점 판매설정"
          aria-label={`${product.name} 판매점 판매설정`}
          onClick={onSeller}
        >
          <Store size={14} strokeWidth={1.9} />
          <span>판매점</span>
        </button>
      </div>
    </div>
  );
}

export default function ProductListPage() {
  const router = useRouter();
  const sampleProducts = useMemo(() => getSampleProducts(), []);

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["상품관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [states, setStates] = useState<ToggleState>(() =>
    Object.fromEntries(sampleProducts.map((product) => [product.no, { soldout: product.soldout, visible: product.visible }])),
  );

  const [affiliateFilter, setAffiliateFilter] = useState<ProductAffiliateFilter>("전체");
  const [sellerFilter, setSellerFilter] = useState<ProductSellerFilter>("전체");
  const [searchField, setSearchField] = useState<ProductSearchField>("상품명");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedAffiliateFilter, setAppliedAffiliateFilter] = useState<ProductAffiliateFilter>("전체");
  const [appliedSellerFilter, setAppliedSellerFilter] = useState<ProductSellerFilter>("전체");
  const [appliedSearchField, setAppliedSearchField] = useState<ProductSearchField>("상품명");
  const [appliedSearchKeyword, setAppliedSearchKeyword] = useState("");

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const toggle = (productNo: string, key: "soldout" | "visible") => {
    setStates((items) => ({
      ...items,
      [productNo]: { ...items[productNo], [key]: !items[productNo][key] },
    }));
    act(`${key === "soldout" ? "품절" : "노출"} 상태를 변경했습니다.`);
  };

  const filteredProducts = useMemo(() => {
    return sampleProducts.filter((product) => {
      const affiliateCounts = getAffiliateCountsForProduct(product.code);
      const sellerCount = getSellerCountForProduct(product.code);
      const synced = {
        ...product,
        affiliateActive: affiliateCounts.active,
        affiliatePending: affiliateCounts.pending,
        sellerCount,
      };
      if (!matchesAffiliateFilter(synced, appliedAffiliateFilter)) return false;
      if (!matchesSellerFilter(synced, appliedSellerFilter)) return false;
      if (!matchesProductSearch(product, appliedSearchKeyword, appliedSearchField)) return false;
      return true;
    });
  }, [sampleProducts, appliedAffiliateFilter, appliedSellerFilter, appliedSearchField, appliedSearchKeyword]);

  const search = () => {
    setAppliedAffiliateFilter(affiliateFilter);
    setAppliedSellerFilter(sellerFilter);
    setAppliedSearchField(searchField);
    setAppliedSearchKeyword(searchKeyword);
    act("상품을 검색했습니다.");
  };

  const goAffiliateSetting = (product: ProductListItem) => {
    if (!product.isSupplier) return;
    router.push(getProductAffiliateSettingPath(product.code));
  };

  const goSellerSetting = (product: ProductListItem) => {
    router.push(getProductSellerSettingPath(product.code));
  };

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
                          : child === "웹회원관리"
                            ? window.location.assign("/members/web")
                            : child === "스탬프투어 목록"
                              ? window.location.assign("/stamp-tours")
                              : child === "관광지 관리"
                                ? window.location.assign("/stamp-tours/attractions")
                                : child === "경품관리"
                                  ? window.location.assign("/stamp-tours/prizes")
                                  : child === "참여자·진행현황"
                                    ? window.location.assign("/stamp-tours/participants")
                                    : child === "인증 이력"
                                      ? window.location.assign("/stamp-tours/verifications")
                                      : child === "완주·경품 관리"
                                        ? window.location.assign("/stamp-tours/rewards")
                                        : child === "통계"
                                          ? window.location.assign("/stamp-tours/statistics")
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
        <div className="sidebar-help">
          <span className="nav-icon">?</span>
          <div>
            <strong>업무지원센터</strong>
            <p>평일 09:00–18:00</p>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>상품관리</span>
            <b>/</b>
            <strong>상품목록</strong>
          </div>
          <div className="top-actions">
            <label className="search">
              <span>⌕</span>
              <input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-btn" title="업무지원" onClick={() => act("업무지원센터를 엽니다.")}>
              ?
            </button>
            <div className="dropdown-wrap">
              <button
                className="icon-btn notice"
                aria-label="알림"
                onClick={() => {
                  setNoticeOpen(!noticeOpen);
                  setProfileOpen(false);
                }}
              >
                ♢<i>5</i>
              </button>
              {noticeOpen && (
                <div className="dropdown notice-menu">
                  <div className="drop-head">
                    <strong>알림</strong>
                    <button onClick={() => setNoticeOpen(false)}>모두 읽음</button>
                  </div>
                  <button>
                    <span className="alert-dot warn"></span>
                    <span>
                      확인이 필요한 상품이 있습니다.
                      <small>방금 전</small>
                    </span>
                  </button>
                  <button className="drop-footer">알림 전체보기</button>
                </div>
              )}
            </div>
            <div className="divider" />
            <div className="dropdown-wrap">
              <button
                className="profile"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNoticeOpen(false);
                }}
              >
                <span className="avatar">장</span>
                <span>
                  <b>애비아넥스트</b>
                  <small>관리자 장윤호</small>
                </span>
                <em>⌄</em>
              </button>
              {profileOpen && (
                <div className="dropdown profile-menu">
                  <button>내 정보</button>
                  <button>환경설정</button>
                  <hr />
                  <button className="logout">로그아웃</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content product-content">
          <section className="page-head">
            <div>
              <h1>여행상품 목록</h1>
              <p>등록된 여행상품과 판매 상태를 관리합니다.</p>
            </div>
          </section>

          <section className="panel product-filter" aria-label="상품 검색">
            <button className="primary product-register" onClick={() => act("신규 상품 등록 화면을 엽니다.")}>
              <Plus size={16} strokeWidth={2.2} />
              신규등록
            </button>
            <div className="filter-fields">
              <label>
                <select aria-label="페이지 표시 개수" defaultValue="15">
                  <option>15</option>
                  <option>30</option>
                  <option>50</option>
                </select>
                <span>줄수</span>
              </label>
              <select aria-label="대분류" defaultValue="">
                <option value="">대분류</option>
              </select>
              <select aria-label="중분류" defaultValue="">
                <option value="">중분류</option>
              </select>
              <select aria-label="소분류" defaultValue="">
                <option value="">소분류</option>
              </select>
              <select
                aria-label="제휴 공유 여부"
                value={affiliateFilter}
                onChange={(event) => setAffiliateFilter(event.target.value as ProductAffiliateFilter)}
              >
                {AFFILIATE_FILTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    제휴 {option}
                  </option>
                ))}
              </select>
              <select
                aria-label="판매점 지정 여부"
                value={sellerFilter}
                onChange={(event) => setSellerFilter(event.target.value as ProductSellerFilter)}
              >
                {SELLER_FILTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                aria-label="검색 항목"
                value={searchField}
                onChange={(event) => setSearchField(event.target.value as ProductSearchField)}
              >
                {PRODUCT_SEARCH_FIELD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                aria-label="검색어"
                placeholder="검색어를 입력하세요"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && search()}
              />
              <button className="filter-search" aria-label="검색" title="검색" onClick={search}>
                <Search size={17} />
              </button>
            </div>
          </section>

          <section className="panel product-list-panel">
            <div className="product-table-wrap">
              <table className="product-table">
                <colgroup>
                  <col className="c-code" />
                  <col className="c-name" />
                  <col className="c-price" />
                  <col className="c-period" />
                  <col className="c-count" />
                  <col className="c-count" />
                  <col className="c-channel" />
                  {Array.from({ length: 8 }).map((_, index) => (
                    <col className="c-action" key={index} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th rowSpan={2}>상품코드</th>
                    <th rowSpan={2}>상품명</th>
                    <th rowSpan={2}>대표가격</th>
                    <th rowSpan={2}>판매기간</th>
                    <th rowSpan={2}>
                      예약
                      <br />
                      (건/명)
                    </th>
                    <th rowSpan={2}>
                      조회
                      <br />
                      (누적/오늘)
                    </th>
                    <th rowSpan={2} className="product-channel-head">
                      판매채널
                    </th>
                    <th colSpan={5}>관리</th>
                    <th colSpan={3}>상태</th>
                  </tr>
                  <tr>
                    {["예약", "요금", "일정", "보기", "복사", "품절", "노출", "삭제"].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="product-empty">
                        검색 조건에 맞는 상품이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const rowState = states[product.no] ?? { soldout: product.soldout, visible: product.visible };
                      const affiliateCounts = getAffiliateCountsForProduct(product.code);
                      const sellerCount = getSellerCountForProduct(product.code);
                      return (
                        <tr key={product.no}>
                          <td className="product-code">
                            <b>{product.no}</b>
                            <span>[{product.code}]</span>
                          </td>
                          <td className="product-info">
                            <small>{product.category}</small>
                            {!product.isSupplier && product.supplierName && (
                              <span className="product-supplier-badge">공급: {product.supplierName}</span>
                            )}
                            <button onClick={() => act(`${product.name} 상품 상세를 엽니다.`)} title={product.name}>
                              {product.name}
                            </button>
                          </td>
                          <td className="product-price">{product.price}</td>
                          <td className="product-period">
                            {product.period ? (
                              <>
                                <span>{product.period[0]} ~</span>
                                <span>{product.period[1]}</span>
                              </>
                            ) : (
                              <span>~</span>
                            )}
                          </td>
                          <td className="center">{product.reservation}</td>
                          <td className="center">{product.views}</td>
                          <td className="product-channel-cell">
                            <ProductChannelCell
                              product={product}
                              affiliateActive={affiliateCounts.active}
                              affiliatePending={affiliateCounts.pending}
                              sellerCount={sellerCount}
                              onAffiliate={() => goAffiliateSetting(product)}
                              onSeller={() => goSellerSetting(product)}
                            />
                          </td>
                          {actionIcons.map(([label, Icon, title]) => (
                            <td className="action-cell" key={label}>
                              <button
                                className="table-action"
                                title={title}
                                aria-label={title}
                                onClick={() => act(`${product.name} ${title} 화면을 엽니다.`)}
                              >
                                <Icon size={17} strokeWidth={1.8} />
                              </button>
                            </td>
                          ))}
                          <td className="action-cell">
                            <button
                              className={`switch ${rowState.soldout ? "on" : ""}`}
                              role="switch"
                              aria-checked={rowState.soldout}
                              aria-label="품절 상태"
                              title="품절 상태"
                              onClick={() => toggle(product.no, "soldout")}
                            >
                              <i />
                            </button>
                          </td>
                          <td className="action-cell">
                            <button
                              className={`switch ${rowState.visible ? "on" : ""}`}
                              role="switch"
                              aria-checked={rowState.visible}
                              aria-label="노출 상태"
                              title="노출 상태"
                              onClick={() => toggle(product.no, "visible")}
                            >
                              <i />
                            </button>
                          </td>
                          <td className="action-cell">
                            <button
                              className="table-action delete"
                              title="삭제"
                              aria-label="삭제"
                              onClick={() => act(`${product.name} 삭제 확인이 필요합니다.`)}
                            >
                              <Trash2 size={17} strokeWidth={1.8} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel product-footer">
            <div>
              <span className="product-result-count">
                총 {filteredProducts.length}건
                {filteredProducts.length !== sampleProducts.length ? ` (전체 ${sampleProducts.length}건)` : ""}
              </span>
            </div>
            <div className="pagination">
              <button disabled>‹</button>
              <button className="active">1</button>
              <button disabled>›</button>
            </div>
            <button className="secondary excel" onClick={() => act("엑셀 다운로드를 준비합니다.")}>
              <FileSpreadsheet size={15} />
              엑셀 다운로드
            </button>
          </section>
          <footer>© 2026 AOS Travel ERP · AviaNext</footer>
        </main>
      </div>
      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
