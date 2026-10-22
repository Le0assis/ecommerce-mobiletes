/** Desconto comercial em basis points. 500 = 5%. */
export const PIX_DISCOUNT_BPS = 500;
export const BOLETO_DISCOUNT_BPS = 300;

/**
 * Dinheiro é sempre inteiro, em centavos de real.
 * A única conta com ponto flutuante do domínio é a taxa mensal do parcelamento,
 * e o resultado volta para centavos com um único arredondamento.
 */
export function applyDiscount(cents: number, bps: number): number {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("Valor em centavos inválido.");
  }
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    throw new Error("Desconto em basis points inválido.");
  }
  return Math.round((cents * (10_000 - bps)) / 10_000);
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}
