import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { Database } from "./db/client";
import { applyMigrations, migrationFiles, migrationStatements, readMigration } from "./db/migrate";
import { productColors, products, productVariants, testRideBookings } from "./db/schema";
import * as schema from "./db/schema";

const migration = "0007_acesso_operacao.sql";

describe("0007 acesso e operação", () => {
  it("preenche public_id sem apagar duplicata e pode rodar de novo", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Database;
    try {
      await applyMigrations(
        db,
        migrationFiles.filter((name) => name !== migration),
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
      expect(byCode.get("LM-OLD")?.public_id).toBe("token-dup");
      expect(byCode.get("LM-NEW")?.public_id).toBeNull();
      expect(byCode.get("LM-A")?.public_id).toBe("token-tie");
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
