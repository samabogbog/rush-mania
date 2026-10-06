CREATE TABLE `auth_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`attempts` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `game_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`player_id` text NOT NULL,
	`legacy_site_id` text,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_accounts_username_unique` ON `game_accounts` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_accounts_player_id_unique` ON `game_accounts` (`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_accounts_legacy_site_id_unique` ON `game_accounts` (`legacy_site_id`);--> statement-breakpoint
CREATE TABLE `game_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `game_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
