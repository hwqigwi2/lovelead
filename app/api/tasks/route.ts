import { NextRequest, NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import { checkRateLimit, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAvailableTaskSlugs, hasQualification } from "@/lib/qualificationEngine";

export async function GET(request: NextRequest) {
  if (!checkRateLimit(request)) return NextResponse.json({ error: "Слишком много запросов." }, { status: 429 });
  try {
    const user = await requireUser(request);
    if (!user.quiz_completed || !hasQualification(user)) return NextResponse.json({ tasks: [] });
    const db = getSupabaseAdmin();
    const { data: tasks, error } = await db.from("tasks").select("*").eq("is_active", true).order("sort_order");
    if (error) throw error;
    const { data: userTasks } = await db.from("user_tasks").select("task_id,status").eq("user_id", user.id);
    const statuses = new Map((userTasks ?? []).map((row) => [row.task_id, row.status]));
    const available = new Set(getAvailableTaskSlugs(user));
    const result = (tasks ?? []).map((task) => ({ ...task, url: appConfig.tasks[task.slug as keyof typeof appConfig.tasks].url || null, status: statuses.get(task.id) ?? "available", conditions: appConfig.tasks[task.slug as keyof typeof appConfig.tasks].conditions })).filter((task) => available.has(task.slug) && statuses.get(task.id) !== "hidden" && task.url);
    return NextResponse.json({ tasks: result });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить данные. Попробуйте ещё раз." }, { status: 500 });
  }
}
