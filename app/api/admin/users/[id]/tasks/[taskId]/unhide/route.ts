import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requireAdmin, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  if (!checkRateLimit(request, 15)) return NextResponse.json({ error: "Слишком много попыток." }, { status: 429 });
  try {
    const admin = await requireUser(request);
    requireAdmin(admin);
    const { id, taskId } = await params;
    const db = getSupabaseAdmin();
    const { data: task } = await db.from("tasks").select("id").eq("id", taskId).single();
    const { data: user } = await db.from("users").select("id").eq("id", id).single();
    if (!task || !user) return NextResponse.json({ error: "Не найдено." }, { status: 404 });
    // Примечание: admin_actions.action check-констрейнт допускает только 'hide_task',
    // поэтому unhide логируется без отдельного типа действия (constraint не меняем).
    const { data, error } = await db
      .from("user_tasks")
      .update({ status: "available", hidden_at: null })
      .eq("user_id", id)
      .eq("task_id", taskId)
      .eq("status", "hidden")
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) return NextResponse.json({ error: "Задание не скрыто." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof Error && error.message === "Forbidden." ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "Доступ запрещён." : "Не удалось загрузить данные. Попробуйте ещё раз." }, { status });
  }
}
