"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useState } from "react";
import {
  isValidEmail,
  loadPrototypeApplyReceipt,
  maskBusinessNumber,
  type PrototypeApplyReceipt,
} from "../apply/form-state";
import {
  APPLICATION_STATUSES,
  SAMPLE_APPLICATIONS,
  findSampleByNumberAndEmail,
  statusBadgeTone,
  type ApplicationStatus,
  type DocumentStatusItem,
  type SampleApplication,
  type StatusHistoryItem,
} from "./sample-data";

type ViewSource = "recent" | "sample";

type StatusViewModel = {
  source: ViewSource;
  applicationNumber: string;
  appliedAt: string;
  agencyName: string;
  ceoName: string;
  businessNumber: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: ApplicationStatus;
  processMessage: string;
  documents: DocumentStatusItem[];
  history: StatusHistoryItem[];
  rejectionReason?: string;
  supplementItems?: string[];
};

function formatReceiptSubmittedAt(iso: string) {
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

function isValidReceipt(receipt: PrototypeApplyReceipt | null): receipt is PrototypeApplyReceipt {
  if (!receipt?.prototype) return false;
  if (!receipt.applicationNumber || !receipt.submittedAt) return false;
  if (!receipt.agencyName || !receipt.contactEmail) return false;
  if (receipt.status !== "승인대기") return false;
  const summary = receipt.summary;
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

function receiptToViewModel(receipt: PrototypeApplyReceipt): StatusViewModel {
  const { summary } = receipt;
  return {
    source: "recent",
    applicationNumber: receipt.applicationNumber,
    appliedAt: formatReceiptSubmittedAt(receipt.submittedAt),
    agencyName: summary.agencyName || receipt.agencyName,
    ceoName: summary.ceoName,
    businessNumber: summary.businessNumber,
    contactName: summary.contactName,
    contactPhone: summary.contactPhone,
    contactEmail: summary.contactEmail || receipt.contactEmail,
    status: "승인대기",
    processMessage:
      "관리자가 신청정보와 증빙서류를 검토하고 있습니다. 검토 결과는 담당자 이메일로 안내됩니다.",
    documents: [
      {
        name: "사업자등록증",
        state: summary.requiredDocsAttached ? "첨부 완료" : "미제출",
        required: true,
      },
      {
        name: "관광사업등록증",
        state: summary.requiredDocsAttached ? "첨부 완료" : "미제출",
        required: true,
      },
      { name: "통신판매업 신고증", state: "상세정보 없음", required: false },
    ],
    history: [
      {
        at: formatReceiptSubmittedAt(receipt.submittedAt),
        status: "승인대기",
        message: "가입신청 접수",
        actor: "신청자",
      },
    ],
  };
}

function sampleToViewModel(sample: SampleApplication): StatusViewModel {
  return {
    source: "sample",
    applicationNumber: sample.applicationNumber,
    appliedAt: sample.appliedAt,
    agencyName: sample.agencyName,
    ceoName: sample.ceoName,
    businessNumber: sample.businessNumber,
    contactName: sample.contactName,
    contactPhone: sample.contactPhone,
    contactEmail: sample.contactEmail,
    status: sample.status,
    processMessage: sample.processMessage,
    documents: sample.documents,
    history: sample.history,
    rejectionReason: sample.rejectionReason,
    supplementItems: sample.supplementItems,
  };
}

function StatusGuide({ view }: { view: StatusViewModel }) {
  if (view.status === "승인대기") {
    return (
      <aside className="partnership-apply-secure-note" role="note">
        관리자가 신청정보와 증빙서류를 검토하고 있습니다. 검토 결과는 담당자 이메일로 안내됩니다.
      </aside>
    );
  }

  if (view.status === "보완요청") {
    return (
      <aside className="partnership-status-rejection" role="note">
        <h2>보완요청 안내</h2>
        <p>{view.processMessage}</p>
        {view.supplementItems && view.supplementItems.length > 0 ? (
          <ul className="partnership-status-supplement-list">
            {view.supplementItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <p className="partnership-status-guide-note">
          프로토타입에서는 기존 신청을 수정·재제출할 수 없습니다. 필요 시 가입신청 페이지에서 새로 작성해
          주세요.
        </p>
        <div className="partnership-status-inline-actions">
          <Link className="button ghost dark compact" href="/partnership/apply">
            가입신청 페이지로 이동
          </Link>
        </div>
      </aside>
    );
  }

  if (view.status === "승인완료") {
    return (
      <aside className="partnership-status-approval" role="note">
        <h2>승인완료 안내</h2>
        <p>
          <strong>제휴여행사 가입이 승인되었습니다.</strong>
        </p>
        <div className="partnership-apply-policy-box">
          <ul>
            <li>상품공유그룹은 관리자가 별도로 지정합니다.</li>
            <li>가입 승인만으로 상품은 자동 공유되지 않습니다.</li>
            <li>상품공급여행사가 상품별 공유 대상을 지정하면 공유됩니다.</li>
            <li>공유받은 상품은 자사 카테고리 지정과 노출 설정 후 판매할 수 있습니다.</li>
            <li>상품공유에 상대 여행사의 별도 수락 단계는 없습니다.</li>
          </ul>
        </div>
      </aside>
    );
  }

  if (view.status === "가입거절") {
    return (
      <aside className="partnership-status-rejection" role="alert">
        <h2>가입거절 안내</h2>
        <p>{view.rejectionReason || view.processMessage}</p>
        <div className="partnership-status-inline-actions">
          <Link className="button ghost dark compact" href="/partnership">
            제휴안내 보기
          </Link>
        </div>
      </aside>
    );
  }

  return null;
}

function ApplicationDetail({ view }: { view: StatusViewModel }) {
  return (
    <div className="partnership-status-detail" id="status-detail">
      <div className="partnership-status-source-row">
        {view.source === "recent" ? (
          <span className="partnership-status-source-badge is-recent">최근 신청 (이 브라우저)</span>
        ) : (
          <span className="partnership-status-source-badge is-sample">샘플 데이터 · 화면 확인용</span>
        )}
        <span className={`partnership-status-badge is-${statusBadgeTone(view.status)}`}>{view.status}</span>
      </div>

      <h2 className="partnership-complete-subhead">기본 신청정보</h2>
      <dl className="partnership-complete-meta">
        <div>
          <dt>접수번호</dt>
          <dd className="partnership-complete-break">{view.applicationNumber}</dd>
        </div>
        <div>
          <dt>신청일시</dt>
          <dd>{view.appliedAt}</dd>
        </div>
        <div>
          <dt>여행사명</dt>
          <dd className="partnership-complete-break">{view.agencyName || "—"}</dd>
        </div>
        <div>
          <dt>대표자명</dt>
          <dd>{view.ceoName || "—"}</dd>
        </div>
        <div>
          <dt>사업자등록번호</dt>
          <dd>{view.businessNumber ? maskBusinessNumber(view.businessNumber) : "—"}</dd>
        </div>
        <div>
          <dt>담당자명</dt>
          <dd>{view.contactName || "—"}</dd>
        </div>
        <div>
          <dt>담당자 휴대전화</dt>
          <dd className="partnership-complete-break">{view.contactPhone || "—"}</dd>
        </div>
        <div>
          <dt>담당자 이메일</dt>
          <dd className="partnership-complete-break">{view.contactEmail || "—"}</dd>
        </div>
        <div>
          <dt>처리상태</dt>
          <dd>
            <span className={`partnership-status-badge is-${statusBadgeTone(view.status)}`}>{view.status}</span>
          </dd>
        </div>
      </dl>

      <div className="partnership-status-section">
        <StatusGuide view={view} />
      </div>

      <section className="partnership-status-section">
        <h2>제출서류 현황</h2>
        <ul className="partnership-doc-status-list">
          {view.documents.map((doc) => (
            <li key={doc.name}>
              <span>
                {doc.name}
                {doc.required ? " (필수)" : " (선택)"}
              </span>
              <em data-state={doc.state}>{doc.state}</em>
            </li>
          ))}
        </ul>
        {view.source === "recent" ? (
          <p className="partnership-status-guide-note">
            프로토타입 접수에는 파일명·파일 내용이 저장되지 않습니다. 필수서류는 첨부 여부만 표시합니다.
          </p>
        ) : null}
      </section>

      <section className="partnership-status-section">
        <h2>진행이력</h2>
        <ol className="partnership-status-history">
          {view.history.map((item, index) => (
            <li key={`${item.at}-${item.status}-${index}`}>
              <div>
                <strong>{item.status}</strong>
                <span>{item.at}</span>
              </div>
              <p>{item.message}</p>
              <small>{item.actor}</small>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/** FRONTEND PROTOTYPE — 실제 로그인·신청조회 API 없음 */
export function PartnershipApplicationStatus() {
  const [ready, setReady] = useState(false);
  const [recent, setRecent] = useState<StatusViewModel | null>(null);
  const [lookupNumber, setLookupNumber] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState<StatusViewModel | null>(null);
  const [activeSampleNumber, setActiveSampleNumber] = useState<string | null>(null);

  useLayoutEffect(() => {
    // sessionStorage는 클라이언트에서만 읽을 수 있어 mount 후 상태를 채웁니다.
    const loaded = loadPrototypeApplyReceipt();
    if (isValidReceipt(loaded)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only receipt hydration
      setRecent(receiptToViewModel(loaded));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only receipt hydration
      setRecent(null);
    }
    setReady(true);
  }, []);

  const displayedView = useMemo(() => {
    if (lookupResult) return lookupResult;
    if (activeSampleNumber) {
      const sample = SAMPLE_APPLICATIONS.find((item) => item.applicationNumber === activeSampleNumber);
      return sample ? sampleToViewModel(sample) : null;
    }
    return recent;
  }, [lookupResult, activeSampleNumber, recent]);

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
      recent.contactEmail.trim().toLowerCase() === email.toLowerCase()
    ) {
      setLookupResult(recent);
      return;
    }

    const sample = findSampleByNumberAndEmail(number, email);
    if (sample) {
      setLookupResult(sampleToViewModel(sample));
      return;
    }

    setLookupError("입력한 정보와 일치하는 가입신청 내역을 찾을 수 없습니다.");
  };

  const selectSample = (applicationNumber: string) => {
    setLookupError("");
    setLookupResult(null);
    setActiveSampleNumber(applicationNumber);
    const sample = SAMPLE_APPLICATIONS.find((item) => item.applicationNumber === applicationNumber);
    if (sample) {
      setLookupNumber(sample.applicationNumber);
      setLookupEmail(sample.contactEmail);
    }
  };

  if (!ready) {
    return (
      <main className="partnership-apply-page">
        <div className="shell partnership-apply-shell partnership-status-shell">
          <p className="partnership-apply-secure-note">신청현황을 불러오는 중…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="partnership-apply-page">
      <div className="shell partnership-apply-shell partnership-status-shell">
        <nav className="partnership-apply-breadcrumb" aria-label="현재 위치">
          <Link href="/">홈</Link>
          <span aria-hidden="true">/</span>
          <Link href="/partnership">제휴여행사</Link>
          <span aria-hidden="true">/</span>
          <span>신청현황</span>
        </nav>

        <section className="partnership-complete-panel" aria-labelledby="status-title">
          <span className="section-kicker">APPLICATION STATUS</span>
          <h1 id="status-title">신청현황 확인</h1>
          <p className="partnership-complete-lead">
            이 브라우저에 저장된 최근 가입신청을 확인하거나, 접수번호와 담당자 이메일로 샘플 신청을 조회할 수
            있습니다.
          </p>
          <p className="partnership-apply-temp-note" role="note">
            FRONTEND PROTOTYPE — 실제 신청조회 API·DB는 연결되어 있지 않습니다.
          </p>

          {recent ? (
            <section className="partnership-status-recent" aria-labelledby="recent-title">
              <header className="partnership-status-recent-head">
                <h2 id="recent-title">최근 신청</h2>
                <p>이 브라우저에서 방금 제출한 프로토타입 접수입니다.</p>
              </header>
              {!lookupResult && !activeSampleNumber ? <ApplicationDetail view={recent} /> : null}
              {(lookupResult || activeSampleNumber) && (
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
              )}
            </section>
          ) : (
            <p className="partnership-apply-secure-note" role="note">
              이 브라우저에 저장된 최근 가입신청이 없습니다. 아래에서 샘플 신청을 조회해 화면을 확인할 수
              있습니다.
            </p>
          )}

          <section className="partnership-status-lookup" aria-labelledby="lookup-title">
            <h2 id="lookup-title" className="partnership-complete-subhead">
              {recent ? "다른 신청 조회" : "신청 조회"}
            </h2>
            <p className="partnership-status-lookup-lead">
              접수번호와 신청 당시 담당자 이메일을 입력해 주세요. 샘플 조회는 화면 확인용입니다.
            </p>

            <form className="partnership-status-lookup-form" onSubmit={handleLookup} noValidate>
              <label>
                <span>접수번호</span>
                <input
                  value={lookupNumber}
                  onChange={(event) => setLookupNumber(event.target.value)}
                  placeholder="예: AOS-S-WAIT-002"
                  autoComplete="off"
                />
              </label>
              <label>
                <span>담당자 이메일</span>
                <input
                  type="email"
                  value={lookupEmail}
                  onChange={(event) => setLookupEmail(event.target.value)}
                  placeholder="예: sample-b@example.com"
                  autoComplete="email"
                />
              </label>
              <button type="submit" className="button primary">
                조회하기
              </button>
            </form>

            {lookupError ? (
              <div className="partnership-status-empty" role="alert">
                <p>{lookupError}</p>
                {lookupError.includes("찾을 수 없습니다") ? (
                  <p>접수번호와 신청 당시 담당자 이메일을 다시 확인해 주세요.</p>
                ) : null}
              </div>
            ) : null}

            <div className="partnership-status-chips" aria-label="샘플 상태 바로가기">
              {APPLICATION_STATUSES.map((status) => {
                const sample = SAMPLE_APPLICATIONS.find((item) => item.status === status);
                if (!sample) return null;
                const active = displayedView?.source === "sample" && displayedView.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    className={`partnership-status-chip ${active ? "is-active" : ""}`}
                    onClick={() => selectSample(sample.applicationNumber)}
                  >
                    {status} · 샘플
                  </button>
                );
              })}
            </div>
          </section>

          {lookupResult || activeSampleNumber ? (
            displayedView ? <ApplicationDetail view={displayedView} /> : null
          ) : null}

          {!recent && !displayedView && !lookupError ? (
            <div className="partnership-status-empty" role="status">
              <p>확인할 신청을 조회하거나 위 샘플 상태를 선택해 주세요.</p>
            </div>
          ) : null}

          <div className="partnership-complete-actions partnership-status-actions">
            <Link className="button ghost dark" href="/partnership">
              제휴안내 보기
            </Link>
            <Link className="button ghost dark" href="/partnership/apply">
              가입신청하기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
