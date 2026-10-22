"use client";

import { useShop } from "@/components/shop-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMotorcycle } from "@/lib/catalog";
import Link from "next/link";
import { useSyncExternalStore } from "react";

type Profile = { name: string; email: string };

const profileEvent = "lume-profile-change";

function subscribe(listener: () => void) {
  window.addEventListener(profileEvent, listener);
  return () => window.removeEventListener(profileEvent, listener);
}

function readProfile(raw: string): Profile | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export function AccountForm() {
  const shop = useShop();
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem("lume-profile") ?? "", () => "");
  const profile = readProfile(raw);

  return (
    <div className="mt-8 grid gap-8">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const next = { name: String(data.get("name")), email: String(data.get("email")) };
          localStorage.setItem("lume-profile", JSON.stringify(next));
          window.dispatchEvent(new Event(profileEvent));
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required minLength={3} defaultValue={profile?.name ?? ""} key={`name-${raw}`} className="h-12 rounded-full px-4" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required defaultValue={profile?.email ?? ""} key={`email-${raw}`} className="h-12 rounded-full px-4" />
        </div>
        <Button type="submit" className="h-12 rounded-full">
          Guardar neste navegador
        </Button>
      </form>
      <section className="grid gap-3 text-sm">
        <h2 className="text-xl font-light">Neste navegador</h2>
        <Link className="underline" href="/desejos">
          Lista de desejos ({shop.wishlist.length})
        </Link>
        <Link className="underline" href="/pedidos">
          Pedidos ({shop.orderCodes.length})
        </Link>
        {shop.wishlist.length > 0 ? (
          <ul className="grid gap-2 text-muted-foreground">
            {shop.wishlist.map((slug) => (
              <li key={slug}>
                <Link className="underline" href={`/motos/${slug}`}>
                  {getMotorcycle(slug)?.name ?? slug}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Nenhum modelo salvo.</p>
        )}
      </section>
    </div>
  );
}
