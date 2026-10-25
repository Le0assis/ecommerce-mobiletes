import { CheckoutForm } from "@/components/checkout-form";
import { loadProducts } from "@/lib/catalog";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-28 pb-20">
      <h1 className="display text-6xl md:text-8xl">Pagamento.</h1>
      <p className="mt-4 text-muted-foreground">Pix com 5%, boleto com 3% ou cartão em até 21x sem juros. Nada é cobrado de verdade nesta versão.</p>
      <Suspense fallback={<p className="mt-8 text-muted-foreground">Abrindo o pagamento…</p>}>
        <CheckoutGate />
      </Suspense>
    </main>
  );
}

async function CheckoutGate() {
  const loaded = await loadProducts();
  return <CheckoutForm products={loaded.ok ? loaded.data : []} catalogMessage={loaded.ok ? null : loaded.message} />;
}
