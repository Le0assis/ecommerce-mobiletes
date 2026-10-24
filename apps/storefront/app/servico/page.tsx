import { PageShell } from "@/components/page-shell";
import { ServiceForm } from "@/components/service-form";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Serviço",
  description: "Peça revisão ou garantia pelo WhatsApp ou pelo contato.",
};

export default function ServicePage() {
  return (
    <PageShell eyebrow="Depois da compra" title="Serviço." lede="Revisão e garantia são combinadas no WhatsApp ou na página de contato.">
      <ServiceForm />
      <p className="mt-8 text-sm text-muted-foreground">
        A política de referência está em <Link className="text-paper underline" href="/garantia">garantia</Link>.
      </p>
    </PageShell>
  );
}
