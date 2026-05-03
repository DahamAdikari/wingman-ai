const telegramPublisher = require('./platforms/telegramPublisher');

async function publishPost(payload) {
  const { platform, post_id, caption_text, image_url } = payload;

  console.log(`[publisher-service] Publishing to platform: ${platform}`);

  // Route to platform-specific publisher
  switch (platform?.toLowerCase()) {
    case 'telegram':
      return await telegramPublisher.publish({ post_id, caption_text, image_url });
    default:
      // Simulate publish for unsupported platforms
      console.log(`[publisher-service] Platform '${platform}' not yet integrated — simulating publish`);
      return { external_post_id: `mock_${Date.now()}` };
  }
}

module.exports = { publishPost };
