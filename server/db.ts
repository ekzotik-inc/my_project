import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import {
  activityAssignments,
  activityPeriods,
  activities,
  InsertUser,
  participants,
  teams,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export function buildDatabasePoolOptions(databaseUrl: string, useTls: boolean) {
  return {
    uri: databaseUrl,
    ...(useTls ? { ssl: { rejectUnauthorized: true } } : {}),
  };
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool(
        buildDatabasePoolOptions(process.env.DATABASE_URL, process.env.DATABASE_SSL === "true"),
      );
      _db = drizzle({ client: pool });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function listTeams() {
  const db = await requireDb();
  return db.select().from(teams).orderBy(asc(teams.name));
}

export async function createTeam(input: { name: string; description?: string }) {
  const db = await requireDb();
  const name = input.name.trim();
  if (!name) throw new Error("Team name is required");

  await db.insert(teams).values({
    name,
    description: input.description?.trim() || null,
  });
}

export async function updateTeam(input: { id: number; name: string; description?: string }) {
  const db = await requireDb();
  const name = input.name.trim();
  if (!name) throw new Error("Team name is required");
  await db.update(teams).set({ name, description: input.description?.trim() || null }).where(eq(teams.id, input.id));
}

export async function archiveTeam(teamId: number) {
  const db = await requireDb();
  await db.update(teams).set({ isActive: false }).where(eq(teams.id, teamId));
}

export async function listActivityPeriods() {
  const db = await requireDb();
  return db.select().from(activityPeriods).orderBy(desc(activityPeriods.startsAt));
}

export async function createActivityPeriod(input: {
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  status: "draft" | "active";
}) {
  const db = await requireDb();
  const title = input.title.trim();
  if (!title) throw new Error("Period title is required");
  if (input.endsAt <= input.startsAt) throw new Error("Period end must be later than its start");

  if (input.status === "active") {
    const existing = await db
      .select({ id: activityPeriods.id })
      .from(activityPeriods)
      .where(eq(activityPeriods.status, "active"))
      .limit(1);
    if (existing.length > 0) throw new Error("Only one activity period may be active at a time");
  }

  await db.insert(activityPeriods).values({
    title,
    description: input.description?.trim() || null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    status: input.status,
  });
}

export async function listParticipantsForAdmin() {
  const db = await requireDb();
  return db
    .select({
      id: participants.id,
      telegramUsername: participants.telegramUsername,
      fullName: participants.fullName,
      phone: participants.phone,
      status: participants.status,
      role: participants.role,
      createdAt: participants.createdAt,
      teamName: teams.name,
    })
    .from(participants)
    .leftJoin(teams, eq(participants.teamId, teams.id))
    .orderBy(desc(participants.createdAt));
}

export async function getAdminOverview() {
  const db = await requireDb();
  const [participantTotal, pendingTotal, teamTotal, activePeriodTotal, taskTotal, reviewTotal] = await Promise.all([
    db.select({ value: count() }).from(participants),
    db.select({ value: count() }).from(participants).where(eq(participants.status, "pending")),
    db.select({ value: count() }).from(teams).where(eq(teams.isActive, true)),
    db.select({ value: count() }).from(activityPeriods).where(eq(activityPeriods.status, "active")),
    db.select({ value: count() }).from(activities).where(eq(activities.status, "published")),
    db.select({ value: count() }).from(activityAssignments).where(eq(activityAssignments.status, "under_review")),
  ]);

  return {
    participants: participantTotal[0]?.value ?? 0,
    pendingParticipants: pendingTotal[0]?.value ?? 0,
    activeTeams: teamTotal[0]?.value ?? 0,
    activePeriods: activePeriodTotal[0]?.value ?? 0,
    publishedActivities: taskTotal[0]?.value ?? 0,
    reportsAwaitingReview: reviewTotal[0]?.value ?? 0,
  };
}

export async function getCommunicationDigest() {
  const db = await requireDb();
  const [pendingRegistrations, reportsAwaitingReview, participantsReady, assignmentsWaiting, activePeriodRows, participantsWithFirstBadge] = await Promise.all([
    db.select({ value: count() }).from(participants).where(eq(participants.status, "pending")),
    db.select({ value: count() }).from(activityAssignments).where(eq(activityAssignments.status, "under_review")),
    db.select({ value: count() }).from(participants).where(eq(participants.status, "approved")),
    db.select({ value: count() }).from(activityAssignments).where(eq(activityAssignments.status, "assigned")),
    db.select({ id: activityPeriods.id, title: activityPeriods.title, endsAt: activityPeriods.endsAt, taskCount: activityPeriods.taskCount }).from(activityPeriods).where(eq(activityPeriods.status, "active")).limit(1),
    db.select({ value: sql<number>`count(distinct ${activityAssignments.participantId})` }).from(activityAssignments).innerJoin(participants, eq(activityAssignments.participantId, participants.id)).where(and(eq(activityAssignments.status, "approved"), eq(participants.status, "approved"))),
  ]);
  const activePeriod = activePeriodRows[0] ?? null;
  const teamProgress = activePeriod
    ? await db
        .select({ name: teams.name, completed: count() })
        .from(teams)
        .innerJoin(participants, and(eq(participants.teamId, teams.id), eq(participants.status, "approved")))
        .innerJoin(activityAssignments, and(eq(activityAssignments.participantId, participants.id), eq(activityAssignments.status, "approved")))
        .innerJoin(activities, and(eq(activities.id, activityAssignments.activityId), eq(activities.periodId, activePeriod.id)))
        .where(eq(teams.isActive, true))
        .groupBy(teams.id, teams.name)
        .orderBy(desc(count()), asc(teams.name))
        .limit(1)
    : [];
  const approvedParticipants = Number(participantsReady[0]?.value ?? 0);
  const firstBadgeOwners = Number(participantsWithFirstBadge[0]?.value ?? 0);
  const leadingTeam = teamProgress[0] ? { name: teamProgress[0].name, completed: Number(teamProgress[0].completed), target: 5 } : null;

  return {
    pendingRegistrations: Number(pendingRegistrations[0]?.value ?? 0),
    reportsAwaitingReview: Number(reportsAwaitingReview[0]?.value ?? 0),
    approvedParticipants,
    assignmentsWaiting: Number(assignmentsWaiting[0]?.value ?? 0),
    activePeriod: activePeriod ? { title: activePeriod.title, endsAt: activePeriod.endsAt, taskCount: activePeriod.taskCount } : null,
    achievements: {
      participantsWithFirstBadge: firstBadgeOwners,
      participantsWithoutFirstBadge: Math.max(approvedParticipants - firstBadgeOwners, 0),
      leadingTeam,
    },
  };
}
