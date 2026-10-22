import { categoryLabel, cities, type Category } from "@lume/domain";
import { Button } from "@/components/ui/button";

const categories = Object.keys(categoryLabel) as Category[];

export function CategorySearch({ category, city, compact = false }: { category?: string; city?: string; compact?: boolean }) {
  return (
    <form action="/motos" className={compact ? "grid gap-3" : "grid gap-4 rounded-[2rem] border border-white/10 bg-[#121216]/80 p-4 shadow-2xl backdrop-blur-xl md:grid-cols-[1fr_1fr_auto] md:items-end md:p-5"}>
      <label className="grid gap-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">
        Categoria
        <select
          name="categoria"
          defaultValue={category ?? ""}
          className="h-12 rounded-full border border-white/15 bg-transparent px-4 text-base tracking-normal text-paper normal-case"
        >
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
        <select
          name="cidade"
          defaultValue={city ?? ""}
          className="h-12 rounded-full border border-white/15 bg-transparent px-4 text-base tracking-normal text-paper normal-case"
        >
          <option value="">Onde ver de perto</option>
          {cities().map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="outline" className="h-12 rounded-full border-white/20 px-6 text-paper">
        Buscar
      </Button>
    </form>
  );
}
