const axios = require('axios');
const telegramPublisher = require('./platforms/telegramPublisher');
const instagramPublisher = require('./platforms/instagramPublisher');

const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://user-service:5001';

async function fetchChannelConfig(project_id, platform) {
  try {
    const res = await axios.get(
      `${USER_SERVICE}/internal/channels/${project_id}/${platform}`,
      { timeout: 5000 }
    );
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      console.warn(`[publisher-service] No channel config for project ${project_id} / ${platform}`);
    } else {
      console.error('[publisher-service] Failed to fetch channel config:', err.message);
    }
    return null;
  }
}

async function publishPost(payload) {
  const { platform, post_id, project_id, caption_text, image_url } = payload;

  console.log(`[publisher-service] Publishing post ${post_id} to platform: ${platform}`);

  const channelConfig = await fetchChannelConfig(project_id, platform);

  switch (platform?.toLowerCase()) {
    case 'telegram':
      return await telegramPublisher.publish({
        post_id,
        caption_text,
        image_url,
        bot_token: channelConfig?.bot_token,
        channel_id: channelConfig?.channel_id,
      });

    case 'instagram':
      return await instagramPublisher.publish({
        post_id,
        caption_text,
        image_url,
        access_token: channelConfig?.access_token,
        account_id: channelConfig?.account_id,
      });

    default:
      console.log(`[publisher-service] Platform '${platform}' not yet integrated — simulating publish`);
      return { external_post_id: `mock_${Date.now()}` };
  }
}

module.exports = { publishPost };
