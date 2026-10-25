"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { commerce } from "@/lib/commerce";
import { useState } from "react";

export function TradeInForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const body = await commerce<{ tradeIn: { id: string }; message: string }>("/v1/trade-ins", {
        method: "POST",
        body: JSON.stringify({
          name: String(formData.get("name")),
          email: String(formData.get("email")),
          phone: String(formData.get("phone")),
          brand: String(formData.get("brand")),
          model: String(formData.get("model")),
          year: Number(formData.get("year")),
          km: Number(formData.get("km")),
          city: String(formData.get("city")),
        }),
      });
      setMessage(`${body.message} Protocolo ${body.tradeIn.id.slice(0, 8)}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="trade-name" name="name" label="Nome" />
        <Field id="trade-email" name="email" label="E-mail" type="email" />
        <Field id="trade-phone" name="phone" label="Telefone" />
        <Field id="trade-city" name="city" label="Cidade" />
        <Field id="trade-brand" name="brand" label="Marca do usado" />
        <Field id="trade-model" name="model" label="Modelo" />
        <Field id="trade-year" name="year" label="Ano" type="number" />
        <Field id="trade-km" name="km" label="Quilometragem" type="number" />
      </div>
      {error ? <p className="text-sm text-signal">{error}</p> : null}
      {message ? <p className="text-sm text-paper">{message}</p> : null}
      <Button type="submit" disabled={pending} className="h-12 rounded-full">
        {pending ? "Enviando…" : "Pedir avaliação"}
      </Button>
      <p className="text-sm text-muted-foreground">A loja responde depois. Esta versão não dá preço de troca na hora.</p>
    </form>
  );
}

function Field({ id, name, label, type = "text" }: { id: string; name: string; label: string; type?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} required className="h-12 rounded-full px-4" />
    </div>
  );
}
