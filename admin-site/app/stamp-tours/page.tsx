"use client";

import { useMemo, useState } from "react";
import { Plus, QrCode, Search } from "lucide-react";
import LiveStampTourPanel from "./LiveStampTourPanel";

const menu = [
  { icon: "▦", label: "대시보드" },
  { icon: "◇", label: "상품관리", children: ["상품목록", "상품등록", "일정표관리", "요금관리"] },
  { icon: "▤", label: "예약관리", children: ["예약접수현황", "예약달력"] },
  { icon: "₩", label: "결제관리", children: ["결제현황", "취소/환불"] },
  { icon: "⇄", label: "정산관리", children: ["정산현황", "판매점정산", "공급사정산"] },
  { icon: "♙", label: "회원관리", children: ["웹회원", "관리자/직원", "그룹/권한"] },
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

const initialTours = [
  { id: 1, name: "철원 DMZ 평화관광 스탬프투어", region: "강원 철원군", start: "2026-07-01", end: "2026-10-31", spots: 8, condition: "8곳 중 5곳 인증", participants: 1248, finishers: 386, status: "운영 중", visible: true, created: "2026-06-18" },
  { id: 2, name: "양평 자연휴양 산책 스탬프투어", region: "경기 양평군", start: "2026-09-01", end: "2026-11-30", spots: 10, condition: "10곳 중 7곳 인증", participants: 0, finishers: 0, status: "운영 예정", visible: true, created: "2026-08-12" },
  { id: 3, name: "고양 역사문화길 스탬프투어", region: "경기 고양시", start: "2026-05-15", end: "2026-09-30", spots: 6, condition: "전체 관광지 인증", participants: 842, finishers: 274, status: "운영 중", visible: true, created: "2026-05-02" },
  { id: 4, name: "인천 개항장 시간여행 스탬프투어", region: "인천 중구", start: "2026-03-01", end: "2026-08-15", spots: 7, condition: "7곳 중 5곳 인증", participants: 1560, finishers: 621, status: "운영 종료", visible: false, created: "2026-02-14" },
  { id: 5, name: "파주 평화누리 관광 스탬프투어", region: "경기 파주시", start: "2026-08-01", end: "2026-12-20", spots: 9, condition: "9곳 중 6곳 인증", participants: 397, finishers: 81, status: "일시중지", visible: false, created: "2026-07-21" },
  { id: 6, name: "춘천 호수길 낭만 스탬프투어", region: "강원 춘천시", start: "2026-04-10", end: "2026-10-10", spots: 8, condition: "8곳 중 6곳 인증", participants: 963, finishers: 305, status: "운영 중", visible: true, created: "2026-03-28" },
  { id: 7, name: "수원 화성 성곽길 스탬프투어", region: "경기 수원시", start: "2026-10-01", end: "2027-02-28", spots: 12, condition: "12곳 중 8곳 인증", participants: 0, finishers: 0, status: "운영 예정", visible: false, created: "2026-08-17" },
];

type Tour = (typeof initialTours)[number];
type SearchField = "name" | "code";
type StatusFilter = "전체 상태" | "운영 중" | "운영 중지" | "예정";

const fmt = (n: number) => n.toLocaleString("ko-KR");

function tourCode(tour: Tour) {
  return `ST-${tour.created.slice(0, 4)}-${String(tour.id).padStart(4, "0")}`;
}

function isStoppedStatus(status: string) {
  return status === "일시중지" || status === "운영 종료";
}

function displayStatus(status: string) {
  if (isStoppedStatus(status)) return "운영 중지";
  if (status === "운영 예정") return "운영 예정";
  return status;
}

function statusTextClass(status: string) {
  if (status === "운영 중") return "stamp-status-live";
  if (status === "운영 예정") return "stamp-status-scheduled";
  return "stamp-status-stopped";
}

function matchesStatusFilter(status: string, filter: StatusFilter) {
  if (filter === "전체 상태") return true;
  if (filter === "운영 중") return status === "운영 중";
  if (filter === "예정") return status === "운영 예정";
  return isStoppedStatus(status);
}

function formatCondition(condition: string, spots: number) {
  const match = condition.match(/(\d+)곳\s*중\s*(\d+)곳/);
  if (match) return `${match[2]}/${match[1]}`;
  if (condition.includes("전체") && spots) return `${spots}/${spots}`;
  return condition || "-";
}

function formatCount(value: number) {
  return value ? fmt(value) : "-";
}

function formatRate(participants: number, finishers: number) {
  if (!participants) return "-";
  return `${((finishers / participants) * 100).toFixed(1)}%`;
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

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const filtered = useMemo(
    () =>
      initialTours.filter((tour) => {
        const keyword = query.toLowerCase();
        const matchesQuery =
          !keyword ||
          (searchField === "name"
            ? tour.name.toLowerCase().includes(keyword)
            : tourCode(tour).toLowerCase().includes(keyword));
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

  const goChild = (group: string, child: string) => {
    if (child === "상품목록") window.location.assign("/products");
    else if (child === "스탬프투어 목록") window.location.assign("/stamp-tours");
    else if (child === "관광지 관리") window.location.assign("/stamp-tours/attractions");
    else if (child === "경품관리") window.location.assign("/stamp-tours/prizes");
    else if (child === "참여자·진행현황") window.location.assign("/stamp-tours/participants");
    else if (child === "인증 이력") window.location.assign("/stamp-tours/verifications");
    else if (child === "완주·경품 관리") window.location.assign("/stamp-tours/rewards");
    else if (child === "통계") window.location.assign("/stamp-tours/statistics");
    else act(`${child} 화면은 다음 단계에서 제공될 예정입니다.`);
  };

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
                      data-planned-path={
                        item.label === "스탬프투어 관리"
                          ? `/stamp-tours/${({ "관광지 관리": "attractions", "경품관리": "prizes", "참여자·진행현황": "participants", "인증 이력": "verifications", "완주·경품 관리": "rewards", 통계: "statistics" } as Record<string, string>)[child] || ""}`
                          : undefined
                      }
                      onClick={() => goChild(item.label, child)}
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
          <LiveStampTourPanel section="tours" />

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
                    {["No", "투어명", "운영기간", "관광지수", "완주조건", "참여자", "완주자", "완주율", "운영상태", "공개상태", "등록일", "관광지관리", "관리"].map(
                      (title) => (
                        <th key={title}>{title}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((tour, index) => (
                      <tr key={tour.id}>
                        <td className="center">{(page - 1) * pageSize + index + 1}</td>
                        <td className="stamp-list-name">
                          <a
                            href={`/stamp-tours/${tour.id}`}
                            onClick={(event) => {
                              event.preventDefault();
                              window.location.assign(`/stamp-tours/${tour.id}`);
                            }}
                          >
                            {tour.name}
                          </a>
                          <small>{tourCode(tour)}</small>
                        </td>
                        <td className="stamp-list-period">
                          <span>{tour.start}</span>
                          <span>{tour.end}</span>
                        </td>
                        <td className="center">{tour.spots || "-"}</td>
                        <td className="center">{formatCondition(tour.condition, tour.spots)}</td>
                        <td className="center">{formatCount(tour.participants)}</td>
                        <td className="center">{formatCount(tour.finishers)}</td>
                        <td className="center">{formatRate(tour.participants, tour.finishers)}</td>
                        <td className="center">
                          <span className={`stamp-list-status ${statusTextClass(tour.status)}`}>{displayStatus(tour.status)}</span>
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
                            onClick={() => window.location.assign("/stamp-tours/attractions")}
                          >
                            관광지관리
                          </button>
                        </td>
                        <td className="center">
                          <button
                            type="button"
                            className="stamp-list-outline-btn"
                            onClick={() => window.location.assign(`/stamp-tours/${tour.id}/edit`)}
                          >
                            수정
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13}>
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
            <div className="stamp-list-pagination">
              <div className="pagination">
                <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  ‹
                </button>
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
                <button type="button" disabled={page === pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>
                  ›
                </button>
              </div>
            </div>
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
