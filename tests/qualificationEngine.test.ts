import { describe, expect, it } from "vitest";
import { getAvailableTaskSlugs, hasQualification, isTaskAvailable } from "../lib/qualificationEngine";

const input = (overrides = {}) => ({ age: 18, has_tbank: false, has_ip: false, has_npd: false, is_military: false, has_arrest: false, ...overrides });

describe("qualification engine", () => {
  it("qualifies an eligible new customer for all tasks", () => expect(getAvailableTaskSlugs(input())).toEqual(["tbank", "rko", "mfo"]));
  it("removes T-Bank when the user already has its card", () => expect(getAvailableTaskSlugs(input({ has_tbank: true }))).toEqual(["rko", "mfo"]));
  it("allows only T-Bank for military users without a T-Bank card", () => expect(getAvailableTaskSlugs(input({ is_military: true }))).toEqual(["tbank"]));
  it("returns no tasks for a military T-Bank customer", () => expect(getAvailableTaskSlugs(input({ has_tbank: true, is_military: true }))).toEqual([]));
  it("allows only T-Bank when accounts are restricted", () => expect(getAvailableTaskSlugs(input({ has_arrest: true }))).toEqual(["tbank"]));
  it("never qualifies RKO or MFO when arrest is true", () => expect(getAvailableTaskSlugs(input({ has_arrest: true })).includes("rko") || getAvailableTaskSlugs(input({ has_arrest: true })).includes("mfo")).toBe(false));
  it("never qualifies RKO or MFO when military is true", () => expect(getAvailableTaskSlugs(input({ is_military: true })).includes("rko") || getAvailableTaskSlugs(input({ is_military: true })).includes("mfo")).toBe(false));
  it("does not qualify minors", () => expect(getAvailableTaskSlugs(input({ age: 17 }))).toEqual([]));
  it("qualifies a user at the lower age boundary (18)", () => expect(getAvailableTaskSlugs(input({ age: 18 })).length).toBeGreaterThan(0));
  it("isTaskAvailable reflects available slugs", () => {
    expect(isTaskAvailable(input(), "tbank")).toBe(true);
    expect(isTaskAvailable(input({ has_tbank: true }), "tbank")).toBe(false);
    expect(isTaskAvailable(input({ age: 17 }), "rko")).toBe(false);
  });
  it("hasQualification validates all required fields", () => {
    expect(hasQualification(input())).toBe(true);
    expect(hasQualification({})).toBe(false);
    expect(hasQualification({ age: 18, has_tbank: false })).toBe(false);
    expect(hasQualification({ ...input(), has_ip: "yes" })).toBe(false);
  });
  it("returns no tasks for a user with arrests and an existing T-Bank card", () => expect(getAvailableTaskSlugs(input({ has_tbank: true, has_arrest: true }))).toEqual([]));
});
