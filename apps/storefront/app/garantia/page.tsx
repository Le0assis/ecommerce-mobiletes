import { PageShell } from "@/components/page-shell";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Garantia",
  description: "Política de garantia de demonstração da LUME.",
};

export default function WarrantyPage() {
  return (
    <PageShell
      eyebrow="Depois da compra"
      title="Garantia."
      lede="Texto de demonstração. O contrato de venda, quando existir, prevalece sobre esta página."
    >
      <div className="grid gap-6 text-sm leading-relaxed text-muted-foreground">
        <p>A intenção comercial é cobrir bateria e motor elétrico por 24 meses e itens de desgaste, como pneu e pastilha, por 12 meses, contados da entrega.</p>
        <p>A garantia não cobre queda, alagamento, abertura da bateria fora da rede, nem uso em competição. A loja que entregou a moto é o primeiro canal.</p>
        <p>
          Assistência e dúvida de peça passam por <Link className="text-paper underline" href="/contato">contato</Link> ou pela loja em{" "}
          <Link className="text-paper underline" href="/lojas">lojas</Link>.
        </p>
      </div>
    </PageShell>
  );
}
