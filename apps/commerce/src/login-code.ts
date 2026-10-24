import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const LOGIN_TTL_MS = 10 * 60_000;
export const LOGIN_COOLDOWN_MS = 60_000;
export const LOGIN_MAX_ATTEMPTS = 5;
export const SANDBOX_CODE = "LUME-SANDBOX";

type LoginCodeName = "codigo_invalido" | "codigo_expirado" | "codigo_esgotado" | "limite";

export class LoginError extends Error {
  readonly status: 400 | 429;
  readonly code: LoginCodeName;

  constructor(code: LoginCodeName, message: string, status: 400 | 429) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type StoredCode = {
  hash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  sentAt: number;
};

const codes = new Map<string, StoredCode>();

export function clearLoginCodes() {
  codes.clear();
}

export function sandboxLoginAllowed() {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NODE_ENV === "test") return true;
  const flag = process.env.SANDBOX?.trim().toLowerCase();
  return flag === "1" || flag === "true";
}

function digest(salt: string, code: string) {
  return createHash("sha256").update(`${salt}:${code}`).digest();
}

function sameCode(salt: string, code: string, expectedHex: string) {
  const actual = digest(salt, code);
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(actual, expected);
}

export function storedLoginHash(email: string) {
  return codes.get(email.trim().toLowerCase())?.hash ?? null;
}

export async function requestLoginCode(email: string, now: number, send: (code: string) => Promise<void>) {
  const key = email.trim().toLowerCase();
  const current = codes.get(key);
  if (current && now < current.sentAt + LOGIN_COOLDOWN_MS) {
    throw new LoginError("limite", "Espere um minuto para pedir outro código.", 429);
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await send(code);
  const salt = randomBytes(16).toString("hex");
  codes.set(key, {
    hash: digest(salt, code).toString("hex"),
    salt,
    expiresAt: now + LOGIN_TTL_MS,
    attempts: 0,
    sentAt: now,
  });
}

export function verifyLoginCode(email: string, code: string, now: number) {
  const key = email.trim().toLowerCase();
  const normalized = code.trim();
  if (normalized.toUpperCase() === SANDBOX_CODE) {
    if (sandboxLoginAllowed()) return key;
    throw new LoginError("codigo_invalido", "Código inválido.", 400);
  }
  const current = codes.get(key);
  if (!current) throw new LoginError("codigo_invalido", "Código inválido.", 400);
  if (now >= current.expiresAt) {
    codes.delete(key);
    throw new LoginError("codigo_expirado", "O código expirou. Peça outro.", 400);
  }
  if (!sameCode(current.salt, normalized, current.hash)) {
    current.attempts += 1;
    if (current.attempts >= LOGIN_MAX_ATTEMPTS) {
      codes.delete(key);
      throw new LoginError("codigo_esgotado", "Muitas tentativas. Peça outro código.", 400);
    }
    throw new LoginError("codigo_invalido", "Código inválido.", 400);
  }
  codes.delete(key);
  return key;
}
