"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { haptic } from "@/components/telegram";
import type { LoveLeadUser, QualificationInput } from "@/types";

const questions: Array<{ key: keyof QualificationInput; title: string; type: "age" | "boolean" }> = [
  { key: "age", title: "Сколько тебе лет?", type: "age" }, { key: "has_tbank", title: "Есть ли у тебя карта Т-Банк?", type: "boolean" }, { key: "has_ip", title: "Есть ли у тебя ИП?", type: "boolean" }, { key: "has_npd", title: "Есть ли у тебя самозанятость / НПД?", type: "boolean" }, { key: "is_military", title: "Ты сейчас военнослужащий?", type: "boolean" }, { key: "has_arrest", title: "Есть ли у тебя аресты или ограничения по банковским счетам?", type: "boolean" },
];

export function QuizFlow({ user, initData, onCompleted }: { user: LoveLeadUser; initData: string; onCompleted: (user: LoveLeadUser) => void }) {
  const [step, setStep] = useState(-1); const [answers, setAnswers] = useState<Partial<QualificationInput>>({}); const [ageDraft, setAgeDraft] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const answer = async (value: boolean | number) => {
    const question = questions[step]; const next = { ...answers, [question.key]: value }; setAnswers(next); haptic("selection");
    if (question.key === "age" && Number(value) < 18) { await submit({ ...next, has_tbank: false, has_ip: false, has_npd: false, is_military: false, has_arrest: false } as QualificationInput); return; }
    if (step < questions.length - 1) setStep((current) => current + 1); else await submit(next as QualificationInput);
  };
  const submit = async (payload: QualificationInput) => { setSaving(true); setError(""); try { const response = await fetch("/api/quiz", { method: "POST", headers: { "content-type": "application/json", "x-telegram-init-data": initData }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); onCompleted({ ...user, ...payload, quiz_completed: true }); } catch (err) { setError(err instanceof Error ? err.message : "Не удалось загрузить данные. Попробуйте ещё раз."); } finally { setSaving(false); } };
  if (step === -1) return <main className="welcome"><div className="welcome-copy"><span className="eyebrow">LOVELEAD</span><h1>Привет, {user.first_name}!</h1><p>Пройди небольшой опрос — и мы подберём задания, которые доступны тебе.</p></div><button className="primary-button" onClick={() => { haptic("impact"); setStep(0); }}><span>Начать</span><ArrowRight size={19} /></button></main>;
  const question = questions[step]; const percent = ((step + 1) / questions.length) * 100;
  return <main className="quiz"><div className="quiz-head"><button className="text-button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>Назад</button><span>{step + 1} из {questions.length}</span></div><div className="progress-track"><motion.div className="progress-value" animate={{ width: `${percent}%` }} /></div><AnimatePresence mode="wait"><motion.section key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="quiz-card"><h1>{question.title}</h1>{question.type === "age" ? <form onSubmit={(e) => { e.preventDefault(); const age = Number(ageDraft); if (Number.isInteger(age) && age >= 0 && age <= 120) void answer(age); else setError("Укажи корректный возраст."); }}><label className="sr-only" htmlFor="age">Возраст</label><input id="age" inputMode="numeric" autoFocus value={ageDraft} onChange={(e) => setAgeDraft(e.target.value.replace(/\D/g, ""))} placeholder="Например, 24" /><button className="primary-button" disabled={saving}><span>Продолжить</span><ArrowRight size={19} /></button></form> : <div className="answer-stack"><button className="answer-button" onClick={() => void answer(true)}><span>Да</span><Check size={19} /></button><button className="answer-button" onClick={() => void answer(false)}><span>Нет</span><Check size={19} /></button></div>}{error && <p className="form-error" role="alert">{error}</p>}</motion.section></AnimatePresence></main>;
}

export function EmptyState() { return <main className="empty-state"><h1>Пока нет подходящих заданий</h1><p>Проверь доступность заданий позже.</p></main>; }
