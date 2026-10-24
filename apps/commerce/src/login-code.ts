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

export type StoredCode = {
  hash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  sentAt: number;
};

export type LoginCodeRepo = {
  get(email: string): Promise<StoredCode | null>;
  save(email: string, row: StoredCode): Promise<void>;
  /** Incrementa só enquanto attempts < 5. null se a linha já não existe. */
  bump(email: string): Promise<number | null>;
  remove(email: string): Promise<void>;
};

const codes = new Map<string, StoredCode>();

export function clearLoginCodes() {
  codes.clear();
}

export const memoryLoginCodes: LoginCodeRepo = {
  async get(email) {
    return codes.get(email) ?? null;
  },
  async save(email, row) {
    codes.set(email, { ...row });
  },
  async bump(email) {
    const row = codes.get(email);
    if (!row || row.attempts >= LOGIN_MAX_ATTEMPTS) return row ? row.attempts : null;
    row.attempts += 1;
    return row.attempts;
  },
  async remove(email) {
    codes.delete(email);
  },
};

export function sandboxLoginAllowed() {
  const flag = process.env.LUME_SANDBOX?.trim().toLowerCase();
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

export async function requestLoginCode(
  email: string,
  now: number,
  send: (code: string) => Promise<void>,
  repo: LoginCodeRepo = memoryLoginCodes,
) {
  const key = email.trim().toLowerCase();
  const current = await repo.get(key);
  if (current && now < current.sentAt + LOGIN_COOLDOWN_MS) {
    throw new LoginError("limite", "Espere um minuto para pedir outro código.", 429);
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await send(code);
  const salt = randomBytes(16).toString("hex");
  await repo.save(key, {
    hash: digest(salt, code).toString("hex"),
    salt,
    expiresAt: now + LOGIN_TTL_MS,
    attempts: 0,
    sentAt: now,
  });
}

export async function verifyLoginCode(email: string, code: string, now: number, repo: LoginCodeRepo = memoryLoginCodes) {
  const key = email.trim().toLowerCase();
  const normalized = code.trim();
  if (normalized.toUpperCase() === SANDBOX_CODE) {
    if (sandboxLoginAllowed()) return key;
    throw new LoginError("codigo_invalido", "Código inválido.", 400);
  }
  const current = await repo.get(key);
  if (!current) throw new LoginError("codigo_invalido", "Código inválido.", 400);
  if (now >= current.expiresAt) {
    await repo.remove(key);
    throw new LoginError("codigo_expirado", "O código expirou. Peça outro.", 400);
  }
  if (!sameCode(current.salt, normalized, current.hash)) {
    const attempts = await repo.bump(key);
    if (attempts === null) throw new LoginError("codigo_invalido", "Código inválido.", 400);
    if (attempts >= LOGIN_MAX_ATTEMPTS) {
      await repo.remove(key);
      throw new LoginError("codigo_esgotado", "Muitas tentativas. Peça outro código.", 400);
    }
    throw new LoginError("codigo_invalido", "Código inválido.", 400);
  }
  await repo.remove(key);
  return key;
}
