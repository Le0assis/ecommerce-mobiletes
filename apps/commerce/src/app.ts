import {
  DomainError,
  amountForMethod,
  authRequestBody,
  authVerifyBody,
  applyDiscount,
  couponDiscount,
  coupons,
  checkoutBody,
  configureBody,
  configurePrice,
  filterShowroom,
  getDealer,
  getMotorcycle,
  guides,
  packsFor,
  installmentByCount,
  installmentsBody,
  motorcycles,
  reviews,
  reviewBody,
  quizBody,
  recommendMotorcycles,
  selectProvider,
  shippingBody,
  assertShippingWeight,
  quoteShipping,
  stockPatchBody,
  serviceBody,
  testRideBody,
  tradeInBody,
} from "@lume/domain";
import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { ADMIN_COOKIE, mountCatalogRoutes } from "./catalog-routes";
import { clientAddress } from "./client-address";
import { CatalogUnavailable, createCatalog, type Catalog } from "./catalog-store";
import type { Database } from "./db/client";
import { createMemoryStore, createPostgresStore, type ExchangeRecord, type ServiceRecord, type StoredOrder, type TestRideRecord } from "./db/operations";
import { resolveCorsOrigin, adminToken } from "./env";
import { LoginError, requestLoginCode, verifyLoginCode } from "./login-code";
import { createMailer, MailUnavailable, type Mailer } from "./mailer";
import { publicCatalogProduct, publicDomainProduct } from "./public-product";
import { quoteCatalogProduct, type CatalogLine } from "./quote-catalog";
import { rateLimit, type RateCounter } from "./rate-limit";
import type { UploadRequest } from "./uploads";

type OrderRecord = StoredOrder & {
  status: "aguardando_pagamento" | "pago" | "em_preparo" | "em_transporte" | "entregue" | "recusado";
};

type ReviewRecord = (typeof reviews)[number] & { pending?: boolean };

export type CommerceDeps = {
  now?: () => Date;
  orders?: Map<string, StoredOrder>;
  bookings?: TestRideRecord[];
  onOrder?: (order: OrderRecord) => void;
  onBooking?: (booking: TestRideRecord) => void;
  extraReviews?: ReviewRecord[];
  stock?: Map<string, number>;
  banners?: Map<string, boolean>;
  db?: Database;
  blobSigner?: (input: UploadRequest) => Promise<{ clientToken: string; pathname: string }>;
  catalog?: Catalog;
  mailer?: Mailer;
  limiter?: RateCounter;
  /** Sem Postgres, criar/editar/arquivar produto, variante, foto, acessório e avaria responde 503. */
  persistent?: boolean;
};

export { clearRateLimit } from "./rate-limit";

function problem(error: unknown): { status: 400 | 429 | 500 | 503; body: { error: string; message: string } } {
  if (error instanceof LoginError || error instanceof MailUnavailable) {
    return { status: error.status, body: { error: error.code, message: error.message } };
  }
  if (error instanceof DomainError) {
    return { status: 400, body: { error: error.code, message: error.message } };
  }
  return { status: 500, body: { error: "erro_interno", message: "Não foi possível concluir agora." } };
}

function orderCode(now: Date) {
  const stamp = now.getFullYear().toString().slice(2);
  const salt = Math.floor(Math.random() * 9000 + 1000);
  return `LM${stamp}${salt}`;
}

export function createApp(deps: CommerceDeps = {}) {
  const store = deps.db
    ? createPostgresStore(deps.db)
    : createMemoryStore({ orders: deps.orders, bookings: deps.bookings, stock: deps.stock });
  const mailer = deps.mailer ?? createMailer();
  const limited = (key: string, limit: number) => rateLimit(key, limit, deps.limiter);
  const extraReviews = deps.extraReviews ?? [];
  const now = deps.now ?? (() => new Date());
  const catalog = deps.catalog ?? createCatalog({ now, bannerOverrides: deps.banners });

  async function quoteLine(line: CatalogLine) {
    const managed = await catalog.findProduct(line.productId);
    if (managed) {
      if (!managed.isEnabled || managed.status !== "ativo") {
        throw new DomainError("produto_desabilitado", "Esse modelo não está habilitado.");
      }
      return quoteCatalogProduct(managed, line, await catalog.listAccessories());
    }
    return configurePrice(line);
  }

  async function quizCatalog() {
    const managed = (await catalog.publicList({})).map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      basePriceCents: product.basePriceCents,
      rangeKm: product.specs.rangeKmDeclared ?? 0,
      topSpeedKmh: product.specs.topSpeedKmh ?? undefined,
      powerNominalW: product.specs.powerNominalW,
      style: product.style,
      batteryRemovable: product.specs.batteryRemovable,
      accessoryIds: product.accessories.map((item) => item.accessoryId),
      colors: product.variants.map((variant) => ({
        id: variant.id,
        name: variant.colorName,
        hex: variant.colorHex,
      })),
    }));
    const slugs = new Set(managed.map((item) => item.slug));
    return [...motorcycles.filter((item) => !slugs.has(item.slug)), ...managed];
  }

  async function authorized(c: Context) {
    const cookie = getCookie(c, ADMIN_COOKIE);
    if (cookie) {
      const session = await store.adminSession(cookie, now().getTime());
      if (session) return true;
    }
    if (process.env.NODE_ENV === "production") return false;
    const expected = adminToken();
    if (!expected) return false;
    return c.req.header("x-admin-token") === expected;
  }

  const app = new Hono();

  app.use("*", async (c, next) => {
    const started = Date.now();
    const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
    c.header("x-request-id", requestId);
    await next();
    console.log(
      JSON.stringify({
        msg: "request",
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        ms: Date.now() - started,
      }),
    );
  });

  app.use(
    "*",
    cors({
      origin: (origin) => resolveCorsOrigin(origin),
      allowHeaders: ["Content-Type", "Authorization", "x-admin-token", "x-request-id"],
    }),
  );

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "lume-commerce",
      persistence: process.env.DATABASE_URL ? "postgres-configurado" : "memoria",
    }),
  );

  app.get("/v1/products", async (c) => {
    const result = filterShowroom({
      q: c.req.query("q"),
      category: c.req.query("categoria") ?? undefined,
      city: c.req.query("cidade") ?? undefined,
      brand: c.req.query("marca") ?? undefined,
    });
    const accessories = await catalog.listAccessories();
    const managed = await catalog.publicList({
      q: c.req.query("q"),
      category: c.req.query("categoria") ?? undefined,
      brand: c.req.query("marca") ?? undefined,
      city: c.req.query("cidade") ?? undefined,
    });
    return c.json({
      products: [
        ...result.products.map(publicDomainProduct),
        ...managed.map((product) => publicCatalogProduct(product, accessories)),
      ],
    });
  });

  app.get("/v1/products/:slug", async (c) => {
    const slug = c.req.param("slug");
    const stored = await catalog.productBySlug(slug);
    if (stored && (stored.status !== "ativo" || !stored.isEnabled)) {
      return c.json({ error: "produto_inexistente", message: "Modelo não encontrado." }, 404);
    }
    const managed = await catalog.publicBySlug(slug);
    if (managed) {
      const product = publicCatalogProduct(managed, await catalog.listAccessories());
      return c.json({ product, accessories: product.accessories, reviews: [] });
    }
    const found = getMotorcycle(c.req.param("slug"));
    if (!found) return c.json({ error: "produto_inexistente", message: "Modelo não encontrado." }, 404);
    const product = publicDomainProduct(found);
    return c.json({
      product,
      accessories: product.accessories,
      reviews: [...reviews, ...extraReviews].filter((item) => item.productSlug === product.slug),
    });
  });

  app.get("/v1/reviews", (c) => {
    const slug = c.req.query("produto");
    const all = [...reviews, ...extraReviews];
    return c.json({ reviews: slug ? all.filter((item) => item.productSlug === slug) : all });
  });

  app.post("/v1/pricing/configure", async (c) => read(c, configureBody, (input) => quoteLine(input)));

  app.post("/v1/pricing/installments", async (c) =>
    read(c, installmentsBody, (input) => ({
      plans: Array.from({ length: input.max ?? 21 }, (_, index) => installmentByCount(input.amountCents, index + 1)),
    })),
  );

  app.post("/v1/shipping/quote", async (c) =>
    read(c, shippingBody, (input) => quoteShipping(input.cep, input.weightKg ?? Number.NaN)),
  );

  app.get("/v1/banners", async (c) => {
    const list = (await catalog.listBanners())
      .filter((item) => item.active)
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    return c.json({ banners: list });
  });

  app.post("/v1/quiz", async (c) =>
    read(c, quizBody, async (input) => ({
      recommendations: recommendMotorcycles(input, await quizCatalog()).map((item) => ({
        slug: item.product.slug,
        name: item.product.name,
        score: item.score,
        reasons: item.reasons,
        accessories: item.accessories,
      })),
    })),
  );

  app.post("/v1/test-rides", async (c) => {
    if (await limited(`ride:${clientAddress(c)}`, 20)) {
      return c.json({ error: "limite", message: "Muitas tentativas. Espere um minuto." }, 429);
    }
    return read(c, testRideBody, async (input) => {
      const product = getMotorcycle(input.productId);
      const dealer = getDealer(input.dealerId);
      if (!product) throw new DomainError("produto_inexistente", "Modelo não encontrado.");
      if (!dealer) throw new DomainError("loja_inexistente", "Loja não encontrada.");
      if (!dealer.testRideSlugs.includes(product.slug)) {
        throw new DomainError("test_ride_indisponivel", "Esse modelo não está nessa loja.");
      }
      const booking: TestRideRecord = { id: crypto.randomUUID(), ...input, productId: product.id, createdAt: now().toISOString() };
      await store.saveTestRide(booking);
      deps.onBooking?.(booking);
      return { booking };
    });
  });

  app.post("/v1/reviews", async (c) =>
    read(c, reviewBody, (input) => {
      const product = getMotorcycle(input.productId);
      if (!product) throw new DomainError("produto_inexistente", "Modelo não encontrado.");
      const review = {
        id: crypto.randomUUID(),
        productSlug: product.slug,
        city: input.city,
        rating: input.rating,
        title: input.title,
        body: input.body,
        monthsUsing: 0,
        pending: true,
      };
      extraReviews.push(review);
      return { review, message: "Recebemos o relato. Ele entra na página depois da moderação." };
    }),
  );

  app.post("/v1/checkout", async (c) => {
    if (await limited(`pay:${clientAddress(c)}`, 30)) {
      return c.json({ error: "limite", message: "Muitas tentativas. Espere um minuto." }, 429);
    }
    return read(c, checkoutBody, async (input) => {
      if (input.method !== "cartao" && input.installments !== 1) {
        throw new DomainError("parcelas_invalidas", "Pix e boleto são à vista.");
      }
      const quotes = [];
      for (const line of input.lines) {
        const quote = await quoteLine(line);
        quotes.push({ line, quote, lineCents: amountForMethod(input.method, quote) * line.qty });
      }
      const listCents = quotes.reduce((sum, item) => sum + item.quote.subtotalCents * item.line.qty, 0);
      const coupon = couponDiscount(listCents, input.couponCode);
      let goodsCents = quotes.reduce((sum, item) => sum + item.lineCents, 0);
      if (coupon && coupon.discountCents > 0) {
        const net = listCents - coupon.discountCents;
        goodsCents =
          input.method === "pix"
            ? applyDiscount(net, 500)
            : input.method === "boleto"
              ? applyDiscount(net, 300)
              : net;
      }
      for (const item of quotes) assertShippingWeight(item.quote.product.weightKg);
      const weight = quotes.reduce((sum, item) => sum + item.quote.product.weightKg * item.line.qty, 0);
      const shipping = quoteShipping(input.cep, weight);
      const service = shipping.services.find((item) => item.id === input.shippingServiceId);
      if (!service) throw new DomainError("frete_indisponivel", "Essa entrega não está disponível para o CEP.");
      const totalCents = goodsCents + service.priceCents;
      const plan = installmentByCount(totalCents, input.installments);
      const provider = selectProvider(input.method);
      const moment = now();
      let code = orderCode(moment);
      while (await store.hasOrderCode(code)) code = orderCode(moment);
      let publicId = randomBytes(32).toString("base64url");
      while (await store.hasPublicId(publicId)) publicId = randomBytes(32).toString("base64url");
      const record: OrderRecord = {
        code,
        publicId,
        status: "aguardando_pagamento",
        method: input.method,
        provider,
        installments: plan.count,
        installmentCents: plan.installmentCents,
        subtotalCents: goodsCents,
        shippingCents: service.priceCents,
        totalCents,
        cep: shipping.cep,
        customer: input.customer,
        couponCode: coupon?.code,
        couponCents: coupon?.discountCents,
        lines: quotes.map((item) => ({
          productId: item.quote.product.id,
          colorId: item.quote.color.id,
          accessoryIds: item.quote.accessories.map((accessory) => accessory.id),
          batteryId: item.quote.battery.id,
          qty: item.line.qty,
          cents: item.lineCents,
        })),
        createdAt: moment.toISOString(),
      };
      if (input.method === "pix") {
        record.pix = {
          copyPaste: `LUME-MOCK-PIX-${code}`,
          expiresAt: new Date(moment.getTime() + 30 * 60_000).toISOString(),
        };
      }
      if (input.method === "boleto") {
        const due = new Date(moment.getTime() + 3 * 24 * 60 * 60_000);
        record.boleto = { line: `34191.79001 01043.510047 91020.150008 7 00000000000000`, dueDate: due.toISOString().slice(0, 10) };
      }
      await store.saveOrder(record);
      deps.onOrder?.(record);
      return {
        order: record,
        message:
          "Pedido de demonstração. Nenhum pagamento foi enviado ao Mercado Pago ou à Pagar.me.",
      };
    });
  });

  app.get("/v1/orders/:code", async (c) => {
    if (await limited(`order:${clientAddress(c)}`, 20)) {
      return c.json({ error: "limite", message: "Muitas tentativas. Espere um minuto." }, 429);
    }
    const raw = c.req.param("code");
    const display = isDisplayCode(raw);
    const owner = await orderOwner(c, store, now().getTime());
    const order = await loadOrder(store, raw, display ? undefined : owner);
    if (!order || (display && !(await ownsOrder(c, order, store, now().getTime())))) {
      return c.json({ error: "pedido_inexistente", message: "Pedido não encontrado." }, 404);
    }
    return c.json({ order, tracking: trackingFor(order.status) });
  });

  app.post("/v1/orders/:code/sandbox", async (c) => {
    if (process.env.NODE_ENV === "production") {
      return c.json({ error: "nao_encontrado", message: "Não encontrado." }, 404);
    }
    const order = await loadOrder(store, c.req.param("code"));
    if (!order) return c.json({ error: "pedido_inexistente", message: "Pedido não encontrado." }, 404);
    const steps = ["aguardando_pagamento", "pago", "em_preparo", "em_transporte", "entregue"] as const;
    const index = steps.indexOf(order.status as (typeof steps)[number]);
    if (index < 0 || index === steps.length - 1) {
      return c.json({ error: "sandbox_recusado", message: "Esse pedido de sandbox não avança mais." }, 409);
    }
    order.status = steps[index + 1] ?? order.status;
    await store.saveOrderStatus(order);
    return c.json({
      order,
      tracking: trackingFor(order.status),
      message: "LUME-SANDBOX: nenhum valor foi capturado no Mercado Pago nem na Pagar.me.",
    });
  });

  app.post("/v1/service-bookings", async (c) =>
    read(c, serviceBody, async (input) => {
      const dealer = getDealer(input.dealerId);
      const product = getMotorcycle(input.productId);
      if (!dealer) throw new DomainError("loja_inexistente", "Loja não encontrada.");
      if (!product) throw new DomainError("produto_inexistente", "Modelo não encontrado.");
      const booking: ServiceRecord = { id: crypto.randomUUID(), ...input, createdAt: now().toISOString() };
      await store.saveService(booking);
      return {
        booking,
        message: "Horário de serviço pedido. A loja confirma.",
      };
    }),
  );

  app.post("/v1/trade-ins", async (c) =>
    read(c, tradeInBody, async (input) => {
      const tradeIn: ExchangeRecord = { id: crypto.randomUUID(), ...input, createdAt: now().toISOString() };
      await store.saveExchange(tradeIn);
      return { tradeIn, message: "Pedido de avaliação recebido. Nenhum valor foi oferecido." };
    }),
  );

  app.post("/v1/auth/request", async (c) =>
    read(c, authRequestBody, async (input) => {
      const email = input.email.toLowerCase();
      await requestLoginCode(
        email,
        now().getTime(),
        async (code) => {
          await mailer.send({
            to: email,
            subject: "Código de acesso LUME",
            text: `Seu código é ${code}. Ele vale por 10 minutos e só pode ser usado uma vez.`,
          });
        },
        store.loginCodes,
      );
      return { email, message: "Código enviado." };
    }),
  );

  app.post("/v1/auth/verify", async (c) =>
    read(c, authVerifyBody, async (input) => {
      const email = await verifyLoginCode(input.email, input.code, now().getTime(), store.loginCodes);
      const token = crypto.randomUUID();
      await store.saveCustomerSession(token, email, now().getTime());
      return { token, email };
    }),
  );

  app.get("/v1/account/orders", async (c) => {
    const email = await customerSessionEmail(c, store, now().getTime());
    if (!email) return c.json({ error: "nao_autorizado", message: "Entre de novo." }, 401);
    const mine = await store.ordersForEmail(email);
    return c.json({ email, orders: mine });
  });

  app.get("/v1/admin/dealers", async (c) => {
    if (!(await authorized(c))) return c.json({ error: "nao_autorizado", message: "Token de admin inválido." }, 401);
    const result = filterShowroom({ city: c.req.query("cidade") ?? undefined });
    return c.json({ dealers: result.dealers });
  });

  app.get("/v1/admin/overview", async (c) => {
    if (!(await authorized(c))) return c.json({ error: "nao_autorizado", message: "Token de admin inválido." }, 401);
    const stocks = await store.colorStockMap();
    const [orderCount, bookingCount, tradeCount, serviceCount, recentOrders, recentTradeIns, recentService] = await Promise.all([
      store.orderCount(),
      store.testRideCount(),
      store.exchangeCount(),
      store.serviceCount(),
      store.recentOrders(8),
      store.recentExchanges(5),
      store.recentServices(5),
    ]);
    return c.json({
      products: motorcycles.map((product) => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        batteries: packsFor(product).map((battery) => ({
          id: battery.id,
          name: battery.name,
          priceDeltaCents: battery.priceDeltaCents,
        })),
        colors: product.colors.map((color) => ({
          ...color,
          stock: stocks.get(`${product.id}:${color.id}`) ?? color.stock,
        })),
      })),
      banners: await catalog.listBanners(),
      orders: orderCount,
      bookings: bookingCount,
      tradeIns: tradeCount,
      serviceBookings: serviceCount,
      recentOrders: recentOrders.map((order) => ({
        code: order.code,
        status: order.status,
        method: order.method,
        totalCents: order.totalCents,
        createdAt: order.createdAt,
      })),
      recentTradeIns: recentTradeIns.map((item) => ({
        id: item.id,
        brand: item.brand,
        model: item.model,
        city: item.city,
        createdAt: item.createdAt,
      })),
      recentService: recentService.map((item) => ({
        id: item.id,
        dealerId: item.dealerId,
        productId: item.productId,
        preferredDate: item.preferredDate,
        createdAt: item.createdAt,
      })),
      coupons: coupons.map((coupon) => ({ code: coupon.code, label: coupon.label })),
      guides: guides.map((guide) => ({ slug: guide.slug, title: guide.title })),
    });
  });

  app.patch("/v1/admin/stock", async (c) => {
    if (!(await authorized(c))) return c.json({ error: "nao_autorizado", message: "Token de admin inválido." }, 401);
    return read(c, stockPatchBody, async (input) => {
      const product = getMotorcycle(input.productId);
      if (!product?.colors.some((color) => color.id === input.colorId)) {
        throw new DomainError("cor_invalida", "Cor não encontrada nesse modelo.");
      }
      await store.setColorStock(product.id, input.colorId, input.stock);
      return { ok: true, stock: input.stock };
    });
  });

  mountCatalogRoutes(app, {
    catalog,
    saveSession: (token, createdAt) => store.saveAdminSession(token, createdAt),
    endSession: (token) => store.deleteSession(token),
    authorized,
    rateLimit: limited,
    now,
    blobSigner: deps.blobSigner,
    persistent: deps.persistent,
  });

  app.onError((error, c) => {
    if (error instanceof CatalogUnavailable) {
      return c.json({ error: "catalogo_indisponivel", message: "O cadastro precisa do Postgres." }, 503);
    }
    console.error(JSON.stringify({ msg: "erro", message: error instanceof Error ? error.message : "unknown" }));
    const mapped = problem(error);
    return c.json(mapped.body, mapped.status);
  });

  return app;
}

const trackSteps = ["aguardando_pagamento", "pago", "em_preparo", "em_transporte", "entregue"] as const;

function isDisplayCode(raw: string) {
  return /^LM\d{6}$/.test(raw.toUpperCase());
}

async function loadOrder(
  store: {
    orderByCode(code: string): Promise<StoredOrder | undefined>;
    orderByPublicId(publicId: string, ownerEmail?: string): Promise<StoredOrder | undefined>;
  },
  raw: string,
  ownerEmail?: string,
) {
  if (isDisplayCode(raw)) return store.orderByCode(raw.toUpperCase()) as Promise<OrderRecord | undefined>;
  return store.orderByPublicId(raw, ownerEmail) as Promise<OrderRecord | undefined>;
}

async function orderOwner(c: Context, store: { customerEmail(token: string, now: number): Promise<string | undefined> }, nowMs: number) {
  const session = await customerSessionEmail(c, store, nowMs);
  if (session) return session;
  const query = (c.req.query("email") ?? "").trim().toLowerCase();
  return query || undefined;
}

async function customerSessionEmail(c: Context, store: { customerEmail(token: string, now: number): Promise<string | undefined> }, nowMs: number) {
  const token = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return undefined;
  return store.customerEmail(token, nowMs);
}

async function ownsOrder(c: Context, order: OrderRecord, store: { customerEmail(token: string, now: number): Promise<string | undefined> }, nowMs: number) {
  const customer = order.customer.email.toLowerCase();
  const session = await customerSessionEmail(c, store, nowMs);
  if (session && session === customer) return true;
  const query = (c.req.query("email") ?? "").trim().toLowerCase();
  return query.length > 0 && query === customer;
}

function trackingFor(status: string) {
  const index = trackSteps.indexOf(status as (typeof trackSteps)[number]);
  return trackSteps.map((step, stepIndex) => ({
    id: step,
    done: index >= stepIndex,
    current: status === step,
  }));
}

async function read<T>(c: Context, schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { issues: unknown } } }, run: (data: T) => unknown) {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "json_invalido", message: "Envie um JSON válido." }, 400);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "payload_invalido", message: "Revise os campos.", issues: parsed.error.issues }, 400);
  }
  try {
    return c.json(await run(parsed.data));
  } catch (error) {
    if (error instanceof CatalogUnavailable) {
      return c.json({ error: "catalogo_indisponivel", message: "O cadastro precisa do Postgres." }, 503);
    }
    const mapped = problem(error);
    return c.json(mapped.body, mapped.status);
  }
}
