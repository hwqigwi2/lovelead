"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { haptic, openSmartLink } from "@/components/telegram";
import { appConfig } from "@/lib/config";

const GUIDE_SECONDS = 5;

export const rkoGuideSteps = [
  {
    title: "Что такое ИП?",
    text: "ИП — это человек, который официально работает на себя: например, продаёт товары или оказывает услуги. Оформить ИП можно в налоговой или онлайн через банк — это стандартная процедура, которая занимает несколько дней.",
  },
  {
    title: "Что такое самозанятость и НПД?",
    text: "Самозанятость — это простой способ официально получать доход без оформления ИП. НПД — это название налогового режима для самозанятых: государство создало его специально для тех, кто работает на себя. Налог небольшой и считается автоматически в приложении «Мой налог».",
  },
  {
    title: "Можно ли открыть ИП и работать на НПД?",
    text: "Да, ИП тоже может применять НПД, если соблюдаются условия режима. Оформление ИП через официальные сервисы может проходить без госпошлины при электронной подаче, а сам НПД оформляется бесплатно через приложение «Мой налог». Точные условия зависят от твоей ситуации.",
  },
  {
    title: "Это легально и что потом делать?",
    text: "Да. Регистрация проходит официально через налоговую, а НПД — это законный налоговый режим. Налог считается по правилам НПД и оплачивается в приложении. Если что-то непонятно, менеджер поможет разобраться — это нормально.",
  },
  {
    title: "Что будет дальше?",
    text: "Всё просто: 1. Выбираешь подходящий статус (ИП или самозанятость). 2. Оформляешь его официально. 3. Оформляешь бизнес-карту банка по ссылке. 4. Выполняешь условия задания. 5. Пишешь менеджеру и получаешь выплату по условиям задания.",
  },
] as const;

export function RkoGuide({ onCompleted }: { onCompleted: () => void }) {
  const [step, setStep] = useState(0);
  const [stepReady, setStepReady] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setStepReady(false);
    const timeout = window.setTimeout(() => setStepReady(true), GUIDE_SECONDS * 1000);
    return () => window.clearTimeout(timeout);
  }, [step, finished]);

  const percent = useMemo(() => ((Math.min(step + 1, rkoGuideSteps.length)) / rkoGuideSteps.length) * 100, [step]);

  const next = () => {
    haptic("impact");
    if (step < rkoGuideSteps.length - 1) setStep((current) => current + 1);
    else setFinished(true);
  };
  const back = () => {
    haptic("selection");
    if (finished) setFinished(false);
    else if (step > 0) setStep((current) => current - 1);
  };

  if (finished) {
    return (
      <main className="quiz">
        <div className="quiz-head"><button className="guide-back-button" onClick={back}><ArrowLeft size={16} /> Назад</button><span>Финал</span></div>
        <div className="progress-track"><motion.div className="progress-value" animate={{ width: "100%" }} /></div>
        <motion.section initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} className="quiz-card">
          <span className="eyebrow">КАК ЭТО РАБОТАЕТ</span>
          <h1>Всё понятно?</h1>
          <p>Если остались вопросы — можешь написать менеджеру. Если всё понятно, можно перейти к оформлению.</p>
          <div className="answer-stack">
            <button className="answer-button" onClick={() => { haptic("impact"); openSmartLink(appConfig.managerUrl); }}><span>Задать вопрос менеджеру</span><ArrowRight size={19} /></button>
            <button className="primary-button" onClick={() => { haptic("impact"); onCompleted(); }}><span>Всё понятно, приступим</span><ArrowRight size={19} /></button>
          </div>
        </motion.section>
      </main>
    );
  }

  const screen = rkoGuideSteps[step];
  return (
    <main className="quiz">
      <div className="quiz-head">
        {step > 0 ? <button className="guide-back-button" onClick={back}><ArrowLeft size={16} /> Назад</button> : <span />}
        <span>{step + 1} из {rkoGuideSteps.length}</span>
      </div>
      <div className="progress-track"><motion.div className="progress-value" animate={{ width: `${percent}%` }} /></div>
      <AnimatePresence mode="wait">
        <motion.section key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="quiz-card">
          <span className="eyebrow">КАК ЭТО РАБОТАЕТ</span>
          <h1>{screen.title}</h1>
          <p>{screen.text}</p>
          <motion.button className="primary-button" onClick={next} disabled={!stepReady} animate={stepReady ? { scale: [1, 1.04, 1] } : undefined} transition={{ duration: 0.35 }}>
            <span>Далее</span><ArrowRight size={19} />
          </motion.button>
        </motion.section>
      </AnimatePresence>
    </main>
  );
}
