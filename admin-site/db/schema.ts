import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const stampTours = sqliteTable("stamp_tours", {
  id: text("id").primaryKey(), tourCode: text("tour_code").notNull(), name: text("name").notNull(),
  description: text("description").notNull().default(""), detail: text("detail").notNull().default(""), heroImageUrl: text("hero_image_url"), region: text("region").notNull().default(""), participationOpensAt: text("participation_opens_at").notNull().default("09:00"), participationClosesAt: text("participation_closes_at").notNull().default("18:00"), useLocation: integer("use_location", { mode: "boolean" }).notNull().default(true), defaultRadiusMeters: integer("default_radius_meters").notNull().default(100), participationCondition: text("participation_condition").notNull().default("ONE_PER_PHONE"), privacyPolicy: text("privacy_policy").notNull().default(""), status: text("status", { enum: ["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "ENDED"] }).notNull().default("DRAFT"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false), startsAt: text("starts_at").notNull(), endsAt: text("ends_at").notNull(),
  privacyRetentionDays: integer("privacy_retention_days").notNull().default(365), locationRetentionDays: integer("location_retention_days").notNull().default(90),
  rewardLimitPerParticipant: integer("reward_limit_per_participant").notNull().default(1), ...timestamps,
}, (table) => [uniqueIndex("stamp_tours_tour_code_uq").on(table.tourCode), index("stamp_tours_public_status_idx").on(table.isPublic, table.status)]);

export const tourSpots = sqliteTable("tour_spots", {
  id: text("id").primaryKey(), tourId: text("tour_id").notNull().references(() => stampTours.id, { onDelete: "cascade" }), spotCode: text("spot_code").notNull(),
  name: text("name").notNull(), description: text("description").notNull().default(""), detail: text("detail").notNull().default(""), imageUrl: text("image_url"), address: text("address").notNull(), latitude: real("latitude").notNull(), longitude: real("longitude").notNull(), closedDays: text("closed_days").notNull().default(""), contact: text("contact").notNull().default(""), qrLocationGuide: text("qr_location_guide").notNull().default(""), caution: text("caution").notNull().default(""), isRequired: integer("is_required", { mode: "boolean" }).notNull().default(false),
  allowedRadiusMeters: integer("allowed_radius_meters").notNull().default(100), requiresLocation: integer("requires_location", { mode: "boolean" }).notNull().default(true), opensAt: text("opens_at").notNull().default("09:00"), closesAt: text("closes_at").notNull().default("18:00"), verificationStartsAt: text("verification_starts_at"), verificationEndsAt: text("verification_ends_at"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true), isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true), sortOrder: integer("sort_order").notNull().default(0), ...timestamps,
}, (table) => [uniqueIndex("tour_spots_tour_code_uq").on(table.tourId, table.spotCode), index("tour_spots_tour_sort_idx").on(table.tourId, table.sortOrder)]);

export const spotQrs = sqliteTable("spot_qrs", {
  id: text("id").primaryKey(), spotId: text("spot_id").notNull().references(() => tourSpots.id, { onDelete: "cascade" }), tokenHash: text("token_hash").notNull(), tokenPrefix: text("token_prefix").notNull(),
  status: text("status", { enum: ["ACTIVE", "REVOKED", "EXPIRED"] }).notNull().default("ACTIVE"), issuedAt: text("issued_at").notNull().default(sql`CURRENT_TIMESTAMP`), expiresAt: text("expires_at"), revokedAt: text("revoked_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("spot_qrs_token_hash_uq").on(table.tokenHash), index("spot_qrs_spot_status_idx").on(table.spotId, table.status)]);

export const participants = sqliteTable("tour_participants", {
  id: text("id").primaryKey(), tourId: text("tour_id").notNull().references(() => stampTours.id, { onDelete: "cascade" }), participantCode: text("participant_code").notNull(), name: text("name").notNull(),
  phoneLookupHash: text("phone_lookup_hash").notNull(), phoneEncrypted: text("phone_encrypted").notNull(), phoneLast4: text("phone_last4").notNull(), phoneVerifiedAt: text("phone_verified_at").notNull(),
  status: text("status", { enum: ["ACTIVE", "RESTRICTED", "WITHDRAWN"] }).notNull().default("ACTIVE"), verifiedSpotCount: integer("verified_spot_count").notNull().default(0), achievedRewardThreshold: integer("achieved_reward_threshold").notNull().default(0),
  completedAt: text("completed_at"), privacyExpiresAt: text("privacy_expires_at").notNull(), locationExpiresAt: text("location_expires_at").notNull(), ...timestamps,
}, (table) => [uniqueIndex("participants_tour_phone_uq").on(table.tourId, table.phoneLookupHash), uniqueIndex("participants_code_uq").on(table.participantCode)]);

export const participationConsents = sqliteTable("participation_consents", {
  id: text("id").primaryKey(), participantId: text("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }), consentType: text("consent_type", { enum: ["TERMS", "PRIVACY", "LOCATION", "AGE_OVER_14", "MARKETING"] }).notNull(),
  policyVersion: text("policy_version").notNull(), agreed: integer("agreed", { mode: "boolean" }).notNull(), agreedAt: text("agreed_at").notNull().default(sql`CURRENT_TIMESTAMP`), expiresAt: text("expires_at"), ipHash: text("ip_hash"),
}, (table) => [index("participation_consents_participant_idx").on(table.participantId, table.consentType)]);

export const visitVerifications = sqliteTable("visit_verifications", {
  id: text("id").primaryKey(), requestId: text("request_id"), participantId: text("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }), spotId: text("spot_id").references(() => tourSpots.id, { onDelete: "set null" }), qrId: text("qr_id").references(() => spotQrs.id, { onDelete: "set null" }),
  result: text("result", { enum: ["SUCCESS", "FAILED", "CANCELLED"] }).notNull(), failureReason: text("failure_reason"), verifiedAt: text("verified_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  locationChecked: integer("location_checked", { mode: "boolean" }).notNull().default(false), locationResult: text("location_result", { enum: ["IN_RANGE", "OUT_OF_RANGE", "UNAVAILABLE", "NOT_REQUIRED"] }).notNull(), distanceMeters: real("distance_meters"),
  latitudeEncrypted: text("latitude_encrypted"), longitudeEncrypted: text("longitude_encrypted"), accuracyMeters: real("accuracy_meters"), isSuspicious: integer("is_suspicious", { mode: "boolean" }).notNull().default(false), suspiciousReason: text("suspicious_reason"), locationExpiresAt: text("location_expires_at"), cancelledAt: text("cancelled_at"), cancelledBy: text("cancelled_by"), cancellationReason: text("cancellation_reason"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("visit_request_uq").on(table.participantId, table.requestId).where(sql`${table.requestId} IS NOT NULL`), uniqueIndex("visit_success_once_uq").on(table.participantId, table.spotId).where(sql`${table.result} = 'SUCCESS'`), index("visit_participant_time_idx").on(table.participantId, table.verifiedAt), index("visit_spot_time_idx").on(table.spotId, table.verifiedAt)]);

export const tierRewards = sqliteTable("tier_rewards", {
  id: text("id").primaryKey(), tourId: text("tour_id").notNull().references(() => stampTours.id, { onDelete: "cascade" }), name: text("name").notNull(), description: text("description").notNull().default(""), requiredSpotCount: integer("required_spot_count").notNull(),
  imageUrl: text("image_url"), applicationStartsAt: text("application_starts_at"), applicationEndsAt: text("application_ends_at"), fulfillmentMethods: text("fulfillment_methods").notNull().default("DELIVERY,PICKUP"), isFirstCome: integer("is_first_come", { mode: "boolean" }).notNull().default(true), isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true), alternativeRewardName: text("alternative_reward_name"),
  stockTotal: integer("stock_total").notNull(), stockRemaining: integer("stock_remaining").notNull(), status: text("status", { enum: ["ACTIVE", "PAUSED", "SOLD_OUT"] }).notNull().default("ACTIVE"), ...timestamps,
}, (table) => [uniqueIndex("tier_rewards_tour_threshold_uq").on(table.tourId, table.requiredSpotCount), index("tier_rewards_tour_status_idx").on(table.tourId, table.status)]);

export const rewardApplications = sqliteTable("reward_applications", {
  id: text("id").primaryKey(), participantId: text("participant_id").notNull().references(() => participants.id, { onDelete: "restrict" }), rewardId: text("reward_id").notNull().references(() => tierRewards.id, { onDelete: "restrict" }), achievedSpotCountAtApplication: integer("achieved_spot_count_at_application").notNull(),
  requestKey: text("request_key"), fulfillmentMethod: text("fulfillment_method", { enum: ["DELIVERY", "PICKUP", "MOBILE_COUPON"] }).notNull().default("DELIVERY"), status: text("status", { enum: ["RECEIVED", "REVIEWING", "APPROVED", "PREPARING", "SHIPPING", "COMPLETED", "CANCELLED", "REJECTED"] }).notNull().default("RECEIVED"), recipientNameEncrypted: text("recipient_name_encrypted").notNull(), phoneEncrypted: text("phone_encrypted").notNull(),
  postalCodeEncrypted: text("postal_code_encrypted"), addressEncrypted: text("address_encrypted"), addressDetailEncrypted: text("address_detail_encrypted"), deliveryRequestEncrypted: text("delivery_request_encrypted"), pickupLocation: text("pickup_location"), pickupPeriod: text("pickup_period"), pickupHours: text("pickup_hours"), carrier: text("carrier"), trackingNumber: text("tracking_number"), rejectionReason: text("rejection_reason"), adminMessage: text("admin_message"), rewardPrivacyAgreedAt: text("reward_privacy_agreed_at").notNull(), deliveryOutsourcingAgreedAt: text("delivery_outsourcing_agreed_at"), policyAgreedAt: text("policy_agreed_at").notNull(), privacyExpiresAt: text("privacy_expires_at").notNull(), appliedAt: text("applied_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("reward_applications_participant_uq").on(table.participantId), index("reward_applications_status_idx").on(table.status, table.appliedAt)]);

export const rewardProcessHistory = sqliteTable("reward_process_history", {
  id: text("id").primaryKey(), applicationId: text("application_id").notNull().references(() => rewardApplications.id, { onDelete: "cascade" }), fromStatus: text("from_status"), toStatus: text("to_status").notNull(), reason: text("reason"),
  actorType: text("actor_type", { enum: ["PARTICIPANT", "ADMIN", "SYSTEM"] }).notNull(), actorId: text("actor_id"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("reward_history_application_time_idx").on(table.applicationId, table.createdAt)]);

export const phoneAuthChallenges = sqliteTable("phone_auth_challenges", {
  id: text("id").primaryKey(), phoneLookupHash: text("phone_lookup_hash").notNull(), codeHash: text("code_hash").notNull(), provider: text("provider").notNull(), status: text("status", { enum: ["PENDING", "VERIFIED", "EXPIRED", "BLOCKED"] }).notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0), expiresAt: text("expires_at").notNull(), verifiedAt: text("verified_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("phone_auth_lookup_time_idx").on(table.phoneLookupHash, table.createdAt)]);
