import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyTelegramMiniAppInitData } from "./telegramMiniApp";

function createSignedInitData(user: { id: number; first_name: string }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required for this test");
  const params = new URLSearchParams({ auth_date: "1777777777", query_id: "test-query", user: JSON.stringify(user) });
  const payload = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  params.set("hash", crypto.createHmac("sha256", secret).update(payload).digest("hex"));
  return params.toString();
}

describe("Telegram Mini App authorization", () => {
  it("accepts init data signed by the configured bot token", () => {
    expect(verifyTelegramMiniAppInitData(createSignedInitData({ id: 842, first_name: "Alex" }))).toMatchObject({ id: 842, first_name: "Alex" });
  });

  it("rejects a changed user identifier", () => {
    const params = new URLSearchParams(createSignedInitData({ id: 842, first_name: "Alex" }));
    params.set("user", JSON.stringify({ id: 843, first_name: "Alex" }));
    expect(() => verifyTelegramMiniAppInitData(params.toString())).toThrow("Telegram authorization could not be verified");
  });
});
