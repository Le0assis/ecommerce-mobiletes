import { ContactForm } from "@/components/contact-form";
import { PageShell } from "@/components/page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a LUME. Nesta versão a mensagem fica só no navegador.",
};

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Fale"
      title="Contato."
      lede="Compras, test ride, assistência e imprensa. O formulário ainda não entrega e-mail: guarda o texto neste navegador."
    >
      <ContactForm />
    </PageShell>
  );
}
