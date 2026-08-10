"use client";
import Image from "next/image";
import { Headphones, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BottomNav, type NavView } from "@/components/BottomNav";
import { Faq } from "@/components/Faq";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetail } from "@/components/TaskDetail";
import { openExternal } from "@/components/telegram";
import type { LoveLeadUser, PartnerTask } from "@/types";

const Reviews = dynamic(() => import("@/components/Reviews").then((mod) => mod.Reviews), { ssr: false });
export function Dashboard({ user, initData, onRestart }: { user: LoveLeadUser; initData: string; onRestart: () => void }) {
  const [tasks, setTasks] = useState<PartnerTask[]>([]); const [view, setView] = useState<NavView>("home"); const [selected, setSelected] = useState<PartnerTask | null>(null); const [error, setError] = useState("");
  const loadTasks = async () => { try { const response = await fetch("/api/tasks", { headers: { "x-telegram-init-data": initData } }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setTasks(data.tasks); } catch (err) { setError(err instanceof Error ? err.message : "Не удалось загрузить данные. Попробуйте ещё раз."); } };
  useEffect(() => { void loadTasks(); }, []); // initial authenticated task fetch
  useEffect(() => { const back = () => setSelected(null); const app = window.Telegram?.WebApp; if (selected) { app?.BackButton.show(); app?.BackButton.onClick(back); } else app?.BackButton.hide(); return () => app?.BackButton.offClick(back); }, [selected]);
  if (selected) return <TaskDetail task={selected} initData={initData} onClose={() => setSelected(null)} onStarted={() => void loadTasks()} />;
  const content = view === "help" ? <><Faq /><button className="support-button" onClick={() => openExternal(process.env.NEXT_PUBLIC_SUPPORT_URL ?? "https://t.me/katemode")}><Headphones size={19} />Написать в поддержку</button></> : <><section className="home-intro"><span className="eyebrow">LOVELEAD</span><h1>{view === "home" ? "Задания для тебя" : "Доступные задания"}</h1><p>{view === "home" ? "Подобрали задания, которые доступны тебе." : "Выбери задание и узнай условия до перехода."}</p></section>{error ? <p className="form-error">{error}</p> : tasks.length ? <div className="task-list">{tasks.map((task) => <TaskCard task={task} key={task.id} onOpen={() => setSelected(task)} />)}</div> : <div className="empty-inline"><Image src="/logo.png" alt="LoveLead" width={90} height={60} /><h2>Пока нет подходящих заданий</h2><p>Проверь доступность заданий позже.</p></div>}{view === "home" && <><Reviews /><Faq /></>}<button className="restart-button" onClick={onRestart}><RefreshCw size={16} />Пройти опрос заново</button></>;
  return <main className="dashboard"><header className="app-header"><div className="avatar">{user.avatar_url ? <Image src={user.avatar_url} alt="" fill sizes="40px" /> : user.first_name.slice(0, 1)}</div><p>Привет, <strong>{user.first_name}</strong></p></header>{content}<BottomNav view={view} onChange={setView} /></main>;
}
