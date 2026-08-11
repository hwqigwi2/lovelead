"use client";
import Image from "next/image";
import { RefreshCw, Share2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { haptic, openSmartLink } from "@/components/telegram";
import { appConfig } from "@/lib/config";
import type { LoveLeadUser } from "@/types";

interface ReferralInfo {
  code: string;
  link: string;
  invitedCount: number;
  referrals: Array<{ first_name: string; username: string | null; telegram_id: number; created_at: string }>;
}

const rewards = [
  {
    title: "250 ₽ за дебетовую карту",
    text: "Когда твой друг выполнит задание по дебетовой карте, с тобой свяжется менеджер для выплаты.",
  },
  {
    title: "1000 ₽ за расчётный счёт",
    text: "Когда твой друг выполнит задание по расчётному счёту, с тобой свяжется менеджер для выплаты.",
  },
];

export function Profile({ user, initData, onRestart }: { user: LoveLeadUser; initData: string; onRestart: () => void }) {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/referral", { headers: { "x-telegram-init-data": initData } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить данные. Попробуйте ещё раз.");
      }
    })();
  }, [initData]);

  const share = () => {
    if (!info) return;
    haptic("impact");
    const url = `https://t.me/share/url?url=${encodeURIComponent(info.link)}&text=${encodeURIComponent(appConfig.referralShareText)}`;
    openSmartLink(url);
  };

  return (
    <section className="profile-page">
      <header className="profile-card">
        <div className="profile-avatar">
          {user.avatar_url ? <Image src={user.avatar_url} alt="" fill sizes="64px" /> : user.first_name.slice(0, 1)}
        </div>
        <div className="profile-name">
          <h2>{user.first_name}</h2>
          {user.username && <p>@{user.username}</p>}
        </div>
      </header>
      <div className="profile-stats">
        <Users size={18} />
        <span>Приглашено: <strong>{info?.invitedCount ?? 0}</strong></span>
      </div>
      <button className="primary-button" onClick={share} disabled={!info}>
        <span>Поделиться</span><Share2 size={18} />
      </button>
      {info && <p className="referral-link">{info.link}</p>}
      {rewards.map((reward) => (
        <article className="profile-reward" key={reward.title}>
          <h3>{reward.title}</h3>
          <p>{reward.text}</p>
        </article>
      ))}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="restart-button" onClick={onRestart}><RefreshCw size={16} />Пройти опрос заново</button>
    </section>
  );
}
