import { categoryLabel, motorcycles, type Motorcycle } from "./catalog";

export type QuizAnswers = {
  use: "cidade" | "misto" | "estrada";
  dailyKm: "ate30" | "30a80" | "80a150" | "mais150";
  pace: "ate50" | "ate110" | "livre";
  budgetCents: number;
  outlet: boolean;
  passenger: "sozinho" | "garupa";
};

export type QuizRecommendation = {
  product: Motorcycle;
  score: number;
  reasons: string[];
};

const dailyKm: Record<QuizAnswers["dailyKm"], number> = {
  ate30: 25,
  "30a80": 55,
  "80a150": 110,
  mais150: 170,
};

export function recommendMotorcycles(answers: QuizAnswers): QuizRecommendation[] {
  const distance = dailyKm[answers.dailyKm];

  const ranked = motorcycles.map((product) => {
    let score = 0;
    const reasons: string[] = [];

    if (product.basePriceCents <= answers.budgetCents) {
      score += 4;
      reasons.push("Cabe no orçamento informado, antes dos acessórios.");
    } else if (product.basePriceCents <= answers.budgetCents * 1.12) {
      score += 1;
      reasons.push("Passa um pouco do orçamento. O Pix de 5% aproxima.");
    } else {
      score -= 5;
    }

    if (product.rangeKm >= distance * 1.4) {
      score += 3;
      reasons.push(
        `A autonomia de referência (${product.rangeKm} km) cobre o trajeto com folga para não carregar todo dia.`,
      );
    } else if (product.rangeKm >= distance) {
      score += 1;
      reasons.push("A autonomia cobre o dia, com pouca sobra.");
    } else {
      score -= 4;
    }

    if (answers.use === "cidade" && (product.category === "mobilete" || product.category === "scooter" || product.category === "naked")) {
      score += 3;
      reasons.push(`${categoryLabel[product.category]} encaixa no uso urbano.`);
    }
    if (answers.use === "estrada" && (product.category === "adventure" || product.category === "sport")) {
      score += 3;
      reasons.push("Tem velocidade e autonomia para sair da cidade.");
    }
    if (answers.use === "misto" && product.category !== "mobilete") {
      score += 2;
      reasons.push("Serve para cidade durante a semana e estrada no fim de semana.");
    }
    if (answers.use === "cidade" && product.category === "sport") score -= 1;
    if (answers.use === "estrada" && product.category === "mobilete") score -= 4;

    if (answers.pace === "ate50" && product.topSpeedKmh <= 50) {
      score += 3;
      reasons.push("Fica dentro do limite de mobilete, sem sobra de velocidade.");
    }
    if (answers.pace === "ate50" && product.topSpeedKmh > 110) score -= 2;
    if (answers.pace === "ate110" && product.topSpeedKmh >= 80 && product.topSpeedKmh <= 140) {
      score += 3;
      reasons.push("A velocidade máxima cobre corredor e via expressa.");
    }
    if (answers.pace === "livre" && product.topSpeedKmh >= 140) {
      score += 3;
      reasons.push(`${product.topSpeedKmh} km/h de máxima para quem não quer teto baixo.`);
    }
    if (answers.pace === "livre" && product.topSpeedKmh <= 50) score -= 3;

    if (answers.passenger === "garupa") {
      if (product.category === "mobilete") {
        score -= 3;
      } else {
        score += 2;
        reasons.push("Aceita garupa com o suporte certo.");
      }
    }

    if (!answers.outlet && product.batteryKwh >= 10) {
      score -= 1;
      reasons.push("A bateria é grande. Sem tomada na garagem, considere o carregador portátil e a recarga na loja.");
    }
    if (answers.outlet && product.chargeHours <= 6) {
      score += 1;
    }

    return { product, score, reasons: reasons.slice(0, 3) };
  });

  return ranked.sort((a, b) => b.score - a.score || a.product.basePriceCents - b.product.basePriceCents).slice(0, 2);
}
