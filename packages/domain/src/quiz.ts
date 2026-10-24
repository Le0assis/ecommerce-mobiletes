import { autopropelidoBadge } from "./autopropelido";
import { motorcycles, type Motorcycle } from "./catalog";

export type QuizUse = "trabalho" | "entregas" | "passeio" | "crianca";
export type QuizDailyKm = "ate20" | "20a40" | "40a70" | "mais70";
export type QuizCharging = "tomada" | "removivel";
export type QuizCarry = "sozinho" | "passageiro" | "crianca" | "pet";
export type QuizCargo = "bau" | "cesta" | "nenhum";
export type QuizBudget = "ate6" | "6a10" | "mais10";
export type QuizStyle = "retro" | "citycoco" | "esportivo";
export type QuizColor = "escura" | "clara" | "quente" | "indiferente";

export type QuizAnswers = {
  use: QuizUse;
  dailyKm: QuizDailyKm;
  hills: boolean;
  charging: QuizCharging;
  carry: QuizCarry;
  cargo: QuizCargo;
  budget: QuizBudget;
  style: QuizStyle;
  color: QuizColor;
  /** Sim filtra quem o selo marca como autopropelido. Ausente equivale a não. */
  withoutCnh?: boolean;
};

export type QuizProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  basePriceCents: number;
  rangeKm: number;
  topSpeedKmh?: number;
  powerKw?: number;
  powerNominalW?: number | null;
  torqueNm?: number;
  batteryKwh?: number;
  style?: QuizStyle | null;
  widthCm?: number | null;
  wheelbaseCm?: number | null;
  /** Quando a vitrine já calculou o selo. Sem o campo, vale `autopropelidoBadge`. */
  autopropelido?: boolean;
  batteryRemovable?: boolean | null;
  carries?: Array<"passageiro" | "crianca" | "pet">;
  accessoryIds?: string[];
  colors?: { id: string; name: string; hex: string }[];
};

export type QuizAccessoryKind =
  | "bau"
  | "cesta"
  | "cadeirinha"
  | "retrovisor"
  | "capacete"
  | "capa"
  | "suporte-celular"
  | "gaiola-pet";

export type QuizAccessorySuggestion = {
  kind: QuizAccessoryKind;
  name: string;
  reason: string;
};

export type QuizRecommendation<T extends QuizProduct = QuizProduct> = {
  product: T;
  score: number;
  reasons: string[];
  accessories: QuizAccessorySuggestion[];
};

const dailyTarget: Record<QuizDailyKm, number> = {
  ate20: 20,
  "20a40": 40,
  "40a70": 70,
  mais70: 90,
};

const budgetCeiling: Record<QuizBudget, number | null> = {
  ate6: 600_000,
  "6a10": 1_000_000,
  mais10: null,
};

const accessoryCopy: Record<QuizAccessoryKind, { name: string; reason: string }> = {
  bau: { name: "Baú 29–41 L", reason: "Fecha capacete e a carga do dia." },
  cesta: { name: "Cesta dianteira", reason: "Deixa a compra à vista, sem baú." },
  cadeirinha: { name: "Cadeirinha", reason: "Para levar criança com o encaixe do modelo." },
  retrovisor: { name: "Retrovisor", reason: "Par para ver o corredor." },
  capacete: { name: "Capacete", reason: "Proteção, mesmo no autopropelido, que dispensa habilitação." },
  capa: { name: "Capa", reason: "Cobre o banco na chuva." },
  "suporte-celular": { name: "Suporte de celular", reason: "Mapa e pedido na altura do olhar." },
  "gaiola-pet": { name: "Gaiola pet", reason: "Espaço fechado para o animal." },
};

function suggestAccessories(answers: QuizAnswers): QuizAccessorySuggestion[] {
  const kinds: QuizAccessoryKind[] = [];
  if (answers.cargo === "bau") kinds.push("bau");
  if (answers.cargo === "cesta") kinds.push("cesta");
  if (answers.use === "crianca" || answers.carry === "crianca") kinds.push("cadeirinha");
  kinds.push("retrovisor", "capacete");
  if (answers.use === "passeio") kinds.push("capa");
  if (answers.use === "trabalho" || answers.use === "entregas") kinds.push("suporte-celular");
  if (answers.carry === "pet") kinds.push("gaiola-pet");
  return kinds.map((kind) => ({ kind, ...accessoryCopy[kind] }));
}

function carries(product: QuizProduct, kind: "passageiro" | "crianca" | "pet") {
  if (product.carries) return product.carries.includes(kind);
  if (kind === "passageiro") return product.category !== "mobilete";
  return false;
}

function hasCargoBox(product: QuizProduct) {
  return (product.accessoryIds ?? []).some((id) => ["baules", "topcase", "bau", "bolsa"].includes(id));
}

function hasBasket(product: QuizProduct) {
  return (product.accessoryIds ?? []).some((id) => id === "cesta" || id.startsWith("cesta"));
}

function colorTone(color: { id: string; name: string; hex: string }): Exclude<QuizColor, "indiferente"> {
  const id = color.id.toLocaleLowerCase("pt-BR");
  const name = color.name.toLocaleLowerCase("pt-BR");
  if (id.includes("cobre") || name.includes("cobre")) return "quente";
  const hex = color.hex.replace("#", "");
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return "escura";
  if (r > 150 && r > g + 25 && r > b + 25) return "quente";
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance < 110 ? "escura" : "clara";
}

function isAutopropelido(product: QuizProduct) {
  if (typeof product.autopropelido === "boolean") return product.autopropelido;
  return autopropelidoBadge({
    powerNominalW: product.powerNominalW,
    topSpeedKmh: product.topSpeedKmh,
    widthCm: product.widthCm,
    wheelbaseCm: product.wheelbaseCm,
  }).eligible;
}

function hillPower(product: QuizProduct) {
  return (product.powerNominalW ?? 0) >= 800 || (product.powerKw ?? 0) >= 1 || (product.torqueNm ?? 0) >= 40;
}

function weakOnHills(product: QuizProduct) {
  const nominal = product.powerNominalW;
  if (nominal != null && nominal >= 500) return false;
  return (product.powerKw ?? 0) < 0.8 && (product.torqueNm ?? 0) < 30;
}

export function recommendMotorcycles(answers: QuizAnswers): QuizRecommendation<Motorcycle>[];
export function recommendMotorcycles<T extends QuizProduct>(answers: QuizAnswers, catalog: readonly T[]): QuizRecommendation<T>[];
export function recommendMotorcycles<T extends QuizProduct>(
  answers: QuizAnswers,
  catalog?: readonly T[],
): QuizRecommendation<T>[] {
  const listed = catalog ?? (motorcycles as unknown as readonly T[]);
  const source = answers.withoutCnh ? listed.filter((product) => isAutopropelido(product)) : listed;
  const distance = dailyTarget[answers.dailyKm];
  const ceiling = budgetCeiling[answers.budget];
  const accessories = suggestAccessories(answers);

  const ranked = source.flatMap((product) => {
    if (ceiling != null && product.basePriceCents > ceiling) return [];
    let score = 0;
    const reasons: string[] = [];
    const add = (points: number, reason?: string) => {
      score += points;
      if (points > 0 && reason) reasons.push(reason);
    };

    if (answers.withoutCnh) add(1, "O selo marca este modelo como autopropelido.");

    if (ceiling == null) {
      add(product.basePriceCents >= 1_000_000 ? 4 : 2, product.basePriceCents >= 1_000_000 ? "Está na faixa acima de R$ 10 mil." : "Cabe no orçamento informado.");
    } else {
      add(4, "Cabe no orçamento informado.");
    }

    if (product.rangeKm >= distance * 1.3) {
      add(3, `A autonomia declarada (${product.rangeKm} km) cobre o dia com folga.`);
    } else if (product.rangeKm >= distance) {
      add(1, "A autonomia declarada cobre o dia, com pouca sobra.");
    } else {
      score -= 4;
    }

    if (answers.use === "trabalho" && (product.category === "scooter" || product.category === "mobilete")) {
      add(3, "O porte encaixa no deslocamento de trabalho.");
    }
    if (answers.use === "trabalho" && product.category === "citycoco") add(1, "O formato citycoco também serve no corredor curto.");
    if (answers.use === "entregas") {
      if (product.category === "scooter") add(3, "Scooter com piso plano para entrega.");
      else if (product.category === "mobilete") add(2, "Mobilete para entrega curta.");
      if (hasCargoBox(product)) add(2, "Já prevê espaço de carga.");
      if (product.category === "adventure" || product.category === "sport") score -= 2;
    }
    if (answers.use === "passeio" && (product.category === "scooter" || product.category === "citycoco" || product.style === "retro")) {
      add(2, "O jeito do modelo combina com passeio.");
    }
    if (answers.use === "crianca") {
      if (carries(product, "crianca")) add(4, "A ficha marca lugar para criança.");
      else if (carries(product, "passageiro")) add(1, "Leva garupa; a cadeirinha precisa conferir o encaixe.");
      else score -= 2;
    }

    if (answers.hills && hillPower(product)) add(2, "Tem fôlego para ladeira.");
    if (answers.hills && weakOnHills(product)) score -= 2;

    if (answers.charging === "removivel") {
      if (product.batteryRemovable === true) add(4, "A bateria sai para carregar longe da tomada da garagem.");
      else if (product.batteryRemovable === false) score -= 4;
    } else if (product.batteryRemovable === false) {
      add(1, "Carrega na tomada, sem tirar a bateria.");
    }

    if (answers.carry === "sozinho") add(1);
    if (answers.carry === "passageiro") {
      if (carries(product, "passageiro")) add(3, "Leva garupa.");
      else score -= 3;
    }
    if (answers.carry === "crianca") {
      if (carries(product, "crianca")) add(4, "Prevê o transporte de criança.");
      else score -= 1;
    }
    if (answers.carry === "pet") {
      if (carries(product, "pet")) add(3, "A ficha marca espaço para pet.");
    }

    if (answers.cargo === "bau") {
      if (hasCargoBox(product)) add(2, "Aceita baú na linha de acessórios.");
    } else if (answers.cargo === "cesta") {
      if (hasBasket(product)) add(2, "Aceita cesta dianteira.");
    } else {
      add(1, "Segue sem volume extra.");
    }

    if (product.style && product.style === answers.style) add(4, `O estilo ${answers.style} é o deste modelo.`);
    else if (!product.style && answers.style === "citycoco" && product.category === "citycoco") {
      add(4, "A categoria citycoco é o estilo pedido.");
    } else if (product.style && product.style !== answers.style) {
      score -= 1;
    }

    if (answers.color !== "indiferente" && (product.colors ?? []).some((color) => colorTone(color) === answers.color)) {
      add(2, "Tem a cor pedida.");
    }

    return [{ product, score, reasons: reasons.slice(0, 8), accessories }];
  });

  const sorted = ranked.sort((a, b) => b.score - a.score || a.product.basePriceCents - b.product.basePriceCents);
  if (sorted.length === 0) return [];
  const positive = sorted.filter((item) => item.score > 0).slice(0, 3);
  if (positive.length > 0) return positive;
  const fallback = sorted[0];
  if (!fallback) return [];
  if (fallback.reasons.length === 0) {
    fallback.reasons.push("É o modelo menos distante das respostas.");
  }
  return [fallback];
}
