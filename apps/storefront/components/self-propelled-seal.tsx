import { autopropelidoBadge, specsForAutopropelido, type Motorcycle } from "@/lib/catalog";
import Link from "next/link";

export function SelfPropelledSeal({ product, notice = false }: { product: Motorcycle; notice?: boolean }) {
  const badge = autopropelidoBadge(specsForAutopropelido(product));
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
      <p className="rounded-full border border-white/20 px-3 py-1 text-sm text-paper">{badge.label}</p>
      <CityRulesNotice text={badge.notice} />
    </div>
  );
}

export function CityRulesNotice({ text }: { text: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      <Link href="/legislacao" className="underline-offset-4 hover:underline">
        {text}
      </Link>
    </p>
  );
}
