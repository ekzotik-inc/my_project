import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname);
const source = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("achievement read-model isolation", () => {
  it("is absent from the Telegram webhook and approval transaction", () => {
    const webhook = source("telegramBot.ts");
    const moderation = source("telegramDb.ts");

    expect(webhook).not.toContain("achievementReadModel");
    expect(webhook).not.toContain("getReadOnlyParticipantAchievements");
    expect(moderation).not.toContain("achievementReadModel");
    expect(moderation).not.toContain("getReadOnlyParticipantAchievements");
  });

  it("is consumed only by read-only participant statistics", () => {
    const statistics = source("statisticsDb.ts");
    expect(statistics).toContain("getReadOnlyParticipantAchievements");
    expect(statistics).not.toContain("transaction(async");
  });
});
