ALTER TABLE `tour_spots` ADD `opens_at` text DEFAULT '09:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `tour_spots` ADD `closes_at` text DEFAULT '18:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `tour_spots` ADD `verification_starts_at` text;--> statement-breakpoint
ALTER TABLE `tour_spots` ADD `verification_ends_at` text;--> statement-breakpoint
ALTER TABLE `visit_verifications` ADD `request_id` text;--> statement-breakpoint
ALTER TABLE `visit_verifications` ADD `accuracy_meters` real;--> statement-breakpoint
ALTER TABLE `visit_verifications` ADD `is_suspicious` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `visit_verifications` ADD `suspicious_reason` text;--> statement-breakpoint
CREATE UNIQUE INDEX `visit_request_uq` ON `visit_verifications` (`participant_id`,`request_id`) WHERE `request_id` IS NOT NULL;
