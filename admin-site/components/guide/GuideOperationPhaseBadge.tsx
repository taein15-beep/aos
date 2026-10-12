import { getGuideClosingState, type GuideClosingState } from "@/lib/admin/guide-closing-data";
import type { GuideDeparture } from "@/lib/admin/guide-operation-data";
import { GUIDE_OPERATION_PHASE_BADGE, getGuideOperationPhase } from "@/lib/admin/guide-review-data";

/** 출발회차 운영상태 (운영배정 · 운영인계 · 운영중 · 운영종료). 운영현황 · 관리자 확인과 같은 기준입니다. */
export function GuideOperationPhaseBadge({
  departure,
  closing,
}: {
  departure: GuideDeparture;
  closing?: GuideClosingState;
}) {
  const phase = getGuideOperationPhase(departure, closing ?? getGuideClosingState(departure.key));
  return <span className={`badge ${GUIDE_OPERATION_PHASE_BADGE[phase]}`}>{phase}</span>;
}
