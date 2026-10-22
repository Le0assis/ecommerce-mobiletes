import { isCategory, motorcycles, searchCatalog, type Category, type Motorcycle } from "./catalog";
import { dealers, type Dealer } from "./content";

export type ShowroomQuery = {
  q?: string;
  category?: string;
  city?: string;
};

export type ShowroomResult = {
  products: Motorcycle[];
  dealers: Dealer[];
  category: Category | null;
  city: string;
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
  if (cityKey) {
    const slugs = new Set(dealerHits.flatMap((dealer) => dealer.testRideSlugs));
    products = products.filter((product) => slugs.has(product.slug));
  }

  return { products, dealers: dealerHits, category, city };
}

export function cities(): string[] {
  return [...new Set(dealers.map((dealer) => dealer.city))];
}

export { motorcycles };
