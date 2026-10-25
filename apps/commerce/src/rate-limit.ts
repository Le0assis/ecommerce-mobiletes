import Redis from "ioredis";

export type RateCounter = {
  incr(key: string): number | Promise<number>;
  pexpire(key: string, ms: number): unknown | Promise<unknown>;
};

const hits = new Map<string, { count: number; reset: number }>();

export function clearRateLimit() {
  hits.clear();
}

const memory: RateCounter = {
  incr(key) {
    const now = Date.now();
    const current = hits.get(key);
    if (!current || current.reset < now) {
      hits.set(key, { count: 1, reset: now + 60_000 });
      return 1;
    }
    current.count += 1;
    return current.count;
  },
  pexpire() {
    return undefined;
  },
};

let redis: Redis | null = null;

function redisCounter(): RateCounter | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!redis) {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redis.on("error", () => undefined);
  }
  return redis;
}

export async function rateLimit(key: string, limit: number, counter?: RateCounter): Promise<boolean> {
  const remote = counter ?? redisCounter();
  if (remote) {
    const namespaced = `lume:rl:${key}`;
    try {
      const count = Number(await remote.incr(namespaced));
      if (count === 1) await remote.pexpire(namespaced, 60_000);
      return count > limit;
    } catch (error) {
      console.error(
        JSON.stringify({
          msg: "redis_indisponivel",
          message: error instanceof Error ? error.message : "falha",
        }),
      );
    }
  }
  const count = Number(await memory.incr(key));
  return count > limit;
}
