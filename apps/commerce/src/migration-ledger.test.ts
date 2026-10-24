import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "./db/client";
import { applyMigrations, discoverMigrations, migrationChecksum, migrationFiles, migrationStatements, publicationMigrations, readMigration } from "./db/migrate";
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
          1, 1000, 0, 1000, '01310100', '{"publicId":"token-dup"}'::jsonb, null
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

  it("não reaplica nada quando o arranque roda de novo", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    try {
      await applyMigrations(
        db,
        migrationFiles.filter((name) => name < "0004_products_habilitacao_ficha.sql"),
      );
      await applyMigrations(db, publicationMigrations);
      const before = rowsOf(
        await db.execute(sql`select name, checksum, applied_at from schema_migrations order by name`),
      );
      expect(before.map((row) => row.name)).toEqual([...migrationFiles]);
      expect(before.find((row) => row.name === "0009_public_id_gatilho.sql")?.checksum).toBe(
        migrationChecksum("0009_public_id_gatilho.sql"),
      );

      await db.execute(sql`drop function if exists orders_public_id_from_payload() cascade`);
      await db.execute(sql`drop table color_stock`);
      await applyMigrations(db, publicationMigrations);

      const after = rowsOf(
        await db.execute(sql`select name, checksum, applied_at from schema_migrations order by name`),
      );
      expect(after).toEqual(before);
      const [stockTable] = rowsOf(await db.execute(sql`select to_regclass('public.color_stock') as rel`));
      expect(stockTable?.rel).toBeNull();
      const trigger = rowsOf(await db.execute(sql`
        select tg.tgname
        from pg_trigger as tg
        join pg_class as rel on rel.oid = tg.tgrelid
        where tg.tgname = 'orders_public_id_from_payload' and rel.relname = 'orders' and not tg.tgisinternal
      `));
      expect(trigger).toHaveLength(0);
    } finally {
      await client.close();
    }
  });

  it("aplica de 0000 ao último arquivo em ordem num banco novo", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    try {
      expect([...publicationMigrations]).toEqual([...migrationFiles]);
      expect(publicationMigrations[0]).toBe("0000_bumpy_turbo.sql");
      expect(publicationMigrations).toContain("0009_public_id_gatilho.sql");
      expect(publicationMigrations).toContain("0010_public_id_gatilho_seguro.sql");
      await applyMigrations(db, publicationMigrations);
      const rows = rowsOf(await db.execute(sql`select name, applied_at, checksum_enforced from schema_migrations order by applied_at asc, name asc`));
      const names = rows.map((row) => String(row.name));
      expect(names).toEqual([...migrationFiles]);
      expect(rows.every((row) => row.checksum_enforced === true)).toBe(true);
      const [customers] = rowsOf(await db.execute(sql`select to_regclass('public.customers') as rel`));
      expect(customers?.rel).toBeTruthy();
      for (let index = 1; index < rows.length; index += 1) {
        expect(millis(rows[index]?.applied_at)).toBeGreaterThanOrEqual(millis(rows[index - 1]?.applied_at));
      }
      const trigger = rowsOf(await db.execute(sql`
        select pg_get_triggerdef(tg.oid) as def
        from pg_trigger as tg
        join pg_class as rel on rel.oid = tg.tgrelid
        where tg.tgname = 'orders_public_id_from_payload' and rel.relname = 'orders' and not tg.tgisinternal
      `));
      expect(String(trigger[0]?.def ?? "")).toMatch(/before insert or update of payload, public_id/i);
    } finally {
      await client.close();
    }
  });

  it("aplica um arquivo novo uma vez", async () => {
    const folder = mkdtempSync(join(tmpdir(), "lume-migrations-"));
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    try {
      writeFileSync(join(folder, "0001_base.sql"), "create table runner_base (id int primary key);");
      await applyMigrations(db, discoverMigrations(folder), folder);
      writeFileSync(join(folder, "0002_novo.sql"), "create table runner_novo (id int primary key);");
      const found = discoverMigrations(folder);
      expect(found).toEqual(["0001_base.sql", "0002_novo.sql"]);
      await applyMigrations(db, found, folder);
      const [created] = rowsOf(await db.execute(sql`select to_regclass('public.runner_novo') as rel`));
      expect(created?.rel).toBeTruthy();

      await db.execute(sql`drop table runner_novo`);
      await applyMigrations(db, discoverMigrations(folder), folder);
      const [gone] = rowsOf(await db.execute(sql`select to_regclass('public.runner_novo') as rel`));
      expect(gone?.rel).toBeNull();
      const recorded = rowsOf(await db.execute(sql`select name from schema_migrations order by name`));
      expect(recorded.map((row) => row.name)).toEqual(["0001_base.sql", "0002_novo.sql"]);
    } finally {
      await client.close();
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("aceita os arquivos atuais e recusa .sql fora de NNNN_nome.sql", () => {
    const folder = fileURLToPath(new URL("../drizzle", import.meta.url));
    const onDisk = readdirSync(folder).filter((name) => name.endsWith(".sql")).sort();
    expect(onDisk).toEqual([...migrationFiles]);
    expect(onDisk.every((name) => /^\d{4}_.+\.sql$/.test(name))).toBe(true);

    const temp = mkdtempSync(join(tmpdir(), "lume-migrations-"));
    try {
      writeFileSync(join(temp, "0001-hifen.sql"), "create table runner_hifen (id int primary key);");
      writeFileSync(join(temp, "nota.sql"), "create table runner_nota (id int primary key);");
      expect(() => discoverMigrations(temp)).toThrow(/NNNN_nome\.sql ou NNNN-nome\.sql: nota\.sql/);
      rmSync(join(temp, "nota.sql"));
      expect(discoverMigrations(temp)).toEqual(["0001-hifen.sql"]);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("recusa número menor que a última aplicada e checksum divergente depois da checagem", async () => {
    const folder = mkdtempSync(join(tmpdir(), "lume-migrations-"));
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    try {
      writeFileSync(join(folder, "0001_base.sql"), "create table runner_base (id int primary key);");
      writeFileSync(join(folder, "0003_tres.sql"), "create table runner_tres (id int primary key);");
      await applyMigrations(db, discoverMigrations(folder), folder);
      writeFileSync(join(folder, "0002_meio.sql"), "create table runner_meio (id int primary key);");
      await expect(applyMigrations(db, discoverMigrations(folder), folder)).rejects.toThrow(
        /0002_meio\.sql é anterior à última aplicada \(0003_tres\.sql\)/,
      );
      const [middle] = rowsOf(await db.execute(sql`select to_regclass('public.runner_meio') as rel`));
      expect(middle?.rel).toBeNull();

      writeFileSync(join(folder, "0001_base.sql"), "create table runner_base_trocada (id int primary key);");
      await expect(applyMigrations(db, ["0001_base.sql", "0003_tres.sql"], folder)).rejects.toThrow(
        /Checksum de 0001_base\.sql diverge do arquivo aplicado/,
      );
      const [replaced] = rowsOf(await db.execute(sql`select to_regclass('public.runner_base_trocada') as rel`));
      expect(replaced?.rel).toBeNull();
      const [kept] = rowsOf(await db.execute(sql`select to_regclass('public.runner_base') as rel`));
      expect(kept?.rel).toBeTruthy();
    } finally {
      await client.close();
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("não trava o boot com checksum antigo de 0007 e 0009 e preenche checksum vazio", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await applyMigrations(db, migrationFiles);
      await db.execute(sql`
        update schema_migrations
        set checksum = 'checksum-antigo', checksum_enforced = false
        where name in ('0007_acesso_operacao.sql', '0009_public_id_gatilho.sql')
      `);
      await db.execute(sql`
        update schema_migrations
        set checksum = ''
        where name = '0008_public_id_restante.sql'
      `);
      await db.execute(sql`drop table color_stock`);
      await applyMigrations(db, publicationMigrations);

      const warnings = warn.mock.calls.map((call) => String(call[0]));
      expect(warnings.some((line) => line.includes("0007_acesso_operacao.sql") && line.includes("checksum_legado"))).toBe(true);
      expect(warnings.some((line) => line.includes("0009_public_id_gatilho.sql") && line.includes("checksum_legado"))).toBe(true);
      const [stockTable] = rowsOf(await db.execute(sql`select to_regclass('public.color_stock') as rel`));
      expect(stockTable?.rel).toBeNull();
      const rows = rowsOf(await db.execute(sql`select name, checksum, checksum_enforced from schema_migrations`));
      const byName = new Map(rows.map((row) => [String(row.name), row]));
      expect(byName.get("0007_acesso_operacao.sql")?.checksum).toBe("checksum-antigo");
      expect(byName.get("0009_public_id_gatilho.sql")?.checksum).toBe("checksum-antigo");
      expect(byName.get("0007_acesso_operacao.sql")?.checksum_enforced).toBe(false);
      expect(byName.get("0008_public_id_restante.sql")?.checksum).toBe(migrationChecksum("0008_public_id_restante.sql"));
      expect(byName.get("0010_public_id_gatilho_seguro.sql")?.checksum).toBe(migrationChecksum("0010_public_id_gatilho_seguro.sql"));
    } finally {
      warn.mockRestore();
      await client.close();
    }
  });
});

function millis(value: unknown) {
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) {
    return result.rows as Record<string, unknown>[];
  }
  return [];
}
