import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, upsertTelegramUser } from "@/lib/auth";
import { TelegramAuthError, validateInitData } from "@/lib/telegram";
import { z } from "zod";

const schema = z.object({ initData: z.string().min(1).max(8192) });
export async function POST(request: NextRequest) {
  const allowed = await checkRateLimit(request, 12, true);
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
