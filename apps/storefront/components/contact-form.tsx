"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const entry = {
          name: String(data.get("name")),
          email: String(data.get("email")),
          topic: String(data.get("topic")),
          message: String(data.get("message")),
          at: new Date().toISOString(),
        };
        const previous = localStorage.getItem("lume-messages");
        let list: unknown[] = [];
        try {
          const parsed = previous ? (JSON.parse(previous) as unknown) : [];
          list = Array.isArray(parsed) ? parsed : [];
        } catch {
          list = [];
        }
        localStorage.setItem("lume-messages", JSON.stringify([entry, ...list].slice(0, 20)));
        setSent(true);
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="contact-name">Nome</Label>
        <Input id="contact-name" name="name" required minLength={3} className="h-12 rounded-full px-4" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-email">E-mail</Label>
        <Input id="contact-email" name="email" type="email" required className="h-12 rounded-full px-4" />
      </div>
      <label className="grid gap-2 text-sm">
        Assunto
        <select name="topic" className="h-12 rounded-full border border-white/15 bg-transparent px-4" defaultValue="compra">
          <option value="compra">Compra e reserva</option>
          <option value="modelo">Dúvida sobre um modelo</option>
          <option value="assistencia">Assistência</option>
          <option value="imprensa">Imprensa</option>
        </select>
      </label>
      <div className="grid gap-2">
        <Label htmlFor="contact-message">Mensagem</Label>
        <textarea id="contact-message" name="message" required minLength={12} rows={5} className="rounded-3xl border border-white/15 bg-transparent px-4 py-3 text-sm" />
      </div>
      <Button type="submit" className="h-12 rounded-full">
        Guardar mensagem
      </Button>
      {sent ? (
        <p className="text-sm text-paper">Mensagem guardada neste navegador. Ainda não há caixa de entrada: isto é o formulário de demonstração.</p>
      ) : (
        <p className="text-sm text-muted-foreground">Nada é enviado a um servidor. O texto fica só neste aparelho até existir um canal real.</p>
      )}
    </form>
  );
}
