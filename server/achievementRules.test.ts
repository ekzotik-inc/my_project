import { describe, expect, it } from "vitest";
import { calculateAchievements, findNewAchievements } from "./achievementRules";

const emptyMetrics = {
  approvedTasks: 0,
  awardedPoints: 0,
  periodApprovedTasks: 0,
  periodTaskCount: 4,
  teamPeriodApprovedTasks: 0,
};

describe("achievement rules", () => {
  it("does not unlock an achievement before a report is approved", () => {
    const achievements = calculateAchievements(emptyMetrics);
    expect(achievements.every(item => !item.unlocked)).toBe(true);
  });

  it("unlocks personal and team achievements from confirmed metrics", () => {
    const achievements = calculateAchievements({ ...emptyMetrics, approvedTasks: 3, awardedPoints: 100, periodApprovedTasks: 4, teamPeriodApprovedTasks: 5 });
    expect(achievements.filter(item => item.unlocked).map(item => item.id)).toEqual(["first_confirmed", "three_confirmed", "impact_100", "period_finisher", "team_spark"]);
  });

  it("finds only achievements opened by the latest moderation decision", () => {
    const before = calculateAchievements({ ...emptyMetrics, approvedTasks: 2, awardedPoints: 80, periodApprovedTasks: 3, teamPeriodApprovedTasks: 4 });
    const after = calculateAchievements({ ...emptyMetrics, approvedTasks: 3, awardedPoints: 100, periodApprovedTasks: 4, teamPeriodApprovedTasks: 5 });
    expect(findNewAchievements(before, after).map(item => item.id)).toEqual(["three_confirmed", "impact_100", "period_finisher", "team_spark"]);
  });
});
