"use client";

import { motorcycles } from "@lume/domain";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export function ComparePicker({ selected }: { selected: string[] }) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const slugs = data.getAll("pick").map(String).slice(0, 3);
    router.push(slugs.length ? `/comparar?modelos=${slugs.join(",")}` : "/comparar");
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-wrap gap-3">
      {motorcycles.map((product) => (
        <label key={product.id} className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-sm">
          <input type="checkbox" name="pick" value={product.slug} defaultChecked={selected.includes(product.slug)} />
          {product.name.replace("LUME ", "")}
        </label>
      ))}
      <button className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground" type="submit">
        Atualizar
      </button>
    </form>
  );
}
