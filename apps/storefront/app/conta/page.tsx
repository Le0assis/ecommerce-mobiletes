import { AccountForm } from "@/components/account-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conta" };

export default function AccountPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-28 pb-20">
      <h1 className="display text-6xl md:text-8xl">Conta.</h1>
      <p className="mt-4 text-muted-foreground">
        A entrada definitiva é um link por e-mail, sem senha. Nesta versão o perfil fica só neste navegador e não cria cadastro no servidor.
      </p>
      <AccountForm />
    </main>
  );
}
