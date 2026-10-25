/**
 * Selo "Autopropelido, sem CNH" da Resolução CONTRAN 996/2023.
 * Os quatro limites são nominais. Potência de pico não entra.
 * Dado ausente, negativo ou não finito esconde o selo.
 */
export const AUTOPROPELIDO_LIMITS = {
  powerNominalW: 1_000,
  topSpeedKmh: 32,
  widthCm: 70,
  wheelbaseCm: 130,
} as const;

export const AUTOPROPELIDO_LABEL = "Autopropelido, sem CNH" as const;

export const AUTOPROPELIDO_NOTICE = "verifique as regras da sua cidade" as const;

export type AutopropelidoField = "powerNominalW" | "topSpeedKmh" | "widthCm" | "wheelbaseCm";

export type AutopropelidoInput = {
  powerNominalW?: number | null;
  topSpeedKmh?: number | null;
  widthCm?: number | null;
  wheelbaseCm?: number | null;
};

export type AutopropelidoBadge = {
  eligible: boolean;
  label: typeof AUTOPROPELIDO_LABEL | null;
  notice: typeof AUTOPROPELIDO_NOTICE;
  missing: AutopropelidoField[];
};

const fields: AutopropelidoField[] = ["powerNominalW", "topSpeedKmh", "widthCm", "wheelbaseCm"];

function isPresent(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function autopropelidoBadge(input: AutopropelidoInput): AutopropelidoBadge {
  const missing = fields.filter((field) => !isPresent(input[field]));
  const eligible =
    missing.length === 0 &&
    (input.powerNominalW as number) <= AUTOPROPELIDO_LIMITS.powerNominalW &&
    (input.topSpeedKmh as number) <= AUTOPROPELIDO_LIMITS.topSpeedKmh &&
    (input.widthCm as number) <= AUTOPROPELIDO_LIMITS.widthCm &&
    (input.wheelbaseCm as number) <= AUTOPROPELIDO_LIMITS.wheelbaseCm;

  return {
    eligible,
    label: eligible ? AUTOPROPELIDO_LABEL : null,
    notice: AUTOPROPELIDO_NOTICE,
    missing,
  };
}

/** Lê só os quatro campos nominais. `powerKw` é pico e fica de fora de propósito. */
export function specsForAutopropelido(product: AutopropelidoInput & { powerKw?: number | null }): AutopropelidoInput {
  return {
    powerNominalW: product.powerNominalW,
    topSpeedKmh: product.topSpeedKmh,
    widthCm: product.widthCm,
    wheelbaseCm: product.wheelbaseCm,
  };
}
