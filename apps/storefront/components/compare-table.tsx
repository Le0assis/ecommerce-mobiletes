import { BikeSvg } from "@/components/bike-svg";
import { ComparePicker } from "@/components/compare-picker";
import { categoryLabel, formatBRL, getMotorcycle, installmentByCount, registrationLabel } from "@/lib/catalog";
import Link from "next/link";

export async function CompareTable({ searchParams }: PageProps<"/comparar">) {
  const query = await searchParams;
  const raw = typeof query.modelos === "string" ? query.modelos : "apex,via,city";
  const selected = raw
    .split(",")
    .map((slug) => getMotorcycle(slug.trim()))
    .filter((item) => item !== undefined)
    .slice(0, 3);
  const rows: { label: string; read: (item: (typeof selected)[number]) => string }[] = [
    { label: "Marca", read: (item) => item.brand },
    { label: "Categoria", read: (item) => categoryLabel[item.category] },
    { label: "Habilitação", read: (item) => registrationLabel[item.registrationClass] },
    { label: "Preço", read: (item) => formatBRL(item.basePriceCents) },
    { label: "21× sem juros", read: (item) => formatBRL(installmentByCount(item.basePriceCents, 21).installmentCents) },
    { label: "Pix −5%", read: (item) => formatBRL(Math.round(item.basePriceCents * 0.95)) },
    { label: "Autonomia", read: (item) => `${item.rangeKm} km` },
    { label: "Velocidade", read: (item) => `${item.topSpeedKmh} km/h` },
    { label: "Bateria", read: (item) => `${item.batteryKwh} kWh` },
    { label: "Peso", read: (item) => `${item.weightKg} kg` },
    { label: "Banco", read: (item) => `${item.seatHeightMm} mm` },
    { label: "Potência", read: (item) => `${item.powerKw} kW` },
    { label: "Carga em casa", read: (item) => `${item.chargeHours} h` },
  ];

  return (
    <main id="conteudo" className="mx-auto max-w-6xl px-5 pt-28 pb-16">
      <h1 className="display text-6xl md:text-8xl">Compare.</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">Escolha até três modelos. O preço é o de entrada, sem acessório.</p>
      <ComparePicker selected={selected.map((item) => item.slug)} />
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
                    <BikeSvg variant={product.category} color="#f4f4f2" className="h-28 w-full" title={product.name} />
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
                  <th className="p-3 text-sm font-normal text-muted-foreground">{row.label}</th>
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
