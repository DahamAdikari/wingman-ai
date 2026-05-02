const TelegramBot = require('node-telegram-bot-api');

let bot = null;

function initBot() {
  if (process.env.TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    console.log('[notification-service] Telegram bot initialised');
  } else {
    console.log('[notification-service] Telegram not configured, skipping');
  }
}

async function sendMessage(message) {
  if (!bot || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('[notification-service] Telegram send error:', err.message);
  }
}

module.exports = { initBot, sendMessage };
