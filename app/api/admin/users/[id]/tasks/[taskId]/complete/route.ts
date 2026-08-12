import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requireAdmin, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

function errorStatus(error: unknown): number {
  if (error instanceof Error && error.message === "Forbidden.") return 403;
  if (error instanceof Error && error.message === "User session was not initialized.") return 401;
  return 500;
}

// Подтверждение выполнения задания доступно только администратору.
// Обычный пользовательский endpoint /api/tasks/[id]/complete намеренно отсутствует:
// статусами заданий распоряжается только сервер после проверки менеджером/админом.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const allowed = await checkRateLimit(request, 15, true);
  if (allowed !== true) return NextResponse.json({ error: allowed === false ? "Слишком много попыток." : "Сервис временно недоступен." }, { status: allowed === false ? 429 : 503 });
  try {
    const admin = await requireUser(request);
    requireAdmin(admin); // админ определяется только сервером, до любого обращения к целевым данным
    const { id, taskId } = await params;
    const db = getSupabaseAdmin();
    const [{ data: targetUser }, { data: task }] = await Promise.all([
      db.from("users").select("id").eq("id", id).maybeSingle(),
      db.from("tasks").select("id").eq("id", taskId).maybeSingle(),
    ]);
    if (!targetUser || !task) return NextResponse.json({ error: "Не найдено." }, { status: 404 });
    // Перевод строго started -> completed с условием на текущий статус.
    // Операция идемпотентна: повторный запрос по уже завершённому заданию не пишет ничего.
    const { data: updated, error } = await db
      .from("user_tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("user_id", id)
      .eq("task_id", taskId)
      .eq("status", "started") // защита от обновления чужого/скрытого/завершённого задания
      .select("status,completed_at");
    if (error) throw error;
    if (updated && updated.length > 0) {
      await db.from("admin_actions").insert({ admin_telegram_id: admin.telegram_id, user_id: id, task_id: taskId, action: "complete_task" });
      return NextResponse.json({ ok: true, status: "completed" });
    }
    const { data: existing } = await db.from("user_tasks").select("status").eq("user_id", id).eq("task_id", taskId).maybeSingle();
    if (existing?.status === "completed") return NextResponse.json({ ok: true, status: "completed" }); // идемпотентный повтор
    return NextResponse.json({ error: "Задание не в процессе." }, { status: 409 });
  } catch (error) {
    const status = errorStatus(error);
    return NextResponse.json({ error: status === 403 ? "Доступ запрещён." : status === 401 ? "Требуется авторизация." : "Не удалось загрузить данные. Попробуйте ещё раз." }, { status });
  }
}
