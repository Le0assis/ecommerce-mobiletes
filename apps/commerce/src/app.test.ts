import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("API de commerce", () => {
  const app = createApp({ now: () => new Date("2026-10-22T12:00:00.000Z") });

  it("responde saúde", async () => {
    const response = await app.request("/health");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it("filtra a vitrine por categoria e cidade", async () => {
    const response = await app.request("/v1/products?categoria=mobilete&cidade=Sao%20Paulo");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.products.map((item: { slug: string }) => item.slug)).toContain("s");
  });

  it("filtra marca parceira", async () => {
    const response = await app.request("/v1/products?marca=SENDA");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.products.map((item: { slug: string }) => item.slug)).toEqual(["rua"]);
  });

  it("recalcula o checkout e destaca o Pix sem confiar no preço do cliente", async () => {
    const response = await app.request("/v1/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: [{ productId: "apex", colorId: "obsidiana", accessoryIds: [], qty: 1 }],
        cep: "01310-100",
        shippingServiceId: "retirada",
        method: "pix",
        installments: 1,
        customer: { name: "Gustavo Teste", email: "gustavo@example.com", phone: "11999990000" },
      }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.order.totalCents).toBe(5_975_500);
    expect(body.order.provider).toBe("mercadopago");
    expect(body.order.pix.copyPaste).toContain("LUME-MOCK-PIX");
  });

  it("parcela em 21 vezes sem juros no cartão", async () => {
    const response = await app.request("/v1/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: [{ productId: "s", colorId: "obsidiana", accessoryIds: [], qty: 1 }],
        cep: "05435-000",
        shippingServiceId: "dedicado",
        method: "cartao",
        installments: 21,
        customer: { name: "Gustavo Teste", email: "gustavo@example.com", phone: "11999990000" },
      }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.order.provider).toBe("pagarme");
    expect(body.order.installments).toBe(21);
    expect(body.order.subtotalCents).toBe(1_490_000);
    expect(body.order.totalCents).toBeGreaterThan(1_490_000);
  });

  it("aplica cupom antes do Pix e avança o sandbox", async () => {
    const response = await app.request("/v1/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: [{ productId: "s", colorId: "obsidiana", accessoryIds: [], qty: 1 }],
        cep: "05435-000",
        shippingServiceId: "retirada",
        method: "pix",
        installments: 1,
        couponCode: "LUME10",
        customer: { name: "Gustavo Teste", email: "gustavo@example.com", phone: "11999990000" },
      }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.order.couponCents).toBe(149_000);
    expect(body.order.totalCents).toBeLessThan(1_490_000);

    const advanced = await app.request(`/v1/orders/${body.order.code}/sandbox`, { method: "POST" });
    const next = await advanced.json();
    expect(advanced.status).toBe(200);
    expect(next.order.status).toBe("pago");
    expect(next.message).toContain("LUME-SANDBOX");

    const code = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "gustavo@example.com", code: "LUME-SANDBOX" }),
    });
    const session = await code.json();
    const mine = await app.request("/v1/account/orders", { headers: { authorization: `Bearer ${session.token}` } });
    const account = await mine.json();
    expect(mine.status).toBe(200);
    expect(account.orders.map((item: { code: string }) => item.code)).toContain(body.order.code);
  });

  it("protege o admin", async () => {
    const denied = await app.request("/v1/admin/overview");
    expect(denied.status).toBe(401);
    const allowed = await app.request("/v1/admin/overview", { headers: { "x-admin-token": "dev-admin-token" } });
    expect(allowed.status).toBe(200);
  });
});
