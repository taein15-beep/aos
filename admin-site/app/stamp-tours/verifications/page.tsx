"use client";

import { stampTourMenuItem, goStampTourChild } from "../_data/stampTourNav";

import { useEffect, useMemo, useState } from "react";
import { getPrizesByTourId, getSpotsByTourId, getTourById, mockParticipants, mockTours, mockVerifications, type MockVerification } from "../_data/mockStampTours";
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, ClipboardList,
  Clock3, FilterX, Flag, Info, Laptop, MapPin, QrCode, Search,
  ShieldAlert, ShieldCheck, Smartphone, XCircle,
} from "lucide-react";

const menu:{icon:string;label:string;children?:string[]}[]=[
  {icon:"▦",label:"대시보드"},{icon:"◇",label:"상품관리",children:["상품목록","상품등록","일정표관리","요금관리"]},{icon:"▤",label:"예약관리",children:["예약접수현황","예약달력"]},{icon:"₩",label:"결제관리",children:["결제현황","취소/환불"]},{icon:"⇄",label:"정산관리",children:["정산현황","판매점정산","공급사정산"]},{icon:"♙",label:"회원관리",children:["웹회원","제휴여행사","판매점관리","관리자/직원","그룹/권한"]},{icon:"⌂",label:"거래처관리"},stampTourMenuItem(),{icon:"▥",label:"통계관리"},{icon:"◎",label:"운영관리",children:["팝업관리","알림관리","알림톡"]},{icon:"⚙",label:"시스템설정",children:["홈페이지설정","결제설정","기본설정"]},
];

type RecordRow=MockVerification;

const records:RecordRow[]=mockVerifications;

const anomalyClass=(value:string)=>value==="없음"?"normal":value==="동일 관광지 중복 시도"||value==="인증 가능 시간 외"?"caution":"risk";

type ReviewPrize = { name: string; goal: number; grade: string; method: string; kind: "gift" | "rice" | "box" };

function reviewPrizesOf(tourId: number): ReviewPrize[] {
  const prizes = [...getPrizesByTourId(tourId)].sort((a, b) => a.requiredCount - b.requiredCount);
  return prizes.map((prize, index) => ({
    name: prize.name,
    goal: prize.requiredCount,
    grade: `${prizes.length - index}등급`,
    method: prize.method,
    kind: prize.type === "모바일 쿠폰" ? "gift" : prize.name.includes("쌀") ? "rice" : "box",
  }));
}

function maskPhone(phone: string) {
  const [head, , tail] = phone.split("-");
  return head && tail ? `${head}-****-${tail}` : phone;
}

function VerificationReviewModal({
  row, tourName, index, total, judgement, reason, memo, reasonError, onClose, onPrev, onNext, onJudgement, onReason, onMemo, onSave,
}: {
  row: RecordRow;
  tourName: string;
  index: number;
  total: number;
  judgement: "정상" | "부정" | "확인 보류";
  reason: string;
  memo: string;
  reasonError: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onJudgement: (value: "정상" | "부정" | "확인 보류") => void;
  onReason: (value: string) => void;
  onMemo: (value: string) => void;
  onSave: () => void;
}) {
  const [mapMode, setMapMode] = useState<"지도" | "위성">("지도");
  const [popup, setPopup] = useState(true);
  useEffect(() => {
    setPopup(true);
    setMapMode("지도");
  }, [row.id]);
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

  const reviewPrizes = reviewPrizesOf(row.tourId);
  const person = mockParticipants.find((item) => item.id === row.participantId);
  const tourSpots = getSpotsByTourId(row.tourId);
  const verified = new Map<string, string>();
  records.filter((item) => item.participantId === row.participantId && item.result === "정상 인증").forEach((item) => {
    if (!verified.has(item.spot)) verified.set(item.spot, item.date.slice(0, 10));
  });
  const target = Math.max(person?.spots ?? verified.size, verified.size);
  const doneNames = new Set(verified.keys());
  tourSpots.forEach((spot) => {
    if (doneNames.size < target && !doneNames.has(spot.name)) doneNames.add(spot.name);
  });
  const fallbackDate = (person?.recent ?? row.date).slice(0, 10);
  const stamps = tourSpots.map((spot) => ({ name: spot.name, done: doneNames.has(spot.name), date: verified.get(spot.name) ?? fallbackDate, mark: spot.name.slice(0, 1) }));
  const requiredCount = Math.max(getTourById(row.tourId)?.requiredCount ?? 1, 1);
  const collected = Math.min(doneNames.size, requiredCount);
  const goal = requiredCount;
  const joined = (person?.joined ?? row.date).slice(0, 10);
  const reached = [...reviewPrizes].reverse().find((prize) => collected >= prize.goal);
  const nextPrize = reviewPrizes.find((prize) => collected < prize.goal);
  const gradeText = !reviewPrizes.length
    ? "등록된 경품이 없습니다"
    : reached
      ? nextPrize
        ? `현재 ${reached.grade} · ${nextPrize.goal}곳 인증 시 ${nextPrize.grade}`
        : `현재 ${reached.grade}입니다`
      : `아직 경품 등급이 없어요 · ${nextPrize?.goal ?? 1}곳 인증 시 ${nextPrize?.grade ?? "1등급"}`;

  return (
    <div className="vr-layer" role="presentation" onClick={onClose}>
      <section className="vr-modal" role="dialog" aria-modal="true" aria-labelledby="vr-title" onClick={(event) => event.stopPropagation()}>
        <header className="vr-head">
          <div>
            <span className={`vr-badge ${row.result === "정상 인증" ? "success" : "failed"}`}>
              {row.result === "정상 인증" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {row.result}
            </span>
            <div>
              <h2 id="vr-title">인증 상세 검수</h2>
              <p>{row.number}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">×</button>
        </header>
        <div className="vr-body">
          <aside className="vr-book">
            <strong className="vr-book-title"><ClipboardList size={16} />인증 결과 화면</strong>
            <section className="sb-card sb-hero">
              <small>STAMP BOOK</small>
              <h2>스탬프북</h2>
              <p>나의 여행 기록 · 수집한 스탬프를 확인하세요.</p>
            </section>
            <section className="sb-card sb-info">
              <div><span>스탬프투어명</span><b>{tourName}</b></div>
              <div><span>참가번호</span><b>{person?.number ?? "—"}</b></div>
              <div><span>참여자</span><b>{row.participant}</b></div>
              <div><span>참여일</span><b>{joined}</b></div>
            </section>
            <section className="sb-card sb-progress">
              <div>
                <b>{collected} <span>/ {goal}</span></b>
                <small>{collected >= goal ? "스탬프를 모두 모았어요" : "스탬프를 모으고 있어요"}</small>
              </div>
              <i><em style={{ width: `${Math.min(100, Math.round((collected / goal) * 100))}%` }} /></i>
            </section>
            <section className="sb-card">
              <div className="sb-stamps">
                {stamps.map((stamp) => (
                  <article key={stamp.name} className={stamp.done ? "done" : "wait"}>
                    <i>{stamp.mark}{stamp.done && <em>OK</em>}</i>
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
                {reviewPrizes.map((prize) => (
                  <article key={prize.name}>
                    <div className={`sb-thumb ${prize.kind}`}>
                      {prize.kind === "gift" && <span>14일권</span>}
                      {prize.kind === "rice" && <span>오대쌀 4Kg</span>}
                      {prize.kind === "box" && <span>경품</span>}
                      <em>{prize.grade}</em>
                    </div>
                    <b>{prize.name}</b>
                    <small>{prize.goal}곳 인증 · {Math.max(prize.goal - collected, 0)}곳 남음</small>
                    <span>{prize.method}</span>
                  </article>
                ))}
              </div>
              <button type="button" className="sb-submit">경품 선택 완료하기</button>
              <p className="sb-hint">QR코드로 관광지를 인증하면 스탬프가 채워집니다.</p>
            </section>
          </aside>
          <div className="vr-review">
            <div className="vr-review-scroll">
              <div className="vr-nav">
                <button type="button" disabled={index <= 0} onClick={onPrev}><ChevronLeft size={16} />이전 기록</button>
                <span>{index + 1} / {total}</span>
                <button type="button" disabled={index >= total - 1} onClick={onNext}>다음 기록<ChevronRight size={16} /></button>
              </div>
              <section className="vr-card">
                <h3>관리자 판정</h3>
                <div className="vr-judge">
                  {(["정상", "부정", "확인 보류"] as const).map((value) => (
                    <button key={value} type="button" className={judgement === value ? "on" : ""} onClick={() => onJudgement(value)}>
                      <i>{value === "정상" ? <ShieldCheck size={18} /> : value === "부정" ? <Info size={18} /> : <Flag size={18} />}</i>
                      <span>
                        <b>{value}</b>
                        <small>{value === "정상" ? "유효한 인증으로 승인" : value === "부정" ? "부정 인증으로 판정" : "추가 확인 후 판정"}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <div className="vr-pair">
                <section className="vr-card">
                  <h3>참여자·관광지 정보</h3>
                  <dl className="vr-rows">
                    <div><dt>참여자</dt><dd>{row.participant} · {maskPhone(row.phone)}</dd></div>
                    <div><dt>관광지</dt><dd>{row.spot} · {row.spotCode}</dd></div>
                    <div><dt>인증 일시</dt><dd>{row.date}</dd></div>
                  </dl>
                </section>
                <section className="vr-card">
                  <h3>기기 및 접속정보</h3>
                  <dl className="vr-rows">
                    <div><dt>기기정보</dt><dd>{row.device}</dd></div>
                    <div><dt>IP 주소</dt><dd>{row.ip}</dd></div>
                    <div><dt>이상 유형</dt><dd className={row.anomaly === "없음" ? "vr-ok" : "vr-alert"}>{row.anomaly !== "없음" && <AlertTriangle size={14} />}{row.anomaly}</dd></div>
                  </dl>
                </section>
              </div>
              <section className="vr-card">
                <h3>GPS 위치 확인</h3>
                <div className={`vr-map ${mapMode === "위성" ? "sat" : ""}`}>
                  <div className="vr-map-tabs">
                    <button type="button" className={mapMode === "지도" ? "on" : ""} onClick={() => setMapMode("지도")}>지도</button>
                    <button type="button" className={mapMode === "위성" ? "on" : ""} onClick={() => setMapMode("위성")}>위성</button>
                  </div>
                  <svg viewBox="0 0 640 280" aria-hidden="true">
                    <rect width="640" height="280" fill={mapMode === "위성" ? "#7d9168" : "#e8eef2"} />
                    <path d="M0 70 H640 M0 150 H640 M0 220 H640 M80 0 V280 M210 0 V280 M360 0 V280 M500 0 V280" stroke={mapMode === "위성" ? "#f8fafc" : "#ffffff"} strokeWidth="16" />
                    <path d="M0 110 H640 M140 0 V280" stroke={mapMode === "위성" ? "#d6e0c8" : "#d5dee6"} strokeWidth="8" />
                    <text x="230" y="48" fill="#64748b" fontSize="13">가산디지털단지</text>
                    <text x="400" y="132" fill="#64748b" fontSize="12">가산디지털1로</text>
                  </svg>
                  <i className="vr-pin" />
                  {popup && (
                    <div className="vr-popup">
                      <button type="button" onClick={() => setPopup(false)} aria-label="위치 팝업 닫기">×</button>
                      <b>인증 위치</b>
                      <span>{row.lat}, {row.lng}</span>
                      <small>{row.place ?? row.spot}</small>
                    </div>
                  )}
                </div>
                <dl className="vr-rows vr-location">
                  <div><dt>관광지 좌표</dt><dd>{row.spotLat}, {row.spotLng}</dd></div>
                  <div><dt>측정 거리</dt><dd className={row.distanceM > 100 ? "vr-bad" : "vr-ok"}>{row.distance} - 허용 반경 100m</dd></div>
                </dl>
              </section>
              <section className="vr-card">
                <h3>처리 사유</h3>
                <label>
                  <span>처리 사유 <b>*</b></span>
                  <textarea value={reason} onChange={(event) => onReason(event.target.value)} placeholder="판정 근거와 처리 사유를 입력해 주세요." />
                  <small className={reasonError ? "error" : ""}>{reasonError ? "처리 사유를 입력해 주세요." : "판정과 함께 관리자 검수 이력이 기록됩니다."}</small>
                </label>
                <label>
                  <span>관리자 메모</span>
                  <textarea value={memo} onChange={(event) => onMemo(event.target.value)} placeholder="추가 확인 사항 또는 내부 메모를 입력하세요." />
                </label>
              </section>
            </div>
            <div className="vr-actions">
              <button type="button" className="ghost" onClick={onClose}>취소</button>
              <button type="button" className="save" onClick={onSave}>검수 결과 저장</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function VerificationHistoryPage(){
  const [collapsed,setCollapsed]=useState(false),[expanded,setExpanded]=useState(["스탬프투어 관리"]);
  const [toast,setToast]=useState(""),[profileOpen,setProfileOpen]=useState(false),[noticeOpen,setNoticeOpen]=useState(false);
  const [tour,setTour]=useState("전체"),[spot,setSpot]=useState("전체"),[name,setName]=useState(""),[phone,setPhone]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState(""),[result,setResult]=useState("전체"),[anomaly,setAnomaly]=useState("전체"),[review,setReview]=useState("전체");
  const [applied,setApplied]=useState({tour:"전체",spot:"전체",name:"",phone:"",from:"",to:"",result:"전체",anomaly:"전체",review:"전체"});
  const [selected,setSelected]=useState<RecordRow|null>(null),[page,setPage]=useState(1);
  const [judgement,setJudgement]=useState<"정상"|"부정"|"확인 보류">("확인 보류"),[reason,setReason]=useState(""),[memo,setMemo]=useState("");
  const [reasonError,setReasonError]=useState(false);
  const act=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),2200)};
  const toggleMenu=(label:string)=>setExpanded(current=>current.includes(label)?current.filter(value=>value!==label):[...current,label]);
  const goChild=(child:string)=>goStampTourChild(child,act);
  const filtered=useMemo(()=>records.filter(row=>{
    const rowDate=row.date.slice(0,10).replaceAll(".","-");
    return (applied.tour==="전체"||String(row.tourId)===applied.tour)&&(applied.spot==="전체"||row.spot===applied.spot)&&(!applied.name||row.participant.includes(applied.name))&&(!applied.phone||row.phone.replaceAll("-","").includes(applied.phone.replaceAll("-","")))&&(!applied.from||rowDate>=applied.from)&&(!applied.to||rowDate<=applied.to)&&(applied.result==="전체"||row.result===applied.result)&&(applied.anomaly==="전체"||row.anomaly===applied.anomaly)&&(applied.review==="전체"||row.review===applied.review);
  }),[applied]);
  const pageSize=6,totalPages=Math.max(1,Math.ceil(filtered.length/pageSize)),visible=filtered.slice((page-1)*pageSize,page*pageSize);
  const search=()=>{setApplied({tour,spot,name:name.trim(),phone:phone.trim(),from,to,result,anomaly,review});setPage(1);act("검색 조건을 적용했습니다.")};
  const reset=()=>{setTour("전체");setSpot("전체");setName("");setPhone("");setFrom("");setTo("");setResult("전체");setAnomaly("전체");setReview("전체");setApplied({tour:"전체",spot:"전체",name:"",phone:"",from:"",to:"",result:"전체",anomaly:"전체",review:"전체"});setPage(1);act("검색 조건을 초기화했습니다.")};
  const openDrawer=(row:RecordRow)=>{setSelected(row);setJudgement(row.review==="정상"||row.review==="부정"?row.review:"확인 보류");setReason("");setMemo("");setReasonError(false)};
  const moveRecord=(direction:number)=>{if(!selected)return;const index=filtered.findIndex(row=>row.id===selected.id);const next=filtered[index+direction];if(next)openDrawer(next)};
  const saveReview=()=>{if(!reason.trim()){setReasonError(true);return}act(`${judgement} 판정이 저장되었습니다.`);setSelected(null)};
  const kpis=[["전체 인증",`${records.length}건`,QrCode,"blue"],["오늘 인증",`${records.filter(row=>row.date.startsWith("2026.11.16")).length}건`,Clock3,"indigo"],["인증 성공",`${records.filter(row=>row.result==="정상 인증").length}건`,CheckCircle2,"green"],["인증 실패",`${records.filter(row=>row.result==="인증 실패").length}건`,XCircle,"gray"],["중복 시도",`${records.filter(row=>row.anomaly.includes("중복")).length}건`,CircleHelp,"amber"],["이상 인증 의심",`${records.filter(row=>row.anomaly!=="없음").length}건`,ShieldAlert,"rose"]] as const;

  return <div className={`app-shell ${collapsed?"is-collapsed":""}`}>
    <aside className="sidebar"><div className="brand"><div className="brand-mark">A</div><div className="brand-copy"><strong>AOS</strong><span>TRAVEL ERP</span></div><button className="collapse" onClick={()=>setCollapsed(!collapsed)} aria-label="사이드바 접기">‹</button></div><nav aria-label="관리자 메뉴">{menu.map(item=><div className="nav-group" key={item.label}><button className={`nav-item ${item.label==="스탬프투어 관리"?"active":""}`} onClick={()=>item.label==="대시보드"?window.location.assign("/"):item.children?toggleMenu(item.label):act(`${item.label} 화면으로 이동합니다.`)}><span className="nav-icon">{item.icon==="qr"?<QrCode size={16}/>:item.icon}</span><span className="nav-label">{item.label}</span>{item.children&&<span className={`chevron ${expanded.includes(item.label)?"open":""}`}>⌄</span>}</button>{item.children&&expanded.includes(item.label)&&!collapsed&&<div className="subnav">{item.children.map(child=><button key={child} className={child==="인증 이력"?"current":""} onClick={()=>goChild(child)}>{child}</button>)}</div>}</div>)}</nav><div className="sidebar-help"><span className="nav-icon">?</span><div><strong>업무지원센터</strong><p>평일 09:00–18:00</p></div></div></aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><span>스탬프투어 관리</span><b>/</b><strong>인증 이력</strong></div><div className="top-actions"><label className="search"><span>⌕</span><input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색"/><kbd>⌘ K</kbd></label><button className="icon-btn">?</button><div className="dropdown-wrap"><button className="icon-btn notice" aria-label="알림" onClick={()=>{setNoticeOpen(!noticeOpen);setProfileOpen(false)}}>♢<i>5</i></button>{noticeOpen&&<div className="dropdown notice-menu"><div className="drop-head"><strong>알림</strong><button onClick={()=>setNoticeOpen(false)}>모두 읽음</button></div><button><span className="alert-dot warn"/><span>미검수 이상 인증 9건이 있습니다.<small>방금 전</small></span></button></div>}</div><div className="divider"/><div className="dropdown-wrap"><button className="profile" onClick={()=>{setProfileOpen(!profileOpen);setNoticeOpen(false)}}><span className="avatar">장</span><span><b>애비아넥스트</b><small>관리자 장윤호</small></span><em>⌄</em></button>{profileOpen&&<div className="dropdown profile-menu"><button>내 정보</button><button>환경설정</button><hr/><button className="logout">로그아웃</button></div>}</div></div></header>
      <main className="content verification-content"><section className="page-head"><div><h1>인증 이력</h1><p>QR 인증 성공·실패 기록과 중복 또는 비정상 참여를 검수합니다.</p></div><span className="verification-guide"><ShieldCheck size={14}/>관리자 검수 기록은 변경 이력에 보관됩니다.</span></section>
        <section className="verification-kpis">{kpis.map(([title,value,Icon,color])=><div className={`verification-kpi ${color}`} key={title}><span><small>{title}</small><strong>{value}</strong></span><i><Icon size={18}/></i></div>)}</section>
        <section className="panel verification-filter"><div className="verification-filter-grid"><label><span>스탬프투어</span><select value={tour} onChange={event=>setTour(event.target.value)}><option value="전체">전체</option>{mockTours.map(row=><option key={row.id} value={String(row.id)}>{row.name}</option>)}</select></label><label><span>관광지</span><select value={spot} onChange={event=>setSpot(event.target.value)}><option>전체</option>{[...new Set(records.map(row=>row.spot))].map(value=><option key={value}>{value}</option>)}</select></label><label><span>참여자명</span><input value={name} onChange={event=>setName(event.target.value)} placeholder="이름 입력"/></label><label><span>휴대전화번호</span><input value={phone} onChange={event=>setPhone(event.target.value)} placeholder="숫자만 입력"/></label><label className="verification-period"><span>인증기간</span><div><input type="date" value={from} onChange={event=>setFrom(event.target.value)}/><em>~</em><input type="date" value={to} onChange={event=>setTo(event.target.value)}/></div></label><label><span>인증결과</span><select value={result} onChange={event=>setResult(event.target.value)}><option>전체</option><option>정상 인증</option><option>인증 실패</option></select></label><label><span>이상 유형</span><select value={anomaly} onChange={event=>setAnomaly(event.target.value)}><option>전체</option>{[...new Set(records.map(row=>row.anomaly))].map(value=><option key={value}>{value}</option>)}</select></label><label><span>검수상태</span><select value={review} onChange={event=>setReview(event.target.value)}><option>전체</option><option>미검수</option><option>정상</option><option>부정</option><option>확인 보류</option></select></label></div><div className="verification-filter-actions"><button className="secondary" onClick={reset}><FilterX size={14}/>조건 초기화</button><button className="primary" onClick={search}><Search size={14}/>검색</button></div></section>
        <section className="panel verification-list-panel"><div className="verification-list-head"><div><strong>인증 이력 <b>{filtered.length}</b>건</strong><span>최근 인증순</span></div><p><i className="normal"/>정상 <i className="caution"/>주의 <i className="risk"/>위험</p></div><div className="verification-table-wrap"><table className="verification-table"><thead><tr>{["인증번호","인증일시","참여자","관광지","인증결과","관광지와의 거리","기기정보","IP","이상 유형","검수상태"].map(title=><th key={title}>{title}</th>)}</tr></thead><tbody>{visible.length?visible.map(row=><tr key={row.id}><td className="verification-number">{row.number}</td><td className="verification-date">{row.date}</td><td className="verification-person"><button className="verification-person-link" onClick={()=>openDrawer(row)}>{row.participant}</button><small>{row.phone}</small></td><td className="verification-spot"><b>{row.spot}</b><small>{row.spotCode}</small></td><td><span className={`verification-result ${row.result==="정상 인증"?"success":"failed"}`}>{row.result==="정상 인증"?<CheckCircle2 size={11}/>:<XCircle size={11}/>} {row.result}</span></td><td><span className={`distance-value ${row.distanceM>100?"outside":""}`}><MapPin size={11}/>{row.distance}</span></td><td className="device-cell">{row.deviceType==="mobile"?<Smartphone size={12}/>:<Laptop size={12}/>}<span>{row.device}</span></td><td className="ip-cell">{row.ip}</td><td><span className={`anomaly-type ${anomalyClass(row.anomaly)}`}>{row.anomaly!=="없음"&&<AlertTriangle size={11}/>} {row.anomaly}</span></td><td><span className={`review-status ${row.review==="정상"?"done":row.review==="부정"?"fraud":row.review==="확인 보류"?"hold":"pending"}`}>{row.review}</span></td></tr>):<tr><td colSpan={10}><div className="verification-empty"><QrCode size={29}/><strong>검색 조건에 맞는 인증 이력이 없습니다.</strong><p>조건을 변경하거나 초기화해 주세요.</p><button className="secondary" onClick={reset}><FilterX size={13}/>조건 초기화</button></div></td></tr>}</tbody></table></div><div className="participant-footer"><span>총 {filtered.length}건 중 {visible.length}건 표시</span><div className="pagination"><button disabled={page===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>‹</button>{Array.from({length:totalPages},(_,index)=><button key={index+1} className={page===index+1?"active":""} onClick={()=>setPage(index+1)}>{index+1}</button>)}<button disabled={page===totalPages} onClick={()=>setPage(value=>Math.min(totalPages,value+1))}>›</button></div><div/></div></section><footer>© 2026 AOS Travel ERP · AviaNext</footer>
      </main></div>
    {selected&&<VerificationReviewModal row={selected} tourName={getTourById(selected.tourId)?.name??"-"} index={filtered.findIndex(item=>item.id===selected.id)} total={filtered.length} judgement={judgement} reason={reason} memo={memo} reasonError={reasonError} onClose={()=>setSelected(null)} onPrev={()=>moveRecord(-1)} onNext={()=>moveRecord(1)} onJudgement={setJudgement} onReason={value=>{setReason(value);setReasonError(false)}} onMemo={setMemo} onSave={saveReview}/>}
    {toast&&<div className="toast"><span>✓</span>{toast}</div>}
  </div>;
}
