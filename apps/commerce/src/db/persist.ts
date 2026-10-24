import { sql } from "drizzle-orm";
import type { Database } from "./client";
import { orders } from "./schema";

/** Pedido que o checkout já calculou. `publicId` entra na coluna; a API não faz backfill. */
export type OrderWrite = {
  code: string;
  publicId: string | null;
  status: string;
  method: string;
  provider: string;
  installments: number;
  installmentCents: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  cep: string;
  customer: { name: string; email: string; phone: string };
  couponCode?: string;
  couponCents?: number;
  lines: unknown[];
  pix?: { copyPaste: string; expiresAt: string };
  boleto?: { line: string; dueDate: string };
  createdAt: string;
};

/**
 * Insert ou atualização pela chave `code`.
 * O conflito do código reescreve a linha, inclusive `public_id`, quando o token vem preenchido.
 * Sem token, o update não mexe na coluna `public_id` e só grava o status novo dentro do payload.
 * O índice único de `public_id` não entra no ON CONFLICT: outro pedido com o mesmo token é rejeitado.
 */
export async function persistOrder(db: Database, order: OrderWrite) {
  const publicId = order.publicId?.trim() ?? "";
  if (!publicId) {
    await db
      .update(orders)
      .set({
        status: order.status,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        customerPhone: order.customer.phone,
        method: order.method,
        provider: order.provider,
        installments: order.installments,
        subtotalCents: order.subtotalCents,
        shippingCents: order.shippingCents,
        totalCents: order.totalCents,
        cep: order.cep,
        payload: sql`jsonb_set(${orders.payload}, '{status}', to_jsonb(${order.status}::text))`,
      })
      .where(sql`${orders.code} = ${order.code}`);
    return;
  }
  const row = { ...order, publicId };
  await db
    .insert(orders)
    .values({
      code: row.code,
      status: row.status,
      customerName: row.customer.name,
      customerEmail: row.customer.email,
      customerPhone: row.customer.phone,
      method: row.method,
      provider: row.provider,
      installments: row.installments,
      subtotalCents: row.subtotalCents,
      shippingCents: row.shippingCents,
      totalCents: row.totalCents,
      cep: row.cep,
      payload: row,
      publicId,
      createdAt: new Date(row.createdAt),
    })
    .onConflictDoUpdate({
      target: orders.code,
      set: {
        status: sql`excluded.status`,
        customerName: sql`excluded.customer_name`,
        customerEmail: sql`excluded.customer_email`,
        customerPhone: sql`excluded.customer_phone`,
        method: sql`excluded.method`,
        provider: sql`excluded.provider`,
        installments: sql`excluded.installments`,
        subtotalCents: sql`excluded.subtotal_cents`,
        shippingCents: sql`excluded.shipping_cents`,
        totalCents: sql`excluded.total_cents`,
        cep: sql`excluded.cep`,
        payload: sql`excluded.payload`,
        publicId: sql`excluded.public_id`,
      },
    });
}
