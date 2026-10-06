"use client";

import type { AffiliateAgencyRow } from "@/lib/admin/product-affiliate-data";
import { RESHARE_BLOCKED_MESSAGE } from "@/lib/admin/product-share-setting-data";

export type ShareManageActionsProps = {
  row: AffiliateAgencyRow;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onReshare: (id: string) => void;
  onCancelRequest: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRelease: (id: string) => void;
  editLabel?: string;
  /** 값이 있으면 다시 공유 버튼을 비활성화하고 사유를 툴팁으로 표시합니다. */
  reshareBlockedReason?: string | null;
};

/** 공유상태(6종)에 따라 제휴여행사 행의 관리 버튼을 표시합니다. */
export function ShareManageActions({
  row,
  onEdit,
  onView,
  onReshare,
  onCancelRequest,
  onPause,
  onResume,
  onRelease,
  editLabel = "조건 수정",
  reshareBlockedReason = null,
}: ShareManageActionsProps) {
  if (row.shareStatus === "수락대기") {
    return (
      <>
        <button type="button" className="small-btn" onClick={() => onEdit(row.id)}>
          {editLabel}
        </button>
        <button type="button" className="small-btn" onClick={() => onCancelRequest(row.id)}>
          공유 요청 취소
        </button>
      </>
    );
  }
  if (row.shareStatus === "공유 중") {
    return (
      <>
        <button type="button" className="small-btn" onClick={() => onEdit(row.id)}>
          {editLabel}
        </button>
        <button type="button" className="small-btn" onClick={() => onPause(row.id)}>
          공유 중지
        </button>
      </>
    );
  }
  if (row.shareStatus === "공유 중지") {
    return (
      <>
        <button type="button" className="small-btn" onClick={() => onEdit(row.id)}>
          {editLabel}
        </button>
        <button type="button" className="small-btn" onClick={() => onResume(row.id)}>
          공유 재개
        </button>
        <button type="button" className="small-btn" onClick={() => onRelease(row.id)}>
          공유 해제
        </button>
      </>
    );
  }
  if (row.shareStatus === "공유 종료" || row.shareStatus === "공유 거절") {
    return (
      <>
        <button type="button" className="small-btn" onClick={() => onView(row.id)}>
          상세보기
        </button>
        <button
          type="button"
          className="small-btn"
          onClick={() => onReshare(row.id)}
          disabled={Boolean(reshareBlockedReason)}
          title={reshareBlockedReason ? `${RESHARE_BLOCKED_MESSAGE} ${reshareBlockedReason}` : undefined}
        >
          다시 공유
        </button>
      </>
    );
  }
  return null;
}
