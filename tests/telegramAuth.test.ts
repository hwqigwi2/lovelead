import crypto from "node:crypto";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/telegram/auth/route";

// lib/auth импортирует server-only — в vitest его нет, мокаем пустым модулем.
vi.mock("server-only", () => ({}));

// Мокаем только Supabase и server-only. Telegram HMAC-валидацию и rate limit
// НЕ мокаем — тест гоняет реальные lib/telegram и lib/rateLimit.
const mocks = vi.hoisted(() => ({ upsert: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "users") throw new Error(`Unexpected table ${table}`);
      return {
        upsert: mocks.upsert.mockReturnValue({
          select: () => ({ single: () => Promise.resolve({ data: { id: "db-user-1", telegram_id: 123, first_name: "Ivan" }, error: null }) }),
        }),
      };
    },
  }),
}));

const BOT_TOKEN = "test-bot-token";

function buildInitData(user: Record<string, unknown>, authDate: number): string {
  const params = new URLSearchParams({ auth_date: String(authDate), query_id: "AAE", user: JSON.stringify(user) });
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const hash = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

function req(initData: string) {
  return new NextRequest("http://localhost/api/telegram/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ initData }),
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", BOT_TOKEN);
  // Upstash намеренно не настроен — Mini App должен работать без Redis.
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  mocks.upsert.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("telegram auth endpoint", () => {
  it("без Upstash в production: валидный initData авторизуется (memory fallback)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const data = buildInitData({ id: 123, first_name: "Ivan" }, Math.floor(Date.now() / 1000));
    const res = await POST(req(data));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.telegram_id).toBe(123);
    expect(mocks.upsert).toHaveBeenCalled();
  });

  it("без Upstash в production: невалидный initData отклоняется", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const data = buildInitData({ id: 123, first_name: "Ivan" }, Math.floor(Date.now() / 1000));
    // Подменяем user после подписи — HMAC не сойдётся.
    const forged = data.replace(/user=[^&]*/, "user=" + encodeURIComponent(JSON.stringify({ id: 999, first_name: "X" })));
    const res = await POST(req(forged));
    expect(res.status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("невалидный initData отклоняется и вне production", async () => {
    const res = await POST(req("auth_date=1&hash=deadbeef"));
    expect(res.status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
