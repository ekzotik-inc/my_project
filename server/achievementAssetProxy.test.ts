import { describe, expect, it } from "vitest";
import { getAchievementAssetKey } from "./achievementAssetProxy";

describe("achievement asset routing", () => {
  it("exposes only the fixed system sticker keys", () => {
    expect(getAchievementAssetKey("first_confirmed")).toContain("system/achievement-stickers/first_confirmed_");
    expect(getAchievementAssetKey("team_spark")).toContain("system/achievement-stickers/team_spark_");
    expect(getAchievementAssetKey("../../private-file")).toBeNull();
    expect(getAchievementAssetKey("unknown")).toBeNull();
  });
});
