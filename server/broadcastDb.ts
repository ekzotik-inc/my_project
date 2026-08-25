import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { broadcastDeliveries, broadcasts, participants } from "../drizzle/schema";
import { sendBroadcastMessage } from "./telegramBot";
import { getTelegramSettings } from "./telegramDb";
import { getDb } from "./db";

export type BroadcastButton = { label: string; url: string };

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

function normalizeButtons(buttons: BroadcastButton[]) {
  return buttons.map(button => {
    const label = button.label.trim();
    const url = button.url.trim();
    if (!label || !url) throw new Error("Each button needs a label and URL");
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Button URLs must use HTTP or HTTPS");
    return { label, url: parsed.toString() };
  });
}

export async function getBroadcastRecipientCount(audience: "all_approved" | "teams", teamIds: number[]) {
  const db = await requireDb();
  if (audience === "teams") {
    if (teamIds.length === 0) return 0;
    const rows = await db.select({ value: count() }).from(participants).where(and(eq(participants.status, "approved"), inArray(participants.teamId, teamIds)));
    return rows[0]?.value ?? 0;
  }
  const rows = await db.select({ value: count() }).from(participants).where(eq(participants.status, "approved"));
  return rows[0]?.value ?? 0;
}

export async function createBroadcastDraft(input: {
  title: string;
  message: string;
  imageKey?: string | null;
  imageUrl?: string | null;
  audience: "all_approved" | "teams";
  teamIds: number[];
  buttons: BroadcastButton[];
}) {
  const db = await requireDb();
  const title = input.title.trim();
  const message = input.message.trim();
  if (!title || !message) throw new Error("Broadcast title and message are required");
  if (input.audience === "teams" && input.teamIds.length === 0) throw new Error("Choose at least one team for a team broadcast");
  const buttons = normalizeButtons(input.buttons);
  await db.insert(broadcasts).values({
    title,
    message,
    imageKey: input.imageKey || null,
    imageUrl: input.imageUrl || null,
    audience: input.audience,
    teamIds: input.teamIds,
    buttons,
    status: "draft",
  });
  const rows = await db.select().from(broadcasts).where(eq(broadcasts.title, title)).orderBy(desc(broadcasts.id)).limit(1);
  return rows[0]!;
}

export async function listBroadcasts() {
  const db = await requireDb();
  return db.select().from(broadcasts).orderBy(desc(broadcasts.createdAt));
}

export async function deliverBroadcast(broadcastId: number) {
  const db = await requireDb();
  const broadcastsRows = await db.select().from(broadcasts).where(eq(broadcasts.id, broadcastId)).limit(1);
  const broadcast = broadcastsRows[0];
  if (!broadcast) throw new Error("Broadcast was not found");
  if (broadcast.status === "sent") throw new Error("This broadcast was already sent");
  const teamIds = Array.isArray(broadcast.teamIds) ? broadcast.teamIds.map(Number).filter(Number.isInteger) : [];
  const buttons = Array.isArray(broadcast.buttons) ? (broadcast.buttons as BroadcastButton[]) : [];
  const recipients = broadcast.audience === "teams"
    ? teamIds.length ? await db.select().from(participants).where(and(eq(participants.status, "approved"), inArray(participants.teamId, teamIds))) : []
    : await db.select().from(participants).where(eq(participants.status, "approved"));
  const settings = await getTelegramSettings();
  const imageUrl = broadcast.imageKey && settings?.webAppUrl ? new URL(broadcast.imageUrl || `/manus-storage/${broadcast.imageKey}`, settings.webAppUrl).toString() : null;
  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    try {
      const result = await sendBroadcastMessage({ chatId: recipient.telegramChatId, message: broadcast.message, imageUrl, buttons });
      await db.insert(broadcastDeliveries).values({ broadcastId, participantId: recipient.id, telegramMessageId: String(result.message_id), status: "sent" });
      sent += 1;
    } catch (error) {
      await db.insert(broadcastDeliveries).values({ broadcastId, participantId: recipient.id, status: "failed", errorMessage: error instanceof Error ? error.message : "Unknown delivery error" });
      failed += 1;
    }
  }
  await db.update(broadcasts).set({ status: "sent", sentAt: new Date() }).where(eq(broadcasts.id, broadcastId));
  return { sent, failed, total: recipients.length };
}
