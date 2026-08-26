import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_CATALOG_SIZE, calculateAchievements, isAchievementCatalogComplete, type AchievementMetrics } from "./achievementRules";

const baseMetrics: AchievementMetrics = {
  approvedTasks: 0,
  awardedPoints: 0,
  completedPeriods: 0,
  teamApprovedTasks: 0,
  teamAwardedPoints: 0,
  teamContributors: 0,
  periodApprovedTasks: 0,
  periodTaskCount: 4,
  teamPeriodApprovedTasks: 0,
};

describe("read-only achievement rules", () => {
  it("does not recognise a result before P&C approval", () => {
    expect(calculateAchievements(baseMetrics).every(item => !item.unlocked)).toBe(true);
  });

  it("recognises only values derived from already approved results and report-approved ledger points", () => {
    const ids = calculateAchievements({ ...baseMetrics, approvedTasks: 3, awardedPoints: 100, completedPeriods: 1, teamApprovedTasks: 5 })
      .filter(item => item.unlocked)
      .map(item => item.id);
    expect(ids).toEqual(["first_confirmed", "three_confirmed", "impact_100", "period_finisher", "team_first_spark", "team_spark"]);
  });

  it("defines exactly twenty achievable confirmed-only milestones", () => {
    const achievements = calculateAchievements({
      ...baseMetrics,
      approvedTasks: 20,
      awardedPoints: 1000,
      completedPeriods: 5,
      teamApprovedTasks: 30,
      teamAwardedPoints: 1000,
      teamContributors: 5,
    });
    expect(achievements).toHaveLength(20);
    expect(ACHIEVEMENT_CATALOG_SIZE).toBe(20);
    expect(isAchievementCatalogComplete(achievements)).toBe(true);
  });

  it("keeps catalog completion false while even one confirmed-only metric is below its target", () => {
    const achievements = calculateAchievements({
      ...baseMetrics,
      approvedTasks: 20,
      awardedPoints: 1000,
      completedPeriods: 5,
      teamApprovedTasks: 30,
      teamAwardedPoints: 1000,
      teamContributors: 4,
    });
    expect(isAchievementCatalogComplete(achievements)).toBe(false);
  });
});
