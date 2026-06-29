// captionService uses module-level singletons for the AI clients.
// jest.resetModules() + jest.doMock() is required between tests so each test
// gets a fresh module with the mock it sets up.

describe('generateCaption', () => {
  let generateCaption;

  afterEach(() => {
    jest.resetModules();
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it('returns caption from Gemini on success', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    jest.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: jest.fn(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockResolvedValue({
            response: { text: () => 'Summer vibes caption' },
          }),
        }),
      })),
    }));
    jest.doMock('openai', () => jest.fn());

    ({ generateCaption } = require('../../src/services/captionService'));
    const caption = await generateCaption('Nike summer campaign');
    expect(caption).toBe('Summer vibes caption');
  });

  it('falls back to OpenAI when Gemini fails', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    jest.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: jest.fn(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockRejectedValue(new Error('Gemini unavailable')),
        }),
      })),
    }));
    jest.doMock('openai', () =>
      jest.fn(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'OpenAI fallback caption' } }],
            }),
          },
        },
      }))
    );

    ({ generateCaption } = require('../../src/services/captionService'));
    const caption = await generateCaption('test prompt');
    expect(caption).toBe('OpenAI fallback caption');
  });
});
