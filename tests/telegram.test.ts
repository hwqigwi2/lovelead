import crypto from "node:crypto";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { validateInitData, MAX_AUTH_DATE_AGE_SECONDS } from "../lib/telegram";

const BOT_TOKEN = "test-bot-token";

function buildInitData(user: Record<string, unknown>, authDate: number): string {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "AAE",
    user: JSON.stringify(user),
  });
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const hash = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", BOT_TOKEN);
});

describe("validateInitData", () => {
  it("принимает корректно подписанный initData", () => {
    const now = Math.floor(Date.now() / 1000);
    const data = buildInitData({ id: 123, first_name: "Ivan" }, now);
    expect(validateInitData(data).id).toBe(123);
  });

  it("отклоняет подпись, подписанную другим токеном", () => {
    const now = Math.floor(Date.now() / 1000);
    const data = buildInitData({ id: 123, first_name: "Ivan" }, now);
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "other-token");
    expect(() => validateInitData(data)).toThrow();
  });

  it("отклоняет протёкший auth_date", () => {
    const old = Math.floor(Date.now() / 1000) - MAX_AUTH_DATE_AGE_SECONDS - 10;
    const data = buildInitData({ id: 123, first_name: "Ivan" }, old);
    expect(() => validateInitData(data)).toThrow(/expired/i);
  });

  it("отклоняет initData без hash", () => {
    const now = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({ auth_date: String(now), user: JSON.stringify({ id: 1, first_name: "I" }) });
    expect(() => validateInitData(params.toString())).toThrow(/Invalid/);
  });

  it("отклоняет подделанное поле user при валидном hash другого payload", () => {
    const now = Math.floor(Date.now() / 1000);
    const data = buildInitData({ id: 123, first_name: "Ivan" }, now);
    // подмена user после подписи
    const forged = data.replace(/user=[^&]*/, "user=" + encodeURIComponent(JSON.stringify({ id: 999, first_name: "X" })));
    expect(() => validateInitData(forged)).toThrow();
  });
});
