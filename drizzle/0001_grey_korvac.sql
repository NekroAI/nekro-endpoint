CREATE TABLE `access_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`permission_group_id` text NOT NULL,
	`key_value` text NOT NULL,
	`description` text,
	`expires_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`last_used_at` integer,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`permission_group_id`) REFERENCES `permission_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_keys_key_value_unique` ON `access_keys` (`key_value`);--> statement-breakpoint
CREATE INDEX `access_key_group_idx` ON `access_keys` (`permission_group_id`);--> statement-breakpoint
CREATE TABLE `endpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`parent_id` text,
	`path` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`config` text NOT NULL,
	`access_control` text DEFAULT 'public' NOT NULL,
	`required_permission_groups` text,
	`enabled` integer DEFAULT true NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `endpoint_owner_idx` ON `endpoints` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `endpoint_parent_idx` ON `endpoints` (`parent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `endpoint_owner_path_idx` ON `endpoints` (`owner_user_id`,`path`);--> statement-breakpoint
CREATE TABLE `permission_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `perm_group_owner_idx` ON `permission_groups` (`owner_user_id`);--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_sessions_session_token_unique` ON `user_sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `user_sessions_session_token_idx` ON `user_sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `user_sessions_user_id_idx` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`github_id` text NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`avatar_url` text,
	`api_key` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`is_activated` integer DEFAULT false NOT NULL,
	`platform_api_key` text,
	`platform_api_key_created_at` integer,
	`last_login_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_id_unique` ON `users` (`github_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_api_key_unique` ON `users` (`api_key`);--> statement-breakpoint
CREATE INDEX `users_github_id_idx` ON `users` (`github_id`);--> statement-breakpoint
CREATE INDEX `users_api_key_idx` ON `users` (`api_key`);--> statement-breakpoint
CREATE INDEX `users_platform_api_key_idx` ON `users` (`platform_api_key`);