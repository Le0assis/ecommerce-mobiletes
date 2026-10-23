/**
 * Oito scooters de exemplo do plano de autopropelidos.
 * Categoria e estilo não vieram modelo a modelo: a classificação abaixo é provisória
 * e todas as linhas nascem com is_sample = true. Medida ausente na ficha fica null
 * (o selo só aparece quando os quatro limites nominais existem). Faixa de preço vira
 * o piso em base_price_cents; o teto fica no texto. Cor não foi informada.
 */

export type SampleCategory = "scooter" | "mobilete" | "citycoco";
export type SampleStyle = "retro" | "citycoco" | "esportivo";

export type SampleSpec = {
  powerNominalW: number | null;
  powerPeakW: number | null;
  topSpeedKmh: number | null;
  widthCm: number | null;
  wheelbaseCm: number | null;
  weightKg: number | null;
  seatHeightMm: number | null;
  batteryV: number | null;
  batteryAh: number | null;
  batteryChem: string | null;
  batteryRemovable: boolean | null;
  chargeHours: number | null;
  rangeKmDeclared: number | null;
  hasSpeedLimiter: boolean | null;
  hasBell: boolean | null;
  hasLights: boolean | null;
};

export type SampleVariant = {
  id: string;
  sku: string;
  colorName: string;
  colorHex: string;
  batteryLabel: string | null;
  priceDeltaCents: number;
  stock: number;
};

export type SampleScooter = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: SampleCategory;
  style: SampleStyle;
  tagline: string;
  description: string;
  basePriceCents: number;
  specs: SampleSpec;
  variant: SampleVariant;
};

const baseSpec: SampleSpec = {
  powerNominalW: null,
  powerPeakW: null,
  topSpeedKmh: 32,
  widthCm: null,
  wheelbaseCm: null,
  weightKg: null,
  seatHeightMm: null,
  batteryV: null,
  batteryAh: null,
  batteryChem: null,
  batteryRemovable: null,
  chargeHours: null,
  rangeKmDeclared: null,
  hasSpeedLimiter: null,
  hasBell: null,
  hasLights: null,
};

function spec(partial: Partial<SampleSpec>): SampleSpec {
  return { ...baseSpec, ...partial };
}

const placeholderColor = {
  colorName: "A confirmar",
  colorHex: "#8a8a8a",
  priceDeltaCents: 0,
  stock: 0,
};

export const sampleScooters: SampleScooter[] = [
  {
    id: "yadea-dt3",
    slug: "yadea-dt3",
    name: "Yadea DT3",
    brand: "Yadea",
    category: "scooter",
    style: "esportivo",
    tagline: "1.000 W, bateria removível, 55 km declarados.",
    description:
      "Dado de exemplo. Potência nominal 1.000 W, bateria 48V 24Ah removível, autonomia declarada 55 km, 32 km/h. Faixa de preço de referência R$ 9.900–11.990; o preço base é o piso. Largura e entre-eixos não informados.",
    basePriceCents: 990_000,
    specs: spec({
      powerNominalW: 1000,
      batteryV: 48,
      batteryAh: 24,
      batteryRemovable: true,
      rangeKmDeclared: 55,
    }),
    variant: {
      id: "yadea-dt3-padrao",
      sku: "YADEA-DT3",
      batteryLabel: "48V 24Ah removível",
      ...placeholderColor,
    },
  },
  {
    id: "yadea-m6-h",
    slug: "yadea-m6-h",
    name: "Yadea M6-H",
    brand: "Yadea",
    category: "scooter",
    style: "esportivo",
    tagline: "60V 30Ah, 71 km declarados.",
    description:
      "Dado de exemplo. Bateria 60V 30Ah, autonomia declarada 71 km, 32 km/h. Preço de referência R$ 10.900. Potência nominal, largura e entre-eixos não informados.",
    basePriceCents: 1_090_000,
    specs: spec({
      batteryV: 60,
      batteryAh: 30,
      rangeKmDeclared: 71,
    }),
    variant: {
      id: "yadea-m6-h-padrao",
      sku: "YADEA-M6H",
      batteryLabel: "60V 30Ah",
      ...placeholderColor,
    },
  },
  {
    id: "yadea-gfx6",
    slug: "yadea-gfx6",
    name: "Yadea GFX6",
    brand: "Yadea",
    category: "scooter",
    style: "esportivo",
    tagline: "Bateria LFP 60V 30Ah, 68 km declarados.",
    description:
      "Dado de exemplo. Bateria LFP 60V 30Ah, autonomia declarada 68 km, 32 km/h. Preço de referência R$ 12.900. Potência nominal, largura e entre-eixos não informados.",
    basePriceCents: 1_290_000,
    specs: spec({
      batteryV: 60,
      batteryAh: 30,
      batteryChem: "LFP",
      rangeKmDeclared: 68,
    }),
    variant: {
      id: "yadea-gfx6-padrao",
      sku: "YADEA-GFX6",
      batteryLabel: "LFP 60V 30Ah",
      ...placeholderColor,
    },
  },
  {
    id: "motochefe-jet",
    slug: "motochefe-jet",
    name: "MotoChefe JET",
    brand: "MotoChefe",
    category: "citycoco",
    style: "citycoco",
    tagline: "60V 20Ah, autonomia de referência 40–45 km.",
    description:
      "Dado de exemplo. Bateria 60V 20Ah, 32 km/h. A autonomia informada é uma faixa de 40 a 45 km, então o número declarado fica vazio. Faixa de preço de referência R$ 9.990–12.150; o preço base é o piso. Potência nominal, largura e entre-eixos não informados.",
    basePriceCents: 999_000,
    specs: spec({
      batteryV: 60,
      batteryAh: 20,
    }),
    variant: {
      id: "motochefe-jet-padrao",
      sku: "MOTOCHEFE-JET",
      batteryLabel: "60V 20Ah",
      ...placeholderColor,
    },
  },
  {
    id: "aima-liberty-a500",
    slug: "aima-liberty-a500",
    name: "Aima Liberty A500",
    brand: "Aima",
    category: "scooter",
    style: "retro",
    tagline: "64V 30Ah, 80 km declarados.",
    description:
      "Dado de exemplo. Bateria 64V 30Ah, autonomia declarada 80 km, 32 km/h. Preço de referência R$ 11.990. Potência nominal, largura e entre-eixos não informados.",
    basePriceCents: 1_199_000,
    specs: spec({
      batteryV: 64,
      batteryAh: 30,
      rangeKmDeclared: 80,
    }),
    variant: {
      id: "aima-liberty-a500-padrao",
      sku: "AIMA-A500",
      batteryLabel: "64V 30Ah",
      ...placeholderColor,
    },
  },
  {
    id: "shineray-pt2xs",
    slug: "shineray-pt2xs",
    name: "Shineray PT2XS",
    brand: "Shineray",
    category: "mobilete",
    style: "retro",
    tagline: "Autonomia de referência 25–30 km.",
    description:
      "Dado de exemplo. 32 km/h. A autonomia informada é uma faixa de 25 a 30 km, então o número declarado fica vazio. Bateria não informada. Preço de referência R$ 8.000. Potência nominal, largura e entre-eixos não informados.",
    basePriceCents: 800_000,
    specs: spec({}),
    variant: {
      id: "shineray-pt2xs-padrao",
      sku: "SHINERAY-PT2XS",
      batteryLabel: null,
      ...placeholderColor,
    },
  },
  {
    id: "mxf-muv-e-road",
    slug: "mxf-muv-e-road",
    name: "MXF Muv E-road",
    brand: "MXF",
    category: "scooter",
    style: "esportivo",
    tagline: "48V 12Ah, 35 km declarados.",
    description:
      "Dado de exemplo. Bateria 48V 12Ah, autonomia declarada 35 km, 32 km/h. Preço de referência R$ 8.990. Potência nominal, largura e entre-eixos não informados.",
    basePriceCents: 899_000,
    specs: spec({
      batteryV: 48,
      batteryAh: 12,
      rangeKmDeclared: 35,
    }),
    variant: {
      id: "mxf-muv-e-road-padrao",
      sku: "MXF-MUV",
      batteryLabel: "48V 12Ah",
      ...placeholderColor,
    },
  },
  {
    id: "foston-x15-max",
    slug: "foston-x15-max",
    name: "Foston X15 Max",
    brand: "Foston",
    category: "mobilete",
    style: "retro",
    tagline: "Preço de referência, ficha ainda sem bateria.",
    description:
      "Dado de exemplo. 32 km/h. Bateria e autonomia não informadas. Preço de referência R$ 4.300. Potência nominal, largura e entre-eixos não informados.",
    basePriceCents: 430_000,
    specs: spec({}),
    variant: {
      id: "foston-x15-max-padrao",
      sku: "FOSTON-X15",
      batteryLabel: null,
      ...placeholderColor,
    },
  },
];
