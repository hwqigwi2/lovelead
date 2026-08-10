import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, upsertTelegramUser } from "@/lib/auth";
import { TelegramAuthError, validateInitData } from "@/lib/telegram";
import { z } from "zod";

const schema = z.object({ initData: z.string().min(1).max(8192) });
export async function POST(request: NextRequest) {
  if (!checkRateLimit(request, 12)) return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
  try {
    const { initData } = schema.parse(await request.json());
    const user = await upsertTelegramUser(validateInitData(initData));
    return NextResponse.json({ user });
  } catch (error) {
    const status = error instanceof TelegramAuthError || error instanceof z.ZodError ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Не удалось определить аккаунт Telegram." : "Не удалось загрузить данные. Попробуйте ещё раз." }, { status });
  }
}
