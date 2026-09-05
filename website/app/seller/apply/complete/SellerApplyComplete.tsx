"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import {
  SELLER_TYPE_LABELS,
  loadPrototypeSellerApplyReceipt,
  type PrototypeSellerApplyReceipt,
  type SellerApplyFormSummary,
  type SellerDocumentMeta,
  type SellerType,
} from "../form-state";

/** 예: 2026. 9. 5. 오후 3:20 — hydration 안전, 완료 화면 전용 */
function formatCompleteSubmittedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "신청일시를 확인할 수 없습니다.";
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
    return "신청일시를 확인할 수 없습니다.";
  }
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** 사업자등록번호 마스킹 예: 123-**-***** */
function maskBusinessNumber(value: string) {
  const digits = digitsOnly(value);
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-**-*****`;
  }
  if (digits.length >= 4) {
    return `${digits.slice(0, 3)}-**-*****`;
  }
  if (!value.trim()) return "—";
  return "***";
}

/** 휴대전화 마스킹 예: 010-****-5678 */
function maskMobilePhone(value: string) {
  const digits = digitsOnly(value);
  if (digits.length >= 10 && digits.length <= 11 && digits.startsWith("01")) {
    const tail = digits.slice(-4);
    return `${digits.slice(0, 3)}-****-${tail}`;
  }
  if (!value.trim()) return "—";
  return "***-****-****";
}

function hasValidSummary(
  summary: SellerApplyFormSummary | undefined,
  sellerType: SellerType,
): summary is SellerApplyFormSummary {
  if (!summary || typeof summary !== "object") return false;
  if (summary.sellerType !== sellerType) return false;
  if (typeof summary.sellerName !== "string" || !summary.sellerName.trim()) return false;
  if (typeof summary.applicantOrContactName !== "string") return false;
  if (typeof summary.address !== "string") return false;
  if (typeof summary.contactPhone !== "string") return false;
  if (typeof summary.contactEmail !== "string") return false;
  if (typeof summary.referralCodePhone !== "string") return false;
  if (!Array.isArray(summary.documents)) return false;
  if (typeof summary.requiredTermsAgreed !== "boolean") return false;
  if (sellerType === "business") {
    if (typeof summary.businessName !== "string") return false;
    if (typeof summary.businessNumber !== "string") return false;
    if (typeof summary.representativeName !== "string") return false;
  }
  return true;
}

function isDisplayableReceipt(
  receipt: PrototypeSellerApplyReceipt | null,
): receipt is PrototypeSellerApplyReceipt {
  if (!receipt?.prototype) return false;
  if (!receipt.applicationNumber || !receipt.submittedAt) return false;
  if (!receipt.sellerName || !receipt.contactEmail) return false;
  if (receipt.status !== "승인대기") return false;
  if (receipt.sellerType !== "business" && receipt.sellerType !== "individual") return false;
  return hasValidSummary(receipt.summary, receipt.sellerType);
}

const PROCESS_STEPS = [
  "가입신청 접수",
  "여행사 검토",
  "승인 또는 보완요청",
  "판매 가능 상품과 수수료 설정",
  "필요한 정산정보 등록",
  "판매 시작",
] as const;

const REFERRAL_NOTES = [
  "여행사 관리자는 회원관리에서 추천 판매점을 등록·변경·해제할 수 있습니다.",
  "추천 판매점 변경은 변경 이후 발생한 예약부터 적용됩니다.",
  "기존 예약은 예약 당시 판매점과 수수료 조건이 유지됩니다.",
] as const;

const AFTER_APPROVAL_NOTES = [
  "승인완료와 판매가능은 같지 않습니다. 승인 후 여행사가 판매 가능 상품과 수수료를 설정해야 합니다.",
  "수수료는 정률 또는 정액으로 여행사가 설정합니다.",
  "예약·결제만으로 수수료가 확정되지 않으며, 정상 행사완료 후 수수료가 확정됩니다.",
] as const;

function documentAttached(doc: SellerDocumentMeta) {
  if (doc.fileNames && doc.fileNames.length > 0) return true;
  return Boolean(doc.fileName);
}

function documentStatusLabel(doc: SellerDocumentMeta) {
  if (documentAttached(doc)) {
    return doc.required ? "필수서류 첨부 완료" : "첨부 완료";
  }
  return "미첨부";
}

function EmptyCompleteState() {
  return (
    <main className="seller-apply-page">
      <div className="shell seller-apply-shell seller-complete-shell">
        <nav className="seller-apply-breadcrumb" aria-label="현재 위치">
          <Link href="/">홈</Link>
          <span aria-hidden="true">/</span>
          <Link href="/seller">판매점</Link>
          <span aria-hidden="true">/</span>
          <span>신청 완료</span>
        </nav>
        <section className="seller-complete-panel" aria-labelledby="seller-complete-empty-title">
          <span className="section-kicker">APPLICATION</span>
          <h1 id="seller-complete-empty-title">확인할 판매점 가입신청 내역이 없습니다.</h1>
          <p className="seller-complete-lead">판매점 가입신청을 완료한 후 다시 확인해 주세요.</p>
          <p className="seller-apply-temp-note" role="note">
            프로토타입 접수는 이 브라우저 sessionStorage에만 보관됩니다. 실제 서버 저장·이메일 발송은
            없습니다.
          </p>
          <div className="seller-complete-actions">
            <Link className="button primary" href="/seller/apply">
              판매점 가입신청
            </Link>
            <Link className="button ghost dark" href="/seller">
              판매점 안내
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export function SellerApplyComplete() {
  const [receipt, setReceipt] = useState<PrototypeSellerApplyReceipt | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const loaded = loadPrototypeSellerApplyReceipt();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only receipt hydration
    setReceipt(isDisplayableReceipt(loaded) ? loaded : null);
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="seller-apply-page">
        <div className="shell seller-apply-shell">
          <p className="seller-apply-secure-note" role="status" aria-live="polite">
            신청 결과를 확인하는 중…
          </p>
        </div>
      </main>
    );
  }

  if (!receipt) {
    return <EmptyCompleteState />;
  }

  const { summary } = receipt;
  const isBusiness = receipt.sellerType === "business";
  const isIndividual = receipt.sellerType === "individual";
  const contactLabel = isIndividual ? "신청자" : "담당자";
  const requiredDocs = summary.documents.filter((doc) => doc.required);
  const requiredDocsOk =
    requiredDocs.length > 0 && requiredDocs.every((doc) => documentAttached(doc));

  return (
    <main className="seller-apply-page">
      <div className="shell seller-apply-shell seller-complete-shell">
        <nav className="seller-apply-breadcrumb" aria-label="현재 위치">
          <Link href="/">홈</Link>
          <span aria-hidden="true">/</span>
          <Link href="/seller">판매점</Link>
          <span aria-hidden="true">/</span>
          <span>신청 완료</span>
        </nav>

        <section className="seller-complete-panel" aria-labelledby="seller-complete-title">
          <span className="section-kicker">APPLICATION COMPLETE</span>
          <h1 id="seller-complete-title">판매점 가입신청이 완료되었습니다.</h1>
          <p className="seller-complete-lead">
            현재 홈페이지 운영 여행사가 신청정보와 증빙서류를 검토한 후 담당자 이메일로 결과를
            안내합니다.
          </p>
          <p className="seller-complete-status-line">
            처리상태:{" "}
            <span className="seller-status-badge is-wait">{receipt.status}</span>
          </p>
          <p className="seller-apply-temp-note" role="note">
            프론트엔드 프로토타입 접수입니다. 실제 신청 레코드·이메일·알림톡은 생성·발송되지
            않았습니다.
          </p>

          <h2 className="seller-complete-subhead">접수 기본정보</h2>
          <dl className="seller-complete-meta">
            <div>
              <dt>접수번호</dt>
              <dd className="seller-complete-break">{receipt.applicationNumber}</dd>
            </div>
            <div>
              <dt>신청일시</dt>
              <dd>{formatCompleteSubmittedAt(receipt.submittedAt)}</dd>
            </div>
            <div>
              <dt>가입 대상 여행사</dt>
              <dd className="seller-complete-break">{receipt.operatorAgencyDisplayName}</dd>
            </div>
            <div>
              <dt>가입유형</dt>
              <dd>{SELLER_TYPE_LABELS[receipt.sellerType]}</dd>
            </div>
            <div>
              <dt>판매점명</dt>
              <dd className="seller-complete-break">{receipt.sellerName}</dd>
            </div>
            <div>
              <dt>{contactLabel} 이메일</dt>
              <dd className="seller-complete-break">{receipt.contactEmail}</dd>
            </div>
            <div>
              <dt>처리상태</dt>
              <dd>
                <span className="seller-status-badge is-wait">{receipt.status}</span>
              </dd>
            </div>
          </dl>

          <section className="seller-complete-summary" aria-labelledby="seller-complete-summary-title">
            <h2 id="seller-complete-summary-title">신청정보</h2>
            <dl>
              <div>
                <dt>판매점명</dt>
                <dd className="seller-complete-break">{summary.sellerName}</dd>
              </div>
              {isBusiness ? (
                <>
                  <div>
                    <dt>상호명</dt>
                    <dd className="seller-complete-break">{summary.businessName}</dd>
                  </div>
                  <div>
                    <dt>사업자등록번호</dt>
                    <dd>{maskBusinessNumber(summary.businessNumber ?? "")}</dd>
                  </div>
                  <div>
                    <dt>대표자명</dt>
                    <dd>{summary.representativeName}</dd>
                  </div>
                </>
              ) : null}
              <div>
                <dt>{contactLabel}명</dt>
                <dd>{summary.applicantOrContactName}</dd>
              </div>
              <div>
                <dt>{isBusiness ? "사업장 주소" : "활동 주소"}</dt>
                <dd className="seller-complete-break">{summary.address}</dd>
              </div>
              {summary.addressDetail ? (
                <div>
                  <dt>상세주소</dt>
                  <dd className="seller-complete-break">{summary.addressDetail}</dd>
                </div>
              ) : null}
              <div>
                <dt>{contactLabel} 휴대전화번호</dt>
                <dd>{maskMobilePhone(summary.contactPhone)}</dd>
              </div>
              <div>
                <dt>{contactLabel} 이메일</dt>
                <dd className="seller-complete-break">{summary.contactEmail}</dd>
              </div>
              <div>
                <dt>추천인코드용 휴대전화번호</dt>
                <dd>{maskMobilePhone(summary.referralCodePhone)}</dd>
              </div>
              {summary.homepageOrSns ? (
                <div>
                  <dt>홈페이지 또는 SNS 주소</dt>
                  <dd className="seller-complete-break">{summary.homepageOrSns}</dd>
                </div>
              ) : null}
              {summary.applicationNote ? (
                <div>
                  <dt>활동 및 신청내용</dt>
                  <dd className="seller-complete-break">{summary.applicationNote}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="seller-complete-docs" aria-labelledby="seller-complete-docs-title">
            <h2 id="seller-complete-docs-title">증빙서류</h2>
            {isIndividual ? (
              <p className="seller-complete-docs-note">
                개인 판매점은 가입 단계에서 필수 첨부서류가 없습니다.
              </p>
            ) : null}
            {isBusiness && requiredDocsOk ? (
              <p className="seller-complete-docs-note">필수서류 첨부 완료</p>
            ) : null}
            <ul className="seller-complete-doc-list">
              {summary.documents.map((doc) => (
                <li key={doc.key}>
                  <div>
                    <strong>{doc.label}</strong>
                    {doc.required ? <span className="seller-complete-doc-req">필수</span> : null}
                    {documentAttached(doc) && (doc.fileName || doc.fileNames?.[0]) ? (
                      <span className="seller-complete-doc-name">
                        {doc.fileNames && doc.fileNames.length > 1
                          ? doc.fileNames.join(", ")
                          : doc.fileName || doc.fileNames?.[0]}
                      </span>
                    ) : null}
                  </div>
                  <span className={documentAttached(doc) ? "is-attached" : "is-missing"}>
                    {documentStatusLabel(doc)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="seller-complete-referral"
            aria-labelledby="seller-complete-referral-title"
          >
            <h2 id="seller-complete-referral-title">추천인코드 안내</h2>
            <div className="seller-apply-policy-box">
              <p className="seller-complete-referral-lead">
                가입 승인 후 등록한 휴대전화번호가 판매점 추천인코드로 사용됩니다. 일반회원 가입 시
                추천인코드 입력은 선택사항입니다.
              </p>
              <ul>
                {REFERRAL_NOTES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="seller-complete-process" aria-labelledby="seller-complete-process-title">
            <h2 id="seller-complete-process-title">승인 이후 절차</h2>
            <ol className="seller-complete-process-list">
              {PROCESS_STEPS.map((step, index) => (
                <li key={step} className={index === 0 ? "is-current" : undefined}>
                  <span className="seller-complete-process-num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>
                    {step}
                    {index === 0 ? (
                      <em className="seller-complete-process-now"> — 현재 단계 (승인대기)</em>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
            <div className="seller-apply-policy-box">
              <ul>
                {AFTER_APPROVAL_NOTES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <div className="seller-complete-actions">
            <Link className="button primary" href="/seller/application-status">
              신청현황
            </Link>
            <Link className="button ghost dark" href="/seller">
              판매점 안내
            </Link>
            <Link className="button ghost dark" href="/">
              홈으로
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
