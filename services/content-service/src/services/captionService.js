const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Module-level singletons — created once on first use, not on every caption call
let _geminiClient = null;
let _openaiClient = null;

function getGeminiClient() {
  if (!_geminiClient) {
    _geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _geminiClient;
}

function getOpenAIClient() {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

async function generateCaption(prompt) {
  try {
    const model = getGeminiClient().getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(
      `Write a social media caption for the following topic. Return only the caption text, no JSON.\n\nTopic: ${prompt}`
    );
    return result.response.text().trim();
  } catch (err) {
    console.log('Gemini failed, falling back to OpenAI:', err.message);
    const response = await getOpenAIClient().chat.completions.create({
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
}

module.exports = { generateCaption };
