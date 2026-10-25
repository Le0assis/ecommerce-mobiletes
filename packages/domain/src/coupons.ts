import { DomainError } from "./errors";

export type Coupon = {
  code: string;
  label: string;
  /** Desconto percentual em basis points, sobre o subtotal configurado, antes do Pix ou do boleto. */
  bps?: number;
  /** Desconto fixo em centavos, no mesmo subtotal. Frete fica de fora. */
  cents?: number;
  minSubtotalCents: number;
};

export const coupons: Coupon[] = [
  { code: "LUME10", label: "10% na moto configurada", bps: 1_000, minSubtotalCents: 1_000_000 },
  { code: "OFICINA", label: "R$ 300 de oficina", cents: 30_000, minSubtotalCents: 1_000_000 },
];

export function findCoupon(code: string | undefined): Coupon | null {
  const normalized = code?.trim().toUpperCase() ?? "";
  if (!normalized) return null;
  return coupons.find((item) => item.code === normalized) ?? null;
}

export function couponDiscount(subtotalCents: number, code: string | undefined): { code: string; label: string; discountCents: number } | null {
  const coupon = findCoupon(code);
  if (!coupon) {
    if (code?.trim()) throw new DomainError("cupom_invalido", "Esse cupom não existe.");
    return null;
  }
  if (subtotalCents < coupon.minSubtotalCents) {
    throw new DomainError("cupom_invalido", "O cupom pede um subtotal maior, antes do frete.");
  }
  const percent = coupon.bps ? Math.round((subtotalCents * coupon.bps) / 10_000) : 0;
  const fixed = coupon.cents ?? 0;
  const discountCents = Math.min(subtotalCents, percent + fixed);
  return { code: coupon.code, label: coupon.label, discountCents };
}
