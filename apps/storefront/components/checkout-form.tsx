"use client";

import { useShop } from "@/components/shop-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { commerce } from "@/lib/commerce";
import { configurePrice, formatBRL, formatCep, quoteShipping } from "@lume/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Method = "pix" | "boleto" | "cartao";

export function CheckoutForm() {
  const shop = useShop();
  const router = useRouter();
  const [cep, setCep] = useState("01310-100");
  const [method, setMethod] = useState<Method>("pix");
  const [installments, setInstallments] = useState(21);
  const [serviceId, setServiceId] = useState<"retirada" | "dedicado">("dedicado");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const preview = useMemo(() => {
    if (shop.lines.length === 0) return null;
    try {
      const quotes = shop.lines.map((line) => ({
        line,
        quote: configurePrice(line),
      }));
      const weight = quotes.reduce((sum, item) => sum + item.quote.product.weightKg * item.line.qty, 0);
      const shipping = quoteShipping(cep, weight);
      return { quotes, shipping };
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : "CEP inválido." };
    }
  }, [shop.lines, cep]);

  const shipping = (preview && "shipping" in preview ? preview.shipping : null) ?? null;
  const service = shipping?.services.find((item) => item.id === serviceId) ?? shipping?.services[0];

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError("");
    try {
      const body = await commerce<{ order: { code: string } }>("/v1/checkout", {
        method: "POST",
        body: JSON.stringify({
          lines: shop.lines,
          cep,
          shippingServiceId: service?.id ?? "dedicado",
          method,
          installments: method === "cartao" ? installments : 1,
          customer: {
            name: String(formData.get("name")),
            email: String(formData.get("email")),
            phone: String(formData.get("phone")),
          },
        }),
      });
      shop.clear();
      router.push(`/pedido/${body.order.code}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha no checkout.");
      setPending(false);
    }
  }

  if (shop.lines.length === 0) {
    return (
      <p className="mt-8 text-muted-foreground">
        O carrinho está vazio. <Link href="/motos" className="underline">Escolha uma moto</Link>.
      </p>
    );
  }

  return (
    <form action={onSubmit} className="mt-8 grid gap-5">
      <div className="grid gap-3 rounded-[1.5rem] border border-white/10 p-4">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Como pagar</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <PayOption current={method} value="pix" onPick={setMethod} title="Pix" detail="−5% agora" highlight />
          <PayOption current={method} value="boleto" onPick={setMethod} title="Boleto" detail="−3% · 3 dias" />
          <PayOption current={method} value="cartao" onPick={setMethod} title="Cartão" detail="até 21× sem juros" />
        </div>
        {method === "cartao" ? (
          <label className="text-sm">
            Parcelas
            <select className="mt-2 h-12 w-full rounded-full border border-white/15 bg-transparent px-4" value={installments} onChange={(event) => setInstallments(Number(event.target.value))}>
              {Array.from({ length: 21 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count}× sem juros
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cep">CEP de entrega</Label>
        <Input id="cep" value={cep} onChange={(event) => setCep(event.target.value)} className="h-12 rounded-full px-4" inputMode="numeric" />
        {preview && "error" in preview ? <p className="text-sm text-signal">{preview.error}</p> : null}
        {shipping ? (
          <fieldset className="mt-2 grid gap-2">
            <legend className="text-sm text-muted-foreground">{shipping.region} · {formatCep(shipping.cep)}</legend>
            {shipping.services.map((item) => (
              <label key={item.id} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-sm">
                <span>
                  <input type="radio" name="ship" checked={service?.id === item.id} onChange={() => setServiceId(item.id)} /> {item.label}
                </span>
                <span className="nums">{item.priceCents === 0 ? "Grátis" : formatBRL(item.priceCents)} · {item.days} dias</span>
              </label>
            ))}
          </fieldset>
        ) : null}
      </div>
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
        <Input id="phone" name="phone" required minLength={10} className="h-12 rounded-full px-4" />
      </div>
      {error ? <p className="text-sm text-signal">{error}</p> : null}
      <Button type="submit" disabled={pending || !service} className="h-12 rounded-full">
        {pending ? "Reservando…" : method === "pix" ? "Gerar Pix" : "Confirmar pedido"}
      </Button>
    </form>
  );
}

function PayOption({
  current,
  value,
  onPick,
  title,
  detail,
  highlight = false,
}: {
  current: Method;
  value: Method;
  onPick: (value: Method) => void;
  title: string;
  detail: string;
  highlight?: boolean;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onPick(value)}
      className={`rounded-2xl border px-3 py-3 text-left ${active ? "border-signal" : "border-white/10"} ${highlight ? "bg-[#07332e]" : ""}`}
    >
      <span className="block text-sm">{title}</span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </button>
  );
}
