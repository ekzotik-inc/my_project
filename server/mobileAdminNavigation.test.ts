import { describe, expect, it } from "vitest";
import { mobileAdminQuickPaths } from "../client/src/lib/mobileAdminNavigation";

describe("mobileAdminQuickPaths", () => {
  it("держит для Chief обзор, очередь и публикацию заданий в зоне большого пальца", () => {
    expect(mobileAdminQuickPaths("admin")).toEqual(["/", "/review", "/activities"]);
  });

  it("держит для P&C обзор, очередь и заявки участников", () => {
    expect(mobileAdminQuickPaths("pc_admin")).toEqual(["/", "/review", "/participants"]);
  });
});
