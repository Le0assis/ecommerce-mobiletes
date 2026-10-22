"use client";

import { ProductCard } from "@/components/product-card";
import { useShop } from "@/components/shop-provider";
import { getMotorcycle } from "@/lib/catalog";
import Link from "next/link";

export function WishlistView() {
  const shop = useShop();
  const products = shop.wishlist.map((slug) => getMotorcycle(slug)).filter((item) => item !== undefined);

  if (products.length === 0) {
    return (
      <div className="rounded-[1.8rem] border border-white/10 p-6">
        <h2 className="text-2xl font-light">A lista está vazia.</h2>
        <p className="mt-3 max-w-lg text-muted-foreground">Salve um modelo no configurador ou no catálogo. A lista fica neste navegador, junto do carrinho.</p>
        <Link href="/motos" className="mt-4 inline-block text-sm underline">
          Ver a linha
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
