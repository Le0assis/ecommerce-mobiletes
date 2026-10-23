"use client";

import { useShop } from "@/components/shop-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { formatBRL, installmentByCount, priceProduct, type StoreProduct } from "@/lib/catalog";
import Link from "next/link";

export function CartView({ products, catalogMessage }: { products: StoreProduct[]; catalogMessage: string | null }) {
  const shop = useShop();
  const named = (slug: string) => products.find((item) => item.slug === slug)?.name ?? slug;

  if (catalogMessage) {
    return <p className="mt-8 text-sm text-signal">{catalogMessage}</p>;
  }

  const rows = shop.lines.map((line) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product) return { line, error: "Este modelo saiu do catálogo." };
    const priced = priceProduct(product, { colorId: line.colorId, batteryId: line.batteryId, accessoryIds: line.accessoryIds });
    if ("error" in priced) return { line, error: priced.error };
    return { line, quote: priced.quote };
  });
  const blocked = rows.some((row) => "error" in row);
  const total = rows.reduce((sum, row) => sum + ("quote" in row && row.quote ? row.quote.subtotalCents * row.line.qty : 0), 0);

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
                <Link href={`/motos/${slug}`}>{named(slug)}</Link>
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
          {"error" in row ? (
            <p className="text-sm text-signal">{row.error}</p>
          ) : (
            <>
              <h2 className="text-2xl font-light">{row.quote.product.name}</h2>
              <p className="text-sm text-muted-foreground">
                {row.quote.color?.name ?? "Sem cor"}
                {row.quote.battery ? ` · ${row.quote.battery.name}` : ""}
                {row.quote.accessories.length ? ` · ${row.quote.accessories.map((item) => item.name).join(", ")}` : ""}
              </p>
              <p className="nums mt-2">{formatBRL(row.quote.subtotalCents)}</p>
            </>
          )}
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
      {total > 0 ? <p className="nums text-sm">21× de {formatBRL(installmentByCount(total, 21).installmentCents)} sem juros, antes do frete</p> : null}
      <p className="text-sm text-muted-foreground">O Pix e o frete entram no checkout. O servidor recalcula o total.</p>
      {blocked ? (
        <p className="text-sm text-signal">Tire do carrinho o modelo que a API não precifica antes de seguir.</p>
      ) : (
        <Link href="/checkout" className={cn(buttonVariants(), "h-12 rounded-full")}>
          Ir para o pagamento
        </Link>
      )}
    </div>
  );
}
