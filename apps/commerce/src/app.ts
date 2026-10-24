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
  type PaymentMethod,
} from "@lume/domain";
import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { ADMIN_COOKIE, mountCatalogRoutes, sessionIsCurrent } from "./catalog-routes";
import { clientAddress } from "./client-address";
import { CatalogUnavailable, createCatalog, type Catalog } from "./catalog-store";
import { resolveCorsOrigin, adminToken } from "./env";
import { LoginError, requestLoginCode, verifyLoginCode } from "./login-code";
import { createMailer, MailUnavailable, type Mailer } from "./mailer";
import { publicCatalogProduct, publicDomainProduct } from "./public-product";
import { quoteCatalogProduct, type CatalogLine } from "./quote-catalog";
import { rateLimit, type RateCounter } from "./rate-limit";
import type { UploadRequest } from "./uploads";

type OrderRecord = {
  code: string;
  publicId: string;
  status: "aguardando_pagamento" | "pago" | "em_preparo" | "em_transporte" | "entregue" | "recusado";
  couponCode?: string;
  couponCents?: number;
  method: PaymentMethod;
  provider: string;
  installments: number;
  installmentCents: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  cep: string;
  customer: { name: string; email: string; phone: string };
  lines: unknown[];
  pix?: { copyPaste: string; expiresAt: string };
  boleto?: { line: string; dueDate: string };
  createdAt: string;
};

type Booking = {
  id: string;
  productId: string;
  dealerId: string;
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  createdAt: string;
};

type ReviewRecord = (typeof reviews)[number] & { pending?: boolean };

export type CommerceDeps = {
  now?: () => Date;
  orders?: Map<string, OrderRecord>;
  bookings?: Booking[];
  onOrder?: (order: OrderRecord) => void;
  onBooking?: (booking: Booking) => void;
  extraReviews?: ReviewRecord[];
  stock?: Map<string, number>;
  banners?: Map<string, boolean>;
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
  const orders = deps.orders ?? new Map<string, OrderRecord>();
  const sessions = new Map<string, string>();
  const bookings = deps.bookings ?? [];
  const mailer = deps.mailer ?? createMailer();
  const limited = (key: string, limit: number) => rateLimit(key, limit, deps.limiter);
  const extraReviews = deps.extraReviews ?? [];
  const stock = deps.stock ?? new Map<string, number>();
  const now = deps.now ?? (() => new Date());
  const catalog = deps.catalog ?? createCatalog({ now, bannerOverrides: deps.banners });
  const adminSessions = new Map<string, { createdAt: number }>();

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

  function authorized(c: Context) {
    const cookie = getCookie(c, ADMIN_COOKIE);
    if (cookie) {
      const session = adminSessions.get(cookie);
      if (sessionIsCurrent(session, now().getTime())) return true;
      if (session) adminSessions.delete(cookie);
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
    return read(c, testRideBody, (input) => {
      const product = getMotorcycle(input.productId);
      const dealer = getDealer(input.dealerId);
      if (!product) throw new DomainError("produto_inexistente", "Modelo não encontrado.");
      if (!dealer) throw new DomainError("loja_inexistente", "Loja não encontrada.");
      if (!dealer.testRideSlugs.includes(product.slug)) {
        throw new DomainError("test_ride_indisponivel", "Esse modelo não está nessa loja.");
      }
      const booking: Booking = { id: crypto.randomUUID(), ...input, productId: product.id, createdAt: now().toISOString() };
      bookings.push(booking);
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
      while (orders.has(code)) code = orderCode(moment);
      let publicId = randomBytes(32).toString("base64url");
      while ([...orders.values()].some((order) => order.publicId === publicId)) publicId = randomBytes(32).toString("base64url");
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
      orders.set(code, record);
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
    const order = findOrder(orders, raw);
    if (!order || (display && !ownsOrder(c, order, sessions))) {
      return c.json({ error: "pedido_inexistente", message: "Pedido não encontrado." }, 404);
    }
    return c.json({ order, tracking: trackingFor(order.status) });
  });

  app.post("/v1/orders/:code/sandbox", async (c) => {
    if (process.env.NODE_ENV === "production") {
      return c.json({ error: "nao_encontrado", message: "Não encontrado." }, 404);
    }
    const order = findOrder(orders, c.req.param("code"));
    if (!order) return c.json({ error: "pedido_inexistente", message: "Pedido não encontrado." }, 404);
    const steps = ["aguardando_pagamento", "pago", "em_preparo", "em_transporte", "entregue"] as const;
    const index = steps.indexOf(order.status as (typeof steps)[number]);
    if (index < 0 || index === steps.length - 1) {
      return c.json({ error: "sandbox_recusado", message: "Esse pedido de sandbox não avança mais." }, 409);
    }
    order.status = steps[index + 1] ?? order.status;
    return c.json({
      order,
      tracking: trackingFor(order.status),
      message: "LUME-SANDBOX: nenhum valor foi capturado no Mercado Pago nem na Pagar.me.",
    });
  });

  const tradeIns: { id: string; createdAt: string; brand: string; model: string; city: string }[] = [];
  const serviceBookings: { id: string; createdAt: string; dealerId: string; productId: string; preferredDate: string }[] = [];

  app.post("/v1/service-bookings", async (c) =>
    read(c, serviceBody, (input) => {
      const dealer = getDealer(input.dealerId);
      const product = getMotorcycle(input.productId);
      if (!dealer) throw new DomainError("loja_inexistente", "Loja não encontrada.");
      if (!product) throw new DomainError("produto_inexistente", "Modelo não encontrado.");
      const booking = { id: crypto.randomUUID(), ...input, createdAt: now().toISOString() };
      serviceBookings.push(booking);
      return {
        booking,
        message: "Horário de serviço pedido. A loja confirma.",
      };
    }),
  );

  app.post("/v1/trade-ins", async (c) =>
    read(c, tradeInBody, (input) => {
      const tradeIn = { id: crypto.randomUUID(), ...input, createdAt: now().toISOString() };
      tradeIns.push(tradeIn);
      return { tradeIn, message: "Pedido de avaliação recebido. Nenhum valor foi oferecido." };
    }),
  );

  app.post("/v1/auth/request", async (c) =>
    read(c, authRequestBody, async (input) => {
      const email = input.email.toLowerCase();
      await requestLoginCode(email, now().getTime(), async (code) => {
        await mailer.send({
          to: email,
          subject: "Código de acesso LUME",
          text: `Seu código é ${code}. Ele vale por 10 minutos e só pode ser usado uma vez.`,
        });
      });
      return { email, message: "Código enviado." };
    }),
  );

  app.post("/v1/auth/verify", async (c) =>
    read(c, authVerifyBody, (input) => {
      const email = verifyLoginCode(input.email, input.code, now().getTime());
      const token = crypto.randomUUID();
      sessions.set(token, email);
      return { token, email };
    }),
  );

  app.get("/v1/account/orders", (c) => {
    const email = bearerEmail(c, sessions);
    if (!email) return c.json({ error: "nao_autorizado", message: "Entre de novo." }, 401);
    const mine = [...orders.values()].filter((order) => order.customer.email.toLowerCase() === email);
    return c.json({ email, orders: mine });
  });

  app.get("/v1/admin/dealers", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Token de admin inválido." }, 401);
    const result = filterShowroom({ city: c.req.query("cidade") ?? undefined });
    return c.json({ dealers: result.dealers });
  });

  app.get("/v1/admin/overview", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Token de admin inválido." }, 401);
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
          stock: stock.get(`${product.id}:${color.id}`) ?? color.stock,
        })),
      })),
      banners: await catalog.listBanners(),
      orders: orders.size,
      bookings: bookings.length,
      tradeIns: tradeIns.length,
      serviceBookings: serviceBookings.length,
      recentOrders: [...orders.values()].slice(-8).reverse().map((order) => ({
        code: order.code,
        status: order.status,
        method: order.method,
        totalCents: order.totalCents,
        createdAt: order.createdAt,
      })),
      recentTradeIns: tradeIns.slice(-5).reverse().map((item) => ({
        id: item.id,
        brand: item.brand,
        model: item.model,
        city: item.city,
        createdAt: item.createdAt,
      })),
      recentService: serviceBookings.slice(-5).reverse().map((item) => ({
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
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Token de admin inválido." }, 401);
    return read(c, stockPatchBody, (input) => {
      const product = getMotorcycle(input.productId);
      if (!product?.colors.some((color) => color.id === input.colorId)) {
        throw new DomainError("cor_invalida", "Cor não encontrada nesse modelo.");
      }
      stock.set(`${product.id}:${input.colorId}`, input.stock);
      return { ok: true, stock: input.stock };
    });
  });

  mountCatalogRoutes(app, {
    catalog,
    sessions: adminSessions,
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

function findOrder(orders: Map<string, OrderRecord>, raw: string) {
  if (isDisplayCode(raw)) return orders.get(raw.toUpperCase());
  return [...orders.values()].find((order) => order.publicId === raw);
}

function bearerEmail(c: Context, sessions: Map<string, string>) {
  const token = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return undefined;
  return sessions.get(token);
}

function ownsOrder(c: Context, order: OrderRecord, sessions: Map<string, string>) {
  const customer = order.customer.email.toLowerCase();
  const session = bearerEmail(c, sessions);
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
