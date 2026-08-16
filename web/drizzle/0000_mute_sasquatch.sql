CREATE TABLE `filings` (
	`id` text PRIMARY KEY NOT NULL,
	`fund_id` text NOT NULL,
	`report_date` text NOT NULL,
	`filed_at` text NOT NULL,
	`source` text NOT NULL,
	`total_value_usd` integer NOT NULL,
	`position_count` integer NOT NULL,
	`new_count` integer NOT NULL,
	`added_count` integer NOT NULL,
	`reduced_count` integer NOT NULL,
	`exit_count` integer NOT NULL,
	`unchanged_count` integer NOT NULL,
	`data_status` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`fund_id`) REFERENCES `funds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_filings_fund_report` ON `filings` (`fund_id`,`report_date`);--> statement-breakpoint
CREATE INDEX `idx_filings_report_date` ON `filings` (`report_date`);--> statement-breakpoint
CREATE TABLE `funds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_zh` text NOT NULL,
	`cik` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_funds_cik` ON `funds` (`cik`);--> statement-breakpoint
CREATE TABLE `positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filing_id` text NOT NULL,
	`issuer` text NOT NULL,
	`ticker` text NOT NULL,
	`sector` text NOT NULL,
	`value_usd` integer NOT NULL,
	`weight` real NOT NULL,
	`shares` integer NOT NULL,
	`share_change` integer NOT NULL,
	`change_percent` real,
	`change_type` text NOT NULL,
	FOREIGN KEY (`filing_id`) REFERENCES `filings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_positions_filing_weight` ON `positions` (`filing_id`,`weight`);--> statement-breakpoint
CREATE INDEX `idx_positions_filing_change` ON `positions` (`filing_id`,`change_type`);