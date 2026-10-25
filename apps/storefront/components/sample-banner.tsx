import type { StoreProduct } from "@/lib/catalog";

export function productIsSample(product: { isSample?: boolean }): boolean {
  return product.isSample === true;
}

export function catalogHasSample(list: StoreProduct[]): boolean {
  return list.some((product) => productIsSample(product));
}

/** Faixa dos produtos marcados como exemplo. Some quando nenhum modelo da lista é amostra. */
export function SampleBanner({ show, clearNav = false }: { show: boolean; clearNav?: boolean }) {
  if (!show) return null;
  return (
    <p className={`bg-[#141418] px-5 pb-3 text-center text-sm text-paper ${clearNav ? "pt-24" : "border-y border-white/10 py-3"}`}>
      Dado de exemplo. A ficha e o preço ainda não foram confirmados com o fabricante.
    </p>
  );
}
