import { Button } from "@/components/ui/button";
import type { CatalogOrder } from "@/lib/catalog";

const labelClass = "grid gap-2 text-[11px] tracking-normal text-muted-foreground";

const fieldClass =
  "h-12 w-full rounded-full border border-white/15 bg-transparent px-4 text-base tracking-normal text-paper normal-case";

const selectClass = `${fieldClass} appearance-none bg-[length:1rem_1rem] bg-[position:right_1rem_center] bg-no-repeat pr-10 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23f4f4f2' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")]`;

export function CategorySearch({
  category,
  q,
  order = "destaque",
  brand,
  categories,
  brands,
}: {
  category?: string;
  q?: string;
  order?: CatalogOrder | string;
  brand?: string;
  categories: { id: string; label: string }[];
  brands: string[];
}) {
  return (
    <form action="/motos" className="grid gap-y-5 rounded-[2rem] border border-white/10 bg-[#121216]/80 p-4 shadow-2xl backdrop-blur-xl md:p-5">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-3">
        <label className={labelClass}>
          Categoria
          <select name="categoria" defaultValue={category ?? ""} className={selectClass}>
            <option value="">Todas</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Marca
          <select name="marca" defaultValue={brand ?? ""} className={selectClass}>
            <option value="">Todas</option>
            {brands.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Ordem
          <select name="ordem" defaultValue={order} className={selectClass}>
            <option value="destaque">Destaque</option>
            <option value="preco">Menor preço</option>
            <option value="preco-desc">Maior preço</option>
            <option value="velocidade">Maior velocidade</option>
          </select>
        </label>
      </div>
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-[1fr_auto] md:items-end">
        <label className={labelClass}>
          Busca
          <input name="q" defaultValue={q ?? ""} placeholder="Nome ou scooter" className={fieldClass} />
        </label>
        <Button type="submit" variant="outline" className="h-12 rounded-full border-white/20 px-6 text-paper">
          Buscar
        </Button>
      </div>
    </form>
  );
}
