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

const MIN_ADMIN_TOKEN = 32;

export function adminToken(): string | null {
  const token = process.env.ADMIN_TOKEN?.trim() ?? "";
  if (token.length < MIN_ADMIN_TOKEN) return null;
  return token;
}

/** Sem token, ou com menos de 32 caracteres, o processo não escuta porta. */
export function adminTokenError(): string | null {
  if (adminToken()) return null;
  return "ADMIN_TOKEN ausente ou fraco. A API não sobe.";
}

/** Em produção a semente em memória não substitui o Postgres. */
export function productionDatabaseError(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  if (!process.env.DATABASE_URL?.trim()) return "DATABASE_URL ausente. A API não sobe em produção.";
  return null;
}

function flagOn(value: string | undefined) {
  const flag = value?.trim().toLowerCase();
  return flag === "1" || flag === "true";
}

/** Única forma de a API continuar em memória quando o Postgres ou a migração falha. */
export function memoryFallbackAllowed() {
  return flagOn(process.env.LUME_ALLOW_MEMORY_FALLBACK);
}

/** O avanço de rastreio só existe com a flag. NODE_ENV não liga nem desliga a rota. */
export function sandboxEnabled() {
  return flagOn(process.env.LUME_ENABLE_SANDBOX);
}

export function corsOrigins() {
  return (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Lê a allowlist a cada pedido. Sem CORS_ORIGINS, ou fora da lista, não devolve CORS. */
export function resolveCorsOrigin(requestOrigin: string): string | null {
  const origin = requestOrigin.trim();
  const allowed = corsOrigins();
  if (!origin || !allowed.includes(origin)) return null;
  return origin;
}
