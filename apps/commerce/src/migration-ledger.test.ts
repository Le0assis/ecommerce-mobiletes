import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { Database } from "./db/client";
import { applyMigrations, migrationChecksum, migrationFiles, migrationStatements, readMigration } from "./db/migrate";
import * as schema from "./db/schema";

// Cada arquivo sobe o PGlite do zero. Em paralelo com o turbo isso passa de 5s.
describe("livro de migrações", { timeout: 20_000 }, () => {
  it("não reaplica o backfill da 0007 e registra o que o schema já tem", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    try {
      for (const name of migrationFiles.filter((file) => file < "0008_public_id_restante.sql")) {
        for (const statement of migrationStatements(readMigration(name))) {
          await db.execute(sql.raw(statement));
        }
      }
      await db.execute(sql`
        insert into orders (
          code, status, customer_name, customer_email, customer_phone, method, provider,
          installments, subtotal_cents, shipping_cents, total_cents, cep, payload, public_id, created_at
        ) values
          ('LM-D1', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1000, 0, 1000, '01310100', '{"publicId":"token-dup"}'::jsonb, null, '2026-04-01T00:00:00.000Z'),
          ('LM-D2', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1000, 0, 1000, '01310100', '{"publicId":"token-dup"}'::jsonb, null, '2026-04-02T00:00:00.000Z'),
          ('LM-UNIQ', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1000, 0, 1000, '01310100', '{"publicId":"token-uniq"}'::jsonb, null, '2026-04-03T00:00:00.000Z')
      `);

      await applyMigrations(db, migrationFiles);

      const first = rowsOf(await db.execute(sql`select code, public_id from orders order by code`));
      const byCode = new Map(first.map((row) => [String(row.code), row.public_id]));
      expect(byCode.get("LM-D1")).toBeNull();
      expect(byCode.get("LM-D2")).toBeNull();
      expect(byCode.get("LM-UNIQ")).toBe("token-uniq");

      const recorded = rowsOf(await db.execute(sql`select name, checksum from schema_migrations order by name`));
      expect(recorded.map((row) => row.name)).toEqual([...migrationFiles]);
      const saved = recorded.find((row) => row.name === "0007_acesso_operacao.sql");
      expect(saved?.checksum).toBe(migrationChecksum("0007_acesso_operacao.sql"));

      await db.execute(sql`drop table color_stock`);
      await applyMigrations(db, migrationFiles);
      const [stockTable] = rowsOf(await db.execute(sql`select to_regclass('public.color_stock') as rel`));
      expect(stockTable?.rel).toBeNull();

      await db.execute(sql`
        insert into orders (
          code, status, customer_name, customer_email, customer_phone, method, provider,
          installments, subtotal_cents, shipping_cents, total_cents, cep, payload, public_id
        ) values (
          'LM-DEPOIS', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock',
          1, 1000, 0, 1000, '01310100', '{"publicId":"token-depois"}'::jsonb, null
        )
      `);
      await applyMigrations(db, migrationFiles);
      const [later] = rowsOf(await db.execute(sql`select public_id from orders where code = 'LM-DEPOIS'`));
      expect(later?.public_id).toBeNull();
      const again = rowsOf(await db.execute(sql`select name from schema_migrations`));
      expect(again).toHaveLength(migrationFiles.length);
    } finally {
      await client.close();
    }
  });
});

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) {
    return result.rows as Record<string, unknown>[];
  }
  return [];
}
