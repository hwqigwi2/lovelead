import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requireAdmin, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const allowed = await checkRateLimit(request, 15, true);
  if (allowed !== true) return NextResponse.json({ error: allowed === false ? "Слишком много попыток." : "Сервис временно недоступен." }, { status: allowed === false ? 429 : 503 });
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
    const message = error instanceof Error ? error.message : "";
    const status = message === "Forbidden." ? 403 : message === "User session was not initialized." ? 401 : 500;
    const text = status === 403 ? "Доступ запрещён." : status === 401 ? "Требуется авторизация." : "Не удалось загрузить данные. Попробуйте ещё раз.";
    return NextResponse.json({ error: text }, { status });
  }
}
