import type { TaskSlug } from "@/types";

const env = (key: string, fallback = "") => process.env[key] ?? fallback;

export const RKO_DESCRIPTION = "Подходит тем, кто ведёт своё дело или работает на себя. Оформи бизнес-карту и выполни условия задания. Если ты впервые сталкиваешься с ИП, самозанятостью или бизнес-картами, раздел «Как это работает» объяснит всё простыми словами.";

export const RKO_CONDITIONS = ["Разберись, какой статус подходит тебе (раздел «Как это работает» в помощь)", "Оформи нужный статус, если его ещё нет", "Оформи бизнес-карту по ссылке", "Выполни условия задания", "Получи выплату по условиям задания"];

export const appConfig = {
  supportUrl: env("NEXT_PUBLIC_SUPPORT_URL", "https://t.me/katemode"),
  managerUrl: env("NEXT_PUBLIC_MANAGER_URL") || env("NEXT_PUBLIC_SUPPORT_URL", "https://t.me/katemode"),
  reviewsTelegramUrl: env("NEXT_PUBLIC_REVIEWS_URL", "https://t.me/example"),
  adminTelegramIds: env("ADMIN_TELEGRAM_IDS", "5258394536").split(",").map(Number),
  taskOrder: ["tbank", "tbank-rko", "rko", "mfo"] as TaskSlug[],
  tasks: {
    tbank: {
      slug: "tbank" as const, title: "Карта Т-Банк", category: "Карты", payout: 1000,
      payoutLabel: "1 000 ₽", timeLabel: "≈ 5 минут", difficulty: "1/5", image: "/tbank.jpg",
      url: env("NEXT_PUBLIC_TBANK_URL"), cta: "Оформить карту",
      description: "Оформи карту, получи её и выполни покупку от 500 ₽. После выполнения напиши менеджеру, чтобы получить выплату согласно условиям задания.",
      conditions: ["Оформи карту по ссылке", "После получения сделай покупку от 500 ₽", "Напиши менеджеру после выполнения условий"],
    },
    "tbank-rko": {
      slug: "tbank-rko" as const, title: "Бизнес-карта Т-Банк", category: "Популярно", payout: 2000,
      payoutLabel: "от 2 000 ₽", timeLabel: "Индивидуально", difficulty: "3/5", image: "/trko.jpg",
      url: env("NEXT_PUBLIC_TBANK_RKO_URL"), cta: "Оформить бизнес-карту",
      description: RKO_DESCRIPTION,
      conditions: RKO_CONDITIONS,
    },
    rko: {
      slug: "rko" as const, title: "Бизнес-карта Альфа-Банк", category: "Популярно", payout: 5000,
      payoutLabel: "5 000 ₽", timeLabel: "Индивидуально", difficulty: "3/5", image: "/arko.jpg",
      url: env("NEXT_PUBLIC_ALFA_RKO_URL"), cta: "Оформить бизнес-карту",
      description: RKO_DESCRIPTION,
      conditions: RKO_CONDITIONS,
    },
    mfo: {
      slug: "mfo" as const, title: "Быстрая выплата", category: "Партнёрское предложение", payout: null,
      payoutLabel: "до 24 000 ₽", timeLabel: "≈ 10 минут", difficulty: "1/5", image: "/mfo.jpg",
      url: env("NEXT_PUBLIC_MFO_URL"), cta: "Перейти к заданию",
      description: "Выполни условия задания партнёра и получи выплату согласно его условиям.",
      conditions: ["Перейди к заданию партнёра", "Выполни его условия", "Получи выплату согласно условиям"],
    },
  },
} as const;

export const taskUrlEnvKeys: Record<TaskSlug, string> = {
  tbank: "NEXT_PUBLIC_TBANK_URL", "tbank-rko": "NEXT_PUBLIC_TBANK_RKO_URL", rko: "NEXT_PUBLIC_ALFA_RKO_URL", mfo: "NEXT_PUBLIC_MFO_URL",
};
