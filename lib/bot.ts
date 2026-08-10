import "server-only";

export async function sendStartMessage(chatId: number, firstName: string, miniAppUrl: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot configuration is missing.");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: `Привет, ${firstName} 👋\n\nЗдесь можно получать доступные задания и выполнять их за вознаграждение.`, reply_markup: { inline_keyboard: [[{ text: "Получить задание", web_app: { url: miniAppUrl } }]] } }),
  });
  if (!response.ok) throw new Error("Telegram API rejected message.");
}
