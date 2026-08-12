"use client";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { appConfig } from "@/lib/config";
import { openSmartLink } from "@/components/telegram";

// Демонстрационные суммы выплат: только диапазон 1500–12500 с шагом 500.
// Это НЕ реальные транзакции и НЕ данные из БД — визуальные демо-примеры.
const AMOUNTS = [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 10500, 11000, 11500, 12000, 12500];

const METHODS = [
  { icon: "/cards.png", label: "Карты" },
  { icon: "/sbp.png", label: "СБП" },
] as const;

const CYRILLIC = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ";

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(list: readonly T[]): T => list[randomInt(0, list.length - 1)];

// Имя-заглушка: первая буква + 4–9 звёздочек. Не используем реальные данные.
function maskedName() {
  const first = pick([...CYRILLIC]);
  const last = pick([...CYRILLIC]);
  return `${first}${"*".repeat(randomInt(4, 9))} ${last}${"*".repeat(randomInt(4, 9))}`;
}

function formatAmount(value: number) {
  return `${value.toLocaleString("ru-RU").replace(/,/g, " ")} ₽`;
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

interface DemoPayout {
  time: string;
  amount: string;
  name: string;
  method: (typeof METHODS)[number];
}

// Генерируем один набор из 10 демо-выплат. Время идёт назад от "сейчас"
// со случайным интервалом 5–20 минут между соседними.
function buildDemoPayouts(): DemoPayout[] {
  let cursor = new Date();
  cursor = new Date(cursor.getTime() - randomInt(0, 20) * 60_000);
  return Array.from({ length: 10 }, () => {
    const entry: DemoPayout = {
      time: formatTime(cursor),
      amount: formatAmount(pick(AMOUNTS)),
      name: maskedName(),
      method: pick(METHODS),
    };
    cursor = new Date(cursor.getTime() - randomInt(5, 20) * 60_000);
    return entry;
  });
}

export function Reviews() {
  // useMemo: набор генерируется один раз при монтировании и не меняется
  // при перерисовках; при новом входе/перезагрузке создаётся заново.
  const payouts = useMemo(buildDemoPayouts, []);

  return (
    <section className="reviews-section" aria-labelledby="reviews-title">
      <div className="section-heading">
        <span className="eyebrow">ПРИМЕР НЕДАВНИЕ</span>
        <h2 id="reviews-title">Выплаты</h2>
      </div>
      <div className="reviews-carousel">
        {payouts.map((payout, index) => (
          <article key={index} className="payout-card">
            <div className="payout-top">
              <span className="payout-time">{payout.time}</span>
              <span className="payout-method">
                <Image src={payout.method.icon} alt="" width={18} height={18} />
                {payout.method.label}
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
