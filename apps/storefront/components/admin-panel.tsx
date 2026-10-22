"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

type Overview = {
  products: { id: string; name: string; colors: { id: string; name: string; stock: number }[] }[];
  banners: { id: string; title: string; active: boolean }[];
  orders: number;
  bookings: number;
};

export function AdminPanel() {
  const [token, setToken] = useState("dev-admin-token");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  async function load(nextToken = token) {
    setError("");
    const response = await fetch("/api/commerce/v1/admin/overview", { headers: { "x-admin-token": nextToken } });
    const body = (await response.json()) as Overview & { message?: string };
    if (!response.ok) {
      setData(null);
      setError(body.message ?? "Não autorizado.");
      return;
    }
    setData(body);
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("lume-admin-token") || "dev-admin-token";
    let cancelled = false;
    fetch("/api/commerce/v1/admin/overview", { headers: { "x-admin-token": stored } })
      .then(async (response) => {
        const body = (await response.json()) as Overview & { message?: string };
        if (cancelled) return;
        setToken(stored);
        if (!response.ok) {
          setData(null);
          setError(body.message ?? "Não autorizado.");
          return;
        }
        setError("");
        setData(body);
      })
      .catch(() => {
        if (!cancelled) setError("A API não respondeu.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-8 grid gap-6">
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          sessionStorage.setItem("lume-admin-token", token);
          void load(token);
        }}
      >
        <Input value={token} onChange={(event) => setToken(event.target.value)} className="h-12 max-w-sm rounded-full px-4" aria-label="Token de admin" />
        <Button type="submit" className="h-12 rounded-full">
          Entrar
        </Button>
      </form>
      {error ? <p className="text-sm text-signal">{error}</p> : null}
      {data ? (
        <>
          <p className="text-sm text-muted-foreground">
            Pedidos em memória: {data.orders}. Test rides em memória: {data.bookings}.
          </p>
          <ul className="grid gap-3">
            {data.banners.map((banner) => (
              <li key={banner.id} className="rounded-2xl border border-white/10 px-4 py-3 text-sm">
                {banner.title} · {banner.active ? "ativo" : "oculto"}
              </li>
            ))}
          </ul>
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
                              headers: { "content-type": "application/json", "x-admin-token": token },
                              body: JSON.stringify({ productId: product.id, colorId: color.id, stock }),
                            });
                            await load(token);
                          }}
                        >
                          <Input name="stock" type="number" min={0} defaultValue={color.stock} key={color.stock} className="h-10 w-24 rounded-full px-3" />
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
      ) : null}
    </div>
  );
}
