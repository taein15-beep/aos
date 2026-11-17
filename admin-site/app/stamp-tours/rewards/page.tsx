"use client";

import { stampTourMenuItem, goStampTourChild } from "../_data/stampTourNav";
import { mockRewardClaims, mockTours, type MockRewardClaim } from "../_data/mockStampTours";

import { useMemo, useState } from "react";
import { Download, FilterX, Gift, PackageCheck, QrCode, Search, Trophy, UserCheck, XCircle, Clock3 } from "lucide-react";

const menu:{icon:string;label:string;children?:string[]}[]=[
  {icon:"▦",label:"대시보드"},{icon:"◇",label:"상품관리",children:["상품목록","상품등록","일정표관리","요금관리"]},{icon:"▤",label:"예약관리",children:["예약접수현황","예약달력"]},{icon:"₩",label:"결제관리",children:["결제현황","취소/환불"]},{icon:"⇄",label:"정산관리",children:["정산현황","판매점정산","공급사정산"]},{icon:"♙",label:"회원관리",children:["웹회원","제휴여행사","판매점관리","관리자/직원","그룹/권한"]},{icon:"⌂",label:"거래처관리"},stampTourMenuItem(),{icon:"▥",label:"통계관리"},{icon:"◎",label:"운영관리",children:["팝업관리","알림관리","알림톡"]},{icon:"⚙",label:"시스템설정",children:["홈페이지설정","결제설정","기본설정"]},
];

type ClaimStatus=MockRewardClaim["status"];

const tourOf=(tourId:number)=>mockTours.find(row=>row.id===tourId);
const maskPhone=(phone:string)=>phone.replace(/(\d{3})-(\d{3,4})-(\d{4})/,"$1-****-$3");
const statusClass=(status:ClaimStatus)=>status==="지급완료"?"complete":status==="반려"?"rejected":status==="검수중"?"checking":status==="신청"?"approved":"";
const nowLabel=()=>{const d=new Date();const p=(n:number)=>String(n).padStart(2,"0");return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`};

export default function RewardManagementPage(){
  const [collapsed,setCollapsed]=useState(false),[expanded,setExpanded]=useState(["스탬프투어 관리"]);
  const [toast,setToast]=useState(""),[profileOpen,setProfileOpen]=useState(false),[noticeOpen,setNoticeOpen]=useState(false);
  const [claims,setClaims]=useState<MockRewardClaim[]>(mockRewardClaims);
  const [tour,setTour]=useState("전체"),[name,setName]=useState(""),[phone,setPhone]=useState(""),[status,setStatus]=useState("전체");
  const [applied,setApplied]=useState({tour:"전체",name:"",phone:"",status:"전체"});
  const [page,setPage]=useState(1);
  const act=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),2200)};
  const toggleMenu=(label:string)=>setExpanded(current=>current.includes(label)?current.filter(value=>value!==label):[...current,label]);
  const goChild=(child:string)=>goStampTourChild(child,act);
  const filtered=useMemo(()=>claims.filter(row=>(applied.tour==="전체"||String(row.tourId)===applied.tour)&&(!applied.name||row.participant.includes(applied.name))&&(!applied.phone||row.phone.replaceAll("-","").includes(applied.phone.replaceAll("-","")))&&(applied.status==="전체"||row.status===applied.status)),[claims,applied]);
  const pageSize=8,totalPages=Math.max(1,Math.ceil(filtered.length/pageSize)),currentPage=Math.min(page,totalPages),visible=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
  const search=()=>{setApplied({tour,name:name.trim(),phone:phone.trim(),status});setPage(1);act("검색 조건을 적용했습니다.")};
  const reset=()=>{setTour("전체");setName("");setPhone("");setStatus("전체");setApplied({tour:"전체",name:"",phone:"",status:"전체"});setPage(1);act("검색 조건을 초기화했습니다.")};
  const pay=(id:number)=>{const target=claims.find(row=>row.id===id);setClaims(current=>current.map(row=>row.id===id?{...row,status:"지급완료",paidAt:nowLabel()}:row));act(`${target?.participant??"참여자"}님의 경품 지급을 처리했습니다. (샘플 화면)`)};
  const downloadExcel=()=>{const header=["참여자","연락처","투어","인증 개수","완주","신청 경품","신청일","지급상태","지급일"];const rows=filtered.map(row=>[row.participant,maskPhone(row.phone),tourOf(row.tourId)?.name??"-",`${row.verifiedCount}/${tourOf(row.tourId)?.spots??"-"}`,row.completed?"완주":"미완주",row.prizeName,row.appliedAt,row.status,row.paidAt]);const csv="\uFEFF"+[header,...rows].map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(",")).join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="스탬프투어-완주경품-지급현황.csv";link.click();URL.revokeObjectURL(url);act("완주·경품 지급 현황 파일을 다운로드했습니다.")};
  const count=(value:ClaimStatus)=>claims.filter(row=>row.status===value).length;
  const kpis=[["전체 완주자",`${claims.length}명`,UserCheck,"blue"],["경품 신청",`${claims.filter(row=>row.status!=="미신청").length}건`,Gift,"purple"],["미신청",`${count("미신청")}건`,Clock3,"amber"],["검수중",`${count("검수중")}건`,Trophy,"indigo"],["지급 대기",`${count("신청")}건`,PackageCheck,"sky"],["지급 완료",`${count("지급완료")}건`,PackageCheck,"green"],["반려",`${count("반려")}건`,XCircle,"rose"]] as const;

  return <div className={`app-shell ${collapsed?"is-collapsed":""}`}>
    <style>{`
      .reward-content > .page-head h1 { font-size: 25px !important; }
      .reward-content > .page-head p { font-size: 14px !important; }
      .reward-content .reward-kpi small { font-size: 10px !important; }
      .reward-content .reward-kpi strong { font-size: 19px !important; }
      .reward-content .reward-filter label > span,
      .reward-content .reward-filter input,
      .reward-content .reward-filter select,
      .reward-content .reward-period em { font-size: 11px !important; }
      .reward-content .reward-filter-actions button { font-size: 15px !important; }
      .reward-content .reward-list-head strong { font-size: 12px !important; }
      .reward-content .reward-list-head > div:first-child > span,
      .reward-content .bulk-tools > span,
      .reward-content .bulk-tools select,
      .reward-content .bulk-tools button { font-size: 10px !important; }
      .reward-content .reward-table th,
      .reward-content .reward-table td { font-size: 11px !important; }
      .reward-content .reward-person b { font-size: 11px !important; }
      .reward-content .reward-person small { font-size: 9px !important; }
      .reward-content .receive-method,
      .reward-content .reward-status,
      .reward-content .tracking-cell,
      .reward-content .reward-detail-button { font-size: 10px !important; }
      .reward-content .participant-footer > span { font-size: 10px !important; }
      .reward-content .pagination button { font-size: 12px !important; }
      .reward-content .reward-empty strong { font-size: 13px !important; }
      .reward-content .reward-empty p { font-size: 11px !important; }
    `}</style>
    <aside className="sidebar"><div className="brand"><div className="brand-mark">A</div><div className="brand-copy"><strong>AOS</strong><span>TRAVEL ERP</span></div><button className="collapse" onClick={()=>setCollapsed(!collapsed)} aria-label="사이드바 접기">‹</button></div><nav aria-label="관리자 메뉴">{menu.map(item=><div className="nav-group" key={item.label}><button className={`nav-item ${item.label==="스탬프투어 관리"?"active":""}`} onClick={()=>item.label==="대시보드"?window.location.assign("/"):item.children?toggleMenu(item.label):act(`${item.label} 화면으로 이동합니다.`)}><span className="nav-icon">{item.icon==="qr"?<QrCode size={16}/>:item.icon}</span><span className="nav-label">{item.label}</span>{item.children&&<span className={`chevron ${expanded.includes(item.label)?"open":""}`}>⌄</span>}</button>{item.children&&expanded.includes(item.label)&&!collapsed&&<div className="subnav">{item.children.map(child=><button key={child} className={child==="완주·경품 지급"?"current":""} onClick={()=>goChild(child)}>{child}</button>)}</div>}</div>)}</nav><div className="sidebar-help"><span className="nav-icon">?</span><div><strong>업무지원센터</strong><p>평일 09:00–18:00</p></div></div></aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><span>스탬프투어 관리</span><b>/</b><strong>완주·경품 지급</strong></div><div className="top-actions"><label className="search"><span>⌕</span><input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색"/><kbd>⌘ K</kbd></label><button className="icon-btn">?</button><div className="dropdown-wrap"><button className="icon-btn notice" aria-label="알림" onClick={()=>{setNoticeOpen(!noticeOpen);setProfileOpen(false)}}>♢<i>5</i></button>{noticeOpen&&<div className="dropdown notice-menu"><div className="drop-head"><strong>알림</strong><button onClick={()=>setNoticeOpen(false)}>모두 읽음</button></div><button><span className="alert-dot warn"/><span>지급 대기 중인 경품 신청이 {count("신청")}건 있습니다.<small>방금 전</small></span></button></div>}</div><div className="divider"/><div className="dropdown-wrap"><button className="profile" onClick={()=>{setProfileOpen(!profileOpen);setNoticeOpen(false)}}><span className="avatar">장</span><span><b>애비아넥스트</b><small>관리자 장윤호</small></span><em>⌄</em></button>{profileOpen&&<div className="dropdown profile-menu"><button>내 정보</button><button>환경설정</button><hr/><button className="logout">로그아웃</button></div>}</div></div></header>
      <main className="content reward-content"><section className="page-head reward-page-head"><div><h1>완주·경품 지급</h1><p>완주자의 경품 신청 현황을 확인하고 지급 처리합니다. (샘플 데이터)</p></div><button className="excel-button" onClick={downloadExcel}><Download size={14}/>엑셀 다운로드</button></section>
        <section className="reward-kpis">{kpis.map(([title,value,Icon,color])=><div className={`reward-kpi ${color}`} key={title}><span><small>{title}</small><strong>{value}</strong></span><i><Icon size={18}/></i></div>)}</section>
        <section className="panel reward-filter"><div className="reward-filter-grid"><label><span>스탬프투어</span><select value={tour} onChange={event=>setTour(event.target.value)}><option value="전체">전체</option>{mockTours.map(row=><option key={row.id} value={String(row.id)}>{row.name}</option>)}</select></label><label><span>참여자명</span><input value={name} onChange={event=>setName(event.target.value)} onKeyDown={event=>event.key==="Enter"&&search()} placeholder="이름 입력"/></label><label><span>연락처</span><input value={phone} onChange={event=>setPhone(event.target.value)} onKeyDown={event=>event.key==="Enter"&&search()} placeholder="숫자만 입력"/></label><label><span>지급상태</span><select value={status} onChange={event=>setStatus(event.target.value)}><option>전체</option><option>미신청</option><option>신청</option><option>검수중</option><option>지급완료</option><option>반려</option></select></label></div><div className="reward-filter-actions"><button className="secondary" onClick={reset}><FilterX size={14}/>조건 초기화</button><button className="primary" onClick={search}><Search size={14}/>검색</button></div></section>
        <section className="panel reward-list-panel"><div className="reward-list-head"><div><strong>완주자 <b>{filtered.length}</b>명</strong><span>개인정보 마스킹 적용</span></div></div><div className="reward-table-wrap"><table className="reward-table"><thead><tr>{["참여자","연락처","투어명","인증 개수","완주","신청 경품","신청일","지급상태","지급 처리"].map(title=><th key={title}>{title}</th>)}</tr></thead><tbody>{visible.length?visible.map(row=>{const rowTour=tourOf(row.tourId);return <tr key={row.id}><td className="reward-person"><b>{row.participant}</b></td><td>{maskPhone(row.phone)}</td><td className="reward-tour">{rowTour?.name??"-"}</td><td><span className="verified-count"><b>{row.verifiedCount}</b>/{rowTour?.spots??"-"}곳</span></td><td>{row.completed?`완주 · ${row.completedAt.slice(0,10)}`:"미완주"}</td><td className="reward-name">{row.prizeName}</td><td className="reward-date">{row.appliedAt}</td><td><span className={`reward-status ${statusClass(row.status)}`}>{row.status}</span></td><td>{row.status==="신청"||row.status==="검수중"?<button className="reward-detail-button" onClick={()=>pay(row.id)}><PackageCheck size={13}/>지급 처리</button>:row.status==="지급완료"?<span className="tracking-cell">{row.paidAt}</span>:<span className="tracking-cell">-</span>}</td></tr>}):<tr><td colSpan={9}><div className="reward-empty"><Gift size={29}/><strong>검색 조건에 맞는 완주자가 없습니다.</strong><p>조건을 변경하거나 초기화해 주세요.</p><button className="secondary" onClick={reset}><FilterX size={13}/>조건 초기화</button></div></td></tr>}</tbody></table></div><div className="participant-footer"><span>총 {filtered.length}건 중 {visible.length}건 표시</span><div className="pagination"><button disabled={currentPage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>‹</button>{Array.from({length:totalPages},(_,index)=><button key={index+1} className={currentPage===index+1?"active":""} onClick={()=>setPage(index+1)}>{index+1}</button>)}<button disabled={currentPage===totalPages} onClick={()=>setPage(value=>Math.min(totalPages,value+1))}>›</button></div><div/></div></section><footer>© 2026 AOS Travel ERP · AviaNext</footer>
      </main></div>
    {toast&&<div className="toast"><span>✓</span>{toast}</div>}
  </div>;
}
