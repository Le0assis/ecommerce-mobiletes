import { PageShell } from "@/components/page-shell";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trocas e arrependimento",
  description: "Direito de arrependimento de 7 dias nas compras feitas à distância.",
};

export default function ReturnsPage() {
  return (
    <PageShell
      eyebrow="CDC"
      title="Trocas."
      lede="Compra feita fora da loja física tem 7 dias para arrependimento, contados do recebimento, pelo art. 49 do Código de Defesa do Consumidor."
    >
      <div className="grid gap-6 text-sm leading-relaxed text-muted-foreground">
        <p>O pedido de demonstração não movimenta dinheiro, então não há estorno real. Quando o pagamento existir, o mesmo canal devolve Pix, cancela o boleto não pago ou estorna o cartão.</p>
        <p>A moto precisa voltar com os acessórios da configuração, sem dano de uso. A retirada em loja, quando o cliente viu e levou o produto no ato, segue a regra de vício, não a de arrependimento à distância.</p>
        <p>
          Para registrar a intenção nesta versão, use <Link className="text-paper underline" href="/contato">contato</Link> com o código do pedido.
        </p>
      </div>
    </PageShell>
  );
}
