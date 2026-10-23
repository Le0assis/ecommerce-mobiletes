import { AdminPanel } from "@/components/admin-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-5xl px-5 pt-28 pb-20">
      <h1 className="display text-6xl">Admin.</h1>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
        Visão operacional. A entrada é a senha cujo hash scrypt está em ADMIN_PASSWORD_HASH. O cookie de sessão é httpOnly. Fora de produção a API ainda aceita o cabeçalho x-admin-token.
      </p>
      <AdminPanel />
    </main>
  );
}
