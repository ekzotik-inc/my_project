import { and, asc, count, desc, eq } from "drizzle-orm";
import { activityAssignments, activities, activityPeriods, activitySteps, participants } from "../drizzle/schema";
import { getDb } from "./db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export type ActivityStepInput = {
  instruction: string;
  inputType: "photo" | "file" | "text" | "mixed";
  isRequired: boolean;
};

export async function listActivitiesForAdmin(periodId?: number) {
  const db = await requireDb();
  const query = db
    .select({
      id: activities.id,
      periodId: activities.periodId,
      title: activities.title,
      description: activities.description,
      points: activities.points,
      coverImageUrl: activities.coverImageUrl,
      status: activities.status,
      displayOrder: activities.displayOrder,
      createdAt: activities.createdAt,
      periodTitle: activityPeriods.title,
    })
    .from(activities)
    .innerJoin(activityPeriods, eq(activities.periodId, activityPeriods.id));
  const rows = periodId ? await query.where(eq(activities.periodId, periodId)).orderBy(asc(activities.displayOrder)) : await query.orderBy(desc(activities.createdAt));
  return rows;
}

export async function assignPublishedActivitiesToParticipant(participantId: number) {
  const db = await requireDb();
  const activePeriods = await db.select({ id: activityPeriods.id }).from(activityPeriods).where(eq(activityPeriods.status, "active"));
  if (activePeriods.length === 0) return 0;
  const activePeriodId = activePeriods[0].id;
  const published = await db.select({ id: activities.id }).from(activities).where(and(eq(activities.periodId, activePeriodId), eq(activities.status, "published")));
  let created = 0;
  for (const activity of published) {
    const exists = await db.select({ id: activityAssignments.id }).from(activityAssignments).where(and(eq(activityAssignments.activityId, activity.id), eq(activityAssignments.participantId, participantId))).limit(1);
    if (exists[0]) continue;
    await db.insert(activityAssignments).values({ activityId: activity.id, participantId });
    created += 1;
  }
  return created;
}

export async function createActivityAndAssignAll(input: {
  periodId: number;
  title: string;
  description: string;
  points: number;
  coverImageKey?: string | null;
  coverImageUrl?: string | null;
  steps: ActivityStepInput[];
}) {
  const db = await requireDb();
  const title = input.title.trim();
  if (!title || !input.description.trim()) throw new Error("Title and description are required");
  if (!Number.isInteger(input.points) || input.points < 0) throw new Error("Points must be a non-negative integer");
  const validSteps = input.steps.map(step => ({ ...step, instruction: step.instruction.trim() })).filter(step => step.instruction);
  if (validSteps.length === 0) throw new Error("Add at least one completion step");
  const period = await db.select().from(activityPeriods).where(eq(activityPeriods.id, input.periodId)).limit(1);
  if (!period[0]) throw new Error("Activity period was not found");

  const currentCount = await db.select({ value: count() }).from(activities).where(eq(activities.periodId, input.periodId));
  await db.insert(activities).values({ periodId: input.periodId, title, description: input.description.trim(), points: input.points, coverImageKey: input.coverImageKey || null, coverImageUrl: input.coverImageUrl || null, status: "published", displayOrder: currentCount[0]?.value ?? 0 });
  const inserted = await db.select().from(activities).where(and(eq(activities.periodId, input.periodId), eq(activities.title, title))).orderBy(desc(activities.id)).limit(1);
  const activity = inserted[0];
  if (!activity) throw new Error("Activity could not be created");
  await db.insert(activitySteps).values(validSteps.map((step, index) => ({ activityId: activity.id, stepOrder: index + 1, instruction: step.instruction, inputType: step.inputType, isRequired: step.isRequired })));

  const approvedParticipants = await db.select({ id: participants.id }).from(participants).where(eq(participants.status, "approved"));
  if (approvedParticipants.length > 0) await db.insert(activityAssignments).values(approvedParticipants.map(participant => ({ activityId: activity.id, participantId: participant.id })));
  await db.update(activityPeriods).set({ taskCount: (currentCount[0]?.value ?? 0) + 1 }).where(eq(activityPeriods.id, input.periodId));
  return { activity, period: period[0], assignedCount: approvedParticipants.length };
}
