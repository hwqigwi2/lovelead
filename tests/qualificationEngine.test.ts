import { describe, expect, it } from "vitest";
import { getAvailableTaskSlugs, hasQualification, isRkoGuideRequired, isTaskAvailable } from "../lib/qualificationEngine";
import { appConfig } from "../lib/config";
import type { QualificationInput } from "../types";

const input = (overrides = {}) => ({ age: 18, has_tbank: false, is_military: false, has_arrest: false, ...overrides });

describe("qualification engine", () => {
  it("qualifies an eligible new customer for all tasks", () => expect(getAvailableTaskSlugs(input())).toEqual(["tbank", "tbank-rko", "rko", "mfo"]));
  it("removes T-Bank when the user already has its card", () => expect(getAvailableTaskSlugs(input({ has_tbank: true }))).toEqual(["tbank-rko", "rko", "mfo"]));
  it("allows only T-Bank for military users without a T-Bank card", () => expect(getAvailableTaskSlugs(input({ is_military: true }))).toEqual(["tbank"]));
  it("returns no tasks for a military T-Bank customer", () => expect(getAvailableTaskSlugs(input({ has_tbank: true, is_military: true }))).toEqual([]));
  it("allows only T-Bank when accounts are restricted", () => expect(getAvailableTaskSlugs(input({ has_arrest: true }))).toEqual(["tbank"]));
  it("never qualifies RKO or MFO when arrest is true", () => expect(getAvailableTaskSlugs(input({ has_arrest: true })).includes("tbank-rko") || getAvailableTaskSlugs(input({ has_arrest: true })).includes("rko") || getAvailableTaskSlugs(input({ has_arrest: true })).includes("mfo")).toBe(false));
  it("never qualifies RKO or MFO when military is true", () => expect(getAvailableTaskSlugs(input({ is_military: true })).includes("tbank-rko") || getAvailableTaskSlugs(input({ is_military: true })).includes("rko") || getAvailableTaskSlugs(input({ is_military: true })).includes("mfo")).toBe(false));
  it("does not qualify minors", () => expect(getAvailableTaskSlugs(input({ age: 17 }))).toEqual([]));
  it("qualifies a user at the lower age boundary (18)", () => expect(getAvailableTaskSlugs(input({ age: 18 })).length).toBeGreaterThan(0));
  it("isTaskAvailable reflects available slugs", () => {
    expect(isTaskAvailable(input(), "tbank")).toBe(true);
    expect(isTaskAvailable(input(), "tbank-rko")).toBe(true);
    expect(isTaskAvailable(input({ has_tbank: true }), "tbank")).toBe(false);
    expect(isTaskAvailable(input({ age: 17 }), "rko")).toBe(false);
  });
  it("hasQualification validates all required fields", () => {
    expect(hasQualification(input())).toBe(true);
    expect(hasQualification({})).toBe(false);
    expect(hasQualification({ age: 18, has_tbank: false })).toBe(false);
    expect(hasQualification({ ...input(), is_military: "no" })).toBe(false);
  });
  it("returns no tasks for a user with arrests and an existing T-Bank card", () => expect(getAvailableTaskSlugs(input({ has_tbank: true, has_arrest: true }))).toEqual([]));
});

describe("general quiz", () => {
  it("no longer requires IP/NPD questions", () => {
    expect(hasQualification({ age: 18, has_tbank: false, is_military: false, has_arrest: false })).toBe(true);
    expect(Object.keys(input())).not.toContain("has_ip");
    expect(Object.keys(input())).not.toContain("has_npd");
  });
});

describe("rko guide requirement", () => {
  it("existing business status + knows process → no tutorial required", () => expect(isRkoGuideRequired({ has_business: true, knows_process: true })).toBe(false));
  it("existing business status + does not know → tutorial required", () => expect(isRkoGuideRequired({ has_business: true, knows_process: false })).toBe(true));
  it("no business status + knows → tutorial required", () => expect(isRkoGuideRequired({ has_business: false, knows_process: true })).toBe(true));
  it("no business status + does not know → tutorial required", () => expect(isRkoGuideRequired({ has_business: false, knows_process: false })).toBe(true));
});

describe("rko task config", () => {
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
  it("manager URL is https://t.me/katemode", () => expect(appConfig.managerUrl).toBe("https://t.me/katemode"));
});
