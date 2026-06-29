const OpenAI = require('openai');

let _openaiClient = null;

function getOpenAIClient(apiKey) {
  if (!_openaiClient) {
    console.log('[imageService] Creating new OpenAI client instance');
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

async function generateWithGptImage(prompt, apiKey) {
  console.log('[imageService] Calling gpt-image-2 API with prompt:', prompt);
  const response = await getOpenAIClient(apiKey).images.generate({
    model: 'gpt-image-2',
    prompt,
    n: 1,
    size: '1024x1024',
  });
  const item = response.data[0];
  console.log('[imageService] response keys:', Object.keys(item));

  if (item.url) {
    console.log('[imageService] got URL from response:', item.url);
    return item.url;
  }

  if (item.b64_json) {
    console.log('[imageService] got b64_json, converting to data URL');
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

  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
  const customApiUrl = (process.env.AI_IMAGE_API_URL || '').trim();
  const customApiKey = (process.env.AI_IMAGE_API_KEY || '').trim();

  console.log('[imageService] OPENAI_API_KEY present:', !!openaiKey, '| key prefix:', openaiKey ? openaiKey.slice(0, 8) + '...' : 'MISSING');
  console.log('[imageService] AI_IMAGE_API_URL present:', !!customApiUrl);
  console.log('[imageService] AI_IMAGE_API_KEY present:', !!customApiKey);

  if (!prompt || !prompt.trim()) {
    console.warn('[imageService] Prompt is empty — falling back to mock immediately');
    return getMockImageUrl(prompt);
  }

  if (openaiKey) {
    console.log('[imageService] Attempting gpt-image-2 generation...');
    try {
      const url = await generateWithGptImage(prompt, openaiKey);
      console.log('[imageService] gpt-image-2 generation succeeded');
      return url;
    } catch (err) {
      console.error('[imageService] gpt-image-2 generation FAILED');
      console.error('[imageService] Error name:', err.name);
      console.error('[imageService] Error message:', err.message);
      console.error('[imageService] Error status:', err.status);
      console.error('[imageService] Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    }
  } else {
    console.warn('[imageService] No OPENAI_API_KEY found — skipping gpt-image-2');
  }

  if (customApiUrl && customApiKey) {
    console.log('[imageService] Attempting custom image API...');
    try {
      const url = await generateWithCustomApi(prompt, customApiUrl, customApiKey);
      console.log('[imageService] Custom API generation succeeded');
      return url;
    } catch (err) {
      console.error('[imageService] Custom image API FAILED:', err.message);
    }
  } else {
    console.warn('[imageService] Custom image API not configured — skipping');
  }

  console.warn('[imageService] All providers failed or unconfigured — returning mock placeholder');
  return getMockImageUrl(prompt);
}

module.exports = { generateImage };
