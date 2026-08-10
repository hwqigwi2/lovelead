import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendStartMessage } from "@/lib/bot";

const updateSchema = z.object({ message: z.object({ chat: z.object({ id: z.number() }), text: z.string().optional(), from: z.object({ first_name: z.string() }).optional() }).optional() });

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expected) return NextResponse.json({ error: "Webhook не настроен." }, { status: 503 });
    if (request.headers.get("x-telegram-bot-api-secret-token") !== expected) return NextResponse.json({ ok: false }, { status: 401 });
    const update = updateSchema.parse(await request.json());
    const message = update.message;
    if (!message?.text?.startsWith("/start")) return NextResponse.json({ ok: true });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new Error("Mini app URL is missing.");
    await sendStartMessage(message.chat.id, message.from?.first_name ?? "", appUrl);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
