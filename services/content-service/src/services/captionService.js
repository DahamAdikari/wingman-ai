const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Module-level singletons — created once on first use, not on every caption call
let _geminiClient = null;
let _openaiClient = null;

function getGeminiClient(apiKey) {
  if (!_geminiClient) {
    _geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return _geminiClient;
}

function getOpenAIClient(apiKey) {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey });
  }
  return _openaiClient;
}

async function generateCaption(prompt) {
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();

  if (!geminiKey && !openaiKey) {
    console.log('No AI API keys configured — returning mock caption');
    return `[MOCK CAPTION] ${prompt}`;
  }

  if (geminiKey) {
    try {
      const model = getGeminiClient(geminiKey).getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(
        `Write a social media caption for the following topic. Return only the caption text, no JSON.\n\nTopic: ${prompt}`
      );
      return result.response.text().trim();
    } catch (err) {
      console.log('Gemini failed, falling back to OpenAI:', err.message);
    }
  }

  if (openaiKey) {
    const response = await getOpenAIClient(openaiKey).chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Write a social media caption for the following topic. Return only the caption text.\n\nTopic: ${prompt}`,
        },
      ],
    });
    return response.choices[0].message.content.trim();
  }

  console.log('All AI providers failed or unconfigured — returning mock caption');
  return `[MOCK CAPTION] ${prompt}`;
}

module.exports = { generateCaption };
