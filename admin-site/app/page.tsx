"use client";

import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";

const menu = [
  { icon: "▦", label: "대시보드" },
  { icon: "◇", label: "상품관리", children: ["상품목록", "상품등록", "일정표관리", "요금관리"] },
  { icon: "▤", label: "예약관리", children: ["예약접수현황", "예약달력"] },
  { icon: "₩", label: "결제관리", children: ["결제현황", "취소/환불"] },
  { icon: "⇄", label: "정산관리", children: ["정산현황", "판매점정산", "공급사정산"] },
  { icon: "♙", label: "회원관리", children: ["웹회원", "관리자/직원", "그룹/권한"] },
  { icon: "▣", label: "판매점관리" },
  { icon: "⌂", label: "거래처관리" },
  { icon: "qr", label: "스탬프투어 관리", children: ["스탬프투어 목록", "관광지 관리", "참여자·진행현황", "인증 이력", "완주·경품 관리", "통계"] },
  { icon: "▥", label: "통계관리" },
  { icon: "◎", label: "운영관리", children: ["팝업관리", "알림관리", "알림톡"] },
  { icon: "⚙", label: "시스템설정", children: ["홈페이지설정", "결제설정", "기본설정"] },
];

const kpis = [
  { title: "오늘 신규예약", value: "18건", note: "전일 대비 12.5%", trend: "up", icon: "▤" },
  { title: "오늘 결제금액", value: "12,850,000원", note: "전일 대비 8.2%", trend: "up", icon: "₩" },
  { title: "미수금", value: "3,420,000원", note: "결제기한 임박 4건", trend: "warn", icon: "!" },
  { title: "오늘 출발", value: "5상품 · 86명", note: "출발확정 4 · 모객중 1", trend: "info", icon: "✈" },
  { title: "예약 취소요청", value: "3건", note: "24시간 경과 1건", trend: "danger", icon: "×" },
  { title: "정산 대기", value: "12건", note: "이번 주 7건 마감", trend: "warn", icon: "⇄" },
];

const departures = [
  { time:"09:00", code:"PDT-TRV-2026-031", product:"다낭·호이안·바나힐 5일", duration:"3박 5일", people:"18명", mix:"대15 / 소3 / 유0", seats:"2석", paid:"14건", unpaid:"2건", amount:"680,000원", manager:"샘플 사용자", status:"출발확정" },
  { time:"10:30", code:"PDT-TRV-2026-042", product:"백두산·연길·용정 5일", duration:"4박 5일", people:"24명", mix:"대21 / 소3 / 유0", seats:"마감", paid:"19건", unpaid:"0건", amount:"-", manager:"이서준", status:"출발확정" },
  { time:"13:20", code:"PDT-TRV-2026-058", product:"울란바토르·테를지 5일", duration:"4박 5일", people:"16명", mix:"대14 / 소2 / 유0", seats:"3석", paid:"12건", unpaid:"1건", amount:"420,000원", manager:"박소연", status:"모객중" },
  { time:"18:45", code:"PDT-TRV-2026-017", product:"오사카·교토·고베 4일", duration:"3박 4일", people:"28명", mix:"대25 / 소2 / 유1", seats:"마감", paid:"23건", unpaid:"0건", amount:"-", manager:"정민수", status:"마감" },
];

const reservations = [
  ["R260810-018", "16:42", "다낭·호이안·바나힐 5일", "08.24", "김민지", "3명", "3,270,000원", "-", "예약확정", "결제완료", "본사 홈페이지"],
  ["R260810-017", "16:18", "몽골 대초원·테를지 5일", "08.13", "이영수", "2명", "2,180,000원", "680,000원", "예약확정", "부분결제", "고양여행클럽"],
  ["R260810-016", "15:55", "장가계·천문산 6일", "08.20", "박은주", "4명", "4,760,000원", "4,760,000원", "예약접수", "미결제", "관리자 직접등록"],
  ["R260810-015", "14:31", "홋카이도 여름 4일", "08.18", "최성호", "2명", "2,980,000원", "-", "예약확정", "결제완료", "행복투어 일산점"],
  ["R260810-014", "13:08", "대만 핵심일주 4일", "08.27", "윤서현", "3명", "2,490,000원", "990,000원", "대기", "부분결제", "본사 홈페이지"],
  ["R260810-013", "11:46", "오사카·교토·고베 4일", "08.10", "강지훈", "1명", "1,150,000원", "-", "취소요청", "환불진행", "투어파트너"],
];

const receivables = [
  ["R260807-084", "이영수", "몽골 대초원·테를지 5일", "08.13", "2,180,000", "1,500,000", "680,000", "오늘"],
  ["R260806-072", "오정희", "다낭·호이안·바나힐 5일", "08.12", "3,270,000", "2,000,000", "1,270,000", "D-1"],
  ["R260808-105", "한승민", "백두산·연길·용정 5일", "08.16", "2,380,000", "1,900,000", "480,000", "D-2"],
  ["R260805-061", "윤서현", "대만 핵심일주 4일", "08.27", "2,490,000", "1,500,000", "990,000", "08.15"],
];

const alerts = [
  ["긴급", "오늘 출발 상품 중 미수금 예약 2건이 있습니다.", "danger"],
  ["주의", "여권정보 미등록 고객 5명이 있습니다.", "warn"],
  ["좌석", "몽골 5일 상품의 잔여좌석이 3석입니다.", "info"],
  ["정산", "판매점 정산 12건이 승인 대기 중입니다.", "info"],
  ["예약", "취소요청 3건이 아직 처리되지 않았습니다.", "gray"],
];

const sales = {
  오늘: [34, 42, 38, 51, 58, 63, 76],
  "최근 7일": [48, 56, 43, 68, 61, 82, 74],
  "최근 30일": [52, 64, 58, 72, 69, 86, 78],
  "이번 달": [45, 58, 70, 62, 82, 76, 91],
};

const todayTasks = [["취소 승인","3건","danger"],["미수금 확인","4건","warn"],["여권 미등록","5건","info"],["정산 승인","12건","purple"]];

function badge(value: string) {
  const cls = value.includes("완료") || value.includes("확정") ? "success" : value.includes("취소") || value.includes("미결제") || value === "마감" ? "danger" : value.includes("부분") || value.includes("대기") || value.includes("모객") || value.includes("접수") ? "warn" : "info";
  return <span className={`badge ${cls}`}>{value}</span>;
}

export default function Home() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["상품관리", "예약관리"]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [period, setPeriod] = useState<keyof typeof sales>("최근 7일");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const initialTime = new Date();
    setNow(initialTime);
    setLastUpdated(initialTime);
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const todayLabel = now ? new Intl.DateTimeFormat("ko-KR", { year:"numeric", month:"long", day:"numeric", weekday:"long" }).format(now) : "오늘";
  const updatedLabel = lastUpdated ? new Intl.DateTimeFormat("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false }).format(lastUpdated) : "-";

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };
  const toggleMenu = (label: string) => setExpanded((v) => v.includes(label) ? v.filter((x) => x !== label) : [...v, label]);

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">A</div><div className="brand-copy"><strong>AOS</strong><span>TRAVEL ERP</span></div><button className="collapse" onClick={() => setCollapsed(!collapsed)} aria-label="사이드바 접기">‹</button></div>
        <nav aria-label="관리자 메뉴">
          {menu.map((item) => <div className="nav-group" key={item.label}>
            <button className={`nav-item ${item.label === "대시보드" ? "active" : ""}`} onClick={() => item.children ? toggleMenu(item.label) : act(`${item.label} 화면으로 이동합니다.`)}>
              <span className="nav-icon">{item.icon === "qr" ? <QrCode size={16} strokeWidth={1.8}/> : item.icon}</span><span className="nav-label">{item.label}</span>{item.children && <span className={`chevron ${expanded.includes(item.label) ? "open" : ""}`}>⌄</span>}
            </button>
            {item.children && expanded.includes(item.label) && !collapsed && <div className="subnav">{item.children.map((child) => <button key={child} data-planned-path={item.label === "스탬프투어 관리" ? `/stamp-tours/${({"관광지 관리":"attractions","참여자·진행현황":"participants","인증 이력":"verifications","완주·경품 관리":"rewards","통계":"statistics"} as Record<string,string>)[child] || ""}` : undefined} onClick={() => child === "상품목록" ? window.location.assign("/products") : child === "스탬프투어 목록" ? window.location.assign("/stamp-tours") : child === "관광지 관리" ? window.location.assign("/stamp-tours/attractions") : child === "참여자·진행현황" ? window.location.assign("/stamp-tours/participants") : child === "인증 이력" ? window.location.assign("/stamp-tours/verifications") : child === "완주·경품 관리" ? window.location.assign("/stamp-tours/rewards") : child === "통계" ? window.location.assign("/stamp-tours/statistics") : act(`${child} 화면은 다음 단계에서 제공될 예정입니다.`)}>{child}</button>)}</div>}
          </div>)}
        </nav>
        <div className="sidebar-help"><span className="nav-icon">?</span><div><strong>업무지원센터</strong><p>평일 09:00–18:00</p></div></div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><span>홈</span><b>/</b><strong>대시보드</strong></div>
          <div className="top-actions">
            <label className="search"><span>⌕</span><input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색"/><kbd>⌘ K</kbd></label>
            <button className="icon-btn" title="업무지원" onClick={() => act("업무지원센터를 엽니다.")}>?</button>
            <div className="dropdown-wrap"><button className="icon-btn notice" aria-label="알림" onClick={() => {setNoticeOpen(!noticeOpen); setProfileOpen(false)}}>♢<i>5</i></button>{noticeOpen && <div className="dropdown notice-menu"><div className="drop-head"><strong>알림</strong><button onClick={() => setNoticeOpen(false)}>모두 읽음</button></div>{alerts.slice(0,3).map((a) => <button key={a[1]}><span className={`alert-dot ${a[2]}`}></span><span>{a[1]}<small>방금 전</small></span></button>)}<button className="drop-footer">알림 전체보기</button></div>}</div>
            <div className="divider" />
            <div className="dropdown-wrap"><button className="profile" onClick={() => {setProfileOpen(!profileOpen); setNoticeOpen(false)}}><span className="avatar">장</span><span><b>애비아넥스트</b><small>관리자 장윤호</small></span><em>⌄</em></button>{profileOpen && <div className="dropdown profile-menu"><button>내 정보</button><button>환경설정</button><hr/><button className="logout">로그아웃</button></div>}</div>
          </div>
        </header>

        <main className="content">
          <section className="page-head"><div><h1>대시보드</h1><p>오늘의 예약과 출발, 결제 및 주요 업무를 확인하세요.</p></div><div className="date-actions"><span>{todayLabel}</span><button className="secondary" onClick={() => {const refreshedAt = new Date();setNow(refreshedAt);setLastUpdated(refreshedAt);act("최신 데이터로 새로고침했습니다.")}}>↻ 새로고침</button></div></section>

          <section className="kpi-grid">{kpis.map((k) => <button className="kpi" key={k.title} onClick={() => act(`${k.title} 상세 현황을 엽니다.`)}><span className={`kpi-icon ${k.trend}`}>{k.icon}</span><span className="kpi-copy"><small>{k.title}</small><strong>{k.value}</strong><em className={k.trend}>{k.trend === "up" ? "↑ " : ""}{k.note}</em></span><b>›</b></button>)}</section>

          <section className="quick-actions" aria-label="빠른 업무 메뉴"><strong>빠른 업무</strong>{[["＋","신규 상품 등록"],["＋","예약 등록"],["⌕","고객 검색"],["₩","요금 설정"],["▦","예약달력"],["▤","정산서 확인"]].map(([i,l]) => <button key={l} onClick={() => setModal(l)}><span>{i}</span>{l}</button>)}</section>

          <section className="panel departure-panel"><div className="panel-head"><div><h2>오늘의 출발상품 <span className="count">4</span></h2><p>상품별 출발 준비와 결제 문제를 한눈에 확인하세요.</p></div><button className="text-btn" onClick={() => act("전체 출발 현황으로 이동합니다.")}>전체 출발현황 보기 →</button></div><div className="table-wrap"><table><thead><tr>{["출발","상품명 / 상품코드","여행기간","예약인원","인원구성","잔여좌석","결제 현황","미수 현황","담당자","출발상태"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{departures.map((r)=><tr key={r.code}><td className="time">{r.time}</td><td><a className="product-link" onClick={() => act(`${r.product} · 오늘 출발 예약현황을 엽니다.`)}>{r.product}<span>예약현황 ›</span></a><small className="code">{r.code}</small></td><td>{r.duration}</td><td><b>{r.people}</b></td><td>{r.mix}</td><td className={r.seats === "마감" ? "muted" : "seat-low"}>{r.seats}</td><td><span className="payment-stack"><small>결제</small><b>완료 {r.paid}</b></span></td><td><span className={`payment-stack ${r.amount !== "-" ? "has-due" : ""}`}><small>미수</small><b>{r.unpaid}</b><small>{r.amount === "-" ? "미수 없음" : r.amount}</small></span></td><td>{r.manager}</td><td>{badge(r.status)}</td></tr>)}</tbody></table></div></section>

          <div className="grid-main">
            <section className="panel chart-panel"><div className="panel-head"><div><h2>매출 및 결제현황</h2><p>기간별 예약·결제 흐름</p></div><div className="segmented">{Object.keys(sales).map((p)=><button key={p} className={period===p?"active":""} onClick={()=>setPeriod(p as keyof typeof sales)}>{p}</button>)}</div></div><div className="chart-summary"><div><small>예약금액</small><b>45,280,000원</b><em>↑ 12.4%</em></div><div><small>결제금액</small><b>38,960,000원</b><em>↑ 8.7%</em></div><div><small>미수금</small><b>6,320,000원</b><em className="down">↓ 3.1%</em></div></div><div className="bar-chart" aria-label={`${period} 매출 차트`}>{sales[period].map((v,i)=><div className="bar-day" key={i}><div className="bars"><i style={{height:`${v}%`}}></i><b style={{height:`${Math.max(22,v-16)}%`}}></b></div><span>{["8/4","8/5","8/6","8/7","8/8","8/9","8/10"][i]}</span></div>)}</div><div className="legend"><span><i className="blue"></i>예약금액</span><span><i className="sky"></i>결제금액</span></div></section>
            <section className="panel status-panel"><div className="panel-head"><div><h2>예약 상태 요약</h2><p>전체 예약 324건</p></div><button className="more" aria-label="더보기">•••</button></div><div className="status-body"><div className="donut"><div><b>324</b><span>전체예약</span></div></div><div className="status-list">{[["예약확정","241","74.4%","success"],["예약접수","28","8.6%","info"],["대기","18","5.6%","warn"],["취소요청","7","2.2%","danger"],["취소완료","30","9.2%","gray"]].map(x=><button key={x[0]} onClick={()=>act(`${x[0]} 예약을 조회합니다.`)}><i className={x[3]}></i><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]}</small></button>)}</div></div></section>
          </div>

          <section className="panel recent-panel"><div className="panel-head"><div><h2>최근 예약</h2><p>오늘 접수된 최신 예약입니다.</p></div><button className="text-btn" onClick={()=>act("전체 예약으로 이동합니다.")}>전체 예약 보기 →</button></div><div className="table-wrap"><table><thead><tr>{["예약번호 / 일시","상품명","출발일","예약자","인원","총 결제금액","미수금","예약상태","결제상태","판매채널 / 판매점"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{reservations.map(r=><tr key={r[0]} onClick={()=>act(`${r[0]} 예약 상세를 엽니다.`)}><td><a>{r[0]}</a><small className="subtext">오늘 {r[1]}</small></td><td className="product-cell">{r[2]}</td><td>{r[3]}</td><td><b>{r[4]}</b></td><td>{r[5]}</td><td className="money">{r[6]}</td><td className={r[7]!=="-"?"money-danger":"muted"}>{r[7]}</td><td>{badge(r[8])}</td><td>{badge(r[9])}</td><td>{r[10]}</td></tr>)}</tbody></table></div><div className="table-footer"><span>총 18건 중 6건 표시</span><div className="pagination"><button disabled>‹</button><button className="active">1</button><button>2</button><button>3</button><button>›</button></div></div></section>

          <div className="work-grid">
            <section className="panel task-panel"><div className="panel-head"><div><h2>오늘 처리할 업무</h2><p>오늘 우선 확인이 필요한 실무 항목</p></div><div className="task-total"><small>총 처리업무</small><b>24건</b></div></div><div className="task-list">{todayTasks.map(t=><button key={t[0]} onClick={()=>act(`${t[0]} 관리 화면으로 이동합니다.`)}><i className={t[2]}></i><span>{t[0]}</span><b>{t[1]}</b><em>›</em></button>)}</div></section>
            <section className="panel alerts-panel"><div className="panel-head"><div><h2>업무 알림</h2><p>확인이 필요한 주요 업무</p></div><button className="text-btn" onClick={()=>act("모든 알림을 확인했습니다.")}>모두 확인</button></div><div className="alert-summary"><span className="danger">긴급 <b>2</b></span><span className="warn">주의 <b>5</b></span><span className="purple">처리필요 <b>12</b></span></div><div className="alert-list">{alerts.map(a=><button key={a[1]} onClick={()=>act("관련 관리 화면으로 이동합니다.")}><span className={`alert-tag ${a[2]}`}>{a[0]}</span><p>{a[1]}</p><em>›</em></button>)}</div></section>
          </div>

          <div className="grid-main lower">
            <section className="panel schedule-panel"><div className="panel-head"><div><h2>출발 예정 일정</h2><p>향후 7일 내 출발상품</p></div><button className="text-btn" onClick={()=>act("예약달력으로 이동합니다.")}>예약달력 보기 →</button></div><div className="timeline">{[["08.11","화","장가계·천문산 6일","24명","출발확정"],["08.12","수","다낭·호이안·바나힐 5일","21명","출발확정"],["08.13","목","몽골 대초원·테를지 5일","16명","모객중"],["08.13","목","오사카·교토·고베 4일","28명","마감"]].map((x,i)=><button key={i} onClick={()=>act(`${x[2]} 일정을 엽니다.`)}><span className="date-box"><b>{x[0]}</b><small>{x[1]}</small></span><i></i><span className="schedule-name"><b>{x[2]}</b><small>예약 {x[3]} · 인천 출발</small></span>{badge(x[4])}<em>›</em></button>)}</div></section>
            <section className="panel schedule-panel"><div className="panel-head"><div><h2>출발 현황 요약</h2><p>향후 7일 기준</p></div></div><div className="departure-summary">{[["출발예정","18상품","info"],["출발확정","14상품","success"],["모객중","3상품","warn"],["미수금 보유","4예약","danger"]].map(x=><button key={x[0]} onClick={()=>act(`${x[0]} 현황을 엽니다.`)}><i className={x[2]}></i><span>{x[0]}</span><b>{x[1]}</b><em>›</em></button>)}</div></section>
          </div>

          <section className="panel receivable-panel"><div className="panel-head"><div><h2>미수금 확인 <span className="count danger-count">4</span></h2><p>출발일과 결제기한이 가까운 예약을 우선 확인하세요.</p></div><button className="text-btn" onClick={()=>act("미수금 전체 현황으로 이동합니다.")}>미수금 전체보기 →</button></div><div className="table-wrap"><table><thead><tr>{["예약번호","예약자","상품명","출발일","총금액","결제금액","미수금","결제기한","출발임박","관리"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{receivables.map((r,i)=><tr key={r[0]}><td><a onClick={()=>act(`${r[0]} 예약 상세를 엽니다.`)}>{r[0]}</a></td><td><b>{r[1]}</b></td><td><a className="table-product-link" onClick={()=>act(`${r[2]} 출발일 예약현황을 엽니다.`)}>{r[2]}</a></td><td>{r[3]}</td><td className="money">{r[4]}원</td><td className="money">{r[5]}원</td><td className="money-danger"><b>{r[6]}원</b></td><td><span className={`due ${i===0?"today":i===1?"overdue":""}`}>{i===0?"오늘까지":i===1?"결제기한 초과":r[7]}</span></td><td><span className={`due departure-due ${i<3?"urgent":""}`}>{i===0?"D-2":i===1?"D-1":i===2?"출발임박":"D-17"}</span></td><td><button className="small-btn" onClick={()=>act(`${r[0]} 결제 등록을 엽니다.`)}>결제등록</button></td></tr>)}</tbody></table></div></section>

          <div className="grid-main bottom">
            <section className="panel channel-panel"><div className="panel-head"><div><h2>판매채널 현황</h2><p>이번 달 예약 비중</p></div></div><div className="channel-bar">{[[48,"direct"],[32,"agency"],[15,"admin"],[5,"etc"]].map(x=><i key={x[1]} className={String(x[1])} style={{width:`${x[0]}%`}}></i>)}</div><div className="channel-list">{[["본사 홈페이지","48%","156건","direct"],["판매점","32%","104건","agency"],["관리자 직접등록","15%","49건","admin"],["기타","5%","15건","etc"]].map(x=><div key={x[0]}><i className={x[3]}></i><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]}</small></div>)}</div></section>
            <section className="panel agency-panel"><div className="panel-head"><div><h2>판매점 TOP 5</h2><p>이번 달 판매 실적</p></div><button className="text-btn" onClick={()=>act("판매점 실적으로 이동합니다.")}>전체보기 →</button></div><div className="mini-table"><div className="mini-head"><span>판매점명</span><span>예약</span><span>인원</span><span>판매금액</span><span>정산예정액</span></div>{[["행복투어 일산점","28건","62명","78,450,000","7,845,000"],["고양여행클럽","22건","51명","62,180,000","6,218,000"],["투어파트너","19건","43명","51,920,000","5,192,000"],["하나로여행","16건","38명","45,360,000","4,536,000"],["좋은여행사","13건","29명","34,780,000","3,478,000"]].map((x,i)=><button key={x[0]} onClick={()=>act(`${x[0]} 실적을 조회합니다.`)}><strong><em>{i+1}</em>{x[0]}</strong>{x.slice(1).map((y,j)=><span key={j}>{y}{j>1?"원":""}</span>)}</button>)}</div></section>
          </div>
          <footer>최근 업데이트 {updatedLabel} · AOS Travel ERP v1.0</footer>
        </main>
      </div>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {modal && <div className="modal-backdrop" onMouseDown={()=>setModal("")}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h3>{modal}</h3><button onClick={()=>setModal("")}>×</button></div><p><b>{modal}</b> 업무 화면으로 이동할까요?</p><div className="form-preview"><label>빠른 검색<input placeholder="검색어를 입력하세요" /></label><label>기준일<input type="date" defaultValue={now ? now.toISOString().slice(0,10) : undefined} /></label></div><div className="modal-actions"><button className="secondary" onClick={()=>setModal("")}>취소</button><button className="primary" onClick={()=>{setModal("");act(`${modal} 화면으로 이동합니다.`)}}>이동하기</button></div></div></div>}
    </div>
  );
}
