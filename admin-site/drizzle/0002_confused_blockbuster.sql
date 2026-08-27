PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_reward_applications` (
  `id` text PRIMARY KEY NOT NULL, `participant_id` text NOT NULL, `reward_id` text NOT NULL,
  `achieved_spot_count_at_application` integer NOT NULL, `request_key` text,
  `fulfillment_method` text DEFAULT 'DELIVERY' NOT NULL, `status` text DEFAULT 'RECEIVED' NOT NULL,
  `recipient_name_encrypted` text NOT NULL, `phone_encrypted` text NOT NULL,
  `postal_code_encrypted` text, `address_encrypted` text, `address_detail_encrypted` text,
  `delivery_request_encrypted` text, `pickup_location` text, `pickup_period` text, `pickup_hours` text,
  `carrier` text, `tracking_number` text, `rejection_reason` text, `admin_message` text,
  `reward_privacy_agreed_at` text NOT NULL, `delivery_outsourcing_agreed_at` text,
  `policy_agreed_at` text NOT NULL, `privacy_expires_at` text NOT NULL,
  `applied_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`participant_id`) REFERENCES `tour_participants`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`reward_id`) REFERENCES `tier_rewards`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_reward_applications` (`id`,`participant_id`,`reward_id`,`achieved_spot_count_at_application`,`fulfillment_method`,`status`,`recipient_name_encrypted`,`phone_encrypted`,`postal_code_encrypted`,`address_encrypted`,`address_detail_encrypted`,`reward_privacy_agreed_at`,`delivery_outsourcing_agreed_at`,`policy_agreed_at`,`privacy_expires_at`,`applied_at`,`updated_at`)
SELECT `id`,`participant_id`,`reward_id`,`achieved_spot_count_at_application`,'DELIVERY',`status`,`recipient_name_encrypted`,`phone_encrypted`,`postal_code_encrypted`,`address_encrypted`,`address_detail_encrypted`,`applied_at`,`applied_at`,`applied_at`,`privacy_expires_at`,`applied_at`,`updated_at` FROM `reward_applications`;
--> statement-breakpoint
DROP TABLE `reward_applications`;
--> statement-breakpoint
ALTER TABLE `__new_reward_applications` RENAME TO `reward_applications`;
--> statement-breakpoint
CREATE UNIQUE INDEX `reward_applications_participant_uq` ON `reward_applications` (`participant_id`);
--> statement-breakpoint
CREATE INDEX `reward_applications_status_idx` ON `reward_applications` (`status`,`applied_at`);
--> statement-breakpoint
ALTER TABLE `tier_rewards` ADD `image_url` text;
--> statement-breakpoint
ALTER TABLE `tier_rewards` ADD `application_starts_at` text;
--> statement-breakpoint
ALTER TABLE `tier_rewards` ADD `application_ends_at` text;
--> statement-breakpoint
ALTER TABLE `tier_rewards` ADD `fulfillment_methods` text DEFAULT 'DELIVERY,PICKUP' NOT NULL;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
PRAGMA optimize;
--> statement-breakpoint
UPDATE `tier_rewards` SET `application_starts_at`='2026-01-01T00:00:00+09:00',`application_ends_at`='2027-12-31T23:59:59+09:00',`fulfillment_methods`='DELIVERY,PICKUP' WHERE `tour_id`='tour_cheorwon_dmz_2026';
