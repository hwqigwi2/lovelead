import type { TaskSlug } from "@/types";

const env = (key: string, fallback = "") => process.env[key] ?? fallback;

export const RKO_DESCRIPTION = "Бесплатно откроем ИП на НПД даже если бизнеса нет и не планировался. Никаких вложений ни сейчас, ни потом. Оформляешь карту и выполняешь условия";

export const RKO_CONDITIONS = ["Разберись, какой статус подходит тебе (раздел «Как это работает» в помощь)", "Оформи нужный статус, если его ещё нет", "Напиши менеджеру", "Выполни условия задания", "Получи выплату по условиям задания"];

const ALFA_RKO_URL = "https://t.me/m/1zR4iOFJMmUy";
const ALFA_RKO_ARREST_URL = "https://t.me/m/USrX-QV0NzQy";

export const appConfig = {
  botUsername: "Leadslovebot",
  referralShareText: "LoveLead — выполняй задания и получай выплату прямо на карту 💸",
  supportUrl: "https://t.me/m/IhgXNvyFM2Yx",
  managerUrl: "https://t.me/m/bdpKeV7XZWVh",
  reviewsTelegramUrl: env("NEXT_PUBLIC_REVIEWS_URL", "https://t.me/Rep_LoveLead"),
  adminTelegramIds: env("ADMIN_TELEGRAM_IDS", "5258394536").split(",").map(Number),
  taskOrder: ["debet", "rko", "tbank-rko"] as TaskSlug[],
  tasks: {
    debet: {
      slug: "debet" as const, title: "Дебетовые карты", category: "Карты", payout: 5000,
      payoutLabel: "до 5 000 ₽", timeLabel: "≈ 5 минут", difficulty: "1/5", image: "/debet.jpg",
      url: "https://t.me/m/FjrqCMxDYjJh", cta: "Оформить",
      description: "Оформляй дебетовые карты, выполняй условия и получай выплату.",
      conditions: ["Нажми кнопку «Оформить»", "Отправь менеджеру заготовленное сообщение", "Оформи карту", "Получи выплату"],
    },
    rko: {
      slug: "rko" as const, title: "Расчетный счет (Бизнес-карта) Альфа-Банк", category: "Популярно", payout: 5000,
      payoutLabel: "5 000 ₽", timeLabel: "Индивидуально", difficulty: "3/5", image: "/arko.jpg",
      url: ALFA_RKO_URL, arrestUrl: ALFA_RKO_ARREST_URL, cta: "Оформить бизнес-карту",
      description: RKO_DESCRIPTION,
      conditions: RKO_CONDITIONS,
    },
    "tbank-rko": {
      slug: "tbank-rko" as const, title: "Расчетный счет (Бизнес-карта) Т-Банк", category: "Популярно", payout: 2000,
      payoutLabel: "от 2 000 ₽", timeLabel: "Индивидуально", difficulty: "3/5", image: "/trko.jpg",
      url: ALFA_RKO_URL, cta: "Оформить бизнес-карту",
      description: RKO_DESCRIPTION,
      conditions: RKO_CONDITIONS,
    },
  },
} as const;

// Ссылка на задание определяется только серверной логикой по сохранённым в БД
// данным пользователя. Клиент никогда не передаёт has_arrest для выбора ссылки.
export function resolveTaskUrl(slug: TaskSlug, user: { has_arrest: boolean | null }): string {
  if (slug === "rko" && user.has_arrest === true) return appConfig.tasks.rko.arrestUrl;
  return appConfig.tasks[slug].url;
}
