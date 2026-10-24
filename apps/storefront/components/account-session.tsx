"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/catalog";
import { accountOrders, requestSandboxCode, verifySandboxCode, type PlacedOrder } from "@/lib/shop-api";
import Link from "next/link";
import { useState } from "react";

export function AccountSession() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [hint, setHint] = useState("");
  const [token, setToken] = useState("");
  const [orders, setOrders] = useState<PlacedOrder[] | null>(null);
  const [error, setError] = useState("");

  async function askCode() {
    setError("");
    try {
      const body = await requestSandboxCode(email);
      setHint(body.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o código.");
    }
  }

  async function enter() {
    setError("");
    try {
      const session = await verifySandboxCode(email, code);
      setToken(session.token);
      const mine = await accountOrders(session.token);
      setOrders(mine.orders);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar.");
    }
  }

  return (
    <section className="grid gap-4 rounded-[1.8rem] border border-white/10 p-5">
      <h2 className="text-xl font-light">Sessão de sandbox</h2>
      <p className="text-sm text-muted-foreground">Sem senha e sem CPF. O código chega no e-mail do pedido e vale uma vez. Em desenvolvimento, a API escreve o código no log.</p>
      <div className="grid gap-2">
        <Label htmlFor="session-email">E-mail do pedido</Label>
        <Input id="session-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-full px-4" />
      </div>
      <Button type="button" variant="outline" className="h-11 rounded-full border-white/20" onClick={() => void askCode()}>
        Pedir código
      </Button>
      {hint ? <p className="text-sm text-paper">{hint}</p> : null}
      <div className="grid gap-2">
        <Label htmlFor="session-code">Código</Label>
        <Input id="session-code" value={code} onChange={(event) => setCode(event.target.value)} className="h-12 rounded-full px-4" />
      </div>
      <Button type="button" className="h-11 rounded-full" onClick={() => void enter()}>
        Entrar
      </Button>
      {error ? <p className="text-sm text-signal">{error}</p> : null}
      {token && orders ? (
        orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pedido com esse e-mail na memória da API.</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {orders.map((order) => (
              <li key={order.publicId ?? order.code}>
                <Link className="underline" href={`/pedido/${encodeURIComponent(order.publicId || order.code)}`}>
                  {order.code}
                </Link>
                <span className="nums text-muted-foreground"> · {formatBRL(order.totalCents)} · {order.status.replaceAll("_", " ")}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
