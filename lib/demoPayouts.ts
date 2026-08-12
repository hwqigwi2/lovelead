// Детерминированные demo-выплаты. Источник истины — чистая функция от текущего
// времени и фиксированного epoch: при одном и том же моменте времени любой клиент
// вычисляет один и тот же набор. НЕ реальные транзакции, НЕ хранятся в БД.

export const DEMO_PAYOUT_COUNT = 10;

// Фиксированная точка отсчёта в будущем (одинакова для всех клиентов).
// От неё назад во времени строится цепочка слотов с интервалом 20–60 минут.
const EPOCH_MS = Date.UTC(2100, 0, 1, 0, 0, 0);

// Демо-суммы: 1500–12500, только шаг 500.
const AMOUNTS = [
  1500,
  2000,
  2500,
  3000,
  3500,
  4000,
  4500,
  5000,
  5500,
  6000,
  6500,
  7000,
  7500,
  8000,
  8500,
  9000,
  9500,
  10000,
  10500,
  11000,
  11500,
  12000,
  12500,
];

const CYRILLIC = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ";

export interface DemoPayout {
  time: string;
  amount: string;
  name: string;
  method: "cards" | "sbp";
}

interface Slot {
  slot: number;
  start: number;
}

// mulberry32 — маленький детерминированный PRNG по числовому seed.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (
  rand: () => number,
  min: number,
  max: number
): number => {
  return min + Math.floor(rand() * (max - min + 1));
};

// Детерминированный seed для слота: FNV-1a над номером слота.
function seedFor(slot: number): number {
  let h = 2166136261;

  for (const c of String(slot)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

// Интервал между выплатами: 20–60 минут включительно.
// Для каждого слота интервал всегда одинаковый,
// поэтому у всех пользователей последовательность совпадает.
export function intervalMinutesFor(slot: number): number {
  const rand = mulberry32(seedFor(slot) ^ 0x9e3779b9);

  return int(rand, 20, 60);
}

// Итерируемая цепочка слотов: от эпохи назад во времени.
// Каждый следующий слот отстоит от предыдущего на 20–60 минут.
function* slotTimeline(): Generator<Slot> {
  let start = EPOCH_MS;

  for (let slot = 0; ; slot++) {
    yield {
      slot,
      start,
    };

    start -= intervalMinutesFor(slot) * 60_000;
  }
}

function formatTime(ms: number): string {
  const d = new Date(ms);

  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function buildPayout(
  slot: number,
  startMs: number
): DemoPayout {
  const rand = mulberry32(seedFor(slot));

  const amount = AMOUNTS[
    int(rand, 0, AMOUNTS.length - 1)
  ];

  const firstNameLetter =
    CYRILLIC[
      int(rand, 0, CYRILLIC.length - 1)
    ];

  const lastNameLetter =
    CYRILLIC[
      int(rand, 0, CYRILLIC.length - 1)
    ];

  const firstNameStars = int(rand, 4, 9);
  const lastNameStars = int(rand, 4, 9);

  const name =
    `${firstNameLetter}${"*".repeat(firstNameStars)} ` +
    `${lastNameLetter}${"*".repeat(lastNameStars)}`;

  const method = rand() < 0.5
    ? "cards"
    : "sbp";

  return {
    time: formatTime(startMs),
    amount: `${amount
      .toLocaleString("ru-RU")
      .replace(/,/g, " ")} ₽`,
    name,
    method,
  };
}

// Последние N demo-выплат на момент nowMs.
//
// Все данные полностью детерминированы:
// одинаковый nowMs → одинаковые 10 выплат
// у любого пользователя.
//
// Самая свежая выплата находится первой.
// Самая старая из десяти — последней.
export function getDemoPayouts(
  nowMs: number
): DemoPayout[] {
  const limit = Math.min(
    nowMs,
    EPOCH_MS - 1
  );

  const all: Slot[] = [];

  for (const entry of slotTimeline()) {
    if (entry.start <= limit) {
      all.push(entry);
    }

    // Небольшой запас, после которого дальше идти не нужно.
    if (
      all.length >=
      DEMO_PAYOUT_COUNT + 5
    ) {
      break;
    }
  }

  all.sort(
    (a, b) => b.start - a.start
  );

  return all
    .slice(0, DEMO_PAYOUT_COUNT)
    .map((entry) =>
      buildPayout(
        entry.slot,
        entry.start
      )
    );
}