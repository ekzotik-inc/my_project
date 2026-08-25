export type AssignmentWorkflowStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "expired";

export type SubmissionTransition = {
  status: "under_review";
  awardedPoints: 0;
};

/**
 * A report is never worth points at submission time. It only becomes available
 * to a moderator and explicitly preserves zero awarded points.
 */
export function submitForModeration(currentStatus: AssignmentWorkflowStatus): SubmissionTransition {
  if (currentStatus !== "assigned" && currentStatus !== "in_progress" && currentStatus !== "rejected") {
    throw new Error("This assignment cannot be submitted in its current state");
  }

  return { status: "under_review", awardedPoints: 0 };
}

export type ApprovalTransition = {
  status: "approved";
  awardedPoints: number;
  pointLedgerEvent: "report_approved";
};

/** The sole workflow transition that can award an activity's configured points. */
export function approveAfterModeration(
  currentStatus: AssignmentWorkflowStatus,
  activityPoints: number
): ApprovalTransition {
  if (currentStatus !== "under_review") {
    throw new Error("Only a report awaiting moderation can be approved");
  }
  if (!Number.isInteger(activityPoints) || activityPoints < 0) {
    throw new Error("Activity points must be a non-negative integer");
  }

  return {
    status: "approved",
    awardedPoints: activityPoints,
    pointLedgerEvent: "report_approved",
  };
}

export function rejectAfterModeration(currentStatus: AssignmentWorkflowStatus) {
  if (currentStatus !== "under_review") {
    throw new Error("Only a report awaiting moderation can be rejected");
  }
  return { status: "rejected" as const, awardedPoints: 0 };
}
