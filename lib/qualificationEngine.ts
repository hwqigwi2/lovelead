import { appConfig } from "./config";
import type { QualificationInput, RkoQuizResult, TaskSlug } from "@/types";

export function getAvailableTaskSlugs(input: QualificationInput): TaskSlug[] {
  if (input.age < 18) return [];
  const available: TaskSlug[] = [];
  if (!input.has_tbank) available.push("tbank");
  if (!input.is_military && !input.has_arrest) available.push("tbank-rko", "rko", "mfo");
  return appConfig.taskOrder.filter((slug) => available.includes(slug));
}

export function isTaskAvailable(input: QualificationInput, slug: TaskSlug): boolean {
  return getAvailableTaskSlugs(input).includes(slug);
}

export function hasQualification(input: Partial<Record<keyof QualificationInput, unknown>>): input is QualificationInput {
  return typeof input.age === "number" && typeof input.has_tbank === "boolean" && typeof input.is_military === "boolean" && typeof input.has_arrest === "boolean";
}

// Гайд «Как это работает» нужен всем, у кого нет действующего ИП/НПД/самозанятости.
// Статус есть + знает процесс → сразу к заданию; во всех остальных случаях → гайд.
export function isRkoGuideRequired(input: RkoQuizResult): boolean {
  return !input.has_business || !input.knows_process;
}
