import { autopropelidoBadge } from "./autopropelido";
import { isCategory, motorcycles, searchCatalog, type Category, type Motorcycle } from "./catalog";
import { dealers, type Dealer } from "./content";

export type ShowroomQuery = {
  q?: string;
  category?: string;
  city?: string;
  brand?: string;
  /** `sim` deixa só o autopropelido calculado pelo selo. */
  semCnh?: string;
};

export type ShowroomResult = {
  products: Motorcycle[];
  dealers: Dealer[];
  category: Category | null;
  city: string;
  brand: string;
};

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

export function filterShowroom(input: ShowroomQuery): ShowroomResult {
  const city = input.city?.trim() ?? "";
  const cityKey = fold(city);
  const category = input.category && isCategory(input.category) ? input.category : null;
  const brand = input.brand?.trim() ?? "";
  const brandKey = fold(brand);

  let dealerHits = dealers;
  if (cityKey) {
    dealerHits = dealers.filter((dealer) => {
      const name = fold(dealer.city);
      const uf = fold(dealer.uf);
      return name.includes(cityKey) || uf === cityKey;
    });
  }

  let products = searchCatalog(input.q ?? "");
  if (category) {
    products = products.filter((product) => product.category === category);
  }
  if (brandKey) {
    products = products.filter((product) => fold(product.brand) === brandKey);
  }
  if (fold(input.semCnh ?? "") === "sim") {
    products = products.filter((product) => autopropelidoBadge(product).eligible);
  }
  if (cityKey) {
    const slugs = new Set(dealerHits.flatMap((dealer) => dealer.testRideSlugs));
    products = products.filter((product) => slugs.has(product.slug));
  }

  return { products, dealers: dealerHits, category, city, brand };
}

export function cities(): string[] {
  return [...new Set(dealers.map((dealer) => dealer.city))];
}

export function brands(): string[] {
  return [...new Set(motorcycles.map((product) => product.brand))];
}

export { motorcycles };
