// captionService uses module-level singletons for the AI clients.
// jest.resetModules() + jest.doMock() is required between tests so each test
// gets a fresh module with the mock it sets up.

describe('generateCaption', () => {
  let generateCaption;

  afterEach(() => {
    jest.resetModules();
  });

  it('returns caption from Gemini on success', async () => {
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
