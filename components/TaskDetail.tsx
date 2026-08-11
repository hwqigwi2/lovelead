"use client";
import Image from "next/image";
import { ArrowUpRight, Clock3, X } from "lucide-react";
import { useState } from "react";
import { RkoGuide } from "@/components/RkoGuide";
import { haptic, openSmartLink } from "@/components/telegram";
import { appConfig } from "@/lib/config";
import type { PartnerTask, TaskSlug } from "@/types";

const RKO_SLUGS: TaskSlug[] = ["rko", "tbank-rko"];

export function TaskDetail({ task, initData, onClose, onStarted }: { task: PartnerTask; initData: string; onClose: () => void; onStarted: () => void }) {
  const [showGuide, setShowGuide] = useState(false);
  const [error, setError] = useState("");
  const go = async () => {
    if (!task.url) return;
    try {
      const response = await fetch(`/api/tasks/${task.id}/start`, { method: "POST", headers: { "x-telegram-init-data": initData } });
      if (!response.ok) throw new Error((await response.json()).error);
      haptic("impact");
      onStarted();
      openSmartLink(task.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные. Попробуйте ещё раз.");
    }
  };
  const isRko = RKO_SLUGS.includes(task.slug);
  if (showGuide) return <RkoGuide onCompleted={() => setShowGuide(false)} />;
  return (
    <main className="detail-page">
      <button className="close-button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
      <div className="detail-image"><Image src={task.image} alt={task.title} fill sizes="100vw" priority /></div>
      <section className="detail-card">
        <span className="eyebrow">{task.category}</span>
        <div className="task-title-row"><h1>{task.title}</h1><strong>{task.payout_label}</strong></div>
        <div className="detail-facts"><span><Clock3 size={16} />{task.time_label}</span><span>Сложность · {task.difficulty}</span></div>
        <p>{task.description}</p>
        <h2>Что предстоит сделать</h2>
        <ol>{task.conditions?.map((item) => <li key={item}>{item}</li>)}</ol>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" onClick={() => void go()} disabled={!task.url}>
          <span>{task.url ? (task.cta ?? "Перейти к заданию") : (task.cta ?? "Скоро будет доступно")}</span>
          {task.url && <ArrowUpRight size={19} />}
        </button>
        {!isRko && <button className="secondary-button manager-button" onClick={() => { haptic(); openSmartLink(appConfig.managerUrl); }}>Написать менеджеру</button>}
        {isRko && <button className="secondary-button" onClick={() => { haptic(); setShowGuide(true); }}>Как это работает</button>}
      </section>
    </main>
  );
}
