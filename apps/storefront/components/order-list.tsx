"use client";

import { useShop } from "@/components/shop-provider";
import { formatBRL } from "@/lib/catalog";
import { fetchOrder, type PlacedOrder } from "@/lib/shop-api";
import Link from "next/link";
import { useEffect, useState } from "react";

type Row = { code: string; order?: PlacedOrder; error?: string };

export function OrderList() {
  const { orderCodes } = useShop();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(orderCodes.length > 0);

  useEffect(() => {
    if (orderCodes.length === 0) return;
    let cancelled = false;
    Promise.all(
      orderCodes.map(async (code) => {
        try {
          const order = await fetchOrder(code);
          return { code, order };
        } catch (cause) {
          return { code, error: cause instanceof Error ? cause.message : "Não encontrado." };
        }
      }),
    ).then((next) => {
      if (!cancelled) {
        setRows(next);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [orderCodes]);

  if (orderCodes.length === 0) {
    return (
      <div className="rounded-[1.8rem] border border-white/10 p-6">
        <h2 className="text-2xl font-light">Nenhum pedido neste navegador.</h2>
        <p className="mt-3 text-muted-foreground">Quando uma reserva for confirmada, o código aparece aqui. A conta ainda não sincroniza entre aparelhos.</p>
        <Link href="/motos" className="mt-4 inline-block text-sm underline">
          Ver a linha
        </Link>
      </div>
    );
  }

  if (loading) return <p className="text-muted-foreground">Buscando os pedidos…</p>;

  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.code} className="rounded-[1.5rem] border border-white/10 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="nums text-2xl font-light">{row.code}</h2>
            {row.order ? <p className="nums">{formatBRL(row.order.totalCents)}</p> : null}
          </div>
          {row.order ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {row.order.status.replaceAll("_", " ")} · {row.order.method}
              {row.order.method === "cartao" ? ` · ${row.order.installments}×` : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{row.error} Se a API reiniciou sem Postgres, o pedido de memória se perde.</p>
          )}
          <Link href={`/pedido/${row.code}`} className="mt-3 inline-block text-sm underline">
            Abrir acompanhamento
          </Link>
        </li>
      ))}
    </ul>
  );
}
