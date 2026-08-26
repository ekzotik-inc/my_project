import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname);
const source = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("achievement read-model isolation", () => {
  it("is absent from the Telegram webhook and never runs as a read-only display call during approval", () => {
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

  it("calls the bonus service only from explicit approve transactions, never submit or reject", () => {
    const telegramModeration = source("telegramDb.ts");
    const reviewModeration = source("reviewCenterDb.ts");
    const telegramSubmitPath = telegramModeration.slice(telegramModeration.indexOf("export async function submitActivityReport"), telegramModeration.indexOf("export async function moderateReport"));
    const telegramRejectPath = telegramModeration.slice(telegramModeration.indexOf('if (input.decision === "rejected")'), telegramModeration.indexOf("await db.transaction"));
    const reviewRejectPath = reviewModeration.slice(reviewModeration.indexOf('if (input.decision === "rejected")'), reviewModeration.indexOf("await db.transaction"));

    expect(telegramModeration).toContain("awardCatalogCompletionBonusInTransaction");
    expect(reviewModeration).toContain("awardCatalogCompletionBonusInTransaction");
    expect(telegramSubmitPath).not.toContain("awardCatalogCompletionBonusInTransaction");
    expect(telegramRejectPath).not.toContain("awardCatalogCompletionBonusInTransaction");
    expect(reviewRejectPath).not.toContain("awardCatalogCompletionBonusInTransaction");
  });
});
