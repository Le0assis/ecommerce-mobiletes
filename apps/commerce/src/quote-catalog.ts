import {
  DomainError,
  applyDiscount,
  BOLETO_DISCOUNT_BPS,
  PIX_DISCOUNT_BPS,
  autopropelidoBadge,
  type Accessory,
  type AccessoryGroup,
  type Motorcycle,
  type PriceLine,
  type PriceQuote,
} from "@lume/domain";
import type { CatalogAccessory, CatalogProduct } from "./catalog-store";

const groups = new Set<AccessoryGroup>(["protecao", "conforto", "carga", "energia"]);

export type CatalogLine = {
  productId: string;
  colorId: string;
  accessoryIds?: string[];
  batteryId?: string;
};

function groupOf(kind: string): AccessoryGroup {
  return groups.has(kind as AccessoryGroup) ? (kind as AccessoryGroup) : "carga";
}

/**
 * Preço de um produto do cadastro. A variante é a cor. Sem `batteryId`, entra a série com delta zero.
 * O peso do frete é o da ficha; zero ou ausente não vira número inventado.
 */
export function quoteCatalogProduct(
  product: CatalogProduct,
  line: CatalogLine,
  catalogAccessories: readonly CatalogAccessory[],
): PriceQuote {
  const color = product.variants.find((item) => item.id === line.colorId && item.active);
  if (!color) {
    throw new DomainError("cor_invalida", "Essa cor não existe neste modelo.");
  }
  if (color.stock <= 0) {
    throw new DomainError("cor_sem_estoque", `${color.colorName} está esgotada na ${product.name}.`);
  }

  const links = new Set(product.accessories.map((item) => item.accessoryId));
  const byId = new Map(catalogAccessories.map((item) => [item.id, item]));
  const chosen: Accessory[] = [];
  for (const id of [...new Set(line.accessoryIds ?? [])]) {
    if (!links.has(id)) {
      throw new DomainError("acessorio_incompativel", "Esse acessório não encaixa neste modelo.");
    }
    const accessory = byId.get(id);
    if (!accessory) {
      throw new DomainError("acessorio_inexistente", "Acessório não encontrado.");
    }
    chosen.push({
      id: accessory.id,
      name: accessory.name,
      description: "",
      priceCents: accessory.priceCents,
      group: groupOf(accessory.kind),
    });
  }

  if (line.batteryId && line.batteryId !== "serie") {
    throw new DomainError("bateria_invalida", "Essa bateria não existe neste modelo.");
  }
  const battery = {
    id: "serie",
    name: "Série",
    kwh: 0,
    rangeKm: product.specs.rangeKmDeclared ?? 0,
    priceDeltaCents: 0,
    stock: 99,
  };

  const accessoriesCents = chosen.reduce((sum, item) => sum + item.priceCents, 0);
  const subtotalCents = product.basePriceCents + color.priceDeltaCents + battery.priceDeltaCents + accessoriesCents;
  const lines: PriceLine[] = [
    { label: product.name, cents: product.basePriceCents },
    ...(color.priceDeltaCents ? [{ label: `Cor ${color.colorName}`, cents: color.priceDeltaCents }] : []),
    ...chosen.map((item) => ({ label: item.name, cents: item.priceCents })),
  ];
  const weightKg = product.specs.weightKg != null && product.specs.weightKg > 0 ? product.specs.weightKg : 0;
  const badge = autopropelidoBadge(product.specs);
  const motorcycle: Motorcycle = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    category: product.category === "citycoco" ? "scooter" : product.category,
    brand: product.brand,
    registrationClass: badge.eligible ? "autopropelido" : "ciclomotor",
    description: product.description,
    basePriceCents: product.basePriceCents,
    topSpeedKmh: product.specs.topSpeedKmh ?? 0,
    rangeKm: product.specs.rangeKmDeclared ?? 0,
    powerKw: product.specs.powerPeakW == null ? 0 : product.specs.powerPeakW / 1000,
    powerNominalW: product.specs.powerNominalW,
    widthCm: product.specs.widthCm,
    wheelbaseCm: product.specs.wheelbaseCm,
    torqueNm: 0,
    batteryKwh: 0,
    weightKg,
    seatHeightMm: product.specs.seatHeightMm ?? 0,
    chargeHours: product.specs.chargeHours ?? 0,
    fastChargeMin: null,
    licenseNote: "verifique as regras da sua cidade",
    colors: product.variants.filter((item) => item.active).map((item) => ({
      id: item.id,
      name: item.colorName,
      hex: item.colorHex,
      priceDeltaCents: item.priceDeltaCents,
      stock: item.stock,
    })),
    batteries: [battery],
    accessoryIds: product.accessories.map((item) => item.accessoryId),
    optimalSpeedKmh: 0,
  };

  return {
    product: motorcycle,
    color: {
      id: color.id,
      name: color.colorName,
      hex: color.colorHex,
      priceDeltaCents: color.priceDeltaCents,
      stock: color.stock,
    },
    battery,
    accessories: chosen,
    lines,
    baseCents: product.basePriceCents,
    colorCents: color.priceDeltaCents,
    batteryCents: 0,
    accessoriesCents,
    subtotalCents,
    pixCents: applyDiscount(subtotalCents, PIX_DISCOUNT_BPS),
    boletoCents: applyDiscount(subtotalCents, BOLETO_DISCOUNT_BPS),
    pixDiscountBps: PIX_DISCOUNT_BPS,
    boletoDiscountBps: BOLETO_DISCOUNT_BPS,
  };
}
