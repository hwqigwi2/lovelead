import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, upsertTelegramUser } from "@/lib/auth";
import { TelegramAuthError, validateInitData } from "@/lib/telegram";
import { z } from "zod";

const schema = z.object({ initData: z.string().min(1).max(8192) });
export async function POST(request: NextRequest) {
  // Auth не fail-closed по rate-limit: без Upstash используется memory fallback,
  // иначе production без Redis не смог бы авторизоваться. Реальная безопасность
  // здесь — HMAC-валидация initData (validateInitData ниже); rate limit — защита
  // от brute-force, а не единственный барьер. Fail-closed остаётся у admin endpoint'ов.
  const allowed = await checkRateLimit(request, 12);
  if (allowed !== true) return NextResponse.json({ error: allowed === false ? "Слишком много попыток. Попробуйте позже." : "Сервис временно недоступен." }, { status: allowed === false ? 429 : 503 });
  try {
    const { initData } = schema.parse(await request.json());
    const user = await upsertTelegramUser(validateInitData(initData));
    return NextResponse.json({ user });
  } catch (error) {
    const isAuthError = error instanceof TelegramAuthError || error instanceof z.ZodError;
    const status = isAuthError ? 401 : 500;
    const message = isAuthError ? "Не удалось определить аккаунт Telegram." : "Не удалось загрузить данные. Попробуйте ещё раз.";
    return NextResponse.json({ error: message }, { status });
  }
}
