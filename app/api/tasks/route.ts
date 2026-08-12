import { NextRequest, NextResponse } from "next/server";
import { appConfig, resolveTaskUrl } from "@/lib/config";
import { checkRateLimit, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { applyTaskDependencies, getAvailableTaskSlugs, hasQualification } from "@/lib/qualificationEngine";
import type { TaskSlug, UserTaskStatus } from "@/types";

const TBANK_RKO_LOCK_REASON = "Откроется после выполнения Альфа РКО";

export async function GET(request: NextRequest) {
  const allowed = await checkRateLimit(request);
  if (allowed !== true) return NextResponse.json({ error: allowed === false ? "Слишком много запросов." : "Сервис временно недоступен." }, { status: allowed === false ? 429 : 503 });
  try {
    const user = await requireUser(request);
    if (!user.quiz_completed) return NextResponse.json({ tasks: [] });
    const db = getSupabaseAdmin();
    const { data: tasks, error } = await db
      .from("tasks")
      .select("id,slug,title,category,description,payout,payout_label,time_label,difficulty,image,sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    const { data: userTasks } = await db.from("user_tasks").select("task_id,status").eq("user_id", user.id);
    const statuses = new Map((userTasks ?? []).map((row) => [row.task_id, row.status]));
    const slugById = new Map((tasks ?? []).map((task) => [task.id, task.slug as TaskSlug]));
    const completedSlugs = (userTasks ?? [])
      .filter((row) => row.status === "completed")
      .map((row) => slugById.get(row.task_id))
      .filter((slug): slug is TaskSlug => Boolean(slug));
    const qualified = hasQualification(user) ? getAvailableTaskSlugs(user) : [];
    const available = new Set(applyTaskDependencies(qualified, completedSlugs));
    const active = (tasks ?? []).filter((task) => statuses.get(task.id) !== "hidden");
    const result = active.map((task) => {
      const slug = task.slug as TaskSlug;
      const config = appConfig.tasks[slug];
      if (!available.has(slug)) {
        const dependencyLocked = slug === "tbank-rko" && qualified.includes("tbank-rko");
        return {
          ...task, url: null, status: "locked" as UserTaskStatus,
          lockReason: dependencyLocked ? TBANK_RKO_LOCK_REASON : null,
          conditions: config?.conditions, cta: config?.cta,
        };
      }
      return { ...task, url: resolveTaskUrl(slug, user), status: (statuses.get(task.id) ?? "available") as UserTaskStatus, conditions: config?.conditions, cta: config?.cta };
    });
    // Сортировка: при арестах доступная Альфа (rko) идёт первой; доступные — выше
    // недоступных; tbank-rko (зависит от Альфы) остаётся внизу. Для пользователей
    // без арестов порядок не меняется — обычный sort_order.
    const arrest = user.has_arrest === true;
    const rank = (task: (typeof result)[number]) => {
      if (!arrest) return task.sort_order;
      if (task.slug === "tbank-rko") return 90;
      const availableOrder = task.slug === "rko" ? 0 : 10;
      if (task.status !== "locked") return availableOrder;
      return task.slug === "rko" ? 50 : 40;
    };
    result.sort((a, b) => rank(a) - rank(b) || a.sort_order - b.sort_order);
    return NextResponse.json({ tasks: result });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить данные. Попробуйте ещё раз." }, { status: 500 });
  }
}
