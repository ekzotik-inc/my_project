import { and, eq } from "drizzle-orm";
import { activityAssignments, activities, participants, pointLedger } from "../drizzle/schema";
import { calculateAchievements, type AchievementMetrics } from "./achievementRules";
import { getDb } from "./db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

/** Reads confirmed aggregate facts only. It does not write state or award points. */
export async function getParticipantAchievementMetrics(input: { db?: any; participantId: number; teamId: number | null; periodId: number | null }): Promise<AchievementMetrics> {
  const db = input.db ?? await requireDb();
  const [assignmentRows, ledgerRows, teamAssignmentRows, teamLedgerRows] = await Promise.all([
    db.select({ status: activityAssignments.status, periodId: activities.periodId })
      .from(activityAssignments)
      .innerJoin(activities, eq(activityAssignments.activityId, activities.id))
      .where(eq(activityAssignments.participantId, input.participantId)),
    db.select({ points: pointLedger.points })
      .from(pointLedger)
      .where(and(eq(pointLedger.participantId, input.participantId), eq(pointLedger.eventType, "report_approved"))),
    input.teamId
      ? db.select({ participantId: activityAssignments.participantId, status: activityAssignments.status, periodId: activities.periodId })
        .from(activityAssignments)
        .innerJoin(activities, eq(activityAssignments.activityId, activities.id))
        .innerJoin(participants, eq(activityAssignments.participantId, participants.id))
        .where(and(eq(participants.teamId, input.teamId), eq(participants.status, "approved")))
      : Promise.resolve([]),
    input.teamId
      ? db.select({ points: pointLedger.points })
        .from(pointLedger)
        .innerJoin(participants, eq(pointLedger.participantId, participants.id))
        .where(and(eq(participants.teamId, input.teamId), eq(participants.status, "approved"), eq(pointLedger.eventType, "report_approved")))
      : Promise.resolve([]),
  ]);

  const participantAssignments = assignmentRows as Array<{ status: string; periodId: number }>;
  const participantLedger = ledgerRows as Array<{ points: number }>;
  const teamAssignments = teamAssignmentRows as Array<{ participantId: number; status: string; periodId: number }>;
  const teamLedger = teamLedgerRows as Array<{ points: number }>;
  const approvedRows = participantAssignments.filter(row => row.status === "approved");
  const periods = new Map<number, { total: number; approved: number }>();
  for (const row of participantAssignments) {
    const progress = periods.get(row.periodId) ?? { total: 0, approved: 0 };
    progress.total += 1;
    if (row.status === "approved") progress.approved += 1;
    periods.set(row.periodId, progress);
  }
  const currentPeriod = input.periodId ? periods.get(input.periodId) ?? { total: 0, approved: 0 } : { total: 0, approved: 0 };
  const teamApprovedRows = teamAssignments.filter(row => row.status === "approved");

  return {
    approvedTasks: approvedRows.length,
    awardedPoints: participantLedger.reduce((sum, row) => sum + Number(row.points), 0),
    completedPeriods: Array.from(periods.values()).filter(period => period.total > 0 && period.approved >= period.total).length,
    teamApprovedTasks: teamApprovedRows.length,
    teamAwardedPoints: teamLedger.reduce((sum, row) => sum + Number(row.points), 0),
    teamContributors: new Set(teamApprovedRows.map(row => row.participantId)).size,
    periodApprovedTasks: currentPeriod.approved,
    periodTaskCount: currentPeriod.total,
    teamPeriodApprovedTasks: input.periodId ? teamApprovedRows.filter(row => row.periodId === input.periodId).length : 0,
  };
}

/** Read-only recognition. Completion bonus evaluation is intentionally separate and occurs only on an explicit approval transaction. */
export async function getReadOnlyParticipantAchievements(input: { participantId: number; teamId: number | null; periodId: number | null }) {
  return calculateAchievements(await getParticipantAchievementMetrics(input));
}
