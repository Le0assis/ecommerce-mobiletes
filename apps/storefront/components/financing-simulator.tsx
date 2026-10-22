"use client";

import { InstallmentTable } from "@/components/installment-table";
import { formatBRL, LAUNCH_INTEREST_FREE_UP_TO } from "@/lib/catalog";
import { useState } from "react";

export function FinancingSimulator({ initialReais = 62900 }: { initialReais?: number }) {
  const [reais, setReais] = useState(initialReais);
  const cents = Math.round(Math.max(1, reais) * 100);
  const pix = Math.round(cents * 0.95);
  const boleto = Math.round(cents * 0.97);

  return (
    <div className="grid gap-6 rounded-[1.8rem] border border-white/10 p-5">
      <label className="grid gap-2 text-sm">
        Valor da moto, em reais, sem frete
        <input
          className="nums h-12 rounded-full border border-white/15 bg-transparent px-4 text-lg"
          type="number"
          min={1000}
          step={100}
          value={reais}
          onChange={(event) => setReais(Number(event.target.value))}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <p>
          <span className="block text-xs tracking-[0.14em] text-muted-foreground uppercase">Cartão</span>
          <span className="nums text-2xl font-light">{LAUNCH_INTEREST_FREE_UP_TO}× sem juros</span>
        </p>
        <p>
          <span className="block text-xs tracking-[0.14em] text-pix uppercase">Pix −5%</span>
          <span className="nums text-2xl font-light">{formatBRL(pix)}</span>
        </p>
        <p>
          <span className="block text-xs tracking-[0.14em] text-muted-foreground uppercase">Boleto −3%</span>
          <span className="nums text-2xl font-light">{formatBRL(boleto)}</span>
        </p>
      </div>
      <InstallmentTable amountCents={cents} />
      <p className="text-sm text-muted-foreground">
        O desconto do Pix e do boleto vale sobre a moto configurada. O frete entra por fora, sem desconto, e a parcela do checkout inclui o frete. Este simulador mostra só a moto.
      </p>
    </div>
  );
}
