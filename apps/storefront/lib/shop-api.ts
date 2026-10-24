/**
 * Escritas da vitrine.
 *
 * Tudo que muda pedido ou review passa por aqui e chega na API
 * em `/api/commerce` (rewrite para o Hono). A API recalcula preço, frete e
 * parcela. Se o review não alcançar a API, o relato fica só neste navegador,
 * marcado como pendente, para a página não fingir que publicou.
 */
import { commerce } from "@/lib/commerce";

export type PlacedOrder = {
  code: string;
  publicId?: string;
  status: string;
  method: string;
  provider: string;
  installments: number;
  installmentCents: number;
  totalCents: number;
  subtotalCents?: number;
  shippingCents?: number;
  pix?: { copyPaste: string; expiresAt: string };
  boleto?: { line: string; dueDate: string };
};

export type CheckoutInput = {
  lines: { productId: string; colorId: string; accessoryIds: string[]; qty: number }[];
  cep: string;
  shippingServiceId: string;
  method: "pix" | "boleto" | "cartao";
  installments: number;
  couponCode?: string;
  customer: { name: string; email: string; phone: string };
};

export type LocalReview = {
  id: string;
  productSlug: string;
  city: string;
  rating: number;
  title: string;
  body: string;
  monthsUsing: number;
  pending: true;
};

const pendingKey = "lume-reviews-pending";
const pendingEvent = "lume-reviews-pending-change";

export function subscribePendingReviews(listener: () => void) {
  window.addEventListener(pendingEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(pendingEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

export function pendingReviewsRaw() {
  return localStorage.getItem(pendingKey) ?? "";
}

export function parsePendingReviews(raw: string): LocalReview[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocalReview[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.productSlug === "string" && typeof item.title === "string");
  } catch {
    return [];
  }
}

function rememberReview(review: LocalReview) {
  const current = parsePendingReviews(localStorage.getItem(pendingKey) ?? "");
  const next = [review, ...current.filter((item) => item.id !== review.id)].slice(0, 20);
  localStorage.setItem(pendingKey, JSON.stringify(next));
  window.dispatchEvent(new Event(pendingEvent));
}

export async function placeOrder(input: CheckoutInput): Promise<PlacedOrder> {
  const body = await commerce<{ order: PlacedOrder }>("/v1/checkout", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.order;
}

export type TrackingStep = { id: string; done: boolean; current: boolean };

export async function fetchOrder(code: string): Promise<{ order: PlacedOrder; tracking: TrackingStep[] }> {
  return commerce<{ order: PlacedOrder; tracking: TrackingStep[] }>(`/v1/orders/${encodeURIComponent(code)}`);
}

export async function advanceSandbox(code: string): Promise<{ order: PlacedOrder; tracking: TrackingStep[]; message: string }> {
  return commerce(`/v1/orders/${encodeURIComponent(code)}/sandbox`, { method: "POST", body: "{}" });
}

export async function requestSandboxCode(email: string): Promise<{ email: string; message: string }> {
  return commerce("/v1/auth/request", { method: "POST", body: JSON.stringify({ email }) });
}

export async function verifySandboxCode(email: string, code: string): Promise<{ token: string; email: string }> {
  return commerce("/v1/auth/verify", { method: "POST", body: JSON.stringify({ email, code }) });
}

export async function accountOrders(token: string): Promise<{ email: string; orders: PlacedOrder[] }> {
  return commerce("/v1/account/orders", { headers: { authorization: `Bearer ${token}` } });
}

export async function submitReview(input: {
  productId: string;
  city: string;
  rating: number;
  title: string;
  body: string;
}): Promise<{ review: LocalReview; offline: boolean; message: string }> {
  try {
    const body = await commerce<{ review: LocalReview; message: string }>("/v1/reviews", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const review: LocalReview = { ...body.review, pending: true, monthsUsing: body.review.monthsUsing ?? 0 };
    rememberReview(review);
    return {
      review,
      offline: false,
      message: body.message ?? "Recebemos o relato. Ele entra na página depois da moderação.",
    };
  } catch {
    const review: LocalReview = {
      id: `local-${crypto.randomUUID()}`,
      productSlug: input.productId,
      city: input.city,
      rating: input.rating,
      title: input.title,
      body: input.body,
      monthsUsing: 0,
      pending: true,
    };
    rememberReview(review);
    return {
      review,
      offline: true,
      message: "A API não respondeu. O relato ficou só neste navegador e não foi publicado.",
    };
  }
}
