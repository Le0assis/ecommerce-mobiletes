/**
 * Leitura da vitrine.
 *
 * O catálogo canônico hoje é `@lume/domain`: a página abre mesmo com a API
 * desligada, e o configurador recalcula cor, bateria, Pix e parcela sem
 * esperar a rede. Quando o Postgres passar a ser a fonte, troque as funções
 * deste arquivo por fetch em `/api/commerce` e mantenha a assinatura.
 * Não duplique a fórmula de preço em outro lugar.
 */
import { motorcycles, type Motorcycle } from "@lume/domain";

export {
  AUTOPROPELIDO_NOTICE,
  accessoriesFor,
  autopropelidoBadge,
  specsForAutopropelido,
  amountForMethod,
  applyDiscount,
  banners,
  brands,
  categoryLabel,
  cities,
  configurePrice,
  estimateFuelSavings,
  estimateRange,
  filterShowroom,
  formatBRL,
  formatCep,
  getDealer,
  getMotorcycle,
  installmentByCount,
  LAUNCH_INTEREST_FREE_UP_TO,
  motorcycles,
  packsFor,
  quoteShipping,
  recommendMotorcycles,
  registrationLabel,
  registrationNote,
  reviews,
  reviewsFor,
  simulateInstallments,
  type Accessory,
  type Banner,
  type Category,
  type Dealer,
  type Motorcycle,
  type RegistrationClass,
  type QuizAnswers,
  type Review,
  type RideMode,
} from "@lume/domain";

export type CatalogOrder = "destaque" | "preco" | "preco-desc" | "velocidade";

const orders: CatalogOrder[] = ["destaque", "preco", "preco-desc", "velocidade"];

export function isCatalogOrder(value: string | undefined): value is CatalogOrder {
  return orders.some((item) => item === value);
}

export function sortProducts(list: Motorcycle[], order: string | undefined): Motorcycle[] {
  const next = [...list];
  if (order === "preco") next.sort((a, b) => a.basePriceCents - b.basePriceCents);
  if (order === "preco-desc") next.sort((a, b) => b.basePriceCents - a.basePriceCents);
  if (order === "velocidade") next.sort((a, b) => b.topSpeedKmh - a.topSpeedKmh);
  return next;
}

/** Modelos vizinhos: mesma categoria pesa mais, depois a faixa de preço. */
export function relatedMotorcycles(product: Motorcycle, limit = 3): Motorcycle[] {
  return motorcycles
    .filter((item) => item.id !== product.id)
    .map((item) => ({
      item,
      score:
        (item.category === product.category ? 3 : 0) +
        (Math.abs(item.basePriceCents - product.basePriceCents) < 1_500_000 ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.item.basePriceCents - b.item.basePriceCents)
    .slice(0, limit)
    .map((entry) => entry.item);
}
