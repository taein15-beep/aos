"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, QrCode, Search } from "lucide-react";
import StampTourManageModal from "./StampTourManageModal";
import { goStampTourChild, stampTourMenuItem } from "./_data/stampTourNav";
import { completionRate, formatCondition, mockTours, resolveTourStatus, type MockTour } from "./_data/mockStampTours";

const menu:{icon:string;label:string;children?:string[]}[]=[
  { icon: "▦", label: "대시보드" },
  { icon: "◇", label: "상품관리", children: ["상품목록", "상품등록", "일정표관리", "요금관리"] },
  { icon: "▤", label: "예약관리", children: ["예약접수현황", "예약달력"] },
  { icon: "₩", label: "결제관리", children: ["결제현황", "취소/환불"] },
  { icon: "⇄", label: "정산관리", children: ["정산현황", "판매점정산", "공급사정산"] },
  { icon: "♙", label: "회원관리", children: ["웹회원", "제휴여행사", "판매점관리", "관리자/직원", "그룹/권한"] },
  { icon: "⌂", label: "거래처관리" },
  stampTourMenuItem(),
  { icon: "▥", label: "통계관리" },
  { icon: "◎", label: "운영관리", children: ["팝업관리", "알림관리", "알림톡"] },
  { icon: "⚙", label: "시스템설정", children: ["홈페이지설정", "결제설정", "기본설정"] },
];

type Tour = MockTour;
type SearchField = "name" | "code";
type StatusFilter = "전체 상태" | "운영 중" | "운영 중지" | "예정";

const fmt = (n: number) => n.toLocaleString("ko-KR");

/** 샘플 기준일에 맞춰 운영상태를 계산한 목록 (종료일이 지난 투어는 운영 종료) */
const initialTours: Tour[] = mockTours.map((tour) => ({ ...tour, status: resolveTourStatus(tour) }));

function isStoppedStatus(status: string) {
  return status === "일시중지" || status === "운영 종료";
}

/** 운영 종료는 운영 중지로 합치지 않고 그대로 표시한다. */
function displayStatus(status: string) {
  return status;
}

/** 운영 중지 필터는 일시중지와 운영 종료를 모두 포함한다. */
function matchesStatusFilter(status: string, filter: StatusFilter) {
  if (filter === "전체 상태") return true;
  if (filter === "운영 중") return status === "운영 중";
  if (filter === "예정") return status === "운영 예정";
  return isStoppedStatus(status);
}

export default function StampTourListPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["스탬프투어 관리"]);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [draftSearchField, setDraftSearchField] = useState<SearchField>("name");
  const [status, setStatus] = useState<StatusFilter>("전체 상태");
  const [draftStatus, setDraftStatus] = useState<StatusFilter>("전체 상태");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [draftPageSize, setDraftPageSize] = useState(20);
  const [visibleMap, setVisibleMap] = useState(Object.fromEntries(initialTours.map((t) => [t.id, t.visible])));
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
    const [managingTour, setManagingTour] = useState<Tour | null>(null);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  useEffect(() => {
    if (!managingTour) return;
    const previousOverflow = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setManagingTour(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [managingTour]);

  const filtered = useMemo(
    () =>
      initialTours.filter((tour) => {
        const keyword = query.toLowerCase();
        const matchesQuery =
          !keyword ||
          (searchField === "name"
            ? tour.name.toLowerCase().includes(keyword)
            : tour.code.toLowerCase().includes(keyword));
        const matchesStatus = matchesStatusFilter(tour.status, status);
        const matchesDate = (!appliedStart || tour.end >= appliedStart) && (!appliedEnd || tour.start <= appliedEnd);
        return matchesQuery && matchesStatus && matchesDate;
      }),
    [query, searchField, status, appliedStart, appliedEnd],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const search = () => {
    setQuery(draftQuery.trim());
    setSearchField(draftSearchField);
    setStatus(draftStatus);
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
    setPageSize(draftPageSize);
    setPage(1);
    act("검색 조건을 적용했습니다.");
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const goChild = (child: string) => goStampTourChild(child, act);

  const totalCount = initialTours.length;
  const operatingCount = initialTours.filter((t) => t.status === "운영 중").length;
  const stoppedCount = initialTours.filter((t) => isStoppedStatus(t.status)).length;

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
                className={`nav-item ${item.label === "스탬프투어 관리" ? "active" : ""}`}
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
                      key={child}
                      className={child === "스탬프투어 목록" ? "current" : ""}
                      onClick={() => goChild(child)}
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
            <span>스탬프투어 관리</span>
            <b>/</b>
            <strong>스탬프투어 목록</strong>
          </div>
          <div className="top-actions">
            <label className="search">
              <span>⌕</span>
              <input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-btn" onClick={() => act("업무지원센터를 엽니다.")}>
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
                    <span className="alert-dot info"></span>
                    <span>
                      새 스탬프 인증이 접수되었습니다.
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

        <main className="content stamp-content stamp-list-page">
          <section className="page-head stamp-page-head">
            <div>
              <h1>스탬프투어 목록</h1>
              <p>관광 스탬프투어 프로그램의 운영 상태와 참여 현황을 관리합니다.</p>
            </div>
          </section>

          <section className="stamp-list-kpi-row" aria-label="스탬프투어 요약">
            <article className="stamp-list-kpi">
              <span>전체 스탬프투어</span>
              <strong className="blue">{totalCount}건</strong>
            </article>
            <article className="stamp-list-kpi">
              <span>운영 중</span>
              <strong className="green">{operatingCount}건</strong>
            </article>
            <article className="stamp-list-kpi">
              <span>운영 중지</span>
              <strong className="navy">{stoppedCount}건</strong>
            </article>
          </section>

          <section className="stamp-list-toolbar panel" aria-label="스탬프투어 검색">
            <button type="button" className="primary stamp-list-register" onClick={() => window.location.assign("/stamp-tours/new")}>
              <Plus size={14} />
              신규등록
            </button>
            <div className="stamp-list-toolbar-filters">
              <label className="stamp-list-page-size">
                <select
                  value={draftPageSize}
                  onChange={(event) => setDraftPageSize(Number(event.target.value))}
                  aria-label="페이지 표시 개수"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>줄수</span>
              </label>
              <select
                value={draftStatus}
                onChange={(event) => setDraftStatus(event.target.value as StatusFilter)}
                aria-label="운영상태"
              >
                <option>전체 상태</option>
                <option>운영 중</option>
                <option>운영 중지</option>
                <option>예정</option>
              </select>
              <div className="stamp-list-date-range">
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label="시작일" />
                <em>~</em>
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label="종료일" />
              </div>
              <select
                value={draftSearchField}
                onChange={(event) => setDraftSearchField(event.target.value as SearchField)}
                aria-label="검색 대상"
              >
                <option value="name">스탬프투어명</option>
                <option value="code">투어코드</option>
              </select>
              <input
                className="stamp-list-query"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && search()}
                placeholder="검색어를 입력하세요"
                aria-label="검색어"
              />
              <button type="button" className="stamp-list-search-btn" onClick={search} aria-label="검색">
                <Search size={15} />
              </button>
            </div>
          </section>

          <section className="panel stamp-list-panel">
            <div className="stamp-list-table-wrap">
              <table className="stamp-list-table">
                <thead>
                  <tr>
                    {["No", "투어명", "운영기간", "관광지수", "완주조건", "참여자", "완주자", "완주율", "운영상태", "공개상태", "등록일", "관광지,경품 관리"].map(
                      (title) => (
                        <th key={title}>{title}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((tour) => (
                      <tr key={tour.id}>
                        <td className="center stamp-list-no">{tour.id}</td>
                        <td className="stamp-list-name">
                          <a href={`/stamp-tours/${tour.id}/edit`}>{tour.name}</a>
                          <small>{tour.code}</small>
                        </td>
                        <td className="stamp-list-period">
                          <span>{tour.start}</span>
                          <span>{tour.end}</span>
                        </td>
                        <td className="center">{tour.spots || "-"}</td>
                        <td className="center">{formatCondition(tour.condition, tour.spots)}</td>
                        <td className="center">{fmt(tour.participants)}</td>
                        <td className="center">{fmt(tour.finishers)}</td>
                        <td className="center">{completionRate(tour.participants, tour.finishers)}</td>
                        <td className="center">
                          <span className="stamp-list-status">{displayStatus(tour.status)}</span>
                        </td>
                        <td className="center">
                          <button
                            type="button"
                            className={`switch ${visibleMap[tour.id] ? "on" : ""}`}
                            role="switch"
                            aria-checked={visibleMap[tour.id]}
                            aria-label={`${tour.name} 공개상태`}
                            onClick={() => {
                              setVisibleMap((value) => ({ ...value, [tour.id]: !value[tour.id] }));
                              act(`${tour.name}을(를) ${visibleMap[tour.id] ? "비공개" : "공개"}로 변경했습니다.`);
                            }}
                          >
                            <i />
                          </button>
                        </td>
                        <td className="center date-cell">{tour.created}</td>
                        <td className="center">
                          <button
                            type="button"
                            className="stamp-list-outline-btn"
                            onClick={() => setManagingTour(tour)}
                          >
                            관광지,경품 관리
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12}>
                        <div className="stamp-list-empty">
                          <QrCode size={34} strokeWidth={1.4} />
                          <strong>조건에 맞는 스탬프투어가 없습니다.</strong>
                          <p>검색 조건을 변경한 뒤 다시 확인해 주세요.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <div className="stamp-list-pagination">
            <div className="pagination">
              {Array.from({ length: pages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={page === pageNumber ? "active" : ""}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
            </div>
          </div>

          <footer>© 2026 AOS Travel ERP · AviaNext</footer>
        </main>
      </div>

      {managingTour && (
        <StampTourManageModal
          key={managingTour.id}
          tour={managingTour}
          isPublic={visibleMap[managingTour.id]}
          onClose={() => setManagingTour(null)}
        />
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
