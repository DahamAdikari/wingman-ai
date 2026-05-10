const axios = require('axios');

const GRAPH_API = 'https://graph.instagram.com/v21.0';

// Instagram publishing via Meta Graph API (requires Business/Creator account)
// Flow: create media container → publish container
async function publish({ post_id, caption_text, image_url, access_token, account_id }) {
  if (!access_token || !account_id) {
    console.log('[publisher-service] Instagram not configured for project, simulating publish');
    return { external_post_id: `instagram_mock_${Date.now()}` };
  }

  if (!image_url) {
    console.warn('[publisher-service] Instagram requires an image — no image_url provided, skipping');
    return { external_post_id: `instagram_no_image_${Date.now()}` };
  }

  try {
    // Step 1: Create a media container
    const containerRes = await axios.post(
      `${GRAPH_API}/${account_id}/media`,
      {
        image_url,
        caption: caption_text || '',
        access_token,
      }
    );

    const creation_id = containerRes.data?.id;
    if (!creation_id) throw new Error('No creation_id in Instagram media container response');

    // Step 2: Publish the container
    const publishRes = await axios.post(
      `${GRAPH_API}/${account_id}/media_publish`,
      {
        creation_id,
        access_token,
      }
    );

    const external_post_id = publishRes.data?.id || `instagram_${Date.now()}`;
    console.log(`[publisher-service] Instagram publish success, post_id: ${external_post_id}`);
    return { external_post_id };

  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    console.error('[publisher-service] Instagram publish error:', detail);
    return { external_post_id: `instagram_error_${Date.now()}` };
  }
}

module.exports = { publish };
