/**
 * Send a structured error alert to Telegram.
 * Uses TELEGRAM_THREAD_ID_ERRORS if set, otherwise falls back to the main group chat.
 */
export async function sendTelegramError(
  route: string,
  stage: string,
  error: unknown,
  context?: Record<string, string>
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const contextLines = context
    ? Object.entries(context)
        .map(([k, v]) => `  <b>${k}:</b> ${v}`)
        .join('\n')
    : '';

  const text = [
    `🚨 <b>API ERROR</b> — <code>${route}</code>`,
    `<b>Stage:</b> ${stage}`,
    `<b>Error:</b> <code>${err.message.slice(0, 300)}</code>`,
    contextLines,
  ]
    .filter(Boolean)
    .join('\n');

  await sendTelegram(text, process.env.TELEGRAM_THREAD_ID_ERRORS);
}

/**
 * Send a message with inline keyboard buttons.
 * Returns the message_id so you can edit/remove buttons later.
 */
export async function sendTelegramWithButtons(
  text: string,
  buttons: Array<Array<{ text: string; callback_data: string }>>,
  threadId?: string
): Promise<number | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = threadId
    ? process.env.TELEGRAM_GROUP_CHAT_ID
    : (process.env.TELEGRAM_GROUP_CHAT_ID || process.env.TELEGRAM_CHAT_ID)

  if (!token || !chatId) return null

  const payload: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: buttons },
  }
  if (threadId) payload.message_thread_id = threadId

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.error('Telegram buttons API error:', await res.text())
      return null
    }
    const data = await res.json()
    return data.result?.message_id ?? null
  } catch (err) {
    console.error('Telegram buttons network error:', err)
    return null
  }
}

export async function sendTelegram(text: string, threadId?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  // Use Group Chat ID if working with threads, fallback to the standard Chat ID
  const chatId = threadId ? process.env.TELEGRAM_GROUP_CHAT_ID : (process.env.TELEGRAM_GROUP_CHAT_ID || process.env.TELEGRAM_CHAT_ID);

  if (!token || !chatId) {
    console.warn('Telegram not configured — skipping notification');
    return;
  }

  const payload: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };

  if (threadId) {
    payload.message_thread_id = threadId;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Telegram API error (${response.status}):`, errorBody);
    }
  } catch (err) {
    // Never let Telegram failure break the main pipeline
    console.error('Telegram network/client error:', err);
  }
}
