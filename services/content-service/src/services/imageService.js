const OpenAI = require('openai');

let _openaiClient = null;

function getOpenAIClient(apiKey) {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey });
  }
  return _openaiClient;
}

function getMockImageUrl(prompt) {
  const seed = (prompt || 'marketing')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24) || 'marketing';
  return `https://picsum.photos/seed/${seed}/800/600`;
}

// Uploads a base64 PNG to Cloudinary and returns the public secure_url.
// Requires CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET (unsigned) env vars.
async function uploadToCloudinary(b64Data) {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const preset    = (process.env.CLOUDINARY_UPLOAD_PRESET || '').trim();
  if (!cloudName || !preset) return null;

  console.log('[imageService] Uploading base64 image to Cloudinary...');
  const form = new FormData();
  form.append('file', `data:image/png;base64,${b64Data}`);
  form.append('upload_preset', preset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: form }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  console.log('[imageService] Cloudinary upload succeeded:', data.secure_url);
  return data.secure_url;
}

async function generateWithGptImage(prompt, apiKey) {
  console.log('[imageService] Calling gpt-image-2 with prompt:', prompt);

  let response;
  try {
    response = await getOpenAIClient(apiKey).images.generate({
      model: 'gpt-image-2',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    });
    console.log('[imageService] gpt-image-2 responded (url mode)');
  } catch (urlErr) {
    console.warn('[imageService] response_format:url not supported, retrying without it:', urlErr.message);
    response = await getOpenAIClient(apiKey).images.generate({
      model: 'gpt-image-2',
      prompt,
      n: 1,
      size: '1024x1024',
    });
    console.log('[imageService] gpt-image-2 responded (b64 mode)');
  }

  const item = response.data[0];
  console.log('[imageService] response keys:', Object.keys(item));

  if (item.url) {
    console.log('[imageService] got public URL from OpenAI');
    return item.url;
  }

  if (item.b64_json) {
    console.log('[imageService] got b64_json — attempting Cloudinary upload...');
    const publicUrl = await uploadToCloudinary(item.b64_json);
    if (publicUrl) return publicUrl;

    // No Cloudinary configured — store as data URL for frontend display only.
    // Instagram publishing will fail until Cloudinary is set up.
    console.warn('[imageService] CLOUDINARY not configured — storing as data URL. Instagram publishing will not work until CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET are set.');
    return `data:image/png;base64,${item.b64_json}`;
  }

  throw new Error('gpt-image-2 returned neither url nor b64_json');
}

async function generateWithCustomApi(prompt, apiUrl, apiKey) {
  console.log('[imageService] Calling custom image API:', apiUrl);
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`Custom image API returned ${response.status}`);
  }

  const data = await response.json();
  const url = data.image_url ?? data.url ?? data.data?.[0]?.url ?? null;
  if (!url) throw new Error('Custom image API returned no URL');
  console.log('[imageService] Custom API returned URL:', url);
  return url;
}

async function generateImage(prompt) {
  console.log('[imageService] generateImage called with prompt:', prompt);

  const openaiKey    = (process.env.OPENAI_API_KEY     || '').trim();
  const customApiUrl = (process.env.AI_IMAGE_API_URL   || '').trim();
  const customApiKey = (process.env.AI_IMAGE_API_KEY   || '').trim();

  console.log('[imageService] OPENAI_API_KEY present:', !!openaiKey);
  console.log('[imageService] CLOUDINARY configured:', !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET));

  if (!prompt || !prompt.trim()) {
    console.warn('[imageService] Empty prompt — returning mock');
    return getMockImageUrl(prompt);
  }

  if (openaiKey) {
    console.log('[imageService] Attempting gpt-image-2...');
    try {
      return await generateWithGptImage(prompt, openaiKey);
    } catch (err) {
      console.error('[imageService] gpt-image-2 FAILED:', err.message);
    }
  } else {
    console.warn('[imageService] No OPENAI_API_KEY — skipping gpt-image-2');
  }

  if (customApiUrl && customApiKey) {
    console.log('[imageService] Attempting custom image API...');
    try {
      return await generateWithCustomApi(prompt, customApiUrl, customApiKey);
    } catch (err) {
      console.error('[imageService] Custom image API FAILED:', err.message);
    }
  }

  console.warn('[imageService] All providers failed — returning mock placeholder');
  return getMockImageUrl(prompt);
}

module.exports = { generateImage };
