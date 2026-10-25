"use client";

import { whatsappGreeting, whatsappHref } from "@/lib/whatsapp";
import { usePathname } from "next/navigation";

export function WhatsAppButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/checkout") || pathname.startsWith("/admin") || pathname.startsWith("/motos/")) return null;
  return (
    <a
      href={whatsappHref(whatsappGreeting)}
      className="fixed right-4 bottom-24 z-30 rounded-full border border-white/15 bg-[#121216]/90 px-4 py-3 text-sm shadow-2xl backdrop-blur md:bottom-8"
      rel="noreferrer"
      target="_blank"
      aria-label="Abrir conversa no WhatsApp"
    >
      WhatsApp
    </a>
  );
}
