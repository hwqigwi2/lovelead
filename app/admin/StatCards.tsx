import { Building2, ClipboardCheck, CreditCard, EyeOff, Users } from "lucide-react";
import type { Stats } from "./AdminPanel";

type TaskStat = {
  key: string;
  label: string;
  icon: typeof CreditCard;
  available: number;
  started: number;
};

export function StatCards({ stats }: { stats: Stats }) {
  const tasks: TaskStat[] = [
    { key: "debet", label: "Дебетовые", icon: CreditCard, available: stats.debetAvailable, started: stats.debetStarted },
    { key: "rko", label: "РКО Альфа", icon: Building2, available: stats.rkoAvailable, started: stats.rkoStarted },
    { key: "tbank-rko", label: "РКО Т-Банк", icon: Building2, available: stats.tbankRkoAvailable, started: stats.tbankRkoStarted },
  ];

  return (
    <div className="admin-stats">
      <section className="admin-kpi-grid">
        <article className="admin-kpi">
          <span className="admin-kpi-icon"><Users size={18} /></span>
          <strong>{stats.totalUsers}</strong>
          <span className="admin-kpi-label">Всего пользователей</span>
        </article>
        <article className="admin-kpi">
          <span className="admin-kpi-icon"><ClipboardCheck size={18} /></span>
          <strong>{stats.quizCompleted}</strong>
          <span className="admin-kpi-label">Прошли опрос</span>
        </article>
        <article className="admin-kpi">
          <span className="admin-kpi-icon"><EyeOff size={18} /></span>
          <strong>{stats.hiddenTasks}</strong>
          <span className="admin-kpi-label">Скрыто заданий</span>
        </article>
      </section>

      <section className="admin-task-grid">
        {tasks.map((task) => (
          <article key={task.key} className="admin-task-stat">
            <header>
              <span className="admin-kpi-icon"><task.icon size={18} /></span>
              <h2>{task.label}</h2>
            </header>
            <div className="admin-task-metrics">
              <div><strong>{task.available}</strong><span>Доступно</span></div>
              <div><strong>{task.started}</strong><span>В процессе</span></div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
