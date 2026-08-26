import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_CATALOG_COMPLETION_BONUS, resolveCatalogCompletionBonus } from "./achievementCompletionBonus";

describe("catalog completion bonus policy", () => {
  it("awards 200 points only when the full catalog is complete and no marker exists", () => {
    expect(resolveCatalogCompletionBonus({ catalogComplete: true, bonusAlreadyGranted: false })).toEqual({ shouldAward: true, points: ACHIEVEMENT_CATALOG_COMPLETION_BONUS });
  });

  it("does not award on incomplete catalog or a repeated completion check", () => {
    expect(resolveCatalogCompletionBonus({ catalogComplete: false, bonusAlreadyGranted: false })).toEqual({ shouldAward: false, points: 0 });
    expect(resolveCatalogCompletionBonus({ catalogComplete: true, bonusAlreadyGranted: true })).toEqual({ shouldAward: false, points: 0 });
  });
});
