import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appConfig } from "@/lib/config";
import { upsertTelegramUser } from "@/lib/auth";
import { sendLongTextMessage, sendStartMessage, sendTextMessage } from "@/lib/bot";
import { parseStartRef } from "@/lib/referral";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { UserTaskStatus } from "@/types";

const updateSchema = z.object({
  message: z.object({
    chat: z.object({ id: z.number() }),
    from: z.object({
      id: z.number(),
      first_name: z.string(),
      last_name: z.string().optional(),
      username: z.string().optional(),
    }).optional(),
    text: z.string().optional(),
  }).optional(),
});

type ReferralStatus = "не начал" | "в процессе" | "выполнил дебетовые карты" | "выполнил расчётный счёт";

function referralStatus(completed: Set<string>): ReferralStatus {
  if (completed.has("debet")) return "выполнил дебетовые карты";
  if (completed.has("rko") || completed.has("tbank-rko")) return "выполнил расчётный счёт";
  return "не начал";
}

async function handleStart(message: { chat: { id: number }; from?: { id: number; first_name: string; last_name?: string; username?: string }; text: string }, appUrl: string) {
  const from = message.from;
  if (from) {
    const user = await upsertTelegramUser({ id: from.id, first_name: from.first_name, last_name: from.last_name, username: from.username });
    const code = parseStartRef(message.text);
    if (code && !user.referred_by) {
      const db = getSupabaseAdmin();
      const { data: referrer } = await db.from("users").select("id,referral_code").eq("referral_code", code).maybeSingle();
      if (referrer && referrer.id !== user.id) {
        await db.from("users").update({ referred_by: referrer.id }).eq("id", user.id).is("referred_by", null);
      }
    }
  }
  await sendStartMessage(message.chat.id, from?.first_name ?? "", appUrl);
}

async function handleAdmin(chatId: number, telegramId: number | undefined) {
  if (!telegramId || !appConfig.adminTelegramIds.includes(telegramId)) {
    await sendTextMessage(chatId, "Команда недоступна.");
    return;
  }
  const db = getSupabaseAdmin();
  const { data: users } = await db.from("users").select("id,telegram_id,first_name,last_name,username,referred_by,created_at").order("created_at", { ascending: false }).limit(50);
  if (!users?.length) {
    await sendTextMessage(chatId, "Пользователей пока нет.");
    return;
  }
  const userIds = users.map((user) => user.id);
  const { data: userTasks } = await db.from("user_tasks").select("user_id,status,task:tasks(slug)").in("user_id", userIds);
  const startedByUser = new Map<string, number>();
  const completedByUser = new Map<string, Set<string>>();
  for (const row of userTasks ?? []) {
    const status = row.status as UserTaskStatus;
    if (status === "started") startedByUser.set(row.user_id, (startedByUser.get(row.user_id) ?? 0) + 1);
    if (status === "completed") {
      const slug = (Array.isArray(row.task) ? row.task[0] : row.task)?.slug as string | undefined;
      if (!slug) continue;
      const set = completedByUser.get(row.user_id) ?? new Set<string>();
      set.add(slug);
      completedByUser.set(row.user_id, set);
    }
  }
  const referrals = users.filter((user) => user.referred_by);
  const invitedByUser = new Map<string, typeof referrals>();
  for (const referral of referrals) {
    const list = invitedByUser.get(referral.referred_by as string) ?? [];
    list.push(referral);
    invitedByUser.set(referral.referred_by as string, list);
  }
  const lines: string[] = [`Пользователи (${users.length}):`];
  for (const user of users) {
    const username = user.username ? ` @${user.username}` : "";
    const invited = invitedByUser.get(user.id) ?? [];
    lines.push("", `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""} — ${user.telegram_id}${username}, приглашено: ${invited.length}`);
    for (const referral of invited) {
      const referralName = referral.username ? `@${referral.username}` : referral.first_name;
      lines.push(`  • ${referralName}: ${referralStatus(completedByUser.get(referral.id) ?? new Set())}`);
    }
  }
  await sendLongTextMessage(chatId, lines.join("\n"));
}

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expected) return NextResponse.json({ error: "Webhook не настроен." }, { status: 503 });
    if (request.headers.get("x-telegram-bot-api-secret-token") !== expected) return NextResponse.json({ ok: false }, { status: 401 });
    const update = updateSchema.parse(await request.json());
    const message = update.message;
    if (!message?.text) return NextResponse.json({ ok: true });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (message.text.startsWith("/start")) {
      if (!appUrl) throw new Error("Mini app URL is missing.");
      await handleStart({ chat: message.chat, from: message.from, text: message.text }, appUrl);
    } else if (message.text.trim() === "/admin") {
      await handleAdmin(message.chat.id, message.from?.id);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
