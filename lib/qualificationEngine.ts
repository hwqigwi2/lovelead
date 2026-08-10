import { appConfig } from "./config";
import type { QualificationInput, TaskSlug } from "@/types";

export function getAvailableTaskSlugs(input: QualificationInput): TaskSlug[] {
  if (input.age < 18) return [];
  const available: TaskSlug[] = [];
  if (!input.has_tbank) available.push("tbank");
  if (!input.is_military && !input.has_arrest) available.push("rko", "mfo");
  return appConfig.taskOrder.filter((slug) => available.includes(slug));
}

export function isTaskAvailable(input: QualificationInput, slug: TaskSlug): boolean {
  return getAvailableTaskSlugs(input).includes(slug);
}

export function hasQualification(input: Partial<Record<keyof QualificationInput, unknown>>): input is QualificationInput {
  return typeof input.age === "number" && typeof input.has_tbank === "boolean" && typeof input.has_ip === "boolean" && typeof input.has_npd === "boolean" && typeof input.is_military === "boolean" && typeof input.has_arrest === "boolean";
}
