import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "LoveLead", description: "Задания с вознаграждением в Telegram" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
