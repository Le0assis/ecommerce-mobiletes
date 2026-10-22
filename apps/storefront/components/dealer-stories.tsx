import { dealers } from "@lume/domain";
import Link from "next/link";

export function DealerStories() {
  return (
    <ul className="flex gap-5 overflow-x-auto pb-2">
      {dealers.map((dealer) => (
        <li key={dealer.id} className="w-24 shrink-0">
          <Link href={`/lojas?cidade=${encodeURIComponent(dealer.city)}`} className="group flex flex-col items-center gap-2 text-center">
            <span className="grid size-20 place-items-center rounded-full border border-white/15 bg-white/5 text-sm tracking-[0.14em] ring-2 ring-transparent transition group-hover:ring-signal">
              {dealer.uf}
            </span>
            <span className="text-xs text-muted-foreground">{dealer.city}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
