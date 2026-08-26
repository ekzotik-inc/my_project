import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  activityAssignments,
  activityPeriods,
  activities,
  activitySteps,
  participants,
  pointLedger,
  reportAttachments,
  reportStepResponses,
  telegramConversations,
  telegramSettings,
  teams,
} from "../drizzle/schema";
import { awardCatalogCompletionBonusInTransaction } from "./achievementCompletionBonus";
import { getDb } from "./db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function getParticipantByTelegramId(telegramUserId: string) {
  const db = await requireDb();
  const rows = await db.select().from(participants).where(eq(participants.telegramUserId, telegramUserId)).limit(1);
  return rows[0] ?? null;
}

export async function getParticipantById(participantId: number) {
  const db = await requireDb();
  const rows = await db.select().from(participants).where(eq(participants.id, participantId)).limit(1);
  return rows[0] ?? null;
}

export async function listActiveTeamsForTelegram() {
  const db = await requireDb();
  return db.select().from(teams).where(eq(teams.isActive, true)).orderBy(asc(teams.name));
}

export async function listApprovedParticipantChats() {
  const db = await requireDb();
  return db
    .select({ telegramChatId: participants.telegramChatId })
    .from(participants)
    .where(eq(participants.status, "approved"));
}

export async function getTelegramSettings() {
  const db = await requireDb();
  const rows = await db.select().from(telegramSettings).where(eq(telegramSettings.key, "primary")).limit(1);
  return rows[0] ?? null;
}

export async function updateTelegramSettings(input: {
  registrationModerationChatId?: string | null;
  reportModerationChatId?: string | null;
  webAppUrl?: string | null;
  menuButtonText?: string;
}) {
  const db = await requireDb();
  const values = {
    key: "primary",
    registrationModerationChatId: input.registrationModerationChatId?.trim() || null,
    reportModerationChatId: input.reportModerationChatId?.trim() || null,
    webAppUrl: input.webAppUrl?.trim() || null,
    menuButtonText: input.menuButtonText?.trim() || "Статистика",
  };
  await db.insert(telegramSettings).values(values).onDuplicateKeyUpdate({ set: values });
}

export async function getTelegramConversation(telegramUserId: string) {
  const db = await requireDb();
  const rows = await db.select().from(telegramConversations).where(eq(telegramConversations.telegramUserId, telegramUserId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertTelegramConversation(input: {
  telegramUserId: string;
  telegramChatId: string;
  state: string;
  draftPhone?: string | null;
  draftFullName?: string | null;
  assignmentId?: number | null;
  stepOrder?: number | null;
}) {
  const db = await requireDb();
  const values = {
    ...input,
    draftPhone: input.draftPhone ?? null,
    draftFullName: input.draftFullName ?? null,
    assignmentId: input.assignmentId ?? null,
    stepOrder: input.stepOrder ?? null,
  };
  await db.insert(telegramConversations).values(values).onDuplicateKeyUpdate({ set: values });
}

export async function clearTelegramConversation(telegramUserId: string) {
  const db = await requireDb();
  await db.delete(telegramConversations).where(eq(telegramConversations.telegramUserId, telegramUserId));
}

export async function completeTelegramRegistration(input: {
  telegramUserId: string;
  telegramChatId: string;
  telegramUsername?: string | null;
  phone: string;
  fullName: string;
  teamId: number;
}) {
  const db = await requireDb();
  const team = await db.select({ id: teams.id }).from(teams).where(and(eq(teams.id, input.teamId), eq(teams.isActive, true))).limit(1);
  if (!team[0]) throw new Error("Selected team is not active");
  const existing = await getParticipantByTelegramId(input.telegramUserId);
  if (existing?.status === "approved") return { participant: existing, alreadyApproved: true };

  if (existing) {
    await db.update(participants).set({
      telegramChatId: input.telegramChatId,
      telegramUsername: input.telegramUsername ?? null,
      phone: input.phone,
      fullName: input.fullName,
      teamId: input.teamId,
      status: "pending",
      rejectionReason: null,
    }).where(eq(participants.id, existing.id));
  } else {
    await db.insert(participants).values({
      telegramUserId: input.telegramUserId,
      telegramChatId: input.telegramChatId,
      telegramUsername: input.telegramUsername ?? null,
      phone: input.phone,
      fullName: input.fullName,
      teamId: input.teamId,
      status: "pending",
    });
  }
  const participant = await getParticipantByTelegramId(input.telegramUserId);
  if (!participant) throw new Error("Registration could not be saved");
  return { participant, alreadyApproved: false };
}

export async function moderateParticipantFromAdmin(input: {
  participantId: number;
  status: "approved" | "rejected";
  role: "participant" | "pc_admin" | "chief_admin";
  reviewerParticipantId?: number;
  rejectionReason?: string;
}) {
  const db = await requireDb();
  const rows = await db.select().from(participants).where(eq(participants.id, input.participantId)).limit(1);
  if (!rows[0]) throw new Error("Participant was not found");
  await db.update(participants).set({
    status: input.status,
    role: input.status === "approved" ? input.role : "participant",
    moderatedByParticipantId: input.reviewerParticipantId ?? null,
    moderatedAt: new Date(),
    rejectionReason: input.status === "rejected" ? input.rejectionReason?.trim() || null : null,
  }).where(eq(participants.id, input.participantId));
  if (input.status === "approved") {
    const { assignPublishedActivitiesToParticipant } = await import("./activityAdminDb");
    await assignPublishedActivitiesToParticipant(input.participantId);
  }
  return rows[0];
}

export async function isTelegramModerator(telegramUserId: string) {
  const moderator = await getParticipantByTelegramId(telegramUserId);
  return Boolean(moderator && moderator.status === "approved" && (moderator.role === "pc_admin" || moderator.role === "chief_admin"));
}

export async function listTelegramModerators() {
  const db = await requireDb();
  return db
    .select({ telegramUserId: participants.telegramUserId, telegramChatId: participants.telegramChatId, fullName: participants.fullName, role: participants.role })
    .from(participants)
    .where(and(eq(participants.status, "approved"), inArray(participants.role, ["pc_admin", "chief_admin"])));
}

export async function getParticipantActivityDashboard(participantId: number) {
  const db = await requireDb();
  const periodRows = await db.select().from(activityPeriods).where(eq(activityPeriods.status, "active")).limit(1);
  const period = periodRows[0] ?? null;
  if (!period) return { period: null, assignments: [], points: 0 };

  const assignments = await db
    .select({ id: activityAssignments.id, status: activityAssignments.status, awardedPoints: activityAssignments.awardedPoints, title: activities.title, points: activities.points })
    .from(activityAssignments)
    .innerJoin(activities, eq(activityAssignments.activityId, activities.id))
    .where(and(eq(activityAssignments.participantId, participantId), eq(activities.periodId, period.id)))
    .orderBy(asc(activities.displayOrder));
  const totals = await db.select({ total: sql<number>`coalesce(sum(${pointLedger.points}), 0)` }).from(pointLedger).where(and(eq(pointLedger.participantId, participantId), eq(pointLedger.periodId, period.id)));
  return { period, assignments, points: Number(totals[0]?.total ?? 0) };
}

export async function getAssignmentForParticipant(assignmentId: number, participantId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ id: activityAssignments.id, status: activityAssignments.status, activityId: activities.id, title: activities.title, description: activities.description, points: activities.points })
    .from(activityAssignments)
    .innerJoin(activities, eq(activityAssignments.activityId, activities.id))
    .where(and(eq(activityAssignments.id, assignmentId), eq(activityAssignments.participantId, participantId)))
    .limit(1);
  if (!rows[0]) return null;
  const steps = await db.select().from(activitySteps).where(eq(activitySteps.activityId, rows[0].activityId)).orderBy(asc(activitySteps.stepOrder));
  return { ...rows[0], steps };
}

export async function beginActivityReport(assignmentId: number, participantId: number) {
  const assignment = await getAssignmentForParticipant(assignmentId, participantId);
  if (!assignment) throw new Error("Assignment was not found");
  if (assignment.status === "under_review" || assignment.status === "approved") throw new Error("This report is already being reviewed or was approved");
  const db = await requireDb();
  await db.update(activityAssignments).set({ status: "in_progress" }).where(eq(activityAssignments.id, assignmentId));
  return assignment;
}

async function upsertResponse(input: { assignmentId: number; stepId: number; text?: string | null }) {
  const db = await requireDb();
  const rows = await db.select({ id: reportStepResponses.id }).from(reportStepResponses).where(and(eq(reportStepResponses.assignmentId, input.assignmentId), eq(reportStepResponses.activityStepId, input.stepId))).limit(1);
  if (rows[0]) {
    await db.update(reportStepResponses).set({ textResponse: input.text ?? null }).where(eq(reportStepResponses.id, rows[0].id));
    return rows[0].id;
  }
  await db.insert(reportStepResponses).values({ assignmentId: input.assignmentId, activityStepId: input.stepId, textResponse: input.text ?? null });
  const inserted = await db.select({ id: reportStepResponses.id }).from(reportStepResponses).where(and(eq(reportStepResponses.assignmentId, input.assignmentId), eq(reportStepResponses.activityStepId, input.stepId))).limit(1);
  return inserted[0]!.id;
}

async function validateReportStep(assignmentId: number, participantId: number, stepId: number) {
  const assignment = await getAssignmentForParticipant(assignmentId, participantId);
  if (!assignment || !assignment.steps.some(step => step.id === stepId)) throw new Error("Report step was not found");
  return assignment;
}

export async function saveReportTextStep(input: { assignmentId: number; participantId: number; stepId: number; text: string }) {
  await validateReportStep(input.assignmentId, input.participantId, input.stepId);
  return upsertResponse({ assignmentId: input.assignmentId, stepId: input.stepId, text: input.text.trim() });
}

export async function saveReportAttachment(input: {
  assignmentId: number;
  participantId: number;
  stepId: number;
  kind: "photo" | "receipt" | "file";
  storageKey: string;
  url: string;
  telegramFileId: string;
  originalName?: string | null;
  mimeType?: string | null;
}) {
  await validateReportStep(input.assignmentId, input.participantId, input.stepId);
  const responseId = await upsertResponse({ assignmentId: input.assignmentId, stepId: input.stepId });
  const db = await requireDb();
  await db.insert(reportAttachments).values({ responseId, kind: input.kind, storageKey: input.storageKey, url: input.url, telegramFileId: input.telegramFileId, originalName: input.originalName ?? null, mimeType: input.mimeType ?? null });
}

export async function submitActivityReport(assignmentId: number, participantId: number) {
  const db = await requireDb();
  const assignment = await getAssignmentForParticipant(assignmentId, participantId);
  if (!assignment) throw new Error("Assignment was not found");
  const responses = await db.select({ stepId: reportStepResponses.activityStepId }).from(reportStepResponses).where(eq(reportStepResponses.assignmentId, assignmentId));
  const completedSteps = new Set(responses.map(row => row.stepId));
  if (assignment.steps.some(step => step.isRequired && !completedSteps.has(step.id))) throw new Error("Complete every required step before submitting the report");
  await db.update(activityAssignments).set({ status: "under_review", awardedPoints: 0, submittedAt: new Date(), moderationComment: null }).where(eq(activityAssignments.id, assignmentId));
  return assignment;
}

export async function getReportForModeration(assignmentId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ id: activityAssignments.id, status: activityAssignments.status, participantId: participants.id, participantTeamId: participants.teamId, participantName: participants.fullName, participantChatId: participants.telegramChatId, participantTeam: teams.name, activityTitle: activities.title, activityPoints: activities.points })
    .from(activityAssignments)
    .innerJoin(participants, eq(activityAssignments.participantId, participants.id))
    .leftJoin(teams, eq(participants.teamId, teams.id))
    .innerJoin(activities, eq(activityAssignments.activityId, activities.id))
    .where(eq(activityAssignments.id, assignmentId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getReportEvidence(assignmentId: number) {
  const db = await requireDb();
  return db
    .select({
      stepOrder: activitySteps.stepOrder,
      instruction: activitySteps.instruction,
      inputType: activitySteps.inputType,
      textResponse: reportStepResponses.textResponse,
      attachmentKind: reportAttachments.kind,
      telegramFileId: reportAttachments.telegramFileId,
      originalName: reportAttachments.originalName,
    })
    .from(reportStepResponses)
    .innerJoin(activitySteps, eq(reportStepResponses.activityStepId, activitySteps.id))
    .leftJoin(reportAttachments, eq(reportAttachments.responseId, reportStepResponses.id))
    .where(eq(reportStepResponses.assignmentId, assignmentId))
    .orderBy(asc(activitySteps.stepOrder));
}

export async function moderateReport(input: { assignmentId: number; moderatorTelegramId: string; decision: "approved" | "rejected"; comment?: string }) {
  const db = await requireDb();
  const moderator = await getParticipantByTelegramId(input.moderatorTelegramId);
  if (!moderator || moderator.status !== "approved" || (moderator.role !== "pc_admin" && moderator.role !== "chief_admin")) throw new Error("Moderator permissions are required");
  const report = await getReportForModeration(input.assignmentId);
  if (!report) throw new Error("Report was not found");
  if (report.status !== "under_review") throw new Error("This report has already been moderated");
  const periods = await db.select({ id: activityPeriods.id }).from(activityPeriods).innerJoin(activities, eq(activities.periodId, activityPeriods.id)).innerJoin(activityAssignments, eq(activityAssignments.activityId, activities.id)).where(eq(activityAssignments.id, input.assignmentId)).limit(1);
  if (!periods[0]) throw new Error("Activity period was not found");
  const comment = input.comment?.trim() || null;

  if (input.decision === "rejected") {
    await db.update(activityAssignments).set({ status: "rejected", awardedPoints: 0, reviewedAt: new Date(), reviewedByParticipantId: moderator.id, moderationComment: comment }).where(eq(activityAssignments.id, input.assignmentId));
    return { report, awardedPoints: 0 };
  }
  let catalogBonusPoints = 0;
  await db.transaction(async tx => {
    await tx.update(activityAssignments).set({ status: "approved", awardedPoints: report.activityPoints, reviewedAt: new Date(), reviewedByParticipantId: moderator.id, moderationComment: comment }).where(eq(activityAssignments.id, input.assignmentId));
    await tx.insert(pointLedger).values({ participantId: report.participantId, assignmentId: input.assignmentId, periodId: periods[0].id, points: report.activityPoints, eventType: "report_approved", note: comment, createdByParticipantId: moderator.id });
    const bonus = await awardCatalogCompletionBonusInTransaction({
      tx,
      participantId: report.participantId,
      teamId: report.participantTeamId,
      periodId: periods[0].id,
      createdByParticipantId: moderator.id,
    });
    catalogBonusPoints = bonus.points;
  });
  return { report, awardedPoints: report.activityPoints, catalogBonusPoints };
}
