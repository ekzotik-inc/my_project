import { and, asc, count, countDistinct, desc, eq, sql } from "drizzle-orm";
import {
  activityAssignments,
  activityPeriods,
  activities,
  participants,
  pointLedger,
  reportAttachments,
  reportStepResponses,
  activitySteps,
  teams,
} from "../drizzle/schema";
import { approveAfterModeration, rejectAfterModeration, type AssignmentWorkflowStatus } from "./activityPolicies";
import { getDb } from "./db";
import * as telegramDb from "./telegramDb";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

const submittedOrLater = sql<number>`coalesce(sum(case when ${activityAssignments.status} in ('under_review', 'approved', 'rejected') then 1 else 0 end), 0)`;
const approvedTotal = sql<number>`coalesce(sum(case when ${activityAssignments.status} = 'approved' then 1 else 0 end), 0)`;
const awardedTotal = sql<number>`coalesce(sum(case when ${activityAssignments.status} = 'approved' then ${activityAssignments.awardedPoints} else 0 end), 0)`;

export function resolveReviewDecision(status: AssignmentWorkflowStatus, decision: "approved" | "rejected", activityPoints: number) {
  return decision === "approved"
    ? approveAfterModeration(status, activityPoints)
    : rejectAfterModeration(status);
}

export async function getReviewCenterDashboard() {
  const db = await requireDb();

  const [queueRows, evidenceRows, teamRows, participantRows] = await Promise.all([
    db
      .select({
        assignmentId: activityAssignments.id,
        submittedAt: activityAssignments.submittedAt,
        participantId: participants.id,
        participantName: participants.fullName,
        participantUsername: participants.telegramUsername,
        teamName: teams.name,
        activityTitle: activities.title,
        activityPoints: activities.points,
        periodTitle: activityPeriods.title,
        responseCount: countDistinct(reportStepResponses.id),
        attachmentCount: count(reportAttachments.id),
      })
      .from(activityAssignments)
      .innerJoin(participants, eq(activityAssignments.participantId, participants.id))
      .innerJoin(activities, eq(activityAssignments.activityId, activities.id))
      .innerJoin(activityPeriods, eq(activities.periodId, activityPeriods.id))
      .leftJoin(teams, eq(participants.teamId, teams.id))
      .leftJoin(reportStepResponses, eq(reportStepResponses.assignmentId, activityAssignments.id))
      .leftJoin(reportAttachments, eq(reportAttachments.responseId, reportStepResponses.id))
      .where(eq(activityAssignments.status, "under_review"))
      .groupBy(
        activityAssignments.id,
        activityAssignments.submittedAt,
        participants.id,
        participants.fullName,
        participants.telegramUsername,
        teams.name,
        activities.title,
        activities.points,
        activityPeriods.title,
      )
      .orderBy(asc(activityAssignments.submittedAt), asc(activityAssignments.id)),
    db
      .select({
        assignmentId: reportStepResponses.assignmentId,
        responseId: reportStepResponses.id,
        stepOrder: activitySteps.stepOrder,
        instruction: activitySteps.instruction,
        inputType: activitySteps.inputType,
        textResponse: reportStepResponses.textResponse,
        attachmentId: reportAttachments.id,
        attachmentKind: reportAttachments.kind,
        attachmentUrl: reportAttachments.url,
        attachmentName: reportAttachments.originalName,
        attachmentMimeType: reportAttachments.mimeType,
      })
      .from(reportStepResponses)
      .innerJoin(activityAssignments, eq(reportStepResponses.assignmentId, activityAssignments.id))
      .innerJoin(activitySteps, eq(reportStepResponses.activityStepId, activitySteps.id))
      .leftJoin(reportAttachments, eq(reportAttachments.responseId, reportStepResponses.id))
      .where(eq(activityAssignments.status, "under_review"))
      .orderBy(asc(reportStepResponses.assignmentId), asc(activitySteps.stepOrder), asc(reportAttachments.sortOrder)),
    db
      .select({
        id: teams.id,
        name: teams.name,
        memberCount: countDistinct(participants.id),
        assignedCount: count(activityAssignments.id),
        submittedCount: submittedOrLater,
        approvedCount: approvedTotal,
        awardedPoints: awardedTotal,
      })
      .from(teams)
      .leftJoin(participants, and(eq(participants.teamId, teams.id), eq(participants.status, "approved")))
      .leftJoin(activityAssignments, eq(activityAssignments.participantId, participants.id))
      .where(eq(teams.isActive, true))
      .groupBy(teams.id, teams.name)
      .orderBy(desc(awardedTotal), desc(approvedTotal), asc(teams.name)),
    db
      .select({
        id: participants.id,
        name: participants.fullName,
        teamName: teams.name,
        assignedCount: count(activityAssignments.id),
        submittedCount: submittedOrLater,
        approvedCount: approvedTotal,
        awardedPoints: awardedTotal,
        latestActivityAt: sql<Date | null>`max(${activityAssignments.updatedAt})`,
      })
      .from(participants)
      .leftJoin(teams, eq(participants.teamId, teams.id))
      .leftJoin(activityAssignments, eq(activityAssignments.participantId, participants.id))
      .where(eq(participants.status, "approved"))
      .groupBy(participants.id, participants.fullName, teams.name)
      .orderBy(desc(approvedTotal), desc(submittedOrLater), desc(awardedTotal), asc(participants.fullName)),
  ]);

  const evidenceByAssignment = new Map<number, typeof evidenceRows>();
  for (const row of evidenceRows) {
    const group = evidenceByAssignment.get(row.assignmentId) ?? [];
    group.push(row);
    evidenceByAssignment.set(row.assignmentId, group);
  }

  const queue = queueRows.map(row => ({
    ...row,
    responseCount: Number(row.responseCount),
    attachmentCount: Number(row.attachmentCount),
    evidence: evidenceByAssignment.get(row.assignmentId) ?? [],
  }));

  return {
    summary: {
      awaitingReview: queue.length,
      proofsAttached: queue.reduce((sum, row) => sum + row.attachmentCount, 0),
      participantsInQueue: new Set(queue.map(row => row.participantId)).size,
    },
    queue,
    teams: teamRows.map(row => ({
      ...row,
      memberCount: Number(row.memberCount),
      assignedCount: Number(row.assignedCount),
      submittedCount: Number(row.submittedCount),
      approvedCount: Number(row.approvedCount),
      awardedPoints: Number(row.awardedPoints),
    })),
    participants: participantRows.map(row => ({
      ...row,
      assignedCount: Number(row.assignedCount),
      submittedCount: Number(row.submittedCount),
      approvedCount: Number(row.approvedCount),
      awardedPoints: Number(row.awardedPoints),
    })),
  };
}

export async function moderateReportFromReviewCenter(input: {
  assignmentId: number;
  decision: "approved" | "rejected";
  comment?: string;
}) {
  const db = await requireDb();
  const report = await telegramDb.getReportForModeration(input.assignmentId);
  if (!report) throw new Error("Report was not found");
  const transition = resolveReviewDecision(report.status as AssignmentWorkflowStatus, input.decision, report.activityPoints);
  const periods = await db
    .select({ id: activityPeriods.id })
    .from(activityPeriods)
    .innerJoin(activities, eq(activities.periodId, activityPeriods.id))
    .innerJoin(activityAssignments, eq(activityAssignments.activityId, activities.id))
    .where(eq(activityAssignments.id, input.assignmentId))
    .limit(1);
  if (!periods[0]) throw new Error("Activity period was not found");

  const comment = input.comment?.trim() || null;
  if (input.decision === "rejected") {
    await db.update(activityAssignments).set({ status: transition.status, awardedPoints: transition.awardedPoints, reviewedAt: new Date(), reviewedByParticipantId: null, moderationComment: comment }).where(eq(activityAssignments.id, input.assignmentId));
    return { report, awardedPoints: 0 };
  }

  await db.transaction(async tx => {
    await tx.update(activityAssignments).set({ status: transition.status, awardedPoints: transition.awardedPoints, reviewedAt: new Date(), reviewedByParticipantId: null, moderationComment: comment }).where(eq(activityAssignments.id, input.assignmentId));
    await tx.insert(pointLedger).values({ participantId: report.participantId, assignmentId: input.assignmentId, periodId: periods[0].id, points: transition.awardedPoints, eventType: "report_approved", note: comment, createdByParticipantId: null });
  });

  return { report, awardedPoints: transition.awardedPoints };
}
