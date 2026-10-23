"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  productId: string;
  colorId: string;
  accessoryIds: string[];
  batteryId?: string;
  qty: number;
};

type ShopState = {
  lines: CartLine[];
  wishlist: string[];
  orderCodes: string[];
};

type ShopContextValue = {
  lines: CartLine[];
  wishlist: string[];
  orderCodes: string[];
  count: number;
  addLine: (line: Omit<CartLine, "qty">) => void;
  setQty: (index: number, qty: number) => void;
  removeLine: (index: number) => void;
  retainLines: (productIds: readonly string[]) => void;
  clear: () => void;
  rememberOrder: (code: string) => void;
  toggleWish: (slug: string) => void;
  wished: (slug: string) => boolean;
};

const empty: ShopState = { lines: [], wishlist: [], orderCodes: [] };
const storageKey = "lume-shop-v1";
const listeners = new Set<() => void>();
const ShopContext = createContext<ShopContextValue | null>(null);

function parse(raw: string): ShopState {
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<ShopState>;
    if (!parsed || !Array.isArray(parsed.lines) || !Array.isArray(parsed.wishlist)) return empty;
    return {
      lines: parsed.lines,
      wishlist: parsed.wishlist,
      orderCodes: Array.isArray(parsed.orderCodes) ? parsed.orderCodes.filter((code) => typeof code === "string") : [],
    };
  } catch {
    return empty;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(next: ShopState) {
  localStorage.setItem(storageKey, JSON.stringify(next));
  for (const listener of listeners) listener();
}

function sameLine(a: Omit<CartLine, "qty">, b: CartLine) {
  return (
    a.productId === b.productId &&
    a.colorId === b.colorId &&
    (a.batteryId ?? "serie") === (b.batteryId ?? "serie") &&
    a.accessoryIds.join("|") === b.accessoryIds.join("|")
  );
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState("");
  useEffect(() => {
    const read = () => setRaw(localStorage.getItem(storageKey) ?? "");
    read();
    const stop = subscribe(read);
    return () => {
      stop();
    };
  }, []);
  const state = useMemo(() => parse(raw), [raw]);

  const api = useMemo<ShopContextValue>(() => {
    const commit = (recipe: (current: ShopState) => ShopState) => {
      publish(recipe(parse(localStorage.getItem(storageKey) ?? "")));
    };

    return {
      lines: state.lines,
      wishlist: state.wishlist,
      orderCodes: state.orderCodes,
      count: state.lines.reduce((sum, line) => sum + line.qty, 0),
      addLine: (line) =>
        commit((current) => {
          const index = current.lines.findIndex((item) => sameLine(line, item));
          if (index === -1) return { ...current, lines: [...current.lines, { ...line, qty: 1 }] };
          return {
            ...current,
            lines: current.lines.map((item, itemIndex) =>
              itemIndex === index ? { ...item, qty: Math.min(2, item.qty + 1) } : item,
            ),
          };
        }),
      setQty: (index, qty) =>
        commit((current) => ({
          ...current,
          lines: current.lines.flatMap((item, itemIndex) => {
            if (itemIndex !== index) return [item];
            if (qty <= 0) return [];
            return [{ ...item, qty: Math.min(2, qty) }];
          }),
        })),
      removeLine: (index) => commit((current) => ({ ...current, lines: current.lines.filter((_, itemIndex) => itemIndex !== index) })),
      retainLines: (productIds) =>
        commit((current) => ({
          ...current,
          lines: current.lines.filter((line) => productIds.includes(line.productId)),
        })),
      clear: () => commit((current) => ({ ...current, lines: [] })),
      rememberOrder: (code) =>
        commit((current) => ({
          ...current,
          orderCodes: [code, ...current.orderCodes.filter((item) => item !== code)].slice(0, 20),
        })),
      toggleWish: (slug) =>
        commit((current) => ({
          ...current,
          wishlist: current.wishlist.includes(slug)
            ? current.wishlist.filter((item) => item !== slug)
            : [...current.wishlist, slug],
        })),
      wished: (slug) => state.wishlist.includes(slug),
    };
  }, [state]);

  return <ShopContext.Provider value={api}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const value = useContext(ShopContext);
  if (!value) throw new Error("useShop precisa do ShopProvider.");
  return value;
}

export function DisabledCartNotice({
  products,
  active,
}: {
  products: { id: string; isEnabled?: boolean }[];
  active: boolean;
}) {
  const shop = useShop();
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!active) return;
    const allowed = products.filter((item) => item.isEnabled !== false).map((item) => item.id);
    const dropped = shop.lines.filter((line) => !allowed.includes(line.productId)).length;
    if (dropped === 0) return;
    shop.retainLines(allowed);
    const text =
      dropped === 1
        ? "Tiramos do carrinho um modelo desabilitado."
        : `Tiramos do carrinho ${dropped} modelos desabilitados.`;
    const mark = () => setNotice(text);
    mark();
  }, [active, products, shop]);
  if (!notice) return null;
  return (
    <p className="mt-4 text-sm text-signal" role="status">
      {notice}
    </p>
  );
}
