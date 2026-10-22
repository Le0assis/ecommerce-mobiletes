import { TestRideForm } from "@/components/test-ride-form";
import type { Metadata } from "next";
import { Suspense } from "react";

async function RideGate({ searchParams }: PageProps<"/test-ride">) {
  const query = await searchParams;
  const modelo = typeof query.modelo === "string" ? query.modelo : "apex";
  return <TestRideForm initialModel={modelo} />;
}

export const metadata: Metadata = {
  title: "Test ride",
  description: "Agende um test ride em uma loja LUME.",
};

export default function TestRidePage(props: PageProps<"/test-ride">) {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-28 pb-20">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Lojas</p>
      <h1 className="display mt-3 text-6xl md:text-8xl">Agende um test ride.</h1>
      <p className="mt-4 text-muted-foreground">Vinte minutos, capacete da loja, sem compromisso de compra.</p>
      <Suspense fallback={<p className="mt-8 text-muted-foreground">Abrindo a agenda…</p>}>
        <RideGate {...props} />
      </Suspense>
    </main>
  );
}
