import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, requireAdmin, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAvailableTaskSlugs, hasQualification } from "@/lib/qualificationEngine";

export async function GET(request: NextRequest) {
  const allowed = await checkRateLimit(request, 20, true);
  if (allowed !== true) return NextResponse.json({ error: allowed === false ? "Слишком много запросов." : "Сервис временно недоступен." }, { status: allowed === false ? 429 : 503 });
  try {
    requireAdmin(await requireUser(request));
    const query = z.string().max(100).parse(request.nextUrl.searchParams.get("q") ?? "").trim();
    const db = getSupabaseAdmin();
    // Явный список полей вместо select('*'): только то, что нужно админке,
    // плюс поля квалификации для hasQualification/getAvailableTaskSlugs.
    const ADMIN_USER_FIELDS =
      "id,telegram_id,username,first_name,last_name,avatar_url,age,has_tbank,has_ip,has_npd,is_military,has_arrest,quiz_completed,quiz_completed_at,rko_onboarding_completed,referral_code,referred_by,created_at,updated_at";
    let dbQuery = db.from("users").select(`${ADMIN_USER_FIELDS},user_tasks(status,task_id,tasks(slug,title))`).order("created_at", { ascending: false }).limit(100);
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
    const message = error instanceof Error ? error.message : "";
    const status = message === "Forbidden." ? 403 : message === "User session was not initialized." ? 401 : 500;
    const text = status === 403 ? "Доступ запрещён." : status === 401 ? "Требуется авторизация." : "Не удалось загрузить данные. Попробуйте ещё раз.";
    return NextResponse.json({ error: text }, { status });
  }
}
