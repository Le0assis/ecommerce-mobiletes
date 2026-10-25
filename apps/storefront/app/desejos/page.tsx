import { PageShell } from "@/components/page-shell";
import { WishlistView } from "@/components/wishlist-view";
import { loadProducts } from "@/lib/catalog";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Lista de desejos",
  description: "Modelos LUME salvos neste navegador.",
};

export default function WishlistPage() {
  return (
    <PageShell
      wide
      eyebrow="Lista"
      title="Desejos."
      lede="Os modelos que você marcou ficam neste navegador. Ainda não há conta que sincronize entre aparelhos."
    >
      <Suspense fallback={<p className="text-muted-foreground">Abrindo a lista…</p>}>
        <WishlistGate />
      </Suspense>
    </PageShell>
  );
}

async function WishlistGate() {
  const loaded = await loadProducts();
  return <WishlistView products={loaded.ok ? loaded.data : []} catalogMessage={loaded.ok ? null : loaded.message} />;
}
