"use client";

import { formatBRL } from "@/lib/catalog";
import { advanceSandbox, fetchOrder, type PlacedOrder, type TrackingStep } from "@/lib/shop-api";
import { useEffect, useState } from "react";

export function OrderStatus({ code }: { code: string }) {
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [tracking, setTracking] = useState<TrackingStep[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchOrder(code)
      .then((next) => {
        if (!cancelled) {
          setOrder(next.order);
          setTracking(next.tracking);
        }
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
      <ol className="grid gap-2">
        {tracking.map((step) => (
          <li key={step.id} className={step.done ? "text-paper" : "text-muted-foreground"}>
            <span className={`mr-2 inline-block size-2 rounded-full ${step.current ? "bg-signal" : step.done ? "bg-paper" : "bg-white/20"}`} aria-hidden="true" />
            {step.id.replaceAll("_", " ")}
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="h-11 rounded-full border border-white/20 px-4 text-sm"
        onClick={() => {
          void advanceSandbox(code)
            .then((next) => {
              setOrder(next.order);
              setTracking(next.tracking);
              setNote(next.message);
            })
            .catch((cause: unknown) => setNote(cause instanceof Error ? cause.message : "O sandbox não avançou."));
        }}
      >
        Avançar no sandbox
      </button>
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      <p className="nums text-3xl font-light">{formatBRL(order.totalCents)}</p>
      <p className="text-sm">
        {order.method} · {order.provider}
        {order.method === "cartao" ? ` · ${order.installments}× de ${formatBRL(order.installmentCents)}` : ""}
      </p>
      {order.pix ? (
        <div className="rounded-2xl bg-[#07332e] p-4">
          <p className="text-xs tracking-[0.16em] text-pix uppercase">Pix copia e cola · demonstração</p>
          <p className="mt-2 break-all font-mono text-sm">{order.pix.copyPaste}</p>
          <button
            type="button"
            className="mt-3 text-sm underline"
            onClick={() => {
              void navigator.clipboard.writeText(order.pix?.copyPaste ?? "").then(() => setCopied(true)).catch(() => setCopied(false));
            }}
          >
            {copied ? "Copiado" : "Copiar código"}
          </button>
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
