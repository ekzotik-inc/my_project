CREATE TABLE `telegramConversations` (
	`telegramUserId` varchar(32) NOT NULL,
	`telegramChatId` varchar(32) NOT NULL,
	`state` varchar(64) NOT NULL,
	`draftPhone` varchar(64),
	`draftFullName` varchar(200),
	`assignmentId` int,
	`stepOrder` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegramConversations_telegramUserId` PRIMARY KEY(`telegramUserId`)
);
--> statement-breakpoint
ALTER TABLE `reportAttachments` ADD `telegramFileId` varchar(256);--> statement-breakpoint
ALTER TABLE `telegramConversations` ADD CONSTRAINT `telegramConversations_assignmentId_activityAssignments_id_fk` FOREIGN KEY (`assignmentId`) REFERENCES `activityAssignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `telegram_conversations_assignment_idx` ON `telegramConversations` (`assignmentId`);