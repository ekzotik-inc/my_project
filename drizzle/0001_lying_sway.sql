CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`points` int NOT NULL,
	`coverImageKey` varchar(512),
	`coverImageUrl` varchar(1024),
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdByParticipantId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activityAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityId` int NOT NULL,
	`participantId` int NOT NULL,
	`status` enum('assigned','in_progress','submitted','under_review','approved','rejected','expired') NOT NULL DEFAULT 'assigned',
	`awardedPoints` int NOT NULL DEFAULT 0,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`submittedAt` timestamp,
	`reviewedAt` timestamp,
	`reviewedByParticipantId` int,
	`moderationComment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activityAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `activity_assignments_unique` UNIQUE(`activityId`,`participantId`)
);
--> statement-breakpoint
CREATE TABLE `activityPeriods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`status` enum('draft','active','completed','archived') NOT NULL DEFAULT 'draft',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`taskCount` int NOT NULL DEFAULT 0,
	`createdByParticipantId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activityPeriods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activitySteps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityId` int NOT NULL,
	`stepOrder` int NOT NULL,
	`instruction` text NOT NULL,
	`inputType` enum('photo','file','text','mixed') NOT NULL DEFAULT 'mixed',
	`isRequired` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activitySteps_id` PRIMARY KEY(`id`),
	CONSTRAINT `activity_steps_order_unique` UNIQUE(`activityId`,`stepOrder`)
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`telegramUserId` varchar(32) NOT NULL,
	`telegramChatId` varchar(32) NOT NULL,
	`telegramUsername` varchar(128),
	`phone` varchar(64),
	`fullName` varchar(200),
	`teamId` int,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`role` enum('participant','pc_admin','chief_admin') NOT NULL DEFAULT 'participant',
	`appUserId` int,
	`moderatedByParticipantId` int,
	`moderatedAt` timestamp,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `participants_telegram_user_unique` UNIQUE(`telegramUserId`),
	CONSTRAINT `participants_app_user_unique` UNIQUE(`appUserId`)
);
--> statement-breakpoint
CREATE TABLE `pointLedger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantId` int NOT NULL,
	`assignmentId` int,
	`periodId` int NOT NULL,
	`points` int NOT NULL,
	`eventType` enum('report_approved','manual_adjustment') NOT NULL,
	`note` text,
	`createdByParticipantId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pointLedger_id` PRIMARY KEY(`id`),
	CONSTRAINT `point_ledger_assignment_unique` UNIQUE(`assignmentId`)
);
--> statement-breakpoint
CREATE TABLE `reportAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`responseId` int NOT NULL,
	`kind` enum('photo','receipt','file') NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`originalName` varchar(255),
	`mimeType` varchar(128),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reportAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reportStepResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`activityStepId` int NOT NULL,
	`textResponse` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reportStepResponses_id` PRIMARY KEY(`id`),
	CONSTRAINT `report_step_responses_unique` UNIQUE(`assignmentId`,`activityStepId`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `telegramSettings` (
	`key` varchar(32) NOT NULL,
	`registrationModerationChatId` varchar(32),
	`reportModerationChatId` varchar(32),
	`webAppUrl` varchar(1024),
	`menuButtonText` varchar(64) NOT NULL DEFAULT 'Статистика',
	`metadata` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegramSettings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_periodId_activityPeriods_id_fk` FOREIGN KEY (`periodId`) REFERENCES `activityPeriods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_createdByParticipantId_participants_id_fk` FOREIGN KEY (`createdByParticipantId`) REFERENCES `participants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activityAssignments` ADD CONSTRAINT `activityAssignments_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activityAssignments` ADD CONSTRAINT `activityAssignments_participantId_participants_id_fk` FOREIGN KEY (`participantId`) REFERENCES `participants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activityAssignments` ADD CONSTRAINT `activityAssignments_reviewedByParticipantId_participants_id_fk` FOREIGN KEY (`reviewedByParticipantId`) REFERENCES `participants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activityPeriods` ADD CONSTRAINT `activityPeriods_createdByParticipantId_participants_id_fk` FOREIGN KEY (`createdByParticipantId`) REFERENCES `participants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activitySteps` ADD CONSTRAINT `activitySteps_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participants` ADD CONSTRAINT `participants_teamId_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participants` ADD CONSTRAINT `participants_appUserId_users_id_fk` FOREIGN KEY (`appUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pointLedger` ADD CONSTRAINT `pointLedger_participantId_participants_id_fk` FOREIGN KEY (`participantId`) REFERENCES `participants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pointLedger` ADD CONSTRAINT `pointLedger_assignmentId_activityAssignments_id_fk` FOREIGN KEY (`assignmentId`) REFERENCES `activityAssignments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pointLedger` ADD CONSTRAINT `pointLedger_periodId_activityPeriods_id_fk` FOREIGN KEY (`periodId`) REFERENCES `activityPeriods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pointLedger` ADD CONSTRAINT `pointLedger_createdByParticipantId_participants_id_fk` FOREIGN KEY (`createdByParticipantId`) REFERENCES `participants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reportAttachments` ADD CONSTRAINT `reportAttachments_responseId_reportStepResponses_id_fk` FOREIGN KEY (`responseId`) REFERENCES `reportStepResponses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reportStepResponses` ADD CONSTRAINT `reportStepResponses_assignmentId_activityAssignments_id_fk` FOREIGN KEY (`assignmentId`) REFERENCES `activityAssignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reportStepResponses` ADD CONSTRAINT `reportStepResponses_activityStepId_activitySteps_id_fk` FOREIGN KEY (`activityStepId`) REFERENCES `activitySteps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activities_period_idx` ON `activities` (`periodId`);--> statement-breakpoint
CREATE INDEX `activity_assignments_participant_idx` ON `activityAssignments` (`participantId`,`status`);--> statement-breakpoint
CREATE INDEX `activity_periods_status_idx` ON `activityPeriods` (`status`);--> statement-breakpoint
CREATE INDEX `activity_steps_activity_idx` ON `activitySteps` (`activityId`);--> statement-breakpoint
CREATE INDEX `participants_status_idx` ON `participants` (`status`);--> statement-breakpoint
CREATE INDEX `participants_team_idx` ON `participants` (`teamId`);--> statement-breakpoint
CREATE INDEX `point_ledger_participant_period_idx` ON `pointLedger` (`participantId`,`periodId`);--> statement-breakpoint
CREATE INDEX `report_attachments_response_idx` ON `reportAttachments` (`responseId`);--> statement-breakpoint
CREATE INDEX `report_step_responses_assignment_idx` ON `reportStepResponses` (`assignmentId`);