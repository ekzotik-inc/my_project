import { describe, expect, it } from "vitest";
import { buildReviewAnalytics, resolveReviewDecision } from "./reviewCenterDb";

describe("review center moderation policy", () => {
  it("keeps points at zero when P&C returns a report for revision", () => {
    expect(resolveReviewDecision("under_review", "rejected", 50)).toEqual({ status: "rejected", awardedPoints: 0 });
  });

  it("awards configured points only after an explicit P&C approval", () => {
    expect(resolveReviewDecision("under_review", "approved", 50)).toMatchObject({ status: "approved", awardedPoints: 50 });
  });

  it("does not allow the web center to approve an unsubmitted report", () => {
    expect(() => resolveReviewDecision("in_progress", "approved", 50)).toThrow("Only a report awaiting moderation");
  });

  it("builds a real P&C pulse with top lists and workflow states without awarding points", () => {
    const analytics = buildReviewAnalytics({
      activePeriodTitle: "Неделя добрых дел",
      statusCounts: { assigned: 2, under_review: 1, approved: 3, rejected: 1 },
      teams: [{ id: 1, name: "Команда", memberCount: 2, assignedCount: 7, submittedCount: 5, approvedCount: 3, awardedPoints: 70 }],
      participants: [{ id: 1, name: "Алина", teamName: "Команда", assignedCount: 4, submittedCount: 3, approvedCount: 2, awardedPoints: 50, latestActivityAt: null }],
    });
    expect(analytics.topParticipants).toHaveLength(1);
    expect(analytics.topTeams).toHaveLength(1);
    expect(analytics.workflow.find(item => item.id === "under_review")?.count).toBe(1);
    expect(analytics.totalAwardedPoints).toBe(50);
    expect(analytics.completionRate).toBe(43);
  });
});
