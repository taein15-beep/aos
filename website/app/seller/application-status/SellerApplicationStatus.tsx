"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useState } from "react";
import {
  SELLER_TYPE_LABELS,
  emailsMatch,
  isValidEmail,
  loadPrototypeSellerApplyReceipt,
  type PrototypeSellerApplyReceipt,
  type SellerApplicationStatus as SellerAppStatus,
  type SellerDocumentMeta,
  type SellerOperatingStatus,
  type SellerType,
} from "../apply/form-state";
import {
  SELLER_SAMPLE_APPLICATIONS,
  SELLER_STATUS_SAMPLE_STATUSES,
  findSellerSampleByNumberAndEmail,
  sellerStatusBadgeTone,
  type SellerDocumentStatusItem,
  type SellerSampleApplication,
  type SellerStatusHistoryItem,
} from "./sample-data";

type ViewSource = "recent" | "sample" | "lookup-recent";

type StatusViewModel = {
  source: ViewSource;
  applicationNumber: string;
  appliedAt: string;
  operatorAgencyDisplayName: string;
  sellerType: SellerType;
  sellerName: string;
  businessName?: string;
  businessNumber?: string;
  representativeName?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  referralCodePhone: string;
  status: SellerAppStatus;
  operatingStatus?: SellerOperatingStatus;
  processMessage: string;
  documents: SellerDocumentStatusItem[];
  history: SellerStatusHistoryItem[];
  rejectionReason?: string;
  supplementItems?: string[];
  adminNote?: string;
  requestedAt?: string;
  processedAt?: string;
};

function formatReceiptSubmittedAt(iso: string) {
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

function maskBusinessNumber(value: string) {
  const digits = digitsOnly(value);
  if (digits.length >= 4) return `${digits.slice(0, 3)}-**-*****`;
  if (!value.trim()) return "—";
  return "***";
}

function maskMobilePhone(value: string) {
  const digits = digitsOnly(value);
  if (digits.length >= 10 && digits.length <= 11 && digits.startsWith("01")) {
    return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
  }
  if (!value.trim()) return "—";
  return "***-****-****";
}

function isValidRecentReceipt(
  receipt: PrototypeSellerApplyReceipt | null,
): receipt is PrototypeSellerApplyReceipt {
  if (!receipt?.prototype) return false;
  if (!receipt.applicationNumber || !receipt.submittedAt) return false;
  if (receipt.status !== "승인대기") return false;
  if (receipt.sellerType !== "business" && receipt.sellerType !== "individual") return false;
  if (!receipt.operatorAgencyDisplayName || !receipt.sellerName) return false;
  if (!receipt.contactName || !receipt.contactEmail || !receipt.contactPhone) return false;
  const summary = receipt.summary;
  if (!summary || typeof summary !== "object") return false;
  if (summary.sellerType !== receipt.sellerType) return false;
  if (typeof summary.sellerName !== "string" || !summary.sellerName.trim()) return false;
  if (typeof summary.applicantOrContactName !== "string") return false;
  if (typeof summary.address !== "string") return false;
  if (typeof summary.contactPhone !== "string") return false;
  if (typeof summary.contactEmail !== "string") return false;
  if (typeof summary.referralCodePhone !== "string") return false;
  if (!Array.isArray(summary.documents)) return false;
  return true;
}

function documentMetaToDisplay(doc: SellerDocumentMeta): SellerDocumentStatusItem {
  const attached = Boolean(doc.fileName) || Boolean(doc.fileNames && doc.fileNames.length > 0);
  return {
    name: doc.label,
    state: attached ? (doc.required ? "첨부 완료" : "첨부 완료") : "미첨부",
    required: doc.required,
    fileName: doc.fileNames?.join(", ") || doc.fileName,
  };
}

function receiptToViewModel(receipt: PrototypeSellerApplyReceipt): StatusViewModel {
  const { summary } = receipt;
  return {
    source: "recent",
    applicationNumber: receipt.applicationNumber,
    appliedAt: formatReceiptSubmittedAt(receipt.submittedAt),
    operatorAgencyDisplayName: receipt.operatorAgencyDisplayName,
    sellerType: receipt.sellerType,
    sellerName: summary.sellerName || receipt.sellerName,
    businessName: summary.businessName,
    businessNumber: summary.businessNumber,
    representativeName: summary.representativeName,
    contactName: summary.applicantOrContactName || receipt.contactName,
    contactPhone: summary.contactPhone || receipt.contactPhone,
    contactEmail: summary.contactEmail || receipt.contactEmail,
    referralCodePhone: summary.referralCodePhone || receipt.referralCodePhone,
    status: "승인대기",
    processMessage:
      "현재 홈페이지 운영 여행사가 신청정보와 증빙서류를 검토하고 있습니다. 검토 결과는 담당자 이메일로 안내됩니다.",
    documents: summary.documents.map(documentMetaToDisplay),
    history: [
      {
        at: formatReceiptSubmittedAt(receipt.submittedAt),
        label: "가입신청 접수",
        status: "승인대기",
        message: "승인대기",
      },
    ],
  };
}

function sampleToViewModel(sample: SellerSampleApplication): StatusViewModel {
  return {
    source: "sample",
    applicationNumber: sample.applicationNumber,
    appliedAt: sample.appliedAt,
    operatorAgencyDisplayName: sample.operatorAgencyDisplayName,
    sellerType: sample.sellerType,
    sellerName: sample.sellerName,
    businessName: sample.businessName,
    businessNumber: sample.businessNumber,
    representativeName: sample.representativeName,
    contactName: sample.contactName,
    contactPhone: sample.contactPhone,
    contactEmail: sample.contactEmail,
    referralCodePhone: sample.referralCodePhone,
    status: sample.status,
    operatingStatus: sample.operatingStatus,
    processMessage: sample.processMessage,
    documents: sample.documents,
    history: sample.history,
    rejectionReason: sample.rejectionReason,
    supplementItems: sample.supplementItems,
    adminNote: sample.adminNote,
    requestedAt: sample.requestedAt,
    processedAt: sample.processedAt,
  };
}

function StatusGuide({ view }: { view: StatusViewModel }) {
  if (view.status === "승인대기") {
    return (
      <aside className="seller-status-guide seller-status-guide-wait" role="note">
        <h2>승인대기 안내</h2>
        <p>{view.processMessage}</p>
      </aside>
    );
  }

  if (view.status === "보완요청") {
    return (
      <aside className="seller-status-guide seller-status-guide-fix" role="note">
        <h2>보완요청 안내</h2>
        <p>{view.processMessage}</p>
        {view.requestedAt ? (
          <p>
            <strong>요청일시:</strong> {view.requestedAt}
          </p>
        ) : null}
        {view.adminNote ? (
          <p>
            <strong>관리자 요청사항:</strong> {view.adminNote}
          </p>
        ) : null}
        {view.supplementItems && view.supplementItems.length > 0 ? (
          <ul className="seller-status-supplement-list">
            {view.supplementItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <p className="seller-status-guide-note">
          현재 프로토타입에서는 기존 신청내용을 불러오거나 수정 제출하지 않습니다.
        </p>
        <div className="seller-status-inline-actions">
          <Link className="button ghost dark compact" href="/seller/apply">
            판매점 가입신청 페이지로 이동
          </Link>
        </div>
      </aside>
    );
  }

  if (view.status === "승인완료") {
    return (
      <aside className="seller-status-guide seller-status-guide-ok" role="note">
        <h2>승인완료 안내</h2>
        <p>{view.processMessage}</p>
        {view.operatingStatus ? (
          <p>
            운영상태:{" "}
            <span className="seller-status-badge is-setting">{view.operatingStatus}</span>
          </p>
        ) : null}
        <div className="seller-apply-policy-box">
          <ul>
            <li>승인완료와 판매가능은 같지 않습니다.</li>
            <li>여행사가 판매 가능 상품, 직접판매·추천판매 수수료, 정산정보를 설정해야 합니다.</li>
            <li>정상 행사완료 후 여행사가 설정한 수수료가 확정됩니다.</li>
          </ul>
        </div>
      </aside>
    );
  }

  if (view.status === "가입거절") {
    return (
      <aside className="seller-status-guide seller-status-guide-reject" role="alert">
        <h2>가입거절 안내</h2>
        <p>{view.rejectionReason || view.processMessage}</p>
        {view.processedAt ? (
          <p>
            <strong>처리일시:</strong> {view.processedAt}
          </p>
        ) : null}
        <div className="seller-status-inline-actions">
          <Link className="button ghost dark compact" href="/seller">
            판매점 안내
          </Link>
        </div>
      </aside>
    );
  }

  return null;
}

function ApplicationDetail({ view }: { view: StatusViewModel }) {
  const isBusiness = view.sellerType === "business";
  const isIndividual = view.sellerType === "individual";
  const contactLabel = isIndividual ? "신청자" : "담당자";

  return (
    <div className="seller-status-detail" id="seller-status-detail">
      <div className="seller-status-source-row">
        {view.source === "sample" ? (
          <span className="seller-status-source-badge is-sample">샘플 데이터 · 화면 확인용</span>
        ) : (
          <span className="seller-status-source-badge is-recent">최근 신청 · 이 브라우저</span>
        )}
        <span className={`seller-status-badge is-${sellerStatusBadgeTone(view.status)}`}>
          {view.status}
        </span>
        {view.operatingStatus ? (
          <span className="seller-status-badge is-setting">{view.operatingStatus}</span>
        ) : null}
      </div>

      <h2 className="seller-complete-subhead">신청 기본정보</h2>
      <dl className="seller-complete-meta">
        <div>
          <dt>접수번호</dt>
          <dd className="seller-complete-break">{view.applicationNumber}</dd>
        </div>
        <div>
          <dt>신청일시</dt>
          <dd>{view.appliedAt}</dd>
        </div>
        <div>
          <dt>가입 대상 여행사</dt>
          <dd className="seller-complete-break">{view.operatorAgencyDisplayName}</dd>
        </div>
        <div>
          <dt>가입유형</dt>
          <dd>{SELLER_TYPE_LABELS[view.sellerType]}</dd>
        </div>
        <div>
          <dt>판매점명</dt>
          <dd className="seller-complete-break">{view.sellerName}</dd>
        </div>
        {isBusiness ? (
          <>
            <div>
              <dt>상호명</dt>
              <dd className="seller-complete-break">{view.businessName || "—"}</dd>
            </div>
            <div>
              <dt>사업자등록번호</dt>
              <dd>{view.businessNumber ? maskBusinessNumber(view.businessNumber) : "—"}</dd>
            </div>
            <div>
              <dt>대표자명</dt>
              <dd>{view.representativeName || "—"}</dd>
            </div>
          </>
        ) : null}
        <div>
          <dt>{isIndividual ? "신청자명" : "담당자명"}</dt>
          <dd>{view.contactName}</dd>
        </div>
        <div>
          <dt>{contactLabel} 휴대전화번호</dt>
          <dd>{maskMobilePhone(view.contactPhone)}</dd>
        </div>
        <div>
          <dt>{contactLabel} 이메일</dt>
          <dd className="seller-complete-break">{view.contactEmail}</dd>
        </div>
        <div>
          <dt>추천인코드용 휴대전화번호</dt>
          <dd>{maskMobilePhone(view.referralCodePhone)}</dd>
        </div>
        <div>
          <dt>처리상태</dt>
          <dd>
            <span className={`seller-status-badge is-${sellerStatusBadgeTone(view.status)}`}>
              {view.status}
            </span>
          </dd>
        </div>
        {view.operatingStatus ? (
          <div>
            <dt>운영상태</dt>
            <dd>
              <span className="seller-status-badge is-setting">{view.operatingStatus}</span>
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="seller-status-section">
        <StatusGuide view={view} />
      </div>

      {view.documents.length > 0 ? (
        <section className="seller-status-section" aria-labelledby="seller-status-docs-title">
          <h2 id="seller-status-docs-title">증빙서류</h2>
          {isIndividual ? (
            <p className="seller-status-guide-note">
              개인 판매점은 가입 단계에서 필수 첨부서류가 없습니다.
            </p>
          ) : null}
          <ul className="seller-doc-status-list">
            {view.documents.map((doc) => (
              <li key={doc.name}>
                <div>
                  <span>
                    {doc.name}
                    {doc.required ? " (필수)" : " (선택)"}
                  </span>
                  {doc.fileName ? (
                    <small className="seller-complete-break">{doc.fileName}</small>
                  ) : null}
                </div>
                <em data-state={doc.state}>{doc.state}</em>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="seller-status-section" aria-labelledby="seller-status-history-title">
        <h2 id="seller-status-history-title">처리 이력</h2>
        <ol className="seller-status-history">
          {view.history.map((item, index) => (
            <li key={`${item.at}-${item.label}-${index}`}>
              <div>
                <strong>{item.label}</strong>
                <span>{item.at}</span>
              </div>
              {item.message ? <p>{item.message}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="seller-status-section" aria-labelledby="seller-status-policy-title">
        <h2 id="seller-status-policy-title">추천인코드·수수료 안내</h2>
        <div className="seller-apply-policy-box">
          <ul>
            <li>
              가입 승인 후 등록한 휴대전화번호가 판매점 추천인코드로 사용됩니다. 승인대기 상태에서는 아직
              활성화되지 않습니다.
            </li>
            <li>일반회원 가입 시 추천인코드 입력은 선택사항입니다.</li>
            <li>여행사 관리자는 회원관리에서 추천 판매점을 등록·변경·해제할 수 있습니다.</li>
            <li>추천 판매점 변경은 변경 이후 발생한 예약부터 적용됩니다.</li>
            <li>기존 예약은 예약 당시 판매점과 수수료 조건이 유지됩니다.</li>
            <li>정상 행사완료 후 여행사가 설정한 수수료가 확정됩니다.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

/** FRONTEND PROTOTYPE — 실제 신청조회 API 없음 */
export function SellerApplicationStatus() {
  const [ready, setReady] = useState(false);
  const [recent, setRecent] = useState<StatusViewModel | null>(null);
  const [lookupNumber, setLookupNumber] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState<StatusViewModel | null>(null);
  const [activeSampleNumber, setActiveSampleNumber] = useState<string | null>(null);

  useLayoutEffect(() => {
    const loaded = loadPrototypeSellerApplyReceipt();
    if (isValidRecentReceipt(loaded)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only receipt hydration
      setRecent(receiptToViewModel(loaded));
    } else {
      setRecent(null);
    }
    setReady(true);
  }, []);

  const displayedView = useMemo(() => {
    if (lookupResult) return lookupResult;
    if (activeSampleNumber) {
      const sample = SELLER_SAMPLE_APPLICATIONS.find(
        (item) => item.applicationNumber === activeSampleNumber,
      );
      return sample ? sampleToViewModel(sample) : null;
    }
    return recent;
  }, [lookupResult, activeSampleNumber, recent]);

  const showingAlternate = Boolean(lookupResult || activeSampleNumber);

  const handleLookup = (event: React.FormEvent) => {
    event.preventDefault();
    setLookupError("");
    setLookupResult(null);
    setActiveSampleNumber(null);

    const number = lookupNumber.trim();
    const email = lookupEmail.trim();

    if (!number || !email) {
      setLookupError("접수번호와 담당자 이메일을 모두 입력해 주세요.");
      return;
    }
    if (!isValidEmail(email)) {
      setLookupError("담당자 이메일 형식이 올바르지 않습니다.");
      return;
    }

    if (
      recent &&
      recent.applicationNumber === number &&
      emailsMatch(recent.contactEmail, email)
    ) {
      setLookupResult({ ...recent, source: "lookup-recent" });
      return;
    }

    const sample = findSellerSampleByNumberAndEmail(number, email);
    if (sample) {
      setLookupResult(sampleToViewModel(sample));
      return;
    }

    setLookupError("입력한 정보와 일치하는 판매점 가입신청 내역을 찾을 수 없습니다.");
  };

  const selectSample = (applicationNumber: string) => {
    setLookupError("");
    setLookupResult(null);
    setActiveSampleNumber(applicationNumber);
    const sample = SELLER_SAMPLE_APPLICATIONS.find(
      (item) => item.applicationNumber === applicationNumber,
    );
    if (sample) {
      setLookupNumber(sample.applicationNumber);
      setLookupEmail(sample.contactEmail);
    }
  };

  if (!ready) {
    return (
      <main className="seller-apply-page">
        <div className="shell seller-apply-shell seller-status-shell">
          <p className="seller-apply-secure-note" role="status" aria-live="polite">
            신청현황을 불러오는 중…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="seller-apply-page">
      <div className="shell seller-apply-shell seller-status-shell">
        <nav className="seller-apply-breadcrumb" aria-label="현재 위치">
          <Link href="/">홈</Link>
          <span aria-hidden="true">/</span>
          <Link href="/seller">판매점</Link>
          <span aria-hidden="true">/</span>
          <span>신청현황</span>
        </nav>

        <section className="seller-complete-panel" aria-labelledby="seller-status-title">
          <span className="section-kicker">APPLICATION STATUS</span>
          <h1 id="seller-status-title">판매점 가입 신청현황</h1>
          <p className="seller-complete-lead">
            이 브라우저에 저장된 최근 판매점 가입신청을 확인하거나, 접수번호와 담당자 이메일로 샘플
            신청을 조회할 수 있습니다.
          </p>
          <p className="seller-apply-temp-note" role="note">
            FRONTEND PROTOTYPE — 실제 신청조회 API·DB는 연결되어 있지 않습니다.
          </p>

          {recent ? (
            <section className="seller-status-recent" aria-labelledby="seller-recent-title">
              <header className="seller-status-recent-head">
                <h2 id="seller-recent-title">최근 신청</h2>
                <p>이 브라우저에서 제출한 프로토타입 접수입니다. 접수번호와 이메일을 다시 입력하지 않아도
                  확인할 수 있습니다.</p>
              </header>
              {!showingAlternate ? <ApplicationDetail view={recent} /> : null}
              {showingAlternate ? (
                <button
                  type="button"
                  className="button ghost dark compact"
                  onClick={() => {
                    setLookupResult(null);
                    setActiveSampleNumber(null);
                    setLookupError("");
                  }}
                >
                  최근 신청 다시 보기
                </button>
              ) : null}
            </section>
          ) : (
            <p className="seller-apply-secure-note" role="note">
              접수번호와 담당자 이메일을 입력하면 판매점 가입신청 처리현황을 확인할 수 있습니다.
            </p>
          )}

          <section className="seller-status-lookup" aria-labelledby="seller-lookup-title">
            <h2 id="seller-lookup-title" className="seller-complete-subhead">
              다른 신청 조회
            </h2>
            <p className="seller-status-lookup-lead">
              접수번호와 신청 당시 담당자 이메일을 입력해 주세요. 샘플 조회는 화면 확인용입니다.
            </p>

            <form className="seller-status-lookup-form" onSubmit={handleLookup} noValidate>
              <label htmlFor="seller-lookup-number">
                <span>접수번호</span>
                <input
                  id="seller-lookup-number"
                  value={lookupNumber}
                  onChange={(event) => setLookupNumber(event.target.value)}
                  placeholder="예: AOS-S-SAMPLE-WAIT-01"
                  autoComplete="off"
                  aria-invalid={Boolean(lookupError && !lookupNumber.trim())}
                  aria-describedby={lookupError ? "seller-lookup-error" : undefined}
                />
              </label>
              <label htmlFor="seller-lookup-email">
                <span>담당자 이메일</span>
                <input
                  id="seller-lookup-email"
                  type="email"
                  value={lookupEmail}
                  onChange={(event) => setLookupEmail(event.target.value)}
                  placeholder="예: seller-wait@example.com"
                  autoComplete="email"
                  aria-invalid={Boolean(lookupError && lookupEmail.trim())}
                  aria-describedby={lookupError ? "seller-lookup-error" : undefined}
                />
              </label>
              <button type="submit" className="button primary">
                조회
              </button>
            </form>

            {lookupError ? (
              <div className="seller-status-empty" role="alert" id="seller-lookup-error">
                <p>{lookupError}</p>
                {lookupError.includes("찾을 수 없습니다") ? (
                  <p>접수번호와 신청 당시 담당자 이메일을 다시 확인해 주세요.</p>
                ) : null}
              </div>
            ) : null}

            <div className="seller-status-chips" aria-label="샘플 상태 바로가기">
              {SELLER_STATUS_SAMPLE_STATUSES.map((status) => {
                const sample = SELLER_SAMPLE_APPLICATIONS.find((item) => item.status === status);
                if (!sample) return null;
                const active = displayedView?.source === "sample" && displayedView.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    className={`seller-status-chip ${active ? "is-active" : ""}`}
                    onClick={() => selectSample(sample.applicationNumber)}
                  >
                    {status} · 샘플
                  </button>
                );
              })}
            </div>
          </section>

          <div aria-live="polite">
            {showingAlternate && displayedView ? <ApplicationDetail view={displayedView} /> : null}
          </div>

          {!recent && !displayedView && !lookupError ? (
            <div className="seller-status-empty" role="status">
              <p>확인할 신청을 조회하거나 위 샘플 상태를 선택해 주세요.</p>
            </div>
          ) : null}

          <div className="seller-complete-actions seller-status-actions">
            <Link className="button ghost dark" href="/seller">
              판매점 안내
            </Link>
            <Link className="button ghost dark" href="/seller/apply">
              판매점 가입신청
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
