"use client";

import { AdminCatalog } from "@/components/admin-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminError, adminFetch } from "@/lib/admin-api";
import { formatBRL } from "@/lib/catalog";
import { useState, type FormEvent } from "react";

type Overview = {
  products: {
    id: string;
    name: string;
    brand: string;
    batteries: { id: string; name: string; priceDeltaCents: number }[];
    colors: { id: string; name: string; stock: number }[];
  }[];
  banners: { id: string; title: string; active: boolean }[];
  orders: number;
  bookings: number;
  tradeIns: number;
  serviceBookings: number;
  recentOrders: { code: string; status: string; method: string; totalCents: number }[];
  recentTradeIns: { id: string; brand: string; model: string; city: string }[];
  recentService: { id: string; dealerId: string; productId: string; preferredDate: string }[];
  coupons: { code: string; label: string }[];
  guides: { slug: string; title: string }[];
};

type Section = "pedidos" | "produtos" | "acessorios" | "carrossel";
type Mode = "anon" | "session" | "token";

const sections: { id: Section; label: string }[] = [
  { id: "pedidos", label: "Pedidos" },
  { id: "produtos", label: "Produtos" },
  { id: "acessorios", label: "Acessórios" },
  { id: "carrossel", label: "Carrossel" },
];

const statusLabel: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_preparo: "Em preparo",
  em_transporte: "Em transporte",
  entregue: "Entregue",
  recusado: "Recusado",
};

export function AdminPanel() {
  const [mode, setMode] = useState<Mode>("anon");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [section, setSection] = useState<Section>("pedidos");
  const [data, setData] = useState<Overview | null>(null);

  async function loadOverview(nextToken?: string) {
    setError("");
    const headers = new Headers();
    if (nextToken) headers.set("x-admin-token", nextToken);
    try {
      const response = await fetch("/api/commerce/v1/admin/overview", { headers, credentials: "include" });
      const body = (await response.json()) as Overview & { message?: string };
      if (!response.ok) {
        setData(null);
        setError(body.message ?? "Não autorizado.");
        return;
      }
      setData(body);
    } catch {
      setData(null);
      setError("A API não respondeu.");
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const result = await adminFetch("/v1/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      if (result.ok) {
        setMode("session");
        setPassword("");
        setSection("pedidos");
        await loadOverview();
        return;
      }
      if (result.status === 404 || result.status === 503) {
        setShowToken(true);
        setToken(sessionStorage.getItem("lume-admin-token") || "dev-admin-token");
        setError(result.body.message ?? "O login por senha ainda não está disponível. Use o token até a sessão existir.");
        return;
      }
      setError(adminError(result, "Senha recusada."));
    } catch {
      setShowToken(true);
      setError("A API não respondeu.");
    }
  }

  async function enterWithToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sessionStorage.setItem("lume-admin-token", token);
    setMode("token");
    setSection("pedidos");
    await loadOverview(token);
  }

  async function logout() {
    await adminFetch("/v1/admin/logout", { method: "POST" }, mode === "token" ? token : undefined);
    sessionStorage.removeItem("lume-admin-token");
    setMode("anon");
    setData(null);
    setPassword("");
  }

  const authToken = mode === "token" ? token : undefined;

  return (
    <div className="mt-8 grid gap-8">
      {mode === "anon" ? (
        <div className="grid max-w-md gap-6">
          <form className="grid gap-3" onSubmit={(event) => void login(event)}>
            <label className="grid gap-1 text-sm">
              Senha
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 rounded-full px-4"
                aria-label="Senha de admin"
                autoComplete="current-password"
                required
              />
            </label>
            <Button type="submit" className="h-12 rounded-full">
              Entrar
            </Button>
          </form>
          {showToken ? (
            <form className="grid gap-3" onSubmit={(event) => void enterWithToken(event)}>
              <p className="text-sm text-muted-foreground">Fora de produção o token antigo ainda abre pedidos e o estoque em memória.</p>
              <Input value={token} onChange={(event) => setToken(event.target.value)} className="h-12 rounded-full px-4" aria-label="Token de admin" />
              <Button type="submit" variant="outline" className="h-12 rounded-full">
                Entrar com token
              </Button>
            </form>
          ) : (
            <button
              type="button"
              className="text-left text-sm underline"
              onClick={() => {
                setShowToken(true);
                setToken(sessionStorage.getItem("lume-admin-token") || "dev-admin-token");
              }}
            >
              Entrar com o token de desenvolvimento
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-2" aria-label="Seções do admin">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={section === item.id}
                className="rounded-full border border-white/15 px-4 py-2 text-sm aria-pressed:border-signal"
                onClick={() => {
                  setSection(item.id);
                  if (item.id === "pedidos") void loadOverview(authToken);
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => void logout()}>
            Sair
          </Button>
        </div>
      )}
      {error ? <p className="text-sm text-signal">{error}</p> : null}
      {mode !== "anon" && section === "pedidos" ? <Orders data={data} token={authToken} onSaved={() => loadOverview(authToken)} /> : null}
      {mode !== "anon" && section !== "pedidos" ? <AdminCatalog token={authToken} section={section} /> : null}
    </div>
  );
}

function Orders({ data, token, onSaved }: { data: Overview | null; token?: string; onSaved: () => Promise<void> }) {
  if (!data) return <p className="text-sm text-muted-foreground">A visão de pedidos aparece quando a API aceita a sessão ou o token.</p>;
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Pedidos em memória: {data.orders}. Test rides: {data.bookings}. Trocas: {data.tradeIns}. Serviços: {data.serviceBookings}. O estoque desta tela não muda a vitrine.
      </p>
      <section>
        <h2 className="text-2xl font-light">Pedidos</h2>
        {data.recentOrders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum pedido neste processo.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {data.recentOrders.map((order) => (
              <li key={order.code} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm">
                <span className="nums">{order.code}</span>
                <span>{statusLabel[order.status] ?? order.status}</span>
                <span>{order.method}</span>
                <span className="nums">{formatBRL(order.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-2xl font-light">Cupons</h2>
        <ul className="mt-3 grid gap-2">
          {data.coupons.map((coupon) => (
            <li key={coupon.code} className="rounded-2xl border border-white/10 px-4 py-3 text-sm">
              <span className="nums">{coupon.code}</span> · {coupon.label}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-light">Conteúdo</h2>
        <ul className="mt-3 grid gap-2">
          {data.guides.map((guide) => (
            <li key={guide.slug} className="rounded-2xl border border-white/10 px-4 py-3 text-sm">
              {guide.title}
            </li>
          ))}
          {data.banners.map((banner) => (
            <li key={banner.id} className="rounded-2xl border border-white/10 px-4 py-3 text-sm">
              {banner.title} · {banner.active ? "ativo" : "oculto"}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-light">Trocas e serviço</h2>
        {data.recentTradeIns.length === 0 && data.recentService.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum pedido neste processo.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {data.recentTradeIns.map((item) => (
              <li key={item.id} className="rounded-2xl border border-white/10 px-4 py-3 text-sm">
                Troca · {item.brand} {item.model} · {item.city}
              </li>
            ))}
            {data.recentService.map((item) => (
              <li key={item.id} className="rounded-2xl border border-white/10 px-4 py-3 text-sm">
                Serviço · {item.productId} · {item.dealerId} · {item.preferredDate}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-2xl font-light">Variantes</h2>
        <ul className="mt-3 grid gap-2">
          {data.products.map((product) => (
            <li key={product.id} className="rounded-2xl border border-white/10 px-4 py-3 text-sm">
              <span>
                {product.brand} {product.name}
              </span>
              <span className="mt-1 block text-muted-foreground">
                {product.batteries.map((battery) => `${battery.name} (${battery.priceDeltaCents > 0 ? `+${formatBRL(battery.priceDeltaCents)}` : "série"})`).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 font-normal">Modelo</th>
              <th className="py-2 font-normal">Cor</th>
              <th className="py-2 font-normal">Estoque</th>
            </tr>
          </thead>
          <tbody>
            {data.products.flatMap((product) =>
              product.colors.map((color) => (
                <tr key={`${product.id}-${color.id}`} className="border-t border-white/10">
                  <td className="py-3">{product.name}</td>
                  <td>{color.name}</td>
                  <td>
                    <form
                      className="flex gap-2"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const stock = Number(new FormData(event.currentTarget).get("stock"));
                        await fetch("/api/commerce/v1/admin/stock", {
                          method: "PATCH",
                          headers: { "content-type": "application/json", ...(token ? { "x-admin-token": token } : {}) },
                          credentials: "include",
                          body: JSON.stringify({ productId: product.id, colorId: color.id, stock }),
                        });
                        await onSaved();
                      }}
                    >
                      <Input name="stock" type="number" min={0} defaultValue={color.stock} key={color.stock} className="h-10 w-24 rounded-full px-3" aria-label={`Estoque de ${product.name} ${color.name}`} />
                      <Button type="submit" variant="outline" className="rounded-full">
                        Salvar
                      </Button>
                    </form>
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
