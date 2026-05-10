const TelegramBot = require('node-telegram-bot-api');

// Cache bot instances by token to avoid creating duplicates
const botCache = new Map();

function getBot(token) {
  if (!botCache.has(token)) {
    botCache.set(token, new TelegramBot(token));
  }
  return botCache.get(token);
}

async function publish({ post_id, caption_text, image_url, bot_token, channel_id }) {
  if (!bot_token || !channel_id) {
    console.log('[publisher-service] Telegram not configured for project, simulating publish');
    return { external_post_id: `telegram_mock_${Date.now()}` };
  }

  const telegramBot = getBot(bot_token);

  try {
    let result;

    if (image_url) {
      result = await telegramBot.sendPhoto(channel_id, image_url, {
        caption: caption_text || '',
        parse_mode: 'HTML',
      });
    } else {
      result = await telegramBot.sendMessage(channel_id, caption_text || '', {
        parse_mode: 'HTML',
      });
    }

    const external_post_id = result.message_id?.toString() || `telegram_${Date.now()}`;
    console.log(`[publisher-service] Telegram publish success, message_id: ${external_post_id}`);
    return { external_post_id };

  } catch (err) {
    console.error('[publisher-service] Telegram publish error:', err.message);
    return { external_post_id: `telegram_error_${Date.now()}` };
  }
}

module.exports = { publish };
