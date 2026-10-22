"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSyncExternalStore } from "react";

const eventName = "lume-cookie-change";

function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}

export function CookieNotice() {
  const accepted = useSyncExternalStore(subscribe, () => localStorage.getItem("lume-cookies") === "ok", () => false);
  if (accepted) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-30 mx-auto max-w-xl rounded-3xl border border-white/10 bg-[#16161a] p-4 text-sm text-muted-foreground shadow-2xl md:inset-x-auto md:right-5">
      <p>
        Usamos o essencial para lembrar o carrinho neste navegador. Sem anúncio de terceiro nesta versão.{" "}
        <Link className="text-paper underline" href="/privacidade">
          Privacidade
        </Link>
      </p>
      <Button
        className="mt-3 h-10 rounded-full px-4"
        onClick={() => {
          localStorage.setItem("lume-cookies", "ok");
          window.dispatchEvent(new Event(eventName));
        }}
      >
        Entendi
      </Button>
    </div>
  );
}
