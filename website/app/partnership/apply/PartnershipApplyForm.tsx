"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPrototypeApplyReceiptFromAgency,
  findPlatformAgencyByBusinessNumber,
  formatBusinessNumberInput,
  isValidBusinessNumber,
  savePrototypeApplyReceipt,
  type PlatformAgency,
} from "./form-state";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <small className="partnership-field-error" role="alert">
      {message}
    </small>
  );
}

function useEscape(onClose: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, enabled]);
}

function AgencyConfirmDialog({
  agency,
  onClose,
  onConfirm,
  submitting,
}: {
  agency: PlatformAgency;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  useEscape(onClose, true);

  return (
    <div className="partnership-apply-dialog" role="presentation">
      <button type="button" className="partnership-apply-dialog-backdrop" aria-label="닫기" onClick={onClose} />
      <div
        className="partnership-apply-dialog-panel partnership-agency-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="partnership-agency-dialog-title"
      >
        <h3 id="partnership-agency-dialog-title">플랫폼 등록 여행사 확인</h3>
        <p className="partnership-agency-dialog-lead">
          입력하신 사업자등록번호로 AOS 플랫폼에 등록된 여행사를 찾았습니다. 아래 정보가 맞다면 제휴여행사
          가입을 신청해 주세요.
        </p>

        <dl className="partnership-agency-summary">
          <div>
            <dt>여행사명</dt>
            <dd>{agency.agencyName}</dd>
          </div>
          <div>
            <dt>사업자등록번호</dt>
            <dd>{agency.businessNumber}</dd>
          </div>
          <div>
            <dt>대표자명</dt>
            <dd>{agency.ceoName}</dd>
          </div>
          <div>
            <dt>여행업 종류</dt>
            <dd>{agency.tourismLicenseType}</dd>
          </div>
          <div>
            <dt>대표 전화</dt>
            <dd>{agency.phone}</dd>
          </div>
          <div>
            <dt>사업장 주소</dt>
            <dd>{agency.address}</dd>
          </div>
          <div>
            <dt>담당자</dt>
            <dd>
              {agency.contactName} · {agency.contactPhone}
            </dd>
          </div>
          <div>
            <dt>담당자 이메일</dt>
            <dd>{agency.contactEmail}</dd>
          </div>
        </dl>

        <p className="partnership-agency-confirm-question">이 여행사로 제휴여행사 가입을 신청하시겠습니까?</p>

        <div className="partnership-agency-dialog-actions">
          <button type="button" className="button ghost dark compact" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button type="button" className="button primary compact" onClick={onConfirm} disabled={submitting}>
            {submitting ? "신청 중…" : "가입신청"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PartnershipApplyForm() {
  const router = useRouter();
  const [businessNumber, setBusinessNumber] = useState("");
  const [error, setError] = useState("");
  const [lookupNote, setLookupNote] = useState("");
  const [foundAgency, setFoundAgency] = useState<PlatformAgency | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const checkBusinessNumber = () => {
    setLookupNote("");
    setFoundAgency(null);
    setModalOpen(false);

    if (!businessNumber.trim()) {
      setError("사업자등록번호를 입력해 주세요.");
      document.getElementById("partnership-business-number")?.focus();
      return;
    }
    if (!isValidBusinessNumber(businessNumber)) {
      setError("사업자등록번호 형식이 올바르지 않습니다. (예: 000-00-00000)");
      document.getElementById("partnership-business-number")?.focus();
      return;
    }

    setError("");
    const agency = findPlatformAgencyByBusinessNumber(businessNumber);
    if (!agency) {
      setLookupNote(
        "AOS 플랫폼에 등록된 여행사를 찾지 못했습니다. 플랫폼을 사용 중인 여행사만 제휴여행사 가입을 신청할 수 있습니다.",
      );
      return;
    }

    setFoundAgency(agency);
    setModalOpen(true);
  };

  const submitApplication = () => {
    if (!foundAgency || submitting) return;
    setSubmitting(true);
    const receipt = createPrototypeApplyReceiptFromAgency(foundAgency);
    savePrototypeApplyReceipt(receipt);
    router.push("/partnership/apply/complete");
  };

  return (
    <main className="partnership-apply-page">
      <div className="shell partnership-apply-shell partnership-apply-shell-compact">
        <nav className="partnership-apply-breadcrumb" aria-label="현재 위치">
          <Link href="/">홈</Link>
          <span aria-hidden="true">/</span>
          <Link href="/partnership">제휴여행사</Link>
          <span aria-hidden="true">/</span>
          <span>가입신청</span>
        </nav>

        <header className="partnership-apply-intro">
          <span className="section-kicker">PARTNERSHIP APPLY</span>
          <h1>제휴여행사 가입신청</h1>
          <p>
            AOS 플랫폼을 이미 사용 중인 여행사만 제휴여행사 가입을 신청할 수 있습니다. 사업자등록번호로
            플랫폼 등록 여부를 확인한 뒤 가입을 진행해 주세요.
          </p>
        </header>

        <section className="partnership-apply-guide" aria-labelledby="partnership-apply-guide-title">
          <h2 id="partnership-apply-guide-title">신청 안내</h2>
          <ul>
            <li>제휴여행사는 AOS 플랫폼에 등록된 여행사 정보를 그대로 사용합니다.</li>
            <li>여행사명, 대표자, 연락처, 서류 등 상세 정보는 다시 입력하지 않습니다.</li>
            <li>사업자등록번호만 입력해 플랫폼 사용 여행사인지 확인해 주세요.</li>
            <li>확인된 여행사 정보가 맞다면 모달에서 가입신청을 진행할 수 있습니다.</li>
            <li>
              샘플 확인용 사업자등록번호: <strong>123-45-67890</strong>, <strong>234-56-78901</strong>,{" "}
              <strong>345-67-89012</strong>
            </li>
          </ul>
        </section>

        <section className="partnership-apply-panel" aria-labelledby="apply-form-title">
          <header className="partnership-apply-panel-head">
            <span>APPLICATION</span>
            <h2 id="apply-form-title">사업자등록번호 확인</h2>
            <p>플랫폼에 등록된 여행사인지 사업자등록번호로 조회합니다.</p>
          </header>

          <form
            className="partnership-biz-check-form"
            onSubmit={(event) => {
              event.preventDefault();
              checkBusinessNumber();
            }}
            noValidate
          >
            <label className={error ? "is-invalid" : undefined}>
              <span className="partnership-field-label">
                <span>
                  사업자등록번호<em aria-label="필수">*</em>
                </span>
              </span>
              <div className="partnership-inline-action">
                <input
                  id="partnership-business-number"
                  inputMode="numeric"
                  value={businessNumber}
                  onChange={(event) => {
                    setBusinessNumber(formatBusinessNumberInput(event.target.value));
                    setError("");
                    setLookupNote("");
                  }}
                  placeholder="예) 123-45-67890"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "partnership-business-number-error" : undefined}
                />
                <button type="submit" className="button primary compact">
                  여행사 확인
                </button>
              </div>
              <FieldError message={error} />
            </label>

            {lookupNote ? (
              <p className="partnership-biz-lookup-note" role="status">
                {lookupNote}
              </p>
            ) : null}
          </form>

          <div className="partnership-apply-actions">
            <Link className="button ghost dark" href="/partnership">
              취소
            </Link>
          </div>
        </section>
      </div>

      {modalOpen && foundAgency ? (
        <AgencyConfirmDialog
          agency={foundAgency}
          onClose={closeModal}
          onConfirm={submitApplication}
          submitting={submitting}
        />
      ) : null}
    </main>
  );
}
