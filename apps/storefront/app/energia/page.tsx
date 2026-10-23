import { CatalogDown } from "@/components/catalog-state";
import { PageShell } from "@/components/page-shell";
import { loadProducts, measure } from "@/lib/catalog";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Energia",
  description: "Carga em casa e recarga rápida. Sem troca de bateria.",
};

export default function EnergyPage() {
  return (
    <Suspense fallback={<p className="px-5 pt-32 text-muted-foreground">Abrindo a energia…</p>}>
      <EnergyBody />
    </Suspense>
  );
}

async function EnergyBody() {
  const loaded = await loadProducts();
  if (!loaded.ok) return <CatalogDown message={loaded.message} />;
  const featured = loaded.data.find((item) => item.slug === "apex") ?? loaded.data[0];

  return (
    <PageShell
      eyebrow="Sistema"
      title="Energia."
      lede="No Brasil a LUME não troca bateria em estação. A moto carrega na tomada de casa durante a noite e, quando o modelo oferece, numa recarga rápida no caminho."
    >
      <div className="grid gap-4">
        {loaded.data.map((product) => (
          <article key={product.id} className="grid gap-2 rounded-[1.5rem] border border-white/10 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <h2 className="text-2xl font-light">{product.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {measure(product.batteryKwh, "kWh")} · 0–100% em casa em {measure(product.chargeHours, "h")}
              </p>
            </div>
            <p className="nums text-sm">{product.fastChargeMin ? `Rápida ${product.fastChargeMin} min` : "Sem recarga rápida"}</p>
          </article>
        ))}
      </div>
      {featured ? (
        <p className="mt-8 text-sm text-muted-foreground">
          A autonomia publicada é o número do modelo, só como dado da ficha. A comparação com gasolina continua em cada página.{" "}
          <Link className="text-paper underline" href={`/motos/${featured.slug}`}>
            Abrir {featured.name}
          </Link>
        </p>
      ) : null}
    </PageShell>
  );
}
