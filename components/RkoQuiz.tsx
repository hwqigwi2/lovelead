"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { haptic } from "@/components/telegram";
import { isRkoGuideRequired } from "@/lib/qualificationEngine";
import type { RkoBusinessStatus, RkoQuizResult } from "@/types";

const statuses: Array<{ value: RkoBusinessStatus; label: string }> = [
  { value: "ip", label: "Есть ИП" },
  { value: "self_employed", label: "Я самозанятый" },
  { value: "none", label: "Нет" },
];

export function RkoQuiz({ onCompleted, onExit }: { onCompleted: (guideRequired: boolean) => void; onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<RkoBusinessStatus | null>(null);

  const pickStatus = (value: RkoBusinessStatus) => {
    haptic("selection");
    setStatus(value);
    setStep(1);
  };
  const pickKnowledge = (knows: boolean) => {
    haptic("impact");
    if (!status) return;
    const result: RkoQuizResult = { has_business: status !== "none", knows_process: knows };
    onCompleted(isRkoGuideRequired(result));
  };

  const percent = ((step + 1) / 2) * 100;
  return (
    <main className="quiz">
      <div className="quiz-head">
        {step > 0 ? <button className="text-button" onClick={() => { haptic("selection"); setStep(0); }}><ArrowLeft size={15} /> Назад</button> : <button className="text-button" onClick={onExit}><ArrowLeft size={15} /> Назад</button>}
        <span>{step + 1} из 2</span>
      </div>
      <div className="progress-track"><motion.div className="progress-value" animate={{ width: `${percent}%` }} /></div>
      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.section key="status" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="quiz-card">
            <span className="eyebrow">ПАРА ВОПРОСОВ</span>
            <h1>Есть ли у тебя сейчас ИП, НПД или самозанятость?</h1>
            <div className="answer-stack">
              {statuses.map((item) => <button key={item.value} className="answer-button" onClick={() => pickStatus(item.value)}><span>{item.label}</span><ArrowRight size={19} /></button>)}
            </div>
          </motion.section>
        ) : (
          <motion.section key="knowledge" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="quiz-card">
            <span className="eyebrow">ПАРА ВОПРОСОВ</span>
            <h1>Знаешь, как оформить ИП на НПД?</h1>
            <div className="answer-stack">
              <button className="answer-button" onClick={() => pickKnowledge(true)}><span>Да</span><ArrowRight size={19} /></button>
              <button className="answer-button" onClick={() => pickKnowledge(false)}><span>Нет</span><ArrowRight size={19} /></button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
