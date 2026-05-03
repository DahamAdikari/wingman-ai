function getMockImageUrl(prompt) {
  // Stable seed so the same prompt always returns the same placeholder photo
  const seed = (prompt || 'marketing')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24) || 'marketing';
  return `https://picsum.photos/seed/${seed}/800/600`;
}

async function generateImage(prompt) {
  const apiUrl = process.env.AI_IMAGE_API_URL;
  const apiKey = process.env.AI_IMAGE_API_KEY;

  if (!apiUrl || !apiKey) {
    console.log('Image API not configured — returning mock placeholder image');
    return getMockImageUrl(prompt);
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    console.error('Image generation API error:', response.status);
    return null;
  }

  const data = await response.json();
  // Normalise across common provider response shapes
  return data.image_url ?? data.url ?? data.data?.[0]?.url ?? null;
}

module.exports = { generateImage };
