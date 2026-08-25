/**
 * Builds credentials for Drizzle Kit migrations. TiDB Cloud rejects plain
 * MySQL transport, so the production path must use explicit TLS parameters
 * rather than the URL-only shortcut used for local development.
 */
export function buildDrizzleCredentials(databaseUrl: string, useTls: boolean) {
  if (!useTls) {
    return { url: databaseUrl };
  }

  const parsed = new URL(databaseUrl);
  const database = parsed.pathname.replace(/^\//, "");

  if (!parsed.hostname || !database) {
    throw new Error("DATABASE_URL must include a host and database name");
  }

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    ssl: "require",
  };
}
