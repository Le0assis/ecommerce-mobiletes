import { describe, expect, it } from "vitest";
import { recommendMotorcycles, type QuizAnswers, type QuizProduct } from "./quiz";

const base = {
  hills: false,
  charging: "tomada",
  carry: "sozinho",
  cargo: "nenhum",
  color: "indiferente",
  style: "esportivo",
} satisfies Partial<QuizAnswers>;

function answers(overrides: Partial<QuizAnswers>): QuizAnswers {
  return {
    use: "passeio",
    dailyKm: "ate20",
    hills: false,
    charging: "tomada",
    carry: "sozinho",
    cargo: "nenhum",
    budget: "ate6",
    style: "esportivo",
    color: "indiferente",
    ...overrides,
  };
}

function bike(overrides: Partial<QuizProduct> & Pick<QuizProduct, "id" | "slug" | "name">): QuizProduct {
  return {
    category: "scooter",
    basePriceCents: 900_000,
    rangeKm: 50,
    ...overrides,
  };
}

describe("quiz de autopropelidos", () => {
  const catalog: QuizProduct[] = [
    bike({
      id: "entrega",
      slug: "entrega",
      name: "Entrega",
      category: "scooter",
      basePriceCents: 890_000,
      rangeKm: 55,
      batteryRemovable: true,
      powerNominalW: 1000,
      accessoryIds: ["bau"],
      style: "esportivo",
      colors: [{ id: "obsidiana", name: "Obsidiana", hex: "#16171c" }],
    }),
    bike({
      id: "fixa",
      slug: "fixa",
      name: "Fixa",
      category: "scooter",
      basePriceCents: 1_400_000,
      rangeKm: 20,
      batteryRemovable: false,
      powerNominalW: 1000,
      accessoryIds: ["bau"],
      style: "esportivo",
    }),
    bike({
      id: "passeio-retro",
      slug: "passeio-retro",
      name: "Passeio Retrô",
      category: "scooter",
      basePriceCents: 1_150_000,
      rangeKm: 60,
      style: "retro",
      batteryRemovable: true,
      colors: [{ id: "sal", name: "Sal", hex: "#efeae2" }],
    }),
    bike({
      id: "familia",
      slug: "familia",
      name: "Família",
      category: "scooter",
      basePriceCents: 980_000,
      rangeKm: 50,
      style: "citycoco",
      carries: ["passageiro", "crianca"],
      batteryRemovable: true,
    }),
    bike({
      id: "barata",
      slug: "barata",
      name: "Barata",
      category: "mobilete",
      basePriceCents: 430_000,
      rangeKm: 30,
      style: "esportivo",
      batteryRemovable: true,
      powerNominalW: 350,
      torqueNm: 12,
      powerKw: 0.35,
    }),
    bike({
      id: "cara",
      slug: "cara",
      name: "Cara",
      category: "sport",
      basePriceCents: 1_290_000,
      rangeKm: 80,
      style: "esportivo",
      carries: ["passageiro"],
    }),
  ];

  it("prioriza entrega com bateria removível e baú", () => {
    const result = recommendMotorcycles(
      answers({
        use: "entregas",
        dailyKm: "20a40",
        hills: true,
        charging: "removivel",
        cargo: "bau",
        budget: "6a10",
        style: "esportivo",
        color: "escura",
      }),
      catalog,
    );
    expect(result[0]?.product.slug).toBe("entrega");
    expect(result.map((item) => item.product.slug)).not.toContain("fixa");
    expect(result[0]?.reasons.some((reason) => reason.includes("bateria"))).toBe(true);
    expect(result[0]?.accessories.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["bau", "retrovisor", "capacete", "suporte-celular"]),
    );
    expect(result[0]?.accessories.map((item) => item.name)).toContain("Baú 29–41 L");
  });

  it("atribui a dispensa de habilitação ao autopropelido", () => {
    const result = recommendMotorcycles(answers({ use: "passeio", budget: "mais10" }), catalog);
    const helmet = result.flatMap((item) => item.accessories).find((item) => item.kind === "capacete");
    expect(helmet?.reason).toBe("Proteção, mesmo no autopropelido, que dispensa habilitação.");
  });

  it("não deixa bateria desconhecida passar na frente da removível", () => {
    const withUnknown = [
      ...catalog,
      bike({
        id: "sem-ficha",
        slug: "sem-ficha",
        name: "Sem ficha",
        basePriceCents: 800_000,
        rangeKm: 70,
        batteryRemovable: null,
        accessoryIds: ["bau"],
        style: "esportivo",
        powerNominalW: 1000,
      }),
    ];
    const result = recommendMotorcycles(
      answers({ use: "entregas", charging: "removivel", cargo: "bau", budget: "6a10", dailyKm: "20a40", hills: true }),
      withUnknown,
    );
    const slugs = result.map((item) => item.product.slug);
    expect(slugs[0]).toBe("entrega");
    expect(slugs.indexOf("entrega")).toBeLessThan(slugs.indexOf("sem-ficha"));
  });

  it("manda a família quando o uso é levar criança e sugere cadeirinha", () => {
    const result = recommendMotorcycles(
      answers({ use: "crianca", carry: "crianca", budget: "6a10", dailyKm: "ate20", style: "citycoco" }),
      catalog,
    );
    expect(result[0]?.product.slug).toBe("familia");
    expect(result[0]?.accessories.some((item) => item.kind === "cadeirinha")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("segura o orçamento de até 6 mil e cobre o km do dia", () => {
    const result = recommendMotorcycles(
      answers({ use: "passeio", budget: "ate6", dailyKm: "ate20", style: "esportivo" }),
      catalog,
    );
    expect(result[0]?.product.slug).toBe("barata");
    expect(result.map((item) => item.product.slug)).not.toContain("cara");
  });

  it("escolhe o retrô no passeio quando o estilo é retrô", () => {
    const result = recommendMotorcycles(
      answers({ use: "passeio", style: "retro", budget: "mais10", dailyKm: "20a40", color: "clara" }),
      catalog,
    );
    expect(result[0]?.product.slug).toBe("passeio-retro");
    expect(result[0]?.reasons.some((reason) => reason.includes("retro"))).toBe(true);
    expect(result[0]?.accessories.some((item) => item.kind === "capa")).toBe(true);
  });

  it("devolve no máximo três e sugere gaiola para pet", () => {
    const result = recommendMotorcycles(answers({ carry: "pet", budget: "mais10", dailyKm: "ate20" }), catalog);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0]?.accessories.some((item) => item.kind === "gaiola-pet" && item.name === "Gaiola pet")).toBe(true);
  });

  it("não recomenda modelo acima de R$ 6 mil quando o teto é até 6 mil", () => {
    const result = recommendMotorcycles(answers({ budget: "ate6", style: "esportivo", dailyKm: "ate20" }));
    expect(result.every((item) => item.product.basePriceCents <= 600_000)).toBe(true);
    expect(result.map((item) => item.product.slug)).not.toContain("pico");
  });

  it("deixa o estilo trocar o primeiro lugar e descarta quem passa do teto", () => {
    const pair = [
      bike({ id: "r", slug: "retro-um", name: "Retrô", style: "retro", basePriceCents: 500_000, rangeKm: 40 }),
      bike({ id: "e", slug: "esporte-um", name: "Esporte", style: "esportivo", basePriceCents: 500_000, rangeKm: 40 }),
      bike({ id: "cara", slug: "cara-demais", name: "Cara", style: "retro", basePriceCents: 990_000, rangeKm: 80 }),
    ];
    expect(recommendMotorcycles(answers({ budget: "ate6", style: "retro" }), pair)[0]?.product.slug).toBe("retro-um");
    expect(recommendMotorcycles(answers({ budget: "ate6", style: "esportivo" }), pair)[0]?.product.slug).toBe("esporte-um");
    expect(recommendMotorcycles(answers({ budget: "ate6", style: "retro" }), pair).map((item) => item.product.slug)).not.toContain(
      "cara-demais",
    );
  });

  it("com sem CNH só devolve autopropelido e descarta o resto", () => {
    const pair = [
      bike({
        id: "livre",
        slug: "livre",
        name: "Livre",
        basePriceCents: 400_000,
        rangeKm: 25,
        powerNominalW: 800,
        topSpeedKmh: 25,
        widthCm: 60,
        wheelbaseCm: 110,
      }),
      bike({
        id: "placa",
        slug: "placa",
        name: "Placa",
        basePriceCents: 400_000,
        rangeKm: 40,
        powerNominalW: 2_000,
        topSpeedKmh: 45,
        widthCm: 70,
        wheelbaseCm: 120,
      }),
    ];
    const result = recommendMotorcycles(answers({ withoutCnh: true, budget: "ate6", dailyKm: "ate20" }), pair);
    expect(result.map((item) => item.product.slug)).toEqual(["livre"]);
    expect(result[0]?.reasons.some((reason) => reason.includes("autopropelido"))).toBe(true);
    expect(recommendMotorcycles(answers({ withoutCnh: true, budget: "mais10" }))).toEqual([]);
  });

  it("ainda responde com o catálogo de demonstração", () => {
    const result = recommendMotorcycles(
      answers({
        ...base,
        use: "trabalho",
        dailyKm: "ate20",
        budget: "mais10",
        charging: "tomada",
      }),
    );
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0]?.reasons.length).toBeGreaterThan(0);
    expect(result[0]?.product.slug).toBeTruthy();
  });
});
