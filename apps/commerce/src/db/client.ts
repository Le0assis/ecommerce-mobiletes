import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

export function createDatabase(url: string, options: { connectTimeoutSeconds?: number } = {}): { db: Database; close: () => Promise<void> } {
  const client = postgres(url, { max: 5, connect_timeout: options.connectTimeoutSeconds });
  return {
    db: drizzle(client, { schema }),
    close: () => client.end({ timeout: 5 }),
  };
}
