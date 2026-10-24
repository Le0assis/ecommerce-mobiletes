import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import type { Database } from "./client";

const directory = dirname(fileURLToPath(import.meta.url));

export const migrationFiles = [
  "0000_bumpy_turbo.sql",
  "0001_autopropelidos_catalog.sql",
  "0002_banners_imagem.sql",
  "0003_catalogo_integridade.sql",
  "0004_products_habilitacao_ficha.sql",
  "0005_product_specs_numeric.sql",
  "0006_consultas_loja.sql",
  "0007_acesso_operacao.sql",
  "0008_public_id_restante.sql",
] as const;

/** 0004 em diante entram no arranque. Cada arquivo roda uma vez; o livro está em schema_migrations. */
export const publicationMigrations = [
  "0004_products_habilitacao_ficha.sql",
  "0005_product_specs_numeric.sql",
  "0006_consultas_loja.sql",
  "0007_acesso_operacao.sql",
  "0008_public_id_restante.sql",
] as const;

export function readMigration(name: string) {
  return readFileSync(join(directory, "../../drizzle", name), "utf8");
}

export function migrationStatements(source: string) {
  return source
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export function migrationChecksum(name: string) {
  return createHash("sha256").update(readMigration(name)).digest("hex");
}

type SqlClient = Pick<Database, "execute">;

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) {
    return result.rows as Record<string, unknown>[];
  }
  return [];
}

async function exists(db: SqlClient, query: ReturnType<typeof sql>) {
  const rows = rowsOf(await db.execute(query));
  return rows.length > 0 && rows[0]?.ok !== false && rows[0]?.ok !== null && rows[0]?.rel !== null;
}

/** Marca de schema. 0008 só altera dado, então não entra aqui e roda uma vez. */
async function schemaAlreadyHas(db: SqlClient, name: string) {
  switch (name) {
    case "0000_bumpy_turbo.sql":
      return exists(db, sql`select to_regclass('public.customers') as rel`);
    case "0001_autopropelidos_catalog.sql":
      return exists(db, sql`select to_regclass('public.product_specs') as rel`);
    case "0002_banners_imagem.sql":
      return exists(
        db,
        sql`select 1 as ok from information_schema.columns where table_schema = 'public' and table_name = 'banners' and column_name = 'image_url'`,
      );
    case "0003_catalogo_integridade.sql":
      return exists(db, sql`select 1 as ok from pg_indexes where schemaname = 'public' and indexname = 'damages_public_open_idx'`);
    case "0004_products_habilitacao_ficha.sql":
      return (
        (await exists(
          db,
          sql`select 1 as ok from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'is_enabled'`,
        )) &&
        (await exists(db, sql`select 1 as ok from pg_constraint where conname = 'product_specs_power_nominal_w_bounds'`)) &&
        !(await exists(db, sql`select 1 as ok from pg_constraint where conname = 'product_specs_measures_non_negative'`))
      );
    case "0005_product_specs_numeric.sql":
      return exists(
        db,
        sql`select 1 as ok from information_schema.columns where table_schema = 'public' and table_name = 'product_specs' and column_name = 'power_nominal_w' and data_type = 'numeric'`,
      );
    case "0006_consultas_loja.sql":
      return (
        (await exists(db, sql`select 1 as ok from pg_indexes where schemaname = 'public' and indexname = 'products_public_listing_idx'`)) &&
        (await exists(db, sql`select 1 as ok from pg_constraint where conname = 'orders_money_non_negative'`))
      );
    case "0007_acesso_operacao.sql":
      return (
        (await exists(db, sql`select to_regclass('public.color_stock') as rel`)) &&
        (await exists(db, sql`select to_regclass('public.sessions') as rel`)) &&
        (await exists(
          db,
          sql`select 1 as ok from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'public_id'`,
        ))
      );
    default:
      return false;
  }
}

const ledgerSql = sql`create table if not exists schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now(),
  checksum text not null
)`;

async function record(db: SqlClient, name: string) {
  await db.execute(sql`insert into schema_migrations (name, checksum) values (${name}, ${migrationChecksum(name)})`);
}

/**
 * Aplica cada arquivo uma vez. O lock vale a transação.
 * Banco que já tem o objeto só ganha a linha no livro, sem rodar o SQL de novo.
 */
export async function applyMigrations(db: Database, files: readonly string[]) {
  for (const name of files) {
    await db.transaction(async (tx) => {
      const client = tx as unknown as SqlClient;
      await client.execute(sql`select pg_advisory_xact_lock(hashtext('lume_schema_migrations'))`);
      await client.execute(ledgerSql);
      const recorded = rowsOf(await client.execute(sql`select name from schema_migrations where name = ${name}`));
      if (recorded.length > 0) return;
      if (await schemaAlreadyHas(client, name)) {
        await record(client, name);
        return;
      }
      for (const statement of migrationStatements(readMigration(name))) {
        await client.execute(sql.raw(statement));
      }
      await record(client, name);
    });
  }
}
