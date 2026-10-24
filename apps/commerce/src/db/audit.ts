import { sql } from "drizzle-orm";
import type { Database } from "./client";

/** Status que o checkout e o sandbox gravam. Fora disso a auditoria aponta a linha. */
export const ORDER_STATUSES = ["aguardando_pagamento", "pago", "em_preparo", "em_transporte", "entregue", "recusado"] as const;

/** Parcela inteira, de 1 a 21. Dinheiro continua em centavos inteiros. */
export const INSTALLMENT_MIN = 1;
export const INSTALLMENT_MAX = 21;

export type AuditReport = {
  negativeCents: { code: string; subtotalCents: number; shippingCents: number; totalCents: number }[];
  duplicateEmails: { email: string; ids: string[] }[];
  orphanTestRides: { id: string; dealerId: string; productId: string; missingDealer: boolean; missingProduct: boolean }[];
  invalidOrders: { code: string; status: string; installments: number }[];
};

export function auditIsClean(report: AuditReport) {
  return (
    report.negativeCents.length === 0 &&
    report.duplicateEmails.length === 0 &&
    report.orphanTestRides.length === 0 &&
    report.invalidOrders.length === 0
  );
}

/** Só SELECT. Não apaga nem corrige. */
export async function auditDatabase(db: Database): Promise<AuditReport> {
  const negative = rows(
    await db.execute(sql`
      select code, subtotal_cents, shipping_cents, total_cents
      from orders
      where subtotal_cents < 0 or shipping_cents < 0 or total_cents < 0
      order by code
    `),
  );
  const emails = rows(
    await db.execute(sql`
      select id, email
      from customers
      where lower(btrim(email)) in (
        select lower(btrim(email))
        from customers
        group by lower(btrim(email))
        having count(*) > 1
      )
      order by lower(btrim(email)), id
    `),
  );
  const rides = rows(
    await db.execute(sql`
      select b.id, b.dealer_id, b.product_id,
        not exists (select 1 from dealers d where d.id = b.dealer_id) as missing_dealer,
        not exists (select 1 from products p where p.id = b.product_id) as missing_product
      from test_ride_bookings b
      where not exists (select 1 from dealers d where d.id = b.dealer_id)
         or not exists (select 1 from products p where p.id = b.product_id)
      order by b.id
    `),
  );
  const invalid = rows(
    await db.execute(sql`
      select code, status, installments
      from orders
      where status not in ('aguardando_pagamento', 'pago', 'em_preparo', 'em_transporte', 'entregue', 'recusado')
         or installments < ${INSTALLMENT_MIN}
         or installments > ${INSTALLMENT_MAX}
      order by code
    `),
  );

  const byEmail = new Map<string, string[]>();
  for (const row of emails) {
    const email = String(row.email).trim().toLowerCase();
    const ids = byEmail.get(email) ?? [];
    ids.push(String(row.id));
    byEmail.set(email, ids);
  }

  return {
    negativeCents: negative.map((row) => ({
      code: String(row.code),
      subtotalCents: Number(row.subtotal_cents),
      shippingCents: Number(row.shipping_cents),
      totalCents: Number(row.total_cents),
    })),
    duplicateEmails: [...byEmail.entries()].map(([email, ids]) => ({ email, ids })),
    orphanTestRides: rides.map((row) => ({
      id: String(row.id),
      dealerId: String(row.dealer_id),
      productId: String(row.product_id),
      missingDealer: flag(row.missing_dealer),
      missingProduct: flag(row.missing_product),
    })),
    invalidOrders: invalid.map((row) => ({
      code: String(row.code),
      status: String(row.status),
      installments: Number(row.installments),
    })),
  };
}

export function formatAudit(report: AuditReport) {
  const lines = ["Auditoria somente leitura. Nenhum delete.", ""];
  lines.push(`Centavos negativos em orders: ${report.negativeCents.length}`);
  for (const row of report.negativeCents) {
    lines.push(`- ${row.code} subtotal_cents=${row.subtotalCents} shipping_cents=${row.shippingCents} total_cents=${row.totalCents}`);
  }
  lines.push(`E-mails duplicados em customers: ${report.duplicateEmails.length}`);
  for (const row of report.duplicateEmails) {
    lines.push(`- ${row.email} ids=${row.ids.join(",")}`);
  }
  lines.push(`Test rides órfãos: ${report.orphanTestRides.length}`);
  for (const row of report.orphanTestRides) {
    const missing = [
      row.missingDealer ? `sem dealer ${row.dealerId}` : "",
      row.missingProduct ? `sem produto ${row.productId}` : "",
    ].filter(Boolean);
    lines.push(`- ${row.id} ${missing.join(", ")}`);
  }
  lines.push(`Pedidos com status ou parcelas fora do conjunto: ${report.invalidOrders.length}`);
  for (const row of report.invalidOrders) {
    lines.push(`- ${row.code} status=${row.status} installments=${row.installments}`);
  }
  lines.push("");
  lines.push(`Status esperado: ${ORDER_STATUSES.join(", ")}.`);
  lines.push(`Parcelas: inteiro de ${INSTALLMENT_MIN} a ${INSTALLMENT_MAX}.`);
  if (auditIsClean(report)) lines.push("Nenhum achado.");
  return lines.join("\n");
}

function flag(value: unknown) {
  return value === true || value === "t" || value === "true" || value === 1 || value === "1";
}

function rows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) {
    return result.rows as Record<string, unknown>[];
  }
  return [];
}
