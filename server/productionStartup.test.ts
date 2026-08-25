import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("production server startup", () => {
  it("does not initialize Manus OAuth after the switch to local admin sessions", () => {
    const entrypoint = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");

    expect(entrypoint).not.toContain('import { registerOAuthRoutes } from "./oauth"');
    expect(entrypoint).not.toContain("registerOAuthRoutes(app)");
  });
});
