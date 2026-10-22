"use client";

import { commerce } from "@/lib/commerce";
import { formatBRL } from "@lume/domain";
import { useEffect, useState } from "react";

type Order = {
  code: string;
  status: string;
  method: string;
  provider: string;
  installments: number;
  installmentCents: number;
  totalCents: number;
  pix?: { copyPaste: string; expiresAt: string };
  boleto?: { line: string; dueDate: string };
};

export function OrderStatus({ code }: { code: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    commerce<{ order: Order }>(`/v1/orders/${code}`)
      .then((body) => {
        if (!cancelled) setOrder(body.order);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Pedido não encontrado.");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) return <p className="mt-6 text-muted-foreground">{error} Se a API reiniciou, o pedido de demonstração em memória se perde.</p>;
  if (!order) return <p className="mt-6 text-muted-foreground">Buscando o pedido…</p>;

  return (
    <div className="mt-8 grid gap-4 rounded-[1.8rem] border border-white/10 p-5">
      <p className="text-sm text-muted-foreground">Status: {order.status.replaceAll("_", " ")}</p>
      <p className="nums text-3xl font-light">{formatBRL(order.totalCents)}</p>
      <p className="text-sm">
        {order.method} · {order.provider}
        {order.method === "cartao" ? ` · ${order.installments}× de ${formatBRL(order.installmentCents)}` : ""}
      </p>
      {order.pix ? (
        <div className="rounded-2xl bg-[#07332e] p-4">
          <p className="text-xs tracking-[0.16em] text-pix uppercase">Pix copia e cola · demonstração</p>
          <p className="mt-2 break-all font-mono text-sm">{order.pix.copyPaste}</p>
          <p className="mt-2 text-xs text-muted-foreground">Expira {new Date(order.pix.expiresAt).toLocaleString("pt-BR")}</p>
        </div>
      ) : null}
      {order.boleto ? (
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Linha digitável · demonstração</p>
          <p className="mt-2 text-sm">{order.boleto.line}</p>
          <p className="text-xs text-muted-foreground">Vencimento {order.boleto.dueDate}</p>
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">Nenhum dinheiro foi movimentado. O webhook do provedor entra quando houver credencial de homologação.</p>
    </div>
  );
}
