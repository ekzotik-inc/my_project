CREATE TABLE `achievementBonuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantId` int NOT NULL,
	`periodId` int NOT NULL,
	`points` int NOT NULL DEFAULT 200,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievementBonuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `achievement_bonuses_participant_unique` UNIQUE(`participantId`)
);
--> statement-breakpoint
ALTER TABLE `pointLedger` MODIFY COLUMN `eventType` enum('report_approved','manual_adjustment','achievement_catalog_complete') NOT NULL;--> statement-breakpoint
ALTER TABLE `achievementBonuses` ADD CONSTRAINT `achievementBonuses_participantId_participants_id_fk` FOREIGN KEY (`participantId`) REFERENCES `participants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `achievementBonuses` ADD CONSTRAINT `achievementBonuses_periodId_activityPeriods_id_fk` FOREIGN KEY (`periodId`) REFERENCES `activityPeriods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `achievement_bonuses_period_idx` ON `achievementBonuses` (`periodId`);