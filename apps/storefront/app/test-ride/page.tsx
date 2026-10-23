import { buttonVariants } from "@/components/ui/button";
import { getMotorcycle } from "@/lib/catalog";
import { whatsappGreeting, whatsappHref } from "@/lib/whatsapp";
import { cn } from "cn";
import type { Metadata } from "next";
import { Suspense } from "react";

async function RideGate({ searchParams }: PageProps<"/test-ride">) {
  const query = await searchParams;
  const modelo = typeof query.modelo === "string" ? query.modelo : "";
  const product = modelo ? getMotorcycle(modelo) : undefined;
  const message = product ? `Olá, quero falar sobre a ${product.name}.` : whatsappGreeting;
  return (
    <a
      href={whatsappHref(message)}
      className={cn(buttonVariants(), "mt-8 inline-flex h-12 rounded-full px-6")}
      target="_blank"
      rel="noreferrer"
    >
      Falar no WhatsApp
    </a>
  );
}

export const metadata: Metadata = {
  title: "WhatsApp",
  description: "Fale com a LUME no WhatsApp. Ainda não há loja física para test ride.",
};

export default function TestRidePage(props: PageProps<"/test-ride">) {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-28 pb-20">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Conversa</p>
      <h1 className="display mt-3 text-6xl md:text-8xl">Fale no WhatsApp.</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Ainda não há loja física. A conversa sobre um modelo acontece no WhatsApp, no mesmo número do botão da loja.
      </p>
      <Suspense fallback={<p className="mt-8 text-muted-foreground">Abrindo a conversa…</p>}>
        <RideGate {...props} />
      </Suspense>
    </main>
  );
}
