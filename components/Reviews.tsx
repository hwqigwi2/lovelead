"use client";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { appConfig } from "@/lib/config";
import { openSmartLink } from "@/components/telegram";
import { getDemoPayouts } from "@/lib/demoPayouts";

const METHODS = {
  cards: { icon: "/cards.png", label: "Карты" },
  sbp: { icon: "/sbp.png", label: "СБП" },
} as const;

export function Reviews() {
  // Источник истины — getDemoPayouts(now): общий для всех клиентов, при refresh
  // даёт тот же набор. useMemo лишь мемоизирует детерминированный вызов на время
  // жизни компонента (не содержит случайности).
  const payouts = useMemo(() => getDemoPayouts(Date.now()), []);

  return (
    <section className="reviews-section" aria-labelledby="reviews-title">
      <div className="section-heading">
        <span className="eyebrow">ТЕКУЩИЕ</span>
        <h2 id="reviews-title">Выплаты</h2>
      </div>
      <div className="reviews-carousel">
        {payouts.map((payout, index) => (
          <article key={index} className="payout-card">
            <div className="payout-top">
              <span className="payout-time">{payout.time}</span>
              <span className="payout-method">
                <Image src={METHODS[payout.method].icon} alt="" width={18} height={18} />
                {METHODS[payout.method].label}
              </span>
            </div>
            <p className="payout-amount">{payout.amount}</p>
            <p className="payout-name">{payout.name}</p>
          </article>
        ))}
      </div>
      <button className="reviews-more" onClick={() => openSmartLink(appConfig.reviewsTelegramUrl)}>
        <span>Отзывы</span>
        <ArrowUpRight size={17} />
      </button>
    </section>
  );
}
