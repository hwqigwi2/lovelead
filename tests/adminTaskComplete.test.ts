import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/users/[id]/tasks/[taskId]/complete/route";

// Мокаем auth/DB через hoisted, иначе vi.mock поднимает фабрики выше объявления функций.
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  checkRateLimit: vi.fn(),
  db: { from: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({
  requireUser: mocks.requireUser,
  requireAdmin: mocks.requireAdmin,
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => mocks.db,
}));

const idParams = { params: Promise.resolve({ id: "user-b", taskId: "task-1" }) };

// Алиасы на hoisted-моки для читаемости тестов.
const mockRequireUser = mocks.requireUser;
const mockRequireAdmin = mocks.requireAdmin;
const mockCheckRateLimit = mocks.checkRateLimit;
const mockDb = mocks.db;

function req() {
  return new NextRequest("http://localhost/api/admin/users/user-b/tasks/task-1/complete", { method: "POST" });
}

beforeEach(() => {
  mockRequireUser.mockReset();
  mockRequireAdmin.mockReset();
  mockCheckRateLimit.mockReset().mockResolvedValue(true);
  mockDb.from.mockReset();
});

describe("admin task complete endpoint", () => {
  it("обычному пользователю запрещено завершать задание", async () => {
    mockRequireUser.mockResolvedValue({ id: "user-a", telegram_id: 111 });
    mockRequireAdmin.mockImplementation(() => {
      throw new Error("Forbidden.");
    });

    const res = await POST(req(), idParams);
    expect(res.status).toBe(403);
    expect(mockDb.from).not.toHaveBeenCalledWith("user_tasks");
  });

  it("неавторизованному запрещено завершать задание", async () => {
    mockRequireUser.mockRejectedValue(new Error("User session was not initialized."));

    const res = await POST(req(), idParams);
    expect(res.status).toBe(401);
  });

  it("админ может перевести started -> completed", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin-1", telegram_id: 999 });
    mockRequireAdmin.mockImplementation(vi.fn());

    const updateBuilder = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ status: "completed" }], error: null }),
    };
    const adminActions = { insert: vi.fn().mockResolvedValue({}) };
    mockDb.from.mockImplementation((table: string) => {
      if (table === "users") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "user-b" } }) }) }) };
      if (table === "tasks") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "task-1" } }) }) }) };
      if (table === "user_tasks") return { update: vi.fn().mockReturnValue(updateBuilder) };
      if (table === "admin_actions") return adminActions;
      throw new Error(`Unexpected table ${table}`);
    });

    const res = await POST(req(), idParams);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "completed" });
    expect(adminActions.insert).toHaveBeenCalledWith({ admin_telegram_id: 999, user_id: "user-b", task_id: "task-1", action: "complete_task" });
  });

  it("повторное завершение завершённого задания не ломает данные", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin-1", telegram_id: 999 });
    mockRequireAdmin.mockImplementation(vi.fn());

    const updateBuilder = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const existing = { status: "completed" };
    mockDb.from.mockImplementation((table: string) => {
      if (table === "users") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "user-b" } }) }) }) };
      if (table === "tasks") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "task-1" } }) }) }) };
      if (table === "user_tasks") return {
        update: vi.fn().mockReturnValue(updateBuilder),
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: existing }) }) }) }),
      };
      throw new Error(`Unexpected table ${table}`);
    });

    const res = await POST(req(), idParams);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "completed" });
  });

  it("не позволяет завершить задание в статусе, отличном от started", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin-1", telegram_id: 999 });
    mockRequireAdmin.mockImplementation(vi.fn());

    const updateBuilder = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockDb.from.mockImplementation((table: string) => {
      if (table === "users") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "user-b" } }) }) }) };
      if (table === "tasks") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "task-1" } }) }) }) };
      if (table === "user_tasks") return {
        update: vi.fn().mockReturnValue(updateBuilder),
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { status: "available" } }) }),
      };
      throw new Error(`Unexpected table ${table}`);
    });

    const res = await POST(req(), idParams);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Задание не в процессе." });
  });
});
