"use client";

import { useShop } from "@/components/shop-provider";

export function WishToggle({ slug }: { slug: string }) {
  const shop = useShop();
  const wished = shop.wished(slug);

  return (
    <button
      type="button"
      aria-pressed={wished}
      onClick={() => shop.toggleWish(slug)}
      className="rounded-full border border-white/15 px-3 py-1 text-xs tracking-[0.12em] uppercase aria-pressed:border-signal"
    >
      {wished ? "Na lista" : "Desejo"}
    </button>
  );
}
