import { describe, expect, it } from "vitest";
import { autopropelidoBadge, specsForAutopropelido, AUTOPROPELIDO_LIMITS, AUTOPROPELIDO_NOTICE } from "./autopropelido";

const atLimit = {
  powerNominalW: AUTOPROPELIDO_LIMITS.powerNominalW,
  topSpeedKmh: AUTOPROPELIDO_LIMITS.topSpeedKmh,
  widthCm: AUTOPROPELIDO_LIMITS.widthCm,
  wheelbaseCm: AUTOPROPELIDO_LIMITS.wheelbaseCm,
};

describe("selo autopropelido", () => {
  it("aceita os quatro limites exatos da CONTRAN 996/2023", () => {
    const badge = autopropelidoBadge(atLimit);
    expect(badge.eligible).toBe(true);
    expect(badge.label).toBe("Autopropelido, sem CNH");
    expect(badge.notice).toBe(AUTOPROPELIDO_NOTICE);
    expect(badge.missing).toEqual([]);
  });

  it("recusa um watt, um km/h, um centímetro de largura ou de entre-eixos acima do teto", () => {
    expect(autopropelidoBadge({ ...atLimit, powerNominalW: 1_001 }).eligible).toBe(false);
    expect(autopropelidoBadge({ ...atLimit, topSpeedKmh: 32.01 }).eligible).toBe(false);
    expect(autopropelidoBadge({ ...atLimit, widthCm: 70.01 }).eligible).toBe(false);
    expect(autopropelidoBadge({ ...atLimit, wheelbaseCm: 130.01 }).eligible).toBe(false);
    expect(autopropelidoBadge({ ...atLimit, powerNominalW: 1_001 }).label).toBeNull();
    expect(autopropelidoBadge({ ...atLimit, powerNominalW: 1_001 }).missing).toEqual([]);
  });

  it("esconde o selo quando qualquer medida falta", () => {
    for (const field of ["powerNominalW", "topSpeedKmh", "widthCm", "wheelbaseCm"] as const) {
      const input = { ...atLimit, [field]: null };
      const badge = autopropelidoBadge(input);
      expect(badge.eligible).toBe(false);
      expect(badge.label).toBeNull();
      expect(badge.missing).toEqual([field]);
      expect(autopropelidoBadge({ ...atLimit, [field]: undefined }).missing).toEqual([field]);
    }
  });

  it("trata NaN, infinito e negativo como dado ausente", () => {
    expect(autopropelidoBadge({ ...atLimit, powerNominalW: Number.NaN }).missing).toEqual(["powerNominalW"]);
    expect(autopropelidoBadge({ ...atLimit, topSpeedKmh: Number.POSITIVE_INFINITY }).missing).toEqual(["topSpeedKmh"]);
    expect(autopropelidoBadge({ ...atLimit, widthCm: -1 }).missing).toEqual(["widthCm"]);
    const empty = autopropelidoBadge({});
    expect(empty.eligible).toBe(false);
    expect(empty.missing).toEqual(["powerNominalW", "topSpeedKmh", "widthCm", "wheelbaseCm"]);
  });

  it("não usa potência de pico no lugar da nominal", () => {
    const badge = autopropelidoBadge(
      specsForAutopropelido({
        powerKw: 1,
        topSpeedKmh: 32,
        widthCm: 70,
        wheelbaseCm: 130,
      }),
    );
    expect(badge.eligible).toBe(false);
    expect(badge.missing).toEqual(["powerNominalW"]);
  });

  it("aceita zero como medida informada", () => {
    const badge = autopropelidoBadge({ ...atLimit, powerNominalW: 0, topSpeedKmh: 0, widthCm: 0, wheelbaseCm: 0 });
    expect(badge.eligible).toBe(true);
    expect(badge.missing).toEqual([]);
  });
});
