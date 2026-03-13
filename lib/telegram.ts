export async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram not configured — skipping notification');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    // Never let Telegram failure break the main pipeline
    console.error('Telegram send failed:', err);
  }
}

export async function sendTelegramError(route: string, error: unknown): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  const topicId = process.env.TELEGRAM_ERROR_TOPIC_ID;
  const message = error instanceof Error ? error.message : String(error);
  const timestamp = new Date().toUTCString();

  const text = [
    `🚨 <b>Pipeline Error</b>`,
    ``,
    `<b>Route:</b> <code>${route}</code>`,
    `<b>Error:</b> <code>${message.slice(0, 500)}</code>`,
    `<b>Time:</b> ${timestamp}`,
  ].join('\n');

  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    };
    if (topicId) payload.message_thread_id = parseInt(topicId, 10);

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Telegram error notification failed:', err);
  }
}
