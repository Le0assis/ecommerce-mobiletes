"use client";

import { ProductGallery } from "@/components/product-gallery";
import { InstallmentTable } from "@/components/installment-table";
import { ProductCard } from "@/components/product-card";
import { ReviewForm, usePendingReviews } from "@/components/review-form";
import { useShop } from "@/components/shop-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  accessoriesFor,
  configurePrice,
  estimateRange,
  formatBRL,
  installmentByCount,
  registrationLabel,
  registrationNote,
  relatedMotorcycles,
  reviewsFor,
  type Accessory,
  type Motorcycle,
  type RideMode,
} from "@/lib/catalog";
import { cn } from "cn";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const BikeViewer = dynamic(() => import("@/components/bike-viewer").then((mod) => mod.BikeViewer), {
  ssr: false,
  loading: () => <p className="grid h-full place-items-center text-sm text-muted-foreground">Abrindo o 360°…</p>,
});

export function Configurator({ product }: { product: Motorcycle }) {
  const router = useRouter();
  const shop = useShop();
  const pendingReviews = usePendingReviews(product.slug);

  useEffect(() => {
    document.documentElement.dataset.configurator = "ready";
    return () => {
      delete document.documentElement.dataset.configurator;
    };
  }, []);

  const options = accessoriesFor(product);
  const firstColor = product.colors.find((color) => color.stock > 0) ?? product.colors[0];
  const [colorId, setColorId] = useState(firstColor?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [spin, setSpin] = useState(false);
  const [mode, setMode] = useState<RideMode>("cidade");
  const [speed, setSpeed] = useState(product.optimalSpeedKmh);
  const [weight, setWeight] = useState(0);
  const quoteResult = useMemo(() => {
    try {
      return { quote: configurePrice({ productId: product.id, colorId, accessoryIds: picked }), error: "" };
    } catch (cause) {
      return { quote: null, error: cause instanceof Error ? cause.message : "Não foi possível calcular." };
    }
  }, [product.id, colorId, picked]);
  const quote = quoteResult.quote;
  const error = quoteResult.error;
  const range = estimateRange({
    baseRangeKm: product.rangeKm,
    speedKmh: speed,
    extraWeightKg: weight,
    mode,
    optimalSpeedKmh: product.optimalSpeedKmh,
  });
  const plan = quote ? installmentByCount(quote.subtotalCents, 21) : null;
  const color = product.colors.find((item) => item.id === colorId);
  const reviews = reviewsFor(product.slug);
  const related = relatedMotorcycles(product);
  const wished = shop.wished(product.slug);

  function toggle(accessory: Accessory) {
    setPicked((current) => (current.includes(accessory.id) ? current.filter((id) => id !== accessory.id) : [...current, accessory.id]));
  }

  function reserve() {
    if (!quote) return;
    shop.addLine({ productId: product.id, colorId, accessoryIds: picked });
    router.push("/checkout");
  }

  return (
    <div className="pb-28 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-28 pb-16 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="relative min-h-[24rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#101013]">
            {spin && color ? (
              <div className="h-[28rem]">
                <BikeViewer color={color.hex} />
              </div>
            ) : (
              <ProductGallery name={product.name} variant={product.category} color={color?.hex ?? "#f4f4f2"} />
            )}
            <Button variant="outline" className="absolute top-4 right-4 rounded-full border-white/20" onClick={() => setSpin((value) => !value)}>
              {spin ? "Ver ilustração" : "Ver em 360°"}
            </Button>
          </div>
          <dl className="nums mt-6 grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Potência</dt>
              <dd>{product.powerKw} kW</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bateria</dt>
              <dd>{product.batteryKwh} kWh</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Carga em casa</dt>
              <dd>{product.chargeHours} h</dd>
            </div>
          </dl>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">{product.description}</p>
          <p className="mt-3 text-xs text-muted-foreground">{product.licenseNote}</p>
          <aside className="mt-4 max-w-xl rounded-2xl border border-white/10 p-4">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Habilitação e emplacamento</p>
            <p className="mt-2 text-paper">{registrationLabel[product.registrationClass]}</p>
            <p className="mt-2 text-sm text-muted-foreground">{registrationNote[product.registrationClass]}</p>
          </aside>
        </div>
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          {product.brand} · {product.tagline}
        </p>
          <h1 className="display mt-3 text-7xl">{product.name.replace("LUME ", "")}</h1>
          <div className="nums mt-6 grid grid-cols-2 gap-4">
            <p>
              <span className="display block text-6xl">{product.topSpeedKmh}</span>
              <span className="text-sm text-muted-foreground">km/h</span>
            </p>
            <p>
              <span className="display block text-6xl">{range.rangeKm}</span>
              <span className="text-sm text-muted-foreground">km nesta condição</span>
            </p>
          </div>
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
          <fieldset className="mt-6">
            <legend className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Acessórios</legend>
            <div className="mt-3 grid gap-2">
              {options.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={picked.includes(item.id)}
                  onClick={() => toggle(item)}
                  className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left text-sm aria-pressed:border-signal"
                >
                  <span>
                    {item.name}
                    <span className="mt-1 block text-muted-foreground">{item.description}</span>
                  </span>
                  <span className="nums shrink-0 pl-4">{formatBRL(item.priceCents)}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-6 rounded-[1.5rem] border border-white/10 p-4">
            <legend className="px-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">Autonomia</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["eco", "cidade", "esporte"] as RideMode[]).map((item) => (
                <Button key={item} type="button" variant={mode === item ? "default" : "outline"} className="rounded-full capitalize" onClick={() => setMode(item)}>
                  {item}
                </Button>
              ))}
            </div>
            <label className="mt-4 block text-sm">
              Velocidade média: <span className="nums">{speed} km/h</span>
              <input className="mt-2 w-full accent-[#ff2d2d]" type="range" min={20} max={product.topSpeedKmh} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
            </label>
            <label className="mt-3 block text-sm">
              Peso extra: <span className="nums">{weight} kg</span>
              <input className="mt-2 w-full accent-[#ff2d2d]" type="range" min={0} max={40} value={weight} onChange={(event) => setWeight(Number(event.target.value))} />
            </label>
            <p className="mt-3 text-sm text-muted-foreground">{range.note}</p>
          </fieldset>
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
                <Button className="h-12 rounded-full px-6" onClick={reserve} data-testid="reserve">
                  Reservar
                </Button>
                <Button variant="outline" className="h-12 rounded-full border-white/20 px-6" onClick={() => shop.toggleWish(product.slug)}>
                  {wished ? "Na lista" : "Lista de desejos"}
                </Button>
                <Link href={`/test-ride?modelo=${product.slug}`} className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-full border-white/20 px-6")}>
                  Test ride
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-signal">{error}</p>
          )}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="display text-5xl md:text-7xl">Ficha.</h2>
        <dl className="mt-8 grid gap-px overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          <Spec label="Torque" value={`${product.torqueNm} Nm`} />
          <Spec label="Peso" value={`${product.weightKg} kg`} />
          <Spec label="Banco" value={`${product.seatHeightMm} mm`} />
          <Spec label="Carga rápida" value={product.fastChargeMin ? `${product.fastChargeMin} min` : "Não nesta versão"} />
        </dl>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 lg:grid-cols-2">
        <div>
          <h2 className="display text-5xl">Quem anda.</h2>
          {reviews.length === 0 && pendingReviews.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Ainda não há relato publicado deste modelo.</p>
          ) : (
            <ul className="mt-6 grid gap-4">
              {reviews.map((review) => (
                <li key={review.id} className="rounded-2xl border border-white/10 p-4">
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

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="display text-5xl md:text-7xl">Perto desta.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {related.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>

      {quote && plan ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0c0c0e]/92 p-3 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <p className="nums text-lg">{formatBRL(quote.subtotalCents)}</p>
              <p className="text-xs text-muted-foreground">21× de {formatBRL(plan.installmentCents)}</p>
            </div>
            <Button className="h-12 rounded-full px-6" onClick={reserve}>
              Reservar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#101013] px-4 py-4">
      <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">{label}</dt>
      <dd className="nums mt-1 text-lg">{value}</dd>
    </div>
  );
}
