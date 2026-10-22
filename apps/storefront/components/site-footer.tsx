import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-14 pb-32">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-2 tracking-[0.22em]">
            <span className="size-2 rounded-full bg-signal" aria-hidden="true" />
            LUME
          </p>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Motos e mobiletes elétricas para o uso real no Brasil. Preço em real, Pix, boleto, cartão em até 21x sem juros e frete por CEP.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/motos">Catálogo</Link>
          <Link href="/me-ajude-a-escolher">Me ajude a escolher</Link>
          <Link href="/lojas">Lojas</Link>
          <Link href="/test-ride">Test ride</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Link href="/conta">Conta</Link>
          <Link href="/privacidade">Privacidade e LGPD</Link>
          <Link href="/admin">Admin</Link>
          <p>Marca de demonstração. Números de produto são de referência.</p>
        </div>
      </div>
    </footer>
  );
}
