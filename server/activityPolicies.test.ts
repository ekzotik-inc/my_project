import { describe, expect, it } from "vitest";
import { approveAfterModeration, submitForModeration } from "./activityPolicies";

describe("activity moderation policies", () => {
  it("keeps awarded points at zero when a participant submits a report", () => {
    expect(submitForModeration("in_progress")).toEqual({
      status: "under_review",
      awardedPoints: 0,
    });
  });

  it("awards configured points only after an explicit moderation approval", () => {
    expect(approveAfterModeration("under_review", 40)).toEqual({
      status: "approved",
      awardedPoints: 40,
      pointLedgerEvent: "report_approved",
    });
  });

  it("does not permit approval before a report is under review", () => {
    expect(() => approveAfterModeration("in_progress", 40)).toThrow(
      "Only a report awaiting moderation can be approved"
    );
  });
});
