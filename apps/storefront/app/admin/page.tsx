import { AdminPanel } from "@/components/admin-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-5xl px-5 pt-28 pb-20">
      <h1 className="display text-6xl">Admin.</h1>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
        Uma senha só, sem nome de usuário. O hash scrypt fica no servidor e a sessão chega num cookie httpOnly. Fora de produção a API ainda aceita o token de desenvolvimento.
      </p>
      <AdminPanel />
    </main>
  );
}
