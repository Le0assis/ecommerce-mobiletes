import {
  DomainError,
  accessories,
  amountForMethod,
  banners,
  checkoutBody,
  configureBody,
  configurePrice,
  estimateRange,
  filterShowroom,
  getDealer,
  getMotorcycle,
  installmentByCount,
  installmentsBody,
  motorcycles,
  rangeBody,
  reviews,
  reviewBody,
  quizBody,
  recommendMotorcycles,
  selectProvider,
  shippingBody,
  quoteShipping,
  stockPatchBody,
  testRideBody,
  type PaymentMethod,
} from "@lume/domain";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import { adminToken } from "./env";

type OrderRecord = {
  code: string;
  status: "aguardando_pagamento";
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
};

const hits = new Map<string, { count: number; reset: number }>();

function rateLimit(key: string, limit: number) {
  const now = Date.now();
  const current = hits.get(key);
  if (!current || current.reset < now) {
    hits.set(key, { count: 1, reset: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

function problem(error: unknown) {
  if (error instanceof DomainError) {
    return { status: 400 as const, body: { error: error.code, message: error.message } };
  }
  return { status: 500 as const, body: { error: "erro_interno", message: "Não foi possível concluir agora." } };
}

function orderCode(now: Date) {
  const stamp = now.getFullYear().toString().slice(2);
  const salt = Math.floor(Math.random() * 9000 + 1000);
  return `LM${stamp}${salt}`;
}

export function createApp(deps: CommerceDeps = {}) {
  const orders = deps.orders ?? new Map<string, OrderRecord>();
  const bookings = deps.bookings ?? [];
  const extraReviews = deps.extraReviews ?? [];
  const stock = deps.stock ?? new Map<string, number>();
  const bannerState = deps.banners ?? new Map(banners.map((item) => [item.id, item.active]));
  const now = deps.now ?? (() => new Date());

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

  const storefrontOrigin = process.env.STOREFRONT_ORIGIN;
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin || !storefrontOrigin) return origin || "*";
        return origin === storefrontOrigin ? origin : storefrontOrigin;
      },
      allowHeaders: ["Content-Type", "x-admin-token", "x-request-id"],
    }),
  );

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "lume-commerce",
      persistence: process.env.DATABASE_URL ? "postgres-configurado" : "memoria",
    }),
  );

  app.get("/v1/products", (c) => {
    const result = filterShowroom({
      q: c.req.query("q"),
      category: c.req.query("categoria") ?? undefined,
      city: c.req.query("cidade") ?? undefined,
    });
    return c.json({
      products: result.products.map(serializeProduct),
      dealers: result.dealers,
    });
  });

  app.get("/v1/products/:slug", (c) => {
    const product = getMotorcycle(c.req.param("slug"));
    if (!product) return c.json({ error: "produto_inexistente", message: "Modelo não encontrado." }, 404);
    return c.json({
      product: serializeProduct(product),
      accessories: accessories.filter((item) => product.accessoryIds.includes(item.id)),
      reviews: [...reviews, ...extraReviews].filter((item) => item.productSlug === product.slug),
    });
  });

  app.get("/v1/dealers", (c) => {
    const city = c.req.query("cidade");
    const result = filterShowroom({ city });
    return c.json({ dealers: result.dealers });
  });

  app.get("/v1/reviews", (c) => {
    const slug = c.req.query("produto");
    const all = [...reviews, ...extraReviews];
    return c.json({ reviews: slug ? all.filter((item) => item.productSlug === slug) : all });
  });

  app.post("/v1/pricing/configure", async (c) => read(c, configureBody, (input) => configurePrice(input)));

  app.post("/v1/pricing/installments", async (c) =>
    read(c, installmentsBody, (input) => ({
      plans: Array.from({ length: input.max ?? 21 }, (_, index) => installmentByCount(input.amountCents, index + 1)),
    })),
  );

  app.post("/v1/shipping/quote", async (c) => read(c, shippingBody, (input) => quoteShipping(input.cep, input.weightKg)));

  app.post("/v1/range", async (c) =>
    read(c, rangeBody, (input) => {
      const product = getMotorcycle(input.productId);
      if (!product) throw new DomainError("produto_inexistente", "Modelo não encontrado.");
      return estimateRange({
        baseRangeKm: product.rangeKm,
        speedKmh: input.speedKmh,
        extraWeightKg: input.extraWeightKg,
        mode: input.mode,
        optimalSpeedKmh: product.optimalSpeedKmh,
      });
    }),
  );

  app.post("/v1/quiz", async (c) =>
    read(c, quizBody, (input) => ({
      recommendations: recommendMotorcycles(input).map((item) => ({
        slug: item.product.slug,
        name: item.product.name,
        score: item.score,
        reasons: item.reasons,
      })),
    })),
  );

  app.post("/v1/test-rides", async (c) => {
    if (rateLimit(`ride:${c.req.header("x-forwarded-for") ?? "local"}`, 20)) {
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
    if (rateLimit(`pay:${c.req.header("x-forwarded-for") ?? "local"}`, 30)) {
      return c.json({ error: "limite", message: "Muitas tentativas. Espere um minuto." }, 429);
    }
    return read(c, checkoutBody, (input) => {
      if (input.method !== "cartao" && input.installments !== 1) {
        throw new DomainError("parcelas_invalidas", "Pix e boleto são à vista.");
      }
      const quotes = input.lines.map((line) => {
        const quote = configurePrice(line);
        return { line, quote, lineCents: amountForMethod(input.method, quote) * line.qty };
      });
      const goodsCents = quotes.reduce((sum, item) => sum + item.lineCents, 0);
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
      const record: OrderRecord = {
        code,
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
        lines: quotes.map((item) => ({
          productId: item.quote.product.id,
          colorId: item.quote.color.id,
          accessoryIds: item.quote.accessories.map((accessory) => accessory.id),
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

  app.get("/v1/orders/:code", (c) => {
    const order = orders.get(c.req.param("code").toUpperCase());
    if (!order) return c.json({ error: "pedido_inexistente", message: "Pedido não encontrado." }, 404);
    return c.json({ order });
  });

  app.get("/v1/admin/overview", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Token de admin inválido." }, 401);
    return c.json({
      products: motorcycles.map((product) => ({
        id: product.id,
        name: product.name,
        colors: product.colors.map((color) => ({
          ...color,
          stock: stock.get(`${product.id}:${color.id}`) ?? color.stock,
        })),
      })),
      banners: banners.map((item) => ({ ...item, active: bannerState.get(item.id) ?? item.active })),
      orders: orders.size,
      bookings: bookings.length,
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

  app.onError((error, c) => {
    console.error(JSON.stringify({ msg: "erro", message: error instanceof Error ? error.message : "unknown" }));
    const mapped = problem(error);
    return c.json(mapped.body, mapped.status);
  });

  return app;
}

function authorized(c: Context) {
  const expected = adminToken();
  if (!expected) return false;
  return c.req.header("x-admin-token") === expected;
}

function serializeProduct(product: (typeof motorcycles)[number]) {
  return product;
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
    return c.json(run(parsed.data));
  } catch (error) {
    const mapped = problem(error);
    return c.json(mapped.body, mapped.status);
  }
}
