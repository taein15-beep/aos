"use client";

import { useState } from "react";
import {
  AlertTriangle, Ban, CheckCircle2, ChevronRight, Circle, ClipboardCheck,
  FilePenLine, Gift, History, MapPin, MessageSquareText, Pencil, QrCode,
  RotateCcw, ShieldCheck, Trophy, UserCheck, UserRound,
} from "lucide-react";

const menu=[
  {icon:"▦",label:"대시보드"},{icon:"◇",label:"상품관리",children:["상품목록","상품등록","일정표관리","요금관리"]},{icon:"▤",label:"예약관리",children:["예약접수현황","예약달력"]},{icon:"₩",label:"결제관리",children:["결제현황","취소/환불"]},{icon:"⇄",label:"정산관리",children:["정산현황","판매점정산","공급사정산"]},{icon:"♙",label:"회원관리",children:["웹회원","관리자/직원","그룹/권한"]},{icon:"▣",label:"판매점관리"},{icon:"⌂",label:"거래처관리"},{icon:"qr",label:"스탬프투어 관리",children:["스탬프투어 목록","관광지 관리","참여자·진행현황","인증 이력","완주·경품 관리","통계"]},{icon:"▥",label:"통계관리"},{icon:"◎",label:"운영관리",children:["팝업관리","알림관리","알림톡"]},{icon:"⚙",label:"시스템설정",children:["홈페이지설정","결제설정","기본설정"]},
];

const spots=[
  {name:"고석정",code:"SPOT-001",verified:true,date:"2026.08.15 10:24"},
  {name:"소이산 모노레일",code:"SPOT-002",verified:true,date:"2026.08.15 12:18"},
  {name:"DMZ 두루미평화타운",code:"SPOT-003",verified:true,date:"2026.08.16 11:42"},
  {name:"월정리역",code:"SPOT-004",verified:true,date:"2026.08.16 14:07"},
  {name:"철원역사문화공원",code:"SPOT-005",verified:true,date:"2026.08.17 15:36"},
  {name:"백마고지 전적지",code:"SPOT-006",verified:false,date:"-"},
  {name:"직탕폭포",code:"SPOT-007",verified:false,date:"-"},
  {name:"은하수교",code:"SPOT-008",verified:false,date:"-"},
];

const activities=[
  ["2026.08.17 16:02","경품 신청","모바일 스탬프북에서 경품을 신청했습니다.","참여자","gift"],
  ["2026.08.17 15:37","완주 달성","5번째 관광지 인증으로 완주조건을 충족했습니다.","시스템","complete"],
  ["2026.08.17 15:36","관광지 인증","철원역사문화공원 · GPS 위치 정상","참여자","verify"],
  ["2026.08.16 14:09","중복 인증 시도","월정리역에서 이미 인증된 QR을 다시 인식했습니다.","시스템 차단","warn"],
  ["2026.08.16 14:07","관광지 인증","월정리역 · GPS 위치 정상","참여자","verify"],
  ["2026.08.15 09:58","참여 등록","휴대전화 본인인증 및 필수 약관 동의를 완료했습니다.","참여자","join"],
  ["2026.08.15 09:55","관리자 정보 수정","연락처 표시정보를 개인정보 정책에 맞게 갱신했습니다.","관리자 장윤호","admin"],
] as const;

type ActionKey="정보 수정"|"참여 제한"|"인증 취소"|"수동 인증"|"인증 복구"|"메모 저장";
const actionCopy:Record<ActionKey,[string,string,string]>={
  "정보 수정":["참여자 정보 수정 확인","김민수 참여자의 기본정보 수정 화면을 시연합니다.","변경 내용과 처리 사유는 관리자 활동 이력에 기록됩니다."],
  "참여 제한":["참여 제한 확인","이 참여자의 추가 QR 인증과 경품 신청을 제한합니다.","기존 인증 이력은 삭제되지 않고 그대로 보존됩니다."],
  "인증 취소":["인증 취소 확인","선택한 인증을 잘못 처리된 인증으로 취소합니다.","진행률과 완주 상태가 자동으로 다시 계산됩니다."],
  "수동 인증":["관리자 수동 인증 확인","증빙 확인 후 관광지를 관리자 권한으로 인증합니다.","증빙을 확인한 뒤 정확한 사유를 입력해 주세요."],
  "인증 복구":["인증 복구 확인","이전에 취소된 인증 1건을 정상 상태로 복구합니다.","진행률과 완주 상태가 자동으로 다시 계산됩니다."],
  "메모 저장":["관리자 메모 저장","입력한 내부 메모를 이 참여자 정보에 저장합니다.","관리자만 확인할 수 있으며 저장 이력이 기록됩니다."],
};

export default function ParticipantDetailPage(){
  const [collapsed,setCollapsed]=useState(false),[expanded,setExpanded]=useState(["스탬프투어 관리"]);
  const [toast,setToast]=useState(""),[profileOpen,setProfileOpen]=useState(false),[noticeOpen,setNoticeOpen]=useState(false);
  const [action,setAction]=useState<ActionKey|null>(null),[reason,setReason]=useState(""),[reasonError,setReasonError]=useState(false);
  const [spotDetail,setSpotDetail]=useState<(typeof spots)[number]|null>(null),[restricted,setRestricted]=useState(false);
  const initialMemo="경품 배송지 확인 완료. 참여 제한 또는 이상 인증 사항 없음.";
  const [memo,setMemo]=useState(initialMemo),[savedMemo,setSavedMemo]=useState(initialMemo);
  const act=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),2300)};
  const toggleMenu=(label:string)=>setExpanded(current=>current.includes(label)?current.filter(item=>item!==label):[...current,label]);
  const goChild=(child:string)=>child==="스탬프투어 목록"?window.location.assign("/stamp-tours"):child==="관광지 관리"?window.location.assign("/stamp-tours/attractions"):child==="참여자·진행현황"?window.location.assign("/stamp-tours/participants"):child==="인증 이력"?window.location.assign("/stamp-tours/verifications"):child==="완주·경품 관리"?window.location.assign("/stamp-tours/rewards"):child==="통계"?window.location.assign("/stamp-tours/statistics"):child==="상품목록"?window.location.assign("/products"):act(`${child} 화면은 다음 단계에서 제공될 예정입니다.`);
  const openAction=(next:ActionKey)=>{setAction(next);setReason("");setReasonError(false)};
  const closeAction=()=>{setAction(null);setReason("");setReasonError(false)};
  const confirmAction=()=>{if(!reason.trim()){setReasonError(true);return}if(action==="참여 제한")setRestricted(true);if(action==="메모 저장")setSavedMemo(memo);act(`${action} 처리가 완료되었습니다. 처리 사유가 활동 이력에 기록되었습니다.`);closeAction()};

  return <div className={`app-shell ${collapsed?"is-collapsed":""}`}>
    <aside className="sidebar"><div className="brand"><div className="brand-mark">A</div><div className="brand-copy"><strong>AOS</strong><span>TRAVEL ERP</span></div><button className="collapse" onClick={()=>setCollapsed(!collapsed)} aria-label="사이드바 접기">‹</button></div><nav aria-label="관리자 메뉴">{menu.map(item=><div className="nav-group" key={item.label}><button className={`nav-item ${item.label==="스탬프투어 관리"?"active":""}`} onClick={()=>item.label==="대시보드"?window.location.assign("/"):item.children?toggleMenu(item.label):act(`${item.label} 화면으로 이동합니다.`)}><span className="nav-icon">{item.icon==="qr"?<QrCode size={16} strokeWidth={1.8}/>:item.icon}</span><span className="nav-label">{item.label}</span>{item.children&&<span className={`chevron ${expanded.includes(item.label)?"open":""}`}>⌄</span>}</button>{item.children&&expanded.includes(item.label)&&!collapsed&&<div className="subnav">{item.children.map(child=><button key={child} className={child==="참여자·진행현황"?"current":""} onClick={()=>goChild(child)}>{child}</button>)}</div>}</div>)}</nav><div className="sidebar-help"><span className="nav-icon">?</span><div><strong>업무지원센터</strong><p>평일 09:00–18:00</p></div></div></aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><span>스탬프투어 관리</span><b>/</b><span>참여자·진행현황</span><b>/</b><strong>참여자 상세</strong></div><div className="top-actions"><label className="search"><span>⌕</span><input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색"/><kbd>⌘ K</kbd></label><button className="icon-btn" onClick={()=>act("업무지원센터를 엽니다.")}>?</button><div className="dropdown-wrap"><button className="icon-btn notice" aria-label="알림" onClick={()=>{setNoticeOpen(!noticeOpen);setProfileOpen(false)}}>♢<i>5</i></button>{noticeOpen&&<div className="dropdown notice-menu"><div className="drop-head"><strong>알림</strong><button onClick={()=>setNoticeOpen(false)}>모두 읽음</button></div><button><span className="alert-dot warn"/><span>오늘 처리할 참여자 업무 3건이 있습니다.<small>방금 전</small></span></button></div>}</div><div className="divider"/><div className="dropdown-wrap"><button className="profile" onClick={()=>{setProfileOpen(!profileOpen);setNoticeOpen(false)}}><span className="avatar">장</span><span><b>애비아넥스트</b><small>관리자 장윤호</small></span><em>⌄</em></button>{profileOpen&&<div className="dropdown profile-menu"><button>내 정보</button><button>환경설정</button><hr/><button className="logout">로그아웃</button></div>}</div></div></header>
      <main className="content participant-detail-content">
        <section className="panel participant-detail-hero"><div className="participant-identity"><span className="participant-avatar"><UserRound size={23}/></span><div><div className="participant-code-row"><span>STP-20260815-01248</span><span className={`badge ${restricted?"danger":"success"}`}>{restricted?"참여 제한":"완주"}</span><span className="reward-badge applied"><Gift size={11}/>신청 완료</span></div><h1>김민수</h1><p>철원 DMZ 평화관광 스탬프투어 · 인증 5/8곳</p></div></div><div className="participant-detail-actions"><button className="secondary" onClick={()=>window.location.assign("/stamp-tours/participants")}>목록</button><button className="secondary" onClick={()=>openAction("정보 수정")}><Pencil size={14}/>정보 수정</button><button className="participant-restrict-button" onClick={()=>openAction("참여 제한")}><Ban size={14}/>{restricted?"제한 설정됨":"참여 제한"}</button></div></section>
        <div className="participant-detail-grid"><section className="panel participant-info-panel"><div className="panel-head"><div><h2>기본정보</h2><p>업무 처리에 필요한 참여자 정보와 동의 현황입니다.</p></div><span className="privacy-note"><ShieldCheck size={13}/>개인정보 보호 적용</span></div><div className="participant-info-grid">{[["이름","김민수"],["휴대전화번호","010-12**-5678"],["최초 참여일","2026.08.15 09:58"],["최근 인증일","2026.08.17 15:36"],["본인인증 여부","인증 완료"],["개인정보 동의일","2026.08.15 09:57"],["위치정보 동의일","2026.08.15 09:57"],["완주일","2026.08.17 15:37"],["경품 신청상태","신청 완료 · 2026.08.17 16:02"]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
          <section className="panel participant-manage-panel"><div className="panel-head"><div><h2>관리 기능</h2><p>변경 시 처리 사유가 필수로 기록됩니다.</p></div></div><div className="participant-manage-buttons"><button onClick={()=>openAction("인증 취소")}><RotateCcw size={15}/><span><b>잘못 처리된 인증 취소</b><small>인증 1건을 취소하고 진행률 재계산</small></span><ChevronRight size={13}/></button><button onClick={()=>openAction("수동 인증")}><ClipboardCheck size={15}/><span><b>관리자 수동 인증</b><small>증빙 확인 후 관광지 인증 처리</small></span><ChevronRight size={13}/></button><button onClick={()=>openAction("인증 복구")}><History size={15}/><span><b>인증 복구</b><small>취소된 인증을 정상 상태로 복구</small></span><ChevronRight size={13}/></button><button onClick={()=>openAction("참여 제한")} className="restrict"><Ban size={15}/><span><b>참여 제한</b><small>추가 인증과 경품 신청 제한</small></span><ChevronRight size={13}/></button></div></section></div>
        <section className="panel participant-progress-panel"><div className="panel-head"><div><h2>진행현황</h2><p>관광지별 인증 상태와 위치 확인 결과입니다.</p></div><div className="progress-summary"><span><b>5</b>/8곳 인증</span><strong>완주조건 충족</strong></div></div><div className="participant-progress-overview"><div><span>전체 8곳 중 5곳 인증</span><b>62.5%</b></div><i><em style={{width:"62.5%"}}/></i><p><Trophy size={13}/>완주조건: 전체 8곳 중 5곳 이상 인증</p></div><div className="stamp-grid">{spots.map((spot,index)=><article className={`stamp-card ${spot.verified?"verified":"pending"}`} key={spot.code}><div className="stamp-card-head"><span>{spot.verified?<CheckCircle2 size={17}/>:<Circle size={17}/>}</span><div><small>{spot.code}</small><strong>{spot.name}</strong></div><em>{spot.verified?"인증":"미인증"}</em></div><dl><div><dt>인증 일시</dt><dd>{spot.date}</dd></div><div><dt>인증 위치</dt><dd className={spot.verified?"normal":"muted"}>{spot.verified&&<MapPin size={11}/>} {spot.verified?"정상":"-"}</dd></div></dl><button onClick={()=>setSpotDetail(spot)} disabled={!spot.verified}>{spot.verified?"인증 상세보기":"인증 전"}</button>{spot.verified&&<span className="stamp-number">{index+1}</span>}</article>)}</div></section>
        <div className="participant-bottom-grid"><section className="panel participant-activity-panel"><div className="panel-head"><div><h2>활동 이력</h2><p>참여 등록부터 관리자 처리까지 시간순으로 표시합니다.</p></div><span className="history-count">최근 7건</span></div><div className="participant-history">{activities.map(([date,title,detail,actor,type],index)=><div className={`history-row ${type}`} key={`${date}-${title}`}><i>{type==="warn"?<AlertTriangle size={13}/>:type==="gift"?<Gift size={13}/>:type==="complete"?<Trophy size={13}/>:type==="admin"?<FilePenLine size={13}/>:type==="join"?<UserCheck size={13}/>:<QrCode size={13}/>}</i><div><span><b>{title}</b><small>{actor}</small></span><p>{detail}</p></div><time>{date}</time>{index<activities.length-1&&<em/>}</div>)}</div></section>
          <section className="panel participant-memo-panel"><div className="panel-head"><div><h2>관리자 메모</h2><p>참여자 관리에 필요한 내부 메모입니다.</p></div><MessageSquareText size={16}/></div><div className="memo-body"><textarea value={memo} onChange={event=>setMemo(event.target.value)} aria-label="관리자 메모" placeholder="확인 사항 또는 처리 내용을 입력하세요."/><div><span>최종 저장: 2026.08.19 17:42 · 관리자 장윤호</span><button className="primary" disabled={memo.trim()===savedMemo.trim()||!memo.trim()} onClick={()=>openAction("메모 저장")}>메모 저장</button></div></div></section></div><footer>© 2026 AOS Travel ERP · AviaNext</footer>
      </main></div>
    {action&&<div className="modal-backdrop" role="dialog" aria-modal="true"><div className="participant-action-modal"><div className="modal-head"><div><span className={action==="참여 제한"||action==="인증 취소"?"danger":"info"}>{action==="참여 제한"?<Ban size={17}/>:action==="인증 취소"?<AlertTriangle size={17}/>:<ClipboardCheck size={17}/>}</span><h3>{actionCopy[action][0]}</h3></div><button onClick={closeAction} aria-label="닫기">×</button></div><div className="participant-action-body"><p>{actionCopy[action][1]}</p><div className="action-target"><span>처리 대상</span><b>김민수 · STP-20260815-01248</b></div><label><span>처리 사유 <b>*</b></span><textarea value={reason} onChange={event=>{setReason(event.target.value);setReasonError(false)}} placeholder="처리 사유를 구체적으로 입력해 주세요." autoFocus/><small className={reasonError?"error":""}>{reasonError?"처리 사유를 입력해 주세요.":"입력한 사유는 관리자 활동 이력에 남습니다."}</small></label><div className="action-warning"><AlertTriangle size={13}/><span>{actionCopy[action][2]}</span></div></div><div className="modal-actions"><button className="secondary" onClick={closeAction}>취소</button><button className={action==="참여 제한"||action==="인증 취소"?"danger-button":"primary"} onClick={confirmAction}>확인 후 처리</button></div></div></div>}
    {spotDetail&&<div className="modal-backdrop" role="dialog" aria-modal="true"><div className="participant-spot-modal"><div className="modal-head"><div><span className="info"><QrCode size={17}/></span><h3>인증 상세</h3></div><button onClick={()=>setSpotDetail(null)} aria-label="닫기">×</button></div><div className="spot-detail-body"><div className="spot-detail-status"><CheckCircle2 size={25}/><span><b>정상 인증</b><small>QR 및 GPS 위치 확인 완료</small></span></div><dl><div><dt>참여자</dt><dd>김민수</dd></div><div><dt>관광지</dt><dd>{spotDetail.name}</dd></div><div><dt>관광지 코드</dt><dd>{spotDetail.code}</dd></div><div><dt>인증 일시</dt><dd>{spotDetail.date}</dd></div><div><dt>위치 확인</dt><dd>허용 반경 100m 이내 · 정상</dd></div><div><dt>인증 방식</dt><dd>QR코드 + GPS</dd></div></dl></div><div className="modal-actions"><button className="secondary" onClick={()=>setSpotDetail(null)}>닫기</button><button className="secondary" onClick={()=>{setSpotDetail(null);openAction("인증 취소")}}>인증 취소</button></div></div></div>}
    {toast&&<div className="toast"><span>✓</span>{toast}</div>}
  </div>;
}
