import Link from "next/link";

const benefits = [
  "다양한 제휴상품 확보",
  "원본 상품정보 연동",
  "출발일별 공동재고 확인",
  "판매여행사별 예약 귀속",
  "자사 판매점 판매 연계",
  "정산내역 통합관리",
];

const processSteps = [
  "가입신청",
  "관리자 검토",
  "가입승인",
  "제휴관계 활성화",
  "상품공유그룹 지정",
  "상품공급여행사가 공유 대상 지정",
  "판매여행사가 카테고리·노출 설정",
  "판매 시작",
];

const policies = [
  "가입신청 과정에서는 상품공유그룹을 선택하지 않습니다.",
  "가입승인 후 관리자가 상품공유그룹을 별도로 지정합니다.",
  "제휴승인만으로 모든 상품이 자동 공유되지는 않습니다.",
  "상품공급여행사가 상품별 공유 대상을 지정합니다.",
  "공유된 상품은 판매여행사가 자사 카테고리를 지정하고 노출해야 판매됩니다.",
  "공유상품을 다른 독립 여행사에 재공유할 수 없습니다.",
];

const audiences = [
  "여행업 등록을 완료한 사업자",
  "국내·해외 여행상품 판매 여행사",
  "다른 여행사에 상품을 공급하려는 여행사",
  "다른 여행사의 상품을 판매하려는 여행사",
  "상품공급과 판매를 모두 희망하는 여행사",
];

const faqs = [
  {
    q: "승인되면 상품이 자동으로 공유되나요?",
    a: "아니요. 제휴승인만으로 상품이 자동 공유되지 않습니다. 상품공급여행사가 상품별로 공유 대상을 지정해야 합니다.",
  },
  {
    q: "상품공유그룹은 언제 지정되나요?",
    a: "가입신청 단계에서는 그룹을 선택하지 않습니다. 관리자가 가입을 승인한 뒤 별도로 상품공유그룹을 지정합니다.",
  },
  {
    q: "여러 상품공유그룹에 가입할 수 있나요?",
    a: "가능합니다. 가입승인 이후 관리자 안내에 따라 하나 이상의 상품공유그룹에 소속될 수 있습니다.",
  },
  {
    q: "공유받은 상품은 바로 판매되나요?",
    a: "공유 지정만으로 바로 판매되지 않습니다. 판매여행사가 자사 카테고리를 지정하고 홈페이지 노출을 활성화해야 판매할 수 있습니다.",
  },
  {
    q: "판매점에도 공유상품을 판매하게 할 수 있나요?",
    a: "공유조건에서 자사 판매점 판매가 허용된 경우, 판매여행사가 자사 판매점에 해당 상품 판매를 연계할 수 있습니다.",
  },
  {
    q: "가입 심사는 얼마나 걸리나요?",
    a: "사업자·여행업 등록 정보를 확인한 뒤 안내드립니다. 보통 평일 기준 1~3영업일이 소요되며, 서류 보완이 있으면 더 걸릴 수 있습니다.",
  },
];

export default function PartnershipPage() {
  return (
    <main className="partnership-page">
      <section className="partnership-hero">
        <div className="shell partnership-hero-inner">
          <div className="eyebrow">
            <span /> PARTNERSHIP
          </div>
          <h1>
            AOS 제휴여행사로
            <br />
            <span>함께 성장하세요</span>
          </h1>
          <p>
            다양한 여행상품을 공유하고 예약·재고·판매채널을 하나의 시스템에서 관리할 수
            있습니다.
          </p>
          <div className="hero-actions partnership-hero-actions">
            <Link className="button primary" href="/partnership/apply">
              제휴여행사 가입신청 <span>→</span>
            </Link>
            <Link className="button ghost" href="/partnership/application-status">
              신청현황
            </Link>
            <a className="button ghost" href="#process">
              제휴 절차 확인
            </a>
          </div>
        </div>
      </section>

      <section className="section partnership-section" aria-labelledby="benefits-title">
        <div className="shell">
          <div className="section-heading centered">
            <span className="section-kicker">BENEFITS</span>
            <h2 id="benefits-title">
              제휴로 얻는 <em>운영 이점</em>
            </h2>
            <p>상품·재고·예약·판매·정산을 분리하지 않고 연결된 흐름으로 운영합니다.</p>
          </div>
          <ul className="partnership-benefit-list">
            {benefits.map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="section partnership-section partnership-process-section"
        id="process"
        aria-labelledby="process-title"
      >
        <div className="shell">
          <div className="section-heading centered">
            <span className="section-kicker">PROCESS</span>
            <h2 id="process-title">
              제휴 <em>절차</em>
            </h2>
            <p>가입부터 판매 시작까지, 단계별로 진행됩니다.</p>
          </div>
          <ol className="partnership-process">
            {processSteps.map((step, index) => (
              <li key={step}>
                <span className="partnership-process-num">{index + 1}</span>
                <strong>{step}</strong>
                {index < processSteps.length - 1 ? (
                  <span className="partnership-process-arrow" aria-hidden="true">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section partnership-section" aria-labelledby="policy-title">
        <div className="shell partnership-policy-wrap">
          <div className="section-heading">
            <span className="section-kicker">POLICY</span>
            <h2 id="policy-title">
              꼭 확인해야 할 <em>중요 정책</em>
            </h2>
            <p>제휴 관계와 상품공유는 분리되어 운영됩니다.</p>
          </div>
          <ul className="partnership-policy-list">
            {policies.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section partnership-section partnership-audience-section" aria-labelledby="audience-title">
        <div className="shell">
          <div className="section-heading centered">
            <span className="section-kicker">WHO CAN APPLY</span>
            <h2 id="audience-title">
              가입 <em>대상</em>
            </h2>
          </div>
          <ul className="partnership-audience-list">
            {audiences.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section partnership-section" aria-labelledby="faq-title">
        <div className="shell partnership-faq-wrap">
          <div className="section-heading centered">
            <span className="section-kicker">FAQ</span>
            <h2 id="faq-title">
              자주 묻는 <em>질문</em>
            </h2>
          </div>
          <div className="partnership-faq-list">
            {faqs.map((item) => (
              <details key={item.q} className="partnership-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="partnership-cta-band" aria-label="가입신청 안내">
        <div className="shell partnership-cta-inner">
          <div>
            <span className="section-kicker light">START PARTNERSHIP</span>
            <h2>
              준비가 되셨다면
              <br />
              <em>제휴여행사 가입을 신청하세요.</em>
            </h2>
            <p>신청서 작성 후 관리자 검토를 거쳐 제휴관계가 활성화됩니다.</p>
          </div>
          <div className="partnership-cta-actions">
            <Link className="button primary" href="/partnership/apply">
              제휴여행사 가입신청 <span>→</span>
            </Link>
            <Link className="button ghost" href="/partnership/application-status">
              신청현황
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
