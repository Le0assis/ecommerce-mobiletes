import { DealerStories } from "@/components/dealer-stories";
import { LocatorMap } from "@/components/locator-map";
import { dealers, filterShowroom } from "@/lib/catalog";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Lojas",
  description: "Onde ver a LUME de perto e agendar um test ride.",
};

export default function LojasPage(props: PageProps<"/lojas">) {
  return (
    <Suspense fallback={<p className="px-5 pt-32">Carregando lojas…</p>}>
      <Lojas {...props} />
    </Suspense>
  );
}

async function Lojas({ searchParams }: PageProps<"/lojas">) {
  const query = await searchParams;
  const city = typeof query.cidade === "string" ? query.cidade : "";
  const result = filterShowroom({ city });
  const list = city ? result.dealers : dealers;

  return (
    <main id="conteudo" className="mx-auto max-w-6xl px-5 pt-28 pb-16">
      <h1 className="display text-6xl md:text-8xl">Lojas.</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">Cinco endereços de demonstração. O contrato comercial substitui o ponto no mapa.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <LocatorMap active={list} />
        <DealerStories />
      </div>
      <form action="/lojas" className="mt-8 flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="sr-only">Cidade</span>
          <input name="cidade" defaultValue={city} placeholder="Cidade" className="h-12 rounded-full border border-white/15 bg-transparent px-4" />
        </label>
        <button className="h-12 rounded-full border border-white/20 px-5 text-sm" type="submit">
          Filtrar
        </button>
      </form>
      {list.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Sem loja nessa cidade. O frete por CEP segue disponível no checkout.</p>
      ) : (
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {list.map((dealer) => (
            <li key={dealer.id} className="rounded-[1.8rem] border border-white/10 p-5">
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{dealer.uf}</p>
              <h2 className="mt-2 text-3xl font-light">{dealer.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {dealer.neighborhood} · {dealer.city} · CEP {dealer.cep}
              </p>
              <p className="mt-2 text-sm">{dealer.hours}</p>
              <p className="text-sm text-muted-foreground">{dealer.phone}</p>
              <Link className="mt-4 inline-block text-sm underline" href="/test-ride">
                Agendar test ride
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
