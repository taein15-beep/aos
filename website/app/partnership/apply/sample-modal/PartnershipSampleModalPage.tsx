"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgencyConfirmModal } from "../AgencyConfirmModal";
import {
  PLATFORM_AGENCIES,
  createPrototypeApplyReceiptFromAgency,
  savePrototypeApplyReceipt,
} from "../form-state";

export function PartnershipSampleModalPage() {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const agency = useMemo(() => PLATFORM_AGENCIES[selectedIndex] ?? PLATFORM_AGENCIES[0], [selectedIndex]);

  const openModal = (index: number) => {
    setSelectedIndex(index);
    setModalOpen(true);
  };

  const submitSample = () => {
    if (submitting) return;
    setSubmitting(true);
    const receipt = createPrototypeApplyReceiptFromAgency(agency);
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
          <Link href="/partnership/apply">가입신청</Link>
          <span aria-hidden="true">/</span>
          <span>모달 샘플</span>
        </nav>

        <header className="partnership-apply-intro">
          <span className="section-kicker">SAMPLE MODAL</span>
          <h1>제휴여행사 확인 모달 샘플</h1>
          <p>
            사업자등록번호 확인 후 표시되는 「플랫폼 등록 여행사 확인」 모달을 미리 확인할 수 있는 샘플
            페이지입니다.
          </p>
        </header>

        <section className="partnership-apply-guide" aria-labelledby="sample-modal-guide-title">
          <h2 id="sample-modal-guide-title">샘플 사업자등록번호</h2>
          <ul>
            {PLATFORM_AGENCIES.map((item, index) => (
              <li key={item.businessNumber}>
                <strong>{item.businessNumber}</strong> — {item.agencyName} ({item.tourismLicenseType})
              </li>
            ))}
          </ul>
        </section>

        <section className="partnership-apply-panel" aria-labelledby="sample-modal-panel-title">
          <header className="partnership-apply-panel-head">
            <span>PREVIEW</span>
            <h2 id="sample-modal-panel-title">모달 미리보기</h2>
            <p>아래 버튼을 누르면 해당 여행사 정보로 가입 확인 모달이 열립니다.</p>
          </header>

          <div className="partnership-sample-modal-actions">
            {PLATFORM_AGENCIES.map((item, index) => (
              <button
                key={item.businessNumber}
                type="button"
                className={`button ${selectedIndex === index && modalOpen ? "primary" : "ghost dark"} compact`}
                onClick={() => openModal(index)}
              >
                {item.agencyName}
                <small>{item.businessNumber}</small>
              </button>
            ))}
          </div>

          <div className="partnership-apply-actions">
            <Link className="button ghost dark" href="/partnership/apply">
              가입신청 화면으로
            </Link>
            <button type="button" className="button primary" onClick={() => setModalOpen(true)}>
              모달 다시 열기
            </button>
          </div>
        </section>
      </div>

      {modalOpen ? (
        <AgencyConfirmModal
          agency={agency}
          sampleMode
          submitting={submitting}
          onClose={() => setModalOpen(false)}
          onConfirm={submitSample}
        />
      ) : null}
    </main>
  );
}
