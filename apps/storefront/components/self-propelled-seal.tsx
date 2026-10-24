import type { StoreBadge } from "@/lib/catalog";
import Link from "next/link";

/** O selo da API pode dizer "sem CNH". A vitrine não atribui essa frase à Resolução 996/2023. */
export function sealText(label: string) {
  if (label.toLocaleLowerCase("pt-BR").includes("sem cnh")) return "Autopropelido: sem placa nem registro";
  return label;
}

export function SelfPropelledSeal({ badge, notice = false }: { badge: StoreBadge; notice?: boolean }) {
  if (!badge.eligible || !badge.label) {
    if (!notice) return null;
    return (
      <div className="mt-3">
        <CityRulesNotice text={badge.notice} />
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="rounded-full border border-white/20 px-3 py-1 text-sm text-paper">{sealText(badge.label)}</p>
      {notice ? <CityRulesNotice text={badge.notice} /> : null}
    </div>
  );
}

export function CityRulesNotice({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="text-sm text-muted-foreground">
      <Link href="/legislacao" className="underline-offset-4 hover:underline">
        {text}
      </Link>
    </p>
  );
}
