"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, QrCode, Search } from "lucide-react";
import LiveStampTourPanel from "./LiveStampTourPanel";
import StampTourForm, { type StampTourFormInitial } from "./StampTourForm";
import StampTourManageModal from "./StampTourManageModal";

const menu = [
  { icon: "▦", label: "대시보드" },
  { icon: "◇", label: "상품관리", children: ["상품목록", "상품등록", "일정표관리", "요금관리"] },
  { icon: "▤", label: "예약관리", children: ["예약접수현황", "예약달력"] },
  { icon: "₩", label: "결제관리", children: ["결제현황", "취소/환불"] },
  { icon: "⇄", label: "정산관리", children: ["정산현황", "판매점정산", "공급사정산"] },
  { icon: "♙", label: "회원관리", children: ["웹회원", "제휴여행사", "판매점관리", "관리자/직원", "그룹/권한"] },
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
  { id: 107, code: "ST-2026-0107", name: "서울사무실 QR테스트입니다", start: "2026-11-11", end: "2026-11-30", spots: 6, condition: "6곳 중 5곳 이상", participants: 3, finishers: 0, status: "운영 중", visible: true, created: "2026-11-11" },
  { id: 106, code: "ST-2026-0106", name: "철원 스탬프투어 테스트입니다", start: "2026-11-11", end: "2026-11-30", spots: 10, condition: "10곳 중 5곳 이상", participants: 0, finishers: 0, status: "운영 중", visible: true, created: "2026-11-11" },
  { id: 105, code: "ST-2026-0105", name: "테스트3번째 스탬프투어", start: "2026-11-06", end: "2026-11-30", spots: 6, condition: "6곳 전체", participants: 1, finishers: 0, status: "운영 중", visible: true, created: "2026-11-06" },
  { id: 104, code: "ST-2026-0104", name: "테스트2번째 스탬프투어", start: "2026-11-03", end: "2026-11-30", spots: 6, condition: "6곳 중 5곳 이상", participants: 4, finishers: 2, status: "운영 중", visible: true, created: "2026-11-03" },
  { id: 103, code: "ST-2026-0103", name: "테스트 스탬프투어", start: "2026-11-02", end: "2026-11-30", spots: 8, condition: "8곳 전체", participants: 7, finishers: 6, status: "운영 중", visible: true, created: "2026-11-02" },
  { id: 102, code: "ST-2026-0102", name: "철원 힐링투어", start: "2026-11-02", end: "2026-12-31", spots: 8, condition: "8곳 중 8곳 이상", participants: 1, finishers: 0, status: "운영 중", visible: true, created: "2026-11-02" },
  { id: 101, code: "ST-2026-0101", name: "철원 DMZ 평화 관광 스탬프 투어", start: "2026-09-01", end: "2026-09-30", spots: 6, condition: "6곳 중 1곳 이상", participants: 8, finishers: 5, status: "운영 중", visible: false, created: "2026-08-24" },
];

type Tour = (typeof initialTours)[number];
type SearchField = "name" | "code";
type StatusFilter = "전체 상태" | "운영 중" | "운영 중지" | "예정";

const fmt = (n: number) => n.toLocaleString("ko-KR");

function tourCode(tour: Tour) {
  return tour.code;
}

function isStoppedStatus(status: string) {
  return status === "일시중지" || status === "운영 종료";
}

function displayStatus(status: string) {
  if (isStoppedStatus(status)) return "운영 중지";
  if (status === "운영 예정") return "운영 예정";
  return status;
}

function matchesStatusFilter(status: string, filter: StatusFilter) {
  if (filter === "전체 상태") return true;
  if (filter === "운영 중") return status === "운영 중";
  if (filter === "예정") return status === "운영 예정";
  return isStoppedStatus(status);
}

function formatCondition(condition: string, spots: number) {
  if (/곳\s*전체/.test(condition)) return spots ? `${spots}곳 전체` : condition;
  if (condition.includes("전체") && spots) return `${spots}곳 전체`;
  const match = condition.match(/(\d+)곳\s*중\s*(\d+)곳/);
  if (match) return `${match[1]}곳 중 ${match[2]}곳 이상`;
  return condition || "-";
}

function formatCount(value: number) {
  return fmt(value);
}

function formatRate(participants: number, finishers: number) {
  if (!participants) return "-";
  return `${Math.round((finishers / participants) * 100)}%`;
}

const sampleTourImage =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="96" viewBox="0 0 144 96"><rect width="144" height="96" fill="#7eb6d6"/><rect y="62" width="144" height="34" fill="#6f8f55"/><rect x="92" y="28" width="10" height="38" fill="#e5e7eb"/><polygon points="84,32 110,32 97,14" fill="#d1d5db"/><rect x="95" y="40" width="4" height="8" fill="#6b7280"/><circle cx="28" cy="22" r="8" fill="#f8fafc"/></svg>`,
  );

function editInitial(tour: Tour, isPublic: boolean): StampTourFormInitial {
  const counted = tour.condition.match(/(\d+)곳\s*중\s*(\d+)곳/);
  const all = tour.condition.includes("전체");
  const extras: Record<number, StampTourFormInitial> = {
    107: { department: "서울사무실", manager: "주우석", intro: "테스트", detail: "테스트", imageUrl: sampleTourImage },
  };
  return {
    code: tour.code,
    name: tour.name,
    startDate: tour.start,
    endDate: tour.end,
    status: tour.status,
    isPublic,
    completion: !all && counted ? "count" : "all",
    requiredCount: !all && counted ? counted[2] : "",
    ...extras[tour.id],
  };
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
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [managingTour, setManagingTour] = useState<Tour | null>(null);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  useEffect(() => {
    if (!editingTour && !managingTour) return;
    const previousOverflow = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (managingTour) setManagingTour(null);
      else setEditingTour(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [editingTour, managingTour]);

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
                          <a
                            href={`/stamp-tours/${tour.id}/edit`}
                            onClick={(event) => {
                              event.preventDefault();
                              setEditingTour(tour);
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

      {editingTour && (
        <div className="stamp-edit-modal-layer" role="dialog" aria-modal="true" aria-label="스탬프투어 수정">
          <button type="button" className="stamp-edit-modal-backdrop" aria-label="닫기" onClick={() => setEditingTour(null)} />
          <div className="stamp-edit-modal">
            <header className="stamp-edit-modal-head">
              <strong>
                <Pencil size={16} />
                스탬프투어 수정
              </strong>
              <button type="button" onClick={() => setEditingTour(null)} aria-label="닫기">
                ×
              </button>
            </header>
            <div className="stamp-edit-modal-scroll">
              <StampTourForm
                key={editingTour.id}
                mode="edit"
                embedded
                initial={editInitial(editingTour, visibleMap[editingTour.id])}
                onClose={(message) => {
                  setEditingTour(null);
                  if (message) act(message);
                }}
              />
            </div>
          </div>
        </div>
      )}

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
