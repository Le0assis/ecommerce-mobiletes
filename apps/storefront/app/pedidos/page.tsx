import { OrderList } from "@/components/order-list";
import { PageShell } from "@/components/page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pedidos",
  description: "Acompanhe as reservas feitas neste navegador.",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return (
    <PageShell
      wide
      eyebrow="Conta"
      title="Pedidos."
      lede="Os códigos confirmados neste navegador. Se a API reiniciar sem Postgres, o detalhe some e o código fica como lembrete."
    >
      <OrderList />
    </PageShell>
  );
}
