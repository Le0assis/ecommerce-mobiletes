import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { Database } from "./db/client";
import { applyMigrations, migrationFiles, migrationStatements, readMigration } from "./db/migrate";
import { productColors, products, productVariants, testRideBookings } from "./db/schema";
import * as schema from "./db/schema";

const migration = "0007_acesso_operacao.sql";

// PGlite sobe 0000–0008. Com o turbo em paralelo isso passa de 5s.
describe("0007 acesso e operação", { timeout: 20_000 }, () => {
  it("preenche public_id sem apagar duplicata e pode rodar de novo", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    try {
      await applyMigrations(
        db,
        migrationFiles.filter((name) => name < migration),
      );
      await db.insert(products).values({
        id: "p-estoque",
        slug: "p-estoque",
        name: "Estoque",
        brand: "LUME",
        category: "scooter",
        style: "retro",
        tagline: "Teste.",
        description: "Não muda de estoque.",
        basePriceCents: 100,
      });
      await db.insert(productVariants).values({
        id: "p-estoque-padrao",
        productId: "p-estoque",
        sku: "ESTOQUE",
        colorName: "Preto",
        colorHex: "#111111",
        priceDeltaCents: 0,
        stock: 7,
      });
      await db.insert(productColors).values({
        productId: "p-estoque",
        colorId: "preto",
        name: "Preto",
        hex: "#111111",
        priceDeltaCents: 0,
        stock: 3,
      });
      await db.insert(testRideBookings).values({
        id: "tr-antigo",
        productId: "p-estoque",
        dealerId: "loja",
        name: "Cliente Teste",
        email: "cliente@example.com",
        phone: "11999990000",
        preferredDate: "amanha",
      });
      await db.execute(sql`
        insert into orders (
          code, status, customer_name, customer_email, customer_phone, method, provider,
          installments, subtotal_cents, shipping_cents, total_cents, cep, payload, created_at
        ) values
          ('LM-OLD', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1000, 0, 1000, '01310100', '{"publicId":"token-dup","lines":[{"qty":1}]}'::jsonb, '2026-01-01T00:00:00.000Z'),
          ('LM-NEW', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1000, 0, 1000, '01310100', '{"publicId":"token-dup","lines":[{"qty":2}]}'::jsonb, '2026-01-02T00:00:00.000Z'),
          ('LM-A', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1000, 0, 1000, '01310100', '{"publicId":"token-tie"}'::jsonb, '2026-02-01T00:00:00.000Z'),
          ('LM-B', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1000, 0, 1000, '01310100', '{"publicId":"token-tie"}'::jsonb, '2026-02-01T00:00:00.000Z'),
          ('LM-SOLO', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1000, 0, 1000, '01310100', '{"publicId":"token-solo"}'::jsonb, '2026-03-01T00:00:00.000Z'),
          ('LM-NONE', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1000, 0, 1000, '01310100', '{"lines":[]}'::jsonb, '2026-03-02T00:00:00.000Z'),
          ('LM-BLANK', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1000, 0, 1000, '01310100', '{"publicId":"   "}'::jsonb, '2026-03-03T00:00:00.000Z')
      `);

      const first = await applyWithNotices(client, migration);
      const second = await applyWithNotices(client, migration);

      const rows = rowsOf(
        await db.execute(sql`
          select code, public_id, total_cents, payload
          from orders
          order by code
        `),
      );
      expect(rows.map((row) => row.code)).toEqual(["LM-A", "LM-B", "LM-BLANK", "LM-NEW", "LM-NONE", "LM-OLD", "LM-SOLO"]);
      const byCode = new Map(rows.map((row) => [String(row.code), row]));
      expect(byCode.get("LM-OLD")?.public_id).toBeNull();
      expect(byCode.get("LM-NEW")?.public_id).toBeNull();
      expect(byCode.get("LM-A")?.public_id).toBeNull();
      expect(byCode.get("LM-B")?.public_id).toBeNull();
      expect(byCode.get("LM-SOLO")?.public_id).toBe("token-solo");
      expect(byCode.get("LM-NONE")?.public_id).toBeNull();
      expect(byCode.get("LM-BLANK")?.public_id).toBeNull();
      expect(byCode.get("LM-OLD")?.total_cents).toBe(1000);
      expect(byCode.get("LM-NEW")?.payload).toMatchObject({ publicId: "token-dup", lines: [{ qty: 2 }] });
      expect(first.filter((notice) => notice.includes("publicId repetido"))).toHaveLength(2);
      expect(second.filter((notice) => notice.includes("publicId repetido"))).toHaveLength(2);

      const kept = rowsOf(
        await db.execute(sql`
          select
            (select stock from product_variants where id = 'p-estoque-padrao') as variant_stock,
            (select stock from product_colors where product_id = 'p-estoque' and color_id = 'preto') as color_stock,
            (select preferred_date from test_ride_bookings where id = 'tr-antigo') as ride_date
        `),
      );
      expect(Number(kept[0]?.variant_stock)).toBe(7);
      expect(Number(kept[0]?.color_stock)).toBe(3);
      expect(kept[0]?.ride_date).toBe("amanha");

      const indexes = rowsOf(
        await db.execute(sql`
          select indexname from pg_indexes
          where schemaname = 'public' and indexname in (
            'orders_public_id_idx',
            'sessions_email_idx',
            'exchanges_created_at_idx',
            'service_bookings_dealer_id_idx',
            'service_bookings_product_id_idx',
            'service_bookings_created_at_idx'
          )
        `),
      );
      expect(indexes).toHaveLength(6);

      const loginColumns = rowsOf(
        await db.execute(sql`
          select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'login_codes'
        `),
      ).map((row) => String(row.column_name));
      expect(loginColumns).toEqual(expect.arrayContaining(["email", "hash", "salt", "expires_at", "attempts", "sent_at"]));
      expect(loginColumns).not.toContain("code");

      const foreignKeys = rowsOf(
        await db.execute(sql`
          select constraint_name from information_schema.table_constraints
          where table_schema = 'public'
            and table_name in ('service_bookings', 'color_stock')
            and constraint_type = 'FOREIGN KEY'
        `),
      );
      expect(foreignKeys).toHaveLength(0);

      await db.execute(sql`
        insert into sessions (token, kind, email) values
          ('admin-1', 'admin', null),
          ('cliente-1', 'customer', 'cliente@example.com')
      `);
      await expect(
        db.execute(sql`insert into sessions (token, kind, email) values ('admin-2', 'admin', 'cliente@example.com')`),
      ).rejects.toThrow();
      await expect(db.execute(sql`insert into sessions (token, kind) values ('cliente-2', 'customer')`)).rejects.toThrow();
      await expect(
        db.execute(sql`insert into sessions (token, kind, email) values ('staff-1', 'staff', null)`),
      ).rejects.toThrow();

      await db.execute(sql`
        insert into login_codes (email, hash, salt, expires_at, attempts, sent_at)
        values ('cliente@example.com', 'hash', 'salt', now() + interval '10 minutes', 5, now())
      `);
      await expect(
        db.execute(sql`
          insert into login_codes (email, hash, salt, expires_at, attempts, sent_at)
          values ('outro@example.com', 'hash', 'salt', now() + interval '10 minutes', 6, now())
        `),
      ).rejects.toThrow();

      await db.execute(sql`
        insert into exchanges (id, name, email, phone, brand, model, city, year, km)
        values ('troca-1', 'Cliente', 'cliente@example.com', '11999990000', 'Yadea', 'DT3', 'Sao Paulo', 1990, 500000)
      `);
      await expect(
        db.execute(sql`
          insert into exchanges (id, name, email, phone, brand, model, city, year, km)
          values ('troca-2', 'Cliente', 'cliente@example.com', '11999990000', 'Yadea', 'DT3', 'Sao Paulo', 1989, 0)
        `),
      ).rejects.toThrow();
      await expect(
        db.execute(sql`
          insert into exchanges (id, name, email, phone, brand, model, city, year, km)
          values ('troca-3', 'Cliente', 'cliente@example.com', '11999990000', 'Yadea', 'DT3', 'Sao Paulo', 2030, 500001)
        `),
      ).rejects.toThrow();

      await db.execute(sql`
        insert into service_bookings (id, dealer_id, product_id, name, email, phone, preferred_date, note)
        values ('srv-1', 'loja-inexistente', 'produto-inexistente', 'Cliente', 'cliente@example.com', '11999990000', '2026-10-24', 'revisao')
      `);
      await expect(
        db.execute(sql`
          insert into service_bookings (id, dealer_id, product_id, name, email, phone, preferred_date, note)
          values ('srv-2', 'loja', 'produto', 'Cliente', 'cliente@example.com', '11999990000', '24/10/2026', 'revisao')
        `),
      ).rejects.toThrow();

      await db.execute(sql`insert into color_stock (product_id, color_id, stock) values ('produto-inexistente', 'preto', 0)`);
      await expect(
        db.execute(sql`insert into color_stock (product_id, color_id, stock) values ('produto-inexistente', 'preto', 1)`),
      ).rejects.toThrow();
      await expect(
        db.execute(sql`insert into color_stock (product_id, color_id, stock) values ('outro', 'preto', -1)`),
      ).rejects.toThrow();
    } finally {
      await client.close();
    }
  });
});

// Mesmo motivo da 0007: a suíte paralela estoura o limite de 5s do Vitest.
describe("0008 public_id restante", { timeout: 20_000 }, () => {
  it("preenche só o token livre e pode rodar de novo", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    const migration0008 = "0008_public_id_restante.sql";
    try {
      await applyMigrations(
        db,
        migrationFiles.filter((name) => name < migration0008),
      );
      await db.execute(sql`
        insert into orders (
          code, status, customer_name, customer_email, customer_phone, method, provider,
          installments, subtotal_cents, shipping_cents, total_cents, cep, payload, public_id, created_at
        ) values
          ('LM-UNIQ', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1100, 0, 1100, '01310100', '{"publicId":"token-uniq"}'::jsonb, null, '2026-04-01T00:00:00.000Z'),
          ('LM-D1', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1200, 0, 1200, '01310100', '{"publicId":"token-dup2"}'::jsonb, null, '2026-04-02T00:00:00.000Z'),
          ('LM-D2', 'pago', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1300, 0, 1300, '01310100', '{"publicId":"token-dup2","lines":[{"qty":1}]}'::jsonb, null, '2026-04-03T00:00:00.000Z'),
          ('LM-TAKEN', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1400, 0, 1400, '01310100', '{"publicId":"token-taken"}'::jsonb, 'token-taken', '2026-04-04T00:00:00.000Z'),
          ('LM-COPY', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1500, 0, 1500, '01310100', '{"publicId":"token-taken"}'::jsonb, null, '2026-04-05T00:00:00.000Z'),
          ('LM-EMPTY', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1600, 0, 1600, '01310100', '{"publicId":""}'::jsonb, null, '2026-04-06T00:00:00.000Z'),
          ('LM-SPACE', 'aguardando_pagamento', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1700, 0, 1700, '01310100', '{"publicId":"   "}'::jsonb, null, '2026-04-07T00:00:00.000Z'),
          ('LM-KEEP', 'em_preparo', 'Cliente Teste', 'cliente@example.com', '11999990000', 'pix', 'mock', 1, 1800, 0, 1800, '01310100', '{"publicId":"token-other"}'::jsonb, 'token-keep', '2026-04-08T00:00:00.000Z')
      `);
      const before = rowsOf(await db.execute(sql`select count(*)::int as n from orders`));

      await applyMigrations(db, [migration0008, migration0008]);

      const rows = rowsOf(await db.execute(sql`select code, public_id, status, total_cents, payload from orders order by code`));
      const byCode = new Map(rows.map((row) => [String(row.code), row]));
      expect(rows).toHaveLength(Number(before[0]?.n));
      expect(byCode.get("LM-UNIQ")?.public_id).toBe("token-uniq");
      expect(byCode.get("LM-UNIQ")?.total_cents).toBe(1100);
      expect(byCode.get("LM-D1")?.public_id).toBeNull();
      expect(byCode.get("LM-D2")?.public_id).toBeNull();
      expect(byCode.get("LM-D2")?.status).toBe("pago");
      expect(byCode.get("LM-D2")?.payload).toMatchObject({ publicId: "token-dup2", lines: [{ qty: 1 }] });
      expect(byCode.get("LM-TAKEN")?.public_id).toBe("token-taken");
      expect(byCode.get("LM-COPY")?.public_id).toBeNull();
      expect(byCode.get("LM-EMPTY")?.public_id).toBeNull();
      expect(byCode.get("LM-SPACE")?.public_id).toBeNull();
      expect(byCode.get("LM-KEEP")?.public_id).toBe("token-keep");
      expect(byCode.get("LM-KEEP")?.status).toBe("em_preparo");
      expect(byCode.get("LM-KEEP")?.total_cents).toBe(1800);
    } finally {
      await client.close();
    }
  });
});

// PGlite sobe várias migrações. Com o turbo em paralelo isso passa de 5s.
describe("0004 a 0009 no token repetido", { timeout: 20_000 }, () => {
  it("deixa o par duplicado com public_id nulo depois de rodar duas vezes", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    const chain = [
      "0004_products_habilitacao_ficha.sql",
      "0005_product_specs_numeric.sql",
      "0006_consultas_loja.sql",
      "0007_acesso_operacao.sql",
      "0008_public_id_restante.sql",
      "0009_public_id_gatilho.sql",
    ];
    try {
      await applyMigrations(
        db,
        migrationFiles.filter((name) => name < "0004_products_habilitacao_ficha.sql"),
      );
      await db.execute(sql`
        insert into orders (
          code, status, customer_name, customer_email, customer_phone, method, provider,
          installments, subtotal_cents, shipping_cents, total_cents, cep, payload, created_at
        ) values
          ('LM-ANTIGO', 'aguardando_pagamento', 'Cliente Antigo', 'antigo@example.com', '11999990000', 'pix', 'mock', 1, 2100, 0, 2100, '01310100', '{"publicId":"token-compartilhado"}'::jsonb, '2026-01-01T00:00:00.000Z'),
          ('LM-RECENTE', 'aguardando_pagamento', 'Cliente Recente', 'recente@example.com', '11988880000', 'pix', 'mock', 1, 2200, 0, 2200, '01310100', '{"publicId":"token-compartilhado","lines":[{"qty":1}]}'::jsonb, '2026-06-01T00:00:00.000Z')
      `);

      await applyMigrations(db, [...chain, ...chain]);

      const rows = rowsOf(
        await db.execute(sql`select code, public_id, customer_email, total_cents, payload from orders order by code`),
      );
      expect(rows.map((row) => row.code)).toEqual(["LM-ANTIGO", "LM-RECENTE"]);
      expect(rows.every((row) => row.public_id == null)).toBe(true);
      expect(rows.find((row) => row.code === "LM-ANTIGO")?.customer_email).toBe("antigo@example.com");
      expect(rows.find((row) => row.code === "LM-RECENTE")?.customer_email).toBe("recente@example.com");
      expect(rows.find((row) => row.code === "LM-ANTIGO")?.total_cents).toBe(2100);
      expect(rows.find((row) => row.code === "LM-RECENTE")?.payload).toMatchObject({
        publicId: "token-compartilhado",
        lines: [{ qty: 1 }],
      });
    } finally {
      await client.close();
    }
  });
});

const migration0010 = "0010_public_id_gatilho_seguro.sql";

// O gatilho sobe em PGlite junto com 0000–0008. Em paralelo com o turbo passa de 5s.
describe("0010 gatilho seguro de public_id", { timeout: 20_000 }, () => {
  it("não entrega o token de um par nulo a um insert novo", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    try {
      await applyMigrations(
        db,
        migrationFiles.filter((name) => name < migration0010),
      );
      await insertOrders(db, [
        row("LM-PAR-A", "token-par", null, "par-a@example.com", 3100),
        row("LM-PAR-B", "token-par", null, "par-b@example.com", 3200),
      ]);

      await applyMigrations(db, ["0009_public_id_gatilho.sql", migration0010, migration0010]);

      await insertOrders(db, [
        row("LM-TERCEIRO", "token-par", null, "terceiro@example.com", 3300),
        row("LM-LIVRE", "token-livre", null, "livre@example.com", 3400),
      ]);
      await applyMigrations(db, ["0009_public_id_gatilho.sql"]);
      await insertOrders(db, [row("LM-DEPOIS", "token-par", null, "depois@example.com", 3500)]);

      const rows = rowsOf(
        await db.execute(sql`select code, public_id, customer_email, total_cents from orders order by code`),
      );
      const byCode = new Map(rows.map((entry) => [String(entry.code), entry]));
      expect(byCode.get("LM-PAR-A")?.public_id).toBeNull();
      expect(byCode.get("LM-PAR-B")?.public_id).toBeNull();
      expect(byCode.get("LM-TERCEIRO")?.public_id).toBeNull();
      expect(byCode.get("LM-DEPOIS")?.public_id).toBeNull();
      expect(byCode.get("LM-TERCEIRO")?.customer_email).toBe("terceiro@example.com");
      expect(byCode.get("LM-LIVRE")?.public_id).toBe("token-livre");
      expect(byCode.get("LM-LIVRE")?.total_cents).toBe(3400);
      expect(await triggerDef(db)).toMatch(/before insert or update of payload, public_id/i);
      const column = rowsOf(
        await db.execute(sql`
          select column_default, is_nullable
          from information_schema.columns
          where table_schema = 'public' and table_name = 'orders' and column_name = 'public_id'
        `),
      );
      expect(column[0]?.column_default).toBeNull();
      expect(column[0]?.is_nullable).toBe("YES");
    } finally {
      await client.close();
    }
  });

  it("grava NULL quando o token já está em outro pedido e não estoura o índice", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    try {
      await applyMigrations(db, [...migrationFiles, "0009_public_id_gatilho.sql", migration0010]);
      await insertOrders(db, [row("LM-USADO", "token-usado", "token-usado", "usado@example.com", 4100)]);

      await expect(
        insertOrders(db, [
          row("LM-REPETE", "token-usado", null, "repete@example.com", 4200),
          row("LM-BRANCO", "   ", null, "branco@example.com", 4300),
        ]),
      ).resolves.toBeUndefined();

      const rows = rowsOf(await db.execute(sql`select code, public_id from orders order by code`));
      const byCode = new Map(rows.map((entry) => [String(entry.code), entry]));
      expect(byCode.get("LM-USADO")?.public_id).toBe("token-usado");
      expect(byCode.get("LM-REPETE")?.public_id).toBeNull();
      expect(byCode.get("LM-BRANCO")?.public_id).toBeNull();
    } finally {
      await client.close();
    }
  });

  it("no update preenche token livre e não reescreve public_id já definido", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    try {
      await applyMigrations(
        db,
        migrationFiles.filter((name) => name < migration0010),
      );
      await insertOrders(db, [
        row("LM-VAZIO", "", null, "vazio@example.com", 5100),
        row("LM-FIXO", "token-fixo", "token-fixo", "fixo@example.com", 5200),
        row("LM-PAR-A", "token-par", null, "par-a@example.com", 5300),
        row("LM-PAR-B", "token-par", null, "par-b@example.com", 5400),
      ]);
      await applyMigrations(db, ["0009_public_id_gatilho.sql", migration0010]);

      await db.execute(sql`
        update orders
        set payload = '{"publicId":"token-livre-upd"}'::jsonb
        where code = 'LM-VAZIO'
      `);
      await db.execute(sql`
        update orders
        set payload = '{"publicId":"token-outro"}'::jsonb
        where code = 'LM-FIXO'
      `);
      await db.execute(sql`
        update orders
        set payload = '{"publicId":"token-par","lines":[{"qty":2}]}'::jsonb
        where code = 'LM-PAR-A'
      `);

      let rows = rowsOf(
        await db.execute(sql`select code, public_id, payload, total_cents from orders order by code`),
      );
      let byCode = new Map(rows.map((entry) => [String(entry.code), entry]));
      expect(byCode.get("LM-VAZIO")?.public_id).toBe("token-livre-upd");
      expect(byCode.get("LM-VAZIO")?.total_cents).toBe(5100);
      expect(byCode.get("LM-FIXO")?.public_id).toBe("token-fixo");
      expect(byCode.get("LM-FIXO")?.payload).toMatchObject({ publicId: "token-outro" });
      expect(byCode.get("LM-PAR-A")?.public_id).toBeNull();
      expect(byCode.get("LM-PAR-B")?.public_id).toBeNull();
      expect(byCode.get("LM-PAR-A")?.payload).toMatchObject({ publicId: "token-par", lines: [{ qty: 2 }] });

      await applyMigrations(db, ["0009_public_id_gatilho.sql"]);
      await db.execute(sql`
        update orders
        set payload = '{"publicId":"token-fixo"}'::jsonb
        where code = 'LM-PAR-B'
      `);
      await insertOrders(db, [row("LM-UPD2", "", null, "upd2@example.com", 5500)]);
      await db.execute(sql`
        update orders
        set payload = '{"publicId":"token-livre-2"}'::jsonb
        where code = 'LM-UPD2'
      `);

      rows = rowsOf(await db.execute(sql`select code, public_id from orders order by code`));
      byCode = new Map(rows.map((entry) => [String(entry.code), entry]));
      expect(byCode.get("LM-PAR-B")?.public_id).toBeNull();
      expect(byCode.get("LM-FIXO")?.public_id).toBe("token-fixo");
      expect(byCode.get("LM-UPD2")?.public_id).toBe("token-livre-2");
      expect(await triggerDef(db)).toMatch(/before insert or update of payload, public_id/i);
      expect(await triggerDef(db)).toMatch(/when \(\(+new\.public_id is null\)+\)/i);
    } finally {
      await client.close();
    }
  });
});

function row(
  code: string,
  publicIdInPayload: string,
  publicId: string | null,
  email: string,
  totalCents: number,
) {
  return { code, publicIdInPayload, publicId, email, totalCents };
}

async function insertOrders(
  db: Database,
  orders: Array<ReturnType<typeof row>>,
) {
  for (const order of orders) {
    await db.execute(sql`
      insert into orders (
        code, status, customer_name, customer_email, customer_phone, method, provider,
        installments, subtotal_cents, shipping_cents, total_cents, cep, payload, public_id, created_at
      ) values (
        ${order.code},
        'aguardando_pagamento',
        'Cliente Teste',
        ${order.email},
        '11999990000',
        'pix',
        'mock',
        1,
        ${order.totalCents},
        0,
        ${order.totalCents},
        '01310100',
        ${JSON.stringify({ publicId: order.publicIdInPayload })}::jsonb,
        ${order.publicId},
        '2026-08-01T00:00:00.000Z'
      )
    `);
  }
}

async function triggerDef(db: Database) {
  const rows = rowsOf(await db.execute(sql`
    select pg_get_triggerdef(tg.oid) as def
    from pg_trigger as tg
    join pg_class as rel on rel.oid = tg.tgrelid
    where tg.tgname = 'orders_public_id_from_payload'
      and rel.relname = 'orders'
      and not tg.tgisinternal
  `));
  return String(rows[0]?.def ?? "");
}

async function applyWithNotices(client: PGlite, name: string) {
  const notices: string[] = [];
  for (const statement of migrationStatements(readMigration(name))) {
    await client.exec(statement, {
      onNotice: (notice) => {
        if (notice.message) notices.push(notice.message);
      },
    });
  }
  return notices;
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) {
    return result.rows as Record<string, unknown>[];
  }
  return [];
}
