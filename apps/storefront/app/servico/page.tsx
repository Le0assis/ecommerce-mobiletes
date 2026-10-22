import { PageShell } from "@/components/page-shell";
import { ServiceForm } from "@/components/service-form";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Serviço",
  description: "Agende revisão ou garantia numa loja LUME.",
};

export default function ServicePage() {
  return (
    <PageShell eyebrow="Depois da compra" title="Serviço." lede="Revisão e garantia passam pela loja. O horário pedido aqui ainda espera confirmação humana.">
      <ServiceForm />
      <p className="mt-8 text-sm text-muted-foreground">
        A política de referência está em <Link className="text-paper underline" href="/garantia">garantia</Link>.
      </p>
    </PageShell>
  );
}
