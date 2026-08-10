"use client";
import { CircleHelp, House } from "lucide-react";

export type NavView = "home" | "help";
const nav = [{ id: "home" as const, label: "Главная", Icon: House }, { id: "help" as const, label: "Помощь", Icon: CircleHelp }];
export function BottomNav({ view, onChange }: { view: NavView; onChange: (view: NavView) => void }) { return <nav className="bottom-nav" aria-label="Основная навигация">{nav.map(({ id, label, Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => onChange(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>; }
