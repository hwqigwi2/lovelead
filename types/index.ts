export type TaskSlug = "tbank" | "rko" | "mfo";
export type UserTaskStatus = "available" | "started" | "hidden";

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
  quiz_restart_until: string | null;
}

export interface QualificationInput {
  age: number;
  has_tbank: boolean;
  has_ip: boolean;
  has_npd: boolean;
  is_military: boolean;
  has_arrest: boolean;
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
  conditions?: string[];
}
