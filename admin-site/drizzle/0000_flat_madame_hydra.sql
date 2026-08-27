CREATE TABLE `tour_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`tour_id` text NOT NULL,
	`participant_code` text NOT NULL,
	`name` text NOT NULL,
	`phone_lookup_hash` text NOT NULL,
	`phone_encrypted` text NOT NULL,
	`phone_last4` text NOT NULL,
	`phone_verified_at` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`verified_spot_count` integer DEFAULT 0 NOT NULL,
	`achieved_reward_threshold` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`privacy_expires_at` text NOT NULL,
	`location_expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tour_id`) REFERENCES `stamp_tours`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participants_tour_phone_uq` ON `tour_participants` (`tour_id`,`phone_lookup_hash`);
--> statement-breakpoint
CREATE UNIQUE INDEX `participants_code_uq` ON `tour_participants` (`participant_code`);
--> statement-breakpoint
CREATE TABLE `participation_consents` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`consent_type` text NOT NULL,
	`policy_version` text NOT NULL,
	`agreed` integer NOT NULL,
	`agreed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text,
	`ip_hash` text,
	FOREIGN KEY (`participant_id`) REFERENCES `tour_participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `participation_consents_participant_idx` ON `participation_consents` (`participant_id`,`consent_type`);
--> statement-breakpoint
CREATE TABLE `phone_auth_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`phone_lookup_hash` text NOT NULL,
	`code_hash` text NOT NULL,
	`provider` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `phone_auth_lookup_time_idx` ON `phone_auth_challenges` (`phone_lookup_hash`,`created_at`);
--> statement-breakpoint
CREATE TABLE `reward_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`reward_id` text NOT NULL,
	`achieved_spot_count_at_application` integer NOT NULL,
	`status` text DEFAULT 'RECEIVED' NOT NULL,
	`recipient_name_encrypted` text NOT NULL,
	`phone_encrypted` text NOT NULL,
	`postal_code_encrypted` text NOT NULL,
	`address_encrypted` text NOT NULL,
	`address_detail_encrypted` text NOT NULL,
	`privacy_expires_at` text NOT NULL,
	`applied_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `tour_participants`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reward_id`) REFERENCES `tier_rewards`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reward_applications_participant_uq` ON `reward_applications` (`participant_id`);
--> statement-breakpoint
CREATE INDEX `reward_applications_status_idx` ON `reward_applications` (`status`,`applied_at`);
--> statement-breakpoint
CREATE TABLE `reward_process_history` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`reason` text,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `reward_applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reward_history_application_time_idx` ON `reward_process_history` (`application_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `spot_qrs` (
	`id` text PRIMARY KEY NOT NULL,
	`spot_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`token_prefix` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`issued_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`spot_id`) REFERENCES `tour_spots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spot_qrs_token_hash_uq` ON `spot_qrs` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `spot_qrs_spot_status_idx` ON `spot_qrs` (`spot_id`,`status`);
--> statement-breakpoint
CREATE TABLE `stamp_tours` (
	`id` text PRIMARY KEY NOT NULL,
	`tour_code` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`privacy_retention_days` integer DEFAULT 365 NOT NULL,
	`location_retention_days` integer DEFAULT 90 NOT NULL,
	`reward_limit_per_participant` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stamp_tours_tour_code_uq` ON `stamp_tours` (`tour_code`);
--> statement-breakpoint
CREATE INDEX `stamp_tours_public_status_idx` ON `stamp_tours` (`is_public`,`status`);
--> statement-breakpoint
CREATE TABLE `tier_rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`tour_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`required_spot_count` integer NOT NULL,
	`stock_total` integer NOT NULL,
	`stock_remaining` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tour_id`) REFERENCES `stamp_tours`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tier_rewards_tour_threshold_uq` ON `tier_rewards` (`tour_id`,`required_spot_count`);
--> statement-breakpoint
CREATE INDEX `tier_rewards_tour_status_idx` ON `tier_rewards` (`tour_id`,`status`);
--> statement-breakpoint
CREATE TABLE `tour_spots` (
	`id` text PRIMARY KEY NOT NULL,
	`tour_id` text NOT NULL,
	`spot_code` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`address` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`allowed_radius_meters` integer DEFAULT 100 NOT NULL,
	`requires_location` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tour_id`) REFERENCES `stamp_tours`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tour_spots_tour_code_uq` ON `tour_spots` (`tour_id`,`spot_code`);
--> statement-breakpoint
CREATE INDEX `tour_spots_tour_sort_idx` ON `tour_spots` (`tour_id`,`sort_order`);
--> statement-breakpoint
CREATE TABLE `visit_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`spot_id` text,
	`qr_id` text,
	`result` text NOT NULL,
	`failure_reason` text,
	`verified_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`location_checked` integer DEFAULT false NOT NULL,
	`location_result` text NOT NULL,
	`distance_meters` real,
	`latitude_encrypted` text,
	`longitude_encrypted` text,
	`location_expires_at` text,
	`cancelled_at` text,
	`cancelled_by` text,
	`cancellation_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `tour_participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spot_id`) REFERENCES `tour_spots`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`qr_id`) REFERENCES `spot_qrs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visit_success_once_uq` ON `visit_verifications` (`participant_id`,`spot_id`) WHERE "visit_verifications"."result" = 'SUCCESS';
--> statement-breakpoint
CREATE INDEX `visit_participant_time_idx` ON `visit_verifications` (`participant_id`,`verified_at`);
--> statement-breakpoint
CREATE INDEX `visit_spot_time_idx` ON `visit_verifications` (`spot_id`,`verified_at`);
--> statement-breakpoint
INSERT INTO `stamp_tours` (`id`,`tour_code`,`name`,`description`,`status`,`is_public`,`starts_at`,`ends_at`,`privacy_retention_days`,`location_retention_days`,`reward_limit_per_participant`)
VALUES ('tour_cheorwon_dmz_2026','CHEORWON-DMZ-2026','철원 DMZ 평화관광 스탬프투어','철원의 DMZ 평화관광 명소를 방문하고 단계별 경품을 신청하는 모바일 스탬프투어입니다.','ACTIVE',1,'2026-01-01T00:00:00+09:00','2027-12-31T23:59:59+09:00',365,90,1);
--> statement-breakpoint
INSERT INTO `tour_spots` (`id`,`tour_id`,`spot_code`,`name`,`description`,`address`,`latitude`,`longitude`,`allowed_radius_meters`,`requires_location`,`is_active`,`is_public`,`sort_order`) VALUES
('spot_cheorwon_01','tour_cheorwon_dmz_2026','CHW-SPOT-001','고석정','한탄강 협곡과 고석바위를 만나는 철원 대표 관광지','강원특별자치도 철원군 동송읍 태봉로 1825',38.186355,127.287711,120,1,1,1,1),
('spot_cheorwon_02','tour_cheorwon_dmz_2026','CHW-SPOT-002','철원역사문화공원','근대 철원의 역사와 문화를 체험하는 공간','강원특별자치도 철원군 철원읍 금강산로 262',38.257170,127.201424,100,1,1,1,2),
('spot_cheorwon_03','tour_cheorwon_dmz_2026','CHW-SPOT-003','소이산 모노레일','철원평야와 DMZ를 조망하는 평화관광 명소','강원특별자치도 철원군 철원읍 금강산로 262',38.260456,127.202760,150,1,1,1,3),
('spot_cheorwon_04','tour_cheorwon_dmz_2026','CHW-SPOT-004','직탕폭포','한탄강의 주상절리를 따라 펼쳐진 폭포','강원특별자치도 철원군 동송읍 직탕길 94',38.210414,127.285799,120,1,1,1,4),
('spot_cheorwon_05','tour_cheorwon_dmz_2026','CHW-SPOT-005','은하수교','한탄강 주상절리길을 잇는 보행교','강원특별자치도 철원군 동송읍 장흥리 725-12',38.201660,127.305039,100,1,1,1,5);
--> statement-breakpoint
INSERT INTO `spot_qrs` (`id`,`spot_id`,`token_hash`,`token_prefix`,`status`) VALUES
('qr_cheorwon_01','spot_cheorwon_01','ba9cdd26ed718bb6e591d81c3d5d4422a7c361be9f70dd661fc1b6484df7a094','dev-cheo','ACTIVE'),
('qr_cheorwon_02','spot_cheorwon_02','01878a963e894c787cceadeeebe856cb4472ad5bc803b6231571f777097ce5ec','dev-cheo','ACTIVE'),
('qr_cheorwon_03','spot_cheorwon_03','bf551b799624b20c8ba5c2e1b193f27efdd1822a15aa2a2a27d72ae39ef97b84','dev-cheo','ACTIVE'),
('qr_cheorwon_04','spot_cheorwon_04','548bf7162a63dc1603593fc9dfe1849ba3e84b72423c6e971b9661489efaa84f','dev-cheo','ACTIVE'),
('qr_cheorwon_05','spot_cheorwon_05','39f196ea7de13fafb44862b159afc59a7cd2b47c90d3e1cd775e34aa4f9079a1','dev-cheo','ACTIVE');
--> statement-breakpoint
INSERT INTO `tier_rewards` (`id`,`tour_id`,`name`,`description`,`required_spot_count`,`stock_total`,`stock_remaining`,`status`) VALUES
('reward_cheorwon_03','tour_cheorwon_dmz_2026','철원 관광 기념 스티커','관광지 3곳 달성 경품',3,500,500,'ACTIVE'),
('reward_cheorwon_04','tour_cheorwon_dmz_2026','철원 평화관광 에코백','관광지 4곳 달성 경품',4,300,300,'ACTIVE'),
('reward_cheorwon_05','tour_cheorwon_dmz_2026','철원 오대쌀 기념 세트','관광지 5곳 달성 경품',5,100,100,'ACTIVE');
