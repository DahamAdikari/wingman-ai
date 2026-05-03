const TelegramBot = require('node-telegram-bot-api');

let bot = null;

function getBot() {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  }
  return bot;
}

async function publish({ post_id, caption_text, image_url }) {
  const telegramBot = getBot();
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!telegramBot || !channelId) {
    console.log('[publisher-service] Telegram not configured, simulating publish');
    return { external_post_id: `telegram_mock_${Date.now()}` };
  }

  try {
    let result;

    if (image_url) {
      // Send photo with caption
      result = await telegramBot.sendPhoto(channelId, image_url, {
        caption: caption_text || '',
        parse_mode: 'HTML',
      });
    } else {
      // Send text message
      result = await telegramBot.sendMessage(channelId, caption_text || '', {
        parse_mode: 'HTML',
      });
    }

    const external_post_id = result.message_id?.toString() || `telegram_${Date.now()}`;
    console.log(`[publisher-service] Telegram publish success, message_id: ${external_post_id}`);
    return { external_post_id };

  } catch (err) {
    console.error('[publisher-service] Telegram publish error:', err.message);
    // Return mock on error instead of crashing — let POST_PUBLISHED still fire
    return { external_post_id: `telegram_error_${Date.now()}` };
  }
}

module.exports = { publish };
