import { CartView } from "@/components/cart-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Carrinho" };

export default function CartPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-28 pb-20">
      <h1 className="display text-6xl md:text-8xl">Carrinho.</h1>
      <CartView />
    </main>
  );
}
