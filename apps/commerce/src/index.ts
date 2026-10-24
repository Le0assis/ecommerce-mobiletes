import { serve } from "@hono/node-server";
import { sql } from "drizzle-orm";
import { createApp } from "./app";
import { createCatalog } from "./catalog-store";
import { createDatabase } from "./db/client";
import { applyMigrations, publicationMigrations } from "./db/migrate";
import { createPostgresCatalog } from "./db/postgres-catalog";
import { loadEnvFile, productionAdminTokenError, productionDatabaseError } from "./env";

loadEnvFile();
const refused = productionAdminTokenError() ?? productionDatabaseError();
if (refused) {
  console.error(JSON.stringify({ msg: "boot_recusado", message: refused }));
  process.exit(1);
}

async function openCatalog() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return { catalog: createCatalog(), persistent: false as const, db: undefined };
  try {
    const opened = createDatabase(url, { connectTimeoutSeconds: 5 });
    await opened.db.execute(sql`select 1`);
    await applyMigrations(opened.db, publicationMigrations);
    return { catalog: createPostgresCatalog(opened.db), persistent: true as const, db: opened.db };
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "catalogo_indisponivel",
        message: error instanceof Error ? error.message : "falha",
      }),
    );
    return { catalog: createCatalog(), persistent: false as const, db: undefined };
  }
}

const port = Number(process.env.PORT ?? 8787);
const opened = await openCatalog();
if (process.env.NODE_ENV === "production" && !opened.persistent) {
  console.error(JSON.stringify({ msg: "boot_recusado", message: "Postgres indisponível. A API não sobe em produção." }));
  process.exit(1);
}
const app = createApp({
  catalog: opened.catalog,
  persistent: opened.persistent,
  db: opened.db,
});

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(
    JSON.stringify({
      msg: "commerce_up",
      port: info.port,
      persistence: opened.persistent ? "postgres" : "memoria",
      redis: Boolean(process.env.REDIS_URL),
      search: process.env.MEILI_HOST ? "meilisearch" : "memoria",
    }),
  );
});
