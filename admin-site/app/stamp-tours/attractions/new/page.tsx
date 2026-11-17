"use client";

import { stampTourMenuItem, goStampTourChild } from "../../_data/stampTourNav";
import { getSpotsByTourId, mockSpots, mockTours } from "../../_data/mockStampTours";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarDays, Check, Download, Eye, FileImage, Info,
  MapPin, Percent, Printer, QrCode, RefreshCw, Save, ShieldCheck, TicketPercent, X,
} from "lucide-react";

type PlaceType = "attraction" | "experience" | "restaurant";
type DiscountType = "fixed" | "rate";
type MoneyValue = number | "";

const PLACE_TYPE_OPTIONS: { value: PlaceType; label: string }[] = [
  { value: "attraction", label: "관광지" },
  { value: "experience", label: "체험" },
  { value: "restaurant", label: "식당" },
];

const menu:{icon:string;label:string;children?:string[]}[]=[
  {icon:"▦",label:"대시보드"},{icon:"◇",label:"상품관리",children:["상품목록","상품등록","일정표관리","요금관리"]},{icon:"▤",label:"예약관리",children:["예약접수현황","예약달력"]},{icon:"₩",label:"결제관리",children:["결제현황","취소/환불"]},{icon:"⇄",label:"정산관리",children:["정산현황","판매점정산","공급사정산"]},{icon:"♙",label:"회원관리",children:["웹회원","제휴여행사","판매점관리","관리자/직원","그룹/권한"]},{icon:"⌂",label:"거래처관리"},stampTourMenuItem(),{icon:"▥",label:"통계관리"},{icon:"◎",label:"운영관리",children:["팝업관리","알림관리","알림톡"]},{icon:"⚙",label:"시스템설정",children:["홈페이지설정","결제설정","기본설정"]},
];

function Toggle({checked,onChange,label}:{checked:boolean;onChange:(value:boolean)=>void;label:string}){
  return <button type="button" className={`form-switch ${checked?"on":""}`} role="switch" aria-checked={checked} aria-label={label} onClick={()=>onChange(!checked)}><i/></button>;
}

function FieldLabel({children,required=false}:{children:React.ReactNode;required?:boolean}){
  return <span className="form-label">{children}{required&&<b className="required-mark">필수</b>}</span>;
}

function parsePositiveInt(raw: string): MoneyValue {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits);
}

function formatWon(value: MoneyValue | null | undefined) {
  if (value === "" || value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value.toLocaleString("ko-KR")}원`;
}

function formatRate(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

function moneyInputDisplay(value: MoneyValue) {
  return value === "" ? "" : value.toLocaleString("ko-KR");
}

export default function AttractionFormPage(){
  const [editing,setEditing]=useState(false);
  const [collapsed,setCollapsed]=useState(false);const [expanded,setExpanded]=useState(["스탬프투어 관리"]);const [toast,setToast]=useState("");const [profileOpen,setProfileOpen]=useState(false);const [noticeOpen,setNoticeOpen]=useState(false);
  const [submitted,setSubmitted]=useState(false);const [saved,setSaved]=useState(editing);const [qrOpen,setQrOpen]=useState(false);const [confirmReissue,setConfirmReissue]=useState(false);const [qrActive,setQrActive]=useState(true);const [createdAt,setCreatedAt]=useState("2026.08.20 14:32");
  const [tourId,setTourId]=useState<number>(mockTours[0].id);const [spotCode,setSpotCode]=useState("");const [name,setName]=useState("");const [imageName,setImageName]=useState("");const [description,setDescription]=useState("");const [visible,setVisible]=useState(true);const [operation,setOperation]=useState("운영 중");
  const [placeType,setPlaceType]=useState<PlaceType>("attraction");
  const [discountEnabled,setDiscountEnabled]=useState(false);
  const [discountType,setDiscountType]=useState<DiscountType>("fixed");
  const [regularPrice,setRegularPrice]=useState<MoneyValue>("");
  const [discountAmount,setDiscountAmount]=useState<MoneyValue>("");
  const [discountRate,setDiscountRate]=useState<MoneyValue>("");
  const [discountSubmitted,setDiscountSubmitted]=useState(false);
  const [previewOpen,setPreviewOpen]=useState(false);
  const [address,setAddress]=useState("");const [detailAddress,setDetailAddress]=useState("");const [latitude,setLatitude]=useState("38.146734");const [longitude,setLongitude]=useState("127.313112");const [hours,setHours]=useState("09:00 ~ 18:00");const [closed,setClosed]=useState("연중무휴");const [phone,setPhone]=useState("");const [directions,setDirections]=useState("");const [parking,setParking]=useState("");
  const [qrEnabled,setQrEnabled]=useState(true);const [authStart,setAuthStart]=useState("2026-08-01T09:00");const [authEnd,setAuthEnd]=useState("2026-10-31T18:00");const [authFrom,setAuthFrom]=useState("09:00");const [authTo,setAuthTo]=useState("18:00");const [gps,setGps]=useState(true);const [radius,setRadius]=useState("100");const [customRadius,setCustomRadius]=useState("");const [noDuplicate,setNoDuplicate]=useState(true);const [outsideHours,setOutsideHours]=useState(false);
  useEffect(()=>{const params=new URLSearchParams(window.location.search);const timer=window.setTimeout(()=>{const queryTour=Number(params.get("tourId"));if(mockTours.some(row=>row.id===queryTour))setTourId(queryTour);if(params.get("mode")!=="edit")return;const spot=mockSpots.find(row=>row.id===params.get("id"));if(!spot)return;setEditing(true);setSaved(true);setTourId(spot.tourId);setSpotCode(spot.code);setName(spot.name);setAddress(spot.address);setOperation(spot.operation);setVisible(spot.visible);setRadius(String(spot.radius))},0);return()=>window.clearTimeout(timer)},[]);
  const tour=mockTours.find(row=>row.id===tourId)?.name??"";
  const code=useMemo(()=>editing&&spotCode?spotCode:`SPOT-${tourId}${String(getSpotsByTourId(tourId).length+1).padStart(2,"0")}`,[editing,spotCode,tourId]);
  const placeTypeLabel=PLACE_TYPE_OPTIONS.find(row=>row.value===placeType)?.label??"관광지";
  const computedAmount=useMemo(()=>{
    if(discountType==="fixed")return typeof discountAmount==="number"?discountAmount:null;
    if(typeof regularPrice!=="number"||typeof discountRate!=="number")return null;
    return Math.round(regularPrice*(discountRate/100));
  },[discountType,discountAmount,regularPrice,discountRate]);
  const computedRate=useMemo(()=>{
    if(discountType==="rate")return typeof discountRate==="number"?discountRate:null;
    if(typeof regularPrice!=="number"||typeof discountAmount!=="number"||regularPrice<=0)return null;
    return (discountAmount/regularPrice)*100;
  },[discountType,discountRate,regularPrice,discountAmount]);
  const discountedPrice=useMemo(()=>{
    if(typeof regularPrice!=="number"||computedAmount===null)return null;
    return regularPrice-computedAmount;
  },[regularPrice,computedAmount]);
  const discountErrors=useMemo(()=>{
    if(!discountEnabled)return [] as string[];
    const errors:string[]=[];
    if(regularPrice==="")errors.push("정상가를 입력해 주세요.");
    else if(typeof regularPrice!=="number"||!Number.isInteger(regularPrice)||regularPrice<=0)errors.push("정상가는 0보다 큰 정수여야 합니다.");
    if(discountType==="fixed"){
      if(discountAmount==="")errors.push("할인금액을 입력해 주세요.");
      else if(typeof discountAmount!=="number"||!Number.isInteger(discountAmount)||discountAmount<=0)errors.push("할인금액은 0보다 큰 정수여야 합니다.");
      else if(typeof regularPrice==="number"&&discountAmount>=regularPrice)errors.push("할인금액은 정상가보다 작아야 합니다.");
    }else{
      if(discountRate==="")errors.push("할인율을 입력해 주세요.");
      else if(typeof discountRate!=="number"||discountRate<=0||discountRate>=100)errors.push("할인율은 0보다 크고 100보다 작아야 합니다.");
    }
    if(errors.length===0&&(discountedPrice===null||discountedPrice<0))errors.push("최종 할인가는 0원 이상이어야 합니다.");
    return errors;
  },[discountEnabled,regularPrice,discountType,discountAmount,discountRate,discountedPrice]);
  const discountValid=discountEnabled&&discountErrors.length===0;
  const showDiscountPreview=discountEnabled&&(previewOpen||discountValid)&&discountValid;
  const invalidName=submitted&&!name.trim(),invalidAddress=submitted&&!address.trim(),invalidTour=submitted&&!tourId;
  const showDiscountErrors=discountEnabled&&discountSubmitted&&discountErrors.length>0;
  const act=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),2400)};
  const toggleMenu=(label:string)=>setExpanded(v=>v.includes(label)?v.filter(x=>x!==label):[...v,label]);
  const goChild=(child:string)=>goStampTourChild(child,act);
  const toggleDiscountEnabled=(value:boolean)=>{setDiscountEnabled(value);if(!value){setDiscountSubmitted(false);setPreviewOpen(false)}};
  const previewDiscount=()=>{setDiscountSubmitted(true);if(discountErrors.length){act("할인 설정 입력값을 확인해 주세요.");window.setTimeout(()=>document.querySelector(".discount-error-panel")?.scrollIntoView({behavior:"smooth",block:"center"}),50);return}setPreviewOpen(true);act("현장 할인 미리보기를 확인했습니다. (샘플)")};
  const save=()=>{setSubmitted(true);if(discountEnabled){setDiscountSubmitted(true);if(discountErrors.length){act("할인 설정 입력값을 확인해 주세요.");window.setTimeout(()=>document.querySelector(".discount-error-panel,.field-error")?.scrollIntoView({behavior:"smooth",block:"center"}),50);return}}if(!tourId||!name.trim()||!address.trim()){act("필수 입력 항목을 확인해 주세요.");window.setTimeout(()=>document.querySelector(".field-error")?.scrollIntoView({behavior:"smooth",block:"center"}),50);return}if(discountValid)setPreviewOpen(true);setSaved(true);act("샘플 화면에 반영했습니다. 이제 QR코드를 생성할 수 있습니다.")};
  const createQr=()=>{setCreatedAt(new Date().toLocaleString("ko-KR"));setQrOpen(true);act("QR 프로토타입을 생성했습니다. (샘플 화면)")};
  const download=(kind:"qr"|"print")=>{const content=kind==="qr"?`AOS QR PROTOTYPE\n${tour}\n${name}\n${code}`:`AOS 관광지 인증 안내판\n${tour}\n${name}\n관광지 코드: ${code}`;const blob=new Blob([content],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=kind==="qr"?`${code}-qr.txt`:`${code}-print-guide.txt`;link.click();URL.revokeObjectURL(url);act(kind==="qr"?"QR 이미지 샘플을 다운로드했습니다.":"인쇄용 안내판 샘플을 다운로드했습니다.");};
  const reissue=()=>{setCreatedAt("2026.08.20 16:10");setQrActive(true);setConfirmReissue(false);act("새 QR코드가 재발급되었습니다. 기존 QR은 사용할 수 없습니다.");};
  const actionButtons=<><button className="secondary" type="button" onClick={()=>window.location.assign("/stamp-tours/attractions")}><X size={14}/>취소</button><button className="primary" type="button" onClick={save}><Save size={14}/>{editing?"수정 완료":"저장"}</button>{saved&&<button className="qr-create-button" type="button" onClick={createQr}><QrCode size={14}/>QR코드 생성</button>}</>;
  const authCardStyle:React.CSSProperties={minWidth:0,minHeight:105,padding:13,border:"1px solid #d9e1ea",borderRadius:7,background:"#fff",display:"grid",alignContent:"center",gap:9};

  return <div className={`app-shell ${collapsed?"is-collapsed":""}`}>
    <aside className="sidebar"><div className="brand"><div className="brand-mark">A</div><div className="brand-copy"><strong>AOS</strong><span>TRAVEL ERP</span></div><button className="collapse" onClick={()=>setCollapsed(!collapsed)} aria-label="사이드바 접기">‹</button></div><nav aria-label="관리자 메뉴">{menu.map(item=><div className="nav-group" key={item.label}><button className={`nav-item ${item.label==="스탬프투어 관리"?"active":""}`} onClick={()=>item.label==="대시보드"?window.location.assign("/"):item.children?toggleMenu(item.label):act(`${item.label} 화면으로 이동합니다.`)}><span className="nav-icon">{item.icon==="qr"?<QrCode size={16} strokeWidth={1.8}/>:item.icon}</span><span className="nav-label">{item.label}</span>{item.children&&<span className={`chevron ${expanded.includes(item.label)?"open":""}`}>⌄</span>}</button>{item.children&&expanded.includes(item.label)&&!collapsed&&<div className="subnav">{item.children.map(child=><button key={child} className={child==="관광지 관리"?"current":""} onClick={()=>goChild(child)}>{child}</button>)}</div>}</div>)}</nav><div className="sidebar-help"><span className="nav-icon">?</span><div><strong>업무지원센터</strong><p>평일 09:00–18:00</p></div></div></aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><span>스탬프투어 관리</span><b>/</b><span>관광지 관리</span><b>/</b><strong>{editing?"관광지 수정":"관광지 등록"}</strong></div><div className="top-actions"><label className="search"><span>⌕</span><input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색"/><kbd>⌘ K</kbd></label><button className="icon-btn" onClick={()=>act("업무지원센터를 엽니다.")}>?</button><div className="dropdown-wrap"><button className="icon-btn notice" onClick={()=>{setNoticeOpen(!noticeOpen);setProfileOpen(false)}}>♢<i>5</i></button>{noticeOpen&&<div className="dropdown notice-menu"><div className="drop-head"><strong>알림</strong><button onClick={()=>setNoticeOpen(false)}>모두 읽음</button></div><button><span className="alert-dot info"/><span>새 관광지 인증이 접수되었습니다.<small>방금 전</small></span></button></div>}</div><div className="divider"/><div className="dropdown-wrap"><button className="profile" onClick={()=>{setProfileOpen(!profileOpen);setNoticeOpen(false)}}><span className="avatar">장</span><span><b>애비아넥스트</b><small>관리자 장윤호</small></span><em>⌄</em></button>{profileOpen&&<div className="dropdown profile-menu"><button>내 정보</button><button>환경설정</button><hr/><button className="logout">로그아웃</button></div>}</div></div></header>
      <main className="content stamp-form-content attraction-form-content"><section className="page-head stamp-form-page-head"><div><h1>{editing?"관광지 수정":"관광지 등록"}</h1><p>투어에 소속될 인증 관광지와 현장 QR·위치 기준을 설정합니다.</p></div><div className="top-form-actions">{actionButtons}</div></section>
        {submitted&&(invalidName||invalidAddress||invalidTour)&&<div className="form-alert field-error"><AlertTriangle size={16}/><div><strong>입력 내용을 확인해 주세요.</strong><span>필수 항목을 입력한 뒤 다시 저장해 주세요.</span></div></div>}

        <section className="panel form-section attraction-basic-section"><header><span className="section-number">1</span><div><h2>기본정보</h2><p>모바일 스탬프북에 노출할 관광지 정보를 입력합니다.</p></div></header><div className="form-section-body attraction-basic-grid">
          <label className={`form-field basic-tour ${invalidTour?"invalid":""}`}><FieldLabel required>소속 스탬프투어</FieldLabel><select value={tourId} onChange={e=>setTourId(Number(e.target.value))}>{mockTours.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select>{invalidTour&&<small className="error-text">소속 스탬프투어를 선택해 주세요.</small>}</label>
          <div className="form-field basic-code"><FieldLabel required>관광지 코드</FieldLabel><div className="readonly-input"><QrCode size={14}/>{code}<em>자동 생성</em></div></div>
          <label className="form-field basic-operation"><FieldLabel required>운영상태</FieldLabel><select value={operation} onChange={e=>setOperation(e.target.value)}><option>운영 중</option><option>운영 중지</option><option>운영 예정</option></select></label>
          <div className="form-field basic-visibility"><FieldLabel required>공개 여부</FieldLabel><div className="toggle-row"><Toggle checked={visible} onChange={setVisible} label="공개 여부"/><span><b>{visible?"공개":"비공개"}</b></span></div></div>
          <label className="form-field basic-place-type"><FieldLabel required>장소 유형</FieldLabel><select value={placeType} onChange={e=>setPlaceType(e.target.value as PlaceType)}>{PLACE_TYPE_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className={`form-field basic-name ${invalidName?"invalid":""}`}><FieldLabel required>관광지명</FieldLabel><input value={name} onChange={e=>setName(e.target.value)} maxLength={60} placeholder="예: 고석정"/>{invalidName&&<small className="error-text">관광지명을 입력해 주세요.</small>}</label>
          <label className="form-field basic-image"><FieldLabel required>대표 이미지</FieldLabel><div className="image-upload"><span><FileImage size={22}/></span><div><strong>{imageName||"파일 선택"}</strong><small>JPG, PNG · 권장 1200×800px · 최대 5MB</small></div><input type="file" accept="image/png,image/jpeg" onChange={e=>setImageName(e.target.files?.[0]?.name||"")}/><button type="button" className="secondary" onClick={e=>(e.currentTarget.previousElementSibling as HTMLInputElement)?.click()}>파일 선택</button></div></label>
          <label className="form-field basic-description"><FieldLabel required>관광지 소개</FieldLabel><textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} maxLength={500} placeholder="관광지의 특징과 방문 안내를 입력하세요."/><small>{description.length}/500</small></label>
        </div></section>

        <section className="panel form-section visit-info-section"><header><span className="section-number">2</span><div><h2>위치 및 방문정보</h2><p>현장 위치 확인과 참여자 방문에 필요한 정보를 입력합니다.</p></div></header><div className="form-section-body visit-info-layout" style={{display:"grid",gridTemplateColumns:"minmax(0,1.9fr) minmax(260px,.9fr)",gap:18,alignItems:"stretch"}}>
          <div className="visit-fields-grid" style={{display:"grid",gridTemplateColumns:"repeat(12,minmax(0,1fr))",gap:"14px 10px",alignContent:"start",minWidth:0}}>
            <label className={`form-field visit-address ${invalidAddress?"invalid":""}`} style={{gridColumn:"span 8"}}><FieldLabel required>주소</FieldLabel><div className="address-input"><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="도로명 주소를 검색하세요"/><button type="button" className="secondary" onClick={()=>{setAddress("강원특별자치도 철원군 동송읍 태봉로 1825");setLatitude("38.185654");setLongitude("127.288321");act("샘플 주소와 지도 위치를 적용했습니다.");}}><MapPin size={13}/>주소 검색</button></div>{invalidAddress&&<small className="error-text">주소를 입력해 주세요.</small>}</label>
            <label className="form-field visit-detail-address" style={{gridColumn:"span 4"}}><FieldLabel>상세주소</FieldLabel><input value={detailAddress} onChange={e=>setDetailAddress(e.target.value)} placeholder="건물명, 층 등"/></label>
            <label className="form-field visit-latitude" style={{gridColumn:"span 2"}}><FieldLabel required>위도</FieldLabel><input value={latitude} onChange={e=>setLatitude(e.target.value)} inputMode="decimal"/></label>
            <label className="form-field visit-longitude" style={{gridColumn:"span 2"}}><FieldLabel required>경도</FieldLabel><input value={longitude} onChange={e=>setLongitude(e.target.value)} inputMode="decimal"/></label>
            <label className="form-field visit-hours" style={{gridColumn:"span 2"}}><FieldLabel>운영시간</FieldLabel><input value={hours} onChange={e=>setHours(e.target.value)} placeholder="예: 09:00 ~ 18:00"/></label>
            <label className="form-field visit-closed" style={{gridColumn:"span 2"}}><FieldLabel>휴무일</FieldLabel><input value={closed} onChange={e=>setClosed(e.target.value)} placeholder="예: 매주 월요일"/></label>
            <label className="form-field visit-phone" style={{gridColumn:"span 4"}}><FieldLabel>관광지 연락처</FieldLabel><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="예: 033-450-5559"/></label>
            <label className="form-field visit-directions" style={{gridColumn:"span 7"}}><FieldLabel>찾아가는 방법</FieldLabel><textarea rows={3} style={{height:72,minHeight:72,resize:"none"}} value={directions} onChange={e=>setDirections(e.target.value)} placeholder="대중교통 및 주요 경로를 입력하세요."/></label>
            <label className="form-field visit-parking" style={{gridColumn:"span 5"}}><FieldLabel>주차 안내</FieldLabel><textarea rows={3} style={{height:72,minHeight:72,resize:"none"}} value={parking} onChange={e=>setParking(e.target.value)} placeholder="주차장 위치와 이용 조건을 입력하세요."/></label>
          </div>
          <div className="form-field visit-map-field" style={{paddingLeft:18,borderLeft:"1px solid #e1e6ed",gridTemplateRows:"auto 1fr"}}><FieldLabel>지도 위치 미리보기</FieldLabel><div className="mini-map visit-map" style={{width:"100%",height:"100%",minHeight:238}}><MapPin size={27}/><span><i/><b>{name||"관광지 위치"}</b><small>{latitude}, {longitude}</small></span></div></div>
        </div></section>

        <section className="panel form-section auth-settings-section"><header><span className="section-number">3</span><div><h2>인증 설정</h2><p>QR 인증 기간과 GPS 위치 확인 기준을 설정합니다.</p></div></header><div className="form-section-body auth-settings-grid" style={{display:"grid",gridTemplateColumns:"repeat(12,minmax(0,1fr))",gap:10}}>
          <div className="auth-setting-card auth-toggle-card" style={{...authCardStyle,gridColumn:"span 3"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><FieldLabel>QR 인증 사용 여부</FieldLabel><Toggle checked={qrEnabled} onChange={setQrEnabled} label="QR 인증 사용"/></div><small>QR 인증을 사용합니다.</small></div>
          <div className="auth-setting-card auth-toggle-card" style={{...authCardStyle,gridColumn:"span 3"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><FieldLabel>GPS 위치 확인 사용 여부</FieldLabel><Toggle checked={gps} onChange={setGps} label="GPS 위치 확인"/></div><small>QR 인증 시 위치를 확인합니다.</small></div>
          <div className="auth-setting-card auth-toggle-card" style={{...authCardStyle,gridColumn:"span 3"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><FieldLabel>동일 참여자 중복 인증 불가</FieldLabel><Toggle checked={noDuplicate} onChange={setNoDuplicate} label="중복 인증 불가"/></div><small>같은 관광지 중복 인증을 제한합니다.</small></div>
          <div className="auth-setting-card auth-toggle-card" style={{...authCardStyle,gridColumn:"span 3"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><FieldLabel>운영시간 외 인증 허용 여부</FieldLabel><Toggle checked={outsideHours} onChange={setOutsideHours} label="운영시간 외 인증"/></div><small>운영시간 밖 인증을 허용합니다.</small></div>
          <div className={`auth-setting-card auth-radius-card ${gps?"":"disabled"}`} style={{...authCardStyle,gridColumn:"span 4"}}><FieldLabel>인증 허용 반경</FieldLabel><small>GPS 오차를 고려해 100~200m를 권장합니다.</small><div className="radius-options">{["100","200","300","custom"].map(value=><button type="button" key={value} className={radius===value?"selected":""} onClick={()=>setRadius(value)}>{value==="custom"?"직접 입력":`${value}m`}</button>)}{radius==="custom"&&<label><input type="number" min="10" max="5000" value={customRadius} onChange={e=>setCustomRadius(e.target.value)} placeholder="반경"/><b>m</b></label>}</div></div>
          <div className="auth-setting-card auth-period-card" style={{...authCardStyle,gridColumn:"span 5"}}><FieldLabel>인증 시작·종료일시</FieldLabel><small>스탬프투어 운영기간 안에서 설정해 주세요.</small><div className="date-time-range"><div><CalendarDays size={13}/><input type="datetime-local" value={authStart} onChange={e=>setAuthStart(e.target.value)}/></div><em>~</em><div><CalendarDays size={13}/><input type="datetime-local" value={authEnd} onChange={e=>setAuthEnd(e.target.value)}/></div></div></div>
          <div className="auth-setting-card auth-time-card" style={{...authCardStyle,gridColumn:"span 3"}}><FieldLabel>인증 가능 시간</FieldLabel><small>매일 반복 적용됩니다.</small><div className="time-range"><input type="time" value={authFrom} onChange={e=>setAuthFrom(e.target.value)}/><em>부터</em><input type="time" value={authTo} onChange={e=>setAuthTo(e.target.value)}/><em>까지</em></div></div>
        </div></section>

        <section className="panel form-section discount-settings-section"><header><span className="section-number">4</span><div><h2>현장 할인 설정</h2><p>방문 인증 후 현장에서 바로 사용할 수 있는 할인입니다.</p></div></header><div className="form-section-body discount-settings-body">
          <div className="discount-enable-row">
            <div>
              <strong>현장 할인 적용</strong>
              <p>방문 인증 후 현장에서 바로 사용할 수 있는 할인입니다.</p>
            </div>
            <div className="toggle-row"><Toggle checked={discountEnabled} onChange={toggleDiscountEnabled} label="현장 할인 적용"/><span><b>{discountEnabled?"ON":"OFF"}</b></span></div>
          </div>

          {discountEnabled&&<>
            <div className="discount-fields-grid">
              <label className={`form-field ${showDiscountErrors&&regularPrice===""?"invalid":""}`}>
                <FieldLabel required>정상가</FieldLabel>
                <div className="discount-unit-input"><input value={moneyInputDisplay(regularPrice)} onChange={e=>{setRegularPrice(parsePositiveInt(e.target.value));setPreviewOpen(false)}} inputMode="numeric" placeholder="예: 10,000"/><b>원</b></div>
              </label>
              <div className="form-field">
                <FieldLabel required>할인 방식</FieldLabel>
                <div className="discount-type-options" role="radiogroup" aria-label="할인 방식">
                  <button type="button" className={discountType==="fixed"?"selected":""} onClick={()=>{setDiscountType("fixed");setPreviewOpen(false)}}><TicketPercent size={14}/>정액 할인</button>
                  <button type="button" className={discountType==="rate"?"selected":""} onClick={()=>{setDiscountType("rate");setPreviewOpen(false)}}><Percent size={14}/>정률 할인</button>
                </div>
              </div>
              {discountType==="fixed"?<>
                <label className={`form-field ${showDiscountErrors&&(discountAmount===""||(typeof regularPrice==="number"&&typeof discountAmount==="number"&&discountAmount>=regularPrice))?"invalid":""}`}>
                  <FieldLabel required>할인금액</FieldLabel>
                  <div className="discount-unit-input"><input value={moneyInputDisplay(discountAmount)} onChange={e=>{setDiscountAmount(parsePositiveInt(e.target.value));setPreviewOpen(false)}} inputMode="numeric" placeholder="예: 2,000"/><b>원</b></div>
                </label>
                <div className="form-field">
                  <FieldLabel>할인율</FieldLabel>
                  <div className="discount-readonly">{formatRate(computedRate)}</div>
                </div>
              </>:<>
                <label className={`form-field ${showDiscountErrors&&(discountRate===""||(typeof discountRate==="number"&&(discountRate<=0||discountRate>=100)))?"invalid":""}`}>
                  <FieldLabel required>할인율</FieldLabel>
                  <div className="discount-unit-input"><input value={discountRate===""?"":String(discountRate)} onChange={e=>{setDiscountRate(parsePositiveInt(e.target.value));setPreviewOpen(false)}} inputMode="numeric" placeholder="예: 10"/><b>%</b></div>
                </label>
                <div className="form-field">
                  <FieldLabel>할인금액</FieldLabel>
                  <div className="discount-readonly">{formatWon(computedAmount)}</div>
                </div>
              </>}
              <div className="form-field discount-final-field">
                <FieldLabel>최종 할인가</FieldLabel>
                <div className="discount-readonly highlight">{formatWon(discountedPrice)}</div>
              </div>
            </div>

            {showDiscountErrors&&<div className="form-alert field-error discount-error-panel"><AlertTriangle size={16}/><div><strong>할인 설정을 확인해 주세요.</strong><ul>{discountErrors.map(message=><li key={message}>{message}</li>)}</ul></div></div>}

            <div className="discount-preview-actions">
              <button type="button" className="secondary discount-preview-button" onClick={previewDiscount}><Eye size={14}/>할인 설정 미리보기</button>
              <small>샘플 확인용이며 DB·API에 저장되지 않습니다.</small>
            </div>

            {showDiscountPreview&&<div className="discount-preview-card" aria-live="polite">
              <div className="discount-preview-head"><TicketPercent size={16}/><div><strong>현장 할인 안내</strong><span>{placeTypeLabel} · {name.trim()||"장소명 미입력"}</span></div></div>
              <dl>
                <div><dt>정상가</dt><dd>{formatWon(regularPrice)}</dd></div>
                {discountType==="fixed"?<>
                  <div><dt>할인금액</dt><dd>{formatWon(computedAmount)}</dd></div>
                  <div><dt>할인율</dt><dd>{formatRate(computedRate)}</dd></div>
                </>:<>
                  <div><dt>할인율</dt><dd>{formatRate(computedRate)}</dd></div>
                  <div><dt>할인금액</dt><dd>{formatWon(computedAmount)}</dd></div>
                </>}
                <div><dt>최종 할인가</dt><dd>{formatWon(discountedPrice)}</dd></div>
              </dl>
              <p>{discountType==="fixed"
                ? `방문 인증 후 현장에서 ${formatWon(computedAmount)} 할인받을 수 있습니다.`
                : `방문 인증 후 현장에서 ${formatRate(computedRate)} 할인받을 수 있습니다.`}</p>
            </div>}
          </>}
        </div></section>

        <div className="sticky-action-bar"><div><ShieldCheck size={18}/><span><b>저장 후 QR코드를 생성할 수 있습니다.</b><small>입력한 위치와 인증 기준은 QR 활성화 즉시 적용됩니다.</small></span>{saved&&<em><Check size={11}/>저장 완료</em>}</div><div>{actionButtons}</div></div>
        <footer>© 2026 AOS Travel ERP · AviaNext</footer>
      </main>
    </div>

    {qrOpen&&<div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="QR코드 발급 결과"><div className="qr-result-modal"><div className="modal-head"><div><QrCode size={18}/><h3>QR코드 발급 결과</h3></div><button onClick={()=>setQrOpen(false)} aria-label="닫기">×</button></div><div className="qr-result-body"><div className="qr-result-preview"><div className="prototype-qr" aria-label="QR코드 디자인 미리보기">{Array.from({length:81},(_,i)=><i className={(i%5===0||i%7===0||[1,2,10,11,63,64,72,73].includes(i))?"on":""} key={i}/>)}</div><span className={`badge ${qrActive?"success":"gray"}`}>{qrActive?"QR 활성":"QR 비활성"}</span><small>관리자 UI 확인용 QR 프로토타입</small></div><div className="qr-result-info"><dl><div><dt>스탬프투어명</dt><dd>{tour}</dd></div><div><dt>관광지명</dt><dd>{name||"신규 관광지"}</dd></div><div><dt>관광지 코드</dt><dd>{code}</dd></div><div><dt>QR 활성화 상태</dt><dd><span className={`status-dot ${qrActive?"on":""}`}/>{qrActive?"활성":"비활성"}</dd></div><div><dt>생성일</dt><dd>{createdAt}</dd></div></dl><div className="qr-notice"><Info size={14}/><span>현장 비치 전 관광지명과 코드를 확인해 주세요. 이 화면은 디자인 프로토타입으로 실제 카메라 인식 기능은 포함하지 않습니다.</span></div></div></div><div className="qr-result-actions"><button className="secondary" onClick={()=>download("qr")}><Download size={14}/>QR 이미지 다운로드</button><button className="secondary" onClick={()=>download("print")}><Printer size={14}/>인쇄용 안내판 다운로드</button><button className="secondary warning" onClick={()=>setConfirmReissue(true)}><RefreshCw size={14}/>QR 재발급</button><button className={qrActive?"danger-button":"secondary"} onClick={()=>{setQrActive(!qrActive);act(qrActive?"QR코드를 비활성화했습니다.":"QR코드를 다시 활성화했습니다.");}}>{qrActive?"QR 비활성화":"QR 활성화"}</button></div></div></div>}
    {confirmReissue&&<div className="modal-backdrop nested-modal" role="alertdialog" aria-modal="true"><div className="delete-confirm-modal"><div className="delete-icon warning-icon"><AlertTriangle size={21}/></div><h3>QR코드를 재발급하시겠습니까?</h3><p>새 QR코드를 발급하면 현장에 배포된 <b>기존 QR코드는 즉시 사용할 수 없습니다.</b></p><div className="delete-warning"><AlertTriangle size={14}/>기존 안내판을 모두 회수한 뒤 새 QR 안내판으로 교체해 주세요.</div><div className="modal-actions"><button className="secondary" onClick={()=>setConfirmReissue(false)}>취소</button><button className="warning-button" onClick={reissue}>재발급</button></div></div></div>}
    {toast&&<div className="toast"><span>✓</span>{toast}</div>}
  </div>;
}
