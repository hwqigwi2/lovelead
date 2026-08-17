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

export async function sendPhotoMessage(
  chatId: number,
  photo: string,
  caption?: string
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("Telegram bot configuration is missing.");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendPhoto`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        photo,
        ...(caption ? { caption } : {}),
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
      `Telegram API rejected photo: ${response.status}`
    );
  }
}

export async function sendLongTextMessage(
  chatId: number,
  text: string
) {
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

  if (chunk) {
    await sendTextMessage(chatId, chunk);
  }
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

  // Сначала отправляем стикер
  const stickerResponse = await fetch(
    `https://api.telegram.org/bot${token}/sendSticker`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        sticker:
          "CAACAgEAAxkBAAEXl1FqfMJMLCsKZbH5NyHAD48Ql0bz2gACAgMAAlQmGESY5Nu6voFz0T0E",
      }),
    }
  );

  if (!stickerResponse.ok) {
    const errorBody = await stickerResponse.text();

    console.error(
      "Telegram API sticker error:",
      stickerResponse.status,
      errorBody
    );

    // Стикер не критичен — продолжаем отправку сообщения.
  }

  // Затем отправляем приветственное сообщение
  const messageResponse = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,

        text:
          `👋 <b>Привет, ${firstName}!</b>\n\n` +
          `<b>Пройди небольшой опрос</b> и начинай выполнять ` +
          `свои первые задания 💙`,

        parse_mode: "HTML",

        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Начать",
                style: "primary",
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

  if (!messageResponse.ok) {
    const errorBody = await messageResponse.text();

    console.error(
      "Telegram API error:",
      messageResponse.status,
      errorBody
    );

    throw new Error(
      `Telegram API rejected message: ${messageResponse.status}`
    );
  }
}