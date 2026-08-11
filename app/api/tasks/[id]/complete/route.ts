import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkRateLimit(request, 10)) return NextResponse.json({ error: "Слишком много попыток." }, { status: 429 });
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const db = getSupabaseAdmin();
    const { data: task } = await db.from("tasks").select("id,is_active").eq("id", id).single();
    if (!task?.is_active) return NextResponse.json({ error: "Задание недоступно." }, { status: 400 });
    const { data: existing } = await db.from("user_tasks").select("status").eq("user_id", user.id).eq("task_id", id).maybeSingle();
    if (existing?.status === "completed") return NextResponse.json({ error: "Задание уже выполнено." }, { status: 409 });
    if (existing?.status !== "started") return NextResponse.json({ error: "Задание ещё не начато." }, { status: 400 });
    const { error } = await db.from("user_tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("user_id", user.id).eq("task_id", id).eq("status", "started");
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить данные. Попробуйте ещё раз." }, { status: 500 });
  }
}
