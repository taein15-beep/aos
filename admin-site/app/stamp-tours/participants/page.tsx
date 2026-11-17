"use client";

import { useEffect, useMemo, useState } from "react";
import { goStampTourChild, stampTourMenuItem } from "../_data/stampTourNav";
import { getPrizesByTourId, getSpotsByTourId, getTourById, mockParticipants, mockStatsSummary, mockTours, type MockParticipant } from "../_data/mockStampTours";
import { AlertTriangle, ClipboardList, Download, QrCode, Search } from "lucide-react";

const menu: { icon: string; label: string; children?: string[] }[] = [
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

type ProgressStatus = "진행중" | "완주";
type SearchField = "name" | "number" | "phone";
type Participant = MockParticipant & {
  tourName: string;
  spotTotal: number;
  rate: number;
  rateCurrent: number;
  rateTotal: number;
  status: ProgressStatus;
};

function toParticipant(row: MockParticipant): Participant {
  const tour = getTourById(row.tourId);
  const required = Math.max(tour?.requiredCount ?? 1, 1);
  const current = Math.min(row.spots, required);
  return {
    ...row,
    tourName: tour?.name ?? "-",
    spotTotal: tour?.spots ?? 0,
    rateCurrent: current,
    rateTotal: required,
    rate: row.completed ? 100 : Math.round((current / required) * 100),
    status: row.completed ? "완주" : "진행중",
  };
}

const participants: Participant[] = mockParticipants.map(toParticipant);

const joinedKey = (value: string) => value.slice(0, 10).replaceAll(".", "-");
const dayLabel = (value: string) => value.slice(0, 10);

type BookPrize = { name: string; goal: number; grade: string; method: string; kind: "gift" | "rice" | "box" };

function bookPrizesOf(tourId: number): BookPrize[] {
  const prizes = [...getPrizesByTourId(tourId)].sort((a, b) => a.requiredCount - b.requiredCount);
  return prizes.map((prize, index) => ({
    name: prize.name,
    goal: prize.requiredCount,
    grade: `${prizes.length - index}등급`,
    method: prize.method,
    kind: prize.type === "모바일 쿠폰" ? "gift" : prize.name.includes("쌀") ? "rice" : "box",
  }));
}

function StampBookModal({ row, onClose, onComplete }: { row: Participant; onClose: () => void; onComplete: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const bookPrizes = bookPrizesOf(row.tourId);
  const collected = row.rateCurrent;
  const goal = row.rateTotal || 1;
  const visited = Math.min(row.spots, row.spotTotal);
  const stamps = getSpotsByTourId(row.tourId).map((spot, index) => {
    const done = index < visited;
    const date = index === 0 ? dayLabel(row.joined) : dayLabel(row.recent);
    return { name: spot.name, done, date };
  });
  const reached = [...bookPrizes].reverse().find((prize) => collected >= prize.goal);
  const next = bookPrizes.find((prize) => collected < prize.goal);
  const gradeText = !bookPrizes.length
    ? "등록된 경품이 없습니다"
    : reached
      ? next
        ? `현재 ${reached.grade} · ${next.goal}곳 인증 시 ${next.grade}`
        : `현재 ${reached.grade}입니다`
      : `아직 경품 등급이 없어요 · ${next?.goal ?? 1}곳 인증 시 ${next?.grade ?? "1등급"}`;

  return (
    <div className="sb-layer" role="presentation" onClick={onClose}>
      <section className="sb-modal" role="dialog" aria-modal="true" aria-labelledby="stamp-book-title" onClick={(event) => event.stopPropagation()}>
        <header className="sb-head">
          <strong id="stamp-book-title">
            <ClipboardList size={18} />
            인증 결과 화면
          </strong>
          <button type="button" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>
        <div className="sb-scroll">
          <section className="sb-card sb-hero">
            <small>STAMP BOOK</small>
            <h2>스탬프북</h2>
            <p>나의 여행 기록 · 수집한 스탬프를 확인하세요.</p>
          </section>
          <section className="sb-card sb-info">
            <div>
              <span>스탬프투어명</span>
              <b>{row.tourName}</b>
            </div>
            <div>
              <span>참가번호</span>
              <b>{row.number}</b>
            </div>
            <div>
              <span>참여자</span>
              <b>{row.name}</b>
            </div>
            <div>
              <span>참여일</span>
              <b>{dayLabel(row.joined)}</b>
            </div>
          </section>
          <section className="sb-card sb-progress">
            <div>
              <b>
                {collected} <span>/ {goal}</span>
              </b>
              <small>{collected >= goal ? "스탬프를 모두 모았어요" : "스탬프를 모으고 있어요"}</small>
            </div>
            <i>
              <em style={{ width: `${Math.min(100, Math.round((collected / goal) * 100))}%` }} />
            </i>
          </section>
          <section className="sb-card">
            <div className="sb-stamps">
              {stamps.map((stamp) => (
                <article key={stamp.name} className={stamp.done ? "done" : "wait"}>
                  <i>
                    테{stamp.done && <em>OK</em>}
                  </i>
                  <b>{stamp.name}</b>
                  <span>{stamp.done ? `${stamp.date} 인증` : "미방문"}</span>
                </article>
              ))}
            </div>
          </section>
          <section className="sb-card sb-reward">
            <h3>경품 등급</h3>
            <p className="sb-grade">{gradeText}</p>
            <div className="sb-prizes">
              {bookPrizes.map((prize) => (
                <article key={prize.name}>
                  <div className={`sb-thumb ${prize.kind}`}>
                    {prize.kind === "gift" && <span>14일권</span>}
                    {prize.kind === "rice" && <span>오대쌀 4Kg</span>}
                    {prize.kind === "box" && <span>경품</span>}
                    <em>{prize.grade}</em>
                  </div>
                  <b>{prize.name}</b>
                  <small>
                    {prize.goal}곳 인증 · {Math.max(prize.goal - collected, 0)}곳 남음
                  </small>
                  <span>{prize.method}</span>
                </article>
              ))}
            </div>
            <button type="button" className="sb-submit" onClick={onComplete}>
              경품 선택 완료하기
            </button>
            <p className="sb-hint">QR코드로 관광지를 인증하면 스탬프가 채워집니다.</p>
          </section>
        </div>
      </section>
    </div>
  );
}

export default function ParticipantProgressPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["스탬프투어 관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [tour, setTour] = useState("전체");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState("최근 참여순");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [keyword, setKeyword] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("전체");
  const [anomaly, setAnomaly] = useState("전체");
  const [applied, setApplied] = useState({ keyword: "", field: "name" as SearchField, from: "", to: "", status: "전체", anomaly: "전체" });
  const [book, setBook] = useState<Participant | null>(null);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  };
  const toggleMenu = (label: string) => setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));
  const goChild = (child: string) => goStampTourChild(child, act);

  const filtered = useMemo(() => {
    const result = participants.filter((row) => {
      if (tour !== "전체" && String(row.tourId) !== tour) return false;
      const joined = joinedKey(row.joined);
      const text = applied.field === "number" ? row.number : applied.field === "phone" ? row.phone : row.name;
      return (
        (!applied.keyword || text.replaceAll("-", "").includes(applied.keyword.replaceAll("-", ""))) &&
        (!applied.from || joined >= applied.from) &&
        (!applied.to || joined <= applied.to) &&
        (applied.status === "전체" || row.status === applied.status) &&
        (applied.anomaly === "전체" || (applied.anomaly === "이상" ? row.anomaly : !row.anomaly))
      );
    });
    return [...result].sort((a, b) =>
      sort === "진행률 높은순" ? b.rate - a.rate : sort === "이름순" ? a.name.localeCompare(b.name, "ko") : sort === "최초 참여순" ? a.joined.localeCompare(b.joined) : b.joined.localeCompare(a.joined),
    );
  }, [applied, sort, tour]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const scoped = participants.filter((row) => tour === "전체" || String(row.tourId) === tour);
  const totalParticipants = tour === "전체" ? mockStatsSummary.participants : scoped.length;
  const summary = [
    ["전체참여자", `${totalParticipants}명`, "blue"],
    ["오늘참여", `${scoped.filter((row) => joinedKey(row.joined) === "2026-11-16").length}건`, "ink"],
    ["진행중", `${scoped.filter((row) => row.status === "진행중").length}건`, "orange"],
    ["완주", `${scoped.filter((row) => row.status === "완주").length}건`, "green"],
    ["경품신청", `${scoped.filter((row) => row.reward === "신청완료").length}건`, "amber"],
    ["이상탐지", `${scoped.filter((row) => row.anomaly).length}건`, "red"],
  ] as const;

  const search = () => {
    setApplied({ keyword: keyword.trim(), field: searchField, from, to, status, anomaly });
    setPage(1);
    act("검색 조건을 적용했습니다.");
  };
  const downloadExcel = () => {
    const header = ["참여번호", "참여자명", "참여 투어", "휴대전화번호", "최초참여일", "최근 인증일", "인증 관광지", "진행률", "참여상태", "완주일", "경품상태", "이상 여부"];
    const rows = filtered.map((row) => [row.number, row.name, row.tourName, row.phone, row.joined, row.recent, `${row.spots} / ${row.spotTotal}곳`, `${row.rate}%`, row.status, row.completed, row.reward, row.anomaly ? "이상" : "정상"]);
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "스탬프투어-참여자이력.csv";
    link.click();
    URL.revokeObjectURL(url);
    act("참여자 이력 엑셀 파일을 다운로드했습니다.");
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
              <button className={`nav-item ${item.label === "스탬프투어 관리" ? "active" : ""}`} onClick={() => (item.label === "대시보드" ? window.location.assign("/") : item.children ? toggleMenu(item.label) : act(`${item.label} 화면으로 이동합니다.`))}>
                <span className="nav-icon">{item.icon === "qr" ? <QrCode size={16} strokeWidth={1.8} /> : item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.children && <span className={`chevron ${expanded.includes(item.label) ? "open" : ""}`}>⌄</span>}
              </button>
              {item.children && expanded.includes(item.label) && !collapsed && (
                <div className="subnav">
                  {item.children.map((child) => (
                    <button key={child} className={child === "참여자·진행현황" ? "current" : ""} onClick={() => goChild(child)}>
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
            <strong>참여자·진행현황</strong>
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
              <button className="icon-btn notice" aria-label="알림" onClick={() => { setNoticeOpen(!noticeOpen); setProfileOpen(false); }}>
                ♢<i>5</i>
              </button>
              {noticeOpen && (
                <div className="dropdown notice-menu">
                  <div className="drop-head">
                    <strong>알림</strong>
                    <button onClick={() => setNoticeOpen(false)}>모두 읽음</button>
                  </div>
                  <button>
                    <span className="alert-dot warn" />
                    <span>
                      확인이 필요한 이상 인증이 있습니다.<small>방금 전</small>
                    </span>
                  </button>
                </div>
              )}
            </div>
            <div className="divider" />
            <div className="dropdown-wrap">
              <button className="profile" onClick={() => { setProfileOpen(!profileOpen); setNoticeOpen(false); }}>
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

        <main className="content participant-content">
          <section className="page-head participant-page-head">
            <div>
              <h1>참여자·진행현황</h1>
              <p>참여자별 관광지 인증 진행률과 완주·경품 신청 상태를 한눈에 확인합니다.</p>
            </div>
            <div className="participant-head-actions">
              <label>
                <span>스탬프투어 선택</span>
                <select value={tour} onChange={(event) => { setTour(event.target.value); setPage(1); act(`${event.target.value === "전체" ? "전체 투어" : getTourById(event.target.value)?.name} 참여자 현황을 불러왔습니다.`); }}>
                  <option value="전체">전체 투어</option>
                  {mockTours.map((row) => (
                    <option key={row.id} value={String(row.id)}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="excel-button" onClick={downloadExcel}>
                <Download size={14} />
                엑셀 다운로드
              </button>
            </div>
          </section>

          <section className="pp-summary">
            {summary.map(([label, value, tone]) => (
              <div className="pp-kpi" key={label}>
                <span>{label}</span>
                <strong className={tone}>{value}</strong>
              </div>
            ))}
          </section>

          <section className="pp-toolbar">
            <select aria-label="페이지 표시 개수" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <select aria-label="정렬" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
              <option>최근 참여순</option>
              <option>최초 참여순</option>
              <option>진행률 높은순</option>
              <option>이름순</option>
            </select>
            <label className="pp-dates">
              <input aria-label="참여 시작일" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              <em>-</em>
              <input aria-label="참여 종료일" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
            <select aria-label="참여상태" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="전체">참여상태 전체</option>
              <option>진행중</option>
              <option>완주</option>
            </select>
            <select aria-label="이상 여부" value={anomaly} onChange={(event) => setAnomaly(event.target.value)}>
              <option value="전체">이상 여부 전체</option>
              <option>정상</option>
              <option>이상</option>
            </select>
            <select aria-label="검색 대상" value={searchField} onChange={(event) => setSearchField(event.target.value as SearchField)}>
              <option value="name">참여자명</option>
              <option value="number">참여번호</option>
              <option value="phone">휴대전화번호</option>
            </select>
            <input aria-label="검색어" value={keyword} placeholder="검색어를 입력하세요" onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && search()} />
            <button type="button" className="pp-search" onClick={search}>
              <Search size={14} />
              검색
            </button>
          </section>

          <section className="pp-panel">
            <header>
              <div>
                <strong>참여자 이력 <b>{filtered.length}건</b></strong>
                <span>{sort}</span>
              </div>
              <div className="pp-legend">
                <i className="ok" />
                완주/정상
                <i className="ing" />
                진행중
                <i className="bad" />
                이상
              </div>
            </header>
            <div className="pp-table-wrap">
              <table className="pp-table">
                <thead>
                  <tr>
                    {["NO.", "참여번호", "참여자명", "참여 투어", "휴대전화번호", "최초참여일", "최근 인증일", "인증 관광지", "진행률", "참여상태", "완주일", "경품상태", "이상 여부"].map((title) => (
                      <th key={title}>{title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.length ? (
                    visible.map((row, index) => (
                      <tr key={row.id}>
                        <td>{(currentPage - 1) * pageSize + index + 1}</td>
                        <td>
                          <button type="button" className="pp-number" onClick={() => setBook(row)}>
                            {row.number}
                          </button>
                        </td>
                        <td className="pp-name">{row.name}</td>
                        <td>{row.tourName}</td>
                        <td>{row.phone}</td>
                        <td>{row.joined}</td>
                        <td>{row.recent}</td>
                        <td>
                          {row.spots} / {row.spotTotal}곳
                        </td>
                        <td>
                          <div className="pp-rate">
                            <b>{row.rate}%</b>
                            <small>
                              {row.rateCurrent}/{row.rateTotal}
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className={`pp-status ${row.status === "완주" ? "done" : "ing"}`}>{row.status}</span>
                        </td>
                        <td>{row.completed}</td>
                        <td>{row.reward === "-" ? <span className="pp-dash">-</span> : <span className="pp-reward">{row.reward}</span>}</td>
                        <td>
                          {row.anomaly ? (
                            <button type="button" className="pp-anomaly" onClick={() => act(`${row.name} 이상 인증을 확인합니다.`)}>
                              <AlertTriangle size={13} />
                              이상
                            </button>
                          ) : (
                            <span className="pp-normal">정상</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} className="pp-empty">
                        검색 조건에 맞는 참여자가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pp-pager">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(1)}>
                처음
              </button>
              <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button key={pageNumber} type="button" className={currentPage === pageNumber ? "active" : ""} onClick={() => setPage(pageNumber)}>
                  {pageNumber}
                </button>
              ))}
            </div>
          </section>
          <footer>© 2026 AOS Travel ERP · AviaNext</footer>
        </main>
      </div>
      {book && <StampBookModal row={book} onClose={() => setBook(null)} onComplete={() => act("경품 선택을 완료했습니다.")} />}
      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
