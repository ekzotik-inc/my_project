CREATE TABLE `broadcastDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`broadcastId` int NOT NULL,
	`participantId` int NOT NULL,
	`telegramMessageId` varchar(32),
	`status` enum('sent','failed') NOT NULL,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `broadcastDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `broadcast_deliveries_unique` UNIQUE(`broadcastId`,`participantId`)
);
--> statement-breakpoint
CREATE TABLE `broadcasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`imageKey` varchar(512),
	`imageUrl` varchar(1024),
	`audience` enum('all_approved','teams') NOT NULL DEFAULT 'all_approved',
	`teamIds` json,
	`buttons` json,
	`status` enum('draft','sent') NOT NULL DEFAULT 'draft',
	`sentAt` timestamp,
	`createdByParticipantId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `broadcasts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `broadcastDeliveries` ADD CONSTRAINT `broadcastDeliveries_broadcastId_broadcasts_id_fk` FOREIGN KEY (`broadcastId`) REFERENCES `broadcasts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `broadcastDeliveries` ADD CONSTRAINT `broadcastDeliveries_participantId_participants_id_fk` FOREIGN KEY (`participantId`) REFERENCES `participants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `broadcasts` ADD CONSTRAINT `broadcasts_createdByParticipantId_participants_id_fk` FOREIGN KEY (`createdByParticipantId`) REFERENCES `participants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `broadcast_deliveries_broadcast_idx` ON `broadcastDeliveries` (`broadcastId`);--> statement-breakpoint
CREATE INDEX `broadcasts_status_idx` ON `broadcasts` (`status`);