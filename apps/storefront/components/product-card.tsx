import { BikeSvg } from "@/components/bike-svg";
import { CatalogPhoto } from "@/components/catalog-photo";
import { productIsSample } from "@/components/sample-banner";
import { SelfPropelledSeal } from "@/components/self-propelled-seal";
import { WishToggle } from "@/components/wish-toggle";
import { buttonVariants } from "@/components/ui/button";
import { categoryName, coverImage, formatBRL, illustrationCategory, installmentByCount, measure, priceProduct, type StoreProduct } from "@/lib/catalog";
import { cn } from "cn";
import Link from "next/link";

export function ProductCard({ product }: { product: StoreProduct }) {
  const color = product.colors.find((item) => item.stock > 0) ?? product.colors[0];
  const priced = priceProduct(product, { colorId: color?.id });
  const quote = "quote" in priced ? priced.quote : null;
  const plan = quote ? installmentByCount(quote.subtotalCents, 21) : null;
  const cover = coverImage(product);

  return (
    <article className="flex flex-col rounded-[2rem] border border-white/10 bg-[#121216] p-4">
      <div className="flex items-center justify-between gap-3 text-xs tracking-[0.16em] text-muted-foreground uppercase">
        <span>
          {product.brand} · {categoryName(product.category)}
        </span>
        <WishToggle slug={product.slug} />
      </div>
      <Link href={`/motos/${product.slug}`} className="mt-3 block">
        {cover ? (
          <span className="relative block h-48 w-full">
            <CatalogPhoto src={cover.url} alt={cover.alt || product.name} className="object-contain" sizes="(min-width: 1024px) 33vw, 100vw" />
          </span>
        ) : (
          <BikeSvg variant={illustrationCategory(product.category)} color={color?.hex ?? "#f4f4f2"} title={product.name} className="h-48 w-full" />
        )}
        <h3 className="display mt-2 text-5xl">{product.name.replace("LUME ", "")}</h3>
        <SelfPropelledSeal badge={product.autopropelido} />
        {productIsSample(product) ? <p className="mt-2 text-xs text-muted-foreground">Dado de exemplo</p> : null}
        <p className="mt-2 text-sm text-muted-foreground">{product.tagline}</p>
      </Link>
      <dl className="nums mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Velocidade</dt>
          <dd>{measure(product.topSpeedKmh, "km/h")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground" aria-label="Autonomia declarada pelo fabricante" title="Autonomia declarada pelo fabricante">
            Autonomia (declarada)
          </dt>
          <dd>{measure(product.rangeKm, "km")}</dd>
        </div>
      </dl>
      {quote && plan ? (
        <>
          <p className="nums mt-5 text-2xl font-light">{formatBRL(quote.subtotalCents)}</p>
          <p className="nums text-sm text-paper">21× de {formatBRL(plan.installmentCents)} sem juros</p>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <span className="rounded-full bg-pix px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-[#04221e]">PIX</span>
            <span className="nums">{formatBRL(quote.pixCents)}</span>
          </p>
        </>
      ) : (
        <p className="mt-5 text-sm text-signal">{"error" in priced ? priced.error : "Preço indisponível."}</p>
      )}
      <Link href={`/motos/${product.slug}`} className={cn(buttonVariants(), "mt-5 h-11 rounded-full")}>
        Configurar
      </Link>
    </article>
  );
}
