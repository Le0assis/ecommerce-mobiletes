"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dealers, motorcycles } from "@/lib/catalog";
import { bookTestRide } from "@/lib/shop-api";
import { useMemo, useState } from "react";

export function TestRideForm({ initialModel = "apex" }: { initialModel?: string }) {
  const [productSlug, setProductSlug] = useState(initialModel);
  const [dealerId, setDealerId] = useState(dealers[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const available = useMemo(
    () => dealers.filter((dealer) => dealer.testRideSlugs.includes(productSlug)),
    [productSlug],
  );

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const booking = await bookTestRide({
        productId: productSlug,
        dealerId: String(formData.get("dealerId")),
        name: String(formData.get("name")),
        email: String(formData.get("email")),
        phone: String(formData.get("phone")),
        preferredDate: String(formData.get("preferredDate")),
      });
      setMessage(`Horário pedido. Protocolo ${booking.id.slice(0, 8)}. A loja confirma por e-mail.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível agendar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="mt-8 grid gap-4">
      <label className="grid gap-2 text-sm">
        Modelo
        <select
          className="h-12 rounded-full border border-white/15 bg-transparent px-4"
          value={productSlug}
          onChange={(event) => {
            const slug = event.target.value;
            setProductSlug(slug);
            const next = dealers.find((dealer) => dealer.testRideSlugs.includes(slug));
            if (next) setDealerId(next.id);
          }}
        >
          {motorcycles.map((product) => (
            <option key={product.id} value={product.slug}>
              {product.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm">
        Loja
        <select name="dealerId" className="h-12 rounded-full border border-white/15 bg-transparent px-4" value={dealerId} onChange={(event) => setDealerId(event.target.value)}>
          {available.map((dealer) => (
            <option key={dealer.id} value={dealer.id}>
              {dealer.name} · {dealer.neighborhood}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required minLength={3} className="h-12 rounded-full px-4" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required className="h-12 rounded-full px-4" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" required minLength={10} className="h-12 rounded-full px-4" placeholder="11999990000" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="preferredDate">Data</Label>
        <Input id="preferredDate" name="preferredDate" type="date" required className="h-12 rounded-full px-4" />
      </div>
      {error ? <p className="text-sm text-signal">{error}</p> : null}
      {message ? <p className="text-sm text-paper">{message}</p> : null}
      <Button type="submit" disabled={pending} className="h-12 rounded-full">
        {pending ? "Enviando…" : "Pedir horário"}
      </Button>
    </form>
  );
}
