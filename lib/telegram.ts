import crypto from "node:crypto";
import type { TelegramUser } from "@/types";

export class TelegramAuthError extends Error {}

// initData генерируется при каждом запуске Mini App, поэтому достаточно
// короткого окна валидности — украденная подпись быстро протухает.
export const MAX_AUTH_DATE_AGE_SECONDS = 3600;

export function validateInitData(initData: string): TelegramUser {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !initData) throw new TelegramAuthError("Telegram authentication is unavailable.");
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new TelegramAuthError("Invalid Telegram data.");
  params.delete("hash");
  const authDate = Number(params.get("auth_date"));
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > MAX_AUTH_DATE_AGE_SECONDS) throw new TelegramAuthError("Telegram data has expired.");
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const expected = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) throw new TelegramAuthError("Telegram signature is invalid.");
  const rawUser = params.get("user");
  if (!rawUser) throw new TelegramAuthError("Telegram user is missing.");
  const user = JSON.parse(rawUser) as TelegramUser;
  if (!Number.isSafeInteger(user.id) || !user.first_name) throw new TelegramAuthError("Telegram user is invalid.");
  return user;
}
