"use client";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { telegram } from "@/components/telegram";
import { StatCards } from "./StatCards";
import { UserCard } from "./UserCard";

export type Stats = {
  totalUsers: number;
  quizCompleted: number;
  tbankAvailable: number;
  rkoAvailable: number;
  mfoAvailable: number;
  tbankStarted: number;
  rkoStarted: number;
  mfoStarted: number;
  hiddenTasks: number;
};

export type UserTask = {
  status: string;
  task_id: string;
  tasks: { slug: string; title: string } | null;
};

export type AdminUser = {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string;
  age: number | null;
  has_tbank: boolean | null;
  has_ip: boolean | null;
  has_npd: boolean | null;
  is_military: boolean | null;
  has_arrest: boolean | null;
  availableTasks: string[];
  user_tasks: UserTask[];
};

const GENERIC_ERROR = "Не удалось загрузить данные. Попробуйте ещё раз.";

export function AdminPanel() {
  const [initData, setInitData] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [error, setError] = useState("");
  const loadSeq = useRef(0);

  const headers = useCallback(() => ({ "x-telegram-init-data": initData }), [initData]);

  const load = useCallback(
    async (q: string, silent = false) => {
      if (!initData) return;
      const seq = ++loadSeq.current;
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const [statResponse, userResponse] = await Promise.all([
          fetch("/api/admin/stats", { headers: headers() }),
          fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { headers: headers() }),
        ]);
        const statData = await statResponse.json();
        const userData = await userResponse.json();
        if (!statResponse.ok || !userResponse.ok) throw new Error(statData.error ?? userData.error);
        if (seq !== loadSeq.current) return;
        setStats(statData);
        setUsers(userData.users);
        setError("");
      } catch (err) {
        if (seq !== loadSeq.current) return;
        setError(err instanceof Error ? err.message : GENERIC_ERROR);
      } finally {
        if (seq === loadSeq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [headers, initData],
  );

  useEffect(() => {
    setInitData(telegram()?.initData ?? "");
  }, []);

  useEffect(() => {
    void load(query);
  }, [initData]);

  // Дебаунс поиска ~300мс
  useEffect(() => {
    if (!initData) return;
    const timer = setTimeout(() => void load(query), 300);
    return () => clearTimeout(timer);
  }, [query, initData, load]);

  const setTaskStatus = async (userId: string, taskId: string, action: "hide" | "unhide") => {
    const key = `${userId}:${taskId}`;
    setUpdatingTask(key);
    try {
      const response = await fetch(`/api/admin/users/${userId}/tasks/${taskId}/${action}`, { method: "POST", headers: headers() });
      if (!response.ok) throw new Error((await response.json()).error);
      await load(query, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR);
    } finally {
      setUpdatingTask(null);
    }
  };

  const hideTask = async (userId: string, taskId: string, title: string) => {
    if (!window.confirm(`Скрыть задание «${title}» для этого пользователя?`)) return;
    await setTaskStatus(userId, taskId, "hide");
  };

  if (!initData && !error) {
    return (
      <main className="admin-page admin-splash">
        <div className="loading-glass admin-splash-card">
          <span className="admin-icon"><ShieldCheck size={22} /></span>
          <span>Откройте панель из Telegram…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <span className="admin-icon"><ShieldCheck size={22} /></span>
        <div className="admin-header-copy">
          <span className="eyebrow">LOVELEAD ADMIN</span>
          <h1>Администрирование</h1>
        </div>
        <button
          type="button"
          className="admin-refresh"
          onClick={() => void load(query, true)}
          disabled={refreshing}
          aria-label="Обновить данные"
        >
          <RefreshCw size={16} className={refreshing ? "spin" : undefined} />
          {refreshing ? "Обновление…" : "Обновить"}
        </button>
      </header>

      {error && <p className="form-error admin-error">{error}</p>}

      {stats ? <StatCards stats={stats} /> : <StatCardsSkeleton />}

      <div className="admin-search-sticky">
        <form className="admin-search" onSubmit={(e) => e.preventDefault()}>
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ID, username или имя"
            aria-label="Поиск пользователей"
          />
          {loading && <span className="admin-search-spinner" aria-hidden />}
        </form>
      </div>

      {loading && users === null ? (
        <UsersSkeleton />
      ) : users && users.length === 0 ? (
        <div className="admin-empty">
          <p>{query ? `По запросу «${query}» никого не найдено.` : "Пользователей пока нет."}</p>
        </div>
      ) : (
        <section className="users-admin">
          {(users ?? []).map((user) => (
            <UserCard
              key={user.id}
              user={user}
              updatingTask={updatingTask}
              onHide={(taskId, title) => void hideTask(user.id, taskId, title)}
              onUnhide={(taskId) => void setTaskStatus(user.id, taskId, "unhide")}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="admin-stats-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  );
}

function UsersSkeleton() {
  return (
    <div className="users-admin">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton-card skeleton-user" />
      ))}
    </div>
  );
}
