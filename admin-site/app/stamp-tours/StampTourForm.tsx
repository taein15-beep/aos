"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CalendarDays, Check, FileImage, Gift, Info, MapPin, QrCode, Save, ShieldCheck, Trophy, UserCheck, X } from "lucide-react";

const menu = [
  { icon:"▦", label:"대시보드" }, { icon:"◇", label:"상품관리", children:["상품목록","상품등록","일정표관리","요금관리"] },
  { icon:"▤", label:"예약관리", children:["예약접수현황","예약달력"] }, { icon:"₩", label:"결제관리", children:["결제현황","취소/환불"] },
  { icon:"⇄", label:"정산관리", children:["정산현황","판매점정산","공급사정산"] }, { icon:"♙", label:"회원관리", children:["웹회원","관리자/직원","그룹/권한"] },
  { icon:"▣", label:"판매점관리" }, { icon:"⌂", label:"거래처관리" },
  { icon:"qr", label:"스탬프투어 관리", children:["스탬프투어 목록","관광지 관리","참여자·진행현황","인증 이력","완주·경품 관리","통계"] },
  { icon:"▥", label:"통계관리" }, { icon:"◎", label:"운영관리", children:["팝업관리","알림관리","알림톡"] },
  { icon:"⚙", label:"시스템설정", children:["홈페이지설정","결제설정","기본설정"] },
];

const editSeed = {
  name:"철원 DMZ 평화관광 스탬프투어", region:"강원 철원군", department:"관광마케팅팀", manager:"김태인",
  intro:"철원의 역사와 자연을 따라 여행하며 모바일 스탬프를 모아보세요.", detail:"각 관광지에 비치된 QR코드를 촬영하고 인증을 완료하면 스탬프가 적립됩니다.",
  startDate:"2026-07-01", endDate:"2026-10-31", status:"운영 중", startTime:"09:00", endTime:"18:00",
  completion:"count", requiredCount:"5", rewardNotice:"완주 확인 후 선착순으로 철원 관광 기념품을 보내드립니다.",
};

function Toggle({checked,onChange,label,disabled=false}:{checked:boolean;onChange:(v:boolean)=>void;label:string;disabled?:boolean}) {
  return <button type="button" className={`form-switch ${checked?"on":""}`} role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={()=>onChange(!checked)}><i/></button>;
}

function FieldLabel({children,required=false}:{children:React.ReactNode;required?:boolean}) {
  return <span className="form-label">{children}{required&&<b className="required-mark">필수</b>}</span>;
}

export default function StampTourForm({mode="create"}:{mode?:"create"|"edit"}) {
  const editing=mode==="edit";
  const seed=editing?editSeed:null;
  const [collapsed,setCollapsed]=useState(false); const [expanded,setExpanded]=useState(["스탬프투어 관리"]);
  const [toast,setToast]=useState(""); const [profileOpen,setProfileOpen]=useState(false); const [noticeOpen,setNoticeOpen]=useState(false);
  const [submitted,setSubmitted]=useState(false); const [saved,setSaved]=useState(false);
  const [name,setName]=useState(seed?.name||""); const [region,setRegion]=useState(seed?.region||""); const [department,setDepartment]=useState(seed?.department||""); const [manager,setManager]=useState(seed?.manager||"");
  const [intro,setIntro]=useState(seed?.intro||""); const [detail,setDetail]=useState(seed?.detail||""); const [imageName,setImageName]=useState("");
  const [startDate,setStartDate]=useState(seed?.startDate||""); const [endDate,setEndDate]=useState(seed?.endDate||""); const [status,setStatus]=useState(seed?.status||"운영 예정"); const [isPublic,setIsPublic]=useState(editing);
  const [startTime,setStartTime]=useState(seed?.startTime||"09:00"); const [endTime,setEndTime]=useState(seed?.endTime||"18:00"); const [afterView,setAfterView]=useState(true);
  const [oneEntry,setOneEntry]=useState(true); const [noDuplicateSpot,setNoDuplicateSpot]=useState(true); const [useLocation,setUseLocation]=useState(true); const [radius,setRadius]=useState("100"); const [under14,setUnder14]=useState(false);
  const [completion,setCompletion]=useState(seed?.completion||"all"); const [requiredCount,setRequiredCount]=useState(seed?.requiredCount||"");
  const [rewardEnabled,setRewardEnabled]=useState(true); const [immediateReward,setImmediateReward]=useState(true); const [rewardStart,setRewardStart]=useState(""); const [rewardEnd,setRewardEnd]=useState(""); const [noDuplicateReward,setNoDuplicateReward]=useState(true); const [shipping,setShipping]=useState(true); const [rewardNotice,setRewardNotice]=useState(seed?.rewardNotice||"");
  const [privacy,setPrivacy]=useState("스탬프투어 참여 및 완주 확인을 위해 이름, 휴대전화번호를 수집·이용합니다."); const [locationPolicy,setLocationPolicy]=useState("관광지 현장 인증 여부 확인을 위해 인증 시점의 위치정보를 이용합니다."); const [retention,setRetention]=useState("투어 종료 후 3개월"); const [optionalConsent,setOptionalConsent]=useState(false);
  const code=useMemo(()=>editing?"ST-2026-0001":`ST-2026-${String(8).padStart(4,"0")}`,[editing]);
  const errors={name:submitted&&!name.trim(),region:submitted&&!region,department:submitted&&!department,manager:submitted&&!manager,startDate:submitted&&!startDate,endDate:submitted&&!endDate,dateOrder:submitted&&!!startDate&&!!endDate&&startDate>endDate,requiredCount:submitted&&completion==="count"&&(!requiredCount||Number(requiredCount)<1),privacy:submitted&&!privacy.trim(),location:submitted&&useLocation&&!locationPolicy.trim()};
  const hasError=Object.values(errors).some(Boolean);
  const act=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),2200)};
  const toggleMenu=(label:string)=>setExpanded(v=>v.includes(label)?v.filter(x=>x!==label):[...v,label]);
  const goChild=(child:string)=>child==="스탬프투어 목록"?window.location.assign("/stamp-tours"):child==="관광지 관리"?window.location.assign("/stamp-tours/attractions"):child==="참여자·진행현황"?window.location.assign("/stamp-tours/participants"):child==="인증 이력"?window.location.assign("/stamp-tours/verifications"):child==="완주·경품 관리"?window.location.assign("/stamp-tours/rewards"):child==="통계"?window.location.assign("/stamp-tours/statistics"):child==="상품목록"?window.location.assign("/products"):act(`${child} 화면은 다음 단계에서 제공될 예정입니다.`);
  const saveDraft=()=>{const draft={name,region,department,manager,intro,detail,startDate,endDate,status,completion,requiredCount};localStorage.setItem("aos-stamp-tour-draft",JSON.stringify(draft));setSaved(true);act("임시저장되었습니다.");window.setTimeout(()=>setSaved(false),2400)};
  const submit=()=>{setSubmitted(true);if(hasError||!name.trim()||!region||!department||!manager||!startDate||!endDate||startDate>endDate||(completion==="count"&&(!requiredCount||Number(requiredCount)<1))||!privacy.trim()||(useLocation&&!locationPolicy.trim())){act("필수 입력 항목을 확인해 주세요.");window.setTimeout(()=>document.querySelector(".field-error")?.scrollIntoView({behavior:"smooth",block:"center"}),40);return}setSaved(true);act(editing?"스탬프투어 수정이 완료되었습니다.":"스탬프투어 등록이 완료되었습니다.");window.setTimeout(()=>window.location.assign("/stamp-tours"),1300)};
  const actionButtons=<><button type="button" className="secondary" onClick={()=>window.location.assign("/stamp-tours")}><X size={14}/>취소</button><button type="button" className="secondary draft-btn" onClick={saveDraft}><Save size={14}/>임시저장</button><button type="button" className="primary" onClick={submit}><Check size={15}/>{editing?"수정 완료":"등록 완료"}</button></>;

  return <div className={`app-shell ${collapsed?"is-collapsed":""}`}>
    <aside className="sidebar"><div className="brand"><div className="brand-mark">A</div><div className="brand-copy"><strong>AOS</strong><span>TRAVEL ERP</span></div><button className="collapse" onClick={()=>setCollapsed(!collapsed)} aria-label="사이드바 접기">‹</button></div><nav aria-label="관리자 메뉴">{menu.map(item=><div className="nav-group" key={item.label}><button className={`nav-item ${item.label==="스탬프투어 관리"?"active":""}`} onClick={()=>item.label==="대시보드"?window.location.assign("/"):item.children?toggleMenu(item.label):act(`${item.label} 화면으로 이동합니다.`)}><span className="nav-icon">{item.icon==="qr"?<QrCode size={16} strokeWidth={1.8}/>:item.icon}</span><span className="nav-label">{item.label}</span>{item.children&&<span className={`chevron ${expanded.includes(item.label)?"open":""}`}>⌄</span>}</button>{item.children&&expanded.includes(item.label)&&!collapsed&&<div className="subnav">{item.children.map(child=><button key={child} className={child==="스탬프투어 목록"?"current":""} onClick={()=>goChild(child)}>{child}</button>)}</div>}</div>)}</nav><div className="sidebar-help"><span className="nav-icon">?</span><div><strong>업무지원센터</strong><p>평일 09:00–18:00</p></div></div></aside>

    <div className="workspace"><header className="topbar"><div className="breadcrumb"><span>스탬프투어 관리</span><b>/</b><span>스탬프투어 목록</span><b>/</b><strong>{editing?"스탬프투어 수정":"스탬프투어 등록"}</strong></div><div className="top-actions"><label className="search"><span>⌕</span><input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색"/><kbd>⌘ K</kbd></label><button className="icon-btn" onClick={()=>act("업무지원센터를 엽니다.")}>?</button><div className="dropdown-wrap"><button className="icon-btn notice" aria-label="알림" onClick={()=>{setNoticeOpen(!noticeOpen);setProfileOpen(false)}}>♢<i>5</i></button>{noticeOpen&&<div className="dropdown notice-menu"><div className="drop-head"><strong>알림</strong><button onClick={()=>setNoticeOpen(false)}>모두 읽음</button></div><button><span className="alert-dot info"></span><span>새 스탬프 인증이 접수되었습니다.<small>방금 전</small></span></button></div>}</div><div className="divider"/><div className="dropdown-wrap"><button className="profile" onClick={()=>{setProfileOpen(!profileOpen);setNoticeOpen(false)}}><span className="avatar">장</span><span><b>애비아넥스트</b><small>관리자 장윤호</small></span><em>⌄</em></button>{profileOpen&&<div className="dropdown profile-menu"><button>내 정보</button><button>환경설정</button><hr/><button className="logout">로그아웃</button></div>}</div></div></header>

      <main className="content stamp-form-content"><section className="page-head stamp-form-page-head"><div><h1>{editing?"스탬프투어 수정":"스탬프투어 등록"}</h1><p>운영 기간과 인증·완주 조건을 설정합니다.</p></div><div className="top-form-actions">{actionButtons}</div></section>
        {submitted&&hasError&&<div className="form-alert field-error"><AlertCircle size={16}/><div><strong>입력 내용을 확인해 주세요.</strong><span>필수 항목 또는 입력 형식이 올바르지 않은 항목이 있습니다.</span></div></div>}

        <section className="panel form-section"><header><span className="section-number">1</span><div><h2>기본정보</h2><p>스탬프투어를 구분하고 모바일 스탬프북에 노출할 정보를 입력합니다.</p></div></header><div className="form-section-body form-grid three">
          <label className={`form-field span-2 ${errors.name?"invalid":""}`}><FieldLabel required>투어명</FieldLabel><input value={name} onChange={e=>setName(e.target.value)} placeholder="예: 철원 DMZ 평화관광 스탬프투어" maxLength={60}/>{errors.name?<small className="error-text">투어명을 입력해 주세요.</small>:<small>관리자 목록과 모바일 스탬프북에 동일하게 표시됩니다. ({name.length}/60)</small>}</label>
          <label className="form-field"><FieldLabel>투어 코드</FieldLabel><div className="readonly-input"><QrCode size={14}/>{code}<em>자동 생성</em></div><small>등록 완료 시 자동으로 부여됩니다.</small></label>
          <label className={`form-field ${errors.region?"invalid":""}`}><FieldLabel required>운영 지역</FieldLabel><select value={region} onChange={e=>setRegion(e.target.value)}><option value="">지역 선택</option><option>강원 철원군</option><option>경기 양평군</option><option>경기 고양시</option><option>인천 중구</option><option>경기 파주시</option></select>{errors.region&&<small className="error-text">운영 지역을 선택해 주세요.</small>}</label>
          <label className={`form-field ${errors.department?"invalid":""}`}><FieldLabel required>담당 부서</FieldLabel><input value={department} onChange={e=>setDepartment(e.target.value)} placeholder="예: 관광마케팅팀"/>{errors.department&&<small className="error-text">담당 부서를 입력해 주세요.</small>}</label>
          <label className={`form-field ${errors.manager?"invalid":""}`}><FieldLabel required>담당자</FieldLabel><input value={manager} onChange={e=>setManager(e.target.value)} placeholder="담당자 이름"/>{errors.manager&&<small className="error-text">담당자를 입력해 주세요.</small>}</label>
          <label className="form-field span-3"><FieldLabel>대표 이미지</FieldLabel><div className="image-upload"><span><FileImage size={22}/></span><div><strong>{imageName||"대표 이미지를 등록해 주세요."}</strong><small>JPG, PNG · 권장 1200×630px · 최대 5MB</small></div><input type="file" accept="image/png,image/jpeg" onChange={e=>setImageName(e.target.files?.[0]?.name||"")}/><button type="button" className="secondary">파일 선택</button></div></label>
          <label className="form-field span-3"><FieldLabel>모바일 스탬프북 소개문구</FieldLabel><textarea rows={2} value={intro} onChange={e=>setIntro(e.target.value)} maxLength={120} placeholder="참여자에게 보여줄 짧은 소개문구를 입력하세요."/><small>목록과 스탬프북 상단에 표시됩니다. ({intro.length}/120)</small></label>
          <label className="form-field span-3"><FieldLabel>상세 안내</FieldLabel><textarea rows={5} value={detail} onChange={e=>setDetail(e.target.value)} placeholder="참여방법, 유의사항, 문의처 등 상세 안내를 입력하세요."/><small>모바일 화면에서 읽기 쉽도록 문단을 나누어 작성해 주세요.</small></label>
        </div></section>

        <section className="panel form-section"><header><span className="section-number">2</span><div><h2>운영기간</h2><p>참여 가능 기간과 스탬프북 공개 범위를 설정합니다.</p></div></header><div className="form-section-body form-grid three">
          <label className={`form-field ${errors.startDate||errors.dateOrder?"invalid":""}`}><FieldLabel required>참여 시작일</FieldLabel><div className="icon-input"><CalendarDays size={14}/><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div>{errors.startDate&&<small className="error-text">참여 시작일을 선택해 주세요.</small>}</label>
          <label className={`form-field ${errors.endDate||errors.dateOrder?"invalid":""}`}><FieldLabel required>참여 종료일</FieldLabel><div className="icon-input"><CalendarDays size={14}/><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div>{errors.endDate?<small className="error-text">참여 종료일을 선택해 주세요.</small>:errors.dateOrder&&<small className="error-text">종료일은 시작일보다 빠를 수 없습니다.</small>}</label>
          <label className="form-field"><FieldLabel required>운영상태</FieldLabel><select value={status} onChange={e=>setStatus(e.target.value)}><option>운영 예정</option><option>운영 중</option><option>일시중지</option><option>운영 종료</option></select><small>기간과 별도로 관리자 설정이 우선 적용됩니다.</small></label>
          <div className="form-field"><FieldLabel>공개 여부</FieldLabel><div className="toggle-row"><Toggle checked={isPublic} onChange={setIsPublic} label="공개 여부"/><span><b>{isPublic?"공개":"비공개"}</b><small>모바일 스탬프북 노출 상태</small></span></div></div>
          <div className="form-field span-2"><FieldLabel>참여 가능 시간</FieldLabel><div className="time-range"><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}/><em>부터</em><input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}/><em>까지</em></div><small>설정 시간 외에는 관광지 인증이 제한됩니다.</small></div>
          <div className="form-field span-3 setting-row"><div><FieldLabel>기간 종료 후 스탬프북 조회 허용</FieldLabel><small>참여 종료 후에도 본인의 인증 내역과 완주 결과를 조회할 수 있습니다.</small></div><Toggle checked={afterView} onChange={setAfterView} label="종료 후 조회 허용"/></div>
        </div></section>

        <section className="panel form-section"><header><span className="section-number">3</span><div><h2>참여자 설정</h2><p>중복 참여 방지와 현장 인증 기준을 설정합니다.</p></div></header><div className="form-section-body settings-list">
          <div className="setting-row fixed"><div><FieldLabel>참여 방식</FieldLabel><small>참여자 식별과 중복 참여 방지를 위해 본인인증을 사용합니다.</small></div><span className="fixed-value"><UserCheck size={15}/>휴대전화 본인인증</span></div>
          {[["1인 1회 참여","한 명의 참여자는 동일 투어에 한 번만 참여할 수 있습니다.",oneEntry,setOneEntry],["동일 관광지 중복 인증 불가","한 관광지는 참여자당 한 번만 스탬프를 받을 수 있습니다.",noDuplicateSpot,setNoDuplicateSpot]].map(([title,help,value,setter])=><div className="setting-row" key={String(title)}><div><FieldLabel>{String(title)}</FieldLabel><small>{String(help)}</small></div><Toggle checked={Boolean(value)} onChange={setter as (v:boolean)=>void} label={String(title)}/></div>)}
          <div className="setting-row nested"><div><FieldLabel>위치정보 확인 사용</FieldLabel><small>QR 인증 시 참여자가 실제 관광지 반경 안에 있는지 확인합니다.</small></div><Toggle checked={useLocation} onChange={setUseLocation} label="위치정보 확인"/><div className={`nested-setting ${useLocation?"":"disabled"}`}><label><span>관광지 인증 허용 반경</span><div><input type="number" min="10" max="5000" value={radius} disabled={!useLocation} onChange={e=>setRadius(e.target.value)}/><b>m</b></div><small>권장 범위 50~200m · GPS 오차를 고려해 설정하세요.</small></label></div></div>
          <div className="setting-row"><div><FieldLabel>만 14세 미만 참여 허용</FieldLabel><small>허용 시 법정대리인 동의 절차가 필요할 수 있습니다.</small></div><Toggle checked={under14} onChange={setUnder14} label="만 14세 미만 참여"/></div>
        </div></section>

        <section className="panel form-section"><header><span className="section-number">4</span><div><h2>완주조건</h2><p>등록될 관광지 가운데 완주로 인정할 인증 기준을 선택합니다.</p></div></header><div className="form-section-body"><div className="condition-cards">
          {[{key:"all",title:"전체 관광지 인증",desc:"등록된 모든 관광지를 인증해야 완주 처리됩니다."},{key:"count",title:"지정 개수 이상 인증",desc:"전체 관광지 중 설정한 개수 이상 인증하면 완주 처리됩니다."},{key:"mixed",title:"필수 관광지 + 선택 관광지",desc:"필수 관광지를 포함해 지정한 수만큼 인증해야 합니다."}].map(item=><label className={`condition-card ${completion===item.key?"selected":""}`} key={item.key}><input type="radio" name="completion" checked={completion===item.key} onChange={()=>setCompletion(item.key)}/><span className="radio-mark">{completion===item.key&&<Check size={13}/>}</span><div><strong>{item.title}</strong><p>{item.desc}</p></div></label>)}
        </div>{completion==="count"&&<div className={`condition-detail ${errors.requiredCount?"invalid":""}`}><div className="auto-count"><span>전체 관광지 수</span><strong>관광지 등록 후 자동 계산</strong></div><label><FieldLabel required>완주 필요 개수</FieldLabel><div><input type="number" min="1" value={requiredCount} onChange={e=>setRequiredCount(e.target.value)} placeholder="예: 5"/><b>곳</b></div>{errors.requiredCount&&<small className="error-text">완주에 필요한 관광지 개수를 입력해 주세요.</small>}</label><div className="example-guide"><Info size={15}/><span><b>적용 예시</b>전체 8곳 중 {requiredCount||"5"}곳 이상 인증 시 완주</span></div></div>}{completion==="mixed"&&<div className="condition-note"><Info size={15}/>필수·선택 관광지는 관광지 등록 단계에서 지정할 수 있도록 준비됩니다.</div>}</div></section>

        <section className="panel form-section"><header><span className="section-number">5</span><div><h2>경품 설정</h2><p>완주자의 경품 신청 방식과 수집 정보를 설정합니다.</p></div></header><div className="form-section-body settings-list">
          <div className="setting-row"><div><FieldLabel>경품 신청 사용</FieldLabel><small>사용하지 않으면 완주만 표시하고 별도의 신청을 받지 않습니다.</small></div><Toggle checked={rewardEnabled} onChange={setRewardEnabled} label="경품 신청 사용"/></div>
          <div className={`reward-settings ${rewardEnabled?"":"disabled"}`}><div className="setting-row"><div><FieldLabel>완주 즉시 신청 가능</FieldLabel><small>완주 처리와 동시에 경품 신청 버튼을 표시합니다.</small></div><Toggle checked={immediateReward} onChange={setImmediateReward} label="완주 즉시 신청" disabled={!rewardEnabled}/></div><div className="setting-row date-setting"><div><FieldLabel>경품 신청기간</FieldLabel><small>기간을 비워두면 완주 직후부터 투어 종료일까지 신청 가능합니다.</small></div><div className="compact-date-range"><input type="date" disabled={!rewardEnabled} value={rewardStart} onChange={e=>setRewardStart(e.target.value)}/><em>~</em><input type="date" disabled={!rewardEnabled} value={rewardEnd} onChange={e=>setRewardEnd(e.target.value)}/></div></div><div className="setting-row"><div><FieldLabel>중복 신청 불가</FieldLabel><small>한 참여자가 같은 투어 경품을 한 번만 신청할 수 있습니다.</small></div><Toggle checked={noDuplicateReward} onChange={setNoDuplicateReward} label="중복 신청 불가" disabled={!rewardEnabled}/></div><div className="setting-row"><div><FieldLabel>배송지 수집</FieldLabel><small>이름, 연락처 외에 경품 배송을 위한 주소를 수집합니다.</small></div><Toggle checked={shipping} onChange={setShipping} label="배송지 수집" disabled={!rewardEnabled}/></div><label className="form-field reward-notice"><FieldLabel>경품 안내문</FieldLabel><textarea rows={4} disabled={!rewardEnabled} value={rewardNotice} onChange={e=>setRewardNotice(e.target.value)} placeholder="경품 구성, 지급 일정, 유의사항을 입력하세요."/></label></div>
        </div></section>

        <section className="panel form-section"><header><span className="section-number">6</span><div><h2>개인정보 안내</h2><p>참여 전 노출할 개인정보 및 위치정보 동의 내용을 설정합니다.</p></div></header><div className="form-section-body form-grid two">
          <label className={`form-field ${errors.privacy?"invalid":""}`}><FieldLabel required>개인정보 수집·이용 안내</FieldLabel><span className="consent-kind required">필수 동의</span><textarea rows={6} value={privacy} onChange={e=>setPrivacy(e.target.value)} />{errors.privacy?<small className="error-text">개인정보 수집·이용 안내를 입력해 주세요.</small>:<small>수집 항목, 이용 목적을 구체적으로 작성해 주세요.</small>}</label>
          <label className={`form-field ${errors.location?"invalid":""}`}><FieldLabel required={useLocation}>위치정보 이용 안내</FieldLabel><span className={`consent-kind ${useLocation?"required":"optional"}`}>{useLocation?"필수 동의":"선택 동의"}</span><textarea rows={6} disabled={!useLocation} value={locationPolicy} onChange={e=>setLocationPolicy(e.target.value)} />{errors.location?<small className="error-text">위치정보 이용 안내를 입력해 주세요.</small>:<small>위치 확인을 사용하는 경우 인증 전에 필수 동의를 받습니다.</small>}</label>
          <label className="form-field"><FieldLabel required>개인정보 보관기간</FieldLabel><select value={retention} onChange={e=>setRetention(e.target.value)}><option>투어 종료 후 1개월</option><option>투어 종료 후 3개월</option><option>투어 종료 후 6개월</option><option>투어 종료 후 1년</option><option>경품 배송 완료 후 즉시 파기</option></select><small>목적 달성 후 지체 없이 파기하도록 운영 기준을 확인하세요.</small></label>
          <div className="form-field"><FieldLabel>선택 동의 구분</FieldLabel><div className="optional-consent"><Toggle checked={optionalConsent} onChange={setOptionalConsent} label="선택 동의 항목 추가"/><span><b>관광정보·이벤트 안내 수신</b><small>참여 여부와 무관한 선택 동의로 분리합니다.</small></span><span className="consent-kind optional">선택 동의</span></div></div>
        </div></section>

        <div className="sticky-action-bar"><div><ShieldCheck size={16}/><span><b>{editing?"수정 내용을 확인해 주세요.":"필수 항목을 모두 입력해 주세요."}</b><small>등록 후 관광지와 QR코드를 다음 단계에서 설정할 수 있습니다.</small></span>{saved&&<em><Check size={13}/>저장됨</em>}</div><div>{actionButtons}</div></div><footer>© 2026 AOS Travel ERP · AviaNext</footer>
      </main></div>{toast&&<div className="toast"><span>✓</span>{toast}</div>}
  </div>;
}
