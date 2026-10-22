import { PageShell } from "@/components/page-shell";
import { WishlistView } from "@/components/wishlist-view";
import type { Metadata } from "next";

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
      <WishlistView />
    </PageShell>
  );
}
