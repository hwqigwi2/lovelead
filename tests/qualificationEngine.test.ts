import { describe, expect, it } from "vitest";
import { applyTaskDependencies, getAvailableTaskSlugs, hasQualification, isRkoGuideRequired, isTaskAvailable } from "../lib/qualificationEngine";
import { appConfig, RKO_CONDITIONS, RKO_DESCRIPTION } from "../lib/config";
import { rkoGuideSteps } from "../components/RkoGuide";

const input = (overrides = {}) => ({ age: 18, is_military: false, has_arrest: false, ...overrides });

describe("qualification engine", () => {
  it("qualifies an eligible user for all tasks", () => expect(getAvailableTaskSlugs(input())).toEqual(["debet", "rko", "tbank-rko"]));
  it("military users can see debet", () => expect(getAvailableTaskSlugs(input({ is_military: true }))).toEqual(["debet"]));
  it("military users cannot see rko or tbank-rko", () => {
    const slugs = getAvailableTaskSlugs(input({ is_military: true }));
    expect(slugs).not.toContain("rko");
    expect(slugs).not.toContain("tbank-rko");
  });
  it("users with arrests get no tasks", () => expect(getAvailableTaskSlugs(input({ has_arrest: true }))).toEqual([]));
  it("does not qualify minors", () => expect(getAvailableTaskSlugs(input({ age: 17 }))).toEqual([]));
  it("qualifies a user at the lower age boundary (18)", () => expect(getAvailableTaskSlugs(input({ age: 18 })).length).toBeGreaterThan(0));
  it("isTaskAvailable reflects available slugs", () => {
    expect(isTaskAvailable(input(), "debet")).toBe(true);
    expect(isTaskAvailable(input(), "tbank-rko")).toBe(true);
    expect(isTaskAvailable(input({ is_military: true }), "rko")).toBe(false);
    expect(isTaskAvailable(input({ age: 17 }), "debet")).toBe(false);
  });
  it("hasQualification validates all required fields", () => {
    expect(hasQualification(input())).toBe(true);
    expect(hasQualification({})).toBe(false);
    expect(hasQualification({ age: 18, is_military: false })).toBe(false);
    expect(hasQualification({ ...input(), is_military: "no" })).toBe(false);
  });
});

describe("general quiz", () => {
  it("does not use IP/NPD or has_tbank answers", () => {
    expect(hasQualification({ age: 18, is_military: false, has_arrest: false })).toBe(true);
    expect(Object.keys(input())).not.toContain("has_ip");
    expect(Object.keys(input())).not.toContain("has_npd");
    expect(Object.keys(input())).not.toContain("has_tbank");
  });
});

describe("applyTaskDependencies", () => {
  it("locks tbank-rko until rko is completed", () => {
    const slugs = getAvailableTaskSlugs(input());
    expect(applyTaskDependencies(slugs, [])).toEqual(["debet", "rko"]);
    expect(applyTaskDependencies(slugs, [])).not.toContain("tbank-rko");
  });
  it("unlocks tbank-rko once rko is completed", () => {
    const slugs = getAvailableTaskSlugs(input());
    expect(applyTaskDependencies(slugs, ["rko"])).toEqual(["debet", "rko", "tbank-rko"]);
  });
  it("keeps non-dependent slugs untouched", () => {
    expect(applyTaskDependencies(["debet"], [])).toEqual(["debet"]);
  });
});

describe("rko guide requirement", () => {
  it("existing business status + knows process → no tutorial required", () => expect(isRkoGuideRequired({ has_business: true, knows_process: true })).toBe(false));
  it("existing business status + does not know → tutorial required", () => expect(isRkoGuideRequired({ has_business: true, knows_process: false })).toBe(true));
  it("no business status + knows → tutorial required", () => expect(isRkoGuideRequired({ has_business: false, knows_process: true })).toBe(true));
  it("no business status + does not know → tutorial required", () => expect(isRkoGuideRequired({ has_business: false, knows_process: false })).toBe(true));
});

describe("task config", () => {
  it("task order is debet, rko, tbank-rko", () => {
    expect(appConfig.taskOrder).toEqual(["debet", "rko", "tbank-rko"]);
    expect(Object.keys(appConfig.tasks)).toEqual(["debet", "rko", "tbank-rko"]);
  });
  it("debet card config", () => {
    expect(appConfig.tasks.debet.title).toBe("Дебетовые карты");
    expect(appConfig.tasks.debet.payoutLabel).toBe("до 5 000 ₽");
    expect(appConfig.tasks.debet.cta).toBe("Оформить");
  });
  it("Alfa business card payout is 5000", () => expect(appConfig.tasks.rko.payout).toBe(5000));
  it("T-Bank business card payout is 2000", () => expect(appConfig.tasks["tbank-rko"].payout).toBe(2000));
  it("both have difficulty 3/5", () => {
    expect(appConfig.tasks.rko.difficulty).toBe("3/5");
    expect(appConfig.tasks["tbank-rko"].difficulty).toBe("3/5");
  });
  it("both have category Популярно", () => {
    expect(appConfig.tasks.rko.category).toBe("Популярно");
    expect(appConfig.tasks["tbank-rko"].category).toBe("Популярно");
  });
  it("Alfa payout label is «5 000 ₽»", () => expect(appConfig.tasks.rko.payoutLabel).toBe("5 000 ₽"));
  it("T-Bank payout label is «от 2 000 ₽»", () => expect(appConfig.tasks["tbank-rko"].payoutLabel).toBe("от 2 000 ₽"));
  it("both RKO tasks have CTA «Оформить бизнес-карту»", () => {
    expect(appConfig.tasks.rko.cta).toBe("Оформить бизнес-карту");
    expect(appConfig.tasks["tbank-rko"].cta).toBe("Оформить бизнес-карту");
  });
  it("titles include the business card naming", () => {
    expect(appConfig.tasks.rko.title).toBe("Расчетный счет (Бизнес-карта) Альфа-Банк");
    expect(appConfig.tasks["tbank-rko"].title).toBe("Расчетный счет (Бизнес-карта) Т-Банк");
  });
  it("manager URL is the hardcoded chat link", () => expect(appConfig.managerUrl).toBe("https://t.me/m/bdpKeV7XZWVh"));
});

describe("rko shared content", () => {
  it("both RKO tasks share the new description", () => {
    const expected = "Бесплатно откроем ИП на НПД даже если бизнеса нет и не планировался. Никаких вложений ни сейчас, ни потом. Оформляешь карту и выполняешь условия";
    expect(RKO_DESCRIPTION).toBe(expected);
    expect(appConfig.tasks.rko.description).toBe(expected);
    expect(appConfig.tasks["tbank-rko"].description).toBe(expected);
  });
  it("RKO conditions include «Напиши менеджеру» instead of the card link step", () => {
    expect(RKO_CONDITIONS).toContain("Напиши менеджеру");
    expect(RKO_CONDITIONS).not.toContain("Оформи бизнес-карту по ссылке");
    expect(appConfig.tasks.rko.conditions).toBe(RKO_CONDITIONS);
    expect(appConfig.tasks["tbank-rko"].conditions).toBe(RKO_CONDITIONS);
  });
  it("T-Bank RKO uses the Alfa RKO url", () => expect(appConfig.tasks["tbank-rko"].url).toBe(appConfig.tasks.rko.url));
  it("rko guide has exactly 5 steps with the new titles", () => {
    expect(rkoGuideSteps.map((step) => step.title)).toEqual(["Легально и без заморочек", "Что такое самозанятость и НПД?", "Да, это два в одном", "Всё законно", "Как всё работает"]);
  });
});

describe("debet task", () => {
  it("has exactly the 4 new steps", () => {
    expect(appConfig.tasks.debet.conditions).toEqual([
      "Нажми кнопку «Оформить»",
      "Отправь менеджеру заготовленное сообщение",
      "Оформи карту",
      "Получи выплату",
    ]);
  });
  it("keeps the Оформить CTA pointing at the manager link", () => {
    expect(appConfig.tasks.debet.cta).toBe("Оформить");
    expect(appConfig.tasks.debet.url).toBe("https://t.me/m/FjrqCMxDYjJh");
  });
  it("Alfa RKO keeps its CTA and manager link", () => {
    expect(appConfig.tasks.rko.url).toBe("https://t.me/m/1zR4iOFJMmUy");
  });
});
