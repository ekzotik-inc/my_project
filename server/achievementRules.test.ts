import { describe, expect, it } from "vitest";
import { calculateAchievements } from "./achievementRules";

const baseMetrics = { approvedTasks: 0, awardedPoints: 0, periodApprovedTasks: 0, periodTaskCount: 4, teamPeriodApprovedTasks: 0 };

describe("read-only achievement rules", () => {
  it("does not recognise a result before P&C approval", () => {
    expect(calculateAchievements(baseMetrics).every(item => !item.unlocked)).toBe(true);
  });

  it("recognises only values derived from already approved results and ledger points", () => {
    const ids = calculateAchievements({ ...baseMetrics, approvedTasks: 3, awardedPoints: 100, periodApprovedTasks: 4, teamPeriodApprovedTasks: 5 })
      .filter(item => item.unlocked)
      .map(item => item.id);
    expect(ids).toEqual(["first_confirmed", "three_confirmed", "impact_100", "period_finisher", "team_spark"]);
  });
});

