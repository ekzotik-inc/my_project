import { describe, expect, it } from "vitest";
import { verifyAdminPassword } from "./_core/localAuth";

describe("local administrator passwords", () => {
  it("accepts the configured Chief and P&C passwords and rejects an altered value", () => {
    expect(verifyAdminPassword("admin", process.env.CHIEF_ADMIN_PASSWORD ?? "")).toBe(true);
    expect(verifyAdminPassword("pc_admin", process.env.PC_ADMIN_PASSWORD ?? "")).toBe(true);
    expect(verifyAdminPassword("admin", `${process.env.CHIEF_ADMIN_PASSWORD ?? ""}-wrong`)).toBe(false);
  });
});
