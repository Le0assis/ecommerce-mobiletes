import { BikeSvg } from "@/components/bike-svg";
import { CatalogDown } from "@/components/catalog-state";
import { ComparePicker } from "@/components/compare-picker";
import {
  applyDiscount,
  categoryName,
  formatBRL,
  illustrationCategory,
  installmentByCount,
  loadProducts,
  measure,
  PIX_DISCOUNT_BPS,
  registrationCopy,
} from "@/lib/catalog";
import Link from "next/link";

export async function CompareTable({ searchParams }: PageProps<"/comparar">) {
  const loaded = await loadProducts();
  if (!loaded.ok) return <CatalogDown message={loaded.message} />;
  const query = await searchParams;
  const raw = typeof query.modelos === "string" ? query.modelos : "apex,via,city";
  const selected = raw
    .split(",")
    .map((slug) => loaded.data.find((item) => item.slug === slug.trim()))
    .filter((item) => item !== undefined)
    .slice(0, 3);
  const rows: { label: string; hint?: string; read: (item: (typeof selected)[number]) => string }[] = [
    { label: "Marca", read: (item) => item.brand },
    { label: "Categoria", read: (item) => categoryName(item.category) },
    { label: "Habilitação", read: (item) => registrationCopy(item.registrationClass).label },
    { label: "Preço", read: (item) => formatBRL(item.basePriceCents) },
    { label: "21× sem juros", read: (item) => formatBRL(installmentByCount(item.basePriceCents, 21).installmentCents) },
    { label: "Pix −5%", read: (item) => formatBRL(applyDiscount(item.basePriceCents, PIX_DISCOUNT_BPS)) },
    { label: "Autonomia (declarada)", hint: "Autonomia declarada pelo fabricante", read: (item) => measure(item.rangeKm, "km") },
    { label: "Velocidade", read: (item) => measure(item.topSpeedKmh, "km/h") },
    { label: "Bateria", read: (item) => measure(item.batteryKwh, "kWh") },
    { label: "Peso", read: (item) => measure(item.weightKg, "kg") },
    { label: "Banco", read: (item) => measure(item.seatHeightMm, "mm") },
    { label: "Potência", read: (item) => measure(item.powerKw, "kW") },
    { label: "Carga em casa", read: (item) => measure(item.chargeHours, "h") },
  ];

  return (
    <main id="conteudo" className="mx-auto max-w-6xl px-5 pt-28 pb-16">
      <h1 className="display text-6xl md:text-8xl">Compare.</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">Escolha até três modelos. O preço é o de entrada, sem acessório.</p>
      <ComparePicker options={loaded.data.map((item) => ({ slug: item.slug, name: item.name }))} selected={selected.map((item) => item.slug)} />
      {selected.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Marque ao menos um modelo.</p>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr>
                <th className="p-3" />
                {selected.map((product) => (
                  <th key={product.id} className="p-3 align-bottom font-normal">
                    <BikeSvg variant={illustrationCategory(product.category)} color="#f4f4f2" className="h-28 w-full" title={product.name} />
                    <Link href={`/motos/${product.slug}`} className="display mt-2 block text-4xl">
                      {product.name.replace("LUME ", "")}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-white/10">
                  <th className="p-3 text-sm font-normal text-muted-foreground" aria-label={row.hint} title={row.hint}>
                    {row.label}
                  </th>
                  {selected.map((product) => (
                    <td key={product.id} className="nums p-3">
                      {row.read(product)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
