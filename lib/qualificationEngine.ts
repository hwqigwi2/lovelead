import { appConfig } from "./config";
import type { QualificationInput, RkoQuizResult, TaskSlug } from "@/types";

export function getAvailableTaskSlugs(input: QualificationInput): TaskSlug[] {
  if (input.age < 18) return [];
  // При арестах/ограничениях доступна только Альфа РКО; Т-Банк РКО откроется
  // после её выполнения (см. applyTaskDependencies), дебетовые карты недоступны.
  if (input.has_arrest) return appConfig.taskOrder.filter((slug) => slug !== "debet");
  const available: TaskSlug[] = ["debet"];
  if (!input.is_military) available.push("rko", "tbank-rko");
  return appConfig.taskOrder.filter((slug) => available.includes(slug));
}

export function isTaskAvailable(input: QualificationInput, slug: TaskSlug): boolean {
  return getAvailableTaskSlugs(input).includes(slug);
}

export function hasQualification(input: Partial<Record<keyof QualificationInput, unknown>>): input is QualificationInput {
  return typeof input.age === "number" && typeof input.is_military === "boolean" && typeof input.has_arrest === "boolean";
}

// tbank-rko открывается только после выполнения rko (Альфа расчетный счёт).
export function applyTaskDependencies(slugs: TaskSlug[], completedSlugs: TaskSlug[]): TaskSlug[] {
  return slugs.filter((slug) => slug !== "tbank-rko" || completedSlugs.includes("rko"));
}

// Гайд «Как это работает» нужен всем, у кого нет действующего ИП/НПД/самозанятости.
// Статус есть + знает процесс → сразу к заданию; во всех остальных случаях → гайд.
export function isRkoGuideRequired(input: RkoQuizResult): boolean {
  return !input.has_business || !input.knows_process;
}
