import { Button } from "@/components/ui/button";
import { brands, categoryLabel, cities, type CatalogOrder, type Category } from "@/lib/catalog";

const categories = Object.keys(categoryLabel) as Category[];

const fieldClass = "h-12 rounded-full border border-white/15 bg-transparent px-4 text-base tracking-normal text-paper normal-case";

export function CategorySearch({
  category,
  city,
  q,
  order = "destaque",
  brand,
}: {
  category?: string;
  city?: string;
  q?: string;
  order?: CatalogOrder | string;
  brand?: string;
}) {
  return (
    <form action="/motos" className="grid gap-4 rounded-[2rem] border border-white/10 bg-[#121216]/80 p-4 shadow-2xl backdrop-blur-xl md:p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Categoria
          <select name="categoria" defaultValue={category ?? ""} className={fieldClass}>
            <option value="">Todas</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {categoryLabel[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Cidade da loja
          <select name="cidade" defaultValue={city ?? ""} className={fieldClass}>
            <option value="">Onde ver de perto</option>
            {cities().map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Marca
          <select name="marca" defaultValue={brand ?? ""} className={fieldClass}>
            <option value="">Todas</option>
            {brands().map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Ordem
          <select name="ordem" defaultValue={order} className={fieldClass}>
            <option value="destaque">Destaque</option>
            <option value="preco">Menor preço</option>
            <option value="preco-desc">Maior preço</option>
            <option value="autonomia">Maior autonomia</option>
            <option value="velocidade">Maior velocidade</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="grid gap-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Busca
          <input name="q" defaultValue={q ?? ""} placeholder="Nome, scooter, autonomia" className={fieldClass} />
        </label>
        <Button type="submit" variant="outline" className="h-12 rounded-full border-white/20 px-6 text-paper">
          Buscar
        </Button>
      </div>
    </form>
  );
}
