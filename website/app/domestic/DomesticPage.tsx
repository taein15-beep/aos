"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

const routeNames: Record<string, string> = {
  "/domestic/products": "국내여행 상품목록",
  "/domestic/products/AOS-DOM-0001": "국내여행 상품상세",
  "/domestic/search": "통합검색",
  "/domestic/departure-confirmed": "출발확정 상품",
  "/domestic/promotions": "국내여행 기획전",
  "/domestic/reservation": "예약하기",
  "/domestic/reservation/complete": "예약완료",
  "/domestic/reservations": "예약확인",
  "/domestic/mypage": "마이페이지",
  "/domestic/customer": "고객센터",
  "/domestic/boarding": "출발장소안내",
  "/domestic/group-quote": "단체견적문의",
};

type Product = {
  id: string; name: string; image: string; status: string; statusColor: string;
  date: string; departure: string; transport: string; duration: string;
  spots: string; seats: string; price: string; oldPrice?: string; support?: string;
  childPrice?: string; weekdays?: string; included?: string; region?: string;
  theme?: string; numericPrice?: number; extraBadge?: string;
};

const images = {
  mountain: "https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?auto=format&fit=crop&w=1200&q=78",
  sea: "https://images.unsplash.com/photo-1498623116890-37e912163d5d?auto=format&fit=crop&w=1000&q=78",
  forest: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=78",
  island: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=78",
  train: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1000&q=78",
  food: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=78",
  flowers: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=78",
  city: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=78",
};

const confirmed: Product[] = [
  { id: "AOS-DOM-0001", name: "철원 DMZ·소이산 모노레일 당일여행", image: images.mountain, status: "출발확정", statusColor: "blue", date: "8월 22일 토요일", departure: "서울역·잠실 출발", transport: "리무진버스", duration: "당일", spots: "소이산 모노레일 · DMZ · 한탄강", seats: "6석", price: "79,000원" },
  { id: "AOS-DOM-0002", name: "KTX 강릉 바다열차와 정동진 당일여행", image: images.sea, status: "출발확정", statusColor: "blue", date: "8월 23일 일요일", departure: "서울역 출발", transport: "KTX", duration: "당일", spots: "정동진 · 안목해변 · 강릉중앙시장", seats: "9석", price: "129,000원" },
  { id: "AOS-DOM-0003", name: "여수·순천 남도 맛기행 1박2일", image: images.food, status: "출발유력", statusColor: "indigo", date: "8월 29일 토요일", departure: "용산역 출발", transport: "KTX", duration: "1박2일", spots: "여수밤바다 · 순천만 · 남도별미", seats: "14석", price: "279,000원" },
  { id: "AOS-DOM-0004", name: "울릉도·독도 완전일주 2박3일", image: images.island, status: "예약가능", statusColor: "green", date: "9월 4일 금요일", departure: "서울역 출발", transport: "KTX+선박", duration: "2박3일", spots: "독도 · 나리분지 · 관음도", seats: "18석", price: "489,000원" },
];

const weekend: Product[] = [
  confirmed[0], confirmed[1],
  { id: "AOS-DOM-0005", name: "제천 청풍호 케이블카와 의림지", image: images.forest, status: "마감임박", statusColor: "orange", date: "8월 22일 토요일", departure: "서울역 출발", transport: "리무진버스", duration: "당일", spots: "청풍호 · 의림지 · 전통시장", seats: "3석", price: "89,000원" },
  { id: "AOS-DOM-0006", name: "부산 해운대 블루라인파크 자유여행", image: images.city, status: "예약가능", statusColor: "green", date: "8월 23일 일요일", departure: "서울역 출발", transport: "KTX", duration: "당일", spots: "해운대 · 청사포 · 송정", seats: "12석", price: "149,000원" },
];

const quickFind = [
  ["당일여행", "calendar", "/domestic/products?duration=day"], ["1박2일", "suitcase", "/domestic/products?duration=1n2d"],
  ["기차여행", "train", "/domestic/products?transport=train"], ["리무진버스", "bus", "/domestic/products?transport=limousine"],
  ["섬여행", "ship", "/domestic/products?region=island"], ["제주여행", "mountain", "/domestic/products?region=jeju"],
  ["지자체특가", "tag", "/domestic/promotions"], ["단체여행", "users", "/domestic/group-quote"],
] as const;

const themes = [
  ["여름 계곡여행", "청량한 숲과 계곡에서 즐기는 하루", images.forest, "valley"],
  ["가을 단풍여행", "붉게 물든 명산과 숲길", images.mountain, "autumn"],
  ["지역축제", "지금 가장 활기찬 로컬 축제", images.flowers, "festival"],
  ["맛기행", "지역의 진짜 맛을 찾아가는 여행", images.food, "food"],
  ["가족체험", "아이와 함께 만드는 특별한 추억", images.city, "family"],
  ["DMZ 역사여행", "평화와 역사를 만나는 깊이 있는 하루", images.mountain, "dmz"],
];

const regions = ["강원도", "충청도", "전라도", "경상도", "경기·인천", "부산·울산", "제주도", "섬여행"];

const recommended: Product[] = [
  { ...confirmed[1], id: "AOS-DOM-0011", status: "예약 많은 상품", statusColor: "blue" },
  { ...confirmed[2], id: "AOS-DOM-0012", status: "고객 만족", statusColor: "green" },
  { ...weekend[2], id: "AOS-DOM-0013", status: "신규상품", statusColor: "purple" },
  { ...confirmed[0], id: "AOS-DOM-0014", status: "담당자 추천", statusColor: "indigo" },
];

const supportProducts: Product[] = [
  { id: "AOS-DOM-0021", name: "강원 정선 레일바이크와 아리랑시장", image: images.mountain, status: "지자체지원", statusColor: "teal", date: "8월 30일 일요일", departure: "서울역 출발", transport: "리무진버스", duration: "당일", spots: "정선군 지원 · 선착순 30명", seats: "11석", price: "59,000원", oldPrice: "89,000원", support: "강원 정선군" },
  { id: "AOS-DOM-0022", name: "충북 단양 만천하스카이워크 당일여행", image: images.forest, status: "지자체지원", statusColor: "teal", date: "9월 5일 토요일", departure: "잠실 출발", transport: "리무진버스", duration: "당일", spots: "단양군 지원 · 신분증 지참", seats: "16석", price: "69,000원", oldPrice: "99,000원", support: "충북 단양군" },
  { id: "AOS-DOM-0023", name: "전남 신안 퍼플섬과 목포 미식여행", image: images.island, status: "지자체지원", statusColor: "teal", date: "9월 12일 토요일", departure: "용산역 출발", transport: "KTX+버스", duration: "1박2일", spots: "신안군 지원 · 해당일 출발 한정", seats: "8석", price: "199,000원", oldPrice: "259,000원", support: "전남 신안군" },
];

const catalogProducts: Product[] = [
  { ...confirmed[0], childPrice: "69,000원", weekdays: "매주 토·일요일", included: "왕복차량 · 중식 · 입장료 · 인솔자", region: "강원도", theme: "DMZ 역사여행", numericPrice: 79000 },
  { ...confirmed[1], childPrice: "119,000원", weekdays: "매주 토·일요일", included: "왕복 KTX · 바다열차 · 인솔자", region: "강원도", theme: "바다여행", numericPrice: 129000 },
  { ...confirmed[2], childPrice: "249,000원", weekdays: "매주 토요일", included: "왕복 KTX · 호텔 · 3식 · 전용차량", region: "전라도", theme: "맛기행", numericPrice: 279000 },
  { ...confirmed[3], childPrice: "459,000원", weekdays: "금·토요일 출발", included: "KTX · 선박 · 호텔 · 5식", region: "섬여행", theme: "섬여행", numericPrice: 489000 },
  { ...weekend[2], childPrice: "79,000원", weekdays: "매주 토요일", included: "왕복차량 · 입장료 · 케이블카", region: "충청도", theme: "가족체험", numericPrice: 89000, extraBadge: "마감임박" },
  { ...weekend[3], childPrice: "139,000원", weekdays: "매주 토·일요일", included: "왕복 KTX · 관광열차 탑승권", region: "부산·울산", theme: "바다여행", numericPrice: 149000 },
  { id: "AOS-DOM-0007", name: "남이섬·아침고요수목원 사계절 여행", image: images.flowers, status: "예약가능", statusColor: "green", date: "8월 29일 토요일", departure: "청량리역 출발", transport: "ITX", duration: "당일", spots: "남이섬 · 아침고요수목원 · 가평잣향기푸른숲", seats: "20석", price: "89,000원", childPrice: "79,000원", weekdays: "매일 출발", included: "왕복 ITX · 입장료 · 전용차량", region: "경기·인천", theme: "계절꽃", numericPrice: 89000 },
  { id: "AOS-DOM-0008", name: "제주 동부 오름과 숲길 힐링 2박3일", image: images.island, status: "예약가능", statusColor: "green", date: "9월 5일 토요일", departure: "김포공항 출발", transport: "항공+버스", duration: "2박3일", spots: "비자림 · 성산일출봉 · 섭지코지 · 동문시장", seats: "15석", price: "399,000원", childPrice: "359,000원", weekdays: "매주 금·토요일", included: "왕복항공 · 호텔 · 4식 · 전용차량", region: "제주도", theme: "가족체험", numericPrice: 399000 },
  { id: "AOS-DOM-0009", name: "통영 욕지도·연화도 섬 트레킹 1박2일", image: images.sea, status: "출발유력", statusColor: "indigo", date: "9월 12일 토요일", departure: "부산 출발", transport: "버스+선박", duration: "1박2일", spots: "욕지도 · 연화도 · 동피랑 · 통영중앙시장", seats: "10석", price: "219,000원", childPrice: "199,000원", weekdays: "격주 토요일", included: "왕복차량 · 선박 · 숙박 · 3식", region: "경상도", theme: "트레킹", numericPrice: 219000 },
  { ...supportProducts[0], childPrice: "49,000원", weekdays: "매주 일요일", included: "왕복차량 · 체험료 · 중식", region: "강원도", theme: "지역축제", numericPrice: 59000, extraBadge: "지자체지원" },
  { ...supportProducts[1], childPrice: "59,000원", weekdays: "매주 토요일", included: "왕복차량 · 입장료 · 인솔자", region: "충청도", theme: "가족체험", numericPrice: 69000, extraBadge: "지자체지원" },
  { ...supportProducts[2], childPrice: "179,000원", weekdays: "월 2회 토요일", included: "왕복 KTX · 숙박 · 전용차량 · 3식", region: "전라도", theme: "맛기행", numericPrice: 199000, extraBadge: "지자체지원" },
];

type FilterState = {
  keyword: string; dateFrom: string; dateTo: string; duration: string;
  weekdays: string[]; price: string; status: string;
};

const initialFilters: FilterState = { keyword: "", dateFrom: "", dateTo: "", duration: "", weekdays: [], price: "", status: "" };

export function DomesticPage({ path = "/domestic" }: { path?: string }) {
  const [weekendTab, setWeekendTab] = useState("토요일 출발");
  const [region, setRegion] = useState("강원도");
  const [search, setSearch] = useState({ date: "", departure: "서울", duration: "전체", transport: "전체", keyword: "" });
  const isHome = path === "/domestic";
  const title = routeNames[path] || (path.startsWith("/domestic/products/") ? "국내여행 상품상세" : "국내여행 서비스");

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = new URLSearchParams(search).toString();
    window.location.href = `/domestic/products?${query}`;
  };

  if (path === "/domestic/products") return <ProductListPage />;
  if (path === "/domestic/products/AOS-DOM-0001") return <ProductDetailPage />;
  if (path === "/domestic/search") return <SearchPage />;
  if (path === "/domestic/departure-confirmed") return <DepartureConfirmedPage />;
  if (path === "/domestic/promotions") return <PromotionsPage />;
  if (path === "/domestic/reservation/complete") return <ReservationCompletePage />;
  if (path === "/domestic/reservation") return <ReservationPage />;
  if (path === "/domestic/reservations") return <ReservationsLookupPage />;
  if (path === "/domestic/mypage") return <MyPage />;
  if (path === "/domestic/customer") return <CustomerCenterPage />;
  if (path === "/domestic/boarding") return <BoardingPage />;
  if (path === "/domestic/group-quote") return <GroupQuotePage />;

  if (!isHome) return <main className="dom-page dom-placeholder"><div className="dom-container">
    <nav className="dom-breadcrumb" aria-label="현재 위치"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><span>{title}</span></nav>
    <section className="dom-ready-card"><div className="dom-ready-icon"><Icon name={title.includes("단체") ? "users" : title.includes("출발장소") ? "map" : title.includes("고객") ? "headset" : "calendar"} size={30}/></div><span>AOS DOMESTIC TRAVEL</span><h1>{title}</h1><p>공통 디자인 시스템 적용이 완료되었습니다.<br/>이 페이지의 상세 콘텐츠는 다음 제작 단계에서 구성됩니다.</p><div><a className="dom-btn dom-btn-primary" href="/domestic">국내여행 홈</a><a className="dom-btn dom-btn-secondary" href="/domestic/products">상품목록 보기</a></div></section>
  </div></main>;

  return <main className="dom-page dom-home">
    <section className="dom-home-hero">
      <div className="dom-hero-shade" />
      <div className="dom-container dom-home-hero-copy"><span>TRAVEL KOREA WITH AOS</span><h1>이번 주말, 어디로 떠나세요?</h1><p>출발일과 출발지역만 선택하면 예약 가능한 국내여행을 바로 찾을 수 있습니다.</p></div>
    </section>

    <div className="dom-container dom-search-wrap">
      <form id="dom-trip-search" className="dom-trip-search" onSubmit={submitSearch}>
        <div className="dom-trip-search-fields">
          <label><span>출발일</span><input type="date" value={search.date} onChange={(e) => setSearch({...search, date: e.target.value})}/></label>
          <label><span>출발지역</span><select value={search.departure} onChange={(e) => setSearch({...search, departure: e.target.value})}><option>서울</option><option>경기·인천</option><option>부산</option><option>대전</option><option>광주</option></select></label>
          <label><span>여행기간</span><select value={search.duration} onChange={(e) => setSearch({...search, duration: e.target.value})}><option>전체</option><option>당일</option><option>1박2일</option><option>2박3일</option><option>3박 이상</option></select></label>
          <label><span>교통수단</span><select value={search.transport} onChange={(e) => setSearch({...search, transport: e.target.value})}><option>전체</option><option>KTX</option><option>SRT</option><option>관광열차</option><option>리무진버스</option><option>선박</option></select></label>
          <label className="keyword"><span>어디로 떠나세요?</span><input value={search.keyword} onChange={(e) => setSearch({...search, keyword: e.target.value})} placeholder="여행지·관광지·상품명"/></label>
          <button type="submit"><Icon name="search" size={20}/> 상품검색</button>
        </div>
        <div className="dom-search-chips"><b>빠른 검색</b>{["오늘 출발", "이번 주말", "1박2일", "서울 출발", "부산 출발", "출발확정만 보기"].map((chip) => <a href={`/domestic/products?quick=${encodeURIComponent(chip)}`} key={chip}>{chip}</a>)}</div>
      </form>
    </div>

    <section className="dom-home-section dom-quick-section"><div className="dom-container">
      <SectionTitle kicker="QUICK FIND" title="빠른 여행 찾기" subtitle="원하는 여행 형태를 선택해 바로 상품을 확인하세요."/>
      <div className="dom-quick-grid">{quickFind.map(([label, icon, href]) => <a key={label} href={href}><span><Icon name={icon} size={27}/></span><b>{label}</b><Icon name="chevron" size={15}/></a>)}</div>
    </div></section>

    <section className="dom-home-section dom-confirmed-section"><div className="dom-container">
      <SectionTitle kicker="DEPARTURE CONFIRMED" title="출발확정 상품" subtitle="출발이 확정되어 안심하고 예약할 수 있는 여행입니다." href="/domestic/departure-confirmed"/>
      <div className="dom-product-grid">{confirmed.map((product) => <ProductCard key={product.id} product={product}/>)}</div>
    </div></section>

    <section className="dom-home-section"><div className="dom-container">
      <SectionTitle kicker="WEEKEND PICK" title="이번 주말 추천" subtitle="가까운 주말, 잔여좌석이 있는 상품만 모았습니다."/>
      <div className="dom-tabs" role="tablist">{["토요일 출발", "일요일 출발", "연휴 출발", "마감임박"].map((tab) => <button key={tab} className={weekendTab === tab ? "active" : ""} onClick={() => setWeekendTab(tab)} role="tab" aria-selected={weekendTab === tab}>{tab}</button>)}</div>
      <div className="dom-product-grid dom-compact-products">{weekend.map((product, index) => <ProductCard key={`${weekendTab}-${product.id}`} product={{...product, date: weekendTab === "일요일 출발" && index % 2 === 0 ? "8월 23일 일요일" : product.date}} compact/>)}</div>
    </div></section>

    <section className="dom-home-section dom-theme-section"><div className="dom-container">
      <SectionTitle kicker="SEASONAL THEME" title="지금 떠나기 좋은 테마" subtitle="계절과 취향에 맞는 특별한 국내여행을 만나보세요." href="/domestic/promotions"/>
      <div className="dom-theme-grid">{themes.map(([title, text, image, query]) => <a href={`/domestic/promotions#${query === "autumn" ? "autumn" : query === "food" ? "food" : query === "family" ? "family" : query === "dmz" ? "dmz" : "promotion-list"}`} key={title} style={{backgroundImage: `linear-gradient(180deg, transparent 25%, rgba(9,24,40,.8) 100%), url(${image})`}}><div><strong>{title}</strong><span>{text}</span></div><i><Icon name="arrow" size={17}/></i></a>)}</div>
    </div></section>

    <section className="dom-home-section"><div className="dom-container">
      <SectionTitle kicker="BY REGION" title="지역별 추천" subtitle="지도보다 빠르게, 원하는 지역의 인기 여행을 찾아보세요."/>
      <div className="dom-tabs dom-region-tabs" role="tablist">{regions.map((tab) => <button key={tab} className={region === tab ? "active" : ""} onClick={() => setRegion(tab)} role="tab" aria-selected={region === tab}>{tab}</button>)}</div>
      <div className="dom-region-panel"><div className="dom-region-copy"><span>{region} 추천</span><h3>{region}에서 만나는<br/>가장 좋은 여행</h3><p>자연, 미식, 문화가 어우러진<br/>{region} 인기 상품을 확인하세요.</p><a href={`/domestic/products?region=${encodeURIComponent(region)}`}>전체 상품 보기 <Icon name="arrow" size={17}/></a></div><div className="dom-region-products">{confirmed.slice(0,3).map((product, index) => <ProductCard key={`${region}-${product.id}`} product={{...product, name: index === 0 ? `${region} 자연명소 핵심 당일여행` : product.name}} compact/>)}</div></div>
    </div></section>

    <section className="dom-home-section dom-recommend-section"><div className="dom-container">
      <SectionTitle kicker="AOS RECOMMENDS" title="AOS 추천상품" subtitle="예약 데이터와 고객 만족도를 바탕으로 엄선했습니다." href="/domestic/products?sort=recommended"/>
      <div className="dom-product-grid">{recommended.map((product) => <ProductCard key={product.id} product={product}/>)}</div>
    </div></section>

    <section className="dom-home-section dom-support-section"><div className="dom-container">
      <SectionTitle kicker="LOCAL GOVERNMENT SUPPORT" title="지자체 지원상품" subtitle="지역 지원 혜택으로 더 합리적인 가격에 떠나세요." href="/domestic/promotions"/>
      <div className="dom-support-grid">{supportProducts.map((product) => <SupportCard key={product.id} product={product}/>)}</div>
    </div></section>

    <section className="dom-home-section dom-group-section"><div className="dom-container dom-group-banner"><div><span>GROUP TRAVEL</span><h2>우리 모임만을 위한 국내여행</h2><p>인원과 희망지역만 알려주시면 맞춤 일정과 견적을 보내드립니다.</p><ul><li>기업·협회 워크숍</li><li>학교·기관 체험학습</li><li>가족·친목 모임</li></ul></div><div className="dom-group-actions"><a className="dom-btn dom-btn-primary" href="/domestic/group-quote">단체견적 문의 <Icon name="arrow" size={18}/></a><a className="dom-btn dom-btn-secondary" href="/domestic/customer"><Icon name="chat" size={18}/> 카카오 상담</a></div></div></section>

    <section className="dom-home-section dom-info-section"><div className="dom-container">
      <div className="dom-info-grid">
        <article><header><span>TRAVEL REVIEW</span><h3>여행후기</h3><a href="/domestic/customer">더보기</a></header><a className="dom-review" href="/domestic/products/AOS-DOM-0001"><div style={{backgroundImage: `url(${images.mountain})`}}/><p><b>철원 여행, 설명도 알차고 부모님도 좋아하셨어요.</b><span>DMZ와 소이산을 하루에 편하게 다녀왔습니다.</span><small>★★★★★ &nbsp; 김*영 고객님</small></p></a></article>
        <article><header><span>NOTICE</span><h3>공지사항</h3><a href="/domestic/customer">더보기</a></header><ul className="dom-notice"><li><a href="/domestic/customer"><span>국내여행 출발 전 확인사항 안내</span><time>08.14</time></a></li><li><a href="/domestic/customer"><span>연휴 기간 고객센터 운영 안내</span><time>08.11</time></a></li><li><a href="/domestic/customer"><span>여행자보험 가입 및 보상 안내</span><time>08.06</time></a></li><li><a href="/domestic/customer"><span>출발장소별 탑승 안내</span><time>08.01</time></a></li></ul></article>
        <article className="dom-customer-card"><span>CUSTOMER CENTER</span><h3>1588-0000</h3><p>평일 09:00–18:00<br/>토·일·공휴일 휴무</p><a href="/domestic/customer"><Icon name="chat" size={18}/> 카카오 상담하기</a></article>
      </div>
      <div className="dom-help-links"><a href="/domestic/boarding"><Icon name="map" size={21}/><span><b>출발장소 안내</b><small>탑승 위치와 시간을 확인하세요</small></span><Icon name="chevron" size={16}/></a><a href="/domestic/customer?guide=refund"><Icon name="calendar" size={21}/><span><b>취소·환불 안내</b><small>예약 전 규정을 확인하세요</small></span><Icon name="chevron" size={16}/></a><a href="/domestic/customer?guide=insurance"><Icon name="shield" size={21}/><span><b>여행자보험 안내</b><small>안전한 여행을 준비하세요</small></span><Icon name="chevron" size={16}/></a></div>
    </div></section>

    <div className="dom-mobile-fixed"><a href="/domestic/customer"><Icon name="chat" size={19}/> 카카오 상담</a><a href="#dom-trip-search"><Icon name="search" size={19}/> 상품검색</a></div>
  </main>;
}

const detailDates = [
  { value: "2026-08-22", label: "8월 22일", day: "토요일", status: "출발확정", color: "blue", adultPrice: 79000, childPrice: 69000, seats: 6, boardings: ["서울역", "잠실역", "현지합류"], bookable: true },
  { value: "2026-08-23", label: "8월 23일", day: "일요일", status: "출발유력", color: "indigo", adultPrice: 79000, childPrice: 69000, seats: 14, boardings: ["서울역", "잠실역", "현지합류"], bookable: true },
  { value: "2026-08-29", label: "8월 29일", day: "토요일", status: "예약가능", color: "green", adultPrice: 89000, childPrice: 79000, seats: 22, boardings: ["서울역", "잠실역", "현지합류"], bookable: true },
  { value: "2026-08-30", label: "8월 30일", day: "일요일", status: "마감임박", color: "orange", adultPrice: 89000, childPrice: 79000, seats: 3, boardings: ["잠실역", "현지합류"], bookable: true },
  { value: "2026-09-05", label: "9월 5일", day: "토요일", status: "예약마감", color: "gray", adultPrice: 89000, childPrice: 79000, seats: 0, boardings: [], bookable: false },
];

const gallery = [images.mountain, images.forest, images.city, images.food];

const itinerary = [
  { time: "06:30", title: "서울역 집결", type: "집결", place: "서울역 구광장 앞", text: "AOS 인솔자 미팅 후 탑승 확인", image: images.city },
  { time: "07:00", title: "서울역 출발", type: "리무진버스", place: "서울역", text: "전용 리무진버스로 철원 이동", image: images.train },
  { time: "07:30", title: "잠실역 출발", type: "리무진버스", place: "잠실역 3번 출구", text: "잠실 탑승 고객 합류 후 출발", image: images.city },
  { time: "10:00", title: "소이산 모노레일", type: "관광", place: "소이산", text: "모노레일 탑승과 철원평야 전망 관람", image: images.mountain },
  { time: "11:30", title: "철원 로컬 중식", type: "중식 포함", place: "철원 로컬식당", text: "지역 식재료로 차린 건강한 한상", image: images.food },
  { time: "13:00", title: "DMZ·벙커 관광", type: "전문해설", place: "철원 DMZ", text: "역사 해설과 함께 만나는 평화·안보 현장", image: images.forest },
  { time: "15:00", title: "샘통와사비농장 체험", type: "체험 포함", place: "샘통와사비농장", text: "청정 철원에서 즐기는 로컬 농장 체험", image: images.flowers },
  { time: "16:30", title: "서울 출발", type: "리무진버스", place: "철원", text: "즐거운 추억을 안고 서울로 이동", image: images.train },
  { time: "19:30", title: "서울 도착 예정", type: "도착", place: "잠실역·서울역", text: "교통상황에 따라 도착시간이 달라질 수 있습니다.", image: images.city },
];

function ProductDetailPage() {
  const [imageIndex, setImageIndex] = useState(0);
  const [media, setMedia] = useState<"image" | "video" | null>(null);
  const [wish, setWish] = useState(false);
  const [shared, setShared] = useState(false);
  const [dateView, setDateView] = useState<"calendar" | "list">("calendar");
  const [dateIndex, setDateIndex] = useState(-1);
  const [boarding, setBoarding] = useState("");
  const [adult, setAdult] = useState(0);
  const [child, setChild] = useState(0);
  const [infant, setInfant] = useState(0);
  const [option, setOption] = useState("basic");
  const [reservationError, setReservationError] = useState("");
  const [mobileSheet, setMobileSheet] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>("booking");
  const selectedDate = dateIndex >= 0 ? detailDates[dateIndex] : null;
  const adultAmount = selectedDate ? adult * selectedDate.adultPrice : 0;
  const childAmount = selectedDate ? child * selectedDate.childPrice : 0;
  const optionAmount = option === "specialty" ? 15000 : 0;
  const localDiscount = boarding === "현지합류" ? (adult + child) * 20000 : 0;
  const total = Math.max(0, adultAmount + childAmount + optionAmount - localDiscount);
  const totalPeople = adult + child + infant;

  const chooseDate = (index: number) => {
    const date = detailDates[index];
    if (!date.bookable) { setReservationError("예약마감 날짜는 선택할 수 없습니다."); return; }
    setDateIndex(index);
    setBoarding("");
    setReservationError("");
  };

  const validationMessage = () => {
    if (!selectedDate) return "출발일을 선택해 주세요.";
    if (!selectedDate.bookable) return "예약마감 날짜는 선택할 수 없습니다.";
    if (!boarding) return "승차장소를 선택해 주세요.";
    if (totalPeople === 0) return "예약 인원을 1명 이상 선택해 주세요.";
    if (totalPeople > selectedDate.seats) return `선택 인원이 잔여좌석 ${selectedDate.seats}석을 초과했습니다.`;
    return "";
  };

  const reserve = () => {
    const message = validationMessage();
    if (message) { setReservationError(message); return; }
    const params = new URLSearchParams({
      productCode: "AOS-DOM-0001",
      productName: "철원 DMZ·소이산 모노레일 당일여행",
      departureDate: selectedDate!.value,
      boarding,
      adult: String(adult), child: String(child), infant: String(infant),
      option,
      optionName: option === "specialty" ? "철원 특산품 세트" : option === "insurance" ? "여행자보험 안내" : "기본상품",
      total: String(total),
    });
    window.location.href = `/domestic/reservation?${params.toString()}`;
  };

  const share = async () => {
    const url = "/domestic/products/AOS-DOM-0001";
    if (typeof navigator !== "undefined" && navigator.share) await navigator.share({ title: "철원 DMZ·소이산 모노레일 당일여행", url }).catch(() => undefined);
    else if (typeof navigator !== "undefined") await navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
    setShared(true);
    window.setTimeout(() => setShared(false), 1500);
  };

  return <main className="dom-page dom-detail-page">
    <div className="dom-container">
      <nav className="dom-breadcrumb dom-detail-breadcrumb" aria-label="현재 위치"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><a href="/domestic">국내여행</a><Icon name="chevron" size={14}/><a href="/domestic/products?region=강원도">강원도</a><Icon name="chevron" size={14}/><a href="/domestic/products?region=철원">철원</a><Icon name="chevron" size={14}/><span>상품상세</span></nav>

      <section className="dom-detail-hero">
        <div className="dom-detail-gallery"><button className="dom-detail-main-image" style={{ backgroundImage: `url(${gallery[imageIndex]})` }} onClick={() => setMedia("image")} aria-label="대표 이미지 확대"><span><Icon name="search" size={17}/> 이미지 확대</span></button><div className="dom-detail-thumbs">{gallery.map((image, index) => <button key={image} className={imageIndex === index ? "active" : ""} style={{ backgroundImage: `url(${image})` }} onClick={() => setImageIndex(index)} aria-label={`상품 이미지 ${index + 1}`}/>)}</div><div className="dom-gallery-actions"><button onClick={() => setMedia("video")}><span>▶</span> 상품 영상</button><button onClick={share}><Icon name="arrow" size={16}/>{shared ? "주소 복사됨" : "공유하기"}</button><button className={wish ? "active" : ""} onClick={() => setWish(!wish)}><Icon name="heart" size={17}/>{wish ? "찜 완료" : "찜하기"}</button></div></div>

        <div className="dom-detail-summary"><div className="dom-detail-code"><span>상품코드 AOS-DOM-0001</span><div><span className={`dom-badge ${selectedDate?.color || "blue"}`}>{selectedDate?.status || "출발확정"}</span><span className="dom-badge transport">리무진버스</span><span className="dom-badge green">당일여행</span></div></div><h1>철원 DMZ·소이산 모노레일 당일여행</h1><p className="dom-detail-lead">대한민국의 역사와 자연, 로컬 체험을 하루에 만나는 철원 여행</p><dl className="dom-summary-list"><div><dt>출발기간</dt><dd>{selectedDate ? `2026년 ${selectedDate.label} ${selectedDate.day}` : "2026년 8월 22일 ~ 9월 5일"}</dd></div><div><dt>최소출발인원</dt><dd>20명 <span>{selectedDate ? `${selectedDate.status} · 잔여 ${selectedDate.seats}석` : "현재 출발확정"}</span></dd></div><div><dt>출발지역</dt><dd>{selectedDate ? selectedDate.boardings.join(" · ") || "예약마감" : "서울역 · 잠실역 · 현지합류"}</dd></div><div><dt>모이는 장소</dt><dd>{boarding || "서울역 / 잠실역 / 현지합류 중 선택"}</dd></div></dl><div className="dom-detail-prices"><div><span>성인</span><strong>{(selectedDate?.adultPrice || 79000).toLocaleString()}원</strong></div><div><span>소인</span><strong>{(selectedDate?.childPrice || 69000).toLocaleString()}원</strong></div><div><span>유아</span><strong>0원</strong></div></div><div className="dom-detail-summary-actions"><a href="/domestic/customer"><Icon name="headset" size={18}/> 담당자 문의</a><a href="#departure-date" className="primary"><Icon name="calendar" size={18}/> 출발일 선택</a></div></div>
      </section>

      <section className="dom-key-info" id="key-info">{[
        ["calendar", "여행기간", "당일"], ["bus", "교통수단", "리무진버스"], ["map", "출발지역", "서울역·잠실역"],
        ["users", "최소출발", "20명"], ["meal", "식사", "중식 1회 포함"], ["mountain", "주요 관광지", "소이산·DMZ·농장"],
      ].map(([icon, label, value]) => <div key={label}><span><Icon name={icon as "calendar"} size={22}/></span><p><small>{label}</small><b>{value}</b></p></div>)}</section>

      <section className="dom-departure-picker" id="departure-date"><div className="dom-detail-section-head"><div><span>DEPARTURE DATE</span><h2>출발일 선택</h2><p>출발 상태와 잔여좌석을 확인한 후 원하는 날짜를 선택하세요.</p></div><div><button className={dateView === "calendar" ? "active" : ""} onClick={() => setDateView("calendar")}>달력형</button><button className={dateView === "list" ? "active" : ""} onClick={() => setDateView("list")}>목록형</button></div></div><div className={`dom-date-options ${dateView}`}>{detailDates.map((date, index) => <button key={`${date.label}-${date.day}`} className={`${dateIndex === index ? "selected" : ""} ${!date.bookable ? "closed" : ""} ${date.status === "마감임박" ? "urgent" : ""}`} onClick={() => chooseDate(index)} disabled={!date.bookable}><span className="dom-date-check">{dateIndex === index ? "✓" : ""}</span><div><b>{date.label}</b><small>{date.day}</small></div><span className={`dom-badge ${date.color}`}>{date.status}</span><p><strong>{date.adultPrice.toLocaleString()}원</strong><small>{date.bookable ? <>잔여 <em>{date.seats}석</em></> : "선택불가"}</small></p></button>)}</div>{reservationError && !selectedDate && <p className="dom-inline-error">{reservationError}</p>}</section>
    </div>

    <nav className="dom-detail-tabs" aria-label="상품 상세 메뉴"><div className="dom-container">{[["상품 핵심정보", "key-info"], ["여행일정표", "itinerary"], ["요금안내", "fare"], ["교통·승차장소", "boarding"], ["포함·불포함", "included"], ["예약 유의사항", "notice"], ["취소·환불", "refund"], ["여행후기", "reviews"], ["상품문의", "inquiry"]].map(([label, id]) => <a href={`#${id}`} key={id}>{label}</a>)}</div></nav>

    <div className="dom-container dom-detail-content-layout"><div className="dom-detail-content">
      <section className="dom-detail-block" id="itinerary"><BlockTitle number="01" title="여행일정표" text="교통상황과 현지 사정에 따라 일정이 일부 변경될 수 있습니다."/><div className="dom-timeline">{itinerary.map((item, index) => <article key={`${item.time}-${item.title}`}><time>{item.time}</time><i/><div className="dom-timeline-copy"><div><span>{item.type}</span><b>{item.place}</b></div><h3>{item.title}</h3><p>{item.text}</p>{item.type.includes("중식") && <small>식사 포함</small>}</div><div className="dom-timeline-image" style={{ backgroundImage: `url(${item.image})` }}/>{index < itinerary.length - 1 && <span className="dom-timeline-line"/>}</article>)}</div></section>

      <section className="dom-detail-block" id="fare"><BlockTitle number="02" title="요금안내" text="출발일에 따라 상품가격이 달라질 수 있습니다."/><div className="dom-fare-table"><div><b>구분</b><b>성인</b><b>소인</b><b>유아</b></div><div><span>8월 22일·23일 출발</span><strong>79,000원</strong><strong>69,000원</strong><strong>0원</strong></div><div><span>8월 29일 이후 출발</span><strong>89,000원</strong><strong>79,000원</strong><strong>0원</strong></div></div><p className="dom-detail-note">※ 소인은 만 3세 이상~만 12세 미만, 유아는 만 3세 미만이며 좌석을 별도로 제공하지 않습니다.</p></section>

      <section className="dom-detail-block" id="boarding"><BlockTitle number="03" title="교통·승차장소" text="선택한 승차장소에 출발 10분 전까지 도착해 주세요."/><div className="dom-boarding-grid"><article><span>06:30 집결</span><h3>서울역 구광장 앞</h3><p>서울역 1번 출구에서 구광장 방향 도보 2분<br/>파란색 AOS 피켓을 확인해 주세요.</p><a href="/domestic/boarding?place=seoul">지도보기 <Icon name="arrow" size={15}/></a></article><article><span>07:20 집결 · 07:30 출발</span><h3>잠실역 3번 출구</h3><p>잠실역 3번 출구 앞 관광버스 승차구역<br/>교통혼잡을 고려해 여유 있게 도착해 주세요.</p><a href="/domestic/boarding?place=jamsil">지도보기 <Icon name="arrow" size={15}/></a></article></div><div className="dom-boarding-alert"><Icon name="chat" size={20}/><p><b>출발 전날 안내</b><span>오후 5시까지 차량번호, 인솔자 연락처, 최종 집결시간을 문자로 보내드립니다.</span></p></div></section>

      <section className="dom-detail-block" id="included"><BlockTitle number="04" title="포함·불포함" text="예약 전 포함 내역과 개인 준비사항을 확인해 주세요."/><div className="dom-inclusion-grid"><article className="included"><span>INCLUDED</span><h3>포함사항</h3>{["왕복 리무진버스", "철원 로컬 중식", "관광지 입장료", "샘통와사비농장 체험료", "전문 인솔자"].map((item) => <p key={item}>✓ {item}</p>)}</article><article className="excluded"><span>NOT INCLUDED</span><h3>불포함사항</h3>{["여행자보험", "개인경비", "제공 외 식사"].map((item) => <p key={item}>— {item}</p>)}</article></div></section>

      <section className="dom-detail-block" id="notice"><BlockTitle number="05" title="예약 유의사항·취소 환불" text="자주 확인하는 내용을 항목별로 정리했습니다."/><div className="dom-accordions">{[
        ["booking", "예약 및 출발확정 안내", "최소출발인원 20명 이상 모객 시 출발합니다. 본 상품은 8월 22일 출발확정이며, 출발 2일 전 최종 안내를 보내드립니다."],
        ["prepare", "여행 준비물과 유의사항", "신분증, 편안한 신발, 개인 상비약을 준비해 주세요. DMZ 출입 시 현장 사정에 따라 신분증 확인이 진행될 수 있습니다."],
        ["insurance", "여행자보험 안내", "국내여행자보험은 불포함입니다. 필요 시 개별 가입을 권장하며, 가입 방법은 고객센터를 통해 안내받을 수 있습니다."],
        ["refund", "취소·환불 규정", "여행개시 3일 전까지 취소 시 전액 환불, 2일 전 10%, 1일 전 20%, 당일 취소 시 30%의 취소수수료가 적용됩니다."],
        ["change", "일정 변경과 천재지변", "기상악화, 도로통제, 관광지 운영상황 등 불가피한 사유로 일정이 변경될 수 있으며 대체 일정으로 진행될 수 있습니다."],
      ].map(([key, label, text]) => <article key={key} id={key === "refund" ? "refund" : undefined}><button onClick={() => setOpenAccordion(openAccordion === key ? null : key)} aria-expanded={openAccordion === key}><b>{label}</b><span>{openAccordion === key ? "−" : "+"}</span></button>{openAccordion === key && <p>{text}</p>}</article>)}</div></section>

      <section className="dom-detail-block" id="reviews"><BlockTitle number="06" title="여행후기" text="실제 여행을 다녀온 고객님의 후기입니다."/><div className="dom-review-summary"><div><strong>4.8</strong><span>★★★★★</span><small>후기 128개</small></div><p>98%의 고객이<br/><b>이 상품을 추천합니다.</b></p></div><div className="dom-detail-review"><div className="dom-review-photos">{gallery.slice(0,3).map((image) => <span key={image} style={{ backgroundImage: `url(${image})` }}/>)}</div><p><span>★★★★★</span><b>철원 역사와 자연을 하루에 알차게 만났어요.</b><small>여행일 2026.08.08 · 김*영 고객님</small>부모님과 함께 다녀왔는데 이동이 편하고 인솔자 설명도 좋았습니다. 소이산 전망과 와사비농장 체험이 특히 기억에 남아요.</p></div></section>

      <section className="dom-detail-block" id="inquiry"><BlockTitle number="07" title="상품문의" text="예약 전 궁금한 내용을 남겨주시면 담당자가 답변드립니다."/><div className="dom-inquiry-card"><div><Icon name="headset" size={26}/><p><b>상품 담당자에게 문의하세요.</b><span>평일 09:00–18:00 · 답변은 마이페이지에서도 확인할 수 있습니다.</span></p></div><a className="dom-btn dom-btn-primary" href="/domestic/customer?type=product&productCode=AOS-DOM-0001">상품문의 등록</a></div></section>
    </div>

      <aside className="dom-reservation-card"><ReservationPanel selectedDate={selectedDate} dateIndex={dateIndex} chooseDate={chooseDate} boarding={boarding} setBoarding={setBoarding} adult={adult} setAdult={setAdult} child={child} setChild={setChild} infant={infant} setInfant={setInfant} option={option} setOption={setOption} adultAmount={adultAmount} childAmount={childAmount} optionAmount={optionAmount} localDiscount={localDiscount} total={total} error={reservationError} reserve={reserve}/></aside>
    </div>

    <div className="dom-detail-mobile-bar"><a href="/domestic/customer"><Icon name="headset" size={20}/><span>상담하기</span></a><div><small>총 예상금액</small><strong>{total.toLocaleString()}원</strong></div><button onClick={() => setMobileSheet(true)}>예약하기</button></div>

    {mobileSheet && <div className="dom-booking-sheet" role="dialog" aria-modal="true" aria-label="예약 정보 선택"><button className="dom-booking-sheet-backdrop" onClick={() => setMobileSheet(false)} aria-label="예약창 닫기"/><div className="dom-booking-sheet-body"><header><div><span>RESERVATION</span><h2>예약 정보 선택</h2></div><button onClick={() => setMobileSheet(false)} aria-label="닫기"><Icon name="close" size={22}/></button></header><div className="dom-booking-sheet-scroll"><ReservationPanel selectedDate={selectedDate} dateIndex={dateIndex} chooseDate={chooseDate} boarding={boarding} setBoarding={setBoarding} adult={adult} setAdult={setAdult} child={child} setChild={setChild} infant={infant} setInfant={setInfant} option={option} setOption={setOption} adultAmount={adultAmount} childAmount={childAmount} optionAmount={optionAmount} localDiscount={localDiscount} total={total} error={reservationError} reserve={reserve} mobile/></div></div></div>}

    {media && <div className="dom-media-modal" role="dialog" aria-modal="true" aria-label={media === "image" ? "상품 이미지 확대" : "상품 영상"}><button className="dom-media-backdrop" onClick={() => setMedia(null)} aria-label="닫기"/><div>{media === "image" ? <img src={gallery[imageIndex]} alt="철원 DMZ·소이산 모노레일 여행 확대 이미지"/> : <div className="dom-video-placeholder"><span>▶</span><h2>철원 여행 미리보기</h2><p>상품 영상은 준비 중입니다.</p></div>}<button onClick={() => setMedia(null)} aria-label="닫기"><Icon name="close" size={22}/></button></div></div>}
  </main>;
}

function BlockTitle({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="dom-block-title"><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></div>;
}

type DetailDate = typeof detailDates[number];

function ReservationPanel({ selectedDate, dateIndex, chooseDate, boarding, setBoarding, adult, setAdult, child, setChild, infant, setInfant, option, setOption, adultAmount, childAmount, optionAmount, localDiscount, total, error, reserve, mobile = false }: {
  selectedDate: DetailDate | null; dateIndex: number; chooseDate: (index: number) => void;
  boarding: string; setBoarding: (value: string) => void;
  adult: number; setAdult: (value: number) => void; child: number; setChild: (value: number) => void; infant: number; setInfant: (value: number) => void;
  option: string; setOption: (value: string) => void; adultAmount: number; childAmount: number; optionAmount: number; localDiscount: number; total: number;
  error: string; reserve: () => void; mobile?: boolean;
}) {
  const tooMany = Boolean(selectedDate && adult + child + infant > selectedDate.seats);
  return <div className={`dom-reservation-inner ${mobile ? "mobile" : ""}`}>
    {!mobile && <header><span>선택한 출발일</span><strong>{selectedDate ? `${selectedDate.label} ${selectedDate.day}` : "출발일을 선택해 주세요"}</strong><p>{selectedDate ? <><span className={`dom-badge ${selectedDate.color}`}>{selectedDate.status}</span> 잔여 {selectedDate.seats}석</> : "날짜 선택 후 예약정보를 입력할 수 있습니다."}</p></header>}
    <label><span>출발일 <em>필수</em></span><select value={dateIndex} onChange={(event) => chooseDate(Number(event.target.value))}><option value={-1}>출발일을 선택해 주세요</option>{detailDates.map((date, index) => <option value={index} key={date.value} disabled={!date.bookable}>{date.label} {date.day} · {date.status}{date.bookable ? ` · 잔여 ${date.seats}석` : ""}</option>)}</select></label>
    <label><span>승차장소 <em>필수</em></span><select value={boarding} onChange={(event) => setBoarding(event.target.value)} disabled={!selectedDate}><option value="">승차장소를 선택해 주세요</option>{selectedDate?.boardings.map((place) => <option key={place}>{place}</option>)}</select>{boarding === "현지합류" && <small className="dom-local-discount">성인·소인 1인당 20,000원 할인</small>}</label>
    <div className="dom-people-select"><Counter label="성인" sub={`${(selectedDate?.adultPrice || 79000).toLocaleString()}원`} value={adult} setValue={setAdult}/><Counter label="소인" sub={`${(selectedDate?.childPrice || 69000).toLocaleString()}원`} value={child} setValue={setChild}/><Counter label="유아" sub="0원" value={infant} setValue={setInfant}/></div>
    {tooMany && <p className="dom-reservation-warning">선택 인원이 잔여좌석 {selectedDate?.seats}석을 초과했습니다.</p>}
    <label><span>옵션</span><select value={option} onChange={(event) => setOption(event.target.value)}><option value="basic">기본상품 · 추가금 0원</option><option value="specialty">철원 특산품 세트 · +15,000원</option><option value="insurance">여행자보험 안내 · 별도 가입</option></select>{option === "insurance" && <small className="dom-insurance-note">여행자보험은 별도 가입 상품이며 결제금액에 포함되지 않습니다.</small>}</label>
    <div className="dom-price-breakdown"><h3>금액 구성</h3><p><span>성인 {adult}명</span><b>{adultAmount.toLocaleString()}원</b></p><p><span>소인 {child}명</span><b>{childAmount.toLocaleString()}원</b></p>{infant > 0 && <p><span>유아 {infant}명</span><b>0원</b></p>}{localDiscount > 0 && <p className="discount"><span>현지합류 할인</span><b>−{localDiscount.toLocaleString()}원</b></p>}<p><span>선택옵션</span><b>{optionAmount ? `${optionAmount.toLocaleString()}원` : "0원"}</b></p></div>
    <div className="dom-reservation-total"><span>총 예상결제금액</span><strong>{total.toLocaleString()}원</strong><small>성인 {adult} · 소인 {child} · 유아 {infant}</small></div>
    {error && <p className="dom-reservation-error" role="alert">{error}</p>}
    <button className={`dom-reserve-button ${tooMany ? "unavailable" : ""}`} onClick={reserve} aria-disabled={tooMany}>예약하기</button>
    {!mobile && <a className="dom-reservation-consult" href="/domestic/customer"><Icon name="headset" size={17}/> 담당자 상담</a>}
  </div>;
}

function Counter({ label, sub, value, setValue }: { label: string; sub: string; value: number; setValue: (value: number) => void }) {
  return <div><p><b>{label}</b><small>{sub}</small></p><span><button onClick={() => setValue(Math.max(0, value - 1))} aria-label={`${label} 인원 감소`} disabled={value === 0}>−</button><b>{value}</b><button onClick={() => setValue(Math.min(10, value + 1))} aria-label={`${label} 인원 증가`} disabled={value === 10}>+</button></span></div>;
}

type ReservationData = {
  productCode: string; productName: string; departureDate: string; status: string; boarding: string;
  adult: number; child: number; infant: number; option: string; optionName: string; total: number;
};

type TravelerData = { same: boolean; name: string; birth: string; gender: string; phone: string; note: string };

const defaultReservation: ReservationData = {
  productCode: "AOS-DOM-0001", productName: "철원 DMZ·소이산 모노레일 당일여행", departureDate: "2026-08-22",
  status: "출발확정", boarding: "서울역", adult: 2, child: 0, infant: 0, option: "basic", optionName: "기본상품", total: 158000,
};

function formatDepartureDate(value: string) {
  const matched = detailDates.find((date) => date.value === value);
  return matched ? `2026년 ${matched.label} ${matched.day}` : value || "2026년 8월 22일 토요일";
}

function ReservationSteps({ complete = false }: { complete?: boolean }) {
  const steps = ["상품선택", "예약정보", "결제", "예약완료"];
  return <ol className="dom-booking-steps">{steps.map((step, index) => <li key={step} className={complete ? (index <= 3 ? "done" : "") : index < 1 ? "done" : index <= 2 ? "active" : ""}><span>{index < 1 || complete ? "✓" : index + 1}</span><b>{step}</b>{index < steps.length - 1 && <i/>}</li>)}</ol>;
}

const reservationStatusBadges = [
  ["예약접수", "indigo"], ["예약확정", "blue"], ["결제대기", "orange"], ["결제완료", "green"],
  ["출발완료", "teal"], ["취소요청", "purple"], ["취소완료", "gray"],
];

function ReservationsLookupPage() {
  const [form, setForm] = useState({ number: "RSV-20260822-0001", name: "장윤호", phone: "010-1234-5678" });
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [detailOpen, setDetailOpen] = useState(true);
  const [sample, setSample] = useState<(ReservationData & { paymentPlan?: string; fullTotal?: number })>({ ...defaultReservation, paymentPlan: "full", fullTotal: defaultReservation.total });

  useEffect(() => {
    const stored = sessionStorage.getItem("aosDomesticReservation");
    if (stored) { try { setSample((current) => ({ ...current, ...JSON.parse(stored) })); } catch { /* demo fallback */ } }
  }, []);

  const lookup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.number || !form.name || !form.phone) { setError("예약번호, 예약자명, 휴대폰번호를 모두 입력해 주세요."); return; }
    setError(""); setSearched(true);
  };
  const paid = sample.total;
  const fullTotal = sample.fullTotal || sample.total;
  const balance = Math.max(0, fullTotal - paid);

  return <main className="dom-page dom-account-page"><div className="dom-container">
    <nav className="dom-breadcrumb dom-catalog-breadcrumb"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><span>예약확인</span></nav>
    <header className="dom-account-heading"><span>RESERVATION LOOKUP</span><h1>비회원 예약조회</h1><p>예약 시 입력한 정보로 예약과 결제 상태를 확인할 수 있습니다.</p></header>
    <section className="dom-lookup-panel"><div className="dom-lookup-intro"><span><Icon name="calendar" size={27}/></span><div><h2>예약정보를 입력해 주세요.</h2><p>예약완료 문자 또는 이메일에서 예약번호를 확인할 수 있습니다.</p></div></div><form onSubmit={lookup}><label><span>예약번호</span><input value={form.number} onChange={(event) => setForm({...form, number: event.target.value})} placeholder="RSV-YYYYMMDD-0000"/></label><label><span>예약자명</span><input value={form.name} onChange={(event) => setForm({...form, name: event.target.value})} placeholder="예약자 이름"/></label><label><span>휴대폰번호</span><input value={form.phone} onChange={(event) => setForm({...form, phone: event.target.value})} placeholder="010-0000-0000" inputMode="tel"/></label><button type="submit"><Icon name="search" size={18}/> 예약조회</button></form>{error && <p className="dom-lookup-error">{error}</p>}<small>※ 샘플 예약정보가 입력되어 있습니다. 예약조회 버튼을 눌러 화면을 확인해 보세요.</small></section>

    {!searched ? <section className="dom-lookup-help"><div><Icon name="shield" size={25}/><h3>예약번호를 잊으셨나요?</h3><p>예약자 본인 확인 후 고객센터에서 안내해 드립니다.</p><a href="/domestic/customer">고객센터 문의</a></div><div><Icon name="users" size={25}/><h3>회원으로 예약하셨나요?</h3><p>마이페이지에서 전체 예약내역을 확인할 수 있습니다.</p><a href="/domestic/mypage">마이페이지 이동</a></div></section> : <section className="dom-lookup-result">
      <header><div><span>조회된 예약 1건</span><h2>{form.name}님의 예약내역</h2></div><div><span className="dom-badge blue">예약확정</span><span className={`dom-badge ${balance ? "orange" : "green"}`}>{balance ? "결제대기" : "결제완료"}</span></div></header>
      <div className="dom-lookup-product"><div className="dom-lookup-product-image" role="img" aria-label="철원 DMZ·소이산 모노레일 당일여행 대표 이미지" style={{ backgroundImage: `url(${images.mountain})` }}/><div><span>{sample.productCode}</span><h3>{sample.productName}</h3><p>대한민국의 역사와 자연, 로컬 체험을 하루에 만나는 철원 여행</p><a href="/domestic/products/AOS-DOM-0001">상품 상세보기 <Icon name="chevron" size={14}/></a></div><div><small>예약번호</small><strong>RSV-20260822-0001</strong><button onClick={() => navigator.clipboard?.writeText("RSV-20260822-0001")}>복사</button></div></div>
      <div className="dom-lookup-facts"><article><span>출발일</span><b>{formatDepartureDate(sample.departureDate)}</b></article><article><span>승차장소</span><b>{sample.boarding}</b></article><article><span>예약인원</span><b>성인 {sample.adult} · 소인 {sample.child} · 유아 {sample.infant}</b></article><article><span>여행자정보</span><b className="complete">{sample.adult + sample.child + sample.infant}명 입력완료</b></article></div>
      <div className="dom-lookup-detail-grid"><section><h3>결제정보</h3><dl><div><dt>총 상품금액</dt><dd>{fullTotal.toLocaleString()}원</dd></div><div><dt>결제금액</dt><dd>{paid.toLocaleString()}원</dd></div><div className="balance"><dt>미수금</dt><dd>{balance.toLocaleString()}원</dd></div></dl>{balance > 0 && <a className="dom-btn dom-btn-primary" href={`/domestic/reservation?productCode=${sample.productCode}&total=${balance}`}>미수금 결제하기</a>}</section><section><h3>예약 요청사항</h3><dl><div><dt>좌석 요청</dt><dd>앞쪽 좌석 희망</dd></div><div><dt>식사 요청</dt><dd>요청사항 없음</dd></div><div><dt>기타 요청</dt><dd>출발 전날 문자 안내 요청</dd></div></dl><p>요청사항은 현지 상황에 따라 반영되지 않을 수 있습니다.</p></section><section><h3>담당자 안내</h3><div className="dom-manager-contact"><span><Icon name="headset" size={22}/></span><p><b>국내여행 1팀</b><small>철원 상품 담당자</small></p></div><a href="tel:15880000">1588-0000</a><small>평일 09:00–18:00 · 토·일·공휴일 휴무</small></section></div>
      <button className="dom-lookup-toggle" onClick={() => setDetailOpen(!detailOpen)}>{detailOpen ? "여행자정보 접기" : "여행자정보 보기"}<span>{detailOpen ? "−" : "+"}</span></button>{detailOpen && <div className="dom-lookup-travelers">{Array.from({ length: sample.adult + sample.child + sample.infant }, (_, index) => <article key={index}><span>{index < sample.adult ? "성인" : index < sample.adult + sample.child ? "소인" : "유아"} {index + 1}</span><p><b>{index === 0 ? form.name : `여행자 ${index + 1}`}</b><small>생년월일 · 성별 · 휴대폰 입력완료</small></p><em>입력완료</em></article>)}</div>}
      <footer><a className="dom-btn dom-btn-secondary" href="/domestic/customer?guide=cancel">예약취소 문의</a><a className="dom-btn dom-btn-primary" href="/domestic/products/AOS-DOM-0001#itinerary">일정표 보기</a></footer>
    </section>}
  </div></main>;
}

function MyPage() {
  const menus = [
    ["예약내역", "calendar"], ["출발예정 여행", "map"], ["결제내역", "shield"], ["찜한 상품", "heart"],
    ["여행후기", "chat"], ["상품문의", "headset"], ["회원정보", "users"],
  ];
  const [active, setActive] = useState("예약내역");
  const [notice, setNotice] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2300); };

  return <main className="dom-page dom-account-page dom-mypage"><div className="dom-container">
    <nav className="dom-breadcrumb dom-catalog-breadcrumb"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><span>마이페이지</span></nav>
    <header className="dom-mypage-hero"><div><span>MY AOS TRAVEL</span><h1>장윤호님, 반갑습니다.</h1><p>예약한 여행과 결제, 찜한 상품을 한곳에서 관리하세요.</p></div><div><span>회원등급</span><b>AOS FAMILY</b><small>가입일 2026.08.01</small></div></header>
    <div className="dom-mypage-layout"><aside className="dom-mypage-menu"><header><div>장</div><p><b>장윤호</b><span>taein@example.com</span></p></header><nav>{menus.map(([label, icon]) => <button key={label} className={active === label ? "active" : ""} onClick={() => setActive(label)}><Icon name={icon as "calendar"} size={18}/><span>{label}</span><Icon name="chevron" size={14}/></button>)}</nav><a href="/domestic/customer"><Icon name="headset" size={18}/><span><b>도움이 필요하세요?</b><small>고객센터 1588-0000</small></span></a></aside>
      <section className="dom-mypage-content"><header className="dom-mypage-title"><div><span>MY PAGE</span><h2>{active}</h2></div>{active === "예약내역" && <a href="/domestic/products">새 여행 찾아보기 <Icon name="chevron" size={14}/></a>}</header>
        {active === "예약내역" && <><div className="dom-my-summary"><article><span>전체 예약</span><strong>1</strong><small>최근 1년</small></article><article><span>출발예정</span><strong>1</strong><small>2026.08.22</small></article><article><span>결제완료</span><strong>1</strong><small>158,000원</small></article><article><span>찜한 상품</span><strong>3</strong><small>관심상품</small></article></div><div className="dom-status-guide"><b>예약 상태 안내</b><div>{reservationStatusBadges.map(([label, color]) => <span className={`dom-badge ${color}`} key={label}>{label}</span>)}</div></div><MemberReservationCard onNotice={showNotice} onCancel={() => setCancelOpen(true)}/></>}
        {active === "출발예정 여행" && <section className="dom-my-panel"><div className="dom-upcoming-banner"><span>출발 D-5</span><h3>철원 DMZ·소이산 모노레일 당일여행</h3><p>2026년 8월 22일 토요일 · 서울역 06:30 집결</p><div><a href="/domestic/products/AOS-DOM-0001#boarding">승차장소 확인</a><a href="/domestic/products/AOS-DOM-0001#itinerary">일정표 보기</a></div></div><ul className="dom-travel-checklist"><li><b>신분증 준비</b><span>DMZ 출입 시 필요합니다.</span><em>필수</em></li><li><b>출발 안내 문자</b><span>출발 전날 오후 5시까지 발송됩니다.</span><em>예정</em></li><li><b>여행자정보</b><span>성인 2명 입력이 완료되었습니다.</span><em className="done">완료</em></li></ul></section>}
        {active === "결제내역" && <section className="dom-my-panel"><div className="dom-payment-history"><header><span>2026.08.17</span><b>신용카드 · 전액결제</b><em className="dom-badge green">결제완료</em></header><h3>철원 DMZ·소이산 모노레일 당일여행</h3><dl><div><dt>예약번호</dt><dd>RSV-20260822-0001</dd></div><div><dt>승인금액</dt><dd>158,000원</dd></div><div><dt>승인번호</dt><dd>DEMO-26081701</dd></div><div><dt>미수금</dt><dd>0원</dd></div></dl><button onClick={() => showNotice("결제 영수증 데모 화면을 준비 중입니다.")}>영수증 보기</button></div></section>}
        {active === "찜한 상품" && <section className="dom-my-panel"><div className="dom-my-wishlist">{catalogProducts.slice(0, 3).map((product) => <CatalogCard key={product.id} product={product} view="grid"/>)}</div></section>}
        {active === "여행후기" && <section className="dom-my-panel dom-my-empty"><Icon name="chat" size={29}/><h3>작성 가능한 후기가 1건 있습니다.</h3><p>여행을 다녀온 뒤 생생한 경험을 들려주세요.</p><button className="dom-btn dom-btn-primary" onClick={() => showNotice("후기 작성은 출발완료 후 이용할 수 있습니다.")}>후기 작성</button></section>}
        {active === "상품문의" && <section className="dom-my-panel"><div className="dom-inquiry-history"><header><span className="dom-badge blue">답변완료</span><time>2026.08.16</time></header><h3>서울역 탑승 위치가 정확히 어디인가요?</h3><p><b>AOS 답변</b> 서울역 1번 출구에서 구광장 방향 도보 2분 거리이며, 파란색 AOS 피켓을 확인해 주세요.</p><a href="/domestic/customer?type=product">새 문의 등록</a></div></section>}
        {active === "회원정보" && <section className="dom-my-panel"><div className="dom-member-info"><div><span>이름</span><b>장윤호</b></div><div><span>휴대폰</span><b>010-1234-5678</b></div><div><span>이메일</span><b>taein@example.com</b></div><div><span>생년월일</span><b>1980.01.01</b></div></div><button className="dom-btn dom-btn-secondary" onClick={() => showNotice("회원정보 수정 화면은 준비 중입니다.")}>회원정보 수정</button></section>}
      </section>
    </div>
    {notice && <div className="dom-my-toast" role="status">✓ {notice}</div>}
    {cancelOpen && <div className="dom-cancel-modal" role="dialog" aria-modal="true"><button onClick={() => setCancelOpen(false)} aria-label="닫기"/><div><span><Icon name="calendar" size={24}/></span><h2>예약취소를 요청하시겠습니까?</h2><p>담당자가 취소수수료와 환불금액을 확인한 후 연락드립니다.<br/>취소 요청만으로 예약이 즉시 취소되지는 않습니다.</p><div><button onClick={() => setCancelOpen(false)}>돌아가기</button><button onClick={() => { setCancelOpen(false); showNotice("예약취소 요청이 접수되었습니다."); }}>취소 요청</button></div></div></div>}
  </div></main>;
}

function MemberReservationCard({ onNotice, onCancel }: { onNotice: (message: string) => void; onCancel: () => void }) {
  return <article className="dom-member-reservation"><header><div><span>예약번호 RSV-20260822-0001</span><time>예약일 2026.08.17</time></div><div><span className="dom-badge blue">예약확정</span><span className="dom-badge green">결제완료</span></div></header><div className="dom-member-trip"><div className="dom-member-trip-image" role="img" aria-label="철원 DMZ·소이산 모노레일 당일여행 대표 이미지" style={{ backgroundImage: `url(${images.mountain})` }}/><div><span>AOS-DOM-0001 · 당일여행</span><h3>철원 DMZ·소이산 모노레일 당일여행</h3><p>소이산 모노레일 · DMZ · 벙커 · 샘통와사비농장</p><dl><div><dt>출발일</dt><dd>2026년 8월 22일 토요일</dd></div><div><dt>승차장소</dt><dd>서울역 · 06:30 집결</dd></div><div><dt>예약인원</dt><dd>성인 2명</dd></div><div><dt>결제금액</dt><dd>158,000원 · 미수금 0원</dd></div></dl></div></div><div className="dom-member-actions"><a href="/domestic/reservations">예약상세</a><a href="/domestic/reservation?productCode=AOS-DOM-0001&total=158000">결제하기</a><button onClick={() => onNotice("여행자정보 수정 기능은 ERP 연동 단계에서 활성화됩니다.")}>여행자정보 수정</button><a href="/domestic/products/AOS-DOM-0001#itinerary">일정표 보기</a><button className="danger" onClick={onCancel}>예약취소 요청</button><button onClick={() => onNotice("후기 작성은 출발완료 후 이용할 수 있습니다.")}>후기 작성</button></div></article>;
}

const faqData: Record<string, [string, string][]> = {
  "상품예약": [["예약은 언제까지 가능한가요?", "잔여좌석이 있는 경우 출발 전날까지 예약할 수 있습니다. 다만 철도·선박 상품은 발권 일정에 따라 조기 마감될 수 있습니다."], ["최소출발인원은 어떻게 확인하나요?", "상품 상세의 핵심정보와 출발일 선택 영역에서 최소출발인원 및 현재 출발상태를 확인할 수 있습니다."]],
  "결제": [["예약금만 먼저 결제할 수 있나요?", "상품에 따라 예약금 결제가 가능합니다. 예약 후 지정된 잔금일까지 나머지 금액을 결제해 주세요."], ["법인카드로 결제할 수 있나요?", "신용카드 결제 단계에서 법인카드를 선택할 수 있으며, 단체예약은 담당자에게 별도 문의해 주세요."]],
  "출발장소": [["정확한 차량 위치는 언제 알 수 있나요?", "출발 전날 오후 5시까지 차량번호, 인솔자 연락처, 최종 집결위치를 문자로 안내합니다."], ["출발시간에 늦으면 기다려 주나요?", "전체 일정 운영을 위해 정시에 출발합니다. 반드시 집결시간 10분 전까지 도착해 주세요."]],
  "일정변경": [["비가 와도 출발하나요?", "대부분 정상 진행하지만 기상특보, 도로통제 등 안전 문제가 있으면 일정 변경 또는 취소 후 개별 안내합니다."]],
  "취소·환불": [["취소수수료는 언제부터 발생하나요?", "국내여행약관과 상품별 특별약관에 따라 여행개시 전 취소 시점별 수수료가 적용됩니다. 예약 전 상품 상세 규정을 확인해 주세요."], ["환불은 얼마나 걸리나요?", "카드는 취소 승인 후 카드사 기준 3~7영업일, 계좌환불은 확인 후 2~3영업일이 소요될 수 있습니다."]],
  "여행자정보": [["여행자 이름을 변경할 수 있나요?", "철도·선박 발권 전에는 변경할 수 있습니다. 발권 이후에는 수수료가 발생하거나 변경이 제한될 수 있습니다."]],
  "섬·선박여행": [["선박 결항 시 어떻게 되나요?", "기상으로 선박이 결항되면 대체 일정 또는 환불 기준을 확인해 담당자가 안내합니다. 섬 체류 중 결항 시 추가 체류비가 발생할 수 있습니다."]],
};

function CustomerCenterPage() {
  const categories = Object.keys(faqData);
  const [category, setCategory] = useState(categories[0]);
  const [faqOpen, setFaqOpen] = useState(0);
  const [inquiry, setInquiry] = useState({ type: "상품문의", subject: "", content: "" });
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetId = params.has("guide") ? "guides" : params.has("type") ? "inquiry" : "";
    if (params.get("type") === "product") setInquiry((current) => ({ ...current, type: "상품문의" }));
    if (targetId) window.setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ block: "start" }), 80);
  }, []);
  const submitInquiry = (event: React.FormEvent) => { event.preventDefault(); if (inquiry.subject && inquiry.content) setSent(true); };
  const quick = [["상품문의", "suitcase", "상품 일정·요금·포함사항", "#inquiry"], ["예약·결제 문의", "calendar", "예약변경·결제·미수금", "#inquiry"], ["취소·환불 안내", "shield", "취소수수료와 환불절차", "#guides"], ["여행자보험 안내", "users", "가입방법과 보상범위", "#guides"], ["여행후기", "chat", "고객님의 생생한 여행기", "#reviews"]];
  return <main className="dom-page dom-support-page"><div className="dom-container">
    <nav className="dom-breadcrumb dom-catalog-breadcrumb"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><span>고객센터</span></nav>
    <header className="dom-support-hero"><div><span>AOS CUSTOMER CENTER</span><h1>무엇을 도와드릴까요?</h1><p>국내여행 예약부터 출발까지 필요한 정보를 빠르게 찾아보세요.</p><div><Icon name="search" size={19}/><input placeholder="궁금한 내용을 검색해 보세요"/><button>검색</button></div></div><aside><span>고객센터</span><strong>1588-0000</strong><p>평일 09:00–18:00<br/>토·일·공휴일 휴무</p><div><a href="tel:15880000"><Icon name="headset" size={17}/> 전화상담</a><a href="#consult"><Icon name="chat" size={17}/> 카카오 상담</a></div></aside></header>
    <nav className="dom-support-quick">{quick.map(([label, icon, text, href]) => <a href={href} key={label}><span><Icon name={icon as "calendar"} size={23}/></span><p><b>{label}</b><small>{text}</small></p><Icon name="chevron" size={14}/></a>)}</nav>
    <div className="dom-support-layout"><div className="dom-support-main">
      <section className="dom-support-section" id="notice"><SupportSectionHead kicker="NOTICE" title="공지사항" text="여행 전 꼭 확인해야 할 소식입니다."/><div className="dom-notice-table">{[["중요", "2026년 추석 연휴 국내여행 운영 및 상담 안내", "2026.08.16"], ["안내", "국내여행 출발 전 신분증 지참 안내", "2026.08.14"], ["안내", "선박여행 기상악화 시 운영 기준 안내", "2026.08.11"], ["공지", "여행자보험 가입 및 보상 안내", "2026.08.06"]].map(([badge, title, date]) => <a href="#notice" key={title}><span className={`dom-badge ${badge === "중요" ? "orange" : "gray"}`}>{badge}</span><b>{title}</b><time>{date}</time><Icon name="chevron" size={14}/></a>)}</div></section>
      <section className="dom-support-section" id="faq"><SupportSectionHead kicker="FAQ" title="자주 묻는 질문" text="카테고리를 선택하면 필요한 답을 빠르게 확인할 수 있습니다."/><div className="dom-faq-categories">{categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => { setCategory(item); setFaqOpen(0); }}>{item}</button>)}</div><div className="dom-faq-list">{faqData[category].map(([question, answer], index) => <article key={question}><button onClick={() => setFaqOpen(faqOpen === index ? -1 : index)} aria-expanded={faqOpen === index}><span>Q</span><b>{question}</b><em>{faqOpen === index ? "−" : "+"}</em></button>{faqOpen === index && <div><span>A</span><p>{answer}</p></div>}</article>)}</div></section>
      <section className="dom-support-section" id="guides"><SupportSectionHead kicker="TRAVEL GUIDE" title="취소·환불 및 보험 안내" text="예약 전 필수 안내사항을 확인해 주세요."/><div className="dom-policy-cards"><article><span><Icon name="calendar" size={22}/></span><h3>취소·환불 안내</h3><p>여행개시 전 취소 시점에 따라 국내여행약관과 상품별 특별약관의 취소수수료가 적용됩니다.</p><ul><li>3일 전까지: 전액 환불</li><li>2일 전: 10% 공제</li><li>1일 전: 20% 공제</li><li>당일: 30% 공제</li></ul><a href="/domestic/products/AOS-DOM-0001#refund">규정 자세히 보기</a></article><article><span><Icon name="shield" size={22}/></span><h3>여행자보험 안내</h3><p>국내여행자보험은 기본 상품가에 포함되지 않으며, 안전한 여행을 위해 개별 가입을 권장합니다.</p><ul><li>출발 전 개별 가입</li><li>보장범위와 면책사항 확인</li><li>사고 시 증빙서류 보관</li><li>보험사별 보장내용 상이</li></ul><a href="#inquiry">가입방법 문의하기</a></article></div></section>
      <section className="dom-support-section" id="inquiry"><SupportSectionHead kicker="1:1 INQUIRY" title="상품·예약·결제 문의" text="담당자가 확인 후 입력한 연락처로 답변드립니다."/>{sent ? <div className="dom-inquiry-complete"><span>✓</span><h3>문의가 정상적으로 접수되었습니다.</h3><p>문의번호 <b>INQ-20260817-0001</b><br/>평일 기준 1영업일 이내 답변드리겠습니다.</p><button onClick={() => { setSent(false); setInquiry({ type: "상품문의", subject: "", content: "" }); }}>새 문의 작성</button></div> : <form className="dom-support-inquiry" onSubmit={submitInquiry}><div><label><span>문의유형</span><select value={inquiry.type} onChange={(event) => setInquiry({...inquiry, type: event.target.value})}><option>상품문의</option><option>예약·결제 문의</option><option>취소·환불 문의</option><option>여행자정보 문의</option><option>기타문의</option></select></label><label><span>예약번호 또는 상품코드</span><input placeholder="선택 입력"/></label></div><label><span>제목</span><input value={inquiry.subject} onChange={(event) => setInquiry({...inquiry, subject: event.target.value})} placeholder="문의 제목을 입력해 주세요" required/></label><label><span>문의내용</span><textarea value={inquiry.content} onChange={(event) => setInquiry({...inquiry, content: event.target.value})} placeholder="문의 내용을 자세히 입력해 주세요" required/></label><div><small>개인정보 및 결제정보 전체를 입력하지 마세요.</small><button type="submit">문의 등록</button></div></form>}</section>
      <section className="dom-support-section" id="reviews"><SupportSectionHead kicker="TRAVEL REVIEW" title="여행후기" text="AOS와 여행한 고객님의 실제 후기입니다."/><div className="dom-support-reviews">{[[images.mountain, "철원 DMZ 여행, 부모님도 만족하셨어요", "해설과 일정 운영이 알차고 버스도 편안했습니다.", "김*영", "/domestic/products/AOS-DOM-0001#reviews"], [images.sea, "강릉 바다열차로 편하게 다녀왔어요", "정동진과 안목해변을 하루에 여유롭게 즐겼습니다.", "이*수", "/domestic/products/AOS-DOM-0002#reviews"]].map(([image, title, text, name, path]) => <a href={path} key={title}><div role="img" aria-label={`${title} 후기 이미지`} style={{ backgroundImage: `url(${image})` }}/><p><span>★★★★★</span><b>{title}</b><small>{text}</small><em>{name} 고객님</em></p></a>)}</div></section>
    </div><aside className="dom-support-side" id="consult"><section><span>상담시간</span><strong>평일 09:00–18:00</strong><p>점심 12:00–13:00<br/>토·일·공휴일 휴무</p></section><section><h3>빠른 상담</h3><a href="tel:15880000"><Icon name="headset" size={19}/><p><b>전화상담</b><small>1588-0000</small></p><Icon name="chevron" size={14}/></a><a href="#consult" className="kakao"><Icon name="chat" size={19}/><p><b>카카오 상담</b><small>평일 실시간 상담</small></p><Icon name="chevron" size={14}/></a></section><section><h3>바로가기</h3><a href="/domestic/reservations">비회원 예약조회</a><a href="/domestic/boarding">출발장소 안내</a><a href="/domestic/group-quote">단체견적 문의</a></section></aside></div>
  </div></main>;
}

function SupportSectionHead({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return <header className="dom-support-section-head"><span>{kicker}</span><h2>{title}</h2><p>{text}</p></header>;
}

const boardingPlaces = [
  { name: "서울역", position: "서울역 구광장 앞 AOS 전용 피켓", exit: "1번 출구 · 구광장 방향 도보 2분", time: "출발 30분 전 집결", guide: "파란색 AOS 피켓과 인솔자 명찰 확인", parking: "서울역 공항철도 주차장 이용 · 유료", notice: "버스 정차시간이 짧으니 출발 10분 전까지 탑승해 주세요." },
  { name: "용산역", position: "용산역 3번 출구 앞 관광버스 승차구역", exit: "3번 출구 · 아이파크몰 반대편", time: "열차 출발 30분 전 집결", guide: "대합실 전광판 아래 AOS 피켓 확인", parking: "아이파크몰 주차장 이용 · 유료", notice: "KTX 승차권은 인솔자가 현장에서 배부합니다." },
  { name: "청량리역", position: "청량리역 4번 출구 롯데백화점 앞", exit: "4번 출구 · 도보 1분", time: "열차 출발 30분 전 집결", guide: "AOS 로고가 표시된 인솔자 명찰 확인", parking: "롯데백화점 주차장 이용 · 유료", notice: "주말 교통이 혼잡하므로 대중교통 이용을 권장합니다." },
  { name: "수서역", position: "SRT 수서역 지하 1층 3번 출구 앞", exit: "3번 출구 안쪽 대합실", time: "열차 출발 30분 전 집결", guide: "대합실 안내데스크 옆 AOS 피켓 확인", parking: "수서역 공영주차장 이용 · 유료", notice: "모바일 승차권 발송 여부를 출발 전날 확인해 주세요." },
  { name: "영등포구청역", position: "영등포구청역 4번 출구 앞", exit: "4번 출구 · 구청 방향", time: "버스 출발 20분 전 집결", guide: "관광버스 앞 AOS 행선지 표지 확인", parking: "인근 공영주차장 이용 · 공간 협소", notice: "출근시간대 정체를 고려해 여유 있게 도착해 주세요." },
  { name: "잠실역", position: "잠실역 3번 출구 앞 관광버스 승차구역", exit: "3번 출구 · 롯데월드타워 반대편", time: "버스 출발 20분 전 집결", guide: "파란색 AOS 피켓과 차량 앞 상품명 확인", parking: "잠실역 환승주차장 이용 · 유료", notice: "관광버스가 순차 진입하므로 인솔자 안내에 따라 탑승해 주세요." },
  { name: "부산역", position: "부산역 2층 대합실 5번 출구 앞", exit: "5번 출구 · 택시승강장 방향", time: "출발 30분 전 집결", guide: "AOS 부산 출발 안내판 확인", parking: "부산역 선상주차장 이용 · 유료", notice: "부산 현지 전용차량 번호는 출발 전날 발송됩니다." },
  { name: "현지합류", position: "상품별 첫 관광지 또는 지정 미팅장소", exit: "출발 전날 개별 안내", time: "일정 시작 20분 전 집결", guide: "인솔자에게 예약자명과 휴대폰 뒷자리 확인", parking: "장소별 상이 · 사전 문의 필수", notice: "현지합류는 상품별 가능 여부와 할인금액이 다를 수 있습니다." },
];

function BoardingPage() {
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const place = new URLSearchParams(window.location.search).get("place");
    if (place === "jamsil") setSelected(5);
    else if (place === "yongsan") setSelected(1);
    else if (place === "cheongnyangni") setSelected(2);
    else if (place === "suseo") setSelected(3);
    else if (place === "yeongdeungpo") setSelected(4);
    else if (place === "busan") setSelected(6);
    else if (place === "local") setSelected(7);
  }, []);
  const place = boardingPlaces[selected];
  return <main className="dom-page dom-boarding-page"><div className="dom-container"><nav className="dom-breadcrumb dom-catalog-breadcrumb"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><a href="/domestic/customer">고객센터</a><Icon name="chevron" size={14}/><span>출발장소 안내</span></nav><header className="dom-boarding-hero"><div><span>BOARDING GUIDE</span><h1>출발장소 안내</h1><p>선택한 장소의 정확한 집결 위치와 탑승 안내를 확인하세요.</p></div><aside><Icon name="calendar" size={21}/><p><b>출발 전날 최종 안내</b><span>오후 5시까지 차량번호·인솔자 연락처·집결시간을 문자로 발송합니다.</span></p></aside></header>
    <div className="dom-boarding-tabs">{boardingPlaces.map((item, index) => <button key={item.name} className={selected === index ? "active" : ""} onClick={() => setSelected(index)}>{item.name}</button>)}</div>
    <section className="dom-boarding-detail"><header><div><span>SELECTED LOCATION</span><h2>{place.name}</h2><p>{place.position}</p></div><span className="dom-badge blue">집결장소</span></header><div className="dom-map-layout"><div className="dom-map-demo"><div className="road road-a"/><div className="road road-b"/><div className="road road-c"/><span className="block block-a"/><span className="block block-b"/><span className="block block-c"/><div className="dom-map-pin"><Icon name="map" size={23}/><b>{place.name}</b><small>AOS 집결지</small></div><em>지도 연동 영역</em></div><div className="dom-boarding-info"><article><span><Icon name="map" size={20}/></span><p><small>정확한 집결 위치</small><b>{place.position}</b></p></article><article><span><Icon name="arrow" size={20}/></span><p><small>지하철 출구</small><b>{place.exit}</b></p></article><article><span><Icon name="calendar" size={20}/></span><p><small>집결시간 안내</small><b>{place.time}</b></p></article><article><span><Icon name="users" size={20}/></span><p><small>인솔자 확인방법</small><b>{place.guide}</b></p></article><article><span><Icon name="suitcase" size={20}/></span><p><small>주차 안내</small><b>{place.parking}</b></p></article></div></div><div className="dom-boarding-caution"><Icon name="shield" size={19}/><p><b>이용 유의사항</b><span>{place.notice} 출발시간 이후에는 개별 이동 및 환불이 어려울 수 있습니다.</span></p></div><footer><a href="https://map.kakao.com" target="_blank" rel="noreferrer"><Icon name="map" size={17}/> 카카오맵에서 보기</a><a href="/domestic/customer"><Icon name="headset" size={17}/> 위치 문의하기</a></footer></section>
    <section className="dom-boarding-common"><SupportSectionHead kicker="BEFORE DEPARTURE" title="출발 전 공통 확인사항" text="원활한 출발을 위해 아래 내용을 꼭 확인해 주세요."/><div>{[["01", "10분 전 도착", "집결시간보다 최소 10분 일찍 도착해 주세요."], ["02", "신분증 지참", "철도·선박·DMZ 상품은 신분증이 필요합니다."], ["03", "안내문자 확인", "차량번호와 인솔자 연락처를 확인해 주세요."], ["04", "비상연락", "지연 시 즉시 인솔자 또는 고객센터로 연락해 주세요."]].map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
  </div></main>;
}

function GroupQuotePage() {
  const targets = ["기업", "협회", "학교", "교회", "동호회", "가족모임", "공공기관"];
  const [target, setTarget] = useState("기업");
  const [form, setForm] = useState({ group: "", manager: "", phone: "", email: "", people: "", date: "", duration: "", departure: "", destination: "", transport: "", budget: "", request: "" });
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm({...form, [key]: value});
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!form.group || !form.manager || !form.phone || !form.people || !form.date || !privacy) { setError("필수항목을 입력하고 개인정보 수집·이용에 동의해 주세요."); return; } setError(""); setComplete(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  if (complete) return <main className="dom-page dom-quote-page"><div className="dom-container"><nav className="dom-breadcrumb dom-catalog-breadcrumb"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><span>단체견적 문의</span></nav><section className="dom-quote-complete"><div>✓</div><span>QUOTE REQUEST COMPLETE</span><h1>단체견적 요청이 접수되었습니다.</h1><p>담당자가 요청내용을 확인한 후 평일 기준 1영업일 이내 연락드리겠습니다.</p><dl><div><dt>접수번호</dt><dd>QTE-20260817-0001</dd></div><div><dt>단체명</dt><dd>{form.group}</dd></div><div><dt>단체유형</dt><dd>{target}</dd></div><div><dt>예상인원</dt><dd>{form.people}명</dd></div><div><dt>희망 출발일</dt><dd>{form.date}</dd></div><div><dt>희망지역</dt><dd>{form.destination || "담당자와 협의"}</dd></div></dl><div><a className="dom-btn dom-btn-primary" href="/domestic">국내여행 메인</a><button className="dom-btn dom-btn-secondary" onClick={() => setComplete(false)}>요청내용 다시보기</button></div><small>향후 AOS ERP 단체견적 관리에서 접수·상담·견적서 발송 상태를 통합 관리할 수 있습니다.</small></section></div></main>;
  return <main className="dom-page dom-quote-page"><div className="dom-container"><nav className="dom-breadcrumb dom-catalog-breadcrumb"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><span>단체견적 문의</span></nav><header className="dom-quote-hero"><div><span>GROUP TRAVEL</span><h1>우리 모임만을 위한 국내여행</h1><p>인원과 희망지역만 알려주시면 전담자가 맞춤 일정과 견적을 보내드립니다.</p></div><div><article><strong>1</strong><span>요청서 작성</span></article><i/><article><strong>2</strong><span>전담자 상담</span></article><i/><article><strong>3</strong><span>맞춤 견적서</span></article><i/><article><strong>4</strong><span>예약 확정</span></article></div></header>
    <section className="dom-quote-benefits">{[["users", "단체 맞춤 일정", "목적과 연령대를 반영한 전용 일정"], ["suitcase", "전용차량·숙박", "인원과 예산에 맞춘 최적 구성"], ["headset", "전담자 1:1 상담", "견적부터 행사 진행까지 전담 관리"]].map(([icon, title, text]) => <article key={title}><span><Icon name={icon as "users"} size={23}/></span><p><b>{title}</b><small>{text}</small></p></article>)}</section>
    <form className="dom-quote-form" onSubmit={submit}><section><QuoteHead number="01" title="단체 유형" text="가장 가까운 단체 유형을 선택해 주세요."/><div className="dom-target-chips">{targets.map((item) => <button type="button" key={item} className={target === item ? "active" : ""} onClick={() => setTarget(item)}>{item}</button>)}</div></section><section><QuoteHead number="02" title="담당자 및 단체정보" text="견적 상담을 위해 정확한 연락처를 입력해 주세요."/><div className="dom-quote-fields"><label><span>단체명 <em>*</em></span><input value={form.group} onChange={(event) => update("group", event.target.value)} placeholder="회사·학교·모임명"/></label><label><span>담당자명 <em>*</em></span><input value={form.manager} onChange={(event) => update("manager", event.target.value)} placeholder="담당자 이름"/></label><label><span>휴대폰 <em>*</em></span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="010-0000-0000"/></label><label><span>이메일</span><input value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="quote@example.com" type="email"/></label><label><span>예상인원 <em>*</em></span><div className="with-unit"><input value={form.people} onChange={(event) => update("people", event.target.value)} placeholder="예: 30" inputMode="numeric"/><b>명</b></div></label></div></section><section><QuoteHead number="03" title="희망 여행조건" text="정해지지 않은 항목은 담당자와 상담 후 결정할 수 있습니다."/><div className="dom-quote-fields"><label><span>희망 출발일 <em>*</em></span><input value={form.date} onChange={(event) => update("date", event.target.value)} type="date"/></label><label><span>희망 여행기간</span><select value={form.duration} onChange={(event) => update("duration", event.target.value)}><option value="">선택</option><option>당일</option><option>1박2일</option><option>2박3일</option><option>3박 이상</option></select></label><label><span>출발지역</span><select value={form.departure} onChange={(event) => update("departure", event.target.value)}><option value="">선택</option><option>서울</option><option>경기·인천</option><option>대전</option><option>광주</option><option>부산</option><option>기타지역</option></select></label><label><span>희망지역</span><input value={form.destination} onChange={(event) => update("destination", event.target.value)} placeholder="예: 강원 철원, 전남 여수"/></label><label><span>교통수단</span><select value={form.transport} onChange={(event) => update("transport", event.target.value)}><option value="">담당자 추천</option><option>전용버스</option><option>리무진버스</option><option>KTX</option><option>SRT</option><option>항공</option><option>선박 포함</option></select></label><label><span>예상예산</span><select value={form.budget} onChange={(event) => update("budget", event.target.value)}><option value="">1인 예산 선택</option><option>10만원 미만</option><option>10~20만원</option><option>20~40만원</option><option>40만원 이상</option><option>협의 필요</option></select></label><label className="wide"><span>요청사항</span><textarea value={form.request} onChange={(event) => update("request", event.target.value)} placeholder="여행목적, 꼭 포함할 관광지, 식사·숙박 조건, 연령대 등 요청사항을 자세히 알려주세요."/></label></div></section><footer><label><input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)}/><span><b>[필수] 개인정보 수집·이용에 동의합니다.</b><small>견적 상담을 위해 이름, 연락처, 이메일을 수집하며 상담 완료 후 관련 규정에 따라 보관합니다.</small></span></label>{error && <p>{error}</p>}<button type="submit">맞춤 견적 요청하기 <Icon name="chevron" size={15}/></button><small>실제 전송 없이 완료 상태를 확인하는 데모 기능입니다.</small></footer></form>
  </div></main>;
}

function QuoteHead({ number, title, text }: { number: string; title: string; text: string }) {
  return <header className="dom-quote-head"><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></header>;
}

function ReservationPage() {
  const [data, setData] = useState<ReservationData>(defaultReservation);
  const [bookingType, setBookingType] = useState<"member" | "guest">("member");
  const [booker, setBooker] = useState({ name: "", phone: "", email: "", birth: "", emergency: "" });
  const [travelers, setTravelers] = useState<Record<string, TravelerData>>({});
  const [requests, setRequests] = useState({ seat: "", meal: "", other: "" });
  const [payment, setPayment] = useState("card");
  const [paymentPlan, setPaymentPlan] = useState<"deposit" | "full">("full");
  const [agreements, setAgreements] = useState({ terms: false, privacy: false, refund: false, insurance: false });
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;
    const departureDate = params.get("departureDate") || defaultReservation.departureDate;
    const date = detailDates.find((item) => item.value === departureDate);
    setData({
      productCode: params.get("productCode") || defaultReservation.productCode,
      productName: params.get("productName") || defaultReservation.productName,
      departureDate, status: date?.status || "출발확정", boarding: params.get("boarding") || defaultReservation.boarding,
      adult: Number(params.get("adult") ?? defaultReservation.adult), child: Number(params.get("child") ?? 0), infant: Number(params.get("infant") ?? 0),
      option: params.get("option") || "basic", optionName: params.get("optionName") || "기본상품", total: Number(params.get("total") ?? defaultReservation.total),
    });
  }, []);

  const travelerRows = [
    ...Array.from({ length: data.adult }, (_, index) => ({ id: `adult-${index}`, type: "성인", index: index + 1 })),
    ...Array.from({ length: data.child }, (_, index) => ({ id: `child-${index}`, type: "소인", index: index + 1 })),
    ...Array.from({ length: data.infant }, (_, index) => ({ id: `infant-${index}`, type: "유아", index: index + 1 })),
  ];
  const updateTraveler = (id: string, key: keyof TravelerData, value: string | boolean) => setTravelers((current) => {
    const traveler = current[id] ?? { same: false, name: "", birth: "", gender: "", phone: "", note: "" };
    return { ...current, [id]: { ...traveler, [key]: value } };
  });
  const optionAmount = data.option === "specialty" ? 15000 : 0;
  const matchedDate = detailDates.find((date) => date.value === data.departureDate) || detailDates[0];
  const productAmount = data.adult * matchedDate.adultPrice + data.child * matchedDate.childPrice;
  const discountAmount = data.boarding === "현지합류" ? (data.adult + data.child) * 20000 : 0;
  const calculatedTotal = Math.max(0, productAmount + optionAmount - discountAmount);
  const fullTotal = data.total || calculatedTotal;
  const depositAmount = Math.min(fullTotal, (data.adult + data.child) * 30000);
  const paymentDue = paymentPlan === "deposit" ? depositAmount : fullTotal;
  const allAgreed = Object.values(agreements).every(Boolean);
  const toggleAll = (checked: boolean) => setAgreements({ terms: checked, privacy: checked, refund: checked, insurance: checked });

  const submitPayment = () => {
    if (!booker.name || !booker.phone || !booker.email) { setError("예약자 이름, 휴대폰, 이메일을 입력해 주세요."); document.querySelector("#booker-info")?.scrollIntoView({ behavior: "smooth" }); return; }
    const missingTraveler = travelerRows.some((row) => !(travelers[row.id]?.same || travelers[row.id]?.name));
    if (missingTraveler) { setError("모든 여행자의 이름을 입력하거나 예약자와 동일을 선택해 주세요."); document.querySelector("#traveler-info")?.scrollIntoView({ behavior: "smooth" }); return; }
    if (!allAgreed) { setError("필수 약관에 모두 동의해 주세요."); document.querySelector("#agreement-info")?.scrollIntoView({ behavior: "smooth" }); return; }
    const completed = { ...data, total: paymentDue, fullTotal, paymentPlan, payment, bookerName: booker.name, bookingType };
    sessionStorage.setItem("aosDomesticReservation", JSON.stringify(completed));
    const params = new URLSearchParams({ productCode: data.productCode, departureDate: data.departureDate, boarding: data.boarding, adult: String(data.adult), child: String(data.child), infant: String(data.infant), total: String(paymentDue), fullTotal: String(fullTotal), paymentPlan });
    window.location.href = `/domestic/reservation/complete?${params.toString()}`;
  };

  return <main className="dom-page dom-checkout-page"><div className="dom-container">
    <nav className="dom-breadcrumb dom-catalog-breadcrumb" aria-label="현재 위치"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><a href="/domestic/products/AOS-DOM-0001">상품상세</a><Icon name="chevron" size={14}/><span>예약하기</span></nav>
    <header className="dom-checkout-heading"><div><span>RESERVATION & PAYMENT</span><h1>예약정보 입력 및 결제</h1><p>여행자 정보를 정확히 입력하고 결제 내용을 확인해 주세요.</p></div><small>고객센터 1588-0000 · 평일 09:00–18:00</small></header>
    <ReservationSteps/>

    <section className="dom-selected-trip"><div className="dom-selected-trip-image" role="img" aria-label={`${data.productName} 대표 이미지`} style={{ backgroundImage: `url(${images.mountain})` }}><span className="dom-badge blue">{data.status}</span></div><div className="dom-selected-trip-copy"><span>{data.productCode}</span><h2>{data.productName}</h2><dl><div><dt>출발일</dt><dd>{formatDepartureDate(data.departureDate)}</dd></div><div><dt>승차장소</dt><dd>{data.boarding}</dd></div><div><dt>인원</dt><dd>성인 {data.adult}명 · 소인 {data.child}명 · 유아 {data.infant}명</dd></div><div><dt>옵션</dt><dd>{data.optionName}</dd></div></dl></div><div className="dom-selected-trip-price"><span>총 상품금액</span><strong>{fullTotal.toLocaleString()}원</strong><a href="/domestic/products/AOS-DOM-0001">상품 다시보기</a></div></section>

    <div className="dom-checkout-layout"><div className="dom-checkout-content">
      <section className="dom-checkout-card dom-booking-type-card"><header><div><span>BOOKING TYPE</span><h2>예약 유형</h2></div></header><div className="dom-booking-type-tabs"><button className={bookingType === "member" ? "active" : ""} onClick={() => setBookingType("member")}><Icon name="users" size={20}/><span><b>회원예약</b><small>로그인 회원의 예약내역에 자동 저장</small></span></button><button className={bookingType === "guest" ? "active" : ""} onClick={() => setBookingType("guest")}><Icon name="shield" size={20}/><span><b>비회원예약</b><small>예약번호와 휴대폰으로 조회</small></span></button></div>{bookingType === "member" ? <p className="dom-type-note">회원 로그인 상태를 기준으로 예약을 진행합니다. 향후 AOS 회원정보 API와 연결할 수 있습니다.</p> : <p className="dom-type-note guest">비회원 예약은 예약번호와 예약자 휴대폰 번호를 꼭 보관해 주세요.</p>}</section>

      <section className="dom-checkout-card" id="booker-info"><CheckoutHeader number="01" title="예약자 정보" text="예약 확인과 출발 안내를 받을 분의 정보를 입력해 주세요."/><div className="dom-form-grid">
        <label><span>이름 <em>*</em></span><input value={booker.name} onChange={(event) => setBooker({...booker, name: event.target.value})} placeholder="예약자 이름"/></label>
        <label><span>휴대폰 <em>*</em></span><input value={booker.phone} onChange={(event) => setBooker({...booker, phone: event.target.value})} placeholder="010-0000-0000" inputMode="tel"/></label>
        <label><span>이메일 <em>*</em></span><input value={booker.email} onChange={(event) => setBooker({...booker, email: event.target.value})} placeholder="example@email.com" type="email"/></label>
        <label><span>생년월일</span><input value={booker.birth} onChange={(event) => setBooker({...booker, birth: event.target.value})} type="date"/></label>
        <label className="wide"><span>비상연락처</span><input value={booker.emergency} onChange={(event) => setBooker({...booker, emergency: event.target.value})} placeholder="여행 중 연락 가능한 가족·지인의 연락처" inputMode="tel"/></label>
      </div></section>

      <section className="dom-checkout-card" id="traveler-info"><CheckoutHeader number="02" title="여행자 정보" text={`총 ${travelerRows.length}명의 여행자 정보를 입력해 주세요.`}/><div className="dom-traveler-list">{travelerRows.map((row, rowIndex) => { const traveler = travelers[row.id] || { same: false, name: "", birth: "", gender: "", phone: "", note: "" }; return <article key={row.id}><header><div><span>{row.type}</span><h3>{row.type} 여행자 {row.index}</h3></div>{rowIndex === 0 && <label><input type="checkbox" checked={traveler.same} onChange={(event) => updateTraveler(row.id, "same", event.target.checked)}/> 예약자와 동일</label>}</header><div className="dom-traveler-fields"><label><span>이름 <em>*</em></span><input value={traveler.same ? booker.name : traveler.name} onChange={(event) => updateTraveler(row.id, "name", event.target.value)} disabled={traveler.same} placeholder="여행자 이름"/></label><label><span>생년월일</span><input value={traveler.same ? booker.birth : traveler.birth} onChange={(event) => updateTraveler(row.id, "birth", event.target.value)} disabled={traveler.same} type="date"/></label><label><span>성별</span><select value={traveler.gender} onChange={(event) => updateTraveler(row.id, "gender", event.target.value)}><option value="">선택</option><option>남성</option><option>여성</option></select></label><label><span>휴대폰</span><input value={traveler.same ? booker.phone : traveler.phone} onChange={(event) => updateTraveler(row.id, "phone", event.target.value)} disabled={traveler.same} placeholder="010-0000-0000"/></label><label className="wide"><span>특이사항</span><input value={traveler.note} onChange={(event) => updateTraveler(row.id, "note", event.target.value)} placeholder="알레르기, 보행 도움 등 담당자가 알아야 할 내용"/></label></div></article>; })}</div></section>

      <section className="dom-checkout-card"><CheckoutHeader number="03" title="요청사항" text="담당자가 확인할 요청을 남겨 주세요."/><div className="dom-request-grid"><label><span>좌석 관련 요청</span><select value={requests.seat} onChange={(event) => setRequests({...requests, seat: event.target.value})}><option value="">선택하지 않음</option><option>앞쪽 좌석 희망</option><option>일행과 나란히</option><option>멀미가 있어 창가 희망</option></select></label><label><span>식사 관련 요청</span><select value={requests.meal} onChange={(event) => setRequests({...requests, meal: event.target.value})}><option value="">선택하지 않음</option><option>채식 식사 문의</option><option>알레르기 식재료 있음</option><option>유아 식사 문의</option></select></label><label className="wide"><span>기타 요청</span><textarea value={requests.other} onChange={(event) => setRequests({...requests, other: event.target.value})} placeholder="담당자에게 전달할 내용을 입력해 주세요."/></label></div><p className="dom-request-notice"><Icon name="chat" size={17}/> 요청사항은 현지 상황에 따라 반영되지 않을 수 있으며 확정사항이 아닙니다.</p></section>

      <section className="dom-checkout-card"><CheckoutHeader number="04" title="결제수단" text="실제 결제는 진행되지 않는 데모 화면입니다."/><div className="dom-payment-methods">{[["card", "신용카드", "국내 모든 카드"], ["virtual", "가상계좌", "전용 입금계좌 발급"], ["transfer", "실시간 계좌이체", "은행계좌에서 즉시 결제"]].map(([value, label, text]) => <button key={value} className={payment === value ? "active" : ""} onClick={() => setPayment(value)}><span>{payment === value ? "●" : "○"}</span><b>{label}</b><small>{text}</small></button>)}</div><div className="dom-payment-plan"><button className={paymentPlan === "deposit" ? "active" : ""} onClick={() => setPaymentPlan("deposit")}><span>예약금 결제</span><b>{depositAmount.toLocaleString()}원</b><small>잔금 {Math.max(0, fullTotal - depositAmount).toLocaleString()}원은 출발 전 별도 결제</small></button><button className={paymentPlan === "full" ? "active" : ""} onClick={() => setPaymentPlan("full")}><span>전액 결제</span><b>{fullTotal.toLocaleString()}원</b><small>상품금액을 한 번에 결제</small></button></div><div className="dom-demo-payment"><Icon name="shield" size={19}/><p><b>데모 결제 안내</b><span>현재는 PG 승인 없이 예약완료 상태로 이동합니다. 향후 주문 ID, 결제 키, 승인 결과를 AOS ERP에 전달하는 구조로 확장할 수 있습니다.</span></p></div></section>

      <section className="dom-checkout-card" id="agreement-info"><CheckoutHeader number="05" title="약관 동의" text="예약과 결제를 위해 필수 약관을 확인해 주세요."/><label className="dom-agree-all"><input type="checkbox" checked={allAgreed} onChange={(event) => toggleAll(event.target.checked)}/><span><b>전체 약관에 동의합니다.</b><small>아래 필수 약관을 모두 포함합니다.</small></span></label><div className="dom-agreement-list">{[["terms", "국내여행약관"], ["privacy", "개인정보 수집·이용"], ["refund", "취소·환불규정"], ["insurance", "여행자보험 안내"]].map(([key, label]) => <label key={key}><span><input type="checkbox" checked={agreements[key as keyof typeof agreements]} onChange={(event) => setAgreements({...agreements, [key]: event.target.checked})}/><b>[필수] {label}</b></span><a href={`/domestic/customer?guide=${key}`}>내용보기 <Icon name="chevron" size={13}/></a></label>)}</div></section>
    </div>

      <aside className="dom-checkout-summary"><header><span>PAYMENT SUMMARY</span><h2>최종 결제금액</h2></header><dl><div><dt>상품금액</dt><dd>{productAmount.toLocaleString()}원</dd></div><div><dt>옵션금액</dt><dd>{optionAmount.toLocaleString()}원</dd></div><div className="discount"><dt>할인금액</dt><dd>−{discountAmount.toLocaleString()}원</dd></div></dl>{paymentPlan === "deposit" && <div className="dom-balance-info"><span>잔금 결제예정</span><b>{Math.max(0, fullTotal - depositAmount).toLocaleString()}원</b><small>출발 전 별도 안내</small></div>}<div className="dom-checkout-total"><span>{paymentPlan === "deposit" ? "예약금 결제예정" : "최종 결제예정"}</span><strong>{paymentDue.toLocaleString()}원</strong><small>부가세 포함 · 데모 결제</small></div>{error && <p className="dom-checkout-error" role="alert">{error}</p>}<button onClick={submitPayment}>{paymentDue.toLocaleString()}원 결제하기</button><p className="dom-payment-safe"><Icon name="shield" size={15}/> 결제정보는 안전하게 보호됩니다.</p><a href="/domestic/customer"><Icon name="headset" size={17}/> 예약·결제 문의</a></aside>
    </div></div>
    <div className="dom-checkout-mobile-bar"><div><small>{paymentPlan === "deposit" ? "예약금" : "결제예정금액"}</small><strong>{paymentDue.toLocaleString()}원</strong></div><button onClick={submitPayment}>결제하기</button></div>
  </main>;
}

function CheckoutHeader({ number, title, text }: { number: string; title: string; text: string }) {
  return <header className="dom-checkout-card-head"><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></header>;
}

function ReservationCompletePage() {
  const [data, setData] = useState<(ReservationData & { fullTotal?: number; paymentPlan?: string; bookerName?: string })>({ ...defaultReservation, fullTotal: defaultReservation.total, paymentPlan: "full" });
  useEffect(() => {
    const stored = sessionStorage.getItem("aosDomesticReservation");
    const params = new URLSearchParams(window.location.search);
    if (stored) { try { setData({ ...defaultReservation, ...JSON.parse(stored) }); return; } catch { /* keep URL fallback */ } }
    setData((current) => ({ ...current, productCode: params.get("productCode") || current.productCode, departureDate: params.get("departureDate") || current.departureDate, boarding: params.get("boarding") || current.boarding, adult: Number(params.get("adult") ?? current.adult), child: Number(params.get("child") ?? current.child), infant: Number(params.get("infant") ?? current.infant), total: Number(params.get("total") ?? current.total), fullTotal: Number(params.get("fullTotal") ?? current.fullTotal), paymentPlan: params.get("paymentPlan") || current.paymentPlan }));
  }, []);
  return <main className="dom-page dom-complete-page"><div className="dom-container">
    <nav className="dom-breadcrumb dom-catalog-breadcrumb"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><span>예약완료</span></nav><ReservationSteps complete/>
    <section className="dom-complete-hero"><div className="dom-complete-check">✓</div><span>RESERVATION COMPLETE</span><h1>예약이 정상적으로 완료되었습니다.</h1><p>{data.bookerName ? `${data.bookerName}님, ` : ""}AOS 국내여행을 예약해 주셔서 감사합니다.<br/>예약 상세내역은 예약확인 메뉴에서 다시 확인할 수 있습니다.</p><div><span>예약번호</span><strong>RSV-20260822-0001</strong><button onClick={() => navigator.clipboard?.writeText("RSV-20260822-0001")}>번호 복사</button></div></section>
    <div className="dom-complete-layout"><section className="dom-complete-card"><header><h2>예약내역</h2><span><b className="dom-badge green">예약완료</b><b className="dom-badge blue">결제완료</b></span></header><div className="dom-complete-product"><div role="img" aria-label={`${data.productName} 대표 이미지`} style={{ backgroundImage: `url(${images.mountain})` }}/><p><span>{data.productCode}</span><b>{data.productName}</b><small>대한민국의 역사와 자연, 로컬 체험을 하루에 만나는 철원 여행</small></p></div><dl><div><dt>출발일</dt><dd>{formatDepartureDate(data.departureDate)}</dd></div><div><dt>승차장소</dt><dd>{data.boarding}</dd></div><div><dt>인원</dt><dd>성인 {data.adult}명 · 소인 {data.child}명 · 유아 {data.infant}명</dd></div><div><dt>옵션</dt><dd>{data.optionName || "기본상품"}</dd></div><div><dt>결제구분</dt><dd>{data.paymentPlan === "deposit" ? "예약금 결제" : "전액 결제"}</dd></div></dl><div className="dom-complete-total"><span>총 결제금액</span><strong>{data.total.toLocaleString()}원</strong>{data.paymentPlan === "deposit" && <small>남은 잔금 {Math.max(0, (data.fullTotal || data.total) - data.total).toLocaleString()}원</small>}</div></section>
      <aside className="dom-complete-guide"><h2>다음 안내를 확인해 주세요.</h2><ul><li><span>1</span><p><b>예약확인 문자 발송</b><small>입력하신 휴대폰으로 예약정보를 보내드립니다.</small></p></li><li><span>2</span><p><b>출발 전날 최종 안내</b><small>차량번호와 인솔자 연락처를 오후 5시까지 발송합니다.</small></p></li><li><span>3</span><p><b>출발 10분 전 도착</b><small>선택한 승차장소에 여유 있게 도착해 주세요.</small></p></li></ul><a href="/domestic/customer"><Icon name="headset" size={18}/> 도움이 필요하신가요?</a></aside></div>
    <div className="dom-complete-actions"><a className="dom-btn dom-btn-primary" href="/domestic/reservations">예약확인</a><a className="dom-btn dom-btn-secondary" href="/domestic">국내여행 메인으로</a></div>
  </div></main>;
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [departure, setDeparture] = useState("");
  const [duration, setDuration] = useState("");
  const [transport, setTransport] = useState("");
  const [submitted, setSubmitted] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q") || "";
    if (initialQuery) { setQuery(initialQuery); setSubmitted(initialQuery); }
  }, []);
  const recent = ["철원 DMZ", "강릉 당일여행", "울릉도"];
  const popular = ["이번 주말", "출발확정", "KTX 강릉", "가을 단풍", "지자체 특가"];
  const term = submitted.trim().toLowerCase();
  const dateLabel = date ? `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일` : "";
  const results = catalogProducts.filter((product) => {
    const text = `${product.name} ${product.spots} ${product.region} ${product.theme}`.toLowerCase();
    return (!term || text.includes(term)) && (!dateLabel || product.date.includes(dateLabel)) && (!departure || product.departure.includes(departure)) &&
      (!duration || product.duration === duration) && (!transport || product.transport.includes(transport));
  });
  const searchNow = (event: React.FormEvent) => { event.preventDefault(); setSubmitted(query); };

  return <main className="dom-page dom-aux-page dom-search-page"><div className="dom-container">
    <nav className="dom-breadcrumb dom-catalog-breadcrumb" aria-label="현재 위치"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><a href="/domestic">국내여행</a><Icon name="chevron" size={14}/><span>통합검색</span></nav>
    <header className="dom-aux-heading"><span>DOMESTIC SEARCH</span><h1>국내여행 통합검색</h1><p>여행지와 출발조건을 한 번에 검색해 예약 가능한 상품을 찾아보세요.</p></header>
    <form className="dom-unified-search" onSubmit={searchNow}>
      <div className="dom-unified-search-main"><Icon name="search" size={22}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="여행지·관광지·상품명을 입력하세요"/><button type="submit">검색</button></div>
      <div className="dom-search-word-row"><b>최근 검색어</b>{recent.map((word) => <button type="button" key={word} onClick={() => setQuery(word)}>{word}</button>)}</div>
      <div className="dom-search-word-row popular"><b>인기 검색어</b>{popular.map((word, index) => <button type="button" key={word} onClick={() => setQuery(word)}><em>{index + 1}</em>{word}</button>)}</div>
      <div className="dom-search-filter-grid">
        <label><span>출발일</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></label>
        <label><span>출발지역</span><select value={departure} onChange={(event) => setDeparture(event.target.value)}><option value="">전체</option><option>서울역</option><option>용산역</option><option>잠실</option><option>부산</option></select></label>
        <label><span>여행기간</span><select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="">전체</option><option>당일</option><option>1박2일</option><option>2박3일</option></select></label>
        <label><span>교통수단</span><select value={transport} onChange={(event) => setTransport(event.target.value)}><option value="">전체</option><option>KTX</option><option>ITX</option><option>리무진버스</option><option>선박</option></select></label>
      </div>
    </form>

    <section className="dom-aux-section"><div className="dom-search-result-head"><div><span>SEARCH RESULT</span><h2>{submitted ? `‘${submitted}’ 검색 결과` : "전체 상품 검색 결과"}</h2></div><p>총 <b>{results.length}</b>개 상품</p></div>
      {results.length ? <div className="dom-search-results-grid">{results.slice(0, 8).map((product) => <CatalogCard key={product.id} product={product} view="grid"/>)}</div> : <div className="dom-search-empty"><div><Icon name="search" size={30}/></div><h2>검색 결과가 없습니다.</h2><p>다른 검색어를 입력하거나 추천 검색어를 선택해 보세요.</p><div>{popular.slice(0, 4).map((word) => <button key={word} onClick={() => { setQuery(word); setSubmitted(""); }}>{word}</button>)}</div><h3>지금 인기 있는 상품</h3><div className="dom-search-results-grid">{catalogProducts.slice(0, 3).map((product) => <CatalogCard key={product.id} product={product} view="grid"/>)}</div></div>}
    </section>

    <section className="dom-aux-section"><div className="dom-home-title"><div><span>RELATED CONTENT</span><h2>관련 기획전과 여행후기</h2><p>검색 주제와 함께 보면 좋은 콘텐츠입니다.</p></div></div><div className="dom-related-grid">
      <a href="/domestic/promotions#autumn"><span>기획전</span><h3>가을 단풍여행</h3><p>설악산부터 내장산까지 가장 아름다운 단풍 시기를 만나보세요.</p></a>
      <a href="/domestic/promotions#rail"><span>기획전</span><h3>철도여행 특별전</h3><p>KTX와 관광열차로 편안하게 떠나는 국내여행을 모았습니다.</p></a>
      <a href="/domestic/products/AOS-DOM-0001"><span>여행후기</span><h3>철원의 역사와 자연을 함께 만난 하루</h3><p>소이산 전망과 DMZ 해설이 특히 좋았어요. ★ 4.9</p></a>
    </div></section>
  </div></main>;
}

const departureGroups = [
  { date: "8월 22일 토요일", label: "이번 주 출발", products: [catalogProducts[0], catalogProducts[4]] },
  { date: "8월 23일 일요일", label: "이번 주 출발", products: [catalogProducts[1], catalogProducts[5]] },
  { date: "8월 29일 토요일", label: "다음 주 출발", products: [catalogProducts[2], catalogProducts[6]] },
  { date: "8월 30일 일요일", label: "이번 달 출발", products: [catalogProducts[9], catalogProducts[10]] },
];

function DepartureConfirmedPage() {
  const [tab, setTab] = useState("이번 주 출발");
  const tabs = ["오늘 출발", "이번 주 출발", "다음 주 출발", "이번 달 출발", "마감임박"];
  const visible = tab === "이번 달 출발" ? departureGroups : tab === "마감임박" ? departureGroups.filter((group) => group.products.some((product) => parseInt(product.seats) <= 6)) : departureGroups.filter((group) => group.label === tab);
  return <main className="dom-page dom-aux-page dom-departure-page"><div className="dom-container">
    <nav className="dom-breadcrumb dom-catalog-breadcrumb"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><a href="/domestic">국내여행</a><Icon name="chevron" size={14}/><span>출발확정</span></nav>
    <header className="dom-aux-heading"><span>DEPARTURE CONFIRMED</span><h1>출발이 확정된 여행</h1><p>출발일이 가까워도 안심하고 예약할 수 있는 상품을 날짜별로 확인하세요.</p></header>
    <div className="dom-departure-tabs">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}{item === "마감임박" && <em>3</em>}</button>)}</div>
    <div className="dom-departure-summary"><div><Icon name="calendar" size={22}/><p><b>{tab}</b><span>{visible.reduce((sum, group) => sum + group.products.length, 0)}개 상품이 출발을 기다리고 있습니다.</span></p></div><a href="/domestic/products?status=confirmed">전체 상품 비교</a></div>
    <div className="dom-departure-timeline">{visible.length === 0 ? <div className="dom-departure-empty"><Icon name="calendar" size={28}/><h2>오늘 출발하는 확정 상품이 없습니다.</h2><p>이번 주 출발 상품을 확인해 보세요.</p><button onClick={() => setTab("이번 주 출발")}>이번 주 출발 보기</button></div> : visible.map((group) => <section className="dom-departure-date-group" key={group.date}><header><i/><div><span>{group.label}</span><h2>2026년 {group.date}</h2></div></header><div>{group.products.map((product, index) => <article className="dom-departure-row" key={product.id}>
      <div className="dom-departure-time"><span>출발시간</span><strong>{index % 2 ? "07:10" : "07:00"}</strong></div>
      <div className="dom-departure-product"><div><span className="dom-badge blue">출발확정</span><span className="dom-badge transport">{product.transport}</span></div><h3>{product.name}</h3><p>{product.duration} · {product.departure}</p></div>
      <div className="dom-departure-seat"><span>잔여좌석</span><b className={parseInt(product.seats) <= 6 ? "urgent" : ""}>{product.seats}</b></div>
      <div className="dom-departure-price"><span>성인 기준</span><strong>{product.price}</strong></div>
      <div className="dom-departure-actions"><a href={`/domestic/products/${product.id}`}>상세보기</a><a href={`/domestic/reservation?productCode=${product.id}`}>바로예약</a></div>
    </article>)}</div></section>)}</div>
  </div></main>;
}

const promotionItems = [
  { id: "autumn", title: "가을 단풍여행", copy: "붉고 노랗게 물든 명산과 숲길", image: images.mountain, products: [0, 6, 9] },
  { id: "support", title: "지자체 지원 특가", copy: "지역의 지원으로 더 가볍게 떠나는 여행", image: images.flowers, products: [9, 10, 11] },
  { id: "rail", title: "철도여행 특별전", copy: "KTX·ITX로 빠르고 편안하게", image: images.train, products: [1, 2, 6] },
  { id: "island", title: "섬여행 모음", copy: "바다 너머 특별한 풍경을 찾아서", image: images.island, products: [3, 8, 11] },
  { id: "family", title: "가족체험 여행", copy: "아이와 함께 배우고 만드는 추억", image: images.city, products: [4, 7, 10] },
  { id: "food", title: "남도 맛기행", copy: "제철 식재료로 만나는 남도의 맛", image: images.food, products: [2, 8, 11] },
  { id: "dmz", title: "DMZ 역사여행", copy: "평화와 역사를 깊이 만나는 하루", image: images.mountain, products: [0, 6, 9] },
];

function PromotionsPage() {
  return <main className="dom-page dom-aux-page dom-promotions-page">
    <div className="dom-container"><nav className="dom-breadcrumb dom-catalog-breadcrumb"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><a href="/domestic">국내여행</a><Icon name="chevron" size={14}/><span>기획전</span></nav></div>
    <section className="dom-promotion-hero"><div className="dom-container"><span>AOS TRAVEL COLLECTION</span><h1>지금 떠나기 좋은 국내여행</h1><p>계절, 이동수단, 지역의 매력을 기준으로 엄선한 AOS 기획전을 만나보세요.</p><a href="#promotion-list">기획전 둘러보기 <Icon name="chevron" size={16}/></a></div></section>
    <div className="dom-container" id="promotion-list"><div className="dom-promotion-index">{promotionItems.map((item, index) => <a href={`#${item.id}`} className={index === 0 ? "wide" : ""} key={item.id} style={{backgroundImage: `linear-gradient(180deg, rgba(8,28,47,.05), rgba(8,28,47,.72)), url(${item.image})`}}><span>0{index + 1}</span><div><h2>{item.title}</h2><p>{item.copy}</p><b>상품 보기 <Icon name="chevron" size={14}/></b></div></a>)}</div>
      <div className="dom-promotion-details">{promotionItems.map((item, index) => <section id={item.id} className={`dom-promotion-detail ${item.id === "support" ? "teal" : ""}`} key={item.id}><header><div><span>COLLECTION 0{index + 1}</span><h2>{item.title}</h2><p>{item.copy}</p></div><a href={`/domestic/products?promotion=${item.id}`}>전체상품 보기 <Icon name="chevron" size={15}/></a></header><div className="dom-promotion-products">{item.products.map((productIndex) => <CatalogCard key={`${item.id}-${catalogProducts[productIndex].id}`} product={catalogProducts[productIndex]} view="grid"/>)}</div></section>)}</div>
    </div>
  </main>;
}

function ProductListPage() {
  const [category, setCategory] = useState("전체");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<FilterState>(initialFilters);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("추천순");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next: FilterState = { ...initialFilters, weekdays: [] };
    const duration = params.get("duration");
    const transport = params.get("transport");
    const region = params.get("region");
    const quick = params.get("quick") || "";
    const filter = params.get("filter") || "";
    if (duration === "day") setCategory("당일여행");
    else if (duration === "stay") setCategory("1박2일");
    else if (duration && duration !== "전체") next.duration = duration.replace("1박2일", "1박 2일").replace("2박3일", "2박 3일");
    if (transport === "train") setCategory("기차여행");
    else if (transport === "bus" || transport === "limousine") setCategory("버스여행");
    if (region === "island") setCategory("섬여행");
    else if (region === "jeju") setCategory("제주여행");
    if (params.get("keyword") || params.get("q")) next.keyword = params.get("keyword") || params.get("q") || "";
    if (params.get("status") === "confirmed" || quick === "출발확정만 보기") next.status = "출발확정";
    if (quick === "1박2일") next.duration = "1박 2일";
    if (["당일", "1박2일", "2박3일", "3박 이상"].includes(filter)) next.duration = filter.replace("1박2일", "1박 2일").replace("2박3일", "2박 3일");
    else if (["KTX", "SRT", "ITX", "관광열차"].includes(filter)) setCategory("기차여행");
    else if (["일반버스", "리무진버스"].includes(filter)) setCategory("버스여행");
    else if (filter === "섬") setCategory("섬여행");
    else if (filter === "제주") setCategory("제주여행");
    const promotion = params.get("promotion");
    if (promotion === "support") setCategory("지자체특가");
    else if (promotion === "rail") setCategory("기차여행");
    else if (promotion === "island") setCategory("섬여행");
    setFilters(next);
    setDraftFilters(next);
    const requestedSort = params.get("sort");
    if (requestedSort === "recommended") setSort("추천순");
  }, []);

  const updateDraft = (key: keyof FilterState, value: string | string[]) => setDraftFilters((current) => ({ ...current, [key]: value }));
  const reset = () => {
    const cleared = { ...initialFilters, weekdays: [] };
    setFilters(cleared);
    setDraftFilters(cleared);
    setCategory("전체");
  };
  const applyFilters = () => {
    setFilters({ ...draftFilters, weekdays: [...draftFilters.weekdays] });
    setFilterOpen(false);
  };
  const categories = ["전체", "당일여행", "1박2일", "2박3일", "기차여행", "버스여행", "섬여행", "제주여행", "지자체특가"];

  const filterProducts = (activeFilters: FilterState) => catalogProducts.filter((product) => {
    const categoryMatch = category === "전체" ||
      (category === "당일여행" && product.duration === "당일") ||
      (["1박2일", "2박3일"].includes(category) && product.duration === category) ||
      (category === "기차여행" && /KTX|ITX|SRT/.test(product.transport)) ||
      (category === "버스여행" && /버스/.test(product.transport)) ||
      (category === "섬여행" && (product.region === "섬여행" || product.transport.includes("선박"))) ||
      (category === "제주여행" && product.region === "제주도") ||
      (category === "지자체특가" && product.extraBadge === "지자체지원");
    const price = product.numericPrice || 0;
    const priceMatch = !activeFilters.price ||
      (activeFilters.price === "5만원 미만" && price < 50000) ||
      (activeFilters.price === "5만원 이상~10만원 미만" && price >= 50000 && price < 100000) ||
      (activeFilters.price === "10만원 이상~20만원 미만" && price >= 100000 && price < 200000) ||
      (activeFilters.price === "20만원 이상~30만원 미만" && price >= 200000 && price < 300000) ||
      (activeFilters.price === "30만원 이상" && price >= 300000);
    const text = `${product.id} ${product.name} ${product.spots}`.toLowerCase();
    const matchedDate = product.date.match(/(\d+)월\s*(\d+)일/);
    const productIsoDate = matchedDate ? `2026-${String(Number(matchedDate[1])).padStart(2, "0")}-${String(Number(matchedDate[2])).padStart(2, "0")}` : "";
    const dateMatch = activeFilters.dateFrom && !activeFilters.dateTo
      ? productIsoDate === activeFilters.dateFrom
      : (!activeFilters.dateFrom || productIsoDate >= activeFilters.dateFrom) && (!activeFilters.dateTo || productIsoDate <= activeFilters.dateTo);
    const durationValue = product.duration.replace("1박2일", "1박 2일").replace("2박3일", "2박 3일");
    const durationMatch = !activeFilters.duration || durationValue === activeFilters.duration || (activeFilters.duration === "3박 이상" && /^([3-9]|\d{2,})박/.test(product.duration));
    const weekdayMatch = activeFilters.weekdays.length === 0 || activeFilters.weekdays.some((day) => product.weekdays?.includes(day) || product.weekdays?.includes("매일"));
    return categoryMatch && priceMatch && dateMatch &&
      durationMatch && weekdayMatch &&
      (!activeFilters.status || product.status === activeFilters.status) &&
      (!activeFilters.keyword.trim() || text.includes(activeFilters.keyword.trim().toLowerCase()));
  });
  const filtered = filterProducts(filters);
  const draftResultCount = filterProducts(draftFilters).length;

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "낮은 가격순") return (a.numericPrice || 0) - (b.numericPrice || 0);
    if (sort === "높은 가격순") return (b.numericPrice || 0) - (a.numericPrice || 0);
    if (sort === "잔여좌석 적은순") return parseInt(a.seats) - parseInt(b.seats);
    if (sort === "예약 많은순") return parseInt(a.seats) - parseInt(b.seats);
    return 0;
  });

  const selected: { key: keyof FilterState | "category"; label: string }[] = [];
  if (category !== "전체") selected.push({ key: "category", label: category });
  if (filters.keyword) selected.push({ key: "keyword", label: `검색: ${filters.keyword}` });
  if (filters.dateFrom) selected.push({ key: "dateFrom", label: `시작일 ${filters.dateFrom}` });
  if (filters.dateTo) selected.push({ key: "dateTo", label: `종료일 ${filters.dateTo}` });
  (["duration", "price", "status"] as (keyof FilterState)[]).forEach((key) => {
    if (filters[key]) selected.push({ key, label: String(filters[key]) });
  });
  if (filters.weekdays.length) selected.push({ key: "weekdays", label: `출발요일 ${filters.weekdays.join("·")}` });
  const removeSelected = (key: keyof FilterState | "category") => {
    if (key === "category") return setCategory("전체");
    const value = key === "weekdays" ? [] : "";
    setFilters((current) => ({ ...current, [key]: value }));
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  return <main className="dom-page dom-catalog-page">
    <div className="dom-container">
      <nav className="dom-breadcrumb dom-catalog-breadcrumb" aria-label="현재 위치"><a href="/domestic">홈</a><Icon name="chevron" size={14}/><a href="/domestic">국내여행</a><Icon name="chevron" size={14}/><span>상품목록</span></nav>
      <header className="dom-catalog-heading"><span>DOMESTIC PRODUCTS</span><h1>국내여행 상품</h1><p>출발일과 출발지역을 선택해 지금 예약 가능한 국내여행을 찾아보세요.</p></header>
      <nav className="dom-category-chips" aria-label="상품 하위 카테고리">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</nav>

      <div className="dom-catalog-layout">
        <aside className="dom-filter-sidebar"><FilterPanel filters={draftFilters} update={updateDraft} reset={reset} apply={applyFilters}/></aside>
        <section className="dom-results">
          <div className="dom-mobile-filter-row"><button onClick={() => setFilterOpen(true)}><Icon name="menu" size={18}/> 검색조건</button><span>{selected.length}개 조건 적용</span></div>
          <div className="dom-selected-filters"><b>선택한 조건</b><div>{selected.length ? selected.map((item) => <button key={`${item.key}-${item.label}`} onClick={() => removeSelected(item.key)}>{item.label}<Icon name="close" size={13}/></button>) : <span>적용된 검색조건이 없습니다.</span>}</div>{selected.length > 1 && <button onClick={reset}>전체 해제</button>}</div>
          <div className="dom-result-toolbar"><div><span>전체 <b>48</b>개 상품</span><small>{sorted.length}개 상품을 표시하고 있습니다.</small></div><div className="dom-view-buttons"><button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="카드형 보기">▦ <span>카드형</span></button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="리스트형 보기">☷ <span>리스트형</span></button></div><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="상품 정렬"><option>추천순</option><option>출발일 빠른순</option><option>예약 많은순</option><option>낮은 가격순</option><option>높은 가격순</option><option>잔여좌석 적은순</option></select></div>

          {sorted.length ? <div className={`dom-catalog-products ${view}`}>{sorted.map((product) => <CatalogCard key={product.id} product={product} view={view}/>)}</div> : <div className="dom-no-results"><div><Icon name="search" size={32}/></div><h2>선택한 조건에 맞는 상품이 없습니다.</h2><p>출발일, 출발요일 또는 검색어를 변경해 보세요.</p><div><button className="dom-btn dom-btn-secondary" onClick={reset}>조건 초기화</button><a className="dom-btn dom-btn-primary" href="/domestic/products">전체상품 보기</a></div></div>}

          {sorted.length > 0 && <nav className="dom-pagination" aria-label="상품목록 페이지"><button disabled>이전</button><a className="active" href="/domestic/products?page=1">1</a><a href="/domestic/products?page=2">2</a><a href="/domestic/products?page=3">3</a><a href="/domestic/products?page=2">다음</a></nav>}
        </section>
      </div>
    </div>

    {filterOpen && <div className="dom-filter-sheet" role="dialog" aria-modal="true" aria-label="상품 검색조건"><button className="dom-filter-backdrop" onClick={() => setFilterOpen(false)} aria-label="필터 닫기"/><div className="dom-filter-sheet-body"><header><h2>검색조건</h2><button onClick={() => setFilterOpen(false)} aria-label="닫기"><Icon name="close" size={22}/></button></header><div><FilterPanel filters={draftFilters} update={updateDraft} reset={reset} apply={applyFilters} mobile/></div><footer><button onClick={reset}>조건 초기화</button><button onClick={applyFilters}>{draftResultCount}개 상품 검색</button></footer></div></div>}
  </main>;
}

function FilterPanel({ filters, update, reset, apply, mobile = false }: { filters: FilterState; update: (key: keyof FilterState, value: string | string[]) => void; reset: () => void; apply: () => void; mobile?: boolean }) {
  const select = (label: string, key: keyof FilterState, options: string[]) => <label><span>{label}</span><select value={String(filters[key])} onChange={(event) => update(key, event.target.value)}><option value="">전체</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  const weekdays = ["월", "화", "수", "목", "금", "토", "일"];
  const toggleWeekday = (day: string) => update("weekdays", filters.weekdays.includes(day) ? filters.weekdays.filter((item) => item !== day) : [...filters.weekdays, day]);
  return <form className={`dom-filter-panel ${mobile ? "mobile" : ""}`} onSubmit={(event) => { event.preventDefault(); apply(); }}>
    {!mobile && <header><h2>검색조건</h2><button type="button" onClick={reset}>조건 초기화</button></header>}
    <section><label className="dom-filter-keyword"><span>상품명·관광지 검색</span><div><input value={filters.keyword} onChange={(event) => update("keyword", event.target.value)} placeholder="상품명 또는 관광지를 입력해 주세요"/><button type="submit" aria-label="상품명·관광지 검색"><Icon name="search" size={17}/></button></div></label></section>
    <section><h3>출발일·출발기간</h3><div className="dom-date-range"><label><span>시작일</span><input type="date" value={filters.dateFrom} onChange={(event) => update("dateFrom", event.target.value)}/></label><i>–</i><label><span>종료일</span><input type="date" min={filters.dateFrom || undefined} value={filters.dateTo} onChange={(event) => update("dateTo", event.target.value)}/></label></div></section>
    <section className="dom-filter-selects">{select("여행기간", "duration", ["당일", "1박 2일", "2박 3일", "3박 이상"])}</section>
    <section><h3>출발요일</h3><div className="dom-weekday-chips"><button type="button" className={filters.weekdays.length === 0 ? "active" : ""} onClick={() => update("weekdays", [])}>매일</button>{weekdays.map((day) => <button type="button" key={day} className={filters.weekdays.includes(day) ? "active" : ""} aria-pressed={filters.weekdays.includes(day)} onClick={() => toggleWeekday(day)}>{day}</button>)}</div></section>
    <section className="dom-filter-selects">{select("요금", "price", ["5만원 미만", "5만원 이상~10만원 미만", "10만원 이상~20만원 미만", "20만원 이상~30만원 미만", "30만원 이상"])}</section>
    <section className="dom-filter-selects">{select("출발상태", "status", ["출발확정", "출발유력", "예약가능", "마감임박", "예약마감"])}</section>
    {!mobile && <div className="dom-filter-actions"><button type="button" onClick={reset}>조건 초기화</button><button type="submit">검색</button></div>}
  </form>;
}

function CatalogCard({ product, view }: { product: Product; view: "grid" | "list" }) {
  return <a className={`dom-catalog-card ${view}`} href={`/domestic/products/${product.id}`}>
    <div className="dom-catalog-image" role="img" aria-label={`${product.name} 대표 이미지`} style={{ backgroundImage: `url(${product.image})` }}><div><span className={`dom-badge ${product.statusColor}`}>{product.status}</span><span className="dom-badge transport">{product.transport}</span>{product.extraBadge && <span className={`dom-badge ${product.extraBadge === "지자체지원" ? "teal" : "orange"}`}>{product.extraBadge}</span>}</div><span className="dom-catalog-heart" aria-hidden="true"><Icon name="heart" size={19}/></span></div>
    <div className="dom-catalog-card-body"><div className="dom-catalog-code"><span>{product.duration}</span><small>{product.id}</small></div><h3>{product.name}</h3><p className="dom-catalog-course">{product.spots}</p><dl><div><dt>다음 출발일</dt><dd>{product.date.replace("8월", "2026년 8월").replace("9월", "2026년 9월")}</dd></div><div><dt>정기 출발</dt><dd>{product.weekdays}</dd></div><div><dt>출발지역</dt><dd>{product.departure.replace(" 출발", "")}</dd></div><div><dt>포함사항</dt><dd>{product.included}</dd></div></dl><div className="dom-catalog-bottom"><span>남은 좌석 <b>{product.seats}</b></span><div><small>소인 {product.childPrice}</small><p><em>성인 기준</em><strong>{product.price}</strong></p></div></div></div>
  </a>;
}

function SectionTitle({ kicker, title, subtitle, href }: { kicker: string; title: string; subtitle: string; href?: string }) {
  return <div className="dom-home-title"><div><span>{kicker}</span><h2>{title}</h2><p>{subtitle}</p></div>{href && <a href={href}>전체보기 <Icon name="chevron" size={16}/></a>}</div>;
}

function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  return <a className={`dom-product-card ${compact ? "compact" : ""}`} href={`/domestic/products/${product.id}`}>
    <div className="dom-product-image" role="img" aria-label={`${product.name} 대표 이미지`} style={{backgroundImage: `url(${product.image})`}}><span className={`dom-badge ${product.statusColor}`}>{product.status}</span><span className="dom-card-heart" aria-hidden="true"><Icon name="heart" size={18}/></span></div>
    <div className="dom-product-body"><div className="dom-product-date"><b>{product.date}</b><span>잔여 <em>{product.seats}</em></span></div><div className="dom-product-meta"><span>{product.departure}</span><i/> <span>{product.transport}</span><i/> <span>{product.duration}</span></div><h3>{product.name}</h3><p>{product.spots}</p><div className="dom-product-price"><small>성인 기준</small><strong>{product.price}</strong></div></div>
  </a>;
}

function SupportCard({ product }: { product: Product }) {
  return <a className="dom-support-card" href={`/domestic/products/${product.id}`}><div className="dom-support-image" role="img" aria-label={`${product.name} 대표 이미지`} style={{backgroundImage: `url(${product.image})`}}><span className="dom-badge teal">지자체지원</span></div><div><span>{product.support} 지원</span><h3>{product.name}</h3><p><b>{product.date}</b> · {product.departure}<br/>{product.spots}</p><div><small><s>{product.oldPrice}</s><em>지원 적용가</em></small><strong>{product.price}</strong></div></div></a>;
}
