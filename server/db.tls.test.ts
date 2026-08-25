import { describe, expect, it } from "vitest";
import { buildDatabasePoolOptions } from "./db";

describe("buildDatabasePoolOptions", () => {
  it("enables strict TLS verification for a TiDB Cloud connection", () => {
    const options = buildDatabasePoolOptions("mysql://user:password@example.com:4000/sys", true);

    expect(options).toEqual({
      uri: "mysql://user:password@example.com:4000/sys",
      ssl: { rejectUnauthorized: true },
    });
  });

  it("keeps the development connection free of an external TLS override", () => {
    const options = buildDatabasePoolOptions("mysql://localhost:3306/local", false);

    expect(options).toEqual({ uri: "mysql://localhost:3306/local" });
  });
});
