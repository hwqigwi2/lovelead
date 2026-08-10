import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!checkRateLimit(request, 10)) return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
  try {
    const user = await requireUser(request);
    const db = getSupabaseAdmin();
    await db.from("users").update({ rko_onboarding_completed: true }).eq("id", user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить данные. Попробуйте ещё раз." }, { status: 500 });
  }
}
