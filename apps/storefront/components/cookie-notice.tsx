"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSyncExternalStore } from "react";

const eventName = "lume-cookie-change";

function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}

function readChoice() {
  return localStorage.getItem("lume-cookies") ?? "";
}

function choose(value: "essential" | "analytics") {
  localStorage.setItem("lume-cookies", value);
  window.dispatchEvent(new Event(eventName));
}

export function CookieNotice() {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "");
  const accepted = choice === "ok" || choice === "essential" || choice === "analytics";
  if (accepted) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-30 mx-auto max-w-xl rounded-3xl border border-white/10 bg-[#16161a] p-4 text-sm text-muted-foreground shadow-2xl md:inset-x-auto md:right-5">
      <p>
        O essencial guarda o carrinho neste navegador. A medição local, se você permitir, só escreve o evento no console deste computador. Sem anúncio de terceiro.{" "}
        <Link className="text-paper underline" href="/privacidade">
          Privacidade
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="h-10 rounded-full px-4" onClick={() => choose("essential")}>
          Só o essencial
        </Button>
        <Button variant="outline" className="h-10 rounded-full border-white/20 px-4" onClick={() => choose("analytics")}>
          Permitir medição local
        </Button>
      </div>
    </div>
  );
}
