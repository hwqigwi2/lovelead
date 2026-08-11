"use client";
import Image from "next/image";
import { ArrowUpRight, Clock3, Lock, X } from "lucide-react";
import { useState } from "react";
import { RkoGuide } from "@/components/RkoGuide";
import { haptic, openSmartLink } from "@/components/telegram";
import type { PartnerTask, TaskSlug } from "@/types";

const RKO_SLUGS: TaskSlug[] = ["rko", "tbank-rko"];

export function TaskDetail({ task, initData, onClose, onStarted }: { task: PartnerTask; initData: string; onClose: () => void; onStarted: () => void }) {
  const [showGuide, setShowGuide] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const post = async () => {
    const response = await fetch(`/api/tasks/${task.id}/start`, { method: "POST", headers: { "x-telegram-init-data": initData } });
    if (!response.ok) throw new Error((await response.json()).error);
  };
  const start = async () => {
    try {
      setBusy(true);
      await post();
      haptic("impact");
      onStarted();
      if (task.url) openSmartLink(task.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };
  const isLocked = task.status === "locked";
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
        {isLocked && <p className="detail-lock"><Lock size={16} /> {task.lockReason ?? "Задание недоступно."}</p>}
        <p>{task.description}</p>
        <h2>Что предстоит сделать</h2>
        <ol>{task.conditions?.map((item) => <li key={item}>{item}</li>)}</ol>
        {error && <p className="form-error">{error}</p>}
        {isLocked ? null : task.status !== "available" ? (
          task.status === "started" && <p className="detail-progress">Задание в процессе</p>
        ) : (
          <button className="primary-button" onClick={() => void start()} disabled={busy || !task.url}>
            <span>{task.cta ?? "Перейти к заданию"}</span><ArrowUpRight size={19} />
          </button>
        )}
        {isRko && <button className="secondary-button" onClick={() => { haptic(); setShowGuide(true); }}>Как это работает</button>}
      </section>
    </main>
  );
}
