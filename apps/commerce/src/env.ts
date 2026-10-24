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

const MIN_TOKEN_BITS = 128;

/** Hex 16, alfanumérico 62, base64 ou base64url 64, e 95 para o resto. */
function alphabetSize(token: string) {
  if (/^[0-9a-fA-F]+$/.test(token)) return 16;
  if (/^[0-9A-Za-z]+$/.test(token)) return 62;
  if (/^[0-9A-Za-z+/_=-]+$/.test(token)) return 64;
  return 95;
}

function tokenBits(token: string) {
  const alphabet = alphabetSize(token);
  if (alphabet === 16) return token.length * 4;
  if (alphabet === 64) return token.length * 6;
  return token.length * Math.log2(alphabet);
}

/** O token inteiro é um bloco repetido, inclusive um caractere só. */
function repeatedPeriod(token: string) {
  for (let size = 1; size <= token.length / 2; size += 1) {
    if (token.length % size !== 0) continue;
    if (token.slice(0, size).repeat(token.length / size) === token) return true;
  }
  return false;
}

function strongAdminToken(token: string) {
  if (!token || repeatedPeriod(token)) return false;
  return tokenBits(token) >= MIN_TOKEN_BITS;
}

export function adminToken(): string | null {
  const token = process.env.ADMIN_TOKEN?.trim() ?? "";
  if (!strongAdminToken(token)) return null;
  return token;
}

/** Sem token forte o processo não escuta porta. A força é o tamanho vezes log2 do alfabeto, com mínimo de 128 bits. Caractere único ou período repetido não passa. */
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
