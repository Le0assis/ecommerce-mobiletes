"use client";

import { DisabledCartNotice, useShop } from "@/components/shop-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { amountForMethod, formatBRL, formatCep, installmentByCount, priceProduct, quoteShipping, type StoreProduct } from "@/lib/catalog";
import { track } from "@/lib/analytics";
import { pesoInvalidoMessage, produtoDesabilitadoMessage } from "@/lib/commerce";
import { placeOrder } from "@/lib/shop-api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Method = "pix" | "boleto" | "cartao";

export function CheckoutForm({ products, catalogMessage }: { products: StoreProduct[]; catalogMessage: string | null }) {
  const shop = useShop();
  const router = useRouter();
  const [cep, setCep] = useState("01310-100");
  const [method, setMethod] = useState<Method>("pix");
  const [installments, setInstallments] = useState(21);
  const [serviceId, setServiceId] = useState("dedicado");
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const blocked = shop.lines.some((line) => !products.some((item) => item.id === line.productId && item.isEnabled !== false));
  const preview = useMemo(() => {
    const lines = shop.lines.filter((line) => products.some((item) => item.id === line.productId && item.isEnabled !== false));
    if (lines.length === 0) return null;
    try {
      const quotes = lines.map((line) => {
        const product = products.find((item) => item.id === line.productId && item.isEnabled !== false);
        if (!product) throw new Error("Um modelo do carrinho saiu do catálogo.");
        const priced = priceProduct(product, { colorId: line.colorId, batteryId: line.batteryId, accessoryIds: line.accessoryIds });
        if ("error" in priced) throw new Error(priced.error);
        return { line, quote: priced.quote };
      });
      const weight = quotes.reduce((sum, item) => sum + (item.quote.weightKg ?? 0) * item.line.qty, 0);
      if (!(weight > 0)) return { error: pesoInvalidoMessage };
      const shipping = quoteShipping(cep, weight);
      return { quotes, shipping };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "CEP inválido.";
      return { error: message === "Peso fora da faixa de transporte." ? pesoInvalidoMessage : message };
    }
  }, [shop.lines, cep, products]);

  const shipping = (preview && "shipping" in preview ? preview.shipping : null) ?? null;
  const service = shipping?.services.find((item) => item.id === serviceId) ?? shipping?.services[0];

  async function onSubmit(formData: FormData) {
    if (shop.lines.some((line) => !products.some((item) => item.id === line.productId && item.isEnabled !== false))) {
      setError(produtoDesabilitadoMessage);
      return;
    }
    setPending(true);
    setError("");
    try {
      const order = await placeOrder({
        lines: shop.lines,
        cep,
        shippingServiceId: service?.id ?? "dedicado",
        method,
        installments: method === "cartao" ? installments : 1,
        couponCode: couponCode.trim() || undefined,
        customer: {
          name: String(formData.get("name")),
          email: String(formData.get("email")),
          phone: String(formData.get("phone")),
        },
      });
      track("checkout", { method, code: order.code });
      shop.rememberOrder(order.code);
      shop.clear();
      router.push(`/pedido/${order.code}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha no checkout.");
      setPending(false);
    }
  }

  if (catalogMessage) {
    return <p className="mt-8 text-sm text-signal">{catalogMessage}</p>;
  }

  if (shop.lines.length === 0) {
    return (
      <div className="mt-8">
        <DisabledCartNotice products={products} active />
        <p className="text-muted-foreground">
          O carrinho está vazio. <Link href="/motos" className="underline">Escolha uma moto</Link>.
        </p>
      </div>
    );
  }

  const pricedLines = preview && "quotes" in preview && preview.quotes ? preview.quotes : [];
  const goodsCents = pricedLines.reduce((sum, item) => sum + amountForMethod(method, item.quote) * item.line.qty, 0);
  const totalCents = goodsCents + (service?.priceCents ?? 0);
  const plan = totalCents > 0 ? installmentByCount(totalCents, method === "cartao" ? installments : 1) : null;

  return (
    <div className="mt-8">
    <DisabledCartNotice products={products} active />
    <form action={onSubmit} className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
      <div className="grid gap-5">
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
        <Label htmlFor="coupon">Cupom</Label>
        <Input id="coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="LUME10 ou OFICINA" className="h-12 rounded-full px-4" />
        <p className="text-xs text-muted-foreground">O cupom sai da moto configurada, antes do Pix. O frete não entra.</p>
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
      <Button type="submit" disabled={pending || !service || blocked} className="h-12 rounded-full">
        {pending ? "Reservando…" : method === "pix" ? "Gerar Pix" : "Confirmar pedido"}
      </Button>
      </div>
      <aside className="rounded-[1.8rem] border border-white/10 bg-[#141418] p-5 lg:sticky lg:top-24">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Resumo</p>
        {pricedLines.length > 0 ? (
          <ul className="mt-4 grid gap-3 text-sm">
            {pricedLines.map((item) => (
              <li key={`${item.line.productId}-${item.line.colorId}`} className="flex justify-between gap-4">
                <span>
                  {item.quote.product.name}
                  <span className="mt-1 block text-muted-foreground">
                    {item.quote.color?.name ?? "Sem cor"} · {item.line.qty}
                  </span>
                </span>
                <span className="nums">{formatBRL(amountForMethod(method, item.quote) * item.line.qty)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <dl className="nums mt-4 grid gap-2 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Frete</dt>
            <dd>{service ? (service.priceCents === 0 ? "Grátis" : formatBRL(service.priceCents)) : "—"}</dd>
          </div>
          <div className="flex justify-between text-lg">
            <dt>Total</dt>
            <dd>{formatBRL(totalCents)}</dd>
          </div>
        </dl>
        {plan && method === "cartao" ? (
          <p className="nums mt-3 text-sm">
            {plan.count}× de {formatBRL(plan.installmentCents)} sem juros, com frete
          </p>
        ) : null}
        {method === "pix" ? <p className="mt-3 text-sm text-pix">O Pix de demonstração nasce com o prefixo LUME-MOCK-PIX.</p> : null}
        <p className="mt-4 text-xs text-muted-foreground">O servidor recalcula este total. O que está aqui é a prévia.</p>
      </aside>
    </form>
    </div>
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
