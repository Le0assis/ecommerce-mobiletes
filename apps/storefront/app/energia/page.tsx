import { PageShell } from "@/components/page-shell";
import { motorcycles } from "@/lib/catalog";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Energia",
  description: "Carga em casa e recarga rápida. Sem troca de bateria.",
};

export default function EnergyPage() {
  return (
    <PageShell
      eyebrow="Sistema"
      title="Energia."
      lede="No Brasil a LUME não troca bateria em estação. A moto carrega na tomada de casa durante a noite e, quando o modelo oferece, numa recarga rápida no caminho."
    >
      <div className="grid gap-4">
        {motorcycles.map((product) => (
          <article key={product.id} className="grid gap-2 rounded-[1.5rem] border border-white/10 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <h2 className="text-2xl font-light">{product.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{product.batteryKwh} kWh · 0–100% em casa em {product.chargeHours} h</p>
            </div>
            <p className="nums text-sm">{product.fastChargeMin ? `Rápida ${product.fastChargeMin} min` : "Sem recarga rápida"}</p>
          </article>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        A autonomia publicada é de referência. A calculadora de cada modelo mostra o que muda com velocidade, peso e modo.{" "}
        <Link className="text-paper underline" href="/motos/apex">
          Abrir a Apex
        </Link>
      </p>
    </PageShell>
  );
}
