import { describe, expect, it } from "vitest";
import { autopropelidoBadge } from "./autopropelido";
import { getMotorcycle } from "./catalog";
import { DomainError } from "./errors";
import { installmentByCount } from "./financing";
import { applyDiscount, formatBRL } from "./money";
import { couponDiscount } from "./coupons";
import { configurePrice } from "./pricing";
import { estimateRange } from "./range";
import { estimateFuelSavings } from "./savings";
import { formatCep, normalizeCep, quoteShipping } from "./shipping";
import { faq } from "./guides";
import { filterShowroom } from "./showroom";

describe("preço do configurador", () => {
  it("soma base, cor e acessórios sem duplicar", () => {
    const quote = configurePrice({
      productId: "apex",
      colorId: "cobre",
      accessoryIds: ["banco", "banco", "carregador"],
    });

    expect(quote.baseCents).toBe(6_290_000);
    expect(quote.colorCents).toBe(180_000);
    expect(quote.accessoriesCents).toBe(59_000 + 129_000);
    expect(quote.subtotalCents).toBe(6_290_000 + 180_000 + 188_000);
    expect(quote.pixCents).toBe(applyDiscount(quote.subtotalCents, 500));
    expect(quote.boletoCents).toBe(applyDiscount(quote.subtotalCents, 300));
    expect(quote.batteryCents).toBe(0);
    expect(quote.accessories).toHaveLength(1 + 1);
  });

  it("soma a bateria longa da Apex sem mexer na de série", () => {
    const quote = configurePrice({ productId: "apex", colorId: "obsidiana", batteryId: "longa" });
    expect(quote.batteryCents).toBe(240_000);
    expect(quote.subtotalCents).toBe(6_290_000 + 240_000);
    expect(quote.battery.rangeKm).toBe(320);
  });

  it("recusa cor esgotada e acessório de outro modelo", () => {
    expect(() => configurePrice({ productId: "serra", colorId: "sal" })).toThrow(DomainError);
    expect(() => configurePrice({ productId: "s", colorId: "obsidiana", accessoryIds: ["topcase"] })).toThrow(
      DomainError,
    );
  });

  it("dá 5% no Pix da Apex sem cor", () => {
    const quote = configurePrice({ productId: "lume-apex", colorId: "obsidiana" });
    expect(quote.pixCents).toBe(5_975_500);
    expect(formatBRL(quote.pixCents)).toContain("59.755,00");
  });
});

describe("parcelamento", () => {
  it("faz 21 vezes sem juros na campanha de lançamento", () => {
    const twentyOne = installmentByCount(6_290_000, 21);
    expect(twentyOne.interestFree).toBe(true);
    expect(twentyOne.totalCents).toBe(6_290_000);
    expect(twentyOne.installmentCents).toBe(299_524);
  });

  it("aplica a Tabela Price quando o financeiro reduz o sem juros", () => {
    const twelve = installmentByCount(100_000, 12, { interestFreeUpTo: 6 });
    expect(twelve.interestFree).toBe(false);
    expect(twelve.monthlyRate).toBe(0.0149);
    expect(twelve.installmentCents).toBe(9_162);
    expect(twelve.totalCents).toBe(9_162 * 12);
  });

  it("recusa 22 vezes", () => {
    expect(() => installmentByCount(100_000, 22)).toThrow(DomainError);
  });
});

describe("frete por CEP", () => {
  it("normaliza máscara e recusa CEP vazio", () => {
    expect(normalizeCep("01310-100")).toBe("01310100");
    expect(formatCep("01310100")).toBe("01310-100");
    expect(normalizeCep("123")).toBeNull();
    expect(() => quoteShipping("00000-000", 100)).toThrow(DomainError);
  });

  it("responde peso_invalido quando o peso falta, é zero ou passa de 400 kg", () => {
    for (const weight of [0, -1, 400.01, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => quoteShipping("01310-100", weight)).toThrow(DomainError);
      try {
        quoteShipping("01310-100", weight);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe("peso_invalido");
        expect((error as DomainError).message).toBe("Peso fora da faixa de transporte.");
      }
    }
    expect(quoteShipping("01310-100", 400).services[0]?.priceCents).toBe(29_000 + 400 * 180);
  });

  it("cobra menos no frete de São Paulo do que no Norte", () => {
    const sp = quoteShipping("01310-100", 120);
    const north = quoteShipping("66000-000", 120);
    const spShip = sp.services.find((item) => item.id === "dedicado");
    const northShip = north.services.find((item) => item.id === "dedicado");

    expect(sp.services.map((item) => item.id)).toEqual(["dedicado"]);
    expect(north.services.map((item) => item.id)).toEqual(["dedicado"]);
    expect(spShip && northShip && spShip.priceCents < northShip.priceCents).toBe(true);
    expect(spShip && northShip && spShip.days < northShip.days).toBe(true);
  });
});

describe("autonomia", () => {
  it("cai com velocidade e modo esporte e sobe no eco", () => {
    const apex = getMotorcycle("apex");
    if (!apex) throw new Error("catálogo sem Apex");

    const city = estimateRange({
      baseRangeKm: apex.rangeKm,
      speedKmh: apex.optimalSpeedKmh,
      extraWeightKg: 0,
      mode: "cidade",
      optimalSpeedKmh: apex.optimalSpeedKmh,
    });
    const sport = estimateRange({
      baseRangeKm: apex.rangeKm,
      speedKmh: 160,
      extraWeightKg: 20,
      mode: "esporte",
      optimalSpeedKmh: apex.optimalSpeedKmh,
    });
    const eco = estimateRange({
      baseRangeKm: apex.rangeKm,
      speedKmh: apex.optimalSpeedKmh,
      extraWeightKg: 0,
      mode: "eco",
      optimalSpeedKmh: apex.optimalSpeedKmh,
    });

    expect(city.rangeKm).toBe(apex.rangeKm);
    expect(sport.rangeKm).toBeLessThan(city.rangeKm);
    expect(eco.rangeKm).toBeGreaterThan(city.rangeKm);
  });
});

describe("cupom", () => {
  it("tira 10% do subtotal e recusa código inventado", () => {
    expect(couponDiscount(1_490_000, "lume10")?.discountCents).toBe(149_000);
    expect(() => couponDiscount(1_490_000, "naoexiste")).toThrow(DomainError);
    expect(couponDiscount(1_490_000, "")).toBeNull();
  });
});

describe("economia contra gasolina", () => {
  it("gasta menos energia do que gasolina num uso urbano", () => {
    const savings = estimateFuelSavings({
      kmPerMonth: 800,
      batteryKwh: 14.6,
      rangeKm: 280,
      electricityCentsPerKwh: 95,
      gasolineCentsPerLiter: 649,
      gasolineKmPerLiter: 12,
    });
    expect(savings.electricMonthCents).toBeLessThan(savings.gasolineMonthCents);
    expect(savings.savedMonthCents).toBe(savings.gasolineMonthCents - savings.electricMonthCents);
  });
});

describe("vitrine por categoria e cidade", () => {
  it("cruza adventure com a loja de Curitiba", () => {
    const result = filterShowroom({ category: "adventure", city: "Curitiba" });
    expect(result.products.map((item) => item.slug)).toEqual(["serra"]);
    expect(result.dealers).toHaveLength(1);
  });

  it("filtra a marca parceira sem misturar a casa", () => {
    const result = filterShowroom({ brand: "voltis" });
    expect(result.products.map((item) => item.slug)).toEqual(["pico"]);
    expect(result.products[0]?.registrationClass).toBe("autopropelido");
  });

  it("sem CNH segue o selo calculado", () => {
    const result = filterShowroom({ semCnh: "sim", brand: "voltis" });
    expect(result.products.every((item) => autopropelidoBadge(item).eligible)).toBe(true);
    expect(result.products.map((item) => item.slug)).not.toContain("pico");
  });

  it("o FAQ de CNH cita o registro do ciclomotor", () => {
    const item = faq.find((entry) => entry.question === "Preciso de CNH?");
    expect(item?.answer).toContain("O ciclomotor também exige registro (CTB art. 120; Res. 996/2023, arts. 13-14).");
    expect(item?.answer).toContain("placa e ACC ou CNH A");
  });

  it("não inventa loja em cidade sem operação", () => {
    const result = filterShowroom({ city: "Recife" });
    expect(result.dealers).toHaveLength(0);
    expect(result.products).toHaveLength(0);
  });
});
