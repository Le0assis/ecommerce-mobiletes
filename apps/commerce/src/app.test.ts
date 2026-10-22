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

  it("protege o admin", async () => {
    const denied = await app.request("/v1/admin/overview");
    expect(denied.status).toBe(401);
    const allowed = await app.request("/v1/admin/overview", { headers: { "x-admin-token": "dev-admin-token" } });
    expect(allowed.status).toBe(200);
  });
});
