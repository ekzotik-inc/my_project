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
import { awardCatalogCompletionBonusInTransaction } from "./achievementCompletionBonus";
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

export function buildReviewAnalytics(input: {
  participants: Array<{ id: number; name: string | null; teamName: string | null; assignedCount: number; submittedCount: number; approvedCount: number; awardedPoints: number; latestActivityAt: Date | null }>;
  teams: Array<{ id: number; name: string | null; memberCount: number; assignedCount: number; submittedCount: number; approvedCount: number; awardedPoints: number }>;
  statusCounts: Record<string, number>;
  activePeriodTitle: string | null;
}) {
  const workflow = [
    { id: "assigned", label: "Не начато", count: input.statusCounts.assigned ?? 0, tone: "slate" as const },
    { id: "in_progress", label: "В процессе", count: input.statusCounts.in_progress ?? 0, tone: "sky" as const },
    { id: "under_review", label: "На проверке", count: input.statusCounts.under_review ?? 0, tone: "rose" as const },
    { id: "approved", label: "Подтверждено", count: input.statusCounts.approved ?? 0, tone: "mint" as const },
    { id: "rejected", label: "Доработка", count: input.statusCounts.rejected ?? 0, tone: "amber" as const },
  ];
  const totalAssignments = workflow.reduce((sum, item) => sum + item.count, 0) + (input.statusCounts.expired ?? 0) + (input.statusCounts.submitted ?? 0);
  const participantsStarted = input.participants.filter(item => item.submittedCount > 0).length;
  return {
    activePeriodTitle: input.activePeriodTitle,
    totalParticipants: input.participants.length,
    participantsStarted,
    participantsAwaitingFirstResult: input.participants.filter(item => item.assignedCount > 0 && item.approvedCount === 0).length,
    totalAwardedPoints: input.participants.reduce((sum, item) => sum + item.awardedPoints, 0),
    completionRate: totalAssignments ? Math.round(((input.statusCounts.approved ?? 0) / totalAssignments) * 100) : 0,
    workflow,
    topParticipants: input.participants.slice(0, 10),
    topTeams: input.teams.slice(0, 3),
  };
}

export function resolveReviewDecision(status: AssignmentWorkflowStatus, decision: "approved" | "rejected", activityPoints: number) {
  return decision === "approved"
    ? approveAfterModeration(status, activityPoints)
    : rejectAfterModeration(status);
}

export async function getReviewCenterDashboard() {
  const db = await requireDb();

  const [queueRows, evidenceRows, teamRows, participantRows, workflowRows, activePeriodRows, participantLedgerRows, teamLedgerRows] = await Promise.all([
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
    db
      .select({ status: activityAssignments.status, total: count(activityAssignments.id) })
      .from(activityAssignments)
      .groupBy(activityAssignments.status),
    db.select({ title: activityPeriods.title }).from(activityPeriods).where(eq(activityPeriods.status, "active")).limit(1),
    db
      .select({ participantId: pointLedger.participantId, awardedPoints: sql<number>`coalesce(sum(${pointLedger.points}), 0)` })
      .from(pointLedger)
      .groupBy(pointLedger.participantId),
    db
      .select({ teamId: participants.teamId, awardedPoints: sql<number>`coalesce(sum(${pointLedger.points}), 0)` })
      .from(pointLedger)
      .innerJoin(participants, eq(pointLedger.participantId, participants.id))
      .where(and(eq(participants.status, "approved"), sql`${participants.teamId} is not null`))
      .groupBy(participants.teamId),
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
  const pointsByParticipant = new Map(participantLedgerRows.map(row => [row.participantId, Number(row.awardedPoints)]));
  const pointsByTeam = new Map(teamLedgerRows.map(row => [row.teamId, Number(row.awardedPoints)]));
  const normalizedTeams = teamRows.map(row => ({
    ...row,
    memberCount: Number(row.memberCount),
    assignedCount: Number(row.assignedCount),
    submittedCount: Number(row.submittedCount),
    approvedCount: Number(row.approvedCount),
    awardedPoints: pointsByTeam.get(row.id) ?? 0,
  })).sort((left, right) => right.awardedPoints - left.awardedPoints || right.approvedCount - left.approvedCount || (left.name || "").localeCompare(right.name || "", "ru"));
  const normalizedParticipants = participantRows.map(row => ({
    ...row,
    assignedCount: Number(row.assignedCount),
    submittedCount: Number(row.submittedCount),
    approvedCount: Number(row.approvedCount),
    awardedPoints: pointsByParticipant.get(row.id) ?? 0,
  })).sort((left, right) => right.awardedPoints - left.awardedPoints || right.approvedCount - left.approvedCount || (left.name || "").localeCompare(right.name || "", "ru"));
  const statusCounts = Object.fromEntries(workflowRows.map(row => [row.status, Number(row.total)]));
  const analytics = buildReviewAnalytics({
    participants: normalizedParticipants,
    teams: normalizedTeams,
    statusCounts,
    activePeriodTitle: activePeriodRows[0]?.title ?? null,
  });

  return {
    summary: {
      awaitingReview: queue.length,
      proofsAttached: queue.reduce((sum, row) => sum + row.attachmentCount, 0),
      participantsInQueue: new Set(queue.map(row => row.participantId)).size,
    },
    recognition: {
      contributorsWithConfirmedResult: participantRows.filter(row => Number(row.approvedCount) > 0).length,
      participantsCloseToFirstResult: participantRows.filter(row => Number(row.assignedCount) > 0 && Number(row.approvedCount) === 0).length,
      periodFinishers: participantRows.filter(row => Number(row.assignedCount) > 0 && Number(row.approvedCount) >= Number(row.assignedCount)).length,
    },
    analytics,
    queue,
    teams: normalizedTeams,
    participants: normalizedParticipants,
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

  let catalogBonusPoints = 0;
  await db.transaction(async tx => {
    await tx.update(activityAssignments).set({ status: transition.status, awardedPoints: transition.awardedPoints, reviewedAt: new Date(), reviewedByParticipantId: null, moderationComment: comment }).where(eq(activityAssignments.id, input.assignmentId));
    await tx.insert(pointLedger).values({ participantId: report.participantId, assignmentId: input.assignmentId, periodId: periods[0].id, points: transition.awardedPoints, eventType: "report_approved", note: comment, createdByParticipantId: null });
    const bonus = await awardCatalogCompletionBonusInTransaction({
      tx,
      participantId: report.participantId,
      teamId: report.participantTeamId,
      periodId: periods[0].id,
      createdByParticipantId: null,
    });
    catalogBonusPoints = bonus.points;
  });

  return { report, awardedPoints: transition.awardedPoints, catalogBonusPoints };
}
