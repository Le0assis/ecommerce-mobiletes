import { PageShell } from "@/components/page-shell";
import { TradeInForm } from "@/components/trade-in-form";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Troca do usado",
  description: "Peça uma avaliação do veículo usado. A loja responde depois.",
};

export default function TradeInPage() {
  return (
    <PageShell
      eyebrow="Usado"
      title="Troca."
      lede="Conte o que você tem hoje. A avaliação é humana e não trava o preço da moto nova."
    >
      <TradeInForm />
      <p className="mt-8 text-sm text-muted-foreground">
        O parcelamento da moto nova continua em <Link className="text-paper underline" href="/financiamento">21× e Pix</Link>.
      </p>
    </PageShell>
  );
}
