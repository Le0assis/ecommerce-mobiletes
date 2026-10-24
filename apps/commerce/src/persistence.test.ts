import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { hashAdminPassword } from "./auth";
import { clearRateLimit, createApp } from "./app";
import type { Mailer } from "./mailer";
import { persistOrder, type OrderWrite } from "./db/persist";
import { createPostgresStore } from "./db/operations";
import { colorStock, exchanges, loginCodes, orders, serviceBookings, sessions, testRideBookings } from "./db/schema";
import { openTestDatabase } from "./db/test-database";
import { productionDatabaseError } from "./env";

const exec = promisify(execFile);
const password = "senha-de-teste";

function inbox() {
  const sent: { to: string; text: string }[] = [];
  const mailer: Mailer = {
    async send(message) {
      sent.push({ to: message.to, text: message.text });
    },
  };
  return { sent, mailer };
}

function cookiePair(response: Response) {
  return (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

function codeOf(text: string) {
  return text.match(/\d{6}/)?.[0] ?? "";
}

function sampleOrder(code: string, publicId: string, email = "dono@example.com"): OrderWrite {
  return {
    code,
    publicId,
    status: "aguardando_pagamento",
    method: "pix",
    provider: "mock",
    installments: 1,
    installmentCents: 1000,
    subtotalCents: 1000,
    shippingCents: 0,
    totalCents: 1000,
    cep: "01310100",
    customer: { name: "Gustavo Teste", email, phone: "11999990000" },
    lines: [],
    createdAt: "2026-06-01T12:00:00.000Z",
  };
}

const checkout = {
  lines: [{ productId: "s", colorId: "obsidiana", accessoryIds: [], qty: 1 }],
  cep: "05435-000",
  shippingServiceId: "dedicado",
  method: "pix",
  installments: 1,
  customer: { name: "Gustavo Teste", email: "dono@example.com", phone: "11999990000" },
};

describe("persistência da operação", () => {
  let db: Awaited<ReturnType<typeof openTestDatabase>>["db"];
  let close: () => Promise<void>;

  beforeAll(async () => {
    const opened = await openTestDatabase();
    db = opened.db;
    close = opened.close;
  });

  afterAll(async () => {
    await close();
  });

  afterEach(() => {
    delete process.env.ADMIN_PASSWORD_HASH;
    clearRateLimit();
  });

  it("recusa subir em produção sem DATABASE_URL", async () => {
    const previousNode = process.env.NODE_ENV;
    const previousUrl = process.env.DATABASE_URL;
    process.env.NODE_ENV = "production";
    delete process.env.DATABASE_URL;
    try {
      expect(productionDatabaseError()).toMatch(/DATABASE_URL ausente/);
    } finally {
      process.env.NODE_ENV = previousNode;
      if (previousUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousUrl;
    }
    expect(productionDatabaseError()).toBeNull();

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value === "string") env[key] = value;
    }
    env.NODE_ENV = "production";
    env.ADMIN_TOKEN = "a".repeat(24);
    delete env.DATABASE_URL;
    env.PORT = "0";
    let failed: { code?: number | string; stderr?: string; stdout?: string } | undefined;
    try {
      await exec("pnpm", ["exec", "tsx", "src/index.ts"], {
        cwd: fileURLToPath(new URL("..", import.meta.url)),
        env,
        timeout: 15_000,
      });
    } catch (error) {
      failed = error as { code?: number | string; stderr?: string; stdout?: string };
    }
    expect(failed?.code).toBe(1);
    expect(`${failed?.stderr ?? ""}${failed?.stdout ?? ""}`).toContain("DATABASE_URL ausente");
  }, 20_000);

  it("grava o pedido com public_id e só o dono relê o LM depois de reabrir", async () => {
    const first = createApp({ db });
    const created = await first.request("/v1/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(checkout),
    });
    expect(created.status).toBe(200);
    const body = await created.json();
    const [row] = await db.select().from(orders).where(eq(orders.code, body.order.code));
    expect(row?.publicId).toBe(body.order.publicId);
    expect(row?.publicId?.length).toBeGreaterThan(20);

    const second = createApp({ db });
    const byToken = await second.request(`/v1/orders/${body.order.publicId}`);
    expect(byToken.status).toBe(200);
    const byOwner = await second.request(`/v1/orders/${body.order.publicId}?email=dono@example.com`);
    expect(byOwner.status).toBe(200);
    const otherOwner = await second.request(`/v1/orders/${body.order.publicId}?email=outro@example.com`);
    expect(otherOwner.status).toBe(404);
    const hidden = await second.request(`/v1/orders/${body.order.code}`);
    expect(hidden.status).toBe(404);
    const owned = await second.request(`/v1/orders/${body.order.code}?email=dono@example.com`);
    expect(owned.status).toBe(200);
    expect((await owned.json()).order.code).toBe(body.order.code);

    const sandbox = await second.request(`/v1/orders/${body.order.publicId}/sandbox`, { method: "POST" });
    expect(sandbox.status).toBe(200);
    const reread = await createApp({ db }).request(`/v1/orders/${body.order.publicId}`);
    expect((await reread.json()).order.status).toBe("pago");
    const [updated] = await db.select().from(orders).where(eq(orders.code, body.order.code));
    expect(updated?.status).toBe("pago");
  });

  it("grava public_id não nulo, lê where public_id e rejeita duplicata", async () => {
    const token = "token-unico-do-dono";
    await persistOrder(db, sampleOrder("LM100001", token));
    const found = await db
      .select({ code: orders.code, publicId: orders.publicId, email: orders.customerEmail })
      .from(orders)
      .where(sql`${orders.publicId} = ${token}`);
    expect(found).toEqual([{ code: "LM100001", publicId: token, email: "dono@example.com" }]);
    expect(found[0]?.publicId).toBeTruthy();

    const store = createPostgresStore(db);
    expect((await store.orderByPublicId(token, "dono@example.com"))?.code).toBe("LM100001");
    expect(await store.orderByPublicId(token, "outro@example.com")).toBeUndefined();

    await expect(persistOrder(db, sampleOrder("LM100002", token, "outro@example.com"))).rejects.toThrow();
    const afterDuplicate = await db.select({ code: orders.code }).from(orders).where(sql`${orders.publicId} = ${token}`);
    expect(afterDuplicate.map((row) => row.code)).toEqual(["LM100001"]);

    await persistOrder(db, { ...sampleOrder("LM100001", token), status: "pago" });
    const upserted = await db.select({ code: orders.code, publicId: orders.publicId, status: orders.status }).from(orders).where(eq(orders.code, "LM100001"));
    expect(upserted).toEqual([{ code: "LM100001", publicId: token, status: "pago" }]);

    await db.execute(sql`
      insert into orders (
        code, status, customer_name, customer_email, customer_phone, method, provider,
        installments, subtotal_cents, shipping_cents, total_cents, cep, payload
      ) values (
        'LM-SEM-ID', 'aguardando_pagamento', 'Gustavo Teste', 'antigo@example.com', '11999990000', 'pix', 'mock',
        1, 1000, 0, 1000, '01310100', '{"publicId":"so-no-payload"}'::jsonb
      )
    `);
    expect(await store.orderByPublicId("so-no-payload")).toBeUndefined();
    const [legacy] = await db.select({ publicId: orders.publicId }).from(orders).where(eq(orders.code, "LM-SEM-ID"));
    expect(legacy?.publicId).toBeNull();
  });

  it("mantém a sessão do cliente e a do admin, apaga no logout e expira em 12 horas", async () => {
    const now = Date.parse("2026-06-01T12:00:00.000Z");
    const box = inbox();
    const email = "sessao@example.com";
    const first = createApp({ db, now: () => new Date(now), mailer: box.mailer });
    await first.request("/v1/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "sessao-pede" },
      body: JSON.stringify({ email }),
    });
    const code = codeOf(box.sent[0]?.text ?? "");
    const verified = await first.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const token = (await verified.json()).token as string;
    const account = await createApp({ db, now: () => new Date(now) }).request("/v1/account/orders", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(account.status).toBe(200);
    const customerRows = await db.select().from(sessions).where(eq(sessions.token, token));
    expect(customerRows[0]?.kind).toBe("customer");
    expect(customerRows[0]?.email).toBe(email);

    process.env.ADMIN_PASSWORD_HASH = hashAdminPassword(password);
    const login = await first.request("/v1/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "admin-sessao" },
      body: JSON.stringify({ password }),
    });
    const cookie = cookiePair(login);
    const open = await createApp({ db, now: () => new Date(now) }).request("/v1/admin/overview", { headers: { cookie } });
    expect(open.status).toBe(200);
    const adminToken = cookie.split("=")[1] ?? "";
    const adminRows = await db.select().from(sessions).where(eq(sessions.token, adminToken));
    expect(adminRows[0]?.kind).toBe("admin");
    expect(adminRows[0]?.email).toBeNull();
    const expires = adminRows[0]?.expiresAt ? new Date(adminRows[0].expiresAt).getTime() : 0;
    expect(expires - now).toBe(12 * 60 * 60 * 1000);

    await createApp({ db, now: () => new Date(now) }).request("/v1/admin/logout", { method: "POST", headers: { cookie } });
    const afterLogout = await db.select().from(sessions).where(eq(sessions.token, adminToken));
    expect(afterLogout).toHaveLength(0);
    const closed = await createApp({ db, now: () => new Date(now) }).request("/v1/admin/overview", { headers: { cookie } });
    expect(closed.status).toBe(401);

    const again = await createApp({ db, now: () => new Date(now) }).request("/v1/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "admin-expira" },
      body: JSON.stringify({ password }),
    });
    const nextCookie = cookiePair(again);
    const later = now + 12 * 60 * 60 * 1000;
    const expired = await createApp({ db, now: () => new Date(later) }).request("/v1/admin/overview", {
      headers: { cookie: nextCookie },
    });
    expect(expired.status).toBe(401);
    const gone = await db.select().from(sessions).where(eq(sessions.token, nextCookie.split("=")[1] ?? ""));
    expect(gone).toHaveLength(0);
  });

  it("guarda só o hash, substitui no reenvio e apaga na quinta falha", async () => {
    let now = Date.parse("2026-06-02T12:00:00.000Z");
    const box = inbox();
    const email = "codigo@example.com";
    const app = createApp({ db, now: () => new Date(now), mailer: box.mailer });
    const sent = await app.request("/v1/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "codigo-1" },
      body: JSON.stringify({ email }),
    });
    expect(sent.status).toBe(200);
    const code = codeOf(box.sent[0]?.text ?? "");
    const [row] = await db.select().from(loginCodes).where(eq(loginCodes.email, email));
    expect(row?.hash).toBeTruthy();
    expect(row?.salt).toBeTruthy();
    expect(row?.hash).not.toContain(code);
    expect(row?.attempts).toBe(0);

    now += 60_000;
    const renewed = await createApp({ db, now: () => new Date(now), mailer: box.mailer }).request("/v1/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "codigo-2" },
      body: JSON.stringify({ email }),
    });
    expect(renewed.status).toBe(200);
    const [replaced] = await db.select().from(loginCodes).where(eq(loginCodes.email, email));
    expect(replaced?.hash).not.toBe(row?.hash);
    expect(replaced?.attempts).toBe(0);
    const rows = await db.select().from(loginCodes).where(eq(loginCodes.email, email));
    expect(rows).toHaveLength(1);

    const next = codeOf(box.sent[1]?.text ?? "");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const wrong = await createApp({ db, now: () => new Date(now) }).request("/v1/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: "000000" }),
      });
      expect((await wrong.json()).error).toBe("codigo_invalido");
    }
    const last = await createApp({ db, now: () => new Date(now) }).request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code: "000000" }),
    });
    expect((await last.json()).error).toBe("codigo_esgotado");
    const left = await db.select().from(loginCodes).where(eq(loginCodes.email, email));
    expect(left).toHaveLength(0);
    const fresh = await createApp({ db, now: () => new Date(now) }).request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code: next }),
    });
    expect(fresh.status).toBe(400);
  });

  it("relê test ride, troca e serviço no overview de outro processo", async () => {
    const first = createApp({ db });
    const ride = await first.request("/v1/test-rides", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "ride-pg" },
      body: JSON.stringify({
        productId: "s",
        dealerId: "sp-vila-madalena",
        name: "Gustavo Teste",
        email: "ride@example.com",
        phone: "11999990000",
        preferredDate: "2026-11-03",
      }),
    });
    expect(ride.status).toBe(200);
    const trade = await first.request("/v1/trade-ins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Gustavo Teste",
        email: "troca@example.com",
        phone: "11999990000",
        brand: "Usada",
        model: "150",
        year: 2018,
        km: 18000,
        city: "São Paulo",
      }),
    });
    expect(trade.status).toBe(200);
    const service = await first.request("/v1/service-bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dealerId: "sp-vila-madalena",
        productId: "apex",
        name: "Gustavo Teste",
        email: "servico@example.com",
        phone: "11999990000",
        preferredDate: "2026-11-02",
        note: "Revisão dos primeiros mil quilômetros.",
      }),
    });
    expect(service.status).toBe(200);

    expect(await db.select().from(testRideBookings)).not.toHaveLength(0);
    expect(await db.select().from(exchanges)).not.toHaveLength(0);
    expect(await db.select().from(serviceBookings)).not.toHaveLength(0);

    const overview = await createApp({ db }).request("/v1/admin/overview", { headers: { "x-admin-token": "dev-admin-token" } });
    const listed = await overview.json();
    expect(listed.bookings).toBeGreaterThanOrEqual(1);
    expect(listed.recentTradeIns.some((item: { brand: string }) => item.brand === "Usada")).toBe(true);
    expect(listed.recentService.some((item: { productId: string }) => item.productId === "apex")).toBe(true);
  });

  it("grava o estoque da cor e duas escritas simultâneas deixam uma linha", async () => {
    const app = createApp({ db });
    const headers = { "content-type": "application/json", "x-admin-token": "dev-admin-token" };
    const patch = (stock: number) =>
      app.request("/v1/admin/stock", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ productId: "s", colorId: "obsidiana", stock }),
      });
    const [left, right] = await Promise.all([patch(4), patch(11)]);
    expect(left.status).toBe(200);
    expect(right.status).toBe(200);
    const rows = await db.select().from(colorStock).where(eq(colorStock.productId, "lume-s"));
    const obsidiana = rows.filter((row) => row.colorId === "obsidiana");
    expect(obsidiana).toHaveLength(1);
    expect([4, 11]).toContain(obsidiana[0]?.stock);

    const seen = await createApp({ db }).request("/v1/admin/overview", { headers: { "x-admin-token": "dev-admin-token" } });
    const body = await seen.json();
    const product = body.products.find((item: { id: string }) => item.id === "lume-s");
    const color = product.colors.find((item: { id: string }) => item.id === "obsidiana");
    expect(color.stock).toBe(obsidiana[0]?.stock);

    await db.insert(colorStock).values({ productId: "p-concorrencia", colorId: "cor", stock: 0 });
    await Promise.all(
      Array.from({ length: 8 }, () =>
        db
          .update(colorStock)
          .set({ stock: sql`${colorStock.stock} + 1` })
          .where(eq(colorStock.productId, "p-concorrencia")),
      ),
    );
    const [bumped] = await db.select().from(colorStock).where(eq(colorStock.productId, "p-concorrencia"));
    expect(bumped?.stock).toBe(8);
  });
});
