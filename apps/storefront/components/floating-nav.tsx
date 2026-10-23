"use client";

import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useShop } from "@/components/shop-provider";
import { whatsappGreeting, whatsappHref } from "@/lib/whatsapp";
import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/motos", label: "Motos" },
  { href: "/comparar", label: "Comparar" },
  { href: "/me-ajude-a-escolher", label: "Quiz" },
];

export function FloatingNav() {
  const pathname = usePathname();
  const { count } = useShop();

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 md:px-5 md:pt-5">
      <div className="pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full border border-white/10 bg-[#121216]/75 px-3 py-2 shadow-[0_20px_60px_rgb(0_0_0/0.35)] backdrop-blur-xl md:px-4">
        <Link href="/" className="flex items-center gap-2 pl-2 text-sm tracking-[0.22em]">
          <span className="size-2 rounded-full bg-signal" aria-hidden="true" />
          LUME
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-paper/80 lg:flex" aria-label="Principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn("transition-colors hover:text-paper", pathname.startsWith(link.href) && "text-paper")}
              aria-current={pathname.startsWith(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/carrinho" className="px-2 text-sm text-paper/80 hover:text-paper">
            Carrinho{count > 0 ? <span className="nums ml-1 text-paper">{count}</span> : null}
          </Link>
          <Link href="/motos/apex" className={cn(buttonVariants({ size: "lg" }), "hidden h-10 rounded-full px-4 sm:inline-flex")}>
            Reservar
          </Link>
          <Dialog>
            <DialogTrigger className="rounded-full border border-white/15 px-3 py-2 text-sm lg:hidden">Menu</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="tracking-[0.18em]">LUME</DialogTitle>
                <DialogDescription>Motos e mobiletes elétricas.</DialogDescription>
              </DialogHeader>
              <nav className="flex flex-col gap-3 text-3xl font-extralight" aria-label="Mobile">
                {links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
                <a href={whatsappHref(whatsappGreeting)} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
                <Link href="/financiamento">21× e Pix</Link>
                <Link href="/conta">Conta</Link>
                <Link href="/desejos">Desejos</Link>
                <Link href="/pedidos">Pedidos</Link>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
