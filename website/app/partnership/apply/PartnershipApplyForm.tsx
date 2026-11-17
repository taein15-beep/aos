"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgencyConfirmModal } from "./AgencyConfirmModal";
import {
  PLATFORM_AGENCIES,
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

  const openAgencyModal = (agency: PlatformAgency) => {
    setBusinessNumber(agency.businessNumber);
    setError("");
    setLookupNote("");
    setFoundAgency(agency);
    setModalOpen(true);
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
              모달 화면만 바로 보려면{" "}
              <Link href="/partnership/apply/sample-modal" className="partnership-guide-link">
                모달 샘플 페이지
              </Link>
              를 열어 주세요.
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

            <div className="partnership-sample-numbers" aria-label="샘플 사업자등록번호">
              <span>샘플 번호로 모달 열기</span>
              <div>
                {PLATFORM_AGENCIES.map((agency) => (
                  <button
                    key={agency.businessNumber}
                    type="button"
                    className="partnership-sample-chip"
                    onClick={() => openAgencyModal(agency)}
                  >
                    <strong>{agency.businessNumber}</strong>
                    <em>{agency.agencyName}</em>
                  </button>
                ))}
              </div>
            </div>

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
            <Link className="button ghost dark" href="/partnership/apply/sample-modal">
              모달 샘플 보기
            </Link>
          </div>
        </section>
      </div>

      {modalOpen && foundAgency ? (
        <AgencyConfirmModal
          agency={foundAgency}
          onClose={closeModal}
          onConfirm={submitApplication}
          submitting={submitting}
        />
      ) : null}
    </main>
  );
}
