"use client";

import { useState } from "react";
import { CalendarDays, ClipboardList, Copy, DollarSign, Eye, FileSpreadsheet, Plus, QrCode, Search, Trash2 } from "lucide-react";

const menu = [
  { icon: "▦", label: "대시보드" },
  { icon: "◇", label: "상품관리", children: ["상품목록", "상품등록", "일정표관리", "요금관리"] },
  { icon: "▤", label: "예약관리", children: ["예약접수현황", "예약달력"] },
  { icon: "₩", label: "결제관리", children: ["결제현황", "취소/환불"] },
  { icon: "⇄", label: "정산관리", children: ["정산현황", "판매점정산", "공급사정산"] },
  { icon: "♙", label: "회원관리", children: ["웹회원관리", "관리자/직원", "그룹/권한"] },
  { icon: "▣", label: "판매점관리" },
  { icon: "⌂", label: "거래처관리" },
  { icon: "qr", label: "스탬프투어 관리", children: ["스탬프투어 목록", "관광지 관리", "참여자·진행현황", "인증 이력", "완주·경품 관리", "통계"] },
  { icon: "▥", label: "통계관리" },
  { icon: "◎", label: "운영관리", children: ["팝업관리", "알림관리", "알림톡"] },
  { icon: "⚙", label: "시스템설정", children: ["홈페이지설정", "결제설정", "기본설정"] },
];

const products = [
  { no:"18345", code:"HP0001", category:"해외여행 > 중국여행 > 청도", name:"[복사] 청도 바캉스~ 온천♨+워터파크 & 관광 &미식투어맥주박물관 5박6일", price:"840,000", period:["2026-05-12", "2026-07-30"], reservation:"0/0", views:"0/0", soldout:false, visible:true },
  { no:"18343", code:"paldo-111", category:"기차여행 > 특별열차", name:"[팔도장터열차] 6월 27일(토) 공주 유구 색동수국정원 / 계룡산 동학사", price:"79,000", period:null, reservation:"0/0", views:"0/0", soldout:false, visible:false },
  { no:"18342", code:"HP0001", category:"해외여행 > 중국여행 > 청도", name:"청도 바캉스~ 온천♨+워터파크 & 관광 &미식투어맥주박물관 5박6일", price:"840,000", period:["2026-05-12", "2026-07-30"], reservation:"0/0", views:"0/0", soldout:false, visible:true },
  { no:"18341", code:"boram01", category:"버스여행 > 당일여행", name:"비아젬 견학투어 / 당진 장고항 실치축제 / 삼선산 수목원 / 한진포구 해상둘레길 (당일)", price:"15,000", period:null, reservation:"0/0", views:"0/0", soldout:false, visible:true },
];

const actionIcons = [
  ["예약", ClipboardList, "예약관리"], ["요금", DollarSign, "요금관리"], ["일정", CalendarDays, "일정관리"],
  ["보기", Eye, "미리보기"], ["복사", Copy, "상품복사"],
] as const;

export default function ProductListPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["상품관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [states, setStates] = useState(products.map((p) => ({ soldout:p.soldout, visible:p.visible })));

  const act = (message:string) => { setToast(message); window.setTimeout(() => setToast(""), 2200); };
  const toggleMenu = (label:string) => setExpanded((v) => v.includes(label) ? v.filter((x) => x !== label) : [...v, label]);
  const toggle = (index:number, key:"soldout"|"visible") => {
    setStates((items) => items.map((item, i) => i === index ? {...item, [key]:!item[key]} : item));
    act(`${key === "soldout" ? "품절" : "노출"} 상태를 변경했습니다.`);
  };

  return <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">A</div><div className="brand-copy"><strong>AOS</strong><span>TRAVEL ERP</span></div><button className="collapse" onClick={()=>setCollapsed(!collapsed)} aria-label="사이드바 접기">‹</button></div>
      <nav aria-label="관리자 메뉴">{menu.map((item)=><div className="nav-group" key={item.label}>
        <button className={`nav-item ${item.label === "상품관리" ? "active" : ""}`} onClick={()=>item.label === "대시보드" ? window.location.assign("/") : item.children ? toggleMenu(item.label) : act(`${item.label} 화면으로 이동합니다.`)}><span className="nav-icon">{item.icon === "qr" ? <QrCode size={16} strokeWidth={1.8}/> : item.icon}</span><span className="nav-label">{item.label}</span>{item.children&&<span className={`chevron ${expanded.includes(item.label)?"open":""}`}>⌄</span>}</button>
        {item.children&&expanded.includes(item.label)&&!collapsed&&<div className="subnav">{item.children.map((child)=><button className={child==="상품목록"?"current":""} key={child} data-planned-path={item.label === "스탬프투어 관리" ? `/stamp-tours/${({"관광지 관리":"attractions","참여자·진행현황":"participants","인증 이력":"verifications","완주·경품 관리":"rewards","통계":"statistics"} as Record<string,string>)[child] || ""}` : undefined} onClick={()=>child === "상품목록" ? window.location.assign("/products") : child === "웹회원관리" ? window.location.assign("/members/web") : child === "스탬프투어 목록" ? window.location.assign("/stamp-tours") : child === "관광지 관리" ? window.location.assign("/stamp-tours/attractions") : child === "참여자·진행현황" ? window.location.assign("/stamp-tours/participants") : child === "인증 이력" ? window.location.assign("/stamp-tours/verifications") : child === "완주·경품 관리" ? window.location.assign("/stamp-tours/rewards") : child === "통계" ? window.location.assign("/stamp-tours/statistics") : act(`${child} 화면은 다음 단계에서 제공될 예정입니다.`)}>{child}</button>)}</div>}
      </div>)}</nav>
      <div className="sidebar-help"><span className="nav-icon">?</span><div><strong>업무지원센터</strong><p>평일 09:00–18:00</p></div></div>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <div className="breadcrumb"><span>상품관리</span><b>/</b><strong>상품목록</strong></div>
        <div className="top-actions">
          <label className="search"><span>⌕</span><input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색"/><kbd>⌘ K</kbd></label>
          <button className="icon-btn" title="업무지원" onClick={()=>act("업무지원센터를 엽니다.")}>?</button>
          <div className="dropdown-wrap"><button className="icon-btn notice" aria-label="알림" onClick={()=>{setNoticeOpen(!noticeOpen);setProfileOpen(false)}}>♢<i>5</i></button>{noticeOpen&&<div className="dropdown notice-menu"><div className="drop-head"><strong>알림</strong><button onClick={()=>setNoticeOpen(false)}>모두 읽음</button></div><button><span className="alert-dot warn"></span><span>확인이 필요한 상품이 있습니다.<small>방금 전</small></span></button><button className="drop-footer">알림 전체보기</button></div>}</div>
          <div className="divider"/>
          <div className="dropdown-wrap"><button className="profile" onClick={()=>{setProfileOpen(!profileOpen);setNoticeOpen(false)}}><span className="avatar">장</span><span><b>애비아넥스트</b><small>관리자 장윤호</small></span><em>⌄</em></button>{profileOpen&&<div className="dropdown profile-menu"><button>내 정보</button><button>환경설정</button><hr/><button className="logout">로그아웃</button></div>}</div>
        </div>
      </header>

      <main className="content product-content">
        <section className="page-head"><div><h1>여행상품 목록</h1><p>등록된 여행상품과 판매 상태를 관리합니다.</p></div></section>

        <section className="panel product-filter" aria-label="상품 검색">
          <button className="primary product-register" onClick={()=>act("신규 상품 등록 화면을 엽니다.")}><Plus size={16} strokeWidth={2.2}/>신규등록</button>
          <div className="filter-fields">
            <label><select aria-label="페이지 표시 개수" defaultValue="15"><option>15</option><option>30</option><option>50</option></select><span>줄수</span></label>
            <select aria-label="대분류" defaultValue=""><option value="">대분류</option></select>
            <select aria-label="중분류" defaultValue=""><option value="">중분류</option></select>
            <select aria-label="소분류" defaultValue=""><option value="">소분류</option></select>
            <select aria-label="검색 항목" defaultValue="상품명"><option>상품명</option></select>
            <input aria-label="검색어" placeholder="검색어를 입력하세요"/>
            <button className="filter-search" aria-label="검색" title="검색" onClick={()=>act("상품을 검색했습니다.")}><Search size={17}/></button>
          </div>
        </section>

        <section className="panel product-list-panel">
          <div className="product-table-wrap"><table className="product-table">
            <colgroup><col className="c-code"/><col className="c-name"/><col className="c-price"/><col className="c-period"/><col className="c-count"/><col className="c-count"/>{Array.from({length:8}).map((_,i)=><col className="c-action" key={i}/>)}</colgroup>
            <thead><tr>{["상품코드","상품명","대표가격","판매기간","예약(건/명)","조회(누적/오늘)","예약","요금","일정","보기","복사","품절","노출","삭제"].map(x=><th key={x}>{x}</th>)}</tr></thead>
            <tbody>{products.map((p,i)=><tr key={p.no}>
              <td className="product-code"><b>{p.no}</b><span>[{p.code}]</span></td>
              <td className="product-info"><small>{p.category}</small><button onClick={()=>act(`${p.name} 상품 상세를 엽니다.`)} title={p.name}>{p.name}</button></td>
              <td className="product-price">{p.price}</td>
              <td className="product-period">{p.period?<><span>{p.period[0]} ~</span><span>{p.period[1]}</span></>:<span>~</span>}</td>
              <td className="center">{p.reservation}</td><td className="center">{p.views}</td>
              {actionIcons.map(([label,Icon,title])=><td className="action-cell" key={label}><button className="table-action" title={title} aria-label={title} onClick={()=>act(`${p.name} ${title} 화면을 엽니다.`)}><Icon size={17} strokeWidth={1.8}/></button></td>)}
              <td className="action-cell"><button className={`switch ${states[i].soldout?"on":""}`} role="switch" aria-checked={states[i].soldout} aria-label="품절 상태" title="품절 상태" onClick={()=>toggle(i,"soldout")}><i/></button></td>
              <td className="action-cell"><button className={`switch ${states[i].visible?"on":""}`} role="switch" aria-checked={states[i].visible} aria-label="노출 상태" title="노출 상태" onClick={()=>toggle(i,"visible")}><i/></button></td>
              <td className="action-cell"><button className="table-action delete" title="삭제" aria-label="삭제" onClick={()=>act(`${p.name} 삭제 확인이 필요합니다.`)}><Trash2 size={17} strokeWidth={1.8}/></button></td>
            </tr>)}</tbody>
          </table></div>
        </section>

        <section className="panel product-footer"><div/><div className="pagination"><button disabled>‹</button><button className="active">1</button><button disabled>›</button></div><button className="secondary excel" onClick={()=>act("엑셀 다운로드를 준비합니다.")}><FileSpreadsheet size={15}/>엑셀 다운로드</button></section>
        <footer>© 2026 AOS Travel ERP · AviaNext</footer>
      </main>
    </div>
    {toast&&<div className="toast"><span>✓</span>{toast}</div>}
  </div>;
}
