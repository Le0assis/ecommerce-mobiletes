import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import type { Database } from "./client";

const directory = dirname(fileURLToPath(import.meta.url));
const bundledMigrationsDirectory = join(directory, "../../drizzle");

/** `LUME_MIGRATIONS_DIR` só troca a pasta no teste de arranque. No processo normal vale `drizzle/`. */
function migrationsDirectory() {
  const override = process.env.LUME_MIGRATIONS_DIR?.trim();
  return override || bundledMigrationsDirectory;
}
const migrationName = /^\d{4}[_-].+\.sql$/;

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationError";
  }
}

/** Arquivos `NNNN_nome.sql` ou `NNNN-nome.sql`, em ordem. Qualquer outro `.sql` falha. */
export function discoverMigrations(folder = migrationsDirectory()) {
  const sqlFiles = readdirSync(folder).filter((name) => name.endsWith(".sql"));
  const invalid = sqlFiles.filter((name) => !migrationName.test(name)).sort();
  if (invalid.length > 0) {
    throw new MigrationError(
      `Arquivo de migração fora do padrão NNNN_nome.sql ou NNNN-nome.sql: ${invalid.join(", ")}.`,
    );
  }
  return sqlFiles.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function loadBootMigrations() {
  try {
    return { files: discoverMigrations(migrationsDirectory()), error: null as string | null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha";
    return { files: [] as string[], error: message };
  }
}

const bootMigrations = loadBootMigrations();
export const migrationFiles = bootMigrations.files;
/** Nome fora do padrão. O arranque sai com `boot_recusado` e não imprime stack. */
export const migrationBootError = bootMigrations.error;

/** Arranque: do 0000 ao último arquivo. Banco vazio roda o 0000; banco que já tem o schema só registra. */
export const publicationMigrations = migrationFiles.filter((name) => name >= "0000");

export function readMigration(name: string, folder = migrationsDirectory()) {
  return readFileSync(join(folder, name), "utf8");
}

export function migrationStatements(source: string) {
  return source
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export function migrationChecksum(name: string, folder = migrationsDirectory()) {
  return createHash("sha256").update(readMigration(name, folder)).digest("hex");
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
    case "0009_public_id_gatilho.sql":
      return (
        (await exists(
          db,
          sql`select 1 as ok from pg_proc as proc join pg_namespace as ns on ns.oid = proc.pronamespace where proc.proname = 'orders_public_id_from_payload' and ns.nspname = 'public'`,
        )) &&
        (await exists(
          db,
          sql`select 1 as ok from pg_trigger where tgname = 'orders_public_id_from_payload' and tgrelid = '"orders"'::regclass and not tgisinternal`,
        ))
      );
    case "0010_public_id_gatilho_seguro.sql":
      return exists(
        db,
        sql`select 1 as ok from pg_trigger where tgname = 'orders_public_id_from_payload' and tgrelid = '"orders"'::regclass and not tgisinternal and pg_get_triggerdef(oid) ilike '%update%'`,
      );
    default:
      return false;
  }
}

const ledgerSql = sql`create table if not exists schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now(),
  checksum text,
  checksum_enforced boolean not null default false
)`;

function migrationPrefix(name: string) {
  return name.slice(0, 4);
}

function latestApplied(rows: Record<string, unknown>[]) {
  let latest: string | null = null;
  for (const row of rows) {
    const name = String(row.name ?? "");
    if (!migrationName.test(name)) continue;
    if (!latest || migrationPrefix(name) > migrationPrefix(latest)) latest = name;
  }
  return latest;
}

function storedChecksum(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function checksumEnforced(value: unknown) {
  return value === true || value === "t" || value === "true" || value === 1 || value === "1";
}

async function ensureLedger(db: SqlClient) {
  await db.execute(ledgerSql);
  await db.execute(sql`alter table schema_migrations add column if not exists checksum_enforced boolean not null default false`);
  await db.execute(sql`alter table schema_migrations alter column checksum drop not null`);
}

async function record(db: SqlClient, name: string, folder: string) {
  await db.execute(sql`
    insert into schema_migrations (name, checksum, checksum_enforced)
    values (${name}, ${migrationChecksum(name, folder)}, true)
  `);
}

async function reconcileChecksum(db: SqlClient, name: string, row: Record<string, unknown>, folder: string) {
  const current = migrationChecksum(name, folder);
  const stored = storedChecksum(row.checksum);
  if (!stored) {
    await db.execute(sql`update schema_migrations set checksum = ${current} where name = ${name}`);
    return;
  }
  if (stored === current) return;
  if (!checksumEnforced(row.checksum_enforced)) {
    console.warn(
      JSON.stringify({
        msg: "checksum_legado",
        migration: name,
        message: `Checksum de ${name} diverge do arquivo. Migração anterior a esta checagem não trava o boot.`,
      }),
    );
    return;
  }
  throw new MigrationError(`Checksum de ${name} diverge do arquivo aplicado.`);
}

/**
 * Aplica cada arquivo uma vez. O lock vale a transação.
 * Banco que já tem o objeto só ganha a linha no livro, sem rodar o SQL de novo.
 * Número menor que a última aplicada, nome fora do padrão ou checksum novo divergente falham.
 */
export async function applyMigrations(db: Database, files: readonly string[], folder = migrationsDirectory()) {
  for (const name of files) {
    if (!migrationName.test(name)) {
      throw new MigrationError(`Arquivo de migração fora do padrão NNNN_nome.sql ou NNNN-nome.sql: ${name}.`);
    }
    await db.transaction(async (tx) => {
      const client = tx as unknown as SqlClient;
      await client.execute(sql`select pg_advisory_xact_lock(hashtext('lume_schema_migrations'))`);
      await ensureLedger(client);
      const applied = rowsOf(await client.execute(sql`select name, checksum, checksum_enforced from schema_migrations`));
      const row = applied.find((item) => item.name === name);
      if (row) {
        await reconcileChecksum(client, name, row, folder);
        return;
      }
      const latest = latestApplied(applied);
      if (latest && migrationPrefix(name) < migrationPrefix(latest)) {
        throw new MigrationError(`Migração ${name} é anterior à última aplicada (${latest}).`);
      }
      if (await schemaAlreadyHas(client, name)) {
        await record(client, name, folder);
        return;
      }
      for (const statement of migrationStatements(readMigration(name, folder))) {
        await client.execute(sql.raw(statement));
      }
      await record(client, name, folder);
    });
  }
}
