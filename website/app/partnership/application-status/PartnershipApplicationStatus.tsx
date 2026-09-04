"use client";

import Link from "next/link";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  APPLICATION_STATUSES,
  SAMPLE_APPLICATIONS,
  findSampleApplication,
  statusBadgeTone,
  type ApplicationStatus,
  type SampleApplication,
} from "./sample-data";

type PrototypeNotice = {
  title: string;
  body: string;
};

function StatusActions({
  application,
  onNotice,
  onShowRejection,
}: {
  application: SampleApplication;
  onNotice: (notice: PrototypeNotice) => void;
  onShowRejection: () => void;
}) {
  const status = application.status;

  if (status === "작성 중") {
    return (
      <>
        <Link className="button primary" href="/partnership/apply">
          수정
        </Link>
        <button
          type="button"
          className="button ghost dark"
          onClick={() =>
            onNotice({
              title: "신청취소 (프로토타입)",
              body: "실제 신청취소 API는 연결되어 있지 않습니다. 샘플 화면에서만 안내합니다.",
            })
          }
        >
          신청취소
        </button>
        <button
          type="button"
          className="button ghost dark"
          onClick={() =>
            onNotice({
              title: "제출 (프로토타입)",
              body: "실제 제출 API는 연결되어 있지 않습니다. 가입신청 화면에서 프로토타입 제출을 진행해 주세요.",
            })
          }
        >
          제출
        </button>
      </>
    );
  }

  if (status === "승인대기") {
    return (
      <>
        <Link className="button primary" href="/partnership/apply/complete">
          신청내용 확인
        </Link>
        <button
          type="button"
          className="button ghost dark"
          onClick={() =>
            onNotice({
              title: "신청취소 (프로토타입)",
              body: "실제 신청취소 API는 연결되어 있지 않습니다. 샘플 상태만 확인할 수 있습니다.",
            })
          }
        >
          신청취소
        </button>
      </>
    );
  }

  if (status === "검토 중" || status === "재검토") {
    return (
      <button
        type="button"
        className="button primary"
        onClick={() => {
          document.getElementById("status-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        조회
      </button>
    );
  }

  if (status === "보완요청") {
    return (
      <>
        <Link className="button primary" href="/partnership/apply">
          정보 수정
        </Link>
        <Link className="button ghost dark" href="/partnership/apply">
          서류 재선택
        </Link>
      </>
    );
  }

  if (status === "가입승인") {
    return (
      <button
        type="button"
        className="button primary"
        onClick={() =>
          onNotice({
            title: "관리자 로그인 안내",
            body: "가입승인 후 관리자 계정으로 로그인할 수 있습니다. 실제 로그인·계정 연동은 아직 구현되지 않았습니다. (프로토타입)",
          })
        }
      >
        관리자 로그인 안내
      </button>
    );
  }

  if (status === "가입거절") {
    return (
      <>
        <button type="button" className="button primary" onClick={onShowRejection}>
          거절사유 확인
        </button>
        <Link className="button ghost dark" href="/partnership/apply">
          재신청
        </Link>
      </>
    );
  }

  if (status === "신청취소") {
    return (
      <Link className="button primary" href="/partnership/apply">
        재신청
      </Link>
    );
  }

  return null;
}

/** FRONTEND PROTOTYPE — 실제 로그인·신청조회 API 없음 */
export function PartnershipApplicationStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refFromUrl = searchParams.get("ref")?.trim() || "";

  const initialNumber = useMemo(() => {
    if (refFromUrl && findSampleApplication(refFromUrl)) return refFromUrl;
    return SAMPLE_APPLICATIONS[0].applicationNumber;
  }, [refFromUrl]);

  const [selectedNumber, setSelectedNumber] = useState(initialNumber);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<PrototypeNotice | null>(null);
  const [showRejection, setShowRejection] = useState(false);

  useLayoutEffect(() => {
    setSelectedNumber(initialNumber);
    setReady(true);
  }, [initialNumber]);

  const application = findSampleApplication(selectedNumber) ?? SAMPLE_APPLICATIONS[0];

  const selectApplication = useCallback(
    (applicationNumber: string) => {
      setSelectedNumber(applicationNumber);
      setShowRejection(false);
      // 임시 신청번호만 쿼리에 사용 (개인정보 없음)
      router.replace(`/partnership/application-status?ref=${encodeURIComponent(applicationNumber)}`, {
        scroll: false,
      });
    },
    [router],
  );

  if (!ready) {
    return (
      <main className="partnership-apply-page">
        <div className="shell partnership-apply-shell partnership-status-shell">
          <p className="partnership-apply-secure-note">신청상태를 불러오는 중…</p>
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
          <span>신청상태</span>
        </nav>

        <section className="partnership-complete-panel" aria-labelledby="status-title">
          <span className="section-kicker">APPLICATION STATUS</span>
          <h1 id="status-title">신청상태 확인</h1>
          <p className="partnership-complete-lead">
            임시 샘플 신청번호로 상태별 화면을 확인할 수 있습니다. 실제 로그인·신청조회 API는 연결되어 있지
            않습니다.
          </p>
          <p className="partnership-apply-temp-note" role="note">
            FRONTEND PROTOTYPE — URL에는 임시 신청번호(`ref`)만 사용하며, 개인정보를 넣지 않습니다.
          </p>

          <label className="partnership-status-picker">
            <span>샘플 신청번호</span>
            <select
              value={application.applicationNumber}
              onChange={(event) => selectApplication(event.target.value)}
              aria-label="샘플 신청번호 선택"
            >
              {SAMPLE_APPLICATIONS.map((item) => (
                <option key={item.applicationNumber} value={item.applicationNumber}>
                  {item.applicationNumber} · {item.status}
                </option>
              ))}
            </select>
          </label>

          <div className="partnership-status-chips" aria-label="상태 샘플 바로가기">
            {APPLICATION_STATUSES.map((status) => {
              const sample = SAMPLE_APPLICATIONS.find((item) => item.status === status);
              if (!sample) return null;
              const active = application.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  className={`partnership-status-chip ${active ? "is-active" : ""}`}
                  onClick={() => selectApplication(sample.applicationNumber)}
                >
                  {status}
                </button>
              );
            })}
          </div>

          <div id="status-detail" className="partnership-status-detail">
            <dl className="partnership-complete-meta">
              <div>
                <dt>신청번호</dt>
                <dd>{application.applicationNumber}</dd>
              </div>
              <div>
                <dt>신청일</dt>
                <dd>{application.appliedAt}</dd>
              </div>
              <div>
                <dt>여행사명</dt>
                <dd>{application.agencyName}</dd>
              </div>
              <div>
                <dt>현재 상태</dt>
                <dd>
                  <span
                    className={`partnership-status-badge is-${statusBadgeTone(application.status as ApplicationStatus)}`}
                  >
                    {application.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt>담당 관리자·검토부서</dt>
                <dd>{application.reviewer}</dd>
              </div>
              <div>
                <dt>마지막 처리일</dt>
                <dd>{application.lastProcessedAt}</dd>
              </div>
              <div>
                <dt>처리 메시지</dt>
                <dd className="partnership-status-message">{application.processMessage}</dd>
              </div>
            </dl>

            {application.status === "가입승인" ? (
              <aside className="partnership-status-approval" role="note">
                <h2>승인 완료 안내</h2>
                <p>
                  <strong>제휴여행사 가입이 승인되었습니다.</strong>
                </p>
                <p>
                  관리자가 상품공유그룹을 지정하면 그룹 내 제휴여행사로 활동할 수 있습니다. 상품공급여행사가
                  상품을 공유하면 받은상품에서 확인한 뒤, 자사 카테고리와 노출 여부를 설정하여 판매할 수
                  있습니다.
                </p>
              </aside>
            ) : null}

            {application.status === "가입거절" && showRejection ? (
              <aside className="partnership-status-rejection" role="alert">
                <h2>거절사유</h2>
                <p>{application.rejectionReason || "거절사유가 등록되지 않았습니다."}</p>
              </aside>
            ) : null}

            <section className="partnership-status-section">
              <h2>제출서류 현황</h2>
              <ul className="partnership-doc-status-list">
                {application.documents.map((doc) => (
                  <li key={doc.name}>
                    <span>{doc.name}</span>
                    <em data-state={doc.state}>{doc.state}</em>
                  </li>
                ))}
              </ul>
            </section>

            <section className="partnership-status-section">
              <h2>처리 이력</h2>
              <ol className="partnership-status-history">
                {application.history.map((item, index) => (
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

            <div className="partnership-complete-actions partnership-status-actions">
              <StatusActions
                application={application}
                onNotice={setNotice}
                onShowRejection={() => setShowRejection(true)}
              />
              <Link className="button ghost dark" href="/partnership">
                제휴안내
              </Link>
            </div>
          </div>
        </section>
      </div>

      {notice ? (
        <div className="partnership-apply-dialog" role="dialog" aria-modal="true" aria-labelledby="status-notice-title">
          <button
            type="button"
            className="partnership-apply-dialog-backdrop"
            onClick={() => setNotice(null)}
            aria-label="닫기"
          />
          <div className="partnership-apply-dialog-panel">
            <h3 id="status-notice-title">{notice.title}</h3>
            <p>{notice.body}</p>
            <div>
              <button type="button" className="button primary" onClick={() => setNotice(null)}>
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
