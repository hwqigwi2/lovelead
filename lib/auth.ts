import "server-only";
import { NextRequest } from "next/server";
import { appConfig } from "@/lib/config";
import { rateLimit } from "@/lib/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { validateInitData } from "@/lib/telegram";
import type { LoveLeadUser, TelegramUser } from "@/types";

export async function requireUser(request: NextRequest): Promise<LoveLeadUser> {
  const initData = request.headers.get("x-telegram-init-data") ?? "";
  const user = validateInitData(initData);
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("users").select("*").eq("telegram_id", user.id).single();
  if (error || !data) throw new Error("User session was not initialized.");
  return data as LoveLeadUser;
}

export async function upsertTelegramUser(telegramUser: TelegramUser): Promise<LoveLeadUser> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("users").upsert({ telegram_id: telegramUser.id, username: telegramUser.username ?? null, first_name: telegramUser.first_name, last_name: telegramUser.last_name ?? null, avatar_url: telegramUser.photo_url ?? null }, { onConflict: "telegram_id" }).select("*").single();
  if (error || !data) throw new Error("Unable to create user.");
  return data as LoveLeadUser;
}

export function requireAdmin(user: LoveLeadUser) {
  if (!appConfig.adminTelegramIds.includes(user.telegram_id)) throw new Error("Forbidden.");
}

export function checkRateLimit(request: NextRequest, limit?: number) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  return rateLimit(`${ip}:${request.nextUrl.pathname}`, limit);
}
