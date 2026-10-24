import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { auditDatabase, auditIsClean } from "./db/audit";
import { applyMigrations, migrationFiles } from "./db/migrate";
import { customers, dealers, orders, products, testRideBookings } from "./db/schema";
import { openTestDatabase } from "./db/test-database";

describe("auditoria somente leitura", () => {
  it("aponta centavo negativo, e-mail duplicado, test ride órfão e status ou parcela fora do conjunto", async () => {
    const database = await openTestDatabase(migrationFiles.filter((name) => name !== "0006_consultas_loja.sql"));
    try {
      await database.db.insert(products).values({
        id: "modelo",
        slug: "modelo",
        name: "Modelo",
        brand: "LUME",
        category: "scooter",
        style: "retro",
        tagline: "t",
        description: "d",
        basePriceCents: 1_000,
        status: "ativo",
      });
      await database.db.insert(dealers).values({ id: "loja", name: "Loja", city: "São Paulo", uf: "SP", cep: "01310100" });
      await database.db.insert(customers).values([
        { id: "c1", name: "Um", email: "Cliente@Teste.com", phone: "11999990000" },
        { id: "c2", name: "Dois", email: "cliente@teste.com", phone: "11999990001" },
        { id: "c3", name: "Três", email: "unico@example.com", phone: "11999990002" },
      ]);
      await database.db.insert(orders).values([
        {
          code: "LM-OK",
          status: "aguardando_pagamento",
          customerName: "Um",
          customerEmail: "unico@example.com",
          customerPhone: "11999990000",
          method: "pix",
          provider: "mock",
          installments: 21,
          subtotalCents: 100,
          shippingCents: 0,
          totalCents: 100,
          cep: "01310100",
          payload: {},
        },
        {
          code: "LM-NEG",
          status: "pago",
          customerName: "Um",
          customerEmail: "unico@example.com",
          customerPhone: "11999990000",
          method: "pix",
          provider: "mock",
          installments: 1,
          subtotalCents: -1,
          shippingCents: 0,
          totalCents: 0,
          cep: "01310100",
          payload: {},
        },
        {
          code: "LM-STATUS",
          status: "cancelado",
          customerName: "Um",
          customerEmail: "unico@example.com",
          customerPhone: "11999990000",
          method: "pix",
          provider: "mock",
          installments: 1,
          subtotalCents: 10,
          shippingCents: 0,
          totalCents: 10,
          cep: "01310100",
          payload: {},
        },
        {
          code: "LM-PARCELA",
          status: "entregue",
          customerName: "Um",
          customerEmail: "unico@example.com",
          customerPhone: "11999990000",
          method: "cartao",
          provider: "mock",
          installments: 22,
          subtotalCents: 10,
          shippingCents: 0,
          totalCents: 10,
          cep: "01310100",
          payload: {},
        },
      ]);
      await database.db.insert(testRideBookings).values([
        {
          id: "ride-ok",
          productId: "modelo",
          dealerId: "loja",
          name: "Cliente",
          email: "unico@example.com",
          phone: "11999990000",
          preferredDate: "2026-11-01",
        },
        {
          id: "ride-orfao",
          productId: "nao-existe",
          dealerId: "sem-loja",
          name: "Cliente",
          email: "unico@example.com",
          phone: "11999990000",
          preferredDate: "2026-11-02",
        },
      ]);
      await applyMigrations(database.db, ["0006_consultas_loja.sql"]);

      const before = await database.db.execute(sql`select count(*)::int as n from orders`);
      const report = await auditDatabase(database.db);
      const after = await database.db.execute(sql`select count(*)::int as n from orders`);
      expect(JSON.stringify(before)).toBe(JSON.stringify(after));
      expect(auditIsClean(report)).toBe(false);
      expect(report.negativeCents).toEqual([{ code: "LM-NEG", subtotalCents: -1, shippingCents: 0, totalCents: 0 }]);
      expect(report.duplicateEmails).toEqual([{ email: "cliente@teste.com", ids: ["c1", "c2"] }]);
      expect(report.orphanTestRides).toEqual([
        { id: "ride-orfao", dealerId: "sem-loja", productId: "nao-existe", missingDealer: true, missingProduct: true },
      ]);
      expect(report.invalidOrders.map((row) => row.code).sort()).toEqual(["LM-PARCELA", "LM-STATUS"]);
      const kept = await database.db.select({ code: orders.code }).from(orders).where(eq(orders.code, "LM-NEG"));
      expect(kept).toHaveLength(1);
    } finally {
      await database.close();
    }
  });
});
