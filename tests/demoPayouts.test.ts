import { describe, expect, it } from "vitest";
import { DEMO_PAYOUT_COUNT, getDemoPayouts, intervalMinutesFor } from "../lib/demoPayouts";

const amountValue = (amount: string) => Number(amount.replace(/[^\d]/g, ""));
const parseTime = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

describe("demoPayouts (детерминированная генерация)", () => {
  it("одинаковое время → одинаковые 10 выплат", () => {
    const now = Date.UTC(2026, 7, 12, 15, 0, 0);
    expect(getDemoPayouts(now)).toEqual(getDemoPayouts(now));
  });

  it("разные «клиенты» (одинаковый now) → одинаковый набор", () => {
    const now = Date.UTC(2026, 7, 12, 15, 0, 0);
    const userA = getDemoPayouts(now);
    const userB = getDemoPayouts(now);
    expect(userA).toEqual(userB);
  });

  it("refresh в пределах одного слота → тот же набор", () => {
    const t1 = Date.UTC(2026, 7, 12, 15, 5, 0);
    const t2 = Date.UTC(2026, 7, 12, 15, 7, 30);
    expect(getDemoPayouts(t1)).toEqual(getDemoPayouts(t2));
  });

  it("всегда ровно 10 выплат", () => {
    const now = Date.UTC(2026, 7, 12, 15, 0, 0);
    expect(getDemoPayouts(now)).toHaveLength(DEMO_PAYOUT_COUNT);
    expect(DEMO_PAYOUT_COUNT).toBe(10);
  });

  it("суммы кратны 500 и в диапазоне 1500–12500", () => {
    const now = Date.UTC(2026, 7, 12, 15, 0, 0);
    for (const payout of getDemoPayouts(now)) {
      const value = amountValue(payout.amount);
      expect(value % 500).toBe(0);
      expect(value).toBeGreaterThanOrEqual(1500);
      expect(value).toBeLessThanOrEqual(12500);
    }
  });

  it("имя по маске: буква + 4–9 звёздочек, дважды", () => {
    const now = Date.UTC(2026, 7, 12, 15, 0, 0);
    const pattern = /^[А-ЯЁ]\*{4,9} [А-ЯЁ]\*{4,9}$/;
    for (const payout of getDemoPayouts(now)) {
      expect(payout.name).toMatch(pattern);
    }
  });

  it("способ выплаты — только cards/sbp", () => {
    const now = Date.UTC(2026, 7, 12, 15, 0, 0);
    for (const payout of getDemoPayouts(now)) {
      expect(["cards", "sbp"]).toContain(payout.method);
    }
  });

  it("время идёт назад, интервал между соседними 20–60 минут", () => {
    // Сравниваем по внутренним временам слотов, а не только строкам "HH:MM"
    // (у полуночной границы строки «оборачиваются»). Используем time+дату:
    // интервал = разница соседних слотов, она по построению 20–60 минут.
    for (let slot = 4000; slot < 4030; slot++) {
      const v = intervalMinutesFor(slot);
      expect(v).toBeGreaterThanOrEqual(20);
      expect(v).toBeLessThanOrEqual(60);
    }
    // А строки идут «назад по модулю суток», т.е. prev = next - v.
    const now = Date.UTC(2026, 7, 12, 15, 0, 0);
    const payouts = getDemoPayouts(now);
    for (let i = 0; i + 1 < payouts.length; i++) {
      const cur = parseTime(payouts[i].time);
      const nxt = parseTime(payouts[i + 1].time);
      const diff = ((cur - nxt) % 1440 + 1440) % 1440; // назад по модулю суток
      expect(diff).toBeGreaterThanOrEqual(20);
      expect(diff).toBeLessThanOrEqual(60);
    }
  });

  it("переход через границу интервала → появляется новая общая выплата", () => {
    // Берём набор и шагаем вперёд за следующий слот: свежая выплата теперь другая.
    const now = Date.UTC(2026, 7, 12, 15, 0, 0);
    const before = getDemoPayouts(now);
    // Шаг вперёд на 65 минут гарантированно даёт новый свежий слот (макс интервал 60).
    const after = getDemoPayouts(now + 65 * 60_000);
    expect(after[0]).not.toEqual(before[0]); // новая первая выплата
    // Новая «after» должна содержать «before» как суффикс (сдвиг на k слотов).
    const shift = after.findIndex((p) => p.time === before[0].time && p.amount === before[0].amount && p.name === before[0].name);
    expect(shift).toBeGreaterThan(0);
    expect(after.slice(shift)).toEqual(before.slice(0, before.length - shift));
  });

  it("intervalMinutesFor детерминирован и в диапазоне 20–60", () => {
    for (let slot = 4090; slot < 4120; slot++) {
      const v = intervalMinutesFor(slot);
      expect(v).toBe(intervalMinutesFor(slot));
      expect(v).toBeGreaterThanOrEqual(20);
      expect(v).toBeLessThanOrEqual(60);
    }
  });
});
