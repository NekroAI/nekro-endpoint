CREATE TABLE `agent_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`tool` text NOT NULL,
	`input` text NOT NULL,
	`ok` integer NOT NULL,
	`message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_action_user_idx` ON `agent_actions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ai_provider_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text,
	`provider` text NOT NULL,
	`base_url` text,
	`model` text NOT NULL,
	`encrypted_key` text NOT NULL,
	`iv` text NOT NULL,
	`key_hint` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_provider_owner_idx` ON `ai_provider_configs` (`owner_user_id`);