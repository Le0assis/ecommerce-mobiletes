import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Database } from "./client";
import { applyMigrations, migrationFiles } from "./migrate";
import * as schema from "./schema";

/** Postgres em memória para o teste. Aplica 0000–0007 uma vez, salvo lista explícita. */
export async function openTestDatabase(files: readonly string[] = migrationFiles) {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;
  await applyMigrations(db, files);
  return {
    db,
    async close() {
      await client.close();
    },
  };
}
