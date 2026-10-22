"use client";

import { useShop } from "@/components/shop-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { configurePrice, formatBRL, getMotorcycle } from "@lume/domain";
import Link from "next/link";

export function CartView() {
  const shop = useShop();
  const rows = shop.lines.map((line) => {
    const quote = configurePrice({ productId: line.productId, colorId: line.colorId, accessoryIds: line.accessoryIds });
    return { line, quote };
  });
  const total = rows.reduce((sum, row) => sum + row.quote.subtotalCents * row.line.qty, 0);

  if (rows.length === 0) {
    return (
      <div className="mt-8">
        <p className="text-muted-foreground">Nenhuma moto reservada neste navegador.</p>
        <Link href="/motos" className="mt-4 inline-block underline">
          Ver a linha
        </Link>
        {shop.wishlist.length > 0 ? (
          <ul className="mt-8 grid gap-2 text-sm">
            {shop.wishlist.map((slug) => (
              <li key={slug}>
                <Link href={`/motos/${slug}`}>{getMotorcycle(slug)?.name ?? slug}</Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4">
      {rows.map((row, index) => (
        <article key={`${row.line.productId}-${index}`} className="rounded-[1.5rem] border border-white/10 p-4">
          <h2 className="text-2xl font-light">{row.quote.product.name}</h2>
          <p className="text-sm text-muted-foreground">
            {row.quote.color.name}
            {row.quote.accessories.length ? ` · ${row.quote.accessories.map((item) => item.name).join(", ")}` : ""}
          </p>
          <p className="nums mt-2">{formatBRL(row.quote.subtotalCents)}</p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => shop.setQty(index, row.line.qty - 1)}>
              −
            </Button>
            <span className="nums grid place-items-center px-2">{row.line.qty}</span>
            <Button variant="outline" className="rounded-full" onClick={() => shop.setQty(index, row.line.qty + 1)}>
              +
            </Button>
          </div>
        </article>
      ))}
      <p className="nums text-3xl font-light">{formatBRL(total)}</p>
      <p className="text-sm text-muted-foreground">O Pix e o frete entram no checkout. O servidor recalcula o total.</p>
      <Link href="/checkout" className={cn(buttonVariants(), "h-12 rounded-full")}>
        Ir para o pagamento
      </Link>
    </div>
  );
}
