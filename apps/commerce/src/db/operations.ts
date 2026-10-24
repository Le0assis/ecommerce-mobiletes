import { and, desc, eq, lt, sql } from "drizzle-orm";
import { ADMIN_SESSION_MS, sessionIsCurrent } from "../catalog-routes";
import { memoryLoginCodes, type LoginCodeRepo, type StoredCode } from "../login-code";
import type { Database } from "./client";
import { persistOrder } from "./persist";
import { colorStock, exchanges, loginCodes, orders, serviceBookings, sessions, testRideBookings } from "./schema";

export type StoredOrder = {
  code: string;
  publicId: string;
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

export type TestRideRecord = {
  id: string;
  productId: string;
  dealerId: string;
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  createdAt: string;
};

export type ExchangeRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  city: string;
  createdAt: string;
};

export type ServiceRecord = {
  id: string;
  dealerId: string;
  productId: string;
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  note: string;
  createdAt: string;
};

export type OperationStore = {
  hasOrderCode(code: string): Promise<boolean>;
  hasPublicId(publicId: string): Promise<boolean>;
  saveOrder(order: StoredOrder): Promise<void>;
  saveOrderStatus(order: StoredOrder): Promise<void>;
  orderByCode(code: string): Promise<StoredOrder | undefined>;
  orderByPublicId(publicId: string, ownerEmail?: string): Promise<StoredOrder | undefined>;
  ordersForEmail(email: string): Promise<StoredOrder[]>;
  orderCount(): Promise<number>;
  recentOrders(limit: number): Promise<StoredOrder[]>;
  saveCustomerSession(token: string, email: string, createdAt: number): Promise<void>;
  customerEmail(token: string, now: number): Promise<string | undefined>;
  saveAdminSession(token: string, createdAt: number): Promise<void>;
  adminSession(token: string, now: number): Promise<{ createdAt: number } | undefined>;
  deleteSession(token: string): Promise<void>;
  loginCodes: LoginCodeRepo;
  saveTestRide(booking: TestRideRecord): Promise<void>;
  testRideCount(): Promise<number>;
  saveExchange(row: ExchangeRecord): Promise<void>;
  exchangeCount(): Promise<number>;
  recentExchanges(limit: number): Promise<ExchangeRecord[]>;
  saveService(row: ServiceRecord): Promise<void>;
  serviceCount(): Promise<number>;
  recentServices(limit: number): Promise<ServiceRecord[]>;
  setColorStock(productId: string, colorId: string, stock: number): Promise<void>;
  colorStockMap(): Promise<Map<string, number>>;
};

function millis(value: Date | string | number | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function asOrder(row: { code: string; status: string; publicId: string | null; payload: unknown }): StoredOrder {
  const payload = typeof row.payload === "string" ? (JSON.parse(row.payload) as StoredOrder) : (row.payload as StoredOrder);
  return {
    ...payload,
    code: row.code,
    status: row.status,
    publicId: row.publicId ?? payload.publicId,
  };
}

async function countOf(db: Database, table: typeof orders | typeof testRideBookings | typeof exchanges | typeof serviceBookings) {
  const [row] = await db.select({ value: sql<number>`cast(count(*) as int)` }).from(table);
  return Number(row?.value ?? 0);
}

export function createMemoryStore(seed: {
  orders?: Map<string, StoredOrder>;
  bookings?: TestRideRecord[];
  stock?: Map<string, number>;
} = {}): OperationStore {
  const orders = seed.orders ?? new Map<string, StoredOrder>();
  const bookings = seed.bookings ?? [];
  const tradeIns: ExchangeRecord[] = [];
  const services: ServiceRecord[] = [];
  const stock = seed.stock ?? new Map<string, number>();
  const customers = new Map<string, string>();
  const admins = new Map<string, { createdAt: number }>();

  return {
    async hasOrderCode(code) {
      return orders.has(code);
    },
    async hasPublicId(publicId) {
      return [...orders.values()].some((order) => order.publicId === publicId);
    },
    async saveOrder(order) {
      orders.set(order.code, order);
    },
    async saveOrderStatus(order) {
      orders.set(order.code, order);
    },
    async orderByCode(code) {
      return orders.get(code);
    },
    async orderByPublicId(publicId, ownerEmail) {
      const owner = ownerEmail?.trim().toLowerCase();
      return [...orders.values()].find((order) => order.publicId === publicId && (!owner || order.customer.email.toLowerCase() === owner));
    },
    async ordersForEmail(email) {
      return [...orders.values()].filter((order) => order.customer.email.toLowerCase() === email);
    },
    async orderCount() {
      return orders.size;
    },
    async recentOrders(limit) {
      return [...orders.values()].slice(-limit).reverse();
    },
    async saveCustomerSession(token, email) {
      customers.set(token, email);
    },
    async customerEmail(token) {
      return customers.get(token);
    },
    async saveAdminSession(token, createdAt) {
      admins.set(token, { createdAt });
    },
    async adminSession(token, now) {
      const session = admins.get(token);
      if (!sessionIsCurrent(session, now)) {
        if (session) admins.delete(token);
        return undefined;
      }
      return session;
    },
    async deleteSession(token) {
      customers.delete(token);
      admins.delete(token);
    },
    loginCodes: memoryLoginCodes,
    async saveTestRide(booking) {
      bookings.push(booking);
    },
    async testRideCount() {
      return bookings.length;
    },
    async saveExchange(row) {
      tradeIns.push(row);
    },
    async exchangeCount() {
      return tradeIns.length;
    },
    async recentExchanges(limit) {
      return tradeIns.slice(-limit).reverse();
    },
    async saveService(row) {
      services.push(row);
    },
    async serviceCount() {
      return services.length;
    },
    async recentServices(limit) {
      return services.slice(-limit).reverse();
    },
    async setColorStock(productId, colorId, value) {
      stock.set(`${productId}:${colorId}`, value);
    },
    async colorStockMap() {
      return stock;
    },
  };
}

function loginRepo(db: Database): LoginCodeRepo {
  return {
    async get(email) {
      const [row] = await db.select().from(loginCodes).where(eq(loginCodes.email, email));
      if (!row) return null;
      const expiresAt = millis(row.expiresAt);
      const sentAt = millis(row.sentAt);
      if (expiresAt == null || sentAt == null) return null;
      return { hash: row.hash, salt: row.salt, expiresAt, attempts: row.attempts, sentAt };
    },
    async save(email, row: StoredCode) {
      const values = {
        email,
        hash: row.hash,
        salt: row.salt,
        expiresAt: new Date(row.expiresAt),
        attempts: row.attempts,
        sentAt: new Date(row.sentAt),
      };
      await db
        .insert(loginCodes)
        .values(values)
        .onConflictDoUpdate({
          target: loginCodes.email,
          set: {
            hash: values.hash,
            salt: values.salt,
            expiresAt: values.expiresAt,
            attempts: 0,
            sentAt: values.sentAt,
          },
        });
    },
    async bump(email) {
      const updated = await db
        .update(loginCodes)
        .set({ attempts: sql`${loginCodes.attempts} + 1` })
        .where(and(eq(loginCodes.email, email), lt(loginCodes.attempts, 5)))
        .returning({ attempts: loginCodes.attempts });
      if (updated.length > 0) return updated[0].attempts;
      const [row] = await db.select({ attempts: loginCodes.attempts }).from(loginCodes).where(eq(loginCodes.email, email));
      return row ? row.attempts : null;
    },
    async remove(email) {
      await db.delete(loginCodes).where(eq(loginCodes.email, email));
    },
  };
}

export function createPostgresStore(db: Database): OperationStore {
  return {
    async hasOrderCode(code) {
      const [row] = await db.select({ code: orders.code }).from(orders).where(eq(orders.code, code)).limit(1);
      return Boolean(row);
    },
    async hasPublicId(publicId) {
      const [row] = await db.select({ code: orders.code }).from(orders).where(eq(orders.publicId, publicId)).limit(1);
      return Boolean(row);
    },
    async saveOrder(order) {
      await persistOrder(db, order);
    },
    async saveOrderStatus(order) {
      await persistOrder(db, order);
    },
    async orderByCode(code) {
      const [row] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
      return row ? asOrder(row) : undefined;
    },
    async orderByPublicId(publicId, ownerEmail) {
      const owner = ownerEmail?.trim().toLowerCase();
      const where = owner
        ? sql`${orders.publicId} = ${publicId} and lower(${orders.customerEmail}) = ${owner}`
        : sql`${orders.publicId} = ${publicId}`;
      const [row] = await db.select().from(orders).where(where).limit(1);
      if (!row?.publicId) return undefined;
      return asOrder(row);
    },
    async ordersForEmail(email) {
      const rows = await db.select().from(orders).where(sql`lower(${orders.customerEmail}) = ${email}`);
      return rows.map(asOrder);
    },
    async orderCount() {
      return countOf(db, orders);
    },
    async recentOrders(limit) {
      const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
      return rows.map(asOrder);
    },
    async saveCustomerSession(token, email, createdAt) {
      await db.insert(sessions).values({
        token,
        kind: "customer",
        email,
        createdAt: new Date(createdAt),
        expiresAt: null,
      });
    },
    async customerEmail(token, now) {
      const [row] = await db.select().from(sessions).where(and(eq(sessions.token, token), eq(sessions.kind, "customer"))).limit(1);
      if (!row?.email) return undefined;
      const expires = millis(row.expiresAt);
      if (expires != null && expires <= now) {
        await db.delete(sessions).where(eq(sessions.token, token));
        return undefined;
      }
      return row.email;
    },
    async saveAdminSession(token, createdAt) {
      await db.insert(sessions).values({
        token,
        kind: "admin",
        email: null,
        createdAt: new Date(createdAt),
        expiresAt: new Date(createdAt + ADMIN_SESSION_MS),
      });
    },
    async adminSession(token, now) {
      const [row] = await db.select().from(sessions).where(and(eq(sessions.token, token), eq(sessions.kind, "admin"))).limit(1);
      if (!row) return undefined;
      const createdAt = millis(row.createdAt) ?? now;
      const expires = millis(row.expiresAt) ?? createdAt + ADMIN_SESSION_MS;
      if (now >= expires) {
        await db.delete(sessions).where(eq(sessions.token, token));
        return undefined;
      }
      return { createdAt };
    },
    async deleteSession(token) {
      await db.delete(sessions).where(eq(sessions.token, token));
    },
    loginCodes: loginRepo(db),
    async saveTestRide(booking) {
      await db.insert(testRideBookings).values({
        ...booking,
        createdAt: new Date(booking.createdAt),
      });
    },
    async testRideCount() {
      return countOf(db, testRideBookings);
    },
    async saveExchange(row) {
      await db.insert(exchanges).values({
        ...row,
        createdAt: new Date(row.createdAt),
      });
    },
    async exchangeCount() {
      return countOf(db, exchanges);
    },
    async recentExchanges(limit) {
      const rows = await db.select().from(exchanges).orderBy(desc(exchanges.createdAt)).limit(limit);
      return rows.map((row) => ({ ...row, createdAt: new Date(millis(row.createdAt) ?? Date.now()).toISOString() }));
    },
    async saveService(row) {
      await db.insert(serviceBookings).values({
        ...row,
        createdAt: new Date(row.createdAt),
      });
    },
    async serviceCount() {
      return countOf(db, serviceBookings);
    },
    async recentServices(limit) {
      const rows = await db.select().from(serviceBookings).orderBy(desc(serviceBookings.createdAt)).limit(limit);
      return rows.map((row) => ({ ...row, createdAt: new Date(millis(row.createdAt) ?? Date.now()).toISOString() }));
    },
    async setColorStock(productId, colorId, stock) {
      await db
        .insert(colorStock)
        .values({ productId, colorId, stock })
        .onConflictDoUpdate({
          target: [colorStock.productId, colorStock.colorId],
          set: { stock },
        });
    },
    async colorStockMap() {
      const rows = await db.select().from(colorStock);
      return new Map(rows.map((row) => [`${row.productId}:${row.colorId}`, row.stock]));
    },
  };
}
