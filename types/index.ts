export type TaskSlug = "debet" | "rko" | "tbank-rko";
export type UserTaskStatus = "available" | "started" | "hidden" | "locked" | "completed";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface LoveLeadUser {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
  age: number | null;
  has_tbank: boolean | null;
  has_ip: boolean | null;
  has_npd: boolean | null;
  is_military: boolean | null;
  has_arrest: boolean | null;
  quiz_completed: boolean;
  quiz_completed_at: string | null;
  rko_onboarding_completed: boolean;
  referral_code: string | null;
  referred_by: string | null;
}

export interface QualificationInput {
  age: number;
  is_military: boolean;
  has_arrest: boolean;
}

export type RkoBusinessStatus = "ip" | "self_employed" | "none";

export interface RkoQuizResult {
  has_business: boolean;
  knows_process: boolean;
}

export interface PartnerTask {
  id: string;
  slug: TaskSlug;
  title: string;
  category: string;
  description: string;
  payout: number | null;
  payout_label: string;
  time_label: string;
  difficulty: string;
  image: string;
  url: string | null;
  status: UserTaskStatus;
  lockReason?: string | null;
  conditions?: string[];
  cta?: string;
}
