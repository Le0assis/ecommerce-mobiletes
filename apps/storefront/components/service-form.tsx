import { buttonVariants } from "@/components/ui/button";
import { whatsappHref } from "@/lib/whatsapp";
import { cn } from "cn";
import Link from "next/link";

const serviceMessage = "Olá, quero falar sobre revisão ou garantia.";

export function ServiceForm() {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">Revisão e garantia são combinadas no WhatsApp ou na página de contato.</p>
      <a href={whatsappHref(serviceMessage)} className={cn(buttonVariants(), "inline-flex h-12 rounded-full px-6")} target="_blank" rel="noreferrer">
        Falar no WhatsApp
      </a>
      <Link href="/contato" className="text-sm text-paper underline">
        Escrever em Contato
      </Link>
    </div>
  );
}
