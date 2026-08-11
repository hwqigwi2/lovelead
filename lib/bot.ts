import "server-only";

export async function sendTextMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("Telegram bot configuration is missing.");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      "Telegram API error:",
      response.status,
      errorBody
    );

    throw new Error(
      `Telegram API rejected message: ${response.status}`
    );
  }
}

export async function sendLongTextMessage(chatId: number, text: string) {
  const limit = 4000;
  const lines = text.split("\n");
  let chunk = "";
  for (const line of lines) {
    if (chunk.length + line.length + 1 > limit) {
      await sendTextMessage(chatId, chunk);
      chunk = "";
    }
    chunk = chunk ? `${chunk}\n${line}` : line;
  }
  if (chunk) await sendTextMessage(chatId, chunk);
}

export async function sendStartMessage(
  chatId: number,
  firstName: string,
  miniAppUrl: string
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("Telegram bot configuration is missing.");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: `Привет, ${firstName} 👋\n\nЗдесь можно получать доступные задания и выполнять их за вознаграждение.`,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Получить задание",
                web_app: {
                  url: miniAppUrl,
                },
              },
            ],
          ],
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      "Telegram API error:",
      response.status,
      errorBody
    );

    throw new Error(
      `Telegram API rejected message: ${response.status}`
    );
  }
}