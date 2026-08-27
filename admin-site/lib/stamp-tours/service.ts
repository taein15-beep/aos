import {
  first,
  id,
  participantInTour,
  publicTour,
  recalculateParticipant,
  rows,
  run,
  tourByCode,
  distanceMeters,
} from "./repository";
import {
  addDays,
  createOpaqueToken,
  createParticipantToken,
  decrypt,
  encrypt,
  hashCode,
  lookupHash,
  normalizePhone,
  safeEqual,
  tokenHash,
} from "./security";
import { ApiError } from "./http";
import { exposeDevelopmentCode, getSmsProvider } from "./sms";

export async function getPublicTour(tourCode: string) {
  const tour = await publicTour(tourCode);
  const summary = await first(
    `SELECT COUNT(*) spotCount FROM tour_spots WHERE tour_id=? AND is_active=1 AND is_public=1`,
    [tour.id],
  );
  return { ...tour, ...summary };
}
export async function getPublicSpots(tourCode: string, spotCode?: string) {
  const tour = await publicTour(tourCode);
  const result = await rows(
    `SELECT spot_code spotCode,name,description,detail,image_url imageUrl,address,latitude,longitude,closed_days closedDays,contact,qr_location_guide qrLocationGuide,caution,is_required isRequired,allowed_radius_meters allowedRadiusMeters,requires_location requiresLocation,opens_at opensAt,closes_at closesAt,verification_starts_at verificationStartsAt,verification_ends_at verificationEndsAt,sort_order sortOrder FROM tour_spots WHERE tour_id=? AND is_active=1 AND is_public=1 ${spotCode ? "AND spot_code=?" : ""} ORDER BY sort_order`,
    spotCode ? [tour.id, spotCode] : [tour.id],
  );
  if (spotCode && !result[0])
    throw new ApiError(404, "SPOT_NOT_FOUND", "관광지를 찾을 수 없습니다.");
  return spotCode ? result[0] : result;
}
export async function validateQr(tourCode: string | undefined, token: string) {
  const qr = await first(
    `SELECT q.id qrId,q.status,q.expires_at expiresAt,s.id spotId,s.spot_code spotCode,s.name spotName,s.description,s.address,s.allowed_radius_meters allowedRadiusMeters,s.requires_location requiresLocation,s.opens_at opensAt,s.closes_at closesAt,s.verification_starts_at verificationStartsAt,s.verification_ends_at verificationEndsAt,s.is_active spotActive,t.id tourId,t.name tourName,t.tour_code tourCode,t.status tourStatus,t.starts_at tourStartsAt,t.ends_at tourEndsAt FROM spot_qrs q JOIN tour_spots s ON s.id=q.spot_id JOIN stamp_tours t ON t.id=s.tour_id WHERE q.token_hash=?`,
    [tokenHash(token)],
  );
  if (!qr) throw new ApiError(404, "QR_NOT_FOUND", "유효하지 않은 QR입니다.");
  if (tourCode && qr.tourCode !== tourCode)
    throw new ApiError(
      409,
      "QR_TOUR_MISMATCH",
      "다른 투어에서 발급된 QR입니다.",
    );
  if (
    qr.status !== "ACTIVE" ||
    !qr.spotActive ||
    (qr.expiresAt && String(qr.expiresAt) < new Date().toISOString())
  )
    throw new ApiError(410, "QR_INACTIVE", "만료되었거나 비활성화된 QR입니다.");
  return qr;
}
export async function requestPhoneAuth(phoneInput: string) {
  const phone = normalizePhone(phoneInput);
  const phoneHash = lookupHash(phone);
  const recent = await first(
    `SELECT created_at createdAt FROM phone_auth_challenges WHERE phone_lookup_hash=? ORDER BY created_at DESC LIMIT 1`,
    [phoneHash],
  );
  if (recent) {
    const retryAfter =
      60 -
      Math.floor(
        (Date.now() - new Date(String(recent.createdAt)).getTime()) / 1000,
      );
    if (retryAfter > 0)
      throw new ApiError(
        429,
        "AUTH_RESEND_TOO_SOON",
        `${retryAfter}초 후 인증번호를 다시 요청해 주세요.`,
        { retryAfterSeconds: retryAfter },
      );
  }
  const challengeId = id("pac");
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const provider = getSmsProvider();
  await provider.sendVerificationCode(phone, code);
  await run(
    `INSERT INTO phone_auth_challenges(id,phone_lookup_hash,code_hash,provider,expires_at) VALUES(?,?,?,?,?)`,
    [
      challengeId,
      phoneHash,
      hashCode(challengeId, code),
      provider.name,
      new Date(Date.now() + 300000).toISOString(),
    ],
  );
  return {
    challengeId,
    expiresInSeconds: 300,
    resendAfterSeconds: 60,
    provider: provider.name,
    ...exposeDevelopmentCode(code),
  };
}
export async function confirmPhoneAuth(
  challengeId: string,
  phoneInput: string,
  code: string,
) {
  const phone = normalizePhone(phoneInput);
  const challenge = await first(
    `SELECT * FROM phone_auth_challenges WHERE id=? AND phone_lookup_hash=?`,
    [challengeId, lookupHash(phone)],
  );
  if (!challenge)
    throw new ApiError(
      404,
      "AUTH_CHALLENGE_NOT_FOUND",
      "인증 요청을 찾을 수 없습니다.",
    );
  if (
    challenge.status !== "PENDING" ||
    String(challenge.expires_at) < new Date().toISOString()
  )
    throw new ApiError(
      410,
      "AUTH_CHALLENGE_EXPIRED",
      "인증 요청이 만료되었습니다.",
    );
  if (Number(challenge.attempts) >= 5)
    throw new ApiError(
      429,
      "AUTH_ATTEMPTS_EXCEEDED",
      "인증 시도 횟수를 초과했습니다.",
    );
  if (!safeEqual(String(challenge.code_hash), hashCode(challengeId, code))) {
    await run(
      `UPDATE phone_auth_challenges SET attempts=attempts+1 WHERE id=?`,
      [challengeId],
    );
    throw new ApiError(
      400,
      "INVALID_AUTH_CODE",
      "인증번호가 일치하지 않습니다.",
    );
  }
  await run(
    `UPDATE phone_auth_challenges SET status='VERIFIED',verified_at=CURRENT_TIMESTAMP WHERE id=?`,
    [challengeId],
  );
  const proof = createOpaqueToken();
  await run(`UPDATE phone_auth_challenges SET code_hash=? WHERE id=?`, [
    tokenHash(proof),
    challengeId,
  ]);
  return { phoneVerificationId: challengeId, phoneVerificationProof: proof };
}
export async function registerParticipant(
  tourCode: string,
  input: {
    name: string;
    phone: string;
    phoneVerificationId: string;
    phoneVerificationProof: string;
    consents: Array<{ type: string; policyVersion: string; agreed: boolean }>;
  },
) {
  const tour = await tourByCode(tourCode);
  if (tour.status !== "ACTIVE")
    throw new ApiError(
      409,
      "TOUR_NOT_ACTIVE",
      "현재 참여할 수 없는 투어입니다.",
    );
  if (!input.name?.trim())
    throw new ApiError(400, "VALIDATION_ERROR", "name 값이 필요합니다.");
  if (!Array.isArray(input.consents))
    throw new ApiError(400, "VALIDATION_ERROR", "consents 값이 필요합니다.");
  const phone = normalizePhone(input.phone);
  const challenge = await first(
    `SELECT * FROM phone_auth_challenges WHERE id=? AND phone_lookup_hash=? AND status='VERIFIED'`,
    [input.phoneVerificationId, lookupHash(phone)],
  );
  if (
    !challenge ||
    !safeEqual(
      String(challenge.code_hash),
      tokenHash(input.phoneVerificationProof),
    )
  )
    throw new ApiError(
      401,
      "PHONE_VERIFICATION_REQUIRED",
      "휴대전화 인증을 완료해 주세요.",
    );
  for (const required of ["TERMS", "PRIVACY", "LOCATION", "AGE_OVER_14"])
    if (!input.consents.some((c) => c.type === required && c.agreed))
      throw new ApiError(
        400,
        "REQUIRED_CONSENT_MISSING",
        `${required} 동의가 필요합니다.`,
      );
  const existing = await first(
    `SELECT id FROM tour_participants WHERE tour_id=? AND phone_lookup_hash=?`,
    [tour.id, lookupHash(phone)],
  );
  if (existing)
    return {
      participantId: existing.id,
      participantToken: createParticipantToken(String(existing.id)),
      alreadyJoined: true,
    };
  const participantId = id("ptp"),
    now = new Date().toISOString();
  await run(
    `INSERT INTO tour_participants(id,tour_id,participant_code,name,phone_lookup_hash,phone_encrypted,phone_last4,phone_verified_at,privacy_expires_at,location_expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [
      participantId,
      tour.id,
      `STP-${now.slice(0, 10).replaceAll("-", "")}-${participantId.slice(-6).toUpperCase()}`,
      input.name.trim(),
      lookupHash(phone),
      encrypt(phone),
      phone.slice(-4),
      now,
      addDays(Number(tour.privacy_retention_days)),
      addDays(Number(tour.location_retention_days)),
    ],
  );
  for (const consent of input.consents)
    await run(
      `INSERT INTO participation_consents(id,participant_id,consent_type,policy_version,agreed,expires_at) VALUES(?,?,?,?,?,?)`,
      [
        id("con"),
        participantId,
        consent.type,
        consent.policyVersion,
        consent.agreed ? 1 : 0,
        addDays(Number(tour.privacy_retention_days)),
      ],
    );
  return {
    participantId,
    participantToken: createParticipantToken(participantId),
    alreadyJoined: false,
  };
}
export async function verifyVisit(
  tourCode: string,
  participantId: string,
  input: {
    qrToken: string;
    requestId: string;
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
  },
) {
  if (!input.requestId?.trim())
    throw new ApiError(
      400,
      "REQUEST_ID_REQUIRED",
      "인증 요청 식별자가 필요합니다.",
    );
  const participant = await participantInTour(participantId, tourCode);
  const replay = await first(
    `SELECT v.id,v.result,v.failure_reason failureReason,s.spot_code spotCode,s.name spotName FROM visit_verifications v LEFT JOIN tour_spots s ON s.id=v.spot_id WHERE v.participant_id=? AND v.request_id=?`,
    [participantId, input.requestId],
  );
  if (replay) {
    if (replay.result === "SUCCESS") {
      const current = await recalculateParticipant(participantId);
      return {
        verificationId: replay.id,
        idempotentReplay: true,
        spotCode: replay.spotCode,
        spotName: replay.spotName,
        ...current,
      };
    }
    throw new ApiError(
      409,
      "REQUEST_ALREADY_FAILED",
      "이미 실패 처리된 인증 요청입니다.",
    );
  }
  if (participant.status !== "ACTIVE")
    throw new ApiError(
      403,
      "PARTICIPANT_RESTRICTED",
      "참여가 제한된 상태입니다.",
    );
  let qr;
  try {
    qr = await validateQr(tourCode, input.qrToken);
  } catch (error) {
    await run(
      `INSERT INTO visit_verifications(id,request_id,participant_id,result,failure_reason,location_result) VALUES(?,?,?,'FAILED',?,'UNAVAILABLE')`,
      [
        id("ver"),
        input.requestId,
        participantId,
        error instanceof ApiError ? error.code : "INVALID_QR",
      ],
    );
    throw error;
  }
  const now = new Date(),
    iso = now.toISOString();
  const fail = async (code: string, message: string, status = 409) => {
    await run(
      `INSERT INTO visit_verifications(id,request_id,participant_id,spot_id,qr_id,result,failure_reason,location_result) VALUES(?,?,?,?,?,'FAILED',?,'UNAVAILABLE')`,
      [id("ver"), input.requestId, participantId, qr.spotId, qr.qrId, code],
    );
    throw new ApiError(status, code, message);
  };
  if (qr.tourStatus === "PAUSED")
    return fail("TOUR_PAUSED", "현재 투어 운영이 일시중지되었습니다.");
  if (qr.tourStatus !== "ACTIVE")
    return fail("TOUR_NOT_ACTIVE", "현재 인증할 수 없는 투어입니다.");
  if (iso < String(qr.tourStartsAt))
    return fail("TOUR_NOT_STARTED", "아직 투어 운영이 시작되지 않았습니다.");
  if (iso > String(qr.tourEndsAt))
    return fail("TOUR_ENDED", "투어 운영이 종료되었습니다.");
  if (qr.verificationStartsAt && iso < String(qr.verificationStartsAt))
    return fail(
      "SPOT_NOT_STARTED",
      "아직 관광지 인증 기간이 시작되지 않았습니다.",
    );
  if (qr.verificationEndsAt && iso > String(qr.verificationEndsAt))
    return fail("SPOT_ENDED", "관광지 인증 기간이 종료되었습니다.");
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  if (localTime < String(qr.opensAt) || localTime > String(qr.closesAt))
    return fail(
      "OUTSIDE_OPERATING_HOURS",
      "현재는 관광지 인증 가능 시간이 아닙니다.",
    );
  const previous = await first(
    `SELECT id FROM visit_verifications WHERE participant_id=? AND spot_id=? AND result='SUCCESS'`,
    [participantId, qr.spotId],
  );
  if (previous) return fail("ALREADY_VERIFIED", "이미 인증한 관광지입니다.");
  const spot = await first(`SELECT * FROM tour_spots WHERE id=?`, [qr.spotId]);
  if (!spot)
    throw new ApiError(404, "SPOT_NOT_FOUND", "관광지를 찾을 수 없습니다.");
  const hasLocation =
    Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  const accuracy = Number.isFinite(input.accuracyMeters)
    ? Number(input.accuracyMeters)
    : null;
  if (Boolean(spot.requires_location) && accuracy !== null && accuracy > 100)
    return fail(
      "LOW_GPS_ACCURACY",
      "GPS 정확도가 낮습니다. 하늘이 잘 보이는 곳에서 다시 시도해 주세요.",
      422,
    );
  const distance = hasLocation
    ? distanceMeters(
        Number(input.latitude),
        Number(input.longitude),
        Number(spot.latitude),
        Number(spot.longitude),
      )
    : null;
  const requires = Boolean(spot.requires_location);
  const inRange =
    distance !== null && distance <= Number(spot.allowed_radius_meters);
  const success = !requires || inRange;
  const locationResult = !requires
    ? "NOT_REQUIRED"
    : !hasLocation
      ? "UNAVAILABLE"
      : inRange
        ? "IN_RANGE"
        : "OUT_OF_RANGE";
  const failure = success
    ? null
    : !hasLocation
      ? "LOCATION_UNAVAILABLE"
      : "OUT_OF_RANGE";
  const prior = await first(
    `SELECT v.verified_at verifiedAt,s.latitude,s.longitude FROM visit_verifications v JOIN tour_spots s ON s.id=v.spot_id WHERE v.participant_id=? AND v.result='SUCCESS' ORDER BY v.verified_at DESC LIMIT 1`,
    [participantId],
  );
  const rapid = Boolean(
    prior &&
      Date.now() - new Date(String(prior!.verifiedAt)).getTime() <
        15 * 60 * 1000 &&
      distanceMeters(
        Number(prior!.latitude),
        Number(prior!.longitude),
        Number(spot.latitude),
        Number(spot.longitude),
      ) > 10000,
  );
  const verificationId = id("ver");
  await run(
    `INSERT INTO visit_verifications(id,request_id,participant_id,spot_id,qr_id,result,failure_reason,location_checked,location_result,distance_meters,latitude_encrypted,longitude_encrypted,accuracy_meters,is_suspicious,suspicious_reason,location_expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      verificationId,
      input.requestId,
      participantId,
      spot.id,
      qr.qrId,
      success ? "SUCCESS" : "FAILED",
      failure,
      hasLocation ? 1 : 0,
      locationResult,
      distance,
      hasLocation ? encrypt(String(input.latitude)) : null,
      hasLocation ? encrypt(String(input.longitude)) : null,
      accuracy,
      rapid ? 1 : 0,
      rapid ? "RAPID_LONG_DISTANCE_TRAVEL" : null,
      participant.locationExpiresAt,
    ],
  );
  if (!success)
    throw new ApiError(
      422,
      failure!,
      failure === "OUT_OF_RANGE"
        ? "관광지 인증 허용 반경 밖입니다."
        : "위치 권한과 현재 위치 확인이 필요합니다.",
      {
        distanceMeters: distance,
        allowedRadiusMeters: spot.allowed_radius_meters,
      },
    );
  const before = Number(participant.achieved_reward_threshold),
    current = await recalculateParticipant(participantId);
  const total = await first(
    `SELECT COUNT(*) totalSpotCount FROM tour_spots WHERE tour_id=? AND is_active=1`,
    [participant.tour_id],
  );
  const newly = await first(
    `SELECT id,name,required_spot_count requiredSpotCount FROM tier_rewards WHERE tour_id=? AND required_spot_count>? AND required_spot_count<=? ORDER BY required_spot_count DESC LIMIT 1`,
    [participant.tour_id, before, current?.achievedRewardThreshold ?? 0],
  );
  const next = await first(
    `SELECT id,name,required_spot_count requiredSpotCount FROM tier_rewards WHERE tour_id=? AND required_spot_count>? ORDER BY required_spot_count LIMIT 1`,
    [participant.tour_id, current?.verifiedSpotCount ?? 0],
  );
  return {
    verificationId,
    idempotentReplay: false,
    spotCode: spot.spot_code,
    spotName: spot.name,
    distanceMeters: distance,
    totalSpotCount: total?.totalSpotCount ?? 0,
    newlyAchievedReward: newly,
    nextReward: next,
    ...current,
  };
}
export async function progress(tourCode: string, participantId: string) {
  await participantInTour(participantId, tourCode);
  const p = await first(
    `SELECT participant_code participantCode,verified_spot_count verifiedSpotCount,achieved_reward_threshold achievedRewardThreshold,completed_at completedAt FROM tour_participants WHERE id=?`,
    [participantId],
  );
  const spots = await rows(
    `SELECT s.spot_code spotCode,s.name,CASE WHEN v.id IS NULL THEN 0 ELSE 1 END verified,v.verified_at verifiedAt FROM tour_spots s JOIN tour_participants p ON p.tour_id=s.tour_id LEFT JOIN visit_verifications v ON v.spot_id=s.id AND v.participant_id=p.id AND v.result='SUCCESS' WHERE p.id=? ORDER BY s.sort_order`,
    [participantId],
  );
  return { ...p, spots };
}
export async function verificationHistory(
  tourCode: string,
  participantId: string,
) {
  await participantInTour(participantId, tourCode);
  return rows(
    `SELECT v.id,v.result,v.failure_reason failureReason,v.verified_at verifiedAt,v.location_result locationResult,v.distance_meters distanceMeters,s.spot_code spotCode,s.name spotName FROM visit_verifications v LEFT JOIN tour_spots s ON s.id=v.spot_id WHERE v.participant_id=? ORDER BY v.verified_at DESC`,
    [participantId],
  );
}
export async function availableRewards(
  tourCode: string,
  participantId: string,
) {
  await participantInTour(participantId, tourCode);
  const now = new Date().toISOString();
  const application = await first(
    `SELECT a.id,a.status,a.applied_at appliedAt,r.name rewardName,r.required_spot_count requiredSpotCount FROM reward_applications a JOIN tier_rewards r ON r.id=a.reward_id WHERE a.participant_id=?`,
    [participantId],
  );
  const rewards = await rows(
    `SELECT r.id,r.name,r.description,r.image_url imageUrl,r.application_starts_at applicationStartsAt,r.application_ends_at applicationEndsAt,r.fulfillment_methods fulfillmentMethods,r.required_spot_count requiredSpotCount,r.stock_total stockTotal,r.stock_remaining stockRemaining,r.status,p.verified_spot_count verifiedSpotCount,CASE WHEN r.required_spot_count<=p.verified_spot_count AND r.stock_remaining>0 AND r.status='ACTIVE' AND (r.application_starts_at IS NULL OR r.application_starts_at<=?) AND (r.application_ends_at IS NULL OR r.application_ends_at>=?) AND NOT EXISTS(SELECT 1 FROM reward_applications a WHERE a.participant_id=p.id) THEN 1 ELSE 0 END canApply FROM tier_rewards r JOIN tour_participants p ON p.tour_id=r.tour_id WHERE p.id=? ORDER BY r.required_spot_count`,
    [now, now, participantId],
  );
  return { rewards, application };
}
type RewardInput = {
  rewardId: string;
  requestKey: string;
  fulfillmentMethod: "DELIVERY" | "PICKUP" | "MOBILE_COUPON";
  recipientName: string;
  phone: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  deliveryRequest?: string;
  rewardPrivacyAgreed: boolean;
  deliveryOutsourcingAgreed: boolean;
  policyAgreed: boolean;
};
export async function applyReward(
  tourCode: string,
  participantId: string,
  input: RewardInput,
) {
  if (!input.rewardId?.trim() || !input.requestKey?.trim())
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "경품과 신청 요청 식별자가 필요합니다.",
    );
  if (
    !input.rewardPrivacyAgreed ||
    !input.policyAgreed ||
    (input.fulfillmentMethod === "DELIVERY" && !input.deliveryOutsourcingAgreed)
  )
    throw new ApiError(
      400,
      "REWARD_CONSENT_REQUIRED",
      "경품 신청 필수 동의가 필요합니다.",
    );
  validateRecipient(input);
  const participant = await participantInTour(participantId, tourCode);
  const existing = await first(
    `SELECT id,status FROM reward_applications WHERE participant_id=?`,
    [participantId],
  );
  if (existing)
    return {
      applicationId: existing.id,
      status: existing.status,
      alreadyApplied: true,
    };
  const reward = await first(
    `SELECT * FROM tier_rewards WHERE id=? AND tour_id=?`,
    [input.rewardId, participant.tour_id],
  );
  if (!reward)
    throw new ApiError(404, "REWARD_NOT_FOUND", "경품을 찾을 수 없습니다.");
  if (
    Number(reward.required_spot_count) > Number(participant.verified_spot_count)
  )
    throw new ApiError(
      409,
      "REWARD_NOT_ACHIEVED",
      "아직 달성하지 않은 단계의 경품입니다.",
    );
  const methods = String(reward.fulfillment_methods ?? "").split(",");
  if (!methods.includes(input.fulfillmentMethod))
    throw new ApiError(
      409,
      "FULFILLMENT_NOT_AVAILABLE",
      "선택한 수령 방법을 이용할 수 없습니다.",
    );
  const applicationId = id("rwa"),
    now = new Date().toISOString(),
    delivery = input.fulfillmentMethod === "DELIVERY";
  try {
    await run(
      `INSERT INTO reward_applications(id,participant_id,reward_id,achieved_spot_count_at_application,request_key,fulfillment_method,recipient_name_encrypted,phone_encrypted,postal_code_encrypted,address_encrypted,address_detail_encrypted,delivery_request_encrypted,pickup_location,pickup_period,pickup_hours,reward_privacy_agreed_at,delivery_outsourcing_agreed_at,policy_agreed_at,privacy_expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        applicationId,
        participantId,
        reward.id,
        participant.verified_spot_count,
        input.requestKey,
        input.fulfillmentMethod,
        encrypt(input.recipientName),
        encrypt(normalizePhone(input.phone)),
        delivery ? encrypt(input.postalCode!) : null,
        delivery ? encrypt(input.address!) : null,
        delivery ? encrypt(input.addressDetail!) : null,
        delivery && input.deliveryRequest
          ? encrypt(input.deliveryRequest)
          : null,
        delivery ? null : "철원 관광정보센터",
        delivery ? null : "2026년 12월 31일까지",
        delivery ? null : "09:00–18:00",
        now,
        delivery ? now : null,
        now,
        participant.privacyExpiresAt,
      ],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("REWARD_OUT_OF_STOCK"))
      throw new ApiError(
        409,
        "REWARD_OUT_OF_STOCK",
        "신청 직전 재고 또는 자격 확인에 실패했습니다.",
      );
    if (message.includes("UNIQUE")) {
      const duplicate = await first(
        `SELECT id,status FROM reward_applications WHERE participant_id=?`,
        [participantId],
      );
      if (duplicate)
        return {
          applicationId: duplicate.id,
          status: duplicate.status,
          alreadyApplied: true,
        };
    }
    throw error;
  }
  await run(
    `INSERT INTO reward_process_history(id,application_id,to_status,actor_type,actor_id) VALUES(?,?,'RECEIVED','PARTICIPANT',?)`,
    [id("rwh"), applicationId, participantId],
  );
  return { applicationId, status: "RECEIVED", alreadyApplied: false };
}
export async function rewardApplication(
  tourCode: string,
  participantId: string,
) {
  await participantInTour(participantId, tourCode);
  const value = await first(
    `SELECT a.id,a.status,a.fulfillment_method fulfillmentMethod,a.applied_at appliedAt,a.updated_at updatedAt,a.recipient_name_encrypted recipientName,a.phone_encrypted phone,a.postal_code_encrypted postalCode,a.address_encrypted address,a.address_detail_encrypted addressDetail,a.delivery_request_encrypted deliveryRequest,a.pickup_location pickupLocation,a.pickup_period pickupPeriod,a.pickup_hours pickupHours,a.carrier,a.tracking_number trackingNumber,a.rejection_reason rejectionReason,a.admin_message adminMessage,r.name rewardName,r.required_spot_count requiredSpotCount FROM reward_applications a JOIN tier_rewards r ON r.id=a.reward_id WHERE a.participant_id=?`,
    [participantId],
  );
  if (!value) return null;
  for (const key of [
    "recipientName",
    "phone",
    "postalCode",
    "address",
    "addressDetail",
    "deliveryRequest",
  ] as const)
    if (value[key]) value[key] = decrypt(String(value[key]));
  return value;
}
function validateRecipient(input: RewardInput) {
  for (const key of ["recipientName", "phone"] as const)
    if (!input[key]?.trim())
      throw new ApiError(400, "VALIDATION_ERROR", `${key} 값이 필요합니다.`);
  normalizePhone(input.phone);
  if (input.fulfillmentMethod === "DELIVERY")
    for (const key of ["postalCode", "address", "addressDetail"] as const)
      if (!input[key]?.trim())
        throw new ApiError(400, "VALIDATION_ERROR", `${key} 값이 필요합니다.`);
}
export async function updateShipping(
  tourCode: string,
  participantId: string,
  input: {
    recipientName: string;
    phone: string;
    postalCode: string;
    address: string;
    addressDetail: string;
    deliveryRequest?: string;
  },
) {
  validateRecipient({
    ...input,
    rewardId: "existing",
    requestKey: "existing",
    fulfillmentMethod: "DELIVERY",
    rewardPrivacyAgreed: true,
    deliveryOutsourcingAgreed: true,
    policyAgreed: true,
  });
  await participantInTour(participantId, tourCode);
  const application = await first(
    `SELECT id,status,fulfillment_method fulfillmentMethod FROM reward_applications WHERE participant_id=?`,
    [participantId],
  );
  if (!application)
    throw new ApiError(
      404,
      "APPLICATION_NOT_FOUND",
      "경품 신청을 찾을 수 없습니다.",
    );
  if (
    application.fulfillmentMethod !== "DELIVERY" ||
    !["RECEIVED", "REVIEWING", "APPROVED"].includes(String(application.status))
  )
    throw new ApiError(
      409,
      "SHIPPING_ADDRESS_LOCKED",
      "현재 처리 단계에서는 배송지를 수정할 수 없습니다.",
    );
  await run(
    `UPDATE reward_applications SET recipient_name_encrypted=?,phone_encrypted=?,postal_code_encrypted=?,address_encrypted=?,address_detail_encrypted=?,delivery_request_encrypted=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [
      encrypt(input.recipientName),
      encrypt(normalizePhone(input.phone)),
      encrypt(input.postalCode),
      encrypt(input.address),
      encrypt(input.addressDetail),
      input.deliveryRequest ? encrypt(input.deliveryRequest) : null,
      application.id,
    ],
  );
  return { applicationId: application.id, updated: true };
}
export async function cancelVerification(
  verificationId: string,
  reason: string,
  actorId: string,
) {
  const verification = await first(
    `SELECT id,participant_id participantId,result FROM visit_verifications WHERE id=?`,
    [verificationId],
  );
  if (!verification)
    throw new ApiError(
      404,
      "VERIFICATION_NOT_FOUND",
      "인증 이력을 찾을 수 없습니다.",
    );
  if (verification.result !== "SUCCESS")
    throw new ApiError(
      409,
      "VERIFICATION_NOT_CANCELLABLE",
      "성공 인증만 취소할 수 있습니다.",
    );
  await run(
    `UPDATE visit_verifications SET result='CANCELLED',cancelled_at=CURRENT_TIMESTAMP,cancelled_by=?,cancellation_reason=? WHERE id=?`,
    [actorId, reason, verificationId],
  );
  const progress = await recalculateParticipant(
    String(verification.participantId),
  );
  return { verificationId, ...progress };
}
export async function manualVerification(
  participantId: string,
  spotId: string,
  reason: string,
  actorId: string,
) {
  const participant = await first(
    `SELECT id,tour_id tourId,location_expires_at locationExpiresAt FROM tour_participants WHERE id=?`,
    [participantId],
  );
  if (!participant)
    throw new ApiError(
      404,
      "PARTICIPANT_NOT_FOUND",
      "참여자를 찾을 수 없습니다.",
    );
  const spot = await first(
    `SELECT id,name FROM tour_spots WHERE id=? AND tour_id=?`,
    [spotId, participant.tourId],
  );
  if (!spot)
    throw new ApiError(
      404,
      "SPOT_NOT_FOUND",
      "같은 투어의 관광지를 찾을 수 없습니다.",
    );
  const existing = await first(
    `SELECT id FROM visit_verifications WHERE participant_id=? AND spot_id=? AND result='SUCCESS'`,
    [participantId, spotId],
  );
  if (existing)
    throw new ApiError(409, "ALREADY_VERIFIED", "이미 인증한 관광지입니다.");
  const verificationId = id("ver");
  await run(
    `INSERT INTO visit_verifications(id,participant_id,spot_id,result,failure_reason,location_checked,location_result,location_expires_at,cancelled_by,cancellation_reason) VALUES(?,?,?,'SUCCESS','ADMIN_MANUAL',0,'NOT_REQUIRED',?,?,?)`,
    [
      verificationId,
      participantId,
      spotId,
      participant.locationExpiresAt,
      actorId,
      reason,
    ],
  );
  await recalculateParticipant(participantId);
  return { verificationId, spotName: spot.name, manual: true };
}
