import { Configurator } from "@/components/configurator";
import { formatBRL, getMotorcycle, motorcycles } from "@lume/domain";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateStaticParams() {
  return motorcycles.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps<"/motos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getMotorcycle(slug);
  if (!product) return { title: "Modelo" };
  return {
    title: product.name,
    description: `${product.tagline} ${formatBRL(product.basePriceCents)} ou 21x sem juros. Pix com 5%.`,
  };
}

export default function MotoPage(props: PageProps<"/motos/[slug]">) {
  return (
    <Suspense fallback={<p className="px-5 pt-32 text-muted-foreground">Abrindo o modelo…</p>}>
      <MotoBody {...props} />
    </Suspense>
  );
}

async function MotoBody({ params }: PageProps<"/motos/[slug]">) {
  const { slug } = await params;
  const product = getMotorcycle(slug);
  if (!product) notFound();
  const offer = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: "LUME",
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: (product.basePriceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <main id="conteudo">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offer) }} />
      <Configurator product={product} />
    </main>
  );
}
