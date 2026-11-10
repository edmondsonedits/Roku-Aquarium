CREATE TABLE `fish` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`person` text NOT NULL,
	`creator` text NOT NULL,
	`name` text NOT NULL,
	`object_key` text NOT NULL,
	`bounds` text NOT NULL,
	`created_at` integer NOT NULL,
	`active` integer NOT NULL,
	`action_id` text NOT NULL,
	FOREIGN KEY (`room`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fish_action` ON `fish` (`room`,`person`,`action_id`);--> statement-breakpoint
CREATE TABLE `rates` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`recovery_hash` text NOT NULL,
	`accepting` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`person` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`room`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE no action
);
