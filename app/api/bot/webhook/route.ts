import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appConfig } from "@/lib/config";
import { checkRateLimit, upsertTelegramUser } from "@/lib/auth";
import { sendLongTextMessage, sendPhotoMessage, sendStartMessage, sendTextMessage } from "@/lib/bot";
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
    caption: z.string().optional(),
    photo: z.array(z.object({ file_id: z.string() })).optional(),
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

// Telegram присылает команды не только как "/post", но и как "/post@Leadslovebot"
// (в группах и при тапе по команде-ссылке). Exact string comparison с "/post"
// такие сообщения не матчил, поэтому команда молча игнорировалась.
function matchCommand(text: string, command: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (normalized === command) return true;
  const atIndex = normalized.indexOf("@");
  if (atIndex === -1) return false;
  return (
    normalized.slice(0, atIndex) === command &&
    normalized.slice(atIndex + 1) === appConfig.botUsername.toLowerCase()
  );
}

type WebhookMessage = {
  chat: { id: number };
  from?: { id: number; first_name: string; last_name?: string; username?: string };
  text?: string;
  caption?: string;
  photo?: { file_id: string }[];
};

// Telegram-IDs админов, ожидающих контент рассылки после команды /post.
// Состояние одноразовое: сбрасывается на первом же следующем сообщении админа.
const pendingPostAdmins = new Set<number>();

async function handlePost(chatId: number, telegramId: number | undefined) {
  if (!telegramId || !appConfig.adminTelegramIds.includes(telegramId)) {
    await sendTextMessage(chatId, "Команда недоступна.");
    return;
  }
  pendingPostAdmins.add(telegramId);
  await sendTextMessage(chatId, "Отправьте сообщение для рассылки. Можно отправить текст или фотографию с подписью.");
}

// Рассылка идёт батчами с ограниченным параллелизмом, чтобы не упереться
// в rate limits Telegram Bot API. Ошибка одному получателю (например, бот
// заблокирован) засчитывается в статистику и не останавливает рассылку.
const BROADCAST_BATCH_SIZE = 20;

async function broadcastToAllUsers(content: { text?: string; photoFileId?: string; caption?: string }) {
  const db = getSupabaseAdmin();
  const { data: users } = await db.from("users").select("telegram_id").not("telegram_id", "is", null);
  const telegramIds = (users ?? [])
    .map((user) => user.telegram_id)
    .filter((id): id is number => typeof id === "number");
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < telegramIds.length; i += BROADCAST_BATCH_SIZE) {
    const batch = telegramIds.slice(i, i + BROADCAST_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((telegramId) =>
        content.photoFileId
          ? sendPhotoMessage(telegramId, content.photoFileId, content.caption)
          : sendTextMessage(telegramId, content.text ?? "")
      )
    );
    for (const result of results) {
      if (result.status === "fulfilled") sent += 1;
      else failed += 1;
    }
  }
  return { total: telegramIds.length, sent, failed };
}

async function handlePostContent(message: WebhookMessage, telegramId: number) {
  // Сбрасываем состояние до отправки: без нового /post повторной рассылки не будет.
  pendingPostAdmins.delete(telegramId);
  const photoFileId = message.photo?.length ? message.photo[message.photo.length - 1].file_id : undefined;
  if (!photoFileId && !message.text) {
    await sendTextMessage(message.chat.id, "Рассылка отменена: можно отправить только текст или фотографию с подписью.");
    return;
  }
  const stats = await broadcastToAllUsers({ text: message.text, photoFileId, caption: message.caption });
  await sendTextMessage(message.chat.id, `Рассылка завершена.\n\nВсего: ${stats.total}\nОтправлено: ${stats.sent}\nОшибок: ${stats.failed}`);
}

export async function POST(request: NextRequest) {
  const allowed = await checkRateLimit(request, 60);
  if (allowed !== true) return NextResponse.json({ ok: false }, { status: allowed === false ? 429 : 503 });
  try {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expected) return NextResponse.json({ error: "Webhook не настроен." }, { status: 503 });
    if (request.headers.get("x-telegram-bot-api-secret-token") !== expected) return NextResponse.json({ ok: false }, { status: 401 });
    const update = updateSchema.parse(await request.json());
    const message = update.message;
    if (!message) return NextResponse.json({ ok: true });
    const telegramId = message.from?.id;
    // Следующее сообщение админа после /post — контент рассылки, а не команда.
    if (telegramId && pendingPostAdmins.has(telegramId)) {
      // Если админ вместо контента прислал новую команду, отменяем ожидание
      // и обрабатываем её как обычную команду — иначе текст команды ушёл бы в рассылку.
      if (message.text?.trim().startsWith("/")) {
        pendingPostAdmins.delete(telegramId);
      } else {
        await handlePostContent(message, telegramId);
        return NextResponse.json({ ok: true });
      }
    }
    if (!message.text) return NextResponse.json({ ok: true });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (message.text.startsWith("/start")) {
      if (!appUrl) throw new Error("Mini app URL is missing.");
      await handleStart({ chat: message.chat, from: message.from, text: message.text }, appUrl);
    } else if (matchCommand(message.text, "/admin")) {
      await handleAdmin(message.chat.id, telegramId);
    } else if (matchCommand(message.text, "/post")) {
      await handlePost(message.chat.id, telegramId);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
