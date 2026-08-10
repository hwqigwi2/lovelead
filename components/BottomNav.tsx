"use client";
import { CircleHelp, House, ListChecks } from "lucide-react";

export type NavView = "home" | "tasks" | "help";
const nav = [{ id: "home" as const, label: "Главная", Icon: House }, { id: "tasks" as const, label: "Задания", Icon: ListChecks }, { id: "help" as const, label: "Помощь", Icon: CircleHelp }];
export function BottomNav({ view, onChange }: { view: NavView; onChange: (view: NavView) => void }) { return <nav className="bottom-nav" aria-label="Основная навигация">{nav.map(({ id, label, Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => onChange(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>; }
