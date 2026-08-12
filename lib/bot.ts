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
        sticker: "CAACAgEAAxkBAAEXl1FqfMJMLCsKZbH5NyHAD48Ql0bz2gACAgMAAlQmGESY5Nu6voFz0T0E",
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
    // Продолжаем выполнение даже если стикер не отправился
  }

  // Затем отправляем сообщение с форматированием
  const messageResponse = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: `👋 <b>Привет, ${firstName}!</b>

 <b>Пройди короткий опрос</b> и начинай выполнять свои первые задания 💙`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Начать",
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