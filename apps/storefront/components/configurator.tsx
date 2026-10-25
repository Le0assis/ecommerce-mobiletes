"use client";

import { CatalogPhoto } from "@/components/catalog-photo";
import { ProductGallery } from "@/components/product-gallery";
import { SavingsCalculator } from "@/components/savings-calculator";
import { InstallmentTable } from "@/components/installment-table";
import { ProductCard } from "@/components/product-card";
import { ReviewForm, usePendingReviews } from "@/components/review-form";
import { useShop } from "@/components/shop-provider";
import { track } from "@/lib/analytics";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  formatBRL,
  illustrationCategory,
  installmentByCount,
  measure,
  priceProduct,
  registrationCopy,
  type StoreProduct,
  type StoreReview,
} from "@/lib/catalog";
import { productIsSample, SampleBanner } from "@/components/sample-banner";
import { SelfPropelledSeal } from "@/components/self-propelled-seal";
import { whatsappHref } from "@/lib/whatsapp";
import { cn } from "cn";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const BikeViewer = dynamic(() => import("@/components/bike-viewer").then((mod) => mod.BikeViewer), {
  ssr: false,
  loading: () => <p className="grid h-full place-items-center text-sm text-muted-foreground">Abrindo o 360°…</p>,
});

export function Configurator({
  product,
  related,
  reviews,
}: {
  product: StoreProduct;
  related: StoreProduct[];
  reviews: StoreReview[];
}) {
  const router = useRouter();
  const shop = useShop();
  const pendingReviews = usePendingReviews(product.slug);
  const packs = product.batteries;

  useEffect(() => {
    document.documentElement.dataset.configurator = "ready";
    return () => {
      delete document.documentElement.dataset.configurator;
    };
  }, []);

  const firstColor = product.colors.find((color) => color.stock > 0) ?? product.colors[0];
  const [colorId, setColorId] = useState(firstColor?.id ?? "");
  const [batteryId, setBatteryId] = useState(packs[0]?.id ?? "");
  const [spin, setSpin] = useState(false);
  const quoteResult = useMemo(() => {
    const priced = priceProduct(product, {
      colorId: colorId || undefined,
      batteryId: batteryId || undefined,
      accessoryIds: [],
    });
    if ("error" in priced) return { quote: null, error: priced.error };
    return { quote: priced.quote, error: "" };
  }, [product, colorId, batteryId]);
  const quote = quoteResult.quote;
  const error = quoteResult.error;
  const plan = quote ? installmentByCount(quote.subtotalCents, 21) : null;
  const color = product.colors.find((item) => item.id === colorId);
  const wished = shop.wished(product.slug);
  const registration = registrationCopy(product.registrationClass);

  function reserve() {
    if (!quote || !colorId) return;
    track("reservar", { product: product.slug, color: colorId });
    shop.addLine({
      productId: product.id,
      colorId,
      accessoryIds: [],
      batteryId: quote.battery?.id,
    });
    router.push("/checkout");
  }

  return (
    <div className="pb-28 md:pb-0">
      <SampleBanner show={productIsSample(product)} clearNav />
      <div className={`mx-auto grid max-w-6xl gap-10 px-5 pb-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-start ${productIsSample(product) ? "pt-8" : "pt-28"}`}>
        <div className="contents lg:block lg:space-y-6">
          <div className="relative order-1 min-h-[24rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#101013]">
            {spin && color ? (
              <div className="h-[28rem]">
                <BikeViewer color={color.hex} />
              </div>
            ) : (
              <ProductGallery
                name={product.name}
                variant={illustrationCategory(product.category)}
                color={color?.hex ?? "#f4f4f2"}
                images={product.images}
              />
            )}
            <Button variant="outline" className="absolute top-4 right-4 rounded-full border-white/20" onClick={() => setSpin((value) => !value)}>
              {spin ? "Ver ilustração" : "Ver em 360°"}
            </Button>
          </div>
          <div className="order-3 lg:order-none lg:mt-6">
            <SpecTable product={product} />
            <p className="mt-4 max-w-xl text-sm text-muted-foreground">{product.description}</p>
            {product.licenseNote ? <p className="mt-3 text-xs text-muted-foreground">{product.licenseNote}</p> : null}
            <aside className="mt-4 max-w-xl rounded-2xl border border-white/10 p-4">
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Habilitação e emplacamento</p>
              <p className="mt-2 text-paper">{registration.label}</p>
              {registration.note ? <p className="mt-2 text-sm text-muted-foreground">{registration.note}</p> : null}
            </aside>
            <DamageList product={product} />
          </div>
        </div>
        <div className="order-2 lg:order-none">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            {product.brand} · {product.tagline}
          </p>
          <h1 className="display mt-3 text-7xl">{product.name.replace("LUME ", "")}</h1>
          <SelfPropelledSeal badge={product.autopropelido} notice />
          <p className="nums mt-6">
            <span className="display block text-6xl">{product.topSpeedKmh ?? "—"}</span>
            <span className="text-sm text-muted-foreground">km/h de velocidade máxima</span>
          </p>
          {product.colors.length > 0 ? (
            <fieldset className="mt-8">
              <legend className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Cor</legend>
              <div className="mt-3 flex flex-wrap gap-3">
                {product.colors.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.stock <= 0}
                    aria-pressed={item.id === colorId}
                    data-testid={`color-${item.id}`}
                    onClick={() => setColorId(item.id)}
                    className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-sm aria-pressed:border-signal disabled:opacity-40"
                  >
                    <span className="size-4 rounded-full border border-white/30" style={{ background: item.hex }} />
                    {item.name}
                    {item.priceDeltaCents > 0 ? <span className="nums text-muted-foreground">+{formatBRL(item.priceDeltaCents)}</span> : null}
                    {item.stock <= 0 ? <span>esgotada</span> : null}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className="mt-8 text-sm text-muted-foreground">Este modelo ainda não tem cor cadastrada. O preço é o de tabela.</p>
          )}
          {packs.length > 1 ? (
            <fieldset className="mt-6">
              <legend className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Bateria</legend>
              <div className="mt-3 grid gap-2">
                {packs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.stock <= 0}
                    aria-pressed={item.id === batteryId}
                    onClick={() => setBatteryId(item.id)}
                    className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left text-sm aria-pressed:border-signal disabled:opacity-40"
                  >
                    <span>
                      {item.name}
                      <span className="mt-1 block text-muted-foreground">até {item.rangeKm} km de referência</span>
                    </span>
                    <span className="nums shrink-0 pl-4">{item.priceDeltaCents > 0 ? `+${formatBRL(item.priceDeltaCents)}` : "Série"}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : packs.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Sem pacote de bateria nesta ficha. A reserva segue com a de série, delta zero.</p>
          ) : null}
          <SavingsCalculator batteryKwh={quote?.battery?.kwh ?? product.batteryKwh} rangeKm={quote?.battery?.rangeKm ?? product.rangeKm} />
          {quote && plan ? (
            <div className="mt-6 rounded-[1.8rem] border border-white/10 bg-[#141418] p-5">
              <p className="nums text-4xl font-light" data-testid="live-price">
                {formatBRL(quote.subtotalCents)}
              </p>
              <p className="nums mt-1 text-lg">21× de {formatBRL(plan.installmentCents)} sem juros</p>
              <p className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-pix px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-[#04221e]">PIX</span>
                <span className="nums">{formatBRL(quote.pixCents)}</span>
              </p>
              <p className="nums mt-1 text-sm text-muted-foreground">Boleto {formatBRL(quote.boletoCents)}</p>
              <ul className="nums mt-4 grid gap-1 text-sm text-muted-foreground">
                {quote.lines.map((line) => (
                  <li key={line.label} className="flex justify-between gap-4">
                    <span>{line.label}</span>
                    <span>{formatBRL(line.cents)}</span>
                  </li>
                ))}
              </ul>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-paper">Ver 1×, 6×, 12× e 21×</summary>
                <div className="mt-3">
                  <InstallmentTable amountCents={quote.subtotalCents} compact />
                </div>
              </details>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button className="h-12 rounded-full px-6" onClick={reserve} data-testid="reserve" disabled={!colorId}>
                  Reservar
                </Button>
                <Button variant="outline" className="h-12 rounded-full border-white/20 px-6" onClick={() => shop.toggleWish(product.slug)}>
                  {wished ? "Na lista" : "Lista de desejos"}
                </Button>
                <a
                  href={whatsappHref(`Olá, quero falar sobre a ${product.name}.`)}
                  className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-full border-white/20 px-6")}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-signal">{error}</p>
          )}
        </div>
      </div>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 lg:grid-cols-2">
        <div>
          <h2 className="display text-5xl">Quem anda.</h2>
          {reviews.length === 0 && pendingReviews.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Ainda não há relato publicado deste modelo.</p>
          ) : (
            <ul className="mt-6 grid gap-4">
              {reviews.map((review) => (
                <li key={review.id} className="rounded-2xl border border-white/10 p-4">
                  {review.photo ? (
                    <Image src={review.photo} alt="" width={800} height={280} className="mb-3 h-28 w-full rounded-xl object-cover" />
                  ) : null}
                  <p className="text-paper">{review.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
                  <p className="mt-2 text-xs tracking-[0.14em] text-muted-foreground uppercase">
                    {review.city} · {review.rating}/5 · {review.monthsUsing} meses
                  </p>
                </li>
              ))}
              {pendingReviews.map((review) => (
                <li key={review.id} className="rounded-2xl border border-dashed border-white/15 p-4">
                  <p className="text-paper">{review.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
                  <p className="mt-2 text-xs tracking-[0.14em] text-muted-foreground uppercase">{review.city} · pendente · só neste navegador</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ReviewForm productId={product.slug} />
      </section>

      {related.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <h2 className="display text-5xl md:text-7xl">Perto desta.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      {quote && plan ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0c0c0e]/92 p-3 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <p className="nums text-lg">{formatBRL(quote.subtotalCents)}</p>
              <p className="text-xs text-muted-foreground">21× de {formatBRL(plan.installmentCents)}</p>
            </div>
            <Button className="h-12 rounded-full px-6" onClick={reserve} disabled={!colorId}>
              Reservar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function batteryLine(product: StoreProduct) {
  const parts: string[] = [];
  if (typeof product.batteryKwh === "number") parts.push(`${product.batteryKwh.toLocaleString("pt-BR")} kWh`);
  if (typeof product.specs.batteryV === "number") parts.push(`${product.specs.batteryV} V`);
  if (typeof product.specs.batteryAh === "number") parts.push(`${product.specs.batteryAh} Ah`);
  if (product.specs.batteryChem) parts.push(product.specs.batteryChem);
  if (product.specs.batteryRemovable === true) parts.push("removível");
  if (product.specs.batteryRemovable === false) parts.push("fixa");
  if (parts.length === 0) return "não informado";
  const missingElectrical = product.specs.batteryV == null && product.specs.batteryAh == null && product.specs.batteryRemovable == null;
  if (typeof product.batteryKwh === "number" && missingElectrical) {
    return `${parts.join(" · ")}. Tensão, Ah e se é removível: não informado`;
  }
  return parts.join(" · ");
}

function SpecTable({ product }: { product: StoreProduct }) {
  const rows: [string, string][] = [
    ["Potência nominal", measure(product.powerNominalW ?? product.specs.powerNominalW, "W")],
    ["Velocidade máx.", measure(product.topSpeedKmh, "km/h")],
    ["Bateria", batteryLine(product)],
    ["Largura", measure(product.widthCm ?? product.specs.widthCm, "cm")],
    ["Entre-eixos", measure(product.wheelbaseCm ?? product.specs.wheelbaseCm, "cm")],
    ["Peso", measure(product.weightKg, "kg")],
    ["Altura do banco", measure(product.seatHeightMm, "mm")],
    ["Tempo de carga", measure(product.chargeHours, "h")],
    ["Autonomia declarada", measure(product.rangeKm ?? product.specs.rangeKmDeclared, "km")],
  ];

  return (
    <div className="mt-6 lg:mt-0">
      <h2 className="text-sm text-paper">Ficha</h2>
      <table className="mt-3 w-full border-collapse text-left text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b border-white/10">
            <th className="py-2 pr-4 font-normal">Item</th>
            <th className="py-2 font-normal">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([item, value]) => (
            <tr key={item} className="border-b border-white/10">
              <th className="py-3 pr-4 font-normal text-muted-foreground">{item}</th>
              <td className="nums py-3 text-paper">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">
        A autonomia é o número publicado do modelo, só como dado. A potência nominal só entra quando o fabricante informa o valor em watts. A potência de pico não ocupa essa linha.
      </p>
    </div>
  );
}

function DamageList({ product }: { product: StoreProduct }) {
  if (product.damages.length === 0) return null;
  return (
    <section className="mt-6 max-w-xl">
      <h2 className="text-sm text-paper">Avarias à venda</h2>
      <ul className="mt-3 grid gap-3">
        {product.damages.map((damage) => (
          <li key={damage.id} className="rounded-2xl border border-white/10 p-4">
            <p className="text-paper">{damage.description}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {damage.severity} · desconto {formatBRL(damage.discountCents)}
            </p>
            {damage.images.length > 0 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {damage.images.map((image) => (
                  <span key={image.id} className="relative block h-20 w-28 shrink-0">
                    <CatalogPhoto
                      src={image.url}
                      alt={`${product.name}, foto da avaria: ${damage.description}`}
                      className="rounded-xl object-cover"
                      sizes="112px"
                    />
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
