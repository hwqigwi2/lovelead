const bucket = new Map<string, { count: number; resetAt: number }>();

// Локальный fallback только для разработки и тестов. В production на Vercel
// serverless-инстансы не делят память, поэтому используется Upstash Redis, а
// критичные (failClosed) endpoint'ы без Upstash закрываются, а не открываются.
function rateLimitMemory(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = bucket.get(key);
  if (!current || current.resetAt < now) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

// В тестах Upstash нет, поэтому нужен способ прогнать ветку
// «стор недоступен» без сетевых вызовов.
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Фиксированное окно через Upstash REST API (INCR + PEXPIRE), без новых зависимостей.
async function rateLimitUpstash(url: string, token: string, key: string, limit: number, windowMs: number) {
  const windowKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify([["INCR", windowKey], ["PEXPIRE", windowKey, windowMs]]),
  });
  if (!response.ok) throw new Error(`Upstash rate limit failed: ${response.status}`);
  const data = (await response.json()) as Array<{ result?: number }>;
  return Number(data[0]?.result ?? 1) <= limit;
}

// Критичные (auth/admin) операции при недоступности стора закрываются (503),
// некритичные открываются, чтобы падение Redis не ломало Mini App.
export const RATE_LIMIT_FAIL_CLOSED = Symbol("RATE_LIMIT_FAIL_CLOSED");
export type RateLimitResult = boolean | typeof RATE_LIMIT_FAIL_CLOSED;

export async function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
  options: { failClosed?: boolean } = {},
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      return await rateLimitUpstash(url, token, key, limit, windowMs);
    } catch (error) {
      console.error("Rate limit store unavailable:", error instanceof Error ? error.message : "unknown");
      if (options.failClosed) return RATE_LIMIT_FAIL_CLOSED;
      // Fail-open только для некритичных endpoint'ов: недоступность Redis
      // не должна ломать Mini App.
      return true;
    }
  }
  if (options.failClosed) {
    // Fail-closed для критичных endpoint'ов: в production без сконфигурированного
    // Upstash закрываем доступ (503), а не открываем endpoint без лимитов.
    // Memory fallback остаётся только для разработки/тестов.
    if (process.env.NODE_ENV === "production") {
      console.error("Rate limit store is not configured in production; failing closed.");
      return RATE_LIMIT_FAIL_CLOSED;
    }
    await sleep(0);
  }
  return rateLimitMemory(key, limit, windowMs);
}
