export type PaymentMethod = "pix" | "boleto" | "cartao";
export type PaymentProviderId = "mercadopago" | "pagarme" | "stripe";

/**
 * Roteamento comercial do MVP:
 * Pix e boleto nascem no Mercado Pago.
 * Cartão parcelado nasce na Pagar.me, onde o juros de varejo é nativo.
 * Stripe fica como alternativa contratual, não como adquirente principal.
 */
export function selectProvider(method: PaymentMethod): PaymentProviderId {
  if (method === "cartao") return "pagarme";
  return "mercadopago";
}

export function amountForMethod(method: PaymentMethod, quote: { subtotalCents: number; pixCents: number; boletoCents: number }): number {
  if (method === "pix") return quote.pixCents;
  if (method === "boleto") return quote.boletoCents;
  return quote.subtotalCents;
}
