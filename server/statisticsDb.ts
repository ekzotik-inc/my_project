import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { activityAssignments, activityPeriods, activities, participants, pointLedger, teams } from "../drizzle/schema";
import { getDb } from "./db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function getMiniAppStatistics(telegramUserId: string) {
  const db = await requireDb();
  const participantRows = await db.select().from(participants).where(and(eq(participants.telegramUserId, telegramUserId), eq(participants.status, "approved"))).limit(1);
  const participant = participantRows[0];
  if (!participant) throw new Error("Your participation is awaiting approval");
  const periodRows = await db.select().from(activityPeriods).where(eq(activityPeriods.status, "active")).limit(1);
  const period = periodRows[0] ?? null;
  if (!period) return { participant: { fullName: participant.fullName, teamName: null }, period: null, personal: { points: 0, approved: 0, reviewing: 0, total: 0 }, teams: [], topTeams: [], recentActions: [] };

  const participantTeam = participant.teamId ? await db.select({ name: teams.name }).from(teams).where(eq(teams.id, participant.teamId)).limit(1) : [];
  const assignments = await db.select({ status: activityAssignments.status }).from(activityAssignments).innerJoin(activities, eq(activityAssignments.activityId, activities.id)).where(and(eq(activityAssignments.participantId, participant.id), eq(activities.periodId, period.id)));
  const points = await db.select({ total: sql<number>`coalesce(sum(${pointLedger.points}), 0)` }).from(pointLedger).where(and(eq(pointLedger.participantId, participant.id), eq(pointLedger.periodId, period.id)));
  const teamPoints = await db
    .select({
      id: teams.id,
      name: teams.name,
      points: sql<number>`coalesce(sum(${pointLedger.points}), 0)`,
    })
    .from(teams)
    .leftJoin(participants, and(eq(participants.teamId, teams.id), eq(participants.status, "approved")))
    .leftJoin(pointLedger, and(eq(pointLedger.participantId, participants.id), eq(pointLedger.periodId, period.id)))
    .where(eq(teams.isActive, true))
    .groupBy(teams.id, teams.name)
    .orderBy(desc(sql`coalesce(sum(${pointLedger.points}), 0)`), asc(teams.name));
  const teamCompletions = await db
    .select({ id: teams.id, completed: sql<number>`coalesce(sum(case when ${activityAssignments.status} = 'approved' then 1 else 0 end), 0)` })
    .from(teams)
    .leftJoin(participants, and(eq(participants.teamId, teams.id), eq(participants.status, "approved")))
    .leftJoin(activityAssignments, eq(activityAssignments.participantId, participants.id))
    .leftJoin(activities, eq(activityAssignments.activityId, activities.id))
    .where(and(eq(teams.isActive, true), eq(activities.periodId, period.id)))
    .groupBy(teams.id);
  const completionByTeam = new Map(teamCompletions.map(row => [row.id, Number(row.completed)]));
  const teamRows = teamPoints.map(team => ({ ...team, points: Number(team.points), completed: completionByTeam.get(team.id) ?? 0 }));
  const recentActions = await db
    .select({ participantName: participants.fullName, teamName: teams.name, taskTitle: activities.title, status: activityAssignments.status, updatedAt: activityAssignments.updatedAt })
    .from(activityAssignments)
    .innerJoin(participants, eq(activityAssignments.participantId, participants.id))
    .leftJoin(teams, eq(participants.teamId, teams.id))
    .innerJoin(activities, eq(activityAssignments.activityId, activities.id))
    .where(and(eq(activities.periodId, period.id), inArray(activityAssignments.status, ["under_review", "approved", "rejected"])))
    .orderBy(desc(activityAssignments.updatedAt))
    .limit(20);
  return {
    participant: { fullName: participant.fullName, teamName: participantTeam[0]?.name ?? null },
    period: { title: period.title, startsAt: period.startsAt, endsAt: period.endsAt, taskCount: period.taskCount },
    personal: { points: Number(points[0]?.total ?? 0), approved: assignments.filter(item => item.status === "approved").length, reviewing: assignments.filter(item => item.status === "under_review").length, total: assignments.length },
    teams: teamRows,
    topTeams: teamRows.slice(0, 3),
    recentActions,
  };
}
