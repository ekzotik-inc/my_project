import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function signedInitData(user: { id: number; first_name: string }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN must be configured for this test");
  const params = new URLSearchParams({ auth_date: "1700000000", query_id: "test-query", user: JSON.stringify(user) });
  const dataCheckString = Array.from(params.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  params.set("hash", crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex"));
  return params.toString();
}

describe("Telegram Mini App workspace access", () => {
  it("opens the Chief workspace only for the configured signed Telegram ID", async () => {
    const configuredChiefId = process.env.CHIEF_TELEGRAM_ID;
    expect(configuredChiefId).toMatch(/^\d+$/);
    const chiefId = Number(configuredChiefId);
    const ctx = { user: null, req: { headers: {} }, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.miniApp.access({ initData: signedInitData({ id: chiefId, first_name: "Chief" }) })).resolves.toMatchObject({ workspaceRole: "admin" });
  });
});
