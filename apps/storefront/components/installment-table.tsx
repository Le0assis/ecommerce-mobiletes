"use client";

import { formatBRL, simulateInstallments } from "@/lib/catalog";

const highlights = new Set([1, 6, 12, 21]);

export function InstallmentTable({ amountCents, compact = false }: { amountCents: number; compact?: boolean }) {
  const plans = simulateInstallments(amountCents).filter((plan) => (compact ? highlights.has(plan.count) : true));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Parcelas do cartão sobre o valor configurado, sem o frete</caption>
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-2 font-normal">Parcelas</th>
            <th className="py-2 font-normal">Valor</th>
            <th className="py-2 font-normal">Total</th>
          </tr>
        </thead>
        <tbody className="nums">
          {plans.map((plan) => (
            <tr key={plan.count} className={`border-t border-white/10 ${plan.count === 21 ? "text-paper" : ""}`}>
              <th className="py-2 font-normal">
                {plan.count}×{plan.interestFree ? " sem juros" : ""}
              </th>
              <td className="py-2">{formatBRL(plan.installmentCents)}</td>
              <td className="py-2 text-muted-foreground">{formatBRL(plan.totalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
