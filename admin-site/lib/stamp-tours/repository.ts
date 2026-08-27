import { getD1Binding } from "@/db";
import { ApiError } from "./http";

export type Row = Record<string, string | number | null>;
export async function rows(statement: string, values: unknown[] = []) { const result = await (await getD1Binding()).prepare(statement).bind(...values).all<Row>(); return result.results; }
export async function first(statement: string, values: unknown[] = []) { return await (await getD1Binding()).prepare(statement).bind(...values).first<Row>(); }
export async function run(statement: string, values: unknown[] = []) { return await (await getD1Binding()).prepare(statement).bind(...values).run(); }
export function id(prefix: string) { return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`; }
export async function publicTour(tourCode: string) {
  const tour = await first(`SELECT id,tour_code tourCode,name,description,detail,hero_image_url heroImageUrl,region,participation_opens_at participationOpensAt,participation_closes_at participationClosesAt,use_location useLocation,default_radius_meters defaultRadiusMeters,participation_condition participationCondition,status,starts_at startsAt,ends_at endsAt,privacy_retention_days privacyRetentionDays,location_retention_days locationRetentionDays FROM stamp_tours WHERE tour_code=? AND is_public=1`, [tourCode]);
  if (!tour) throw new ApiError(404, "TOUR_NOT_FOUND", "공개된 스탬프투어를 찾을 수 없습니다."); return tour;
}
export async function tourByCode(tourCode: string) { const tour = await first(`SELECT * FROM stamp_tours WHERE tour_code = ?`, [tourCode]); if (!tour) throw new ApiError(404, "TOUR_NOT_FOUND", "스탬프투어를 찾을 수 없습니다."); return tour; }
export async function participantInTour(participantId: string, tourCode: string) {
  const participant = await first(`SELECT p.*, t.tour_code tourCode, t.privacy_retention_days privacyRetentionDays, t.location_retention_days locationRetentionDays FROM tour_participants p JOIN stamp_tours t ON t.id=p.tour_id WHERE p.id=? AND t.tour_code=?`, [participantId, tourCode]);
  if (!participant) throw new ApiError(403, "PARTICIPANT_TOUR_MISMATCH", "이 투어의 참여자 정보가 아닙니다."); return participant;
}
export async function recalculateParticipant(participantId: string) {
  await run(`UPDATE tour_participants SET verified_spot_count=(SELECT COUNT(*) FROM visit_verifications WHERE participant_id=? AND result='SUCCESS'), achieved_reward_threshold=COALESCE((SELECT MAX(r.required_spot_count) FROM tier_rewards r WHERE r.tour_id=tour_participants.tour_id AND r.required_spot_count <= (SELECT COUNT(*) FROM visit_verifications WHERE participant_id=? AND result='SUCCESS')),0), completed_at=CASE WHEN (SELECT COUNT(*) FROM visit_verifications WHERE participant_id=? AND result='SUCCESS') >= COALESCE((SELECT MAX(required_spot_count) FROM tier_rewards WHERE tour_id=tour_participants.tour_id),2147483647) THEN COALESCE(completed_at,CURRENT_TIMESTAMP) ELSE NULL END, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [participantId, participantId, participantId, participantId]);
  return first(`SELECT verified_spot_count verifiedSpotCount, achieved_reward_threshold achievedRewardThreshold FROM tour_participants WHERE id=?`, [participantId]);
}
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) { const rad = Math.PI / 180; const a = Math.sin((lat2-lat1)*rad/2)**2 + Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin((lon2-lon1)*rad/2)**2; return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); }

const adminResources: Record<string, { table: string; order: string }> = {
  tours: { table: "stamp_tours", order: "created_at DESC" }, spots: { table: "tour_spots", order: "sort_order, created_at" }, qrs: { table: "spot_qrs", order: "created_at DESC" },
  participants: { table: "tour_participants", order: "created_at DESC" }, consents: { table: "participation_consents", order: "agreed_at DESC" }, verifications: { table: "visit_verifications", order: "verified_at DESC" },
  rewards: { table: "tier_rewards", order: "required_spot_count" }, applications: { table: "reward_applications", order: "applied_at DESC" }, "reward-history": { table: "reward_process_history", order: "created_at DESC" },
};
export function adminResource(name: string) { const resource = adminResources[name]; if (!resource) throw new ApiError(404, "ADMIN_RESOURCE_NOT_FOUND", "지원하지 않는 관리 리소스입니다."); return resource; }
