import { and, desc, eq, lt } from "drizzle-orm";
import { activities, activityAssignments, participants, reportAttachments, reportStepResponses, teams } from "../drizzle/schema";
import { getDb } from "./db";

export type GalleryAttachmentRow = {
  attachmentId: number;
  assignmentStatus: string;
  attachmentKind: string;
  imageUrl: string;
  activityTitle: string;
  teamName: string | null;
  createdAt: Date;
};

export function toApprovedGalleryPage(rows: GalleryAttachmentRow[], limit: number) {
  const allowed = rows.filter(row => row.assignmentStatus === "approved" && row.attachmentKind === "photo" && Boolean(row.imageUrl));
  const visible = allowed.slice(0, limit);
  const next = allowed[limit];
  return {
    items: visible.map(row => ({ id: row.attachmentId, imageUrl: row.imageUrl, activityTitle: row.activityTitle, teamName: row.teamName, createdAt: row.createdAt })),
    nextCursor: next ? visible.at(-1)?.attachmentId ?? null : null,
  };
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function getApprovedGalleryFeed(input: { viewerTelegramUserId: string; cursor?: number; limit: number }) {
  const db = await requireDb();
  const viewer = await db
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.telegramUserId, input.viewerTelegramUserId), eq(participants.status, "approved")))
    .limit(1);
  if (!viewer[0]) throw new Error("Your participation is awaiting approval");

  const rows = await db
    .select({
      attachmentId: reportAttachments.id,
      assignmentStatus: activityAssignments.status,
      attachmentKind: reportAttachments.kind,
      imageUrl: reportAttachments.url,
      activityTitle: activities.title,
      teamName: teams.name,
      createdAt: reportAttachments.createdAt,
    })
    .from(reportAttachments)
    .innerJoin(reportStepResponses, eq(reportAttachments.responseId, reportStepResponses.id))
    .innerJoin(activityAssignments, eq(reportStepResponses.assignmentId, activityAssignments.id))
    .innerJoin(activities, eq(activityAssignments.activityId, activities.id))
    .innerJoin(participants, eq(activityAssignments.participantId, participants.id))
    .leftJoin(teams, eq(participants.teamId, teams.id))
    .where(and(eq(activityAssignments.status, "approved"), eq(participants.status, "approved"), eq(reportAttachments.kind, "photo"), input.cursor ? lt(reportAttachments.id, input.cursor) : undefined))
    .orderBy(desc(reportAttachments.id))
    .limit(input.limit + 1);

  return toApprovedGalleryPage(rows, input.limit);
}
