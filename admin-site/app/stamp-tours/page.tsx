"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Copy, Plus, QrCode, RotateCcw, Search, Trash2, Users, Trophy, CirclePlay, Clock3, CircleStop } from "lucide-react";

const menu = [
  { icon: "▦", label: "대시보드" },
  { icon: "◇", label: "상품관리", children: ["상품목록", "상품등록", "일정표관리", "요금관리"] },
  { icon: "▤", label: "예약관리", children: ["예약접수현황", "예약달력"] },
  { icon: "₩", label: "결제관리", children: ["결제현황", "취소/환불"] },
  { icon: "⇄", label: "정산관리", children: ["정산현황", "판매점정산", "공급사정산"] },
  { icon: "♙", label: "회원관리", children: ["웹회원", "관리자/직원", "그룹/권한"] },
  { icon: "▣", label: "판매점관리" }, { icon: "⌂", label: "거래처관리" },
  { icon: "qr", label: "스탬프투어 관리", children: ["스탬프투어 목록", "관광지 관리", "참여자·진행현황", "인증 이력", "완주·경품 관리", "통계"] },
  { icon: "▥", label: "통계관리" },
  { icon: "◎", label: "운영관리", children: ["팝업관리", "알림관리", "알림톡"] },
  { icon: "⚙", label: "시스템설정", children: ["홈페이지설정", "결제설정", "기본설정"] },
];

const initialTours = [
  { id:1, name:"철원 DMZ 평화관광 스탬프투어", region:"강원 철원군", start:"2026-07-01", end:"2026-10-31", spots:8, condition:"8곳 중 5곳 인증", participants:1248, finishers:386, status:"운영 중", visible:true, created:"2026-06-18" },
  { id:2, name:"양평 자연휴양 산책 스탬프투어", region:"경기 양평군", start:"2026-09-01", end:"2026-11-30", spots:10, condition:"10곳 중 7곳 인증", participants:0, finishers:0, status:"운영 예정", visible:true, created:"2026-08-12" },
  { id:3, name:"고양 역사문화길 스탬프투어", region:"경기 고양시", start:"2026-05-15", end:"2026-09-30", spots:6, condition:"전체 관광지 인증", participants:842, finishers:274, status:"운영 중", visible:true, created:"2026-05-02" },
  { id:4, name:"인천 개항장 시간여행 스탬프투어", region:"인천 중구", start:"2026-03-01", end:"2026-08-15", spots:7, condition:"7곳 중 5곳 인증", participants:1560, finishers:621, status:"운영 종료", visible:false, created:"2026-02-14" },
  { id:5, name:"파주 평화누리 관광 스탬프투어", region:"경기 파주시", start:"2026-08-01", end:"2026-12-20", spots:9, condition:"9곳 중 6곳 인증", participants:397, finishers:81, status:"일시중지", visible:false, created:"2026-07-21" },
  { id:6, name:"춘천 호수길 낭만 스탬프투어", region:"강원 춘천시", start:"2026-04-10", end:"2026-10-10", spots:8, condition:"8곳 중 6곳 인증", participants:963, finishers:305, status:"운영 중", visible:true, created:"2026-03-28" },
  { id:7, name:"수원 화성 성곽길 스탬프투어", region:"경기 수원시", start:"2026-10-01", end:"2027-02-28", spots:12, condition:"12곳 중 8곳 인증", participants:0, finishers:0, status:"운영 예정", visible:false, created:"2026-08-17" },
];

const statusClass = (status:string) => status === "운영 중" ? "success" : status === "운영 예정" ? "info" : status === "일시중지" ? "warn" : "gray";
const fmt = (n:number) => n.toLocaleString("ko-KR");

export default function StampTourListPage() {
  const [collapsed,setCollapsed] = useState(false);
  const [expanded,setExpanded] = useState(["스탬프투어 관리"]);
  const [toast,setToast] = useState("");
  const [query,setQuery] = useState(""); const [draftQuery,setDraftQuery] = useState("");
  const [status,setStatus] = useState("전체"); const [draftStatus,setDraftStatus] = useState("전체");
  const [visibility,setVisibility] = useState("전체"); const [draftVisibility,setDraftVisibility] = useState("전체");
  const [startDate,setStartDate] = useState(""); const [endDate,setEndDate] = useState("");
  const [appliedStart,setAppliedStart] = useState(""); const [appliedEnd,setAppliedEnd] = useState("");
  const [page,setPage] = useState(1); const [visibleMap,setVisibleMap] = useState(Object.fromEntries(initialTours.map(t=>[t.id,t.visible])));
  const [profileOpen,setProfileOpen] = useState(false); const [noticeOpen,setNoticeOpen] = useState(false);
  const pageSize = 5;
  const act=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),2200)};
  const filtered=useMemo(()=>initialTours.filter(t=>{
    const matchesQuery=!query||t.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus=status==="전체"||t.status===status;
    const matchesVisibility=visibility==="전체"||(visibility==="공개"?visibleMap[t.id]:!visibleMap[t.id]);
    const matchesDate=(!appliedStart||t.end>=appliedStart)&&(!appliedEnd||t.start<=appliedEnd);
    return matchesQuery&&matchesStatus&&matchesVisibility&&matchesDate;
  }),[query,status,visibility,appliedStart,appliedEnd,visibleMap]);
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const rows=filtered.slice((page-1)*pageSize,page*pageSize);
  const search=()=>{setQuery(draftQuery.trim());setStatus(draftStatus);setVisibility(draftVisibility);setAppliedStart(startDate);setAppliedEnd(endDate);setPage(1);act("검색 조건을 적용했습니다.")};
  const reset=()=>{setDraftQuery("");setQuery("");setDraftStatus("전체");setStatus("전체");setDraftVisibility("전체");setVisibility("전체");setStartDate("");setEndDate("");setAppliedStart("");setAppliedEnd("");setPage(1);act("검색 조건을 초기화했습니다.")};
  const toggleMenu=(label:string)=>setExpanded(v=>v.includes(label)?v.filter(x=>x!==label):[...v,label]);
  const goChild=(group:string,child:string)=>{if(child==="상품목록")window.location.assign("/products");else if(child==="스탬프투어 목록")window.location.assign("/stamp-tours");else if(child==="관광지 관리")window.location.assign("/stamp-tours/attractions");else if(child==="참여자·진행현황")window.location.assign("/stamp-tours/participants");else if(child==="인증 이력")window.location.assign("/stamp-tours/verifications");else if(child==="완주·경품 관리")window.location.assign("/stamp-tours/rewards");else if(child==="통계")window.location.assign("/stamp-tours/statistics");else act(`${child} 화면은 다음 단계에서 제공될 예정입니다.`)};

  const totalParticipants=initialTours.reduce((s,t)=>s+t.participants,0), totalFinishers=initialTours.reduce((s,t)=>s+t.finishers,0);
  const kpis=[
    ["전체 투어",`${initialTours.length}개`,QrCode,"blue"], ["운영 중",`${initialTours.filter(t=>t.status==="운영 중").length}개`,CirclePlay,"green"],
    ["운영 예정",`${initialTours.filter(t=>t.status==="운영 예정").length}개`,Clock3,"indigo"], ["종료",`${initialTours.filter(t=>t.status==="운영 종료").length}개`,CircleStop,"slate"],
    ["전체 참여자",`${fmt(totalParticipants)}명`,Users,"purple"], ["전체 완주자",`${fmt(totalFinishers)}명`,Trophy,"amber"],
  ] as const;

  return <div className={`app-shell ${collapsed?"is-collapsed":""}`}>
    <aside className="sidebar"><div className="brand"><div className="brand-mark">A</div><div className="brand-copy"><strong>AOS</strong><span>TRAVEL ERP</span></div><button className="collapse" onClick={()=>setCollapsed(!collapsed)} aria-label="사이드바 접기">‹</button></div>
      <nav aria-label="관리자 메뉴">{menu.map(item=><div className="nav-group" key={item.label}><button className={`nav-item ${item.label==="스탬프투어 관리"?"active":""}`} onClick={()=>item.label==="대시보드"?window.location.assign("/"):item.children?toggleMenu(item.label):act(`${item.label} 화면으로 이동합니다.`)}><span className="nav-icon">{item.icon==="qr"?<QrCode size={16} strokeWidth={1.8}/>:item.icon}</span><span className="nav-label">{item.label}</span>{item.children&&<span className={`chevron ${expanded.includes(item.label)?"open":""}`}>⌄</span>}</button>
        {item.children&&expanded.includes(item.label)&&!collapsed&&<div className="subnav">{item.children.map(child=><button key={child} className={child==="스탬프투어 목록"?"current":""} data-planned-path={item.label==="스탬프투어 관리"?`/stamp-tours/${({"관광지 관리":"attractions","참여자·진행현황":"participants","인증 이력":"verifications","완주·경품 관리":"rewards","통계":"statistics"} as Record<string,string>)[child]||""}`:undefined} onClick={()=>goChild(item.label,child)}>{child}</button>)}</div>}
      </div>)}</nav><div className="sidebar-help"><span className="nav-icon">?</span><div><strong>업무지원센터</strong><p>평일 09:00–18:00</p></div></div></aside>

    <div className="workspace"><header className="topbar"><div className="breadcrumb"><span>스탬프투어 관리</span><b>/</b><strong>스탬프투어 목록</strong></div><div className="top-actions"><label className="search"><span>⌕</span><input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색"/><kbd>⌘ K</kbd></label><button className="icon-btn" onClick={()=>act("업무지원센터를 엽니다.")}>?</button><div className="dropdown-wrap"><button className="icon-btn notice" aria-label="알림" onClick={()=>{setNoticeOpen(!noticeOpen);setProfileOpen(false)}}>♢<i>5</i></button>{noticeOpen&&<div className="dropdown notice-menu"><div className="drop-head"><strong>알림</strong><button onClick={()=>setNoticeOpen(false)}>모두 읽음</button></div><button><span className="alert-dot info"></span><span>새 스탬프 인증이 접수되었습니다.<small>방금 전</small></span></button><button className="drop-footer">알림 전체보기</button></div>}</div><div className="divider"/><div className="dropdown-wrap"><button className="profile" onClick={()=>{setProfileOpen(!profileOpen);setNoticeOpen(false)}}><span className="avatar">장</span><span><b>애비아넥스트</b><small>관리자 장윤호</small></span><em>⌄</em></button>{profileOpen&&<div className="dropdown profile-menu"><button>내 정보</button><button>환경설정</button><hr/><button className="logout">로그아웃</button></div>}</div></div></header>

      <main className="content stamp-content"><section className="page-head stamp-page-head"><div><h1>스탬프투어 목록</h1><p>관광 스탬프투어 프로그램의 운영 상태와 참여 현황을 관리합니다.</p></div><button className="primary stamp-register" onClick={()=>window.location.assign("/stamp-tours/new")}><Plus size={16}/>스탬프투어 등록</button></section>

        <section className="stamp-kpi-grid">{kpis.map(([label,value,Icon,color])=><div className={`stamp-kpi ${color}`} key={label}><span><small>{label}</small><strong>{value}</strong></span><i><Icon size={18} strokeWidth={1.8}/></i></div>)}</section>

        <section className="panel stamp-filter" aria-label="스탬프투어 검색"><div className="stamp-filter-grid"><label className="tour-query"><span>투어명 검색</span><div><Search size={15}/><input value={draftQuery} onChange={e=>setDraftQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="투어명을 입력하세요"/></div></label><label className="date-range"><span>운영기간</span><div><CalendarDays size={15}/><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/><em>~</em><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div></label><label><span>운영상태</span><select value={draftStatus} onChange={e=>setDraftStatus(e.target.value)}><option>전체</option><option>운영 예정</option><option>운영 중</option><option>일시중지</option><option>운영 종료</option></select></label><label><span>공개상태</span><select value={draftVisibility} onChange={e=>setDraftVisibility(e.target.value)}><option>전체</option><option>공개</option><option>비공개</option></select></label></div><div className="stamp-filter-actions"><button className="secondary" onClick={reset}><RotateCcw size={14}/>조건 초기화</button><button className="primary" onClick={search}><Search size={15}/>검색</button></div></section>

        <section className="panel stamp-list-panel"><div className="stamp-list-head"><strong>전체 <b>{filtered.length}</b>건</strong><span>운영기간과 참여 현황은 현재 등록 데이터를 기준으로 표시됩니다.</span></div><div className="stamp-table-wrap"><table className="stamp-table"><thead><tr>{["NO.","투어명","운영기간","관광지 수","완주조건","참여자","완주자","완주율","운영상태","공개상태","등록일","복사","삭제"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.length?rows.map((t,index)=>{const rate=t.participants?Math.round(t.finishers/t.participants*100):0;return <tr key={t.id}><td className="center">{filtered.length-((page-1)*pageSize+index)}</td><td className="stamp-name"><a href={`/stamp-tours/${t.id}`} onClick={e=>{e.preventDefault();window.location.assign(`/stamp-tours/${t.id}`)}}>{t.name}</a><small>ST-{String(t.id).padStart(4,"0")}</small></td><td className="stamp-period"><span>{t.start}</span><em>~</em><span>{t.end}</span></td><td className="center"><b>{t.spots}곳</b></td><td>{t.condition}</td><td className="number">{fmt(t.participants)}명</td><td className="number">{fmt(t.finishers)}명</td><td><div className="completion"><span><i style={{width:`${rate}%`}}/></span><b>{rate}%</b></div></td><td>{<span className={`badge ${statusClass(t.status)}`}>{t.status}</span>}</td><td className="center"><button className={`switch ${visibleMap[t.id]?"on":""}`} role="switch" aria-checked={visibleMap[t.id]} aria-label={`${t.name} 공개상태`} onClick={()=>{setVisibleMap(v=>({...v,[t.id]:!v[t.id]}));act(`${t.name}을(를) ${visibleMap[t.id]?"비공개":"공개"}로 변경했습니다.`)}}><i/></button></td><td className="center">{t.created}</td><td><div className="row-actions"><button onClick={()=>act(`${t.name} 복사 기능은 다음 단계에서 연결됩니다.`)}><Copy size={14}/>복사</button></div></td><td><div className="row-actions"><button className="delete" onClick={()=>act(`${t.name} 삭제 기능은 다음 단계에서 연결됩니다.`)}><Trash2 size={14}/>삭제</button></div></td></tr>}) : <tr><td colSpan={13}><div className="stamp-empty"><QrCode size={38} strokeWidth={1.4}/><strong>조건에 맞는 스탬프투어가 없습니다.</strong><p>검색 조건을 변경하거나 초기화한 후 다시 확인해 주세요.</p><button className="secondary" onClick={reset}>조건 초기화</button></div></td></tr>}</tbody></table></div><div className="stamp-footer"><span>총 {filtered.length}건 중 {rows.length?`${(page-1)*pageSize+1}-${Math.min(page*pageSize,filtered.length)}`:"0"}건 표시</span><div className="pagination"><button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button>{Array.from({length:pages},(_,i)=>i+1).map(p=><button key={p} className={page===p?"active":""} onClick={()=>setPage(p)}>{p}</button>)}<button disabled={page===pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>›</button></div><div/></div></section><footer>© 2026 AOS Travel ERP · AviaNext</footer>
      </main></div>{toast&&<div className="toast"><span>✓</span>{toast}</div>}
  </div>;
}
