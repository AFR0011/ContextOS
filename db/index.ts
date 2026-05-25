import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize the database client.");
}

type PostgresClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  contextosPostgres?: PostgresClient;
};

const queryClient =
  globalForDb.contextosPostgres ??
  postgres(databaseUrl, {
    max: 1,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.contextosPostgres = queryClient;
}

export const db = drizzle(queryClient, { schema });
export { queryClient };
