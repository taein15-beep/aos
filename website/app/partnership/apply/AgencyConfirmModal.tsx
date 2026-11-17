"use client";

import { useEffect } from "react";
import type { PlatformAgency } from "./form-state";

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

export function AgencyConfirmModal({
  agency,
  onClose,
  onConfirm,
  submitting = false,
  sampleMode = false,
}: {
  agency: PlatformAgency;
  onClose: () => void;
  onConfirm: () => void;
  submitting?: boolean;
  /** 샘플 미리보기일 때 안내 문구를 조금 다르게 표시 */
  sampleMode?: boolean;
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
        {sampleMode ? <p className="partnership-agency-sample-badge">샘플 미리보기</p> : null}
        <h3 id="partnership-agency-dialog-title">플랫폼 등록 여행사 확인</h3>
        <p className="partnership-agency-dialog-lead">
          {sampleMode
            ? "제휴여행사 가입신청에서 사업자등록번호 확인 후 표시되는 모달 샘플입니다. 실제 가입신청 흐름과 동일한 화면입니다."
            : "입력하신 사업자등록번호로 AOS 플랫폼에 등록된 여행사를 찾았습니다. 아래 정보가 맞다면 제휴여행사 가입을 신청해 주세요."}
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
            {sampleMode ? "닫기" : "취소"}
          </button>
          <button type="button" className="button primary compact" onClick={onConfirm} disabled={submitting}>
            {submitting ? "신청 중…" : sampleMode ? "가입신청 (샘플)" : "가입신청"}
          </button>
        </div>
      </div>
    </div>
  );
}
