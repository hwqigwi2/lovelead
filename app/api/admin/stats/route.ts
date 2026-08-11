import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requireAdmin, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAvailableTaskSlugs, hasQualification } from "@/lib/qualificationEngine";

export async function GET(request: NextRequest) {
  if (!checkRateLimit(request, 20)) return NextResponse.json({ error: "Слишком много запросов." }, { status: 429 });
  try {
    requireAdmin(await requireUser(request));
    const db = getSupabaseAdmin();
    const [{ data: users, error }, { data: started }, { data: hidden }] = await Promise.all([
      db.from("users").select("age,has_tbank,has_ip,has_npd,is_military,has_arrest,quiz_completed"),
      db.from("user_tasks").select("task_id,tasks!inner(slug)").eq("status", "started"),
      db.from("user_tasks").select("id").eq("status", "hidden"),
    ]);
    if (error) throw error;
    const qualified = (users ?? []).filter(hasQualification);
    const countAvailable = (slug: string) => qualified.filter((user) => (getAvailableTaskSlugs(user) as string[]).includes(slug)).length;
    const countStarted = (slug: string) => (started ?? []).filter((row) => { const task = row.tasks as unknown as { slug: string } | null; return task?.slug === slug; }).length;
    return NextResponse.json({ totalUsers: users?.length ?? 0, quizCompleted: (users ?? []).filter((user) => user.quiz_completed).length, tbankAvailable: countAvailable("tbank"), rkoAvailable: countAvailable("rko"), mfoAvailable: countAvailable("mfo"), tbankStarted: countStarted("tbank"), rkoStarted: countStarted("rko"), mfoStarted: countStarted("mfo"), hiddenTasks: hidden?.length ?? 0 });
  } catch (error) {
    const status = error instanceof Error && error.message === "Forbidden." ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "Доступ запрещён." : "Не удалось загрузить данные. Попробуйте ещё раз." }, { status });
  }
}
