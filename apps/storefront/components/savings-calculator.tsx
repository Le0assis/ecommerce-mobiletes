"use client";

import { estimateFuelSavings, formatBRL } from "@/lib/catalog";
import { useMemo, useState } from "react";

export function SavingsCalculator({ batteryKwh, rangeKm }: { batteryKwh: number | null; rangeKm: number | null }) {
  const [km, setKm] = useState(800);
  const [kwhCents, setKwhCents] = useState(95);
  const [literCents, setLiterCents] = useState(649);
  const [kmPerLiter, setKmPerLiter] = useState(12);
  const ready = typeof batteryKwh === "number" && typeof rangeKm === "number";

  const result = useMemo(() => {
    if (typeof batteryKwh !== "number" || typeof rangeKm !== "number") return { savings: null, error: "" };
    try {
      return {
        savings: estimateFuelSavings({
          kmPerMonth: km,
          batteryKwh,
          rangeKm,
          electricityCentsPerKwh: kwhCents,
          gasolineCentsPerLiter: literCents,
          gasolineKmPerLiter: kmPerLiter,
        }),
        error: "",
      };
    } catch (cause) {
      return { savings: null, error: cause instanceof Error ? cause.message : "Não foi possível estimar." };
    }
  }, [km, kwhCents, literCents, kmPerLiter, batteryKwh, rangeKm]);

  if (!ready) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        A comparação com gasolina precisa de kWh e da autonomia declarada. Este modelo não publica os dois.
      </p>
    );
  }

  return (
    <fieldset className="mt-6 rounded-[1.5rem] border border-white/10 p-4">
      <legend className="px-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">Contra a gasolina</legend>
      <label className="mt-2 block text-sm">
        Quilômetros por mês: <span className="nums">{km}</span>
        <input className="mt-2 w-full accent-[#ff2d2d]" type="range" min={100} max={3000} step={50} value={km} onChange={(event) => setKm(Number(event.target.value))} />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          kWh, em centavos
          <input className="nums mt-1 h-11 w-full rounded-full border border-white/15 bg-transparent px-3" type="number" min={1} value={kwhCents} onChange={(event) => setKwhCents(Number(event.target.value))} />
        </label>
        <label className="text-sm">
          Litro, em centavos
          <input className="nums mt-1 h-11 w-full rounded-full border border-white/15 bg-transparent px-3" type="number" min={1} value={literCents} onChange={(event) => setLiterCents(Number(event.target.value))} />
        </label>
        <label className="text-sm">
          Carro, km/L
          <input className="nums mt-1 h-11 w-full rounded-full border border-white/15 bg-transparent px-3" type="number" min={1} step={0.5} value={kmPerLiter} onChange={(event) => setKmPerLiter(Number(event.target.value))} />
        </label>
      </div>
      {result.savings ? (
        <dl className="nums mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Energia</dt>
            <dd>{formatBRL(result.savings.electricMonthCents)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Gasolina</dt>
            <dd>{formatBRL(result.savings.gasolineMonthCents)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Diferença</dt>
            <dd>{formatBRL(result.savings.savedMonthCents)}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-signal">{result.error}</p>
      )}
      <p className="mt-3 text-sm text-muted-foreground">{result.savings?.note}</p>
    </fieldset>
  );
}
