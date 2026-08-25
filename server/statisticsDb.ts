import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { activityAssignments, activityPeriods, activities, participants, pointLedger, teams } from "../drizzle/schema";
import { getDb } from "./db";
import { getParticipantAchievements } from "./achievementsDb";

type ExperienceAssignment = { status: string; title: string };

export function deriveNextAction(assignments: ExperienceAssignment[]) {
  const rejected = assignments.find(item => item.status === "rejected");
  if (rejected) return { tone: "revise" as const, title: "Нужна небольшая доработка", body: `Откройте «${rejected.title}» в меню бота, дополните материалы и отправьте отчёт повторно.` };
  const available = assignments.find(item => item.status === "assigned" || item.status === "in_progress");
  if (available) return { tone: "start" as const, title: "Можно сделать доброе дело уже сейчас", body: `Откройте «${available.title}» в меню бота и пройдите шаги выполнения.` };
  if (assignments.some(item => item.status === "under_review")) return { tone: "review" as const, title: "Ваш результат уже на проверке", body: "P&C получила материалы. Мы пришлём сообщение, когда примем решение." };
  if (assignments.length === 0) return { tone: "wait" as const, title: "Задания появятся совсем скоро", body: "Как только P&C опубликует общие активности, бот пришлёт приглашение." };
  return { tone: "celebrate" as const, title: "Все задания периода подтверждены", body: "Спасибо за вклад — ваш результат уже усилил командный зачёт." };
}

export function getParticipantRank(participantId: number, leaderboard: Array<{ id: number }>) {
  const position = leaderboard.findIndex(item => item.id === participantId);
  return position >= 0 ? position + 1 : null;
}

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
  if (!period) {
    const achievements = await getParticipantAchievements({ participantId: participant.id, teamId: participant.teamId, periodId: null });
    return { participant: { fullName: participant.fullName, teamName: null, rank: null, totalParticipants: 0, teamRank: null }, period: null, personal: { points: 0, approved: 0, reviewing: 0, total: 0 }, achievements, nextAction: deriveNextAction([]), teams: [], topTeams: [], topParticipants: [], recentActions: [] };
  }

  const participantTeam = participant.teamId ? await db.select({ name: teams.name }).from(teams).where(eq(teams.id, participant.teamId)).limit(1) : [];
  const assignments = await db.select({ status: activityAssignments.status, title: activities.title }).from(activityAssignments).innerJoin(activities, eq(activityAssignments.activityId, activities.id)).where(and(eq(activityAssignments.participantId, participant.id), eq(activities.periodId, period.id)));
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
  const participantLeaderboard = await db
    .select({
      id: participants.id,
      fullName: participants.fullName,
      teamName: teams.name,
      points: sql<number>`coalesce(sum(${pointLedger.points}), 0)`,
    })
    .from(participants)
    .leftJoin(teams, eq(participants.teamId, teams.id))
    .leftJoin(pointLedger, and(eq(pointLedger.participantId, participants.id), eq(pointLedger.periodId, period.id)))
    .where(eq(participants.status, "approved"))
    .groupBy(participants.id, participants.fullName, teams.name)
    .orderBy(desc(sql`coalesce(sum(${pointLedger.points}), 0)`), asc(participants.fullName));
  const leaderboardRows = participantLeaderboard.map(item => ({ ...item, points: Number(item.points) }));
  const participantRank = getParticipantRank(participant.id, leaderboardRows);
  const teamRank = participant.teamId ? teamRows.findIndex(team => team.id === participant.teamId) + 1 : 0;
  const participantCount = await db.select({ total: count() }).from(participants).where(eq(participants.status, "approved"));
  const recentActions = await db
    .select({ participantName: participants.fullName, teamName: teams.name, taskTitle: activities.title, status: activityAssignments.status, updatedAt: activityAssignments.updatedAt })
    .from(activityAssignments)
    .innerJoin(participants, eq(activityAssignments.participantId, participants.id))
    .leftJoin(teams, eq(participants.teamId, teams.id))
    .innerJoin(activities, eq(activityAssignments.activityId, activities.id))
    .where(and(eq(activities.periodId, period.id), inArray(activityAssignments.status, ["under_review", "approved", "rejected"])))
    .orderBy(desc(activityAssignments.updatedAt))
    .limit(20);
  const achievements = await getParticipantAchievements({ participantId: participant.id, teamId: participant.teamId, periodId: period.id });
  return {
    participant: { fullName: participant.fullName, teamName: participantTeam[0]?.name ?? null, rank: participantRank, totalParticipants: Number(participantCount[0]?.total ?? 0), teamRank: teamRank || null },
    period: { title: period.title, startsAt: period.startsAt, endsAt: period.endsAt, taskCount: period.taskCount },
    personal: { points: Number(points[0]?.total ?? 0), approved: assignments.filter(item => item.status === "approved").length, reviewing: assignments.filter(item => item.status === "under_review").length, total: assignments.length },
    achievements,
    nextAction: deriveNextAction(assignments),
    teams: teamRows,
    topTeams: teamRows.slice(0, 3),
    topParticipants: leaderboardRows.slice(0, 10),
    recentActions,
  };
}
