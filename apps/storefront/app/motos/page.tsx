import { CategorySearch } from "@/components/category-search";
import { ProductCard } from "@/components/product-card";
import { filterShowroom } from "@lume/domain";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Motos",
  description: "Linha LUME. Filtre por categoria e pela cidade da loja.",
};

export default function MotosPage(props: PageProps<"/motos">) {
  return (
    <Suspense fallback={<p className="px-5 pt-32 text-muted-foreground">Carregando a linha…</p>}>
      <Catalog {...props} />
    </Suspense>
  );
}

async function Catalog({ searchParams }: PageProps<"/motos">) {
  const query = await searchParams;
  const category = typeof query.categoria === "string" ? query.categoria : undefined;
  const city = typeof query.cidade === "string" ? query.cidade : undefined;
  const q = typeof query.q === "string" ? query.q : undefined;
  const result = filterShowroom({ category, city, q });

  return (
    <main id="conteudo" className="mx-auto max-w-6xl px-5 pt-28 pb-16">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Catálogo</p>
      <h1 className="display mt-3 text-6xl md:text-8xl">A linha.</h1>
      <div className="mt-8">
        <CategorySearch category={category} city={city} />
      </div>
      <form action="/motos" className="mt-4">
        <label className="grid gap-2 text-sm text-muted-foreground">
          Busca
          <input
            name="q"
            defaultValue={q}
            placeholder="Nome, scooter, autonomia"
            className="h-12 rounded-full border border-white/15 bg-transparent px-4 text-paper"
          />
        </label>
        <button className="mt-3 rounded-full border border-white/20 px-4 py-2 text-sm" type="submit">
          Buscar texto
        </button>
        {category ? <input type="hidden" name="categoria" value={category} /> : null}
        {city ? <input type="hidden" name="cidade" value={city} /> : null}
      </form>
      {result.products.length === 0 ? (
        <div className="mt-12 rounded-[2rem] border border-white/10 p-8">
          <h2 className="text-2xl font-light">Nenhuma moto nessa combinação.</h2>
          <p className="mt-3 max-w-lg text-muted-foreground">
            {city
              ? "Ainda não temos loja nessa cidade para test ride. A entrega nacional continua por CEP."
              : "Tente outra categoria."}
          </p>
          <Link className="mt-4 inline-block text-sm underline" href="/motos">
            Limpar filtros
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      {city && result.dealers.length > 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Lojas em {city}: {result.dealers.map((dealer) => dealer.name).join(", ")}.
        </p>
      ) : null}
    </main>
  );
}
