import { DomainError } from "./errors";

export type FuelSavings = {
  kmPerMonth: number;
  electricMonthCents: number;
  gasolineMonthCents: number;
  savedMonthCents: number;
  note: string;
};

/**
 * Compara o kWh da moto com um carro a gasolina de referência.
 * Uma única rodada de arredondamento para centavos. Não é TCO: ignora IPVA, pneu e manutenção.
 */
export function estimateFuelSavings(input: {
  kmPerMonth: number;
  batteryKwh: number;
  rangeKm: number;
  electricityCentsPerKwh: number;
  gasolineCentsPerLiter: number;
  gasolineKmPerLiter: number;
}): FuelSavings {
  if (!Number.isFinite(input.kmPerMonth) || input.kmPerMonth <= 0 || input.kmPerMonth > 20_000) {
    throw new DomainError("uso_invalido", "Informe quilômetros por mês entre 1 e 20.000.");
  }
  if (input.batteryKwh <= 0 || input.rangeKm <= 0) {
    throw new DomainError("bateria_invalida", "A bateria precisa ter carga e autonomia.");
  }
  if (input.electricityCentsPerKwh <= 0 || input.gasolineCentsPerLiter <= 0 || input.gasolineKmPerLiter <= 0) {
    throw new DomainError("tarifa_invalida", "Informe tarifa de energia, gasolina e consumo do carro.");
  }

  const kwhPerKm = input.batteryKwh / input.rangeKm;
  const electricMonthCents = Math.round(input.kmPerMonth * kwhPerKm * input.electricityCentsPerKwh);
  const gasolineMonthCents = Math.round((input.kmPerMonth / input.gasolineKmPerLiter) * input.gasolineCentsPerLiter);
  const savedMonthCents = gasolineMonthCents - electricMonthCents;

  return {
    kmPerMonth: input.kmPerMonth,
    electricMonthCents,
    gasolineMonthCents,
    savedMonthCents,
    note: "Estimativa de energia contra combustível. Não inclui manutenção, pneu, seguro nem IPVA.",
  };
}
