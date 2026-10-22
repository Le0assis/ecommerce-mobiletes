import { z } from "zod";

export const configureBody = z.object({
  productId: z.string().min(1),
  colorId: z.string().min(1),
  accessoryIds: z.array(z.string()).max(8).default([]),
});

export const installmentsBody = z.object({
  amountCents: z.number().int().positive(),
  max: z.number().int().min(1).max(21).optional(),
});

export const shippingBody = z.object({
  cep: z.string().min(8).max(12),
  weightKg: z.number().positive().max(400),
});

export const rangeBody = z.object({
  productId: z.string().min(1),
  speedKmh: z.number().min(10).max(220),
  extraWeightKg: z.number().min(0).max(150),
  mode: z.enum(["eco", "cidade", "esporte"]),
});

export const quizBody = z.object({
  use: z.enum(["cidade", "misto", "estrada"]),
  dailyKm: z.enum(["ate30", "30a80", "80a150", "mais150"]),
  pace: z.enum(["ate50", "ate110", "livre"]),
  budgetCents: z.number().int().positive(),
  outlet: z.boolean(),
  passenger: z.enum(["sozinho", "garupa"]),
});

export const testRideBody = z.object({
  productId: z.string().min(1),
  dealerId: z.string().min(1),
  name: z.string().trim().min(3).max(80),
  email: z.email(),
  phone: z.string().trim().min(10).max(20),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const cartLineBody = z.object({
  productId: z.string().min(1),
  colorId: z.string().min(1),
  accessoryIds: z.array(z.string()).max(8).default([]),
  batteryId: z.string().min(1).optional(),
  qty: z.number().int().min(1).max(2).default(1),
});

export const checkoutBody = z.object({
  lines: z.array(cartLineBody).min(1).max(5),
  cep: z.string().min(8).max(12),
  shippingServiceId: z.enum(["retirada", "dedicado"]),
  method: z.enum(["pix", "boleto", "cartao"]),
  installments: z.number().int().min(1).max(21).default(1),
  couponCode: z.string().trim().max(20).optional(),
  customer: z.object({
    name: z.string().trim().min(3).max(80),
    email: z.email(),
    phone: z.string().trim().min(10).max(20),
  }),
});

export const reviewBody = z.object({
  productId: z.string().min(1),
  city: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(10).max(800),
});

export const serviceBody = z.object({
  dealerId: z.string().min(1),
  productId: z.string().min(1),
  name: z.string().trim().min(3).max(80),
  email: z.email(),
  phone: z.string().trim().min(10).max(20),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().min(8).max(400),
});

export const tradeInBody = z.object({
  name: z.string().trim().min(3).max(80),
  email: z.email(),
  phone: z.string().trim().min(10).max(20),
  brand: z.string().trim().min(2).max(40),
  model: z.string().trim().min(1).max(60),
  year: z.number().int().min(1990).max(2030),
  km: z.number().int().min(0).max(500_000),
  city: z.string().trim().min(2).max(60),
});

export const authRequestBody = z.object({
  email: z.email(),
});

export const authVerifyBody = z.object({
  email: z.email(),
  code: z.string().trim().min(4).max(40),
});

export const stockPatchBody = z.object({
  productId: z.string().min(1),
  colorId: z.string().min(1),
  stock: z.number().int().min(0).max(999),
});

export type CheckoutBody = z.infer<typeof checkoutBody>;
export type TestRideBody = z.infer<typeof testRideBody>;
