ALTER TABLE `stamp_tours` ADD `detail` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `stamp_tours` ADD `hero_image_url` text;
--> statement-breakpoint
ALTER TABLE `stamp_tours` ADD `region` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `stamp_tours` ADD `participation_opens_at` text DEFAULT '09:00' NOT NULL;
--> statement-breakpoint
ALTER TABLE `stamp_tours` ADD `participation_closes_at` text DEFAULT '18:00' NOT NULL;
--> statement-breakpoint
ALTER TABLE `stamp_tours` ADD `use_location` integer DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `stamp_tours` ADD `default_radius_meters` integer DEFAULT 100 NOT NULL;
--> statement-breakpoint
ALTER TABLE `stamp_tours` ADD `participation_condition` text DEFAULT 'ONE_PER_PHONE' NOT NULL;
--> statement-breakpoint
ALTER TABLE `stamp_tours` ADD `privacy_policy` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `tier_rewards` ADD `is_first_come` integer DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `tier_rewards` ADD `is_public` integer DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `tier_rewards` ADD `alternative_reward_name` text;
--> statement-breakpoint
ALTER TABLE `tour_spots` ADD `detail` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `tour_spots` ADD `image_url` text;
--> statement-breakpoint
ALTER TABLE `tour_spots` ADD `closed_days` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `tour_spots` ADD `contact` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `tour_spots` ADD `qr_location_guide` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `tour_spots` ADD `caution` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `tour_spots` ADD `is_required` integer DEFAULT false NOT NULL;