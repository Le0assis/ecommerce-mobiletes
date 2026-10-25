import { CategorySearch } from "@/components/category-search";
import { CatalogDown } from "@/components/catalog-state";
import { ProductCard } from "@/components/product-card";
import { catalogHasSample, SampleBanner } from "@/components/sample-banner";
import { CityRulesNotice } from "@/components/self-propelled-seal";
import { filterProducts, isCatalogOrder, loadProducts, productBrands, productCategories, sortProducts } from "@/lib/catalog";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Motos",
  description: "Linha da casa e marcas parceiras. Filtre por marca e categoria.",
};

export default function MotosPage(props: PageProps<"/motos">) {
  return (
    <Suspense fallback={<p className="px-5 pt-32 text-muted-foreground">Carregando a linha…</p>}>
      <Catalog {...props} />
    </Suspense>
  );
}

async function Catalog({ searchParams }: PageProps<"/motos">) {
  const loaded = await loadProducts();
  if (!loaded.ok) return <CatalogDown message={loaded.message} />;
  const query = await searchParams;
  const category = typeof query.categoria === "string" ? query.categoria : undefined;
  const q = typeof query.q === "string" ? query.q : undefined;
  const brand = typeof query.marca === "string" ? query.marca : undefined;
  const semCnh = typeof query.semCnh === "string" ? query.semCnh : undefined;
  const order = typeof query.ordem === "string" && isCatalogOrder(query.ordem) ? query.ordem : "destaque";
  const products = sortProducts(filterProducts(loaded.data, { category, q, brand, semCnh }), order);
  const notice = loaded.data[0]?.autopropelido.notice ?? "";

  return (
    <main id="conteudo" className="mx-auto max-w-6xl px-5 pt-28 pb-16">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Catálogo</p>
      <h1 className="display mt-3 text-6xl md:text-8xl">A grade.</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">LUME e as marcas que a API publica. Nenhuma delas é um fabricante real.</p>
      <SampleBanner show={catalogHasSample(products)} />
      <div className="mt-3">
        <CityRulesNotice text={notice} />
      </div>
      <div className="mt-8">
        <CategorySearch
          category={category}
          q={q}
          order={order}
          brand={brand}
          semCnh={semCnh}
          categories={productCategories(loaded.data)}
          brands={productBrands(loaded.data)}
        />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        {products.length === 0 ? "Nenhum modelo" : products.length === 1 ? "1 modelo" : `${products.length} modelos`}
      </p>
      {products.length === 0 ? (
        <div className="mt-12 rounded-[2rem] border border-white/10 p-8">
          <h2 className="text-2xl font-light">Nenhuma moto nessa combinação.</h2>
          <p className="mt-3 max-w-lg text-muted-foreground">Tente outra categoria ou limpe a busca.</p>
          <Link className="mt-4 inline-block text-sm underline" href="/motos">
            Limpar filtros
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
