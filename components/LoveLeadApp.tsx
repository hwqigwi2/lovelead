"use client";
import { useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { QuizFlow } from "@/components/QuizFlow";
import { telegram } from "@/components/telegram";
import type { LoveLeadUser } from "@/types";

export function LoveLeadApp() {
  const [state, setState] = useState<"loading" | "error" | "ready">("loading"); const [user, setUser] = useState<LoveLeadUser | null>(null); const [initData, setInitData] = useState(""); const [error, setError] = useState("");
  useEffect(() => { const app = telegram(); app?.ready(); app?.expand(); const data = app?.initData ?? ""; setInitData(data); if (!data) { setError("Не удалось определить аккаунт Telegram."); setState("error"); return; } void (async () => { try { const response = await fetch("/api/telegram/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ initData: data }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setUser(payload.user); setState("ready"); } catch (err) { setError(err instanceof Error ? err.message : "Не удалось загрузить данные. Попробуйте ещё раз."); setState("error"); } })(); }, []);
  const restart = async () => { if (!user) return; try { const response = await fetch("/api/quiz/restart", { method: "POST", headers: { "x-telegram-init-data": initData } }); if (!response.ok) throw new Error((await response.json()).error); setUser({ ...user, quiz_completed: false, quiz_completed_at: null, age: null, has_tbank: null, has_ip: null, has_npd: null, is_military: null, has_arrest: null }); } catch (err) { setError(err instanceof Error ? err.message : "Не удалось загрузить данные. Попробуйте ещё раз."); setState("error"); } };
  if (state === "loading") return <LoadingScreen />;
  if (state === "error" || !user) return <main className="auth-error"><div className="error-mark">LL</div><h1>{error}</h1><p>Открой приложение через кнопку в Telegram и попробуй ещё раз.</p></main>;
  if (!user.quiz_completed) return <QuizFlow user={user} initData={initData} onCompleted={setUser} />;
  return <Dashboard user={user} initData={initData} onRestart={restart} />;
}
