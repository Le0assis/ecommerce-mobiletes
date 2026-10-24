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
] as const;

/** 0004 em diante podem rodar de novo num banco que já passou por `db:push`. Não apagam linha. */
export const publicationMigrations = [
  "0004_products_habilitacao_ficha.sql",
  "0005_product_specs_numeric.sql",
  "0006_consultas_loja.sql",
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

export async function applyMigrations(db: Database, files: readonly string[]) {
  for (const name of files) {
    for (const statement of migrationStatements(readMigration(name))) {
      await db.execute(sql.raw(statement));
    }
  }
}
