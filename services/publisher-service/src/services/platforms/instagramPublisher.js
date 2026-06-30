const axios = require('axios');

const GRAPH_API = 'https://graph.instagram.com/v21.0';

// Polls the container status until it reaches FINISHED (ready to publish).
// Instagram processes the uploaded image asynchronously — publishing immediately
// after container creation causes error 9007 "Media ID is not available".
async function waitUntilFinished(creation_id, access_token, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await axios.get(`${GRAPH_API}/${creation_id}`, {
      params: { fields: 'status_code', access_token },
    });
    const status = res.data?.status_code;
    console.log(`[instagram] Container status: ${status}`);

    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new Error(`Instagram container processing failed with status: ${status}`);
    }
    // IN_PROGRESS — wait 3 s then check again
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Instagram container processing timed out after 30 s');
}

// Instagram publishing via Meta Graph API
// IGAA tokens (new Instagram API / personal+creator accounts) → use /me/ endpoint
// EAA  tokens (Facebook Graph API / business accounts)        → use /{account_id}/ endpoint
async function publish({ post_id, caption_text, image_url, access_token, account_id }) {
  const isIgaa = access_token && access_token.startsWith('IGAA');

  if (!access_token || (!isIgaa && !account_id)) {
    console.log('[instagram] Not configured for this project — simulating publish');
    return { external_post_id: `instagram_mock_${Date.now()}` };
  }

  if (!image_url) {
    console.error('[instagram] FAILED: no image_url in payload — Instagram requires an image');
    throw new Error('Instagram publish failed: no image URL');
  }

  if (image_url.startsWith('data:')) {
    console.error('[instagram] FAILED: image is a base64 data URL — Instagram needs a public HTTP URL.');
    throw new Error('Instagram publish failed: base64 image URLs are not supported');
  }

  const userSegment = isIgaa ? 'me' : account_id;
  console.log(`[instagram] Starting publish for post ${post_id} → ${userSegment} (${isIgaa ? 'IGAA' : 'EAA'} token)`);
  console.log(`[instagram] image_url: ${image_url.slice(0, 80)}...`);

  // Step 1: Create a media container
  console.log('[instagram] Step 1 — creating media container...');
  const containerRes = await axios.post(
    `${GRAPH_API}/${userSegment}/media`,
    { image_url, caption: caption_text || '', media_type: 'IMAGE', access_token }
  ).catch((err) => {
    const igError = err.response?.data?.error;
    console.error('[instagram] Container creation FAILED');
    console.error('[instagram] HTTP status:', err.response?.status);
    console.error('[instagram] IG error code:', igError?.code);
    console.error('[instagram] IG error message:', igError?.message);
    throw new Error(`Instagram container creation failed: ${igError?.message || err.message}`);
  });

  const creation_id = containerRes.data?.id;
  if (!creation_id) {
    throw new Error(`Instagram container creation returned no id: ${JSON.stringify(containerRes.data)}`);
  }
  console.log(`[instagram] Container created: ${creation_id}`);

  // Step 1.5: Wait until Instagram finishes processing the image
  console.log('[instagram] Waiting for container to finish processing...');
  await waitUntilFinished(creation_id, access_token);

  // Step 2: Publish the container
  console.log('[instagram] Step 2 — publishing container...');
  const publishRes = await axios.post(
    `${GRAPH_API}/${userSegment}/media_publish`,
    { creation_id, access_token }
  ).catch((err) => {
    const igError = err.response?.data?.error;
    console.error('[instagram] Media publish FAILED');
    console.error('[instagram] HTTP status:', err.response?.status);
    console.error('[instagram] IG error code:', igError?.code);
    console.error('[instagram] IG error message:', igError?.message);
    throw new Error(`Instagram media publish failed: ${igError?.message || err.message}`);
  });

  const external_post_id = publishRes.data?.id;
  if (!external_post_id) {
    throw new Error(`Instagram media publish returned no id: ${JSON.stringify(publishRes.data)}`);
  }

  console.log(`[instagram] SUCCESS — media_id: ${external_post_id}`);
  return { external_post_id };
}

module.exports = { publish };
