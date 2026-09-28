"use client";

import { StaffMemberForm } from "@/components/members/StaffMemberForm";
import {
  INITIAL_STAFF_BASIC,
  INITIAL_STAFF_SCOPE,
} from "@/lib/admin/members-staff-form";

type StaffNewModalProps = {
  open: boolean;
  onClose: () => void;
  onRegistered: (message: string) => void;
  onNotify: (message: string) => void;
};

/**
 * 관리자/직원 신규등록 모달 (Mock UI)
 * - DB/API 없음
 */
export function StaffNewModal({ open, onClose, onRegistered, onNotify }: StaffNewModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal member-staff-new-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-new-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="staff-new-modal-title">관리자/직원 신규등록</h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="member-staff-new-modal-body">
          <StaffMemberForm
            key="staff-new-form"
            mode="create"
            initialBasic={INITIAL_STAFF_BASIC}
            initialScope={INITIAL_STAFF_SCOPE}
            onNotify={onNotify}
            formClassName="member-staff-form member-staff-form--modal"
            footer={
              <button type="button" className="secondary" onClick={onClose}>
                취소
              </button>
            }
            onSubmit={() => {
              onRegistered("관리자/직원이 등록되었습니다.");
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
