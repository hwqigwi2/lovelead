import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, requireAdmin, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAvailableTaskSlugs, hasQualification } from "@/lib/qualificationEngine";

export async function GET(request: NextRequest) {
  if (!checkRateLimit(request, 20)) return NextResponse.json({ error: "Слишком много запросов." }, { status: 429 });
  try {
    requireAdmin(await requireUser(request));
    const query = z.string().max(100).parse(request.nextUrl.searchParams.get("q") ?? "").trim();
    const db = getSupabaseAdmin();
    let dbQuery = db.from("users").select("*,user_tasks(status,task_id,tasks(slug,title))").order("created_at", { ascending: false }).limit(100);
    if (query) {
      const sanitized = query.replace(/[%_,()\\"'*:.!]/g, "").slice(0, 50);
      const filters = [`username.ilike.%${sanitized}%`, `first_name.ilike.%${sanitized}%`];
      if (/^\d+$/.test(query)) filters.push(`telegram_id.eq.${query}`);
      dbQuery = dbQuery.or(filters.join(","));
    }
    const { data, error } = await dbQuery;
    if (error) throw error;
    const users = (data ?? []).map((user) => ({ ...user, availableTasks: hasQualification(user) ? getAvailableTaskSlugs(user) : [] }));
    return NextResponse.json({ users });
  } catch (error) {
    const status = error instanceof Error && error.message === "Forbidden." ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "Доступ запрещён." : "Не удалось загрузить данные. Попробуйте ещё раз." }, { status });
  }
}
