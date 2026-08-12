import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requireUser } from "@/lib/auth";
import { buildReferralLink } from "@/lib/referral";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const allowed = await checkRateLimit(request);
  if (allowed !== true) return NextResponse.json({ error: allowed === false ? "Слишком много запросов." : "Сервис временно недоступен." }, { status: allowed === false ? 429 : 503 });
  try {
    const user = await requireUser(request);
    const db = getSupabaseAdmin();
    let code = user.referral_code;
    if (!code) {
      code = randomBytes(5).toString("hex");
      const { data, error } = await db.from("users").update({ referral_code: code }).eq("id", user.id).select("referral_code").single();
      if (error || !data) throw error ?? new Error("Unable to set referral code.");
    }
    const { data: referrals, error } = await db
      .from("users")
      // Намеренно без telegram_id: пользователь не должен видеть
      // Telegram ID приглашённых, только публичные имя/username.
      .select("first_name,username,created_at")
      .eq("referred_by", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({
      code,
      link: buildReferralLink(code),
      invitedCount: referrals?.length ?? 0,
      referrals: referrals ?? [],
    });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить данные. Попробуйте ещё раз." }, { status: 500 });
  }
}
