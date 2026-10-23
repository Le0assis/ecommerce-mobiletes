import { CartView } from "@/components/cart-view";
import { loadProducts } from "@/lib/catalog";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Carrinho" };

export default function CartPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-28 pb-20">
      <h1 className="display text-6xl md:text-8xl">Carrinho.</h1>
      <Suspense fallback={<p className="mt-8 text-muted-foreground">Abrindo o carrinho…</p>}>
        <CartGate />
      </Suspense>
    </main>
  );
}

async function CartGate() {
  const loaded = await loadProducts();
  return <CartView products={loaded.ok ? loaded.data : []} catalogMessage={loaded.ok ? null : loaded.message} />;
}
