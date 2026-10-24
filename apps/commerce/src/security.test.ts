import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearRateLimit, createApp } from "./app";
import { productionAdminTokenError, resolveCorsOrigin, sandboxEnabled } from "./env";
import { clearLoginCodes, LOGIN_TTL_MS, storedLoginHash } from "./login-code";
import type { OutboundMail } from "./mailer";
import { rateLimit, type RateCounter } from "./rate-limit";

const exec = promisify(execFile);
const saved = {
  NODE_ENV: process.env.NODE_ENV,
  STOREFRONT_ORIGIN: process.env.STOREFRONT_ORIGIN,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  LUME_ENABLE_SANDBOX: process.env.LUME_ENABLE_SANDBOX,
  SANDBOX: process.env.SANDBOX,
  MAILER_URL: process.env.MAILER_URL,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function inbox() {
  const sent: OutboundMail[] = [];
  return {
    sent,
    mailer: {
      async send(mail: OutboundMail) {
        sent.push(mail);
      },
    },
  };
}

function codeOf(text: string) {
  const found = text.match(/\b\d{6}\b/);
  if (!found) throw new Error("código ausente no envio");
  return found[0];
}

const checkout = {
  lines: [{ productId: "s", colorId: "obsidiana", accessoryIds: [] as string[], qty: 1 }],
  cep: "05435-000",
  shippingServiceId: "dedicado",
  method: "pix" as const,
  installments: 1,
  customer: { name: "Cliente Teste", email: "Cliente@Example.com", phone: "11999990000" },
};

async function place(app: ReturnType<typeof createApp>, email = checkout.customer.email) {
  const response = await app.request("/v1/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...checkout, customer: { ...checkout.customer, email } }),
  });
  const body = await response.json();
  expect(response.status).toBe(200);
  return body.order as { code: string; publicId: string; status: string; customer: { email: string } };
}

describe("segurança", () => {
  afterEach(() => {
    restoreEnv();
    clearLoginCodes();
    clearRateLimit();
    vi.restoreAllMocks();
  });

  it("envia código de uso único, guarda só o hash e recusa o reenvio imediato", async () => {
    let now = Date.parse("2026-06-01T12:00:00.000Z");
    const box = inbox();
    const app = createApp({ now: () => new Date(now), mailer: box.mailer });
    const email = "otp@example.com";
    const response = await app.request("/v1/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await response.json();
    const code = codeOf(box.sent[0]?.text ?? "");
    const hash = storedLoginHash(email);
    expect(response.status).toBe(200);
    expect(body).toEqual({ email, message: "Código enviado." });
    expect(JSON.stringify(body)).not.toContain(code);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(code);

    const again = await app.request("/v1/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const cooled = await again.json();
    expect(again.status).toBe(429);
    expect(cooled).toEqual({ error: "limite", message: "Espere um minuto para pedir outro código." });
    expect(box.sent).toHaveLength(1);
    expect(storedLoginHash(email)).toBe(hash);

    now += 60_000;
    const renewed = await app.request("/v1/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    expect(renewed.status).toBe(200);
    const next = codeOf(box.sent[1]?.text ?? "");
    const stale = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    expect((await stale.json()).error).toBe("codigo_invalido");
    const fresh = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code: next }),
    });
    expect(fresh.status).toBe(200);
    expect(storedLoginHash(email)).toBeNull();
    const reuse = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code: next }),
    });
    expect(reuse.status).toBe(400);
    expect((await reuse.json()).error).toBe("codigo_invalido");
  });

  it("expira em 10 minutos, esgota na quinta falha e ainda aceita o código certo na quinta tentativa", async () => {
    let now = Date.parse("2026-06-01T12:00:00.000Z");
    const box = inbox();
    const app = createApp({ now: () => new Date(now), mailer: box.mailer });
    const email = "prazo@example.com";
    await app.request("/v1/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const code = codeOf(box.sent[0]?.text ?? "");
    now += LOGIN_TTL_MS;
    const expired = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    expect(expired.status).toBe(400);
    expect((await expired.json()).error).toBe("codigo_expirado");
    expect(storedLoginHash(email)).toBeNull();

    const burned = inbox();
    const burnApp = createApp({ now: () => new Date(now), mailer: burned.mailer });
    const burnEmail = "tentativas@example.com";
    await burnApp.request("/v1/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: burnEmail }),
    });
    const burnCode = codeOf(burned.sent[0]?.text ?? "");
    const wrong = burnCode === "000000" ? "000001" : "000000";
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const failed = await burnApp.request("/v1/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: burnEmail, code: wrong }),
      });
      expect((await failed.json()).error).toBe("codigo_invalido");
    }
    const last = await burnApp.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: burnEmail, code: burnCode }),
    });
    expect(last.status).toBe(200);

    const spent = inbox();
    const spentApp = createApp({ now: () => new Date(now), mailer: spent.mailer });
    const spentEmail = "esgotado@example.com";
    await spentApp.request("/v1/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: spentEmail }),
    });
    const spentCode = codeOf(spent.sent[0]?.text ?? "");
    const other = spentCode === "111111" ? "111112" : "111111";
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await spentApp.request("/v1/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: spentEmail, code: other }),
      });
    }
    const blocked = await spentApp.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: spentEmail, code: other }),
    });
    expect((await blocked.json()).error).toBe("codigo_esgotado");
    const after = await spentApp.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: spentEmail, code: spentCode }),
    });
    expect((await after.json()).error).toBe("codigo_invalido");
  });

  it("só aceita LUME-SANDBOX em teste ou com SANDBOX fora de produção", async () => {
    const app = createApp();
    const allowed = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "sandbox@example.com", code: "LUME-SANDBOX" }),
    });
    expect(allowed.status).toBe(200);

    process.env.NODE_ENV = "development";
    delete process.env.SANDBOX;
    const dev = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "sandbox@example.com", code: "lume-sandbox" }),
    });
    expect((await dev.json()).error).toBe("codigo_invalido");

    process.env.SANDBOX = "true";
    const flagged = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "sandbox@example.com", code: "LUME-SANDBOX" }),
    });
    expect(flagged.status).toBe(200);

    process.env.NODE_ENV = "production";
    process.env.SANDBOX = "1";
    const production = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "sandbox@example.com", code: "LUME-SANDBOX" }),
    });
    expect(production.status).toBe(400);
    expect((await production.json()).error).toBe("codigo_invalido");
  });

  it("não grava o código se o envio falha e, em produção sem provedor, responde 503 sem logar", async () => {
    const app = createApp({
      mailer: {
        async send() {
          throw new Error("smtp");
        },
      },
    });
    const failed = await app.request("/v1/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "falha@example.com" }),
    });
    expect(failed.status).toBe(500);
    expect(storedLoginHash("falha@example.com")).toBeNull();

    delete process.env.MAILER_URL;
    process.env.NODE_ENV = "production";
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const closed = createApp();
    const response = await closed.request("/v1/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "prod@example.com" }),
    });
    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("email_indisponivel");
    expect(storedLoginHash("prod@example.com")).toBeNull();
    expect(info.mock.calls.some((call) => String(call[0]).includes("mail_log"))).toBe(false);

    process.env.MAILER_URL = "http://mailer.test/send";
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(init?.body ?? ""));
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    try {
      const posted = createApp();
      const sent = await posted.request("/v1/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "fila@example.com" }),
      });
      const body = await sent.json();
      const code = codeOf(calls[0] ?? "");
      expect(sent.status).toBe(200);
      expect(JSON.stringify(body)).not.toContain(code);
      const session = await posted.request("/v1/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "fila@example.com", code }),
      });
      expect(session.status).toBe(200);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("registra o código no log quando não há provedor fora de produção", async () => {
    delete process.env.MAILER_URL;
    process.env.NODE_ENV = "development";
    const lines: string[] = [];
    vi.spyOn(console, "info").mockImplementation((line?: unknown) => {
      lines.push(String(line));
    });
    const app = createApp();
    const response = await app.request("/v1/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "log@example.com" }),
    });
    const body = await response.json();
    const logged = lines.find((line) => line.includes("mail_log"));
    const code = codeOf(logged ?? "");
    expect(response.status).toBe(200);
    expect(body.message).toBe("Código enviado.");
    expect(JSON.stringify(body)).not.toContain(code);
    expect(storedLoginHash("log@example.com")).not.toBe(code);
  });

  it("exige o cliente do pedido no código LM e abre pelo identificador público", async () => {
    const app = createApp();
    const order = await place(app);
    expect(order.code).toMatch(/^LM\d{6}$/);
    expect(order.publicId.length).toBeGreaterThanOrEqual(32);
    expect(order.publicId).not.toBe(order.code);

    const hidden = await app.request(`/v1/orders/${order.code}`);
    expect(hidden.status).toBe(404);
    expect((await hidden.json()).error).toBe("pedido_inexistente");

    const wrong = await app.request(`/v1/orders/${order.code}?email=outra@example.com`);
    expect(wrong.status).toBe(404);

    const byEmail = await app.request(`/v1/orders/${order.code.toLowerCase()}?email=cliente@example.com`);
    expect(byEmail.status).toBe(200);
    expect((await byEmail.json()).order.publicId).toBe(order.publicId);

    const session = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "cliente@example.com", code: "LUME-SANDBOX" }),
    });
    const token = (await session.json()).token as string;
    const bySession = await app.request(`/v1/orders/${order.code}`, { headers: { authorization: `Bearer ${token}` } });
    expect(bySession.status).toBe(200);

    const stranger = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "outra@example.com", code: "LUME-SANDBOX" }),
    });
    const other = (await stranger.json()).token as string;
    const denied = await app.request(`/v1/orders/${order.code}`, { headers: { authorization: `Bearer ${other}` } });
    expect(denied.status).toBe(404);

    const open = await app.request(`/v1/orders/${order.publicId}`);
    expect(open.status).toBe(200);
    expect((await open.json()).order.code).toBe(order.code);

    const account = await app.request("/v1/account/orders", { headers: { authorization: `Bearer ${token}` } });
    const listed = await account.json();
    expect(listed.orders[0].publicId).toBe(order.publicId);
    expect(listed.orders[0].code).toBe(order.code);
  });

  it("limita a consulta do pedido e só avança o sandbox com a flag", async () => {
    const app = createApp();
    const order = await place(app, "limite@example.com");
    for (let hit = 0; hit < 20; hit += 1) {
      const response = await app.request(`/v1/orders/${order.publicId}`);
      expect(response.status).toBe(200);
    }
    const limited = await app.request(`/v1/orders/${order.publicId}`);
    expect(limited.status).toBe(429);
    expect((await limited.json()).error).toBe("limite");

    clearRateLimit();
    delete process.env.LUME_ENABLE_SANDBOX;
    expect(sandboxEnabled()).toBe(false);
    const closed = await app.request(`/v1/orders/${order.publicId}/sandbox`, { method: "POST" });
    expect(closed.status).toBe(404);
    expect((await closed.json()).error).toBe("nao_encontrado");
    const waiting = await app.request(`/v1/orders/${order.publicId}`);
    expect((await waiting.json()).order.status).toBe("aguardando_pagamento");

    process.env.NODE_ENV = "production";
    process.env.LUME_ENABLE_SANDBOX = "1";
    expect(sandboxEnabled()).toBe(true);
    const moved = await app.request(`/v1/orders/${order.publicId}/sandbox`, { method: "POST" });
    expect(moved.status).toBe(200);
    expect((await moved.json()).order.status).toBe("pago");

    process.env.LUME_ENABLE_SANDBOX = " TRUE ";
    expect(sandboxEnabled()).toBe(true);
    const again = await app.request(`/v1/orders/${order.code}/sandbox`, { method: "POST" });
    expect(again.status).toBe(200);
    expect((await again.json()).order.status).toBe("em_preparo");

    delete process.env.LUME_ENABLE_SANDBOX;
    process.env.NODE_ENV = "development";
    const blockedCode = await app.request(`/v1/orders/${order.code}/sandbox`, { method: "POST" });
    const blockedId = await app.request(`/v1/orders/${order.publicId}/sandbox`, { method: "POST" });
    expect(blockedCode.status).toBe(404);
    expect((await blockedCode.json()).error).toBe("nao_encontrado");
    expect(blockedId.status).toBe(404);
    const still = await app.request(`/v1/orders/${order.publicId}`);
    expect((await still.json()).order.status).toBe("em_preparo");
  });

  it("fecha o CORS sem CORS_ORIGINS e reflete só a lista", async () => {
    const app = createApp();
    delete process.env.CORS_ORIGINS;
    process.env.STOREFRONT_ORIGIN = "https://legado.test";
    process.env.NODE_ENV = "development";
    expect(resolveCorsOrigin("https://legado.test")).toBeNull();
    expect(resolveCorsOrigin("")).toBeNull();
    const devClosed = await app.request("/health", { headers: { origin: "https://qualquer.test" } });
    expect(devClosed.headers.get("access-control-allow-origin")).toBeNull();
    expect(devClosed.status).toBe(200);

    process.env.NODE_ENV = "production";
    const closed = await app.request("/health", { headers: { origin: "https://evil.test" } });
    expect(closed.headers.get("access-control-allow-origin")).toBeNull();

    process.env.NODE_ENV = "test";
    process.env.CORS_ORIGINS = "https://loja.test, https://www.loja.test";
    const allowed = await app.request("/health", { headers: { origin: "https://www.loja.test" } });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://www.loja.test");
    const foreign = await app.request("/health", { headers: { origin: "https://evil.test" } });
    expect(foreign.headers.get("access-control-allow-origin")).toBeNull();
    const star = await app.request("/health", { headers: { origin: "*" } });
    expect(star.headers.get("access-control-allow-origin")).toBeNull();
    const preflight = await app.request("/health", {
      method: "OPTIONS",
      headers: {
        origin: "https://loja.test",
        "access-control-request-method": "GET",
        "access-control-request-headers": "authorization",
      },
    });
    expect(preflight.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("authorization");
    expect(preflight.headers.get("access-control-allow-origin")).toBe("https://loja.test");

    delete process.env.CORS_ORIGINS;
    process.env.NODE_ENV = "production";
    const legacy = await app.request("/health", { headers: { origin: "https://legado.test" } });
    expect(legacy.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("recusa o arranque em produção sem ADMIN_TOKEN forte", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_TOKEN;
    expect(productionAdminTokenError()).toBe("ADMIN_TOKEN ausente ou fraco. A API não sobe em produção.");
    process.env.ADMIN_TOKEN = "dev-admin-token";
    expect(productionAdminTokenError()).toMatch(/não sobe/);
    process.env.ADMIN_TOKEN = "troque-este-token";
    expect(productionAdminTokenError()).toMatch(/não sobe/);
    process.env.ADMIN_TOKEN = "a".repeat(24);
    expect(productionAdminTokenError()).toBeNull();
    process.env.NODE_ENV = "test";
    delete process.env.ADMIN_TOKEN;
    expect(productionAdminTokenError()).toBeNull();

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value === "string") env[key] = value;
    }
    env.NODE_ENV = "production";
    env.ADMIN_TOKEN = "dev-admin-token";
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
    expect(`${failed?.stderr ?? ""}${failed?.stdout ?? ""}`).toContain("boot_recusado");
  }, 30_000);

  it("usa o contador injetado e cai para a memória se o Redis falha", async () => {
    let count = 0;
    let expired = 0;
    const counter: RateCounter = {
      incr() {
        count += 1;
        return count;
      },
      pexpire() {
        expired += 1;
      },
    };
    expect(await rateLimit("redis", 1, counter)).toBe(false);
    expect(await rateLimit("redis", 1, counter)).toBe(true);
    expect(expired).toBe(1);

    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((line?: unknown) => {
      errors.push(String(line));
    });
    const down: RateCounter = {
      incr() {
        throw new Error("down");
      },
      pexpire() {
        return undefined;
      },
    };
    expect(await rateLimit("memoria", 1, down)).toBe(false);
    expect(await rateLimit("memoria", 1, down)).toBe(true);
    expect(errors.some((line) => line.includes("redis_indisponivel"))).toBe(true);
  });
});
