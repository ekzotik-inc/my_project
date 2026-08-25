import { describe, expect, it } from "vitest";
import { getTelegramWebhookSecret } from "./telegramBot";

describe("getTelegramWebhookSecret", () => {
  it("uses a valid explicitly configured secret", () => {
    expect(getTelegramWebhookSecret("123:bot-token", "telegram_hook-2026")).toBe("telegram_hook-2026");
  });

  it("derives a stable Telegram-compatible secret when no explicit secret is configured", () => {
    const secret = getTelegramWebhookSecret("123:bot-token");

    expect(secret).toMatch(/^[A-Za-z0-9_-]{1,256}$/);
    expect(secret).toHaveLength(64);
    expect(secret).toBe(getTelegramWebhookSecret("123:bot-token"));
  });

  it("rejects an explicitly configured secret with unsupported characters", () => {
    expect(() => getTelegramWebhookSecret("123:bot-token", "bad:secret")).toThrow("TELEGRAM_WEBHOOK_SECRET");
  });
});
