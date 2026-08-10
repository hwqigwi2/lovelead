"use client";
import Image from "next/image";
import { Headphones, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BottomNav, type NavView } from "@/components/BottomNav";
import { Faq } from "@/components/Faq";
import { RkoGuide } from "@/components/RkoGuide";
import { RkoQuiz } from "@/components/RkoQuiz";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetail } from "@/components/TaskDetail";
import { openSmartLink } from "@/components/telegram";
import { appConfig } from "@/lib/config";
import type { LoveLeadUser, PartnerTask, TaskSlug } from "@/types";

const RKO_SLUGS: TaskSlug[] = ["rko", "tbank-rko"];

const Reviews = dynamic(() => import("@/components/Reviews").then((mod) => mod.Reviews), { ssr: false });
export function Dashboard({ user, initData, onRestart }: { user: LoveLeadUser; initData: string; onRestart: () => void }) {
  const [tasks, setTasks] = useState<PartnerTask[]>([]); const [view, setView] = useState<NavView>("home"); const [selected, setSelected] = useState<PartnerTask | null>(null); const [rkoStage, setRkoStage] = useState<"quiz" | "guide" | null>(null); const [rkoDone, setRkoDone] = useState(user.rko_onboarding_completed); const [error, setError] = useState("");
  const completeRkoOnboarding = () => { setRkoDone(true); void fetch("/api/rko-onboarding", { method: "POST", headers: { "x-telegram-init-data": initData } }).catch(() => undefined); };
  const loadTasks = async () => { try { const response = await fetch("/api/tasks", { headers: { "x-telegram-init-data": initData } }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setTasks(data.tasks); } catch (err) { setError(err instanceof Error ? err.message : "Не удалось загрузить данные. Попробуйте ещё раз."); } };
  useEffect(() => { void loadTasks(); }, []); // initial authenticated task fetch
  useEffect(() => { const back = () => { setSelected(null); setRkoStage(null); }; const app = window.Telegram?.WebApp; if (selected) { app?.BackButton.show(); app?.BackButton.onClick(back); } else app?.BackButton.hide(); return () => app?.BackButton.offClick(back); }, [selected]);
  const openTask = (task: PartnerTask) => { setSelected(task); setRkoStage(RKO_SLUGS.includes(task.slug) && !rkoDone ? "quiz" : null); };
  if (selected && rkoStage === "quiz") return <RkoQuiz onExit={() => { setSelected(null); setRkoStage(null); }} onCompleted={(guideRequired) => { if (!guideRequired) { completeRkoOnboarding(); setRkoStage(null); } else setRkoStage("guide"); }} />;
  if (selected && rkoStage === "guide") return <RkoGuide onCompleted={() => { completeRkoOnboarding(); setRkoStage(null); }} />;
  if (selected) return <TaskDetail task={selected} initData={initData} onClose={() => setSelected(null)} onStarted={() => void loadTasks()} />;
  const available = tasks.filter((task) => task.status !== "locked"); const locked = tasks.filter((task) => task.status === "locked");
  const taskSections = error ? <p className="form-error">{error}</p> : <><section className="home-intro"><span className="eyebrow">LOVELEAD</span><h1>Задания для тебя</h1><p>Подобрали задания, которые доступны тебе.</p></section>{available.length ? <div className="task-list">{available.map((task) => <TaskCard task={task} key={task.id} onOpen={() => openTask(task)} />)}</div> : locked.length ? <p className="empty-note">Сейчас доступных заданий нет.</p> : <div className="empty-inline"><Image src="/logo.png" alt="LoveLead" width={90} height={60} /><h2>Пока нет подходящих заданий</h2><p>Проверь доступность заданий позже.</p></div>}{locked.length > 0 && <section className="other-tasks"><h2>Другие задания</h2><div className="task-list locked-list">{locked.map((task) => <TaskCard task={task} key={task.id} onOpen={() => undefined} />)}</div></section>}</>;
  const content = view === "help" ? <><Faq /><button className="support-button" onClick={() => openSmartLink(appConfig.supportUrl)}><Headphones size={19} />Написать в поддержку</button></> : <>{taskSections}<Reviews /><Faq /><button className="restart-button" onClick={onRestart}><RefreshCw size={16} />Пройти опрос заново</button></>;
  return <main className="dashboard"><header className="app-header"><div className="avatar">{user.avatar_url ? <Image src={user.avatar_url} alt="" fill sizes="40px" /> : user.first_name.slice(0, 1)}</div><p>Привет, <strong>{user.first_name}</strong></p></header>{content}<BottomNav view={view} onChange={setView} /></main>;
}
