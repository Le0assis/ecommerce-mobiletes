import { AdminPanel } from "@/components/admin-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-5xl px-5 pt-28 pb-20">
      <h1 className="display text-6xl">Admin.</h1>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
        Esqueleto do CMS operacional: estoque por cor e leitura de banners. Em desenvolvimento o token é <span className="text-paper">dev-admin-token</span>. Em produção a API exige <span className="text-paper">ADMIN_TOKEN</span> e esta tela ganha login de verdade.
      </p>
      <AdminPanel />
    </main>
  );
}
