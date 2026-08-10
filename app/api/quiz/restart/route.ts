import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!checkRateLimit(request, 5)) return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
  try {
    const user = await requireUser(request);
    if (!user.quiz_restart_until || new Date(user.quiz_restart_until) < new Date()) return NextResponse.json({ error: "Время для повторного опроса истекло." }, { status: 403 });
    const db = getSupabaseAdmin();
    await db.from("users").update({ quiz_completed: false, quiz_completed_at: null, quiz_restart_until: null, age: null, has_tbank: null, has_ip: null, has_npd: null, is_military: null, has_arrest: null }).eq("id", user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить данные. Попробуйте ещё раз." }, { status: 500 });
  }
}
