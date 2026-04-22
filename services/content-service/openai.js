const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateWithOpenAI(prompt) {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini", // fast + cheap for testing
    messages: [
      {
        role: "user",
        content: `
        Create a social media post.

        Topic: ${prompt}

        Return JSON:
        {
          "post": "...",
          "caption": "..."
        }
        `
      }
    ]
  });

  const text = response.choices[0].message.content;

  try {
    return JSON.parse(text);
  } catch {
    return {
      post: text,
      caption: "#AI"
    };
  }
}

module.exports = { generateWithOpenAI };