import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appConfig } from "@/lib/config";
import { checkRateLimit, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAvailableTaskSlugs } from "@/lib/qualificationEngine";

const answersSchema = z.object({ age: z.number().int().min(0).max(120), has_tbank: z.boolean(), has_ip: z.boolean(), has_npd: z.boolean(), is_military: z.boolean(), has_arrest: z.boolean() });
export async function POST(request: NextRequest) {
  if (!checkRateLimit(request, 10)) return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
  try {
    const user = await requireUser(request);
    const answers = answersSchema.parse(await request.json());
    const db = getSupabaseAdmin();
    const completedAt = new Date().toISOString();
    const restartUntil = new Date(Date.now() + appConfig.quizRestartSeconds * 1000).toISOString();
    const { error } = await db.from("users").update({ ...answers, quiz_completed: true, quiz_completed_at: completedAt, quiz_restart_until: restartUntil }).eq("id", user.id);
    if (error) throw error;
    await db.from("quiz_sessions").insert({ user_id: user.id, answers, completed_at: completedAt });
    return NextResponse.json({ available: getAvailableTaskSlugs(answers), restartUntil });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: status === 400 ? "Проверьте ответы и попробуйте ещё раз." : "Не удалось загрузить данные. Попробуйте ещё раз." }, { status });
  }
}
