import { EyeOff, RotateCcw } from "lucide-react";
import type { AdminUser, UserTask } from "./AdminPanel";

const TASK_SLUGS = ["tbank", "rko", "mfo"] as const;
const CHIP_DEFS: Array<{ key: keyof AdminUser; label: string }> = [
  { key: "has_tbank", label: "T-Банк" },
  { key: "has_ip", label: "ИП" },
  { key: "has_npd", label: "НПД" },
  { key: "is_military", label: "Военный" },
  { key: "has_arrest", label: "Аресты" },
];

const STATUS_LABELS: Record<string, string> = {
  available: "Доступно",
  started: "В процессе",
  hidden: "Скрыто",
};

type Props = {
  user: AdminUser;
  updatingTask: string | null;
  onHide: (taskId: string, title: string) => void;
  onUnhide: (taskId: string) => void;
};

export function UserCard({ user, updatingTask, onHide, onUnhide }: Props) {
  const initial = user.first_name.trim().charAt(0).toUpperCase() || "·";
  const bySlug = new Map<string, UserTask>();
  for (const row of user.user_tasks) {
    if (row.tasks) bySlug.set(row.tasks.slug, row);
  }

  type Row = { key: string; title: string; status: string; taskId: string | null };
  const rows: Row[] = [];
  for (const [slug, row] of bySlug) {
    rows.push({ key: slug, title: row.tasks?.title ?? slug, status: row.status, taskId: row.task_id });
  }
  const known = new Set(rows.map((row) => row.key));
  for (const slug of user.availableTasks) {
    if (!known.has(slug)) {
      rows.push({ key: slug, title: taskTitle(slug), status: "available", taskId: null });
    }
  }
  rows.sort((a, b) => TASK_SLUGS.indexOf(a.key as (typeof TASK_SLUGS)[number]) - TASK_SLUGS.indexOf(b.key as (typeof TASK_SLUGS)[number]));

  return (
    <article className="admin-user">
      <header className="admin-user-head">
        <span className="avatar">{initial}</span>
        <div className="admin-user-title">
          <h2>
            {user.first_name}
            {user.username && <small> @{user.username}</small>}
          </h2>
          <p>ID: {user.telegram_id} · возраст: {user.age ?? "—"}</p>
        </div>
      </header>

      <div className="admin-chips">
        {CHIP_DEFS.map((chip) => {
          const value = user[chip.key];
          if (value === null || value === undefined) {
            return <span key={chip.key} className="admin-chip admin-chip-empty">{chip.label}: —</span>;
          }
          return (
            <span key={chip.key} className={`admin-chip ${value ? "admin-chip-yes" : "admin-chip-no"}`}>
              {chip.label}: {value ? "да" : "нет"}
            </span>
          );
        })}
      </div>

      <ul className="admin-task-list">
        {rows.length === 0 && <li className="admin-task-row admin-task-row-empty">Нет доступных заданий</li>}
        {rows.map((row) => {
          const busy = row.taskId !== null && updatingTask === `${user.id}:${row.taskId}`;
          return (
            <li key={row.key} className="admin-task-row">
              <span className="admin-task-name">{row.title}</span>
              <span className={`admin-badge admin-badge-${row.status}`}>{STATUS_LABELS[row.status] ?? row.status}</span>
              {row.status === "hidden" && row.taskId ? (
                <button type="button" className="admin-action admin-action-ghost" disabled={busy} onClick={() => onUnhide(row.taskId!)}>
                  <RotateCcw size={13} /> {busy ? "…" : "Вернуть"}
                </button>
              ) : row.status !== "hidden" && row.taskId ? (
                <button type="button" className="admin-action" disabled={busy} onClick={() => onHide(row.taskId!, row.title)}>
                  <EyeOff size={13} /> {busy ? "…" : "Скрыть"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function taskTitle(slug: string): string {
  switch (slug) {
    case "tbank": return "T-Банк";
    case "rko": return "РКО для бизнеса";
    case "mfo": return "Займы и МФО";
    default: return slug;
  }
}
