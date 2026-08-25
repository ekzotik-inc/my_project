import { defineConfig } from "drizzle-kit";
import { buildDrizzleCredentials } from "./server/_core/drizzleConfig";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const useTls = process.env.DATABASE_SSL === "true";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    ...buildDrizzleCredentials(connectionString, useTls),
  },
});
