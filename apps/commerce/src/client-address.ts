import type { Context } from "hono";

type SocketBindings = {
  incoming?: { socket?: { remoteAddress?: string } };
  server?: { incoming?: { socket?: { remoteAddress?: string } } };
};

/** IP do socket. O cabeçalho do cliente só entra se esse IP for um proxy configurado. */
export function clientAddress(c: Context): string {
  const socket = socketAddress(c);
  if (trustsForwardedHeaders(socket)) {
    const forwarded = forwardedClient(c);
    if (forwarded) return forwarded;
  }
  return socket ?? "desconhecido";
}

function socketAddress(c: Context): string | undefined {
  const env = c.env as SocketBindings | undefined;
  const bindings = env?.server?.incoming ? env.server : env;
  const address = bindings?.incoming?.socket?.remoteAddress?.trim();
  return address || undefined;
}

function trustedProxies() {
  return (process.env.TRUSTED_PROXIES ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function trustsForwardedHeaders(socket: string | undefined) {
  if (process.env.VERCEL === "1") return true;
  if (!socket) return false;
  return trustedProxies().includes(socket);
}

function forwardedClient(c: Context): string | undefined {
  if (process.env.VERCEL === "1") {
    return firstAddress(c.req.header("x-vercel-forwarded-for"));
  }
  const hops = (c.req.header("x-forwarded-for") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const trusted = new Set(trustedProxies());
  for (let index = hops.length - 1; index >= 0; index -= 1) {
    const hop = hops[index];
    if (hop && !trusted.has(hop)) return hop;
  }
  return undefined;
}

function firstAddress(header: string | undefined) {
  const value = header?.split(",")[0]?.trim();
  return value || undefined;
}
