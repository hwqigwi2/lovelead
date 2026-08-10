"use client";

declare global { interface Window { Telegram?: { WebApp?: TelegramWebApp } } }
interface TelegramWebApp {
  initData: string; ready(): void; expand(): void; openLink(url: string): void;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback?: { selectionChanged(): void; impactOccurred(style: "light" | "medium"): void };
}

export function telegram() { return window.Telegram?.WebApp; }
export function haptic(kind: "selection" | "impact" = "selection") { const feedback = telegram()?.HapticFeedback; if (kind === "selection") feedback?.selectionChanged(); else feedback?.impactOccurred("light"); }
export function openExternal(url: string) { const app = telegram(); if (app) app.openLink(url); else window.open(url, "_blank", "noopener,noreferrer"); }
