import { OrderStatus } from "@/components/order-status";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Pedido" };

export default function OrderPage(props: PageProps<"/pedido/[code]">) {
  return (
    <Suspense fallback={<p className="px-5 pt-32 text-muted-foreground">Buscando o pedido…</p>}>
      <OrderBody {...props} />
    </Suspense>
  );
}

async function OrderBody({ params }: PageProps<"/pedido/[code]">) {
  const { code } = await params;
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-28 pb-20">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Acompanhamento</p>
      <h1 className="display mt-3 text-6xl">Pedido {code}</h1>
      <OrderStatus code={code} />
    </main>
  );
}
