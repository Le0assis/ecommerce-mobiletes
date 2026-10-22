import { DomainError } from "./errors";

export type RideMode = "eco" | "cidade" | "esporte";

const modeFactor: Record<RideMode, number> = {
  eco: 1.1,
  cidade: 1,
  esporte: 0.78,
};

const modeNote: Record<RideMode, string> = {
  eco: "Modo eco alonga a carga e corta um pouco da resposta.",
  cidade: "Uso misto, perto do número de referência do modelo.",
  esporte: "Aceleração cheia e velocidade alta consomem a bateria mais rápido.",
};

export type RangeEstimate = {
  rangeKm: number;
  factor: number;
  note: string;
};

/**
 * Estimativa de autonomia a partir do número de referência do modelo.
 * Não substitui o ciclo de homologação. Serve para o comprador ver o efeito
 * de velocidade, peso e modo antes de falar com a loja.
 */
export function estimateRange(input: {
  baseRangeKm: number;
  speedKmh: number;
  extraWeightKg: number;
  mode: RideMode;
  optimalSpeedKmh: number;
}): RangeEstimate {
  if (input.baseRangeKm <= 0) {
    throw new DomainError("autonomia_invalida", "Autonomia de referência inválida.");
  }
  if (input.speedKmh < 10 || input.speedKmh > 220) {
    throw new DomainError("velocidade_invalida", "Informe uma velocidade entre 10 e 220 km/h.");
  }
  if (input.extraWeightKg < 0 || input.extraWeightKg > 150) {
    throw new DomainError("peso_invalido", "Peso extra acima do que a moto leva.");
  }

  const delta = (input.speedKmh - input.optimalSpeedKmh) / input.optimalSpeedKmh;
  const speedFactor = Math.min(1.05, Math.max(0.42, 1 - 0.55 * delta * delta));
  const weightFactor = Math.max(0.72, 1 - input.extraWeightKg * 0.0018);
  const factor = speedFactor * weightFactor * modeFactor[input.mode];
  const rangeKm = Math.max(1, Math.round(input.baseRangeKm * factor));

  return {
    rangeKm,
    factor,
    note: modeNote[input.mode],
  };
}
