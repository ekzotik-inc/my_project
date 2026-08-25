import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Internal accounts used to enter the browser-based administration panel. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** `admin` is Chief Administrator; `pc_admin` can moderate registrations and reports. */
  role: mysqlEnum("role", ["user", "admin", "pc_admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** A corporate team used for registration, assignments and leaderboards. */
export const teams = mysqlTable(
  "teams",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("teams_name_unique").on(table.name)]
);

export const participantStatusValues = ["pending", "approved", "rejected"] as const;
export const participantRoleValues = ["participant", "pc_admin", "chief_admin"] as const;

/** Telegram users and their onboarding state. No participant receives product access before approval. */
export const participants = mysqlTable(
  "participants",
  {
    id: int("id").autoincrement().primaryKey(),
    telegramUserId: varchar("telegramUserId", { length: 32 }).notNull(),
    telegramChatId: varchar("telegramChatId", { length: 32 }).notNull(),
    telegramUsername: varchar("telegramUsername", { length: 128 }),
    phone: varchar("phone", { length: 64 }),
    fullName: varchar("fullName", { length: 200 }),
    teamId: int("teamId").references(() => teams.id, { onDelete: "set null" }),
    status: mysqlEnum("status", participantStatusValues).default("pending").notNull(),
    role: mysqlEnum("role", participantRoleValues).default("participant").notNull(),
    appUserId: int("appUserId").references(() => users.id, { onDelete: "set null" }),
    moderatedByParticipantId: int("moderatedByParticipantId"),
    moderatedAt: timestamp("moderatedAt"),
    rejectionReason: text("rejectionReason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("participants_telegram_user_unique").on(table.telegramUserId),
    uniqueIndex("participants_app_user_unique").on(table.appUserId),
    index("participants_status_idx").on(table.status),
    index("participants_team_idx").on(table.teamId),
  ]
);

export const activityPeriodStatusValues = ["draft", "active", "completed", "archived"] as const;

/** Exactly one period may be active; its task count is shared by every eligible participant. */
export const activityPeriods = mysqlTable(
  "activityPeriods",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", activityPeriodStatusValues).default("draft").notNull(),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    taskCount: int("taskCount").default(0).notNull(),
    createdByParticipantId: int("createdByParticipantId").references(() => participants.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("activity_periods_status_idx").on(table.status)]
);

export const activityStatusValues = ["draft", "published", "archived"] as const;

/** A task in an activity period. It is assigned individually, preserving an auditable participant state. */
export const activities = mysqlTable(
  "activities",
  {
    id: int("id").autoincrement().primaryKey(),
    periodId: int("periodId").notNull().references(() => activityPeriods.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    points: int("points").notNull(),
    coverImageKey: varchar("coverImageKey", { length: 512 }),
    coverImageUrl: varchar("coverImageUrl", { length: 1024 }),
    status: mysqlEnum("status", activityStatusValues).default("draft").notNull(),
    displayOrder: int("displayOrder").default(0).notNull(),
    createdByParticipantId: int("createdByParticipantId").references(() => participants.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("activities_period_idx").on(table.periodId)]
);

export const activityStepTypeValues = ["photo", "file", "text", "mixed"] as const;

/** Administrator-configured completion instructions for an activity. */
export const activitySteps = mysqlTable(
  "activitySteps",
  {
    id: int("id").autoincrement().primaryKey(),
    activityId: int("activityId").notNull().references(() => activities.id, { onDelete: "cascade" }),
    stepOrder: int("stepOrder").notNull(),
    instruction: text("instruction").notNull(),
    inputType: mysqlEnum("inputType", activityStepTypeValues).default("mixed").notNull(),
    isRequired: boolean("isRequired").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("activity_steps_order_unique").on(table.activityId, table.stepOrder),
    index("activity_steps_activity_idx").on(table.activityId),
  ]
);

export const assignmentStatusValues = [
  "assigned",
  "in_progress",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "expired",
] as const;

/** A participant's specific task instance; its points remain zero until an approval decision. */
export const activityAssignments = mysqlTable(
  "activityAssignments",
  {
    id: int("id").autoincrement().primaryKey(),
    activityId: int("activityId").notNull().references(() => activities.id, { onDelete: "cascade" }),
    participantId: int("participantId").notNull().references(() => participants.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", assignmentStatusValues).default("assigned").notNull(),
    awardedPoints: int("awardedPoints").default(0).notNull(),
    assignedAt: timestamp("assignedAt").defaultNow().notNull(),
    submittedAt: timestamp("submittedAt"),
    reviewedAt: timestamp("reviewedAt"),
    reviewedByParticipantId: int("reviewedByParticipantId").references(() => participants.id, { onDelete: "set null" }),
    moderationComment: text("moderationComment"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("activity_assignments_unique").on(table.activityId, table.participantId),
    index("activity_assignments_participant_idx").on(table.participantId, table.status),
  ]
);

/** A response to one configured instruction in a participant task instance. */
export const reportStepResponses = mysqlTable(
  "reportStepResponses",
  {
    id: int("id").autoincrement().primaryKey(),
    assignmentId: int("assignmentId").notNull().references(() => activityAssignments.id, { onDelete: "cascade" }),
    activityStepId: int("activityStepId").notNull().references(() => activitySteps.id, { onDelete: "cascade" }),
    textResponse: text("textResponse"),
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("report_step_responses_unique").on(table.assignmentId, table.activityStepId),
    index("report_step_responses_assignment_idx").on(table.assignmentId),
  ]
);

export const reportAttachmentKindValues = ["photo", "receipt", "file"] as const;

/** Object-storage references only; binary files are never kept in the database. */
export const reportAttachments = mysqlTable(
  "reportAttachments",
  {
    id: int("id").autoincrement().primaryKey(),
    responseId: int("responseId").notNull().references(() => reportStepResponses.id, { onDelete: "cascade" }),
    kind: mysqlEnum("kind", reportAttachmentKindValues).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    url: varchar("url", { length: 1024 }).notNull(),
    telegramFileId: varchar("telegramFileId", { length: 256 }),
    originalName: varchar("originalName", { length: 255 }),
    mimeType: varchar("mimeType", { length: 128 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("report_attachments_response_idx").on(table.responseId)]
);

export const pointLedgerEventValues = ["report_approved", "manual_adjustment"] as const;

/** Append-only points journal. Only approved reports or explicit adjustment can create an entry. */
export const pointLedger = mysqlTable(
  "pointLedger",
  {
    id: int("id").autoincrement().primaryKey(),
    participantId: int("participantId").notNull().references(() => participants.id, { onDelete: "cascade" }),
    assignmentId: int("assignmentId").references(() => activityAssignments.id, { onDelete: "set null" }),
    periodId: int("periodId").notNull().references(() => activityPeriods.id, { onDelete: "cascade" }),
    points: int("points").notNull(),
    eventType: mysqlEnum("eventType", pointLedgerEventValues).notNull(),
    note: text("note"),
    createdByParticipantId: int("createdByParticipantId").references(() => participants.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("point_ledger_assignment_unique").on(table.assignmentId),
    index("point_ledger_participant_period_idx").on(table.participantId, table.periodId),
  ]
);

/** One configurable record centralizes target chats and the eventual Mini App URL. */
export const telegramSettings = mysqlTable("telegramSettings", {
  key: varchar("key", { length: 32 }).primaryKey(),
  registrationModerationChatId: varchar("registrationModerationChatId", { length: 32 }),
  reportModerationChatId: varchar("reportModerationChatId", { length: 32 }),
  webAppUrl: varchar("webAppUrl", { length: 1024 }),
  menuButtonText: varchar("menuButtonText", { length: 64 }).default("Статистика").notNull(),
  metadata: json("metadata"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Ephemeral Telegram conversation state; report data itself is persisted in its dedicated tables. */
export const telegramConversations = mysqlTable(
  "telegramConversations",
  {
    telegramUserId: varchar("telegramUserId", { length: 32 }).primaryKey(),
    telegramChatId: varchar("telegramChatId", { length: 32 }).notNull(),
    state: varchar("state", { length: 64 }).notNull(),
    draftPhone: varchar("draftPhone", { length: 64 }),
    draftFullName: varchar("draftFullName", { length: 200 }),
    assignmentId: int("assignmentId").references(() => activityAssignments.id, { onDelete: "cascade" }),
    stepOrder: int("stepOrder"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("telegram_conversations_assignment_idx").on(table.assignmentId)]
);

export const broadcastAudienceValues = ["all_approved", "teams"] as const;
export const broadcastStatusValues = ["draft", "sent"] as const;

/** A prepared broadcast with Markdown text, optional image and custom URL buttons. */
export const broadcasts = mysqlTable(
  "broadcasts",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    message: text("message").notNull(),
    imageKey: varchar("imageKey", { length: 512 }),
    imageUrl: varchar("imageUrl", { length: 1024 }),
    audience: mysqlEnum("audience", broadcastAudienceValues).default("all_approved").notNull(),
    teamIds: json("teamIds"),
    buttons: json("buttons"),
    status: mysqlEnum("status", broadcastStatusValues).default("draft").notNull(),
    sentAt: timestamp("sentAt"),
    createdByParticipantId: int("createdByParticipantId").references(() => participants.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("broadcasts_status_idx").on(table.status)]
);

export const broadcastDeliveryStatusValues = ["sent", "failed"] as const;

/** Per-recipient delivery log avoids duplicate messages and keeps failed deliveries auditable. */
export const broadcastDeliveries = mysqlTable(
  "broadcastDeliveries",
  {
    id: int("id").autoincrement().primaryKey(),
    broadcastId: int("broadcastId").notNull().references(() => broadcasts.id, { onDelete: "cascade" }),
    participantId: int("participantId").notNull().references(() => participants.id, { onDelete: "cascade" }),
    telegramMessageId: varchar("telegramMessageId", { length: 32 }),
    status: mysqlEnum("status", broadcastDeliveryStatusValues).notNull(),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("broadcast_deliveries_unique").on(table.broadcastId, table.participantId),
    index("broadcast_deliveries_broadcast_idx").on(table.broadcastId),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type ActivityPeriod = typeof activityPeriods.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type ActivityStep = typeof activitySteps.$inferSelect;
export type ActivityAssignment = typeof activityAssignments.$inferSelect;
