"use client";

import { usePathname } from "next/navigation";

const phone = process.env.NEXT_PUBLIC_WHATSAPP ?? "551140001900";

export function WhatsAppButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/checkout") || pathname.startsWith("/admin") || pathname.startsWith("/motos/")) return null;
  const text = encodeURIComponent("Olá, quero falar sobre uma moto LUME.");
  return (
    <a
      href={`https://wa.me/${phone}?text=${text}`}
      className="fixed right-4 bottom-24 z-30 rounded-full border border-white/15 bg-[#121216]/90 px-4 py-3 text-sm shadow-2xl backdrop-blur md:bottom-8"
      rel="noreferrer"
      target="_blank"
    >
      WhatsApp
    </a>
  );
}
