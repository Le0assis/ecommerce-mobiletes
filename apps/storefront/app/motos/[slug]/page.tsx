import { CatalogDown } from "@/components/catalog-state";
import { Configurator } from "@/components/configurator";
import { formatBRL, loadProduct, loadProducts, relatedProducts } from "@/lib/catalog";
import { jsonLdScript } from "@/lib/json-ld";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateStaticParams() {
  return [{ slug: "apex" }];
}

export async function generateMetadata({ params }: PageProps<"/motos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadProduct(slug);
  if (!loaded.ok) return { title: "Modelo" };
  const product = loaded.data.product;
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
  const loaded = await loadProduct(slug);
  if (!loaded.ok) {
    if (loaded.notFound) notFound();
    return <CatalogDown message={loaded.message} />;
  }
  const { product, reviews } = loaded.data;
  const list = await loadProducts();
  const related = list.ok ? relatedProducts(list.data, product) : [];
  const offer = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: product.brand,
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: (product.basePriceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <main id="conteudo">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(offer) }} />
      <Configurator product={product} related={related} reviews={reviews} />
    </main>
  );
}
