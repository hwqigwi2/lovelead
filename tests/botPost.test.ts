import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/bot/webhook/route";

// Мокаем auth/DB/bot через hoisted, иначе vi.mock поднимает фабрики выше объявления функций.
const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  upsertTelegramUser: vi.fn(),
  parseStartRef: vi.fn(),
  sendTextMessage: vi.fn(),
  sendPhotoMessage: vi.fn(),
  sendLongTextMessage: vi.fn(),
  sendStartMessage: vi.fn(),
  db: { from: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({
  checkRateLimit: mocks.checkRateLimit,
  upsertTelegramUser: mocks.upsertTelegramUser,
}));

vi.mock("@/lib/referral", () => ({
  parseStartRef: mocks.parseStartRef,
}));

vi.mock("@/lib/bot", () => ({
  sendTextMessage: mocks.sendTextMessage,
  sendPhotoMessage: mocks.sendPhotoMessage,
  sendLongTextMessage: mocks.sendLongTextMessage,
  sendStartMessage: mocks.sendStartMessage,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => mocks.db,
}));

const SECRET = "test-webhook-secret";
// ID из ADMIN_TELEGRAM_IDS по умолчанию (lib/config.ts).
const ADMIN_ID = 5258394536;
const USER_ID = 42;

const mockCheckRateLimit = mocks.checkRateLimit;
const mockUpsertTelegramUser = mocks.upsertTelegramUser;
const mockParseStartRef = mocks.parseStartRef;
const mockSendTextMessage = mocks.sendTextMessage;
const mockSendPhotoMessage = mocks.sendPhotoMessage;
const mockSendStartMessage = mocks.sendStartMessage;
const mockDb = mocks.db;

function req(update: unknown) {
  return new NextRequest("http://localhost/api/bot/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": SECRET,
    },
    body: JSON.stringify(update),
  });
}

function messageUpdate(fromId: number, extra: Record<string, unknown>) {
  return {
    message: {
      chat: { id: fromId },
      from: { id: fromId, first_name: "Name" },
      ...extra,
    },
  };
}

function mockBroadcastUsers(telegramIds: (number | null)[]) {
  mockDb.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      not: vi.fn().mockResolvedValue({ data: telegramIds.map((id) => ({ telegram_id: id })) }),
    }),
  });
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://mini.app");
  mockCheckRateLimit.mockReset().mockResolvedValue(true);
  mockUpsertTelegramUser.mockReset().mockResolvedValue({ id: "user-1", referred_by: null });
  mockParseStartRef.mockReset().mockReturnValue(null);
  mockSendTextMessage.mockReset().mockResolvedValue(undefined);
  mockSendPhotoMessage.mockReset().mockResolvedValue(undefined);
  mocks.sendLongTextMessage.mockReset().mockResolvedValue(undefined);
  mockSendStartMessage.mockReset().mockResolvedValue(undefined);
  mockDb.from.mockReset();
});

describe("команда /post", () => {
  it("обычный пользователь получает отказ и не активирует режим рассылки", async () => {
    const res = await POST(req(messageUpdate(USER_ID, { text: "/post" })));
    expect(res.status).toBe(200);
    expect(mockSendTextMessage).toHaveBeenCalledWith(USER_ID, "Команда недоступна.");

    // Следующее сообщение обычного пользователя не должно запускать рассылку.
    mockSendTextMessage.mockClear();
    await POST(req(messageUpdate(USER_ID, { text: "всем привет" })));
    expect(mockDb.from).not.toHaveBeenCalled();
  });

  it("админ получает приглашение отправить контент", async () => {
    await POST(req(messageUpdate(ADMIN_ID, { text: "/post" })));
    expect(mockSendTextMessage).toHaveBeenCalledWith(
      ADMIN_ID,
      "Отправьте сообщение для рассылки. Можно отправить текст или фотографию с подписью."
    );
    expect(mockDb.from).not.toHaveBeenCalled();

    // Сбрасываем состояние, чтобы не влиять на другие тесты.
    mockBroadcastUsers([]);
    await POST(req(messageUpdate(ADMIN_ID, { text: "контент" })));
  });

  it("админ получает приглашение и по команде в формате /post@Leadslovebot", async () => {
    await POST(req(messageUpdate(ADMIN_ID, { text: "/post@Leadslovebot" })));
    expect(mockSendTextMessage).toHaveBeenCalledWith(
      ADMIN_ID,
      "Отправьте сообщение для рассылки. Можно отправить текст или фотографию с подписью."
    );

    // Рассылка запускается и после формата с @bot.
    mockSendTextMessage.mockClear();
    mockBroadcastUsers([501]);
    await POST(req(messageUpdate(ADMIN_ID, { text: "рассылка после @" })));
    expect(mockSendTextMessage).toHaveBeenCalledWith(501, "рассылка после @");
  });

  it("команда вместо контента отменяет ожидание /post и не уходит в рассылку", async () => {
    await POST(req(messageUpdate(ADMIN_ID, { text: "/post" })));
    mockDb.from.mockClear();
    await POST(req(messageUpdate(ADMIN_ID, { text: "/post" })));

    // Повторный /post не разослан пользователям, а снова включил режим рассылки.
    expect(mockDb.from).not.toHaveBeenCalled();
    expect(mockSendTextMessage).toHaveBeenCalledWith(
      ADMIN_ID,
      "Отправьте сообщение для рассылки. Можно отправить текст или фотографию с подписью."
    );

    // Сбрасываем состояние.
    mockBroadcastUsers([]);
    await POST(req(messageUpdate(ADMIN_ID, { text: "контент" })));
  });

  it("следующее текстовое сообщение админа уходит всем пользователям с telegram_id", async () => {
    await POST(req(messageUpdate(ADMIN_ID, { text: "/post" })));
    mockSendTextMessage.mockClear();
    mockBroadcastUsers([101, 102, null]);
    await POST(req(messageUpdate(ADMIN_ID, { text: "Новость дня" })));

    expect(mockSendTextMessage).toHaveBeenCalledWith(101, "Новость дня");
    expect(mockSendTextMessage).toHaveBeenCalledWith(102, "Новость дня");
    expect(mockSendTextMessage).toHaveBeenCalledWith(
      ADMIN_ID,
      "Рассылка завершена.\n\nВсего: 2\nОтправлено: 2\nОшибок: 0"
    );
  });

  it("фотография с caption рассылается через sendPhoto с сохранением подписи", async () => {
    await POST(req(messageUpdate(ADMIN_ID, { text: "/post" })));
    mockBroadcastUsers([201]);
    await POST(
      req(
        messageUpdate(ADMIN_ID, {
          photo: [{ file_id: "small" }, { file_id: "big" }],
          caption: "Смотри новость",
        })
      )
    );

    // Берётся самое большое фото (последнее в массиве), caption сохраняется.
    expect(mockSendPhotoMessage).toHaveBeenCalledWith(201, "big", "Смотри новость");
    expect(mockSendTextMessage).toHaveBeenCalledWith(
      ADMIN_ID,
      "Рассылка завершена.\n\nВсего: 1\nОтправлено: 1\nОшибок: 0"
    );
  });

  it("состояние /post сбрасывается после рассылки — повторный /post обязателен", async () => {
    await POST(req(messageUpdate(ADMIN_ID, { text: "/post" })));
    mockBroadcastUsers([301]);
    await POST(req(messageUpdate(ADMIN_ID, { text: "первая рассылка" })));
    expect(mockSendTextMessage).toHaveBeenCalledWith(301, "первая рассылка");

    // Ещё одно сообщение без нового /post не должно стать рассылкой.
    mockSendTextMessage.mockClear();
    mockDb.from.mockClear();
    await POST(req(messageUpdate(ADMIN_ID, { text: "не рассылка" })));
    expect(mockDb.from).not.toHaveBeenCalled();
    expect(mockSendTextMessage).not.toHaveBeenCalledWith(301, "не рассылка");
  });

  it("ошибка отправки одному пользователю не останавливает рассылку", async () => {
    await POST(req(messageUpdate(ADMIN_ID, { text: "/post" })));
    mockBroadcastUsers([401, 402, 403]);
    mockSendTextMessage.mockImplementation(async (chatId: number) => {
      if (chatId === 402) throw new Error("Forbidden: bot was blocked by the user");
    });
    await POST(req(messageUpdate(ADMIN_ID, { text: "важное" })));

    expect(mockSendTextMessage).toHaveBeenCalledWith(401, "важное");
    expect(mockSendTextMessage).toHaveBeenCalledWith(402, "важное");
    expect(mockSendTextMessage).toHaveBeenCalledWith(403, "важное");
    expect(mockSendTextMessage).toHaveBeenCalledWith(
      ADMIN_ID,
      "Рассылка завершена.\n\nВсего: 3\nОтправлено: 2\nОшибок: 1"
    );
  });

  it("контент без текста и фото отменяет рассылку и сбрасывает состояние", async () => {
    await POST(req(messageUpdate(ADMIN_ID, { text: "/post" })));
    await POST(req(messageUpdate(ADMIN_ID, {})));
    expect(mockSendTextMessage).toHaveBeenCalledWith(
      ADMIN_ID,
      "Рассылка отменена: можно отправить только текст или фотографию с подписью."
    );
    expect(mockDb.from).not.toHaveBeenCalled();
  });

  it("/start продолжает работать: стикер, приветствие и кнопка через sendStartMessage", async () => {
    const res = await POST(req(messageUpdate(USER_ID, { text: "/start" })));
    expect(res.status).toBe(200);
    expect(mockUpsertTelegramUser).toHaveBeenCalled();
    expect(mockSendStartMessage).toHaveBeenCalledWith(USER_ID, "Name", "https://mini.app");
  });

  describe("команда /admin", () => {
    function mockAdminDb() {
      mockDb.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "u1",
                      telegram_id: USER_ID,
                      first_name: "User",
                      last_name: null,
                      username: null,
                      referred_by: null,
                      created_at: "2026-01-01",
                    },
                  ],
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [] }),
          }),
        };
      });
    }

    it("админ получает список пользователей", async () => {
      mockAdminDb();
      const res = await POST(req(messageUpdate(ADMIN_ID, { text: "/admin" })));
      expect(res.status).toBe(200);
      expect(mocks.sendLongTextMessage).toHaveBeenCalledWith(
        ADMIN_ID,
        expect.stringContaining("Пользователи (1):")
      );
    });

    it("/admin работает и в формате /admin@Leadslovebot", async () => {
      mockAdminDb();
      const res = await POST(req(messageUpdate(ADMIN_ID, { text: "/admin@Leadslovebot" })));
      expect(res.status).toBe(200);
      expect(mocks.sendLongTextMessage).toHaveBeenCalledWith(
        ADMIN_ID,
        expect.stringContaining("Пользователи (1):")
      );
    });

    it("обычный пользователь получает отказ", async () => {
      const res = await POST(req(messageUpdate(USER_ID, { text: "/admin" })));
      expect(res.status).toBe(200);
      expect(mockSendTextMessage).toHaveBeenCalledWith(USER_ID, "Команда недоступна.");
      expect(mocks.sendLongTextMessage).not.toHaveBeenCalled();
    });
  });
});
