import { describe, expect, it } from "vitest";
import { resolveReviewDecision } from "./reviewCenterDb";

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
});
