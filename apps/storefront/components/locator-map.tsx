import { dealers, type Dealer } from "@/lib/catalog";
import Link from "next/link";

const pins: Record<string, { x: number; y: number }> = {
  "sp-vila-madalena": { x: 63, y: 64 },
  "rj-botafogo": { x: 72, y: 62 },
  "bh-savassi": { x: 66, y: 52 },
  "cwb-batel": { x: 58, y: 72 },
  "poa-moinhos": { x: 55, y: 86 },
};

export function LocatorMap({ active }: { active: Dealer[] }) {
  const visible = new Set(active.map((dealer) => dealer.id));

  return (
    <figure className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#101013]">
      <figcaption className="flex items-center justify-between gap-4 px-5 pt-5 text-xs tracking-[0.16em] text-muted-foreground uppercase">
        <span>Esquema das lojas</span>
        <span>Não é mapa geográfico</span>
      </figcaption>
      <div className="relative mx-auto aspect-[4/5] max-h-[28rem] w-full max-w-md">
        <svg viewBox="0 0 100 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path
            d="M48 8 C58 10 70 18 74 32 C80 40 78 52 74 62 C78 70 76 84 68 96 C60 108 52 112 46 110 C38 108 34 96 32 86 C26 80 22 70 24 58 C20 48 24 36 32 26 C36 16 40 8 48 8 Z"
            fill="#18181c"
            stroke="rgb(255 255 255 / 18%)"
          />
        </svg>
        {dealers.map((dealer) => {
          const pin = pins[dealer.id];
          if (!pin) return null;
          const on = visible.has(dealer.id);
          return (
            <Link
              key={dealer.id}
              href={`/lojas?cidade=${encodeURIComponent(dealer.city)}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[11px] ${on ? "bg-paper text-background" : "bg-white/10 text-muted-foreground"}`}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            >
              <span className={`mr-1 inline-block size-1.5 rounded-full ${on ? "bg-signal" : "bg-white/40"}`} aria-hidden="true" />
              {dealer.city}
            </Link>
          );
        })}
      </div>
    </figure>
  );
}
