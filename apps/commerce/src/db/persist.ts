import { createDatabase, type Database } from "./client";
import { orders, testRideBookings } from "./schema";

type OrderPayload = {
  code: string;
  status: string;
  method: string;
  provider: string;
  installments: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  cep: string;
  customer: { name: string; email: string; phone: string };
};

type BookingPayload = {
  id: string;
  productId: string;
  dealerId: string;
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
};

let database: Database | null | undefined;

function db(): Database | null {
  if (database !== undefined) return database;
  const url = process.env.DATABASE_URL;
  if (!url) {
    database = null;
    return null;
  }
  try {
    database = createDatabase(url).db;
    return database;
  } catch (error) {
    console.error(JSON.stringify({ msg: "postgres_indisponivel", error: error instanceof Error ? error.message : "erro" }));
    database = null;
    return null;
  }
}

export function persistOrder(order: OrderPayload) {
  const client = db();
  if (!client) return;
  void client
    .insert(orders)
    .values({
      code: order.code,
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
      payload: order,
    })
    .catch((error: unknown) => {
      console.error(JSON.stringify({ msg: "pedido_nao_gravado", error: error instanceof Error ? error.message : "erro" }));
    });
}

export function persistBooking(booking: BookingPayload) {
  const client = db();
  if (!client) return;
  void client
    .insert(testRideBookings)
    .values(booking)
    .catch((error: unknown) => {
      console.error(JSON.stringify({ msg: "test_ride_nao_gravado", error: error instanceof Error ? error.message : "erro" }));
    });
}
