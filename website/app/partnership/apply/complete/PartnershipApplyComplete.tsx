"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import {
  formatSubmittedAt,
  loadPrototypeApplyReceipt,
  maskEmail,
  type PrototypeApplyReceipt,
} from "../form-state";

export function PartnershipApplyComplete() {
  const [receipt, setReceipt] = useState<PrototypeApplyReceipt | null>(null);
  const [ready, setReady] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useLayoutEffect(() => {
    setReceipt(loadPrototypeApplyReceipt());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="partnership-apply-page">
        <div className="shell partnership-apply-shell">
          <p className="partnership-apply-secure-note">신청 결과를 확인하는 중…</p>
        </div>
      </main>
    );
  }

  if (!receipt) {
    return (
      <main className="partnership-apply-page">
        <div className="shell partnership-apply-shell partnership-complete-shell">
          <nav className="partnership-apply-breadcrumb" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span aria-hidden="true">/</span>
            <Link href="/partnership">제휴여행사</Link>
            <span aria-hidden="true">/</span>
            <span>신청 완료</span>
          </nav>
          <section className="partnership-complete-panel">
            <h1>신청 정보를 찾을 수 없습니다</h1>
            <p>
              이 브라우저는 프로토타입 접수 내역이 없습니다. 실제 서버에 저장된 신청이 아니며, 새로고침·다른
              기기에서는 보이지 않을 수 있습니다.
            </p>
            <div className="partnership-complete-actions">
              <Link className="button primary" href="/partnership/apply">
                가입신청 다시 작성
              </Link>
              <Link className="button ghost dark" href="/partnership/application-status">
                신청상태 확인
              </Link>
              <Link className="button ghost dark" href="/partnership">
                제휴여행사 안내
              </Link>
              <Link className="button ghost dark" href="/">
                홈페이지로 이동
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const review = receipt.review;

  return (
    <main className="partnership-apply-page">
      <div className="shell partnership-apply-shell partnership-complete-shell">
        <nav className="partnership-apply-breadcrumb" aria-label="현재 위치">
          <Link href="/">홈</Link>
          <span aria-hidden="true">/</span>
          <Link href="/partnership">제휴여행사</Link>
          <span aria-hidden="true">/</span>
          <span>신청 완료</span>
        </nav>

        <section className="partnership-complete-panel" aria-labelledby="complete-title">
          <span className="section-kicker">APPLICATION COMPLETE</span>
          <h1 id="complete-title">가입신청 완료</h1>
          <p className="partnership-complete-lead">
            관리자가 여행사 정보와 제출서류를 검토합니다. 승인이 완료되면 제휴여행사 관계가 활성화되며
            상품공유그룹은 관리자가 별도로 지정합니다.
          </p>
          <p className="partnership-apply-temp-note" role="note">
            프론트엔드 프로토타입 접수입니다. 실제 신청 레코드·이메일·알림톡은 생성·발송되지 않았습니다.
          </p>

          <dl className="partnership-complete-meta">
            <div>
              <dt>임시 신청번호</dt>
              <dd>{receipt.applicationNumber}</dd>
            </div>
            <div>
              <dt>신청 여행사</dt>
              <dd>{receipt.agencyName}</dd>
            </div>
            <div>
              <dt>신청일</dt>
              <dd>{formatSubmittedAt(receipt.submittedAt)}</dd>
            </div>
            <div>
              <dt>현재 상태</dt>
              <dd>
                <span className="partnership-status-badge">{receipt.status}</span>
              </dd>
            </div>
            <div>
              <dt>등록 이메일</dt>
              <dd>{maskEmail(receipt.contactEmail)}</dd>
            </div>
          </dl>

          <div className="partnership-complete-process">
            <h2>예상 검토 절차</h2>
            <ol>
              <li>제출서류·사업자 정보 확인</li>
              <li>관리자 검토 및 보완 요청(필요 시)</li>
              <li>가입승인 및 제휴관계 활성화</li>
              <li>상품공유그룹 별도 지정</li>
            </ol>
          </div>

          <div className="partnership-complete-contact">
            <h2>문의 안내</h2>
            <p>
              신청 상태·서류 보완 문의는 AOS 제휴 담당으로 연락해 주세요.
              <br />
              (프로토타입 단계에서는 실제 알림이 발송되지 않습니다.)
            </p>
          </div>

          <div className="partnership-complete-actions">
            <Link className="button primary" href="/">
              홈페이지로 이동
            </Link>
            <button type="button" className="button ghost dark" onClick={() => setShowSummary((value) => !value)}>
              신청내용 확인
            </button>
            <Link className="button ghost dark" href="/partnership/application-status">
              신청상태 확인
            </Link>
            <Link className="button ghost dark" href="/partnership">
              제휴여행사 안내
            </Link>
          </div>

          {showSummary ? (
            <section className="partnership-complete-summary" id="application-summary" aria-label="신청내용 요약">
              <h2>신청내용 요약</h2>
              <dl>
                <div>
                  <dt>취급상품</dt>
                  <dd>{review.productTypes.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt>제휴 목적</dt>
                  <dd>{review.partnershipPurposes.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt>제출서류</dt>
                  <dd>
                    {[review.businessLicenseFileName, review.tourismLicenseFileName, ...review.otherFileNames]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt>필수 약관</dt>
                  <dd>{review.requiredTermsAgreed ? "모두 동의" : "미완료"}</dd>
                </div>
              </dl>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}
