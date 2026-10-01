CREATE TABLE `activation_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_note` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activation_requests_user_id_unique` ON `activation_requests` (`user_id`);--> statement-breakpoint
CREATE INDEX `activation_request_status_idx` ON `activation_requests` (`status`);