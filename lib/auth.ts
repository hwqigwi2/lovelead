import "server-only";
import { NextRequest } from "next/server";
import { appConfig } from "@/lib/config";
import { rateLimit } from "@/lib/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { validateInitData } from "@/lib/telegram";
import type { LoveLeadUser, TelegramUser } from "@/types";

// Валидированный Telegram user ID из подписанного initData. Непроверенные
// данные (без валидной HMAC-подписи Telegram) не используются как идентификатор —
// иначе любой мог бы подставить чужой/случайный ID и обойти лимит.
// Rate limit не влияет на авторизацию: при невалидном initData ключ строится по IP.
function telegramUserIdFrom(initData: string): number | null {
  try {
    return validateInitData(initData).id;
  } catch {
    return null;
  }
}

// Список полей, которые пользовательским API разрешено получать из таблицы users.
// Никаких select('*'): это убережёт от утечки служебных колонок при их добавлении.
const USER_FIELDS = "id,telegram_id,username,first_name,last_name,avatar_url,age,has_tbank,has_ip,has_npd,is_military,has_arrest,quiz_completed,quiz_completed_at,rko_onboarding_completed,referral_code,referred_by";

export async function requireUser(request: NextRequest): Promise<LoveLeadUser> {
  const initData = request.headers.get("x-telegram-init-data") ?? "";
  const user = validateInitData(initData);
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("users").select(USER_FIELDS).eq("telegram_id", user.id).single();
  if (error || !data) throw new Error("User session was not initialized.");
  return data as unknown as LoveLeadUser;
}

export async function upsertTelegramUser(telegramUser: TelegramUser): Promise<LoveLeadUser> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("users").upsert({ telegram_id: telegramUser.id, username: telegramUser.username ?? null, first_name: telegramUser.first_name, last_name: telegramUser.last_name ?? null, avatar_url: telegramUser.photo_url ?? null }, { onConflict: "telegram_id" }).select(USER_FIELDS).single();
  if (error || !data) throw new Error("Unable to create user.");
  return data as unknown as LoveLeadUser;
}

export function requireAdmin(user: LoveLeadUser) {
  // Админ определяется только сервером: сверка валидированного Telegram ID
  // со списком ADMIN_TELEGRAM_IDS из серверного окружения. Никакого доверия
  // к query/body/cookie/localStorage.
  if (!appConfig.adminTelegramIds.includes(user.telegram_id)) throw new Error("Forbidden.");
}

export async function checkRateLimit(request: NextRequest, limit?: number, failClosed = false) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  // Для авторизованных endpoint'ов идентификатор — Telegram user ID, но только
  // после проверки подписи initData (см. telegramUserIdFrom); IP — дополнительный
  // фактор. Для анонимных/невалидных запросов (webhook, подделанный initData) — IP.
  const initData = request.headers.get("x-telegram-init-data") ?? "";
  const actor = telegramUserIdFrom(initData);
  const key = actor ? `${actor}:${request.nextUrl.pathname}` : `${ip}:${request.nextUrl.pathname}`;
  return rateLimit(key, limit, 60_000, { failClosed });
}
