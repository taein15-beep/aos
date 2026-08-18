"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

const utility = [
  ["로그인", "/domestic/mypage"], ["회원가입", "/domestic/mypage"],
  ["비회원 예약조회", "/domestic/reservations"], ["예약확인·결제", "/domestic/reservations"],
  ["고객센터", "/domestic/customer"],
];

const gnb = [
  ["출발확정", "/domestic/departure-confirmed"], ["당일여행", "/domestic/products?duration=day"],
  ["숙박여행", "/domestic/products?duration=stay"], ["기차여행", "/domestic/products?transport=train"],
  ["버스여행", "/domestic/products?transport=bus"], ["섬·제주", "/domestic/products?region=island"],
  ["지역별", "/domestic/products?view=region"], ["테마여행", "/domestic/promotions"],
  ["지자체특가", "/domestic/promotions"], ["단체여행", "/domestic/group-quote"],
];

const megaGroups = [
  { title: "여행기간", values: ["당일", "1박2일", "2박3일", "3박 이상"] },
  { title: "교통수단", values: ["KTX", "SRT", "ITX", "관광열차", "일반버스", "리무진버스", "선박"] },
  { title: "지역", values: ["경기·인천", "강원", "충청", "전라", "경상", "부산·울산", "제주", "섬"] },
  { title: "테마", values: ["계절꽃", "축제", "맛기행", "가족체험", "역사·문화", "트레킹", "DMZ", "시티투어"] },
];

export function DomesticShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", closeOnEscape); };
  }, [mobileOpen]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    window.location.href = `/domestic/search${search ? `?q=${encodeURIComponent(search)}` : ""}`;
  };

  return (
    <div className="dom-site">
      <header className="dom-header">
        <div className="dom-utility">
          <div className="dom-container dom-utility-inner">
            <span>대한민국 곳곳의 좋은 여행을 AOS와 함께</span>
            <nav aria-label="회원 및 고객 메뉴">{utility.map(([label, href]) => <a key={label} href={href}>{label}</a>)}</nav>
          </div>
        </div>

        <div className="dom-container dom-main-head">
          <a className="dom-logo" href="/domestic" aria-label="AOS 국내여행 홈">
            <strong>aos</strong><span><b>국내여행</b><small>TRAVEL PLATFORM</small></span>
          </a>
          <form className="dom-search" onSubmit={submitSearch} role="search">
            <label htmlFor="dom-search-input" className="dom-sr-only">국내 여행상품 검색</label>
            <input id="dom-search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="여행지, 상품명, 출발일을 검색해 보세요" />
            <button type="submit" aria-label="검색"><Icon name="search" size={22}/></button>
          </form>
          <div className="dom-quick">
            <a href="/domestic/mypage"><span><Icon name="heart"/></span><b>찜한 상품</b></a>
            <a href="/domestic/reservations"><span><Icon name="calendar"/></span><b>예약확인</b></a>
            <a href="/domestic/customer" className="dom-kakao"><span><Icon name="chat"/></span><b>카카오 상담</b></a>
          </div>
          <button className="dom-mobile-button" aria-label="모바일 메뉴 열기" onClick={() => setMobileOpen(true)}><Icon name="menu" size={26}/></button>
        </div>

        <div className="dom-gnb-wrap">
          <div className="dom-container dom-gnb">
            <button className="dom-all-menu" onClick={() => setMegaOpen((open) => !open)} aria-expanded={megaOpen}><Icon name="menu" size={19}/> 전체메뉴</button>
            <nav aria-label="국내여행 상품 메뉴">{gnb.map(([label, href]) => <a key={label} href={href}>{label}</a>)}</nav>
          </div>
          {megaOpen && <MegaMenu onClose={() => setMegaOpen(false)} />}
        </div>
      </header>

      {children}

      <footer className="dom-footer">
        <div className="dom-footer-links"><div className="dom-container">
          {["회사소개", "이용약관", "국내여행약관", "개인정보처리방침", "취소·환불규정", "고객센터", "출발장소안내", "단체견적문의"].map((label, index) =>
            <a key={label} href={index === 5 ? "/domestic/customer" : index === 6 ? "/domestic/boarding" : index === 7 ? "/domestic/group-quote" : "/domestic/customer"} className={label === "개인정보처리방침" ? "emphasis" : ""}>{label}</a>)}
        </div></div>
        <div className="dom-container dom-footer-main">
          <div className="dom-footer-company">
            <a className="dom-logo dom-logo-light" href="/domestic"><strong>aos</strong><span><b>국내여행</b><small>TRAVEL PLATFORM</small></span></a>
            <p><b>주식회사 AOS Platform</b> &nbsp; 대표 장윤호 &nbsp; 사업자등록번호 000-00-00000<br/>통신판매업신고 제2026-경기고양-0000호 &nbsp; 관광사업자 등록번호 제0000-00호<br/>경기도 고양시 · 개인정보보호책임자 고객지원팀</p>
            <small>※ 회사정보와 관광사업자 등록정보는 운영 정보 확정 후 실제 정보로 교체됩니다.</small>
          </div>
          <div className="dom-footer-contact"><span>고객센터</span><strong>1588-0000</strong><p>평일 09:00–18:00<br/>토·일·공휴일 휴무</p><div><a href="/domestic/customer#consult">카카오 상담</a><a href="https://blog.naver.com/" target="_blank" rel="noreferrer" aria-label="AOS 블로그 새 창 열기">BLOG</a><a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="AOS 인스타그램 새 창 열기">INSTAGRAM</a></div></div>
        </div>
        <div className="dom-container dom-footer-copy">© 2026 AOS Platform. All rights reserved.<span>안전하고 즐거운 국내여행을 연결합니다.</span></div>
      </footer>

      {mobileOpen && <div className="dom-mobile-panel" role="dialog" aria-modal="true" aria-label="모바일 메뉴">
        <button className="dom-mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="메뉴 닫기"/>
        <div className="dom-mobile-drawer" tabIndex={-1}>
          <div><a className="dom-logo" href="/domestic"><strong>aos</strong><span><b>국내여행</b><small>TRAVEL PLATFORM</small></span></a><button onClick={() => setMobileOpen(false)} aria-label="닫기"><Icon name="close"/></button></div>
          <nav>{gnb.map(([label, href]) => <a key={label} href={href}>{label}<Icon name="chevron" size={17}/></a>)}</nav>
          <div className="dom-mobile-utils">{utility.map(([label, href]) => <a key={label} href={href}>{label}</a>)}</div>
        </div>
      </div>}
    </div>
  );
}

function MegaMenu({ onClose }: { onClose: () => void }) {
  return <div className="dom-mega"><div className="dom-container dom-mega-grid">
    <div className="dom-mega-intro"><span>AOS DOMESTIC</span><strong>어떤 여행을<br/>찾고 계신가요?</strong><p>기간, 교통, 지역, 테마별로<br/>빠르게 찾아보세요.</p></div>
    {megaGroups.map((group) => <section key={group.title}><h3>{group.title}</h3><div>{group.values.map((value) => <a key={value} href={group.title === "테마" ? `/domestic/promotions?theme=${encodeURIComponent(value)}` : `/domestic/products?filter=${encodeURIComponent(value)}`}>{value}</a>)}</div></section>)}
    <button onClick={onClose} aria-label="전체메뉴 닫기"><Icon name="close"/></button>
  </div></div>;
}
