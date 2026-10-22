"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dealers, motorcycles } from "@/lib/catalog";
import { commerce } from "@/lib/commerce";
import { useState } from "react";

export function ServiceForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError("");
    try {
      const body = await commerce<{ booking: { id: string }; message: string }>("/v1/service-bookings", {
        method: "POST",
        body: JSON.stringify({
          dealerId: String(formData.get("dealerId")),
          productId: String(formData.get("productId")),
          name: String(formData.get("name")),
          email: String(formData.get("email")),
          phone: String(formData.get("phone")),
          preferredDate: String(formData.get("preferredDate")),
          note: String(formData.get("note")),
        }),
      });
      setMessage(`${body.message} Protocolo ${body.booking.id.slice(0, 8)}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível agendar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        Loja
        <select name="dealerId" className="h-12 rounded-full border border-white/15 bg-transparent px-4" defaultValue={dealers[0]?.id}>
          {dealers.map((dealer) => (
            <option key={dealer.id} value={dealer.id}>
              {dealer.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm">
        Modelo
        <select name="productId" className="h-12 rounded-full border border-white/15 bg-transparent px-4" defaultValue="apex">
          {motorcycles.map((product) => (
            <option key={product.id} value={product.slug}>
              {product.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2">
        <Label htmlFor="service-name">Nome</Label>
        <Input id="service-name" name="name" required minLength={3} className="h-12 rounded-full px-4" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="service-email">E-mail</Label>
        <Input id="service-email" name="email" type="email" required className="h-12 rounded-full px-4" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="service-phone">Telefone</Label>
        <Input id="service-phone" name="phone" required minLength={10} className="h-12 rounded-full px-4" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="service-date">Data</Label>
        <Input id="service-date" name="preferredDate" type="date" required className="h-12 rounded-full px-4" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="service-note">O que precisa</Label>
        <textarea id="service-note" name="note" required minLength={8} rows={4} className="rounded-3xl border border-white/15 bg-transparent px-4 py-3 text-sm" />
      </div>
      {error ? <p className="text-sm text-signal">{error}</p> : null}
      {message ? <p className="text-sm text-paper">{message}</p> : null}
      <Button type="submit" disabled={pending} className="h-12 rounded-full">
        {pending ? "Agendando…" : "Pedir horário"}
      </Button>
    </form>
  );
}
