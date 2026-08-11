"use client";
import { House, UserRound } from "lucide-react";

export type NavView = "home" | "profile";
const nav = [{ id: "home" as const, label: "Главная", Icon: House }, { id: "profile" as const, label: "Профиль", Icon: UserRound }];
export function BottomNav({ view, onChange }: { view: NavView; onChange: (view: NavView) => void }) { return <nav className="bottom-nav" aria-label="Основная навигация">{nav.map(({ id, label, Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => onChange(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>; }
