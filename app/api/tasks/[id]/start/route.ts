import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isTaskAvailable, hasQualification } from "@/lib/qualificationEngine";
import type { TaskSlug } from "@/types";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkRateLimit(request, 10)) return NextResponse.json({ error: "Слишком много попыток." }, { status: 429 });
  try {
    const user = await requireUser(request);
    if (!user.quiz_completed || !hasQualification(user)) return NextResponse.json({ error: "Задание недоступно." }, { status: 403 });
    const { id } = await params;
    const db = getSupabaseAdmin();
    const { data: task } = await db.from("tasks").select("id,slug,is_active").eq("id", id).single();
    if (!task?.is_active || !isTaskAvailable(user, task.slug as TaskSlug)) return NextResponse.json({ error: "Задание недоступно." }, { status: 403 });
    const { data: existing } = await db.from("user_tasks").select("status").eq("user_id", user.id).eq("task_id", id).maybeSingle();
    if (existing?.status === "hidden") return NextResponse.json({ error: "Задание недоступно." }, { status: 403 });
    await db.from("user_tasks").upsert({ user_id: user.id, task_id: id, status: "started", started_at: new Date().toISOString() }, { onConflict: "user_id,task_id" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить данные. Попробуйте ещё раз." }, { status: 500 });
  }
}
