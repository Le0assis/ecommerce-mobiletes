import Link from "next/link";

export default function NotFound() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-32 pb-20">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">404</p>
      <h1 className="display mt-3 text-6xl">Essa página não está na linha.</h1>
      <Link href="/motos" className="mt-6 inline-block underline">
        Voltar às motos
      </Link>
    </main>
  );
}
