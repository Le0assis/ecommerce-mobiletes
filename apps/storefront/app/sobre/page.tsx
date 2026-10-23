import { PageShell } from "@/components/page-shell";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre",
  description: "A LUME faz motos e mobiletes elétricas para o uso real no Brasil.",
};

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="A marca"
      title="Sobre."
      lede="A LUME desenha motos e mobiletes elétricas para quem anda no Brasil: preço em real, carga em casa e conversa no WhatsApp enquanto não há loja física."
    >
      <div className="grid gap-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          A linha vai da mobilete S, para a volta curta, até a Apex, a flagship de 180 km/h. No meio ficam a City, a Via e a Serra. Cada uma tem cor e um preço que se recalcula no mesmo gesto.
        </p>
        <p>
          Esta vitrine é de demonstração. Os endereços de loja, os relatos e os números de produto são de referência. O nome jurídico do operador e o CNPJ entram antes de qualquer venda real.
        </p>
        <p>
          <Link className="text-paper underline" href="/energia">
            Como a energia funciona
          </Link>
          {" · "}
          <Link className="text-paper underline" href="/motos">
            Ver a linha
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
