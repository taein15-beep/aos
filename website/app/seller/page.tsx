import Link from "next/link";

const definitionPoints = [
  "회사와 개인 모두 신청 가능",
  "여행사 승인 후 판매점 관계 활성화",
  "여행사가 판매 가능 상품 지정",
  "여행사가 정률 또는 정액 수수료 설정",
  "한 판매점은 여러 여행사에 가입 가능",
  "여행사별로 별도의 신청과 승인 필요",
  "여행사별 판매상품·수수료·정산조건은 독립 관리",
];

const processSteps = [
  "판매점 가입신청",
  "여행사 검토",
  "승인 또는 보완요청",
  "판매상품·수수료 설정",
  "필요한 정산정보 등록",
  "판매 시작",
];

const feeFlow = ["예약 발생", "결제 완료", "행사 진행", "행사완료", "수수료 확정", "정산대기", "지급완료"];

const faqs = [
  {
    q: "어느 여행사의 판매점으로 가입되나요?",
    a: "현재 접속한 홈페이지의 운영 여행사에 가입신청이 접수됩니다. 가입할 여행사를 별도로 선택하지 않습니다.",
  },
  {
    q: "개인도 판매점에 가입할 수 있나요?",
    a: "네. 사업자등록이 없는 개인도 개인 판매점으로 신청할 수 있습니다.",
  },
  {
    q: "여러 여행사의 판매점이 될 수 있나요?",
    a: "가능합니다. 각 여행사 홈페이지에서 별도로 가입을 신청하고 승인을 받아야 합니다.",
  },
  {
    q: "가입하면 바로 상품을 판매할 수 있나요?",
    a: "아닙니다. 가입 승인 후 여행사가 판매상품과 수수료 조건을 설정해야 판매할 수 있습니다.",
  },
  {
    q: "일반회원 가입 시 추천인코드는 반드시 입력해야 하나요?",
    a: "일반회원 가입 시 추천인코드 입력은 선택사항입니다. 입력하지 않아도 회원가입할 수 있습니다.",
  },
  {
    q: "수수료는 언제 확정되나요?",
    a: "추천회원 또는 직접판매 예약이 정상적으로 행사를 완료한 후 여행사가 설정한 기준에 따라 확정됩니다.",
  },
];

export default function SellerPage() {
  return (
    <main className="seller-page">
      <section className="seller-hero">
        <div className="shell seller-hero-inner">
          <div className="eyebrow">
            <span /> SELLER
          </div>
          <p className="seller-belong-note" role="note">
            판매점 가입신청은 현재 홈페이지 운영 여행사에 접수되며, 가입할 여행사를 별도로 선택하지
            않습니다.
          </p>
          <h1>
            판매점으로 여행상품 판매를
            <br />
            <span>시작해 보세요</span>
          </h1>
          <p>
            현재 홈페이지 운영 여행사의 판매점으로 가입하면 여행사가 허용한 상품을 판매하고,
            추천회원의 행사완료 실적에 따라 수수료를 정산받을 수 있습니다.
          </p>
          <div className="hero-actions seller-hero-actions">
            <Link className="button primary" href="/seller/apply">
              판매점 가입신청 <span>→</span>
            </Link>
            <Link className="button ghost" href="/seller/application-status">
              신청현황
            </Link>
          </div>
        </div>
      </section>

      <section className="section seller-section" aria-labelledby="seller-definition-title">
        <div className="shell">
          <div className="section-heading centered">
            <span className="section-kicker">WHAT IS A SELLER</span>
            <h2 id="seller-definition-title">
              판매점이란 <em>무엇인가요</em>
            </h2>
            <p>
              판매점은 여행사가 허용한 상품을 직접 판매·예약하거나 일반회원을 추천하고, 여행사가
              설정한 조건에 따라 수수료를 정산받는 외부 판매처입니다.
            </p>
          </div>
          <ul className="seller-point-list">
            {definitionPoints.map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section seller-section seller-type-section" aria-labelledby="seller-type-title">
        <div className="shell">
          <div className="section-heading centered">
            <span className="section-kicker">APPLY TYPE</span>
            <h2 id="seller-type-title">
              가입 <em>유형</em>
            </h2>
            <p>사업자와 개인 모두 동일한 심사 절차로 가입할 수 있습니다.</p>
          </div>
          <div className="seller-type-grid">
            <article className="seller-type-card">
              <h3>사업자 판매점</h3>
              <p>
                법인사업자 또는 개인사업자가 사업자등록정보를 제출하고 판매점으로 가입합니다.
              </p>
              <ul>
                <li>상호명</li>
                <li>사업자등록번호</li>
                <li>대표자명</li>
                <li>담당자 정보</li>
                <li>사업자등록증</li>
              </ul>
            </article>
            <article className="seller-type-card">
              <h3>개인 판매점</h3>
              <p>사업자등록 없이 개인 자격으로 여행상품을 소개하거나 판매활동을 하려는 경우 신청합니다.</p>
              <ul>
                <li>판매점명</li>
                <li>신청자 정보</li>
                <li>연락처</li>
                <li>활동 주소</li>
              </ul>
            </article>
          </div>
          <p className="seller-inline-note">
            가입 단계에서는 주민등록번호, 신분증, 통장사본을 받지 않습니다. 정산에 필요한 정보는
            승인 후 별도 절차에서 등록합니다.
          </p>
        </div>
      </section>

      <section className="section seller-section" aria-labelledby="seller-sales-title">
        <div className="shell">
          <div className="section-heading centered">
            <span className="section-kicker">HOW TO SELL</span>
            <h2 id="seller-sales-title">
              판매 <em>방법</em>
            </h2>
            <p>직접판매 수수료와 추천판매 수수료는 여행사가 다르게 설정할 수 있습니다.</p>
          </div>
          <div className="seller-sales-grid">
            <article className="seller-sales-card">
              <h3>직접 판매</h3>
              <ul>
                <li>여행사가 허용한 상품을 판매합니다.</li>
                <li>판매점 관리자에서 고객 예약을 접수합니다.</li>
                <li>예약한 판매점 정보가 예약에 기록됩니다.</li>
                <li>여행사가 설정한 직접판매 수수료가 적용됩니다.</li>
              </ul>
            </article>
            <article className="seller-sales-card">
              <h3>추천회원 판매</h3>
              <ul>
                <li>판매점에 등록된 휴대전화번호를 추천인코드로 사용합니다.</li>
                <li>일반회원 가입 시 추천인코드 입력은 선택사항입니다.</li>
                <li>추천회원이 직접 상품을 예약하고 결제합니다.</li>
                <li>정상 행사완료 후 추천 수수료가 확정됩니다.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section seller-section seller-referral-section" aria-labelledby="seller-referral-title">
        <div className="shell seller-split">
          <div className="section-heading">
            <span className="section-kicker">REFERRAL CODE</span>
            <h2 id="seller-referral-title">
              추천인코드 <em>안내</em>
            </h2>
            <p>
              판매점 가입 승인 후 등록한 휴대전화번호를 추천인코드로 사용할 수 있습니다. 일반회원의
              추천인코드 입력은 선택사항이며, 여행사 관리자는 회원가입 후에도 추천 판매점을
              등록하거나 변경할 수 있습니다.
            </p>
          </div>
          <ul className="seller-policy-list">
            <li>판매점에 등록된 휴대전화번호가 추천인코드로 사용됩니다.</li>
            <li>일반회원 가입 시 추천인코드는 필수가 아닙니다.</li>
            <li>추천인코드를 입력하지 않아도 일반회원 가입이 가능합니다.</li>
            <li>여행사 관리자는 회원관리에서 추천 판매점을 입력·변경·해제할 수 있습니다.</li>
            <li>추천 판매점 변경은 변경 이후 발생한 예약부터 적용됩니다.</li>
            <li>기존 예약은 예약 당시 판매점과 수수료 조건이 유지됩니다.</li>
          </ul>
        </div>
      </section>

      <section className="section seller-section" aria-labelledby="seller-fee-title">
        <div className="shell">
          <div className="section-heading centered">
            <span className="section-kicker">COMMISSION</span>
            <h2 id="seller-fee-title">
              수수료·정산 <em>안내</em>
            </h2>
            <p>가입신청 화면에서는 수수료를 직접 입력하지 않습니다.</p>
          </div>
          <ol className="seller-fee-flow" aria-label="수수료 확정 흐름">
            {feeFlow.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ol>
          <ul className="seller-policy-list seller-fee-notes">
            <li>수수료는 여행사 관리자가 정률 또는 정액으로 설정합니다.</li>
            <li>예약 또는 결제만으로 수수료가 확정되지 않습니다.</li>
            <li>정상 행사완료 후 수수료가 확정됩니다.</li>
            <li>취소·환불 시 수수료가 조정되거나 취소될 수 있습니다.</li>
            <li>지급 후 환불은 이후 정산에서 차감될 수 있습니다.</li>
          </ul>
        </div>
      </section>

      <section
        className="section seller-section seller-process-section"
        id="process"
        aria-labelledby="seller-process-title"
      >
        <div className="shell">
          <div className="section-heading centered">
            <span className="section-kicker">PROCESS</span>
            <h2 id="seller-process-title">
              가입 <em>진행 절차</em>
            </h2>
            <p>
              가입 승인과 판매가능은 다른 단계입니다. 승인 후 설정이 완료되어야 판매를 시작할 수
              있습니다.
            </p>
          </div>
          <ol className="seller-process">
            {processSteps.map((step, index) => (
              <li key={step}>
                <span className="seller-process-num">{index + 1}</span>
                <strong>{step}</strong>
                {index < processSteps.length - 1 ? (
                  <span className="seller-process-arrow" aria-hidden="true">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section seller-section" aria-labelledby="seller-faq-title">
        <div className="shell seller-faq-wrap">
          <div className="section-heading centered">
            <span className="section-kicker">FAQ</span>
            <h2 id="seller-faq-title">
              자주 묻는 <em>질문</em>
            </h2>
          </div>
          <div className="seller-faq-list">
            {faqs.map((item) => (
              <details key={item.q} className="seller-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="seller-cta-band" aria-label="판매점 가입신청 안내">
        <div className="shell seller-cta-inner">
          <div>
            <span className="section-kicker light">START SELLING</span>
            <h2>
              준비가 되셨다면
              <br />
              <em>판매점 가입을 신청하세요.</em>
            </h2>
            <p>가입신청은 현재 홈페이지 운영 여행사에 접수됩니다.</p>
          </div>
          <div className="seller-cta-actions">
            <Link className="button primary" href="/seller/apply">
              판매점 가입신청 <span>→</span>
            </Link>
            <Link className="button ghost" href="/seller/application-status">
              신청현황
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
