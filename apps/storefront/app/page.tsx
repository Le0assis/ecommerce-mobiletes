import { CategorySearch } from "@/components/category-search";
import { Hero } from "@/components/hero";
import { HomeCarousel } from "@/components/home-carousel";
import { loadHomeSlides } from "@/lib/home-slides";
import { catalogHasSample, SampleBanner } from "@/components/sample-banner";
import { CityRulesNotice } from "@/components/self-propelled-seal";
import { ProductCard } from "@/components/product-card";
import { TrustRow } from "@/components/trust-row";
import { buttonVariants } from "@/components/ui/button";
import { AUTOPROPELIDO_NOTICE, configurePrice, formatBRL, getMotorcycle, installmentByCount, motorcycles, reviews } from "@/lib/catalog";
import { cn } from "cn";
import Link from "next/link";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="px-5 pt-32 text-muted-foreground">Abrindo a vitrine…</p>}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const apex = getMotorcycle("apex");
  if (!apex) return null;
  const slides = await loadHomeSlides();
  const quote = configurePrice({ productId: apex.id, colorId: "obsidiana" });
  const compared = ["s", "via", "apex"].map((slug) => getMotorcycle(slug)).filter((item) => item !== undefined);

  return (
    <>
      <SampleBanner show={catalogHasSample()} clearNav />
      <HomeCarousel slides={slides} />
      <Hero
        anchor={false}
        name={apex.name}
        speed={apex.topSpeedKmh}
        range={apex.rangeKm}
        priceCents={quote.subtotalCents}
        pixCents={quote.pixCents}
      />
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-5">
        <CategorySearch />
        <div className="mt-4 px-2">
          <CityRulesNotice text={AUTOPROPELIDO_NOTICE} />
        </div>
      </div>
      <TrustRow />
      <section className="relative mt-16 overflow-hidden border-y border-white/10 bg-[#08080a]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1c1c22_0%,_#08080a_68%)]" />
        <div className="relative mx-auto grid min-h-[78vh] max-w-6xl content-end px-5 py-16">
          <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">Capítulo</p>
          <h2 className="display mt-4 max-w-4xl text-6xl text-paper md:text-8xl">
            A cidade
            <br />
            em silêncio.
          </h2>
          <dl className="nums mt-10 grid max-w-xl grid-cols-2 gap-6 text-paper">
            <div>
              <dt className="text-sm text-muted-foreground">Apex</dt>
              <dd className="display text-6xl">{apex.topSpeedKmh}</dd>
              <dd className="text-sm text-muted-foreground">km/h</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Autonomia de referência</dt>
              <dd className="display text-6xl">{apex.rangeKm}</dd>
              <dd className="text-sm text-muted-foreground">km</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex items-end justify-between gap-6">
          <h2 className="display text-6xl md:text-8xl">
            Prontas
            <br />
            para sair.
          </h2>
          <Link href="/motos" className="text-sm underline-offset-4 hover:underline">
            Ver a linha
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {motorcycles.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      <section className="border-y border-white/10 bg-[#101013] px-5 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <h2 className="display text-5xl md:text-7xl">A energia mora na tomada.</h2>
          <div className="grid gap-6 text-sm text-muted-foreground">
            <p>
              A moto carrega em casa durante a noite e, quando o modelo oferece, numa recarga rápida no caminho. Dúvida sobre o modelo, no WhatsApp.
            </p>
            <ul className="grid gap-3 text-paper">
              <li>0–100% na garagem, no tempo de cada modelo.</li>
              <li>Recarga rápida onde o modelo oferece.</li>
              <li>Conversa no WhatsApp, enquanto não há loja física.</li>
            </ul>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="display text-6xl md:text-8xl">Três motos, uma tabela.</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-3 font-normal"> </th>
                {compared.map((product) => (
                  <th key={product.id} className="py-3 font-normal text-paper">
                    {product.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="nums">
              <tr className="border-t border-white/10">
                <th className="py-4 font-normal text-muted-foreground">Preço</th>
                {compared.map((product) => (
                  <td key={product.id}>{formatBRL(product.basePriceCents)}</td>
                ))}
              </tr>
              <tr className="border-t border-white/10">
                <th className="py-4 font-normal text-muted-foreground">21× sem juros</th>
                {compared.map((product) => (
                  <td key={product.id}>{formatBRL(installmentByCount(product.basePriceCents, 21).installmentCents)}</td>
                ))}
              </tr>
              <tr className="border-t border-white/10">
                <th className="py-4 font-normal text-muted-foreground">Autonomia</th>
                {compared.map((product) => (
                  <td key={product.id}>{product.rangeKm} km</td>
                ))}
              </tr>
              <tr className="border-t border-white/10">
                <th className="py-4 font-normal text-muted-foreground">Máxima</th>
                {compared.map((product) => (
                  <td key={product.id}>{product.topSpeedKmh} km/h</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <Link href="/comparar" className={cn(buttonVariants({ variant: "outline" }), "mt-6 h-11 rounded-full border-white/20 px-5")}>
          Abrir o comparador
        </Link>
      </section>
      <section className="px-5 pb-20">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#141418] md:grid-cols-2">
          <div className="p-8 md:p-12">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Bike Quiz</p>
            <h2 className="display mt-4 text-6xl md:text-7xl">Me ajude a escolher.</h2>
            <p className="mt-4 max-w-md text-muted-foreground">Oito perguntas: uso, distância, ladeira, carga, orçamento, estilo e cor.</p>
            <Link href="/me-ajude-a-escolher" className={cn(buttonVariants({ size: "lg" }), "mt-8 h-12 rounded-full px-6")}>
              Começar o quiz
            </Link>
          </div>
          <div className="border-t border-white/10 p-8 md:border-t-0 md:border-l md:p-12">
            <h3 className="text-lg">Quem já anda</h3>
            <ul className="mt-6 grid gap-6">
              {reviews.slice(0, 2).map((review) => (
                <li key={review.id}>
                  <p className="text-paper">{review.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
                  <p className="mt-2 text-xs tracking-[0.14em] text-muted-foreground uppercase">
                    {review.city} · {review.rating}/5
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
