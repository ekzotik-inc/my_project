import { getParticipantByTelegramId } from "./telegramDb";

export type TelegramWorkspaceRole = "admin" | "pc_admin";

function configuredIds(value: string | undefined) {
  return new Set((value || "").split(",").map(item => item.trim()).filter(Boolean));
}

/** Resolves workspace access from server configuration and approved Telegram participant roles only. */
export async function getTelegramMiniAppWorkspaceRole(telegramUserId: string): Promise<TelegramWorkspaceRole | null> {
  if (telegramUserId === process.env.CHIEF_TELEGRAM_ID?.trim()) return "admin";
  if (configuredIds(process.env.PC_TELEGRAM_IDS).has(telegramUserId)) return "pc_admin";

  const participant = await getParticipantByTelegramId(telegramUserId);
  if (participant?.status !== "approved") return null;
  if (participant.role === "chief_admin") return "admin";
  if (participant.role === "pc_admin") return "pc_admin";
  return null;
}
