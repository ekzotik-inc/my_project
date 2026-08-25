import { and, count, eq, sql } from "drizzle-orm";
import { activityAssignments, activities, participants, pointLedger } from "../drizzle/schema";
import { calculateAchievements } from "./achievementRules";
import { getDb } from "./db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function getParticipantAchievements(input: { participantId: number; teamId: number | null; periodId: number | null }) {
  const db = await requireDb();
  const [lifetimeApproved, lifetimePoints] = await Promise.all([
    db.select({ total: count() }).from(activityAssignments).where(and(eq(activityAssignments.participantId, input.participantId), eq(activityAssignments.status, "approved"))),
    db.select({ total: sql<number>`coalesce(sum(${pointLedger.points}), 0)` }).from(pointLedger).where(eq(pointLedger.participantId, input.participantId)),
  ]);

  if (!input.periodId) {
    return calculateAchievements({
      approvedTasks: Number(lifetimeApproved[0]?.total ?? 0),
      awardedPoints: Number(lifetimePoints[0]?.total ?? 0),
      periodApprovedTasks: 0,
      periodTaskCount: 0,
      teamPeriodApprovedTasks: 0,
    });
  }

  const [periodProgress, teamProgress] = await Promise.all([
    db
      .select({
        total: count(),
        approved: sql<number>`coalesce(sum(case when ${activityAssignments.status} = 'approved' then 1 else 0 end), 0)`,
      })
      .from(activityAssignments)
      .innerJoin(activities, eq(activityAssignments.activityId, activities.id))
      .where(and(eq(activityAssignments.participantId, input.participantId), eq(activities.periodId, input.periodId))),
    input.teamId
      ? db
          .select({ total: count() })
          .from(activityAssignments)
          .innerJoin(activities, eq(activityAssignments.activityId, activities.id))
          .innerJoin(participants, eq(activityAssignments.participantId, participants.id))
          .where(and(eq(participants.teamId, input.teamId), eq(activityAssignments.status, "approved"), eq(activities.periodId, input.periodId)))
      : Promise.resolve([{ total: 0 }]),
  ]);

  return calculateAchievements({
    approvedTasks: Number(lifetimeApproved[0]?.total ?? 0),
    awardedPoints: Number(lifetimePoints[0]?.total ?? 0),
    periodApprovedTasks: Number(periodProgress[0]?.approved ?? 0),
    periodTaskCount: Number(periodProgress[0]?.total ?? 0),
    teamPeriodApprovedTasks: Number(teamProgress[0]?.total ?? 0),
  });
}
