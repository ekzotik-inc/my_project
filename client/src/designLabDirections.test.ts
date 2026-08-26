import { describe, expect, it } from "vitest";
import { designDirections } from "./designLabDirections";

describe("design lab directions", () => {
  it("offers exactly three clearly differentiated directions", () => {
    expect(designDirections).toHaveLength(3);
    expect(new Set(designDirections.map((direction) => direction.id)).size).toBe(3);
    expect(new Set(designDirections.map((direction) => direction.name)).size).toBe(3);
  });

  it("keeps a decision-oriented description for every direction", () => {
    for (const direction of designDirections) {
      expect(direction.premise.length).toBeGreaterThan(40);
      expect(direction.strength.length).toBeGreaterThan(30);
      expect(direction.risk.length).toBeGreaterThan(30);
    }
  });
});
