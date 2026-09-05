"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import {
  loadPrototypeApplyReceipt,
  type ApplyFormSummary,
  type PrototypeApplyReceipt,
} from "../form-state";

/** 예: 2026. 9. 5. 오후 3:20 — form-state 수정 없이 완료 화면용 */
function formatCompleteSubmittedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.trim() || "—";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return iso;
  }
}

function hasValidSummary(summary: ApplyFormSummary | undefined): summary is ApplyFormSummary {
  if (!summary || typeof summary !== "object") return false;
  return (
    typeof summary.agencyName === "string" &&
    typeof summary.businessNumber === "string" &&
    typeof summary.ceoName === "string" &&
    typeof summary.contactName === "string" &&
    typeof summary.contactPhone === "string" &&
    typeof summary.contactEmail === "string" &&
    typeof summary.requiredDocsAttached === "boolean" &&
    typeof summary.requiredTermsAgreed === "boolean"
  );
}

function isValidReceipt(receipt: PrototypeApplyReceipt | null): receipt is PrototypeApplyReceipt {
  if (!receipt?.prototype) return false;
  if (!receipt.applicationNumber || !receipt.submittedAt) return false;
  if (!receipt.agencyName || !receipt.contactEmail) return false;
  if (receipt.status !== "승인대기") return false;
  return hasValidSummary(receipt.summary);
}

const AFTER_APPROVAL_NOTES = [
  "가입 승인 후 관리자에게 제휴여행사 계정 설정 안내가 전달됩니다.",
  "상품공유그룹은 신청 단계에서 선택하지 않으며, 승인 후 관리자가 별도로 지정합니다.",
  "가입 승인만으로 상품이 자동 공유되지 않습니다. 상품공급여행사가 상품별 공유 대상을 지정하면 공유되며, 상대 여행사의 별도 수락 단계는 없습니다.",
  "공유받은 판매여행사는 자사 카테고리를 지정하고 노출을 설정해야 판매할 수 있습니다.",
] as const;

function EmptyCompleteState() {
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
        <section className="partnership-complete-panel" aria-labelledby="complete-empty-title">
          <span className="section-kicker">APPLICATION</span>
          <h1 id="complete-empty-title">확인할 가입신청 내역이 없습니다.</h1>
          <p className="partnership-complete-lead">가입신청을 완료한 후 다시 확인해 주세요.</p>
          <p className="partnership-apply-temp-note" role="note">
            프로토타입 접수는 이 브라우저 sessionStorage에만 보관됩니다. 실제 서버 저장·이메일 발송은 없습니다.
          </p>
          <div className="partnership-complete-actions">
            <Link className="button primary" href="/partnership/apply">
              가입신청하기
            </Link>
            <Link className="button ghost dark" href="/partnership">
              제휴안내 보기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export function PartnershipApplyComplete() {
  const [receipt, setReceipt] = useState<PrototypeApplyReceipt | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    // sessionStorage는 클라이언트에서만 읽을 수 있어 mount 후 상태를 채웁니다.
    const loaded = loadPrototypeApplyReceipt();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only receipt hydration
    setReceipt(isValidReceipt(loaded) ? loaded : null);
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
    return <EmptyCompleteState />;
  }

  const { summary } = receipt;

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
          <h1 id="complete-title">제휴여행사 가입신청이 완료되었습니다.</h1>
          <p className="partnership-complete-lead">
            관리자가 신청정보와 증빙서류를 검토한 후 담당자 이메일로 결과를 안내합니다.
          </p>
          <p className="partnership-apply-temp-note" role="note">
            프론트엔드 프로토타입 접수입니다. 실제 신청 레코드·이메일·알림톡은 생성·발송되지 않았습니다.
          </p>

          <h2 className="partnership-complete-subhead">접수 기본정보</h2>
          <dl className="partnership-complete-meta">
            <div>
              <dt>접수번호</dt>
              <dd className="partnership-complete-break">{receipt.applicationNumber}</dd>
            </div>
            <div>
              <dt>신청일시</dt>
              <dd>{formatCompleteSubmittedAt(receipt.submittedAt)}</dd>
            </div>
            <div>
              <dt>여행사명</dt>
              <dd className="partnership-complete-break">{receipt.agencyName}</dd>
            </div>
            <div>
              <dt>담당자 이메일</dt>
              <dd className="partnership-complete-break">{receipt.contactEmail}</dd>
            </div>
            <div>
              <dt>처리상태</dt>
              <dd>
                <span className="partnership-status-badge is-wait">{receipt.status}</span>
              </dd>
            </div>
          </dl>

          <section className="partnership-complete-summary" aria-labelledby="complete-summary-title">
            <h2 id="complete-summary-title">신청내용 요약</h2>
            <dl>
              <div>
                <dt>여행사명</dt>
                <dd className="partnership-complete-break">{summary.agencyName || "미입력"}</dd>
              </div>
              <div>
                <dt>사업자등록번호</dt>
                <dd className="partnership-complete-break">{summary.businessNumber || "미입력"}</dd>
              </div>
              <div>
                <dt>대표자명</dt>
                <dd>{summary.ceoName || "미입력"}</dd>
              </div>
              <div>
                <dt>담당자명</dt>
                <dd>{summary.contactName || "미입력"}</dd>
              </div>
              <div>
                <dt>담당자 휴대전화번호</dt>
                <dd className="partnership-complete-break">{summary.contactPhone || "미입력"}</dd>
              </div>
              <div>
                <dt>담당자 이메일</dt>
                <dd className="partnership-complete-break">{summary.contactEmail || "미입력"}</dd>
              </div>
              <div>
                <dt>필수서류</dt>
                <dd>{summary.requiredDocsAttached ? "첨부 완료" : "첨부 필요"}</dd>
              </div>
              <div>
                <dt>필수약관</dt>
                <dd>{summary.requiredTermsAgreed ? "동의 완료" : "동의 필요"}</dd>
              </div>
            </dl>
          </section>

          <section className="partnership-complete-process" aria-labelledby="after-approval-title">
            <h2 id="after-approval-title">승인 이후 안내</h2>
            <div className="partnership-apply-policy-box">
              <ul>
                {AFTER_APPROVAL_NOTES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <div className="partnership-complete-actions">
            <Link className="button primary" href="/">
              홈으로
            </Link>
            <Link className="button ghost dark" href="/partnership/application-status">
              신청현황
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
