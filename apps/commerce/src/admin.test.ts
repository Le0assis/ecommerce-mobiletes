import { afterEach, describe, expect, it } from "vitest";
import { hashAdminPassword } from "./auth";
import { clearRateLimit, createApp } from "./app";
import { createPostgresCatalog } from "./db/postgres-catalog";
import { openTestDatabase } from "./db/test-database";

const password = "senha-de-teste";

afterEach(() => {
  delete process.env.ADMIN_PASSWORD_HASH;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.TRUSTED_PROXIES;
  delete process.env.VERCEL;
  clearRateLimit();
});

function cookiePair(response: Response) {
  const header = response.headers.get("set-cookie") ?? "";
  return header.split(";")[0] ?? "";
}

describe("admin", () => {
  it("recusa login sem hash e limita tentativas", async () => {
    const app = createApp();
    const denied = await app.request("/v1/admin/products");
    expect(denied.status).toBe(401);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await app.request("/v1/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "limite-admin" },
        body: JSON.stringify({ password }),
      });
      expect(response.status).toBe(503);
    }
    const limited = await app.request("/v1/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "limite-admin" },
      body: JSON.stringify({ password }),
    });
    expect(limited.status).toBe(429);
  });

  it("abre sessão httpOnly e em produção exige o cookie", async () => {
    process.env.ADMIN_PASSWORD_HASH = hashAdminPassword(password);
    const app = createApp();
    const wrong = await app.request("/v1/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "senha-errada" },
      body: JSON.stringify({ password: "outra-senha" }),
    });
    expect(wrong.status).toBe(401);

    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const headerOnly = await app.request("/v1/admin/overview", { headers: { "x-admin-token": "dev-admin-token" } });
      expect(headerOnly.status).toBe(401);

      const login = await app.request("/v1/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "sessao-prod" },
        body: JSON.stringify({ password }),
      });
      expect(login.status).toBe(200);
      const setCookie = login.headers.get("set-cookie") ?? "";
      expect(setCookie.toLowerCase()).toContain("httponly");
      expect(setCookie.toLowerCase()).toContain("samesite=lax");
      expect(setCookie.toLowerCase()).toContain("secure");
      expect(setCookie).not.toContain(password);

      const overview = await app.request("/v1/admin/overview", { headers: { cookie: cookiePair(login) } });
      expect(overview.status).toBe(200);

      const logout = await app.request("/v1/admin/logout", {
        method: "POST",
        headers: { cookie: cookiePair(login) },
      });
      expect(logout.status).toBe(200);
      const cleared = (logout.headers.get("set-cookie") ?? "").toLowerCase();
      expect(cleared).toContain("httponly");
      expect(cleared).toContain("samesite=lax");
      expect(cleared).toContain("secure");
      expect(cleared).toContain("path=/");
      expect(cleared).toContain("max-age=0");
      const again = await app.request("/v1/admin/overview", { headers: { cookie: cookiePair(login) } });
      expect(again.status).toBe(401);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("expira a sessão no servidor depois de 12 horas", async () => {
    process.env.ADMIN_PASSWORD_HASH = hashAdminPassword(password);
    let clock = new Date("2026-10-23T12:00:00.000Z");
    const app = createApp({ now: () => clock });
    const login = await app.request("/v1/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const cookie = cookiePair(login);
    clock = new Date(clock.getTime() + 12 * 60 * 60 * 1000 - 1);
    const open = await app.request("/v1/admin/overview", { headers: { cookie } });
    expect(open.status).toBe(200);
    clock = new Date(clock.getTime() + 1);
    const expired = await app.request("/v1/admin/overview", { headers: { cookie } });
    expect(expired.status).toBe(401);
  });

  it("ignora x-forwarded-for fora de um proxy confiável", async () => {
    const app = createApp();
    const peer = { incoming: { socket: { remoteAddress: "203.0.113.10" } } };
    const attempt = (forwarded: string, env: { incoming: { socket: { remoteAddress: string } } } = peer) =>
      app.request(
        "/v1/admin/login",
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": forwarded },
          body: JSON.stringify({ password }),
        },
        env,
      );

    for (let index = 0; index < 8; index += 1) {
      expect((await attempt(`1.1.1.${index}`)).status).toBe(503);
    }
    expect((await attempt("8.8.8.8")).status).toBe(429);
    expect((await attempt("8.8.8.8", { incoming: { socket: { remoteAddress: "203.0.113.11" } } })).status).toBe(503);

    process.env.TRUSTED_PROXIES = "10.0.0.8";
    const proxy = { incoming: { socket: { remoteAddress: "10.0.0.8" } } };
    for (let index = 0; index < 8; index += 1) {
      expect((await attempt(`9.9.9.${index}, 198.51.100.4`, proxy)).status).toBe(503);
    }
    expect((await attempt("1.2.3.4, 198.51.100.4", proxy)).status).toBe(429);
    expect((await attempt("9.9.9.9, 198.51.100.5", proxy)).status).toBe(503);

    delete process.env.TRUSTED_PROXIES;
    process.env.VERCEL = "1";
    const onVercel = (client: string, spoof: string) =>
      app.request("/v1/admin/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": spoof,
          "x-vercel-forwarded-for": client,
        },
        body: JSON.stringify({ password }),
      });
    for (let index = 0; index < 8; index += 1) {
      expect((await onVercel("203.0.113.50", `4.4.4.${index}`)).status).toBe(503);
    }
    expect((await onVercel("203.0.113.50", "9.9.9.9")).status).toBe(429);
    expect((await onVercel("203.0.113.51", "9.9.9.9")).status).toBe(503);
  });

  it("cria produto com selo no limite, arquiva em vez de apagar e esconde avaria privada", async () => {
    process.env.ADMIN_PASSWORD_HASH = hashAdminPassword(password);
    const database = await openTestDatabase();
    const now = () => new Date("2026-10-23T12:00:00.000Z");
    const app = createApp({
      now,
      catalog: createPostgresCatalog(database.db, { now }),
      persistent: true,
    });
    try {
    const login = await app.request("/v1/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "crud-admin" },
      body: JSON.stringify({ password }),
    });
    const cookie = cookiePair(login);
    const headers = { cookie, "content-type": "application/json" };

    const created = await app.request("/v1/admin/products", {
      method: "POST",
      headers,
      body: JSON.stringify({
        slug: "oficina-limite",
        name: "Oficina Limite",
        brand: "LUME",
        category: "scooter",
        style: "retro",
        tagline: "No teto da resolução.",
        description: "Dado de teste para os quatro limites.",
        basePriceCents: 600_000,
        status: "ativo",
        isSample: true,
        specs: { powerNominalW: 1000, topSpeedKmh: 32, widthCm: 70, wheelbaseCm: 130 },
      }),
    });
    const product = await created.json();
    expect(created.status).toBe(200);
    expect(product.product.autopropelido.eligible).toBe(true);
    expect(product.product.autopropelido.label).toBe("Autopropelido, sem CNH");

    const variant = await app.request(`/v1/admin/products/${product.product.id}/variants`, {
      method: "POST",
      headers,
      body: JSON.stringify({ sku: "OFICINA-LIMITE", colorName: "Névoa", colorHex: "#c5c8ce", stock: 2 }),
    });
    expect(variant.status).toBe(200);

    const badImage = await app.request(`/v1/admin/products/${product.product.id}/images`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url: "javascript:alert(1)" }),
    });
    expect(badImage.status).toBe(400);

    const image = await app.request(`/v1/admin/products/${product.product.id}/images`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url: "https://cdn.example/capa.jpg", alt: "Capa", isCover: true }),
    });
    const second = await app.request(`/v1/admin/products/${product.product.id}/images`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url: "https://cdn.example/lado.png", alt: "Lado" }),
    });
    const cover = await image.json();
    const extra = await second.json();
    const ordered = await app.request(`/v1/admin/products/${product.product.id}/images`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        images: [
          { id: extra.image.id, position: 0, isCover: true },
          { id: cover.image.id, position: 1, isCover: false },
        ],
      }),
    });
    const images = await ordered.json();
    expect(ordered.status).toBe(200);
    expect(images.images[0].id).toBe(extra.image.id);
    expect(images.images[0].isCover).toBe(true);

    const copy = await app.request(`/v1/admin/products/${product.product.id}/duplicate`, { method: "POST", headers });
    const duplicated = await copy.json();
    expect(duplicated.product.status).toBe("rascunho");
    expect(duplicated.product.slug).toBe("oficina-limite-copia");

    await app.request("/v1/admin/damages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: product.product.id,
        description: "Risco na carenagem esquerda.",
        severity: "leve",
        discountCents: 15_000,
        isPublic: true,
      }),
    });
    await app.request("/v1/admin/damages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: product.product.id,
        description: "Avaria interna que não vai para o site.",
        severity: "moderada",
        isPublic: false,
      }),
    });

    const pub = await app.request("/v1/products/oficina-limite");
    const body = await pub.json();
    expect(pub.status).toBe(200);
    expect(body.product.autopropelido.eligible).toBe(true);
    expect(body.product.damages).toHaveLength(1);
    expect(body.product.damages[0].description).toContain("carenagem");
    expect(body.product.isSample).toBe(true);

    const archived = await app.request(`/v1/admin/products/${product.product.id}`, { method: "DELETE", headers });
    const stored = await archived.json();
    expect(stored.product.status).toBe("arquivado");
    const hidden = await app.request("/v1/products/oficina-limite");
    expect(hidden.status).toBe(404);
    const stillThere = await app.request("/v1/admin/products?q=oficina-limite", { headers });
    const list = await stillThere.json();
    expect(list.products.some((item: { status: string }) => item.status === "arquivado")).toBe(true);
    } finally {
      await database.close();
    }
  });

  it("mostra o selo oculto no exemplo sem largura e publica só o banner ativo", async () => {
    const app = createApp();
    const sample = await app.request("/v1/products/yadea-dt3");
    const body = await sample.json();
    expect(sample.status).toBe(200);
    expect(body.product.isSample).toBe(true);
    expect(body.product.autopropelido.eligible).toBe(false);
    expect(body.product.autopropelido.missing).toEqual(expect.arrayContaining(["widthCm", "wheelbaseCm"]));

    const headers = { "content-type": "application/json", "x-admin-token": "dev-admin-token" };
    const created = await app.request("/v1/admin/banners", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Quiz novo",
        href: "/me-ajude-a-escolher",
        imageUrl: "https://cdn.example/quiz.webp",
        position: 0,
        active: true,
      }),
    });
    expect(created.status).toBe(200);
    const hidden = await app.request("/v1/admin/banners", {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "Oculto", href: "/motos", active: false, position: 9 }),
    });
    expect(hidden.status).toBe(200);
    const banners = await app.request("/v1/banners");
    const listed = await banners.json();
    const titles = listed.banners.map((item: { title: string }) => item.title);
    expect(titles).toContain("Quiz novo");
    expect(titles).not.toContain("Oculto");
    expect(listed.banners.find((item: { title: string }) => item.title === "Quiz novo").imageUrl).toBe("https://cdn.example/quiz.webp");

    const script = await app.request("/v1/admin/banners", {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "Script", href: "javascript:alert(1)" }),
    });
    expect(script.status).toBe(400);
    const protocol = await app.request("/v1/admin/banners", {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "Relativo", href: "//cdn.example/slide", imageUrl: "javascript:alert(1)" }),
    });
    expect(protocol.status).toBe(400);
  });

  it("assina upload só para admin e só em JPG, PNG ou WebP", async () => {
    const app = createApp({
      blobSigner: async (input) => ({ clientToken: "cliente-assinado", pathname: `lume/${input.filename}` }),
    });
    const anonymous = await app.request("/v1/admin/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: "foto.jpg", contentType: "image/jpeg" }),
    });
    expect(anonymous.status).toBe(401);

    const headers = { "content-type": "application/json", "x-admin-token": "dev-admin-token" };
    const rejected = await app.request("/v1/admin/uploads", {
      method: "POST",
      headers,
      body: JSON.stringify({ filename: "foto.gif", contentType: "image/gif" }),
    });
    expect(rejected.status).toBe(400);

    const signed = await app.request("/v1/admin/uploads", {
      method: "POST",
      headers,
      body: JSON.stringify({ filename: "foto.webp", contentType: "image/webp" }),
    });
    const body = await signed.json();
    expect(signed.status).toBe(200);
    expect(body.clientToken).toBe("cliente-assinado");
    expect(body.pathname).toBe("lume/foto.webp");
    expect(JSON.stringify(body)).not.toContain("BLOB_READ_WRITE_TOKEN");

    const missing = createApp();
    const unavailable = await missing.request("/v1/admin/uploads", {
      method: "POST",
      headers,
      body: JSON.stringify({ filename: "foto.jpg", contentType: "image/jpeg" }),
    });
    const problem = await unavailable.json();
    expect(unavailable.status).toBe(503);
    expect(problem.message).toContain("BLOB_READ_WRITE_TOKEN");
  });
});
