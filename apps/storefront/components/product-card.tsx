import { BikeSvg } from "@/components/bike-svg";
import { WishToggle } from "@/components/wish-toggle";
import { buttonVariants } from "@/components/ui/button";
import { categoryLabel, configurePrice, formatBRL, installmentByCount, type Motorcycle } from "@/lib/catalog";
import { cn } from "cn";
import Link from "next/link";

export function ProductCard({ product }: { product: Motorcycle }) {
  const color = product.colors.find((item) => item.stock > 0) ?? product.colors[0];
  if (!color) return null;
  const quote = configurePrice({ productId: product.id, colorId: color.id });
  const plan = installmentByCount(quote.subtotalCents, 21);

  return (
    <article className="flex flex-col rounded-[2rem] border border-white/10 bg-[#121216] p-4">
      <div className="flex items-center justify-between gap-3 text-xs tracking-[0.16em] text-muted-foreground uppercase">
        <span>
          {product.brand} · {categoryLabel[product.category]}
        </span>
        <WishToggle slug={product.slug} />
      </div>
      <Link href={`/motos/${product.slug}`} className="mt-3 block">
        <BikeSvg variant={product.category} color={color.hex} title={product.name} className="h-48 w-full" />
        <h3 className="display mt-2 text-5xl">{product.name.replace("LUME ", "")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{product.tagline}</p>
      </Link>
      <dl className="nums mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Velocidade</dt>
          <dd>{product.topSpeedKmh} km/h</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Autonomia</dt>
          <dd>{product.rangeKm} km</dd>
        </div>
      </dl>
      <p className="nums mt-5 text-2xl font-light">{formatBRL(quote.subtotalCents)}</p>
      <p className="nums text-sm text-paper">21× de {formatBRL(plan.installmentCents)} sem juros</p>
      <p className="mt-1 flex items-center gap-2 text-sm">
        <span className="rounded-full bg-pix px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-[#04221e]">PIX</span>
        <span className="nums">{formatBRL(quote.pixCents)}</span>
      </p>
      <Link href={`/motos/${product.slug}`} className={cn(buttonVariants(), "mt-5 h-11 rounded-full")}>
        Configurar
      </Link>
    </article>
  );
}
