"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StickyTestRide() {
  const pathname = usePathname();
  if (pathname.startsWith("/checkout") || pathname.startsWith("/test-ride") || pathname.startsWith("/admin")) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-3 md:px-5 md:pb-5">
      <Link
        href="/test-ride"
        className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-full border border-white/10 bg-[#121216]/85 px-4 py-3 text-sm shadow-[0_16px_50px_rgb(0_0_0/0.4)] backdrop-blur-xl"
      >
        <span className="flex items-center gap-3">
          <span className="size-2 shrink-0 rounded-full bg-signal" aria-hidden="true" />
          <span>
            Agende um test ride
            <span className="hidden text-muted-foreground sm:inline"> · São Paulo, Rio, BH, Curitiba, Porto Alegre</span>
          </span>
        </span>
        <span className="text-paper">Agendar</span>
      </Link>
    </div>
  );
}
