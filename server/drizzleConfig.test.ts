import { describe, expect, it } from "vitest";
import { buildDrizzleCredentials } from "./_core/drizzleConfig";

describe("buildDrizzleCredentials", () => {
  const connectionUrl = "mysql://app%40user:pa%24%24word@tidb.example.com:4000/corporate_good_deeds";

  it("uses a URL-only configuration for local non-TLS databases", () => {
    expect(buildDrizzleCredentials(connectionUrl, false)).toEqual({
      url: connectionUrl,
    });
  });

  it("expands a TiDB connection into explicit TLS credentials", () => {
    expect(buildDrizzleCredentials(connectionUrl, true)).toEqual({
      host: "tidb.example.com",
      port: 4000,
      user: "app@user",
      password: "pa$$word",
      database: "corporate_good_deeds",
      ssl: { rejectUnauthorized: true },
    });
  });

  it("rejects a URL that omits the database name", () => {
    expect(() => buildDrizzleCredentials("mysql://app:pass@tidb.example.com:4000", true)).toThrow(
      "DATABASE_URL must include a host and database name"
    );
  });
});
