import { NextRequest, NextResponse } from "next/server";
import { appConfig, taskUrlEnvKeys } from "@/lib/config";
import { checkRateLimit, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAvailableTaskSlugs, hasQualification } from "@/lib/qualificationEngine";
import type { TaskSlug, UserTaskStatus } from "@/types";

export async function GET(request: NextRequest) {
  if (!checkRateLimit(request)) return NextResponse.json({ error: "Слишком много запросов." }, { status: 429 });
  try {
    const user = await requireUser(request);
    if (!user.quiz_completed) return NextResponse.json({ tasks: [] });
    const db = getSupabaseAdmin();
    const { data: tasks, error } = await db.from("tasks").select("*").eq("is_active", true).order("sort_order");
    if (error) throw error;
    const { data: userTasks } = await db.from("user_tasks").select("task_id,status").eq("user_id", user.id);
    const statuses = new Map((userTasks ?? []).map((row) => [row.task_id, row.status]));
    const available = new Set(hasQualification(user) ? getAvailableTaskSlugs(user) : []);
    const active = (tasks ?? []).filter((task) => statuses.get(task.id) !== "hidden");
    const result = active.map((task) => {
      const slug = task.slug as TaskSlug;
      const config = appConfig.tasks[slug];
      if (!available.has(slug)) return { ...task, url: null, status: "locked" as UserTaskStatus, cta: config?.cta };
      const url = config?.url || null;
      if (!url) console.warn(`[tasks] URL is not configured for qualified task "${task.slug}". Set ${taskUrlEnvKeys[slug] ?? "the corresponding NEXT_PUBLIC_*_URL"}.`);
      return { ...task, url, status: (statuses.get(task.id) ?? "available") as UserTaskStatus, conditions: config?.conditions, cta: config?.cta };
    });
    result.sort((a, b) => Number(a.status === "locked") - Number(b.status === "locked") || a.sort_order - b.sort_order);
    return NextResponse.json({ tasks: result });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить данные. Попробуйте ещё раз." }, { status: 500 });
  }
}
