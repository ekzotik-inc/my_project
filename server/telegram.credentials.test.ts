import { describe, expect, it } from "vitest";

type TelegramGetMeResponse = {
  ok: boolean;
  result?: {
    id: number;
    is_bot: boolean;
    username?: string;
  };
  description?: string;
};

describe("Telegram credentials", () => {
  it("authorizes the configured bot token", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    expect(token, "TELEGRAM_BOT_TOKEN must be configured").toBeTruthy();

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const body = (await response.json()) as TelegramGetMeResponse;

    expect(response.ok, body.description).toBe(true);
    expect(body.ok, body.description).toBe(true);
    expect(body.result?.is_bot).toBe(true);
    expect(body.result?.id).toBeTypeOf("number");
  }, 15_000);
});
