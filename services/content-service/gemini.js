const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateWithOpenAI } = require('./openai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateContent(prompt) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash"
  });

  try {
    console.log("Using Gemini...");

    const result = await model.generateContent(`
      Create a social media post.

      Topic: ${prompt}

      Return JSON:
      {
        "post": "...",
        "caption": "..."
      }
    `);

    const text = result.response.text();
    return JSON.parse(text);

  } catch (err) {
    console.log("Gemini failed → switching to OpenAI");

    return await generateWithOpenAI(prompt);
  }
}

module.exports = { generateContent };