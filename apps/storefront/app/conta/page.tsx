import { AccountForm } from "@/components/account-form";
import { AccountSession } from "@/components/account-session";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conta" };

export default function AccountPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-28 pb-20">
      <h1 className="display text-6xl md:text-8xl">Conta.</h1>
      <p className="mt-4 text-muted-foreground">
        O perfil local continua neste navegador. A sessão de sandbox liga o e-mail aos pedidos que ainda estão na memória da API.
      </p>
      <AccountSession />
      <AccountForm />
    </main>
  );
}
