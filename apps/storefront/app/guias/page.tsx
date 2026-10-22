import { PageShell } from "@/components/page-shell";
import { guides } from "@lume/domain";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guias",
  description: "Como carregar, andar e entender a LUME.",
};

export default function GuidesPage() {
  return (
    <PageShell eyebrow="Conteúdo" title="Guias." lede="Textos da casa. Quando o CMS entrar, estes arquivos saem do código sem mudar o endereço.">
      <ul className="grid gap-4">
        {guides.map((guide) => (
          <li key={guide.slug} className="rounded-[1.5rem] border border-white/10 p-5">
            <h2 className="text-2xl font-light">
              <Link className="underline-offset-4 hover:underline" href={`/guias/${guide.slug}`}>
                {guide.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{guide.lede}</p>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
