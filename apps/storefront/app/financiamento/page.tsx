import { FinancingSimulator } from "@/components/financing-simulator";
import { PageShell } from "@/components/page-shell";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Financiamento",
  description: "21 vezes sem juros no cartão, 5% no Pix e 3% no boleto.",
};

export default function FinancingPage() {
  return (
    <PageShell
      wide
      eyebrow="Pagamento"
      title="21×."
      lede="No lançamento o cartão parcela em até 21 vezes sem juros. Pix tira 5%. Boleto tira 3%. O frete não entra no desconto."
    >
      <FinancingSimulator />
      <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
        A tabela de juros continua no código para o dia em que o sem juros encolher. Nesta vitrine ela não é cobrada. Não há CDC bancário: o parcelamento é do cartão, não um financiamento de veículo.{" "}
        <Link className="text-paper underline" href="/motos/apex">
          Configurar a Apex
        </Link>
      </p>
    </PageShell>
  );
}
