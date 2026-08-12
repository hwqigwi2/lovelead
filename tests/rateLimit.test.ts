import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, RATE_LIMIT_FAIL_CLOSED } from "../lib/rateLimit";

describe("rateLimit (memory fallback)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("выпускает до лимита запросов и режет сверх", async () => {
    const key = `t:${Date.now()}:${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(await rateLimit(key, 3, 60_000)).toBe(true);
    expect(await rateLimit(key, 3, 60_000)).toBe(false);
  });

  it("разные ключи не влияют друг на друга", async () => {
    const k1 = `t1:${Math.random()}`;
    const k2 = `t2:${Math.random()}`;
    await rateLimit(k1, 1, 60_000);
    expect(await rateLimit(k1, 1, 60_000)).toBe(false);
    expect(await rateLimit(k2, 1, 60_000)).toBe(true);
  });

  it("failClosed при недоступном сторе возвращает RATE_LIMIT_FAIL_CLOSED", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "http://127.0.0.1:1");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    const result = await rateLimit(`x:${Math.random()}`, 1, 60_000, { failClosed: true });
    expect(result).toBe(RATE_LIMIT_FAIL_CLOSED);
  });

  it("fail-open для некритичных endpoint'ов при недоступном сторе", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "http://127.0.0.1:1");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    const result = await rateLimit(`y:${Math.random()}`, 1, 60_000);
    expect(result).toBe(true);
  });

  it("production без Upstash: fail-closed вместо memory fallback", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const result = await rateLimit(`prod:${Math.random()}`, 1, 60_000, { failClosed: true });
    expect(result).toBe(RATE_LIMIT_FAIL_CLOSED);
  });

  it("production без Upstash: некритичные endpoint'ы работают через memory fallback", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const key = `prod-open:${Math.random()}`;
    expect(await rateLimit(key, 1, 60_000)).toBe(true);
    expect(await rateLimit(key, 1, 60_000)).toBe(false);
  });
});
