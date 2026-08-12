import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const allowed = await checkRateLimit(request, 10);
  if (allowed !== true) return NextResponse.json({ error: allowed === false ? "Слишком много попыток. Попробуйте позже." : "Сервис временно недоступен." }, { status: allowed === false ? 429 : 503 });
  try {
    const user = await requireUser(request);
    const db = getSupabaseAdmin();
    await db.from("users").update({ rko_onboarding_completed: true }).eq("id", user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить данные. Попробуйте ещё раз." }, { status: 500 });
  }
}
