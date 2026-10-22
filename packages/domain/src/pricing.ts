import { accessories, getMotorcycle, type Accessory, type ColorOption, type Motorcycle } from "./catalog";
import { DomainError } from "./errors";
import { applyDiscount, BOLETO_DISCOUNT_BPS, PIX_DISCOUNT_BPS } from "./money";

export type PriceLine = {
  label: string;
  cents: number;
};

export type PriceQuote = {
  product: Motorcycle;
  color: ColorOption;
  accessories: Accessory[];
  lines: PriceLine[];
  baseCents: number;
  colorCents: number;
  accessoriesCents: number;
  subtotalCents: number;
  pixCents: number;
  boletoCents: number;
  pixDiscountBps: number;
  boletoDiscountBps: number;
};

export function configurePrice(input: {
  productId: string;
  colorId: string;
  accessoryIds?: string[];
}): PriceQuote {
  const product = getMotorcycle(input.productId);
  if (!product) {
    throw new DomainError("produto_inexistente", "Não encontramos esse modelo.");
  }

  const color = product.colors.find((item) => item.id === input.colorId);
  if (!color) {
    throw new DomainError("cor_invalida", "Essa cor não existe neste modelo.");
  }
  if (color.stock <= 0) {
    throw new DomainError("cor_sem_estoque", `${color.name} está esgotada na ${product.name}.`);
  }

  const uniqueIds = [...new Set(input.accessoryIds ?? [])];
  const chosen: Accessory[] = [];
  for (const id of uniqueIds) {
    if (!product.accessoryIds.includes(id)) {
      throw new DomainError("acessorio_incompativel", "Esse acessório não encaixa neste modelo.");
    }
    const accessory = accessories.find((item) => item.id === id);
    if (!accessory) {
      throw new DomainError("acessorio_inexistente", "Acessório não encontrado.");
    }
    chosen.push(accessory);
  }

  const accessoriesCents = chosen.reduce((sum, item) => sum + item.priceCents, 0);
  const subtotalCents = product.basePriceCents + color.priceDeltaCents + accessoriesCents;

  const lines: PriceLine[] = [
    { label: product.name, cents: product.basePriceCents },
    ...(color.priceDeltaCents
      ? [{ label: `Cor ${color.name}`, cents: color.priceDeltaCents }]
      : []),
    ...chosen.map((item) => ({ label: item.name, cents: item.priceCents })),
  ];

  return {
    product,
    color,
    accessories: chosen,
    lines,
    baseCents: product.basePriceCents,
    colorCents: color.priceDeltaCents,
    accessoriesCents,
    subtotalCents,
    pixCents: applyDiscount(subtotalCents, PIX_DISCOUNT_BPS),
    boletoCents: applyDiscount(subtotalCents, BOLETO_DISCOUNT_BPS),
    pixDiscountBps: PIX_DISCOUNT_BPS,
    boletoDiscountBps: BOLETO_DISCOUNT_BPS,
  };
}
