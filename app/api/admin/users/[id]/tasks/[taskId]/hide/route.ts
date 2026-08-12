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
    const { data: task } = await db.from("tasks").select("id").eq("id", taskId).maybeSingle();
    const { data: user } = await db.from("users").select("id").eq("id", id).maybeSingle();
    if (!task || !user) return NextResponse.json({ error: "Не найдено." }, { status: 404 });
    const now = new Date().toISOString();
    const { error } = await db.from("user_tasks").upsert({ user_id: id, task_id: taskId, status: "hidden", hidden_at: now }, { onConflict: "user_id,task_id" });
    if (error) throw error;
    await db.from("admin_actions").insert({ admin_telegram_id: admin.telegram_id, user_id: id, task_id: taskId, action: "hide_task" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Forbidden." ? 403 : message === "User session was not initialized." ? 401 : 500;
    const text = status === 403 ? "Доступ запрещён." : status === 401 ? "Требуется авторизация." : "Не удалось загрузить данные. Попробуйте ещё раз.";
    return NextResponse.json({ error: text }, { status });
  }
}
