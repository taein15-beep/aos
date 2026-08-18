"use client";

import { useState } from "react";

const airports = ["서울 / 인천 (ICN)", "도쿄 / 나리타 (NRT)", "오사카 / 간사이 (KIX)"];

const features = [
  {
    id: "product",
    number: "01",
    label: "상품 운영",
    title: "상품 기획부터 판매까지, 하나의 흐름으로",
    description: "상품 등록, 일정표, 옵션, 날짜별 요금과 좌석을 한 화면에서 설계하고 판매 채널에 즉시 공유합니다.",
    tags: ["상품·일정 통합 관리", "날짜별 요금·재고", "판매점 선택 공유"],
    metric: "상품 운영",
    metricValue: "ONE FLOW",
  },
  {
    id: "reservation",
    number: "02",
    label: "예약 관리",
    title: "예약 현황을 실시간으로 확인하고 대응",
    description: "접수, 출발확정, 대기, 취소, 마감 상태를 달력과 목록에서 동시에 확인해 놓치는 예약 없이 운영합니다.",
    tags: ["실시간 예약 캘린더", "상태별 인원 현황", "자동 알림·처리"],
    metric: "예약 가시성",
    metricValue: "REAL TIME",
  },
  {
    id: "partner",
    number: "03",
    label: "파트너 운영",
    title: "판매점과 랜드사를 연결하는 협업 허브",
    description: "판매 여행사에는 상품과 커미션을, 현지 행사 업체에는 예약과 진행 정보를 필요한 범위만 정확히 공유합니다.",
    tags: ["판매점 전용 환경", "랜드사 행사 관리", "권한별 정보 제공"],
    metric: "파트너 연결",
    metricValue: "CONNECTED",
  },
  {
    id: "settlement",
    number: "04",
    label: "정산·통계",
    title: "거래 데이터를 바로 경영 인사이트로",
    description: "예약과 결제 데이터를 기반으로 판매점·상품·지역별 매출과 정산 현황을 자동 집계합니다.",
    tags: ["자동 정산", "인보이스 관리", "다차원 통계"],
    metric: "데이터 활용",
    metricValue: "INSIGHT",
  },
];

export default function Home() {
  const [from, setFrom] = useState(airports[0]);
  const [to, setTo] = useState(airports[1]);
  const [searched, setSearched] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [contactSent, setContactSent] = useState(false);

  const swapRoute = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <main>
      <section className="hero" id="home">
        <nav className="nav shell" aria-label="주요 메뉴">
          <a className="brand" href="#home" aria-label="AOS 홈">
            <span className="brand-mark">aos</span>
            <span className="brand-caption">All-in-One Travel System</span>
          </a>
          <div className="nav-links">
            <a href="#platform">플랫폼</a>
            <a href="#air">항공 예약</a>
            <a href="#technology">기술</a>
            <a href="#contact">문의</a>
          </div>
          <a className="nav-cta" href="#contact">도입 문의 <span>↗</span></a>
        </nav>

        <div className="orb orb-one" />
        <div className="orb orb-two" />

        <div className="hero-grid shell">
          <div className="hero-copy">
            <div className="eyebrow"><span /> 여행 비즈니스의 새로운 운영 표준</div>
            <h1>
              여행의 모든 흐름을<br />
              <span>하나의 플랫폼</span>으로.
            </h1>
            <p>
              상품 기획부터 항공 예약·발권, 판매점 운영, 예약 관리와 정산까지.<br className="desktop" />
              흩어진 여행 업무를 AOS에서 더 빠르고 정확하게 연결하세요.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#platform">플랫폼 살펴보기 <span>→</span></a>
              <button className="button ghost" onClick={() => document.querySelector(".booking-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                <span className="play">▶</span> 항공 예약 데모
              </button>
            </div>
            <div className="proof-row">
              <div><strong>ONE</strong><span>통합 운영 환경</span></div>
              <div><strong>24/7</strong><span>실시간 예약</span></div>
              <div><strong>ZERO</strong><span>발권 수수료</span></div>
            </div>
          </div>

          <div className="hero-visual" aria-label="AOS 항공 예약 미리보기">
            <div className="route-line"><span className="plane">✦</span></div>
            <div className="booking-card">
              <div className="booking-top">
                <div>
                  <span className="mini-label">AOS AIR</span>
                  <h2>항공권을 검색하세요</h2>
                </div>
                <span className="live"><i /> LIVE</span>
              </div>
              <div className="trip-tabs" role="tablist" aria-label="여정 유형">
                <button className="active" role="tab">왕복</button>
                <button role="tab">편도</button>
                <button role="tab">다구간</button>
              </div>
              <div className="route-fields">
                <label>
                  <span>출발지</span>
                  <select value={from} onChange={(event) => setFrom(event.target.value)}>
                    {airports.map((airport) => <option key={airport}>{airport}</option>)}
                  </select>
                </label>
                <button className="swap" aria-label="출발지와 도착지 바꾸기" onClick={swapRoute}>⇄</button>
                <label>
                  <span>도착지</span>
                  <select value={to} onChange={(event) => setTo(event.target.value)}>
                    {airports.map((airport) => <option key={airport}>{airport}</option>)}
                  </select>
                </label>
              </div>
              <div className="date-fields">
                <label><span>출발일</span><input type="date" defaultValue="2026-08-12" /></label>
                <label><span>도착일</span><input type="date" defaultValue="2026-08-15" /></label>
                <label><span>탑승객</span><select defaultValue="성인 1명"><option>성인 1명</option><option>성인 2명</option></select></label>
              </div>
              <button className="search-button" onClick={() => setSearched(true)}>
                <span>⌕</span> 최적 항공편 검색
              </button>
              <div className={`search-result ${searched ? "show" : ""}`} role="status">
                <span className="result-icon">✓</span>
                <div><strong>실시간 항공편을 찾았습니다</strong><small>{from.split(" (")[0]} → {to.split(" (")[0]} · 42개 운임 비교</small></div>
                <button onClick={() => setSearched(false)}>닫기</button>
              </div>
            </div>
            <div className="floating-card float-one"><span>✓</span><div><small>예약 자동 연동</small><strong>처리 완료</strong></div></div>
            <div className="floating-card float-two"><span>₩</span><div><small>발권 수수료</small><strong>0원</strong></div></div>
          </div>
        </div>

        <div className="scroll-hint"><span /> SCROLL TO EXPLORE</div>
      </section>

      <section className="platform-section section" id="platform">
        <div className="shell">
          <div className="section-heading centered reveal">
            <span className="section-kicker">AOS PLATFORM</span>
            <h2>여행 비즈니스를 움직이는<br /><em>하나의 운영 시스템</em></h2>
            <p>부서와 시스템 사이에 단절됐던 정보를 연결해<br className="desktop" /> 더 빠른 의사결정과 안정적인 운영을 만듭니다.</p>
          </div>

          <div className="feature-explorer">
            <div className="feature-nav" role="tablist" aria-label="AOS 핵심 기능">
              {features.map((feature, index) => (
                <button
                  key={feature.id}
                  className={activeFeature === index ? "active" : ""}
                  onClick={() => setActiveFeature(index)}
                  role="tab"
                  aria-selected={activeFeature === index}
                >
                  <span>{feature.number}</span>{feature.label}<i>→</i>
                </button>
              ))}
            </div>
            <div className="feature-stage" role="tabpanel">
              <div className="feature-copy" key={features[activeFeature].id}>
                <span className="feature-number">{features[activeFeature].number}</span>
                <h3>{features[activeFeature].title}</h3>
                <p>{features[activeFeature].description}</p>
                <ul>
                  {features[activeFeature].tags.map((tag) => <li key={tag}><span>✓</span>{tag}</li>)}
                </ul>
              </div>
              <div className={`feature-visual visual-${features[activeFeature].id}`}>
                <div className="visual-glow" />
                <span className="visual-overline">AOS OPERATING CLOUD</span>
                <strong>{features[activeFeature].metricValue}</strong>
                <small>{features[activeFeature].metric}</small>
                <div className="visual-bars"><i /><i /><i /><i /><i /></div>
                <div className="visual-orbit"><span /></div>
              </div>
            </div>
          </div>

          <div className="value-strip">
            <span>PRODUCT</span><i>+</i><span>AIR</span><i>+</i><span>RESERVATION</span><i>+</i><span>PARTNER</span><i>+</i><span>SETTLEMENT</span>
          </div>
        </div>
      </section>

      <section className="air-section section" id="air">
        <div className="shell">
          <div className="air-heading">
            <div>
              <span className="section-kicker light">AOS AIR SERVICE</span>
              <h2>복잡한 항공 업무를<br /><em>더 단순하고 빠르게</em></h2>
            </div>
            <p>조회부터 예약, 발권까지 끊김 없는 항공 서비스.<br />일반 고객과 판매점 모두에게 최적화된 예약 경험을 제공합니다.</p>
          </div>

          <div className="air-grid">
            <article className="air-main-card">
              <div className="air-card-head"><span>01</span><i>↗</i></div>
              <div className="air-route-demo">
                <div><small>SEL</small><strong>서울</strong></div>
                <div className="flight-path"><i>✦</i></div>
                <div><small>GLOBAL</small><strong>전 세계</strong></div>
              </div>
              <div className="air-card-copy">
                <span>국제선 · 국내선</span>
                <h3>실시간 항공 조회·예약</h3>
                <p>다양한 항공사 운임과 좌석을 한 번에 비교하고 최적의 항공편을 빠르게 예약합니다.</p>
              </div>
            </article>
            <article className="air-card charter-card">
              <div className="air-card-head"><span>02</span><i>↗</i></div>
              <div className="charter-art"><span>CHARTER</span><strong>전세기</strong><i>✈</i></div>
              <div className="air-card-copy"><span>단체 이동의 새로운 기준</span><h3>전세기 예약·발권</h3><p>대규모 단체와 특별 일정에 맞춘 전세기 업무를 체계적으로 관리합니다.</p></div>
            </article>
            <article className="air-card noname-card">
              <div className="air-card-head"><span>03</span><i>↗</i></div>
              <div className="ticket-stack"><i /><i /><i /><span>NO NAME</span></div>
              <div className="air-card-copy"><span>이름 없이 먼저 확보</span><h3>노네임 고객 예약</h3><p>탑승자 확정 전에도 좌석을 선점하고 이후 고객 정보를 안전하게 연결합니다.</p></div>
            </article>
            <article className="fee-card">
              <div><span>ISSUANCE FEE</span><strong>0<em>원</em></strong><p>불필요한 비용은 줄이고<br />여행사의 수익 경쟁력은 높입니다.</p></div>
              <i className="zero-ring" />
            </article>
          </div>
        </div>
      </section>

      <section className="technology-section section" id="technology">
        <div className="shell technology-grid">
          <div className="technology-copy">
            <span className="section-kicker">TECHNOLOGY</span>
            <h2>변화하는 여행 시장을 위한<br /><em>유연하고 확장 가능한 기술</em></h2>
            <p>표준화된 데이터와 안정적인 API 구조로 새로운 서비스와 파트너를 더 빠르게 연결합니다.</p>
            <div className="tech-points">
              <div><span>01</span><strong>모듈형 구조</strong><small>필요한 기능부터 단계적으로 도입</small></div>
              <div><span>02</span><strong>실시간 데이터</strong><small>예약·재고·정산 정보 즉시 동기화</small></div>
              <div><span>03</span><strong>개방형 연동</strong><small>항공·결제·외부 서비스 API 확장</small></div>
            </div>
          </div>
          <div className="architecture" aria-label="AOS 기술 연결 구조">
            <div className="arch-core"><span>aos</span><small>CORE PLATFORM</small></div>
            <div className="arch-ring ring-one"><span className="arch-node node-data"><i>DATA</i><small>표준 데이터</small></span></div>
            <div className="arch-ring ring-two"><span className="arch-node node-logic"><i>LOGIC</i><small>운영 자동화</small></span></div>
            <div className="arch-ring ring-three"><span className="arch-node node-api"><i>API</i><small>서비스 연결</small></span></div>
          </div>
        </div>
        <div className="tech-band">
          <div className="shell">
            <div><strong>통합 데이터 허브</strong><span>상품·예약·고객·정산 데이터를 하나의 기준으로</span></div>
            <i>→</i>
            <div><strong>자동화된 운영 엔진</strong><span>복잡한 규칙과 반복 업무를 정확하고 빠르게</span></div>
            <i>→</i>
            <div><strong>확장형 서비스 연결</strong><span>항공·결제·파트너 생태계와 유연하게</span></div>
          </div>
        </div>
      </section>

      <section className="contact-section section" id="contact">
        <div className="shell contact-grid">
          <div className="contact-copy">
            <span className="section-kicker light">START WITH AOS</span>
            <h2>여행 비즈니스의 다음 단계,<br /><em>AOS와 함께 시작하세요.</em></h2>
            <p>현재 운영 방식과 필요한 기능을 알려주시면<br />비즈니스에 맞는 도입 방향을 함께 설계해 드립니다.</p>
            <div className="contact-meta">
              <div><span>01</span><p><strong>맞춤 상담</strong><small>운영 환경과 목표를 함께 진단합니다.</small></p></div>
              <div><span>02</span><p><strong>단계별 도입</strong><small>필요한 기능부터 빠르게 시작합니다.</small></p></div>
            </div>
          </div>
          <form className="contact-form" onSubmit={(event) => { event.preventDefault(); setContactSent(true); }}>
            <div className="form-row">
              <label><span>회사명</span><input required placeholder="회사명을 입력해 주세요" /></label>
              <label><span>담당자명</span><input required placeholder="담당자명을 입력해 주세요" /></label>
            </div>
            <div className="form-row">
              <label><span>연락처</span><input type="tel" placeholder="010-0000-0000" /></label>
              <label><span>이메일</span><input required type="email" placeholder="name@company.com" /></label>
            </div>
            <label><span>문의 내용</span><textarea rows={4} placeholder="관심 기능과 현재 운영 환경을 간단히 알려주세요." /></label>
            <label className="privacy"><input required type="checkbox" /><span>개인정보 수집 및 이용에 동의합니다.</span></label>
            <button type="submit">AOS 도입 문의하기 <span>→</span></button>
            {contactSent && <div className="form-success" role="status"><i>✓</i><span><strong>문의 내용이 준비되었습니다.</strong><small>실제 연락처 연결 전 확인용 화면입니다.</small></span><button type="button" onClick={() => setContactSent(false)}>닫기</button></div>}
          </form>
        </div>
      </section>

      <footer>
        <div className="shell footer-main">
          <div className="brand footer-brand"><span className="brand-mark">aos</span><span className="brand-caption">All-in-One Travel System</span></div>
          <p>여행의 모든 흐름을 하나로 연결하는 통합여행플랫폼</p>
          <a href="#home">맨 위로 <span>↑</span></a>
        </div>
        <div className="shell footer-bottom"><span>© 2026 AOS. All rights reserved.</span><span>TAEINWIZ · AVIANEXT</span></div>
      </footer>
    </main>
  );
}
