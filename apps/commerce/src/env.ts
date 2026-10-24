import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvFile() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const DEV_ADMIN_TOKEN = "dev-admin-token";

export function adminToken(): string | null {
  const token = process.env.ADMIN_TOKEN;
  if (token) return token;
  if (process.env.NODE_ENV === "production") return null;
  return DEV_ADMIN_TOKEN;
}

/** Em produção a API não sobe com token ausente, curto ou igual ao de desenvolvimento. */
export function productionAdminTokenError(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  const token = process.env.ADMIN_TOKEN?.trim() ?? "";
  if (token.length < 24 || token === DEV_ADMIN_TOKEN) {
    return "ADMIN_TOKEN ausente ou fraco. A API não sobe em produção.";
  }
  return null;
}

/** Em produção a semente em memória não substitui o Postgres. */
export function productionDatabaseError(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  if (!process.env.DATABASE_URL?.trim()) return "DATABASE_URL ausente. A API não sobe em produção.";
  return null;
}

export function storefrontOrigins() {
  return (process.env.STOREFRONT_ORIGIN ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Lê a allowlist a cada pedido. Produção sem origem listada não devolve CORS. */
export function resolveCorsOrigin(requestOrigin: string): string | null {
  const origin = requestOrigin.trim();
  const allowed = storefrontOrigins();
  if (process.env.NODE_ENV === "production") {
    if (!origin || !allowed.includes(origin)) return null;
    return origin;
  }
  if (allowed.length === 0) return origin || "*";
  if (!origin) return "*";
  return allowed.includes(origin) ? origin : null;
}
