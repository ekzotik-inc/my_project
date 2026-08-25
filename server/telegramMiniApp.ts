import crypto from "node:crypto";

export type TelegramMiniAppUser = { id: number; first_name?: string; last_name?: string; username?: string };

/** Verifies Telegram Mini App initData server-side before using its user identifier. */
export function verifyTelegramMiniAppInitData(initData: string): TelegramMiniAppUser {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram integration is not configured");
  const params = new URLSearchParams(initData);
  const providedHash = params.get("hash");
  const rawUser = params.get("user");
  if (!providedHash || !rawUser) throw new Error("Open Statistics from the Telegram bot menu");
  params.delete("hash");
  const dataCheckString = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const actualHash = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(actualHash), Buffer.from(providedHash))) throw new Error("Telegram authorization could not be verified");
  return JSON.parse(rawUser) as TelegramMiniAppUser;
}
